const { AppError } = require('../middleware/errorHandler');
const { executeCode } = require('./executionService');

function normalizeOutput(value) {
  return String(value ?? '').replace(/\r\n/g, '\n').trim();
}

/**
 * Validates question specifications, test cases, and constraints before publishing.
 */
function validateQuestionForPublish(question) {
  const issues = [];
  if (!question?.title?.trim()) issues.push({ field: 'title', message: 'Title is required.' });
  if (!question?.description?.trim() && !question?.problem_statement?.trim()) {
    issues.push({ field: 'description', message: 'Problem description is required.' });
  }
  if (!['easy', 'medium', 'hard'].includes(String(question?.difficulty || '').toLowerCase())) {
    issues.push({ field: 'difficulty', message: 'Difficulty must be easy, medium, or hard.' });
  }

  const cases = Array.isArray(question?.test_cases) ? question.test_cases : [];
  if (!cases.length) {
    issues.push({ field: 'test_cases', message: 'At least one test case is required before publishing.' });
  }

  const seen = new Set();
  cases.forEach((tc, index) => {
    const input = String(tc?.input ?? '');
    const expected = normalizeOutput(tc?.expected_output);
    if (!expected) {
      issues.push({ field: `test_cases.${index}.expected_output`, message: `Test case #${index + 1} needs an expected output.` });
    }
    const key = `${input}\u0000${expected}`;
    if (seen.has(key)) {
      issues.push({ field: `test_cases.${index}`, message: `Test case #${index + 1} duplicates another test case.` });
    }
    seen.add(key);
  });

  const hiddenCount = cases.filter(tc => Boolean(tc?.is_hidden)).length;
  if (cases.length >= 2 && hiddenCount === 0) {
    issues.push({ field: 'test_cases', message: 'Add at least one hidden test case for production evaluation.' });
  }

  const timeLimit = Number(question?.time_limit_ms);
  if (question?.time_limit_ms !== undefined && (!Number.isFinite(timeLimit) || timeLimit < 100 || timeLimit > 120000)) {
    issues.push({ field: 'time_limit_ms', message: 'Time limit must be between 100ms and 120000ms.' });
  }
  const memoryLimit = Number(question?.memory_limit_mb);
  if (question?.memory_limit_mb !== undefined && (!Number.isFinite(memoryLimit) || memoryLimit < 16 || memoryLimit > 2048)) {
    issues.push({ field: 'memory_limit_mb', message: 'Memory limit must be between 16MB and 2048MB.' });
  }

  return { valid: issues.length === 0, issues };
}

function assertPublishable(question) {
  const result = validateQuestionForPublish(question);
  if (!result.valid) {
    throw new AppError('Question failed publish validation.', 422, 'QUESTION_VALIDATION_FAILED', undefined, result.issues);
  }
  return result;
}

/**
 * Validates reference solution execution against all test cases.
 */
async function validateReferenceSolution({ language = 'javascript', sourceCode, testCases }) {
  if (!sourceCode || !sourceCode.trim()) {
    return { valid: false, error: 'No reference solution code provided.' };
  }
  if (!testCases || !testCases.length) {
    return { valid: false, error: 'No test cases available to execute against.' };
  }

  try {
    const result = await executeCode({
      language,
      sourceCode,
      testCases,
      isSubmit: true
    });

    const isAccepted = result.status === 'Accepted' && result.passed_tests === testCases.length;
    return {
      valid: isAccepted,
      status: result.status,
      passed_tests: result.passed_tests,
      total_tests: testCases.length,
      execution_time_ms: result.execution_time_ms,
      results: result.results
    };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

module.exports = {
  validateQuestionForPublish,
  assertPublishable,
  validateReferenceSolution
};
