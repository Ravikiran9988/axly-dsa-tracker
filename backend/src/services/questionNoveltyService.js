const { getRepository } = require('../db/repositoryFactory');
const { defaultProvider, cosineSimilarity } = require('./embeddingService');
const { generateQuestionEmbedding, getAllEmbeddings, checkEmbeddingTable } = require('./questionEmbeddingService');

/**
 * Question Novelty Service
 * 
 * Provides pre-LLM and post-LLM duplicate detection using:
 * 1. Embedding-based semantic similarity (vector cosine)
 * 2. Existing3-layer token-based detection (delegates to aiSharedGenerationService)
 * 
 * Similarity thresholds (configurable via environment):
 * - DUPLICATE_THRESHOLD: >= this → DUPLICATE (reject)
 * - BORDERLINE_THRESHOLD: >= this → BORDERLINE (needs deeper check)
 * - Below BORDERLINE → NOVEL (accept)
 * 
 * Pre-LLM flow:
 *   Generation Request → Retrieve Similar → Build Exclusion Context → LLM
 * 
 * Post-LLM flow:
 *   Generated Candidate → Embed → Search Corpus → Similarity Analysis → Decision
 */

/**
 * NOVELTY THRESHOLDS — INITIAL CONFIGURABLE VALUES
 * 
 * These thresholds are NOT scientifically calibrated production thresholds.
 * They are initial configurable values that should be tuned based on
 * observed behavior in production with real question data.
 * 
 * Recommended tuning process:
 * 1. Deploy with these defaults
 * 2. Log borderline cases (0.75 - 0.88 similarity)
 * 3. Manually review a sample of borderline cases
 * 4. Adjust thresholds based on observed false positive/negative rates
 * 
 * Environment variables allow tuning without code changes:
 *   NOVELTY_DUPLICATE_THRESHOLD=0.88
 *   NOVELTY_BORDERLINE_THRESHOLD=0.75
 */
const NOVELTY_DUPLICATE_THRESHOLD = Number(process.env.NOVELTY_DUPLICATE_THRESHOLD) || 0.88;
const NOVELTY_BORDERLINE_THRESHOLD = Number(process.env.NOVELTY_BORDERLINE_THRESHOLD) || 0.75;
const NOVELTY_TOP_K = Number(process.env.NOVELTY_TOP_K) || 10;
const NOVELTY_ENABLED = process.env.NOVELTY_ENABLED !== 'false'; // Enabled by default

function getRepo() {
  return getRepository();
}

/**
 * Classification result for a candidate
 * @typedef {Object} NoveltyResult
 * @property {'NOVEL'|'BORDERLINE'|'DUPLICATE'|'UNAVAILABLE'} classification
 * @property {number} maxSimilarity - Highest similarity score found
 * @property {Array} similarQuestions - List of similar questions found
 * @property {string} reason - Human-readable explanation
 * @property {boolean} embeddingAvailable - Whether embedding search was used
 */

/**
 * Retrieve semantically similar questions from the embedding corpus
 * 
 * @param {Object} queryData - Question data to search for
 * @param {Object} options - { topK, excludeId, provider }
 * @returns {Promise<Array<{questionId: string, title: string, similarity: number}>>}
 */
async function retrieveSimilarQuestions(queryData, options = {}) {
  const {
    topK = NOVELTY_TOP_K,
    excludeId = null,
    provider = defaultProvider
  } = options;
  
  if (!provider.isConfigured()) {
    return [];
  }
  
  try {
    const tableExists = await checkEmbeddingTable();
    if (!tableExists) return [];
    
    // Generate embedding for the query
    const { embedding: queryEmbedding } = await generateQuestionEmbedding(queryData, provider);
    
    // Retrieve all embeddings from corpus
    const corpus = await getAllEmbeddings();
    
    if (corpus.length === 0) return [];
    
    // Compute similarity against all corpus items
      const similarities = [];
      for (const item of corpus) {
        if (excludeId && item.questionId === excludeId) continue;
        if (!item.embedding) continue;
        
        const similarity = cosineSimilarity(queryEmbedding, item.embedding);
        similarities.push({
          questionId: item.questionId,
          title: item.title,
          difficulty: item.difficulty,
          description: item.description,
          topicName: item.topicName,
          patternName: item.patternName,
          similarity: Number(similarity.toFixed(4))
        });
      }
    
    // Sort by similarity descending and return top-K
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  } catch (err) {
    console.error('[QuestionNovelty] Retrieval failed:', err.message);
    return [];
  }
}

/**
 * Classify a candidate question based on embedding similarity
 * 
 * @param {Object} candidateData - The candidate question data
 * @param {Object} options - { excludeId, provider, customThresholds }
 * @returns {Promise<NoveltyResult>}
 */
async function classifyCandidate(candidateData, options = {}) {
  const {
    excludeId = null,
    provider = defaultProvider,
    customThresholds = {}
  } = options;
  
  const duplicateThreshold = customThresholds.duplicate || NOVELTY_DUPLICATE_THRESHOLD;
  const borderlineThreshold = customThresholds.borderline || NOVELTY_BORDERLINE_THRESHOLD;
  
  // If embedding system is not available, return UNAVAILABLE
  if (!provider.isConfigured()) {
    return {
      classification: 'UNAVAILABLE',
      maxSimilarity: 0,
      similarQuestions: [],
      reason: 'Embedding provider not configured',
      embeddingAvailable: false
    };
  }
  
  try {
    const tableExists = await checkEmbeddingTable();
    if (!tableExists) {
      return {
        classification: 'UNAVAILABLE',
        maxSimilarity: 0,
        similarQuestions: [],
        reason: 'Embedding table not found',
        embeddingAvailable: false
      };
    }
    
    const similarQuestions = await retrieveSimilarQuestions(candidateData, {
      topK: 5,
      excludeId,
      provider
    });
    
    if (similarQuestions.length === 0) {
      return {
        classification: 'NOVEL',
        maxSimilarity: 0,
        similarQuestions: [],
        reason: 'No similar questions found in corpus',
        embeddingAvailable: true
      };
    }
    
    const maxSimilarity = similarQuestions[0].similarity;
    
    if (maxSimilarity >= duplicateThreshold) {
      const topTitle = String(similarQuestions[0].title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const candTitle = String(candidateData.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const isTitleMatch = !candTitle || !topTitle || candTitle === topTitle;

      if (isTitleMatch) {
        return {
          classification: 'DUPLICATE',
          maxSimilarity,
          similarQuestions: similarQuestions.filter(q => q.similarity >= duplicateThreshold),
          reason: `Semantic duplicate detected (similarity: ${maxSimilarity}). Most similar: "${similarQuestions[0].title}"`,
          embeddingAvailable: true
        };
      }

      // If titles differ, treat as BORDERLINE so downstream structural checks evaluate material equivalence
      return {
        classification: 'BORDERLINE',
        maxSimilarity,
        similarQuestions: similarQuestions.filter(q => q.similarity >= borderlineThreshold),
        reason: `Borderline similarity (similarity: ${maxSimilarity}). May need structural validation. Similar: "${similarQuestions[0].title}"`,
        embeddingAvailable: true
      };
    }

    if (maxSimilarity >= borderlineThreshold) {
      return {
        classification: 'BORDERLINE',
        maxSimilarity,
        similarQuestions: similarQuestions.filter(q => q.similarity >= borderlineThreshold),
        reason: `Borderline similarity (similarity: ${maxSimilarity}). May need structural validation. Similar: "${similarQuestions[0].title}"`,
        embeddingAvailable: true
      };
    }
    
    return {
      classification: 'NOVEL',
      maxSimilarity,
      similarQuestions: similarQuestions.slice(0, 3),
      reason: `Novel question (max similarity: ${maxSimilarity})`,
      embeddingAvailable: true
    };
  } catch (err) {
    console.error('[QuestionNovelty] Classification failed:', err.message);
    return {
      classification: 'UNAVAILABLE',
      maxSimilarity: 0,
      similarQuestions: [],
      reason: `Classification error: ${err.message}`,
      embeddingAvailable: false
    };
  }
}

/**
 * Pre-LLM Novelty Retrieval
 * 
 * Called BEFORE sending a generation request to the LLM.
 * Retrieves similar questions to build exclusion context.
 * 
 * @param {Object} generationParams - { topic, difficulty, pattern, title, description }
 * @returns {Promise<{exclusionContext: string, similarTitles: string[], similarCount: number}>}
 */
async function preLLMRetrieval(generationParams, options = {}) {
  const { provider = defaultProvider } = options;
  
  if (!NOVELTY_ENABLED || !provider.isConfigured()) {
    return { exclusionContext: '', similarTitles: [], similarCount: 0 };
  }
  
  try {
    const similar = await retrieveSimilarQuestions({
      title: generationParams.title || `${generationParams.topic} ${generationParams.pattern || ''} ${generationParams.difficulty || ''}`.trim(),
      description: generationParams.description || `Generate a ${generationParams.difficulty || 'medium'} ${generationParams.topic || 'general'} problem`,
      topic_name: generationParams.topic,
      pattern_name: generationParams.pattern,
      difficulty: generationParams.difficulty
    }, { topK: 10, provider });
    
    if (similar.length === 0) {
      return { exclusionContext: '', similarTitles: [], similarCount: 0 };
    }
    
    // Build rich exclusion context with metadata
    const exclusionEntries = similar.map((q, i) => {
      const lines = [`${i + 1}. ${q.title}`];
      if (q.topicName) lines.push(`   Topic: ${q.topicName}`);
      if (q.patternName) lines.push(`   Pattern: ${q.patternName}`);
      if (q.difficulty) lines.push(`   Difficulty: ${q.difficulty}`);
      if (q.description) {
        // Truncate description to 100 chars for compact context
        const briefDesc = String(q.description).slice(0, 100).trim();
        lines.push(`   Problem: ${briefDesc}${q.description.length > 100 ? '...' : ''}`);
      }
      return lines.join('\n');
    });
    
    const titles = similar.map(q => q.title).filter(Boolean);
    const exclusionContext = `\n\nEXISTING QUESTIONS TO AVOID (DO NOT generate similar problems):\n${exclusionEntries.join('\n\n')}\n\nGenerate a materially different algorithmic problem. Do NOT merely rename, rephrase, change the story, change variable names, or change examples while preserving the same core task.`;
    
    return {
      exclusionContext,
      similarTitles: titles,
      similarCount: titles.length
    };
  } catch (err) {
    console.error('[QuestionNovelty] Pre-LLM retrieval failed:', err.message);
    return { exclusionContext: '', similarTitles: [], similarCount: 0 };
  }
}

/**
 * Post-LLM Duplicate Check
 * 
 * Called AFTER the LLM generates a candidate.
 * Checks if the candidate is too similar to existing questions.
 * 
 * @param {Object} candidateData - The generated candidate question
 * @param {Object} options - { excludeId, provider }
 * @returns {Promise<NoveltyResult>}
 */
async function postLLMDuplicateCheck(candidateData, options = {}) {
  if (!NOVELTY_ENABLED) {
    return {
      classification: 'NOVEL',
      maxSimilarity: 0,
      similarQuestions: [],
      reason: 'Novelty checking disabled',
      embeddingAvailable: false
    };
  }
  
  return classifyCandidate(candidateData, options);
}

/**
 * Index a question after successful creation/persistence
 * 
 * @param {string} questionId - The question ID
 * @param {Object} questionData - Full question data
 * @param {Object} options - { provider, force }
 */
async function indexAcceptedQuestion(questionId, questionData, options = {}) {
  if (!NOVELTY_ENABLED) return { success: true, reason: 'novelty_disabled' };
  
  const { indexQuestion } = require('./questionEmbeddingService');
  return indexQuestion(questionId, questionData, options);
}

/**
 * Get novelty configuration for observability
 */
function getNoveltyConfig() {
  return {
    enabled: NOVELTY_ENABLED,
    duplicateThreshold: NOVELTY_DUPLICATE_THRESHOLD,
    borderlineThreshold: NOVELTY_BORDERLINE_THRESHOLD,
    topK: NOVELTY_TOP_K,
    embeddingModel: process.env.EMBEDDING_MODEL || 'gemini-embedding-001',
    // Documentation: thresholds are initial configurable values, NOT calibrated
    _documentation: 'Thresholds are initial defaults. Tune based on observed false positive/negative rates in production.'
  };
}

module.exports = {
  retrieveSimilarQuestions,
  classifyCandidate,
  preLLMRetrieval,
  postLLMDuplicateCheck,
  indexAcceptedQuestion,
  getNoveltyConfig,
  NOVELTY_DUPLICATE_THRESHOLD,
  NOVELTY_BORDERLINE_THRESHOLD,
  NOVELTY_TOP_K,
  NOVELTY_ENABLED
};
