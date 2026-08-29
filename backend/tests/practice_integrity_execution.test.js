const { loadPracticeProblems } = require('../src/db/practiceSeed');
const { executeCode } = require('../src/services/executionService');

describe('Practice V1 80-Question Integrity & Execution Suite', () => {
  let problems = [];

  beforeAll(() => {
    problems = loadPracticeProblems();
  });

  test('All 80 questions are present and conform to controlled taxonomy', () => {
    expect(problems.length).toBe(80);

    const ids = new Set();
    const slugs = new Set();

    problems.forEach(p => {
      expect(ids.has(p.id)).toBe(false);
      expect(slugs.has(p.slug)).toBe(false);
      ids.add(p.id);
      slugs.add(p.slug);

      expect(p.title).toBeTruthy();
      expect(p.description).toBeTruthy();
      expect(['easy', 'medium', 'hard']).toContain(String(p.difficulty).toLowerCase());
      expect(Array.isArray(p.testCases)).toBe(true);
      expect(p.testCases.length).toBeGreaterThanOrEqual(3);
      expect(p.testCases.some(tc => tc.hidden)).toBe(true);
    });
  });

  test('Best Time to Buy and Sell Stock (arr-002) executes correctly with stock profit logic in JavaScript', async () => {
    const stockProblem = problems.find(p => p.id === 'arr-002' || p.slug === 'best-time-to-buy-and-sell-stock');
    expect(stockProblem).toBeDefined();
    expect(stockProblem.title).toBe('Best Time to Buy and Sell Stock');

    // Reference solution for Best Time to Buy and Sell Stock
    const solutionCode = `
const fs = require('fs');

function maxProfit(prices) {
  let minPrice = Infinity;
  let maxProfit = 0;
  for (let i = 0; i < prices.length; i++) {
    if (prices[i] < minPrice) {
      minPrice = prices[i];
    } else if (prices[i] - minPrice > maxProfit) {
      maxProfit = prices[i] - minPrice;
    }
  }
  return maxProfit;
}

const raw = fs.readFileSync(0, 'utf-8').trim();
if (raw) {
  const parsed = JSON.parse(raw);
  const prices = Array.isArray(parsed[0]) ? parsed[0] : parsed;
  console.log(maxProfit(prices));
}
    `;

    const formattedTestCases = stockProblem.testCases.map((tc, idx) => ({
      id: `tc-${idx}`,
      input: String(tc.input),
      expected_output: String(tc.expectedOutput),
      is_hidden: tc.hidden ? 1 : 0
    }));

    const result = await executeCode({
      language: 'javascript',
      sourceCode: solutionCode,
      testCases: formattedTestCases,
      isSubmit: true
    });

    expect(result.status).toBe('Accepted');
    expect(result.passed_tests).toBe(formattedTestCases.length);
  });

  test('Two Sum (arr-001) executes correctly with hash map logic in JavaScript', async () => {
    const twoSum = problems.find(p => p.id === 'arr-001' || p.slug === 'two-sum');
    expect(twoSum).toBeDefined();

    const solutionCode = `
const fs = require('fs');

function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}

const raw = fs.readFileSync(0, 'utf-8').trim();
if (raw) {
  const [nums, target] = JSON.parse(raw);
  console.log(JSON.stringify(twoSum(nums, target)));
}
    `;

    const formattedTestCases = twoSum.testCases.map((tc, idx) => ({
      id: `tc-${idx}`,
      input: String(tc.input),
      expected_output: String(tc.expectedOutput),
      is_hidden: tc.hidden ? 1 : 0
    }));

    const result = await executeCode({
      language: 'javascript',
      sourceCode: solutionCode,
      testCases: formattedTestCases,
      isSubmit: true
    });

    expect(result.status).toBe('Accepted');
    expect(result.passed_tests).toBe(formattedTestCases.length);
  });

  test('Product of Array Except Self (arr-003) executes correctly', async () => {
    const p = problems.find(p => p.id === 'arr-003');
    expect(p).toBeDefined();

    const solutionCode = `
const fs = require('fs');

function productExceptSelf(nums) {
  const n = nums.length;
  const res = new Array(n).fill(1);
  let prefix = 1;
  for (let i = 0; i < n; i++) {
    res[i] = prefix;
    prefix *= nums[i];
  }
  let suffix = 1;
  for (let i = n - 1; i >= 0; i--) {
    res[i] *= suffix;
    suffix *= nums[i];
  }
  return res;
}

const raw = fs.readFileSync(0, 'utf-8').trim();
if (raw) {
  const parsed = JSON.parse(raw);
  const nums = Array.isArray(parsed[0]) ? parsed[0] : parsed;
  console.log(JSON.stringify(productExceptSelf(nums)));
}
    `;

    const formattedTestCases = p.testCases.map((tc, idx) => ({
      id: `tc-${idx}`,
      input: String(tc.input),
      expected_output: String(tc.expectedOutput),
      is_hidden: tc.hidden ? 1 : 0
    }));

    const result = await executeCode({
      language: 'javascript',
      sourceCode: solutionCode,
      testCases: formattedTestCases,
      isSubmit: true
    });

    expect(result.status).toBe('Accepted');
    expect(result.passed_tests).toBe(formattedTestCases.length);
  });

  test('Valid Anagram (str-001) executes correctly', async () => {
    const p = problems.find(p => p.id === 'str-001');
    expect(p).toBeDefined();

    const solutionCode = `
const fs = require('fs');

function isAnagram(s, t) {
  if (s.length !== t.length) return false;
  return s.split('').sort().join('') === t.split('').sort().join('');
}

const raw = fs.readFileSync(0, 'utf-8').trim();
if (raw) {
  const [s, t] = JSON.parse(raw);
  console.log(isAnagram(s, t));
}
    `;

    const formattedTestCases = p.testCases.map((tc, idx) => ({
      id: `tc-${idx}`,
      input: String(tc.input),
      expected_output: String(tc.expectedOutput),
      is_hidden: tc.hidden ? 1 : 0
    }));

    const result = await executeCode({
      language: 'javascript',
      sourceCode: solutionCode,
      testCases: formattedTestCases,
      isSubmit: true
    });

    expect(result.status).toBe('Accepted');
    expect(result.passed_tests).toBe(formattedTestCases.length);
  });
});
