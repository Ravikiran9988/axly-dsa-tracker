const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
router.use(authenticate);
router.use((req, res) => res.status(410).json({ error: { code: 'FEATURE_REMOVED', message: 'Cohorts and membership are no longer part of the Axly core product.' } }));
module.exports = router;
