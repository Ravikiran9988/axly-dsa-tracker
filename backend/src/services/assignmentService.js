const { db } = require('../db/db');
const { v4: uuidv4 } = require('uuid');
const { AppError } = require('../middleware/errorHandler');

function createAssignment({ user_id, question_id, cohort_id, due_date, priority = 'Medium', instructions, admin_id }) {
  // 1. Verify user exists
  const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(user_id);
  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  // 2. Verify question exists and is active
  const question = db.prepare('SELECT id, title, is_active FROM questions WHERE id = ?').get(question_id);
  if (!question) {
    throw new AppError('Question not found', 404, 'NOT_FOUND');
  }
  if (!question.is_active) {
    throw new AppError('Cannot assign an inactive question', 400, 'VALIDATION_ERROR', 'question_id');
  }

  // 3. Check existing assignment (Relies on UNIQUE(user_id, question_id))
  const existing = db.prepare('SELECT id, status FROM assignments WHERE user_id = ? AND question_id = ?').get(user_id, question_id);

  if (existing) {
    if (existing.status === 'assigned' || existing.status === 'ongoing') {
      throw new AppError('Question is already assigned to this user', 409, 'CONFLICT');
    }

    // Re-assigning an unassigned or completed question
    db.prepare(`
      UPDATE assignments 
      SET status = 'assigned', assigned_at = datetime('now'), assigned_by = ?, cohort_id = ?, due_date = ?, priority = ?, instructions = ?
      WHERE id = ?
    `).run(admin_id, cohort_id || null, due_date || null, priority, instructions || null, existing.id);

    // Send notification
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, link)
      VALUES (?, ?, ?, ?, 'assignment', '/tasks')
    `).run(uuidv4(), user_id, 'New Challenge Assigned', `You have been assigned "${question.title}".`);

    return getAssignmentById(existing.id);
  }

  // New assignment insert
  const id = uuidv4();
  try {
    db.prepare(`
      INSERT INTO assignments (id, user_id, question_id, cohort_id, assigned_by, status, priority, instructions, due_date, assigned_at)
      VALUES (?, ?, ?, ?, ?, 'assigned', ?, ?, ?, datetime('now'))
    `).run(id, user_id, question_id, cohort_id || null, admin_id, priority, instructions || null, due_date || null);

    // Send notification
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, link)
      VALUES (?, ?, ?, ?, 'assignment', '/tasks')
    `).run(uuidv4(), user_id, 'New Challenge Assigned', `You have been assigned "${question.title}".`);
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      throw new AppError('Question is already assigned to this user', 409, 'CONFLICT');
    }
    throw err;
  }

  return getAssignmentById(id);
}

function bulkAssign({ user_ids, question_ids, cohort_id, due_date, priority = 'Medium', instructions, admin_id }) {
  let createdCount = 0;
  let reanimatedCount = 0;
  let skippedCount = 0;
  const results = [];

  const assignTx = db.transaction(() => {
    for (const userId of user_ids) {
      const user = db.prepare('SELECT id, name FROM users WHERE id = ?').get(userId);
      if (!user) continue;

      for (const questionId of question_ids) {
        const question = db.prepare('SELECT id, title, is_active FROM questions WHERE id = ?').get(questionId);
        if (!question || !question.is_active) continue;

        const existing = db.prepare('SELECT id, status FROM assignments WHERE user_id = ? AND question_id = ?').get(userId, questionId);

        if (existing) {
          if (existing.status === 'assigned' || existing.status === 'ongoing') {
            skippedCount++;
            results.push({ user_id: userId, question_id: questionId, status: 'already_assigned' });
          } else {
            db.prepare(`
              UPDATE assignments 
              SET status = 'assigned', assigned_at = datetime('now'), assigned_by = ?, cohort_id = ?, due_date = ?, priority = ?, instructions = ?
              WHERE id = ?
            `).run(admin_id, cohort_id || null, due_date || null, priority, instructions || null, existing.id);
            reanimatedCount++;
            results.push({ user_id: userId, question_id: questionId, status: 'reassigned', id: existing.id });
          }
        } else {
          const id = uuidv4();
          db.prepare(`
            INSERT INTO assignments (id, user_id, question_id, cohort_id, assigned_by, status, priority, instructions, due_date, assigned_at)
            VALUES (?, ?, ?, ?, ?, 'assigned', ?, ?, ?, datetime('now'))
          `).run(id, userId, questionId, cohort_id || null, admin_id, priority, instructions || null, due_date || null);
          createdCount++;
          results.push({ user_id: userId, question_id: questionId, status: 'assigned', id });
        }

        // Notification
        db.prepare(`
          INSERT INTO notifications (id, user_id, title, message, type, link)
          VALUES (?, ?, ?, ?, 'assignment', '/tasks')
        `).run(uuidv4(), userId, 'New Challenge Assigned', `You have been assigned "${question.title}".`);
      }
    }
  });

  assignTx();

  return {
    total_requested: user_ids.length * question_ids.length,
    created_count: createdCount,
    reassigned_count: reanimatedCount,
    skipped_count: skippedCount,
    results
  };
}

function unassign(id) {
  const existing = db.prepare('SELECT id, status FROM assignments WHERE id = ?').get(id);
  if (!existing) {
    throw new AppError('Assignment not found', 404, 'NOT_FOUND');
  }

  db.prepare(`UPDATE assignments SET status = 'unassigned' WHERE id = ?`).run(id);
  return { message: 'Assignment successfully set to unassigned', id };
}

function getAssignmentById(id) {
  return db.prepare(`
    SELECT 
      a.id,
      a.user_id,
      u.name as user_name,
      u.email as user_email,
      a.question_id,
      q.title as question_title,
      q.difficulty as question_difficulty,
      q.points as question_points,
      q.is_active as question_is_active,
      a.cohort_id,
      c.name as cohort_name,
      a.assigned_by,
      ab.name as assigned_by_name,
      a.status,
      a.priority,
      a.instructions,
      a.due_date,
      a.assigned_at
    FROM assignments a
    JOIN users u ON a.user_id = u.id
    JOIN questions q ON a.question_id = q.id
    JOIN users ab ON a.assigned_by = ab.id
    LEFT JOIN cohorts c ON a.cohort_id = c.id
    WHERE a.id = ?
  `).get(id);
}

function listAssignments({ currentUser, user_id, status, page = 1, limit = 50 }) {
  const offset = (page - 1) * limit;
  let whereClauses = [];
  const params = [];

  // If normal user, can only view own assignments
  if (currentUser.role !== 'admin' && currentUser.role !== 'mentor') {
    whereClauses.push('a.user_id = ?');
    params.push(currentUser.id);
  } else if (user_id) {
    whereClauses.push('a.user_id = ?');
    params.push(user_id);
  }

  const todayStr = new Date().toISOString().split('T')[0];

  if (status && status !== 'all') {
    if (status === 'overdue') {
      whereClauses.push("a.due_date IS NOT NULL AND a.due_date < ? AND (s.status IS NULL OR s.status NOT IN ('solved', 'completed', 'approved'))");
      params.push(todayStr);
    } else if (status === 'completed') {
      whereClauses.push("(a.status = 'completed' OR s.status IN ('solved', 'completed', 'approved'))");
    } else if (status === 'ongoing') {
      whereClauses.push("(a.status = 'ongoing' OR s.status IN ('attempted', 'under_review', 'changes_requested'))");
    } else if (status === 'incomplete') {
      whereClauses.push("(a.status = 'incomplete' OR (s.status IS NULL OR s.status = 'not_started'))");
    } else {
      whereClauses.push('a.status = ?');
      params.push(status);
    }
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const total = db.prepare(`SELECT COUNT(*) as total FROM assignments a LEFT JOIN submissions s ON s.question_id = a.question_id AND s.user_id = a.user_id ${whereSql}`).get(...params).total;

  const query = `
    SELECT 
      a.id,
      a.user_id,
      u.name as user_name,
      u.email as user_email,
      a.question_id,
      q.title as question_title,
      q.difficulty as question_difficulty,
      q.points as question_points,
      q.estimated_time,
      t.name as topic_name,
      q.url as question_url,
      q.is_active as question_is_active,
      a.cohort_id,
      c.name as cohort_name,
      a.assigned_by,
      ab.name as assigned_by_name,
      a.status,
      a.priority,
      a.instructions,
      a.due_date,
      a.assigned_at,
      s.id as submission_id,
      s.submission_type,
      s.status as submission_status,
      s.review_status,
      s.feedback,
      s.attempted_at,
      s.solved_at,
      CASE 
        WHEN a.due_date IS NOT NULL AND a.due_date < '${todayStr}' AND (s.status IS NULL OR s.status NOT IN ('solved', 'completed', 'approved')) THEN 1 
        ELSE 0 
      END as is_overdue
    FROM assignments a
    JOIN users u ON a.user_id = u.id
    JOIN questions q ON a.question_id = q.id
    LEFT JOIN topics t ON q.topic_id = t.id
    JOIN users ab ON a.assigned_by = ab.id
    LEFT JOIN cohorts c ON a.cohort_id = c.id
    LEFT JOIN submissions s ON s.question_id = a.question_id AND s.user_id = a.user_id
    ${whereSql}
    ORDER BY a.assigned_at DESC
    LIMIT ? OFFSET ?
  `;

  const data = db.prepare(query).all(...params, limit, offset);

  return {
    data: data.map(d => ({
      ...d,
      is_overdue: Boolean(d.is_overdue)
    })),
    page: Number(page),
    limit: Number(limit),
    total
  };
}

module.exports = {
  createAssignment,
  bulkAssign,
  unassign,
  getAssignmentById,
  listAssignments
};
