const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('../src/db/postgres');

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
      'test_cases',
      'daily_challenge_problems',
      'daily_challenge_test_cases',
      'daily_questions',
      'submissions',
      'practice_progress',
      'code_submissions_log',
      'points_ledger',
      'notifications',
      'badges',
      'user_badges',
      'admin_audit_logs',
      'dsa_ai_logs',
      'daily_challenge_automation_settings',
      'daily_challenge_automation_logs',
      'assignments',
      'cohorts',
      'cohort_members',
      'live_sessions',
      'submission_score_audit'
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
    console.log("All tables exist!");
  } finally {
    client.release();
    pool.end();
  }
}
verifyTables(pool).catch(console.error);
