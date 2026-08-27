const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const { db } = require('../db/db');
const { AppError } = require('./errorHandler');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const isProduction = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET || (isProduction ? null : 'axly-dsa-tracker-dev-secret-key-32-chars-minimum');

if (isProduction && !JWT_SECRET) {
  throw new Error('JWT_SECRET must be configured in production.');
}

let supabaseClient = null;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && !SUPABASE_URL.includes('mock')) {
  try {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  } catch (e) {
    console.warn('Supabase client init skipped:', e.message);
  }
}

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('Authentication required. Missing Bearer token.', 401, 'UNAUTHORIZED'));
    }

    const token = authHeader.split(' ')[1];
    let userId = null;
    let userEmail = null;
    let userName = null;

    // 1. Try local/JWT secret decoding (for tests, dev mode, or custom tokens)
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      userId = decoded.sub || decoded.id;
      userEmail = decoded.email;
      userName = decoded.name;
    } catch (jwtErr) {
      // 2. If Supabase client configured, verify via Supabase Auth
      if (supabaseClient) {
        const { data: { user: sbUser }, error } = await supabaseClient.auth.getUser(token);
        if (error || !sbUser) {
          return next(new AppError('Invalid or expired session token', 401, 'UNAUTHORIZED'));
        }
        userId = sbUser.id;
        userEmail = sbUser.email;
        userName = sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || userEmail.split('@')[0];
      } else {
        return next(new AppError('Invalid or expired session token', 401, 'UNAUTHORIZED'));
      }
    }

    if (!userId) {
      return next(new AppError('User identity could not be verified', 401, 'UNAUTHORIZED'));
    }

    // 3. Resolve user record from database (server-side single source of truth for role)
    const userStmt = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?');
    let user = userStmt.get(userId);

    // If user does not exist in local users table yet, auto-provision with default role 'user'
    if (!user) {
      const email = userEmail || `${userId}@example.com`;
      const name = userName || email.split('@')[0];
      const insertStmt = db.prepare(`
        INSERT INTO users (id, name, email, role)
        VALUES (?, ?, ?, 'user')
        ON CONFLICT(id) DO UPDATE SET email=excluded.email
      `);
      insertStmt.run(userId, name, email);
      user = userStmt.get(userId);
    }

    req.user = user;
    next();
  } catch (err) {
    next(new AppError('Authentication failed: ' + err.message, 401, 'UNAUTHORIZED'));
  }
}

// Optional helper to generate auth token for development / testing
function generateTestToken(payload) {
  if (isProduction) {
    throw new Error('Test tokens are disabled in production.');
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

module.exports = {
  authenticate,
  generateTestToken
};
