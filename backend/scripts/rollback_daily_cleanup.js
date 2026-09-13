/**
 * ROLLBACK: Canonical Question Architecture Cleanup
 * 
 * This script reverses the migration done by migrate_canonical_cleanup.js
 * by restoring the dropped tables from the backup database.
 * 
 * PREREQUISITES:
 *   - Backup exists: data/axly_dsa_backup_before_migration.db
 *   - Migration was run: data/axly_dsa.db
 * 
 * WARNING: This will RESTORE the legacy tables.
 * Only use if migration caused issues.
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'axly_dsa.db');
const BACKUP_PATH = path.join(__dirname, '..', 'data', 'axly_dsa_backup_before_migration.db');

function getTableCount(db, tableName) {
  try {
    return db.prepare(`SELECT COUNT(*) as cnt FROM "${tableName}"`).get().cnt;
  } catch (e) {
    return -1;
  }
}

function runRollback() {
  console.log('='.repeat(70));
  console.log('ROLLBACK: Restoring Legacy Tables');
  console.log('='.repeat(70));
  console.log('');
  
  // Verify backup exists
  if (!fs.existsSync(BACKUP_PATH)) {
    console.error('ERROR: Backup not found at', BACKUP_PATH);
    process.exit(1);
  }
  console.log('✓ Backup found:', BACKUP_PATH);
  
  // Open both databases
  const backupDb = new Database(BACKUP_PATH);
  backupDb.pragma('journal_mode = WAL');
  
  const currentDb = new Database(DB_PATH);
  currentDb.pragma('journal_mode = WAL');
  currentDb.pragma('foreign_keys = OFF');
  
  try {
    // ============================================================
    // STEP 1: Record current state
    // ============================================================
    console.log('\n--- STEP 1: Current state ---');
    const currentCounts = {
      questions: getTableCount(currentDb, 'questions'),
      daily_challenge_metadata: getTableCount(currentDb, 'daily_challenge_metadata'),
      test_cases: getTableCount(currentDb, 'test_cases'),
      submissions: getTableCount(currentDb, 'submissions'),
      daily_challenge_problems: getTableCount(currentDb, 'daily_challenge_problems'),
      daily_challenge_test_cases: getTableCount(currentDb, 'daily_challenge_test_cases'),
    };
    
    for (const [table, count] of Object.entries(currentCounts)) {
      console.log(`  ${table}: ${count} rows`);
    }
    
    // ============================================================
    // STEP 2: Record backup state
    // ============================================================
    console.log('\n--- STEP 2: Backup state ---');
    const backupCounts = {
      questions: getTableCount(backupDb, 'questions'),
      daily_challenge_metadata: getTableCount(backupDb, 'daily_challenge_metadata'),
      test_cases: getTableCount(backupDb, 'test_cases'),
      submissions: getTableCount(backupDb, 'submissions'),
      daily_challenge_problems: getTableCount(backupDb, 'daily_challenge_problems'),
      daily_challenge_test_cases: getTableCount(backupDb, 'daily_challenge_test_cases'),
    };
    
    for (const [table, count] of Object.entries(backupCounts)) {
      console.log(`  ${table}: ${count} rows`);
    }
    
    // ============================================================
    // STEP 3: Restore daily_challenge_problems from backup
    // ============================================================
    console.log('\n--- STEP 3: Restoring daily_challenge_problems ---');
    
    // Create table if not exists (using backup schema)
    const dcProblemsSchema = backupDb.prepare(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='daily_challenge_problems'"
    ).get();
    
    if (dcProblemsSchema) {
      currentDb.exec(dcProblemsSchema.sql);
      console.log('  ✓ Table structure restored');
    }
    
    // Copy data from backup
    const dcProblems = backupDb.prepare('SELECT * FROM daily_challenge_problems').all();
    if (dcProblems.length > 0) {
      // Get column names from backup
      const cols = backupDb.prepare("PRAGMA table_info('daily_challenge_problems')").all().map(c => c.name);
      const placeholders = cols.map(() => '?').join(', ');
      const insertSql = `INSERT OR REPLACE INTO daily_challenge_problems (${cols.join(', ')}) VALUES (${placeholders})`;
      
      const insert = currentDb.prepare(insertSql);
      const insertMany = currentDb.transaction((rows) => {
        for (const row of rows) {
          insert.run(...cols.map(c => row[c]));
        }
      });
      
      insertMany(dcProblems);
      console.log(`  ✓ Restored ${dcProblems.length} rows`);
    }
    
    // Restore indexes
    const dcIndexes = backupDb.prepare(
      "SELECT sql FROM sqlite_master WHERE type='index' AND tbl_name='daily_challenge_problems' AND sql IS NOT NULL"
    ).all();
    
    for (const idx of dcIndexes) {
      try {
        currentDb.exec(idx.sql);
      } catch (e) {
        // Index may already exist
      }
    }
    console.log('  ✓ Indexes restored');
    
    // ============================================================
    // STEP 4: Restore daily_challenge_test_cases from backup
    // ============================================================
    console.log('\n--- STEP 4: Restoring daily_challenge_test_cases ---');
    
    const dcTestCasesSchema = backupDb.prepare(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='daily_challenge_test_cases'"
    ).get();
    
    if (dcTestCasesSchema) {
      currentDb.exec(dcTestCasesSchema.sql);
      console.log('  ✓ Table structure restored');
    }
    
    const dcTestCases = backupDb.prepare('SELECT * FROM daily_challenge_test_cases').all();
    if (dcTestCases.length > 0) {
      const cols = backupDb.prepare("PRAGMA table_info('daily_challenge_test_cases')").all().map(c => c.name);
      const placeholders = cols.map(() => '?').join(', ');
      const insertSql = `INSERT OR REPLACE INTO daily_challenge_test_cases (${cols.join(', ')}) VALUES (${placeholders})`;
      
      const insert = currentDb.prepare(insertSql);
      const insertMany = currentDb.transaction((rows) => {
        for (const row of rows) {
          insert.run(...cols.map(c => row[c]));
        }
      });
      
      insertMany(dcTestCases);
      console.log(`  ✓ Restored ${dcTestCases.length} rows`);
    }
    
    // Restore indexes
    const dcTCIndexes = backupDb.prepare(
      "SELECT sql FROM sqlite_master WHERE type='index' AND tbl_name='daily_challenge_test_cases' AND sql IS NOT NULL"
    ).all();
    
    for (const idx of dcTCIndexes) {
      try {
        currentDb.exec(idx.sql);
      } catch (e) {
        // Index may already exist
      }
    }
    console.log('  ✓ Indexes restored');
    
    // ============================================================
    // STEP 5: Restore daily_questions challenge_id values
    // ============================================================
    console.log('\n--- STEP 5: Restoring daily_questions challenge_id ---');
    
    const backupDQ = backupDb.prepare('SELECT id, challenge_id FROM daily_questions WHERE challenge_id IS NOT NULL').all();
    for (const row of backupDQ) {
      currentDb.prepare('UPDATE daily_questions SET challenge_id = ? WHERE id = ?').run(row.challenge_id, row.id);
    }
    console.log(`  ✓ Restored ${backupDQ.length} challenge_id values`);
    
    // ============================================================
    // STEP 6: Verify rollback
    // ============================================================
    console.log('\n--- STEP 6: Verifying rollback ---');
    
    const afterCounts = {
      daily_challenge_problems: getTableCount(currentDb, 'daily_challenge_problems'),
      daily_challenge_test_cases: getTableCount(currentDb, 'daily_challenge_test_cases'),
    };
    
    let success = true;
    if (afterCounts.daily_challenge_problems !== backupCounts.daily_challenge_problems) {
      console.error(`  ✗ daily_challenge_problems: expected ${backupCounts.daily_challenge_problems}, got ${afterCounts.daily_challenge_problems}`);
      success = false;
    } else {
      console.log(`  ✓ daily_challenge_problems: ${afterCounts.daily_challenge_problems} rows (matches backup)`);
    }
    
    if (afterCounts.daily_challenge_test_cases !== backupCounts.daily_challenge_test_cases) {
      console.error(`  ✗ daily_challenge_test_cases: expected ${backupCounts.daily_challenge_test_cases}, got ${afterCounts.daily_challenge_test_cases}`);
      success = false;
    } else {
      console.log(`  ✓ daily_challenge_test_cases: ${afterCounts.daily_challenge_test_cases} rows (matches backup)`);
    }
    
    // ============================================================
    // SUMMARY
    // ============================================================
    console.log('\n' + '='.repeat(70));
    console.log('ROLLBACK SUMMARY');
    console.log('='.repeat(70));
    console.log('');
    console.log('Tables restored:');
    console.log(`  - daily_challenge_problems: ${afterCounts.daily_challenge_problems} rows`);
    console.log(`  - daily_challenge_test_cases: ${afterCounts.daily_challenge_test_cases} rows`);
    console.log('');
    console.log('daily_questions challenge_id values restored from backup.');
    console.log('');
    
    if (success) {
      console.log('STATUS: ✓ ROLLBACK SUCCESSFUL');
    } else {
      console.log('STATUS: ✗ ROLLBACK COMPLETED WITH ISSUES');
    }
    
  } catch (error) {
    console.error('\nROLLBACK FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    backupDb.close();
    currentDb.close();
  }
}

// Run rollback
runRollback();
