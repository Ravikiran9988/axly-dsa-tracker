const express = require('express');
const router = express.Router();
const { 
  getQuestions, 
  getQuestionById, 
  createQuestion, 
  updateQuestion, 
  deleteQuestion, 
  getTopics 
} = require('../controllers/questionController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { validateBody } = require('../middleware/validator');
const { createQuestionSchema, updateQuestionSchema } = require('../validation/schemas');

// All question routes require authentication
router.use(authenticate);

router.get('/', getQuestions);
router.get('/topics', getTopics);
router.get('/:id', getQuestionById);

// Admin-only endpoints
router.post('/', requireRole('admin'), validateBody(createQuestionSchema), createQuestion);
router.patch('/:id', requireRole('admin'), validateBody(updateQuestionSchema), updateQuestion);
router.delete('/:id', requireRole('admin'), deleteQuestion);

module.exports = router;
