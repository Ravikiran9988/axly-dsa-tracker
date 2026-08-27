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
const {
  updateSubmissionSchema,
  githubSubmissionSchema,
  reviewSubmissionSchema
} = require('../validation/schemas');

router.use(authenticate);

// Get submissions (own submissions for user, all for admin/mentor)
router.get('/', getSubmissions);

// Submit solution via GitHub URL
router.post('/github', validateBody(githubSubmissionSchema), submitViaGithub);

// Mentor/Admin review
router.post('/:id/review', requireRole('admin', 'mentor'), validateBody(reviewSubmissionSchema), reviewSubmission);

// Toggle/update submission status directly (supports both / and /toggle)
router.post('/', upsertQuestionSubmission);
router.post('/toggle', upsertQuestionSubmission);
router.patch('/:id', validateBody(updateSubmissionSchema), updateSubmission);

module.exports = router;
