const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

function isPostgresConfigured() {
  return Boolean(DATABASE_URL);
}

function createPostgresPool() {
  if (!DATABASE_URL) return null;
  return new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    max: Number(process.env.DB_POOL_MAX || 10),
    idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 30000),
    connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS || 5000)
  });
}

const pool = createPostgresPool();

async function checkPostgresHealth() {
  if (!pool) return { configured: false, healthy: false, reason: 'DATABASE_URL is not configured' };
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    return { configured: true, healthy: true };
  } finally {
    client.release();
  }
}

module.exports = { pool, isPostgresConfigured, checkPostgresHealth };
