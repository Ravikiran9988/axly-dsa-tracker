#!/usr/bin/env node
require('dotenv').config();

const emailArgIndex = process.argv.indexOf('--email');
const email = emailArgIndex >= 0 ? process.argv[emailArgIndex + 1] : process.env.ADMIN_EMAIL;

if (!email || !email.includes('@')) {
  console.error('Usage: npm run seed:admin -- --email=admin@example.com');
  console.error('Or set ADMIN_EMAIL in the backend environment.');
  process.exit(1);
}

const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  process.exit(1);
}

if (!process.env.ADMIN_BOOTSTRAP_ENABLED || process.env.ADMIN_BOOTSTRAP_ENABLED !== 'true') {
  console.error('Admin bootstrap is disabled. Set ADMIN_BOOTSTRAP_ENABLED=true for this one-time operation.');
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
  const authUser = await findUserByEmail(email);
  if (!authUser) {
    throw new Error(`No Supabase Auth user found for ${email}. Sign in with Google first, then run this script.`);
  }

  // Adapt this table/column only if the production schema uses a different profile table.
  const { data: existing, error: readError } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', authUser.id)
    .maybeSingle();
  if (readError) throw readError;
  if (!existing) {
    throw new Error(`Auth user exists but no users profile exists for ${authUser.id}. Create/sync the profile first.`);
  }

  if (existing.role === 'admin') {
    console.log(`${email} is already an admin. Nothing to do.`);
    return;
  }

  const { error: updateError } = await supabase
    .from('users')
    .update({ role: 'admin' })
    .eq('id', authUser.id);
  if (updateError) throw updateError;

  console.log(`Admin role granted to ${email} (${authUser.id}).`);
  console.log('Disable ADMIN_BOOTSTRAP_ENABLED immediately after this one-time setup.');
}

main().catch(error => {
  console.error(`Admin seed failed: ${error.message}`);
  process.exit(1);
});
