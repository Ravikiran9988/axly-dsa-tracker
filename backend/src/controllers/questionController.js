const questionService = require('../services/questionService');

async function getQuestions(req, res, next) {
  try {
    const { difficulty, topic_id, assigned, page, limit, search } = req.query;
    const result = questionService.listQuestions({
      user: req.user,
      difficulty,
      topic_id,
      assigned,
      page,
      limit,
      search
    });
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function getQuestionById(req, res, next) {
  try {
    const question = questionService.getQuestionById(req.params.id, req.user);
    if (!question) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Question not found' }
      });
    }
    return res.status(200).json({ data: question });
  } catch (err) {
    next(err);
  }
}

async function createQuestion(req, res, next) {
  try {
    const question = questionService.createQuestion(req.body);
    return res.status(201).json({ data: question });
  } catch (err) {
    next(err);
  }
}

async function updateQuestion(req, res, next) {
  try {
    const question = questionService.updateQuestion(req.params.id, req.body);
    return res.status(200).json({ data: question });
  } catch (err) {
    next(err);
  }
}

async function deleteQuestion(req, res, next) {
  try {
    const result = questionService.deleteQuestion(req.params.id);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function getTopics(req, res, next) {
  try {
    const topics = questionService.listTopics();
    return res.status(200).json({ data: topics });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getTopics
};
