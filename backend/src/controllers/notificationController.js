const notificationService = require('../services/notificationService');

async function getNotifications(req, res, next) {
  try {
    const result = await notificationService.listNotifications(req.user.id);
    return res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

async function markAsRead(req, res, next) {
  try {
    const result = await notificationService.markAsRead(req.params.id, req.user.id);
    return res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

async function markAllAsRead(req, res, next) {
  try {
    const result = await notificationService.markAllAsRead(req.user.id);
    return res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead
};
