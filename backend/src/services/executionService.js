const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const MAX_EXECUTION_TIME_MS = 5000;
const MAX_OUTPUT_BYTES = 64 * 1024;
const RUNNER_URL = process.env.CODE_EXECUTION_SERVICE_URL;

function normalizeOutput(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
}

function runProcess(command, args, input, timeoutMs = MAX_EXECUTION_TIME_MS) {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let isSettled = false;
    const startTime = Date.now();

    let child;
    try {
      child = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true
      });
    } catch (err) {
      return resolve({
        status: 'Runtime Error',
        stdout: '',
        stderr: err.message,
        executionTimeMs: 0
      });
    }

    const timer = setTimeout(() => {
      if (!isSettled) {
        isSettled = true;
        try { child.kill('SIGKILL'); } catch {}
        resolve({
          status: 'Time Limit Exceeded',
          stdout,
          stderr: 'Time Limit Exceeded (5s limit)',
          executionTimeMs: timeoutMs
        });
      }
    }, timeoutMs);

    child.stdout.on('data', (data) => {
      stdout += data.toString();
      if (Buffer.byteLength(stdout) > MAX_OUTPUT_BYTES) {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timer);
          try { child.kill('SIGKILL'); } catch {}
          resolve({
            status: 'Output Limit Exceeded',
            stdout: stdout.slice(0, MAX_OUTPUT_BYTES),
            stderr: 'Output limit exceeded (64KB max)',
            executionTimeMs: Date.now() - startTime
          });
        }
      }
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', (err) => {
      if (!isSettled) {
        isSettled = true;
        clearTimeout(timer);
        resolve({
          status: 'Runtime Error',
          stdout,
          stderr: err.message,
          executionTimeMs: Date.now() - startTime
        });
      }
    });

    child.on('close', (code) => {
      if (!isSettled) {
        isSettled = true;
        clearTimeout(timer);
        resolve({
          status: code === 0 ? 'Passed' : 'Runtime Error',
          stdout,
          stderr,
          executionTimeMs: Date.now() - startTime
        });
      }
    });

    try {
      child.stdin.write(input || '');
      child.stdin.end();
    } catch (err) {
      if (!isSettled) {
        isSettled = true;
        clearTimeout(timer);
        resolve({
          status: 'Runtime Error',
          stdout,
          stderr: err.message,
          executionTimeMs: Date.now() - startTime
        });
      }
    }
  });
}

async function executeLocally({ language, sourceCode, testCases, isSubmit }) {
  const lang = String(language || 'javascript').toLowerCase();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'axly-code-'));
  const extMap = {
    javascript: 'js', js: 'js', node: 'js',
    python: 'py', py: 'py', python3: 'py',
    typescript: 'ts', ts: 'ts',
    java: 'java', cpp: 'cpp', c: 'c'
  };
  const ext = extMap[lang] || 'js';
  const fileName = `solution_${uuidv4()}.${ext}`;
  const filePath = path.join(tempDir, fileName);

  try {
    fs.writeFileSync(filePath, sourceCode, 'utf-8');

    let command = 'node';
    let args = [filePath];

    if (lang.includes('python') || lang === 'py') {
      command = process.platform === 'win32' ? 'python' : 'python3';
      args = [filePath];
    }

    const results = [];
    let passedCount = 0;
    let maxTimeMs = 0;

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      const exec = await runProcess(command, args, String(tc.input ?? ''));

      maxTimeMs = Math.max(maxTimeMs, exec.executionTimeMs);
      const actualNormalized = normalizeOutput(exec.stdout);
      const expectedNormalized = normalizeOutput(tc.expected_output);

      let testStatus = 'Accepted';
      if (exec.status !== 'Passed') {
        testStatus = exec.status; // 'Runtime Error' | 'Time Limit Exceeded' | etc.
      } else if (actualNormalized !== expectedNormalized && tc.expected_output !== undefined && tc.expected_output !== '') {
        testStatus = 'Wrong Answer';
      }

      const isPassed = testStatus === 'Accepted' || (exec.status === 'Passed' && (!tc.expected_output || actualNormalized === expectedNormalized));
      if (isPassed) {
        testStatus = 'Passed';
        passedCount++;
      }

      results.push({
        test_index: i + 1,
        status: testStatus,
        is_hidden: Boolean(tc.is_hidden),
        input: tc.is_hidden ? '[Hidden Test Case]' : tc.input,
        expected_output: tc.is_hidden ? '[Hidden Output]' : tc.expected_output,
        actual_output: tc.is_hidden ? (isPassed ? '[Output Passed]' : '[Output Failed]') : actualNormalized,
        stderr: tc.is_hidden ? undefined : (exec.stderr || undefined),
        execution_time_ms: exec.executionTimeMs
      });
    }

    let overallStatus = 'Accepted';
    if (passedCount === testCases.length) {
      overallStatus = 'Accepted';
    } else if (results.some(r => r.status === 'Time Limit Exceeded')) {
      overallStatus = 'Time Limit Exceeded';
    } else if (results.some(r => r.status === 'Runtime Error')) {
      overallStatus = 'Runtime Error';
    } else {
      overallStatus = 'Wrong Answer';
    }

    return {
      status: overallStatus,
      passed_tests: passedCount,
      total_tests: testCases.length,
      execution_time_ms: maxTimeMs,
      results
    };
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  }
}

async function executeCode({ language, sourceCode, testCases = [], isSubmit = false }) {
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

  if (RUNNER_URL) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), MAX_EXECUTION_TIME_MS + 2000);

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
      clearTimeout(timer);

      if (response.ok) {
        const payload = await response.json();
        return {
          status: payload.status === 'ACCEPTED' ? 'Accepted' : payload.status === 'WRONG_ANSWER' ? 'Wrong Answer' : payload.status === 'RUNTIME_ERROR' ? 'Runtime Error' : payload.status,
          passed_tests: Number(payload.passed_tests || 0),
          total_tests: Number(payload.total_tests || testCases.length),
          execution_time_ms: Number(payload.execution_time_ms || 0),
          results: Array.isArray(payload.results) ? payload.results.map((r, idx) => ({
            test_index: idx + 1,
            status: r.status === 'PASSED' ? 'Passed' : r.status === 'WRONG_ANSWER' ? 'Wrong Answer' : r.status,
            is_hidden: Boolean(r.is_hidden),
            input: r.is_hidden ? '[Hidden Test Case]' : r.input,
            expected_output: r.is_hidden ? '[Hidden Output]' : r.expected_output,
            actual_output: r.is_hidden ? (r.status === 'PASSED' ? '[Output Passed]' : '[Output Failed]') : normalizeOutput(r.actual_output),
            stderr: r.stderr
          })) : []
        };
      }
    } catch {
      // Fallback to local sandbox
    }
  }

  return executeLocally({ language, sourceCode, testCases, isSubmit });
}

module.exports = { executeCode, normalizeOutput };