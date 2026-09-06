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

let manualAutomationInFlight = false;

async function listDailyChallenges(req, res, next) {
  try {
    const { status, difficulty, topic_id, search, date, page, limit } = req.query;
    const result = await dailyChallengeService.listDailyChallenges({ status, difficulty, topic_id, search, date, page, limit });
    return res.status(200).json(result);
  } catch (err) { next(err); }
}

async function getTodayDailyChallenge(req, res, next) {
  try { return res.status(200).json(await dailyChallengeService.getTodayDailyChallenge(req.user)); }
  catch (err) { next(err); }
}

async function getDailyChallenge(req, res, next) {
  try {
    const { id } = req.params;
    const isPrivileged = req.user?.role === 'admin' || req.user?.role === 'mentor';
    return res.status(200).json({ data: await dailyChallengeService.getDailyChallengeById(id, isPrivileged) });
  } catch (err) { next(err); }
}

async function createDailyChallenge(req, res, next) {
  try { return res.status(201).json({ data: await dailyChallengeService.createDailyChallenge(req.body, req.user.id), message: 'Daily challenge created successfully' }); }
  catch (err) { next(err); }
}

async function generateAiChallenge(req, res, next) {
  try {
    const { topic, difficulty, pattern, points, instructions, scheduled_date, skipSandbox } = req.body;
    return res.status(200).json(await generateDailyChallenge({ topic, difficulty, pattern, points, instructions, scheduled_date, skipSandbox: Boolean(skipSandbox) }));
  } catch (err) {
    if (err?.code === 'DUPLICATE_COLLISION') {
      return res.status(409).json({
        success: false,
        code: 'NO_UNIQUE_PROBLEM',
        error: 'NO_UNIQUE_PROBLEM',
        message: 'No unused Daily Challenge problem is currently available.'
      });
    }
    next(err);
  }
}

async function validateDuplicate(req, res, next) {
  try {
    const { title, description, exclude_id } = req.body;
    return res.status(200).json(await checkDuplicateChallenge(title, description, exclude_id));
  } catch (err) { next(err); }
}

async function updateDailyChallenge(req, res, next) {
  try {
    const { id } = req.params;
    return res.status(200).json({ data: await dailyChallengeService.updateDailyChallenge(id, req.body, req.user.id), message: 'Daily challenge updated successfully' });
  } catch (err) { next(err); }
}

async function scheduleDailyChallenge(req, res, next) {
  try {
    const { id } = req.params;
    const { date } = req.body;
    return res.status(200).json({ data: await dailyChallengeService.scheduleDailyChallenge(id, date, req.user.id), message: 'Daily challenge scheduled successfully' });
  } catch (err) { next(err); }
}

async function publishDailyChallenge(req, res, next) {
  try {
    const { id } = req.params;
    return res.status(200).json({ data: await dailyChallengeService.publishDailyChallenge(id, req.user.id), message: 'Daily challenge published successfully' });
  } catch (err) { next(err); }
}

async function publishNowDailyChallenge(req, res, next) {
  try {
    const { id } = req.params;
    return res.status(200).json({ data: await dailyChallengeService.publishNowDailyChallenge(id, req.user.id), message: "Daily challenge published for today's active challenge" });
  } catch (err) { next(err); }
}

async function unpublishDailyChallenge(req, res, next) {
  try {
    const { id } = req.params;
    return res.status(200).json({ data: await dailyChallengeService.unpublishDailyChallenge(id, req.user.id), message: 'Daily challenge unpublished successfully' });
  } catch (err) { next(err); }
}

async function archiveDailyChallenge(req, res, next) {
  try { return res.status(200).json(await dailyChallengeService.archiveDailyChallenge(req.params.id)); }
  catch (err) { next(err); }
}

async function deleteDailyChallenge(req, res, next) {
  try { return res.status(200).json(await dailyChallengeService.deleteDailyChallenge(req.params.id)); }
  catch (err) { next(err); }
}

async function getDailyChallengeTopics(req, res, next) {
  try {
    const topicService = require('../services/topicService');
    return res.status(200).json({ success: true, data: await topicService.listDailyChallengeTopics() });
  } catch (err) { next(err); }
}

async function recommendTopic(req, res, next) {
  try {
    const topicService = require('../services/topicService');
    const { difficulty } = req.body || req.query || {};
    return res.status(200).json({ success: true, data: await topicService.recommendTopicForDailyChallenge({ difficulty }) });
  } catch (err) { next(err); }
}

async function createDailyChallengeFromPractice(req, res, next) {
  try { return res.status(201).json({ data: await dailyChallengeService.createDailyChallengeFromPractice(req.body, req.user.id), message: 'Daily challenge created from practice question' }); }
  catch (err) { next(err); }
}

async function getAutomationStatus(req, res, next) {
  try {
    const settings = await getAutomationSettings();
    const logs = await fetchAutoLogs(10);
    return res.status(200).json({
      success: true,
      data: {
        settings,
        today_utc: getCanonicalUtcDate(),
        next_target_date: getNextCanonicalUtcDate(),
        generation_time_utc: '00:00 UTC',
        recent_logs: logs
      }
    });
  } catch (err) { next(err); }
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
  } catch (err) { next(err); }
}

async function runAutomationNow(req, res, next) {
  try {
    if (manualAutomationInFlight) {
      return res.status(409).json({
        success: false,
        status: 'running',
        message: 'Daily Challenge automation is already running. Please wait for the current run to finish.'
      });
    }

    const { topic, difficulty } = req.body || {};
    const adminId = req.user?.id || 'usr-admin-01';
    manualAutomationInFlight = true;

    void runAdminAutoFillNow({ topic, difficulty, adminId })
      .catch(err => {
        console.error('❌ Background Daily Challenge automation failed:', err);
      })
      .finally(() => {
        manualAutomationInFlight = false;
      });

    return res.status(202).json({
      success: true,
      status: 'running',
      message: 'Daily Challenge automation started. Check the automation status/logs for the result.'
    });
  } catch (err) { next(err); }
}

async function getAutomationLogs(req, res, next) {
  try {
    const { limit } = req.query;
    return res.status(200).json({ success: true, data: await fetchAutoLogs(limit || 50) });
  } catch (err) { next(err); }
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