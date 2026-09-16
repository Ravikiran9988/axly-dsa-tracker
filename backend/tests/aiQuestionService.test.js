const child_process = require('child_process');
const executionService = require('../src/services/executionService');
jest.mock('../src/services/executionService');

const { validateAllSolutions } = require('../src/services/aiQuestionService');

describe('aiQuestionService - Python AST Validation via Sandbox', () => {
  let spawnSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default valid mock implementation
    executionService.executeCode.mockImplementation(async (args) => {
      return { status: 'Accepted', results: [{ stderr: '', actual_output: 'VALID' }] };
    });
    
    // Fail if anyone tries to spawn python directly
    spawnSpy = jest.spyOn(child_process, 'spawn').mockImplementation((cmd) => {
      if (cmd === 'python' || cmd === 'python3') {
        throw new Error('Direct spawn of Python is explicitly forbidden in this test suite.');
      }
      // Fallback for other spawn calls, though we shouldn't have any in this isolated test
      const { EventEmitter } = require('events');
      const proc = new EventEmitter();
      proc.stdin = new EventEmitter();
      proc.stdin.write = jest.fn();
      proc.stdin.end = jest.fn();
      proc.stdout = new EventEmitter();
      proc.stderr = new EventEmitter();
      return proc;
    });
  });

  afterEach(() => {
    spawnSpy.mockRestore();
  });

  const baseContract = {
    title: 'Test Problem',
    function_signature: { name: 'solve' }
  };
  
  const baseTestCases = [
    { input: '1', expected_output: '1', is_hidden: false }
  ];

  const getSolutions = (pythonCode) => ({
    starter_code: {
      javascript: 'function solve() { // TODO }',
      python: 'def solve():\n    # TODO'
    },
    reference_solution: {
      javascript: 'function solve() { return 1; }',
      python: pythonCode
    }
  });

  it('A. validatePythonAst() uses executeCode()/sandbox validation & B. does NOT directly spawn Python', async () => {
    await validateAllSolutions(baseContract, baseTestCases, getSolutions('def solve():\n    return 1'));

    expect(spawnSpy).not.toHaveBeenCalled();
    expect(executionService.executeCode).toHaveBeenCalledWith(
      expect.objectContaining({
        language: 'python',
        isSubmit: false,
        testCases: expect.arrayContaining([
          expect.objectContaining({
            input: 'def solve():\n    return 1',
            expected_output: 'VALID'
          })
        ])
      })
    );
  });

  it('C. Valid Python code passes', async () => {
    const solutions = getSolutions('def solve():\n    pass');
    
    await expect(validateAllSolutions(baseContract, baseTestCases, solutions)).resolves.toBe(solutions);
  });

  it('D. Invalid Python syntax fails', async () => {
    executionService.executeCode.mockImplementation(async (args) => {
      if (args.language === 'python' && args.sourceCode.includes('import ast')) {
        return { status: 'Runtime Error', results: [{ stderr: 'SyntaxError: invalid syntax', actual_output: '' }] };
      }
      return { status: 'Accepted', results: [{ stderr: '', actual_output: 'VALID' }] };
    });

    const solutions = getSolutions('def solve() \n    return');
    
    await expect(validateAllSolutions(baseContract, baseTestCases, solutions)).rejects.toThrow(/AST Validation Failed/);
  });

  it('E. Code using deque without from collections import deque fails', async () => {
    executionService.executeCode.mockImplementation(async (args) => {
      if (args.language === 'python' && args.sourceCode.includes('import ast')) {
        return { status: 'Runtime Error', results: [{ stderr: "NameError: 'deque' is used but not imported from collections", actual_output: '' }] };
      }
      return { status: 'Accepted', results: [{ stderr: '', actual_output: 'VALID' }] };
    });

    const solutions = getSolutions('def solve():\n    q = deque()');
    
    await expect(validateAllSolutions(baseContract, baseTestCases, solutions)).rejects.toThrow(/AST Validation Failed: NameError: 'deque'/);
  });

  it('F. Code using deque with the proper import passes', async () => {
    const solutions = getSolutions('from collections import deque\ndef solve():\n    q = deque()');
    
    await expect(validateAllSolutions(baseContract, baseTestCases, solutions)).resolves.toBe(solutions);
  });

  it('G. Sandbox/execution failure returns a controlled validation failure and does not crash the process', async () => {
    // Mock sandbox service throwing an error for AST validation
    executionService.executeCode.mockImplementation(async (args) => {
      if (args.language === 'python' && args.sourceCode.includes('import ast')) {
        throw new Error('Code execution service is unavailable');
      }
      return { status: 'Accepted', results: [{ stderr: '', actual_output: 'VALID' }] };
    });

    const solutions = getSolutions('def solve():\n    pass');
    
    await expect(validateAllSolutions(baseContract, baseTestCases, solutions)).rejects.toThrow(/Sandbox validation failed: Code execution service is unavailable/);
  });
});
