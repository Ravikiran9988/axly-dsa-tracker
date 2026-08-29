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
      verify
    } = req.body || {};

    const result = await dsaAiCoachService.coach({
      question,
      problemId,
      action,
      language,
      code,
      hintIndex,
      verify,
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
