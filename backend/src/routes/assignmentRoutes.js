const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
router.use(authenticate);
router.use((req, res) => res.status(410).json({ error: { code: 'FEATURE_REMOVED', message: 'Assignments are no longer part of the Axly student workflow. Use Practice or Daily Challenge.' } }));
module.exports = router;
