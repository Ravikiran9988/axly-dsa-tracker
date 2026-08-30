const fs = require('fs');
const path = require('path');
const { pool } = require('./postgres');

async function initPostgresSchema(pgPool = pool) {
  if (!pgPool) {
    throw new Error('PostgreSQL pool is not configured');
  }

  const migrationsDir = path.join(__dirname, 'migrations');
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  const client = await pgPool.connect();
  try {
    for (const file of migrationFiles) {
      const sqlPath = path.join(migrationsDir, file);
      const ddlSql = fs.readFileSync(sqlPath, 'utf8');
      console.log(`  Applying migration: ${file}...`);
      await client.query(ddlSql);
    }
    console.log('✅ Supabase PostgreSQL schema initialized successfully.');
  } catch (err) {
    console.error('❌ Failed to initialize PostgreSQL schema:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { initPostgresSchema };
