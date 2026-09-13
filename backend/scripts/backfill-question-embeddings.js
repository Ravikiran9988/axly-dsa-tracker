#!/usr/bin/env node
/**
 * Backfill Question Embeddings Script
 * 
 * Indexes all existing canonical questions for RAG-based novelty detection.
 * 
 * Requirements:
 * - All active questions from the questions table
 * - Generates embeddings via the existing embedding service
 * - Stores them through the existing embedding service (idempotent)
 * - Respects batch configuration (EMBEDDING_INDEX_BATCH_SIZE)
 * - Retries provider failures according to existing provider logic
 * - Never generates fake embeddings
 * - Produces clear progress output
 * - Exit with non-zero status if required questions failed
 * - Safe to re-run (idempotent)
 * 
 * Usage:
 *   node scripts/backfill-question-embeddings.js [--dry-run] [--batch-size=N]
 * 
 * Environment:
 *   NOVELTY_ENABLED=true
 *   GROQ_API_KEY_1=<your-key>
 *   EMBEDDING_PROVIDER=groq
 *   DATABASE_URL=<postgres-url> or SQLite path
 */

const path = require('path');
const { getRepository } = require('../src/db/repositoryFactory');
const { indexQuestion, computeContentHash } = require('../src/services/questionEmbeddingService');
const { defaultProvider } = require('../src/services/embeddingService');

// Parse command line arguments
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const batchSizeArg = args.find(a => a.startsWith('--batch-size='));
const BATCH_SIZE = batchSizeArg ? parseInt(batchSizeArg.split('=')[1], 10) : 
  (Number(process.env.EMBEDDING_INDEX_BATCH_SIZE) || 10);

function log(msg) {
  console.log(`[Backfill] ${msg}`);
}

function logError(msg) {
  console.error(`[Backfill ERROR] ${msg}`);
}

async function main() {
  log('Starting question embedding backfill...');
  log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE'}`);
  log(`Batch size: ${BATCH_SIZE}`);
  
  // Check embedding provider
  if (!defaultProvider.isConfigured()) {
    logError('Embedding provider is not configured. Set GROQ_API_KEY_1 environment variable.');
    process.exit(1);
  }
  
  log(`Embedding provider: ${defaultProvider.name}`);
  log(`Embedding model: ${defaultProvider.model}`);
  
  const repo = getRepository();
  
  // 1. Count total active questions
  const totalResult = await repo.one('SELECT COUNT(*) as count FROM questions WHERE is_active = TRUE');
  const totalQuestions = totalResult.count;
  log(`Total active questions in database: ${totalQuestions}`);
  
  if (totalQuestions === 0) {
    log('No active questions found. Nothing to backfill.');
    process.exit(0);
  }
  
  // 2. Count already indexed questions
  const indexedResult = await repo.one(`
    SELECT COUNT(*) as count 
    FROM question_embeddings qe
    JOIN questions q ON qe.question_id = q.id
    WHERE q.is_active = TRUE
  `);
  const alreadyIndexed = indexedResult.count;
  log(`Already indexed: ${alreadyIndexed}`);
  log(`Need to index: ${totalQuestions - alreadyIndexed}`);
  
  // 3. Fetch all active questions
  const questions = await repo.many(`
    SELECT q.*, t.name as topic_name, p.name as pattern_name
    FROM questions q
    LEFT JOIN topics t ON q.topic_id = t.id
    LEFT JOIN patterns p ON q.pattern_id = p.id
    WHERE q.is_active = TRUE
    ORDER BY q.created_at ASC
  `);
  
  log(`Fetched ${questions.length} questions for processing`);
  
  if (DRY_RUN) {
    log('DRY RUN: Would process the following questions:');
    questions.forEach((q, i) => {
      log(`  ${i + 1}. [${q.id}] ${q.title} (${q.difficulty || 'unknown'})`);
    });
    process.exit(0);
  }
  
  // 4. Process in batches
  let processed = 0;
  let indexed = 0;
  let skipped = 0;
  let failed = 0;
  const failedQuestions = [];
  
  for (let i = 0; i < questions.length; i += BATCH_SIZE) {
    const batch = questions.slice(i, i + BATCH_SIZE);
    log(`\nProcessing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(questions.length / BATCH_SIZE)}...`);
    
    const batchResults = await Promise.allSettled(
      batch.map(async (q) => {
        const result = await indexQuestion(q.id, q, { force: false });
        return { questionId: q.id, title: q.title, ...result };
      })
    );
    
    for (const result of batchResults) {
      processed++;
      
      if (result.status === 'fulfilled') {
        const { questionId, title, success, reason } = result.value;
        
        if (success) {
          if (reason === 'already_indexed') {
            skipped++;
            log(`  SKIP: [${questionId}] ${title} (already indexed with same content hash)`);
          } else {
            indexed++;
            log(`  OK:   [${questionId}] ${title} (${reason})`);
          }
        } else {
          failed++;
          failedQuestions.push({ questionId: title, reason });
          logError(`  FAIL: [${questionId}] ${title} - ${reason}`);
        }
      } else {
        failed++;
        const questionId = batch[batchResults.indexOf(result)]?.id || 'unknown';
        const title = batch[batchResults.indexOf(result)]?.title || 'unknown';
        failedQuestions.push({ questionId, title, reason: result.reason?.message || 'Unknown error' });
        logError(`  FAIL: [${questionId}] ${title} - ${result.reason?.message}`);
      }
    }
    
    // Brief pause between batches to respect rate limits
    if (i + BATCH_SIZE < questions.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  
  // 5. Final verification
  const finalIndexedResult = await repo.one(`
    SELECT COUNT(*) as count 
    FROM question_embeddings qe
    JOIN questions q ON qe.question_id = q.id
    WHERE q.is_active = TRUE
  `);
  const finalIndexed = finalIndexedResult.count;
  
  // 6. Check for orphan embeddings
  const orphanResult = await repo.one(`
    SELECT COUNT(*) as count 
    FROM question_embeddings qe
    LEFT JOIN questions q ON qe.question_id = q.id
    WHERE q.id IS NULL OR q.is_active = FALSE
  `);
  const orphanCount = orphanResult.count;
  
  // 7. Report
  log('\n' + '='.repeat(60));
  log('BACKFILL COMPLETE');
  log('='.repeat(60));
  log(`Total questions:    ${totalQuestions}`);
  log(`Processed:          ${processed}`);
  log(`Newly indexed:      ${indexed}`);
  log(`Skipped (idempotent): ${skipped}`);
  log(`Failed:             ${failed}`);
  log(`Final indexed count: ${finalIndexed}`);
  log(`Orphan embeddings:  ${orphanCount}`);
  
  if (failedQuestions.length > 0) {
    log('\nFailed questions:');
    failedQuestions.forEach(({ questionId, title, reason }) => {
      log(`  - [${questionId}] ${title}: ${reason}`);
    });
  }
  
  // 8. Verify integrity
  if (finalIndexed < totalQuestions) {
    logError(`\nWARNING: Indexed count (${finalIndexed}) < Total questions (${totalQuestions})`);
    logError('Some questions may not have embeddings. Check failed questions above.');
  }
  
  if (orphanCount > 0) {
    logError(`\nWARNING: Found ${orphanCount} orphan embeddings (referencing inactive/deleted questions)`);
  }
  
  // 9. Exit with appropriate code
  if (failed > 0) {
    logError(`\nExiting with non-zero status due to ${failed} failed question(s).`);
    process.exit(1);
  }
  
  log('\nAll questions successfully indexed.');
  process.exit(0);
}

// Run the script
main().catch(err => {
  logError(`Fatal error: ${err.message}`);
  console.error(err);
  process.exit(1);
});
