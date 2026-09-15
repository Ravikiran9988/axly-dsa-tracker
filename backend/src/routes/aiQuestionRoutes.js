const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { 
  generate, 
  generateQuestionBankManual, 
  getQuestionBankGenerationStatus,
  getSettings,
  updateSettings,
  getLogs
} = require('../controllers/aiQuestionController');
const { aiRateLimiter } = require('../middleware/rateLimiter');

router.use(authenticate, requireRole('admin'));
router.post('/generate', aiRateLimiter, generate);
router.post('/question-bank/manual', aiRateLimiter, generateQuestionBankManual);
router.get('/question-bank/status', getQuestionBankGenerationStatus);

router.get('/question-bank/automation/settings', getSettings);
router.patch('/question-bank/automation/settings', updateSettings);
router.get('/question-bank/automation/logs', getLogs);

module.exports = router;
