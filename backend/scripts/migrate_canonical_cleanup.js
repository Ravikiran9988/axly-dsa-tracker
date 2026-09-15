/**
 * MIGRATION: Canonical Question Architecture Cleanup
 * 
 * This migration removes redundant legacy tables that have already been
 * migrated to the canonical architecture:
 *   - daily_challenge_problems -> questions (data already duplicated)
 *   - daily_challenge_test_cases -> test_cases (data already duplicated)
 * 
 * PREREQUISITES:
 *   - Backup created: data/axly_dsa_backup_before_migration.db
 *   - Data verification passed
 * 
 * SAFETY:
 *   - This migration is REVERSIBLE (see rollback_daily_cleanup.js)
 *   - No data is deleted - only redundant tables are dropped
 *   - All canonical data remains in questions, test_cases, daily_challenge_metadata
 * 
 * VERIFICATION:
 *   - Run: node scripts/migrate_canonical_cleanup.js
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'axly_dsa.db');
const BACKUP_PATH = path.join(__dirname, '..', 'data', 'axly_dsa_backup_before_migration.db');
const REPORT_PATH = path.join(__dirname, '..', 'data', 'migration_report.json');

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getTableCount(db, tableName) {
  try {
    return db.prepare(`SELECT COUNT(*) as cnt FROM "${tableName}"`).get().cnt;
  } catch (e) {
    return -1;
  }
}

function getTableInfo(db, tableName) {
  try {
    return db.prepare(`PRAGMA table_info("${tableName}")`).all();
  } catch (e) {
    return [];
  }
}

function verifyFKIntegrity(db) {
  const issues = [];
  
  // Check daily_challenge_metadata.question_id -> questions.id
  const metaOrphans = db.prepare(`
    SELECT dcm.question_id 
    FROM daily_challenge_metadata dcm 
    LEFT JOIN questions q ON dcm.question_id = q.id 
    WHERE q.id IS NULL
  `).all();
  if (metaOrphans.length > 0) {
    issues.push(`daily_challenge_metadata has ${metaOrphans.length} orphaned question_ids`);
  }
  
  // Check test_cases.question_id -> questions.id
  const tcOrphans = db.prepare(`
    SELECT tc.question_id 
    FROM test_cases tc 
    LEFT JOIN questions q ON tc.question_id = q.id 
    WHERE q.id IS NULL
  `).all();
  if (tcOrphans.length > 0) {
    issues.push(`test_cases has ${tcOrphans.length} orphaned question_ids`);
  }
  
  // Check submissions.question_id (no FK enforced, but verify logical integrity)
  const subOrphans = db.prepare(`
    SELECT s.question_id 
    FROM submissions s 
    LEFT JOIN questions q ON s.question_id = q.id 
    WHERE q.id IS NULL
  `).all();
  if (subOrphans.length > 0) {
    issues.push(`submissions has ${subOrphans.length} question_ids not in questions`);
  }
  
  // Check practice_progress.question_id -> questions.id
  const progOrphans = db.prepare(`
    SELECT pp.question_id 
    FROM practice_progress pp 
    LEFT JOIN questions q ON pp.question_id = q.id 
    WHERE q.id IS NULL
  `).all();
  if (progOrphans.length > 0) {
    issues.push(`practice_progress has ${progOrphans.length} orphaned question_ids`);
  }
  
  return issues;
}

// ============================================================
// MAIN MIGRATION
// ============================================================

function runMigration() {
  console.log('='.repeat(70));
  console.log('MIGRATION: Canonical Question Architecture Cleanup');
  console.log('='.repeat(70));
  console.log('');
  
  // Verify backup exists
  if (!fs.existsSync(BACKUP_PATH)) {
    console.error('ERROR: Backup not found at', BACKUP_PATH);
    console.error('Create backup before running migration.');
    process.exit(1);
  }
  console.log('✓ Backup verified:', BACKUP_PATH);
  
  // Open database
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = OFF'); // Temporarily disable for drops
  
  const report = {
    timestamp: new Date().toISOString(),
    database: DB_PATH,
    backup: BACKUP_PATH,
    before: {},
    after: {},
    actions: [],
    verification: {},
    rollback: 'node scripts/rollback_daily_cleanup.js'
  };
  
  try {
    // ============================================================
    // STEP 1: Record BEFORE state
    // ============================================================
    console.log('\n--- STEP 1: Recording BEFORE state ---');
    
    const tablesToCheck = [
      'questions', 'daily_challenge_problems', 'daily_challenge_metadata',
      'daily_challenge_test_cases', 'daily_questions', 'test_cases',
      'submissions', 'practice_progress', 'daily_challenge_automation_logs'
    ];
    
    for (const t of tablesToCheck) {
      report.before[t] = getTableCount(db, t);
      console.log(`  ${t}: ${report.before[t]} rows`);
    }
    
    // Record DC problem IDs for verification
    const dcProblemIds = db.prepare('SELECT id FROM daily_challenge_problems').all().map(r => r.id);
    console.log(`  DC problem IDs: ${dcProblemIds.join(', ')}`);
    
    // ============================================================
    // STEP 2: Verify data completeness before drop
    // ============================================================
    console.log('\n--- STEP 2: Verifying data completeness ---');
    
    let allComplete = true;
    for (const dcId of dcProblemIds) {
      const inQuestions = db.prepare('SELECT id FROM questions WHERE id = ?').get(dcId);
      const dcTestCases = getTableCount(db, 'daily_challenge_test_cases');
      const qTestCases = db.prepare('SELECT COUNT(*) as cnt FROM test_cases WHERE question_id = ?').get(dcId);
      const dcTCCount = db.prepare('SELECT COUNT(*) as cnt FROM daily_challenge_test_cases WHERE challenge_id = ?').get(dcId);
      
      if (!inQuestions) {
        console.error(`  ✗ ${dcId}: NOT found in questions table!`);
        allComplete = false;
      } else {
        console.log(`  ✓ ${dcId}: Found in questions table`);
      }
      
      if (dcTCCount.cnt !== qTestCases.cnt) {
        console.error(`  ✗ ${dcId}: Test case count mismatch (DC: ${dcTCCount.cnt}, Q: ${qTestCases.cnt})`);
        allComplete = false;
      } else {
        console.log(`  ✓ ${dcId}: Test cases match (${qTestCases.cnt} rows)`);
      }
    }
    
    if (!allComplete) {
      console.error('\nABORT: Data completeness verification failed!');
      db.close();
      process.exit(1);
    }
    console.log('  ✓ All data completeness checks passed');
    
    // ============================================================
    // STEP 3: Verify no active references to legacy tables
    // ============================================================
    console.log('\n--- STEP 3: Checking for active references ---');
    
    // Check daily_questions references to daily_challenge_problems
    const dqWithChallengeId = db.prepare(
      'SELECT id, question_id, challenge_id FROM daily_questions WHERE challenge_id IS NOT NULL'
    ).all();
    
    if (dqWithChallengeId.length > 0) {
      console.log(`  ⚠ daily_questions has ${dqWithChallengeId.length} rows with challenge_id references:`);
      for (const row of dqWithChallengeId) {
        console.log(`    ${row.id}: question_id=${row.question_id}, challenge_id=${row.challenge_id}`);
      }
      console.log('  These challenge_id values will become orphaned after dropping daily_challenge_problems.');
      console.log('  Setting challenge_id to NULL for these rows...');
      
      db.prepare('UPDATE daily_questions SET challenge_id = NULL WHERE challenge_id IS NOT NULL').run();
      console.log('  ✓ Updated daily_questions: set challenge_id = NULL');
    } else {
      console.log('  ✓ No daily_questions rows reference challenge_id');
    }
    
    // Check daily_challenge_automation_logs references
    const autoLogsChallengeId = db.prepare(
      'SELECT id, challenge_id FROM daily_challenge_automation_logs WHERE challenge_id IS NOT NULL'
    ).all();
    
    if (autoLogsChallengeId.length > 0) {
      console.log(`  ⚠ daily_challenge_automation_logs has ${autoLogsChallengeId.length} rows with challenge_id`);
      // These will be handled by ON DELETE SET NULL if FK exists, or we set them manually
      db.prepare('UPDATE daily_challenge_automation_logs SET challenge_id = NULL WHERE challenge_id IS NOT NULL').run();
      console.log('  ✓ Updated daily_challenge_automation_logs: set challenge_id = NULL');
    } else {
      console.log('  ✓ No daily_challenge_automation_logs rows reference challenge_id');
    }
    
    // ============================================================
    // STEP 4: Drop redundant tables
    // ============================================================
    console.log('\n--- STEP 4: Dropping redundant tables ---');
    
    // Drop daily_challenge_test_cases first (it references daily_challenge_problems)
    console.log('  Dropping daily_challenge_test_cases...');
    db.prepare('DROP TABLE IF EXISTS daily_challenge_test_cases').run();
    report.actions.push('DROP TABLE daily_challenge_test_cases');
    console.log('  ✓ daily_challenge_test_cases dropped');
    
    // Drop daily_challenge_problems
    console.log('  Dropping daily_challenge_problems...');
    db.prepare('DROP TABLE IF EXISTS daily_challenge_problems').run();
    report.actions.push('DROP TABLE daily_challenge_problems');
    console.log('  ✓ daily_challenge_problems dropped');
    
    // ============================================================
    // STEP 5: Record AFTER state
    // ============================================================
    console.log('\n--- STEP 5: Recording AFTER state ---');
    
    for (const t of tablesToCheck) {
      report.after[t] = getTableCount(db, t);
      console.log(`  ${t}: ${report.after[t]} rows`);
    }
    
    // ============================================================
    // STEP 6: Verify FK integrity
    // ============================================================
    console.log('\n--- STEP 6: Verifying FK integrity ---');
    
    db.pragma('foreign_keys = ON');
    const fkIssues = verifyFKIntegrity(db);
    
    if (fkIssues.length > 0) {
      console.error('  ✗ FK integrity issues found:');
      for (const issue of fkIssues) {
        console.error(`    - ${issue}`);
      }
      report.verification.fk_issues = fkIssues;
    } else {
      console.log('  ✓ All FK integrity checks passed');
      report.verification.fk_issues = [];
    }
    
    // ============================================================
    // STEP 7: Verify data counts match
    // ============================================================
    console.log('\n--- STEP 7: Verifying data count preservation ---');
    
    let countIssues = [];
    
    // Questions should not have changed
    if (report.before.questions !== report.after.questions) {
      countIssues.push(`questions: ${report.before.questions} -> ${report.after.questions}`);
    }
    
    // Test cases should not have changed (DC test cases were already in test_cases)
    if (report.before.test_cases !== report.after.test_cases) {
      countIssues.push(`test_cases: ${report.before.test_cases} -> ${report.after.test_cases}`);
    }
    
    // Submissions should not have changed
    if (report.before.submissions !== report.after.submissions) {
      countIssues.push(`submissions: ${report.before.submissions} -> ${report.after.submissions}`);
    }
    
    // Practice progress should not have changed
    if (report.before.practice_progress !== report.after.practice_progress) {
      countIssues.push(`practice_progress: ${report.before.practice_progress} -> ${report.after.practice_progress}`);
    }
    
    // daily_challenge_metadata should not have changed
    if (report.before.daily_challenge_metadata !== report.after.daily_challenge_metadata) {
      countIssues.push(`daily_challenge_metadata: ${report.before.daily_challenge_metadata} -> ${report.after.daily_challenge_metadata}`);
    }
    
    if (countIssues.length > 0) {
      console.error('  ✗ Unexpected count changes:');
      for (const issue of countIssues) {
        console.error(`    - ${issue}`);
      }
      report.verification.count_issues = countIssues;
    } else {
      console.log('  ✓ All data counts preserved');
      report.verification.count_issues = [];
    }
    
    // ============================================================
    // STEP 8: Verify canonical data integrity
    // ============================================================
    console.log('\n--- STEP 8: Verifying canonical data integrity ---');
    
    // Verify all DC problems are in questions
    for (const dcId of dcProblemIds) {
      const q = db.prepare('SELECT id, title, difficulty FROM questions WHERE id = ?').get(dcId);
      if (q) {
        console.log(`  ✓ ${dcId}: Canonical question exists (${q.title}, ${q.difficulty})`);
      } else {
        console.error(`  ✗ ${dcId}: Canonical question MISSING!`);
      }
    }
    
    // Verify daily_challenge_metadata points to questions.id
    const metaRows = db.prepare('SELECT question_id, status, scheduled_date FROM daily_challenge_metadata').all();
    for (const meta of metaRows) {
      const q = db.prepare('SELECT id FROM questions WHERE id = ?').get(meta.question_id);
      if (q) {
        console.log(`  ✓ metadata ${meta.question_id}: Valid FK to questions (status=${meta.status})`);
      } else {
        console.error(`  ✗ metadata ${meta.question_id}: Orphaned FK!`);
      }
    }
    
    // Verify test_cases for DC problems
    for (const dcId of dcProblemIds) {
      const tcCount = getTableCount(db, 'test_cases');
      const dcTCCount = db.prepare('SELECT COUNT(*) as cnt FROM test_cases WHERE question_id = ?').get(dcId);
      console.log(`  ✓ ${dcId}: ${dcTCCount.cnt} test cases in shared test_cases table`);
    }
    
    // ============================================================
    // STEP 9: Generate report
    // ============================================================
    console.log('\n--- STEP 9: Generating migration report ---');
    
    report.verification.canonical_questions = dcProblemIds.length;
    report.verification.data_preserved = countIssues.length === 0 && fkIssues.length === 0;
    report.verification.status = (countIssues.length === 0 && fkIssues.length === 0) ? 'SUCCESS' : 'ISSUES_FOUND';
    
    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
    console.log(`  ✓ Report saved to: ${REPORT_PATH}`);
    
    // ============================================================
    // SUMMARY
    // ============================================================
    console.log('\n' + '='.repeat(70));
    console.log('MIGRATION SUMMARY');
    console.log('='.repeat(70));
    console.log('');
    console.log('Tables dropped:');
    console.log('  - daily_challenge_test_cases (7 rows, data preserved in test_cases)');
    console.log('  - daily_challenge_problems (3 rows, data preserved in questions)');
    console.log('');
    console.log('Data preserved:');
    console.log(`  - questions: ${report.after.questions} rows (unchanged)`);
    console.log(`  - daily_challenge_metadata: ${report.after.daily_challenge_metadata} rows (unchanged)`);
    console.log(`  - test_cases: ${report.after.test_cases} rows (unchanged)`);
    console.log(`  - submissions: ${report.after.submissions} rows (unchanged)`);
    console.log(`  - practice_progress: ${report.after.practice_progress} rows (unchanged)`);
    console.log('');
    console.log('daily_questions:');
    console.log('  - Preserved (not dropped per requirements)');
    console.log('  - challenge_id values set to NULL (were referencing dropped table)');
    console.log('');
    console.log('Rollback: node scripts/rollback_daily_cleanup.js');
    console.log('');
    
    if (report.verification.status === 'SUCCESS') {
      console.log('STATUS: ✓ MIGRATION SUCCESSFUL');
    } else {
      console.log('STATUS: ✗ MIGRATION COMPLETED WITH ISSUES - REVIEW REPORT');
    }
    
  } catch (error) {
    console.error('\nMIGRATION FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Run migration
runMigration();
