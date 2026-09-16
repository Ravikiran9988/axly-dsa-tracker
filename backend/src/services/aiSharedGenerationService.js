const pipeline = require('./aiQuestionGenerationPipeline');
const { executeCode } = require('./executionService');

/**
 * Backward compatibility adapter for aiSharedGenerationService.
 * All generation and validation logic is centralized in aiQuestionGenerationPipeline.js.
 */
function normalizeEstimatedTime(value, fallback = 30) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) return value;
  const text = String(value).trim().toLowerCase();
  const match = text.match(/\d+(?:\.\d+)?/);
  if (!match) return fallback;
  const minutes = Number(match[0]);
  return Number.isFinite(minutes) && minutes >= 0 ? Math.round(minutes) : fallback;
}

function normalizeGeneratedQuestion(result) {
  if (!result || !result.data || typeof result.data !== 'object') return result;
  return {
    ...result,
    data: {
      ...result.data,
      estimated_time: normalizeEstimatedTime(result.data.estimated_time)
    }
  };
}

async function generateUniqueProblem(options = {}) {
  const result = await pipeline.generateCanonicalQuestion(options);
  return normalizeGeneratedQuestion(result);
}

function validateDailyChallenge(data) {
  return pipeline.validateQuestionContract(data);
}

async function checkDuplicateChallenge(candidate, description = '', excludeId = null) {
  return pipeline.checkDuplicateProblem(candidate, description, excludeId);
}

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

module.exports = {
  generateUniqueProblem,
  validateDailyChallenge,
  checkDuplicateChallenge,
  verifyReferenceSolution,
  generateProblemSignature: pipeline.generateProblemSignature,
  extractProblemConcept: pipeline.extractProblemConcept,
  stripVariantIdentifiers: pipeline.stripVariantIdentifiers,
  computeSemanticSimilarity: pipeline.computeSemanticSimilarity,
  TOPIC_NAMES: pipeline.TOPIC_NAMES,
  MAX_REGENERATION_ATTEMPTS: pipeline.MAX_REGENERATION_ATTEMPTS
};
