const express = require('express');
const router = express.Router();
const {
  getCohorts,
  getCohortById,
  createCohort,
  addMember,
  removeMember,
  assignChallenge,
  startLiveSession
} = require('../controllers/cohortController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.use(authenticate);

// Publicly readable for members or admins
router.get('/', getCohorts);
router.get('/:id', getCohortById);

// Admin-only cohort management actions
router.post('/', requireRole('admin'), createCohort);
router.post('/:id/members', requireRole('admin'), addMember);
router.delete('/:id/members/:userId', requireRole('admin'), removeMember);
router.post('/:id/assign', requireRole('admin'), assignChallenge);
router.post('/:id/live-session', requireRole('admin'), startLiveSession);

module.exports = router;
