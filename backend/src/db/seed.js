const { db } = require('./db');
const { v4: uuidv4 } = require('uuid');

function seedDatabase() {
  // Topics
  const topics = [
    { id: 'top-arrays', name: 'Arrays & Hashing' },
    { id: 'top-two-pointers', name: 'Two Pointers' },
    { id: 'top-sliding-window', name: 'Sliding Window' },
    { id: 'top-stack', name: 'Stack' },
    { id: 'top-binary-search', name: 'Binary Search' },
    { id: 'top-linked-list', name: 'Linked List' },
    { id: 'top-trees', name: 'Trees' },
    { id: 'top-dp', name: 'Dynamic Programming' },
    { id: 'top-graphs', name: 'Graphs' }
  ];

  const insertTopic = db.prepare('INSERT OR IGNORE INTO topics (id, name) VALUES (?, ?)');
  topics.forEach(t => insertTopic.run(t.id, t.name));

  // Users
  const users = [
    { id: 'usr-admin-01', name: 'Axly Admin', email: 'admin@axly.in', role: 'admin' },
    { id: 'usr-user-01', name: 'Alex Mercer', email: 'alex@example.com', role: 'user' },
    { id: 'usr-user-02', name: 'Priya Sharma', email: 'priya@example.com', role: 'user' },
    { id: 'usr-user-03', name: 'David Kim', email: 'david@example.com', role: 'user' }
  ];

  const insertUser = db.prepare('INSERT OR IGNORE INTO users (id, name, email, role) VALUES (?, ?, ?, ?)');
  users.forEach(u => insertUser.run(u.id, u.name, u.email, u.role));

  // Questions with In-Platform Problem Definitions & Starter Code
  const questions = [
    {
      id: 'q-two-sum',
      title: 'Two Sum',
      difficulty: 'easy',
      topic_id: 'top-arrays',
      url: 'https://leetcode.com/problems/two-sum/',
      description: `Given an array of integers \`nums\` and an integer \`target\`, return *indices of the two numbers such that they add up to \`target\`*.\n\nYou may assume that each input would have ***exactly one solution***, and you may not use the same element twice.\n\nYou can return the answer in any order.`,
      constraints: `2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9\nOnly one valid answer exists.`,
      input_format: `First line contains target integer.\nSecond line contains space-separated integers for nums.`,
      output_format: `Print the two 0-based indices separated by a space.`,
      example_input: `9\n2 7 11 15`,
      example_output: `0 1`,
      starter_code: JSON.stringify({
        javascript: `const fs = require('fs');

function twoSum(target, nums) {
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

const input = fs.readFileSync(0, 'utf-8').trim().split('\\n');
if (input.length >= 2) {
  const target = parseInt(input[0].trim(), 10);
  const nums = input[1].trim().split(/\\s+/).map(Number);
  const result = twoSum(target, nums);
  console.log(result.join(' '));
}`,
        python: `import sys

def two_sum(target, nums):
    seen = {}
    for i, num in enumerate(nums):
        diff = target - num
        if diff in seen:
            return [seen[diff], i]
        seen[num] = i
    return []

lines = sys.stdin.read().strip().splitlines()
if len(lines) >= 2:
    target = int(lines[0].strip())
    nums = list(map(int, lines[1].strip().split()))
    res = two_sum(target, nums)
    print(" ".join(map(str, res)))`
      }),
      is_active: 1,
      test_cases: [
        { input: `9\n2 7 11 15`, expected_output: `0 1`, is_hidden: 0 },
        { input: `6\n3 2 4`, expected_output: `1 2`, is_hidden: 0 },
        { input: `6\n3 3`, expected_output: `0 1`, is_hidden: 0 },
        { input: `10\n1 5 3 7 9`, expected_output: `0 4`, is_hidden: 1 },
        { input: `-8\n-3 -5 2 4`, expected_output: `0 1`, is_hidden: 1 }
      ]
    },
    {
      id: 'q-valid-anagram',
      title: 'Valid Anagram',
      difficulty: 'easy',
      topic_id: 'top-arrays',
      url: 'https://leetcode.com/problems/valid-anagram/',
      description: `Given two strings \`s\` and \`t\`, return \`true\` if \`t\` is an anagram of \`s\`, and \`false\` otherwise.\n\nAn **Anagram** is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.`,
      constraints: `1 <= s.length, t.length <= 5 * 10^4\ns and t consist of lowercase English letters.`,
      input_format: `First line contains string s.\nSecond line contains string t.`,
      output_format: `Print true or false.`,
      example_input: `anagram\nnagaram`,
      example_output: `true`,
      starter_code: JSON.stringify({
        javascript: `const fs = require('fs');

function isAnagram(s, t) {
  if (s.length !== t.length) return false;
  const count = {};
  for (const c of s) count[c] = (count[c] || 0) + 1;
  for (const c of t) {
    if (!count[c]) return false;
    count[c]--;
  }
  return true;
}

const lines = fs.readFileSync(0, 'utf-8').trim().split('\\n');
if (lines.length >= 2) {
  const s = lines[0].trim();
  const t = lines[1].trim();
  console.log(isAnagram(s, t) ? 'true' : 'false');
}`,
        python: `import sys

def is_anagram(s, t):
    if len(s) != len(t):
        return False
    return sorted(s) == sorted(t)

lines = sys.stdin.read().strip().splitlines()
if len(lines) >= 2:
    s = lines[0].strip()
    t = lines[1].strip()
    print("true" if is_anagram(s, t) else "false")`
      }),
      is_active: 1,
      test_cases: [
        { input: `anagram\nnagaram`, expected_output: `true`, is_hidden: 0 },
        { input: `rat\ncar`, expected_output: `false`, is_hidden: 0 },
        { input: `listen\nsilent`, expected_output: `true`, is_hidden: 1 },
        { input: `a\nab`, expected_output: `false`, is_hidden: 1 }
      ]
    },
    {
      id: 'q-valid-parentheses',
      title: 'Valid Parentheses',
      difficulty: 'easy',
      topic_id: 'top-stack',
      url: 'https://leetcode.com/problems/valid-parentheses/',
      description: `Given a string \`s\` containing just the characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.`,
      constraints: `1 <= s.length <= 10^4\ns consists of parentheses only '()[]{}'.`,
      input_format: `Single line containing string s.`,
      output_format: `Print true or false.`,
      example_input: `()[]{}`,
      example_output: `true`,
      starter_code: JSON.stringify({
        javascript: `const fs = require('fs');

function isValid(s) {
  const stack = [];
  const map = { ')': '(', '}': '{', ']': '[' };
  for (const ch of s) {
    if (ch === '(' || ch === '{' || ch === '[') {
      stack.push(ch);
    } else {
      if (stack.pop() !== map[ch]) return false;
    }
  }
  return stack.length === 0;
}

const input = fs.readFileSync(0, 'utf-8').trim();
console.log(isValid(input) ? 'true' : 'false');`,
        python: `import sys

def is_valid(s):
    stack = []
    mapping = {')': '(', '}': '{', ']': '['}
    for ch in s:
        if ch in mapping.values():
            stack.append(ch)
        elif ch in mapping:
            if not stack or stack.pop() != mapping[ch]:
                return False
    return len(stack) == 0

s = sys.stdin.read().strip()
print("true" if is_valid(s) else "false")`
      }),
      is_active: 1,
      test_cases: [
        { input: `()[]{}`, expected_output: `true`, is_hidden: 0 },
        { input: `(]`, expected_output: `false`, is_hidden: 0 },
        { input: `([)]`, expected_output: `false`, is_hidden: 1 },
        { input: `{[]}`, expected_output: `true`, is_hidden: 1 }
      ]
    },
    {
      id: 'q-binary-search',
      title: 'Binary Search',
      difficulty: 'easy',
      topic_id: 'top-binary-search',
      url: 'https://leetcode.com/problems/binary-search/',
      description: `Given an array of integers \`nums\` which is sorted in ascending order, and an integer \`target\`, write a function to search \`target\` in \`nums\`. If \`target\` exists, then return its index. Otherwise, return \`-1\`.\n\nYou must write an algorithm with \`O(log n)\` runtime complexity.`,
      constraints: `1 <= nums.length <= 10^4\n-10^4 < nums[i], target < 10^4\nAll the integers in nums are unique.\nnums is sorted in ascending order.`,
      input_format: `First line contains target integer.\nSecond line contains space-separated sorted integers.`,
      output_format: `Print index of target or -1 if not found.`,
      example_input: `9\n-1 0 3 5 9 12`,
      example_output: `4`,
      starter_code: JSON.stringify({
        javascript: `const fs = require('fs');

function search(nums, target) {
  let left = 0, right = nums.length - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (nums[mid] === target) return mid;
    if (nums[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return -1;
}

const lines = fs.readFileSync(0, 'utf-8').trim().split('\\n');
if (lines.length >= 2) {
  const target = parseInt(lines[0].trim(), 10);
  const nums = lines[1].trim().split(/\\s+/).map(Number);
  console.log(search(nums, target));
}`,
        python: `import sys

def binary_search(nums, target):
    l, r = 0, len(nums) - 1
    while l <= r:
        mid = (l + r) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            l = mid + 1
        else:
            r = mid - 1
    return -1

lines = sys.stdin.read().strip().splitlines()
if len(lines) >= 2:
    target = int(lines[0].strip())
    nums = list(map(int, lines[1].strip().split()))
    print(binary_search(nums, target))`
      }),
      is_active: 1,
      test_cases: [
        { input: `9\n-1 0 3 5 9 12`, expected_output: `4`, is_hidden: 0 },
        { input: `2\n-1 0 3 5 9 12`, expected_output: `-1`, is_hidden: 0 },
        { input: `5\n5`, expected_output: `0`, is_hidden: 1 },
        { input: `-5\n-10 -5 0 5 10`, expected_output: `1`, is_hidden: 1 }
      ]
    },
    {
      id: 'q-group-anagrams',
      title: 'Group Anagrams',
      difficulty: 'medium',
      topic_id: 'top-arrays',
      url: 'https://leetcode.com/problems/group-anagrams/',
      description: `Given an array of strings \`strs\`, group the anagrams together. You can return the answer in any order.`,
      constraints: `1 <= strs.length <= 10^4\n0 <= strs[i].length <= 100\nstrs[i] consists of lowercase English letters.`,
      input_format: `Single line with space-separated strings.`,
      output_format: `Number of unique anagram groups.`,
      example_input: `eat tea tan ate nat bat`,
      example_output: `3`,
      starter_code: JSON.stringify({
        javascript: `const fs = require('fs');

function groupAnagramsCount(strs) {
  const map = new Map();
  for (const s of strs) {
    const key = s.split('').sort().join('');
    map.set(key, (map.get(key) || 0) + 1);
  }
  return map.size;
}

const input = fs.readFileSync(0, 'utf-8').trim();
const strs = input ? input.split(/\\s+/) : [];
console.log(groupAnagramsCount(strs));`,
        python: `import sys

def group_anagrams_count(strs):
    groups = {}
    for s in strs:
        key = "".join(sorted(s))
        groups[key] = groups.get(key, 0) + 1
    return len(groups)

raw = sys.stdin.read().strip()
strs = raw.split() if raw else []
print(group_anagrams_count(strs))`
      }),
      is_active: 1,
      test_cases: [
        { input: `eat tea tan ate nat bat`, expected_output: `3`, is_hidden: 0 },
        { input: `a`, expected_output: `1`, is_hidden: 0 },
        { input: `hello world olleh dlrow test`, expected_output: `3`, is_hidden: 1 }
      ]
    },
    {
      id: 'q-top-k-frequent',
      title: 'Top K Frequent Elements',
      difficulty: 'medium',
      topic_id: 'top-arrays',
      url: 'https://leetcode.com/problems/top-k-frequent-elements/',
      description: `Given an integer array \`nums\` and an integer \`k\`, return the \`k\` most frequent elements. You may return the answer in any order.`,
      constraints: `1 <= nums.length <= 10^5\n-10^4 <= nums[i] <= 10^4\nk is in the range [1, the number of unique elements in the array].`,
      input_format: `First line: integer k.\nSecond line: space-separated integers.`,
      output_format: `Space-separated top k frequent numbers sorted ascending.`,
      example_input: `2\n1 1 1 2 2 3`,
      example_output: `1 2`,
      starter_code: JSON.stringify({
        javascript: `const fs = require('fs');

function topKFrequent(k, nums) {
  const count = {};
  for (const n of nums) count[n] = (count[n] || 0) + 1;
  const sorted = Object.keys(count).sort((a, b) => count[b] - count[a] || a - b);
  return sorted.slice(0, k).map(Number).sort((a, b) => a - b);
}

const lines = fs.readFileSync(0, 'utf-8').trim().split('\\n');
if (lines.length >= 2) {
  const k = parseInt(lines[0].trim(), 10);
  const nums = lines[1].trim().split(/\\s+/).map(Number);
  console.log(topKFrequent(k, nums).join(' '));
}`,
        python: `import sys
from collections import Counter

def top_k_frequent(k, nums):
    counts = Counter(nums)
    most_common = [num for num, _ in counts.most_common(k)]
    return sorted(most_common)

lines = sys.stdin.read().strip().splitlines()
if len(lines) >= 2:
    k = int(lines[0].strip())
    nums = list(map(int, lines[1].strip().split()))
    print(" ".join(map(str, top_k_frequent(k, nums))))`
      }),
      is_active: 1,
      test_cases: [
        { input: `2\n1 1 1 2 2 3`, expected_output: `1 2`, is_hidden: 0 },
        { input: `1\n1`, expected_output: `1`, is_hidden: 0 },
        { input: `3\n4 1 -1 2 -1 2 3`, expected_output: `-1 2 4`, is_hidden: 1 }
      ]
    },
    {
      id: 'q-trapping-rain-water',
      title: 'Trapping Rain Water',
      difficulty: 'hard',
      topic_id: 'top-two-pointers',
      url: 'https://leetcode.com/problems/trapping-rain-water/',
      description: `Given \`n\` non-negative integers representing an elevation map where the width of each bar is \`1\`, compute how much water it can trap after raining.`,
      constraints: `n == height.length\n1 <= n <= 2 * 10^4\n0 <= height[i] <= 10^5`,
      input_format: `Space-separated integers representing bar heights.`,
      output_format: `Total units of trapped rain water.`,
      example_input: `0 1 0 2 1 0 1 3 2 1 2 1`,
      example_output: `6`,
      starter_code: JSON.stringify({
        javascript: `const fs = require('fs');

function trap(height) {
  let left = 0, right = height.length - 1;
  let leftMax = 0, rightMax = 0, water = 0;
  while (left < right) {
    if (height[left] < height[right]) {
      if (height[left] >= leftMax) leftMax = height[left];
      else water += leftMax - height[left];
      left++;
    } else {
      if (height[right] >= rightMax) rightMax = height[right];
      else water += rightMax - height[right];
      right--;
    }
  }
  return water;
}

const input = fs.readFileSync(0, 'utf-8').trim();
const height = input ? input.split(/\\s+/).map(Number) : [];
console.log(trap(height));`,
        python: `import sys

def trap(height):
    l, r = 0, len(height) - 1
    l_max = r_max = water = 0
    while l < r:
        if height[l] < height[r]:
            if height[l] >= l_max:
                l_max = height[l]
            else:
                water += l_max - height[l]
            l += 1
        else:
            if height[r] >= r_max:
                r_max = height[r]
            else:
                water += r_max - height[r]
            r -= 1
    return water

raw = sys.stdin.read().strip()
height = list(map(int, raw.split())) if raw else []
print(trap(height))`
      }),
      is_active: 1,
      test_cases: [
        { input: `0 1 0 2 1 0 1 3 2 1 2 1`, expected_output: `6`, is_hidden: 0 },
        { input: `4 2 0 3 2 5`, expected_output: `9`, is_hidden: 0 },
        { input: `1 2 3 4 5`, expected_output: `0`, is_hidden: 1 }
      ]
    },
    {
      id: 'q-3sum',
      title: '3Sum',
      difficulty: 'medium',
      topic_id: 'top-two-pointers',
      url: 'https://leetcode.com/problems/3sum/',
      description: `Given an integer array nums, return the number of unique triplets \`[nums[i], nums[j], nums[k]]\` such that \`i != j\`, \`i != k\`, and \`j != k\`, and \`nums[i] + nums[j] + nums[k] == 0\`.`,
      constraints: `3 <= nums.length <= 3000\n-10^5 <= nums[i] <= 10^5`,
      input_format: `Space-separated integers.`,
      output_format: `Total count of unique zero-sum triplets.`,
      example_input: `-1 0 1 2 -1 -4`,
      example_output: `2`,
      starter_code: JSON.stringify({
        javascript: `const fs = require('fs');

function threeSumCount(nums) {
  nums.sort((a, b) => a - b);
  let count = 0;
  for (let i = 0; i < nums.length - 2; i++) {
    if (i > 0 && nums[i] === nums[i - 1]) continue;
    let left = i + 1, right = nums.length - 1;
    while (left < right) {
      const sum = nums[i] + nums[left] + nums[right];
      if (sum === 0) {
        count++;
        while (left < right && nums[left] === nums[left + 1]) left++;
        while (left < right && nums[right] === nums[right - 1]) right--;
        left++;
        right--;
      } else if (sum < 0) {
        left++;
      } else {
        right--;
      }
    }
  }
  return count;
}

const input = fs.readFileSync(0, 'utf-8').trim();
const nums = input ? input.split(/\\s+/).map(Number) : [];
console.log(threeSumCount(nums));`,
        python: `import sys

def three_sum_count(nums):
    nums.sort()
    count = 0
    for i in range(len(nums) - 2):
        if i > 0 and nums[i] == nums[i - 1]:
            continue
        l, r = i + 1, len(nums) - 1
        while l < r:
            s = nums[i] + nums[l] + nums[r]
            if s == 0:
                count += 1
                while l < r and nums[l] == nums[l + 1]:
                    l += 1
                while l < r and nums[r] == nums[r - 1]:
                    r -= 1
                l += 1
                r -= 1
            elif s < 0:
                l += 1
            else:
                r -= 1
    return count

raw = sys.stdin.read().strip()
nums = list(map(int, raw.split())) if raw else []
print(three_sum_count(nums))`
      }),
      is_active: 1,
      test_cases: [
        { input: `-1 0 1 2 -1 -4`, expected_output: `2`, is_hidden: 0 },
        { input: `0 1 1`, expected_output: `0`, is_hidden: 0 },
        { input: `0 0 0`, expected_output: `1`, is_hidden: 1 }
      ]
    },
    {
      id: 'q-longest-substring',
      title: 'Longest Substring Without Repeating Characters',
      difficulty: 'medium',
      topic_id: 'top-sliding-window',
      url: 'https://leetcode.com/problems/longest-substring-without-repeating-characters/',
      description: `Given a string \`s\`, find the length of the **longest substring** without repeating characters.`,
      constraints: `0 <= s.length <= 5 * 10^4\ns consists of English letters, digits, symbols and spaces.`,
      input_format: `Single line with string s.`,
      output_format: `Length of the longest non-repeating substring.`,
      example_input: `abcabcbb`,
      example_output: `3`,
      starter_code: JSON.stringify({
        javascript: `const fs = require('fs');

function lengthOfLongestSubstring(s) {
  const set = new Set();
  let left = 0, maxLen = 0;
  for (let right = 0; right < s.length; right++) {
    while (set.has(s[right])) {
      set.delete(s[left]);
      left++;
    }
    set.add(s[right]);
    maxLen = Math.max(maxLen, right - left + 1);
  }
  return maxLen;
}

const input = fs.readFileSync(0, 'utf-8').replace(/\\r?\\n$/, '');
console.log(lengthOfLongestSubstring(input));`,
        python: `import sys

def length_of_longest_substring(s):
    seen = set()
    left = max_len = 0
    for right in range(len(s)):
        while s[right] in seen:
            seen.remove(s[left])
            left += 1
        seen.add(s[right])
        max_len = max(max_len, right - left + 1)
    return max_len

s = sys.stdin.read().rstrip('\\r\\n')
print(length_of_longest_substring(s))`
      }),
      is_active: 1,
      test_cases: [
        { input: `abcabcbb`, expected_output: `3`, is_hidden: 0 },
        { input: `bbbbb`, expected_output: `1`, is_hidden: 0 },
        { input: `pwwkew`, expected_output: `3`, is_hidden: 1 },
        { input: ``, expected_output: `0`, is_hidden: 1 }
      ]
    },
    {
      id: 'q-median-two-sorted-arrays',
      title: 'Median of Two Sorted Arrays',
      difficulty: 'hard',
      topic_id: 'top-binary-search',
      url: 'https://leetcode.com/problems/median-of-two-sorted-arrays/',
      description: `Given two sorted arrays \`nums1\` and \`nums2\` of size \`m\` and \`n\` respectively, return the **median** of the two sorted arrays.\n\nThe overall run time complexity should be \`O(log (m+n))\`.`,
      constraints: `nums1.length == m\nnums2.length == n\n0 <= m <= 1000\n0 <= n <= 1000\n1 <= m + n <= 2000\n-10^6 <= nums1[i], nums2[i] <= 10^6`,
      input_format: `First line contains space-separated integers for nums1.\nSecond line contains space-separated integers for nums2.`,
      output_format: `Median formatted as a float with 1 decimal place (e.g. 2.0).`,
      example_input: `1 3\n2`,
      example_output: `2.0`,
      starter_code: JSON.stringify({
        javascript: `const fs = require('fs');

function findMedianSortedArrays(nums1, nums2) {
  const merged = [...nums1, ...nums2].sort((a, b) => a - b);
  const mid = Math.floor(merged.length / 2);
  if (merged.length % 2 === 0) {
    return ((merged[mid - 1] + merged[mid]) / 2).toFixed(1);
  }
  return (merged[mid] * 1.0).toFixed(1);
}

const lines = fs.readFileSync(0, 'utf-8').trim().split('\\n');
const nums1 = lines[0] ? lines[0].trim().split(/\\s+/).map(Number) : [];
const nums2 = lines[1] ? lines[1].trim().split(/\\s+/).map(Number) : [];
console.log(findMedianSortedArrays(nums1, nums2));`,
        python: `import sys

def find_median(nums1, nums2):
    merged = sorted(nums1 + nums2)
    mid = len(merged) // 2
    if len(merged) % 2 == 0:
        return f"{(merged[mid-1] + merged[mid]) / 2.0:.1f}"
    return f"{float(merged[mid]):.1f}"

lines = sys.stdin.read().strip().splitlines()
nums1 = list(map(int, lines[0].split())) if len(lines) > 0 and lines[0].strip() else []
nums2 = list(map(int, lines[1].split())) if len(lines) > 1 and lines[1].strip() else []
print(find_median(nums1, nums2))`
      }),
      is_active: 1,
      test_cases: [
        { input: `1 3\n2`, expected_output: `2.0`, is_hidden: 0 },
        { input: `1 2\n3 4`, expected_output: `2.5`, is_hidden: 0 },
        { input: `0 0\n0 0`, expected_output: `0.0`, is_hidden: 1 }
      ]
    }
  ];

  const insertQuestion = db.prepare(`
    INSERT INTO questions (id, title, difficulty, topic_id, url, description, constraints, input_format, output_format, example_input, example_output, starter_code, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      difficulty = excluded.difficulty,
      topic_id = excluded.topic_id,
      url = excluded.url,
      description = excluded.description,
      constraints = excluded.constraints,
      input_format = excluded.input_format,
      output_format = excluded.output_format,
      example_input = excluded.example_input,
      example_output = excluded.example_output,
      starter_code = excluded.starter_code,
      is_active = excluded.is_active
  `);

  const insertTestCase = db.prepare(`
    INSERT INTO test_cases (id, question_id, input, expected_output, is_hidden)
    VALUES (?, ?, ?, ?, ?)
  `);

  questions.forEach(q => {
    insertQuestion.run(
      q.id,
      q.title,
      q.difficulty,
      q.topic_id,
      q.url,
      q.description || null,
      q.constraints || null,
      q.input_format || null,
      q.output_format || null,
      q.example_input || null,
      q.example_output || null,
      q.starter_code || null,
      q.is_active
    );

    // Seed test cases for question if provided
    if (q.test_cases && q.test_cases.length > 0) {
      db.prepare('DELETE FROM test_cases WHERE question_id = ?').run(q.id);
      q.test_cases.forEach((tc, idx) => {
        insertTestCase.run(`tc-${q.id}-${idx + 1}`, q.id, tc.input, tc.expected_output, tc.is_hidden ? 1 : 0);
      });
    }
  });

  // Assignments for alex@example.com (usr-user-01)
  const assignments = [
    { id: 'asgn-01', user_id: 'usr-user-01', question_id: 'q-two-sum', assigned_by: 'usr-admin-01', status: 'assigned' },
    { id: 'asgn-02', user_id: 'usr-user-01', question_id: 'q-valid-anagram', assigned_by: 'usr-admin-01', status: 'assigned' },
    { id: 'asgn-03', user_id: 'usr-user-01', question_id: 'q-group-anagrams', assigned_by: 'usr-admin-01', status: 'assigned' },
    { id: 'asgn-04', user_id: 'usr-user-01', question_id: 'q-top-k-frequent', assigned_by: 'usr-admin-01', status: 'assigned' },
    { id: 'asgn-05', user_id: 'usr-user-01', question_id: 'q-trapping-rain-water', assigned_by: 'usr-admin-01', status: 'assigned' }
  ];

  const insertAssignment = db.prepare(`
    INSERT OR IGNORE INTO assignments (id, user_id, question_id, assigned_by, status)
    VALUES (?, ?, ?, ?, ?)
  `);
  assignments.forEach(a => insertAssignment.run(a.id, a.user_id, a.question_id, a.assigned_by, a.status));

  // Submissions for usr-user-01
  const submissions = [
    { id: 'sub-01', user_id: 'usr-user-01', question_id: 'q-two-sum', status: 'solved', solved_at: new Date().toISOString() },
    { id: 'sub-02', user_id: 'usr-user-01', question_id: 'q-valid-anagram', status: 'solved', solved_at: new Date().toISOString() },
    { id: 'sub-03', user_id: 'usr-user-01', question_id: 'q-group-anagrams', status: 'attempted', attempted_at: new Date().toISOString() }
  ];

  const insertSubmission = db.prepare(`
    INSERT OR IGNORE INTO submissions (id, user_id, question_id, status, attempted_at, solved_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  submissions.forEach(s => insertSubmission.run(s.id, s.user_id, s.question_id, s.status, s.attempted_at || null, s.solved_at || null));

  // Today's Daily Question (UTC date)
  const todayUtc = new Date().toISOString().split('T')[0];
  const insertDailyQuestion = db.prepare(`
    INSERT OR IGNORE INTO daily_questions (id, question_id, date, created_by)
    VALUES (?, ?, ?, ?)
  `);
  insertDailyQuestion.run('daily-today', 'q-two-sum', todayUtc, 'usr-admin-01');

  console.log('Database seeded successfully with in-platform coding problems & test cases.');
}

if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
