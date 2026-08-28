const express = require('express');
const router = express.Router();
const { verifySession, devLogin } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authRateLimiter } = require('../middleware/rateLimiter');

// Session verification supports both GET and POST requests
router.get('/verify', authRateLimiter, authenticate, verifySession);
router.post('/verify', authRateLimiter, authenticate, verifySession);

// Development/demo-only login. The controller also enforces the production guard.
if (process.env.NODE_ENV !== 'production') {
  router.post('/dev-login', authRateLimiter, devLogin);
}

module.exports = router;
