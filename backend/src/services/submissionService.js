const { db } = require('../db/db');
const { v4: uuidv4 } = require('uuid');
const { AppError } = require('../middleware/errorHandler');

function listSubmissions({ user, question_id, status, review_status, page = 1, limit = 50 }) {
  const offset = (page - 1) * limit;
  let whereClauses = [];
  const params = [];

  if (user.role !== 'admin' && user.role !== 'mentor') {
    whereClauses.push('s.user_id = ?');
    params.push(user.id);
  }

  if (question_id) {
    whereClauses.push('s.question_id = ?');
    params.push(question_id);
  }

  if (status) {
    whereClauses.push('s.status = ?');
    params.push(status);
  }

  if (review_status) {
    whereClauses.push('s.review_status = ?');
    params.push(review_status);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countQuery = `SELECT COUNT(*) as total FROM submissions s ${whereSql}`;
  const total = db.prepare(countQuery).get(...params)?.total || 0;

  const selectQuery = `
    SELECT 
      s.*,
      q.title as question_title,
      q.difficulty as question_difficulty,
      q.points as question_points,
      t.name as topic_name,
      u.name as user_name,
      u.email as user_email,
      u.avatar_url as user_avatar,
      rev.name as reviewer_name
    FROM submissions s
    JOIN questions q ON s.question_id = q.id
    LEFT JOIN topics t ON q.topic_id = t.id
    JOIN users u ON s.user_id = u.id
    LEFT JOIN users rev ON s.reviewer_id = rev.id
    ${whereSql}
    ORDER BY s.updated_at DESC, s.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const data = db.prepare(selectQuery).all(...params, limit, offset);

  return {
    data,
    total,
    page: Number(page),
    limit: Number(limit)
  };
}

function submitViaGithub({ user_id, question_id, github_url, assignment_id }) {
  // Validate GitHub URL format
  const githubRegex = /^https:\/\/(www\.)?github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+(\/.*)?$/;
  if (!github_url || !githubRegex.test(github_url.trim())) {
    throw new AppError('Please provide a valid GitHub repository or file URL (e.g. https://github.com/user/repo)', 400, 'VALIDATION_ERROR', 'github_url');
  }

  const question = db.prepare('SELECT * FROM questions WHERE id = ? AND is_active = 1').get(question_id);
  if (!question) {
    throw new AppError('Question not found', 404, 'NOT_FOUND');
  }

  const now = new Date().toISOString();
  let submission = db.prepare('SELECT * FROM submissions WHERE user_id = ? AND question_id = ?').get(user_id, question_id);

  if (submission) {
    db.prepare(`
      UPDATE submissions
      SET submission_type = 'github', github_url = ?, status = 'under_review', review_status = 'pending',
          attempted_at = COALESCE(attempted_at, ?), updated_at = ?
      WHERE id = ?
    `).run(github_url.trim(), now, now, submission.id);
  } else {
    const id = uuidv4();
    db.prepare(`
      INSERT INTO submissions (
        id, user_id, question_id, assignment_id, submission_type, github_url,
        status, review_status, attempted_at, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, 'github', ?, 'under_review', 'pending', ?, ?, ?)
    `).run(id, user_id, question_id, assignment_id || null, github_url.trim(), now, now, now);
    submission = { id };
  }

  // Update assignment status to submitted / under_review
  db.prepare(`
    UPDATE assignments 
    SET status = 'under_review' 
    WHERE user_id = ? AND question_id = ?
  `).run(user_id, question_id);

  // Log in code_submissions_log
  db.prepare(`
    INSERT INTO code_submissions_log (id, user_id, question_id, submission_type, github_url, status, passed_tests, total_tests)
    VALUES (?, ?, ?, 'github', ?, 'Under Review', 0, 0)
  `).run(uuidv4(), user_id, question_id, github_url.trim());

  // Notify admins of new submission
  const admins = db.prepare("SELECT id FROM users WHERE role = 'admin'").all();
  admins.forEach(admin => {
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, link)
      VALUES (?, ?, ?, ?, 'submission', '/admin/submissions')
    `).run(
      uuidv4(),
      admin.id,
      'New GitHub Submission Received',
      `A student submitted a GitHub repository for "${question.title}".`,
    );
  });

  return db.prepare('SELECT * FROM submissions WHERE user_id = ? AND question_id = ?').get(user_id, question_id);
}

function reviewSubmission({ submission_id, reviewer_id, review_status, feedback }) {
  if (!['approved', 'changes_requested', 'rejected'].includes(review_status)) {
    throw new AppError('review_status must be one of: approved, changes_requested, rejected', 400, 'VALIDATION_ERROR');
  }

  const submission = db.prepare('SELECT * FROM submissions WHERE id = ?').get(submission_id);
  if (!submission) {
    throw new AppError('Submission not found', 404, 'NOT_FOUND');
  }

  if (review_status === 'changes_requested' && (!feedback || !feedback.trim())) {
    throw new AppError('Feedback is required when requesting changes from a student', 400, 'VALIDATION_ERROR', 'feedback');
  }

  const now = new Date().toISOString();
  let newStatus = 'under_review';
  let assignmentStatus = 'ongoing';

  if (review_status === 'approved') {
    newStatus = 'approved';
    assignmentStatus = 'completed';
  } else if (review_status === 'changes_requested') {
    newStatus = 'changes_requested';
    assignmentStatus = 'ongoing';
  } else if (review_status === 'rejected') {
    newStatus = 'rejected';
    assignmentStatus = 'incomplete';
  }

  const solvedAt = review_status === 'approved' ? now : submission.solved_at;

  db.prepare(`
    UPDATE submissions
    SET status = ?, review_status = ?, feedback = ?, reviewer_id = ?, reviewed_at = ?, solved_at = ?, updated_at = ?
    WHERE id = ?
  `).run(newStatus, review_status, feedback ? feedback.trim() : null, reviewer_id, now, solvedAt, now, submission_id);

  // Update assignment status
  db.prepare(`
    UPDATE assignments
    SET status = ?
    WHERE user_id = ? AND question_id = ?
  `).run(assignmentStatus, submission.user_id, submission.question_id);

  const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(submission.question_id);

  // If approved, award points and increment streak
  if (review_status === 'approved') {
    const pointsAward = question?.points || 20;
    db.prepare(`
      UPDATE users
      SET points = points + ?, streak = streak + 1, longest_streak = MAX(longest_streak, streak + 1)
      WHERE id = ?
    `).run(pointsAward, submission.user_id);
  }

  // Trigger Notification to Student
  const notifTitle = review_status === 'approved' 
    ? 'Submission Approved! 🎉'
    : review_status === 'changes_requested'
      ? 'Mentor Requested Changes'
      : 'Submission Reviewed';

  const notifMessage = review_status === 'approved'
    ? `Your solution for "${question?.title}" was approved! +${question?.points || 20} points added to your profile.`
    : `Mentor feedback on "${question?.title}": "${feedback || 'Please review changes.'}"`;

  db.prepare(`
    INSERT INTO notifications (id, user_id, title, message, type, link)
    VALUES (?, ?, ?, ?, 'mentor', '/submissions')
  `).run(uuidv4(), submission.user_id, notifTitle, notifMessage);

  return db.prepare('SELECT * FROM submissions WHERE id = ?').get(submission_id);
}

function updateSubmission({ submission_id, question_id, user_id, status }) {
  let submission = null;

  if (submission_id) {
    submission = db.prepare('SELECT * FROM submissions WHERE id = ?').get(submission_id);
    if (!submission) {
      throw new AppError('Submission not found', 404, 'NOT_FOUND');
    }
    if (submission.user_id !== user_id) {
      throw new AppError('Forbidden: Cannot update another user\'s submission', 403, 'FORBIDDEN');
    }
  } else if (question_id) {
    submission = db.prepare('SELECT * FROM submissions WHERE user_id = ? AND question_id = ?').get(user_id, question_id);
  }

  const now = new Date().toISOString();

  if (submission) {
    let attemptedAt = submission.attempted_at;
    let solvedAt = submission.solved_at;

    if (status === 'attempted' && !attemptedAt) {
      attemptedAt = now;
    } else if (status === 'solved' || status === 'completed') {
      if (!attemptedAt) attemptedAt = now;
      solvedAt = now;
    } else if (status === 'not_started') {
      solvedAt = null;
    }

    db.prepare(`
      UPDATE submissions 
      SET status = ?, attempted_at = ?, solved_at = ?, updated_at = ?
      WHERE id = ?
    `).run(status, attemptedAt, solvedAt, now, submission.id);

    return db.prepare('SELECT * FROM submissions WHERE id = ?').get(submission.id);
  } else {
    const question = db.prepare('SELECT id FROM questions WHERE id = ?').get(question_id);
    if (!question) {
      throw new AppError('Question not found', 404, 'NOT_FOUND');
    }

    const id = uuidv4();
    let attemptedAt = null;
    let solvedAt = null;

    if (status === 'attempted') {
      attemptedAt = now;
    } else if (status === 'solved' || status === 'completed') {
      attemptedAt = now;
      solvedAt = now;
    }

    db.prepare(`
      INSERT INTO submissions (id, user_id, question_id, status, attempted_at, solved_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, user_id, question_id, status, attemptedAt, solvedAt, now, now);

    return db.prepare('SELECT * FROM submissions WHERE id = ?').get(id);
  }
}

module.exports = {
  listSubmissions,
  submitViaGithub,
  reviewSubmission,
  updateSubmission
};
