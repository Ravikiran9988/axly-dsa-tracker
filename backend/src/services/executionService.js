const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

const MAX_EXECUTION_TIME_MS = 4000;
const MAX_OUTPUT_BYTES = 64 * 1024; // 64 KB

function normalizeOutput(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
}

/**
 * Execute a single test case in a sandboxed process
 */
function runSingleTestCase({ command, args, scriptPath, input, timeoutMs = MAX_EXECUTION_TIME_MS }) {
  return new Promise((resolve) => {
    const startTime = process.hrtime.bigint();
    let stdout = '';
    let stderr = '';
    let isTimedOut = false;

    // Sanitized minimal environment (prevent access to server secrets)
    const sanitizedEnv = {
      PATH: process.env.PATH,
      SYSTEMROOT: process.env.SYSTEMROOT,
      TEMP: process.env.TEMP,
      TMP: process.env.TMP,
      PYTHONUNBUFFERED: '1',
      NODE_ENV: 'sandbox'
    };

    const child = spawn(command, [...args, scriptPath], {
      env: sanitizedEnv,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const timer = setTimeout(() => {
      isTimedOut = true;
      try {
        if (process.platform === 'win32') {
          spawn('taskkill', ['/pid', child.pid.toString(), '/f', '/t']);
        } else {
          child.kill('SIGKILL');
        }
      } catch (e) {
        // ignore
      }
    }, timeoutMs);

    // Send input via stdin with normalized \n
    if (input !== undefined && input !== null) {
      const normalizedInput = input.replace(/\r\n/g, '\n');
      child.stdin.write(normalizedInput);
      child.stdin.end();
    } else {
      child.stdin.end();
    }

    child.stdout.on('data', (data) => {
      if (stdout.length < MAX_OUTPUT_BYTES) {
        stdout += data.toString();
      }
    });

    child.stderr.on('data', (data) => {
      if (stderr.length < MAX_OUTPUT_BYTES) {
        stderr += data.toString();
      }
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1e6;
      resolve({
        status: 'Runtime Error',
        stdout: stdout.slice(0, MAX_OUTPUT_BYTES),
        stderr: err.message || 'Process error',
        exitCode: 1,
        executionTimeMs: Math.round(durationMs * 10) / 10
      });
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1e6;

      if (isTimedOut) {
        return resolve({
          status: 'Time Limit Exceeded',
          stdout: stdout.slice(0, MAX_OUTPUT_BYTES),
          stderr: 'Time Limit Exceeded (Execution exceeded 4.0s)',
          exitCode: null,
          executionTimeMs: timeoutMs
        });
      }

      if (code !== 0) {
        return resolve({
          status: 'Runtime Error',
          stdout: stdout.slice(0, MAX_OUTPUT_BYTES),
          stderr: stderr.slice(0, MAX_OUTPUT_BYTES) || `Exited with code ${code}`,
          exitCode: code,
          executionTimeMs: Math.round(durationMs * 10) / 10
        });
      }

      resolve({
        status: 'Success',
        stdout: stdout.slice(0, MAX_OUTPUT_BYTES),
        stderr: stderr.slice(0, MAX_OUTPUT_BYTES),
        exitCode: 0,
        executionTimeMs: Math.round(durationMs * 10) / 10
      });
    });
  });
}

/**
 * Execute code against a set of test cases
 */
async function executeCode({ language, sourceCode, testCases, isSubmit = false }) {
  const normLang = (language || 'javascript').toLowerCase();
  let command = 'node';
  let args = [];
  let fileExt = '.js';

  if (normLang === 'python' || normLang === 'py' || normLang === 'python3') {
    command = process.platform === 'win32' ? 'python' : 'python3';
    fileExt = '.py';
  } else if (normLang === 'javascript' || normLang === 'js' || normLang === 'node') {
    command = 'node';
    fileExt = '.js';
  } else {
    throw new Error(`Unsupported language: ${language}. Supported languages: javascript, python`);
  }

  // Create temporary sandbox directory
  const sandboxId = uuidv4();
  const sandboxDir = path.join(os.tmpdir(), `axly_code_${sandboxId}`);
  fs.mkdirSync(sandboxDir, { recursive: true });
  const scriptPath = path.join(sandboxDir, `solution${fileExt}`);
  fs.writeFileSync(scriptPath, sourceCode, 'utf-8');

  try {
    let passedCount = 0;
    let overallStatus = 'Accepted';
    let totalTime = 0;
    const results = [];

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      const execResult = await runSingleTestCase({
        command,
        args,
        scriptPath,
        input: tc.input
      });

      totalTime += execResult.executionTimeMs;

      let caseStatus = 'Wrong Answer';
      const actualNorm = normalizeOutput(execResult.stdout);
      const expectedNorm = normalizeOutput(tc.expected_output);

      if (execResult.status === 'Time Limit Exceeded') {
        caseStatus = 'Time Limit Exceeded';
        if (overallStatus === 'Accepted') overallStatus = 'Time Limit Exceeded';
      } else if (execResult.status === 'Runtime Error') {
        caseStatus = 'Runtime Error';
        if (overallStatus === 'Accepted') overallStatus = 'Runtime Error';
      } else if (actualNorm === expectedNorm) {
        caseStatus = 'Passed';
        passedCount++;
      } else {
        caseStatus = 'Wrong Answer';
        if (overallStatus === 'Accepted') overallStatus = 'Wrong Answer';
      }

      // Format result item: mask hidden test case input/output from response
      const isHidden = Boolean(tc.is_hidden);
      results.push({
        test_index: i + 1,
        is_hidden: isHidden,
        status: caseStatus,
        execution_time_ms: execResult.executionTimeMs,
        input: isHidden ? '[Hidden Test Case]' : tc.input,
        expected_output: isHidden ? '[Hidden Output]' : tc.expected_output,
        actual_output: isHidden 
          ? (caseStatus === 'Passed' ? '[Output Passed]' : '[Output Failed]') 
          : actualNorm,
        stderr: isHidden && caseStatus !== 'Runtime Error' ? null : execResult.stderr || null
      });
    }

    if (passedCount !== testCases.length && overallStatus === 'Accepted') {
      overallStatus = 'Wrong Answer';
    }

    return {
      status: overallStatus,
      passed_tests: passedCount,
      total_tests: testCases.length,
      execution_time_ms: Math.round(totalTime * 10) / 10,
      results
    };
  } finally {
    // Clean up temporary files
    try {
      if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath);
      if (fs.existsSync(sandboxDir)) fs.rmSync(sandboxDir, { recursive: true, force: true });
    } catch (cleanupErr) {
      // ignore
    }
  }
}

module.exports = {
  executeCode,
  normalizeOutput
};
