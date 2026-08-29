const fs = require('fs');
const path = require('path');
const { pool } = require('./postgres');

async function initPostgresSchema(pgPool = pool) {
  if (!pgPool) {
    throw new Error('PostgreSQL pool is not configured');
  }

  const sqlPath = path.join(__dirname, 'migrations/001_supabase_postgres_init.sql');
  const ddlSql = fs.readFileSync(sqlPath, 'utf8');

  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');
    await client.query(ddlSql);
    await client.query('COMMIT');
    console.log('✅ Supabase PostgreSQL schema initialized successfully.');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('❌ Failed to initialize PostgreSQL schema:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { initPostgresSchema };
