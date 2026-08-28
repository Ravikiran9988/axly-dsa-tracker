const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const { db } = require('../db/db');
const { AppError } = require('./errorHandler');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const isProduction = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET || (isProduction ? null : 'axly-dsa-tracker-dev-secret-key-32-chars-minimum');

if (isProduction && !JWT_SECRET) {
  throw new Error('JWT_SECRET must be configured in production.');
}

let supabaseClient = null;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && !SUPABASE_URL.includes('mock')) {
  try {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
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
    if (!token || !token.trim()) {
      return next(new AppError('Authentication required. Bearer token is empty.', 401, 'UNAUTHORIZED'));
    }

    let userId = null;
    let userEmail = null;
    let userName = null;
    let userAvatar = null;

    // 1. Try local/JWT secret decoding (for tests, dev mode, or custom tokens)
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      userId = decoded.sub || decoded.id;
      userEmail = decoded.email;
      userName = decoded.name;
      userAvatar = decoded.avatar_url;
    } catch (jwtErr) {
      // 2. If token is not signed with local JWT_SECRET, verify via Supabase Auth
      if (supabaseClient) {
        const { data: { user: sbUser }, error } = await supabaseClient.auth.getUser(token);
        if (error || !sbUser) {
          return next(new AppError('Invalid or expired session token', 401, 'UNAUTHORIZED'));
        }
        userId = sbUser.id;
        userEmail = sbUser.email;
        userName = sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || (userEmail ? userEmail.split('@')[0] : 'Developer');
        userAvatar = sbUser.user_metadata?.avatar_url || sbUser.user_metadata?.picture || null;
      } else {
        return next(new AppError('Invalid or expired session token', 401, 'UNAUTHORIZED'));
      }
    }

    if (!userId && !userEmail) {
      return next(new AppError('User identity could not be verified', 401, 'UNAUTHORIZED'));
    }

    // 3. Resolve user record from database
    const normalizedEmail = (userEmail || '').trim().toLowerCase();
    const isAdminEmail = Boolean(
      process.env.ADMIN_EMAIL &&
      normalizedEmail &&
      process.env.ADMIN_EMAIL.trim().toLowerCase() === normalizedEmail
    );

    let user = userId ? db.prepare('SELECT * FROM users WHERE id = ?').get(userId) : null;

    if (!user && normalizedEmail) {
      user = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(normalizedEmail);
      if (user && userId && user.id !== userId) {
        // If seeded user exists under different ID, update the primary key if feasible, or use existing
        userId = user.id;
      }
    }

    // If user does not exist in local users table yet, provision with appropriate role
    if (!user) {
      const effectiveId = userId || `usr-${Date.now()}`;
      const effectiveRole = isAdminEmail ? 'admin' : 'user';
      const effectiveName = userName || (normalizedEmail ? normalizedEmail.split('@')[0] : 'Learner');
      const effectiveEmail = normalizedEmail || `${effectiveId}@axly.local`;

      db.prepare(`
        INSERT INTO users (id, name, email, role, avatar_url, points, streak, longest_streak, created_at)
        VALUES (?, ?, ?, ?, ?, 100, 1, 1, datetime('now'))
      `).run(effectiveId, effectiveName, effectiveEmail, effectiveRole, userAvatar || null);

      user = db.prepare('SELECT * FROM users WHERE id = ?').get(effectiveId);
    } else if (isAdminEmail && user.role !== 'admin') {
      // Upgrade existing record to admin if email matches ADMIN_EMAIL
      db.prepare('UPDATE users SET role = ? WHERE id = ?').run('admin', user.id);
      user.role = 'admin';
    }

    if (!user) {
      return next(new AppError('User profile provisioning failed', 401, 'UNAUTHORIZED'));
    }

    req.user = user;
    next();
  } catch (err) {
    next(new AppError('Authentication failed: ' + err.message, 401, 'UNAUTHORIZED'));
  }
}

// Helper to generate auth token for development / testing
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
