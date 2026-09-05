const dailyChallengeService = require('../services/dailyChallengeService');
const { generateDailyChallenge, checkDuplicateChallenge, validateDailyChallenge: validateChallengeData } = require('../services/aiDailyChallengeService');
const {
  getAutomationSettings,
  updateAutomationSettings: updateAutoSettings,
  getAutomationLogs: fetchAutoLogs,
  runAdminAutoFillNow,
  runDailyScheduledAutomation,
  runAutomationPipeline
} = require('../services/dailyChallengeAutomationService');
const { getNextCanonicalUtcDate, getCanonicalUtcDate } = require('../utils/dateUtils');

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
    const { topic, difficulty, pattern, points, instructions, scheduled_date, skipSandbox } = req.body;
    const result = await generateDailyChallenge({
      topic,
      difficulty,
      pattern,
      points,
      instructions,
      scheduled_date,
      skipSandbox: Boolean(skipSandbox)
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
    return res.status(200).json({ data: result, message: 'Daily challenge published successfully' });
  } catch (err) {
    next(err);
  }
}

async function publishNowDailyChallenge(req, res, next) {
  try {
    const { id } = req.params;
    const result = await dailyChallengeService.publishNowDailyChallenge(id, req.user.id);
    return res.status(200).json({ data: result, message: "Daily challenge published for today's active challenge" });
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

// Automation Controller Handlers
async function getAutomationStatus(req, res, next) {
  try {
    const settings = await getAutomationSettings();
    const logs = await fetchAutoLogs(10);
    const nextTargetDate = getNextCanonicalUtcDate();
    const todayUtc = getCanonicalUtcDate();

    return res.status(200).json({
      success: true,
      data: {
        settings,
        today_utc: todayUtc,
        next_target_date: nextTargetDate,
        generation_time_utc: '00:00 UTC',
        recent_logs: logs
      }
    });
  } catch (err) {
    next(err);
  }
}

async function updateAutomationSettings(req, res, next) {
  try {
    const { mode, is_enabled, retry_limit } = req.body;
    const updated = await updateAutoSettings({
      mode,
      is_enabled: mode === 'ai_assist' || mode === 'auto_fill' ? true : is_enabled,
      retry_limit
    });
    return res.status(200).json({ success: true, data: updated, message: 'Automation settings updated successfully' });
  } catch (err) {
    next(err);
  }
}

async function runAutomationNow(req, res, next) {
  try {
    const { topic, difficulty } = req.body || {};
    const result = await runAdminAutoFillNow({
      topic,
      difficulty,
      adminId: req.user?.id || 'usr-admin-01'
    });
    return res.status(result.success ? 200 : 422).json(result);
  } catch (err) {
    next(err);
  }
}

async function getAutomationLogs(req, res, next) {
  try {
    const { limit } = req.query;
    const logs = await fetchAutoLogs(limit || 50);
    return res.status(200).json({ success: true, data: logs });
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
  publishNowDailyChallenge,
  unpublishDailyChallenge,
  archiveDailyChallenge,
  deleteDailyChallenge,
  getDailyChallengeTopics,
  recommendTopic,
  getAutomationStatus,
  updateAutomationSettings,
  runAutomationNow,
  getAutomationLogs
};