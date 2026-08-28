const analyticsService = require('../services/analyticsService');

async function getMine(req, res, next) {
  try {
    return res.json({ data: analyticsService.getUserAnalytics(req.user.id) });
  } catch (e) {
    next(e);
  }
}

async function getAdminStats(req, res, next) {
  try {
    const stats = analyticsService.getAdminStats();
    return res.status(200).json({ data: stats });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  getMine,
  getAdminStats
};
