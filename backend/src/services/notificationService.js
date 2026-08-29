const { getRepository } = require('../db/repositoryFactory');

const repo = getRepository();

async function listNotifications(userId) {
  const notifications = await repo.many(`
    SELECT * FROM notifications 
    WHERE user_id = ? 
    ORDER BY created_at DESC 
    LIMIT 50
  `, [userId]);

  const unreadCountRow = await repo.one(`
    SELECT COUNT(*) AS count FROM notifications 
    WHERE user_id = ? AND (is_read = 0 OR is_read = FALSE)
  `, [userId]);

  return {
    notifications: notifications.map(n => ({
      ...n,
      is_read: Boolean(n.is_read)
    })),
    unreadCount: Number(unreadCountRow?.count || 0)
  };
}

async function markAsRead(id, userId) {
  await repo.execute(`
    UPDATE notifications 
    SET is_read = 1 
    WHERE id = ? AND user_id = ?
  `, [id, userId]);

  return listNotifications(userId);
}

async function markAllAsRead(userId) {
  await repo.execute(`
    UPDATE notifications 
    SET is_read = 1 
    WHERE user_id = ?
  `, [userId]);

  return listNotifications(userId);
}

module.exports = {
  listNotifications,
  markAsRead,
  markAllAsRead
};
