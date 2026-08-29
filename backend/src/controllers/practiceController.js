const s = require('../services/practiceService');

async function problems(req, res, next) {
  try {
    const result = await s.listPracticeProblems({ user: req.user, ...req.query });
    res.json(result);
  } catch (e) {
    next(e);
  }
}

async function problem(req, res, next) {
  try {
    const data = await s.getPracticeProblem({ user: req.user, questionId: req.params.id });
    if (!data) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Practice problem not found' } });
    res.json({ data });
  } catch (e) {
    next(e);
  }
}

async function start(req, res, next) {
  try {
    const data = await s.startPractice({ user: req.user, questionId: req.params.id });
    res.json({ data });
  } catch (e) {
    next(e);
  }
}

async function abandon(req, res, next) {
  try {
    const data = await s.abandonPractice({ user: req.user, questionId: req.params.id });
    res.json({ data });
  } catch (e) {
    next(e);
  }
}

async function recordSubmission(req, res, next) {
  try {
    const { submissionId, passed } = req.body || {};
    const data = await s.recordPracticeSubmission({
      user: req.user,
      questionId: req.params.id,
      submissionId,
      passed: Boolean(passed)
    });
    res.json({ data });
  } catch (e) {
    next(e);
  }
}

async function progress(req, res, next) {
  try {
    const data = await s.getPracticeProgress({ user: req.user });
    res.json({ data });
  } catch (e) {
    next(e);
  }
}

async function topics(req, res, next) {
  try {
    const data = await s.listPracticeTopics();
    res.json({ data });
  } catch (e) {
    next(e);
  }
}

async function patterns(req, res, next) {
  try {
    const data = await s.listPracticePatterns();
    res.json({ data });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  problems,
  problem,
  start,
  abandon,
  recordSubmission,
  progress,
  topics,
  patterns
};