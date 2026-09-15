const { getRepository } = require('../db/repositoryFactory');
const { createHash } = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { defaultProvider, normalizeVector, EMBEDDING_MODEL } = require('./embeddingService');

/**
 * Question Embedding Service
 * 
 * Manages the lifecycle of question embeddings:
 * - Generate embedding from question content
 * - Store/retrieve embeddings from database
 * - Re-index questions when content changes
 * - Idempotent indexing (content-hash based deduplication)
 * 
 * The embedding document is constructed from:
 * - title
 * - description (truncated to 500 chars)
 * - constraints
 * - input_format
 * - output_format
 * - examples (as text)
 * - topic_name
 * - pattern_name
 * - difficulty
 */

const EMBEDDING_CONTENT_MAX_LENGTH = Number(process.env.EMBEDDING_CONTENT_MAX_LENGTH) || 2000;
const EMBEDDING_INDEX_BATCH_SIZE = Number(process.env.EMBEDDING_INDEX_BATCH_SIZE) || 10;

function getRepo() {
  return getRepository();
}

/**
 * Compute SHA-256 hash of question content for idempotent indexing
 */
function computeContentHash(questionData) {
  const parts = [
    String(questionData.title || '').trim().toLowerCase(),
    String(questionData.description || '').trim().toLowerCase(),
    String(questionData.constraints || '').trim().toLowerCase(),
    String(questionData.input_format || '').trim().toLowerCase(),
    String(questionData.output_format || '').trim().toLowerCase(),
    String(questionData.topic_name || questionData.topic_id || '').trim().toLowerCase(),
    String(questionData.pattern_name || questionData.pattern_id || '').trim().toLowerCase(),
    String(questionData.difficulty || '').trim().toLowerCase()
  ];
  
  // Include examples if present
  if (questionData.examples) {
    const examplesStr = typeof questionData.examples === 'string' 
      ? questionData.examples 
      : JSON.stringify(questionData.examples);
    parts.push(examplesStr.toLowerCase());
  }
  
  const content = parts.join('|||');
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Build the searchable embedding document from question data
 * This is the deterministic text representation used for embedding generation
 */
function buildEmbeddingDocument(questionData) {
  const parts = [];
  
  // Title is most important for semantic similarity
  if (questionData.title) {
    parts.push(`Title: ${questionData.title}`);
  }
  
  // Description provides problem context (truncate to avoid token limits)
  if (questionData.description) {
    const desc = String(questionData.description).slice(0, 500);
    parts.push(`Problem: ${desc}`);
  }
  
  // Constraints define the problem boundaries
  if (questionData.constraints) {
    parts.push(`Constraints: ${questionData.constraints}`);
  }
  
  // I/O format defines the contract
  if (questionData.input_format) {
    parts.push(`Input: ${questionData.input_format}`);
  }
  if (questionData.output_format) {
    parts.push(`Output: ${questionData.output_format}`);
  }
  
  // Topic and pattern provide algorithmic context
  if (questionData.topic_name || questionData.topic_id) {
    parts.push(`Topic: ${questionData.topic_name || questionData.topic_id}`);
  }
  if (questionData.pattern_name || questionData.pattern_id) {
    parts.push(`Pattern: ${questionData.pattern_name || questionData.pattern_id}`);
  }
  
  // Difficulty provides complexity context
  if (questionData.difficulty) {
    parts.push(`Difficulty: ${questionData.difficulty}`);
  }
  
  // Examples as text summary
  if (questionData.examples) {
    try {
      const examples = typeof questionData.examples === 'string' 
        ? JSON.parse(questionData.examples) 
        : questionData.examples;
      if (Array.isArray(examples)) {
        const summary = examples.slice(0, 3).map(e => 
          `Input: ${e.input || ''}, Output: ${e.output || ''}`
        ).join('; ');
        parts.push(`Examples: ${summary}`);
      }
    } catch (_) {
      // Ignore parse errors for examples
    }
  }
  
  const doc = parts.join('\n');
  return doc.slice(0, EMBEDDING_CONTENT_MAX_LENGTH);
}

/**
 * Generate embedding for a question
 * @param {Object} questionData - Question data with required fields
 * @returns {Promise<{embedding: number[], contentHash: string, document: string}>}
 */
async function generateQuestionEmbedding(questionData, provider = defaultProvider) {
  if (!provider.isConfigured()) {
    throw new Error('Embedding provider not configured');
  }
  
  const document = buildEmbeddingDocument(questionData);
  const contentHash = computeContentHash(questionData);
  
  const rawEmbedding = await provider.getEmbedding(document);
  const embedding = normalizeVector(rawEmbedding);
  
  return { embedding, contentHash, document };
}

/**
 * Store embedding in database (idempotent)
 * If the same question_id + model + version exists with same content_hash, skip
 */
async function storeEmbedding(questionId, embedding, contentHash, options = {}) {
  const {
    embeddingModel = EMBEDDING_MODEL,
    embeddingVersion = 1
  } = options;
  
  const repo = getRepo();
  
  // Check if already indexed with same content hash
  const existing = await repo.one(
    'SELECT id, content_hash FROM question_embeddings WHERE question_id = ? AND embedding_model = ? AND embedding_version = ?',
    [questionId, embeddingModel, embeddingVersion]
  );
  
  if (existing && existing.content_hash === contentHash) {
    return { stored: false, reason: 'already_indexed', id: existing.id };
  }
  
  if (existing) {
    // Update existing embedding
    await repo.execute(
      `UPDATE question_embeddings 
       SET embedding = ?, content_hash = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [JSON.stringify(embedding), contentHash, existing.id]
    );
    
    // Update question's embedding_indexed_at
    await repo.execute(
      'UPDATE questions SET embedding_indexed_at = CURRENT_TIMESTAMP WHERE id = ?',
      [questionId]
    );
    
    return { stored: true, reason: 'updated', id: existing.id };
  }
  
  // Insert new embedding
  const id = uuidv4();
  await repo.execute(
    `INSERT INTO question_embeddings (id, question_id, embedding, content_hash, embedding_model, embedding_version)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, questionId, JSON.stringify(embedding), contentHash, embeddingModel, embeddingVersion]
  );
  
  // Update question's embedding_indexed_at
  await repo.execute(
    'UPDATE questions SET embedding_indexed_at = CURRENT_TIMESTAMP WHERE id = ?',
    [questionId]
  );
  
  return { stored: true, reason: 'created', id };
}

/**
 * Index a single question (generate embedding + store)
 * @param {string} questionId - The question ID
 * @param {Object} questionData - Full question data
 * @param {Object} options - { provider, force }
 * @returns {Promise<Object>} Indexing result
 */
async function indexQuestion(questionId, questionData, options = {}) {
  const { provider = defaultProvider, force = false } = options;
  
  if (!provider.isConfigured()) {
    return { success: false, reason: 'provider_not_configured' };
  }
  
  try {
    // Check if already indexed (unless forced)
    if (!force) {
      const repo = getRepo();
      const existing = await repo.one(
        'SELECT id, content_hash FROM question_embeddings WHERE question_id = ?',
        [questionId]
      );
      
      const currentHash = computeContentHash(questionData);
      if (existing && existing.content_hash === currentHash) {
        return { success: true, reason: 'already_indexed', id: existing.id };
      }
    }
    
    const { embedding, contentHash } = await generateQuestionEmbedding(questionData, provider);
    const result = await storeEmbedding(questionId, embedding, contentHash, { provider: provider.name });
    
    return { success: true, ...result };
  } catch (err) {
    console.error(`[QuestionEmbedding] Failed to index question ${questionId}:`, err.message);
    return { success: false, reason: 'embedding_error', error: err.message };
  }
}

/**
 * Retrieve embedding for a question
 */
async function getQuestionEmbedding(questionId) {
  const repo = getRepo();
  const row = await repo.one(
    'SELECT embedding, content_hash, embedding_model, embedding_version, indexed_at FROM question_embeddings WHERE question_id = ? ORDER BY embedding_version DESC LIMIT 1',
    [questionId]
  );
  
  if (!row) return null;
  
  return {
    embedding: typeof row.embedding === 'string' ? JSON.parse(row.embedding) : row.embedding,
    contentHash: row.content_hash,
    embeddingModel: row.embedding_model,
    embeddingVersion: row.embedding_version,
    indexedAt: row.indexed_at
  };
}

/**
 * Retrieve all embeddings from the corpus
 * Returns question_id and embedding for similarity search
 */
async function getAllEmbeddings(options = {}) {
  const { limit = 10000 } = options;
  const repo = getRepo();
  
  const rows = await repo.many(`
    SELECT qe.question_id, qe.embedding, q.title, q.difficulty, q.status, q.created_via,
           q.description, t.name as topic_name, p.name as pattern_name
    FROM question_embeddings qe
    JOIN questions q ON qe.question_id = q.id
    LEFT JOIN topics t ON q.topic_id = t.id
    LEFT JOIN patterns p ON q.pattern_id = p.id
    WHERE q.is_active = TRUE
    ORDER BY qe.indexed_at DESC
    LIMIT ?
  `, [limit]);
  
  return rows.map(row => ({
    questionId: row.question_id,
    embedding: typeof row.embedding === 'string' ? JSON.parse(row.embedding) : row.embedding,
    title: row.title,
    difficulty: row.difficulty,
    status: row.status,
    createdVia: row.created_via,
    description: row.description,
    topicName: row.topic_name,
    patternName: row.pattern_name
  }));
}

/**
 * Batch index multiple questions
 */
async function batchIndexQuestions(questions, options = {}) {
  const { provider = defaultProvider, concurrency = EMBEDDING_INDEX_BATCH_SIZE } = options;
  
  const results = [];
  
  // Process in batches to avoid rate limits
  for (let i = 0; i < questions.length; i += concurrency) {
    const batch = questions.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map(q => indexQuestion(q.id, q, { provider }))
    );
    
    results.push(...batchResults.map((r, idx) => ({
      questionId: batch[idx].id,
      success: r.status === 'fulfilled' ? r.value.success : false,
      reason: r.status === 'fulfilled' ? r.value.reason : r.reason?.message
    })));
    
    // Brief pause between batches to respect rate limits
    if (i + concurrency < questions.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  
  return results;
}

/**
 * Check if the embedding table exists and is accessible
 */
async function checkEmbeddingTable() {
  try {
    const repo = getRepo();
    await repo.one('SELECT COUNT(*) as count FROM question_embeddings');
    return true;
  } catch (_) {
    return false;
  }
}

module.exports = {
  generateQuestionEmbedding,
  storeEmbedding,
  indexQuestion,
  getQuestionEmbedding,
  getAllEmbeddings,
  batchIndexQuestions,
  computeContentHash,
  buildEmbeddingDocument,
  checkEmbeddingTable
};
