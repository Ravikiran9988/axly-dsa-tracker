const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const authUserRepository = require('../db/authUserRepository');
const { getDatabaseDriver } = require('../db/repository');
const PostgresRepository = require('../db/postgresRepository');
const SqliteRepository = require('../db/sqliteRepository');
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

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      userId = decoded.sub || decoded.id;
      userEmail = decoded.email;
      userName = decoded.name;
      userAvatar = decoded.avatar_url;
    } catch (jwtErr) {
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

    const normalizedEmail = (userEmail || '').trim().toLowerCase();
    const isAdminEmail = Boolean(
      process.env.ADMIN_EMAIL &&
      normalizedEmail &&
      process.env.ADMIN_EMAIL.trim().toLowerCase() === normalizedEmail
    );

    let user = userId ? await authUserRepository.findUserById(userId) : null;

    if (!user && normalizedEmail) {
      user = await authUserRepository.findUserByEmail(normalizedEmail);
      if (user && userId && user.id !== userId) {
        userId = user.id;
      }
    }

    if (!user) {
      const effectiveId = userId || `usr-${Date.now()}`;
      const effectiveRole = isAdminEmail ? 'admin' : 'user';
      const effectiveName = userName || (normalizedEmail ? normalizedEmail.split('@')[0] : 'Learner');
      const effectiveEmail = normalizedEmail || `${effectiveId}@axly.local`;

      user = await authUserRepository.provisionUser({
        id: effectiveId,
        name: effectiveName,
        email: effectiveEmail
      });

      if (user.role !== effectiveRole) {
        const repo = getDatabaseDriver() === 'postgres' ? new PostgresRepository() : new SqliteRepository();
        await repo.execute('UPDATE users SET role = ? WHERE id = ?', [effectiveRole, effectiveId]);
        user = await authUserRepository.findUserById(effectiveId);
      }
    } else if (isAdminEmail && user.role !== 'admin') {
      const repo = getDatabaseDriver() === 'postgres' ? new PostgresRepository() : new SqliteRepository();
      await repo.execute('UPDATE users SET role = ? WHERE id = ?', ['admin', user.id]);
      user = { ...user, role: 'admin' };
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

module.exports = { authenticate, generateTestToken };
