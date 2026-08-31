const fs = require('fs');
const os = require('os');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const MAX_EXECUTION_TIME_MS = 5000;
const MAX_OUTPUT_BYTES = 64 * 1024;
const RUNNER_URL = process.env.CODE_EXECUTION_SERVICE_URL;
const RUNNER_TOKEN = process.env.CODE_RUNNER_TOKEN;

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
    const headers = { 'content-type': 'application/json' };
    if (RUNNER_TOKEN) headers.authorization = `Bearer ${RUNNER_TOKEN}`;

    const response = await fetch(`${RUNNER_URL.replace(/\/$/, '')}/execute`, {
      method: 'POST',
      headers,
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

// Development/test-only fallback. Production must always use the isolated runner.
async function executeLocally({ language, sourceCode, testCases }) {
  const { spawn } = require('child_process');
  const lang = String(language || 'javascript').toLowerCase();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'axly-code-'));
  const extMap = { javascript: 'js', js: 'js', node: 'js', python: 'py', py: 'py', python3: 'py', typescript: 'ts', ts: 'ts', java: 'java', cpp: 'cpp', c: 'c' };
  const ext = extMap[lang] || 'js';
  const fileName = lang === 'java' ? 'Main.java' : `solution_${uuidv4()}.${ext}`;
  const filePath = path.join(tempDir, fileName);

  function runProcess(command, args, input, timeoutMs = MAX_EXECUTION_TIME_MS) {
    return new Promise(resolve => {
      let stdout = '', stderr = '', settled = false, child;
      const started = Date.now();
      let timer;
      const finish = result => { if (settled) return; settled = true; clearTimeout(timer); resolve({ ...result, executionTimeMs: Date.now() - started }); };
      try { child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true }); }
      catch (err) { return finish({ status: 'Runtime Error', stdout, stderr: err.message }); }
      timer = setTimeout(() => { try { child.kill('SIGKILL'); } catch {} finish({ status: 'Time Limit Exceeded', stdout, stderr: 'Time Limit Exceeded (5s limit)' }); }, timeoutMs);
      child.stdout.on('data', data => { stdout += data.toString(); if (Buffer.byteLength(stdout) > MAX_OUTPUT_BYTES) { try { child.kill('SIGKILL'); } catch {} finish({ status: 'Output Limit Exceeded', stdout: stdout.slice(0, MAX_OUTPUT_BYTES), stderr: 'Output limit exceeded (64KB max)' }); } });
      child.stderr.on('data', data => { stderr += data.toString(); });
      child.on('error', err => finish({ status: 'Runtime Error', stdout, stderr: err.message }));
      child.on('close', code => finish({ status: code === 0 ? 'Passed' : 'Runtime Error', stdout, stderr }));
      try { child.stdin.end(input || ''); } catch (err) { finish({ status: 'Runtime Error', stdout, stderr: err.message }); }
    });
  }

  try {
    fs.writeFileSync(filePath, sourceCode, 'utf-8');
    let command = 'node', args = [filePath];
    const isWin = process.platform === 'win32';
    const shellCmd = isWin ? 'cmd' : 'sh', shellArg = isWin ? '/c' : '-c';
    if (lang.includes('python') || lang === 'py') { command = isWin ? 'python' : 'python3'; }
    else if (lang === 'typescript' || lang === 'ts') { command = isWin ? 'npx.cmd' : 'npx'; args = ['ts-node', '--skip-project', filePath]; }
    else if (lang === 'java') { command = shellCmd; args = [shellArg, `javac "${filePath}" && java -cp "${tempDir}" Main`]; }
    else if (lang === 'cpp' || lang === 'c++') { const out = path.join(tempDir, isWin ? 'a.exe' : 'a.out'); command = shellCmd; args = [shellArg, `g++ -O2 -o "${out}" "${filePath}" && "${out}"`]; }
    else if (lang === 'c') { const out = path.join(tempDir, isWin ? 'a.exe' : 'a.out'); command = shellCmd; args = [shellArg, `gcc -o "${out}" "${filePath}" && "${out}"`]; }

    const results = [], passed = [];
    let maxTimeMs = 0;
    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i], exec = await runProcess(command, args, String(tc.input ?? ''));
      maxTimeMs = Math.max(maxTimeMs, exec.executionTimeMs);
      const actual = normalizeOutput(exec.stdout), expected = normalizeOutput(tc.expected_output);
      const ok = exec.status === 'Passed' && (!tc.expected_output || actual === expected);
      const status = exec.status !== 'Passed' ? exec.status : ok ? 'Passed' : 'Wrong Answer';
      if (ok) passed.push(i + 1);
      results.push({ test_index: i + 1, status, is_hidden: Boolean(tc.is_hidden), input: tc.is_hidden ? '[Hidden Test Case]' : tc.input, expected_output: tc.is_hidden ? '[Hidden Output]' : tc.expected_output, actual_output: tc.is_hidden ? (ok ? '[Output Passed]' : '[Output Failed]') : actual, stderr: tc.is_hidden ? undefined : (exec.stderr || undefined), execution_time_ms: exec.executionTimeMs });
    }
    const status = passed.length === testCases.length ? 'Accepted' : results.some(r => r.status === 'Time Limit Exceeded') ? 'Time Limit Exceeded' : results.some(r => r.status === 'Runtime Error') ? 'Runtime Error' : 'Wrong Answer';
    return { status, passed_tests: passed.length, total_tests: testCases.length, execution_time_ms: maxTimeMs, results };
  } finally {
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
  }
}

module.exports = { executeCode, normalizeOutput };