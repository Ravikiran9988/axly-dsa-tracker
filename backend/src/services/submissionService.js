const { getRepository } = require('../db/repositoryFactory');
const { v4: uuidv4 } = require('uuid');
const { AppError } = require('../middleware/errorHandler');
const githubSubmissionService = require('./githubSubmissionService');
const { awardSolve, awardDailyChallengeSolve, awardPracticeSolve } = require('./gamificationService');

const repo = getRepository();

async function listSubmissions({ user, question_id, status, review_status, page = 1, limit = 50 }) {
  const p = Math.max(1, Number(page) || 1);
  const l = Math.max(1, Number(limit) || 50);
  const offset = (p - 1) * l;
  const where = [];
  const params = [];

  if (user?.role !== 'admin' && user?.role !== 'mentor') {
    where.push('s.user_id = ?');
    params.push(user.id);
  }
  if (question_id) {
    where.push('s.question_id = ?');
    params.push(question_id);
  }
  if (status) {
    where.push('s.status = ?');
    params.push(status);
  }
  if (review_status) {
    where.push('s.review_status = ?');
    params.push(review_status);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const totalRow = await repo.one(`SELECT COUNT(*) AS total FROM submissions s ${whereSql}`, params);
  const total = Number(totalRow?.total || 0);

  const data = await repo.many(`
    SELECT 
      s.*,
      COALESCE(q.title, dc.title, s.question_id) AS question_title,
      COALESCE(q.difficulty, dc.difficulty, 'medium') AS question_difficulty,
      COALESCE(q.points, dc.points, 20) AS question_points,
      COALESCE(t1.name, t2.name, 'DSA') AS topic_name,
      u.name AS user_name, u.email AS user_email, u.avatar_url AS user_avatar,
      rev.name AS reviewer_name
    FROM submissions s
    LEFT JOIN questions q ON s.question_id = q.id
    LEFT JOIN daily_challenge_problems dc ON s.question_id = dc.id
    LEFT JOIN topics t1 ON q.topic_id = t1.id
    LEFT JOIN topics t2 ON dc.topic_id = t2.id
    JOIN users u ON s.user_id = u.id
    LEFT JOIN users rev ON s.reviewer_id = rev.id
    ${whereSql}
    ORDER BY s.updated_at DESC, s.created_at DESC
    LIMIT ? OFFSET ?
  `, [...params, l, offset]);

  return { data, total, page: p, limit: l };
}

async function submitViaGithub({ user_id, question_id, github_url, assignment_id }) {
  const snapshot = await githubSubmissionService.getRepositorySnapshot(github_url);
  const question = await repo.one(
    'SELECT * FROM questions WHERE id = ? AND (is_active = 1 OR is_active = TRUE)',
    [question_id]
  );
  if (!question) throw new AppError('Question not found', 404, 'NOT_FOUND');

  const now = new Date().toISOString();
  let submission = await repo.one(
    'SELECT * FROM submissions WHERE user_id = ? AND question_id = ?',
    [user_id, question_id]
  );

  if (submission) {
    await repo.execute(`
      UPDATE submissions SET
        submission_type = 'github',
        github_url = ?,
        status = 'under_review',
        review_status = 'pending',
        attempted_at = COALESCE(attempted_at, ?),
        started_at = COALESCE(started_at, ?),
        updated_at = ?
      WHERE id = ?
    `, [snapshot.canonicalUrl, now, now, now, submission.id]);
  } else {
    const id = uuidv4();
    await repo.execute(`
      INSERT INTO submissions (
        id, user_id, question_id, assignment_id, submission_type, github_url,
        status, review_status, attempted_at, started_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'github', ?, 'under_review', 'pending', ?, ?, ?, ?)
    `, [id, user_id, question_id, assignment_id || null, snapshot.canonicalUrl, now, now, now, now]);
    submission = { id };
  }

  await repo.execute(
    "UPDATE assignments SET status = 'under_review' WHERE user_id = ? AND question_id = ?",
    [user_id, question_id]
  );

  githubSubmissionService.recordSnapshot({ id: uuidv4(), submissionId: submission.id, snapshot });
  const updated = await repo.one(
    'SELECT * FROM submissions WHERE user_id = ? AND question_id = ?',
    [user_id, question_id]
  );

  return {
    ...updated,
    github_commit_sha: snapshot.commitSha,
    github_commit_url: snapshot.commitUrl,
    github_default_branch: snapshot.defaultBranch
  };
}

async function reviewSubmission({ submission_id, reviewer_id, review_status, feedback, manual_score, manual_feedback }) {
  if (!['approved', 'changes_requested', 'rejected'].includes(review_status)) {
    throw new AppError('Invalid review status', 400, 'VALIDATION_ERROR', 'review_status');
  }

  const submission = await repo.one('SELECT * FROM submissions WHERE id = ?', [submission_id]);
  if (!submission) throw new AppError('Submission not found', 404, 'NOT_FOUND');

  if (review_status === 'changes_requested' && (!feedback || !feedback.trim())) {
    throw new AppError('Feedback is required when requesting changes', 400, 'VALIDATION_ERROR', 'feedback');
  }

  const now = new Date().toISOString();
  const normalizedManual = manual_score === null || manual_score === undefined ? null : Number(manual_score);
  if (normalizedManual !== null && (!Number.isFinite(normalizedManual) || normalizedManual < 0 || normalizedManual > 100)) {
    throw new AppError('manual_score must be between 0 and 100', 400, 'VALIDATION_ERROR', 'manual_score');
  }

  const newStatus = review_status === 'approved' ? 'approved' : review_status === 'changes_requested' ? 'changes_requested' : 'rejected';
  const solvedAt = review_status === 'approved' ? (submission.solved_at || now) : submission.solved_at;
  const finalScore = normalizedManual !== null
    ? normalizedManual
    : (submission.ai_score != null ? Number(submission.ai_score) : (submission.final_score != null ? Number(submission.final_score) : null));

  await repo.transaction(async tx => {
    await tx.execute(`
      UPDATE submissions SET
        status = ?,
        review_status = ?,
        feedback = ?,
        reviewer_id = ?,
        reviewed_at = ?,
        solved_at = ?,
        manual_score = ?,
        manual_feedback = ?,
        manual_reviewer_id = ?,
        manual_reviewed_at = ?,
        final_score = ?,
        updated_at = ?
      WHERE id = ?
    `, [
      newStatus,
      review_status,
      feedback?.trim() || null,
      reviewer_id,
      now,
      solvedAt,
      normalizedManual,
      manual_feedback?.trim() || null,
      normalizedManual !== null ? reviewer_id : null,
      normalizedManual !== null ? now : null,
      finalScore,
      now,
      submission_id
    ]);

    if (normalizedManual !== null) {
      await tx.execute(`
        INSERT INTO submission_score_audit (id, submission_id, reviewer_id, previous_score, new_score, feedback, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        uuidv4(),
        submission_id,
        reviewer_id,
        submission.final_score ?? null,
        normalizedManual,
        manual_feedback?.trim() || feedback?.trim() || 'Score overridden by admin review',
        now
      ]);
    }
  });

  const question = await repo.one('SELECT * FROM questions WHERE id = ?', [submission.question_id]);
  if (review_status === 'approved' && submission.review_status !== 'approved' && !question?.is_practice) {
    await awardSolve(submission.user_id, submission.question_id, submission.started_at);
  }

  await repo.execute(`
    INSERT INTO notifications (id, user_id, title, message, type, link, created_at)
    VALUES (?, ?, ?, ?, 'mentor', ?, ?)
  `, [
    uuidv4(),
    submission.user_id,
    review_status === 'approved' ? 'Submission Approved! 🎉' : 'Submission Reviewed',
    review_status === 'approved'
      ? `Your solution for "${question?.title}" was approved!${finalScore != null ? ` Final score: ${finalScore}/100.` : ''}`
      : `Review feedback on "${question?.title}": "${feedback || 'Please review changes.'}"`,
    '/submissions',
    now
  ]);

  return repo.one('SELECT * FROM submissions WHERE id = ?', [submission_id]);
}

async function updateSubmission({ submission_id, question_id, user_id, status }) {
  let submission = submission_id
    ? await repo.one('SELECT * FROM submissions WHERE id = ?', [submission_id])
    : (question_id ? await repo.one('SELECT * FROM submissions WHERE user_id = ? AND question_id = ?', [user_id, question_id]) : null);

  if (submission_id && !submission) throw new AppError('Submission not found', 404, 'NOT_FOUND');
  if (submission && submission.user_id !== user_id) throw new AppError("Forbidden: Cannot update another user's submission", 403, 'FORBIDDEN');

  const now = new Date().toISOString();
  const qId = submission ? submission.question_id : question_id;
  const isDaily = Boolean(await repo.one('SELECT id FROM daily_questions WHERE question_id = ? OR challenge_id = ?', [qId, qId])) ||
                  Boolean(await repo.one('SELECT id FROM daily_challenge_problems WHERE id = ?', [qId]));
  const qRow = await repo.one('SELECT id, is_practice FROM questions WHERE id = ?', [qId]);
  const isPractice = !isDaily && Boolean(qRow?.is_practice);

  if (submission) {
    const wasSolved = ['solved', 'completed', 'approved'].includes(submission.status);
    let attemptedAt = submission.attempted_at;
    let solvedAt = submission.solved_at;
    let startedAt = submission.started_at;

    if (status === 'attempted' && !attemptedAt) attemptedAt = now;
    if (status === 'attempted' && !startedAt) startedAt = now;
    else if (status === 'solved' || status === 'completed') {
      if (!attemptedAt) attemptedAt = now;
      if (!startedAt) startedAt = attemptedAt;
      solvedAt = now;
    } else if (status === 'not_started') {
      solvedAt = null;
    }

    await repo.execute(`
      UPDATE submissions SET status = ?, attempted_at = ?, started_at = ?, solved_at = ?, updated_at = ?
      WHERE id = ?
    `, [status, attemptedAt, startedAt, solvedAt, now, submission.id]);

    if (!wasSolved && ['solved', 'completed'].includes(status)) {
      if (isDaily) {
        await awardDailyChallengeSolve(user_id, submission.question_id, startedAt);
      } else if (isPractice) {
        await awardPracticeSolve(user_id, submission.question_id);
      } else {
        await awardSolve(user_id, submission.question_id, startedAt);
      }
    }
    return repo.one('SELECT * FROM submissions WHERE id = ?', [submission.id]);
  }

  if (!qRow) throw new AppError('Question not found', 404, 'NOT_FOUND');
  const id = uuidv4();
  let attemptedAt = null;
  let solvedAt = null;
  let startedAt = null;

  if (status === 'attempted') {
    attemptedAt = now;
    startedAt = now;
  } else if (status === 'solved' || status === 'completed') {
    attemptedAt = now;
    startedAt = now;
    solvedAt = now;
  }

  await repo.execute(`
    INSERT INTO submissions (id, user_id, question_id, status, attempted_at, started_at, solved_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [id, user_id, question_id, status, attemptedAt, startedAt, solvedAt, now, now]);

  if (!isPractice && ['solved', 'completed'].includes(status)) {
    await awardSolve(user_id, question_id, startedAt);
  }

  return repo.one('SELECT * FROM submissions WHERE id = ?', [id]);
}

async function abandonSubmission({ submission_id, user_id }) {
  const submission = await repo.one('SELECT * FROM submissions WHERE id = ?', [submission_id]);
  if (!submission) throw new AppError('Submission not found', 404, 'NOT_FOUND');
  if (submission.user_id !== user_id) throw new AppError("Forbidden: Cannot abandon another user's submission", 403, 'FORBIDDEN');
  if (['solved', 'completed', 'approved'].includes(submission.status)) {
    throw new AppError('Completed problems cannot be abandoned', 400, 'VALIDATION_ERROR');
  }

  const now = new Date().toISOString();
  await repo.execute("UPDATE submissions SET status = 'skipped', updated_at = ? WHERE id = ?", [now, submission_id]);
  return repo.one('SELECT * FROM submissions WHERE id = ?', [submission_id]);
}

function getGithubSnapshots(submissionId) {
  return githubSubmissionService.listSnapshots(submissionId);
}

module.exports = {
  listSubmissions,
  submitViaGithub,
  reviewSubmission,
  updateSubmission,
  getGithubSnapshots,
  abandonSubmission
};
