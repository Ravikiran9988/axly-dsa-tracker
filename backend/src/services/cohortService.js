const { db } = require('../db/db');
const { v4: uuidv4 } = require('uuid');
const { AppError } = require('../middleware/errorHandler');

function listCohorts() {
  const cohorts = db.prepare(`
    SELECT 
      c.*,
      u.name as mentor_name,
      u.email as mentor_email,
      (SELECT COUNT(*) FROM cohort_members cm WHERE cm.cohort_id = c.id) as total_students,
      (SELECT COUNT(*) FROM assignments a WHERE a.cohort_id = c.id) as total_assignments,
      (
        SELECT ROUND(
          (COUNT(CASE WHEN s.status IN ('solved', 'completed', 'approved') THEN 1 END) * 100.0) / 
          NULLIF(COUNT(a.id), 0), 1
        )
        FROM assignments a
        LEFT JOIN submissions s ON s.question_id = a.question_id AND s.user_id = a.user_id
        WHERE a.cohort_id = c.id
      ) as completion_rate
    FROM cohorts c
    LEFT JOIN users u ON c.mentor_id = u.id
    ORDER BY c.created_at DESC
  `).all();

  return cohorts.map(c => ({
    ...c,
    completion_rate: c.completion_rate !== null ? c.completion_rate : 0
  }));
}

function getCohortById(id) {
  const cohort = db.prepare(`
    SELECT 
      c.*,
      u.name as mentor_name,
      u.email as mentor_email
    FROM cohorts c
    LEFT JOIN users u ON c.mentor_id = u.id
    WHERE c.id = ?
  `).get(id);

  if (!cohort) return null;

  // Fetch student roster with individual stats
  const students = db.prepare(`
    SELECT 
      u.id, u.name, u.email, u.institution, u.avatar_url, u.points, u.streak,
      cm.joined_at,
      (SELECT COUNT(*) FROM assignments a WHERE a.user_id = u.id AND a.cohort_id = ?) as assigned_count,
      (SELECT COUNT(*) FROM assignments a 
       JOIN submissions s ON s.question_id = a.question_id AND s.user_id = u.id 
       WHERE a.cohort_id = ? AND s.status IN ('solved', 'completed', 'approved')) as completed_count
    FROM cohort_members cm
    JOIN users u ON cm.user_id = u.id
    WHERE cm.cohort_id = ?
    ORDER BY u.name ASC
  `).all(id, id, id);

  // Fetch cohort assignments
  const assignments = db.prepare(`
    SELECT DISTINCT 
      q.id, q.title, q.difficulty, q.points, t.name as topic_name, a.due_date, a.priority
    FROM assignments a
    JOIN questions q ON a.question_id = q.id
    LEFT JOIN topics t ON q.topic_id = t.id
    WHERE a.cohort_id = ?
    ORDER BY a.assigned_at DESC
  `).all(id);

  return {
    ...cohort,
    students,
    assignments
  };
}

function createCohort({ name, description, mentor_id, start_date, end_date }) {
  if (!name || !name.trim()) {
    throw new AppError('Cohort name is required', 400, 'VALIDATION_ERROR', 'name');
  }

  const id = `cohort-${uuidv4().slice(0, 8)}`;
  db.prepare(`
    INSERT INTO cohorts (id, name, description, mentor_id, start_date, end_date)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, name.trim(), description || null, mentor_id || null, start_date || null, end_date || null);

  return getCohortById(id);
}

function addCohortMember({ cohort_id, user_id }) {
  const cohort = db.prepare('SELECT id FROM cohorts WHERE id = ?').get(cohort_id);
  if (!cohort) throw new AppError('Cohort not found', 404, 'NOT_FOUND');

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(user_id);
  if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

  db.prepare(`
    INSERT OR IGNORE INTO cohort_members (id, cohort_id, user_id)
    VALUES (?, ?, ?)
  `).run(uuidv4(), cohort_id, user_id);

  // Send notification to user
  db.prepare(`
    INSERT INTO notifications (id, user_id, title, message, type, link)
    VALUES (?, ?, ?, ?, 'cohort', '/dashboard')
  `).run(uuidv4(), user_id, 'Added to Cohort', 'You have been enrolled into a new learning cohort.');

  return getCohortById(cohort_id);
}

function removeCohortMember({ cohort_id, user_id }) {
  db.prepare('DELETE FROM cohort_members WHERE cohort_id = ? AND user_id = ?').run(cohort_id, user_id);
  return { message: 'Member removed from cohort' };
}

function assignCohortChallenge({ cohort_id, question_id, due_date, priority = 'Medium', instructions, assigned_by }) {
  const cohort = db.prepare('SELECT id, name FROM cohorts WHERE id = ?').get(cohort_id);
  if (!cohort) throw new AppError('Cohort not found', 404, 'NOT_FOUND');

  const question = db.prepare('SELECT id, title FROM questions WHERE id = ?').get(question_id);
  if (!question) throw new AppError('Question not found', 404, 'NOT_FOUND');

  const members = db.prepare('SELECT user_id FROM cohort_members WHERE cohort_id = ?').all(cohort_id);
  if (members.length === 0) {
    throw new AppError('Cohort has no students to assign challenge to', 400, 'VALIDATION_ERROR');
  }

  const insertAssignment = db.prepare(`
    INSERT INTO assignments (id, user_id, question_id, cohort_id, assigned_by, status, priority, instructions, due_date)
    VALUES (?, ?, ?, ?, ?, 'assigned', ?, ?, ?)
    ON CONFLICT(user_id, question_id) DO UPDATE SET
      cohort_id = excluded.cohort_id,
      priority = excluded.priority,
      instructions = excluded.instructions,
      due_date = excluded.due_date
  `);

  const insertNotif = db.prepare(`
    INSERT INTO notifications (id, user_id, title, message, type, link)
    VALUES (?, ?, ?, ?, 'assignment', '/tasks')
  `);

  let assignedCount = 0;
  members.forEach(m => {
    insertAssignment.run(
      uuidv4(),
      m.user_id,
      question_id,
      cohort_id,
      assigned_by,
      priority,
      instructions || null,
      due_date || null
    );
    insertNotif.run(
      uuidv4(),
      m.user_id,
      'New Cohort Challenge Assigned',
      `Challenge "${question.title}" assigned to cohort ${cohort.name}.`
    );
    assignedCount++;
  });

  return { message: `Assigned challenge to ${assignedCount} students in ${cohort.name}`, assignedCount };
}

function startLiveSession({ cohort_id, user_id, mentor_id, title, meet_link }) {
  const id = uuidv4();
  const link = meet_link || `https://meet.google.com/axly-${id.slice(0, 8)}`;

  db.prepare(`
    INSERT INTO live_sessions (id, cohort_id, user_id, mentor_id, title, meet_link, status)
    VALUES (?, ?, ?, ?, ?, ?, 'active')
  `).run(id, cohort_id || null, user_id || null, mentor_id, title || 'Live Mentorship Session', link);

  if (cohort_id) {
    const members = db.prepare('SELECT user_id FROM cohort_members WHERE cohort_id = ?').all(cohort_id);
    const insertNotif = db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, link)
      VALUES (?, ?, ?, ?, 'cohort', ?)
    `);
    members.forEach(m => {
      insertNotif.run(
        uuidv4(),
        m.user_id,
        '🔴 Live Class Started!',
        `Live session "${title}" is now active. Join with the meeting link.`,
        link
      );
    });
  }

  return { id, meet_link: link, status: 'active', title };
}

module.exports = {
  listCohorts,
  getCohortById,
  createCohort,
  addCohortMember,
  removeCohortMember,
  assignCohortChallenge,
  startLiveSession
};
