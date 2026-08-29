const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { generate } = require('../controllers/aiQuestionController');
const { aiRateLimiter } = require('../middleware/rateLimiter');

router.use(authenticate, requireRole('admin'));
router.post('/generate', aiRateLimiter, generate);

module.exports = router;
