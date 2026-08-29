const express = require('express');
const router = express.Router();
const {
  listDailyChallenges,
  getDailyChallenge,
  createDailyChallenge,
  updateDailyChallenge,
  scheduleDailyChallenge,
  archiveDailyChallenge
} = require('../controllers/dailyChallengeController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.use(authenticate);

// Public / Student read or Admin management
router.get('/', listDailyChallenges);
router.get('/:id', getDailyChallenge);

// Admin-only creation and lifecycle actions
router.post('/', requireRole('admin'), createDailyChallenge);
router.put('/:id', requireRole('admin'), updateDailyChallenge);
router.post('/:id/schedule', requireRole('admin'), scheduleDailyChallenge);
router.delete('/:id', requireRole('admin'), archiveDailyChallenge);
router.post('/:id/archive', requireRole('admin'), archiveDailyChallenge);

module.exports = router;
