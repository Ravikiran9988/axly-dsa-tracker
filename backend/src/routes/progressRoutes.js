const express = require('express');
const router = express.Router();
const { getMyProgress, getAdminProgress, getAdminStats } = require('../controllers/progressController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.use(authenticate);

// User's own progress
router.get('/me', getMyProgress);

// Admin-only aggregate progress
router.get('/admin', requireRole('admin'), getAdminProgress);
router.get('/stats', requireRole('admin'), getAdminStats);

module.exports = router;
