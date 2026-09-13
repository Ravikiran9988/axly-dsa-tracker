const Database = require('better-sqlite3');
const dbs = ['data/axly_dsa.db', 'data/axly_dsa_migration_copy.db'];

for (const dbName of dbs) {
  try {
    const db = new Database(dbName, {readonly: true});
    console.log(`\n\n=== ${dbName} ===`);
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('TABLES:', tables.map(t => t.name).join(', '));
    
    const countTable = (name) => {
      try {
        return db.prepare(`SELECT COUNT(*) as c FROM ${name}`).get().c;
      } catch (e) {
        return 'MISSING';
      }
    };
    
    console.log('questions:', countTable('questions'));
    console.log('daily_challenge_problems:', countTable('daily_challenge_problems'));
    console.log('daily_challenge_metadata:', countTable('daily_challenge_metadata'));
    console.log('daily_challenge_test_cases:', countTable('daily_challenge_test_cases'));
    console.log('daily_questions:', countTable('daily_questions'));
    console.log('test_cases:', countTable('test_cases'));
    console.log('submissions:', countTable('submissions'));
    console.log('progress:', countTable('practice_progress') + ' (practice_progress)');
  } catch (e) {
    console.error(`Error reading ${dbName}: ${e.message}`);
  }
}
