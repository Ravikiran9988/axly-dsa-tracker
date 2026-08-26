const express = require('express');
const router = express.Router();
const { updateSubmission, upsertQuestionSubmission } = require('../controllers/submissionController');
const { authenticate } = require('../middleware/auth');
const { validateBody } = require('../middleware/validator');
const { updateSubmissionSchema } = require('../validation/schemas');

router.use(authenticate);

// Update specific submission by ID
router.patch('/:id', validateBody(updateSubmissionSchema), updateSubmission);

// Convenience upsert by question_id
router.post('/toggle', upsertQuestionSubmission);

module.exports = router;
