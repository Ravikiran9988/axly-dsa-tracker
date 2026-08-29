const { getRepository } = require('../db/repositoryFactory');
const { v4: uuidv4 } = require('uuid');

const repo = getRepository();

const VALID_CATEGORIES = ['daily_challenge', 'practice', 'submission', 'achievement', 'system'];

function normalizeCategory(cat) {
  if (!cat) return 'system';
  const c = String(cat).toLowerCase().trim();
  if (VALID_CATEGORIES.includes(c)) return c;
  if (c === 'challenges' || c === 'daily' || c === 'daily-challenge') return 'daily_challenge';
  if (c === 'submissions' || c === 'sub') return 'submission';
  if (c === 'achievements' || c === 'badges' || c === 'streak') return 'achievement';
  return 'system';
}

async function listNotifications(userId, query = {}) {
  const { category = 'all', unreadOnly = false, page = 1, limit = 50 } = query;
  const p = Math.max(1, Number(page) || 1);
  const l = Math.max(1, Number(limit) || 50);
  const offset = (p - 1) * l;

  const whereClauses = ['user_id = ?'];
  const params = [userId];

  if (category === 'unread' || String(unreadOnly) === 'true') {
    whereClauses.push('(is_read = 0 OR is_read = FALSE)');
  } else if (category && category !== 'all') {
    whereClauses.push('category = ?');
    params.push(normalizeCategory(category));
  }

  const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

  const notifications = await repo.many(`
    SELECT id, user_id, title, message, category, type, link, is_read, created_at
    FROM notifications 
    ${whereSql}
    ORDER BY created_at DESC 
    LIMIT ? OFFSET ?
  `, [...params, l, offset]);

  // Overall unread count for user
  const unreadCountRow = await repo.one(`
    SELECT COUNT(*) AS count FROM notifications 
    WHERE user_id = ? AND (is_read = 0 OR is_read = FALSE)
  `, [userId]);

  // Total count for current filter
  const totalRow = await repo.one(`
    SELECT COUNT(*) AS count FROM notifications 
    ${whereSql}
  `, params);

  // Category counts breakdown
  const catRows = await repo.many(`
    SELECT category, COUNT(*) AS count,
           SUM(CASE WHEN (is_read = 0 OR is_read = FALSE) THEN 1 ELSE 0 END) AS unread
    FROM notifications
    WHERE user_id = ?
    GROUP BY category
  `, [userId]);

  const categoryCounts = {
    all: 0,
    unread: Number(unreadCountRow?.count || 0),
    daily_challenge: 0,
    practice: 0,
    submission: 0,
    achievement: 0,
    system: 0
  };

  for (const r of catRows) {
    const cat = r.category;
    const cnt = Number(r.count || 0);
    categoryCounts.all += cnt;
    if (categoryCounts[cat] !== undefined) {
      categoryCounts[cat] = cnt;
    }
  }

  return {
    notifications: notifications.map(n => ({
      ...n,
      is_read: Boolean(n.is_read)
    })),
    unreadCount: Number(unreadCountRow?.count || 0),
    categoryCounts,
    total: Number(totalRow?.count || 0),
    page: p,
    limit: l
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

async function markAllAsRead(userId, category = null) {
  if (category && category !== 'all' && category !== 'unread') {
    await repo.execute(`
      UPDATE notifications 
      SET is_read = 1 
      WHERE user_id = ? AND category = ?
    `, [userId, normalizeCategory(category)]);
  } else {
    await repo.execute(`
      UPDATE notifications 
      SET is_read = 1 
      WHERE user_id = ?
    `, [userId]);
  }

  return listNotifications(userId);
}

async function createNotification({ userId, title, message, category = 'system', type = 'system_alert', link = null }) {
  if (!userId || !title || !message) return null;
  const id = uuidv4();
  const cat = normalizeCategory(category);
  const nowIso = new Date().toISOString();

  await repo.execute(`
    INSERT INTO notifications (id, user_id, title, message, category, type, link, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
  `, [id, userId, title, message, cat, type, link, nowIso]);

  return {
    id,
    user_id: userId,
    title,
    message,
    category: cat,
    type,
    link,
    is_read: false,
    created_at: nowIso
  };
}

async function broadcastNotification({ title, message, category = 'system', type = 'system_alert', link = null }) {
  if (!title || !message) return [];
  const users = await repo.many("SELECT id FROM users WHERE role = 'user' AND is_active = 1");
  const cat = normalizeCategory(category);
  const nowIso = new Date().toISOString();

  const created = [];
  for (const u of users) {
    const id = uuidv4();
    await repo.execute(`
      INSERT INTO notifications (id, user_id, title, message, category, type, link, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
    `, [id, u.id, title, message, cat, type, link, nowIso]);
    created.push(id);
  }
  return created;
}

module.exports = {
  VALID_CATEGORIES,
  listNotifications,
  markAsRead,
  markAllAsRead,
  createNotification,
  broadcastNotification
};
