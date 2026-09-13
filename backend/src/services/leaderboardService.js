const { getRepository } = require('../db/repositoryFactory');

const repo = getRepository();

/**
 * Single source of truth for competitive leaderboard ordering.
 *
 * CRITICAL RULE:
 * Leaderboard Score = Daily Challenge Points ONLY.
 * Practice points and streak bonuses NEVER affect the leaderboard ranking.
 *
 * ALL-TIME RULE:
 * 1. Leaderboard Score / Daily Challenge Points (descending)
 * 2. Daily Challenge Streak (descending)
 * 3. Daily Challenge Best Streak (descending)
 * 4. User Name (ascending alphabetical)
 * 5. User ID (ascending stable tiebreaker)
 *
 * PERIOD (WEEKLY / MONTHLY) RULE:
 * 1. Period Daily Challenge Points (descending)
 * 2. Period Solved Count (descending)
 * 3. User Name (ascending alphabetical)
 * 4. User ID (ascending stable tiebreaker)
 */
const ALL_TIME_ORDER = 'COALESCE(leaderboard_score, daily_challenge_points, 0) DESC, daily_challenge_streak DESC, daily_challenge_best_streak DESC, name ASC, id ASC';
const PERIOD_ORDER = 'points DESC, completed_count DESC, name ASC, id ASC';

async function refreshCompetitiveRanks() {
  const users = await repo.many(`SELECT id FROM users WHERE role = 'user' ORDER BY ${ALL_TIME_ORDER}`);
  for (let i = 0; i < users.length; i++) {
    await repo.execute('UPDATE users SET rank = ? WHERE id = ?', [i + 1, users[i].id]);
  }
}

async function getCompetitiveLeaders(limit = 100, period = 'all') {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 100, 500));
  const normalizedPeriod = ['all', 'weekly', 'monthly'].includes(period) ? period : 'all';

  if (normalizedPeriod === 'all') {
    const rows = await repo.many(`
      SELECT 
        id, name, email, avatar_url, institution,
        COALESCE(leaderboard_score, daily_challenge_points, 0) AS points,
        COALESCE(leaderboard_score, daily_challenge_points, 0) AS competitive_points,
        COALESCE(points, 0) AS total_score,
        COALESCE(practice_points, 0) AS practice_points,
        COALESCE(streak_bonus, 0) AS streak_bonus,
        COALESCE(daily_challenge_streak, 0) AS daily_challenge_streak,
        COALESCE(daily_challenge_best_streak, 0) AS daily_challenge_best_streak,
        COALESCE(daily_challenge_streak, 0) AS dailyChallengeStreak,
        COALESCE(daily_challenge_best_streak, 0) AS dailyChallengeBestStreak,
        COALESCE(individual_streak, streak, 0) AS individual_streak,
        COALESCE(individual_best_streak, longest_streak, 0) AS individual_best_streak,
        COALESCE(individual_streak, streak, 0) AS individualStreak,
        COALESCE(individual_best_streak, longest_streak, 0) AS individualBestStreak,
        COALESCE(daily_challenge_streak, 0) AS streak,
        COALESCE(daily_challenge_best_streak, 0) AS longest_streak,
        (
          SELECT COUNT(DISTINCT s.question_id)
          FROM submissions s
          WHERE s.user_id = u.id AND s.status IN ('solved', 'completed', 'approved')
            AND (s.question_id LIKE 'dc-%' OR s.question_id IN (SELECT id FROM daily_challenge_problems))
        ) AS completed_count,
        (SELECT COUNT(*) FROM user_badges ub WHERE ub.user_id = u.id) AS badge_count
      FROM users u
      WHERE role = 'user'
      ORDER BY ${ALL_TIME_ORDER}
      LIMIT ?
    `, [safeLimit]);

    return rows.map((u, i) => ({ ...u, rank: i + 1, period: 'all' }));
  }

  const days = normalizedPeriod === 'weekly' ? 7 : 30;
  const rows = await repo.many(`
    SELECT 
      u.id, u.name, u.email, u.avatar_url, u.institution,
      COALESCE(u.daily_challenge_streak, 0) AS daily_challenge_streak,
      COALESCE(u.daily_challenge_best_streak, 0) AS daily_challenge_best_streak,
      COALESCE(u.daily_challenge_streak, 0) AS dailyChallengeStreak,
      COALESCE(u.daily_challenge_best_streak, 0) AS dailyChallengeBestStreak,
      COALESCE(u.individual_streak, u.streak, 0) AS individual_streak,
      COALESCE(u.individual_best_streak, u.longest_streak, 0) AS individual_best_streak,
      COALESCE(u.daily_challenge_streak, 0) AS streak,
      COALESCE(u.daily_challenge_best_streak, 0) AS longest_streak,
      COALESCE(u.points, 0) AS total_score,
      (
        SELECT COALESCE(SUM(pl.points), 0)
        FROM points_ledger pl
        WHERE pl.user_id = u.id AND pl.category = 'daily_challenge'
          AND pl.created_at >= (CURRENT_TIMESTAMP - INTERVAL '${days} days')
      ) AS points,
      (
        SELECT COUNT(DISTINCT s.question_id)
        FROM submissions s
        WHERE s.user_id = u.id AND s.status IN ('solved', 'completed', 'approved')
          AND (s.question_id LIKE 'dc-%' OR s.question_id IN (SELECT id FROM daily_challenge_problems))
          AND COALESCE(s.solved_at, s.updated_at, s.created_at) >= (CURRENT_TIMESTAMP - INTERVAL '${days} days')
      ) AS completed_count,
      (SELECT COUNT(*) FROM user_badges ub WHERE ub.user_id = u.id) AS badge_count
    FROM users u
    WHERE u.role = 'user'
    ORDER BY ${PERIOD_ORDER}
    LIMIT ?
  `, [safeLimit]).catch(async () => {
    // SQLite compatibility fallback for datetime('-X days')
    return repo.many(`
      SELECT 
        u.id, u.name, u.email, u.avatar_url, u.institution,
        COALESCE(u.daily_challenge_streak, 0) AS daily_challenge_streak,
        COALESCE(u.daily_challenge_best_streak, 0) AS daily_challenge_best_streak,
        COALESCE(u.daily_challenge_streak, 0) AS dailyChallengeStreak,
        COALESCE(u.daily_challenge_best_streak, 0) AS dailyChallengeBestStreak,
        COALESCE(u.individual_streak, u.streak, 0) AS individual_streak,
        COALESCE(u.individual_best_streak, u.longest_streak, 0) AS individual_best_streak,
        COALESCE(u.daily_challenge_streak, 0) AS streak,
        COALESCE(u.daily_challenge_best_streak, 0) AS longest_streak,
        COALESCE(u.points, 0) AS total_score,
        (
          SELECT COALESCE(SUM(pl.points), 0)
          FROM points_ledger pl
          WHERE pl.user_id = u.id AND pl.category = 'daily_challenge'
            AND pl.created_at >= datetime('now', '-${days} days')
        ) AS points,
        (
          SELECT COUNT(DISTINCT s.question_id)
          FROM submissions s
          WHERE s.user_id = u.id AND s.status IN ('solved', 'completed', 'approved')
            AND (s.question_id LIKE 'dc-%' OR s.question_id IN (SELECT id FROM daily_challenge_problems))
            AND COALESCE(s.solved_at, s.updated_at, s.created_at) >= datetime('now', '-${days} days')
        ) AS completed_count,
        (SELECT COUNT(*) FROM user_badges ub WHERE ub.user_id = u.id) AS badge_count
      FROM users u
      WHERE u.role = 'user'
      ORDER BY ${PERIOD_ORDER}
      LIMIT ?
    `, [safeLimit]);
  });

  return rows.map((u, i) => ({
    ...u,
    rank: i + 1,
    competitive_points: Number(u.points || 0),
    period: normalizedPeriod
  }));
}

module.exports = {
  COMPETITIVE_ORDER: ALL_TIME_ORDER,
  refreshCompetitiveRanks,
  getCompetitiveLeaders
};
