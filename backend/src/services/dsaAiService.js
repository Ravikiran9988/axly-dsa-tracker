const intentDetector = require('./dsaIntentDetectorService');
const problemMatcher = require('./dsaProblemMatcherService');
const knowledgeGraph = require('./dsaKnowledgeGraphService');
const llmRouter = require('./llm/llmRouter');
const aiCache = require('./dsaAiCacheService');
const { AppError } = require('../middleware/errorHandler');

class DsaAiService {
  /**
   * Analyze a DSA question deterministically without calling LLM providers (Phase 1)
   * @param {object} params
   * @param {string} params.question - The user query text
   * @param {string} [params.problemId] - Optional explicit problem context ID
   * @param {object} [params.user] - Authenticated user context
   * @returns {Promise<object>} Normalized DSA AI Context
   */
  async analyzeQuestion({ question, problemId, user }) {
    if (!question || typeof question !== 'string') {
      throw new AppError('Question text is required and must be a string', 400, 'VALIDATION_ERROR', 'question');
    }

    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      throw new AppError('Question cannot be empty', 400, 'VALIDATION_ERROR', 'question');
    }

    if (trimmedQuestion.length > 4000) {
      throw new AppError('Question exceeds maximum allowed length of 4000 characters', 400, 'VALIDATION_ERROR', 'question');
    }

    // 1. Detect Intent
    const intentResult = intentDetector.detectIntent(trimmedQuestion);
    const intent = intentResult.intent;

    // 2. Match Problem
    const matchResult = await problemMatcher.matchProblem(trimmedQuestion, { problemId });
    const isMatched = Boolean(matchResult.matched);

    // 3. Resolve Topic & Pattern
    let resolvedTopic = matchResult.topic || null;
    let resolvedPattern = matchResult.pattern || null;

    if (!resolvedTopic) {
      const topicEntity = knowledgeGraph.findTopic(trimmedQuestion);
      if (topicEntity) resolvedTopic = topicEntity.name;
    }

    if (!resolvedPattern) {
      const patternEntity = knowledgeGraph.findPattern(trimmedQuestion);
      if (patternEntity) resolvedPattern = patternEntity.name;
    }

    if (!resolvedTopic) resolvedTopic = 'Arrays';
    if (!resolvedPattern) resolvedPattern = 'Hash Map Lookup';

    // 4. Retrieve Knowledge Graph context
    const graphData = knowledgeGraph.getGraphContext(resolvedTopic, resolvedPattern, isMatched ? matchResult : null);

    // 5. Assemble Normalized DSA AI Context
    const matchedProblemData = isMatched ? {
      id: matchResult.id,
      title: matchResult.title,
      slug: matchResult.slug,
      difficulty: matchResult.difficulty,
      topic: matchResult.topic,
      topicId: matchResult.topicId,
      pattern: matchResult.pattern,
      patternId: matchResult.patternId,
      prerequisites: matchResult.prerequisites || []
    } : null;

    const normalizedContext = {
      question: trimmedQuestion,
      intent,
      matched: isMatched,
      confidence: isMatched ? (matchResult.confidence || 0.9) : (intentResult.confidence || 0.6),
      matchedProblem: matchedProblemData,
      topic: graphData.topic,
      topicId: graphData.topicId,
      pattern: graphData.pattern,
      patternId: graphData.patternId,
      graphContext: graphData.nodes,
      dataStructure: graphData.dataStructure,
      algorithm: graphData.algorithm,
      timeComplexity: graphData.timeComplexity,
      spaceComplexity: graphData.spaceComplexity,
      prerequisites: graphData.prerequisites,
      storedSolution: isMatched ? (matchResult.solutionApproach || null) : null,
      storedHints: isMatched ? (matchResult.hints || []) : []
    };

    return {
      intent,
      matchedProblem: matchedProblemData,
      topic: graphData.topic,
      pattern: graphData.pattern,
      context: normalizedContext
    };
  }

  /**
   * Generate intelligent guidance with deterministic priority, caching, and multi-provider LLM fallback (Phase 2)
   * @param {object} params
   * @param {string} params.question - The user query or guidance request
   * @param {string} [params.problemId] - Optional explicit problem ID
   * @param {string} [params.code] - Optional user solution code for review/debug
   * @param {object} [params.user] - Authenticated user object
   * @param {boolean} [params.forceLlm] - Force LLM generation bypassing direct database hints
   * @returns {Promise<object>}
   */
  async generateGuidance({ question, problemId, code = '', user = null, forceLlm = false }) {
    // 1. Run deterministic Phase 1 analysis first
    const analysis = await this.analyzeQuestion({ question, problemId, user });
    const { intent, matchedProblem, topic, pattern, context } = analysis;

    // 2. Direct Database Fulfillment Check (Token Control & Zero-LLM Priority)
    if (!forceLlm && !code) {
      if (intent === 'HINT' && context.storedHints && context.storedHints.length > 0) {
        const hintList = context.storedHints.map((h, i) => `Hint ${i + 1}: ${h}`).join('\n\n');
        return {
          intent,
          matchedProblem,
          topic,
          pattern,
          source: 'database',
          provider: 'database',
          guidance: hintList,
          context
        };
      }

      if ((intent === 'APPROACH' || intent === 'CONCEPT') && context.storedSolution && context.confidence >= 0.95) {
        return {
          intent,
          matchedProblem,
          topic,
          pattern,
          source: 'database',
          provider: 'database',
          guidance: context.storedSolution,
          context
        };
      }
    }

    // 3. Cache Check for non-personalized queries
    const isPersonalized = Boolean(code && code.trim().length > 0) || intent === 'CODE_REVIEW' || intent === 'DEBUG';
    const cacheKey = aiCache.generateKey({
      problemId: matchedProblem?.id,
      intent,
      queryText: question,
      code: isPersonalized ? code : ''
    });

    const cachedResponse = aiCache.get(cacheKey);
    if (cachedResponse) {
      return {
        ...cachedResponse,
        source: 'cache'
      };
    }

    // 4. Token-Controlled Prompt Construction
    const systemPrompt = `You are the expert DSA (Data Structures & Algorithms) AI mentor for the Axly DSA platform.
Give clear, concise, structured, and pedagogical explanations.
Never fabricate incorrect time/space complexities.
Focus on standard algorithms and clean patterns.
Intent: ${intent}. Primary Topic: ${topic}. Pattern: ${pattern}.`;

    let userPrompt = `User Question: "${question}"\n\n`;

    if (matchedProblem) {
      userPrompt += `[Target Problem Context]\n`;
      userPrompt += `Title: ${matchedProblem.title} (${matchedProblem.difficulty})\n`;
      userPrompt += `Topic: ${topic} | Pattern: ${pattern}\n`;
      userPrompt += `Algorithm: ${context.algorithm}\n`;
      userPrompt += `Expected Complexities: Time ${context.timeComplexity}, Space ${context.spaceComplexity}\n`;
      if (context.storedHints?.length) {
        userPrompt += `Reference Hints: ${context.storedHints.join(' | ')}\n`;
      }
      userPrompt += `\n`;
    }

    if (code && code.trim()) {
      userPrompt += `[User Submitted Code for ${intent}]:\n\`\`\`\n${code.trim().slice(0, 2000)}\n\`\`\`\n\n`;
    }

    userPrompt += `Provide a direct, helpful response focusing specifically on ${intent.toLowerCase()}.`;

    // 5. Call LLM Router with multi-provider fallback
    const llmResult = await llmRouter.generate({
      prompt: userPrompt,
      systemPrompt,
      maxTokens: 750,
      temperature: 0.3
    });

    const responsePayload = {
      intent,
      matchedProblem,
      topic,
      pattern,
      source: llmResult.source || 'llm',
      provider: llmResult.provider || 'unknown',
      model: llmResult.model || 'none',
      guidance: llmResult.text,
      usage: llmResult.usage || null,
      context
    };

    // 6. Cache non-fallback, deterministic responses
    if (llmResult.source === 'llm' && !isPersonalized) {
      aiCache.set(cacheKey, responsePayload);
    }

    return responsePayload;
  }
}

module.exports = new DsaAiService();
