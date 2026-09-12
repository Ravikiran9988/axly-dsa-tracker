const { generateQuestion } = require('../services/aiQuestionService');
const { findSimilarQuestions, THRESHOLD } = require('../services/questionSimilarityService');
const auditService = require('../services/auditService');

async function generate(req, res, next) {
  try {
    const { topic, difficulty, count } = req.body;
    const data = await generateQuestion({ topic, difficulty, count: Number(count) || 8 });
    const items = Array.isArray(data) ? data : [data];
    const checked = [];

    for (const q of items) {
      let duplicateCheck = { configured: false, threshold: THRESHOLD, matches: [] };
      try {
        duplicateCheck = await findSimilarQuestions({ title: q.title, description: q.description });
      } catch (e) {
        duplicateCheck = { configured: false, threshold: THRESHOLD, matches: [], error: e.message };
      }
      checked.push({
        ...q,
        status: 'draft',
        duplicate_check: duplicateCheck,
        duplicate_flag: duplicateCheck.matches.length > 0
      });
    }

    auditService.logAction({
      actorId: req.user?.id,
      actorEmail: req.user?.email,
      action: 'ai_question_generate',
      resourceType: 'ai_question',
      metadata: {
        topic,
        difficulty,
        count: checked.length,
        duplicate_flags: checked.filter(q => q.duplicate_flag).length
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    return res.status(200).json({ data: Array.isArray(data) ? checked : checked[0] });
  } catch (e) {
    next(e);
  }
}

const { 
  generateForSlot, 
  getCurrentIstSlot, 
  getQuestionBankGenerationStatus: fetchQbStatus,
  getAutomationSettings,
  updateAutomationSettings,
  getAutomationLogs
} = require('../services/questionBankAutomationService');

async function generateQuestionBankManual(req, res, next) {
  try {
    const slot = getCurrentIstSlot();
    const result = await generateForSlot(slot, req.user?.id || 'usr-admin-manual');
    return res.status(result.success ? 200 : 400).json(result);
  } catch (e) {
    next(e);
  }
}

async function getQuestionBankGenerationStatus(req, res, next) {
  try {
    const status = await fetchQbStatus();
    return res.status(200).json(status);
  } catch (e) {
    next(e);
  }
}

async function getSettings(req, res, next) {
  try {
    const settings = await getAutomationSettings();
    return res.status(200).json(settings);
  } catch (e) {
    next(e);
  }
}

async function updateSettings(req, res, next) {
  try {
    const settings = await updateAutomationSettings(req.body);
    return res.status(200).json(settings);
  } catch (e) {
    next(e);
  }
}

async function getLogs(req, res, next) {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const logs = await getAutomationLogs(limit);
    return res.status(200).json(logs);
  } catch (e) {
    next(e);
  }
}

module.exports = { 
  generate, 
  generateQuestionBankManual, 
  getQuestionBankGenerationStatus,
  getSettings,
  updateSettings,
  getLogs
};
