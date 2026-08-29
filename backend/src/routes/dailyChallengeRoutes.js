const express = require('express');
const router = express.Router();
const {
  listDailyChallenges,
  getTodayDailyChallenge,
  getDailyChallenge,
  createDailyChallenge,
  createFromPractice,
  updateDailyChallenge,
  scheduleDailyChallenge,
  publishDailyChallenge,
  archiveDailyChallenge
} = require('../controllers/dailyChallengeController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.use(authenticate);

// Public / Student active challenge endpoint
router.get('/today', getTodayDailyChallenge);

// Repository listing and details
router.get('/', listDailyChallenges);
router.get('/:id', getDailyChallenge);

// Admin-only creation, conversion from practice, and lifecycle actions
router.post('/', requireRole('admin'), createDailyChallenge);
router.post('/from-practice', requireRole('admin'), createFromPractice);
router.put('/:id', requireRole('admin'), updateDailyChallenge);
router.post('/:id/schedule', requireRole('admin'), scheduleDailyChallenge);
router.post('/:id/publish', requireRole('admin'), publishDailyChallenge);
router.delete('/:id', requireRole('admin'), archiveDailyChallenge);
router.post('/:id/archive', requireRole('admin'), archiveDailyChallenge);

module.exports = router;
