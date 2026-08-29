const { db } = require('./db');
const { v4: uuidv4 } = require('uuid');

function seedDatabase() {
  const fs = require('fs');
  const path = require('path');

  // Topics
  const topicsJsonPath = path.join(__dirname, 'data', 'topics.json');
  const patternsJsonPath = path.join(__dirname, 'data', 'patterns.json');

  let topicsList = [];
  try {
    topicsList = JSON.parse(fs.readFileSync(topicsJsonPath, 'utf8'));
  } catch (_) {
    topicsList = [
      { id: 'arrays', name: 'Arrays', category: 'Core', order: 1 }
    ];
  }

  topicsList.forEach((t, idx) => {
    const existing = db.prepare('SELECT id FROM topics WHERE id = ? OR name = ?').get(t.id, t.name);
    if (!existing) {
      db.prepare('INSERT INTO topics (id, name, category, order_index) VALUES (?, ?, ?, ?)').run(t.id, t.name, t.category || 'Core', t.order || (idx + 1));
    } else {
      db.prepare('UPDATE topics SET id = ?, name = ?, category = ?, order_index = ? WHERE id = ?').run(t.id, t.name, t.category || 'Core', t.order || (idx + 1), existing.id);
    }
  });

  let patternsList = [];
  try {
    patternsList = JSON.parse(fs.readFileSync(patternsJsonPath, 'utf8'));
  } catch (_) {}

  patternsList.forEach((p, idx) => {
    const topicId = p.applicableTopics?.[0] || null;
    const applicableStr = JSON.stringify(p.applicableTopics || []);
    const existing = db.prepare('SELECT id FROM patterns WHERE id = ?').get(p.id);
    if (!existing) {
      db.prepare('INSERT INTO patterns (id, name, topic_id, order_index, applicable_topics) VALUES (?, ?, ?, ?, ?)').run(p.id, p.name, topicId, idx + 1, applicableStr);
    } else {
      db.prepare('UPDATE patterns SET name = ?, topic_id = ?, order_index = ?, applicable_topics = ? WHERE id = ?').run(p.name, topicId, idx + 1, applicableStr, p.id);
    }
  });

  // Users
  const users = [
    { 
      id: 'usr-admin-01', 
      name: 'Axly Admin', 
      email: 'admin@axly.in', 
      role: 'admin',
      username: 'axlyadmin',
      institution: 'Axly Technology HQ',
      bio: 'Lead Mentor & Curriculum Architect for Data Structures & Algorithms.',
      github_url: 'https://github.com/axly-admin',
      linkedin_url: 'https://linkedin.com/in/axly-admin',
      skills: JSON.stringify(['JavaScript', 'Python', 'C++', 'System Design', 'Algorithms']),
      points: 1250,
      streak: 42,
      longest_streak: 42,
      rank: 1
    },
    { 
      id: 'usr-user-01', 
      name: 'Alex Mercer', 
      email: 'alex@example.com', 
      role: 'user',
      username: 'alexmercer',
      institution: 'Stanford University / CS 2026',
      bio: 'Aspiring Software Engineer focused on competitive programming, graph algorithms, and full-stack systems.',
      github_url: 'https://github.com/alexmercer',
      linkedin_url: 'https://linkedin.com/in/alex-mercer',
      skills: JSON.stringify(['JavaScript', 'Python', 'React', 'Data Structures']),
      points: 480,
      streak: 7,
      longest_streak: 14,
      rank: 3
    },
    { 
      id: 'usr-user-02', 
      name: 'Priya Sharma', 
      email: 'priya@example.com', 
      role: 'user',
      username: 'priyasharma',
      institution: 'IIT Bombay / CSE',
      bio: 'DSA enthusiast, competitive coder, exploring distributed systems.',
      github_url: 'https://github.com/priyasharma',
      linkedin_url: 'https://linkedin.com/in/priya-sharma',
      skills: JSON.stringify(['Java', 'C++', 'Algorithms', 'Microservices']),
      points: 620,
      streak: 12,
      longest_streak: 20,
      rank: 2
    },
    { 
      id: 'usr-user-03', 
      name: 'David Kim', 
      email: 'david@example.com', 
      role: 'user',
      username: 'davidkim',
      institution: 'UC Berkeley / EECS',
      bio: 'Software engineer building web apps & mastering algorithm patterns.',
      github_url: 'https://github.com/davidkim',
      linkedin_url: 'https://linkedin.com/in/david-kim',
      skills: JSON.stringify(['TypeScript', 'Node.js', 'Dynamic Programming']),
      points: 340,
      streak: 4,
      longest_streak: 9,
      rank: 4
    }
  ];

  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, role, username, institution, bio, github_url, linkedin_url, skills, points, streak, longest_streak, rank)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET
      name = excluded.name,
      role = excluded.role,
      username = excluded.username,
      institution = excluded.institution,
      bio = excluded.bio,
      github_url = excluded.github_url,
      linkedin_url = excluded.linkedin_url,
      skills = excluded.skills,
      points = excluded.points,
      streak = excluded.streak,
      longest_streak = excluded.longest_streak,
      rank = excluded.rank
  `);
  users.forEach(u => insertUser.run(
    u.id, u.name, u.email, u.role, u.username, u.institution, u.bio,
    u.github_url, u.linkedin_url, u.skills, u.points, u.streak, u.longest_streak, u.rank
  ));

  // Cohorts
  const cohorts = [
    {
      id: 'cohort-mern-2026',
      name: 'MERN Fullstack Batch 2026',
      description: 'Intensive cohort covering frontend, backend, APIs, and DSA mastery.',
      mentor_id: 'usr-admin-01',
      start_date: '2026-01-15',
      end_date: '2026-06-30'
    },
    {
      id: 'cohort-aiml-2026',
      name: 'AI/ML Engineering Batch 2026',
      description: 'Deep dive into data science, machine learning models, and algorithms.',
      mentor_id: 'usr-admin-01',
      start_date: '2026-02-01',
      end_date: '2026-07-31'
    },
    {
      id: 'cohort-dsa-mastery',
      name: 'DSA & System Design Masterclass',
      description: 'Competitive programming, dynamic programming, trees, and graphs.',
      mentor_id: 'usr-admin-01',
      start_date: '2026-01-01',
      end_date: '2026-12-31'
    }
  ];

  const insertCohort = db.prepare(`
    INSERT OR IGNORE INTO cohorts (id, name, description, mentor_id, start_date, end_date)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  cohorts.forEach(c => insertCohort.run(c.id, c.name, c.description, c.mentor_id, c.start_date, c.end_date));

  // Cohort Members
  const insertMember = db.prepare('INSERT OR IGNORE INTO cohort_members (id, cohort_id, user_id) VALUES (?, ?, ?)');
  insertMember.run('cm-01', 'cohort-mern-2026', 'usr-user-01');
  insertMember.run('cm-02', 'cohort-mern-2026', 'usr-user-02');
  insertMember.run('cm-03', 'cohort-dsa-mastery', 'usr-user-01');
  insertMember.run('cm-04', 'cohort-dsa-mastery', 'usr-user-03');

  // Badges
  const badges = [
    { id: 'badge-first-challenge', name: 'First Challenge', description: 'Solved first coding challenge on the platform', icon: 'Award', criteria: '1 challenge solved' },
    { id: 'badge-7-day-streak', name: '7-Day Streak', description: 'Practiced coding for 7 consecutive days', icon: 'Flame', criteria: '7 days streak' },
    { id: 'badge-10-challenges', name: 'Problem Solver', description: 'Completed 10 algorithm challenges', icon: 'Zap', criteria: '10 challenges completed' },
    { id: 'badge-debug-master', name: 'Debug Master', description: 'Submitted clean solutions with 100% test cases passed on first try', icon: 'ShieldCheck', criteria: 'Perfect submission' },
    { id: 'badge-speed-demon', name: 'Speed Demon', description: 'Executed solutions under 50ms average runtime', icon: 'Gauge', criteria: 'Runtime optimization' }
  ];

  const insertBadge = db.prepare('INSERT OR IGNORE INTO badges (id, name, description, icon, criteria) VALUES (?, ?, ?, ?, ?)');
  badges.forEach(b => insertBadge.run(b.id, b.name, b.description, b.icon, b.criteria));

  // User Badges
  const insertUserBadge = db.prepare('INSERT OR IGNORE INTO user_badges (id, user_id, badge_id) VALUES (?, ?, ?)');
  insertUserBadge.run('ub-01', 'usr-user-01', 'badge-first-challenge');
  insertUserBadge.run('ub-02', 'usr-user-01', 'badge-7-day-streak');
  insertUserBadge.run('ub-03', 'usr-user-02', 'badge-first-challenge');
  insertUserBadge.run('ub-04', 'usr-user-02', 'badge-10-challenges');

  // Questions / Challenges
  const questions = [
    {
      id: 'q-two-sum',
      title: 'Two Sum',
      difficulty: 'easy',
      topic_id: 'arrays',
      url: 'https://leetcode.com/problems/two-sum/',
      description: `Given an array of integers \`nums\` and an integer \`target\`, return *indices of the two numbers such that they add up to \`target\`*.\n\nYou may assume that each input would have ***exactly one solution***, and you may not use the same element twice.\n\nYou can return the answer in any order.`,
      problem_statement: `Given an array of integers nums and an integer target, find the two distinct indices that sum to target.`,
      constraints: `2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9\nOnly one valid answer exists.`,
      input_format: `First line contains target integer.\nSecond line contains space-separated integers for nums.`,
      output_format: `Print the two 0-based indices separated by a space.`,
      example_input: `9\n2 7 11 15`,
      example_output: `0 1`,
      hints: `Use a Hash Map to store elements and their indices for O(N) lookup.`,
      tags: JSON.stringify(['Arrays', 'Hash Table', 'Easy']),
      estimated_time: '20 mins',
      points: 20,
      assigned_date: '2026-08-20',
      due_date: '2026-09-05',
      status: 'published',
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

const input = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/);
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
        { input: `10\n1 5 2 4 9`, expected_output: `0 4`, is_hidden: 1 },
        { input: `-8\n-3 -5 2 4`, expected_output: `0 1`, is_hidden: 1 }
      ]
    },
    {
      id: 'q-valid-anagram',
      title: 'Valid Anagram',
      difficulty: 'easy',
      topic_id: 'arrays',
      url: 'https://leetcode.com/problems/valid-anagram/',
      description: `Given two strings \`s\` and \`t\`, return \`true\` if \`t\` is an anagram of \`s\`, and \`false\` otherwise.`,
      constraints: `1 <= s.length, t.length <= 5 * 10^4\ns and t consist of lowercase English letters.`,
      input_format: `First line contains string s.\nSecond line contains string t.`,
      output_format: `Print true or false.`,
      example_input: `anagram\nnagaram`,
      example_output: `true`,
      hints: `Count character frequencies or compare sorted strings.`,
      tags: JSON.stringify(['Strings', 'Hash Map']),
      estimated_time: '15 mins',
      points: 20,
      assigned_date: '2026-08-22',
      due_date: '2026-09-07',
      status: 'published',
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

const lines = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/);
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
      topic_id: 'stack',
      url: 'https://leetcode.com/problems/valid-parentheses/',
      description: `Given a string \`s\` containing just brackets \`'()[]{}'\`, determine if valid.`,
      constraints: `1 <= s.length <= 10^4\ns consists of parentheses only.`,
      input_format: `Single line containing string s.`,
      output_format: `Print true or false.`,
      example_input: `()[]{}`,
      example_output: `true`,
      hints: `Use a stack to match corresponding closing brackets.`,
      tags: JSON.stringify(['Stack', 'Easy']),
      estimated_time: '20 mins',
      points: 20,
      assigned_date: '2026-08-25',
      due_date: '2026-09-10',
      status: 'published',
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
      topic_id: 'binary-search',
      url: 'https://leetcode.com/problems/binary-search/',
      description: `Given an array of integers \`nums\` which is sorted in ascending order, search for \`target\`.`,
      constraints: `1 <= nums.length <= 10^4\n-10^4 < nums[i], target < 10^4\nArray is sorted ascending.`,
      input_format: `First line: target integer.\nSecond line: space-separated integers.`,
      output_format: `Index or -1 if not found.`,
      example_input: `9\n-1 0 3 5 9 12`,
      example_output: `4`,
      hints: `Compute mid = (left + right) // 2 and narrow interval.`,
      tags: JSON.stringify(['Binary Search', 'Easy']),
      estimated_time: '15 mins',
      points: 20,
      assigned_date: '2026-08-25',
      due_date: '2026-09-08',
      status: 'published',
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

const lines = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/);
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
      topic_id: 'arrays',
      url: 'https://leetcode.com/problems/group-anagrams/',
      description: `Given an array of strings \`strs\`, group the anagrams together.`,
      constraints: `1 <= strs.length <= 10^4\n0 <= strs[i].length <= 100`,
      input_format: `Single line with space-separated strings.`,
      output_format: `Number of unique anagram groups.`,
      example_input: `eat tea tan ate nat bat`,
      example_output: `3`,
      hints: `Use sorted string as map key.`,
      tags: JSON.stringify(['Arrays', 'Hash Map', 'Medium']),
      estimated_time: '35 mins',
      points: 40,
      assigned_date: '2026-08-26',
      due_date: '2026-09-12',
      status: 'published',
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
      topic_id: 'arrays',
      url: 'https://leetcode.com/problems/top-k-frequent-elements/',
      description: `Given integer array \`nums\` and integer \`k\`, return the \`k\` most frequent elements.`,
      constraints: `1 <= nums.length <= 10^5\nk is in range [1, unique elements count].`,
      input_format: `First line: integer k.\nSecond line: space-separated integers.`,
      output_format: `Space-separated top k frequent numbers sorted ascending.`,
      example_input: `2\n1 1 1 2 2 3`,
      example_output: `1 2`,
      hints: `Use frequency bucket sort or heap for O(N log K).`,
      tags: JSON.stringify(['Heap', 'Hash Table', 'Medium']),
      estimated_time: '30 mins',
      points: 40,
      assigned_date: '2026-08-26',
      due_date: '2026-09-14',
      status: 'published',
      starter_code: JSON.stringify({
        javascript: `const fs = require('fs');

function topKFrequent(k, nums) {
  const count = {};
  for (const n of nums) count[n] = (count[n] || 0) + 1;
  const sorted = Object.keys(count).sort((a, b) => count[b] - count[a] || a - b);
  return sorted.slice(0, k).map(Number).sort((a, b) => a - b);
}

const lines = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/);
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
      topic_id: 'two-pointers-sliding-window',
      url: 'https://leetcode.com/problems/trapping-rain-water/',
      description: `Compute how much water can be trapped after raining over elevation bars.`,
      constraints: `1 <= height.length <= 2 * 10^4\n0 <= height[i] <= 10^5`,
      input_format: `Space-separated integers representing bar heights.`,
      output_format: `Total units of trapped rain water.`,
      example_input: `0 1 0 2 1 0 1 3 2 1 2 1`,
      example_output: `6`,
      hints: `Use two pointers maintaining left_max and right_max.`,
      tags: JSON.stringify(['Two Pointers', 'Dynamic Programming', 'Hard']),
      estimated_time: '45 mins',
      points: 60,
      assigned_date: '2026-08-20',
      due_date: '2026-09-02',
      status: 'published',
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
      topic_id: 'two-pointers-sliding-window',
      url: 'https://leetcode.com/problems/3sum/',
      description: `Given integer array nums, return count of unique triplets summing to 0.`,
      constraints: `3 <= nums.length <= 3000\n-10^5 <= nums[i] <= 10^5`,
      input_format: `Space-separated integers.`,
      output_format: `Total count of unique zero-sum triplets.`,
      example_input: `-1 0 1 2 -1 -4`,
      example_output: `2`,
      hints: `Sort the array and fix first element, then two-pointer scan.`,
      tags: JSON.stringify(['Two Pointers', 'Sorting', 'Medium']),
      estimated_time: '35 mins',
      points: 40,
      assigned_date: '2026-08-24',
      due_date: '2026-09-08',
      status: 'published',
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
      topic_id: 'two-pointers-sliding-window',
      url: 'https://leetcode.com/problems/longest-substring-without-repeating-characters/',
      description: `Find length of the longest substring without repeating characters.`,
      constraints: `0 <= s.length <= 5 * 10^4\ns consists of English letters, digits, symbols.`,
      input_format: `Single line with string s.`,
      output_format: `Length of the longest non-repeating substring.`,
      example_input: `abcabcbb`,
      example_output: `3`,
      hints: `Use sliding window with a set/map tracking character indices.`,
      tags: JSON.stringify(['Sliding Window', 'Hash Table', 'Medium']),
      estimated_time: '30 mins',
      points: 40,
      assigned_date: '2026-08-25',
      due_date: '2026-09-09',
      status: 'published',
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
      topic_id: 'binary-search',
      url: 'https://leetcode.com/problems/median-of-two-sorted-arrays/',
      description: `Return median of two sorted arrays in O(log(m+n)) runtime.`,
      constraints: `0 <= m, n <= 1000\n1 <= m + n <= 2000`,
      input_format: `First line: space-separated integers for nums1.\nSecond line: space-separated integers for nums2.`,
      output_format: `Median formatted as a float with 1 decimal place.`,
      example_input: `1 3\n2`,
      example_output: `2.0`,
      hints: `Binary search on the partition point of the smaller array.`,
      tags: JSON.stringify(['Binary Search', 'Divide and Conquer', 'Hard']),
      estimated_time: '45 mins',
      points: 60,
      assigned_date: '2026-08-18',
      due_date: '2026-08-30',
      status: 'published',
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

const lines = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/);
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
    INSERT INTO questions (
      id, title, difficulty, topic_id, url, description, problem_statement,
      constraints, input_format, output_format, example_input, example_output,
      hints, tags, estimated_time, points, assigned_date, due_date, status, starter_code, is_active
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      difficulty = excluded.difficulty,
      topic_id = excluded.topic_id,
      url = excluded.url,
      description = excluded.description,
      problem_statement = excluded.problem_statement,
      constraints = excluded.constraints,
      input_format = excluded.input_format,
      output_format = excluded.output_format,
      example_input = excluded.example_input,
      example_output = excluded.example_output,
      hints = excluded.hints,
      tags = excluded.tags,
      estimated_time = excluded.estimated_time,
      points = excluded.points,
      assigned_date = excluded.assigned_date,
      due_date = excluded.due_date,
      status = excluded.status,
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
      q.problem_statement || q.description || null,
      q.constraints || null,
      q.input_format || null,
      q.output_format || null,
      q.example_input || null,
      q.example_output || null,
      q.hints || null,
      q.tags || '[]',
      q.estimated_time || '30 mins',
      q.points || 20,
      q.assigned_date || null,
      q.due_date || null,
      q.status || 'published',
      q.starter_code || null,
      q.is_active
    );

    if (q.test_cases && q.test_cases.length > 0) {
      db.prepare('DELETE FROM test_cases WHERE question_id = ?').run(q.id);
      q.test_cases.forEach((tc, idx) => {
        insertTestCase.run(`tc-${q.id}-${idx + 1}`, q.id, tc.input, tc.expected_output, tc.is_hidden ? 1 : 0);
      });
    }
  });

  // Assignments
  const assignments = [
    { 
      id: 'asgn-01', 
      user_id: 'usr-user-01', 
      question_id: 'q-two-sum', 
      cohort_id: 'cohort-mern-2026', 
      assigned_by: 'usr-admin-01', 
      status: 'completed',
      priority: 'High',
      instructions: 'Solve in O(N) using Hash Map. Submit via editor.',
      due_date: '2026-09-05'
    },
    { 
      id: 'asgn-02', 
      user_id: 'usr-user-01', 
      question_id: 'q-valid-anagram', 
      cohort_id: 'cohort-mern-2026', 
      assigned_by: 'usr-admin-01', 
      status: 'completed',
      priority: 'Medium',
      instructions: 'Submit either via integrated compiler or GitHub repo link.',
      due_date: '2026-09-07'
    },
    { 
      id: 'asgn-03', 
      user_id: 'usr-user-01', 
      question_id: 'q-group-anagrams', 
      cohort_id: 'cohort-mern-2026', 
      assigned_by: 'usr-admin-01', 
      status: 'ongoing',
      priority: 'High',
      instructions: 'Focus on time complexity optimization.',
      due_date: '2026-09-12'
    },
    { 
      id: 'asgn-04', 
      user_id: 'usr-user-01', 
      question_id: 'q-top-k-frequent', 
      cohort_id: 'cohort-dsa-mastery', 
      assigned_by: 'usr-admin-01', 
      status: 'assigned',
      priority: 'Medium',
      instructions: 'Try implementing Bucket Sort for O(N).',
      due_date: '2026-09-14'
    },
    { 
      id: 'asgn-05', 
      user_id: 'usr-user-01', 
      question_id: 'q-trapping-rain-water', 
      cohort_id: 'cohort-dsa-mastery', 
      assigned_by: 'usr-admin-01', 
      status: 'incomplete',
      priority: 'High',
      instructions: 'Classic hard problem. Use two-pointer approach.',
      due_date: '2026-08-30'
    }
  ];

  const insertAssignment = db.prepare(`
    INSERT INTO assignments (id, user_id, question_id, cohort_id, assigned_by, status, priority, instructions, due_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, question_id) DO UPDATE SET
      status = excluded.status,
      priority = excluded.priority,
      instructions = excluded.instructions,
      due_date = excluded.due_date
  `);
  assignments.forEach(a => insertAssignment.run(
    a.id, a.user_id, a.question_id, a.cohort_id, a.assigned_by,
    a.status, a.priority, a.instructions, a.due_date
  ));

  // Submissions with Mentor Reviews
  const submissions = [
    { 
      id: 'sub-01', 
      user_id: 'usr-user-01', 
      question_id: 'q-two-sum', 
      assignment_id: 'asgn-01',
      submission_type: 'code',
      language: 'javascript',
      source_code: `function twoSum(target, nums) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const comp = target - nums[i];
    if (map.has(comp)) return [map.get(comp), i];
    map.set(nums[i], i);
  }
}`,
      status: 'approved',
      review_status: 'approved',
      feedback: 'Excellent O(N) solution with optimal Map lookup! Clean and well-formatted.',
      reviewer_id: 'usr-admin-01',
      reviewed_at: '2026-08-25T14:30:00Z',
      passed_tests: 5,
      total_tests: 5,
      execution_time_ms: 32.4,
      solved_at: '2026-08-25T14:00:00Z'
    },
    { 
      id: 'sub-02', 
      user_id: 'usr-user-01', 
      question_id: 'q-valid-anagram', 
      assignment_id: 'asgn-02',
      submission_type: 'github',
      github_url: 'https://github.com/alexmercer/dsa-solutions/blob/main/valid_anagram.js',
      status: 'approved',
      review_status: 'approved',
      feedback: 'Great GitHub repository submission with unit test coverage.',
      reviewer_id: 'usr-admin-01',
      reviewed_at: '2026-08-26T10:15:00Z',
      passed_tests: 4,
      total_tests: 4,
      execution_time_ms: 0,
      solved_at: '2026-08-26T09:45:00Z'
    },
    { 
      id: 'sub-03', 
      user_id: 'usr-user-01', 
      question_id: 'q-group-anagrams', 
      assignment_id: 'asgn-03',
      submission_type: 'code',
      language: 'javascript',
      source_code: `function groupAnagramsCount(strs) {
  const map = new Map();
  for (const s of strs) {
    const key = s.split('').sort().join('');
    map.set(key, (map.get(key) || 0) + 1);
  }
  return map.size;
}`,
      status: 'changes_requested',
      review_status: 'changes_requested',
      feedback: 'Your solution works, but please optimize string sorting key into a character frequency tuple.',
      reviewer_id: 'usr-admin-01',
      reviewed_at: '2026-08-27T08:00:00Z',
      passed_tests: 2,
      total_tests: 3,
      execution_time_ms: 45.1,
      attempted_at: '2026-08-27T07:30:00Z'
    }
  ];

  const insertSubmission = db.prepare(`
    INSERT INTO submissions (
      id, user_id, question_id, assignment_id, submission_type, language, source_code,
      github_url, status, review_status, feedback, reviewer_id, reviewed_at,
      passed_tests, total_tests, execution_time_ms, attempted_at, solved_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, question_id) DO UPDATE SET
      assignment_id = excluded.assignment_id,
      submission_type = excluded.submission_type,
      language = excluded.language,
      source_code = excluded.source_code,
      github_url = excluded.github_url,
      status = excluded.status,
      review_status = excluded.review_status,
      feedback = excluded.feedback,
      reviewer_id = excluded.reviewer_id,
      reviewed_at = excluded.reviewed_at,
      passed_tests = excluded.passed_tests,
      total_tests = excluded.total_tests,
      execution_time_ms = excluded.execution_time_ms,
      attempted_at = excluded.attempted_at,
      solved_at = excluded.solved_at
  `);
  submissions.forEach(s => insertSubmission.run(
    s.id, s.user_id, s.question_id, s.assignment_id, s.submission_type, s.language,
    s.source_code, s.github_url, s.status, s.review_status, s.feedback, s.reviewer_id,
    s.reviewed_at, s.passed_tests, s.total_tests, s.execution_time_ms, s.attempted_at || null, s.solved_at || null
  ));

  // Notifications
  const notifications = [
    {
      id: 'notif-01',
      user_id: 'usr-user-01',
      title: 'New Daily Challenge Published',
      message: "Today's competitive challenge \"Longest Subarray Challenge\" is live! Solve it to earn +100 pts.",
      category: 'daily_challenge',
      type: 'daily_challenge_published',
      link: '/daily-challenge',
      is_read: 0,
      created_at: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 'notif-02',
      user_id: 'usr-user-01',
      title: 'Practice Problem Solved! 🎉',
      message: 'You solved "Two Sum"! +10 Practice points added to your Total Score.',
      category: 'practice',
      type: 'practice_completed',
      link: '/practice',
      is_read: 0,
      created_at: new Date(Date.now() - 7200000).toISOString()
    },
    {
      id: 'notif-03',
      user_id: 'usr-user-01',
      title: 'Submission Accepted: Valid Anagram',
      message: 'All 10/10 test cases passed in 24ms. Solution verified.',
      category: 'submission',
      type: 'submission_accepted',
      link: '/practice',
      is_read: 1,
      created_at: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: 'notif-04',
      user_id: 'usr-user-01',
      title: '🔥 7-Day Streak Milestone!',
      message: "You've solved Daily Challenges for 7 days in a row! Streak bonus unlocked.",
      category: 'achievement',
      type: 'streak_milestone',
      link: '/daily-challenge',
      is_read: 1,
      created_at: new Date(Date.now() - 172800000).toISOString()
    },
    {
      id: 'notif-05',
      user_id: 'usr-user-01',
      title: 'Welcome to Axly DSA Tracker',
      message: 'Track your algorithms practice across 80 core curated problems and compete on the Daily Challenge leaderboard.',
      category: 'system',
      type: 'system_alert',
      link: '/practice',
      is_read: 1,
      created_at: new Date(Date.now() - 259200000).toISOString()
    }
  ];

  const insertNotif = db.prepare(`
    INSERT INTO notifications (id, user_id, title, message, category, type, link, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET 
      title = excluded.title,
      message = excluded.message,
      category = excluded.category,
      type = excluded.type,
      link = excluded.link,
      is_read = excluded.is_read
  `);

  for (const n of notifications) {
    insertNotif.run(n.id, n.user_id, n.title, n.message, n.category, n.type, n.link, n.is_read, n.created_at);
  }
  // Dedicated Daily Challenge Problems (Independent from Practice bank)
  const todayUtc = new Date().toISOString().split('T')[0];
  const tomorrowUtc = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const yesterdayUtc = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const dailyChallenges = [
    {
      id: 'dc-001',
      title: 'Longest Subarray Challenge',
      slug: 'longest-subarray-challenge',
      difficulty: 'medium',
      topic_id: 'arrays',
      pattern_id: 'two-pointers',
      points: 100,
      estimated_time: 30,
      description: 'Given an array of positive integers and an integer k, find the maximum length of a contiguous subarray whose sum is less than or equal to k.',
      problem_statement: 'Given an array of integers nums and an integer k, return the maximum length of a subarray whose sum is at most k. If no such subarray exists, return 0.',
      constraints: '1 <= nums.length <= 10^5\n1 <= nums[i] <= 10^4\n1 <= k <= 10^9',
      input_format: 'First line contains n and k. Second line contains n integers.',
      output_format: 'A single integer denoting the maximum subarray length.',
      example_input: '{"nums": [1, 2, 1, 0, 1, 1, 0], "k": 4}',
      example_output: '5',
      hints: JSON.stringify([
        'All numbers are non-negative, so expanding the window always increases or maintains the sum.',
        'Use a sliding window with two pointers (left and right).',
        'When window_sum > k, shrink the window from the left until window_sum <= k, updating max_len at each step.'
      ]),
      tags: JSON.stringify(['Arrays', 'Sliding Window', 'Two Pointers']),
      solution_approach: 'Use a dynamic sliding window. Expand the right boundary while adding nums[right] to current sum. If the sum exceeds k, increment the left boundary and subtract nums[left]. Track the maximum window size (right - left + 1).',
      status: 'scheduled',
      scheduled_date: yesterdayUtc,
      created_by: 'usr-admin-01',
      test_cases: [
        { id: 'dc-tc-001-1', input: '{"nums": [1, 2, 1, 0, 1, 1, 0], "k": 4}', expected_output: '5', is_hidden: 0 },
        { id: 'dc-tc-001-2', input: '{"nums": [3, 1, 2, 7, 4, 2, 1, 1, 5], "k": 8}', expected_output: '4', is_hidden: 0 },
        { id: 'dc-tc-001-3', input: '{"nums": [10, 20, 30], "k": 5}', expected_output: '0', is_hidden: 1 },
        { id: 'dc-tc-001-4', input: '{"nums": [1, 1, 1, 1, 1], "k": 3}', expected_output: '3', is_hidden: 1 }
      ]
    },
    {
      id: 'dc-002',
      title: 'Maximum Subarray Score with K Flips',
      slug: 'max-subarray-score-k-flips',
      difficulty: 'medium',
      topic_id: 'arrays',
      pattern_id: 'two-pointers',
      points: 100,
      estimated_time: 35,
      description: 'Given a binary array nums and an integer k, return the maximum number of consecutive 1s in the array if you can flip at most k 0s.',
      problem_statement: 'Find the maximum consecutive 1s after flipping at most k zeros in the binary array nums.',
      constraints: '1 <= nums.length <= 10^5\nnums[i] is either 0 or 1\n0 <= k <= nums.length',
      input_format: 'JSON with nums array and integer k.',
      output_format: 'Maximum consecutive 1s length.',
      example_input: '{"nums": [1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0], "k": 2}',
      example_output: '6',
      hints: JSON.stringify([
        'Translate the problem into finding the longest subarray containing at most k zeros.',
        'Use sliding window where you keep a count of zeros inside the current window.',
        'When zeros > k, move left pointer forward and decrement zero count if nums[left] == 0.'
      ]),
      tags: JSON.stringify(['Arrays', 'Sliding Window']),
      solution_approach: 'Maintain a window [left, right] and track count of zeros. Expand right pointer. Whenever zero_count > k, increment left and decrement zero_count if nums[left] was zero.',
      status: 'published',
      scheduled_date: todayUtc,
      created_by: 'usr-admin-01',
      test_cases: [
        { id: 'dc-tc-002-1', input: '{"nums": [1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0], "k": 2}', expected_output: '6', is_hidden: 0 },
        { id: 'dc-tc-002-2', input: '{"nums": [0, 0, 1, 1, 0, 0, 1, 1, 1, 0, 1, 1, 0, 0, 0, 1, 1, 1, 1], "k": 3}', expected_output: '10', is_hidden: 0 }
      ]
    },
    {
      id: 'dc-003',
      title: 'Strictly Increasing Pivot Sequence',
      slug: 'strictly-increasing-pivot-sequence',
      difficulty: 'hard',
      topic_id: 'dynamic-programming',
      pattern_id: '1d-dp',
      points: 100,
      estimated_time: 45,
      description: 'Find the maximum possible sum of a strictly increasing subsequence with variable leap step costs.',
      problem_statement: 'Given an array of integers nums, find the maximum sum of an increasing subsequence where adjacent indices satisfy leap conditions.',
      constraints: '1 <= nums.length <= 2500\n-10^4 <= nums[i] <= 10^4',
      input_format: 'JSON with nums array.',
      output_format: 'Single integer for max sum.',
      example_input: '{"nums": [10, 9, 2, 5, 3, 7, 101, 18]}',
      example_output: '128',
      hints: JSON.stringify([
        'Consider Dynamic Programming where dp[i] represents the maximum increasing subsequence sum ending at index i.',
        'For each index i, iterate over all j < i such that nums[j] < nums[i].',
        'dp[i] = max(nums[i], max(dp[j] + nums[i]) for all valid j).'
      ]),
      tags: JSON.stringify(['Dynamic Programming', 'Optimization']),
      solution_approach: 'Let dp[i] be the maximum sum of an increasing subsequence ending at index i. For each i, check all preceding j where nums[j] < nums[i] and update dp[i] = max(dp[i], dp[j] + nums[i]).',
      status: 'draft',
      scheduled_date: null,
      created_by: 'usr-admin-01',
      test_cases: [
        { id: 'dc-tc-003-1', input: '{"nums": [1, 101, 2, 3, 100, 4, 5]}', expected_output: '106', is_hidden: 0 }
      ]
    }
  ];

  const insertDailyChallenge = db.prepare(`
    INSERT INTO daily_challenge_problems (
      id, title, slug, difficulty, topic_id, pattern_id, points, estimated_time,
      description, problem_statement, constraints, input_format, output_format,
      example_input, example_output, hints, tags, solution_approach, status,
      scheduled_date, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      difficulty = excluded.difficulty,
      topic_id = excluded.topic_id,
      pattern_id = excluded.pattern_id,
      points = excluded.points,
      estimated_time = excluded.estimated_time,
      description = excluded.description,
      problem_statement = excluded.problem_statement,
      constraints = excluded.constraints,
      input_format = excluded.input_format,
      output_format = excluded.output_format,
      example_input = excluded.example_input,
      example_output = excluded.example_output,
      hints = excluded.hints,
      tags = excluded.tags,
      solution_approach = excluded.solution_approach,
      status = excluded.status,
      scheduled_date = excluded.scheduled_date
  `);

  const insertDailyTestCase = db.prepare(`
    INSERT INTO daily_challenge_test_cases (id, challenge_id, input, expected_output, is_hidden)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      input = excluded.input,
      expected_output = excluded.expected_output,
      is_hidden = excluded.is_hidden
  `);

  dailyChallenges.forEach(dc => {
    insertDailyChallenge.run(
      dc.id, dc.title, dc.slug, dc.difficulty, dc.topic_id, dc.pattern_id, dc.points, dc.estimated_time,
      dc.description, dc.problem_statement, dc.constraints, dc.input_format, dc.output_format,
      dc.example_input, dc.example_output, dc.hints, dc.tags, dc.solution_approach, dc.status,
      dc.scheduled_date, dc.created_by
    );
    if (dc.test_cases && dc.test_cases.length > 0) {
      dc.test_cases.forEach(tc => {
        insertDailyTestCase.run(tc.id, dc.id, tc.input, tc.expected_output, tc.is_hidden);
      });
    }
  });

  // Today's Daily Challenge Link (UTC date)
  db.prepare('DELETE FROM daily_questions WHERE id = ? OR date = ?').run('daily-today', todayUtc);
  db.prepare(`
    INSERT INTO daily_questions (id, question_id, challenge_id, date, created_by)
    VALUES (?, ?, ?, ?, ?)
  `).run('daily-today', 'dc-002', 'dc-002', todayUtc, 'usr-admin-01');

  console.log('Database seeded successfully with in-platform coding problems, notifications & independent daily challenges.');
}

if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
