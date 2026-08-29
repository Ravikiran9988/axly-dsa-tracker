const express = require('express');
const router = express.Router();
const { 
  runCode, 
  submitSolution, 
  getSubmissionsHistory 
} = require('../controllers/codeExecutionController');
const { authenticate } = require('../middleware/auth');
const { validateBody } = require('../middleware/validator');
const { runCodeSchema, submitCodeSchema } = require('../validation/schemas');
const { executionRateLimiter, submissionRateLimiter } = require('../middleware/rateLimiter');

router.use(authenticate);

// Run code against visible test cases
router.post('/run', executionRateLimiter, validateBody(runCodeSchema), runCode);

// Submit solution against all test cases (updates progress)
router.post('/submit', submissionRateLimiter, validateBody(submitCodeSchema), submitSolution);

// Get submission history for question
router.get('/submissions/:question_id', getSubmissionsHistory);

module.exports = router;
