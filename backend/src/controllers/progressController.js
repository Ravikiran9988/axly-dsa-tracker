const progressService = require('../services/progressService');

async function getMyProgress(req, res, next) {
  try {
    const progress = await progressService.getUserProgress(req.user.id);
    return res.status(200).json({ data: progress });
  } catch (err) {
    next(err);
  }
}

async function getAdminProgress(req, res, next) {
  try {
    const { page, limit, search } = req.query;
    const result = await progressService.getAdminAggregateProgress({ page, limit, search });
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function getAdminStats(req, res, next) {
  try {
    const stats = await progressService.getAdminSystemStats();
    return res.status(200).json({ data: stats });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMyProgress,
  getAdminProgress,
  getAdminStats
};
