#!/usr/bin/env node
// =============================================================================
// Axly DSA Tracker — Admin Seed Script
// Seeds or promotes an admin user in both SQLite (dev) and PostgreSQL (prod).
// Usage:
//   npm run seed:admin -- --email=admin@example.com [--password=Secret123] [--name="Your Name"]
//   Or set ADMIN_EMAIL (and optionally ADMIN_PASSWORD, ADMIN_NAME) in backend/.env
// =============================================================================
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config();

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// -- CLI / env args
const emailArg = process.argv.find(a => a.startsWith('--email='));
const passArg  = process.argv.find(a => a.startsWith('--password='));
const nameArg  = process.argv.find(a => a.startsWith('--name='));

const email    = (emailArg ? emailArg.split('=').slice(1).join('=') : process.env.ADMIN_EMAIL    || '').trim().toLowerCase();
const password = (passArg  ? passArg.split('=').slice(1).join('=')  : process.env.ADMIN_PASSWORD || '').trim();
const name     = (nameArg  ? nameArg.split('=').slice(1).join('=')  : process.env.ADMIN_NAME     || 'Admin').trim();

if (!email || !email.includes('@')) {
  console.error('Usage: npm run seed:admin -- --email=admin@example.com [--password=Secret123] [--name="Your Name"]');
  console.error('Or set ADMIN_EMAIL (and optionally ADMIN_PASSWORD, ADMIN_NAME) in backend/.env');
  process.exit(1);
}

if (password && password.length < 8) {
  console.error('Error: Password must be at least 8 characters.');
  process.exit(1);
}

const isBootstrapEnabled = String(process.env.ADMIN_BOOTSTRAP_ENABLED || '').toLowerCase() === 'true';
if (!isBootstrapEnabled) {
  console.error('Admin bootstrap is disabled.');
  console.error('Set ADMIN_BOOTSTRAP_ENABLED=true in backend/.env for this one-time operation, then set it back to false.');
  process.exit(1);
}

// -- Determine database driver (DATABASE_URL = postgres, otherwise sqlite)
const dbUrl  = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
const driver = dbUrl ? 'postgres' : 'sqlite';

function buildPasswordHash(raw) {
  if (!raw) return null;
  return bcrypt.hashSync(raw, 10);
}

// =============================================================================
// PostgreSQL path — used in production (Heroku + Supabase)
// =============================================================================
async function seedPostgres() {
  const { pool, createPostgresPool, checkPostgresHealth } = require('../src/db/postgres');
  const activePool = pool || createPostgresPool();
  if (!activePool) {
    console.error('No DATABASE_URL configured for PostgreSQL.');
    process.exit(1);
  }

  const health = await checkPostgresHealth();
  if (!health.healthy) {
    console.error('PostgreSQL connection failed:', health.reason);
    process.exit(1);
  }
  console.log('[seed:admin] PostgreSQL connection verified.');

  const client = await activePool.connect();
  try {
    const existing = await client.query(
      'SELECT id, email, role FROM users WHERE LOWER(email) = $1',
      [email]
    );

    const passwordHash = buildPasswordHash(password);

    if (existing.rows.length > 0) {
      const userId = existing.rows[0].id;
      await client.query(
        `UPDATE users SET
           name           = COALESCE($2, name),
           role           = 'admin',
           email_verified = TRUE,
           is_active      = TRUE,
           password_hash  = COALESCE($3, password_hash),
           last_active_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [userId, name || null, passwordHash]
      );
      console.log('[seed:admin] Existing user', email, '(' + userId + ') promoted to admin.');
    } else {
      const userId = 'usr-' + uuidv4();
      await client.query(
        `INSERT INTO users (
           id, name, email, role, email_verified, is_active, password_hash,
           points, practice_points, daily_challenge_points, streak_bonus,
           leaderboard_score, streak, longest_streak,
           individual_streak, individual_best_streak,
           daily_challenge_streak, daily_challenge_best_streak,
           created_at, last_active_at
         ) VALUES (
           $1, $2, $3, 'admin', TRUE, TRUE, $4,
           0, 0, 0, 0,
           0, 0, 0,
           0, 0,
           0, 0,
           CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
         )
         ON CONFLICT (email) DO UPDATE SET
           name           = EXCLUDED.name,
           role           = 'admin',
           email_verified = TRUE,
           is_active      = TRUE,
           password_hash  = COALESCE(EXCLUDED.password_hash, users.password_hash),
           last_active_at = CURRENT_TIMESTAMP`,
        [userId, name, email, passwordHash]
      );
      console.log('[seed:admin] New admin user', email, 'created (' + userId + ').');
    }

    // Optionally update Supabase Auth app_metadata
    const supabaseUrl    = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && serviceRoleKey) {
      try {
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        });
        let page = 1;
        let sbUser = null;
        while (!sbUser) {
          const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
          if (error) break;
          sbUser = data.users.find(u => (u.email || '').toLowerCase() === email) || null;
          if (!data.nextPage || data.nextPage === page) break;
          page = data.nextPage;
        }
        if (sbUser) {
          await supabase.auth.admin.updateUserById(sbUser.id, {
            app_metadata:  Object.assign({}, sbUser.app_metadata  || {}, { role: 'admin' }),
            user_metadata: Object.assign({}, sbUser.user_metadata || {}, { role: 'admin' })
          });
          console.log('[seed:admin] Supabase Auth app_metadata updated to role: admin.');
        } else {
          console.log('[seed:admin] No Supabase Auth account found for this email — skipping auth metadata update.');
        }
      } catch (e) {
        console.warn('[seed:admin] Supabase Auth metadata update skipped:', e.message);
      }
    }

    await activePool.end();
    console.log('\nSUCCESS: Admin profile seeded for', email);
    if (!password) {
      console.log('NOTE: No password set — admin must use Google OAuth, or re-run with --password=<pass> to enable email login.');
    }
    console.log('IMPORTANT: Set ADMIN_BOOTSTRAP_ENABLED=false in backend/.env before your next production deploy.');
  } finally {
    client.release();
  }
}

// =============================================================================
// SQLite path — local development only
// =============================================================================
function seedSqlite() {
  const { db, initSchema } = require('../src/db/db');
  initSchema();

  const passwordHash = buildPasswordHash(password);
  const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(email);

  if (existing) {
    db.prepare(
      `UPDATE users SET
         name           = COALESCE(?, name),
         role           = 'admin',
         email_verified = 1,
         password_hash  = COALESCE(?, password_hash)
       WHERE LOWER(email) = ?`
    ).run(name || null, passwordHash, email);
    console.log('[seed:admin] (SQLite) Existing user', email, 'promoted to admin.');
  } else {
    const userId = 'usr-' + uuidv4();
    db.prepare(
      `INSERT INTO users (id, name, email, role, email_verified, password_hash, points, streak, longest_streak, created_at)
       VALUES (?, ?, ?, 'admin', 1, ?, 0, 0, 0, datetime('now'))`
    ).run(userId, name, email, passwordHash);
    console.log('[seed:admin] (SQLite) New admin user', email, 'created.');
  }

  console.log('\nSUCCESS: Admin profile seeded for', email, '(SQLite / local dev).');
  if (!password) {
    console.log('NOTE: No password set — admin must use Google OAuth or provide --password=<pass>.');
  }
}

// =============================================================================
// Main
// =============================================================================
console.log('--- Axly DSA Tracker: Admin Seed (' + driver.toUpperCase() + ') ---');
console.log('Target email:', email);

if (driver === 'postgres') {
  seedPostgres().catch(err => {
    console.error('Admin seed failed:', err.message);
    process.exit(1);
  });
} else {
  try {
    seedSqlite();
  } catch (err) {
    console.error('Admin seed failed:', err.message);
    process.exit(1);
  }
}
