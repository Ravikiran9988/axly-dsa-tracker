const { generateCanonicalQuestion } = require('../services/aiQuestionGenerationPipeline');
const auditService = require('../services/auditService');

async function generate(req, res, next) {
  try {
    const { topic, difficulty, count } = req.body;
    const results = [];
    const numToGenerate = Math.min(Number(count) || 1, 4);

    for (let i = 0; i < numToGenerate; i++) {
      const result = await generateCanonicalQuestion({
        topic,
        difficulty,
        skipSandbox: process.env.NODE_ENV !== 'production',
        destination: 'ai_preview'
      });
      results.push({
        ...result.data,
        status: 'draft',
        duplicate_check: { isDuplicate: false },
        duplicate_flag: false
      });
    }

    const checked = results;
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

    return res.status(200).json({ data: numToGenerate === 1 ? checked[0] : checked });
  } catch (e) {
    next(e);
  }
}

const { 
  generateForSlot, 
  getSlotState,
  getCurrentIstSlot, 
  getQuestionBankGenerationStatus: fetchQbStatus,
  getAutomationSettings,
  updateAutomationSettings,
  getAutomationLogs,
  persistRunStatus
} = require('../services/questionBankAutomationService');

async function generateQuestionBankManual(req, res, next) {
  try {
    const slot = getCurrentIstSlot();
    const adminId = req.user?.id || 'usr-admin-manual';

    // Execute generation in background to prevent Heroku 30s H12 router timeout
    setImmediate(async () => {
      try {
        const result = await generateForSlot(slot, adminId, { isManual: true });
        if (result && result.status) {
          await persistRunStatus(result.status);
        }
      } catch (err) {
        console.error('Manual QB generation failed in background:', err.message);
      }
    });

    return res.status(202).json({
      success: true,
      status: 'pending',
      message: `Question generation for slot ${slot} started in the background.`
    });
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
