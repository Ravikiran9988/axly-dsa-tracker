const { validateGeneratedQuestionAsync } = require('../src/services/aiQuestionService');

describe('AI Question Strict Validation Pipeline', () => {
  const getBaseContract = () => ({
    title: 'Two Sum Variant',
    description: 'Find two numbers that add up to target',
    constraints: '2 <= nums.length <= 10^4',
    input_format: 'Array of integers nums, integer target',
    output_format: 'Array of two integers',
    examples: [{ input: '[2,7,11,15]\n9', output: '[0,1]', explanation: '2+7=9' }],
    difficulty: 'Easy',
    topic: 'Arrays',
    pattern: 'Hash Map',
    function_signature: 'function twoSum(nums, target) {}',
    test_cases: [
      { input: '[2,7,11,15]\n9', expected_output: '[0,1]', is_hidden: false },
      { input: '[3,2,4]\n6', expected_output: '[1,2]', is_hidden: true }
    ],
    starter_code: {
      javascript: 'function twoSum(nums, target) {\n  // TODO: implement\n}',
      python: 'def twoSum(nums, target):\n    # TODO: implement\n    pass'
    },
    reference_solution: {
      javascript: 'function twoSum(nums, target) { const m = {}; for(let i=0; i<nums.length; i++){ if(target-nums[i] in m) return [m[target-nums[i]], i]; m[nums[i]] = i; } }',
      python: 'def twoSum(nums, target):\n    m = {}\n    for i, n in enumerate(nums):\n        if target - n in m:\n            return [m[target-n], i]\n        m[n] = i'
    }
  });

  it('rejects Python missing import (NameError)', async () => {
    const contract = getBaseContract();
    contract.reference_solution.python = 'def twoSum(nums, target):\n    return math.sqrt(4)'; 
    const res = await validateGeneratedQuestionAsync(JSON.stringify(contract));
    expect(res.valid).toBe(false);
    expect(res.reason).toMatch(/Sandbox verification failed|Reference solution failed verification/);
  });

  it('rejects JavaScript syntax error', async () => {
    const contract = getBaseContract();
    contract.reference_solution.javascript = 'function twoSum(nums, target) { return 0;';
    const res = await validateGeneratedQuestionAsync(JSON.stringify(contract));
    expect(res.valid).toBe(false);
    expect(res.reason).toMatch(/Reference solution failed verification|Compile Error|Runtime Error/);
  });

  it('rejects starter code missing TODO instruction', async () => {
    const contract = getBaseContract();
    contract.starter_code.javascript = 'function twoSum(nums, target) { }';
    const res = await validateGeneratedQuestionAsync(JSON.stringify(contract));
    expect(res.valid).toBe(false);
    expect(res.reason).toMatch(/Starter code missing 'TODO:' instruction/);
  });

  it('rejects logic failing test cases', async () => {
    const contract = getBaseContract();
    contract.reference_solution.javascript = 'function twoSum(nums, target) { return [0, 1]; }';
    const res = await validateGeneratedQuestionAsync(JSON.stringify(contract));
    expect(res.valid).toBe(false);
    expect(res.reason).toMatch(/Sandbox verification failed|Reference solution failed verification/);
  });
});

