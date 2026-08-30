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
  publishNowDailyChallenge,
  unpublishDailyChallenge,
  archiveDailyChallenge,
  deleteDailyChallenge,
  getDailyChallengeTopics,
  recommendTopic,
  createDailyChallengeFromPractice,
  getAutomationStatus,
  updateAutomationSettings,
  runAutomationNow,
  getAutomationLogs
} = require('../controllers/dailyChallengeController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.use(authenticate);

// Topic taxonomy & AI Topic recommendation
router.get('/topics', getDailyChallengeTopics);
router.post('/recommend-topic', requireRole('admin'), recommendTopic);

// Public / Student active challenge endpoint
router.get('/today', getTodayDailyChallenge);

// Automation endpoints (Admin Only) - Mounted before /:id
router.get('/automation/status', requireRole('admin'), getAutomationStatus);
router.patch('/automation/settings', requireRole('admin'), updateAutomationSettings);
router.post('/automation/run-now', requireRole('admin'), runAutomationNow);
router.get('/automation/logs', requireRole('admin'), getAutomationLogs);

// Repository listing
router.get('/', listDailyChallenges);

// Admin-only creation, AI generation, duplicate validation
router.post('/from-practice', requireRole('admin'), createDailyChallengeFromPractice);
router.post('/generate-ai', requireRole('admin'), generateAiChallenge);
router.post('/validate-duplicate', requireRole('admin'), validateDuplicate);
router.post('/', requireRole('admin'), createDailyChallenge);

// Specific challenge operations
router.get('/:id', getDailyChallenge);
router.put('/:id', requireRole('admin'), updateDailyChallenge);
router.post('/:id/schedule', requireRole('admin'), scheduleDailyChallenge);
router.post('/:id/publish', requireRole('admin'), publishDailyChallenge);
router.post('/:id/publish-now', requireRole('admin'), publishNowDailyChallenge);
router.post('/:id/unpublish', requireRole('admin'), unpublishDailyChallenge);
router.patch('/:id/unpublish', requireRole('admin'), unpublishDailyChallenge);
router.post('/:id/archive', requireRole('admin'), archiveDailyChallenge);
router.delete('/:id/permanent', requireRole('admin'), deleteDailyChallenge);
router.delete('/:id', requireRole('admin'), deleteDailyChallenge);

module.exports = router;
