const { generateTestToken } = require('../middleware/auth');
const { db } = require('../db/db');

// POST /api/v1/auth/verify
async function verifySession(req, res, next) {
  try {
    // req.user is populated by authenticate middleware
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

// POST /api/v1/auth/dev-login (Helper for testing and demo login)
async function devLogin(req, res, next) {
  try {
    const { email, role = 'user' } = req.body;
    if (!email) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'email is required', field: 'email' }
      });
    }

    let user = db.prepare('SELECT id, name, email, role FROM users WHERE email = ?').get(email);
    if (!user) {
      const id = `usr-${Date.now()}`;
      const name = email.split('@')[0];
      db.prepare('INSERT INTO users (id, name, email, role) VALUES (?, ?, ?, ?)').run(id, name, email, role);
      user = { id, name, email, role };
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
