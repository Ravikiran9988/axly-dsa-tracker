const { db } = require('../db/db');
const { v4: uuidv4 } = require('uuid');
const { AppError } = require('../middleware/errorHandler');

function getTodayUtcDate() {
  return new Date().toISOString().split('T')[0];
}

function getDailyQuestion(user, targetDate = null) {
  const date = targetDate || getTodayUtcDate();

  const query = `
    SELECT 
      dq.id as daily_question_id,
      dq.date,
      dq.created_at as scheduled_at,
      q.id,
      q.title,
      q.difficulty,
      q.topic_id,
      t.name as topic_name,
      q.url,
      q.is_active,
      a.id as assignment_id,
      a.status as assignment_status,
      s.id as submission_id,
      s.status as submission_status,
      s.attempted_at,
      s.solved_at
    FROM daily_questions dq
    JOIN questions q ON dq.question_id = q.id
    LEFT JOIN topics t ON q.topic_id = t.id
    LEFT JOIN assignments a ON a.question_id = q.id AND a.user_id = ? AND a.status = 'assigned'
    LEFT JOIN submissions s ON s.question_id = q.id AND s.user_id = ?
    WHERE dq.date = ? AND q.is_active = 1
  `;

  const record = db.prepare(query).get(user.id, user.id, date);

  if (!record) {
    return {
      data: null,
      message: 'No daily question set for today'
    };
  }

  return {
    data: {
      id: record.id,
      daily_question_id: record.daily_question_id,
      date: record.date,
      title: record.title,
      difficulty: record.difficulty,
      topic_id: record.topic_id,
      topic_name: record.topic_name,
      url: record.url,
      is_active: Boolean(record.is_active),
      is_assigned_to_me: record.assignment_status === 'assigned',
      submission_id: record.submission_id || null,
      submission_status: record.submission_status || 'not_started',
      attempted_at: record.attempted_at || null,
      solved_at: record.solved_at || null
    }
  };
}

function setDailyQuestion({ question_id, date, admin_id }) {
  const targetDate = date || getTodayUtcDate();

  // Validate question
  const question = db.prepare('SELECT id, title, difficulty, is_active FROM questions WHERE id = ?').get(question_id);
  if (!question) {
    throw new AppError('Question not found', 404, 'NOT_FOUND');
  }
  if (!question.is_active) {
    throw new AppError('Cannot set an inactive question as daily question', 400, 'VALIDATION_ERROR', 'question_id');
  }

  // Check if a daily question row already exists for this UTC date (update in place per PRD Section 17)
  const existingDaily = db.prepare('SELECT id FROM daily_questions WHERE date = ?').get(targetDate);

  if (existingDaily) {
    db.prepare(`
      UPDATE daily_questions 
      SET question_id = ?, created_by = ?, created_at = datetime('now')
      WHERE date = ?
    `).run(question_id, admin_id, targetDate);
  } else {
    const id = uuidv4();
    db.prepare(`
      INSERT INTO daily_questions (id, question_id, date, created_by)
      VALUES (?, ?, ?, ?)
    `).run(id, question_id, targetDate, admin_id);
  }

  return getDailyQuestion({ id: admin_id }, targetDate);
}

module.exports = {
  getDailyQuestion,
  setDailyQuestion,
  getTodayUtcDate
};
