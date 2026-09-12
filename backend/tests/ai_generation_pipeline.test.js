const { generateQuestion } = require('../src/services/aiQuestionService');
const llmRouter = require('../src/services/llm/llmRouter');
const { executeCode } = require('../src/services/executionService');

jest.mock('../src/services/llm/llmRouter');
jest.mock('../src/services/executionService');

describe('Unified AI Question Generation Pipeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    executeCode.mockResolvedValue({ status: 'Accepted' });
  });

  it('generates a valid Question with standard inputs', async () => {
    const mockOutput = {
      title: 'Mocked Question Title',
      description: 'Mocked description.',
      constraints: '1 <= N <= 100',
      input_format: 'Number N',
      output_format: 'Number result',
      examples: [{ input: '1', expected_output: '1', explanation: 'Base case' }],
      solution_approach: 'Use DP.',
      complexity: 'Time O(N), Space O(N)',
      test_cases: [
        { input: '1', expected_output: '1', is_hidden: false },
        { input: '2', expected_output: '2', is_hidden: false },
        { input: '3', expected_output: '3', is_hidden: true },
        { input: '4', expected_output: '4', is_hidden: true }
      ],
      time_limit_ms: 2000,
      memory_limit_mb: 256,
      function_signature: {
        name: 'solve',
        params: [{ name: 'N', type: 'integer' }],
        return_type: 'integer'
      },
      starter_code: {
        javascript: 'function solve() {}',
        typescript: 'function solve() {}',
        python: 'def solve(): pass',
        java: 'class Main { public static int solve(int N) { return 0; } }',
        cpp: 'int solve(int N) { return 0; }\\nint main() {}',
        c: 'int solve(int N) { return 0; }\\nint main() {}'
      },
      reference_solution: {
        python: 'def solve(): return 1'
      },
      hints: []
    };

    llmRouter.generate.mockResolvedValue({
      source: 'llm-groq',
      text: JSON.stringify(mockOutput)
    });

    const result = await generateQuestion({
      topic: 'Arrays',
      difficulty: 'Medium',
      count: 4
    });

    expect(result.title).toBe('Mocked Question Title');
    expect(result.starter_code.javascript).toBeDefined();
    expect(result.starter_code.python).toBeDefined();
    expect(llmRouter.generate).toHaveBeenCalledTimes(1);
    
    // Verify prompt contains dynamic fields
    const callArgs = llmRouter.generate.mock.calls[0][0];
    expect(callArgs.prompt).toContain('Topic: Arrays');
    expect(callArgs.prompt).toContain('Difficulty: Medium');
  });

  it('injects extra Daily Challenge instructions into prompt when provided', async () => {
    const mockOutput = {
      title: 'Mocked Question Title',
      description: 'Mocked description.',
      constraints: '1 <= N <= 100',
      input_format: 'Number N',
      output_format: 'Number result',
      examples: [{ input: '1', expected_output: '1', explanation: 'Base case' }],
      solution_approach: 'Use DP.',
      complexity: 'Time O(N), Space O(N)',
      test_cases: [
        { input: '1', expected_output: '1', is_hidden: false },
        { input: '2', expected_output: '2', is_hidden: false },
        { input: '3', expected_output: '3', is_hidden: true },
        { input: '4', expected_output: '4', is_hidden: true }
      ],
      time_limit_ms: 2000,
      memory_limit_mb: 256,
      function_signature: {
        name: 'solve',
        params: [{ name: 'N', type: 'integer' }],
        return_type: 'integer'
      },
      starter_code: {
        javascript: 'function solve() {}',
        typescript: 'function solve() {}',
        python: 'def solve(): pass',
        java: 'class Main { public static int solve(int N) { return 0; } }',
        cpp: 'int solve(int N) { return 0; }\\nint main() {}',
        c: 'int solve(int N) { return 0; }\\nint main() {}'
      },
      reference_solution: {
        python: 'def solve(): return 1'
      },
      hints: []
    };

    llmRouter.generate.mockResolvedValue({
      source: 'llm-groq',
      text: JSON.stringify(mockOutput)
    });

    const result = await generateQuestion({
      topic: 'Arrays',
      difficulty: 'Medium',
      count: 4,
      pattern: 'Sliding Window',
      exclusionText: 'EXCLUDE THESE: Two Sum',
      instructions: 'Ensure edge cases.'
    });

    expect(result.title).toBe('Mocked Question Title');
    const callArgs = llmRouter.generate.mock.calls[0][0];
    expect(callArgs.prompt).toContain('Pattern: Sliding Window');
    expect(callArgs.prompt).toContain('EXCLUDE THESE: Two Sum');
    expect(callArgs.prompt).toContain('Extra Instructions: Ensure edge cases.');
  });

  it('fails validation if starter code does not contain function signature', async () => {
    const mockOutput = {
      title: 'Mocked Question Title',
      description: 'Mocked description.',
      constraints: '1 <= N <= 100',
      input_format: 'Number N',
      output_format: 'Number result',
      examples: [{ input: '1', expected_output: '1', explanation: 'Base case' }],
      solution_approach: 'Use DP.',
      complexity: 'Time O(N), Space O(N)',
      test_cases: [
        { input: '1', expected_output: '1', is_hidden: false },
        { input: '2', expected_output: '2', is_hidden: false }
      ],
      time_limit_ms: 2000,
      memory_limit_mb: 256,
      function_signature: {
        name: 'solve',
        params: [{ name: 'N', type: 'integer' }],
        return_type: 'integer'
      },
      starter_code: {
        javascript: 'function differentName() { // TODO: }', // Missing 'solve'
        typescript: 'function solve() { // TODO: }',
        python: 'def solve():\\n    # TODO:\\n    pass',
        java: 'class Main { public static int solve(int N) { // TODO:\\nreturn 0; } }',
        cpp: 'int solve(int N) { // TODO:\\nreturn 0; }\\nint main() {}',
        c: 'int solve(int N) { // TODO:\\nreturn 0; }\\nint main() {}'
      },
      reference_solution: {
        javascript: 'function solve() { return 1; }',
        typescript: 'function solve(): number { return 1; }',
        python: 'def solve(): return 1',
        java: 'class Main { public static int solve(int N) { return 1; } }',
        cpp: 'int solve(int N) { return 1; }',
        c: 'int solve(int N) { return 1; }'
      },
      hints: []
    };

    llmRouter.generate.mockResolvedValue({
      source: 'llm-groq',
      text: JSON.stringify(mockOutput)
    });

    await expect(generateQuestion({ topic: 'Arrays', difficulty: 'Medium', count: 2 }))
      .rejects.toThrow(/starter_code for javascript does not contain the function signature name 'solve'/);
  });

  it('fails validation if sandbox execution is not Accepted', async () => {
    const mockOutput = {
      title: 'Mocked Question Title',
      description: 'Mocked description.',
      constraints: '1 <= N <= 100',
      input_format: 'Number N',
      output_format: 'Number result',
      examples: [{ input: '1', expected_output: '1', explanation: 'Base case' }],
      solution_approach: 'Use DP.',
      complexity: 'Time O(N), Space O(N)',
      test_cases: [
        { input: '1', expected_output: '1', is_hidden: false },
        { input: '2', expected_output: '2', is_hidden: false }
      ],
      time_limit_ms: 2000,
      memory_limit_mb: 256,
      function_signature: {
        name: 'solve',
        params: [{ name: 'N', type: 'integer' }],
        return_type: 'integer'
      },
      starter_code: {
        javascript: 'function solve() { // TODO: }',
        typescript: 'function solve() { // TODO: }',
        python: 'def solve():\\n    # TODO:\\n    pass',
        java: 'class Main { public static int solve(int N) { // TODO:\\nreturn 0; } }',
        cpp: 'int solve(int N) { // TODO:\\nreturn 0; }\\nint main() {}',
        c: 'int solve(int N) { // TODO:\\nreturn 0; }\\nint main() {}'
      },
      reference_solution: {
        javascript: 'function solve() { return 1; }',
        typescript: 'function solve(): number { return 1; }',
        python: 'def solve(): return 1',
        java: 'class Main { public static int solve(int N) { return 1; } }',
        cpp: 'int solve(int N) { return 1; }',
        c: 'int solve(int N) { return 1; }'
      },
      hints: []
    };

    llmRouter.generate.mockResolvedValue({
      source: 'llm-groq',
      text: JSON.stringify(mockOutput)
    });

    executeCode.mockResolvedValue({ status: 'Wrong Answer' });

    await expect(generateQuestion({ topic: 'Arrays', difficulty: 'Medium', count: 2 }))
      .rejects.toThrow(/Sandbox verification failed: Reference solution resulted in Wrong Answer/);
  });

  it('fails validation if reference solution is leaked in starter code', async () => {
    const mockOutput = {
      title: 'Mocked Question Title',
      description: 'Mocked description.',
      constraints: '1 <= N <= 100',
      input_format: 'Number N',
      output_format: 'Number result',
      examples: [{ input: '1', expected_output: '1', explanation: 'Base case' }],
      solution_approach: 'Use DP.',
      complexity: 'Time O(N), Space O(N)',
      test_cases: [
        { input: '1', expected_output: '1', is_hidden: false },
        { input: '2', expected_output: '2', is_hidden: false }
      ],
      time_limit_ms: 2000,
      memory_limit_mb: 256,
      function_signature: {
        name: 'solve',
        params: [{ name: 'N', type: 'integer' }],
        return_type: 'integer'
      },
      starter_code: {
        javascript: 'function solve() { // TODO: }',
        typescript: 'function solve() { // TODO: }',
        python: 'def solve():\\n    # TODO:\\n    # leaked solution\\n    for i in range(10):\\n        print(i)\\n    return 1',
        java: 'class Main { public static int solve(int N) { // TODO:\\nreturn 0; } }',
        cpp: 'int solve(int N) { // TODO:\\nreturn 0; }\\nint main() {}',
        c: 'int solve(int N) { // TODO:\\nreturn 0; }\\nint main() {}'
      },
      reference_solution: {
        javascript: 'function solve() { return 1; }',
        typescript: 'function solve(): number { return 1; }',
        python: 'def solve():\\n    # leaked solution\\n    for i in range(10):\\n        print(i)\\n    return 1',
        java: 'class Main { public static int solve(int N) { return 1; } }',
        cpp: 'int solve(int N) { return 1; }',
        c: 'int solve(int N) { return 1; }'
      },
      hints: []
    };

    llmRouter.generate.mockResolvedValue({
      source: 'llm-groq',
      text: JSON.stringify(mockOutput)
    });

    await expect(generateQuestion({ topic: 'Arrays', difficulty: 'Medium', count: 2 }))
      .rejects.toThrow(/starter_code appears to contain the complete reference_solution/);
  });
});
