const express = require('express');
const router = express.Router();
const { 
  listUsers, 
  getMyProfile, 
  updateMyProfile, 
  getLeaderboard, 
  getUserById, 
  updateUserRole 
} = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.use(authenticate);

// User profile & leaderboard routes
router.get('/profile/me', getMyProfile);
router.patch('/profile/me', updateMyProfile);
router.get('/leaderboard', getLeaderboard);

// Admin-only user management
router.get('/', requireRole('admin'), listUsers);
router.get('/:id', requireRole('admin'), getUserById);
router.patch('/:id/role', requireRole('admin'), updateUserRole);

module.exports = router;
