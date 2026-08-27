const cohortService = require('../services/cohortService');

async function getCohorts(req, res, next) {
  try {
    const cohorts = cohortService.listCohorts();
    return res.status(200).json({ data: cohorts });
  } catch (err) {
    next(err);
  }
}

async function getCohortById(req, res, next) {
  try {
    const cohort = cohortService.getCohortById(req.params.id);
    if (!cohort) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Cohort not found' } });
    }
    return res.status(200).json({ data: cohort });
  } catch (err) {
    next(err);
  }
}

async function createCohort(req, res, next) {
  try {
    const cohort = cohortService.createCohort({
      ...req.body,
      mentor_id: req.body.mentor_id || req.user.id
    });
    return res.status(201).json({ data: cohort });
  } catch (err) {
    next(err);
  }
}

async function addMember(req, res, next) {
  try {
    const cohort = cohortService.addCohortMember({
      cohort_id: req.params.id,
      user_id: req.body.user_id
    });
    return res.status(200).json({ data: cohort });
  } catch (err) {
    next(err);
  }
}

async function removeMember(req, res, next) {
  try {
    const result = cohortService.removeCohortMember({
      cohort_id: req.params.id,
      user_id: req.params.userId
    });
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function assignChallenge(req, res, next) {
  try {
    const result = cohortService.assignCohortChallenge({
      cohort_id: req.params.id,
      question_id: req.body.question_id,
      due_date: req.body.due_date,
      priority: req.body.priority,
      instructions: req.body.instructions,
      assigned_by: req.user.id
    });
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function startLiveSession(req, res, next) {
  try {
    const session = cohortService.startLiveSession({
      cohort_id: req.params.id,
      user_id: req.body.user_id,
      mentor_id: req.user.id,
      title: req.body.title,
      meet_link: req.body.meet_link
    });
    return res.status(200).json({ data: session });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCohorts,
  getCohortById,
  createCohort,
  addMember,
  removeMember,
  assignChallenge,
  startLiveSession
};
