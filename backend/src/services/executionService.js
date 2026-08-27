const { v4: uuidv4 } = require('uuid');

const MAX_EXECUTION_TIME_MS = 5000;
const MAX_OUTPUT_BYTES = 64 * 1024;
const RUNNER_URL = process.env.CODE_EXECUTION_SERVICE_URL;

function normalizeOutput(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
}

async function executeCode({ language, sourceCode, testCases = [], isSubmit = false }) {
  if (!RUNNER_URL) {
    const err = new Error('Secure code execution service is not configured');
    err.statusCode = 503;
    err.code = 'EXECUTION_SERVICE_NOT_CONFIGURED';
    throw err;
  }

  if (typeof sourceCode !== 'string' || sourceCode.length > 100000) {
    const err = new Error('Source code is missing or exceeds the 100 KB limit');
    err.statusCode = 400;
    throw err;
  }

  if (!Array.isArray(testCases) || testCases.length === 0 || testCases.length > 20) {
    const err = new Error('Invalid test case count');
    err.statusCode = 400;
    throw err;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MAX_EXECUTION_TIME_MS + 2000);

  try {
    const response = await fetch(`${RUNNER_URL.replace(/\/$/, '')}/execute`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        language,
        code: sourceCode,
        testCases: testCases.map(tc => ({
          input: String(tc.input ?? ''),
          expectedOutput: String(tc.expected_output ?? ''),
          is_hidden: Boolean(tc.is_hidden)
        })),
        isSubmit
      }),
      signal: controller.signal
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const err = new Error(payload.message || 'Code execution service failed');
      err.statusCode = response.status >= 500 ? 502 : response.status;
      throw err;
    }

    return {
      status: payload.status,
      passed_tests: Number(payload.passed_tests || 0),
      total_tests: Number(payload.total_tests || testCases.length),
      execution_time_ms: Number(payload.execution_time_ms || 0),
      results: Array.isArray(payload.results) ? payload.results.map(r => ({
        ...r,
        input: r.is_hidden ? '[Hidden Test Case]' : r.input,
        expected_output: r.is_hidden ? '[Hidden Output]' : r.expected_output,
        actual_output: r.is_hidden ? (r.status === 'Passed' ? '[Output Passed]' : '[Output Failed]') : normalizeOutput(r.actual_output)
      })) : []
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      const timeout = new Error('Code execution service timed out');
      timeout.statusCode = 504;
      timeout.code = 'EXECUTION_SERVICE_TIMEOUT';
      throw timeout;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { executeCode, normalizeOutput, MAX_OUTPUT_BYTES, uuidv4 };