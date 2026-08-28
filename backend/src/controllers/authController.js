const { generateTestToken } = require('../middleware/auth');
const { db } = require('../db/db');

// GET or POST /api/v1/auth/verify
async function verifySession(req, res, next) {
  try {
    // req.user is populated by authenticate middleware
    return res.status(200).json({
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        avatar_url: req.user.avatar_url,
        institution: req.user.institution,
        points: req.user.points || 0,
        streak: req.user.streak || 1,
        longest_streak: req.user.longest_streak || 1,
        created_at: req.user.created_at
      }
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/auth/dev-login (Development/demo helper only)
async function devLogin(req, res, next) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Development login is disabled in production.' }
      });
    }

    const { email, role = 'user' } = req.body || {};
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const allowedRoles = new Set(['user', 'mentor', 'admin']);

    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'A valid email is required', field: 'email' }
      });
    }

    if (!allowedRoles.has(role)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid role', field: 'role' }
      });
    }

    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);
    if (!user) {
      const id = `usr-${Date.now()}`;
      const name = normalizedEmail.split('@')[0];
      db.prepare('INSERT INTO users (id, name, email, role, points, streak, longest_streak) VALUES (?, ?, ?, ?, 100, 1, 1)').run(id, name, normalizedEmail, role);
      user = { id, name, email: normalizedEmail, role, points: 100, streak: 1, longest_streak: 1 };
    }

    const token = generateTestToken({ id: user.id, email: user.email, name: user.name, role: user.role });

    return res.status(200).json({
      token,
      user
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  verifySession,
  devLogin
};
