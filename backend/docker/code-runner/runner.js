const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PORT = Number(process.env.PORT || 8080);
const RUNNER_TOKEN = process.env.CODE_RUNNER_TOKEN;
const MAX_CODE = 100_000;
const MAX_INPUT = 20_000;
const MAX_OUTPUT = 64 * 1024;
const MAX_TEST_CASES = 20;
const TIMEOUT = 5_000;
const COMPILE_TIMEOUT = 10_000;

const LANGUAGE_FILES = {
  java: 'Main.java', python: 'main.py', typescript: 'main.ts',
  javascript: 'main.js', cpp: 'main.cpp', c: 'main.c'
};

function execute(command, args, input, timeout) {
  return new Promise(resolve => {
    let child;
    try {
      child = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: true,
        env: {
          PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
          HOME: '/tmp',
          TMPDIR: '/runner/work'
        }
      });
    } catch (e) {
      return resolve({ status: 'RUNTIME_ERROR', stdout: '', stderr: e.message, execution_time_ms: 0 });
    }

    let stdout = '', stderr = '', settled = false;
    const started = Date.now();
    let timer;
    const finish = result => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve({ ...result, execution_time_ms: Date.now() - started });
      }
    };
    const killGroup = () => {
      try { process.kill(-child.pid, 'SIGKILL'); } catch { try { child.kill('SIGKILL'); } catch {} }
    };
    timer = setTimeout(() => {
      killGroup();
      finish({ status: 'TIME_LIMIT_EXCEEDED', stdout, stderr });
    }, timeout);
    child.stdout.on('data', d => {
      stdout += d.toString();
      if (Buffer.byteLength(stdout) > MAX_OUTPUT) {
        killGroup();
        finish({ status: 'OUTPUT_LIMIT_EXCEEDED', stdout: stdout.slice(0, MAX_OUTPUT), stderr });
      }
    });
    child.stderr.on('data', d => {
      stderr += d.toString();
      if (Buffer.byteLength(stderr) > MAX_OUTPUT) {
        killGroup();
        finish({ status: 'OUTPUT_LIMIT_EXCEEDED', stdout, stderr: stderr.slice(0, MAX_OUTPUT) });
      }
    });
    child.on('error', e => finish({ status: 'RUNTIME_ERROR', stdout, stderr: e.message }));
    child.on('close', code => finish({ status: code === 0 ? 'PASSED' : 'RUNTIME_ERROR', stdout: stdout.slice(0, MAX_OUTPUT), stderr: stderr.slice(0, MAX_OUTPUT), exitCode: code }));
    child.stdin.end(input || '');
  });
}

async function run(body) {
  const language = String(body.language || '').toLowerCase();
  const code = String(body.code || '');
  const testCases = Array.isArray(body.testCases) ? body.testCases.slice(0, MAX_TEST_CASES) : [];
  if (!Object.hasOwn(LANGUAGE_FILES, language)) throw new Error('Unsupported language');
  if (code.length > MAX_CODE) throw new Error('Source code is too large');
  if (testCases.length === 0) throw new Error('At least one test case is required');
  if (testCases.some(t => String(t.input || '').length > MAX_INPUT)) throw new Error('Test input is too large');

  const dir = fs.mkdtempSync(path.join('/runner/work', 'axly-'));
  const file = path.join(dir, LANGUAGE_FILES[language]);
  try {
    let source = code;
    if (language === 'java' && /public\s+class\s+Solution\b/.test(source)) source = source.replace(/public\s+class\s+Solution\b/, 'public class Main');
    fs.writeFileSync(file, source, { mode: 0o600 });

    let command, args, executionFile = file;
    if (language === 'typescript') {
      const compiled = await execute('tsc', ['--target', 'ES2022', '--module', 'commonjs', '--outDir', dir, file], '', COMPILE_TIMEOUT);
      if (compiled.status !== 'PASSED') return { status: 'COMPILATION_ERROR', stderr: compiled.stderr, stdout: compiled.stdout, execution_time_ms: compiled.execution_time_ms };
      executionFile = path.join(dir, 'main.js'); command = 'node'; args = [executionFile];
    } else if (language === 'c' || language === 'cpp') {
      const compiler = language === 'c' ? 'gcc' : 'g++';
      const out = path.join(dir, 'program');
      const compiled = await execute(compiler, ['-O2', file, '-o', out], '', COMPILE_TIMEOUT);
      if (compiled.status !== 'PASSED') return { status: 'COMPILATION_ERROR', stderr: compiled.stderr, stdout: compiled.stdout, execution_time_ms: compiled.execution_time_ms };
      command = out; args = [];
    } else if (language === 'java') {
      const compiled = await execute('javac', [file], '', COMPILE_TIMEOUT);
      if (compiled.status !== 'PASSED') return { status: 'COMPILATION_ERROR', stderr: compiled.stderr, stdout: compiled.stdout, execution_time_ms: compiled.execution_time_ms };
      command = 'java'; args = ['-cp', dir, 'Main'];
    } else {
      command = language === 'python' ? '/usr/bin/python3' : 'node';
      args = [file];
    }

    const results = [];
    let totalExecution = 0;
    for (const tc of testCases) {
      const result = await execute(command, args, String(tc.input || ''), TIMEOUT);
      totalExecution += result.execution_time_ms;
      const actual = result.stdout.trim();
      const expected = String(tc.expectedOutput ?? '').trim();
      const hidden = Boolean(tc.is_hidden);
      const passed = result.status === 'PASSED' && actual === expected;
      results.push({
        is_hidden: hidden,
        input: hidden ? '[Hidden Test Case]' : String(tc.input || ''),
        expected_output: hidden ? '[Hidden Output]' : expected,
        actual_output: hidden ? (passed ? '[Output Passed]' : '[Output Failed]') : actual,
        status: result.status === 'PASSED' && !passed ? 'WRONG_ANSWER' : result.status,
        stderr: hidden ? undefined : result.stderr
      });
      if (!passed) break;
    }
    const passedTests = results.filter(r => r.status === 'PASSED').length;
    const failed = results[results.length - 1];
    const status = failed?.status === 'TIME_LIMIT_EXCEEDED' ? 'TIME_LIMIT_EXCEEDED'
      : failed?.status === 'OUTPUT_LIMIT_EXCEEDED' ? 'OUTPUT_LIMIT_EXCEEDED'
      : failed?.status === 'RUNTIME_ERROR' ? 'RUNTIME_ERROR'
      : passedTests === testCases.length ? 'ACCEPTED' : 'WRONG_ANSWER';
    return { status, passed_tests: passedTests, total_tests: testCases.length, execution_time_ms: totalExecution, results };
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}

const server = http.createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/execute') { res.writeHead(404); return res.end(); }
  if (RUNNER_TOKEN && req.headers.authorization !== `Bearer ${RUNNER_TOKEN}`) {
    res.writeHead(401, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ message: 'Unauthorized' }));
  }
  let raw = '';
  req.on('data', chunk => { raw += chunk; if (raw.length > 500000) req.destroy(); });
  req.on('end', async () => {
    try { const result = await run(JSON.parse(raw)); res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(result)); }
    catch (e) { res.writeHead(400, { 'content-type': 'application/json' }); res.end(JSON.stringify({ message: e.message })); }
  });
});
server.listen(PORT, '0.0.0.0');
