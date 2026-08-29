const { getRepository } = require('../db/repositoryFactory');
const { refreshCompetitiveRanks } = require('./leaderboardService');
const { v4: uuidv4 } = require('uuid');

const repo = getRepository();

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function getPracticePointsForDifficulty(difficulty) {
  const d = String(difficulty || '').toLowerCase();
  if (d === 'hard') return 30;
  if (d === 'medium') return 20;
  return 10; // easy
}

function getDailyChallengePointsForDifficulty(difficulty) {
  const d = String(difficulty || '').toLowerCase();
  if (d === 'hard') return 150;
  if (d === 'medium') return 100;
  return 50; // easy
}

async function getUserScoreBreakdown(userId) {
  const ledgerRows = await repo.many(`
    SELECT category, SUM(points) AS total_pts
    FROM points_ledger
    WHERE user_id = ?
    GROUP BY category
  `, [userId]);

  let practice_points = 0;
  let daily_challenge_points = 0;
  let streak_bonus = 0;

  ledgerRows.forEach(r => {
    const cat = String(r.category).toLowerCase();
    const pts = Number(r.total_pts || 0);
    if (cat === 'practice') practice_points += pts;
    else if (cat === 'daily_challenge') daily_challenge_points += pts;
    else if (cat === 'streak') streak_bonus += pts;
  });

  const total_score = practice_points + daily_challenge_points + streak_bonus;
  const leaderboard_score = daily_challenge_points;

  return {
    practice_points,
    daily_challenge_points,
    streak_bonus,
    total_score,
    leaderboard_score
  };
}

async function syncUserScore(userId) {
  const breakdown = await getUserScoreBreakdown(userId);
  await repo.execute(`
    UPDATE users SET
      practice_points = ?,
      daily_challenge_points = ?,
      streak_bonus = ?,
      leaderboard_score = ?,
      points = ?
    WHERE id = ?
  `, [
    breakdown.practice_points,
    breakdown.daily_challenge_points,
    breakdown.streak_bonus,
    breakdown.leaderboard_score,
    breakdown.total_score,
    userId
  ]);
  return breakdown;
}

/**
 * Award practice solve points (10/20/30 pts based on difficulty).
 * Strictly idempotent: awarded once per practice problem.
 * Contributes to practice_points and total_score ONLY (0 to leaderboard).
 */
async function awardPracticeSolve(userId, questionId) {
  const question = await repo.one('SELECT id, difficulty FROM questions WHERE id = ?', [questionId]);
  if (!question) return { pointsAwarded: 0, breakdown: await getUserScoreBreakdown(userId) };

  const pts = getPracticePointsForDifficulty(question.difficulty);
  const ledgerId = `pl-p-${userId}-${questionId}`;
  const nowIso = new Date().toISOString();

  const existing = await repo.one(
    "SELECT id FROM points_ledger WHERE user_id = ? AND source_type = 'PRACTICE_SOLVE' AND source_id = ?",
    [userId, questionId]
  );

  let pointsAwarded = 0;
  if (!existing) {
    await repo.execute(`
      INSERT INTO points_ledger (id, user_id, source_type, source_id, points, category, reason, created_at)
      VALUES (?, ?, 'PRACTICE_SOLVE', ?, ?, 'practice', 'Practice Problem Solve', ?)
    `, [ledgerId, userId, questionId, pts, nowIso]);
    pointsAwarded = pts;

    // Create notification for practice solve
    try {
      const notificationService = require('./notificationService');
      await notificationService.createNotification({
        userId,
        title: 'Practice Problem Solved! 🎉',
        message: `You solved "${question.title || 'Practice Problem'}"! +${pts} Practice points added to your Total Score.`,
        category: 'practice',
        type: 'practice_completed',
        link: '/practice'
      });

      // Check practice solve milestone
      const solvedCountRow = await repo.one(`
        SELECT COUNT(*) AS count FROM points_ledger 
        WHERE user_id = ? AND category = 'practice'
      `, [userId]);
      const solvedCount = Number(solvedCountRow?.count || 0);
      if ([5, 10, 25, 50, 80].includes(solvedCount)) {
        await notificationService.createNotification({
          userId,
          title: `🎯 Milestone: ${solvedCount} Practice Problems Solved!`,
          message: `Outstanding consistency! You have completed ${solvedCount} practice problems in the problem bank.`,
          category: 'practice',
          type: 'practice_milestone',
          link: '/progress'
        });
      }
    } catch (_) {}
  }

  const breakdown = await syncUserScore(userId);
  return { pointsAwarded, breakdown };
}

/**
 * Award daily challenge solve points (50/100/150 pts based on difficulty) and streak bonus (+20 pts).
 * Idempotent: points awarded once per daily challenge.
 * Daily challenge points contribute to total_score and leaderboard_score.
 * Streak bonus contributes to total_score ONLY.
 */
async function awardDailyChallengeSolve(userId, challengeId, startedAt = null) {
  const user = await repo.one(
    'SELECT id, streak, longest_streak, last_active_at FROM users WHERE id = ?',
    [userId]
  );
  if (!user) return null;

  const challenge = (await repo.one(
    'SELECT id, difficulty, points, title FROM daily_challenge_problems WHERE id = ?',
    [challengeId]
  )) || (await repo.one(
    'SELECT id, difficulty, points, title FROM questions WHERE id = ?',
    [challengeId]
  ));
  const isDailyQuestion = Boolean(await repo.one('SELECT id FROM daily_questions WHERE question_id = ? OR challenge_id = ?', [challengeId, challengeId]));
  let pts = challenge ? getDailyChallengePointsForDifficulty(challenge.difficulty) : 100;
  if (isDailyQuestion) {
    pts = Math.max(pts, 100);
  }

  const nowIso = new Date().toISOString();
  const today = todayUtc();
  const ledgerId = `pl-dc-${userId}-${challengeId}`;

  const existingDc = await repo.one(
    "SELECT id FROM points_ledger WHERE user_id = ? AND source_type = 'DAILY_CHALLENGE_SOLVE' AND source_id = ?",
    [userId, challengeId]
  );

  let pointsAwarded = 0;
  if (!existingDc) {
    await repo.execute(`
      INSERT INTO points_ledger (id, user_id, source_type, source_id, points, category, reason, created_at)
      VALUES (?, ?, 'DAILY_CHALLENGE_SOLVE', ?, ?, 'daily_challenge', 'Daily Challenge Solve', ?)
    `, [ledgerId, userId, challengeId, pts, nowIso]);
    pointsAwarded = pts;
  }

  // Calculate Streak & Streak Bonus
  const last = user.last_active_at ? String(user.last_active_at).slice(0, 10) : null;
  let streak = Number(user.streak || 0);

  if (last === today) {
    if (streak === 0) streak = 1;
  } else if (last) {
    const days = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${last}T00:00:00Z`)) / 86400000);
    streak = days === 1 ? streak + 1 : 1;
  } else {
    streak = 1;
  }

  const longest = Math.max(Number(user.longest_streak || 0), streak);

  // Award Streak Bonus (+20 pts) once per date
  const streakLedgerId = `pl-sr-${userId}-${today}`;
  const existingStreakBonus = await repo.one(
    "SELECT id FROM points_ledger WHERE user_id = ? AND source_type = 'STREAK_REWARD' AND source_id = ?",
    [userId, today]
  );

  let streakBonusAwarded = 0;
  if (!existingStreakBonus) {
    await repo.execute(`
      INSERT INTO points_ledger (id, user_id, source_type, source_id, points, category, reason, created_at)
      VALUES (?, ?, 'STREAK_REWARD', ?, 20, 'streak', 'Daily Streak Bonus', ?)
    `, [streakLedgerId, userId, today, nowIso]);
    streakBonusAwarded = 20;
  }

  await repo.execute(
    'UPDATE users SET streak = ?, longest_streak = ?, last_active_at = ? WHERE id = ?',
    [streak, longest, nowIso, userId]
  );

  // Send notifications for daily solve & streak milestone
  if (pointsAwarded > 0) {
    try {
      const notificationService = require('./notificationService');
      const challengeTitle = challenge?.title || 'Daily Challenge';
      await notificationService.createNotification({
        userId,
        title: 'Daily Challenge Solved! 🏆',
        message: `You solved "${challengeTitle}"! +${pts} Daily Challenge points and +${streakBonusAwarded} streak bonus awarded.`,
        category: 'daily_challenge',
        type: 'daily_challenge_completed',
        link: '/daily-challenge'
      });

      if ([3, 7, 14, 30, 60, 100].includes(streak)) {
        await notificationService.createNotification({
          userId,
          title: `🔥 ${streak}-Day Streak Milestone!`,
          message: `You've maintained a ${streak}-day Daily Challenge streak! Streak bonus unlocked.`,
          category: 'achievement',
          type: 'streak_milestone',
          link: '/daily-challenge'
        });
      }
    } catch (_) {}
  }

  const breakdown = await syncUserScore(userId);
  await refreshCompetitiveRanks();

  return {
    pointsAwarded,
    streakBonusAwarded,
    streak,
    longest_streak: longest,
    breakdown
  };
}

// Backward compatibility alias for legacy tests
async function awardSolve(userId, questionId, startedAt = null) {
  const q = await repo.one('SELECT id, is_practice FROM questions WHERE id = ?', [questionId]);
  if (q && Boolean(q.is_practice)) {
    const res = await awardPracticeSolve(userId, questionId);
    return { points: res.breakdown.total_score, streak: 1, longest_streak: 1 };
  } else {
    const res = await awardDailyChallengeSolve(userId, questionId, startedAt);
    return { points: res?.breakdown?.total_score || 100, streak: res?.streak || 1, longest_streak: res?.longest_streak || 1 };
  }
}

module.exports = {
  getUserScoreBreakdown,
  syncUserScore,
  awardPracticeSolve,
  awardDailyChallengeSolve,
  awardSolve,
  refreshCompetitiveRanks
};
