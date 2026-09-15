const { generateCanonicalQuestion } = require('../src/services/aiQuestionGenerationPipeline');
const llmRouter = require('../src/services/llm/llmRouter');
const { executeCode } = require('../src/services/executionService');
const { initSchema } = require('../src/db/db');
const { seedDatabase } = require('../src/db/seed');

jest.mock('../src/services/llm/llmRouter');
jest.mock('../src/services/executionService');

jest.mock('../src/services/embeddingService', () => {
  return {
    defaultProvider: {
      getEmbedding: jest.fn().mockResolvedValue(new Array(3072).fill(0.1)),
      getEmbeddings: jest.fn().mockResolvedValue([new Array(3072).fill(0.1)]),
      isConfigured: jest.fn().mockReturnValue(true)
    },
    cosineSimilarity: jest.fn().mockReturnValue(0.5),
    normalizeVector: jest.fn().mockImplementation(v => v),
    EMBEDDING_MODEL: 'gemini-embedding-mock',
    EMBEDDING_DIMENSIONS: 3072
  };
});

describe('Unified AI Question Generation Pipeline', () => {
  beforeAll(async () => {
    await initSchema();
    await seedDatabase();
  });

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
        javascript: 'function solve() { // TODO: implement }',
        typescript: 'function solve(): number { // TODO: implement }',
        python: 'def solve():\n    # TODO: implement\n    pass',
        java: 'class Main { public static int solve(int N) { // TODO: implement\n return 0; } }',
        cpp: 'int solve(int N) { // TODO: implement\n return 0; }\nint main() {}',
        c: 'int solve(int N) { // TODO: implement\n return 0; }\nint main() {}'
      },
      reference_solution: {
        python: 'def solve(): return 1',
        javascript: 'function solve() { return 1; }',
        typescript: 'function solve(): number { return 1; }',
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

    const result = await generateCanonicalQuestion({
      topic: 'Arrays',
      difficulty: 'Medium',
      count: 4,
      destination: 'ai_preview'
    });

    const candidate = result.data;
    expect(candidate.title).toBe('Mocked Question Title');
    expect(candidate.starter_code.javascript).toBeDefined();
    expect(candidate.starter_code.python).toBeDefined();
    expect(llmRouter.generate).toHaveBeenCalled();
    
    // Verify prompt contains dynamic fields
    const callArgs = llmRouter.generate.mock.calls[0][0];
    expect(callArgs.prompt).toContain('Topic: Arrays');
    expect(callArgs.prompt).toContain('Difficulty: medium');
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
        javascript: 'function solve() { // TODO: implement }',
        typescript: 'function solve(): number { // TODO: implement }',
        python: 'def solve():\n    # TODO: implement\n    pass',
        java: 'class Main { public static int solve(int N) { // TODO: implement\n return 0; } }',
        cpp: 'int solve(int N) { // TODO: implement\n return 0; }\nint main() {}',
        c: 'int solve(int N) { // TODO: implement\n return 0; }\nint main() {}'
      },
      reference_solution: {
        python: 'def solve(): return 1',
        javascript: 'function solve() { return 1; }',
        typescript: 'function solve(): number { return 1; }',
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

    const result = await generateCanonicalQuestion({
      topic: 'Arrays',
      difficulty: 'Medium',
      count: 4,
      pattern: 'Sliding Window',
      instructions: 'Ensure edge cases.',
      destination: 'ai_preview'
    });

    const candidate = result.data;
    expect(candidate.title).toBe('Mocked Question Title');
    const callArgs = llmRouter.generate.mock.calls[0][0];
    expect(callArgs.prompt).toContain('Pattern: Sliding Window');
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

    await expect(generateCanonicalQuestion({ topic: 'Arrays', difficulty: 'Medium', destination: 'ai_preview' }))
      .rejects.toThrow(/\[javascript\] Starter code does not contain the function signature name 'solve'/);
  }, 10000);

  it('fails validation if starter code fails to compile', async () => {
    const mockOutput = {
      title: 'Mocked Question Title',
      description: 'Mocked description.',
      constraints: '1 <= N <= 100',
      input_format: 'Number N',
      output_format: 'Number result',
      examples: [{ input: '1', expected_output: '1', explanation: 'Base case' }],
      topic: 'Arrays',
      difficulty: 'medium',
      pattern: 'Appropriate for topic',
      function_signature: {
        name: 'solve',
        params: [{ name: 'N', type: 'integer' }],
        return_type: 'integer'
      },
      test_cases: [
        { input: '1', expected_output: '1', is_hidden: false },
        { input: '2', expected_output: '2', is_hidden: true }
      ],
      starter_code: {
        javascript: 'function solve() { // TODO: }',
        python: 'def solve():\n    # TODO:\n    pass',
        java: 'class Main { public static int solve(int N) { // TODO:\nreturn 0; } }',
        cpp: 'int solve(int N) { // TODO:\nreturn 0; }\nint main() {}',
        c: 'int solve(int N) { // TODO:\nreturn 0; }\nint main() {}',
        typescript: 'function solve() { // TODO: }'
      },
      reference_solution: {
        javascript: 'function solve() { return 1; }',
        python: 'def solve(): return 1',
        java: 'class Main { public static int solve(int N) { return 1; } }',
        cpp: 'int solve(int N) { return 1; }',
        c: 'int solve(int N) { return 1; }',
        typescript: 'function solve(): number { return 1; }'
      },
      solution_approach: 'Use DP.',
      editorial: 'Use DP.',
      complexity: 'Time O(N), Space O(N)',
      hints: []
    };

    llmRouter.generate.mockResolvedValue({
      source: 'llm-groq',
      text: JSON.stringify(mockOutput)
    });

    executeCode.mockResolvedValue({ status: 'Compile Error', results: [{ stderr: 'Syntax Error' }] });

    await expect(generateCanonicalQuestion({ topic: 'Arrays', difficulty: 'Medium', destination: 'ai_preview' }))
      .rejects.toThrow(/\[javascript\] Starter code failed to compile/);
  }, 10000);

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

    await expect(generateCanonicalQuestion({ topic: 'Arrays', difficulty: 'Medium', destination: 'ai_preview' }))
      .rejects.toThrow(/\[python\] AST Validation Failed/);
  }, 10000);
});
