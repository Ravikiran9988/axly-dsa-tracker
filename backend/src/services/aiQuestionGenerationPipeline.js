const { getRepository } = require('../db/repositoryFactory');
const { AppError } = require('../middleware/errorHandler');
const { executeCode } = require('./executionService');
const aiQuestionService = require('./aiQuestionService');
const noveltyService = require('./questionNoveltyService');
const { recommendTopicForDailyChallenge } = require('./topicService');

function getRepo() {
  return getRepository();
}

/**
 * Standard Generation Error Codes
 */
const ERROR_CODES = {
  GENERATION_FAILED: 'GENERATION_FAILED',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  STARTER_CODE_INVALID: 'STARTER_CODE_INVALID',
  REFERENCE_SOLUTION_INVALID: 'REFERENCE_SOLUTION_INVALID',
  TEST_CASE_VALIDATION_FAILED: 'TEST_CASE_VALIDATION_FAILED',
  DUPLICATE_PROBLEM: 'DUPLICATE_COLLISION',
  NOVELTY_CHECK_FAILED: 'NOVELTY_VALIDATION_UNAVAILABLE',
  INDEXING_FAILED: 'INDEXING_FAILED',
  LLM_PROVIDER_FAILED: 'LLM_PROVIDER_FAILED'
};

class PipelineError extends AppError {
  constructor(message, statusCode = 422, code = ERROR_CODES.GENERATION_FAILED, details = null) {
    super(message, statusCode, code);
    this.name = 'PipelineError';
    this.details = details;
  }
}

/**
 * Generation Mutex
 * 
 * Prevents concurrent generation requests on the same topic/pattern
 * from both passing pre-LLM check and producing duplicate candidates.
 * 
 * LIMITATION: In multi-instance deployments, this mutex only protects within
 * a single Node.js process. For multi-instance protection, a distributed
 * lock (e.g., Redis-based) would be required.
 */
const generationMutex = new Map();

/**
 * Standard topics in DSA curriculum
 */
const TOPIC_NAMES = {
  'top-01': 'Arrays',
  'top-02': 'Strings',
  'top-03': 'Two Pointers',
  'top-04': 'Sliding Window',
  'top-05': 'Binary Search',
  'top-06': 'Stack',
  'top-07': 'Trees',
  'top-08': 'Dynamic Programming',
  'top-09': 'Graphs',
  'top-10': 'Hashing',
  'top-11': 'Heap / Priority Queue',
  'top-12': 'Recursion & Backtracking'
};

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'to', 'in', 'of', 'for', 'with', 'on', 'at', 'by',
  'from', 'under', 'given', 'find', 'return', 'calculate', 'determine', 'get', 'is',
  'can', 'best', 'target', 'constraint', 'maximum', 'minimum', 'longest', 'shortest',
  'most', 'least', 'optimal', 'total', 'all', 'any', 'value', 'values', 'fewest',
  'constraints', 'integers', 'integer', 'elements', 'element', 'two', 'three', 'four',
  'pair', 'pairs', 'first', 'second', 'third', 'equal', 'equals', 'large', 'small',
  'numbers', 'number', 'k', 'n', 'such', 'that',
  'problem', 'challenge', 'algorithm', 'function', 'solution', 'mock', 'mocked', 'generate', 'generated', 'test'
]);

const GENERIC_DSA_TERMS = new Set([
  'array', 'arrays', 'string', 'strings', 'matrix', 'tree', 'trees', 'node', 'nodes',
  'graph', 'graphs', 'list', 'lists', 'subarray', 'subarrays', 'substring', 'substrings',
  'path', 'paths', 'problem', 'challenge', 'grid'
]);

const SUPPORTED_LANGUAGES = ['javascript', 'typescript', 'python', 'java', 'cpp', 'c'];

/**
 * Strip artificial variant suffixes (e.g. "Variant 4880", "(Variant 0717)", "- v2", etc.)
 */
function stripVariantIdentifiers(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/\s*[\(\[\{]\s*(?:variant|version|v|ver|iteration)\s*#?\s*[a-z0-9_-]+\s*[\)\]\}]/gi, '')
    .replace(/\s*[-—–:]\s*(?:variant|version|v)\s*#?\s*[a-z0-9_-]+/gi, '')
    .replace(/\s+(?:variant|version|v)\s*#?\s*[a-z0-9_-]+/gi, '')
    .replace(/\s+#\d+/g, '')
    .replace(/\s*\([^\)]*\d+[^\)]*\)/g, '')
    .trim();
}

/**
 * Extract normalized problem concept keyword tokens from title and description
 */
function extractProblemConcept(title, description = '') {
  const cleanTitle = stripVariantIdentifiers(title || '');
  const combined = `${cleanTitle} ${description || ''}`.toLowerCase();
  const words = combined
    .replace(/[^a-z0-9_\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));

  const stemmed = words.map(w => {
    if (w.endsWith('ies')) return w.slice(0, -3) + 'y';
    if (w.endsWith('es') && !w.endsWith('tes') && !w.endsWith('ses')) return w.slice(0, -2);
    if (w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
    if (w.endsWith('ing')) return w.slice(0, -3);
    if (w.endsWith('ed')) return w.slice(0, -2);
    return w;
  });

  const unique = Array.from(new Set(stemmed));
  return unique.slice(0, 8).sort().join('-');
}

/**
 * Extract input structure type from string specifications
 */
function extractInputStructure(text = '') {
  const t = String(text).toLowerCase();
  if (t.includes('tree') || t.includes('treenode') || t.includes('root')) return 'tree';
  if (t.includes('graph') || t.includes('adj') || t.includes('edge')) return 'graph';
  if (t.includes('matrix') || t.includes('grid') || t.includes('2d')) return 'matrix';
  if (t.includes('array') || t.includes('nums') || t.includes('list')) return 'array';
  if (t.includes('string') || t.includes('word') || t.includes('char')) return 'string';
  return 'primitive';
}

/**
 * Extract output structure type from string specifications
 */
function extractOutputType(text = '') {
  const t = String(text).toLowerCase();
  if (t.includes('boolean') || t.includes('true') || t.includes('false')) return 'boolean';
  if (t.includes('count') || t.includes('sum') || t.includes('length') || t.includes('integer') || t.includes('number') || t.includes('max') || t.includes('min') || t.includes('depth')) return 'number';
  if (t.includes('array') || t.includes('list') || t.includes('indices')) return 'array';
  if (t.includes('string') || t.includes('word')) return 'string';
  return 'scalar';
}

/**
 * Generate a deterministic structured problem signature
 * Format: {topic}|{pattern}|{coreConcept}|{inputStructure}|{outputType}
 */
function generateProblemSignature(data = {}) {
  const topic = String(data.topic || data.topic_name || 'general').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  const pattern = String(data.pattern || data.pattern_name || 'general').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  const concept = extractProblemConcept(data.title || '', data.description || '');
  const inputType = extractInputStructure(`${data.input_format || ''} ${data.description || ''} ${data.title || ''}`);
  const outputType = extractOutputType(`${data.output_format || ''} ${data.description || ''} ${data.title || ''}`);

  return `${topic}|${pattern}|${concept || 'general'}|${inputType}|${outputType}`;
}

/**
 * Compute specific token overlap and Jaccard similarity between two texts
 */
function computeSemanticSimilarity(textA, textB) {
  const cleanA = stripVariantIdentifiers(textA).toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const cleanB = stripVariantIdentifiers(textB).toLowerCase().replace(/[^a-z0-9\s]/g, ' ');

  const tokensA = new Set(cleanA.split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w)));
  const tokensB = new Set(cleanB.split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w)));

  const specificA = new Set([...tokensA].filter(w => !GENERIC_DSA_TERMS.has(w)));
  const specificB = new Set([...tokensB].filter(w => !GENERIC_DSA_TERMS.has(w)));

  if (specificA.size === 0 || specificB.size === 0) return { jaccard: 0, overlap: 0, sharedCount: 0 };

  let sharedSpecific = 0;
  for (const t of specificA) {
    if (specificB.has(t)) sharedSpecific++;
  }

  const union = new Set([...specificA, ...specificB]).size;
  const jaccard = union > 0 ? sharedSpecific / union : 0;
  const overlap = Math.min(specificA.size, specificB.size) > 0 ? sharedSpecific / Math.min(specificA.size, specificB.size) : 0;

  return { jaccard, overlap, sharedCount: sharedSpecific };
}

function generateSlug(title) {
  const clean = stripVariantIdentifiers(title);
  return String(clean || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || `q-${Date.now()}`;
}

/**
 * Check whether a candidate problem collides with existing questions
 * Multi-layer detection:
 * Layer 1: Clean base title comparison
 * Layer 2: Structured Problem Signature match
 * Layer 3: Semantic Concept Token Overlap (Jaccard > 0.65 or Overlap > 0.80)
 */
async function checkDuplicateProblem(candidate, description = '', excludeId = null) {
  const candidateData = typeof candidate === 'object' && candidate !== null
    ? candidate
    : { title: candidate, description: description || '' };

  const rawTitle = String(candidateData.title || '').trim();
  const cleanTitle = stripVariantIdentifiers(rawTitle);
  const normTitle = cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (!normTitle) return { isDuplicate: false };

  const candidateSignature = candidateData.problem_signature || generateProblemSignature(candidateData);
  const candidateConcept = candidateData.problem_concept || extractProblemConcept(cleanTitle, candidateData.description || '');

  // 1. Check daily challenge metadata and questions (all active non-archived)
  let existingDc = [];
  try {
    existingDc = await getRepo().many(`
      SELECT q.id, q.title, q.description, dcm.status, dcm.scheduled_date, q.problem_signature, q.problem_concept
      FROM daily_challenge_metadata dcm
      JOIN questions q ON dcm.question_id = q.id
      WHERE dcm.status != 'archived' AND q.is_active = TRUE ${excludeId ? 'AND q.id != ?' : ''}
    `, excludeId ? [excludeId] : []);
  } catch (_) {
    existingDc = [];
  }

  for (const c of existingDc) {
    const existingRawTitle = String(c.title || '').trim();
    const existingCleanTitle = stripVariantIdentifiers(existingRawTitle);
    const existingNormTitle = existingCleanTitle.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Layer 1: Exact Clean Base Title match
    if (existingNormTitle === normTitle) {
      return {
        isDuplicate: true,
        reason: `A Daily Challenge with equivalent title "${c.title}" already exists (ID: ${c.id}).`,
        duplicateOf: c,
        layer: 1
      };
    }

    // Layer 2: Problem Concept & Signature match
    const existingConcept = c.problem_concept || extractProblemConcept(existingCleanTitle, c.description || '');
    if (existingConcept && candidateConcept && existingConcept === candidateConcept) {
      return {
        isDuplicate: true,
        reason: `Problem concept collision with Daily Challenge "${c.title}" (Concept: ${candidateConcept}).`,
        duplicateOf: c,
        layer: 2
      };
    }

    const existingSig = c.problem_signature || generateProblemSignature(c);
    if (existingSig && candidateSignature && existingSig === candidateSignature) {
      return {
        isDuplicate: true,
        reason: `Algorithmic problem signature collision with Daily Challenge "${c.title}" (Signature: ${existingSig}).`,
        duplicateOf: c,
        layer: 2
      };
    }

    // Layer 3: Semantic Concept Token Similarity
    const sim = computeSemanticSimilarity(cleanTitle, existingCleanTitle);
    if (sim.sharedCount >= 2 && (sim.overlap >= 0.70 || sim.jaccard >= 0.50)) {
      return {
        isDuplicate: true,
        reason: `Semantic concept collision with Daily Challenge "${c.title}" (Similarity: ${Math.round(sim.overlap * 100)}%).`,
        duplicateOf: c,
        layer: 3
      };
    }

    // Layer 3b: Substring / Root Concept containment (word-boundary matched)
    const wordsCandidate = cleanTitle.toLowerCase().split(/\s+/).filter(w => !STOP_WORDS.has(w) && !/^\d+$/.test(w));
    const wordsExisting = existingCleanTitle.toLowerCase().split(/\s+/).filter(w => !STOP_WORDS.has(w) && !/^\d+$/.test(w));
    if (wordsCandidate.length >= 2 && wordsExisting.length >= 2) {
      const candStr = wordsCandidate.join(' ');
      const existStr = wordsExisting.join(' ');
      if (candStr === existStr || existStr.startsWith(candStr + ' ') || candStr.startsWith(existStr + ' ')) {
        return {
          isDuplicate: true,
          reason: `Root algorithmic concept overlaps with Daily Challenge "${c.title}".`,
          duplicateOf: c,
          layer: 3
        };
      }
    }
  }

  // 2. Check Practice questions repository
  try {
    const existingQuestions = await getRepo().many(`
      SELECT id, title, description, problem_signature, problem_concept
      FROM questions
      WHERE is_active = TRUE ${excludeId ? 'AND id != ?' : ''}
    `, excludeId ? [excludeId] : []);

    for (const q of existingQuestions) {
      const qRawTitle = String(q.title || '').trim();
      const qCleanTitle = stripVariantIdentifiers(qRawTitle);
      const qNormTitle = qCleanTitle.toLowerCase().replace(/[^a-z0-9]/g, '');

      // Layer 1: Exact Clean Base Title
      if (qNormTitle === normTitle) {
        return {
          isDuplicate: true,
          reason: `A Practice problem with title "${q.title}" already exists in the question bank (ID: ${q.id}).`,
          duplicateOf: q,
          layer: 1
        };
      }

      // Layer 2: Signature
      const qSig = q.problem_signature || generateProblemSignature(q);
      if (qSig && candidateSignature && qSig === candidateSignature) {
        return {
          isDuplicate: true,
          reason: `Problem signature collides with Practice question "${q.title}".`,
          duplicateOf: q,
          layer: 2
        };
      }

      // Layer 3: Semantic Similarity
      const sim = computeSemanticSimilarity(cleanTitle, qCleanTitle);
      if (sim.sharedCount >= 2 && (sim.overlap >= 0.70 || sim.jaccard >= 0.50)) {
        return {
          isDuplicate: true,
          reason: `Semantic collision with Practice question "${q.title}".`,
          duplicateOf: q,
          layer: 3
        };
      }
    }
  } catch (_) {
    // Continue safely if questions table query fails
  }

  return { isDuplicate: false };
}

/**
 * Validate schema and contract fields
 */
function validateQuestionContract(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: ['Invalid question payload'] };
  }

  if (!data.title || String(data.title).trim().length < 4) {
    errors.push('Title must be at least 4 characters long.');
  }

  const difficulty = String(data.difficulty || '').toLowerCase();
  if (!['easy', 'medium', 'hard'].includes(difficulty)) {
    errors.push('Difficulty must be easy, medium, or hard.');
  }

  if (!data.description || String(data.description).trim().length < 15) {
    errors.push('Problem description must provide clear problem specifications (min 15 characters).');
  }

  if (!data.constraints || String(data.constraints).trim().length < 3) {
    errors.push('Constraints must be specified for algorithmic clarity.');
  }

  if (!data.starter_code || typeof data.starter_code !== 'object') {
    errors.push('starter_code must be an object containing language templates.');
  } else {
    for (const lang of ['javascript', 'python']) {
      if (!data.starter_code[lang] || typeof data.starter_code[lang] !== 'string' || !data.starter_code[lang].trim()) {
        errors.push(`starter_code must include non-empty code for ${lang}.`);
      }
    }
  }

  if (!data.reference_solution || typeof data.reference_solution !== 'object') {
    errors.push('reference_solution must be an object containing executable solutions.');
  } else {
    for (const lang of ['javascript', 'python']) {
      if (!data.reference_solution[lang] || typeof data.reference_solution[lang] !== 'string' || !data.reference_solution[lang].trim()) {
        errors.push(`reference_solution must include non-empty solution for ${lang}.`);
      }
    }
  }

  const testCases = Array.isArray(data.test_cases) ? data.test_cases : [];
  if (testCases.length < 2) {
    errors.push('At least 2 test cases (public and hidden) are required.');
  }

  let hasPublic = false;
  let hasHidden = false;

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    if (tc.input === undefined || tc.expected_output === undefined || String(tc.input).trim() === '' || String(tc.expected_output).trim() === '') {
      errors.push(`Test case #${i + 1} must include both non-empty input and expected output.`);
    }
    if (tc.is_hidden) hasHidden = true;
    else hasPublic = true;
  }

  if (testCases.length >= 2 && (!hasPublic || !hasHidden)) {
    if (!hasHidden && testCases.length > 1) {
      testCases[testCases.length - 1].is_hidden = true;
    }
  }

  const hints = Array.isArray(data.hints) ? data.hints : [];
  for (const h of hints) {
    if (/the answer is/i.test(String(h)) || /return true immediately/i.test(String(h))) {
      errors.push('Hints should guide the student progressively without directly giving away trivial answers.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate starter code for completeness, signature, and no solution leakage across ALL supported languages.
 * Every supported language must have valid starter code:
 *   - Non-empty starter_code
 *   - Expected function signature name present
 *   - Clear TODO instruction comment present
 *   - Incomplete / no reference solution leakage
 *   - Problem-specific (no generic placeholders like 'def solve(): pass')
 */
function validateStarterCode(solutions, contract) {
  const errors = [];
  const warnings = [];
  const functionName = contract?.function_signature?.name;

  /**
   * Detect a TODO instruction in starter code regardless of comment style.
   * Accepts: TODO:, TODO , todo:, // TODO, # TODO, /* TODO
   */
  function hasTodoComment(code) {
    return /todo[\s:]/i.test(code) || /\/\/\s*todo/i.test(code) || /#\s*todo/i.test(code) || /\/\*\s*todo/i.test(code);
  }

  for (const lang of SUPPORTED_LANGUAGES) {
    const starter = solutions?.starter_code?.[lang];
    const ref = solutions?.reference_solution?.[lang];

    if (!starter || typeof starter !== 'string' || !starter.trim()) {
      errors.push(`[${lang}] Missing or empty starter_code`);
      continue;
    }

    if (!hasTodoComment(starter)) {
      errors.push(`[${lang}] Starter code missing TODO instruction comment`);
    }

    if (functionName && !starter.includes(functionName)) {
      errors.push(`[${lang}] Starter code does not contain function signature name '${functionName}'`);
    }

    // Leak check: check if starter contains the complete reference solution
    if (ref && typeof ref === 'string' && ref.trim().length > 30) {
      const cleanStarter = starter.replace(/\s+/g, '');
      const cleanRef = ref.replace(/\s+/g, '');
      if (cleanStarter.includes(cleanRef)) {
        errors.push(`[${lang}] Starter code appears to contain the complete reference solution.`);
      }
    }

    // Generic placeholder check: reject generic solve() or empty pass when signature is distinct
    if (/def\s+solve\s*\(\s*\)\s*:\s*pass/i.test(starter) && functionName && functionName !== 'solve') {
      errors.push(`[${lang}] Starter code contains generic placeholder solve() instead of function '${functionName}'`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Fetch recently used taxonomy and problem concepts to enforce rotational diversity
 */
async function getRecentTaxonomyHistory(limit = 15) {
  try {
    const recent = await getRepo().many(`
      SELECT q.title, q.topic_id, dcm.custom_topic, q.pattern_id, dcm.problem_concept
      FROM daily_challenge_metadata dcm
      JOIN questions q ON dcm.question_id = q.id
      WHERE dcm.status != 'archived' AND q.is_active = TRUE
      ORDER BY dcm.created_at DESC
      LIMIT ?
    `, [limit]);

    const recentTitles = recent.map(r => stripVariantIdentifiers(r.title)).filter(Boolean);
    const recentConcepts = recent.map(r => r.problem_concept || extractProblemConcept(r.title)).filter(Boolean);

    return {
      recentTitles,
      recentConcepts
    };
  } catch (_) {
    return { recentTitles: [], recentConcepts: [] };
  }
}

/**
 * Maximum number of regeneration attempts when a candidate is rejected as duplicate
 */
const MAX_REGENERATION_ATTEMPTS = Number(process.env.NOVELTY_MAX_REGENERATION_ATTEMPTS) || 3;

/**
 * Generate a Canonical AI Question
 * 
 * Centralized, authoritative pipeline used by both Daily Challenge and Question Bank.
 * 
 * Phases:
 * 1. Topic & Pattern Selection + Taxonomy History
 * 2. Pre-LLM RAG Retrieval (Top-K Similar Questions from corpus)
 * 3. Prompt Construction & Multi-step LLM Generation:
 *    - Problem Contract
 *    - Test Cases
 *    - Starter Code & Reference Solutions (all 6 languages)
 *    - Progressive Hints
 * 4. Structural Schema Validation
 * 5. Starter Code Scaffolding & Leak Validation
 * 6. Reference Solution Sandbox Verification
 * 7. Post-LLM Embedding Novelty Check:
 *    - NOVEL -> Accepted
 *    - BORDERLINE -> Structural/Token duplicate verification
 *    - DUPLICATE -> Rejected (triggers regeneration if retries remain)
 *    - UNAVAILABLE -> Safe fail-closed rejection
 * 8. Structural Token/Signature Duplicate Check
 * 9. Assemble and return Canonical Question Object
 */
async function generateCanonicalQuestion(options = {}) {
  const {
    topic = null,
    difficulty = 'medium',
    pattern = null,
    destination = 'daily_challenge'
  } = options;

  const normDifficulty = ['easy', 'medium', 'hard'].includes(String(difficulty).toLowerCase())
    ? String(difficulty).toLowerCase()
    : 'medium';

  let targetTopic = topic && topic !== 'Surprise Me' ? topic : null;
  let targetPattern = pattern;

  // Race condition protection: process-local mutex
  const mutexKey = `gen:${targetTopic || 'any'}:${normDifficulty}:${targetPattern || 'any'}`;
  if (generationMutex.has(mutexKey)) {
    console.warn(`[Pipeline] Mutex contention: waiting for concurrent generation on ${mutexKey}`);
    await generationMutex.get(mutexKey);
  }

  let releaseMutex;
  const mutexPromise = new Promise((resolve) => {
    releaseMutex = resolve;
  });
  generationMutex.set(mutexKey, mutexPromise);

  try {
    return await _generateCanonicalQuestionInternal(options);
  } finally {
    generationMutex.delete(mutexKey);
    if (releaseMutex) releaseMutex();
  }
}

async function _generateCanonicalQuestionInternal(options = {}) {
  const {
    title = null,
    description = null,
    constraints = null,
    topic = null,
    difficulty = 'medium',
    pattern = null,
    points = null,
    instructions = null,
    scheduled_date = null,
    generation_slot = null,
    destination = 'daily_challenge',
    skipSandbox = false,
    _regenerationAttempt = 0,
    _rejectedTitles = []       // accumulated rejected problem titles across retries
  } = options;

  const normDifficulty = ['easy', 'medium', 'hard'].includes(String(difficulty).toLowerCase())
    ? String(difficulty).toLowerCase()
    : 'medium';

  let targetTopic = topic && topic !== 'Surprise Me' ? topic : null;
  let targetPattern = pattern;
  let recommendationReason = null;

  // Topic auto-recommendation if not provided
  if (!targetTopic) {
    try {
      const rec = await recommendTopicForDailyChallenge({ difficulty: normDifficulty });
      targetTopic = rec.topic_name;
      targetPattern = rec.pattern_name || pattern;
      recommendationReason = rec.reason;
    } catch (_) {
      targetTopic = 'Arrays';
      targetPattern = pattern || 'Two Pointers';
    }
  }

  const defaultPoints = normDifficulty === 'hard' ? 150 : normDifficulty === 'medium' ? 100 : 50;
  const finalPoints = Number(points) > 0 ? Number(points) : defaultPoints;

  // Retrieve recently used problem concepts to exclude
  const { recentTitles } = await getRecentTaxonomyHistory(12);

  // ============================================================
  // PHASE 1: Pre-LLM RAG Novelty Retrieval
  // ============================================================
  let noveltyExclusionText = '';
  let preLLMRetrievalResult = null;

  try {
    preLLMRetrievalResult = await noveltyService.preLLMRetrieval({
      title,
      description,
      topic: targetTopic,
      pattern: targetPattern,
      difficulty: normDifficulty
    });

    if (preLLMRetrievalResult?.exclusionContext) {
      noveltyExclusionText = preLLMRetrievalResult.exclusionContext;
    }
  } catch (noveltyErr) {
    console.warn('[Pipeline] Pre-LLM retrieval failed (continuing without embedding exclusion):', noveltyErr.message);
  }

  // Combine token exclusion with embedding exclusion
  // Also include any titles that were rejected during previous retry attempts in this call chain
  const rejectedTitleText = _rejectedTitles.length > 0
    ? `\n\nPREVIOUSLY REJECTED (do NOT regenerate these problems or any variant):\n${_rejectedTitles.map(t => `- "${t}"`).join('\n')}`
    : '';
  const tokenExclusionText = recentTitles.length > 0
    ? `\n\nEXCLUSION LIST (DO NOT GENERATE OR CREATE VARIANTS OF THESE):\n${recentTitles.map(t => `- ${t}`).join('\n')}`
    : '';
  const combinedExclusionText = tokenExclusionText + noveltyExclusionText + rejectedTitleText;

  // ============================================================
  // PHASE 2 & 3: LLM Generation (Contract, Test Cases, Solutions, Hints)
  // ============================================================
  let contract;
  let testCases;
  let solutions;
  let hints;

  try {
    // 1. Generate Problem Contract
    contract = await aiQuestionService.generateContract({
      title,
      topic: targetTopic,
      pattern: targetPattern || 'Appropriate for topic',
      difficulty: normDifficulty,
      description,
      constraints,
      exclusionText: combinedExclusionText,
      instructions: instructions || 'Ensure clean specifications, edge cases, progressive hints, and a verified reference solution.'
    });

    // 2. Generate Test Cases
    testCases = await aiQuestionService.generateTestCasesForContract(contract, 4);

    // 3. Generate Solutions (Starter Code + Reference Solution for 6 languages)
    const MAX_SOLUTION_ATTEMPTS = 2;
    let feedbackErrors = [];
    
    for (let attempt = 1; attempt <= MAX_SOLUTION_ATTEMPTS; attempt++) {
      try {
        solutions = await aiQuestionService.generateSolutionsForContract(contract, testCases, feedbackErrors);
        if (!skipSandbox) {
          solutions = await aiQuestionService.validateAllSolutions(contract, testCases, solutions);
        }
        break; // Validation succeeded
      } catch (valErr) {
        if (valErr.code === 'AI_VALIDATION_ERROR' && attempt < MAX_SOLUTION_ATTEMPTS) {
          console.warn(`[Pipeline] Sandbox validation failed on attempt ${attempt}, retrying with error feedback...`);
          feedbackErrors = [valErr.message];
          continue;
        }
        throw valErr; // Exhausted attempts or other error
      }
    }

    // 4. Generate Hints
    try {
      hints = await aiQuestionService.generateHintsForContract(contract);
    } catch (_) {
      hints = [
        "Carefully analyze the problem constraints and boundary inputs.",
        "Consider standard optimal algorithmic patterns for this data structure.",
        "Implement cleanly and test against edge cases."
      ];
    }
  } catch (genErr) {
    if (genErr instanceof PipelineError) throw genErr;
    if (_regenerationAttempt < MAX_REGENERATION_ATTEMPTS) {
      console.warn(`[Pipeline] Generation failed (attempt ${_regenerationAttempt + 1}/${MAX_REGENERATION_ATTEMPTS}), retrying: ${genErr.message}`);
      return _generateCanonicalQuestionInternal({
        ...options,
        _regenerationAttempt: _regenerationAttempt + 1,
        _rejectedTitles
      });
    }
    throw new PipelineError(`AI Generation failed: ${genErr.message}`, 422, ERROR_CODES.GENERATION_FAILED);
  }

  // ============================================================
  // PHASE 4: Canonical Candidate Construction & Schema Validation
  // ============================================================
  const isDailyChallenge = destination !== 'question_bank';
  const cleanTitle = stripVariantIdentifiers(contract.title);
  const candidateSlug = generateSlug(cleanTitle);

  const finalTopic = contract.topic || targetTopic || 'Arrays';
  const finalPattern = contract.pattern || targetPattern || 'Two Pointers';
  const finalTopicId = contract.topic_id || (targetTopic ? String(targetTopic).toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'arrays');
  const finalPatternId = contract.pattern_id || (targetPattern ? String(targetPattern).toLowerCase().replace(/[^a-z0-9]+/g, '-') : null);

  const candidate = {
    title: cleanTitle,
    topic: finalTopic,
    pattern: finalPattern,
    difficulty: contract.difficulty || normDifficulty,
    slug: candidateSlug,
    topic_id: finalTopicId,
    pattern_id: finalPatternId,
    description: contract.description,
    problem_statement: contract.problem_statement || contract.description,
    constraints: contract.constraints,
    input_format: contract.input_format,
    output_format: contract.output_format,
    examples: contract.examples || [],
    example_input: contract.examples?.[0]?.input || '',
    example_output: contract.examples?.[0]?.output || contract.examples?.[0]?.expected_output || '',
    hints: hints || [],
    starter_code: solutions.starter_code,
    reference_solution: solutions.reference_solution,
    editorial: solutions.solution_approach || '',
    solution_approach: solutions.solution_approach || '',
    complexity: solutions.complexity || '',
    test_cases: testCases,
    supported_languages: SUPPORTED_LANGUAGES,
    points: finalPoints,
    estimated_time: '30 mins',
    created_via: 'ai',
    status: isDailyChallenge ? 'draft' : 'published',
    scheduled_date: isDailyChallenge ? (scheduled_date || null) : undefined,
    is_practice: !isDailyChallenge,
    generation_slot: !isDailyChallenge ? generation_slot : undefined
  };

  candidate.problem_concept = extractProblemConcept(candidate.title, candidate.description);
  candidate.problem_signature = generateProblemSignature(candidate);
  if (recommendationReason) candidate.recommendation_reason = recommendationReason;

  // Schema Validation
  const contractVal = validateQuestionContract(candidate);
  if (!contractVal.isValid) {
    if (_regenerationAttempt < MAX_REGENERATION_ATTEMPTS) {
      console.warn(`[Pipeline] Schema validation failed (attempt ${_regenerationAttempt + 1}/${MAX_REGENERATION_ATTEMPTS}): ${contractVal.errors.join(', ')}`);
      return _generateCanonicalQuestionInternal({
        ...options,
        _regenerationAttempt: _regenerationAttempt + 1,
        _rejectedTitles: candidate.title ? [..._rejectedTitles, candidate.title] : _rejectedTitles
      });
    }
    throw new PipelineError(`INVALID_STRUCTURE: ${contractVal.errors.join(', ')}`, 422, ERROR_CODES.VALIDATION_FAILED);
  }

  // Starter Code Validation (Required quality gate for all supported languages)
  const starterVal = validateStarterCode(solutions, contract);
  if (!starterVal.isValid) {
    if (_regenerationAttempt < MAX_REGENERATION_ATTEMPTS) {
      console.warn(`[Pipeline] Starter code validation failed (attempt ${_regenerationAttempt + 1}/${MAX_REGENERATION_ATTEMPTS}): ${starterVal.errors.join(', ')}`);
      return _generateCanonicalQuestionInternal({
        ...options,
        _regenerationAttempt: _regenerationAttempt + 1,
        _rejectedTitles: candidate.title ? [..._rejectedTitles, candidate.title] : _rejectedTitles
      });
    }
    throw new PipelineError(`STARTER_CODE_INVALID: ${starterVal.errors.join(', ')}`, 422, ERROR_CODES.STARTER_CODE_INVALID);
  }

  // ============================================================
  // PHASE 5: Token-based & Structural Duplicate Check
  // ============================================================
  const dupCheck = await checkDuplicateProblem(candidate);
  if (dupCheck.isDuplicate) {
    if (_regenerationAttempt < MAX_REGENERATION_ATTEMPTS) {
      const rejectedTitle = candidate.title;
      console.warn(`[Pipeline] Duplicate collision detected (attempt ${_regenerationAttempt + 1}/${MAX_REGENERATION_ATTEMPTS}): ${dupCheck.reason}`);
      return _generateCanonicalQuestionInternal({
        ...options,
        _regenerationAttempt: _regenerationAttempt + 1,
        _rejectedTitles: [..._rejectedTitles, rejectedTitle]
      });
    }
    throw new PipelineError(`DUPLICATE_PROBLEM: ${dupCheck.reason}`, 409, ERROR_CODES.DUPLICATE_PROBLEM);
  }

  // ============================================================
  // PHASE 6: Post-LLM Embedding Novelty Check
  // ============================================================
  let noveltyClassification = 'NOVEL';
  let noveltyResult = null;

  try {
    noveltyResult = await noveltyService.postLLMDuplicateCheck(candidate);
    noveltyClassification = noveltyResult.classification;

    if (noveltyClassification === 'DUPLICATE') {
      if (_regenerationAttempt < MAX_REGENERATION_ATTEMPTS) {
        const rejectedTitle = candidate.title;
        console.warn(`[Pipeline] Post-LLM DUPLICATE detected (attempt ${_regenerationAttempt + 1}/${MAX_REGENERATION_ATTEMPTS}): ${noveltyResult.reason}`);
        return _generateCanonicalQuestionInternal({
          ...options,
          _regenerationAttempt: _regenerationAttempt + 1,
          _rejectedTitles: [..._rejectedTitles, rejectedTitle]
        });
      }
      throw new PipelineError(`SEMANTIC_DUPLICATE: ${noveltyResult.reason}`, 409, ERROR_CODES.DUPLICATE_PROBLEM);
    }

    if (noveltyClassification === 'UNAVAILABLE') {
      console.error(`[Pipeline] Post-LLM UNAVAILABLE — rejecting candidate: ${noveltyResult.reason}`);
      throw new PipelineError(`NOVELTY_VALIDATION_UNAVAILABLE: ${noveltyResult.reason}`, 422, ERROR_CODES.NOVELTY_CHECK_FAILED);
    }

    if (noveltyClassification === 'BORDERLINE') {
      console.warn(`[Pipeline] BORDERLINE similarity detected: ${noveltyResult.reason}`);
      // Re-run structural duplicate check against top matching problems
      const borderlineDup = await checkDuplicateProblem(candidate);
      if (borderlineDup.isDuplicate) {
        throw new PipelineError(`BORDERLINE_DUPLICATE_REJECTED: ${borderlineDup.reason}`, 409, ERROR_CODES.DUPLICATE_PROBLEM);
      }
    }
  } catch (noveltyErr) {
    if (noveltyErr instanceof PipelineError) throw noveltyErr;
    console.error('[Pipeline] Post-LLM novelty check failed (fail-closed):', noveltyErr.message);
    throw new PipelineError(`NOVELTY_VALIDATION_UNAVAILABLE: ${noveltyErr.message}`, 422, ERROR_CODES.NOVELTY_CHECK_FAILED);
  }

  // Attach novelty observability
  candidate._novelty = {
    classification: noveltyClassification,
    maxSimilarity: noveltyResult?.maxSimilarity || 0,
    similarQuestionsFound: noveltyResult?.similarQuestions?.length || 0,
    preLLMSimilarCount: preLLMRetrievalResult?.similarCount || 0,
    embeddingAvailable: noveltyResult?.embeddingAvailable || false
  };

  candidate.sandbox_verified = false;

  return {
    success: true,
    data: candidate,
    source: 'llm-centralized-pipeline'
  };
}

module.exports = {
  generateCanonicalQuestion,
  generateUniqueProblem: generateCanonicalQuestion,
  validateQuestionContract,
  validateStarterCode,
  checkDuplicateProblem,
  extractProblemConcept,
  generateProblemSignature,
  stripVariantIdentifiers,
  computeSemanticSimilarity,
  ERROR_CODES,
  PipelineError,
  TOPIC_NAMES,
  SUPPORTED_LANGUAGES,
  MAX_REGENERATION_ATTEMPTS
};
