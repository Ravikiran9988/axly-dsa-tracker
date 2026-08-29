const analyticsService = require('../services/analyticsService');

async function getMine(req, res, next) {
  try {
    const data = await analyticsService.getUserAnalytics(req.user.id);
    return res.json({ data });
  } catch (e) {
    next(e);
  }
}

async function getAdminStats(req, res, next) {
  try {
    const stats = await analyticsService.getAdminStats();
    return res.status(200).json({ data: stats });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  getMine,
  getAdminStats
};
