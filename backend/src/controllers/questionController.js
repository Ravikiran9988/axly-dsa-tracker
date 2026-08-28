const questionService = require('../services/questionService');
const auditService = require('../services/auditService');
const { validateQuestionForPublish } = require('../services/questionLifecycleService');
const {
  ensureQuestionVersioning,
  createVersion,
  listVersions,
  getVersion,
  compareVersions,
  restoreVersion
} = require('../db/questionVersioning');

function ensureVersioning() {
  ensureQuestionVersioning();
}

async function getQuestions(req, res, next) {
  try {
    const { difficulty, topic_id, assigned, page, limit, search } = req.query;
    return res.status(200).json(questionService.listQuestions({
      user: req.user,
      difficulty,
      topic_id,
      assigned,
      page,
      limit,
      search
    }));
  } catch (err) {
    next(err);
  }
}

async function getQuestionById(req, res, next) {
  try {
    const question = questionService.getQuestionById(req.params.id, req.user);
    if (!question) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Question not found' } });
    }
    return res.status(200).json({ data: question });
  } catch (err) {
    next(err);
  }
}

async function createQuestion(req, res, next) {
  try {
    const question = questionService.createQuestion(req.body);
    ensureVersioning();
    createVersion(question, req.user?.id, 'create');

    auditService.logAction({
      actorId: req.user?.id,
      actorEmail: req.user?.email,
      action: 'question_create',
      resourceType: 'question',
      resourceId: question.id,
      afterData: question,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    return res.status(201).json({ data: question });
  } catch (err) {
    next(err);
  }
}

async function updateQuestion(req, res, next) {
  try {
    const existing = questionService.getQuestionById(req.params.id, { role: 'admin' });
    const question = questionService.updateQuestion(req.params.id, req.body);
    ensureVersioning();
    createVersion(question, req.user?.id, 'update');

    auditService.logAction({
      actorId: req.user?.id,
      actorEmail: req.user?.email,
      action: req.body.status === 'published' && existing?.status !== 'published' ? 'question_publish' : 'question_update',
      resourceType: 'question',
      resourceId: question.id,
      beforeData: existing,
      afterData: question,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    return res.status(200).json({ data: question });
  } catch (err) {
    next(err);
  }
}

async function validateQuestion(req, res, next) {
  try {
    const question = questionService.getQuestionById(req.params.id, { role: 'admin' });
    if (!question) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Question not found' } });
    }
    return res.status(200).json({ data: validateQuestionForPublish(question) });
  } catch (err) {
    next(err);
  }
}

async function getQuestionVersions(req, res, next) {
  try {
    ensureVersioning();
    if (!questionService.getQuestionById(req.params.id, { role: 'admin' })) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Question not found' } });
    }
    return res.status(200).json({ data: listVersions(req.params.id) });
  } catch (err) {
    next(err);
  }
}

async function getQuestionVersion(req, res, next) {
  try {
    ensureVersioning();
    const version = getVersion(req.params.id, req.params.version);
    if (!version) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Question version not found' } });
    }
    return res.status(200).json({ data: version });
  } catch (err) {
    next(err);
  }
}

async function compareQuestionVersions(req, res, next) {
  try {
    ensureVersioning();
    const { v1, v2 } = req.query;
    if (!v1 || !v2) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Provide both v1 and v2 version query parameters' } });
    }
    const comparison = compareVersions(req.params.id, v1, v2);
    if (!comparison) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'One or both versions not found for this question' } });
    }
    return res.status(200).json({ data: comparison });
  } catch (err) {
    next(err);
  }
}

async function restoreQuestionVersion(req, res, next) {
  try {
    ensureVersioning();
    const result = restoreVersion(req.params.id, req.params.version, req.user?.id);

    auditService.logAction({
      actorId: req.user?.id,
      actorEmail: req.user?.email,
      action: 'question_version_restore',
      resourceType: 'question',
      resourceId: req.params.id,
      metadata: { target_version: req.params.version },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    return res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

async function deleteQuestion(req, res, next) {
  try {
    const existing = questionService.getQuestionById(req.params.id, { role: 'admin' });
    const result = questionService.deleteQuestion(req.params.id);

    auditService.logAction({
      actorId: req.user?.id,
      actorEmail: req.user?.email,
      action: 'question_delete',
      resourceType: 'question',
      resourceId: req.params.id,
      beforeData: existing,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function getTopics(req, res, next) {
  try {
    return res.status(200).json({ data: questionService.listTopics() });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  validateQuestion,
  getQuestionVersions,
  getQuestionVersion,
  compareQuestionVersions,
  restoreQuestionVersion,
  deleteQuestion,
  getTopics
};
