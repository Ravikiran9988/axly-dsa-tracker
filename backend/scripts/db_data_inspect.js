const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const prodDbPath = path.join(__dirname, '..', 'data', 'axly_dsa.db');
const db = new Database(prodDbPath);
db.pragma('journal_mode = WAL');

console.log('=== DAILY CHALLENGE PROBLEMS ===');
const dcProblems = db.prepare('SELECT * FROM daily_challenge_problems').all();
dcProblems.forEach(row => {
  console.log(JSON.stringify(row, null, 2));
});

console.log('\n=== DAILY CHALLENGE METADATA ===');
const dcMetadata = db.prepare('SELECT * FROM daily_challenge_metadata').all();
dcMetadata.forEach(row => {
  console.log(JSON.stringify(row, null, 2));
});

console.log('\n=== DAILY CHALLENGE TEST CASES ===');
const dcTestCases = db.prepare('SELECT * FROM daily_challenge_test_cases').all();
dcTestCases.forEach(row => {
  console.log(JSON.stringify(row, null, 2));
});

console.log('\n=== DAILY QUESTIONS ===');
const dailyQuestions = db.prepare('SELECT * FROM daily_questions').all();
dailyQuestions.forEach(row => {
  console.log(JSON.stringify(row, null, 2));
});

console.log('\n=== SUBMISSIONS ===');
const submissions = db.prepare('SELECT id, user_id, question_id, status, passed_tests, total_tests FROM submissions').all();
submissions.forEach(row => {
  console.log(JSON.stringify(row, null, 2));
});

console.log('\n=== PRACTICE PROGRESS ===');
const progress = db.prepare('SELECT * FROM practice_progress').all();
progress.forEach(row => {
  console.log(JSON.stringify(row, null, 2));
});

console.log('\n=== QUESTIONS (sample - first 3) ===');
const questions = db.prepare('SELECT id, title, difficulty, is_practice, source_question_id FROM questions LIMIT 3').all();
questions.forEach(row => {
  console.log(JSON.stringify(row, null, 2));
});

console.log('\n=== QUESTIONS with source_question_id ===');
const questionsWithSource = db.prepare('SELECT id, title, source_question_id FROM questions WHERE source_question_id IS NOT NULL').all();
questionsWithSource.forEach(row => {
  console.log(JSON.stringify(row, null, 2));
});

console.log('\n=== CHECKING if DC problems have source_question_id ===');
const dcWithSource = db.prepare('SELECT id, title, source_question_id FROM daily_challenge_problems WHERE source_question_id IS NOT NULL').all();
dcWithSource.forEach(row => {
  console.log(JSON.stringify(row, null, 2));
});

console.log('\n=== CHECKING overlap: are any DC problem IDs already in questions? ===');
for (const dc of dcProblems) {
  const exists = db.prepare('SELECT id FROM questions WHERE id = ?').get(dc.id);
  console.log(`DC problem ${dc.id} (${dc.title}): ${exists ? 'ALREADY EXISTS in questions' : 'NOT in questions'}`);
}

console.log('\n=== CHECKING overlap: are any DC problem source_question_ids already in questions? ===');
for (const dc of dcProblems) {
  if (dc.source_question_id) {
    const exists = db.prepare('SELECT id, title FROM questions WHERE id = ?').get(dc.source_question_id);
    console.log(`DC problem ${dc.id} source_question_id=${dc.source_question_id}: ${exists ? `MATCHES question "${exists.title}"` : 'NOT found in questions'}`);
  }
}

console.log('\n=== CHECKING daily_challenge_metadata.question_id values ===');
for (const meta of dcMetadata) {
  const exists = db.prepare('SELECT id, title FROM questions WHERE id = ?').get(meta.question_id);
  const dcExists = db.prepare('SELECT id, title FROM daily_challenge_problems WHERE id = ?').get(meta.question_id);
  console.log(`metadata question_id=${meta.question_id}: question=${exists ? exists.title : 'NOT FOUND'}, dc_problem=${dcExists ? dcExists.title : 'NOT FOUND'}`);
}

console.log('\n=== CHECKING submissions.question_id references ===');
for (const sub of submissions) {
  const q = db.prepare('SELECT id, title FROM questions WHERE id = ?').get(sub.question_id);
  const dc = db.prepare('SELECT id, title FROM daily_challenge_problems WHERE id = ?').get(sub.question_id);
  console.log(`submission ${sub.id}: question_id=${sub.question_id} -> question=${q ? q.title : 'NONE'}, dc_problem=${dc ? dc.title : 'NONE'}`);
}

console.log('\n=== TEST CASES by question_id (sample) ===');
const tcByQuestion = db.prepare('SELECT question_id, COUNT(*) as cnt FROM test_cases GROUP BY question_id ORDER BY cnt DESC LIMIT 10').all();
tcByQuestion.forEach(row => {
  console.log(`question_id=${row.question_id}: ${row.cnt} test cases`);
});

db.close();
