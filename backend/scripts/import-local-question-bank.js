#!/usr/bin/env node
/**
 * Local Question Bank Importer
 *
 * Imports 150+ practice questions from the local SQLite `axly_dsa.db` to the
 * production PostgreSQL database.
 * 
 * Usage:
 *   node backend/scripts/import-local-question-bank.js [--dry-run]
 * 
 * Features:
 * - Idempotent import
 * - Dry-run mode
 * - Duplicate detection
 * - Validation (prevents importing placeholders)
 * - Topic/Pattern mapping
 * - Embedding generation integration
 * - Transactional safety
 */

require('dotenv').config();
const { db: sqlite } = require('../src/db/db');
const { pool: pgPool, isPostgresConfigured, checkPostgresHealth } = require('../src/db/postgres');
const { indexQuestion } = require('../src/services/questionEmbeddingService');

const DRY_RUN = process.argv.includes('--dry-run');

function log(msg) {
  console.log(`[Import] ${msg}`);
}
function logError(msg) {
  console.error(`[Import ERROR] ${msg}`);
}

function parseJsonField(val, fallback = '[]') {
  if (!val) return fallback;
  try {
    const parsed = typeof val === 'string' ? JSON.parse(val) : val;
    return JSON.stringify(parsed);
  } catch (e) {
    return fallback;
  }
}

function isInvalidPlaceholder(val) {
  const s = String(val || '').trim().toLowerCase();
  return s === '' || s === 'todo' || s === 'pass' || s === 'return 0' || s === 'example input';
}

function validateQuestion(q, testCases) {
  if (isInvalidPlaceholder(q.title)) return 'Invalid or missing title';
  if (isInvalidPlaceholder(q.description) && isInvalidPlaceholder(q.problem_statement)) return 'Missing description/problem_statement';
  if (isInvalidPlaceholder(q.input_format)) return 'Missing input_format';
  if (isInvalidPlaceholder(q.output_format)) return 'Missing output_format';
  
  // Examples validation
  try {
    const examples = JSON.parse(q.examples || '[]');
    if (!Array.isArray(examples)) return 'examples is not a JSON array';
  } catch (e) {
    return 'Invalid JSON in examples';
  }

  // Starter code validation
  try {
    const starter = JSON.parse(q.starter_code || '{}');
    if (!starter || typeof starter !== 'object' || Object.keys(starter).length === 0) {
      return 'Missing or invalid starter_code';
    }
  } catch (e) {
    return 'Invalid JSON in starter_code';
  }

  if (!testCases || testCases.length === 0) {
    return 'Question has no test cases';
  }
  
  return null; // Valid
}

async function main() {
  log('==================================================');
  log('🚀 LOCAL QUESTION BANK IMPORT');
  log(`⚙️ Mode: ${DRY_RUN ? 'DRY RUN (No changes)' : 'LIVE IMPORT'}`);
  log('==================================================\n');

  if (!isPostgresConfigured()) {
    logError('PostgreSQL is not configured. Set DATABASE_URL.');
    process.exit(1);
  }

  const health = await checkPostgresHealth();
  if (!health.healthy) {
    logError(`PostgreSQL health check failed: ${health.reason}`);
    process.exit(1);
  }

  const client = await pgPool.connect();

  let stats = {
    sourceQuestions: 0,
    valid: 0,
    imported: 0,
    alreadyExisted: 0,
    skippedDuplicate: 0,
    validationFailures: 0,
    importFailures: 0,
    testCasesImported: 0,
    embeddingsIndexed: 0,
    embeddingFailures: 0
  };

  try {
    // 1. Fetch practice questions from local SQLite
    const sourceQuestions = sqlite.prepare('SELECT * FROM questions WHERE is_practice = 1').all();
    stats.sourceQuestions = sourceQuestions.length;
    
    log(`Found ${stats.sourceQuestions} practice questions in local SQLite.\n`);

    if (stats.sourceQuestions === 0) {
      log('No practice questions found locally. Exiting.');
      return;
    }

    // Load local Topics and Patterns for mapping
    const localTopics = sqlite.prepare('SELECT * FROM topics').all();
    const localPatterns = sqlite.prepare('SELECT * FROM patterns').all();

    // Load PG Topics and Patterns
    const pgTopics = (await client.query('SELECT id, name FROM topics')).rows;
    const pgPatterns = (await client.query('SELECT id, name FROM patterns')).rows;

    const topicNameMap = new Map(pgTopics.map(t => [t.name.toLowerCase(), t.id]));
    const patternNameMap = new Map(pgPatterns.map(p => [p.name.toLowerCase(), p.id]));
    const topicIdMap = new Set(pgTopics.map(t => t.id));
    const patternIdMap = new Set(pgPatterns.map(p => p.id));

    // 2. Iterate and Import
    for (const sq of sourceQuestions) {
      log(`Processing: [${sq.id}] ${sq.title}`);
      
      const testCases = sqlite.prepare('SELECT * FROM test_cases WHERE question_id = ?').all(sq.id);

      // Validate
      const validationError = validateQuestion(sq, testCases);
      if (validationError) {
        logError(`  Skip (Validation): ${validationError}`);
        stats.validationFailures++;
        continue;
      }
      stats.valid++;

      // Deduplication: Check if exists in PG by ID or slug
      const slugToCheck = sq.slug || sq.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      
      const existing = await client.query('SELECT id FROM questions WHERE id = $1 OR slug = $2 LIMIT 1', [sq.id, slugToCheck]);
      if (existing.rows.length > 0) {
        if (existing.rows[0].id === sq.id) {
          log('  Skip: Already existed (matching ID)');
          stats.alreadyExisted++;
        } else {
          log('  Skip: Duplicate (matching slug)');
          stats.skippedDuplicate++;
        }
        continue;
      }

      // Map Topic and Pattern
      let pgTopicId = null;
      let pgPatternId = null;

      if (sq.topic_id) {
        if (topicIdMap.has(sq.topic_id)) {
          pgTopicId = sq.topic_id;
        } else {
          const localT = localTopics.find(t => t.id === sq.topic_id);
          if (localT && topicNameMap.has(localT.name.toLowerCase())) {
            pgTopicId = topicNameMap.get(localT.name.toLowerCase());
          }
        }
      }

      if (sq.pattern_id) {
        if (patternIdMap.has(sq.pattern_id)) {
          pgPatternId = sq.pattern_id;
        } else {
          const localP = localPatterns.find(p => p.id === sq.pattern_id);
          if (localP && patternNameMap.has(localP.name.toLowerCase())) {
            pgPatternId = patternNameMap.get(localP.name.toLowerCase());
          }
        }
      }

      if (DRY_RUN) {
        log('  [DRY-RUN] Would import successfully');
        stats.imported++;
        stats.testCasesImported += testCases.length;
        stats.embeddingsIndexed++;
        continue;
      }

      // Import via Transaction
      await client.query('BEGIN');
      try {
        await client.query(`
          INSERT INTO questions (
            id, title, slug, difficulty, topic_id, pattern_id, url,
            description, problem_statement, constraints, input_format, output_format,
            example_input, example_output, examples, hints, tags, estimated_time, points,
            assigned_date, due_date, status, supported_languages, starter_code,
            reference_solution, editorial, solution_approach, complexity,
            is_active, is_practice, generation_slot, created_via, created_by,
            secondary_topics, prerequisites, created_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15::jsonb, $16, $17::jsonb,
            $18, $19, $20, $21, $22, $23::jsonb, $24::jsonb, $25, $26, $27, $28,
            $29, $30, $31, $32, $33, $34::jsonb, $35::jsonb, COALESCE($36, NOW())
          )
        `, [
          sq.id, sq.title, slugToCheck, sq.difficulty || 'easy', pgTopicId, pgPatternId, sq.url || '',
          sq.description || null, sq.problem_statement || null, sq.constraints || null,
          sq.input_format || null, sq.output_format || null, sq.example_input || null,
          sq.example_output || null, parseJsonField(sq.examples), sq.hints || null,
          parseJsonField(sq.tags), sq.estimated_time || '30 mins', sq.points || 20,
          sq.assigned_date || null, sq.due_date || null, 'published', // Always published
          parseJsonField(sq.supported_languages), parseJsonField(sq.starter_code, '{}'),
          sq.reference_solution || null, sq.editorial || null, sq.solution_approach || null, sq.complexity || null,
          Boolean(sq.is_active !== undefined ? sq.is_active : 1), true, // is_practice = TRUE
          sq.generation_slot || null, 'manual', // created_via = 'manual'
          sq.created_by || null, parseJsonField(sq.secondary_topics), parseJsonField(sq.prerequisites),
          sq.created_at || null
        ]);

        // Insert Test Cases
        for (const tc of testCases) {
          await client.query(`
            INSERT INTO test_cases (id, question_id, input, expected_output, is_hidden, created_at)
            VALUES ($1, $2, $3, $4, $5, COALESCE($6, NOW()))
          `, [
            tc.id, tc.question_id, String(tc.input || ''), String(tc.expected_output || ''),
            Boolean(tc.is_hidden), tc.created_at || null
          ]);
        }

        // Generate and Index Embedding using the existing service
        // Since we are running in a script, it uses the defaultProvider configured in environment
        try {
          const indexResult = await indexQuestion(sq.id, sq, { force: true });
          if (indexResult && indexResult.success) {
            stats.embeddingsIndexed++;
          } else {
            stats.embeddingFailures++;
            throw new Error(`Embedding index failed: ${indexResult?.reason || 'Unknown error'}`);
          }
        } catch (embedError) {
          throw new Error(`Embedding exception: ${embedError.message}`);
        }

        await client.query('COMMIT');
        log('  Imported successfully (including test cases and embedding)');
        stats.imported++;
        stats.testCasesImported += testCases.length;

      } catch (err) {
        await client.query('ROLLBACK');
        logError(`  Failed to import: ${err.message}`);
        stats.importFailures++;
      }
    }

    log('\n==================================================');
    log('LOCAL QUESTION BANK IMPORT REPORT');
    log('==================================================');
    log(`Source questions:       ${stats.sourceQuestions}`);
    log(`Valid:                  ${stats.valid}`);
    log(`Imported:               ${stats.imported}`);
    log(`Already existed:        ${stats.alreadyExisted}`);
    log(`Skipped as duplicate:   ${stats.skippedDuplicate}`);
    log(`Validation failures:    ${stats.validationFailures}`);
    log(`Import failures:        ${stats.importFailures}`);
    log('');
    log(`Test cases imported:    ${stats.testCasesImported}`);
    log(`Embeddings indexed:     ${stats.embeddingsIndexed}`);
    log(`Embedding failures:     ${stats.embeddingFailures}`);
    log('==================================================\n');

  } catch (err) {
    logError(`Script failed: ${err.message}`);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}

module.exports = { validateQuestion, main };
