const Database = require('better-sqlite3');
const fs = require('fs');

const dbPath = 'data/axly_dsa_migration_copy.db';
const db = new Database(dbPath);

db.pragma('foreign_keys = ON');
const q = (sql, ...params) => db.prepare(sql).all(...params);
const get = (sql, ...params) => db.prepare(sql).get(...params);
const run = (sql, ...params) => db.prepare(sql).run(...params);

console.log("=== PRE-MIGRATION COUNTS ===");
const tables = [
  'questions', 'daily_challenge_metadata', 'daily_challenge_problems',
  'daily_challenge_test_cases', 'daily_questions', 'test_cases',
  'submissions', 'practice_progress'
];
const preCounts = {};
for (const t of tables) {
  try { preCounts[t] = get(`SELECT COUNT(*) as c FROM ${t}`).c; }
  catch(e) { preCounts[t] = 'MISSING'; }
  console.log(`${t}: ${preCounts[t]}`);
}

console.log("\n=== 1. LEGACY DAILY CHALLENGE INSPECTION & MAPPING ===");
const legacyProblems = q("SELECT * FROM daily_challenge_problems");
const mappingReport = [];
const mappedQuestions = {};

for (const legacy of legacyProblems) {
  const existingCanonical = get("SELECT * FROM questions WHERE id = ?", legacy.id);
  
  if (existingCanonical) {
    mappingReport.push({
      legacy_id: legacy.id,
      canonical_id: legacy.id,
      action: "reuse_existing",
      reason: "Canonical question already exists with this ID."
    });
    mappedQuestions[legacy.id] = { id: legacy.id, action: 'reuse' };
  } else {
    mappingReport.push({
      legacy_id: legacy.id,
      canonical_id: legacy.id, 
      action: "create_new",
      reason: "No canonical question found. Reusing legacy ID as canonical ID."
    });
    mappedQuestions[legacy.id] = { id: legacy.id, action: 'create', data: legacy };
  }
}

console.log(JSON.stringify(mappingReport, null, 2));

console.log("\n=== STARTING MIGRATION TRANSACTION ===");
db.exec('BEGIN TRANSACTION;');

try {
  // 1. Migrate Questions
  console.log("-> Migrating Questions...");
  for (const legacy of legacyProblems) {
    const mapInfo = mappedQuestions[legacy.id];
    
    // STATUS MAPPING
    let mappedStatus = 'draft';
    if (legacy.status === 'scheduled') mappedStatus = 'scheduled';
    else if (legacy.status === 'published') mappedStatus = 'published';
    else if (legacy.status === 'archived') mappedStatus = 'archived';
    else if (legacy.status === 'draft') mappedStatus = 'draft';
    else if (legacy.status === 'active') mappedStatus = 'published'; // verified it means currently active/published
    else if (legacy.status === 'completed') mappedStatus = 'archived'; // verified it means past/completed
    else mappedStatus = 'review_required';

    if (mapInfo.action === 'create') {
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
  }

  // 2. Migrate Daily Challenge Metadata
  console.log("-> Migrating Daily Challenge Metadata...");
  for (const legacy of legacyProblems) {
    const existingMeta = get("SELECT * FROM daily_challenge_metadata WHERE question_id = ?", legacy.id);
    if (!existingMeta) {
      run(`
        INSERT INTO daily_challenge_metadata (
          question_id, scheduled_date, custom_topic, created_via, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `,
        legacy.id, legacy.scheduled_date, legacy.custom_topic, legacy.created_via, 
        legacy.created_at, legacy.updated_at
      );
    } else {
      run(`
        UPDATE daily_challenge_metadata
        SET scheduled_date = ?
        WHERE question_id = ?
      `, legacy.scheduled_date, legacy.id);
    }
  }

  // 3. Migrate Test Cases
  console.log("-> Migrating Test Cases...");
  const legacyTestCases = q("SELECT * FROM daily_challenge_test_cases");
  for (const tc of legacyTestCases) {
    // Check if test case already exists (matched by legacy ID)
    const existingTc = get("SELECT * FROM test_cases WHERE id = ?", tc.id);
    if (!existingTc) {
      run(`
        INSERT INTO test_cases (
          id, question_id, input, expected_output, is_hidden, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `,
        tc.id, tc.challenge_id, tc.input, tc.expected_output, tc.is_hidden, tc.created_at
      );
    }
  }
  
  db.exec('COMMIT;');
  console.log("=== MIGRATION TRANSACTION COMMITTED ===");
} catch (e) {
  db.exec('ROLLBACK;');
  console.log("=== MIGRATION TRANSACTION ROLLED BACK DUE TO ERROR ===");
  console.error(e);
  process.exit(1);
}

console.log("\n=== POST-MIGRATION COUNTS ===");
const postCounts = {};
for (const t of tables) {
  try { postCounts[t] = get(`SELECT COUNT(*) as c FROM ${t}`).c; }
  catch(e) { postCounts[t] = 'MISSING'; }
  console.log(`${t}: ${postCounts[t]}`);
}

const fkCheck = q("PRAGMA foreign_key_check;");
console.log("\n=== FOREIGN KEY CHECK ===");
if (fkCheck.length === 0) {
  console.log("PASS - ZERO violations");
} else {
  console.log("FAIL - Violations found:");
  console.log(JSON.stringify(fkCheck, null, 2));
}

console.log("\n=== ORPHAN CHECK ===");
const orphansMetadata = q("SELECT * FROM daily_challenge_metadata WHERE question_id NOT IN (SELECT id FROM questions)");
const orphansTestCases = q("SELECT * FROM test_cases WHERE question_id NOT IN (SELECT id FROM questions)");
if (orphansMetadata.length === 0 && orphansTestCases.length === 0) {
  console.log("PASS - No orphans");
} else {
  console.log("FAIL - Orphans found!");
  console.log("Metadata Orphans:", orphansMetadata.length);
  console.log("Test Case Orphans:", orphansTestCases.length);
}

console.log("\n=== DUPLICATE CHECK ===");
const duplicateQuestions = q("SELECT id, COUNT(*) FROM questions GROUP BY id HAVING COUNT(*) > 1");
const duplicateMetadata = q("SELECT question_id, COUNT(*) FROM daily_challenge_metadata GROUP BY question_id HAVING COUNT(*) > 1");
if (duplicateQuestions.length === 0 && duplicateMetadata.length === 0) {
  console.log("PASS - No duplicates");
} else {
  console.log("FAIL - Duplicates found!");
}

console.log("\nSUCCESS");
