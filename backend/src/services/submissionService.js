const { db } = require('../db/db');
const { v4: uuidv4 } = require('uuid');
const { AppError } = require('../middleware/errorHandler');

function updateSubmission({ submission_id, question_id, user_id, status }) {
  let submission = null;

  if (submission_id) {
    submission = db.prepare('SELECT * FROM submissions WHERE id = ?').get(submission_id);
    if (!submission) {
      throw new AppError('Submission not found', 404, 'NOT_FOUND');
    }
    // Cross-user check per PRD Section 20.5 & 25.8
    if (submission.user_id !== user_id) {
      throw new AppError('Forbidden: Cannot update another user\'s submission', 403, 'FORBIDDEN');
    }
  } else if (question_id) {
    // Check if submission already exists for this (user_id, question_id)
    submission = db.prepare('SELECT * FROM submissions WHERE user_id = ? AND question_id = ?').get(user_id, question_id);
  }

  const now = new Date().toISOString();

  if (submission) {
    let attemptedAt = submission.attempted_at;
    let solvedAt = submission.solved_at;

    if (status === 'attempted' && !attemptedAt) {
      attemptedAt = now;
    } else if (status === 'solved') {
      if (!attemptedAt) attemptedAt = now;
      solvedAt = now;
    } else if (status === 'not_started') {
      // If user resets to not_started
      solvedAt = null;
    }

    db.prepare(`
      UPDATE submissions 
      SET status = ?, attempted_at = ?, solved_at = ?
      WHERE id = ?
    `).run(status, attemptedAt, solvedAt, submission.id);

    return db.prepare('SELECT * FROM submissions WHERE id = ?').get(submission.id);
  } else {
    // Check if question exists
    const question = db.prepare('SELECT id FROM questions WHERE id = ?').get(question_id);
    if (!question) {
      throw new AppError('Question not found', 404, 'NOT_FOUND');
    }

    const id = uuidv4();
    let attemptedAt = null;
    let solvedAt = null;

    if (status === 'attempted') {
      attemptedAt = now;
    } else if (status === 'solved') {
      attemptedAt = now;
      solvedAt = now;
    }

    db.prepare(`
      INSERT INTO submissions (id, user_id, question_id, status, attempted_at, solved_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, user_id, question_id, status, attemptedAt, solvedAt);

    return db.prepare('SELECT * FROM submissions WHERE id = ?').get(id);
  }
}

module.exports = {
  updateSubmission
};
