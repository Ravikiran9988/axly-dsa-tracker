const assignmentService = require('../services/assignmentService');

async function createAssignment(req, res, next) {
  try {
    const { user_id, question_id } = req.body;
    const assignment = assignmentService.createAssignment({
      user_id,
      question_id,
      admin_id: req.user.id
    });
    return res.status(201).json({ data: assignment });
  } catch (err) {
    next(err);
  }
}

async function bulkAssign(req, res, next) {
  try {
    const { user_ids, question_ids } = req.body;
    const result = assignmentService.bulkAssign({
      user_ids,
      question_ids,
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

module.exports = {
  createAssignment,
  bulkAssign,
  unassign,
  getAssignments
};
