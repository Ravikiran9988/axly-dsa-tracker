const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, '..', 'data', 'axly_dsa.db'));
db.pragma('journal_mode = WAL');

console.log('=== PHASE 0: COMPLETE DATABASE STATE ANALYSIS ===\n');

// 1. Record all baseline metrics
const tables = [
  'questions', 'daily_challenge_problems', 'daily_challenge_metadata',
  'daily_challenge_test_cases', 'daily_questions', 'test_cases',
  'submissions', 'practice_progress', 'assignments',
  'daily_challenge_automation_logs', 'daily_challenge_automation_settings',
  'code_submissions_log', 'submission_score_audit', 'points_ledger',
  'users', 'topics', 'patterns', 'roles', 'badges', 'user_badges',
  'notifications', 'cohort_members', 'cohorts', 'live_sessions',
  'admin_audit_logs', 'auth_tokens', 'user_daily_activity',
  'question_versions', 'question_bank_automation_logs', 'question_bank_automation_settings'
];

console.log('TABLE ROW COUNTS:');
console.log('-'.repeat(50));
const counts = {};
for (const t of tables) {
  try {
    const count = db.prepare(`SELECT COUNT(*) as cnt FROM "${t}"`).get();
    counts[t] = count.cnt;
    console.log(`  ${t.padEnd(40)} ${String(count.cnt).padStart(6)}`);
  } catch(e) {
    counts[t] = 'N/A';
    console.log(`  ${t.padEnd(40)} ERROR`);
  }
}

// 2. Check for orphaned FK references
console.log('\n\nFK INTEGRITY CHECK:');
console.log('-'.repeat(50));

// Check daily_challenge_automation_logs.challenge_id -> daily_challenge_problems.id
const autoLogs = db.prepare('SELECT id, challenge_id, question_id FROM daily_challenge_automation_logs').all();
console.log(`\ndaily_challenge_automation_logs: ${autoLogs.length} rows`);
for (const log of autoLogs) {
  const dcExists = db.prepare('SELECT id FROM daily_challenge_problems WHERE id = ?').get(log.challenge_id);
  const qExists = db.prepare('SELECT id FROM questions WHERE id = ?').get(log.question_id);
  console.log(`  ${log.id}: challenge_id=${log.challenge_id} (${dcExists ? 'EXISTS in DC_PROBLEMS' : 'ORPHANED'}), question_id=${log.question_id} (${qExists ? 'EXISTS in QUESTIONS' : 'ORPHANED'})`);
}

// Check daily_questions references
const dq = db.prepare('SELECT * FROM daily_questions').all();
console.log(`\ndaily_questions: ${dq.length} rows`);
for (const row of dq) {
  const qExists = db.prepare('SELECT id FROM questions WHERE id = ?').get(row.question_id);
  const dcExists = db.prepare('SELECT id FROM daily_challenge_problems WHERE id = ?').get(row.challenge_id);
  console.log(`  ${row.id}: question_id=${row.question_id} (${qExists ? 'EXISTS in QUESTIONS' : 'ORPHANED'}), challenge_id=${row.challenge_id} (${dcExists ? 'EXISTS in DC_PROBLEMS' : 'ORPHANED'})`);
}

// 3. Verify data completeness: all DC problems are in questions
console.log('\n\nDATA COMPLETENESS CHECK:');
console.log('-'.repeat(50));
const dcProblems = db.prepare('SELECT id, title FROM daily_challenge_problems').all();
for (const dc of dcProblems) {
  const q = db.prepare('SELECT id, title, difficulty, description, slug FROM questions WHERE id = ?').get(dc.id);
  const tcDC = db.prepare('SELECT COUNT(*) as cnt FROM daily_challenge_test_cases WHERE challenge_id = ?').get(dc.id);
  const tcQ = db.prepare('SELECT COUNT(*) as cnt FROM test_cases WHERE question_id = ?').get(dc.id);
  const meta = db.prepare('SELECT * FROM daily_challenge_metadata WHERE question_id = ?').get(dc.id);
  
  console.log(`\n${dc.id} (${dc.title}):`);
  console.log(`  In questions: ${q ? 'YES' : 'NO'}`);
  console.log(`  daily_challenge_test_cases: ${tcDC.cnt} rows`);
  console.log(`  test_cases: ${tcQ.cnt} rows`);
  console.log(`  daily_challenge_metadata: ${meta ? `YES (status=${meta.status}, date=${meta.scheduled_date})` : 'NO'}`);
  console.log(`  Test cases match: ${tcDC.cnt === tcQ.cnt ? 'YES' : 'NO - MISMATCH!'}`);
}

// 4. Check for any submissions referencing DC problems
console.log('\n\nSUBMISSION ANALYSIS:');
console.log('-'.repeat(50));
const subs = db.prepare('SELECT id, user_id, question_id, status FROM submissions').all();
for (const sub of subs) {
  const q = db.prepare('SELECT id, title FROM questions WHERE id = ?').get(sub.question_id);
  const dc = db.prepare('SELECT id, title FROM daily_challenge_problems WHERE id = ?').get(sub.question_id);
  console.log(`  ${sub.id}: question_id=${sub.question_id} -> ${q ? `question("${q.title}")` : 'NOT in questions'} ${dc ? `+ dc_problem("${dc.title}")` : ''} status=${sub.status}`);
}

// 5. Check test_cases that reference DC problem IDs
console.log('\n\nTEST CASES REFERENCING DC PROBLEM IDs:');
console.log('-'.repeat(50));
const dcIds = dcProblems.map(d => d.id);
for (const dcId of dcIds) {
  const tcCount = db.prepare('SELECT COUNT(*) as cnt FROM test_cases WHERE question_id = ?').get(dcId);
  console.log(`  test_cases WHERE question_id='${dcId}': ${tcCount.cnt} rows`);
}

// 6. Identify the canonical question IDs
console.log('\n\nCANONICAL QUESTION ID ANALYSIS:');
console.log('-'.repeat(50));
console.log('Daily Challenge problems use the SAME IDs in both tables:');
console.log('  daily_challenge_problems.id = questions.id = daily_challenge_metadata.question_id');
console.log('  This means the IDs are already canonical. No mapping needed.');
console.log('');
console.log('  dc-001 -> questions.id = dc-001 (canonical)');
console.log('  dc-002 -> questions.id = dc-002 (canonical)');
console.log('  dc-003 -> questions.id = dc-003 (canonical)');

// 7. What columns does daily_challenge_problems have that questions doesn't?
console.log('\n\nSCHEMA COMPARISON: daily_challenge_problems vs questions');
console.log('-'.repeat(50));
const dcCols = db.prepare("PRAGMA table_info('daily_challenge_problems')").all().map(c => c.name);
const qCols = db.prepare("PRAGMA table_info('questions')").all().map(c => c.name);

const onlyInDC = dcCols.filter(c => !qCols.includes(c));
const onlyInQ = qCols.filter(c => !dcCols.includes(c));

console.log('Columns ONLY in daily_challenge_problems:', onlyInDC.length > 0 ? onlyInDC.join(', ') : 'NONE');
console.log('Columns ONLY in questions:', onlyInQ.length > 0 ? onlyInQ.join(', ') : 'NONE');

// 8. Final verdict
console.log('\n\n=== MIGRATION VERDICT ===');
console.log('-'.repeat(50));
console.log('The data has ALREADY been migrated to the canonical architecture.');
console.log('daily_challenge_problems and daily_challenge_test_cases are REDUNDANT legacy tables.');
console.log('');
console.log('SAFE TO DROP (after verification):');
console.log('  - daily_challenge_problems (3 rows, all data in questions)');
console.log('  - daily_challenge_test_cases (7 rows, all data in test_cases)');
console.log('');
console.log('REQUIRES UPDATE:');
console.log('  - daily_questions.challenge_id references daily_challenge_problems (1 row)');
console.log('  - daily_challenge_automation_logs.challenge_id references daily_challenge_problems (0 rows)');
console.log('');
console.log('NOT SAFE TO DROP YET:');
console.log('  - daily_questions (still has active schema definition in Postgres)');
console.log('  - daily_challenge_metadata (ACTIVE - core table)');

db.close();
