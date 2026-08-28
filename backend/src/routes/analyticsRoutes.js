const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { getMine, getAdminStats } = require('../controllers/analyticsController');

router.use(authenticate);
router.get('/me', getMine);
router.get('/admin/stats', requireRole('admin'), getAdminStats);

module.exports = router;
