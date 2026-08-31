const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PORT = Number(process.env.PORT || 8080);
const RUNNER_TOKEN = process.env.CODE_RUNNER_TOKEN;
if (!RUNNER_TOKEN) {
  throw new Error('CODE_RUNNER_TOKEN must be configured');
}

const MAX_CODE = 100_000;
const MAX_INPUT = 20_000;
const MAX_OUTPUT = 64 * 1024;
const MAX_TEST_CASES = 20;
const MAX_REQUEST_BYTES = 500_000;
const TIMEOUT = 5_000;
const COMPILE_TIMEOUT = 10_000;

const SAFE_ENV = {
  PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
  HOME: '/tmp',
  TMPDIR: '/runner/work'
};

const LANGUAGE_FILES = {
  java: 'Main.java',
  python: 'main.py',
  typescript: 'main.ts',
  javascript: 'main.js',
  cpp: 'main.cpp',
  c: 'main.c'
};

function normalizeOutput(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
}

function outputsMatch(actual, expected) {
  const normalizedActual = normalizeOutput(actual);
  const normalizedExpected = normalizeOutput(expected);

  if (normalizedActual === normalizedExpected) return true;

  // Coding-problem outputs are often JSON-like values. Compare parsed JSON
  // structurally so formatting differences such as [0,1] vs [0, 1] do not
  // incorrectly produce Wrong Answer.
  try {
    const actualValue = JSON.parse(normalizedActual);
    const expectedValue = JSON.parse(normalizedExpected);
    return JSON.stringify(actualValue) === JSON.stringify(expectedValue);
  } catch {
    return false;
  }
}

function execute(command, args, input, timeout) {
  return new Promise(resolve => {
    let child;
    let timer;
    let settled = false;
    let stdout = '';
    let stderr = '';
    const started = Date.now();

    const finish = result => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ...result, execution_time_ms: Date.now() - started });
    };

    try {
      child = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: true,
        env: SAFE_ENV
      });
    } catch (e) {
      finish({ status: 'RUNTIME_ERROR', stdout: '', stderr: e.message });
      return;
    }

    const killGroup = () => {
      try {
        process.kill(-child.pid, 'SIGKILL');
      } catch {
        try { child.kill('SIGKILL'); } catch {}
      }
    };

    timer = setTimeout(() => {
      killGroup();
      finish({ status: 'TIME_LIMIT_EXCEEDED', stdout, stderr });
    }, timeout);

    child.stdout.on('data', chunk => {
      stdout += chunk.toString();
      if (Buffer.byteLength(stdout) > MAX_OUTPUT) {
        killGroup();
        finish({
          status: 'OUTPUT_LIMIT_EXCEEDED',
          stdout: stdout.slice(0, MAX_OUTPUT),
          stderr: 'Output limit exceeded'
        });
      }
    });

    child.stderr.on('data', chunk => {
      stderr += chunk.toString();
      if (Buffer.byteLength(stderr) > MAX_OUTPUT) {
        killGroup();
        finish({
          status: 'OUTPUT_LIMIT_EXCEEDED',
          stdout,
          stderr: stderr.slice(0, MAX_OUTPUT)
        });
      }
    });

    child.on('error', err => finish({ status: 'RUNTIME_ERROR', stdout, stderr: err.message }));
    child.on('close', code => finish({
      status: code === 0 ? 'PASSED' : 'RUNTIME_ERROR',
      stdout: stdout.slice(0, MAX_OUTPUT),
      stderr: stderr.slice(0, MAX_OUTPUT),
      exitCode: code
    }));

    try {
      child.stdin.end(input || '');
    } catch (err) {
      finish({ status: 'RUNTIME_ERROR', stdout, stderr: err.message });
    }
  });
}

async function run(body) {
  const language = String(body.language || '').toLowerCase();
  const code = String(body.code || '');
  const testCases = Array.isArray(body.testCases) ? body.testCases.slice(0, MAX_TEST_CASES) : [];

  if (!Object.hasOwn(LANGUAGE_FILES, language)) throw new Error('Unsupported language');
  if (code.length > MAX_CODE) throw new Error('Source code is too large');
  if (testCases.length === 0) throw new Error('At least one test case is required');
  if (testCases.some(t => String(t.input || '').length > MAX_INPUT)) {
    throw new Error('Test input is too large');
  }

  const dir = fs.mkdtempSync(path.join('/runner/work', 'axly-'));
  const file = path.join(dir, LANGUAGE_FILES[language]);

  try {
    let source = code;
    if (language === 'java' && /public\s+class\s+Solution\b/.test(source)) {
      source = source.replace(/public\s+class\s+Solution\b/, 'public class Main');
    }

    fs.writeFileSync(file, source, { mode: 0o600 });

    let command;
    let args;
    let executionFile = file;

    if (language === 'typescript') {
      const compiled = await execute(
        'tsc',
        ['--target', 'ES2022', '--module', 'commonjs', '--outDir', dir, file],
        '',
        COMPILE_TIMEOUT
      );
      if (compiled.status !== 'PASSED') {
        return {
          status: 'COMPILATION_ERROR',
          stderr: compiled.stderr,
          stdout: compiled.stdout,
          execution_time_ms: compiled.execution_time_ms
        };
      }
      executionFile = path.join(dir, 'main.js');
      command = 'node';
      args = [executionFile];
    } else if (language === 'c' || language === 'cpp') {
      const compiler = language === 'c' ? 'gcc' : 'g++';
      const out = path.join(dir, 'program');
      const compiled = await execute(compiler, ['-O2', file, '-o', out], '', COMPILE_TIMEOUT);
      if (compiled.status !== 'PASSED') {
        return {
          status: 'COMPILATION_ERROR',
          stderr: compiled.stderr,
          stdout: compiled.stdout,
          execution_time_ms: compiled.execution_time_ms
        };
      }
      command = out;
      args = [];
    } else if (language === 'java') {
      const compiled = await execute('javac', [file], '', COMPILE_TIMEOUT);
      if (compiled.status !== 'PASSED') {
        return {
          status: 'COMPILATION_ERROR',
          stderr: compiled.stderr,
          stdout: compiled.stdout,
          execution_time_ms: compiled.execution_time_ms
        };
      }
      command = 'java';
      args = ['-cp', dir, 'Main'];
    } else {
      command = language === 'python' ? '/usr/bin/python3' : 'node';
      args = [executionFile];
    }

    const results = [];
    let totalExecution = 0;

    for (const tc of testCases) {
      const result = await execute(command, args, String(tc.input || ''), TIMEOUT);
      totalExecution += result.execution_time_ms;

      const actual = result.stdout.trim();
      const expected = String(tc.expectedOutput ?? '').trim();
      const hidden = Boolean(tc.is_hidden);
      const outputMatches = result.status === 'PASSED' && outputsMatch(actual, expected);

      results.push({
        is_hidden: hidden,
        input: hidden ? '[Hidden Test Case]' : String(tc.input || ''),
        expected_output: hidden ? '[Hidden Output]' : expected,
        actual_output: hidden ? (outputMatches ? '[Output Passed]' : '[Output Failed]') : actual,
        status: result.status === 'PASSED' && !outputMatches ? 'WRONG_ANSWER' : result.status,
        stderr: hidden ? undefined : result.stderr
      });

      if (!outputMatches) break;
    }

    const passedTests = results.filter(r => r.status === 'PASSED').length;
    const failed = results[results.length - 1];
    const status = failed?.status === 'TIME_LIMIT_EXCEEDED'
      ? 'TIME_LIMIT_EXCEEDED'
      : failed?.status === 'OUTPUT_LIMIT_EXCEEDED'
        ? 'OUTPUT_LIMIT_EXCEEDED'
        : failed?.status === 'RUNTIME_ERROR'
          ? 'RUNTIME_ERROR'
          : passedTests === testCases.length
            ? 'ACCEPTED'
            : 'WRONG_ANSWER';

    return {
      status,
      passed_tests: passedTests,
      total_tests: testCases.length,
      execution_time_ms: totalExecution,
      results
    };
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json',
    'cache-control': 'no-store'
  });
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    return sendJson(res, 200, { status: 'ok' });
  }

  if (req.method !== 'POST' || req.url !== '/execute') {
    return sendJson(res, 404, { message: 'Not found' });
  }

  if (req.headers.authorization !== `Bearer ${RUNNER_TOKEN}`) {
    return sendJson(res, 401, { message: 'Unauthorized' });
  }

  let raw = '';
  let tooLarge = false;

  req.on('data', chunk => {
    raw += chunk;
    if (Buffer.byteLength(raw) > MAX_REQUEST_BYTES) {
      tooLarge = true;
      req.destroy();
    }
  });

  req.on('end', async () => {
    if (tooLarge) return;
    try {
      const body = JSON.parse(raw);
      const result = await run(body);
      sendJson(res, 200, result);
    } catch (e) {
      sendJson(res, 400, { message: e.message });
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Code runner listening on 0.0.0.0:${PORT}`);
});
