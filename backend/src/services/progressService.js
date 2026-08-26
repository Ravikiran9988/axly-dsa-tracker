const { db } = require('../db/db');

function getUserProgress(userId) {
  // 1. Total currently assigned active questions (the denominator)
  const assignedActiveRow = db.prepare(`
    SELECT COUNT(*) as total
    FROM assignments a
    JOIN questions q ON a.question_id = q.id
    WHERE a.user_id = ? AND a.status = 'assigned' AND q.is_active = 1
  `).get(userId);
  const assignedCount = assignedActiveRow.total;

  // 2. Solved currently-assigned active questions (the numerator)
  const solvedActiveRow = db.prepare(`
    SELECT COUNT(*) as total
    FROM assignments a
    JOIN questions q ON a.question_id = q.id
    JOIN submissions s ON s.question_id = q.id AND s.user_id = a.user_id
    WHERE a.user_id = ? AND a.status = 'assigned' AND q.is_active = 1 AND s.status = 'solved'
  `).get(userId);
  const solvedCount = solvedActiveRow.total;

  // 3. Attempted currently-assigned active questions
  const attemptedActiveRow = db.prepare(`
    SELECT COUNT(*) as total
    FROM assignments a
    JOIN questions q ON a.question_id = q.id
    JOIN submissions s ON s.question_id = q.id AND s.user_id = a.user_id
    WHERE a.user_id = ? AND a.status = 'assigned' AND q.is_active = 1 AND s.status IN ('attempted', 'solved')
  `).get(userId);
  const attemptedCount = attemptedActiveRow.total;

  // 4. Pending assignments (assigned but not solved)
  const pendingCount = Math.max(0, assignedCount - solvedCount);

  // 5. Completion percentage
  const completionPercentage = assignedCount > 0 
    ? Math.round((solvedCount / assignedCount) * 100 * 10) / 10 
    : 0;

  // 6. Difficulty Breakdown (only for currently assigned active questions)
  const difficulties = ['easy', 'medium', 'hard'];
  const difficultyBreakdown = {};

  for (const diff of difficulties) {
    const diffAssigned = db.prepare(`
      SELECT COUNT(*) as total
      FROM assignments a
      JOIN questions q ON a.question_id = q.id
      WHERE a.user_id = ? AND a.status = 'assigned' AND q.is_active = 1 AND q.difficulty = ?
    `).get(userId, diff).total;

    const diffSolved = db.prepare(`
      SELECT COUNT(*) as total
      FROM assignments a
      JOIN questions q ON a.question_id = q.id
      JOIN submissions s ON s.question_id = q.id AND s.user_id = a.user_id
      WHERE a.user_id = ? AND a.status = 'assigned' AND q.is_active = 1 AND q.difficulty = ? AND s.status = 'solved'
    `).get(userId, diff).total;

    difficultyBreakdown[diff] = {
      assigned: diffAssigned,
      solved: diffSolved,
      percentage: diffAssigned > 0 ? Math.round((diffSolved / diffAssigned) * 100) : 0
    };
  }

  // 7. Historical solved total (including unassigned questions, for audit / lifetime stats)
  const historicalSolved = db.prepare(`
    SELECT COUNT(*) as total
    FROM submissions
    WHERE user_id = ? AND status = 'solved'
  `).get(userId).total;

  // 8. Recent activity (last 5 submissions)
  const recentActivity = db.prepare(`
    SELECT 
      s.id as submission_id,
      s.status,
      s.attempted_at,
      s.solved_at,
      q.id as question_id,
      q.title as question_title,
      q.difficulty as question_difficulty
    FROM submissions s
    JOIN questions q ON s.question_id = q.id
    WHERE s.user_id = ?
    ORDER BY COALESCE(s.solved_at, s.attempted_at) DESC
    LIMIT 5
  `).all(userId);

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

function getAdminAggregateProgress({ page = 1, limit = 20, search }) {
  const offset = (page - 1) * limit;
  let whereClauses = ["u.role != 'admin'"];
  const params = [];

  if (search) {
    whereClauses.push('(LOWER(u.name) LIKE ? OR LOWER(u.email) LIKE ?)');
    params.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`);
  }

  const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

  const total = db.prepare(`SELECT COUNT(*) as total FROM users u ${whereSql}`).get(...params).total;

  const users = db.prepare(`
    SELECT id, name, email, role, created_at
    FROM users u
    ${whereSql}
    ORDER BY name ASC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const data = users.map(user => {
    const progress = getUserProgress(user.id);
    return {
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
    };
  });

  return {
    data,
    page: Number(page),
    limit: Number(limit),
    total
  };
}

function getAdminSystemStats() {
  const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role != 'admin'").get().count;
  const totalActiveQuestions = db.prepare("SELECT COUNT(*) as count FROM questions WHERE is_active = 1").get().count;
  const totalAssignments = db.prepare("SELECT COUNT(*) as count FROM assignments WHERE status = 'assigned'").get().count;
  const totalSolved = db.prepare("SELECT COUNT(*) as count FROM submissions WHERE status = 'solved'").get().count;
  const totalAttempted = db.prepare("SELECT COUNT(*) as count FROM submissions WHERE status IN ('attempted', 'solved')").get().count;

  return {
    total_users: totalUsers,
    total_active_questions: totalActiveQuestions,
    total_active_assignments: totalAssignments,
    total_solved_submissions: totalSolved,
    total_attempted_submissions: totalAttempted
  };
}

module.exports = {
  getUserProgress,
  getAdminAggregateProgress,
  getAdminSystemStats
};
