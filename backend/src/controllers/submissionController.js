const submissionService = require('../services/submissionService');

async function getSubmissions(req, res, next) {
  try {
    const { question_id, status, review_status, page, limit } = req.query;
    const result = submissionService.listSubmissions({
      user: req.user,
      question_id,
      status,
      review_status,
      page,
      limit
    });
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function submitViaGithub(req, res, next) {
  try {
    const { question_id, github_url, assignment_id } = req.body;
    const submission = submissionService.submitViaGithub({
      user_id: req.user.id,
      question_id,
      github_url,
      assignment_id
    });
    return res.status(200).json({ data: submission });
  } catch (err) {
    next(err);
  }
}

async function reviewSubmission(req, res, next) {
  try {
    const { review_status, feedback } = req.body;
    const submissionId = req.params.id;
    const reviewed = submissionService.reviewSubmission({
      submission_id: submissionId,
      reviewer_id: req.user.id,
      review_status,
      feedback
    });
    return res.status(200).json({ data: reviewed });
  } catch (err) {
    next(err);
  }
}

async function updateSubmission(req, res, next) {
  try {
    const { status } = req.body;
    const submissionId = req.params.id;

    const updated = submissionService.updateSubmission({
      submission_id: submissionId,
      user_id: req.user.id,
      status
    });

    return res.status(200).json({ data: updated });
  } catch (err) {
    next(err);
  }
}

async function upsertQuestionSubmission(req, res, next) {
  try {
    const { question_id, status } = req.body;

    const updated = submissionService.updateSubmission({
      question_id,
      user_id: req.user.id,
      status
    });

    return res.status(200).json({ data: updated });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSubmissions,
  submitViaGithub,
  reviewSubmission,
  updateSubmission,
  upsertQuestionSubmission
};
