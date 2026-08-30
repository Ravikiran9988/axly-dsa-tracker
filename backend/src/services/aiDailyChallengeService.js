const { getRepository } = require('../db/repositoryFactory');
const { AppError } = require('../middleware/errorHandler');
const llmRouter = require('./llm/llmRouter');
const { executeCode, normalizeOutput } = require('./executionService');
const { getCanonicalUtcDate } = require('../utils/dateUtils');

function getRepo() {
  return getRepository();
}

/**
 * Standard topics in DSA curriculum
 */
const TOPIC_NAMES = {
  'top-01': 'Arrays',
  'top-02': 'Strings',
  'top-03': 'Two Pointers',
  'top-04': 'Sliding Window',
  'top-05': 'Binary Search',
  'top-06': 'Stack',
  'top-07': 'Trees',
  'top-08': 'Dynamic Programming',
  'top-09': 'Graphs',
  'top-10': 'Hashing',
  'top-11': 'Heap / Priority Queue',
  'top-12': 'Recursion & Backtracking'
};

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'to', 'in', 'of', 'for', 'with', 'on', 'at', 'by',
  'from', 'under', 'given', 'find', 'return', 'calculate', 'determine', 'get', 'is',
  'can', 'best', 'target', 'constraint', 'maximum', 'minimum', 'longest', 'shortest',
  'most', 'least', 'optimal', 'total', 'all', 'any', 'value', 'values', 'fewest',
  'constraints', 'integers', 'integer', 'elements', 'element', 'two', 'three', 'four',
  'pair', 'pairs', 'first', 'second', 'third', 'equal', 'equals', 'large', 'small',
  'numbers', 'number', 'k', 'n', 'such', 'that',
  'problem', 'challenge', 'algorithm', 'function', 'solution'
]);

const GENERIC_DSA_TERMS = new Set([
  'array', 'arrays', 'string', 'strings', 'matrix', 'tree', 'trees', 'node', 'nodes',
  'graph', 'graphs', 'list', 'lists', 'subarray', 'subarrays', 'substring', 'substrings',
  'path', 'paths', 'problem', 'challenge', 'grid'
]);

/**
 * Strip artificial variant suffixes (e.g. "Variant 4880", "(Variant 0717)", "- v2", etc.)
 */
function stripVariantIdentifiers(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/\s*[\(\[\{]\s*(?:variant|version|v|ver|iteration)\s*#?\s*[a-z0-9_-]+\s*[\)\]\}]/gi, '')
    .replace(/\s*[-—–:]\s*(?:variant|version|v)\s*#?\s*[a-z0-9_-]+/gi, '')
    .replace(/\s+(?:variant|version|v)\s*#?\s*[a-z0-9_-]+/gi, '')
    .replace(/\s+#\d+/g, '')
    .replace(/\s*\([^\)]*\d+[^\)]*\)/g, '')
    .trim();
}

/**
 * Extract normalized problem concept keyword tokens from title and description
 */
function extractProblemConcept(title, description = '') {
  const cleanTitle = stripVariantIdentifiers(title || '');
  const combined = `${cleanTitle} ${description || ''}`.toLowerCase();
  const words = combined
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));

  const stemmed = words.map(w => {
    if (w.endsWith('ies')) return w.slice(0, -3) + 'y';
    if (w.endsWith('es') && !w.endsWith('tes') && !w.endsWith('ses')) return w.slice(0, -2);
    if (w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
    if (w.endsWith('ing')) return w.slice(0, -3);
    if (w.endsWith('ed')) return w.slice(0, -2);
    return w;
  });

  const unique = Array.from(new Set(stemmed));
  return unique.slice(0, 8).sort().join('-');
}

/**
 * Extract input structure type from string specifications
 */
function extractInputStructure(text = '') {
  const t = String(text).toLowerCase();
  if (t.includes('tree') || t.includes('treenode') || t.includes('root')) return 'tree';
  if (t.includes('graph') || t.includes('adj') || t.includes('edge')) return 'graph';
  if (t.includes('matrix') || t.includes('grid') || t.includes('2d')) return 'matrix';
  if (t.includes('array') || t.includes('nums') || t.includes('list')) return 'array';
  if (t.includes('string') || t.includes('word') || t.includes('char')) return 'string';
  return 'primitive';
}

/**
 * Extract output structure type from string specifications
 */
function extractOutputType(text = '') {
  const t = String(text).toLowerCase();
  if (t.includes('boolean') || t.includes('true') || t.includes('false')) return 'boolean';
  if (t.includes('count') || t.includes('sum') || t.includes('length') || t.includes('integer') || t.includes('number') || t.includes('max') || t.includes('min') || t.includes('depth')) return 'number';
  if (t.includes('array') || t.includes('list') || t.includes('indices')) return 'array';
  if (t.includes('string') || t.includes('word')) return 'string';
  return 'scalar';
}

/**
 * Generate a deterministic structured problem signature
 * Format: {topic}|{pattern}|{coreConcept}|{inputStructure}|{outputType}
 */
function generateProblemSignature(data = {}) {
  const topic = String(data.topic || data.topic_name || 'general').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  const pattern = String(data.pattern || data.pattern_name || 'general').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  const concept = extractProblemConcept(data.title || '', data.description || '');
  const inputType = extractInputStructure(`${data.input_format || ''} ${data.description || ''} ${data.title || ''}`);
  const outputType = extractOutputType(`${data.output_format || ''} ${data.description || ''} ${data.title || ''}`);

  return `${topic}|${pattern}|${concept || 'general'}|${inputType}|${outputType}`;
}

/**
 * Compute specific token overlap and Jaccard similarity between two texts
 */
function computeSemanticSimilarity(textA, textB) {
  const cleanA = stripVariantIdentifiers(textA).toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const cleanB = stripVariantIdentifiers(textB).toLowerCase().replace(/[^a-z0-9\s]/g, ' ');

  const tokensA = new Set(cleanA.split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w)));
  const tokensB = new Set(cleanB.split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w)));

  const specificA = new Set([...tokensA].filter(w => !GENERIC_DSA_TERMS.has(w)));
  const specificB = new Set([...tokensB].filter(w => !GENERIC_DSA_TERMS.has(w)));

  if (specificA.size === 0 || specificB.size === 0) return { jaccard: 0, overlap: 0, sharedCount: 0 };

  let sharedSpecific = 0;
  for (const t of specificA) {
    if (specificB.has(t)) sharedSpecific++;
  }

  const union = new Set([...specificA, ...specificB]).size;
  const jaccard = union > 0 ? sharedSpecific / union : 0;
  const overlap = Math.min(specificA.size, specificB.size) > 0 ? sharedSpecific / Math.min(specificA.size, specificB.size) : 0;

  return { jaccard, overlap, sharedCount: sharedSpecific };
}

/**
 * Curated Library of 18+ Distinct, Verified DSA Problem Archetypes
 * (Zero artificial variants; 100% verified sandbox drivers)
 */
const PROBLEM_TEMPLATES = [
  {
    topic: 'Arrays',
    pattern: 'Sliding Window',
    difficulty: 'medium',
    title: 'Maximum Subarray with Bounded Diversity',
    description: 'Given an integer array `nums` and an integer `k`, return the maximum sum of any contiguous subarray containing at most `k` distinct elements.',
    constraints: '1 <= nums.length <= 10^5\n-10^4 <= nums[i] <= 10^4\n1 <= k <= 10^5',
    input_format: 'First line: JSON array `nums`.\nSecond line: integer `k`.',
    output_format: 'A single integer representing the maximum sum.',
    examples: [
      { input: '[1, 2, 1, 3, 4]\n2', output: '7', explanation: 'The subarray [1, 2, 1, 3] gives sum 7.' }
    ],
    starter_code: `function maxSubarraySumBounded(nums, k) {\n  return 0;\n}`,
    reference_solution: `function maxSubarraySumBounded(nums, k) {
  if (!nums || nums.length === 0 || k <= 0) return 0;
  let left = 0, currentSum = 0, maxSum = -Infinity;
  const count = new Map();
  for (let right = 0; right < nums.length; right++) {
    const val = nums[right];
    count.set(val, (count.get(val) || 0) + 1);
    currentSum += val;
    while (count.size > k && left <= right) {
      const leftVal = nums[left];
      const leftCount = count.get(leftVal);
      if (leftCount === 1) count.delete(leftVal);
      else count.set(leftVal, leftCount - 1);
      currentSum -= leftVal;
      left++;
    }
    if (count.size <= k && currentSum > maxSum) maxSum = currentSum;
  }
  return maxSum === -Infinity ? 0 : maxSum;
}`,
    driver_code: `const fs = require('fs');
const raw = fs.readFileSync(0, 'utf-8').trim();
if (!raw) process.exit(0);
const lines = raw.split('\\n').map(s => s.trim()).filter(Boolean);
const nums = JSON.parse(lines[0]);
const k = parseInt(lines[1], 10);
console.log(maxSubarraySumBounded(nums, k));`,
    test_cases: [
      { input: '[1, 2, 1, 3, 4]\n2', expected_output: '7', is_hidden: 0 },
      { input: '[5, 5, 5, 5]\n1', expected_output: '20', is_hidden: 0 },
      { input: '[10, -5, 10, -5, 10]\n2', expected_output: '20', is_hidden: 1 },
      { input: '[-1, -2, -3]\n2', expected_output: '-1', is_hidden: 1 }
    ],
    hints: ['Maintain a sliding window [left, right] with a frequency map.', 'Shrink from left when map size exceeds k.'],
    editorial: 'Expand right pointer, maintain frequency hash map and window sum. Shrink left pointer when map size > k.',
    complexity: 'Time: O(N) | Space: O(K)'
  },
  {
    topic: 'Strings',
    pattern: 'Two Pointers',
    difficulty: 'easy',
    title: 'Valid Palindrome with Bounded Deletions',
    description: 'Given a string `s` and an integer `k`, determine if `s` can be converted into a palindrome by deleting at most `k` characters.',
    constraints: '1 <= s.length <= 10^5\n0 <= k <= 2\n`s` consists of lowercase English letters.',
    input_format: 'Line 1: string `s`\nLine 2: integer `k`',
    output_format: 'Boolean `true` or `false`',
    examples: [
      { input: 'abca\n1', output: 'true', explanation: 'Delete "b" or "c" to obtain palindrome.' }
    ],
    starter_code: `function isValidPalindromeK(s, k) {\n  return false;\n}`,
    reference_solution: `function isValidPalindromeK(s, k) {
  function check(left, right, kRem) {
    while (left < right) {
      if (s[left] === s[right]) {
        left++;
        right--;
      } else {
        if (kRem <= 0) return false;
        return check(left + 1, right, kRem - 1) || check(left, right - 1, kRem - 1);
      }
    }
    return true;
  }
  return check(0, s.length - 1, k);
}`,
    driver_code: `const fs = require('fs');
const raw = fs.readFileSync(0, 'utf-8').trim();
if (!raw) process.exit(0);
const lines = raw.split(/\\r?\\n/).map(s => s.trim()).filter(Boolean);
const s = lines[0];
const k = parseInt(lines[1], 10);
console.log(isValidPalindromeK(s, k));`,
    test_cases: [
      { input: 'abca\n1', expected_output: 'true', is_hidden: 0 },
      { input: 'abcde\n1', expected_output: 'false', is_hidden: 0 },
      { input: 'racecar\n0', expected_output: 'true', is_hidden: 1 },
      { input: 'axblyba\n2', expected_output: 'true', is_hidden: 1 }
    ],
    hints: ['Use two pointers from both ends.', 'When mismatch occurs, branch recursively reducing k.'],
    editorial: 'Two pointers inwards. When characters differ, check subproblems with k-1 budget.',
    complexity: 'Time: O(N * 2^K) | Space: O(K)'
  },
  {
    topic: 'Dynamic Programming',
    pattern: '1D DP',
    difficulty: 'easy',
    title: 'Min Cost Stair Climbing with Variable Steps',
    description: 'You are given an integer array `cost` where `cost[i]` is the cost of the `i`-th step. You can take 1 or 2 steps at a time. Return the minimum cost to reach the top floor.',
    constraints: '2 <= cost.length <= 1000\n0 <= cost[i] <= 999',
    input_format: 'JSON array of integers `cost`.',
    output_format: 'Integer representing minimum total cost.',
    examples: [
      { input: '[10, 15, 20]', output: '15', explanation: 'Start at index 1 and pay 15.' }
    ],
    starter_code: `function minCostClimbingSteps(cost) {\n  return 0;\n}`,
    reference_solution: `function minCostClimbingSteps(cost) {
  if (!cost || cost.length === 0) return 0;
  let prev2 = 0, prev1 = 0;
  for (let i = 0; i < cost.length; i++) {
    const curr = cost[i] + Math.min(prev1, prev2);
    prev2 = prev1;
    prev1 = curr;
  }
  return Math.min(prev1, prev2);
}`,
    driver_code: `const fs = require('fs');
const raw = fs.readFileSync(0, 'utf-8').trim();
if (!raw) process.exit(0);
const cost = JSON.parse(raw);
console.log(minCostClimbingSteps(cost));`,
    test_cases: [
      { input: '[10, 15, 20]', expected_output: '15', is_hidden: 0 },
      { input: '[1, 100, 1, 1, 1, 100, 1, 1, 100, 1]', expected_output: '6', is_hidden: 0 },
      { input: '[0, 0, 0, 0]', expected_output: '0', is_hidden: 1 },
      { input: '[5, 10]', expected_output: '5', is_hidden: 1 }
    ],
    hints: ['dp[i] = cost[i] + min(dp[i-1], dp[i-2])', 'Keep only last 2 values for O(1) space.'],
    editorial: 'Standard 1D Dynamic Programming minimum cost climbing optimization with state compression.',
    complexity: 'Time: O(N) | Space: O(1)'
  },
  {
    topic: 'Dynamic Programming',
    pattern: '1D DP',
    difficulty: 'medium',
    title: 'House Robber Non-Adjacent Vault Plunder',
    description: 'You are planning to rob houses along a street. Each house has a certain amount of money stashed. Adjacent houses have security systems connected. Return the maximum amount of money you can rob tonight without alerting the police.',
    constraints: '1 <= nums.length <= 100\n0 <= nums[i] <= 400',
    input_format: 'JSON array of integers `nums`.',
    output_format: 'Integer representing maximum robbed amount.',
    examples: [
      { input: '[1, 2, 3, 1]', output: '4', explanation: 'Rob house 1 (money = 1) and house 3 (money = 3). Total = 4.' }
    ],
    starter_code: `function rob(nums) {\n  return 0;\n}`,
    reference_solution: `function rob(nums) {
  if (!nums || nums.length === 0) return 0;
  if (nums.length === 1) return nums[0];
  let prev2 = 0, prev1 = 0;
  for (const n of nums) {
    const temp = Math.max(prev1, prev2 + n);
    prev2 = prev1;
    prev1 = temp;
  }
  return prev1;
}`,
    driver_code: `const fs = require('fs');
const raw = fs.readFileSync(0, 'utf-8').trim();
if (!raw) process.exit(0);
const nums = JSON.parse(raw);
console.log(rob(nums));`,
    test_cases: [
      { input: '[1, 2, 3, 1]', expected_output: '4', is_hidden: 0 },
      { input: '[2, 7, 9, 3, 1]', expected_output: '12', is_hidden: 0 },
      { input: '[0]', expected_output: '0', is_hidden: 1 },
      { input: '[2, 1, 1, 2]', expected_output: '4', is_hidden: 1 }
    ],
    hints: ['dp[i] = max(dp[i-1], dp[i-2] + nums[i])'],
    editorial: '1D Dynamic programming tracking maximum plunder choosing to skip or take each house.',
    complexity: 'Time: O(N) | Space: O(1)'
  },
  {
    topic: 'Dynamic Programming',
    pattern: 'Subsequence DP',
    difficulty: 'medium',
    title: 'Longest Alternating Target Subsequence',
    description: 'Given an array of integers `nums`, return the length of the longest subsequence where the differences between consecutive elements strictly alternate between positive and negative.',
    constraints: '1 <= nums.length <= 1000\n-10^4 <= nums[i] <= 10^4',
    input_format: 'JSON array of integers `nums`.',
    output_format: 'Integer representing maximum alternating subsequence length.',
    examples: [
      { input: '[1, 7, 4, 9, 2, 5]', output: '6', explanation: 'The entire sequence alternates: +6, -3, +5, -7, +3.' }
    ],
    starter_code: `function longestAlternatingSubsequence(nums) {\n  return 0;\n}`,
    reference_solution: `function longestAlternatingSubsequence(nums) {
  if (!nums || nums.length === 0) return 0;
  let up = 1, down = 1;
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] > nums[i - 1]) up = down + 1;
    else if (nums[i] < nums[i - 1]) down = up + 1;
  }
  return Math.max(up, down);
}`,
    driver_code: `const fs = require('fs');
const raw = fs.readFileSync(0, 'utf-8').trim();
if (!raw) process.exit(0);
const nums = JSON.parse(raw);
console.log(longestAlternatingSubsequence(nums));`,
    test_cases: [
      { input: '[1, 7, 4, 9, 2, 5]', expected_output: '6', is_hidden: 0 },
      { input: '[1, 17, 5, 10, 13, 15, 10, 5, 16, 8]', expected_output: '7', is_hidden: 0 },
      { input: '[1, 2, 3, 4, 5]', expected_output: '2', is_hidden: 1 },
      { input: '[5]', expected_output: '1', is_hidden: 1 }
    ],
    hints: ['Track up and down states.', 'When nums[i] > nums[i-1], up = down + 1; when nums[i] < nums[i-1], down = up + 1.'],
    editorial: 'Greedy dynamic programming tracking peak and valley transitions.',
    complexity: 'Time: O(N) | Space: O(1)'
  },
  {
    topic: 'Dynamic Programming',
    pattern: 'Knapsack DP',
    difficulty: 'medium',
    title: 'Coin Change Minimum Count with Denomination Bounds',
    description: 'You are given an integer array `coins` representing coin denominations and an integer `amount`. Return the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up, return -1.',
    constraints: '1 <= coins.length <= 12\n1 <= coins[i] <= 2^31 - 1\n0 <= amount <= 10^4',
    input_format: 'Line 1: JSON array `coins`\nLine 2: integer `amount`',
    output_format: 'Integer representing minimum coin count or -1.',
    examples: [
      { input: '[1, 2, 5]\n11', output: '3', explanation: '11 = 5 + 5 + 1 (3 coins).' }
    ],
    starter_code: `function coinChangeMin(coins, amount) {\n  return -1;\n}`,
    reference_solution: `function coinChangeMin(coins, amount) {
  if (amount === 0) return 0;
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;
  for (let i = 1; i <= amount; i++) {
    for (const c of coins) {
      if (i - c >= 0 && dp[i - c] !== Infinity) {
        dp[i] = Math.min(dp[i], dp[i - c] + 1);
      }
    }
  }
  return dp[amount] === Infinity ? -1 : dp[amount];
}`,
    driver_code: `const fs = require('fs');
const raw = fs.readFileSync(0, 'utf-8').trim();
if (!raw) process.exit(0);
const lines = raw.split(/\\r?\\n/).map(s => s.trim()).filter(Boolean);
const coins = JSON.parse(lines[0]);
const amount = parseInt(lines[1], 10);
console.log(coinChangeMin(coins, amount));`,
    test_cases: [
      { input: '[1, 2, 5]\n11', expected_output: '3', is_hidden: 0 },
      { input: '[2]\n3', expected_output: '-1', is_hidden: 0 },
      { input: '[1]\n0', expected_output: '0', is_hidden: 1 },
      { input: '[186, 419, 83, 408]\n6249', expected_output: '20', is_hidden: 1 }
    ],
    hints: ['dp[i] = min(dp[i - coin] + 1) for all coins.', 'Initialize dp array with Infinity.'],
    editorial: 'Unbounded knapsack dynamic programming building minimum counts up to target amount.',
    complexity: 'Time: O(amount * len(coins)) | Space: O(amount)'
  },
  {
    topic: 'Stack',
    pattern: 'Monotonic Stack',
    difficulty: 'medium',
    title: 'Daily Temperatures with Next Warmer Day Distance',
    description: 'Given an array of integers `temperatures` representing daily temperatures, return an array `answer` such that `answer[i]` is the number of days you have to wait after the `i`-th day to get a warmer temperature. If there is no future day for which this is possible, keep `answer[i] == 0`.',
    constraints: '1 <= temperatures.length <= 10^5\n30 <= temperatures[i] <= 100',
    input_format: 'JSON array of integer temperatures.',
    output_format: 'JSON array of integer wait intervals.',
    examples: [
      { input: '[73, 74, 75, 71, 69, 72, 76, 73]', output: '[1, 1, 4, 2, 1, 1, 0, 0]', explanation: 'Days to wait for warmer temperature.' }
    ],
    starter_code: `function dailyTemperatures(temperatures) {\n  return [];\n}`,
    reference_solution: `function dailyTemperatures(temperatures) {
  const n = temperatures.length;
  const ans = new Array(n).fill(0);
  const stack = []; // indices of monotonically decreasing temperatures
  for (let i = 0; i < n; i++) {
    while (stack.length > 0 && temperatures[i] > temperatures[stack[stack.length - 1]]) {
      const prevIdx = stack.pop();
      ans[prevIdx] = i - prevIdx;
    }
    stack.push(i);
  }
  return ans;
}`,
    driver_code: `const fs = require('fs');
const raw = fs.readFileSync(0, 'utf-8').trim();
if (!raw) process.exit(0);
const temperatures = JSON.parse(raw);
console.log(dailyTemperatures(temperatures).join(' '));`,
    test_cases: [
      { input: '[73, 74, 75, 71, 69, 72, 76, 73]', expected_output: '1 1 4 2 1 1 0 0', is_hidden: 0 },
      { input: '[30, 40, 50, 60]', expected_output: '1 1 1 0', is_hidden: 0 },
      { input: '[30, 60, 90]', expected_output: '1 1 0', is_hidden: 1 },
      { input: '[90, 80, 70]', expected_output: '0 0 0', is_hidden: 1 }
    ],
    hints: ['Maintain a stack of indices with decreasing temperatures.', 'Pop elements when current temperature is strictly greater.'],
    editorial: 'Monotonic decreasing stack resolves next greater element distances in linear time.',
    complexity: 'Time: O(N) | Space: O(N)'
  },
  {
    topic: 'Trees',
    pattern: 'BFS / Level Order',
    difficulty: 'medium',
    title: 'Binary Tree Zigzag Level Order Traversal',
    description: 'Given the root of a binary tree represented as an array in level-order, return the zigzag level order traversal of its nodes values.',
    constraints: 'The number of nodes in the tree is in the range [0, 2000].\n-1000 <= Node.val <= 1000',
    input_format: 'JSON array of level-order values with null for missing children.',
    output_format: 'JSON array of arrays representing zigzag levels.',
    examples: [
      { input: '[3, 9, 20, null, null, 15, 7]', output: '[[3], [20, 9], [15, 7]]', explanation: 'Level 1: 3, Level 2: 20 -> 9, Level 3: 15 -> 7.' }
    ],
    starter_code: `function zigzagLevelOrder(rootArr) {\n  return [];\n}`,
    reference_solution: `function zigzagLevelOrder(rootArr) {
  if (!rootArr || rootArr.length === 0 || rootArr[0] === null) return [];
  function TreeNode(val) { this.val = val; this.left = this.right = null; }
  const root = new TreeNode(rootArr[0]);
  const queue = [root];
  let i = 1;
  while (queue.length > 0 && i < rootArr.length) {
    const curr = queue.shift();
    if (i < rootArr.length && rootArr[i] !== null) {
      curr.left = new TreeNode(rootArr[i]);
      queue.push(curr.left);
    }
    i++;
    if (i < rootArr.length && rootArr[i] !== null) {
      curr.right = new TreeNode(rootArr[i]);
      queue.push(curr.right);
    }
    i++;
  }
  const result = [];
  const bfsQ = [root];
  let leftToRight = true;
  while (bfsQ.length > 0) {
    const levelSize = bfsQ.length;
    const level = [];
    for (let s = 0; s < levelSize; s++) {
      const node = bfsQ.shift();
      if (leftToRight) level.push(node.val);
      else level.unshift(node.val);
      if (node.left) bfsQ.push(node.left);
      if (node.right) bfsQ.push(node.right);
    }
    result.push(level);
    leftToRight = !leftToRight;
  }
  return result;
}`,
    driver_code: `const fs = require('fs');
const raw = fs.readFileSync(0, 'utf-8').trim();
if (!raw) process.exit(0);
const rootArr = JSON.parse(raw);
console.log(JSON.stringify(zigzagLevelOrder(rootArr)));`,
    test_cases: [
      { input: '[3, 9, 20, null, null, 15, 7]', expected_output: '[[3],[20,9],[15,7]]', is_hidden: 0 },
      { input: '[1]', expected_output: '[[1]]', is_hidden: 0 },
      { input: '[]', expected_output: '[]', is_hidden: 1 },
      { input: '[1, 2, 3, 4, 5, null, 6]', expected_output: '[[1],[3,2],[4,5,6]]', is_hidden: 1 }
    ],
    hints: ['Perform a standard BFS level by level.', 'Toggle a boolean flag on each level to reverse insertion direction.'],
    editorial: 'Breadth-first search tracking level size with alternating deque order.',
    complexity: 'Time: O(N) | Space: O(N)'
  },
  {
    topic: 'Graphs',
    pattern: 'Topological Sort',
    difficulty: 'hard',
    title: 'Course Schedule Prerequisite Resolution',
    description: 'There are a total of `numCourses` courses labeled from `0` to `numCourses - 1`. You are given an array `prerequisites` where `prerequisites[i] = [a, b]` indicates that you must take course `b` first if you want to take course `a`. Return `true` if you can finish all courses, or `false` otherwise.',
    constraints: '1 <= numCourses <= 2000\n0 <= prerequisites.length <= 5000\nprerequisites[i].length == 2\n0 <= ai, bi < numCourses',
    input_format: 'Line 1: integer `numCourses`\nLine 2: JSON 2D array `prerequisites`',
    output_format: 'Boolean `true` or `false`',
    examples: [
      { input: '2\n[[1, 0]]', output: 'true', explanation: 'Course 0 then course 1.' },
      { input: '2\n[[1, 0], [0, 1]]', output: 'false', explanation: 'Cycle exists.' }
    ],
    starter_code: `function canFinishCourses(numCourses, prerequisites) {\n  return false;\n}`,
    reference_solution: `function canFinishCourses(numCourses, prerequisites) {
  const inDegree = new Array(numCourses).fill(0);
  const adj = Array.from({ length: numCourses }, () => []);
  for (const [course, pre] of prerequisites) {
    adj[pre].push(course);
    inDegree[course]++;
  }
  const queue = [];
  for (let i = 0; i < numCourses; i++) {
    if (inDegree[i] === 0) queue.push(i);
  }
  let visited = 0;
  while (queue.length > 0) {
    const node = queue.shift();
    visited++;
    for (const next of adj[node]) {
      inDegree[next]--;
      if (inDegree[next] === 0) queue.push(next);
    }
  }
  return visited === numCourses;
}`,
    driver_code: `const fs = require('fs');
const raw = fs.readFileSync(0, 'utf-8').trim();
if (!raw) process.exit(0);
const lines = raw.split(/\\r?\\n/).map(s => s.trim()).filter(Boolean);
const numCourses = parseInt(lines[0], 10);
const prerequisites = JSON.parse(lines[1]);
console.log(canFinishCourses(numCourses, prerequisites));`,
    test_cases: [
      { input: '2\n[[1, 0]]', expected_output: 'true', is_hidden: 0 },
      { input: '2\n[[1, 0], [0, 1]]', expected_output: 'false', is_hidden: 0 },
      { input: '1\n[]', expected_output: 'true', is_hidden: 1 },
      { input: '4\n[[1, 0], [2, 0], [3, 1], [3, 2]]', expected_output: 'true', is_hidden: 1 }
    ],
    hints: ['Build in-degree array and adjacency list.', 'Use Kahn\'s algorithm with a queue of zero in-degree nodes.'],
    editorial: 'Kahn\'s algorithm for topological sorting and cycle detection in a directed graph.',
    complexity: 'Time: O(V + E) | Space: O(V + E)'
  },
  {
    topic: 'Hashing',
    pattern: 'Frequency Hash',
    difficulty: 'medium',
    title: 'Group Anagrams with Deterministic Key Mapping',
    description: 'Given an array of strings `strs`, group the anagrams together. You can return the answer in any order, sorted lexicographically by first word.',
    constraints: '1 <= strs.length <= 10^4\n0 <= strs[i].length <= 100\nstrs[i] consists of lowercase English letters.',
    input_format: 'JSON array of strings `strs`.',
    output_format: 'JSON array of grouped anagram arrays.',
    examples: [
      { input: '["eat", "tea", "tan", "ate", "nat", "bat"]', output: '[["bat"], ["eat", "tea", "ate"], ["tan", "nat"]]', explanation: 'Grouped anagram sets.' }
    ],
    starter_code: `function groupAnagrams(strs) {\n  return [];\n}`,
    reference_solution: `function groupAnagrams(strs) {
  const map = new Map();
  for (const s of strs) {
    const key = s.split('').sort().join('');
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(s);
  }
  const groups = Array.from(map.values());
  groups.sort((a, b) => a[0].localeCompare(b[0]));
  return groups;
}`,
    driver_code: `const fs = require('fs');
const raw = fs.readFileSync(0, 'utf-8').trim();
if (!raw) process.exit(0);
const strs = JSON.parse(raw);
console.log(JSON.stringify(groupAnagrams(strs)));`,
    test_cases: [
      { input: '["eat", "tea", "tan", "ate", "nat", "bat"]', expected_output: '[["bat"],["eat","tea","ate"],["tan","nat"]]', is_hidden: 0 },
      { input: '[""]', expected_output: '[[""]]', is_hidden: 0 },
      { input: '["a"]', expected_output: '[["a"]]', is_hidden: 1 },
      { input: '["listen", "silent", "enlist"]', expected_output: '[["listen","silent","enlist"]]', is_hidden: 1 }
    ],
    hints: ['Sort each string to form a canonical hash map key.', 'Group all words sharing the sorted key.'],
    editorial: 'Hash map with sorted character keys groups all anagram instances in linear time.',
    complexity: 'Time: O(N * K log K) | Space: O(N * K)'
  },
  {
    topic: 'Binary Search',
    pattern: 'Modified Binary Search',
    difficulty: 'medium',
    title: 'Search in Rotated Sorted Array Offset',
    description: 'Given the array `nums` after the possible rotation and an integer `target`, return the index of `target` if it is in `nums`, or `-1` if it is not in `nums`.',
    constraints: '1 <= nums.length <= 5000\n-10^4 <= nums[i], target <= 10^4\nAll values of `nums` are unique.',
    input_format: 'Line 1: JSON array `nums`\nLine 2: integer `target`',
    output_format: 'Integer representing target index or -1.',
    examples: [
      { input: '[4, 5, 6, 7, 0, 1, 2]\n0', output: '4', explanation: 'Element 0 is at index 4.' }
    ],
    starter_code: `function searchRotated(nums, target) {\n  return -1;\n}`,
    reference_solution: `function searchRotated(nums, target) {
  let left = 0, right = nums.length - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (nums[mid] === target) return mid;
    if (nums[left] <= nums[mid]) {
      if (nums[left] <= target && target < nums[mid]) right = mid - 1;
      else left = mid + 1;
    } else {
      if (nums[mid] < target && target <= nums[right]) left = mid + 1;
      else right = mid - 1;
    }
  }
  return -1;
}`,
    driver_code: `const fs = require('fs');
const raw = fs.readFileSync(0, 'utf-8').trim();
if (!raw) process.exit(0);
const lines = raw.split(/\\r?\\n/).map(s => s.trim()).filter(Boolean);
const nums = JSON.parse(lines[0]);
const target = parseInt(lines[1], 10);
console.log(searchRotated(nums, target));`,
    test_cases: [
      { input: '[4, 5, 6, 7, 0, 1, 2]\n0', expected_output: '4', is_hidden: 0 },
      { input: '[4, 5, 6, 7, 0, 1, 2]\n3', expected_output: '-1', is_hidden: 0 },
      { input: '[1]\n0', expected_output: '-1', is_hidden: 1 },
      { input: '[6, 7, 1, 2, 3, 4, 5]\n6', expected_output: '0', is_hidden: 1 }
    ],
    hints: ['Check which half is sorted.', 'Narrow search range to the sorted half.'],
    editorial: 'Modified binary search checking which partition is monotonic.',
    complexity: 'Time: O(log N) | Space: O(1)'
  },
  {
    topic: 'Two Pointers',
    pattern: 'Two Pointers Traversal',
    difficulty: 'medium',
    title: 'Container Area Maximization with Vertical Bars',
    description: 'You are given an integer array `height` of length `n`. Find two lines that together with the x-axis form a container, such that the container contains the most water.',
    constraints: '2 <= height.length <= 10^5\n0 <= height[i] <= 10^4',
    input_format: 'JSON array of integers `height`.',
    output_format: 'Integer representing maximum water volume.',
    examples: [
      { input: '[1, 8, 6, 2, 5, 4, 8, 3, 7]', output: '49', explanation: 'Max area between index 1 and 8 is 7 * 7 = 49.' }
    ],
    starter_code: `function maxWaterArea(height) {\n  return 0;\n}`,
    reference_solution: `function maxWaterArea(height) {
  let left = 0, right = height.length - 1, maxArea = 0;
  while (left < right) {
    const h = Math.min(height[left], height[right]);
    const area = h * (right - left);
    if (area > maxArea) maxArea = area;
    if (height[left] < height[right]) left++;
    else right--;
  }
  return maxArea;
}`,
    driver_code: `const fs = require('fs');
const raw = fs.readFileSync(0, 'utf-8').trim();
if (!raw) process.exit(0);
const height = JSON.parse(raw);
console.log(maxWaterArea(height));`,
    test_cases: [
      { input: '[1, 8, 6, 2, 5, 4, 8, 3, 7]', expected_output: '49', is_hidden: 0 },
      { input: '[1, 1]', expected_output: '1', is_hidden: 0 },
      { input: '[4, 3, 2, 1, 4]', expected_output: '16', is_hidden: 1 },
      { input: '[1, 2, 1]', expected_output: '2', is_hidden: 1 }
    ],
    hints: ['Start two pointers at the extreme ends.', 'Move the pointer pointing to the shorter line inward.'],
    editorial: 'Two pointers greedy shrinking from outermost boundaries towards center.',
    complexity: 'Time: O(N) | Space: O(1)'
  },
  {
    topic: 'Heap / Priority Queue',
    pattern: 'Top K Elements',
    difficulty: 'medium',
    title: 'Kth Largest Value in Continuous Stream Collection',
    description: 'Given an integer array `nums` and an integer `k`, return the `k`-th largest element in the array.',
    constraints: '1 <= k <= nums.length <= 10^5\n-10^4 <= nums[i] <= 10^4',
    input_format: 'Line 1: JSON array `nums`\nLine 2: integer `k`',
    output_format: 'Integer representing the k-th largest element.',
    examples: [
      { input: '[3, 2, 1, 5, 6, 4]\n2', output: '5', explanation: 'The 2nd largest is 5.' }
    ],
    starter_code: `function findKthLargest(nums, k) {\n  return 0;\n}`,
    reference_solution: `function findKthLargest(nums, k) {
  nums.sort((a, b) => b - a);
  return nums[k - 1];
}`,
    driver_code: `const fs = require('fs');
const raw = fs.readFileSync(0, 'utf-8').trim();
if (!raw) process.exit(0);
const lines = raw.split(/\\r?\\n/).map(s => s.trim()).filter(Boolean);
const nums = JSON.parse(lines[0]);
const k = parseInt(lines[1], 10);
console.log(findKthLargest(nums, k));`,
    test_cases: [
      { input: '[3, 2, 1, 5, 6, 4]\n2', expected_output: '5', is_hidden: 0 },
      { input: '[3, 2, 3, 1, 2, 4, 5, 5, 6]\n4', expected_output: '4', is_hidden: 0 },
      { input: '[1]\n1', expected_output: '1', is_hidden: 1 },
      { input: '[-1, -2]\n1', expected_output: '-1', is_hidden: 1 }
    ],
    hints: ['Sort descending or maintain a min-heap of size k.'],
    editorial: 'Sort descending or use a min-heap of size k to extract the k-th largest element.',
    complexity: 'Time: O(N log N) | Space: O(1)'
  },
  {
    topic: 'Stack',
    pattern: 'Parentheses Matching',
    difficulty: 'easy',
    title: 'Valid Parentheses Syntax Verification',
    description: 'Given a string `s` containing just the characters `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid.',
    constraints: '1 <= s.length <= 10^4\n`s` consists of parentheses only.',
    input_format: 'String `s`',
    output_format: 'Boolean `true` or `false`',
    examples: [
      { input: '()[]{}', output: 'true', explanation: 'All brackets match.' }
    ],
    starter_code: `function isValidParentheses(s) {\n  return false;\n}`,
    reference_solution: `function isValidParentheses(s) {
  const stack = [];
  const map = { ')': '(', '}': '{', ']': '[' };
  for (const ch of s) {
    if (ch === '(' || ch === '{' || ch === '[') {
      stack.push(ch);
    } else if (map[ch]) {
      if (stack.pop() !== map[ch]) return false;
    }
  }
  return stack.length === 0;
}`,
    driver_code: `const fs = require('fs');
const raw = fs.readFileSync(0, 'utf-8').trim();
if (!raw) process.exit(0);
console.log(isValidParentheses(raw));`,
    test_cases: [
      { input: '()[]{}', expected_output: 'true', is_hidden: 0 },
      { input: '(]', expected_output: 'false', is_hidden: 0 },
      { input: '([])', expected_output: 'true', is_hidden: 1 },
      { input: '((({{{[[[', expected_output: 'false', is_hidden: 1 }
    ],
    hints: ['Push open brackets, pop and verify on closing brackets.'],
    editorial: 'LIFO stack matches innermost brackets first.',
    complexity: 'Time: O(N) | Space: O(N)'
  },
  {
    topic: 'Dynamic Programming',
    pattern: '2D DP',
    difficulty: 'hard',
    title: 'Edit Distance Transformation Metric',
    description: 'Given two strings `word1` and `word2`, return the minimum number of operations required to convert `word1` to `word2`.',
    constraints: '0 <= word1.length, word2.length <= 500\n`word1` and `word2` consist of lowercase English letters.',
    input_format: 'Line 1: string `word1`\nLine 2: string `word2`',
    output_format: 'Integer representing minimum edit operations.',
    examples: [
      { input: 'horse\nros', output: '3', explanation: 'horse -> rorse -> rose -> ros (3 steps).' }
    ],
    starter_code: `function minDistance(word1, word2) {\n  return 0;\n}`,
    reference_solution: `function minDistance(word1, word2) {
  const m = word1.length, n = word2.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (word1[i - 1] === word2[j - 1]) dp[i][j] = dp[i - 1][j - 1];
      else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}`,
    driver_code: `const fs = require('fs');
const raw = fs.readFileSync(0, 'utf-8').trim();
if (!raw) process.exit(0);
const lines = raw.split(/\\r?\\n/).map(s => s.trim());
const word1 = lines[0] || '';
const word2 = lines[1] || '';
console.log(minDistance(word1, word2));`,
    test_cases: [
      { input: 'horse\nros', expected_output: '3', is_hidden: 0 },
      { input: 'intention\nexecution', expected_output: '5', is_hidden: 0 },
      { input: '\na', expected_output: '1', is_hidden: 1 },
      { input: 'abc\nabc', expected_output: '0', is_hidden: 1 }
    ],
    hints: ['dp[i][j] represents min edits to convert word1[0..i] to word2[0..j].'],
    editorial: '2D dynamic programming grid computing Levenshtein distance.',
    complexity: 'Time: O(M * N) | Space: O(M * N)'
  },
  {
    topic: 'Trees',
    pattern: 'DFS Traversal',
    difficulty: 'easy',
    title: 'Invert Binary Tree Symmetrical Transform',
    description: 'Given the root of a binary tree as a level-order array, invert the tree and return its level-order array.',
    constraints: 'The number of nodes in the tree is in the range [0, 100].',
    input_format: 'JSON array of node values',
    output_format: 'JSON array of inverted node values',
    examples: [
      { input: '[4, 2, 7, 1, 3, 6, 9]', output: '[4, 7, 2, 9, 6, 3, 1]', explanation: 'Left and right subtrees swapped.' }
    ],
    starter_code: `function invertTree(root) {\n  return [];\n}`,
    reference_solution: `function invertTree(rootArr) {
  if (!rootArr || rootArr.length === 0 || rootArr[0] === null) return [];
  function TreeNode(val) { this.val = val; this.left = this.right = null; }
  const root = new TreeNode(rootArr[0]);
  const q = [root];
  let i = 1;
  while (q.length > 0 && i < rootArr.length) {
    const cur = q.shift();
    if (i < rootArr.length && rootArr[i] !== null) {
      cur.left = new TreeNode(rootArr[i]);
      q.push(cur.left);
    }
    i++;
    if (i < rootArr.length && rootArr[i] !== null) {
      cur.right = new TreeNode(rootArr[i]);
      q.push(cur.right);
    }
    i++;
  }
  function invert(node) {
    if (!node) return null;
    const temp = node.left;
    node.left = invert(node.right);
    node.right = invert(temp);
    return node;
  }
  invert(root);
  const out = [];
  const outQ = [root];
  while (outQ.length > 0) {
    const cur = outQ.shift();
    if (cur) {
      out.push(cur.val);
      if (cur.left || cur.right || outQ.some(n => n !== null)) {
        outQ.push(cur.left);
        outQ.push(cur.right);
      }
    }
  }
  while (out.length > 0 && out[out.length - 1] === null) out.pop();
  return out;
}`,
    driver_code: `const fs = require('fs');
const raw = fs.readFileSync(0, 'utf-8').trim();
if (!raw) process.exit(0);
const rootArr = JSON.parse(raw);
console.log(JSON.stringify(invertTree(rootArr)));`,
    test_cases: [
      { input: '[4, 2, 7, 1, 3, 6, 9]', expected_output: '[4,7,2,9,6,3,1]', is_hidden: 0 },
      { input: '[2, 1, 3]', expected_output: '[2,3,1]', is_hidden: 0 },
      { input: '[]', expected_output: '[]', is_hidden: 1 }
    ],
    hints: ['Recursively swap left and right child pointers.'],
    editorial: 'Recursive post-order subtree swapping.',
    complexity: 'Time: O(N) | Space: O(H)'
  },
  {
    topic: 'Hashing',
    pattern: 'Hash Map Lookup',
    difficulty: 'easy',
    title: 'First Non-Repeating Unique Character Index',
    description: 'Given a string `s`, find the first non-repeating character in it and return its index. If it does not exist, return -1.',
    constraints: '1 <= s.length <= 10^5\n`s` consists of only lowercase English letters.',
    input_format: 'String `s`',
    output_format: 'Integer index or -1',
    examples: [
      { input: 'leetcode', output: '0', explanation: 'Character l appears once.' }
    ],
    starter_code: `function firstUniqChar(s) {\n  return -1;\n}`,
    reference_solution: `function firstUniqChar(s) {
  const count = new Map();
  for (const ch of s) count.set(ch, (count.get(ch) || 0) + 1);
  for (let i = 0; i < s.length; i++) {
    if (count.get(s[i]) === 1) return i;
  }
  return -1;
}`,
    driver_code: `const fs = require('fs');
const raw = fs.readFileSync(0, 'utf-8').trim();
if (!raw) process.exit(0);
console.log(firstUniqChar(raw));`,
    test_cases: [
      { input: 'leetcode', expected_output: '0', is_hidden: 0 },
      { input: 'loveaxlylove', expected_output: '4', is_hidden: 0 },
      { input: 'aabb', expected_output: '-1', is_hidden: 1 }
    ],
    hints: ['Count character frequencies in pass 1, find first with frequency 1 in pass 2.'],
    editorial: 'Two-pass linear scan with hash map frequency count.',
    complexity: 'Time: O(N) | Space: O(1)'
  },
  {
    topic: 'Binary Search',
    pattern: 'Binary Search',
    difficulty: 'easy',
    title: 'Find Peak Element in Mountain Sequence',
    description: 'An element is a peak if it is strictly greater than its neighbors. Given an integer array `nums`, find a peak element, and return its index.',
    constraints: '1 <= nums.length <= 1000\n-2^31 <= nums[i] <= 2^31 - 1',
    input_format: 'JSON array of integers `nums`.',
    output_format: 'Integer representing a peak element index.',
    examples: [
      { input: '[1, 2, 3, 1]', output: '2', explanation: 'Index 2 is 3, which is greater than 2 and 1.' }
    ],
    starter_code: `function findPeakElement(nums) {\n  return 0;\n}`,
    reference_solution: `function findPeakElement(nums) {
  let left = 0, right = nums.length - 1;
  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    if (nums[mid] > nums[mid + 1]) right = mid;
    else left = mid + 1;
  }
  return left;
}`,
    driver_code: `const fs = require('fs');
const raw = fs.readFileSync(0, 'utf-8').trim();
if (!raw) process.exit(0);
const nums = JSON.parse(raw);
console.log(findPeakElement(nums));`,
    test_cases: [
      { input: '[1, 2, 3, 1]', expected_output: '2', is_hidden: 0 },
      { input: '[1, 2, 1, 3, 5, 6, 4]', expected_output: '5', is_hidden: 0 },
      { input: '[1]', expected_output: '0', is_hidden: 1 }
    ],
    hints: ['If nums[mid] > nums[mid+1], a peak lies on the left side.'],
    editorial: 'Binary search narrowing slope ascent.',
    complexity: 'Time: O(log N) | Space: O(1)'
  },
  {
    topic: 'Sliding Window',
    pattern: 'Sliding Window',
    difficulty: 'medium',
    title: 'Subarray Product Strictly Less Than Target K',
    description: 'Given an array of integers `nums` and an integer `k`, return the number of contiguous subarrays where the product of all the elements in the subarray is strictly less than `k`.',
    constraints: '1 <= nums.length <= 3 * 10^4\n1 <= nums[i] <= 1000\n0 <= k <= 10^6',
    input_format: 'Line 1: JSON array `nums`\nLine 2: integer `k`',
    output_format: 'Integer count of valid subarrays.',
    examples: [
      { input: '[10, 5, 2, 6]\n100', output: '8', explanation: '8 subarrays have product < 100.' }
    ],
    starter_code: `function numSubarrayProductLessThanK(nums, k) {\n  return 0;\n}`,
    reference_solution: `function numSubarrayProductLessThanK(nums, k) {
  if (k <= 1) return 0;
  let prod = 1, left = 0, total = 0;
  for (let right = 0; right < nums.length; right++) {
    prod *= nums[right];
    while (prod >= k && left <= right) {
      prod /= nums[left];
      left++;
    }
    total += (right - left + 1);
  }
  return total;
}`,
    driver_code: `const fs = require('fs');
const raw = fs.readFileSync(0, 'utf-8').trim();
if (!raw) process.exit(0);
const lines = raw.split(/\\r?\\n/).map(s => s.trim()).filter(Boolean);
const nums = JSON.parse(lines[0]);
const k = parseInt(lines[1], 10);
console.log(numSubarrayProductLessThanK(nums, k));`,
    test_cases: [
      { input: '[10, 5, 2, 6]\n100', expected_output: '8', is_hidden: 0 },
      { input: '[1, 2, 3]\n0', expected_output: '0', is_hidden: 0 },
      { input: '[1, 1, 1]\n2', expected_output: '6', is_hidden: 1 }
    ],
    hints: ['Each valid window [left, right] contributes (right - left + 1) subarrays.'],
    editorial: 'Sliding window multiplying into running product, shrinking left pointer when product >= k.',
    complexity: 'Time: O(N) | Space: O(1)'
  }
];

function generateSlug(title) {
  const clean = stripVariantIdentifiers(title);
  return String(clean || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || `dc-${Date.now()}`;
}

/**
 * Check whether a challenge with similar concept or title already exists
 * Checks BOTH daily_challenge_problems AND questions (Practice)
 * Multi-layer detection:
 * Layer 1: Clean base title comparison (after stripping variant identifiers)
 * Layer 2: Structured Problem Signature match
 * Layer 3: Semantic Concept Token Overlap (Jaccard > 0.65 or Overlap > 0.80)
 */
async function checkDuplicateChallenge(candidate, description = '', excludeId = null) {
  const candidateData = typeof candidate === 'object' && candidate !== null
    ? candidate
    : { title: candidate, description: description || '' };

  const rawTitle = String(candidateData.title || '').trim();
  const cleanTitle = stripVariantIdentifiers(rawTitle);
  const normTitle = cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (!normTitle) return { isDuplicate: false };

  const candidateSignature = candidateData.problem_signature || generateProblemSignature(candidateData);
  const candidateConcept = extractProblemConcept(cleanTitle, candidateData.description || '');

  // 1. Check daily_challenge_problems (all non-archived: draft, scheduled, published)
  const existingDc = await getRepo().many(`
    SELECT id, title, description, status, scheduled_date, problem_signature, problem_concept
    FROM daily_challenge_problems
    WHERE status != 'archived' AND (is_active = 1 OR is_active = TRUE) ${excludeId ? 'AND id != ?' : ''}
  `, excludeId ? [excludeId] : []);

  for (const c of existingDc) {
    const existingRawTitle = String(c.title || '').trim();
    const existingCleanTitle = stripVariantIdentifiers(existingRawTitle);
    const existingNormTitle = existingCleanTitle.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Layer 1: Exact Clean Base Title match
    if (existingNormTitle === normTitle) {
      return {
        isDuplicate: true,
        reason: `A Daily Challenge with equivalent title "${c.title}" already exists (ID: ${c.id}).`,
        duplicateOf: c,
        layer: 1
      };
    }

    // Layer 2: Problem Concept & Signature match
    const existingConcept = c.problem_concept || extractProblemConcept(existingCleanTitle, c.description || '');
    if (existingConcept && candidateConcept && existingConcept === candidateConcept) {
      return {
        isDuplicate: true,
        reason: `Problem concept collision with Daily Challenge "${c.title}" (Concept: ${candidateConcept}).`,
        duplicateOf: c,
        layer: 2
      };
    }

    const existingSig = c.problem_signature || generateProblemSignature(c);
    if (existingSig && candidateSignature && existingSig === candidateSignature) {
      return {
        isDuplicate: true,
        reason: `Algorithmic problem signature collision with Daily Challenge "${c.title}" (Signature: ${existingSig}).`,
        duplicateOf: c,
        layer: 2
      };
    }

    // Layer 3: Semantic Concept Token Similarity
    const sim = computeSemanticSimilarity(cleanTitle, existingCleanTitle);
    if (sim.sharedCount >= 2 && (sim.overlap >= 0.70 || sim.jaccard >= 0.50)) {
      return {
        isDuplicate: true,
        reason: `Semantic concept collision with Daily Challenge "${c.title}" (Similarity: ${Math.round(sim.overlap * 100)}%).`,
        duplicateOf: c,
        layer: 3
      };
    }

    // Layer 3b: Substring / Root Concept containment (only if sufficiently distinct and not single word)
    if (cleanTitle.split(/\s+/).length >= 3 && existingCleanTitle.split(/\s+/).length >= 3) {
      if (normTitle.includes(existingNormTitle) || existingNormTitle.includes(normTitle)) {
        return {
          isDuplicate: true,
          reason: `Root algorithmic concept overlaps with Daily Challenge "${c.title}".`,
          duplicateOf: c,
          layer: 3
        };
      }
    }
  }

  // 2. Check Practice questions repository (bypassed if candidate is explicitly derived from practice)
  if (candidateData.source_question_id) {
    return { isDuplicate: false };
  }

  try {
    const existingQuestions = await getRepo().many(`
      SELECT id, title, description 
      FROM questions
      WHERE is_active = 1 OR is_active = TRUE
    `);

    for (const q of existingQuestions) {

      const qRawTitle = String(q.title || '').trim();
      const qCleanTitle = stripVariantIdentifiers(qRawTitle);
      const qNormTitle = qCleanTitle.toLowerCase().replace(/[^a-z0-9]/g, '');

      // Layer 1: Exact Clean Base Title
      if (qNormTitle === normTitle) {
        return {
          isDuplicate: true,
          reason: `A Practice problem with title "${q.title}" already exists in the question bank (ID: ${q.id}).`,
          duplicateOf: q,
          layer: 1
        };
      }

      // Layer 2: Signature
      const qSig = generateProblemSignature(q);
      if (qSig && candidateSignature && qSig === candidateSignature) {
        return {
          isDuplicate: true,
          reason: `Problem signature collides with Practice question "${q.title}".`,
          duplicateOf: q,
          layer: 2
        };
      }

      // Layer 3: Semantic Similarity
      const sim = computeSemanticSimilarity(cleanTitle, qCleanTitle);
      if (sim.sharedCount >= 2 && (sim.overlap >= 0.70 || sim.jaccard >= 0.50)) {
        return {
          isDuplicate: true,
          reason: `Semantic collision with Practice question "${q.title}".`,
          duplicateOf: q,
          layer: 3
        };
      }
    }
  } catch (_) {
    // Continue safely if questions table query fails
  }

  return { isDuplicate: false };
}

/**
 * Validate a candidate Daily Challenge definition
 */
function validateDailyChallenge(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: ['Invalid challenge payload'] };
  }

  if (!data.title || String(data.title).trim().length < 4) {
    errors.push('Title must be at least 4 characters long.');
  }

  const difficulty = String(data.difficulty || '').toLowerCase();
  if (!['easy', 'medium', 'hard'].includes(difficulty)) {
    errors.push('Difficulty must be easy, medium, or hard.');
  }

  if (!data.description || String(data.description).trim().length < 15) {
    errors.push('Problem description must provide clear problem specifications (min 15 characters).');
  }

  if (!data.constraints || String(data.constraints).trim().length < 3) {
    errors.push('Constraints must be specified for competitive clarity.');
  }

  const testCases = Array.isArray(data.test_cases) ? data.test_cases : [];
  if (testCases.length < 2) {
    errors.push('At least 2 test cases (public and hidden) are required.');
  }

  let hasPublic = false;
  let hasHidden = false;

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    if (tc.input === undefined || tc.expected_output === undefined || String(tc.input).trim() === '' || String(tc.expected_output).trim() === '') {
      errors.push(`Test case #${i + 1} must include both non-empty input and expected output.`);
    }
    if (tc.is_hidden) hasHidden = true;
    else hasPublic = true;
  }

  if (testCases.length >= 2 && (!hasPublic || !hasHidden)) {
    if (!hasHidden && testCases.length > 1) {
      testCases[testCases.length - 1].is_hidden = 1;
    }
  }

  const hints = Array.isArray(data.hints) ? data.hints : [];
  for (const h of hints) {
    if (/the answer is/i.test(String(h)) || /return true immediately/i.test(String(h))) {
      errors.push('Hints should guide the student progressively without directly giving away trivial answers.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Verify candidate challenge solution in the Sandbox
 */
async function verifyReferenceSolution(challengeData) {
  const { test_cases = [], reference_solution, driver_code, starter_code } = challengeData;

  if (!Array.isArray(test_cases) || test_cases.length === 0) {
    return { verified: false, reason: 'No test cases provided for sandbox execution' };
  }

  const codeToRun = reference_solution || starter_code;
  if (!codeToRun || typeof codeToRun !== 'string' || codeToRun.trim().length === 0) {
    return { verified: false, reason: 'No reference solution or starter code provided for verification' };
  }

  const fullCode = driver_code
    ? `${codeToRun}\n\n${driver_code}`
    : codeToRun;

  try {
    const execResult = await executeCode({
      language: 'javascript',
      sourceCode: fullCode,
      testCases: test_cases
    });

    const isVerified = execResult.status === 'Accepted' || (execResult.passed_tests === test_cases.length && execResult.passed_tests > 0);
    return {
      verified: isVerified,
      total_tests: test_cases.length,
      passed_tests: execResult.passed_tests || 0,
      failed_tests: (test_cases.length - (execResult.passed_tests || 0)),
      reason: !isVerified ? `Sandbox execution failed with status: ${execResult.status}` : null
    };
  } catch (err) {
    return {
      verified: false,
      total_tests: test_cases.length,
      passed_tests: 0,
      failed_tests: test_cases.length,
      reason: `Sandbox execution failed: ${err.message}`
    };
  }
}

/**
 * Fetch recently used taxonomy and problem concepts to enforce rotational diversity
 */
async function getRecentTaxonomyHistory(limit = 15) {
  try {
    const recent = await getRepo().many(`
      SELECT title, topic_id, custom_topic, pattern_id, problem_concept
      FROM daily_challenge_problems
      WHERE status != 'archived' AND (is_active = 1 OR is_active = TRUE)
      ORDER BY created_at DESC
      LIMIT ?
    `, [limit]);

    const recentTitles = recent.map(r => stripVariantIdentifiers(r.title)).filter(Boolean);
    const recentConcepts = recent.map(r => r.problem_concept || extractProblemConcept(r.title)).filter(Boolean);

    return {
      recentTitles,
      recentConcepts
    };
  } catch (_) {
    return { recentTitles: [], recentConcepts: [] };
  }
}

/**
 * Generate an AI Daily Challenge with rotational diversity and concept-level uniqueness
 */
async function generateDailyChallenge(options = {}) {
  const {
    topic = null,
    difficulty = 'medium',
    pattern = null,
    points = null,
    instructions = null,
    scheduled_date = null,
    skipSandbox = false
  } = options;

  const normDifficulty = ['easy', 'medium', 'hard'].includes(String(difficulty).toLowerCase())
    ? String(difficulty).toLowerCase()
    : 'medium';

  let targetTopic = topic && topic !== 'Surprise Me' ? topic : null;
  let targetPattern = pattern;
  let recommendationReason = null;

  // Retrieve recently used problem concepts to exclude
  const { recentTitles, recentConcepts } = await getRecentTaxonomyHistory(12);

  if (!targetTopic) {
    const { recommendTopicForDailyChallenge } = require('./topicService');
    const rec = await recommendTopicForDailyChallenge({ difficulty: normDifficulty });
    targetTopic = rec.topic_name;
    targetPattern = rec.pattern_name || pattern;
    recommendationReason = rec.reason;
  }

  const defaultPoints = normDifficulty === 'hard' ? 150 : normDifficulty === 'medium' ? 100 : 50;
  const finalPoints = Number(points) > 0 ? Number(points) : defaultPoints;

  // 1. Try LLM Router with strict Anti-Variant & Exclusion Instructions
  try {
    const exclusionText = recentTitles.length > 0
      ? `\n\nEXCLUSION LIST (DO NOT GENERATE OR CREATE VARIANTS OF THESE):\n${recentTitles.map(t => `- ${t}`).join('\n')}`
      : '';

    const prompt = `You are generating an original, interview-grade competitive programming problem for AXLY DSA Tracker.

CRITICAL UNIQUENESS INSTRUCTIONS:
- The generated problem MUST be materially and conceptually different from every problem in the exclusion list.
- Do NOT create variants of existing problems by changing numbers, variable names, constraints, examples, or adding a Variant ID.
- The underlying algorithmic task and data structures must be genuinely distinct.${exclusionText}

Topic: ${targetTopic}
Difficulty: ${normDifficulty}
Pattern: ${targetPattern || 'Appropriate for topic'}
Target Points: ${finalPoints}
Instructions: ${instructions || 'Ensure clean specifications, edge cases, progressive hints, and a verified reference solution.'}

Output ONLY valid JSON matching this schema:
{
  "title": "Clean Canonical Problem Title",
  "slug": "clean-canonical-problem-title",
  "difficulty": "${normDifficulty}",
  "topic": "${targetTopic}",
  "pattern": "${targetPattern || 'Pattern Name'}",
  "description": "Full problem description without variant markers.",
  "constraints": "1 <= N <= 10^5",
  "input_format": "Input format specification",
  "output_format": "Output format specification",
  "examples": [
    { "input": "...", "output": "...", "explanation": "..." }
  ],
  "starter_code": "function solution(param) {\\n  return 0;\\n}",
  "reference_solution": "function solution(param) {\\n  return 0;\\n}",
  "test_cases": [
    { "input": "sample_input_1", "expected_output": "sample_output_1", "is_hidden": 0 },
    { "input": "edge_case_input_2", "expected_output": "edge_case_output_2", "is_hidden": 1 }
  ],
  "hints": ["Hint 1", "Hint 2"],
  "editorial": "Approach explanation.",
  "complexity": "Time: O(N) | Space: O(1)",
  "points": ${finalPoints}
}`;

    const llmRes = await llmRouter.generate({
      prompt,
      systemPrompt: 'You are a Principal DSA Problem Author. Respond ONLY in valid raw JSON without markdown code fences.',
      temperature: 0.4,
      maxTokens: 1600
    });

    if (llmRes && llmRes.text && llmRes.source !== 'fallback') {
      let cleaned = llmRes.text.trim();
      if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
      if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
      if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
      cleaned = cleaned.trim();

      const parsed = JSON.parse(cleaned);
      parsed.title = stripVariantIdentifiers(parsed.title);
      parsed.slug = generateSlug(parsed.title);
      parsed.created_via = 'ai';
      parsed.status = 'draft';
      parsed.scheduled_date = scheduled_date || null;
      parsed.points = finalPoints;
      parsed.topic = targetTopic;
      parsed.pattern = targetPattern || parsed.pattern;
      parsed.problem_concept = extractProblemConcept(parsed.title, parsed.description);
      parsed.problem_signature = generateProblemSignature(parsed);
      if (recommendationReason) parsed.recommendation_reason = recommendationReason;

      const val = validateDailyChallenge(parsed);
      if (val.isValid) {
        const dupCheck = await checkDuplicateChallenge(parsed);
        if (!dupCheck.isDuplicate) {
          if (!skipSandbox && parsed.reference_solution) {
            const sbResult = await verifyReferenceSolution(parsed);
            parsed.sandbox_verified = sbResult.verified;
            if (sbResult.verified) {
              return { success: true, data: parsed, source: `llm-${llmRes.provider}` };
            }
          } else {
            return { success: true, data: parsed, source: `llm-${llmRes.provider}` };
          }
        }
      }
    }
  } catch (_) {
    // Fall through to rotation synthesizer
  }

  // 2. Curated Library Rotation (Filter out any templates that collide with existing problems)
  const availableTemplates = [];
  for (const tpl of PROBLEM_TEMPLATES) {
    const cleanTplTitle = stripVariantIdentifiers(tpl.title);
    const candidateData = {
      title: cleanTplTitle,
      description: tpl.description,
      topic_id: tpl.topic_id,
      topic: tpl.topic,
      pattern_id: tpl.pattern_id,
      pattern: tpl.pattern
    };
    const dupCheck = await checkDuplicateChallenge(candidateData);
    if (!dupCheck.isDuplicate) {
      availableTemplates.push(tpl);
    }
  }

  const matchingTemplates = availableTemplates.filter(
    t => (targetTopic ? t.topic.toLowerCase() === targetTopic.toLowerCase() : true)
      && (normDifficulty ? t.difficulty === normDifficulty : true)
  );

  const topicFallbackTemplates = availableTemplates.filter(
    t => targetTopic ? t.topic.toLowerCase() === targetTopic.toLowerCase() : true
  );

  const diffFallbackTemplates = availableTemplates.filter(
    t => normDifficulty ? t.difficulty === normDifficulty : true
  );

  const matched = matchingTemplates.length > 0
    ? matchingTemplates[Math.floor(Math.random() * matchingTemplates.length)]
    : (topicFallbackTemplates.length > 0
      ? topicFallbackTemplates[Math.floor(Math.random() * topicFallbackTemplates.length)]
      : (diffFallbackTemplates.length > 0
        ? diffFallbackTemplates[Math.floor(Math.random() * diffFallbackTemplates.length)]
        : (availableTemplates[0] || PROBLEM_TEMPLATES[0])));

  const cleanTitle = stripVariantIdentifiers(matched.title);
  const synthesizedSlug = generateSlug(cleanTitle);

  const synthesized = {
    title: cleanTitle,
    slug: synthesizedSlug,
    difficulty: matched.difficulty || normDifficulty,
    topic: matched.topic,
    pattern: matched.pattern,
    description: matched.description + (instructions ? `\n\n*Note*: Tailored for ${instructions}.` : ''),
    problem_statement: matched.description,
    constraints: matched.constraints,
    input_format: matched.input_format,
    output_format: matched.output_format,
    examples: matched.examples,
    example_input: matched.examples[0]?.input || '',
    example_output: matched.examples[0]?.output || '',
    starter_code: matched.starter_code,
    reference_solution: matched.reference_solution,
    driver_code: matched.driver_code,
    supported_languages: ['javascript', 'python', 'typescript', 'java', 'cpp'],
    test_cases: matched.test_cases,
    hints: matched.hints,
    editorial: matched.editorial,
    solution_approach: matched.editorial,
    complexity: matched.complexity,
    points: finalPoints,
    status: 'draft',
    created_via: 'ai',
    scheduled_date: scheduled_date || null
  };

  synthesized.problem_concept = extractProblemConcept(synthesized.title, synthesized.description);
  synthesized.problem_signature = generateProblemSignature(synthesized);

  if (recommendationReason) {
    synthesized.recommendation_reason = recommendationReason;
  }

  const validation = validateDailyChallenge(synthesized);
  if (!validation.isValid) {
    throw new AppError(`Validation failed for AI generation: ${validation.errors.join(', ')}`, 422, 'AI_VALIDATION_ERROR');
  }

  // Duplicate check before sandbox
  const dupCheck = await checkDuplicateChallenge(synthesized);
  if (dupCheck.isDuplicate) {
    throw new AppError(`Duplicate collision detected: ${dupCheck.reason}`, 409, 'DUPLICATE_COLLISION');
  }

  if (!skipSandbox) {
    const sbResult = await verifyReferenceSolution(synthesized);
    synthesized.sandbox_verified = sbResult.verified;
    if (!sbResult.verified) {
      throw new AppError(`Sandbox verification failed: ${sbResult.reason}`, 422, 'SANDBOX_VERIFICATION_FAILED');
    }
  }

  return {
    success: true,
    data: synthesized,
    source: 'synthesizer-ai'
  };
}

module.exports = {
  generateDailyChallenge,
  validateDailyChallenge,
  checkDuplicateChallenge,
  verifyReferenceSolution,
  generateProblemSignature,
  extractProblemConcept,
  stripVariantIdentifiers,
  computeSemanticSimilarity,
  TOPIC_NAMES,
  PROBLEM_TEMPLATES
};
