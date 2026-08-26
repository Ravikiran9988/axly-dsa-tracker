const submissionService = require('../services/submissionService');

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
  updateSubmission,
  upsertQuestionSubmission
};
