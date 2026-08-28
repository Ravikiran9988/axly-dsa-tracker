const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/questionController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { validateBody } = require('../middleware/validator');
const { createQuestionSchema, updateQuestionSchema } = require('../validation/schemas');

router.use(authenticate);
router.get('/', getQuestions);
router.get('/topics', getTopics);
router.get('/:id/versions/compare', requireRole('admin'), compareQuestionVersions);
router.get('/:id/versions', requireRole('admin'), getQuestionVersions);
router.get('/:id/versions/:version', requireRole('admin'), getQuestionVersion);
router.post('/:id/versions/:version/restore', requireRole('admin'), restoreQuestionVersion);
router.get('/:id', getQuestionById);
router.post('/', requireRole('admin'), validateBody(createQuestionSchema), createQuestion);
router.patch('/:id', requireRole('admin'), validateBody(updateQuestionSchema), updateQuestion);
router.post('/:id/validate', requireRole('admin'), validateQuestion);
router.delete('/:id', requireRole('admin'), deleteQuestion);

module.exports = router;
