const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const c = require('../controllers/practiceController');

// Schema and seeds are managed by server.js initialization

router.use(authenticate);

router.get('/progress', c.progress);
router.get('/topics', c.topics);
router.get('/patterns', c.patterns);

// Problem listing & details
router.get('/problems', c.problems);
router.get('/problems/:id', c.problem);
router.post('/problems/:id/start', c.start);
router.post('/problems/:id/abandon', c.abandon);
router.post('/problems/:id/submission', c.recordSubmission);

// Route aliases directly under /practice/:id
router.get('/:id', c.problem);
router.post('/:id/start', c.start);
router.post('/:id/abandon', c.abandon);
router.post('/:id/submission', c.recordSubmission);

module.exports = router;
