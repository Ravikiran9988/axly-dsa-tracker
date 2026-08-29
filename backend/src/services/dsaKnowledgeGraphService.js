const fs = require('fs');
const path = require('path');

const TOPICS_PATH = path.join(__dirname, '..', 'db', 'data', 'topics.json');
const PATTERNS_PATH = path.join(__dirname, '..', 'db', 'data', 'patterns.json');

let topicsCache = [];
let patternsCache = [];

try {
  topicsCache = JSON.parse(fs.readFileSync(TOPICS_PATH, 'utf8'));
} catch (_) {
  topicsCache = [
    { id: 'arrays', name: 'Arrays', category: 'Core' },
    { id: 'strings', name: 'Strings', category: 'Core' },
    { id: 'hashing', name: 'Hashing', category: 'Core' },
    { id: 'two-pointers-sliding-window', name: 'Two Pointers / Sliding Window', category: 'Core' },
    { id: 'stack', name: 'Stack', category: 'Core' },
    { id: 'binary-search', name: 'Binary Search', category: 'Core' },
    { id: 'trees', name: 'Trees', category: 'Trees' },
    { id: 'dynamic-programming', name: 'Dynamic Programming', category: 'Advanced' },
    { id: 'graphs', name: 'Graphs', category: 'Graphs' }
  ];
}

try {
  patternsCache = JSON.parse(fs.readFileSync(PATTERNS_PATH, 'utf8'));
} catch (_) {
  patternsCache = [
    { id: 'two-pointers', name: 'Two Pointers', applicableTopics: ['arrays', 'strings', 'two-pointers-sliding-window'] },
    { id: 'sliding-window', name: 'Sliding Window', applicableTopics: ['strings', 'arrays', 'two-pointers-sliding-window'] },
    { id: 'hash-map-lookup', name: 'Hash Map Lookup', applicableTopics: ['hashing', 'arrays', 'strings'] },
    { id: 'binary-search', name: 'Binary Search', applicableTopics: ['binary-search', 'arrays'] },
    { id: 'tree-dfs', name: 'Tree DFS', applicableTopics: ['trees', 'binary-trees'] },
    { id: '1d-dp', name: '1D DP', applicableTopics: ['dynamic-programming'] }
  ];
}

// Canonical Data Structures and Algorithms mapping for Knowledge Graph
const DATA_STRUCTURES_MAP = {
  arrays: { name: 'Array / Dynamic Array', category: 'Linear', access: 'O(1)', search: 'O(N)' },
  strings: { name: 'String / Byte Array', category: 'Linear', access: 'O(1)', search: 'O(N)' },
  hashing: { name: 'Hash Table / Hash Map', category: 'Associative', lookup: 'O(1)', insert: 'O(1)' },
  'two-pointers-sliding-window': { name: 'Contiguous Subarray / Window', category: 'Linear Array Indexing' },
  stack: { name: 'LIFO Stack', category: 'Linear', pushPop: 'O(1)' },
  'binary-search': { name: 'Sorted Array / Monotonic Search Space', category: 'Search Structure' },
  trees: { name: 'Binary Tree / Binary Search Tree (BST)', category: 'Hierarchical', height: 'O(log N) to O(N)' },
  'binary-trees': { name: 'Binary Tree', category: 'Hierarchical' },
  'dynamic-programming': { name: 'State DP Table / Memoization Cache', category: 'Tabulation & Memo' },
  graphs: { name: 'Adjacency List / Adjacency Matrix', category: 'Non-Linear Graph' },
  'heap-priority-queue': { name: 'Binary Min/Max Heap', category: 'Tree-based Priority Queue', top: 'O(1)', push: 'O(log N)' },
  'linked-list': { name: 'Singly / Doubly Linked List', category: 'Linear Linked' },
  tries: { name: 'Prefix Tree / Trie', category: 'Tree-based Lexicographical' }
};

const PATTERN_ALGORITHM_MAP = {
  'hash-map-lookup': {
    algorithm: 'One-Pass Hash Table Complement Lookup',
    timeComplexity: 'O(N)',
    spaceComplexity: 'O(N)',
    coreConcept: 'Trade auxiliary space for instant constant-time element lookup and complement verification.'
  },
  'two-pointers': {
    algorithm: 'Two Pointers (Converging / Diverging)',
    timeComplexity: 'O(N)',
    spaceComplexity: 'O(1)',
    coreConcept: 'Traverse monotonic or sorted sequences from opposite ends to eliminate quadratic iterations.'
  },
  'sliding-window': {
    algorithm: 'Dynamic / Fixed Size Sliding Window',
    timeComplexity: 'O(N)',
    spaceComplexity: 'O(1) to O(K)',
    coreConcept: 'Expand right pointer to satisfy invariant; shrink left pointer to restore validity.'
  },
  'monotonic-stack': {
    algorithm: 'Monotonic Stack Traversal',
    timeComplexity: 'O(N)',
    spaceComplexity: 'O(N)',
    coreConcept: 'Maintain monotonic order of elements in stack to resolve next-greater/smaller queries in linear time.'
  },
  'binary-search': {
    algorithm: 'Divide and Conquer Binary Search',
    timeComplexity: 'O(log N)',
    spaceComplexity: 'O(1)',
    coreConcept: 'Halve the monotonic search interval at each step by inspecting the midpoint.'
  },
  'tree-dfs': {
    algorithm: 'Recursive / Iterative Depth First Search',
    timeComplexity: 'O(N)',
    spaceComplexity: 'O(H)',
    coreConcept: 'Traverse subtree hierarchies using preorder, inorder, or postorder recursion.'
  },
  'tree-bfs': {
    algorithm: 'Queue-based Level Order Traversal',
    timeComplexity: 'O(N)',
    spaceComplexity: 'O(W)',
    coreConcept: 'Use FIFO queue to process tree nodes level by level.'
  },
  '1d-dp': {
    algorithm: '1D Dynamic Programming (Memoization / Tabulation)',
    timeComplexity: 'O(N)',
    spaceComplexity: 'O(N) or O(1)',
    coreConcept: 'Break problem into overlapping subproblems with optimal substructure; store states.'
  },
  '2d-dp': {
    algorithm: '2D Grid / Matrix Dynamic Programming',
    timeComplexity: 'O(M * N)',
    spaceComplexity: 'O(M * N) or O(N)',
    coreConcept: 'Compute optimal decisions across two dimensions (e.g. grid paths, string edit distance).'
  },
  'bfs-shortest-path': {
    algorithm: 'Unweighted BFS Shortest Path',
    timeComplexity: 'O(V + E)',
    spaceComplexity: 'O(V)',
    coreConcept: 'First time a node is visited in standard BFS represents the minimum distance.'
  },
  dijkstra: {
    algorithm: "Dijkstra's Priority Queue Shortest Path",
    timeComplexity: 'O((V + E) log V)',
    spaceComplexity: 'O(V)',
    coreConcept: 'Greedily extract the lowest-cost vertex from min-heap to resolve non-negative weighted graphs.'
  }
};

const TOPIC_PREREQUISITES_MAP = {
  arrays: ['Variables', 'Indexing', 'Loops'],
  strings: ['Character Encoding', 'String Immutability', 'Arrays'],
  hashing: ['Arrays', 'Hash Function Concepts', 'Collision Resolution'],
  'two-pointers-sliding-window': ['Arrays', 'Two Pointers Basics', 'Index Bounds'],
  stack: ['Array Basics', 'LIFO Behavior', 'Function Call Stack'],
  'binary-search': ['Arrays', 'Sorting', 'Midpoint Calculation'],
  trees: ['Recursion', 'Pointers / References', 'Stack Concept'],
  'dynamic-programming': ['Recursion', 'Memoization', 'Overlapping Subproblems', 'Optimal Substructure'],
  graphs: ['Trees', 'Recursion', 'Queue / Stack', 'Adjacency Representations'],
  'heap-priority-queue': ['Binary Trees', 'Array Representation of Trees', 'Complete Binary Tree']
};

class DsaKnowledgeGraphService {
  /**
   * Find topic entity in controlled taxonomy
   */
  findTopic(topicIdOrName) {
    if (!topicIdOrName) return null;
    const query = String(topicIdOrName).trim().toLowerCase();
    return topicsCache.find(t => 
      t.id.toLowerCase() === query || 
      t.name.toLowerCase() === query ||
      query.includes(t.name.toLowerCase()) ||
      query.includes(t.id.toLowerCase())
    ) || null;
  }

  /**
   * Find pattern entity in controlled taxonomy
   */
  findPattern(patternIdOrName) {
    if (!patternIdOrName) return null;
    const query = String(patternIdOrName).trim().toLowerCase();
    return patternsCache.find(p => 
      p.id.toLowerCase() === query || 
      p.name.toLowerCase() === query ||
      query.includes(p.name.toLowerCase()) ||
      query.includes(p.id.toLowerCase())
    ) || null;
  }

  /**
   * Retrieve list of all valid topic names
   */
  getAllTopics() {
    return topicsCache.map(t => ({ id: t.id, name: t.name, category: t.category || 'Core' }));
  }

  /**
   * Retrieve list of all valid pattern names
   */
  getAllPatterns() {
    return patternsCache.map(p => ({ id: p.id, name: p.name, applicableTopics: p.applicableTopics || [] }));
  }

  /**
   * Build structured Knowledge Graph context chain
   */
  getGraphContext(topicInput, patternInput, matchedProblem = null) {
    const contextNodes = [];

    const topic = this.findTopic(topicInput || matchedProblem?.topic_id || matchedProblem?.topic);
    const pattern = this.findPattern(patternInput || matchedProblem?.pattern_id || matchedProblem?.pattern);

    // 1. Problem node
    if (matchedProblem) {
      contextNodes.push({
        entity: 'Problem',
        name: matchedProblem.title || matchedProblem.name,
        id: matchedProblem.id,
        difficulty: matchedProblem.difficulty,
        type: 'problem'
      });
    }

    // 2. Topic node
    if (topic) {
      contextNodes.push({
        entity: 'Topic',
        id: topic.id,
        name: topic.name,
        category: topic.category || 'Core',
        type: 'topic'
      });
    }

    // 3. Pattern node
    if (pattern) {
      contextNodes.push({
        entity: 'Pattern',
        id: pattern.id,
        name: pattern.name,
        type: 'pattern'
      });
    }

    // 4. Data Structure node
    const topicKey = topic?.id || 'arrays';
    const dsInfo = DATA_STRUCTURES_MAP[topicKey] || { name: topic?.name ? `${topic.name} Structure` : 'Linear Memory' };
    contextNodes.push({
      entity: 'DataStructure',
      name: dsInfo.name,
      category: dsInfo.category || 'Primary',
      type: 'data_structure'
    });

    // 5. Algorithm node
    const patternKey = pattern?.id || 'hash-map-lookup';
    const algoInfo = PATTERN_ALGORITHM_MAP[patternKey] || {
      algorithm: pattern?.name ? `${pattern.name} Technique` : 'Deterministic Search',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(1) to O(N)'
    };
    contextNodes.push({
      entity: 'Algorithm',
      name: algoInfo.algorithm,
      timeComplexity: algoInfo.timeComplexity,
      spaceComplexity: algoInfo.spaceComplexity,
      coreConcept: algoInfo.coreConcept || null,
      type: 'algorithm'
    });

    // 6. Prerequisites
    const prerequisites = (matchedProblem?.prerequisites && matchedProblem.prerequisites.length)
      ? matchedProblem.prerequisites 
      : (TOPIC_PREREQUISITES_MAP[topicKey] || ['Basic Programming', 'Complexity Analysis']);

    contextNodes.push({
      entity: 'Prerequisites',
      items: prerequisites,
      type: 'prerequisites'
    });

    return {
      nodes: contextNodes,
      topic: topic ? topic.name : 'General DSA',
      topicId: topic ? topic.id : 'general-dsa',
      pattern: pattern ? pattern.name : (algoInfo.algorithm || 'General Technique'),
      patternId: pattern ? pattern.id : 'general-pattern',
      dataStructure: dsInfo.name,
      algorithm: algoInfo.algorithm,
      timeComplexity: algoInfo.timeComplexity || 'O(N)',
      spaceComplexity: algoInfo.spaceComplexity || 'O(1)',
      prerequisites
    };
  }
}

module.exports = new DsaKnowledgeGraphService();
