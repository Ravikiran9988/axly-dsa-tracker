const { getRepository } = require('../db/repositoryFactory');
const { AppError } = require('../middleware/errorHandler');
const llmRouter = require('./llm/llmRouter');
const { executeCode, normalizeOutput } = require('./executionService');
const { getCanonicalUtcDate } = require('../utils/dateUtils');
const { generateQuestion } = require('./aiQuestionService');

function getRepo() {
  return getRepository();
}

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
  'problem', 'challenge', 'algorithm', 'function', 'solution'
]);

const GENERIC_DSA_TERMS = new Set([
  'array', 'arrays', 'string', 'strings', 'matrix', 'tree', 'trees', 'node', 'nodes',
  'graph', 'graphs', 'list', 'lists', 'subarray', 'subarrays', 'substring', 'substrings',
  'path', 'paths', 'problem', 'challenge', 'grid'
]);

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
    .replace(/[^a-z0-9\s]/g, ' ')
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
    .replace(/^-|-$/g, '') || `dc-${Date.now()}`;
}

/**
 * Check whether a challenge with similar concept or title already exists
 * Checks daily_challenge_metadata AND questions (Practice)
 * Multi-layer detection:
 * Layer 1: Clean base title comparison (after stripping variant identifiers)
 * Layer 2: Structured Problem Signature match
 * Layer 3: Semantic Concept Token Overlap (Jaccard > 0.65 or Overlap > 0.80)
 */
async function checkDuplicateChallenge(candidate, description = '', excludeId = null) {
  const candidateData = typeof candidate === 'object' && candidate !== null
    ? candidate
    : { title: candidate, description: description || '' };

  const rawTitle = String(candidateData.title || '').trim();
  const cleanTitle = stripVariantIdentifiers(rawTitle);
  const normTitle = cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (!normTitle) return { isDuplicate: false };

  const candidateSignature = candidateData.problem_signature || generateProblemSignature(candidateData);
  const candidateConcept = extractProblemConcept(cleanTitle, candidateData.description || '');

  // 1. Check daily challenge metadata and questions (all non-archived: draft, scheduled, published)
  const existingDc = await getRepo().many(`
    SELECT q.id, q.title, q.description, dcm.status, dcm.scheduled_date, q.problem_signature, q.problem_concept
    FROM daily_challenge_metadata dcm
    JOIN questions q ON dcm.question_id = q.id
    WHERE dcm.status != 'archived' AND q.is_active = TRUE ${excludeId ? 'AND q.id != ?' : ''}
  `, excludeId ? [excludeId] : []);

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

    // Layer 3b: Substring / Root Concept containment (only if sufficiently distinct and not single word)
    if (cleanTitle.split(/\s+/).length >= 3 && existingCleanTitle.split(/\s+/).length >= 3) {
      if (normTitle.includes(existingNormTitle) || existingNormTitle.includes(normTitle)) {
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
      SELECT id, title, description 
      FROM questions
      WHERE is_active = TRUE OR is_active = TRUE
    `);

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
      const qSig = generateProblemSignature(q);
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
 * Validate a candidate Daily Challenge definition
 */
function validateDailyChallenge(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: ['Invalid challenge payload'] };
  }

  if (!data.starter_code || typeof data.starter_code !== 'object' || !data.starter_code.javascript || !data.starter_code.python) {
    errors.push('starter_code must be a dictionary containing at least javascript and python keys.');
  }

  if (!data.reference_solution || typeof data.reference_solution !== 'object' || !data.reference_solution.python) {
    errors.push('reference_solution must be a dictionary containing at least a python key.');
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
    errors.push('Constraints must be specified for competitive clarity.');
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
 * Verify candidate challenge solution in the Sandbox
 */
async function verifyReferenceSolution(challengeData) {
  const { test_cases = [], reference_solution, driver_code, starter_code } = challengeData;

  if (!Array.isArray(test_cases) || test_cases.length === 0) {
    return { verified: false, reason: 'No test cases provided for sandbox execution' };
  }

  let codeToRun = null;
  let lang = 'javascript';
  const codeSrc = reference_solution || starter_code;
  if (codeSrc && typeof codeSrc === 'object') {
    if (codeSrc.javascript) {
      codeToRun = codeSrc.javascript;
      lang = 'javascript';
    } else if (codeSrc.python) {
      codeToRun = codeSrc.python;
      lang = 'python';
    } else if (codeSrc.java) {
      codeToRun = codeSrc.java;
      lang = 'java';
    }
  } else {
    codeToRun = codeSrc;
  }

  if (!codeToRun || typeof codeToRun !== 'string' || codeToRun.trim().length === 0) {
    return { verified: false, reason: 'No reference solution or starter code provided for verification' };
  }

  const fullCode = driver_code
    ? `${codeToRun}\n\n${driver_code}`
    : codeToRun;

  try {
    const execResult = await executeCode({
      language: lang,
      sourceCode: fullCode,
      testCases: test_cases
    });

    const isVerified = execResult.status === 'Accepted' || (execResult.passed_tests === test_cases.length && execResult.passed_tests > 0);
    return {
      verified: isVerified,
      total_tests: test_cases.length,
      passed_tests: execResult.passed_tests || 0,
      failed_tests: (test_cases.length - (execResult.passed_tests || 0)),
      reason: !isVerified ? `Sandbox execution failed with status: ${execResult.status}` : null
    };
  } catch (err) {
    return {
      verified: false,
      total_tests: test_cases.length,
      passed_tests: 0,
      failed_tests: test_cases.length,
      reason: `Sandbox execution failed: ${err.message}`
    };
  }
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
 * Generate an AI Problem with rotational diversity and concept-level uniqueness
 * Destination can be 'daily_challenge' (default) or 'question_bank'.
 */
async function generateUniqueProblem(options = {}) {
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
    skipSandbox = false
  } = options;

  const normDifficulty = ['easy', 'medium', 'hard'].includes(String(difficulty).toLowerCase())
    ? String(difficulty).toLowerCase()
    : 'medium';

  let targetTopic = topic && topic !== 'Surprise Me' ? topic : null;
  let targetPattern = pattern;
  let recommendationReason = null;

  // Retrieve recently used problem concepts to exclude
  const { recentTitles, recentConcepts } = await getRecentTaxonomyHistory(12);

  if (!targetTopic) {
    const { recommendTopicForDailyChallenge } = require('./topicService');
    const rec = await recommendTopicForDailyChallenge({ difficulty: normDifficulty });
    targetTopic = rec.topic_name;
    targetPattern = rec.pattern_name || pattern;
    recommendationReason = rec.reason;
  }

  const defaultPoints = normDifficulty === 'hard' ? 150 : normDifficulty === 'medium' ? 100 : 50;
  const finalPoints = Number(points) > 0 ? Number(points) : defaultPoints;

  // 1. Try LLM Router with strict Anti-Variant & Exclusion Instructions
  try {
    const exclusionText = recentTitles.length > 0
      ? `\n\nEXCLUSION LIST (DO NOT GENERATE OR CREATE VARIANTS OF THESE):\n${recentTitles.map(t => `- ${t}`).join('\n')}`
      : '';

    const generatedQuestion = await generateQuestion({
      title,
      description,
      constraints,
      topic: targetTopic,
      difficulty: normDifficulty,
      count: 4,
      pattern: targetPattern || 'Appropriate for topic',
      exclusionText,
      instructions: instructions || 'Ensure clean specifications, edge cases, progressive hints, and a verified reference solution.',
      skipSandbox,
      is_fallback_allowed: false
    });

    if (generatedQuestion) {
      const isDailyChallenge = options.destination !== 'question_bank';
      const parsed = {
        ...generatedQuestion,
        editorial: generatedQuestion.solution_approach, // for compatibility
        slug: generateSlug(stripVariantIdentifiers(generatedQuestion.title)),
        title: stripVariantIdentifiers(generatedQuestion.title),
        created_via: 'ai',
        status: isDailyChallenge ? 'draft' : 'published', // QB defaults to published
        scheduled_date: isDailyChallenge ? (scheduled_date || null) : undefined,
        points: finalPoints,
        topic: targetTopic,
        pattern: targetPattern || generatedQuestion.pattern || 'Pattern Name'
      };
      
      if (!isDailyChallenge) {
        parsed.is_practice = true;
        if (options.generation_slot) {
          parsed.generation_slot = options.generation_slot;
        }
      }
      
      parsed.problem_concept = extractProblemConcept(parsed.title, parsed.description);
      parsed.problem_signature = generateProblemSignature(parsed);
      if (recommendationReason) parsed.recommendation_reason = recommendationReason;

      const val = validateDailyChallenge(parsed);
      if (!val.isValid) {
        throw new AppError(`INVALID_STRUCTURE: ${val.errors.join(', ')}`, 422, 'AI_VALIDATION_ERROR');
      }

      const dupCheck = await checkDuplicateChallenge(parsed);
      if (dupCheck.isDuplicate) {
        throw new AppError(`DUPLICATE_PROBLEM: ${dupCheck.reason}`, 409, 'DUPLICATE_COLLISION');
      }

      if (!skipSandbox && parsed.reference_solution) {
        const sbResult = await verifyReferenceSolution(parsed);
        parsed.sandbox_verified = sbResult.verified;
        if (!sbResult.verified) {
          throw new AppError(`SANDBOX_VERIFICATION_FAILED: ${sbResult.reason}`, 422, 'SANDBOX_VERIFICATION_FAILED');
        }
      }
      
      return { success: true, data: parsed, source: `llm-unified` };
    }
    throw new Error("AI generated problem failed structure validation, duplication check, or sandbox verification.");
  } catch (err) {
    console.error("AI Generation pipeline explicitly rejected the problem:", err.message);
    throw Object.assign(new Error(`AI Generation validation failed: ${err.message}`), { statusCode: err.statusCode || 422, code: err.code || 'AI_VALIDATION_ERROR' });
  }
}

module.exports = {
  generateUniqueProblem,
  validateDailyChallenge,
  checkDuplicateChallenge,
  verifyReferenceSolution,
  generateProblemSignature,
  extractProblemConcept,
  stripVariantIdentifiers,
  computeSemanticSimilarity,
  TOPIC_NAMES
};
