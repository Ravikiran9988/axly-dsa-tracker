const express = require('express');
const router = express.Router();
const { 
  createAssignment, 
  bulkAssign, 
  unassign, 
  getAssignments 
} = require('../controllers/assignmentController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { validateBody } = require('../middleware/validator');
const { createAssignmentSchema, bulkAssignmentSchema } = require('../validation/schemas');

router.use(authenticate);

router.get('/', getAssignments);

// Admin-only endpoints
router.post('/', requireRole('admin'), validateBody(createAssignmentSchema), createAssignment);
router.post('/bulk', requireRole('admin'), validateBody(bulkAssignmentSchema), bulkAssign);
router.delete('/:id', requireRole('admin'), unassign);

module.exports = router;
