const dsaAiService = require('../services/dsaAiService');
const dsaAiCoachService = require('../services/dsaAiCoachService');

async function analyzeQuestion(req, res, next) {
  try {
    const { question, problemId } = req.body || {};
    const result = await dsaAiService.analyzeQuestion({
      question,
      problemId,
      user: req.user
    });
    return res.status(200).json({
      data: result
    });
  } catch (err) {
    next(err);
  }
}

async function generateGuidance(req, res, next) {
  try {
    const { question, problemId, code, forceLlm } = req.body || {};
    const result = await dsaAiService.generateGuidance({
      question,
      problemId,
      code,
      forceLlm,
      user: req.user
    });
    
    if (result && result.providerErrors) {
      delete result.providerErrors;
    }
    return res.status(200).json({
      data: result
    });
  } catch (err) {
    next(err);
  }
}

async function coach(req, res, next) {
  try {
    const {
      question,
      problemId,
      action,
      language,
      code,
      hintIndex,
      verify,
      conversationHistory
    } = req.body || {};

    // Validate conversationHistory: must be an array if provided, max 24 items
    let safeHistory = [];
    if (conversationHistory !== undefined) {
      if (!Array.isArray(conversationHistory)) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'conversationHistory must be an array of message objects'
          }
        });
      }
      // Accept up to 24 items (12 full turns), filter malformed entries
      safeHistory = conversationHistory
        .filter(m => m && typeof m === 'object' && typeof m.content === 'string' && ['user', 'assistant'].includes(m.role))
        .slice(0, 24);
    }

    const result = await dsaAiCoachService.coach({
      question,
      problemId,
      action,
      language,
      code,
      hintIndex,
      verify,
      conversationHistory: safeHistory,
      user: req.user
    });

    if (result && result.providerErrors) {
      delete result.providerErrors;
    }

    return res.status(200).json({
      data: result
    });
  } catch (err) {
    next(err);
  }
}

async function verifyCode(req, res, next) {
  try {
    const { problemId, language, code, allowCorrection } = req.body || {};
    const result = await dsaAiCoachService.verifyAndCorrectCode({
      problemId,
      language,
      code,
      allowCorrection: allowCorrection !== false
    });
    return res.status(200).json({
      data: result
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  analyzeQuestion,
  generateGuidance,
  coach,
  verifyCode
};
