const express = require('express');
const router = express.Router();
const { getDailyQuestion, setDailyQuestion } = require('../controllers/dailyQuestionController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { validateBody } = require('../middleware/validator');
const { setDailyQuestionSchema } = require('../validation/schemas');

router.use(authenticate);

router.get('/', getDailyQuestion);
router.post('/', requireRole('admin'), validateBody(setDailyQuestionSchema), setDailyQuestion);

module.exports = router;
