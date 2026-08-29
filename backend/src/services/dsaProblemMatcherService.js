const { getRepository } = require('../db/repositoryFactory');
const knowledgeGraph = require('./dsaKnowledgeGraphService');

function getRepo() {
  return getRepository();
}

function safeParseJson(value, fallback = null) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

function parseHints(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || trimmed === '[]') return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
      if (typeof parsed === 'string' && parsed.trim()) return [parsed.trim()];
    } catch {
      return [trimmed];
    }
  }
  return [];
}

/**
 * Tokenize and normalize string for token matching
 */
function tokenize(str) {
  if (!str) return [];
  return String(str)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1 && !['how', 'do', 'i', 'the', 'a', 'an', 'in', 'to', 'for', 'of', 'and', 'with', 'what', 'is', 'can', 'you', 'give', 'me', 'solve', 'solution', 'problem', 'question'].includes(t));
}

/**
 * Calculate Jaccard token overlap similarity (0.0 to 1.0)
 */
function calculateTokenOverlap(queryTokens, targetTokens) {
  if (!queryTokens.length || !targetTokens.length) return 0;
  const targetSet = new Set(targetTokens);
  const matchCount = queryTokens.filter(t => targetSet.has(t)).length;
  return matchCount / Math.max(queryTokens.length, targetTokens.length);
}

class DsaProblemMatcherService {
  /**
   * Search and match a DSA problem against the database
   * @param {string} queryText 
   * @param {object} [hints] - optional hints such as topic or problemId
   * @returns {Promise<{ matched: boolean, confidence: number, problemId?: string, title?: string, slug?: string, difficulty?: string, topic?: string, topicId?: string, pattern?: string, patternId?: string, prerequisites?: string[], solutionApproach?: string, hints?: string[], points?: number }>}
   */
  async matchProblem(queryText, hints = {}) {
    if (!queryText || typeof queryText !== 'string' || !queryText.trim()) {
      return { matched: false, confidence: 0 };
    }

    const raw = queryText.trim();
    const cleanedLower = raw.toLowerCase();
    const queryTokens = tokenize(raw);

    // 1. Direct ID match check (arr-01, q-two-sum, str-02, dc-002, etc.)
    const idMatch = raw.match(/\b([a-z]{2,4}-[0-9]{1,4}|q-[a-z0-9-]+|dc-[a-z0-9-]+)\b/i);
    if (idMatch) {
      const explicitId = idMatch[1].toLowerCase();
      const directProblem = await this.fetchProblemById(explicitId);
      if (directProblem) {
        return {
          matched: true,
          confidence: 1.0,
          ...directProblem
        };
      }
    }

    // 2. Fetch all active candidate problems from questions and daily_challenge_problems
    const candidates = await this.getAllCandidateProblems();

    let bestMatch = null;
    let highestScore = 0;

    for (const p of candidates) {
      let score = 0;
      const titleLower = String(p.title || '').toLowerCase();
      const slugLower = String(p.slug || '').toLowerCase();
      const titleTokens = tokenize(p.title);

      // Exact title match in text
      if (cleanedLower.includes(titleLower) && titleLower.length > 3) {
        const titleWeight = Math.min(1.0, 0.85 + (titleLower.length / 50));
        score = Math.max(score, titleWeight);
      }

      // Exact slug match in text
      if (cleanedLower.includes(slugLower) && slugLower.length > 3) {
        score = Math.max(score, 0.90);
      }

      // Exact problem ID substring
      if (cleanedLower.includes(p.id.toLowerCase())) {
        score = Math.max(score, 0.98);
      }

      // Title token overlap
      if (titleTokens.length > 0 && queryTokens.length > 0) {
        const titleOverlap = calculateTokenOverlap(queryTokens, titleTokens);
        if (titleOverlap > 0.4) {
          score = Math.max(score, 0.50 + (titleOverlap * 0.45));
        }
      }

      // Description / Problem statement token overlap
      const descTokens = tokenize(p.description || p.problem_statement || '');
      if (descTokens.length > 0 && queryTokens.length > 0) {
        const descOverlap = calculateTokenOverlap(queryTokens, descTokens);
        if (descOverlap >= 0.25) {
          score = Math.max(score, 0.55 + (descOverlap * 0.40));
        }
      }

      // Topic & Pattern Boost
      const topicName = (p.topic_name || p.topic_id || '').toLowerCase();
      const patternName = (p.pattern_name || p.pattern_id || '').toLowerCase();

      if (topicName && cleanedLower.includes(topicName)) {
        score += 0.05;
      }
      if (patternName && cleanedLower.includes(patternName)) {
        score += 0.08;
      }

      // Explicit hint matches
      if (hints.problemId && p.id.toLowerCase() === hints.problemId.toLowerCase()) {
        score = 1.0;
      }

      score = Math.min(1.0, score);

      if (score > highestScore) {
        highestScore = score;
        bestMatch = p;
      }
    }

    // Confidence thresholding
    const MATCH_THRESHOLD = 0.48;
    if (bestMatch && highestScore >= MATCH_THRESHOLD) {
      let resolvedTopic = knowledgeGraph.findTopic(bestMatch.topic_id || bestMatch.topic_name);
      let resolvedPattern = knowledgeGraph.findPattern(bestMatch.pattern_id || bestMatch.pattern_name);

      if (!resolvedPattern && (bestMatch.hints || bestMatch.description || bestMatch.title)) {
        resolvedPattern = knowledgeGraph.findPattern(bestMatch.hints) ||
                          knowledgeGraph.findPattern(bestMatch.description) ||
                          knowledgeGraph.findPattern(bestMatch.title);
      }
      if (!resolvedPattern && (bestMatch.topic_id === 'arrays' || bestMatch.topic_id === 'hashing')) {
        resolvedPattern = knowledgeGraph.findPattern('hash-map-lookup');
      }

      const problemObj = {
        id: bestMatch.id,
        title: bestMatch.title,
        slug: bestMatch.slug || bestMatch.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        difficulty: String(bestMatch.difficulty || 'medium').toLowerCase(),
        topic: resolvedTopic ? resolvedTopic.name : (bestMatch.topic_name || 'Arrays'),
        pattern: resolvedPattern ? resolvedPattern.name : (bestMatch.pattern_name || 'Hash Map Lookup')
      };

      return {
        matched: true,
        confidence: Math.round(highestScore * 100) / 100,
        problem: problemObj,
        problemId: bestMatch.id,
        id: bestMatch.id,
        title: bestMatch.title,
        slug: bestMatch.slug || bestMatch.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        difficulty: String(bestMatch.difficulty || 'medium').toLowerCase(),
        topic: resolvedTopic ? resolvedTopic.name : (bestMatch.topic_name || 'Arrays'),
        topicId: resolvedTopic ? resolvedTopic.id : (bestMatch.topic_id || 'arrays'),
        pattern: resolvedPattern ? resolvedPattern.name : (bestMatch.pattern_name || 'Hash Map Lookup'),
        patternId: resolvedPattern ? resolvedPattern.id : (bestMatch.pattern_id || 'hash-map-lookup'),
        prerequisites: safeParseJson(bestMatch.prerequisites, []),
        solutionApproach: bestMatch.solution_approach || null,
        hints: parseHints(bestMatch.hints),
        points: Number(bestMatch.points || 20),
        description: bestMatch.description || bestMatch.problem_statement || null,
        constraints: bestMatch.constraints || null
      };
    }

    return {
      matched: false,
      confidence: Math.round(highestScore * 100) / 100
    };
  }

  /**
   * Helper to fetch candidate problems from DB
   */
  async getAllCandidateProblems() {
    try {
      const rows = await getRepo().many(`
        SELECT 
          q.id, q.title, q.slug, q.difficulty, q.topic_id, q.pattern_id,
          q.prerequisites, q.solution_approach, q.hints, q.points,
          q.description, q.problem_statement, q.constraints,
          t.name AS topic_name, p.name AS pattern_name
        FROM questions q
        LEFT JOIN topics t ON q.topic_id = t.id
        LEFT JOIN patterns p ON q.pattern_id = p.id
        WHERE (q.is_active = 1 OR q.is_active = TRUE)
      `);
      return rows || [];
    } catch (_) {
      return [];
    }
  }

  /**
   * Helper to fetch single problem by ID
   */
  async fetchProblemById(id) {
    try {
      const q = await getRepo().one(`
        SELECT 
          q.id, q.title, q.slug, q.difficulty, q.topic_id, q.pattern_id,
          q.prerequisites, q.solution_approach, q.hints, q.points,
          q.description, q.problem_statement, q.constraints,
          t.name AS topic_name, p.name AS pattern_name
        FROM questions q
        LEFT JOIN topics t ON q.topic_id = t.id
        LEFT JOIN patterns p ON q.pattern_id = p.id
        WHERE q.id = ? OR q.slug = ? OR q.id = ? OR q.slug = ?
      `, [id, id, `q-${id}`, `q-${id}`]);

      if (q) {
        let resolvedTopic = knowledgeGraph.findTopic(q.topic_id || q.topic_name);
        let resolvedPattern = knowledgeGraph.findPattern(q.pattern_id || q.pattern_name);

        if (!resolvedPattern && (q.hints || q.description || q.title)) {
          resolvedPattern = knowledgeGraph.findPattern(q.hints) ||
                            knowledgeGraph.findPattern(q.description) ||
                            knowledgeGraph.findPattern(q.title);
        }
        if (!resolvedPattern && (q.topic_id === 'arrays' || q.topic_id === 'hashing')) {
          resolvedPattern = knowledgeGraph.findPattern('hash-map-lookup');
        }

        return {
          problemId: q.id,
          id: q.id,
          title: q.title,
          slug: q.slug || q.id,
          difficulty: String(q.difficulty || 'medium').toLowerCase(),
          topic: resolvedTopic ? resolvedTopic.name : (q.topic_name || 'Arrays'),
          topicId: resolvedTopic ? resolvedTopic.id : (q.topic_id || 'arrays'),
          pattern: resolvedPattern ? resolvedPattern.name : (q.pattern_name || 'Hash Map Lookup'),
          patternId: resolvedPattern ? resolvedPattern.id : (q.pattern_id || 'hash-map-lookup'),
          prerequisites: safeParseJson(q.prerequisites, []),
          solutionApproach: q.solution_approach || null,
          hints: parseHints(q.hints),
          points: Number(q.points || 20),
          description: q.description || q.problem_statement || null,
          constraints: q.constraints || null
        };
      }
      return null;
    } catch (_) {
      return null;
    }
  }
}

module.exports = new DsaProblemMatcherService();
