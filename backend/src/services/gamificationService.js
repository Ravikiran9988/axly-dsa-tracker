const { getRepository } = require('../db/repositoryFactory');
const { refreshCompetitiveRanks } = require('./leaderboardService');
const { getCalendarDate, recordDailyChallengeSolve } = require('./streakService');
const { v4: uuidv4 } = require('uuid');

const repo = getRepository();

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
 * Does NOT alter login streak or challenge streak.
 */
async function awardPracticeSolve(userId, questionId) {
  const question = await repo.one('SELECT id, difficulty, title FROM questions WHERE id = ?', [questionId]);
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
 * Award daily challenge solve points (50/100/150 pts based on difficulty) and updates Daily Challenge Streak.
 * Idempotent: points awarded once per daily challenge.
 * Daily challenge points contribute to total_score and leaderboard_score.
 */
async function awardDailyChallengeSolve(userId, challengeId, startedAt = null) {
  const user = await repo.one(
    'SELECT id, daily_challenge_streak, daily_challenge_best_streak, last_active_at FROM users WHERE id = ?',
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
  const today = getCalendarDate();
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

  // Update Daily Challenge Streak independently
  const streakResult = await recordDailyChallengeSolve(userId, today);

  // Send notifications for daily solve
  if (pointsAwarded > 0) {
    try {
      const notificationService = require('./notificationService');
      const challengeTitle = challenge?.title || 'Daily Challenge';
      await notificationService.createNotification({
        userId,
        title: 'Daily Challenge Solved! 🏆',
        message: `You solved "${challengeTitle}"! +${pts} Daily Challenge points added to Leaderboard & Total Score.`,
        category: 'daily_challenge',
        type: 'daily_challenge_completed',
        link: '/daily-challenge'
      });
    } catch (_) {}
  }

  const breakdown = await syncUserScore(userId);
  await refreshCompetitiveRanks();

  return {
    pointsAwarded,
    breakdown,
    streakBonusAwarded: pointsAwarded > 0 ? 20 : 0,
    dailyChallengeStreak: streakResult.dailyChallengeStreak,
    dailyChallengeBestStreak: streakResult.dailyChallengeBestStreak
  };
}

async function awardSolve(userId, questionId, startedAt = null) {
  const isDaily = String(questionId || '').startsWith('dc-') || 
                  Boolean(await repo.one('SELECT id FROM daily_challenge_problems WHERE id = ?', [questionId])) || 
                  Boolean(await repo.one('SELECT id FROM daily_questions WHERE question_id = ? OR challenge_id = ?', [questionId, questionId]));
  if (isDaily) {
    return awardDailyChallengeSolve(userId, questionId, startedAt);
  }
  return awardPracticeSolve(userId, questionId);
}

module.exports = {
  getUserScoreBreakdown,
  syncUserScore,
  recalculateUserScore: syncUserScore,
  awardPracticeSolve,
  awardDailyChallengeSolve,
  awardSolve,
  getPracticePointsForDifficulty,
  getDailyChallengePointsForDifficulty
};
