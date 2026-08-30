const rateLimit = require('express-rate-limit');

const isTest = process.env.NODE_ENV === 'test';

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTest ? 10000 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later.'
    }
  }
});

const executionRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isTest ? 10000 : 30, // 30 code executions / min
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Code execution rate limit exceeded. Please wait a moment before running code again.'
    }
  }
});

const submissionRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isTest ? 10000 : 20, // 20 submissions / min
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Submission rate limit exceeded. Please wait a moment before submitting again.'
    }
  }
});

const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isTest ? 10000 : 10, // 10 AI operations / min
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'AI request limit reached. Please wait before generating or reviewing again.'
    }
  }
});

module.exports = {
  authRateLimiter,
  executionRateLimiter,
  submissionRateLimiter,
  aiRateLimiter
};
