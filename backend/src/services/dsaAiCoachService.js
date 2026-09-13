const dsaAiService = require('./dsaAiService');
const llmRouter = require('./llm/llmRouter');
const executionService = require('./executionService');
const observability = require('./dsaAiObservabilityService');
const { getRepository } = require('../db/repositoryFactory');
const { AppError } = require('../middleware/errorHandler');

const MAX_CORRECTION_ATTEMPTS = 2;
const MAX_HISTORY_TURNS = 6;        // max prior turns forwarded to LLM
const MAX_HISTORY_MSG_CHARS = 500;  // max chars per message in history

function getRepo() {
  return getRepository();
}

/**
 * Extract clean executable code from markdown fences
 */
function extractCodeBlock(text, language = 'javascript') {
  if (!text || typeof text !== 'string') return '';
  const match = text.match(/```(?:[a-z0-9+#]*)\s*([\s\S]*?)```/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  return text.trim();
}

/**
 * Translate internal source identifiers to human-readable display labels
 * @param {string} source
 * @returns {string}
 */
function formatSourceLabel(source) {
  switch ((source || '').toLowerCase()) {
    case 'database': return 'Knowledge Base';
    case 'graph':    return 'Knowledge Graph';
    case 'llm':      return 'AI Generated';
    case 'cache':    return 'Cached Response';
    case 'fallback': return 'AI Unavailable';
    default:         return source || 'AI Generated';
  }
}

/**
 * Build context-aware system prompt for the LLM
 * Includes problem metadata, algorithm info, and pedagogical stance.
 */
function buildSystemPrompt(intent, { topic, pattern, algorithm, matchedProblem, context }) {
  const parts = [
    `You are an expert DSA (Data Structures & Algorithms) learning coach for the Axly platform.`,
    `Intent: ${intent}. Primary Topic: ${topic}. Pattern: ${pattern}. Algorithm: ${algorithm || pattern}.`,
    ``,
    `Teaching principles:`,
    `- Guide students to think, do NOT give away solutions when they ask for hints.`,
    `- Use correct DSA terminology.`,
    `- Keep responses structured and concise. Use Markdown: headings (##), bold, bullet lists, and fenced code blocks.`,
    `- Never fabricate time/space complexities — state them only when confident.`,
    `- Distinguish clearly between hints (nudges) and solutions (full code).`
  ];

  if (matchedProblem) {
    parts.push(`\n[Problem Context]`);
    parts.push(`Title: ${matchedProblem.title}`);
    parts.push(`Difficulty: ${matchedProblem.difficulty || 'medium'}`);
    parts.push(`Topic: ${topic} | Pattern: ${pattern}`);
    if (context?.algorithm) {
      parts.push(`Algorithm: ${context.algorithm}`);
    }
    if (context?.timeComplexity && context?.spaceComplexity) {
      parts.push(`Expected Complexity: Time ${context.timeComplexity}, Space ${context.spaceComplexity}`);
    }
    if (context?.storedHints?.length) {
      parts.push(`Structured Hints Available: ${context.storedHints.slice(0, 3).join(' | ')}`);
    }
    if (matchedProblem.description) {
      // Include only first 600 chars of description to bound tokens
      const descSnippet = String(matchedProblem.description).slice(0, 600);
      parts.push(`Problem Description (excerpt): ${descSnippet}${matchedProblem.description.length > 600 ? '...' : ''}`);
    }
  }

  return parts.join('\n');
}

/**
 * Serialize conversation history into messages for LLM context window.
 * Limits to MAX_HISTORY_TURNS turns, truncates each message to MAX_HISTORY_MSG_CHARS chars.
 * @param {Array} conversationHistory - Array of { role: 'user'|'assistant', content: string }
 * @returns {string} Formatted prior conversation block
 */
function buildConversationContext(conversationHistory) {
  if (!Array.isArray(conversationHistory) || conversationHistory.length === 0) {
    return '';
  }

  const turns = conversationHistory
    .slice(-MAX_HISTORY_TURNS * 2)  // Keep last N turns (each turn = user + assistant)
    .filter(m => m && typeof m.content === 'string' && m.content.trim().length > 0)
    .map(m => {
      const role = m.role === 'user' ? 'Student' : 'Coach';
      const content = m.content.trim().slice(0, MAX_HISTORY_MSG_CHARS);
      const truncated = m.content.trim().length > MAX_HISTORY_MSG_CHARS ? '...' : '';
      return `${role}: ${content}${truncated}`;
    });

  if (turns.length === 0) return '';

  return `\n[Prior Conversation Context]\n${turns.join('\n')}\n`;
}

class DsaAiCoachService {
  /**
   * Main DSA AI Coach dispatch method
   * @param {object} params
   * @param {string} params.question - The user query or problem prompt
   * @param {string} [params.problemId] - Optional known problem ID
   * @param {string} [params.action] - Optional explicit action (HINT, EXPLAIN, APPROACH, SOLUTION, COMPLEXITY, CODE_REVIEW, DEBUG, TEST_CASE, CONCEPT)
   * @param {string} [params.language] - Programming language (javascript, python, cpp, java)
   * @param {string} [params.code] - Student code snippet
   * @param {number} [params.hintIndex] - Progressive hint level (0, 1, 2, ...)
   * @param {boolean} [params.verify] - Whether to verify code in sandbox
   * @param {Array}  [params.conversationHistory] - Prior turns [{role, content}]
   * @param {object} [params.user] - Authenticated user context
   * @returns {Promise<object>} Standardized DSA AI Coach Response
   */
  async coach({ question, problemId, action, language = 'javascript', code = '', hintIndex = 0, verify = false, conversationHistory = [], user = null }) {
    if (!question || typeof question !== 'string') {
      throw new AppError('Question text is required and must be a string', 400, 'VALIDATION_ERROR', 'question');
    }

    const startTime = Date.now();
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      throw new AppError('Question cannot be empty', 400, 'VALIDATION_ERROR', 'question');
    }

    // Sanitize and bound conversation history
    const safeHistory = Array.isArray(conversationHistory)
      ? conversationHistory
          .filter(m => m && typeof m.content === 'string' && ['user', 'assistant'].includes(m.role))
          .slice(-MAX_HISTORY_TURNS * 2)
      : [];

    // 1. Run Phase 1 analysis to resolve intent, problem, topic, pattern, and complexities
    const analysis = await dsaAiService.analyzeQuestion({
      question: trimmedQuestion,
      problemId,
      user
    });

    const targetIntent = (action ? String(action).toUpperCase() : analysis.intent) || 'GENERAL_DSA';
    const { matchedProblem, topic, pattern, context } = analysis;

    const timeComplexity = context?.timeComplexity || null;
    const spaceComplexity = context?.spaceComplexity || null;
    const algorithm = context?.algorithm || pattern;

    // Build LLM system prompt context
    const promptContext = { topic, pattern, algorithm, matchedProblem, context };

    let result;
    // 2. Progressive Hint Action
    if (targetIntent === 'HINT') {
      result = await this.handleProgressiveHint({
        question: trimmedQuestion,
        matchedProblem,
        context,
        topic,
        pattern,
        hintIndex,
        timeComplexity,
        spaceComplexity,
        promptContext,
        conversationHistory: safeHistory
      });
    } else if (targetIntent === 'EXPLANATION' || targetIntent === 'EXPLAIN') {
      result = await this.handleExplanation({
        question: trimmedQuestion,
        matchedProblem,
        context,
        topic,
        pattern,
        timeComplexity,
        spaceComplexity,
        promptContext,
        conversationHistory: safeHistory
      });
    } else if (targetIntent === 'APPROACH') {
      result = await this.handleApproach({
        question: trimmedQuestion,
        matchedProblem,
        context,
        topic,
        pattern,
        timeComplexity,
        spaceComplexity,
        promptContext,
        conversationHistory: safeHistory
      });
    } else if (targetIntent === 'COMPLEXITY') {
      result = await this.handleComplexity({
        question: trimmedQuestion,
        matchedProblem,
        context,
        topic,
        pattern,
        timeComplexity,
        spaceComplexity,
        promptContext,
        conversationHistory: safeHistory
      });
    } else if (targetIntent === 'CODE_REVIEW') {
      result = await this.handleCodeReview({
        question: trimmedQuestion,
        matchedProblem,
        context,
        topic,
        pattern,
        language,
        code,
        timeComplexity,
        spaceComplexity,
        promptContext,
        conversationHistory: safeHistory
      });
    } else if (targetIntent === 'DEBUG') {
      result = await this.handleDebug({
        question: trimmedQuestion,
        matchedProblem,
        context,
        topic,
        pattern,
        language,
        code,
        timeComplexity,
        spaceComplexity,
        promptContext,
        conversationHistory: safeHistory
      });
    } else if (targetIntent === 'CONCEPT') {
      result = await this.handleConcept({
        question: trimmedQuestion,
        matchedProblem,
        context,
        topic,
        pattern,
        timeComplexity,
        spaceComplexity,
        promptContext,
        conversationHistory: safeHistory
      });
    } else if (targetIntent === 'SOLUTION') {
      result = await this.handleSolution({
        question: trimmedQuestion,
        matchedProblem,
        context,
        topic,
        pattern,
        language,
        verify,
        timeComplexity,
        spaceComplexity,
        promptContext,
        conversationHistory: safeHistory
      });
    } else {
      result = await this.handleGeneralDsa({
        question: trimmedQuestion,
        matchedProblem,
        context,
        topic,
        pattern,
        timeComplexity,
        spaceComplexity,
        promptContext,
        conversationHistory: safeHistory
      });
    }

    // Add human-readable source label to all results
    result.displaySource = formatSourceLabel(result.source);

    observability.recordEvent({
      intent: result.intent,
      source: result.source,
      provider: result.provider || 'none',
      latencyMs: Date.now() - startTime,
      verified: result.verification?.verified ?? null
    });

    return result;
  }

  /**
   * Handle Progressive Hints (Hint 1 -> Hint 2 -> Approach)
   */
  async handleProgressiveHint({ question, matchedProblem, context, topic, pattern, hintIndex, timeComplexity, spaceComplexity, promptContext, conversationHistory }) {
    const hints = context?.storedHints || [];
    const idx = Math.max(0, parseInt(hintIndex, 10) || 0);

    if (hints.length > 0) {
      if (idx < hints.length) {
        return {
          intent: 'HINT',
          source: 'database',
          displaySource: 'Knowledge Base',
          topic,
          pattern,
          answer: `**Hint ${idx + 1} of ${Math.max(hints.length, 2)}**\n\n${hints[idx]}`,
          code: null,
          complexity: { time: timeComplexity, space: spaceComplexity },
          verification: null
        };
      } else if (idx === hints.length && idx < 3) {
        return {
          intent: 'HINT',
          source: 'database',
          displaySource: 'Knowledge Base',
          topic,
          pattern,
          answer: `**Hint ${idx + 1}:** Think about what information you need to track while applying the **${pattern || 'optimal'}** technique.`,
          code: null,
          complexity: { time: timeComplexity, space: spaceComplexity },
          verification: null
        };
      }

      // If user asks past available hints -> give high-level algorithm nudge without full code
      return {
        intent: 'HINT',
        source: 'database',
        displaySource: 'Knowledge Base',
        topic,
        pattern,
        answer: `All stored hints viewed.\n\n**Key algorithmic approach:** Use the **${pattern}** technique${timeComplexity ? ` with expected time complexity **${timeComplexity}**` : ''}.`,
        code: null,
        complexity: { time: timeComplexity, space: spaceComplexity },
        verification: null
      };
    }

    // Novel / Custom problem hint generation via LLM router
    const systemPrompt = buildSystemPrompt('HINT', promptContext);
    const historyContext = buildConversationContext(conversationHistory);

    const prompt = `${historyContext}Student Question: "${question}"
Topic: ${topic} | Pattern: ${pattern}

Provide ONLY a progressive Hint #${idx + 1}. 
- Do NOT reveal the complete algorithm or code.
- Guide the student to think through the approach.
- Be concise (2-4 sentences max for early hints).`;

    const llmRes = await llmRouter.generate({ prompt, systemPrompt, maxTokens: 300 });

    return {
      intent: 'HINT',
      source: llmRes.source || 'llm',
      displaySource: formatSourceLabel(llmRes.source || 'llm'),
      topic,
      pattern,
      answer: llmRes.text,
      code: null,
      complexity: { time: timeComplexity, space: spaceComplexity },
      verification: null
    };
  }

  /**
   * Handle Explanation (Idea, Why it works, Pattern, Complexity)
   */
  async handleExplanation({ question, matchedProblem, context, topic, pattern, timeComplexity, spaceComplexity, promptContext, conversationHistory }) {
    const systemPrompt = buildSystemPrompt('EXPLANATION', promptContext);
    const historyContext = buildConversationContext(conversationHistory);

    // For known problems with high confidence, still use LLM but provide DB context
    if (context?.storedSolution && context?.confidence >= 0.8) {
      const prompt = `${historyContext}Student Question: "${question}"

[Problem Knowledge]
Stored Approach: ${context.storedSolution}
Pattern: ${pattern}
Time: ${timeComplexity || 'unknown'} | Space: ${spaceComplexity || 'unknown'}

Provide a structured explanation: core idea, why this pattern works, key intuition, and complexity breakdown. Use Markdown headings (##) and bullet lists.`;

      const llmRes = await llmRouter.generate({ prompt, systemPrompt, maxTokens: 700 });

      return {
        intent: 'EXPLANATION',
        source: llmRes.source || 'llm',
        displaySource: formatSourceLabel(llmRes.source || 'llm'),
        topic,
        pattern,
        answer: llmRes.text,
        code: null,
        complexity: { time: timeComplexity, space: spaceComplexity },
        verification: null
      };
    }

    const problemDesc = matchedProblem?.description ? `\nProblem: ${String(matchedProblem.description).slice(0, 400)}` : '';
    const prompt = `${historyContext}Student Question: "${question}"
Topic: ${topic} | Pattern: ${pattern}${problemDesc}

Explain: core idea, why the pattern applies, key intuition, and complexity. Use ## headings.`;

    const llmRes = await llmRouter.generate({ prompt, systemPrompt, maxTokens: 700 });

    return {
      intent: 'EXPLANATION',
      source: llmRes.source || 'llm',
      displaySource: formatSourceLabel(llmRes.source || 'llm'),
      topic,
      pattern,
      answer: llmRes.text,
      code: null,
      complexity: { time: timeComplexity, space: spaceComplexity },
      verification: null
    };
  }

  /**
   * Handle Approach (High-level algorithm steps & invariants)
   */
  async handleApproach({ question, matchedProblem, context, topic, pattern, timeComplexity, spaceComplexity, promptContext, conversationHistory }) {
    const systemPrompt = buildSystemPrompt('APPROACH', promptContext);
    const historyContext = buildConversationContext(conversationHistory);

    const problemDesc = matchedProblem?.description
      ? `\n\nProblem Description (excerpt):\n${String(matchedProblem.description).slice(0, 500)}`
      : '';

    const storedApproach = context?.storedSolution
      ? `\n\nReference Approach from Knowledge Base:\n${context.storedSolution}`
      : '';

    const prompt = `${historyContext}Student Question: "${question}"
Topic: ${topic} | Pattern: ${pattern}${problemDesc}${storedApproach}

Provide a structured step-by-step algorithmic approach:
## Steps
1. ...
2. ...

## Key Invariants
- ...

## Complexity
- Time: ...
- Space: ...

Do NOT provide full implementation code.`;

    const llmRes = await llmRouter.generate({ prompt, systemPrompt, maxTokens: 600 });

    return {
      intent: 'APPROACH',
      source: llmRes.source || 'llm',
      displaySource: formatSourceLabel(llmRes.source || 'llm'),
      topic,
      pattern,
      answer: llmRes.text,
      code: null,
      complexity: { time: timeComplexity, space: spaceComplexity },
      verification: null
    };
  }

  /**
   * Handle Complexity breakdown
   * - For known problems with confirmed complexities, use Knowledge Graph (deterministic)
   * - For unknown problems or when confidence is low, use LLM
   */
  async handleComplexity({ question, matchedProblem, context, topic, pattern, timeComplexity, spaceComplexity, promptContext, conversationHistory }) {
    // Only use deterministic graph data if we have a matched problem with real complexities
    const hasRealComplexity = matchedProblem && timeComplexity && timeComplexity !== 'O(N)' || 
                               (context?.confidence >= 0.8 && timeComplexity);

    if (hasRealComplexity) {
      const text = `## Complexity Analysis\n\n**Time Complexity:** \`${timeComplexity}\`\n\n**Space Complexity:** \`${spaceComplexity}\`\n\n**Justification:** The **${pattern}** pattern processes each element at most once${timeComplexity === 'O(log N)' ? ', halving the search space at each step' : ''}, resulting in ${timeComplexity} time. Auxiliary data structures (${topic === 'Hashing' ? 'hash map' : topic === 'Stack' ? 'stack' : 'array/buffer'}) contribute ${spaceComplexity} space.`;
      return {
        intent: 'COMPLEXITY',
        source: 'graph',
        displaySource: 'Knowledge Graph',
        topic,
        pattern,
        answer: text,
        code: null,
        complexity: { time: timeComplexity, space: spaceComplexity },
        verification: null
      };
    }

    // Unknown problem or generic question — use LLM
    const systemPrompt = buildSystemPrompt('COMPLEXITY', promptContext);
    const historyContext = buildConversationContext(conversationHistory);

    const problemDesc = matchedProblem?.description
      ? `\nProblem: ${String(matchedProblem.description).slice(0, 400)}`
      : '';

    const prompt = `${historyContext}Student Question: "${question}"
Topic: ${topic} | Pattern: ${pattern}${problemDesc}

Provide a precise complexity analysis with justification:
## Time Complexity
[state complexity and why]

## Space Complexity
[state complexity and why]

Use Big-O notation. Only state complexities you are confident about.`;

    const llmRes = await llmRouter.generate({ prompt, systemPrompt, maxTokens: 400 });

    return {
      intent: 'COMPLEXITY',
      source: llmRes.source || 'llm',
      displaySource: formatSourceLabel(llmRes.source || 'llm'),
      topic,
      pattern,
      answer: llmRes.text,
      code: null,
      complexity: { time: timeComplexity, space: spaceComplexity },
      verification: null
    };
  }

  /**
   * Handle Code Review
   */
  async handleCodeReview({ question, matchedProblem, context, topic, pattern, language, code, timeComplexity, spaceComplexity, promptContext, conversationHistory }) {
    const systemPrompt = buildSystemPrompt('CODE_REVIEW', promptContext);
    const historyContext = buildConversationContext(conversationHistory);

    const prompt = `${historyContext}Problem: ${matchedProblem?.title || question}
Language: ${language}

Student Code:
\`\`\`${language}
${code || '// No code provided'}
\`\`\`

Provide a structured code review:

## 1. Correctness
[Is the logic correct? Any wrong outputs?]

## 2. Time & Space Complexity
[Actual complexity of this code]

## 3. Edge Cases & Bugs
[Any missing edge cases, off-by-one errors, null checks?]

## 4. Readability & Clean Code
[Variable naming, code clarity]

## 5. Suggested Improvements
[Concrete optimizations, if any]`;

    const llmRes = await llmRouter.generate({ prompt, systemPrompt, maxTokens: 900 });

    return {
      intent: 'CODE_REVIEW',
      source: llmRes.source || 'llm',
      displaySource: formatSourceLabel(llmRes.source || 'llm'),
      topic,
      pattern,
      answer: llmRes.text,
      code: code || null,
      complexity: { time: timeComplexity, space: spaceComplexity },
      verification: null
    };
  }

  /**
   * Handle Debugging
   */
  async handleDebug({ question, matchedProblem, context, topic, pattern, language, code, timeComplexity, spaceComplexity, promptContext, conversationHistory }) {
    const systemPrompt = buildSystemPrompt('DEBUG', promptContext);
    const historyContext = buildConversationContext(conversationHistory);

    const prompt = `${historyContext}Problem: ${matchedProblem?.title || 'DSA Problem'}
Student Issue: "${question}"
Language: ${language}

Student Code:
\`\`\`${language}
${code || '// No code provided'}
\`\`\`

Debug the code:

## Issue Identified
[Pinpoint the exact logic error or failure cause]

## Why It Fails
[Explain the root cause clearly]

## Suggested Fix
\`\`\`${language}
[corrected code snippet or the specific changed lines]
\`\`\`

## Verification
[How to verify the fix works]`;

    const llmRes = await llmRouter.generate({ prompt, systemPrompt, maxTokens: 900 });

    return {
      intent: 'DEBUG',
      source: llmRes.source || 'llm',
      displaySource: formatSourceLabel(llmRes.source || 'llm'),
      topic,
      pattern,
      answer: llmRes.text,
      code: code || null,
      complexity: { time: timeComplexity, space: spaceComplexity },
      verification: null
    };
  }

  /**
   * Handle Concept tutorial
   */
  async handleConcept({ question, matchedProblem, context, topic, pattern, timeComplexity, spaceComplexity, promptContext, conversationHistory }) {
    const systemPrompt = buildSystemPrompt('CONCEPT', promptContext);
    const historyContext = buildConversationContext(conversationHistory);

    const prompt = `${historyContext}Student Question: "${question}"
Topic: ${topic} | Pattern: ${pattern}

Explain the foundational concept:

## Core Idea
[What is it? When do you use it?]

## How It Works
[Step-by-step mechanics]

## Standard Variations
[Common variants or related patterns]

## Common Pitfalls
[Mistakes students make]

## Example Use Case
[A concrete DSA problem example]`;

    const llmRes = await llmRouter.generate({ prompt, systemPrompt, maxTokens: 700 });

    return {
      intent: 'CONCEPT',
      source: llmRes.source || 'llm',
      displaySource: formatSourceLabel(llmRes.source || 'llm'),
      topic,
      pattern,
      answer: llmRes.text,
      code: null,
      complexity: { time: timeComplexity, space: spaceComplexity },
      verification: null
    };
  }

  /**
   * Handle Solution Generation with Sandbox Code Verification
   */
  async handleSolution({ question, matchedProblem, context, topic, pattern, language, verify, timeComplexity, spaceComplexity, promptContext, conversationHistory }) {
    const systemPrompt = buildSystemPrompt('SOLUTION', promptContext);
    const historyContext = buildConversationContext(conversationHistory);

    const problemDesc = matchedProblem?.description
      ? `\nProblem Description:\n${String(matchedProblem.description).slice(0, 500)}`
      : '';

    const prompt = `${historyContext}Problem: ${matchedProblem?.title || question}
Topic: ${topic} | Pattern: ${pattern}${problemDesc}
Language: ${language}

Provide the complete optimal solution:

## Idea
[Brief algorithm summary]

## Algorithm
[Key steps]

## Code
\`\`\`${language}
[complete, runnable solution]
\`\`\`

## Complexity
- Time: 
- Space: 

## Edge Cases
[Any special inputs to handle]`;

    const llmRes = await llmRouter.generate({ prompt, systemPrompt, maxTokens: 1000 });
    const generatedCode = extractCodeBlock(llmRes.text, language);

    let verificationResult = null;

    if (verify && matchedProblem?.id && generatedCode) {
      verificationResult = await this.verifyAndCorrectCode({
        problemId: matchedProblem.id,
        language,
        code: generatedCode,
        allowCorrection: true
      });
    }

    return {
      intent: 'SOLUTION',
      source: llmRes.source || 'llm',
      displaySource: formatSourceLabel(llmRes.source || 'llm'),
      topic,
      pattern,
      answer: llmRes.text,
      code: generatedCode || null,
      complexity: { time: timeComplexity, space: spaceComplexity },
      verification: verificationResult
    };
  }

  /**
   * Handle General DSA
   */
  async handleGeneralDsa({ question, matchedProblem, context, topic, pattern, timeComplexity, spaceComplexity, promptContext, conversationHistory }) {
    const systemPrompt = buildSystemPrompt('GENERAL_DSA', promptContext);
    const historyContext = buildConversationContext(conversationHistory);

    const prompt = `${historyContext}Student Question: "${question}"
Topic: ${topic} | Pattern: ${pattern}

Answer accurately using standard algorithmic principles. Use Markdown for structure where helpful.`;

    const llmRes = await llmRouter.generate({ prompt, systemPrompt, maxTokens: 600 });

    return {
      intent: 'GENERAL_DSA',
      source: llmRes.source || 'llm',
      displaySource: formatSourceLabel(llmRes.source || 'llm'),
      topic,
      pattern,
      answer: llmRes.text,
      code: null,
      complexity: { time: timeComplexity, space: spaceComplexity },
      verification: null
    };
  }

  /**
   * Code Verification & Bounded Self-Correction Engine using EXISTING sandbox
   */
  async verifyAndCorrectCode({ problemId, language = 'javascript', code, allowCorrection = true }) {
    if (!code || !code.trim()) {
      return { verified: false, status: 'No Code Provided', passed_tests: 0, total_tests: 0 };
    }

    // 1. Fetch test cases from database (or fallback to basic test cases)
    const testCases = await this.fetchProblemTestCases(problemId);
    if (!testCases || testCases.length === 0) {
      return {
        verified: true,
        status: 'Unverified (No Test Cases)',
        passed_tests: 0,
        total_tests: 0,
        execution_time_ms: 0
      };
    }

    let currentCode = code;
    let attempts = 0;
    let lastExec = null;

    while (attempts <= (allowCorrection ? MAX_CORRECTION_ATTEMPTS : 0)) {
      attempts++;

      try {
        lastExec = await executionService.executeCode({
          language,
          sourceCode: currentCode,
          testCases,
          isSubmit: false
        });

        if (lastExec.status === 'Accepted' || lastExec.passed_tests === lastExec.total_tests) {
          return {
            verified: true,
            status: 'Accepted',
            passed_tests: lastExec.passed_tests,
            total_tests: lastExec.total_tests,
            execution_time_ms: lastExec.execution_time_ms || 0,
            attempts,
            code: currentCode
          };
        }

        // If failed and corrections are allowed and attempts remain
        if (allowCorrection && attempts <= MAX_CORRECTION_ATTEMPTS) {
          const firstFailure = (lastExec.results || []).find(r => r.status !== 'Passed');
          const errorFeedback = firstFailure
            ? `Status: ${firstFailure.status}. Stderr: ${firstFailure.stderr || 'Wrong answer on sample input'}`
            : `Status: ${lastExec.status}`;

          const correctionPrompt = `The following ${language} code failed in sandbox evaluation.\n\nFailing Code:\n\`\`\`${language}\n${currentCode}\n\`\`\`\n\nExecution Diagnostics:\n${errorFeedback}\n\nProvide ONLY the corrected, clean ${language} code enclosed in markdown code fences without extra prose.`;
          
          const correctionRes = await llmRouter.generate({
            prompt: correctionPrompt,
            systemPrompt: `You fix bugs in ${language} algorithms. Return only corrected code.`,
            maxTokens: 800
          });

          const extracted = extractCodeBlock(correctionRes.text, language);
          if (extracted && extracted !== currentCode) {
            currentCode = extracted;
            continue;
          }
        }
      } catch (err) {
        lastExec = {
          status: 'Execution Error',
          passed_tests: 0,
          total_tests: testCases.length,
          execution_time_ms: 0,
          error: err.message
        };
      }

      break;
    }

    return {
      verified: false,
      status: lastExec?.status || 'Failed',
      passed_tests: Number(lastExec?.passed_tests || 0),
      total_tests: Number(lastExec?.total_tests || testCases.length),
      execution_time_ms: Number(lastExec?.execution_time_ms || 0),
      attempts,
      code: currentCode
    };
  }

  /**
   * Helper to retrieve test cases for a problem without exposing hidden contents
   */
  async fetchProblemTestCases(problemId) {
    try {
      const rows = await getRepo().many(`
        SELECT id, input, expected_output, is_hidden
        FROM test_cases
        WHERE question_id = ?
        ORDER BY is_hidden ASC, id ASC
        LIMIT 10
      `, [problemId]);

      if (rows && rows.length > 0) return rows;

      // Check daily_challenge_test_cases
      const dcRows = await getRepo().many(`
        SELECT id, input, expected_output, is_hidden
        FROM daily_challenge_test_cases
        WHERE challenge_id = ?
        ORDER BY is_hidden ASC, id ASC
        LIMIT 10
      `, [problemId]);

      return dcRows || [];
    } catch (_) {
      return [];
    }
  }
}

module.exports = new DsaAiCoachService();
