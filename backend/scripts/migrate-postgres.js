require('dotenv').config();
const { pool, checkPostgresHealth } = require('../src/db/postgres');
const { initPostgresSchema } = require('../src/db/postgresSchema');
const { seedPostgresDatabase } = require('../src/db/postgresSeed');

async function main() {
  console.log('--- Axly DSA Tracker: Supabase PostgreSQL Migration Runner ---');
  const health = await checkPostgresHealth();
  if (!health.healthy) {
    console.error('❌ PostgreSQL connection failed:', health.reason || 'Unavailable');
    process.exit(1);
  }

  console.log('1. Initializing schema...');
  await initPostgresSchema(pool);

  console.log('2. Seeding practice problems and reference data...');
  await seedPostgresDatabase(pool);

  console.log('✅ PostgreSQL Migration and Seeding Complete!');
  await pool.end();
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error during migration:', err);
  process.exit(1);
});
