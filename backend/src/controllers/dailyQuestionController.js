const dailyQuestionService = require('../services/dailyQuestionService');

async function getDailyQuestion(req, res, next) {
  try {
    const { date } = req.query;
    const result = dailyQuestionService.getDailyQuestion(req.user, date);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function setDailyQuestion(req, res, next) {
  try {
    const { question_id, date } = req.body;
    const result = dailyQuestionService.setDailyQuestion({
      question_id,
      date,
      admin_id: req.user.id
    });
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDailyQuestion,
  setDailyQuestion
};
