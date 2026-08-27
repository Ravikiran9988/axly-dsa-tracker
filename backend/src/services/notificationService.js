const { db } = require('../db/db');

function listNotifications(userId) {
  const notifications = db.prepare(`
    SELECT * FROM notifications 
    WHERE user_id = ? 
    ORDER BY created_at DESC 
    LIMIT 50
  `).all(userId);

  const unreadCount = db.prepare(`
    SELECT COUNT(*) as count FROM notifications 
    WHERE user_id = ? AND is_read = 0
  `).get(userId)?.count || 0;

  return {
    notifications: notifications.map(n => ({
      ...n,
      is_read: Boolean(n.is_read)
    })),
    unreadCount
  };
}

function markAsRead(id, userId) {
  db.prepare(`
    UPDATE notifications 
    SET is_read = 1 
    WHERE id = ? AND user_id = ?
  `).run(id, userId);

  return listNotifications(userId);
}

function markAllAsRead(userId) {
  db.prepare(`
    UPDATE notifications 
    SET is_read = 1 
    WHERE user_id = ?
  `).run(userId);

  return listNotifications(userId);
}

module.exports = {
  listNotifications,
  markAsRead,
  markAllAsRead
};
