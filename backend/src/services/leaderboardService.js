const { getRepository } = require('../db/repositoryFactory');

const repo = getRepository();

/**
 * Single source of truth for competitive leaderboard ordering.
 *
 * ALL-TIME RULE:
 * 1. Total Points (descending)
 * 2. Active Daily Streak (descending)
 * 3. Longest Streak (descending)
 * 4. User Name (ascending alphabetical)
 * 5. User ID (ascending stable tiebreaker)
 *
 * PERIOD (WEEKLY / MONTHLY) RULE:
 * 1. Period Points (descending)
 * 2. Period Solved Count (descending)
 * 3. User Name (ascending alphabetical)
 * 4. User ID (ascending stable tiebreaker)
 *
 * Note: Period boards intentionally do NOT use all-time streak as a period tiebreaker,
 * ensuring deterministic period-scoped rankings.
 */
const ALL_TIME_ORDER = 'points DESC, streak DESC, longest_streak DESC, name ASC, id ASC';
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
        COALESCE(points, 0) AS points,
        COALESCE(streak, 0) AS streak,
        COALESCE(longest_streak, 0) AS longest_streak,
        (SELECT COUNT(*) FROM submissions s WHERE s.user_id = u.id AND s.status IN ('solved', 'completed', 'approved')) AS completed_count,
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
      COALESCE(u.streak, 0) AS streak,
      COALESCE(u.longest_streak, 0) AS longest_streak,
      (
        SELECT COALESCE(SUM(CASE WHEN l.status IN ('Accepted', 'approved', 'Approved') OR l.passed_tests = l.total_tests THEN 100 ELSE 0 END), 0)
        FROM code_submissions_log l
        WHERE l.user_id = u.id AND l.created_at >= (CURRENT_TIMESTAMP - INTERVAL '${days} days')
      ) AS points,
      (
        SELECT COUNT(DISTINCT s.question_id)
        FROM submissions s
        WHERE s.user_id = u.id AND s.status IN ('solved', 'completed', 'approved')
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
        COALESCE(u.streak, 0) AS streak,
        COALESCE(u.longest_streak, 0) AS longest_streak,
        (
          SELECT COALESCE(SUM(CASE WHEN l.status IN ('Accepted', 'approved', 'Approved') OR l.passed_tests = l.total_tests THEN 100 ELSE 0 END), 0)
          FROM code_submissions_log l
          WHERE l.user_id = u.id AND datetime(l.created_at) >= datetime('now', '-${days} days')
        ) AS points,
        (
          SELECT COUNT(DISTINCT s.question_id)
          FROM submissions s
          WHERE s.user_id = u.id AND s.status IN ('solved', 'completed', 'approved')
            AND datetime(COALESCE(s.solved_at, s.updated_at, s.created_at)) >= datetime('now', '-${days} days')
        ) AS completed_count,
        (SELECT COUNT(*) FROM user_badges ub WHERE ub.user_id = u.id) AS badge_count
      FROM users u
      WHERE u.role = 'user'
      ORDER BY ${PERIOD_ORDER}
      LIMIT ?
    `, [safeLimit]);
  });

  return rows.map((u, i) => ({ ...u, rank: i + 1, period: normalizedPeriod }));
}

module.exports = {
  COMPETITIVE_ORDER: ALL_TIME_ORDER,
  PERIOD_ORDER,
  refreshCompetitiveRanks,
  getCompetitiveLeaders
};
