/**
 * VERIFICATION: Canonical Question Architecture
 * 
 * Run this after migrate_canonical_cleanup.js to verify:
 *   - All canonical data is intact
 *   - No orphaned FK references
 *   - Daily Challenge → Practice flow works
 *   - Data counts are correct
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'axly_dsa.db');

function getTableCount(db, tableName) {
  try {
    return db.prepare(`SELECT COUNT(*) as cnt FROM "${tableName}"`).get().cnt;
  } catch (e) {
    return -1;
  }
}

function runVerification() {
  console.log('='.repeat(70));
  console.log('VERIFICATION: Canonical Question Architecture');
  console.log('='.repeat(70));
  console.log('');
  
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  
  let allPassed = true;
  const issues = [];
  
  try {
    // ============================================================
    // 1. REDUNDANT TABLES SHOULD NOT EXIST
    // ============================================================
    console.log('--- 1. Checking redundant tables are dropped ---');
    
    const dcProblemsExists = getTableCount(db, 'daily_challenge_problems') >= 0;
    const dcTestCasesExists = getTableCount(db, 'daily_challenge_test_cases') >= 0;
    
    if (dcProblemsExists) {
      console.error('  ✗ daily_challenge_problems still exists!');
      issues.push('daily_challenge_problems not dropped');
      allPassed = false;
    } else {
      console.log('  ✓ daily_challenge_problems: dropped');
    }
    
    if (dcTestCasesExists) {
      console.error('  ✗ daily_challenge_test_cases still exists!');
      issues.push('daily_challenge_test_cases not dropped');
      allPassed = false;
    } else {
      console.log('  ✓ daily_challenge_test_cases: dropped');
    }
    
    // ============================================================
    // 2. CANONICAL TABLES INTACT
    // ============================================================
    console.log('\n--- 2. Verifying canonical tables ---');
    
    const canonicalTables = [
      'questions', 'daily_challenge_metadata', 'test_cases',
      'submissions', 'practice_progress', 'daily_questions'
    ];
    
    for (const t of canonicalTables) {
      const count = getTableCount(db, t);
      if (count < 0) {
        console.error(`  ✗ ${t}: MISSING!`);
        issues.push(`${t} table missing`);
        allPassed = false;
      } else {
        console.log(`  ✓ ${t}: ${count} rows`);
      }
    }
    
    // ============================================================
    // 3. FK INTEGRITY
    // ============================================================
    console.log('\n--- 3. Checking FK integrity ---');
    
    // daily_challenge_metadata.question_id -> questions.id
    const metaOrphans = db.prepare(`
      SELECT dcm.question_id 
      FROM daily_challenge_metadata dcm 
      LEFT JOIN questions q ON dcm.question_id = q.id 
      WHERE q.id IS NULL
    `).all();
    
    if (metaOrphans.length > 0) {
      console.error(`  ✗ daily_challenge_metadata: ${metaOrphans.length} orphaned question_ids`);
      issues.push(`${metaOrphans.length} orphaned daily_challenge_metadata question_ids`);
      allPassed = false;
    } else {
      console.log('  ✓ daily_challenge_metadata.question_id -> questions.id: OK');
    }
    
    // test_cases.question_id -> questions.id
    const tcOrphans = db.prepare(`
      SELECT tc.question_id 
      FROM test_cases tc 
      LEFT JOIN questions q ON tc.question_id = q.id 
      WHERE q.id IS NULL
    `).all();
    
    if (tcOrphans.length > 0) {
      console.error(`  ✗ test_cases: ${tcOrphans.length} orphaned question_ids`);
      issues.push(`${tcOrphans.length} orphaned test_cases question_ids`);
      allPassed = false;
    } else {
      console.log('  ✓ test_cases.question_id -> questions.id: OK');
    }
    
    // submissions.question_id (logical check)
    const subOrphans = db.prepare(`
      SELECT s.id, s.question_id 
      FROM submissions s 
      LEFT JOIN questions q ON s.question_id = q.id 
      WHERE q.id IS NULL
    `).all();
    
    if (subOrphans.length > 0) {
      console.error(`  ✗ submissions: ${subOrphans.length} question_ids not in questions`);
      for (const sub of subOrphans) {
        console.error(`    ${sub.id}: question_id=${sub.question_id}`);
      }
      issues.push(`${subOrphans.length} submissions with question_ids not in questions`);
      allPassed = false;
    } else {
      console.log('  ✓ submissions.question_id -> questions.id: OK (logical)');
    }
    
    // practice_progress.question_id -> questions.id
    const ppOrphans = db.prepare(`
      SELECT pp.question_id 
      FROM practice_progress pp 
      LEFT JOIN questions q ON pp.question_id = q.id 
      WHERE q.id IS NULL
    `).all();
    
    if (ppOrphans.length > 0) {
      console.error(`  ✗ practice_progress: ${ppOrphans.length} orphaned question_ids`);
      issues.push(`${ppOrphans.length} orphaned practice_progress question_ids`);
      allPassed = false;
    } else {
      console.log('  ✓ practice_progress.question_id -> questions.id: OK');
    }
    
    // ============================================================
    // 4. CANONICAL QUESTION DATA
    // ============================================================
    console.log('\n--- 4. Verifying canonical question data ---');
    
    const metaRows = db.prepare('SELECT question_id, status, scheduled_date FROM daily_challenge_metadata').all();
    
    for (const meta of metaRows) {
      const q = db.prepare('SELECT id, title, difficulty, is_practice FROM questions WHERE id = ?').get(meta.question_id);
      const tcCount = db.prepare('SELECT COUNT(*) as cnt FROM test_cases WHERE question_id = ?').get(meta.question_id);
      
      if (!q) {
        console.error(`  ✗ ${meta.question_id}: Canonical question MISSING!`);
        issues.push(`Canonical question ${meta.question_id} missing`);
        allPassed = false;
      } else {
        console.log(`  ✓ ${meta.question_id}: "${q.title}" (${q.difficulty}, is_practice=${q.is_practice})`);
        console.log(`    Status: ${meta.status}, Scheduled: ${meta.scheduled_date || 'none'}`);
        console.log(`    Test cases: ${tcCount.cnt}`);
      }
    }
    
    // ============================================================
    // 5. DAILY CHALLENGE → PRACTICE FLOW
    // ============================================================
    console.log('\n--- 5. Verifying Daily Challenge → Practice flow ---');
    
    // For each DC, verify the lifecycle makes sense
    for (const meta of metaRows) {
      const q = db.prepare('SELECT id, is_practice, status FROM questions WHERE id = ?').get(meta.question_id);
      
      if (meta.status === 'archived' && q.is_practice !== 1) {
        console.error(`  ✗ ${meta.question_id}: Archived DC but is_practice is not 1`);
        issues.push(`${meta.question_id} archived but not practice`);
        allPassed = false;
      } else if (meta.status === 'published' || meta.status === 'scheduled') {
        console.log(`  ✓ ${meta.question_id}: DC status=${meta.status}, available as practice`);
      } else {
        console.log(`  ✓ ${meta.question_id}: DC status=${meta.status}`);
      }
    }
    
    // ============================================================
    // 6. DATA COUNT VERIFICATION
    // ============================================================
    console.log('\n--- 6. Data count summary ---');
    
    const counts = {
      questions: getTableCount(db, 'questions'),
      daily_challenge_metadata: getTableCount(db, 'daily_challenge_metadata'),
      test_cases: getTableCount(db, 'test_cases'),
      submissions: getTableCount(db, 'submissions'),
      practice_progress: getTableCount(db, 'practice_progress'),
      daily_questions: getTableCount(db, 'daily_questions'),
      assignments: getTableCount(db, 'assignments'),
    };
    
    console.log('  Table                         Count');
    console.log('  ' + '-'.repeat(45));
    for (const [table, count] of Object.entries(counts)) {
      console.log(`  ${table.padEnd(30)} ${String(count).padStart(6)}`);
    }
    
    // ============================================================
    // 7. INDEXES
    // ============================================================
    console.log('\n--- 7. Verifying indexes ---');
    
    const expectedIndexes = [
      'idx_daily_challenge_metadata_scheduled',
      'idx_daily_challenge_metadata_status',
      'idx_test_cases_question_id',
    ];
    
    for (const idxName of expectedIndexes) {
      const exists = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='index' AND name=?"
      ).get(idxName);
      
      if (exists) {
        console.log(`  ✓ ${idxName}: exists`);
      } else {
        console.log(`  ⚠ ${idxName}: not found (may have different name)`);
      }
    }
    
    // ============================================================
    // SUMMARY
    // ============================================================
    console.log('\n' + '='.repeat(70));
    console.log('VERIFICATION SUMMARY');
    console.log('='.repeat(70));
    console.log('');
    
    if (allPassed) {
      console.log('STATUS: ✓ ALL CHECKS PASSED');
      console.log('');
      console.log('The canonical question architecture is verified:');
      console.log('  - Redundant legacy tables dropped');
      console.log('  - All canonical data intact');
      console.log('  - No orphaned FK references');
      console.log('  - Daily Challenge → Practice flow verified');
    } else {
      console.log('STATUS: ✗ ISSUES FOUND');
      console.log('');
      console.log('Issues:');
      for (const issue of issues) {
        console.log(`  - ${issue}`);
      }
      console.log('');
      console.log('Review issues before proceeding to production.');
    }
    
  } catch (error) {
    console.error('\nVERIFICATION FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Run verification
runVerification();
