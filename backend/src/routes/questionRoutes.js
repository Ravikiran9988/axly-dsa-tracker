const express = require('express');
const router = express.Router();
const { getQuestions, getQuestionById, createQuestion, updateQuestion, validateQuestion, getQuestionVersions, getQuestionVersion, deleteQuestion, getTopics } = require('../controllers/questionController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { validateBody } = require('../middleware/validator');
const { createQuestionSchema, updateQuestionSchema } = require('../validation/schemas');

router.use(authenticate);
router.get('/', getQuestions);
router.get('/topics', getTopics);
router.get('/:id', getQuestionById);
router.get('/:id/versions', requireRole('admin'), getQuestionVersions);
router.get('/:id/versions/:version', requireRole('admin'), getQuestionVersion);
router.post('/', requireRole('admin'), validateBody(createQuestionSchema), createQuestion);
router.patch('/:id', requireRole('admin'), validateBody(updateQuestionSchema), updateQuestion);
router.post('/:id/validate', requireRole('admin'), validateQuestion);
router.delete('/:id', requireRole('admin'), deleteQuestion);
module.exports = router;
