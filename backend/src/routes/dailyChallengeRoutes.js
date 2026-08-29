const express = require('express');
const router = express.Router();
const {
  listDailyChallenges,
  getTodayDailyChallenge,
  getDailyChallenge,
  createDailyChallenge,
  generateAiChallenge,
  validateDuplicate,
  updateDailyChallenge,
  scheduleDailyChallenge,
  publishDailyChallenge,
  unpublishDailyChallenge,
  archiveDailyChallenge,
  deleteDailyChallenge
} = require('../controllers/dailyChallengeController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.use(authenticate);

// Public / Student active challenge endpoint
router.get('/today', getTodayDailyChallenge);

// Repository listing and details
router.get('/', listDailyChallenges);
router.get('/:id', getDailyChallenge);

// Admin-only creation, AI generation, and lifecycle actions
router.post('/generate-ai', requireRole('admin'), generateAiChallenge);
router.post('/validate-duplicate', requireRole('admin'), validateDuplicate);
router.post('/', requireRole('admin'), createDailyChallenge);
router.put('/:id', requireRole('admin'), updateDailyChallenge);
router.post('/:id/schedule', requireRole('admin'), scheduleDailyChallenge);
router.post('/:id/publish', requireRole('admin'), publishDailyChallenge);
router.post('/:id/unpublish', requireRole('admin'), unpublishDailyChallenge);
router.patch('/:id/unpublish', requireRole('admin'), unpublishDailyChallenge);
router.post('/:id/archive', requireRole('admin'), archiveDailyChallenge);
router.delete('/:id/permanent', requireRole('admin'), deleteDailyChallenge);
router.delete('/:id', requireRole('admin'), deleteDailyChallenge);

module.exports = router;
