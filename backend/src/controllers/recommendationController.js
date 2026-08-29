const service = require('../services/recommendationService');

async function recommendations(req, res, next) {
  try {
    const data = await service.getRecommendations(req.user.id, req.query.limit);
    return res.json({ data });
  } catch (e) {
    next(e);
  }
}

async function achievements(req, res, next) {
  try {
    const data = await service.getAchievements(req.user.id);
    return res.json({ data });
  } catch (e) {
    next(e);
  }
}

module.exports = { recommendations, achievements };
