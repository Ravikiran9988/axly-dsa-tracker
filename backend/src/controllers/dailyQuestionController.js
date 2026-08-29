const dailyQuestionService = require('../services/dailyQuestionService');
const dailyChallengeService = require('../services/dailyChallengeService');

async function getDailyQuestion(req, res, next) {
  try {
    const { date } = req.query;
    const isPrivileged = req.user?.role === 'admin' || req.user?.role === 'mentor';
    const requestedDate = isPrivileged ? date : undefined;
    let result = await dailyChallengeService.getTodayDailyChallenge(req.user, requestedDate);
    if (!result || !result.data) {
      result = await dailyQuestionService.getDailyQuestion(req.user, requestedDate);
    }
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
