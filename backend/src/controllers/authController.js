const { generateTestToken } = require('../middleware/auth');
const authUserRepository = require('../db/authUserRepository');
const { getDatabaseDriver } = require('../db/repository');
const PostgresRepository = require('../db/postgresRepository');
const SqliteRepository = require('../db/sqliteRepository');

async function verifySession(req, res, next) {
  try {
    return res.status(200).json({
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        created_at: req.user.created_at
      }
    });
  } catch (err) {
    next(err);
  }
}

async function devLogin(req, res, next) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Development login is disabled in production.' } });
    }

    const { email, role = 'user' } = req.body || {};
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const allowedRoles = new Set(['user', 'mentor', 'admin']);

    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'A valid email is required', field: 'email' } });
    }
    if (!allowedRoles.has(role)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid role', field: 'role' } });
    }

    let user = await authUserRepository.findUserByEmail(normalizedEmail);
    if (!user) {
      const id = `usr-${Date.now()}`;
      const name = normalizedEmail.split('@')[0];
      user = await authUserRepository.provisionUser({ id, name, email: normalizedEmail });
      if (role !== 'user') {
        const repo = getDatabaseDriver() === 'postgres' ? new PostgresRepository() : new SqliteRepository();
        await repo.execute('UPDATE users SET role = ? WHERE id = ?', [role, id]);
        user = await authUserRepository.findUserById(id);
      }
    }

    const token = generateTestToken({ id: user.id, email: user.email, name: user.name, role: user.role });
    return res.status(200).json({ token, user });
  } catch (err) {
    next(err);
  }
}

module.exports = { verifySession, devLogin };
