const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config();

const { pool, checkPostgresHealth, createPostgresPool } = require('../src/db/postgres');
const { initPostgresSchema } = require('../src/db/postgresSchema');
const { seedPostgresDatabase } = require('../src/db/postgresSeed');

async function verifyTables(activePool) {
  const client = await activePool.connect();
  try {
    const requiredTables = [
      'roles',
      'users',
      'user_daily_activity',
      'auth_tokens',
      'topics',
      'patterns',
      'questions',
      'question_versions',
      'question_test_cases',
      'daily_challenge_problems',
      'daily_challenge_test_cases',
      'daily_questions',
      'submissions',
      'practice_user_progress',
      'code_submissions_log',
      'points_ledger',
      'notifications',
      'badges',
      'user_badges',
      'audit_logs',
      'dsa_ai_logs',
      'daily_challenge_automation_settings',
      'daily_challenge_automation_logs'
    ];

    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

    const existingTables = new Set(result.rows.map(r => r.table_name));
    const missing = requiredTables.filter(t => !existingTables.has(t));

    if (missing.length > 0) {
      throw new Error(`Verification failed. Missing tables: ${missing.join(', ')}`);
    }

    const questionCountRes = await client.query('SELECT COUNT(*) AS count FROM questions');
    const topicCountRes = await client.query('SELECT COUNT(*) AS count FROM topics');
    const badgeCountRes = await client.query('SELECT COUNT(*) AS count FROM badges');

    console.log('3. Verifying schema and seed counts:');
    console.log(`   - Verified ${requiredTables.length} required tables exist.`);
    console.log(`   - Questions: ${questionCountRes.rows[0].count}`);
    console.log(`   - Topics: ${topicCountRes.rows[0].count}`);
    console.log(`   - Badges: ${badgeCountRes.rows[0].count}`);
  } finally {
    client.release();
  }
}

async function main() {
  console.log('--- Axly DSA Tracker: Supabase PostgreSQL Migration Runner ---');
  const activePool = pool || createPostgresPool();
  if (!activePool) {
    console.error('❌ PostgreSQL is not configured. Please ensure DATABASE_URL or SUPABASE_DB_URL is set in backend/.env.');
    process.exit(1);
  }

  const health = await checkPostgresHealth();
  if (!health.healthy) {
    console.error('❌ PostgreSQL connection failed:', health.reason || 'Unavailable');
    process.exit(1);
  }
  console.log('✅ PostgreSQL connection verified.');

  console.log('1. Initializing schema migrations...');
  await initPostgresSchema(activePool);

  console.log('2. Seeding practice problems and reference data...');
  await seedPostgresDatabase(activePool);

  await verifyTables(activePool);

  console.log('✅ PostgreSQL Migration, Seeding, and Verification Complete!');
  await activePool.end();
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error during migration:', err.message || err);
  process.exit(1);
});
