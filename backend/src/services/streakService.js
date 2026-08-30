const { getRepository } = require('../db/repositoryFactory');
const { v4: uuidv4 } = require('uuid');

const APP_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Kolkata';

/**
 * Returns calendar date in 'YYYY-MM-DD' format for the application's timezone.
 */
function getCalendarDate(date = new Date(), timeZone = APP_TIMEZONE) {
  try {
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(d);

    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;
    if (year && month && day) return `${year}-${month}-${day}`;
    return new Date(d).toISOString().slice(0, 10);
  } catch (e) {
    return new Date(date).toISOString().slice(0, 10);
  }
}

/**
 * Computes calendar day difference (date2 - date1).
 */
function getDaysDifference(dateStr1, dateStr2) {
  if (!dateStr1 || !dateStr2) return null;
  const dStr1 = dateStr1 instanceof Date ? dateStr1.toISOString() : String(dateStr1);
  const dStr2 = dateStr2 instanceof Date ? dateStr2.toISOString() : String(dateStr2);
  const d1 = Date.parse(`${dStr1.slice(0, 10)}T00:00:00Z`);
  const d2 = Date.parse(`${dStr2.slice(0, 10)}T00:00:00Z`);
  if (isNaN(d1) || isNaN(d2)) return null;
  return Math.round((d2 - d1) / 86400000);
}

/**
 * Records daily login / activity and updates Individual Streak.
 * Idempotent: multiple logins on the same calendar day count as 1 day.
 */
async function recordDailyLogin(userId, overrideDate = null) {
  if (!userId) return null;
  const repo = getRepository();
  const today = overrideDate || getCalendarDate();
  const nowIso = new Date().toISOString();

  const user = await repo.one(
    `SELECT id, individual_streak, individual_best_streak, last_login_date, streak, longest_streak 
     FROM users WHERE id = ?`,
    [userId]
  );
  if (!user) return null;

  // Check if today's activity is already recorded
  const activityExists = await repo.one(
    'SELECT id FROM user_daily_activity WHERE user_id = ? AND activity_date = ?',
    [userId, today]
  );

  let currentStreak = Number(user.individual_streak ?? user.streak ?? 0);
  let bestStreak = Number(user.individual_best_streak ?? user.longest_streak ?? currentStreak);
  let streakBonusAwarded = 0;

  if (!activityExists) {
    const actId = `act-${userId}-${today}`;
    try {
      await repo.execute(
        `INSERT INTO user_daily_activity (id, user_id, activity_date, activity_type, created_at)
         VALUES (?, ?, ?, 'login', ?)`,
        [actId, userId, today, nowIso]
      );
    } catch (e) {
      // Ignore duplicate key race conditions
    }

    const lastLogin = user.last_login_date;
    if (!lastLogin) {
      currentStreak = 1;
    } else {
      const diff = getDaysDifference(lastLogin, today);
      if (diff === 0) {
        // Same day: keep streak
        if (currentStreak === 0) currentStreak = 1;
      } else if (diff === 1) {
        // Consecutive calendar day
        currentStreak = (currentStreak || 0) + 1;
      } else if (diff > 1) {
        // Missed one or more days: restart streak at 1
        currentStreak = 1;
      }
    }

    bestStreak = Math.max(bestStreak, currentStreak);

    // Award Individual Streak Bonus (+20 pts) once per date
    const streakLedgerId = `pl-sr-${userId}-${today}`;
    const existingBonus = await repo.one(
      "SELECT id FROM points_ledger WHERE user_id = ? AND source_type = 'STREAK_REWARD' AND source_id = ?",
      [userId, today]
    );

    if (!existingBonus) {
      try {
        await repo.execute(
          `INSERT INTO points_ledger (id, user_id, source_type, source_id, points, category, reason, created_at)
           VALUES (?, ?, 'STREAK_REWARD', ?, 20, 'streak', 'Daily Activity Streak Bonus', ?)`,
          [streakLedgerId, userId, today, nowIso]
        );
        streakBonusAwarded = 20;
      } catch (e) {
        // Ignore duplicate key
      }
    }

    // Update user record
    await repo.execute(
      `UPDATE users 
       SET individual_streak = ?, individual_best_streak = ?, last_login_date = ?, 
           streak = ?, longest_streak = ?, last_active_at = ?
       WHERE id = ?`,
      [currentStreak, bestStreak, today, currentStreak, bestStreak, nowIso, userId]
    );

    // Synchronize score breakdown
    const { recalculateUserScore } = require('./gamificationService');
    await recalculateUserScore(userId);

    // Trigger milestone notifications for Individual Streak
    if ([3, 7, 14, 30, 60, 100].includes(currentStreak)) {
      const { createNotification } = require('./notificationService');
      await createNotification({
        userId,
        title: `⚡ ${currentStreak}-Day Activity Streak!`,
        message: `You've logged into AXLY for ${currentStreak} consecutive days! Keep up the great momentum.`,
        category: 'achievement',
        type: 'streak_milestone',
        link: '/analytics'
      });
    }
  }

  return {
    individualStreak: currentStreak,
    individualBestStreak: bestStreak,
    streakBonusAwarded
  };
}

/**
 * Records a successful Daily Challenge solve and increments Daily Challenge Streak.
 * Idempotent: same-day multiple solves of the daily challenge count once.
 */
async function recordDailyChallengeSolve(userId, overrideDate = null) {
  if (!userId) return { dailyChallengeStreak: 0, dailyChallengeBestStreak: 0 };
  const repo = getRepository();
  const today = overrideDate || getCalendarDate();

  const user = await repo.one(
    `SELECT id, daily_challenge_streak, daily_challenge_best_streak, last_daily_challenge_solve_date
     FROM users WHERE id = ?`,
    [userId]
  );
  if (!user) return { dailyChallengeStreak: 0, dailyChallengeBestStreak: 0 };

  let currentStreak = Number(user.daily_challenge_streak || 0);
  let bestStreak = Number(user.daily_challenge_best_streak || currentStreak);
  const lastSolve = user.last_daily_challenge_solve_date;

  if (lastSolve === today) {
    // Already solved today: idempotent, don't increment again
    return {
      dailyChallengeStreak: currentStreak,
      dailyChallengeBestStreak: bestStreak
    };
  }

  if (!lastSolve) {
    currentStreak = 1;
  } else {
    const diff = getDaysDifference(lastSolve, today);
    if (diff === 1) {
      // Consecutive day solve
      currentStreak = currentStreak + 1;
    } else if (diff > 1) {
      // Missed challenge day: restart streak at 1
      currentStreak = 1;
    } else {
      currentStreak = currentStreak || 1;
    }
  }

  bestStreak = Math.max(bestStreak, currentStreak);

  await repo.execute(
    `UPDATE users 
     SET daily_challenge_streak = ?, daily_challenge_best_streak = ?, last_daily_challenge_solve_date = ?
     WHERE id = ?`,
    [currentStreak, bestStreak, today, userId]
  );

  // Trigger milestone notifications for Daily Challenge Streak
  if ([3, 7, 14, 30, 60, 100].includes(currentStreak)) {
    const { createNotification } = require('./notificationService');
    await createNotification({
      userId,
      title: `🔥 ${currentStreak}-Day Challenge Streak!`,
      message: `You've solved the Daily Challenge for ${currentStreak} consecutive days!`,
      category: 'daily_challenge',
      type: 'daily_challenge_completed',
      link: '/daily-challenge'
    });
  }

  return {
    dailyChallengeStreak: currentStreak,
    dailyChallengeBestStreak: bestStreak
  };
}

/**
 * Returns formatted streak information for a user.
 */
async function getUserStreaks(userId) {
  if (!userId) {
    return {
      individualStreak: 0,
      individualBestStreak: 0,
      dailyChallengeStreak: 0,
      dailyChallengeBestStreak: 0
    };
  }
  const repo = getRepository();
  const user = await repo.one(
    `SELECT individual_streak, individual_best_streak, daily_challenge_streak, daily_challenge_best_streak,
            streak, longest_streak
     FROM users WHERE id = ?`,
    [userId]
  );

  if (!user) {
    return {
      individualStreak: 0,
      individualBestStreak: 0,
      dailyChallengeStreak: 0,
      dailyChallengeBestStreak: 0
    };
  }

  const individualStreak = Number(user.individual_streak ?? user.streak ?? 0);
  const individualBestStreak = Number(user.individual_best_streak ?? user.longest_streak ?? individualStreak);
  const dailyChallengeStreak = Number(user.daily_challenge_streak ?? 0);
  const dailyChallengeBestStreak = Number(user.daily_challenge_best_streak ?? dailyChallengeStreak);

  return {
    individualStreak,
    individualBestStreak,
    dailyChallengeStreak,
    dailyChallengeBestStreak
  };
}

module.exports = {
  APP_TIMEZONE,
  getCalendarDate,
  getDaysDifference,
  recordDailyLogin,
  recordDailyChallengeSolve,
  getUserStreaks
};
