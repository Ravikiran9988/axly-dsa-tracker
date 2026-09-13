const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, '..', 'data', 'axly_dsa.db'));
db.pragma('journal_mode = WAL');

console.log('=== CRITICAL FINDING: DC problems ALREADY exist in questions table ===\n');

// Check if DC problem data in questions matches daily_challenge_problems
for (const dcId of ['dc-001', 'dc-002', 'dc-003']) {
  const inQuestions = db.prepare('SELECT id, title, difficulty, description, problem_statement, slug, is_practice, created_via FROM questions WHERE id = ?').get(dcId);
  const inDCProblems = db.prepare('SELECT id, title, difficulty, description, problem_statement, slug, created_via FROM daily_challenge_problems WHERE id = ?').get(dcId);
  
  console.log(`\n--- ${dcId} ---`);
  console.log('In questions table:', JSON.stringify(inQuestions, null, 2));
  console.log('In daily_challenge_problems:', JSON.stringify(inDCProblems, null, 2));
  
  // Check if they're identical
  if (inQuestions && inDCProblems) {
    const fieldsToCompare = ['title', 'difficulty', 'description', 'problem_statement', 'slug'];
    const diffs = fieldsToCompare.filter(f => inQuestions[f] !== inDCProblems[f]);
    if (diffs.length === 0) {
      console.log('STATUS: IDENTICAL (except is_practice)');
    } else {
      console.log('STATUS: DIFFERENT in fields:', diffs);
    }
  }
}

console.log('\n\n=== TEST CASES COMPARISON ===\n');

// Compare test cases between daily_challenge_test_cases and test_cases for DC problems
for (const dcId of ['dc-001', 'dc-002', 'dc-003']) {
  const dcTCs = db.prepare('SELECT id, input, expected_output, is_hidden FROM daily_challenge_test_cases WHERE challenge_id = ? ORDER BY id').all(dcId);
  const qTCs = db.prepare('SELECT id, input, expected_output, is_hidden FROM test_cases WHERE question_id = ? ORDER BY id').all(dcId);
  
  console.log(`\n--- ${dcId} ---`);
  console.log(`daily_challenge_test_cases: ${dcTCs.length} rows`);
  dcTCs.forEach(tc => console.log(`  ${tc.id}: input=${tc.input.substring(0,40)}... hidden=${tc.is_hidden}`));
  console.log(`test_cases: ${qTCs.length} rows`);
  qTCs.forEach(tc => console.log(`  ${tc.id}: input=${tc.input.substring(0,40)}... hidden=${tc.is_hidden}`));
  
  // Check if same data
  if (dcTCs.length === qTCs.length) {
    let allMatch = true;
    for (let i = 0; i < dcTCs.length; i++) {
      if (dcTCs[i].input !== qTCs[i].input || dcTCs[i].expected_output !== qTCs[i].expected_output || dcTCs[i].is_hidden !== qTCs[i].is_hidden) {
        allMatch = false;
        break;
      }
    }
    console.log(`Match: ${allMatch ? 'YES - identical data' : 'NO - different data'}`);
  } else {
    console.log(`Match: NO - different counts`);
  }
}

console.log('\n\n=== CHECKING: Do DC problems have is_practice flag? ===\n');
const dcInQuestions = db.prepare('SELECT id, title, is_practice FROM questions WHERE id IN ("dc-001", "dc-002", "dc-003")').all();
dcInQuestions.forEach(row => {
  console.log(`${row.id} (${row.title}): is_practice=${row.is_practice}`);
});

console.log('\n\n=== CHECKING: daily_questions references ===\n');
const dq = db.prepare('SELECT * FROM daily_questions').all();
dq.forEach(row => {
  const q = db.prepare('SELECT id, title FROM questions WHERE id = ?').get(row.question_id);
  const dc = db.prepare('SELECT id, title FROM daily_challenge_problems WHERE id = ?').get(row.challenge_id);
  console.log(`daily_questions: id=${row.id}, question_id=${row.question_id} (question: ${q ? q.title : 'NOT FOUND'}), challenge_id=${row.challenge_id} (dc: ${dc ? dc.title : 'NOT FOUND'}), date=${row.date}`);
});

console.log('\n\n=== SUMMARY: What migration actually needs to do ===\n');
console.log('The daily_challenge_problems data is ALREADY duplicated in the questions table.');
console.log('The daily_challenge_metadata ALREADY points to the correct questions.id.');
console.log('The daily_challenge_test_cases ALREADY exist in test_cases for these question_ids.');
console.log('');
console.log('Remaining legacy tables to clean up:');
console.log('  1. daily_challenge_problems (3 rows) - DUPLICATE of questions data');
console.log('  2. daily_challenge_test_cases (7 rows) - DUPLICATE of test_cases data');
console.log('  3. daily_questions (1 row) - still references challenge_id to daily_challenge_problems');
console.log('');
console.log('The core migration is actually about:');
console.log('  - Removing daily_challenge_problems table (data already in questions)');
console.log('  - Removing daily_challenge_test_cases table (data already in test_cases)');
console.log('  - Updating daily_questions to stop referencing daily_challenge_problems');
console.log('  - Ensuring all FK references point to questions.id only');

db.close();
