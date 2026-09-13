const Database = require('better-sqlite3');
const db = new Database('data/axly_dsa_migration_copy.db', {readonly: true});

const getRows = (query) => {
  try {
    return db.prepare(query).all();
  } catch (e) {
    return [];
  }
};

console.log("=== legacy_daily_challenge_problems ===");
console.log(JSON.stringify(getRows("SELECT * FROM daily_challenge_problems"), null, 2));

console.log("\n=== legacy_daily_challenge_test_cases ===");
console.log(JSON.stringify(getRows("SELECT * FROM daily_challenge_test_cases"), null, 2));

console.log("\n=== legacy_daily_questions ===");
console.log(JSON.stringify(getRows("SELECT * FROM daily_questions"), null, 2));

console.log("\n=== canonical_daily_challenge_metadata ===");
console.log(JSON.stringify(getRows("SELECT * FROM daily_challenge_metadata"), null, 2));

console.log("\n=== existing questions (brief) ===");
// Only select ones that might match daily challenges
const questions = getRows("SELECT id, title, slug, is_practice, difficulty FROM questions WHERE is_practice = 0 OR is_practice IS NULL");
console.log(JSON.stringify(questions, null, 2));

console.log("\n=== existing test cases (count by question_id) ===");
const tcCounts = getRows("SELECT question_id, COUNT(*) as c FROM test_cases GROUP BY question_id");
console.log(JSON.stringify(tcCounts, null, 2));

console.log("\n=== submissions ===");
console.log(JSON.stringify(getRows("SELECT * FROM submissions"), null, 2));

console.log("\n=== practice_progress ===");
console.log(JSON.stringify(getRows("SELECT * FROM practice_progress"), null, 2));
