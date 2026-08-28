const { generateQuestion } = require('../services/aiQuestionService');
const auditService = require('../services/auditService');

async function generate(req, res, next) {
  try {
    const { topic, difficulty, language, count } = req.body;
    const data = await generateQuestion({ topic, difficulty, language, count });

    // AI generated questions are explicitly returned as draft for admin preview/edit/approval
    const draftData = Array.isArray(data)
      ? data.map(q => ({ ...q, status: 'draft' }))
      : { ...data, status: 'draft' };

    auditService.logAction({
      actorId: req.user?.id,
      actorEmail: req.user?.email,
      action: 'ai_question_generate',
      resourceType: 'ai_question',
      metadata: { topic, difficulty, language, count: Array.isArray(draftData) ? draftData.length : 1 },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    return res.status(200).json({ data: draftData });
  } catch (e) {
    next(e);
  }
}

module.exports = { generate };
