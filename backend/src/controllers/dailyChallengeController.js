const dailyChallengeService = require('../services/dailyChallengeService');

async function listDailyChallenges(req, res, next) {
  try {
    const { status, difficulty, topic_id, search, page, limit } = req.query;
    const result = await dailyChallengeService.listDailyChallenges({
      status,
      difficulty,
      topic_id,
      search,
      page,
      limit
    });
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function getDailyChallenge(req, res, next) {
  try {
    const { id } = req.params;
    const isPrivileged = req.user?.role === 'admin' || req.user?.role === 'mentor';
    const result = await dailyChallengeService.getDailyChallengeById(id, isPrivileged);
    return res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

async function createDailyChallenge(req, res, next) {
  try {
    const result = await dailyChallengeService.createDailyChallenge(req.body, req.user.id);
    return res.status(201).json({ data: result, message: 'Daily challenge created successfully' });
  } catch (err) {
    next(err);
  }
}

async function updateDailyChallenge(req, res, next) {
  try {
    const { id } = req.params;
    const result = await dailyChallengeService.updateDailyChallenge(id, req.body, req.user.id);
    return res.status(200).json({ data: result, message: 'Daily challenge updated successfully' });
  } catch (err) {
    next(err);
  }
}

async function scheduleDailyChallenge(req, res, next) {
  try {
    const { id } = req.params;
    const { date } = req.body;
    const result = await dailyChallengeService.scheduleDailyChallenge(id, date, req.user.id);
    return res.status(200).json({ data: result, message: 'Daily challenge scheduled successfully' });
  } catch (err) {
    next(err);
  }
}

async function archiveDailyChallenge(req, res, next) {
  try {
    const { id } = req.params;
    const result = await dailyChallengeService.archiveDailyChallenge(id);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listDailyChallenges,
  getDailyChallenge,
  createDailyChallenge,
  updateDailyChallenge,
  scheduleDailyChallenge,
  archiveDailyChallenge
};
