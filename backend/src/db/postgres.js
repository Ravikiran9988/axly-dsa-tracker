const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
require('dotenv').config();

const { Pool } = require('pg');

function getDatabaseUrl() {
  return process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
}

function isPostgresConfigured() {
  return Boolean(getDatabaseUrl());
}

function getSslConfig(url) {
  if (process.env.DB_SSL === 'false') return false;
  if (process.env.DB_SSL === 'true' || process.env.NODE_ENV === 'production') {
    return { rejectUnauthorized: false };
  }
  if (url && (
    url.includes('supabase.co') ||
    url.includes('supabase.com') ||
    url.includes('pooler.supabase.com') ||
    url.includes('sslmode=require') ||
    url.includes('sslmode=no-verify') ||
    url.includes('amazonaws.com') ||
    url.includes('herokuapp.com') ||
    url.includes('neon.tech')
  )) {
    return { rejectUnauthorized: false };
  }
  return undefined;
}

function createPostgresPool() {
  const dbUrl = getDatabaseUrl();
  if (!dbUrl) return null;
  return new Pool({
    connectionString: dbUrl,
    ssl: getSslConfig(dbUrl),
    max: Number(process.env.DB_POOL_MAX || 10),
    idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 30000),
    connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS || 10000)
  });
}

const pool = createPostgresPool();

async function checkPostgresHealth() {
  const activePool = pool || createPostgresPool();
  if (!activePool) return { configured: false, healthy: false, reason: 'DATABASE_URL is not configured' };
  try {
    const client = await activePool.connect();
    try {
      await client.query('SELECT 1');
      return { configured: true, healthy: true };
    } finally {
      client.release();
    }
  } catch (err) {
    return { configured: true, healthy: false, reason: err.message };
  }
}

module.exports = { pool, isPostgresConfigured, checkPostgresHealth, createPostgresPool };
