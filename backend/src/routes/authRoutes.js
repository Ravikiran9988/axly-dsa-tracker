const express = require('express');
const router = express.Router();
const { verifySession, devLogin } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authRateLimiter } = require('../middleware/rateLimiter');

router.post('/verify', authRateLimiter, authenticate, verifySession);
router.post('/dev-login', authRateLimiter, devLogin);

module.exports = router;
