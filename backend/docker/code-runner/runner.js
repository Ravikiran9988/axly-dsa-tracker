const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const PORT = Number(process.env.PORT || 8080);
const MAX_CODE = 100_000;
const MAX_INPUT = 20_000;
const MAX_OUTPUT = 64 * 1024;
const MAX_TEST_CASES = 20;
const TIMEOUT = 5_000;
const COMPILE_TIMEOUT = 10_000;
const COMMANDS = {
  javascript: ['node', f => [f]],
  python: ['python3', f => [f]],
  java: ['java', f => ['-cp', path.dirname(f), 'Main']]
};

function execute(command, args, input, timeout = TIMEOUT) {
  return new Promise(resolve => {
    const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '', stderr = '', settled = false;
    const finish = result => {
      if (!settled) { settled = true; clearTimeout(timer); resolve(result); }
    };
    const timer = setTimeout(() => { child.kill('SIGKILL'); finish({ status: 'TIME_LIMIT_EXCEEDED', stdout, stderr }); }, timeout);
    child.stdout.on('data', d => {
      stdout += d.toString();
      if (Buffer.byteLength(stdout) > MAX_OUTPUT) child.kill('SIGKILL');
    });
    child.stderr.on('data', d => {
      stderr += d.toString();
      if (Buffer.byteLength(stderr) > MAX_OUTPUT) child.kill('SIGKILL');
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
  if (!['javascript', 'python', 'typescript', 'java', 'c', 'cpp'].includes(language)) throw new Error('Unsupported language');
  if (code.length > MAX_CODE) throw new Error('Source code is too large');
  if (testCases.length === 0) throw new Error('At least one test case is required');
  if (testCases.some(t => String(t.input || '').length > MAX_INPUT)) throw new Error('Test input is too large');

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'axly-'));
  const filename = { java: 'Main.java', python: 'main.py', typescript: 'main.ts', javascript: 'main.js', cpp: 'main.cpp', c: 'main.c' }[language];
  let file = path.join(dir, filename);
  try {
    let source = code;
    if (language === 'java' && /public\s+class\s+Solution\b/.test(source)) source = source.replace(/public\s+class\s+Solution\b/, 'public class Main');
    fs.writeFileSync(file, source, { mode: 0o600 });

    if (language === 'typescript') {
      const compiled = await execute('tsc', ['--target', 'ES2022', '--module', 'commonjs', '--outDir', dir, file], '', COMPILE_TIMEOUT);
      if (compiled.status !== 'PASSED') return { status: 'COMPILATION_ERROR', stderr: compiled.stderr, stdout: compiled.stdout };
      file = path.join(dir, 'main.js');
      COMMANDS.javascript = ['node', f => [f]];
      COMMANDS.typescript = COMMANDS.javascript;
    } else if (language === 'c' || language === 'cpp') {
      const compiler = language === 'c' ? 'gcc' : 'g++';
      const out = path.join(dir, 'program');
      const compiled = await execute(compiler, ['-O2', file, '-o', out], '', COMPILE_TIMEOUT);
      if (compiled.status !== 'PASSED') return { status: 'COMPILATION_ERROR', stderr: compiled.stderr, stdout: compiled.stdout };
      COMMANDS[language] = [out, () => []];
      file = out;
    } else if (language === 'java') {
      const compiled = await execute('javac', [file], '', COMPILE_TIMEOUT);
      if (compiled.status !== 'PASSED') return { status: 'COMPILATION_ERROR', stderr: compiled.stderr, stdout: compiled.stdout };
    }

    const results = [];
    for (const tc of testCases) {
      const [cmd, argBuilder] = COMMANDS[language];
      const result = await execute(cmd, argBuilder(file), String(tc.input || ''));
      const actual = result.stdout.trim();
      const expected = String(tc.expectedOutput ?? '').trim();
      results.push({
        input: tc.is_hidden ? '[Hidden Test Case]' : String(tc.input || ''),
        expectedOutput: tc.is_hidden ? '[Hidden Output]' : expected,
        actualOutput: tc.is_hidden ? (result.status === 'PASSED' && actual === expected ? '[Output Passed]' : '[Output Failed]') : actual,
        status: result.status,
        stderr: tc.is_hidden ? undefined : result.stderr
      });
      if (result.status === 'TIME_LIMIT_EXCEEDED') break;
    }
    const passed = results.filter(r => r.status === 'PASSED' && (r.actualOutput === '[Output Passed]' || r.actualOutput === r.expectedOutput)).length;
    const status = results.some(r => r.status === 'TIME_LIMIT_EXCEEDED') ? 'TIME_LIMIT_EXCEEDED' : passed === results.length ? 'ACCEPTED' : 'WRONG_ANSWER';
    return { status, passed_tests: passed, total_tests: results.length, results };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const server = http.createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/execute') { res.writeHead(404); return res.end(); }
  let raw = '';
  req.on('data', chunk => { raw += chunk; if (raw.length > 500000) req.destroy(); });
  req.on('end', async () => {
    try { const result = await run(JSON.parse(raw)); res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(result)); }
    catch (e) { res.writeHead(400, { 'content-type': 'application/json' }); res.end(JSON.stringify({ message: e.message })); }
  });
});
server.listen(PORT, '0.0.0.0');
