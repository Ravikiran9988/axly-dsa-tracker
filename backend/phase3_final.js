const Database = require('better-sqlite3');
const fs = require('fs');
const crypto = require('crypto');

function getChecksum(path) {
  return crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex');
}

const mainDbPath = 'data/axly_dsa_migration_copy.db';
const rollbackDbPath = 'data/migration_rollback_test.db';
const backupDbPath = 'data/axly_dsa_migration_copy.db.bak';
const sourceDbPath = 'data/axly_dsa.db';

const tables = [
  'questions', 'daily_challenge_metadata', 'daily_challenge_problems',
  'daily_challenge_test_cases', 'daily_questions', 'test_cases',
  'submissions', 'practice_progress'
];

function getCounts(dbPath) {
  const db = new Database(dbPath, {readonly: true});
  const counts = {};
  for (const t of tables) {
    try { counts[t] = db.prepare(`SELECT COUNT(*) as c FROM ${t}`).get().c; }
    catch(e) { counts[t] = 'MISSING'; }
  }
  db.close();
  return counts;
}

const preMigrationCounts = getCounts(mainDbPath);
const preMigrationState = preMigrationCounts.questions === 92 ? "PRE-MIGRATION" : "POST-MIGRATION";
const sourceChecksum = getChecksum(sourceDbPath);

console.log("=== PHASE 3 FINAL VALIDATION ===");
console.log(`CURRENT MIGRATION COPY STATE: ${preMigrationState}`);
console.log(`PRE-MIGRATION COUNTS: ${JSON.stringify(preMigrationCounts)}`);

// Execute migration on main copy
console.log("\n-> Running actual migration on main copy...");
const runMigration = (dbPath) => {
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  
  const get = (sql, ...params) => db.prepare(sql).get(...params);
  const q = (sql, ...params) => db.prepare(sql).all(...params);
  const run = (sql, ...params) => db.prepare(sql).run(...params);
  
  const legacyProblems = q("SELECT * FROM daily_challenge_problems");
  db.exec('BEGIN TRANSACTION;');
  
  for (const legacy of legacyProblems) {
    let mappedStatus = 'draft';
    if (legacy.status === 'scheduled') mappedStatus = 'scheduled';
    else if (legacy.status === 'published') mappedStatus = 'published';
    else if (legacy.status === 'archived') mappedStatus = 'archived';
    else if (legacy.status === 'draft') mappedStatus = 'draft';
    else if (legacy.status === 'active') mappedStatus = 'published';
    else if (legacy.status === 'completed') mappedStatus = 'archived';
    else mappedStatus = 'review_required';

    const existingCanonical = get("SELECT * FROM questions WHERE id = ?", legacy.id);
    if (!existingCanonical) {
      run(`
        INSERT INTO questions (
          id, title, slug, url, is_practice, difficulty, topic_id, pattern_id,
          secondary_topics, prerequisites, estimated_time, points, description,
          problem_statement, constraints, input_format, output_format,
          example_input, example_output, hints, tags, solution_approach,
          editorial, complexity, starter_code, reference_solution,
          supported_languages, created_by, created_at, updated_at,
          status, source_question_id, problem_signature, problem_concept,
          is_active, created_via
        ) VALUES (
          @id, @title, @slug, @url, @is_practice, @difficulty, @topic_id, @pattern_id,
          @secondary_topics, @prerequisites, @estimated_time, @points, @description,
          @problem_statement, @constraints, @input_format, @output_format,
          @example_input, @example_output, @hints, @tags, @solution_approach,
          @editorial, @complexity, @starter_code, @reference_solution,
          @supported_languages, @created_by, @created_at, @updated_at,
          @status, @source_question_id, @problem_signature, @problem_concept,
          @is_active, @created_via
        )
      `, {
          ...legacy,
          url: `/problems/${legacy.slug}`,
          is_practice: 0,
          status: mappedStatus
      });
    } else {
      run("UPDATE questions SET is_practice = 0, status = ? WHERE id = ?", mappedStatus, legacy.id);
    }
    
    const existingMeta = get("SELECT * FROM daily_challenge_metadata WHERE question_id = ?", legacy.id);
    if (!existingMeta) {
      run(`INSERT INTO daily_challenge_metadata (question_id, scheduled_date, custom_topic, created_via, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
        legacy.id, legacy.scheduled_date, legacy.custom_topic, legacy.created_via, legacy.created_at, legacy.updated_at);
    } else {
      run(`UPDATE daily_challenge_metadata SET scheduled_date = ? WHERE question_id = ?`, legacy.scheduled_date, legacy.id);
    }
  }
  
  const legacyTestCases = q("SELECT * FROM daily_challenge_test_cases");
  for (const tc of legacyTestCases) {
    const existingTc = get("SELECT * FROM test_cases WHERE id = ?", tc.id);
    if (!existingTc) {
      run(`INSERT INTO test_cases (id, question_id, input, expected_output, is_hidden, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
        tc.id, tc.challenge_id, tc.input, tc.expected_output, tc.is_hidden, tc.created_at);
    }
  }
  db.exec('COMMIT;');
  db.close();
};

runMigration(mainDbPath);
const postMigrationCounts = getCounts(mainDbPath);
console.log(`POST-MIGRATION COUNTS: ${JSON.stringify(postMigrationCounts)}`);

const mainDb = new Database(mainDbPath, {readonly: true});
console.log("\n=== INSPECT MAPPED RECORDS ===");
const mappingRes = mainDb.prepare(`
  SELECT 
    dcp.id as legacy_id,
    q.id as canonical_id,
    dcm.question_id as metadata_question_id,
    (SELECT COUNT(*) FROM test_cases WHERE question_id = q.id) as migrated_test_cases_count
  FROM daily_challenge_problems dcp
  JOIN questions q ON q.id = dcp.id
  JOIN daily_challenge_metadata dcm ON dcm.question_id = q.id
`).all();
console.log(JSON.stringify(mappingRes, null, 2));

const orphansMetadata = mainDb.prepare("SELECT * FROM daily_challenge_metadata WHERE question_id NOT IN (SELECT id FROM questions)").all();
const orphansTestCases = mainDb.prepare("SELECT * FROM test_cases WHERE question_id NOT IN (SELECT id FROM questions)").all();
const fkCheck = mainDb.prepare("PRAGMA foreign_key_check").all();
const dupQ = mainDb.prepare("SELECT id FROM questions GROUP BY id HAVING COUNT(*) > 1").all();
const dupMeta = mainDb.prepare("SELECT question_id FROM daily_challenge_metadata GROUP BY question_id HAVING COUNT(*) > 1").all();
mainDb.close();

console.log("\n=== IDEMPOTENCY TEST ===");
runMigration(mainDbPath);
const idempotencyCounts = getCounts(mainDbPath);
console.log(`Idempotency Counts Match: ${JSON.stringify(idempotencyCounts) === JSON.stringify(postMigrationCounts)}`);

console.log("\n=== ROLLBACK TEST ON SEPARATE COPY ===");
fs.copyFileSync(backupDbPath, rollbackDbPath);
runMigration(rollbackDbPath);
fs.copyFileSync(backupDbPath, rollbackDbPath);
const rollbackCounts = getCounts(rollbackDbPath);
console.log(`Rollback Counts Match Pre-Migration: ${JSON.stringify(rollbackCounts) === JSON.stringify(preMigrationCounts)}`);

const finalSourceChecksum = getChecksum(sourceDbPath);
console.log(`\nSOURCE UNCHANGED: ${sourceChecksum === finalSourceChecksum}`);

console.log("\n=== INTEGRITY CHECKS ===");
console.log("FK violations:", fkCheck.length);
console.log("Orphans (Metadata):", orphansMetadata.length);
console.log("Orphans (TestCases):", orphansTestCases.length);
console.log("Duplicate Questions:", dupQ.length);
console.log("Duplicate Metadata:", dupMeta.length);

