const db = require('better-sqlite3')('data/axly_dsa_migration_copy.db');
const tables = ['questions', 'daily_challenge_metadata', 'daily_challenge_problems', 'daily_challenge_test_cases', 'daily_questions', 'test_cases', 'submissions', 'practice_progress'];
tables.forEach(t => console.log(`${t}:`, db.prepare(`SELECT COUNT(*) as c FROM ${t}`).get().c));
