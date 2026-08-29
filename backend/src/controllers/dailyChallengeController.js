const dailyChallengeService = require('../services/dailyChallengeService');
const { generateDailyChallenge, checkDuplicateChallenge, validateDailyChallenge: validateChallengeData } = require('../services/aiDailyChallengeService');

async function listDailyChallenges(req, res, next) {
  try {
    const { status, difficulty, topic_id, search, date, page, limit } = req.query;
    const result = await dailyChallengeService.listDailyChallenges({
      status,
      difficulty,
      topic_id,
      search,
      date,
      page,
      limit
    });
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function getTodayDailyChallenge(req, res, next) {
  try {
    const result = await dailyChallengeService.getTodayDailyChallenge(req.user);
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

async function generateAiChallenge(req, res, next) {
  try {
    const { topic, difficulty, pattern, points, instructions, scheduled_date } = req.body;
    const result = await generateDailyChallenge({
      topic,
      difficulty,
      pattern,
      points,
      instructions,
      scheduled_date
    });
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function validateDuplicate(req, res, next) {
  try {
    const { title, description, exclude_id } = req.body;
    const result = await checkDuplicateChallenge(title, description, exclude_id);
    return res.status(200).json(result);
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

async function publishDailyChallenge(req, res, next) {
  try {
    const { id } = req.params;
    const result = await dailyChallengeService.publishDailyChallenge(id, req.user.id);
    return res.status(200).json({ data: result, message: 'Daily challenge status updated' });
  } catch (err) {
    next(err);
  }
}

async function unpublishDailyChallenge(req, res, next) {
  try {
    const { id } = req.params;
    const result = await dailyChallengeService.unpublishDailyChallenge(id, req.user.id);
    return res.status(200).json({ data: result, message: 'Daily challenge unpublished successfully' });
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

async function deleteDailyChallenge(req, res, next) {
  try {
    const { id } = req.params;
    const result = await dailyChallengeService.deleteDailyChallenge(id);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function getDailyChallengeTopics(req, res, next) {
  try {
    const topicService = require('../services/topicService');
    const result = await topicService.listDailyChallengeTopics();
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function recommendTopic(req, res, next) {
  try {
    const topicService = require('../services/topicService');
    const { difficulty } = req.body || req.query || {};
    const result = await topicService.recommendTopicForDailyChallenge({ difficulty });
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function createDailyChallengeFromPractice(req, res, next) {
  try {
    const result = await dailyChallengeService.createDailyChallengeFromPractice(req.body, req.user.id);
    return res.status(201).json({ data: result, message: 'Daily challenge created from practice question' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listDailyChallenges,
  getTodayDailyChallenge,
  getDailyChallenge,
  createDailyChallenge,
  createDailyChallengeFromPractice,
  generateAiChallenge,
  validateDuplicate,
  updateDailyChallenge,
  scheduleDailyChallenge,
  publishDailyChallenge,
  unpublishDailyChallenge,
  archiveDailyChallenge,
  deleteDailyChallenge,
  getDailyChallengeTopics,
  recommendTopic
};
