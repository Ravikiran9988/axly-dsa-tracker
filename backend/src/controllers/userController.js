const { db } = require('../db/db');
const { AppError } = require('../middleware/errorHandler');

// GET /api/v1/users (Admin only)
function listUsers(req, res, next) {
  try {
    const { role, search, page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    let whereClauses = [];
    const params = [];

    if (role) {
      whereClauses.push('role = ?');
      params.push(role);
    }

    if (search) {
      whereClauses.push('(LOWER(name) LIKE ? OR LOWER(email) LIKE ?)');
      params.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const total = db.prepare(`SELECT COUNT(*) as total FROM users ${whereSql}`).get(...params).total;

    const users = db.prepare(`
      SELECT id, name, email, role, created_at
      FROM users
      ${whereSql}
      ORDER BY name ASC
      LIMIT ? OFFSET ?
    `).all(...params, Number(limit), offset);

    return res.status(200).json({
      data: users,
      page: Number(page),
      limit: Number(limit),
      total
    });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/v1/users/:id/role (Admin only)
function updateUserRole(req, res, next) {
  try {
    const { role } = req.body;
    if (!['admin', 'user'].includes(role)) {
      throw new AppError('role must be one of admin|user', 400, 'VALIDATION_ERROR', 'role');
    }

    const targetUser = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
    if (!targetUser) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);

    const updated = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?').get(req.params.id);
    return res.status(200).json({ data: updated });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listUsers,
  updateUserRole
};
