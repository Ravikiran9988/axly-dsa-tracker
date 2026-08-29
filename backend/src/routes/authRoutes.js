const express = require('express');
const router = express.Router();
const {
  signup,
  login,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  verifySession,
  devLogin
} = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authRateLimiter } = require('../middleware/rateLimiter');

// Public Authentication Endpoints (Rate Limited)
router.post('/signup', authRateLimiter, signup);
router.post('/login', authRateLimiter, login);
router.post('/verify-email', authRateLimiter, verifyEmail);
router.post('/resend-verification', authRateLimiter, resendVerification);
router.post('/forgot-password', authRateLimiter, forgotPassword);
router.post('/reset-password', authRateLimiter, resetPassword);

// Session Verification (Supports both GET and POST)
router.get('/verify', authRateLimiter, authenticate, verifySession);
router.post('/verify', authRateLimiter, authenticate, verifySession);

// Development/Demo-Only Login (Disabled in production by controller guard)
if (process.env.NODE_ENV !== 'production') {
  router.post('/dev-login', authRateLimiter, devLogin);
}

module.exports = router;
