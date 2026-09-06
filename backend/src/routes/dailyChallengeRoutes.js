const express = require('express');
const router = express.Router();
const {
  listDailyChallenges,
  getTodayDailyChallenge,
  getDailyChallenge,
  createDailyChallenge,
  generateAiChallenge,
  generateAiTestCases,
  generateAiHints,
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

router.get('/topics', getDailyChallengeTopics);
router.post('/recommend-topic', requireRole('admin'), recommendTopic);
router.get('/today', getTodayDailyChallenge);

router.get('/automation/status', requireRole('admin'), getAutomationStatus);
router.patch('/automation/settings', requireRole('admin'), updateAutomationSettings);
router.post('/automation/run-now', requireRole('admin'), runAutomationNow);
router.get('/automation/logs', requireRole('admin'), getAutomationLogs);

router.get('/', listDailyChallenges);
router.post('/from-practice', requireRole('admin'), createDailyChallengeFromPractice);
router.post('/generate-ai', requireRole('admin'), generateAiChallenge);
router.post('/generate-ai/test-cases', requireRole('admin'), generateAiTestCases);
router.post('/generate-ai/hints', requireRole('admin'), generateAiHints);
router.post('/validate-duplicate', requireRole('admin'), validateDuplicate);
router.post('/', requireRole('admin'), createDailyChallenge);

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
