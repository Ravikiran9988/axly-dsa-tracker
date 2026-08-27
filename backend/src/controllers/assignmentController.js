const assignmentService = require('../services/assignmentService');

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
    return res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

async function unassign(req, res, next) {
  try {
    const result = assignmentService.unassign(req.params.id);
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
