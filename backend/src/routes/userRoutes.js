const express = require('express');
const router = express.Router();
const { listUsers, updateUserRole } = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.use(authenticate);

// Admin-only user management
router.get('/', requireRole('admin'), listUsers);
router.patch('/:id/role', requireRole('admin'), updateUserRole);

module.exports = router;
