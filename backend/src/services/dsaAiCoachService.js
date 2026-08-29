const dsaAiService = require('./dsaAiService');
const llmRouter = require('./llm/llmRouter');
const executionService = require('./executionService');
const { getRepository } = require('../db/repositoryFactory');
const { AppError } = require('../middleware/errorHandler');

const MAX_CORRECTION_ATTEMPTS = 2;

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
   * @param {object} [params.user] - Authenticated user context
   * @returns {Promise<object>} Standardized DSA AI Coach Response
   */
  async coach({ question, problemId, action, language = 'javascript', code = '', hintIndex = 0, verify = false, user = null }) {
    if (!question || typeof question !== 'string') {
      throw new AppError('Question text is required and must be a string', 400, 'VALIDATION_ERROR', 'question');
    }

    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      throw new AppError('Question cannot be empty', 400, 'VALIDATION_ERROR', 'question');
    }

    // 1. Run Phase 1 analysis to resolve intent, problem, topic, pattern, and complexities
    const analysis = await dsaAiService.analyzeQuestion({
      question: trimmedQuestion,
      problemId,
      user
    });

    const targetIntent = (action ? String(action).toUpperCase() : analysis.intent) || 'GENERAL_DSA';
    const { matchedProblem, topic, pattern, context } = analysis;

    const timeComplexity = context?.timeComplexity || 'O(N)';
    const spaceComplexity = context?.spaceComplexity || 'O(1)';

    // 2. Progressive Hint Action
    if (targetIntent === 'HINT') {
      return this.handleProgressiveHint({
        question: trimmedQuestion,
        matchedProblem,
        context,
        topic,
        pattern,
        hintIndex,
        timeComplexity,
        spaceComplexity
      });
    }

    // 3. Explanation Action
    if (targetIntent === 'EXPLANATION' || targetIntent === 'EXPLAIN') {
      return this.handleExplanation({
        question: trimmedQuestion,
        matchedProblem,
        context,
        topic,
        pattern,
        timeComplexity,
        spaceComplexity
      });
    }

    // 4. Approach Action
    if (targetIntent === 'APPROACH') {
      return this.handleApproach({
        question: trimmedQuestion,
        matchedProblem,
        context,
        topic,
        pattern,
        timeComplexity,
        spaceComplexity
      });
    }

    // 5. Complexity Action
    if (targetIntent === 'COMPLEXITY') {
      return this.handleComplexity({
        question: trimmedQuestion,
        matchedProblem,
        context,
        topic,
        pattern,
        timeComplexity,
        spaceComplexity
      });
    }

    // 6. Code Review Action
    if (targetIntent === 'CODE_REVIEW') {
      return this.handleCodeReview({
        question: trimmedQuestion,
        matchedProblem,
        context,
        topic,
        pattern,
        language,
        code,
        timeComplexity,
        spaceComplexity
      });
    }

    // 7. Debug Action
    if (targetIntent === 'DEBUG') {
      return this.handleDebug({
        question: trimmedQuestion,
        matchedProblem,
        context,
        topic,
        pattern,
        language,
        code,
        timeComplexity,
        spaceComplexity
      });
    }

    // 8. Concept Action
    if (targetIntent === 'CONCEPT') {
      return this.handleConcept({
        question: trimmedQuestion,
        matchedProblem,
        context,
        topic,
        pattern,
        timeComplexity,
        spaceComplexity
      });
    }

    // 9. Solution Action (with optional sandbox verification)
    if (targetIntent === 'SOLUTION') {
      return this.handleSolution({
        question: trimmedQuestion,
        matchedProblem,
        context,
        topic,
        pattern,
        language,
        verify,
        timeComplexity,
        spaceComplexity
      });
    }

    // Default / General DSA fallback
    return this.handleGeneralDsa({
      question: trimmedQuestion,
      matchedProblem,
      context,
      topic,
      pattern,
      timeComplexity,
      spaceComplexity
    });
  }

  /**
   * Handle Progressive Hints (Hint 1 -> Hint 2 -> Approach)
   */
  async handleProgressiveHint({ question, matchedProblem, context, topic, pattern, hintIndex, timeComplexity, spaceComplexity }) {
    const hints = context?.storedHints || [];
    const idx = Math.max(0, parseInt(hintIndex, 10) || 0);

    if (hints.length > 0) {
      if (idx < hints.length) {
        return {
          intent: 'HINT',
          source: 'database',
          topic,
          pattern,
          answer: `Hint ${idx + 1} of ${hints.length}: ${hints[idx]}`,
          code: null,
          complexity: { time: timeComplexity, space: spaceComplexity },
          verification: null
        };
      }

      // If user asks past available hints -> give high-level algorithm nudge without full code
      return {
        intent: 'HINT',
        source: 'database',
        topic,
        pattern,
        answer: `All stored hints viewed. Key algorithmic approach: Use the "${pattern}" technique with expected time complexity ${timeComplexity}.`,
        code: null,
        complexity: { time: timeComplexity, space: spaceComplexity },
        verification: null
      };
    }

    // Novel / Custom problem hint generation via LLM router
    const systemPrompt = `You are a DSA AI mentor. Provide ONLY a progressive hint at level ${idx + 1}. Do NOT provide full code. Guide the student to think through the algorithm.`;
    const prompt = `Question: "${question}"\nTopic: ${topic} | Pattern: ${pattern}\nGive progressive Hint #${idx + 1}.`;

    const llmRes = await llmRouter.generate({ prompt, systemPrompt, maxTokens: 400 });

    return {
      intent: 'HINT',
      source: llmRes.source || 'llm',
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
  async handleExplanation({ question, matchedProblem, context, topic, pattern, timeComplexity, spaceComplexity }) {
    if (context?.storedSolution && context.confidence >= 0.9) {
      const formatted = `### Core Idea & Mechanism\n${context.storedSolution}\n\n**Pattern Applied**: ${pattern}\n**Expected Time Complexity**: ${timeComplexity}\n**Expected Space Complexity**: ${spaceComplexity}`;
      return {
        intent: 'EXPLANATION',
        source: 'database',
        topic,
        pattern,
        answer: formatted,
        code: null,
        complexity: { time: timeComplexity, space: spaceComplexity },
        verification: null
      };
    }

    const systemPrompt = `You are a DSA AI mentor. Explain the concept, why it works, the underlying pattern, and the complexity breakdown.`;
    const prompt = `Explain: "${question}"\nTopic: ${topic} | Pattern: ${pattern}`;

    const llmRes = await llmRouter.generate({ prompt, systemPrompt, maxTokens: 700 });

    return {
      intent: 'EXPLANATION',
      source: llmRes.source || 'llm',
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
  async handleApproach({ question, matchedProblem, context, topic, pattern, timeComplexity, spaceComplexity }) {
    if (context?.storedSolution) {
      return {
        intent: 'APPROACH',
        source: 'database',
        topic,
        pattern,
        answer: `### Recommended Strategy\n${context.storedSolution}`,
        code: null,
        complexity: { time: timeComplexity, space: spaceComplexity },
        verification: null
      };
    }

    const systemPrompt = `You are a DSA AI mentor. Provide a structured, step-by-step algorithmic approach and state the algorithm invariants.`;
    const prompt = `How to approach: "${question}"\nTopic: ${topic} | Pattern: ${pattern}`;

    const llmRes = await llmRouter.generate({ prompt, systemPrompt, maxTokens: 600 });

    return {
      intent: 'APPROACH',
      source: llmRes.source || 'llm',
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
   */
  async handleComplexity({ question, matchedProblem, context, topic, pattern, timeComplexity, spaceComplexity }) {
    const text = `**Time Complexity**: ${timeComplexity}\n**Space Complexity**: ${spaceComplexity}\n\n**Justification**: Pattern ${pattern} processes the input in ${timeComplexity} time while maintaining auxiliary data structures in ${spaceComplexity} memory.`;
    return {
      intent: 'COMPLEXITY',
      source: 'graph',
      topic,
      pattern,
      answer: text,
      code: null,
      complexity: { time: timeComplexity, space: spaceComplexity },
      verification: null
    };
  }

  /**
   * Handle Code Review
   */
  async handleCodeReview({ question, matchedProblem, context, topic, pattern, language, code, timeComplexity, spaceComplexity }) {
    const systemPrompt = `You are an expert DSA code reviewer. Analyze the student's solution for correctness, edge cases, time/space complexity, and clean code improvements.`;
    const prompt = `Problem: ${matchedProblem?.title || question}\nLanguage: ${language}\n\nUser Code:\n\`\`\`${language}\n${code || '// No code provided'}\n\`\`\`\n\nProvide structured review: 1) Correctness, 2) Complexity Analysis, 3) Edge Cases & Bugs, 4) Improvement Suggestions.`;

    const llmRes = await llmRouter.generate({ prompt, systemPrompt, maxTokens: 800 });

    return {
      intent: 'CODE_REVIEW',
      source: llmRes.source || 'llm',
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
  async handleDebug({ question, matchedProblem, context, topic, pattern, language, code, timeComplexity, spaceComplexity }) {
    const systemPrompt = `You are a DSA debugging assistant. Pinpoint where the student's code fails, explain the exact logic error, and show how to fix it.`;
    const prompt = `Problem: ${matchedProblem?.title || question}\nUser Issue: ${question}\nLanguage: ${language}\n\nCode:\n\`\`\`${language}\n${code || ''}\n\`\`\``;

    const llmRes = await llmRouter.generate({ prompt, systemPrompt, maxTokens: 800 });

    return {
      intent: 'DEBUG',
      source: llmRes.source || 'llm',
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
  async handleConcept({ question, matchedProblem, context, topic, pattern, timeComplexity, spaceComplexity }) {
    const systemPrompt = `You are a DSA instructor. Explain the foundational concept, standard variations, and common pitfalls.`;
    const prompt = `Explain concept: "${question}"\nTopic: ${topic} | Pattern: ${pattern}`;

    const llmRes = await llmRouter.generate({ prompt, systemPrompt, maxTokens: 700 });

    return {
      intent: 'CONCEPT',
      source: llmRes.source || 'llm',
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
  async handleSolution({ question, matchedProblem, context, topic, pattern, language, verify, timeComplexity, spaceComplexity }) {
    const systemPrompt = `You are a DSA AI mentor. Generate the clean, optimal solution code in ${language} with brief algorithmic explanation.`;
    const prompt = `Problem: ${matchedProblem?.title || question}\nTopic: ${topic} | Pattern: ${pattern}\nLanguage: ${language}\n\nProvide the complete optimal solution.`;

    const llmRes = await llmRouter.generate({ prompt, systemPrompt, maxTokens: 900 });
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
  async handleGeneralDsa({ question, matchedProblem, context, topic, pattern, timeComplexity, spaceComplexity }) {
    const systemPrompt = `You are a helpful DSA mentor. Answer the student's question accurately using standard algorithmic principles.`;
    const prompt = `Question: "${question}"\nTopic: ${topic} | Pattern: ${pattern}`;

    const llmRes = await llmRouter.generate({ prompt, systemPrompt, maxTokens: 600 });

    return {
      intent: 'GENERAL_DSA',
      source: llmRes.source || 'llm',
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
