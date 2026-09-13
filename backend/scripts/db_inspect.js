const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const prodDbPath = path.join(__dirname, '..', 'data', 'axly_dsa.db');
const e2eDbPath = path.join(__dirname, '..', 'data', 'axly_dsa_e2e.db');

function inspectDb(dbPath, label) {
  if (!fs.existsSync(dbPath)) {
    console.log(`\n${label}: NOT FOUND at ${dbPath}`);
    return;
  }
  
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${label}`);
  console.log(`${'='.repeat(60)}`);
  
  // Get all tables
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  console.log('\nTABLES:');
  tables.forEach(t => console.log(`  ${t.name}`));
  
  // Get row counts
  console.log('\nROW COUNTS:');
  for (const t of tables) {
    try {
      const count = db.prepare(`SELECT COUNT(*) as cnt FROM "${t.name}"`).get();
      console.log(`  ${t.name}: ${count.cnt}`);
    } catch(e) {
      console.log(`  ${t.name}: ERROR - ${e.message}`);
    }
  }
  
  // Get FK relationships
  console.log('\nFOREIGN KEY RELATIONSHIPS:');
  const fks = db.prepare("SELECT name, \"from\", \"table\", \"to\" FROM sqlite_master m, pragma_foreign_key_list(m.name) WHERE type='table'").all();
  if (fks.length === 0) {
    console.log('  (none found via pragma - checking table info)');
  } else {
    fks.forEach(fk => {
      console.log(`  ${fk.name}.${fk.from} -> ${fk.table}.${fk.to}`);
    });
  }
  
  // Check specific tables existence and structure
  const targetTables = [
    'questions', 'daily_challenge_problems', 'daily_challenge_metadata',
    'daily_challenge_test_cases', 'daily_questions', 'test_cases',
    'submissions', 'practice_progress', 'assignments',
    'daily_challenge_automation_settings', 'daily_challenge_automation_logs'
  ];
  
  console.log('\nTARGET TABLE STATUS:');
  for (const tableName of targetTables) {
    const tableExists = tables.some(t => t.name === tableName);
    if (tableExists) {
      const count = db.prepare(`SELECT COUNT(*) as cnt FROM "${tableName}"`).get();
      const cols = db.prepare(`PRAGMA table_info("${tableName}")`).all();
      console.log(`  ${tableName}: EXISTS (${count.cnt} rows, ${cols.length} columns)`);
      console.log(`    Columns: ${cols.map(c => c.name).join(', ')}`);
    } else {
      console.log(`  ${tableName}: DOES NOT EXIST`);
    }
  }
  
  db.close();
}

inspectDb(prodDbPath, 'PRODUCTION DATABASE (axly_dsa.db)');
inspectDb(e2eDbPath, 'E2E TEST DATABASE (axly_dsa_e2e.db)');
