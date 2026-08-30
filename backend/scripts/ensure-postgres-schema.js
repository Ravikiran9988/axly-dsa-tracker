const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config();

const { pool, createPostgresPool, checkPostgresHealth } = require('../src/db/postgres');
const { initPostgresSchema } = require('../src/db/postgresSchema');

async function main() {
  const activePool = pool || createPostgresPool();
  if (!activePool) throw new Error('PostgreSQL is not configured. Set DATABASE_URL or SUPABASE_DB_URL.');

  const health = await checkPostgresHealth();
  if (!health.healthy) throw new Error(`PostgreSQL health check failed: ${health.reason || 'unavailable'}`);

  await initPostgresSchema(activePool);
  console.log('✅ PostgreSQL schema is up to date.');
  await activePool.end();
}

main().catch(error => {
  console.error('❌ Schema migration failed:', error.message || error);
  process.exit(1);
});
