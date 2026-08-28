#!/usr/bin/env node
require('dotenv').config();

const emailArg = process.argv.find(arg => arg.startsWith('--email='));
const email = emailArg ? emailArg.split('=')[1] : (process.argv.includes('--email') ? process.argv[process.argv.indexOf('--email') + 1] : process.env.ADMIN_EMAIL);

if (!email || !email.includes('@')) {
  console.error('Usage: npm run seed:admin -- --email=admin@example.com');
  console.error('Or set ADMIN_EMAIL in the backend environment.');
  process.exit(1);
}

const { createClient } = require('@supabase/supabase-js');
const { db, initSchema } = require('../src/db/db');
const auditService = require('../src/services/auditService');

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  process.exit(1);
}

const isBootstrapEnabled = String(process.env.ADMIN_BOOTSTRAP_ENABLED || '').toLowerCase() === 'true';

if (!isBootstrapEnabled) {
  console.error('Admin bootstrap is disabled. Set ADMIN_BOOTSTRAP_ENABLED=true in backend/.env for this one-time operation.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function findUserByEmail(targetEmail) {
  const normalized = targetEmail.trim().toLowerCase();
  let page = 1;
  const perPage = 1000;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const user = data.users.find(u => (u.email || '').toLowerCase() === normalized);
    if (user) return user;
    if (!data.nextPage || data.nextPage === page) return null;
    page = data.nextPage;
  }
}

async function main() {
  initSchema();

  console.log(`[Seed Admin] Searching for Supabase Auth user: ${email}...`);
  const authUser = await findUserByEmail(email);
  if (!authUser) {
    throw new Error(`No Supabase Auth user found for ${email}. Please sign in with Google once on the web UI first, then re-run this script.`);
  }

  const userId = authUser.id;
  const fullName = authUser.user_metadata?.full_name || authUser.user_metadata?.name || email.split('@')[0];
  const avatarUrl = authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null;

  console.log(`[Seed Admin] Found Auth User: ${fullName} (${userId})`);

  // 1. Update Supabase Auth metadata to include admin role
  const { error: authUpdateError } = await supabase.auth.admin.updateUserById(userId, {
    app_metadata: { ...(authUser.app_metadata || {}), role: 'admin' },
    user_metadata: { ...(authUser.user_metadata || {}), role: 'admin' }
  });

  if (authUpdateError) {
    console.warn(`[Seed Admin] Warning updating Supabase Auth metadata: ${authUpdateError.message}`);
  } else {
    console.log(`[Seed Admin] Supabase Auth user metadata updated to role: 'admin'`);
  }

  // 2. Update Supabase PostgreSQL table 'users' if available
  try {
    const { error: pgError } = await supabase
      .from('users')
      .upsert({
        id: userId,
        name: fullName,
        email: email.trim().toLowerCase(),
        role: 'admin'
      });

    if (!pgError) {
      console.log(`[Seed Admin] Remote Supabase PostgreSQL 'users' table updated.`);
    } else {
      console.log(`[Seed Admin] Supabase PostgREST table note: ${pgError.message}`);
    }
  } catch (err) {
    console.log(`[Seed Admin] Supabase PostgREST note: ${err.message}`);
  }

  // 3. Upsert user in the application database (db.js)
  const existingLocal = db.prepare('SELECT * FROM users WHERE id = ? OR LOWER(email) = ?').get(userId, email.trim().toLowerCase());

  if (existingLocal) {
    db.prepare(`
      UPDATE users SET
        id = ?,
        name = COALESCE(?, name),
        email = ?,
        role = 'admin',
        avatar_url = COALESCE(?, avatar_url)
      WHERE id = ? OR LOWER(email) = ?
    `).run(userId, fullName, email.trim().toLowerCase(), avatarUrl, existingLocal.id, email.trim().toLowerCase());
    console.log(`[Seed Admin] Application database user (${existingLocal.email}) upgraded to 'admin'.`);
  } else {
    db.prepare(`
      INSERT INTO users (id, name, email, role, avatar_url, points, streak, longest_streak, created_at)
      VALUES (?, ?, ?, 'admin', ?, 500, 1, 1, datetime('now'))
    `).run(userId, fullName, email.trim().toLowerCase(), avatarUrl);
    console.log(`[Seed Admin] Application database user created with role: 'admin'.`);
  }

  // 4. Record audit log entry
  auditService.logAction({
    actorId: userId,
    actorEmail: email,
    action: 'admin_bootstrap_seed',
    resourceType: 'user',
    resourceId: userId,
    metadata: { bootstrap: true, email }
  });

  console.log(`\nSUCCESS: Admin role granted to ${email} (${userId}).`);
  console.log(`IMPORTANT: Set ADMIN_BOOTSTRAP_ENABLED=false in backend/.env before deploying to production.`);
}

main().catch(error => {
  console.error(`\nAdmin seed failed: ${error.message}`);
  process.exit(1);
});
