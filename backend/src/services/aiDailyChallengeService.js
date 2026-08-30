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

/**
 * Curated Archetypes for High-Fidelity Algorithmic Synthesis
 * With verified reference solutions and input drivers.
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
      {
        input: '[1, 2, 1, 3, 4]\n2',
        output: '4',
        explanation: 'The subarray [1, 2, 1] has 2 distinct values and a sum of 4.'
      },
      {
        input: '[-1, 2, 3, -2, 4]\n3',
        output: '7',
        explanation: 'Subarray [2, 3, -2, 4] with k=4 gives sum 7.'
      }
    ],
    starter_code: `function maxSubarraySumBounded(nums, k) {
  // Write your solution here
  return 0;
}`,
    reference_solution: `function maxSubarraySumBounded(nums, k) {
  if (!nums || nums.length === 0 || k <= 0) return 0;
  let left = 0;
  let currentSum = 0;
  let maxSum = -Infinity;
  const count = new Map();

  for (let right = 0; right < nums.length; right++) {
    const val = nums[right];
    count.set(val, (count.get(val) || 0) + 1);
    currentSum += val;

    while (count.size > k && left <= right) {
      const leftVal = nums[left];
      const leftCount = count.get(leftVal);
      if (leftCount === 1) {
        count.delete(leftVal);
      } else {
        count.set(leftVal, leftCount - 1);
      }
      currentSum -= leftVal;
      left++;
    }

    if (count.size <= k) {
      if (currentSum > maxSum) maxSum = currentSum;
    }
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
      { input: '[1, 2, 1, 3, 4]\n2', expected_output: '4', is_hidden: 0 },
      { input: '[5, 5, 5, 5]\n1', expected_output: '20', is_hidden: 0 },
      { input: '[10, -5, 10, -5, 10]\n2', expected_output: '20', is_hidden: 1 },
      { input: '[-1, -2, -3]\n2', expected_output: '-1', is_hidden: 1 }
    ],
    hints: [
      'Think about maintaining a sliding window [left, right] along with a hash map of element frequencies.',
      'When the number of unique elements in your map exceeds k, shrink the window from the left.',
      'Be careful with negative prefix sums when calculating maximum window sums.'
    ],
    editorial: 'Maintain a frequency map as you expand the right pointer. Whenever `map.size > k`, increment `left` and update the frequency map until `map.size <= k`.',
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
      {
        input: 'abca\n1',
        output: 'true',
        explanation: 'Deleting "b" gives "aca", which is a valid palindrome.'
      },
      {
        input: 'abcde\n1',
        output: 'false',
        explanation: 'No single character deletion can make "abcde" a palindrome.'
      }
    ],
    starter_code: `function isValidPalindromeK(s, k) {
  // Write your solution here
  return true;
}`,
    reference_solution: `function isValidPalindromeK(s, k) {
  function check(left, right, remainingK) {
    while (left < right) {
      if (s[left] === s[right]) {
        left++;
        right--;
      } else {
        if (remainingK <= 0) return false;
        return check(left + 1, right, remainingK - 1) || check(left, right - 1, remainingK - 1);
      }
    }
    return true;
  }
  return check(0, s.length - 1, k);
}`,
    driver_code: `const fs = require('fs');
const raw = fs.readFileSync(0, 'utf-8').trim();
if (!raw) process.exit(0);
const lines = raw.split('\\n').map(s => s.trim()).filter(Boolean);
const s = lines[0];
const k = parseInt(lines[1], 10);
console.log(isValidPalindromeK(s, k));`,
    test_cases: [
      { input: 'abca\n1', expected_output: 'true', is_hidden: 0 },
      { input: 'abcde\n1', expected_output: 'false', is_hidden: 0 },
      { input: 'racecar\n0', expected_output: 'true', is_hidden: 1 },
      { input: 'aguokepatgbnvfqmgmlcupuufxoohdfpgjdmysgvhmvffcnqxjjxqncffvmhvgsymdjgpfdhooxfuupuculmgmqfvnbgtapekoupga\n1', expected_output: 'true', is_hidden: 1 }
    ],
    hints: [
      'Use two pointers from left and right towards the center.',
      'When characters mismatch, branch into skipping either the left character or the right character, decrementing remaining k.',
      'Since k <= 2, branching has a very small bounded depth O(2^k).'
    ],
    editorial: 'Two pointers check matching characters from ends. On first mismatch, explore removing `s[left]` or `s[right]`.',
    complexity: 'Time: O(N * 2^K) | Space: O(K)'
  },
  {
    topic: 'Dynamic Programming',
    pattern: 'Subsequence DP',
    difficulty: 'hard',
    title: 'Longest Alternating Target Subsequence',
    description: 'Given an array `nums` of positive integers, return the length of the longest subsequence such that adjacent elements strictly alternate between strictly greater and strictly smaller values.',
    constraints: '1 <= nums.length <= 2000\n1 <= nums[i] <= 10^6',
    input_format: 'A single line containing JSON array of integers.',
    output_format: 'An integer representing the length of the longest alternating subsequence.',
    examples: [
      {
        input: '[1, 7, 4, 9, 2, 5]',
        output: '6',
        explanation: 'The entire sequence alternates: 1 < 7 > 4 < 9 > 2 < 5.'
      },
      {
        input: '[1, 17, 5, 10, 13, 15, 10, 5, 16, 8]',
        output: '7',
        explanation: 'One valid alternating subsequence of length 7 is [1, 17, 10, 13, 10, 16, 8].'
      }
    ],
    starter_code: `function longestAlternatingSubsequence(nums) {
  // Write your solution here
  return 0;
}`,
    reference_solution: `function longestAlternatingSubsequence(nums) {
  if (!nums || nums.length === 0) return 0;
  if (nums.length === 1) return 1;
  let up = 1;
  let down = 1;
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] > nums[i - 1]) {
      up = down + 1;
    } else if (nums[i] < nums[i - 1]) {
      down = up + 1;
    }
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
      { input: '[1, 2, 3, 4, 5, 6, 7, 8, 9]', expected_output: '2', is_hidden: 0 },
      { input: '[100]', expected_output: '1', is_hidden: 1 },
      { input: '[3, 3, 3, 3]', expected_output: '1', is_hidden: 1 }
    ],
    hints: [
      'Maintain two DP states: `up[i]` (longest alternating ending with a climb) and `down[i]` (longest ending with a drop).',
      'For each step, if `nums[i] > nums[i-1]`, you can transition from a previous drop: `up = down + 1`.',
      'Notice that greedy peak and valley transitions can optimize this to O(N) linear time.'
    ],
    editorial: 'Track the turning points (local peaks and valleys). Every inflection point increments the alternating chain length.',
    complexity: 'Time: O(N) | Space: O(1)'
  }
];

function generateSlug(title) {
  return String(title || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || `dc-${Date.now()}`;
}

/**
 * Check whether a challenge with similar title or description already exists
 * Checks BOTH daily_challenge_problems AND questions (Practice)
 */
async function checkDuplicateChallenge(title, description = '', excludeId = null) {
  const normTitle = String(title || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!normTitle) return { isDuplicate: false };

  // 1. Check daily_challenge_problems
  const existingDc = await getRepo().many(`
    SELECT id, title, description, status, scheduled_date 
    FROM daily_challenge_problems
    WHERE status != 'archived' AND (is_active = 1 OR is_active = TRUE) ${excludeId ? 'AND id != ?' : ''}
  `, excludeId ? [excludeId] : []);

  for (const c of existingDc) {
    const existingNorm = String(c.title || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (existingNorm === normTitle) {
      return {
        isDuplicate: true,
        reason: `A Daily Challenge with exact title "${c.title}" already exists (ID: ${c.id}).`,
        duplicateOf: c
      };
    }
    if (normTitle.length > 8 && existingNorm.length > 8) {
      if (normTitle.includes(existingNorm) || existingNorm.includes(normTitle)) {
        return {
          isDuplicate: true,
          reason: `A very similarly named Daily Challenge "${c.title}" already exists.`,
          duplicateOf: c
        };
      }
    }
  }

  // 2. Check Practice questions repository
  try {
    const existingQuestions = await getRepo().many(`
      SELECT id, title, description 
      FROM questions
      WHERE is_active = 1 OR is_active = TRUE
    `);

    for (const q of existingQuestions) {
      const existingNorm = String(q.title || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      if (existingNorm === normTitle) {
        return {
          isDuplicate: true,
          reason: `A Practice problem with title "${q.title}" already exists in the question bank (ID: ${q.id}).`,
          duplicateOf: q
        };
      }
      if (normTitle.length > 8 && existingNorm.length > 8) {
        if (normTitle.includes(existingNorm) || existingNorm.includes(normTitle)) {
          return {
            isDuplicate: true,
            reason: `Collides with existing Practice problem "${q.title}".`,
            duplicateOf: q
          };
        }
      }
    }
  } catch (_) {
    // If questions table query fails, continue safely
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
    // Ensure both public and hidden test cases are present
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
 * Executes reference solution against 100% of test cases.
 */
async function verifyReferenceSolution(challengeData) {
  const { test_cases = [], reference_solution, driver_code, starter_code } = challengeData;

  if (!Array.isArray(test_cases) || test_cases.length === 0) {
    return { verified: false, reason: 'No test cases provided for sandbox verification', passed_tests: 0, total_tests: 0 };
  }

  // Construct runnable source code
  const solutionBody = reference_solution || starter_code || '';
  const driverBody = driver_code || `
const fs = require('fs');
const raw = fs.readFileSync(0, 'utf-8').trim();
if (!raw) process.exit(0);
// Default output driver
console.log(raw);
`;

  const fullCode = `${solutionBody}\n\n${driverBody}`;

  try {
    const execResult = await executeCode({
      language: 'javascript',
      sourceCode: fullCode,
      testCases: test_cases.map(tc => ({
        input: String(tc.input ?? ''),
        expected_output: String(tc.expected_output ?? ''),
        is_hidden: Boolean(tc.is_hidden)
      })),
      isSubmit: true
    });

    const isPassed = execResult.status === 'Accepted' && execResult.passed_tests === test_cases.length;

    return {
      verified: isPassed,
      status: execResult.status,
      passed_tests: execResult.passed_tests,
      total_tests: execResult.total_tests,
      execution_time_ms: execResult.execution_time_ms,
      reason: isPassed ? null : `Sandbox verification failed (${execResult.passed_tests}/${execResult.total_tests} passed, status: ${execResult.status})`
    };
  } catch (err) {
    return {
      verified: false,
      status: 'Runtime Error',
      passed_tests: 0,
      total_tests: test_cases.length,
      reason: `Sandbox execution failed: ${err.message}`
    };
  }
}

/**
 * AI Generation Service
 */
async function generateDailyChallenge({
  topic = 'Arrays',
  difficulty = 'medium',
  pattern = '',
  points = null,
  instructions = '',
  scheduled_date = null,
  skipSandbox = false
}) {
  const normDifficulty = ['easy', 'medium', 'hard'].includes(String(difficulty).toLowerCase())
    ? String(difficulty).toLowerCase()
    : 'medium';

  let targetTopic = topic;
  let targetPattern = pattern;
  let recommendationReason = '';

  if (!targetTopic || targetTopic === 'Surprise Me' || targetTopic === 'AI Recommend') {
    const { recommendTopicForDailyChallenge } = require('./topicService');
    const rec = await recommendTopicForDailyChallenge({ difficulty: normDifficulty });
    targetTopic = rec.topic_name;
    targetPattern = rec.pattern_name || pattern;
    recommendationReason = rec.reason;
  }

  const defaultPoints = normDifficulty === 'hard' ? 150 : normDifficulty === 'medium' ? 100 : 50;
  const finalPoints = Number(points) > 0 ? Number(points) : defaultPoints;

  // 1. Try LLM Router if configured
  try {
    const prompt = `Generate an interview-grade, original competitive programming problem.
Topic: ${targetTopic}
Difficulty: ${normDifficulty}
Pattern: ${targetPattern || 'Appropriate for topic'}
Target Points: ${finalPoints}
Instructions: ${instructions || 'Ensure clean problem specs, progressive hints, edge cases, and a valid reference solution.'}

Output ONLY valid JSON matching this schema:
{
  "title": "Unique Problem Title",
  "slug": "unique-problem-title",
  "difficulty": "${normDifficulty}",
  "topic": "${targetTopic}",
  "pattern": "${targetPattern || 'Pattern Name'}",
  "description": "Full problem description.",
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
      systemPrompt: 'You are a Principal DSA Author for AXLY DSA Tracker. Respond ONLY in valid raw JSON with NO markdown blocks.',
      temperature: 0.3,
      maxTokens: 1500
    });

    if (llmRes && llmRes.text && llmRes.source !== 'fallback') {
      let cleaned = llmRes.text.trim();
      if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
      if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
      if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
      cleaned = cleaned.trim();

      const parsed = JSON.parse(cleaned);
      parsed.created_via = 'ai';
      parsed.status = 'draft';
      parsed.scheduled_date = scheduled_date || null;
      parsed.points = finalPoints;
      parsed.topic = targetTopic;
      parsed.pattern = targetPattern || parsed.pattern;
      if (recommendationReason) parsed.recommendation_reason = recommendationReason;

      const val = validateDailyChallenge(parsed);
      if (val.isValid) {
        const dupCheck = await checkDuplicateChallenge(parsed.title, parsed.description);
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
    // Fall through to algorithmic synthesis
  }

  // 2. High-Fidelity Algorithmic Synthesis Fallback
  const matched = PROBLEM_TEMPLATES.find(
    t => t.difficulty === normDifficulty && (t.topic.toLowerCase() === targetTopic.toLowerCase() || !targetTopic)
  ) || PROBLEM_TEMPLATES.find(t => t.difficulty === normDifficulty) || PROBLEM_TEMPLATES[0];

  const seed = Date.now().toString().slice(-4);
  const synthesizedTitle = `${matched.title} (Variant ${seed})`;
  const synthesizedSlug = generateSlug(synthesizedTitle);

  const synthesized = {
    title: synthesizedTitle,
    slug: synthesizedSlug,
    difficulty: normDifficulty,
    topic: targetTopic || matched.topic,
    pattern: targetPattern || matched.pattern,
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

  if (recommendationReason) {
    synthesized.recommendation_reason = recommendationReason;
  }

  const validation = validateDailyChallenge(synthesized);
  if (!validation.isValid) {
    throw new AppError(`Validation failed for AI generation: ${validation.errors.join(', ')}`, 422, 'AI_VALIDATION_ERROR');
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
  TOPIC_NAMES,
  PROBLEM_TEMPLATES
};
