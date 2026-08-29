const submissionService = require('../services/submissionService');
const aiReviewService = require('../services/aiReviewService');
const auditService = require('../services/auditService');

async function getSubmissions(req, res, next) {
  try {
    const { question_id, status, review_status, page, limit } = req.query;
    const result = await submissionService.listSubmissions({
      user: req.user,
      question_id,
      status,
      review_status,
      page,
      limit
    });
    return res.status(200).json(result);
  } catch (e) {
    next(e);
  }
}

async function submitViaGithub(req, res, next) {
  try {
    const { question_id, github_url, assignment_id } = req.body;
    const result = await submissionService.submitViaGithub({
      user_id: req.user.id,
      question_id,
      github_url,
      assignment_id
    });
    await auditService.logAction({
      actorId: req.user.id,
      actorEmail: req.user.email,
      action: 'github_submission',
      resourceType: 'submission',
      resourceId: result.id,
      metadata: { github_url, question_id },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    return res.status(200).json({ data: result });
  } catch (e) {
    next(e);
  }
}

async function reviewSubmission(req, res, next) {
  try {
    const { review_status, feedback, manual_score, manual_feedback } = req.body;
    const result = await submissionService.reviewSubmission({
      submission_id: req.params.id,
      reviewer_id: req.user.id,
      review_status,
      feedback,
      manual_score,
      manual_feedback
    });
    await auditService.logAction({
      actorId: req.user.id,
      actorEmail: req.user.email,
      action: 'submission_manual_review',
      resourceType: 'submission',
      resourceId: req.params.id,
      afterData: result,
      metadata: { review_status, manual_score },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    return res.status(200).json({ data: result });
  } catch (e) {
    next(e);
  }
}

async function aiReviewSubmission(req, res, next) {
  try {
    const result = await aiReviewService.reviewCode({ submission_id: req.params.id });
    await auditService.logAction({
      actorId: req.user.id,
      actorEmail: req.user.email,
      action: 'submission_ai_review',
      resourceType: 'submission',
      resourceId: req.params.id,
      metadata: { score: result.score },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    return res.status(200).json({ data: result });
  } catch (e) {
    next(e);
  }
}

async function updateSubmission(req, res, next) {
  try {
    const data = await submissionService.updateSubmission({
      submission_id: req.params.id,
      user_id: req.user.id,
      status: req.body.status
    });
    return res.status(200).json({ data });
  } catch (e) {
    next(e);
  }
}

async function upsertQuestionSubmission(req, res, next) {
  try {
    const data = await submissionService.updateSubmission({
      question_id: req.body.question_id,
      user_id: req.user.id,
      status: req.body.status
    });
    return res.status(200).json({ data });
  } catch (e) {
    next(e);
  }
}

async function abandonSubmission(req, res, next) {
  try {
    const result = await submissionService.abandonSubmission({
      submission_id: req.params.id,
      user_id: req.user.id
    });
    await auditService.logAction({
      actorId: req.user.id,
      actorEmail: req.user.email,
      action: 'practice_abandon',
      resourceType: 'submission',
      resourceId: req.params.id,
      afterData: result,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    return res.status(200).json({ data: result });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  getSubmissions,
  submitViaGithub,
  reviewSubmission,
  aiReviewSubmission,
  updateSubmission,
  upsertQuestionSubmission,
  abandonSubmission
};
