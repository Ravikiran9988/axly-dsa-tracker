const dailyQuestionService = require('../services/dailyQuestionService');

async function getDailyQuestion(req, res, next) {
  try {
    const { date } = req.query;
    // Students can only read the current Daily Challenge. Historical/future
    // dates remain available to privileged users for administration/testing.
    const isPrivileged = req.user?.role === 'admin' || req.user?.role === 'mentor';
    const requestedDate = isPrivileged ? date : undefined;
    const result = await dailyQuestionService.getDailyQuestion(req.user, requestedDate);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function setDailyQuestion(req, res, next) {
  try {
    const { question_id, date } = req.body;
    const result = await dailyQuestionService.setDailyQuestion({
      question_id,
      date,
      admin_id: req.user.id
    });
    return res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { getDailyQuestion, setDailyQuestion };
