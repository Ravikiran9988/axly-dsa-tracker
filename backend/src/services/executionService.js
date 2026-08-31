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

  // Production must always use the isolated code runner. Never execute
  // untrusted student code inside the API/Heroku dyno.
  if (!RUNNER_URL) {
    if (process.env.NODE_ENV === 'production') {
      const err = new Error('Code execution service is unavailable');
      err.statusCode = 503;
      err.code = 'CODE_EXECUTION_UNAVAILABLE';
      throw err;
    }
    return executeLocally({ language, sourceCode, testCases, isSubmit });
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

    if (!response.ok) {
      const err = new Error(`Code execution service returned HTTP ${response.status}`);
      err.statusCode = response.status >= 400 && response.status < 500 ? response.status : 503;
      err.code = 'CODE_EXECUTION_UNAVAILABLE';
      throw err;
    }

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
  } catch (err) {
    if (err.code === 'CODE_EXECUTION_UNAVAILABLE') throw err;

    const unavailable = new Error('Code execution service is unavailable');
    unavailable.statusCode = 503;
    unavailable.code = 'CODE_EXECUTION_UNAVAILABLE';
    unavailable.cause = err;
    throw unavailable;
  } finally {
    clearTimeout(timer);
  }
}

// Development/test-only fallback. This function must never be reached by
// production because executeCode() explicitly rejects missing RUNNER_URL there.
async function executeLocally({ language, sourceCode, testCases, isSubmit }) {
  const { spawn } = require('child_process');
  const lang = String(language || 'javascript').toLowerCase();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'axly-code-'));
  const extMap = {
    javascript: 'js', js: 'js', node: 'js',
    python: 'py', py: 'py', python3: 'py',
    typescript: 'ts', ts: 'ts',
    java: 'java', cpp: 'cpp', c: 'c'
  };
  const ext = extMap[lang] || 'js';
  const fileName = lang === 'java' ? 'Main.java' : `solution_${uuidv4()}.${ext}`;
  const filePath = path.join(tempDir, fileName);

  function runProcess(command, args, input, timeoutMs = MAX_EXECUTION_TIME_MS) {
    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let isSettled = false;
      const startTime = Date.now();
      let child;
      try {
        child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
      } catch (err) {
        return resolve({ status: 'Runtime Error', stdout: '', stderr: err.message, executionTimeMs: 0 });
      }
      const finish = (result) => {
        if (isSettled) return;
        isSettled = true;
        clearTimeout(timer);
        resolve({ ...result, executionTimeMs: Date.now() - startTime });
      };
      const timer = setTimeout(() => {
        try { child.kill('SIGKILL'); } catch {}
        finish({ status: 'Time Limit Exceeded', stdout, stderr: 'Time Limit Exceeded (5s limit)' });
      }, timeoutMs);
      child.stdout.on('data', data => {
        stdout += data.toString();
        if (Buffer.byteLength(stdout) > MAX_OUTPUT_BYTES) {
          try { child.kill('SIGKILL'); } catch {}
          finish({ status: 'Output Limit Exceeded', stdout: stdout.slice(0, MAX_OUTPUT_BYTES), stderr: 'Output limit exceeded (64KB max)' });
        }
      });
      child.stderr.on('data', data => { stderr += data.toString(); });
      child.on('error', err => finish({ status: 'Runtime Error', stdout, stderr: err.message }));
      child.on('close', code => finish({ status: code === 0 ? 'Passed' : 'Runtime Error', stdout, stderr }));
      try { child.stdin.end(input || ''); } catch (err) { finish({ status: 'Runtime Error', stdout, stderr: err.message }); }
    });
  }

  try {
    fs.writeFileSync(filePath, sourceCode, 'utf-8');
    let command = 'node';
    let args = [filePath];
    const isWin = process.platform === 'win32';
    const shellCmd = isWin ? 'cmd' : 'sh';
    const shellArg = isWin ? '/c' : '-c';
    if (lang.includes('python') || lang === 'py') {
      command = isWin ? 'python' : 'python3';
      args = [filePath];
    } else if (lang === 'typescript' || lang === 'ts') {
      command = isWin ? 'npx.cmd' : 'npx';
      args = ['ts-node', '--skip-project', filePath];
    } else if (lang === 'java') {
      command = shellCmd;
      args = [shellArg, `javac "${filePath}" && java -cp "${tempDir}" Main`];
    } else if (lang === 'cpp' || lang === 'c++') {
      const outPath = path.join(tempDir, isWin ? 'a.exe' : 'a.out');
      command = shellCmd;
      args = [shellArg, `g++ -O2 -o "${outPath}" "${filePath}" && "${outPath}"`];
    } else if (lang === 'c') {
      const outPath = path.join(tempDir, isWin ? 'a.exe' : 'a.out');
      command = shellCmd;
      args = [shellArg, `gcc -o "${outPath}" "${filePath}" && "${outPath}"`];
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
      if (exec.status !== 'Passed') testStatus = exec.status;
      else if (actualNormalized !== expectedNormalized && tc.expected_output !== undefined && tc.expected_output !== '') testStatus = 'Wrong Answer';
      const isPassed = testStatus === 'Accepted';
      if (isPassed) passedCount++;
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
    if (passedCount !== testCases.length) {
      overallStatus = results.some(r => r.status === 'Time Limit Exceeded') ? 'Time Limit Exceeded' : results.some(r => r.status === 'Runtime Error') ? 'Runtime Error' : 'Wrong Answer';
    }
    return { status: overallStatus, passed_tests: passedCount, total_tests: testCases.length, execution_time_ms: maxTimeMs, results };
  } finally {
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
  }
}

module.exports = { executeCode, normalizeOutput };