const { getRepository } = require('../db/repositoryFactory');

const repo = getRepository();

async function getUserProgress(userId) {
  // 1. Total currently assigned active questions
  const assignedActiveRow = await repo.one(`
    SELECT COUNT(*) AS total
    FROM assignments a
    JOIN questions q ON a.question_id = q.id
    WHERE a.user_id = ? AND a.status = 'assigned' AND q.is_active = TRUE
  `, [userId]);
  const assignedCount = Number(assignedActiveRow?.total || 0);

  // 2. Solved currently-assigned active questions
  const solvedActiveRow = await repo.one(`
    SELECT COUNT(*) AS total
    FROM assignments a
    JOIN questions q ON a.question_id = q.id
    JOIN submissions s ON s.question_id = q.id AND s.user_id = a.user_id
    WHERE a.user_id = ? AND a.status = 'assigned' AND q.is_active = TRUE AND s.status IN ('solved', 'completed', 'approved')
  `, [userId]);
  const solvedCount = Number(solvedActiveRow?.total || 0);

  // 3. Attempted currently-assigned active questions
  const attemptedActiveRow = await repo.one(`
    SELECT COUNT(*) AS total
    FROM assignments a
    JOIN questions q ON a.question_id = q.id
    JOIN submissions s ON s.question_id = q.id AND s.user_id = a.user_id
    WHERE a.user_id = ? AND a.status = 'assigned' AND q.is_active = TRUE AND s.status IN ('attempted', 'solved', 'completed', 'approved')
  `, [userId]);
  const attemptedCount = Number(attemptedActiveRow?.total || 0);

  // 4. Pending assignments
  const pendingCount = Math.max(0, assignedCount - solvedCount);

  // 5. Completion percentage
  const completionPercentage = assignedCount > 0 
    ? Math.round((solvedCount / assignedCount) * 100 * 10) / 10 
    : 0;

  // 6. Difficulty Breakdown
  const difficulties = ['easy', 'medium', 'hard'];
  const difficultyBreakdown = {};

  for (const diff of difficulties) {
    const diffAssignedRow = await repo.one(`
      SELECT COUNT(*) AS total
      FROM assignments a
      JOIN questions q ON a.question_id = q.id
      WHERE a.user_id = ? AND a.status = 'assigned' AND q.is_active = TRUE AND LOWER(q.difficulty) = ?
    `, [userId, diff]);
    const diffAssigned = Number(diffAssignedRow?.total || 0);

    const diffSolvedRow = await repo.one(`
      SELECT COUNT(*) AS total
      FROM assignments a
      JOIN questions q ON a.question_id = q.id
      JOIN submissions s ON s.question_id = q.id AND s.user_id = a.user_id
      WHERE a.user_id = ? AND a.status = 'assigned' AND q.is_active = TRUE AND LOWER(q.difficulty) = ? AND s.status IN ('solved', 'completed', 'approved')
    `, [userId, diff]);
    const diffSolved = Number(diffSolvedRow?.total || 0);

    difficultyBreakdown[diff] = {
      assigned: diffAssigned,
      solved: diffSolved,
      percentage: diffAssigned > 0 ? Math.round((diffSolved / diffAssigned) * 100) : 0
    };
  }

  // 7. Historical solved total
  const historicalSolvedRow = await repo.one(`
    SELECT COUNT(*) AS total
    FROM submissions
    WHERE user_id = ? AND status IN ('solved', 'completed', 'approved')
  `, [userId]);
  const historicalSolved = Number(historicalSolvedRow?.total || 0);

  // 8. Recent activity (last 5 submissions)
  const recentActivity = await repo.many(`
    SELECT 
      s.id AS submission_id,
      s.status,
      s.attempted_at,
      s.solved_at,
      q.id AS question_id,
      q.title AS question_title,
      q.difficulty AS question_difficulty
    FROM submissions s
    JOIN questions q ON s.question_id = q.id
    WHERE s.user_id = ?
    ORDER BY COALESCE(s.solved_at, s.attempted_at, s.updated_at) DESC
    LIMIT 5
  `, [userId]);

  return {
    assigned_count: assignedCount,
    attempted_count: attemptedCount,
    solved_count: solvedCount,
    pending_count: pendingCount,
    completion_percentage: completionPercentage,
    difficulty_breakdown: difficultyBreakdown,
    historical_solved_count: historicalSolved,
    recent_activity: recentActivity
  };
}

async function getAdminAggregateProgress({ page = 1, limit = 20, search }) {
  const p = Math.max(1, Number(page) || 1);
  const l = Math.max(1, Number(limit) || 20);
  const offset = (p - 1) * l;
  let whereClauses = ["u.role != 'admin'"];
  const params = [];

  if (search && search.trim()) {
    whereClauses.push('(LOWER(u.name) LIKE ? OR LOWER(u.email) LIKE ?)');
    const s = `%${search.trim().toLowerCase()}%`;
    params.push(s, s);
  }

  const whereSql = `WHERE ${whereClauses.join(' AND ')}`;
  const countRow = await repo.one(`SELECT COUNT(*) AS total FROM users u ${whereSql}`, params);
  const total = Number(countRow?.total || 0);

  const users = await repo.many(`
    SELECT id, name, email, role, created_at
    FROM users u
    ${whereSql}
    ORDER BY name ASC
    LIMIT ? OFFSET ?
  `, [...params, l, offset]);

  const data = [];
  for (const user of users) {
    const progress = await getUserProgress(user.id);
    data.push({
      user_id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      assigned_count: progress.assigned_count,
      attempted_count: progress.attempted_count,
      solved_count: progress.solved_count,
      pending_count: progress.pending_count,
      completion_percentage: progress.completion_percentage,
      historical_solved_count: progress.historical_solved_count
    });
  }

  return { data, page: p, limit: l, total };
}

async function getAdminSystemStats() {
  const totalUsersRow = await repo.one("SELECT COUNT(*) AS count FROM users WHERE role != 'admin'");
  const totalActiveQuestionsRow = await repo.one("SELECT COUNT(*) AS count FROM questions WHERE is_active = TRUE");
  const totalAssignmentsRow = await repo.one("SELECT COUNT(*) AS count FROM assignments WHERE status = 'assigned'");
  const totalSolvedRow = await repo.one("SELECT COUNT(*) AS count FROM submissions WHERE status IN ('solved', 'completed', 'approved')");
  const totalAttemptedRow = await repo.one("SELECT COUNT(*) AS count FROM submissions WHERE status IN ('attempted', 'solved', 'completed', 'approved')");

  return {
    total_users: Number(totalUsersRow?.count || 0),
    total_active_questions: Number(totalActiveQuestionsRow?.count || 0),
    total_active_assignments: Number(totalAssignmentsRow?.count || 0),
    total_solved_submissions: Number(totalSolvedRow?.count || 0),
    total_attempted_submissions: Number(totalAttemptedRow?.count || 0)
  };
}

module.exports = {
  getUserProgress,
  getAdminAggregateProgress,
  getAdminSystemStats
};
