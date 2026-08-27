const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

const PORT = Number(process.env.PORT || 8080);
const MAX_CODE = 100_000;
const MAX_INPUT = 20_000;
const TIMEOUT = 5_000;
const COMMANDS = {
  javascript: ['node', f => [f]],
  python: ['python3', f => [f]],
  typescript: ['node', f => [f]],
  java: ['java', f => ['-cp', path.dirname(f), 'Main']],
  c: ['gcc', f => ['-O2', f, '-o', f + '.out']],
  cpp: ['g++', f => ['-O2', f, '-o', f + '.out']]
};

function execute(command, args, input, timeout = TIMEOUT) {
  return new Promise(resolve => {
    const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '', stderr = '', settled = false;
    const finish = result => { if (!settled) { settled = true; clearTimeout(timer); resolve(result); } };
    const timer = setTimeout(() => { child.kill('SIGKILL'); finish({ status: 'TIME_LIMIT_EXCEEDED', stdout, stderr }); }, timeout);
    child.stdout.on('data', d => { stdout += d.toString(); if (stdout.length > 100000) child.kill('SIGKILL'); });
    child.stderr.on('data', d => { stderr += d.toString(); if (stderr.length > 100000) child.kill('SIGKILL'); });
    child.on('error', e => finish({ status: 'RUNTIME_ERROR', stdout, stderr: e.message }));
    child.on('close', code => finish({ status: code === 0 ? 'PASSED' : 'RUNTIME_ERROR', stdout, stderr, exitCode: code }));
    child.stdin.end(input || '');
  });
}

async function run(body) {
  const language = String(body.language || '').toLowerCase();
  const code = String(body.code || '');
  const testCases = Array.isArray(body.testCases) ? body.testCases.slice(0, 20) : [];
  if (!COMMANDS[language]) throw new Error('Unsupported language');
  if (code.length > MAX_CODE) throw new Error('Source code is too large');
  if (testCases.some(t => String(t.input || '').length > MAX_INPUT)) throw new Error('Test input is too large');

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'axly-'));
  let file = path.join(dir, language === 'java' ? 'Main.java' : language === 'python' ? 'main.py' : language === 'typescript' ? 'main.ts' : language === 'javascript' ? 'main.js' : language === 'cpp' ? 'main.cpp' : 'main.c');
  try {
    let source = code;
    if (language === 'typescript') {
      const compiled = await execute('tsc', ['--target', 'ES2022', '--module', 'commonjs', '--outDir', dir, file], '');
      if (compiled.status !== 'PASSED') return { status: 'COMPILATION_ERROR', stdout: compiled.stdout, stderr: compiled.stderr };
      file = path.join(dir, 'main.js');
    }
    if (language === 'java' && /public\s+class\s+Solution\b/.test(source)) source = source.replace(/public\s+class\s+Solution\b/, 'public class Main');
    fs.writeFileSync(file, source, { mode: 0o600 });

    if (['c', 'cpp'].includes(language)) {
      const compiler = language === 'c' ? 'gcc' : 'g++';
      const out = file + '.out';
      const compiled = await execute(compiler, ['-O2', file, '-o', out], '');
      if (compiled.status !== 'PASSED') return { status: 'COMPILATION_ERROR', stdout: compiled.stdout, stderr: compiled.stderr };
      COMMANDS[language] = [out, () => []];
      file = out;
    } else if (language === 'java') {
      const compiled = await execute('javac', [file], '');
      if (compiled.status !== 'PASSED') return { status: 'COMPILATION_ERROR', stdout: compiled.stdout, stderr: compiled.stderr };
    }

    const results = [];
    for (const tc of testCases) {
      let [cmd, argBuilder] = COMMANDS[language];
      const args = argBuilder(file);
      const result = await execute(cmd, args, String(tc.input || ''));
      results.push({ input: tc.input || '', expected: tc.expectedOutput || '', actual: result.stdout.trim(), status: result.status, stderr: result.stderr });
      if (result.status === 'TIME_LIMIT_EXCEEDED') break;
    }
    const passed = results.filter(r => r.status === 'PASSED' && r.actual === String(r.expected).trim()).length;
    return { status: results.some(r => r.status === 'TIME_LIMIT_EXCEEDED') ? 'TIME_LIMIT_EXCEEDED' : passed === results.length ? 'ACCEPTED' : 'WRONG_ANSWER', passed, total: results.length, results };
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
