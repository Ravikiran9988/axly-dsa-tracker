const assignmentService = require('../services/assignmentService');
const auditService = require('../services/auditService');

async function createAssignment(req, res, next) {
  try {
    const { user_id, question_id, cohort_id, due_date, priority, instructions } = req.body;
    const assignment = assignmentService.createAssignment({
      user_id,
      question_id,
      cohort_id,
      due_date,
      priority,
      instructions,
      admin_id: req.user.id
    });

    auditService.logAction({
      actorId: req.user?.id,
      actorEmail: req.user?.email,
      action: 'assignment_create',
      resourceType: 'assignment',
      resourceId: assignment.id,
      afterData: assignment,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    return res.status(201).json({ data: assignment });
  } catch (err) {
    next(err);
  }
}

async function bulkAssign(req, res, next) {
  try {
    const { user_ids, question_ids, cohort_id, due_date, priority, instructions } = req.body;
    const result = assignmentService.bulkAssign({
      user_ids,
      question_ids,
      cohort_id,
      due_date,
      priority,
      instructions,
      admin_id: req.user.id
    });

    auditService.logAction({
      actorId: req.user?.id,
      actorEmail: req.user?.email,
      action: 'assignment_bulk_create',
      resourceType: 'assignment',
      metadata: { user_count: user_ids?.length, question_count: question_ids?.length, cohort_id },
      afterData: result,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    return res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

async function unassign(req, res, next) {
  try {
    const existing = assignmentService.getAssignmentById(req.params.id);
    const result = assignmentService.unassign(req.params.id);

    auditService.logAction({
      actorId: req.user?.id,
      actorEmail: req.user?.email,
      action: 'assignment_unassign',
      resourceType: 'assignment',
      resourceId: req.params.id,
      beforeData: existing,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function getAssignments(req, res, next) {
  try {
    const { user_id, status, page, limit } = req.query;
    const result = assignmentService.listAssignments({
      currentUser: req.user,
      user_id,
      status,
      page,
      limit
    });
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function getAssignmentById(req, res, next) {
  try {
    const assignment = assignmentService.getAssignmentById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Assignment not found' } });
    }
    return res.status(200).json({ data: assignment });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createAssignment,
  bulkAssign,
  unassign,
  getAssignments,
  getAssignmentById
};
