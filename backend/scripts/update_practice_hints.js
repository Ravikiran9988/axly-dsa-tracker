const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const DATA = path.join(__dirname, '../src/db/data');

function readBatch(n) {
  const filePath = path.join(DATA, `practice-batch-${n}.json.gz.b64`);
  const raw = fs.readFileSync(filePath, 'utf8').trim();
  return JSON.parse(zlib.gunzipSync(Buffer.from(raw, 'base64')).toString('utf8'));
}

function writeBatch(n, data) {
  const filePath = path.join(DATA, `practice-batch-${n}.json.gz.b64`);
  const jsonStr = JSON.stringify(data, null, 2);
  const compressed = zlib.gzipSync(Buffer.from(jsonStr, 'utf8'));
  const b64 = compressed.toString('base64');
  fs.writeFileSync(filePath, b64, 'utf8');
}

// Complete exhaustive map of curated progressive hints for all 80 Practice V1 problems
const CURATED_HINTS = {
  // --- Topic: Arrays (12) ---
  'arr-001': [
    'Think about what information you need to remember while scanning the array.',
    'For each number, consider whether its complement (target - nums[i]) has already been seen.',
    'A hash map allows fast O(1) lookup of previously seen values and their indices.'
  ],
  'arr-002': [
    'To maximize profit, you want to buy at the lowest price before you sell.',
    'Keep track of the minimum stock price encountered so far as you iterate from left to right.',
    'At each day, calculate the potential profit by subtracting min_price from current price, and update the global max profit.'
  ],
  'arr-003': [
    'The product of all elements except nums[i] equals (product of all elements to the left of i) * (product of all elements to the right of i).',
    'Calculate the prefix products in a first pass from left to right.',
    'In a second pass from right to left, maintain a running suffix product and multiply with the prefix product.'
  ],
  'arr-004': [
    'A negative prefix will only reduce the sum of any subsequent subarray.',
    'Maintain a running current_sum. If current_sum becomes negative, reset it to 0.',
    "This is Kadane's algorithm: at each index, max_ending_here = max(num, max_ending_here + num)."
  ],
  'arr-005': [
    'Multiplying by a negative number flips the sign: a minimum negative product can become a maximum positive product.',
    'Maintain both current maximum and current minimum products at each position.',
    'When the current number is negative, swap the current max and min before multiplying.'
  ],
  'arr-006': [
    'In a rotated sorted array, binary search can compare the middle element with the rightmost element.',
    'If nums[mid] > nums[right], the inflection point and minimum element must be strictly in the right half (left = mid + 1).',
    'Otherwise, the minimum is at mid or in the left half (right = mid).'
  ],
  'arr-007': [
    'In a rotated sorted array without duplicates, one half of the array across mid is always strictly sorted.',
    'Identify whether the left half nums[left..mid] or the right half is sorted.',
    'Check if the target lies within the boundaries of the sorted half to decide which subarray to search.'
  ],
  'arr-008': [
    'Sorting the array reduces this problem to Two Sum II with Two Pointers.',
    'Iterate through the array fixing nums[i] as the first element; skip duplicate values of nums[i].',
    'For the remaining subarray, use two pointers (left and right) to find pairs that sum to -nums[i].'
  ],
  'arr-009': [
    'The area is limited by the shorter of the two boundary lines multiplied by the distance between them.',
    'Start with the maximum possible width using two pointers at both ends: left = 0, right = n - 1.',
    'Always move the pointer pointing to the shorter vertical line inward to seek a taller line.'
  ],
  'arr-010': [
    'Sorting intervals by their start times brings overlapping intervals next to each other.',
    'Maintain a merged list of intervals initialized with the first interval.',
    'If the current interval starts before the last merged interval ends, merge them by extending the end time to max(end1, end2).'
  ],
  'arr-011': [
    'Rotating an array by k steps can be solved by reversing specific segments in-place.',
    'First reverse the entire array of length n.',
    'Then reverse the first k % n elements, and finally reverse the remaining n - (k % n) elements.'
  ],
  'arr-012': [
    'To achieve O(1) extra space, use the first row and first column of the matrix as marker arrays.',
    'Use two boolean flags to record whether the first row and first column originally contained zeros.',
    'Iterate through the rest of the matrix marking matrix[i][0] and matrix[0][j] with 0, then update cells based on markers.'
  ],

  // --- Topic: Strings (10) ---
  'str-001': [
    'Two strings are anagrams if and only if they have identical character counts.',
    'Use a frequency array of size 26 or a hash map to count character frequencies.',
    'Increment counts for characters in s and decrement for t; all counts must end at zero.'
  ],
  'str-002': [
    'A valid palindrome reads identical backwards and forwards after removing non-alphanumeric characters.',
    'Use two pointers starting at the beginning (left = 0) and end (right = n - 1) of the string.',
    'Skip non-alphanumeric characters and compare lowercase versions; move pointers inward.'
  ],
  'str-003': [
    'Use a dynamic sliding window where all characters in the window are unique.',
    'Maintain a hash map recording the most recent index of each character.',
    'When a repeated character is encountered, jump the left boundary to max(left, last_seen_index + 1).'
  ],
  'str-004': [
    'To maximize window length with at most k replacements, focus on the count of the most frequent character in the window.',
    'Maintain a frequency table and track the max frequency seen in any window.',
    'If the number of other characters to replace (window_length - max_frequency) exceeds k, shrink the window from the left.'
  ],
  'str-005': [
    'Use a sliding window with two pointers: expand the right pointer until all characters of t are included.',
    'Maintain a count of required distinct character frequencies satisfied in the current window.',
    'Once valid, contract the left pointer to minimize window length while maintaining all required character counts.'
  ],
  'str-006': [
    'Anagrams have the same character frequency signature or sorted string representation.',
    'Use the sorted version of each word or a tuple of character frequencies as the hash map key.',
    'Group all original words with the same key together in the hash map values.'
  ],
  'str-007': [
    'A stack is the standard data structure for matching nested opening and closing delimiters.',
    'When you see an opening bracket, push its corresponding closing bracket onto the stack.',
    'When you see a closing bracket, check if the stack is non-empty and top matches; otherwise return false.'
  ],
  'str-008': [
    'Every palindrome is symmetric around its center.',
    'There are 2n - 1 potential centers (n single characters and n - 1 adjacent character pairs).',
    'Expand outwards from each center while characters match and track the longest palindromic substring.'
  ],
  'str-009': [
    'Every single character and every identical adjacent pair can serve as the center of palindromes.',
    'Expand outwards from each of the 2n - 1 potential centers.',
    'Count 1 for every valid expansion step where left and right characters match.'
  ],
  'str-010': [
    'Use a delimiter-based length-prefix encoding format (e.g. `length#string`) to avoid ambiguity.',
    'To encode: prefix each string with its length followed by a special delimiter like `#`.',
    'To decode: read the integer length before `#`, extract that exact number of characters, and repeat.'
  ],

  // --- Topic: Hashing (8) ---
  'hash-001': [
    'Consider what data structure provides O(1) average lookup time for previously seen values.',
    'A Hash Set allows checking whether an element has already appeared in the array.',
    'Iterate through the array; if the current number is already present in the set return true, else add it.'
  ],
  'hash-002': [
    'First compute the frequency of each unique number using a hash map.',
    'To find the top k frequent elements, you can use bucket sort where bucket index represents frequency.',
    'Traverse the buckets from highest frequency (n) down to 1 and collect elements until k items are collected in O(n) time.'
  ],
  'hash-003': [
    'Insert all numbers into a Hash Set for O(1) lookup.',
    'Only attempt to count a sequence starting from numbers where `num - 1` is not in the set.',
    'For each sequence start, count consecutive numbers `num + 1`, `num + 2`... to achieve overall O(n) time.'
  ],
  'hash-004': [
    'Because the array is already sorted, smaller sums are on the left and larger sums on the right.',
    'Initialize two pointers at the two ends: left = 0 and right = n - 1.',
    'If sum < target increment left; if sum > target decrement right; if sum == target return the 1-based indices.'
  ],
  'hash-005': [
    'The sum of any subarray nums[i..j] is equal to prefix_sum[j] - prefix_sum[i - 1].',
    'We need prefix_sum[i - 1] = prefix_sum[j] - k to exist prior to index j.',
    'Maintain a hash map storing the frequency of running prefix sums seen so far, initialized with `{0: 1}`.'
  ],
  'hash-006': [
    'Two strings are isomorphic if there is a bijective (one-to-one and onto) mapping between their characters.',
    'Maintain two hash maps or arrays tracking s -> t and t -> s character mappings.',
    'For every index, verify both mappings match consistently; return false on any conflict.'
  ],
  'hash-007': [
    'Count the frequency of available letters in the magazine string.',
    'Use an integer array of size 26 or a hash map to store magazine character counts.',
    'Iterate through the ransomNote: decrement the count for each character; if any count drops below 0, return false.'
  ],
  'hash-008': [
    'Design a hash map using an array of buckets and separate chaining (linked list or list of pairs) to handle collisions.',
    'Choose a large prime number (e.g. 10007) for the bucket array size to distribute keys evenly.',
    'Implement `put`, `get`, and `remove` by hashing the key to a bucket index and scanning the bucket.'
  ],

  // --- Topic: Two Pointers / Sliding Window (10) ---
  'tp-001': [
    'Start two pointers from the left and right ends of the string and move inward while characters match.',
    'On the first mismatch between s[left] and s[right], you are allowed to delete at most one character.',
    'Check whether the remaining substring s[left + 1..right] or s[left..right - 1] is a palindrome.'
  ],
  'tp-002': [
    'Sort the array first to enable two-pointer scanning for each fixed element.',
    'Iterate through the array fixing nums[i], then use left = i + 1 and right = n - 1.',
    'At each step, calculate the sum, update the closest sum if |target - sum| is smaller, and adjust left or right accordingly.'
  ],
  'tp-003': [
    'Use the Dutch National Flag 3-way partitioning algorithm with three pointers: low, mid, and high.',
    'All elements before low are 0, between low and mid are 1, and after high are 2.',
    'If nums[mid] is 0 swap with low and increment both; if 1 increment mid; if 2 swap with high and decrement high.'
  ],
  'tp-004': [
    "Use Floyd's Cycle-Finding Algorithm (Fast and Slow pointers).",
    'Initialize slow pointer moving 1 step at a time and fast pointer moving 2 steps at a time.',
    'If fast reaches null, there is no cycle; if fast and slow meet at the same node, a cycle exists.'
  ],
  'tp-005': [
    'Use two pointers: a slow pointer moving 1 step and a fast pointer moving 2 steps.',
    'Both pointers start at the head of the linked list.',
    'When fast reaches the end (fast is null or fast.next is null), slow will be exactly at the middle node.'
  ],
  'tp-006': [
    'Use two pointers separated by a gap of n nodes.',
    'Advance the first pointer n steps ahead of the second pointer.',
    'Move both pointers forward together until the first pointer reaches the end; the second pointer will be right before the target node.'
  ],
  'tp-007': [
    'This problem is equivalent to finding the longest contiguous subarray with at most 2 distinct elements.',
    'Use a sliding window with a hash map tracking fruit types and their frequencies.',
    'When the number of unique fruit types in the window exceeds 2, shrink the window from the left.'
  ],
  'tp-008': [
    'A permutation of s1 in s2 means a substring of s2 with length equal to s1.length() having the exact same character frequencies.',
    'Use a fixed-size sliding window of length s1.length() over s2.',
    'Compare character frequency counts between s1 and the window; return true when they match.'
  ],
  'tp-009': [
    'The water trapped above bar i depends on min(left_max, right_max) - height[i].',
    'Use two pointers starting at left = 0 and right = n - 1 with running left_max and right_max.',
    'Process the side with the smaller max height and move that pointer inward while accumulating trapped water.'
  ],
  'tp-010': [
    'Since all numbers are positive, expanding the right window pointer monotonically increases the subarray sum.',
    'Expand right pointer, adding nums[right] to current_sum.',
    'While current_sum >= target, update the minimum length and shrink the window from the left by subtracting nums[left++].'
  ],

  // --- Topic: Stack (8) ---
  'stk-001': [
    'A stack needs to support push, pop, top, and retrieving the minimum element in O(1) time.',
    'Maintain a secondary stack (or store pairs in a single stack) to keep track of the minimum value at each depth.',
    'When pushing x, push min(x, current_min) to the min-stack; pop from both stacks together.'
  ],
  'stk-002': [
    'Reverse Polish Notation (postfix) places operators after their operands.',
    'Iterate through the tokens: when a number is seen, push it onto the stack.',
    'When an operator (+, -, *, /) is seen, pop the top two operands, apply the operation (note operand order for - and /), and push the result.'
  ],
  'stk-003': [
    'To find the number of days until a warmer temperature, use a monotonic decreasing stack of indices.',
    'Iterate through temperatures: while the current temperature is warmer than the temperature at the stack top index, pop and calculate the day difference.',
    'Push the current day index onto the stack.'
  ],
  'stk-004': [
    'Sort the cars in descending order by their starting positions so you process cars from closest to target to farthest.',
    'Calculate the time each car needs to reach the target: (target - position) / speed.',
    'If a car behind takes less or equal time than the car ahead, it will catch up and join that fleet; otherwise it forms a new fleet.'
  ],
  'stk-005': [
    'Each bar can be the shortest bar of a rectangle bounded by the first smaller bar to its left and to its right.',
    'Use a monotonic increasing stack storing bar indices.',
    'When a smaller bar is encountered, pop bars and compute rectangle area using the popped bar height and width determined by stack indices.'
  ],
  'stk-006': [
    'You can implement a FIFO Queue using two LIFO Stacks: `in_stack` for enqueue and `out_stack` for dequeue.',
    'Push operations always push onto `in_stack`.',
    'For pop/peek: if `out_stack` is empty, transfer all elements from `in_stack` to `out_stack` (reversing their order), then pop from `out_stack`.'
  ],
  'stk-007': [
    'Use two stacks (or a stack of pairs): one for multiplier counts and one for string segments.',
    'Iterate through the string: build multi-digit numbers and characters.',
    'On `[`, push the current count and current string onto stacks; on `]`, pop count and previous string, and repeat current string.'
  ],
  'stk-008': [
    'Use a stack to simulate moving asteroids from left to right.',
    'Positive asteroids move right (push to stack); negative asteroids move left and collide with positive asteroids on the stack top.',
    'Handle collision: smaller explodes, equal size both explode, larger destroys the smaller asteroid.'
  ],

  // --- Topic: Binary Search (8) ---
  'bs-001': [
    'Binary search operates on a sorted array by dividing the search interval in half at each step.',
    'Calculate `mid = left + Math.floor((right - left) / 2)` to avoid integer overflow.',
    'If nums[mid] == target return mid; if nums[mid] < target search right (left = mid + 1); otherwise search left (right = mid - 1).'
  ],
  'bs-002': [
    'Treat the m x n 2D matrix as a virtual 1D sorted array of length m * n.',
    'Map a 1D index `mid` to 2D matrix coordinates: `row = Math.floor(mid / n)` and `col = mid % n`.',
    'Perform standard binary search between left = 0 and right = m * n - 1.'
  ],
  'bs-003': [
    'Binary search on the answer space: Koko\'s hourly eating speed k ranges from 1 to max(piles).',
    'For a candidate speed k, total hours required = sum of `Math.ceil(pile / k)` across all piles.',
    'If total hours <= h, k is valid, so search for a slower speed (right = mid); otherwise search for a faster speed (left = mid + 1).'
  ],
  'bs-004': [
    'Compare nums[mid] with its neighbor nums[mid + 1] to determine the slope.',
    'If nums[mid] < nums[mid + 1], an ascending slope exists, meaning a peak must exist to the right (left = mid + 1).',
    'Otherwise, a descending slope exists, so a peak is at mid or to the left (right = mid).'
  ],
  'bs-005': [
    'Use a hash map mapping each key to a sorted list of `(timestamp, value)` pairs.',
    'Because timestamps are strictly increasing on `set`, the list for each key is sorted by timestamp.',
    'On `get(key, timestamp)`, use binary search on the timestamp list to find the largest timestamp <= query timestamp.'
  ],
  'bs-006': [
    'Binary search on the partition point of the smaller array to achieve O(log(min(m, n))) time.',
    'Partition both arrays such that left halves contain (m + n + 1) / 2 elements.',
    'Check if max(leftA, leftB) <= min(rightA, rightB) to calculate median from the boundary elements.'
  ],
  'bs-007': [
    'Binary search on the conveyor ship capacity: min capacity is max(weights), max capacity is sum(weights).',
    'For candidate capacity C, greedily load packages onto ships day by day to count required days.',
    'If days <= D, capacity C is feasible, try smaller capacity (right = mid); otherwise increase capacity (left = mid + 1).'
  ],
  'bs-008': [
    'Perform standard binary search to find target in the sorted array.',
    'If nums[mid] == target, return index mid.',
    'When the binary search loop terminates without finding target, the `left` pointer points precisely to the correct insertion index.'
  ],

  // --- Topic: Trees (12) ---
  'tre-001': [
    'The maximum depth of a binary tree is 1 + max(depth(left), depth(right)).',
    'Base case: if the current node is null, its depth is 0.',
    'Recursively compute the maximum depth of left and right subtrees and return 1 + Math.max(leftDepth, rightDepth).'
  ],
  'tre-002': [
    'To invert a tree, swap the left and right children of every node in the tree.',
    'Base case: if root is null, return null.',
    'Recursively invert the left and right subtrees, then swap `root.left` and `root.right`.'
  ],
  'tre-003': [
    'Two binary trees are structurally identical with same values if both roots match and their respective subtrees match.',
    'Base cases: if both nodes are null return true; if one is null or values differ return false.',
    'Recursively check `isSameTree(p.left, q.left) && isSameTree(p.right, q.right)`.'
  ],
  'tre-004': [
    'Level order traversal processes nodes layer by layer using Breadth-First Search (BFS).',
    'Use a queue initialized with the root node.',
    'At each level, record `levelSize = queue.length`, dequeue that many nodes into a level array, and enqueue their children.'
  ],
  'tre-005': [
    'A tree is height-balanced if for every node, the height difference between its left and right subtrees is at most 1.',
    'Use post-order DFS to compute subtree heights from bottom to top in O(n) time.',
    'Return -1 as a sentinel value immediately when any subtree is unbalanced to short-circuit the recursion.'
  ],
  'tre-006': [
    'The diameter is the length of the longest path between any two nodes in a tree.',
    'For any node, the longest path passing through it as root is `left_height + right_height`.',
    'Compute node height recursively while maintaining a global max diameter variable updated at each node.'
  ],
  'tre-007': [
    'Take advantage of the Binary Search Tree (BST) ordering property: left < root < right.',
    'If both p and q values are strictly less than root.val, LCA lies in the left subtree.',
    'If both are strictly greater than root.val, LCA lies in the right subtree; otherwise root is the split point and LCA.'
  ],
  'tre-008': [
    'Every node in a valid BST must satisfy `min_bound < node.val < max_bound`.',
    'Pass down exclusive range boundaries `(min, max)` during depth-first traversal.',
    'When recursing left update max = node.val; when recursing right update min = node.val; verify node value is within bounds.'
  ],
  'tre-009': [
    'An in-order traversal (Left -> Root -> Right) of a BST visits node values in strictly ascending order.',
    'Perform an iterative in-order traversal using an explicit stack.',
    'Decrement k at each visited node; when k reaches 0, return the current node value.'
  ],
  'tre-010': [
    'The first value in preorder traversal is always the root of the tree.',
    'Find root.val in inorder traversal: elements to its left form the left subtree, elements to its right form the right subtree.',
    'Use a hash map for O(1) inorder index lookups and recursively construct left and right subtrees.'
  ],
  'tre-011': [
    'The right side view consists of the rightmost node at each depth level.',
    'Use BFS level-order traversal with a queue.',
    'At each level, append the value of the last node in the queue to the output list.'
  ],
  'tre-012': [
    'Traverse from root to leaf using DFS, subtracting node values from targetSum.',
    'Base case: if current node is a leaf (no left and no right child), check if `node.val == current_target`.',
    'Recursively check if `hasPathSum(node.left, target - node.val) || hasPathSum(node.right, target - node.val)`.'
  ],

  // --- Topic: Dynamic Programming (12) ---
  'dp-001': [
    'To reach step n, you can either take 1 step from step n - 1 or 2 steps from step n - 2.',
    'The recurrence relation is `dp[n] = dp[n - 1] + dp[n - 2]`, mirroring Fibonacci numbers.',
    'Optimize space to O(1) by maintaining only the previous two step values.'
  ],
  'dp-002': [
    'At house i, choose between robbing it (nums[i] + max profit from house i - 2) or skipping it (max profit from house i - 1).',
    'Recurrence: `dp[i] = max(dp[i - 1], dp[i - 2] + nums[i])`.',
    'Maintain only two variables (prev1 and prev2) for O(1) auxiliary space.'
  ],
  'dp-003': [
    'Because houses are arranged in a circle, the first and last houses cannot both be robbed.',
    'Decompose into two independent linear subproblems: `rob(nums[0..n-2])` and `rob(nums[1..n-1])`.',
    'Return the maximum of the two results.'
  ],
  'dp-004': [
    'Let `dp[a]` represent the minimum number of coins needed to make amount `a`.',
    'Initialize `dp` array of size `amount + 1` with Infinity and set `dp[0] = 0`.',
    'For each amount from 1 to target and for each coin: if coin <= amount, update `dp[amount] = min(dp[amount], 1 + dp[amount - coin])`.'
  ],
  'dp-005': [
    'Let `dp[i]` be the length of the longest increasing subsequence ending at index i.',
    'Initialize all `dp[i] = 1`. For every earlier j < i where nums[j] < nums[i], update `dp[i] = max(dp[i], dp[j] + 1)`.',
    'For O(n log n) time complexity, maintain an array of smallest tail values using binary search (patience sorting).'
  ],
  'dp-006': [
    'Partitioning into two equal subsets requires finding a subset that sums to `total_sum / 2`.',
    'If total_sum is odd, return false immediately.',
    'Use 0/1 Knapsack DP: let `dp[s]` be boolean whether subset sum s is achievable; iterate backwards to ensure each element is used at most once.'
  ],
  'dp-007': [
    'Let `dp[i]` be the number of ways to decode substring s[0..i].',
    'A single digit s[i] is valid if s[i] != \'0\' (contributes dp[i - 1]).',
    'Two digits s[i-1..i] are valid if "10" <= s[i-1..i] <= "26" (contributes dp[i - 2]).'
  ],
  'dp-008': [
    'To reach grid cell (r, c), a robot can only move from cell above (r - 1, c) or cell to the left (r, c - 1).',
    'Recurrence: `dp[r][c] = dp[r - 1][c] + dp[r][c - 1]`.',
    'Initialize the top row and left column to 1, and compute entries row by row.'
  ],
  'dp-009': [
    'To find the minimum path sum to cell (r, c), add grid[r][c] to the minimum of paths from above or from left.',
    'Recurrence: `grid[r][c] += min(grid[r - 1][c], grid[r][c - 1])`.',
    'Initialize the first row and column by cumulative sums and update grid in place.'
  ],
  'dp-010': [
    'Let `dp[i][j]` be the length of Longest Common Subsequence between prefixes text1[0..i-1] and text2[0..j-1].',
    'If text1[i - 1] == text2[j - 1], `dp[i][j] = 1 + dp[i - 1][j - 1]`.',
    'Otherwise, take the maximum from skipping a character: `dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])`.'
  ],
  'dp-011': [
    'Let `dp[i]` be true if prefix substring s[0..i] can be segmented into dictionary words.',
    'Set `dp[0] = true` for the empty string.',
    'For each i from 1 to s.length: check all j < i; if `dp[j]` is true and `wordDict` contains s[j..i], set `dp[i] = true`.'
  ],
  'dp-012': [
    'Let P be sum of positive numbers and N be sum of negative numbers: `P - N = target` and `P + N = total_sum`.',
    'Adding equations gives `2P = target + total_sum => P = (target + total_sum) / 2`.',
    'If target + total_sum is odd or target > total_sum, return 0; otherwise count subsets with sum P using standard 0/1 knapsack DP.'
  ]
};

function generateHintsForProblem(p) {
  if (CURATED_HINTS[p.id]) {
    return CURATED_HINTS[p.id];
  }
  throw new Error(`Missing curated hints for problem ${p.id}`);
}

for (let i = 1; i <= 4; i++) {
  const problems = readBatch(i);
  for (const p of problems) {
    p.hints = generateHintsForProblem(p);
  }
  writeBatch(i, problems);
  console.log(`Updated batch ${i} with ${problems.length} problems`);
}

console.log('All 80 practice problems updated with curated progressive hints!');

module.exports = { CURATED_HINTS };
