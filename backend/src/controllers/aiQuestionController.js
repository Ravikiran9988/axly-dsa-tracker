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

module.exports = { generate };
