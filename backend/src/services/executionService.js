const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

const MAX_EXECUTION_TIME_MS = 4000;
const MAX_OUTPUT_BYTES = 64 * 1024;

function normalizeOutput(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
}

function commandExists(command) {
  return new Promise((resolve) => {
    const checker = process.platform === 'win32' ? 'where' : 'which';
    const child = spawn(checker, [command], { stdio: 'ignore' });
    child.on('close', (code) => resolve(code === 0));
    child.on('error', () => resolve(false));
  });
}

function runProcess({ command, args = [], cwd, input, timeoutMs = MAX_EXECUTION_TIME_MS }) {
  return new Promise((resolve) => {
    const startTime = process.hrtime.bigint();
    let stdout = '';
    let stderr = '';
    let isTimedOut = false;

    const sanitizedEnv = {
      PATH: process.env.PATH,
      SYSTEMROOT: process.env.SYSTEMROOT,
      TEMP: process.env.TEMP,
      TMP: process.env.TMP,
      PYTHONUNBUFFERED: '1',
      NODE_ENV: 'sandbox'
    };

    let child;
    try {
      child = spawn(command, args, {
        cwd,
        env: sanitizedEnv,
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true
      });
    } catch (err) {
      return resolve({ status: 'Runtime Error', stdout: '', stderr: err.message, exitCode: 1, executionTimeMs: 0 });
    }

    const timer = setTimeout(() => {
      isTimedOut = true;
      try {
        if (process.platform === 'win32') spawn('taskkill', ['/pid', String(child.pid), '/f', '/t']);
        else child.kill('SIGKILL');
      } catch (_) {}
    }, timeoutMs);

    child.stdin.end(input == null ? '' : String(input).replace(/\r\n/g, '\n'));

    child.stdout.on('data', (data) => {
      if (Buffer.byteLength(stdout) < MAX_OUTPUT_BYTES) stdout += data.toString();
      if (Buffer.byteLength(stdout) > MAX_OUTPUT_BYTES) stdout = stdout.slice(0, MAX_OUTPUT_BYTES);
    });

    child.stderr.on('data', (data) => {
      if (Buffer.byteLength(stderr) < MAX_OUTPUT_BYTES) stderr += data.toString();
      if (Buffer.byteLength(stderr) > MAX_OUTPUT_BYTES) stderr = stderr.slice(0, MAX_OUTPUT_BYTES);
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      const durationMs = Number(process.hrtime.bigint() - startTime) / 1e6;
      resolve({ status: 'Runtime Error', stdout, stderr: err.message || 'Process error', exitCode: 1, executionTimeMs: Math.round(durationMs * 10) / 10 });
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      const durationMs = Number(process.hrtime.bigint() - startTime) / 1e6;
      if (isTimedOut) return resolve({ status: 'Time Limit Exceeded', stdout, stderr: `Time Limit Exceeded (Execution exceeded ${timeoutMs / 1000}s)`, exitCode: null, executionTimeMs: timeoutMs });
      if (code !== 0) return resolve({ status: 'Runtime Error', stdout, stderr: stderr || `Exited with code ${code}`, exitCode: code, executionTimeMs: Math.round(durationMs * 10) / 10 });
      resolve({ status: 'Success', stdout, stderr, exitCode: 0, executionTimeMs: Math.round(durationMs * 10) / 10 });
    });
  });
}

async function prepareProgram({ language, sourceCode, sandboxDir }) {
  const lang = (language || 'javascript').toLowerCase().trim();
  const source = typeof sourceCode === 'string' ? sourceCode : '';
  const aliases = {
    js: 'javascript', node: 'javascript', nodejs: 'javascript',
    py: 'python', python3: 'python', ts: 'typescript',
    cpp: 'c++', 'c-plus-plus': 'c-plus-plus', cc: 'c++'
  };
  const normalized = aliases[lang] === 'c-plus-plus' ? 'c++' : (aliases[lang] || lang);

  if (normalized === 'javascript') {
    const file = path.join(sandboxDir, 'solution.js');
    fs.writeFileSync(file, source, 'utf8');
    if (!(await commandExists('node'))) throw new Error('JavaScript runtime (Node.js) is not installed on the server.');
    return { command: 'node', args: [file], cwd: sandboxDir };
  }

  if (normalized === 'python') {
    const file = path.join(sandboxDir, 'solution.py');
    fs.writeFileSync(file, source, 'utf8');
    const python = process.platform === 'win32' ? 'python' : 'python3';
    if (!(await commandExists(python))) throw new Error('Python runtime is not installed on the server.');
    return { command: python, args: [file], cwd: sandboxDir };
  }

  if (normalized === 'typescript') {
    const sourceFile = path.join(sandboxDir, 'solution.ts');
    const outputFile = path.join(sandboxDir, 'solution.js');
    fs.writeFileSync(sourceFile, source, 'utf8');
    if (!(await commandExists('tsc'))) throw new Error('TypeScript compiler (tsc) is not installed on the server.');

    const compile = await runProcess({
      command: 'tsc',
      args: [sourceFile, '--target', 'ES2020', '--module', 'commonjs', '--skipLibCheck', '--outDir', sandboxDir],
      cwd: sandboxDir
    });
    if (compile.status !== 'Success' || !fs.existsSync(outputFile)) return { compileError: compile.stderr || 'TypeScript compilation failed.' };
    return { command: 'node', args: [outputFile], cwd: sandboxDir };
  }

  if (normalized === 'java') {
    // Java requires the filename to match a public class. Support both the
    // common `public class Main` template and existing `public class Solution` submissions.
    const publicClassMatch = source.match(/\bpublic\s+class\s+([A-Za-z_$][\w$]*)/);
    const mainClass = publicClassMatch ? publicClassMatch[1] : 'Main';
    const sourceFile = path.join(sandboxDir, `${mainClass}.java`);
    fs.writeFileSync(sourceFile, source, 'utf8');
    if (!(await commandExists('javac')) || !(await commandExists('java'))) throw new Error('Java compiler/runtime (javac/java) is not installed on the server.');

    const compile = await runProcess({ command: 'javac', args: ['-encoding', 'UTF-8', sourceFile], cwd: sandboxDir });
    if (compile.status !== 'Success') return { compileError: compile.stderr || 'Java compilation failed.' };
    return { command: 'java', args: ['-cp', sandboxDir, mainClass], cwd: sandboxDir };
  }

  if (normalized === 'c++' || normalized === 'c') {
    const compiler = normalized === 'c++'
      ? (await commandExists('g++') ? 'g++' : null)
      : (await commandExists('gcc') ? 'gcc' : null);
    if (!compiler) throw new Error(`${normalized === 'c++' ? 'g++' : 'gcc'} compiler is not installed on the server.`);

    const extension = normalized === 'c++' ? '.cpp' : '.c';
    const sourceFile = path.join(sandboxDir, `solution${extension}`);
    const executable = path.join(sandboxDir, process.platform === 'win32' ? 'solution.exe' : 'solution');
    fs.writeFileSync(sourceFile, source, 'utf8');

    const compileArgs = normalized === 'c++'
      ? ['-std=c++17', '-O2', sourceFile, '-o', executable]
      : ['-std=c11', '-O2', sourceFile, '-o', executable];
    const compile = await runProcess({ command: compiler, args: compileArgs, cwd: sandboxDir });
    if (compile.status !== 'Success') return { compileError: compile.stderr || 'Compilation failed.' };
    return { command: executable, args: [], cwd: sandboxDir };
  }

  throw new Error('Unsupported language. Supported languages: JavaScript, TypeScript, Python, Java, C++, C.');
}

async function executeCode({ language, sourceCode, testCases = [], isSubmit = false }) {
  if (!Array.isArray(testCases) || testCases.length === 0) throw new Error('At least one test case is required.');

  const sandboxDir = path.join(os.tmpdir(), `axly_code_${uuidv4()}`);
  fs.mkdirSync(sandboxDir, { recursive: true });

  try {
    const program = await prepareProgram({ language, sourceCode, sandboxDir });
    if (program.compileError) {
      return {
        status: 'Compilation Error', passed_tests: 0, total_tests: testCases.length, execution_time_ms: 0,
        results: [{ test_index: 1, is_hidden: false, status: 'Compilation Error', execution_time_ms: 0, input: '[Compilation failed]', expected_output: '[Not executed]', actual_output: '', stderr: program.compileError }]
      };
    }

    let passedCount = 0;
    let overallStatus = 'Accepted';
    let totalTime = 0;
    const results = [];

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i] || {};
      const execResult = await runProcess({ command: program.command, args: program.args, cwd: program.cwd, input: tc.input });
      totalTime += execResult.executionTimeMs;
      const actualNorm = normalizeOutput(execResult.stdout);
      const expectedNorm = normalizeOutput(tc.expected_output);
      let caseStatus = 'Wrong Answer';

      if (execResult.status === 'Time Limit Exceeded') caseStatus = 'Time Limit Exceeded';
      else if (execResult.status === 'Runtime Error') caseStatus = 'Runtime Error';
      else if (actualNorm === expectedNorm) caseStatus = 'Passed';

      if (caseStatus === 'Passed') passedCount++;
      else if (overallStatus === 'Accepted') overallStatus = caseStatus;

      const isHidden = Boolean(tc.is_hidden);
      results.push({
        test_index: i + 1,
        is_hidden: isHidden,
        status: caseStatus,
        execution_time_ms: execResult.executionTimeMs,
        input: isHidden ? '[Hidden Test Case]' : (tc.input || ''),
        expected_output: isHidden ? '[Hidden Output]' : (tc.expected_output || ''),
        actual_output: isHidden ? (caseStatus === 'Passed' ? '[Output Passed]' : '[Output Failed]') : actualNorm,
        stderr: isHidden && caseStatus !== 'Runtime Error' ? null : (execResult.stderr || null)
      });

      if (caseStatus === 'Time Limit Exceeded' || caseStatus === 'Runtime Error') break;
    }

    return {
      status: passedCount === testCases.length ? 'Accepted' : (overallStatus === 'Accepted' ? 'Wrong Answer' : overallStatus),
      passed_tests: passedCount,
      total_tests: testCases.length,
      execution_time_ms: Math.round(totalTime * 10) / 10,
      results
    };
  } finally {
    try { if (fs.existsSync(sandboxDir)) fs.rmSync(sandboxDir, { recursive: true, force: true }); } catch (_) {}
  }
}

module.exports = { executeCode, normalizeOutput };
