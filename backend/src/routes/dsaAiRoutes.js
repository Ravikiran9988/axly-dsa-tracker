const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const dsaAiController = require('../controllers/dsaAiController');
const { authenticate } = require('../middleware/auth');

const dsaAiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 1000 : 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many AI requests. Please slow down.'
    }
  }
});

// Phase 1: Deterministic DSA AI Analysis endpoint
router.post('/analyze', authenticate, dsaAiController.analyzeQuestion);

// Phase 2: AI Guidance generation with multi-provider LLM fallback
router.post('/generate', authenticate, dsaAiLimiter, dsaAiController.generateGuidance);

// Phase 3: DSA AI Coach with progressive hints, reviews, explanations and code verification
router.post('/coach', authenticate, dsaAiLimiter, dsaAiController.coach);
router.post('/verify', authenticate, dsaAiLimiter, dsaAiController.verifyCode);

module.exports = router;
