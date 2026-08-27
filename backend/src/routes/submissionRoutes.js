const express = require('express');
const router = express.Router();
const { 
  getSubmissions,
  submitViaGithub,
  reviewSubmission,
  updateSubmission, 
  upsertQuestionSubmission 
} = require('../controllers/submissionController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { validateBody } = require('../middleware/validator');
const { updateSubmissionSchema } = require('../validation/schemas');

router.use(authenticate);

// Get submissions (own submissions for user, all for admin/mentor)
router.get('/', getSubmissions);

// Submit solution via GitHub URL
router.post('/github', submitViaGithub);

// Mentor Review (Admin / Mentor only)
router.post('/:id/review', requireRole('admin'), reviewSubmission);

// Toggle/update submission status directly
router.post('/', upsertQuestionSubmission);
router.patch('/:id', validateBody(updateSubmissionSchema), updateSubmission);

module.exports = router;
