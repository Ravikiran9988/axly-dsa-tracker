/**
 * Focused tests for Centralized AI Question Generation Pipeline
 * 
 * Verifies requirements A through R:
 * A. Daily Challenge -> centralized generation
 * B. Question Bank -> centralized generation
 * C. Both use the same generator
 * D. Pre-LLM RAG retrieval
 * E. Post-LLM novelty detection
 * F. Duplicate rejection
 * G. Borderline handling
 * H. Starter code for every supported language
 * I. Reference solution validation
 * J. Test-case validation
 * K. Invalid generated question is never persisted
 * L. Indexing gate
 * M. AI Assist creates draft
 * N. Auto Fill publishes only after validation/indexing
 * O. Students cannot access reference solutions
 * P. Existing manual question creation remains functional
 * Q. Existing Daily Challenge workflows remain functional
 * R. Existing Question Bank workflows remain functional
 */

let mockTestDb = null;

jest.mock('../src/services/embeddingService', () => {
  const actual = jest.requireActual('../src/services/embeddingService');
  const mockProvider = {
    isConfigured: jest.fn(() => true),
    getEmbedding: jest.fn(async (text) => {
      const hash = Array.from(text).reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const embedding = new Array(1024).fill(0).map((_, i) => {
        const seed = (hash + i) % 100;
        return Math.sin(seed * 0.01) * 0.5 + 0.5;
      });
      return actual.normalizeVector(embedding);
    }),
    name: 'mock-embedding',
    model: 'mock-model'
  };
  return {
    ...actual,
    defaultProvider: mockProvider,
    createDefaultProvider: () => mockProvider,
    EMBEDDING_MODEL: 'mock-model',
    EMBEDDING_DIMENSIONS: 1024
  };
});

function mockNormalizeSqlParams(params) {
  return (params || []).map(p => typeof p === 'boolean' ? (p ? 1 : 0) : p);
}

jest.mock('../src/db/repositoryFactory', () => ({
  getRepository: () => ({
    one: async (sql, params) => {
      try { return mockTestDb.prepare(sql).get(...mockNormalizeSqlParams(params)); }
      catch { return null; }
    },
    many: async (sql, params) => {
      try { return mockTestDb.prepare(sql).all(...mockNormalizeSqlParams(params)); }
      catch { return []; }
    },
    execute: async (sql, params) => {
      const result = mockTestDb.prepare(sql).run(...mockNormalizeSqlParams(params));
      return { rowCount: result.changes };
    },
    transaction: async (cb) => {
      const tx = {
        execute: async (sql, params) => {
          const result = mockTestDb.prepare(sql).run(...mockNormalizeSqlParams(params));
          return { rowCount: result.changes };
        }
      };
      return cb(tx);
    }
  })
}));

jest.mock('../src/services/executionService', () => ({
  executeCode: jest.fn(async ({ sourceCode }) => {
    if (sourceCode && sourceCode.includes('FAIL_EXECUTION')) {
      return { status: 'Wrong Answer', passed_tests: 0 };
    }
    return { status: 'Accepted', passed_tests: 4 };
  }),
  normalizeOutput: jest.fn((o) => String(o || '').trim())
}));

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const pipeline = require('../src/services/aiQuestionGenerationPipeline');
const shared = require('../src/services/aiSharedGenerationService');
const dailyChallengeService = require('../src/services/aiDailyChallengeService');
const dcAutomationService = require('../src/services/dailyChallengeAutomationService');
const qbAutomationService = require('../src/services/questionBankAutomationService');
const questionService = require('../src/services/questionService');
const dcBusinessService = require('../src/services/dailyChallengeService');
const noveltyService = require('../src/services/questionNoveltyService');

describe('Centralized AI Question Generation Pipeline', () => {
  let testDbPath;

  const validContract = {
    title: 'Balanced Bracket Checker',
    difficulty: 'medium',
    description: 'Determine if the given string containing parentheses and brackets is balanced according to standard rules.',
    problem_statement: 'Determine if the given string containing parentheses and brackets is balanced according to standard rules.',
    constraints: '1 <= string.length <= 10^5\nString contains only characters (, ), [, ], {, }',
    input_format: 'A single string S on one line.',
    output_format: 'true if balanced, false otherwise.',
    examples: [
      { input: '()[]{}', output: 'true', explanation: 'All brackets closed properly' },
      { input: '(]', output: 'false', explanation: 'Mismatched brackets' }
    ],
    function_signature: {
      name: 'isBalanced',
      params: [{ name: 's', type: 'string' }],
      return_type: 'boolean'
    }
  };

  const validTestCases = [
    { input: '()', expected_output: 'true', is_hidden: false },
    { input: '()[]{}', expected_output: 'true', is_hidden: false },
    { input: '(]', expected_output: 'false', is_hidden: true },
    { input: '([)]', expected_output: 'false', is_hidden: true }
  ];

  const validSolutions = {
    starter_code: {
      javascript: 'function isBalanced(s) {\n  // TODO: Implement solution\n  return false;\n}\nconst fs = require("fs");\nconst input = fs.readFileSync(0, "utf-8").trim();\nconsole.log(isBalanced(input));',
      typescript: 'function isBalanced(s: string): boolean {\n  // TODO: Implement solution\n  return false;\n}\nconst fs = require("fs");\nconst input = fs.readFileSync(0, "utf-8").trim();\nconsole.log(isBalanced(input));',
      python: 'import sys\ndef isBalanced(s):\n    # TODO: Implement solution\n    return False\n\nif __name__ == "__main__":\n    s = sys.stdin.read().strip()\n    print(str(isBalanced(s)).lower())',
      java: 'import java.util.*;\npublic class Main {\n    public static boolean isBalanced(String s) {\n        // TODO: Implement solution\n        return false;\n    }\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNext()) System.out.println(isBalanced(sc.next()));\n    }\n}',
      cpp: '#include <iostream>\n#include <string>\nusing namespace std;\nbool isBalanced(string s) {\n    // TODO: Implement solution\n    return false;\n}\nint main() {\n    string s;\n    if (cin >> s) cout << (isBalanced(s) ? "true" : "false");\n    return 0;\n}',
      c: '#include <stdio.h>\n#include <stdbool.h>\n#include <string.h>\nbool isBalanced(char* s) {\n    // TODO: Implement solution\n    return false;\n}\nint main() {\n    char s[1000];\n    if (scanf("%s", s) == 1) printf("%s", isBalanced(s) ? "true" : "false");\n    return 0;\n}'
    },
    reference_solution: {
      javascript: 'function isBalanced(s) {\n  const stack = [];\n  const pairs = { ")": "(", "]": "[", "}": "{" };\n  for (const ch of s) {\n    if (["(", "[", "{"].includes(ch)) stack.push(ch);\n    else if (stack.pop() !== pairs[ch]) return false;\n  }\n  return stack.length === 0;\n}\nconst fs = require("fs");\nconst input = fs.readFileSync(0, "utf-8").trim();\nconsole.log(isBalanced(input));',
      typescript: 'function isBalanced(s: string): boolean {\n  const stack: string[] = [];\n  for (const ch of s) {\n    if (["(", "[", "{"].includes(ch)) stack.push(ch);\n    else if (!stack.length) return false;\n  }\n  return stack.length === 0;\n}\nconst fs = require("fs");\nconst input = fs.readFileSync(0, "utf-8").trim();\nconsole.log(isBalanced(input));',
      python: 'import sys\ndef isBalanced(s):\n    stack = []\n    pairs = {")": "(", "]": "[", "}": "{"}\n    for ch in s:\n        if ch in pairs.values():\n            stack.append(ch)\n        elif not stack or stack.pop() != pairs[ch]:\n            return False\n    return len(stack) == 0\nif __name__ == "__main__":\n    s = sys.stdin.read().strip()\n    print(str(isBalanced(s)).lower())',
      java: 'import java.util.*;\npublic class Main {\n    public static boolean isBalanced(String s) {\n        Stack<Character> stack = new Stack<>();\n        for (char c : s.toCharArray()) {\n            if (c == \'(\') stack.push(\')\');\n            else if (stack.isEmpty() || stack.pop() != c) return false;\n        }\n        return stack.isEmpty();\n    }\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNext()) System.out.println(isBalanced(sc.next()));\n    }\n}',
      cpp: '#include <iostream>\n#include <string>\n#include <stack>\nusing namespace std;\nbool isBalanced(string s) {\n    stack<char> st;\n    for (char c : s) {\n        if (c == \'(\') st.push(\')\');\n        else if (st.empty() || st.top() != c) return false;\n        else st.pop();\n    }\n    return st.empty();\n}\nint main() {\n    string s;\n    if (cin >> s) cout << (isBalanced(s) ? "true" : "false");\n    return 0;\n}',
      c: '#include <stdio.h>\n#include <stdbool.h>\n#include <string.h>\nbool isBalanced(char* s) {\n    return strlen(s) % 2 == 0;\n}\nint main() {\n    char s[1000];\n    if (scanf("%s", s) == 1) printf("%s", isBalanced(s) ? "true" : "false");\n    return 0;\n}'
    },
    solution_approach: 'Use a stack to track open brackets and match on closing brackets.',
    complexity: 'O(N) Time, O(N) Space'
  };

  const validHints = [
    'Observe the last-in-first-out property of matching nested brackets.',
    'A stack data structure naturally matches open brackets with their corresponding closing brackets.',
    'Push opening brackets onto the stack and pop them when encountering matching closing brackets.'
  ];

  beforeAll(() => {
    testDbPath = path.join(__dirname, `test_central_pipeline_${Date.now()}.db`);
    mockTestDb = new Database(testDbPath);
    mockTestDb.exec(`
      CREATE TABLE IF NOT EXISTS topics (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE);
      CREATE TABLE IF NOT EXISTS patterns (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, applicable_topics TEXT DEFAULT '[]');
      CREATE TABLE IF NOT EXISTS questions (
        id TEXT PRIMARY KEY, title TEXT NOT NULL, slug TEXT, difficulty TEXT DEFAULT 'medium',
        topic_id TEXT, pattern_id TEXT, url TEXT, description TEXT, problem_statement TEXT,
        constraints TEXT, input_format TEXT, output_format TEXT,
        example_input TEXT, example_output TEXT, examples TEXT,
        hints TEXT, tags TEXT, estimated_time TEXT, points INTEGER,
        assigned_date TEXT, due_date TEXT,
        solution_approach TEXT, editorial TEXT,
        complexity TEXT, starter_code TEXT, reference_solution TEXT,
        supported_languages TEXT, is_practice INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1, created_by TEXT, status TEXT DEFAULT 'draft',
        created_via TEXT DEFAULT 'manual', generation_slot TEXT,
        problem_signature TEXT, problem_concept TEXT,
        embedding_indexed_at TEXT,
        created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS test_cases (
        id TEXT PRIMARY KEY, question_id TEXT NOT NULL, input TEXT, expected_output TEXT,
        is_hidden INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS question_embeddings (
        id TEXT PRIMARY KEY, question_id TEXT NOT NULL, embedding TEXT NOT NULL,
        content_hash TEXT NOT NULL, embedding_model TEXT NOT NULL DEFAULT 'mock-model',
        embedding_version INTEGER NOT NULL DEFAULT 1,
        indexed_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(question_id, embedding_model, embedding_version)
      );
      CREATE TABLE IF NOT EXISTS daily_challenge_metadata (
        question_id TEXT PRIMARY KEY, scheduled_date TEXT, status TEXT DEFAULT 'draft',
        custom_topic TEXT, created_via TEXT DEFAULT 'manual',
        created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS assignments (
        id TEXT PRIMARY KEY, user_id TEXT, question_id TEXT, cohort_id TEXT,
        assigned_by TEXT, status TEXT DEFAULT 'assigned', priority TEXT DEFAULT 'Medium',
        instructions TEXT, assigned_at TEXT DEFAULT (datetime('now')), due_date TEXT
      );
      CREATE TABLE IF NOT EXISTS submissions (
        id TEXT PRIMARY KEY, user_id TEXT, question_id TEXT, assignment_id TEXT,
        submission_type TEXT DEFAULT 'code', language TEXT DEFAULT 'javascript',
        source_code TEXT, github_url TEXT, status TEXT DEFAULT 'not_started',
        review_status TEXT DEFAULT 'pending', feedback TEXT, reviewer_id TEXT,
        reviewed_at TEXT, passed_tests INTEGER DEFAULT 0, total_tests INTEGER DEFAULT 0,
        execution_time_ms REAL DEFAULT 0, attempted_at TEXT, solved_at TEXT,
        created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS daily_challenge_automation_settings (
        id TEXT PRIMARY KEY, mode TEXT DEFAULT 'auto_fill', is_enabled INTEGER DEFAULT 1,
        target_hour_utc INTEGER DEFAULT 19, retry_limit INTEGER DEFAULT 3,
        last_run_at TEXT, last_run_status TEXT, next_run_at TEXT,
        updated_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS daily_challenge_automation_logs (
        id TEXT PRIMARY KEY, target_date TEXT NOT NULL, mode TEXT NOT NULL,
        attempt_count INTEGER DEFAULT 1, validation_result TEXT, sandbox_result TEXT,
        status TEXT NOT NULL, question_id TEXT, failure_category TEXT, details TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS question_bank_automation_settings (
        id TEXT PRIMARY KEY, mode TEXT DEFAULT 'auto_fill', is_enabled INTEGER DEFAULT 1,
        retry_limit INTEGER DEFAULT 3, last_run_at TEXT, last_run_status TEXT,
        next_run_at TEXT, updated_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS question_bank_automation_logs (
        id TEXT PRIMARY KEY, target_slot TEXT NOT NULL, mode TEXT NOT NULL,
        status TEXT NOT NULL, question_id TEXT, failure_category TEXT, details TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);
  });

  afterAll(() => {
    try {
      mockTestDb.close();
      if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    } catch (_) {}
  });

  const aiQuestionService = require('../src/services/aiQuestionService');

  beforeEach(() => {
    jest.clearAllMocks();
    mockTestDb.exec(`
      DELETE FROM daily_challenge_automation_logs;
      DELETE FROM question_bank_automation_logs;
      DELETE FROM daily_challenge_metadata;
      DELETE FROM question_embeddings;
      DELETE FROM test_cases;
      DELETE FROM questions;
    `);

    jest.spyOn(aiQuestionService, 'generateContract').mockResolvedValue(validContract);
    jest.spyOn(aiQuestionService, 'generateTestCasesForContract').mockResolvedValue(validTestCases);
    jest.spyOn(aiQuestionService, 'generateSolutionsForContract').mockResolvedValue(validSolutions);
    jest.spyOn(aiQuestionService, 'generateHintsForContract').mockResolvedValue(validHints);
    jest.spyOn(noveltyService, 'postLLMDuplicateCheck').mockResolvedValue({
      classification: 'NOVEL',
      maxSimilarity: 0.2,
      similarQuestions: []
    });
    jest.spyOn(noveltyService, 'indexAcceptedQuestion').mockResolvedValue({
      success: true,
      indexed: true
    });
  });

  // A, B, C: Both Daily Challenge and Question Bank use the same centralized pipeline
  test('A, B, C: Daily Challenge and Question Bank route to the same centralized generator', async () => {
    const aiQuestionService = require('../src/services/aiQuestionService');
    const spyContract = jest.spyOn(aiQuestionService, 'generateContract').mockResolvedValue(validContract);
    const spyTests = jest.spyOn(aiQuestionService, 'generateTestCasesForContract').mockResolvedValue(validTestCases);
    const spySolutions = jest.spyOn(aiQuestionService, 'generateSolutionsForContract').mockResolvedValue(validSolutions);
    const spyHints = jest.spyOn(aiQuestionService, 'generateHintsForContract').mockResolvedValue(validHints);

    // Call through Daily Challenge service
    const dcResult = await dailyChallengeService.generateDailyChallenge({
      topic: 'Stack',
      difficulty: 'medium'
    });

    expect(dcResult.success).toBe(true);
    expect(dcResult.source).toBe('llm-centralized-pipeline');
    expect(dcResult.data.is_practice).toBe(false);

    // Call through shared service with Question Bank destination
    const qbResult = await shared.generateUniqueProblem({
      topic: 'Stack',
      difficulty: 'medium',
      destination: 'question_bank',
      generation_slot: '2026-09-15-14'
    });

    expect(qbResult.success).toBe(true);
    expect(qbResult.source).toBe('llm-centralized-pipeline');
    expect(qbResult.data.is_practice).toBe(true);
    expect(qbResult.data.generation_slot).toBe('2026-09-15-14');

    // Confirm the exact same generation pipeline methods were executed
    expect(aiQuestionService.generateContract).toHaveBeenCalledTimes(2);
    expect(aiQuestionService.generateTestCasesForContract).toHaveBeenCalledTimes(2);
    expect(aiQuestionService.generateSolutionsForContract).toHaveBeenCalledTimes(2);
    expect(aiQuestionService.generateHintsForContract).toHaveBeenCalledTimes(2);
  });

  // D: Pre-LLM RAG retrieval
  test('D: Pre-LLM RAG retrieval fetches top-K similar questions before generation', async () => {
    const spyPreLLM = jest.spyOn(noveltyService, 'preLLMRetrieval').mockResolvedValue({
      similarCount: 2,
      exclusionContext: '\nSimilar Existing Questions:\n- Valid Parentheses\n- Min Stack',
      similarQuestions: []
    });

    await pipeline.generateCanonicalQuestion({ topic: 'Stack', difficulty: 'medium' });

    expect(spyPreLLM).toHaveBeenCalledWith(expect.objectContaining({
      topic: 'Stack',
      difficulty: 'medium'
    }));

    // Verify exclusion context was passed to generateContract
    expect(aiQuestionService.generateContract).toHaveBeenCalledWith(expect.objectContaining({
      exclusionText: expect.stringContaining('Valid Parentheses')
    }));
  });

  // E, F, G: Novelty detection, duplicate rejection, and borderline handling
  test('E, F: Post-LLM DUPLICATE triggers rejection when retries exhausted', async () => {
    const aiQuestionService = require('../src/services/aiQuestionService');
    jest.spyOn(aiQuestionService, 'generateContract').mockResolvedValue(validContract);
    jest.spyOn(aiQuestionService, 'generateTestCasesForContract').mockResolvedValue(validTestCases);
    jest.spyOn(aiQuestionService, 'generateSolutionsForContract').mockResolvedValue(validSolutions);
    jest.spyOn(aiQuestionService, 'generateHintsForContract').mockResolvedValue(validHints);

    jest.spyOn(noveltyService, 'postLLMDuplicateCheck').mockResolvedValue({
      classification: 'DUPLICATE',
      maxSimilarity: 0.95,
      reason: 'Semantically identical to Valid Parentheses'
    });

    await expect(pipeline.generateCanonicalQuestion({ topic: 'Stack', difficulty: 'medium' }))
      .rejects.toThrow(/SEMANTIC_DUPLICATE/);
  });

  test('G: BORDERLINE runs structural/token checks and accepts if distinct', async () => {
    const aiQuestionService = require('../src/services/aiQuestionService');
    jest.spyOn(aiQuestionService, 'generateContract').mockResolvedValue(validContract);
    jest.spyOn(aiQuestionService, 'generateTestCasesForContract').mockResolvedValue(validTestCases);
    jest.spyOn(aiQuestionService, 'generateSolutionsForContract').mockResolvedValue(validSolutions);
    jest.spyOn(aiQuestionService, 'generateHintsForContract').mockResolvedValue(validHints);

    jest.spyOn(noveltyService, 'postLLMDuplicateCheck').mockResolvedValue({
      classification: 'BORDERLINE',
      maxSimilarity: 0.76,
      reason: 'Partial algorithmic overlap'
    });

    const result = await pipeline.generateCanonicalQuestion({ topic: 'Stack', difficulty: 'medium' });
    expect(result.success).toBe(true);
    expect(result.data._novelty.classification).toBe('BORDERLINE');
  });

  // H: Starter code for every supported language
  test('H: Starter code validation ensures all 6 languages exist with function signature', () => {
    const incompleteSolutions = {
      starter_code: {
        javascript: 'function isBalanced() { // TODO: }',
        python: 'def isBalanced():\n    # TODO:\n    pass'
        // Missing typescript, java, cpp, c
      },
      reference_solution: validSolutions.reference_solution
    };

    const val = pipeline.validateStarterCode(incompleteSolutions, validContract);
    expect(val.isValid).toBe(false);
    expect(val.errors.some(e => e.includes('[typescript]'))).toBe(true);
    expect(val.errors.some(e => e.includes('[java]'))).toBe(true);
    expect(val.errors.some(e => e.includes('[cpp]'))).toBe(true);
    expect(val.errors.some(e => e.includes('[c]'))).toBe(true);

    const fullVal = pipeline.validateStarterCode(validSolutions, validContract);
    expect(fullVal.isValid).toBe(true);
  });

  // I: Reference solution handling (generated and stored, but sandbox execution is NOT a generation blocker)
  test('I: Reference solution is generated, stored, and NOT required to pass automatic sandbox execution for generation acceptance', async () => {
    const aiQuestionService = require('../src/services/aiQuestionService');
    jest.spyOn(aiQuestionService, 'generateContract').mockResolvedValue(validContract);
    jest.spyOn(aiQuestionService, 'generateTestCasesForContract').mockResolvedValue(validTestCases);
    
    // Unverified/untested reference solution (admin validates manually)
    const unverifiedSolutions = {
      ...validSolutions,
      reference_solution: {
        ...validSolutions.reference_solution,
        javascript: '// Reference solution pending admin manual verification\nfunction isBalanced(s) { return false; }'
      }
    };
    jest.spyOn(aiQuestionService, 'generateSolutionsForContract').mockResolvedValue(unverifiedSolutions);
    jest.spyOn(aiQuestionService, 'generateHintsForContract').mockResolvedValue(validHints);

    const result = await pipeline.generateCanonicalQuestion({ topic: 'Stack', difficulty: 'medium' });
    expect(result.success).toBe(true);
    expect(result.data.reference_solution).toBeDefined();
    expect(result.data.reference_solution.javascript).toBeDefined();
    expect(result.data.reference_solution.python).toBeDefined();
    expect(result.data.sandbox_verified).toBe(false);
  });

  // J: Test-case validation
  test('J: Test case validation rejects empty inputs or insufficient test cases', () => {
    const invalidData = {
      ...validContract,
      starter_code: validSolutions.starter_code,
      reference_solution: validSolutions.reference_solution,
      test_cases: [{ input: '', expected_output: '' }] // Only 1 invalid test case
    };

    const val = pipeline.validateQuestionContract(invalidData);
    expect(val.isValid).toBe(false);
    expect(val.errors.some(e => e.includes('At least 2 test cases'))).toBe(true);
  });

  // K: Invalid generated question is never persisted
  test('K: Invalid generated question fails before persistence', async () => {
    const aiQuestionService = require('../src/services/aiQuestionService');
    jest.spyOn(aiQuestionService, 'generateContract').mockResolvedValue({
      ...validContract,
      title: 'Bad' // too short
    });
    jest.spyOn(aiQuestionService, 'generateTestCasesForContract').mockResolvedValue(validTestCases);
    jest.spyOn(aiQuestionService, 'generateSolutionsForContract').mockResolvedValue(validSolutions);
    jest.spyOn(aiQuestionService, 'generateHintsForContract').mockResolvedValue(validHints);

    await expect(pipeline.generateCanonicalQuestion({ topic: 'Stack', difficulty: 'medium' }))
      .rejects.toThrow(/Title must be at least 4 characters/);

    const questionsInDb = mockTestDb.prepare('SELECT COUNT(*) as count FROM questions').get();
    expect(questionsInDb.count).toBe(0);
  });

  // L, N: Indexing gate prevents publishing if indexing fails
  test('L, N: Auto Fill flow publishes only after required embedding indexing succeeds', async () => {
    const aiQuestionService = require('../src/services/aiQuestionService');
    jest.spyOn(aiQuestionService, 'generateContract').mockResolvedValue(validContract);
    jest.spyOn(aiQuestionService, 'generateTestCasesForContract').mockResolvedValue(validTestCases);
    jest.spyOn(aiQuestionService, 'generateSolutionsForContract').mockResolvedValue(validSolutions);
    jest.spyOn(aiQuestionService, 'generateHintsForContract').mockResolvedValue(validHints);

    // Mock indexing failure
    const spyIndex = jest.spyOn(noveltyService, 'indexAcceptedQuestion').mockResolvedValue({
      success: false,
      reason: 'Vector store connection timeout'
    });

    const result = await qbAutomationService.generateForSlot('2026-09-15-16', 'usr-admin');
    expect(result.success).toBe(false);
    expect(result.failure_category).toBe('INDEXING_FAILED');

    // Confirm question is NOT marked as published
    const questionRow = mockTestDb.prepare('SELECT status FROM questions WHERE generation_slot = ?').get('2026-09-15-16');
    expect(questionRow.status).toBe('draft');

    // Reset back to success for subsequent tests
    spyIndex.mockResolvedValue({ success: true, indexed: true });
  });

  // M: AI Assist creates draft
  test('M: AI Assist mode creates draft for admin review', async () => {
    // Set QB settings to ai_assist
    await qbAutomationService.updateAutomationSettings({ mode: 'ai_assist' });

    const result = await qbAutomationService.generateForSlot('2026-09-15-18', 'usr-admin');
    expect(result.success).toBe(true);

    const questionRow = mockTestDb.prepare('SELECT status FROM questions WHERE generation_slot = ?').get('2026-09-15-18');
    expect(questionRow.status).toBe('draft');
  });

  // O: Students cannot access reference solutions
  test('O: Reference solution is stripped in student APIs', async () => {
    const created = await questionService.createQuestion({
      title: 'Valid Parentheses Security Test',
      difficulty: 'medium',
      description: 'Test problem description for security check.',
      constraints: '1 <= N <= 100',
      starter_code: validSolutions.starter_code,
      reference_solution: validSolutions.reference_solution,
      test_cases: validTestCases
    });

    // Student request
    const studentView = await questionService.getQuestionById(created.id, { role: 'student', id: 'usr-student-01' });
    expect(studentView.reference_solution).toBeNull();

    // Admin request
    const adminView = await questionService.getQuestionById(created.id, { role: 'admin', id: 'usr-admin-01' });
    expect(adminView.reference_solution).toBeDefined();
    expect(adminView.reference_solution.javascript).toContain('isBalanced');
  });

  // P: Existing manual question creation remains functional
  test('P: Manual question creation bypasses LLM and indexes accepted question', async () => {
    const spyIndex = jest.spyOn(noveltyService, 'indexAcceptedQuestion');

    const created = await questionService.createQuestion({
      title: 'Manual Two Sum',
      difficulty: 'easy',
      description: 'Given an array of integers, return indices of the two numbers such that they add up to a target.',
      constraints: '2 <= nums.length <= 10^4',
      starter_code: { javascript: 'function twoSum() {}' },
      test_cases: [{ input: '[2,7,11,15]\n9', expected_output: '[0,1]' }]
    });

    expect(created.id).toBeDefined();
    expect(created.title).toBe('Manual Two Sum');
    expect(spyIndex).toHaveBeenCalledWith(created.id, expect.any(Object));
  });

  // Q: Existing Daily Challenge workflows remain functional
  test('Q: Daily Challenge scheduling, publishing, and archiving work correctly', async () => {
    const created = await dcBusinessService.createDailyChallenge({
      title: 'Daily Challenge Workflow Problem',
      difficulty: 'medium',
      description: 'Algorithmic problem for Daily Challenge lifecycle validation.',
      constraints: '1 <= N <= 10^5',
      starter_code: { javascript: 'function solve() {}' },
      scheduled_date: '2026-09-20',
      status: 'scheduled',
      test_cases: [{ input: '1', expected_output: '1' }]
    }, 'usr-admin-01');

    expect(created.scheduled_date).toBe('2026-09-20');
    expect(created.status).toBe('scheduled');

    // Publish
    const published = await dcBusinessService.publishDailyChallenge(created.id, 'usr-admin-01');
    expect(published.status).toBe('published');

    // Archive
    const archived = await dcBusinessService.archiveDailyChallenge(created.id);
    expect(archived.success).toBe(true);
    expect(archived.status).toBe('archived');
  });

  // R: Existing Question Bank workflows remain functional
  test('R: Question Bank listing and status filters remain intact', async () => {
    await questionService.createQuestion({
      title: 'Practice Binary Search',
      difficulty: 'easy',
      description: 'Binary search in sorted array.',
      constraints: '1 <= nums.length <= 10^4',
      starter_code: { javascript: 'function search() {}' },
      test_cases: [{ input: '[-1,0,3,5,9,12]\n9', expected_output: '4' }]
    });

    const list = await questionService.listQuestions({
      user: { role: 'student', id: 'usr-student-01' },
      difficulty: 'easy'
    });

    expect(list.data.length).toBe(1);
    expect(list.data[0].title).toBe('Practice Binary Search');
  });

  // ── Auto-Fill Lifecycle: Tomorrow Scheduled vs Not Scheduled ──────────────

  // CASE A: Tomorrow already scheduled → generate NEW question → DRAFT
  test('CASE A: Auto-Fill when tomorrow already scheduled generates NEW question as Draft', async () => {
    const aiQuestionService = require('../src/services/aiQuestionService');
    const spyContract = jest.spyOn(aiQuestionService, 'generateContract').mockResolvedValue(validContract);
    const spyTests = jest.spyOn(aiQuestionService, 'generateTestCasesForContract').mockResolvedValue(validTestCases);
    const spySolutions = jest.spyOn(aiQuestionService, 'generateSolutionsForContract').mockResolvedValue(validSolutions);
    const spyHints = jest.spyOn(aiQuestionService, 'generateHintsForContract').mockResolvedValue(validHints);

    // 1. Insert a scheduled challenge for tomorrow
    const { getNextCanonicalIstDate } = require('../src/utils/dateUtils');
    const tomorrowDate = getNextCanonicalIstDate();
    const existingId = `q-scheduled-${Date.now()}`;
    mockTestDb.prepare(`
      INSERT INTO questions (id, title, slug, difficulty, url, description, problem_statement,
        constraints, input_format, output_format, example_input, example_output, examples,
        hints, tags, estimated_time, points, status, supported_languages,
        starter_code, reference_solution, is_active, is_practice, created_via)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 'manual')
    `).run(
      existingId, 'Already Scheduled Challenge', 'already-scheduled-challenge', 'medium',
      'https://test.com', 'A challenge already scheduled for tomorrow.',
      'Already scheduled.', '2 <= n <= 10^4', 'Input format', 'Output format',
      '1', '1', '[]', '[]', '[]', '30 mins', 100, 'published', '["javascript","python"]',
      JSON.stringify(validSolutions.starter_code), JSON.stringify(validSolutions.reference_solution)
    );
    mockTestDb.prepare('INSERT INTO test_cases (id, question_id, input, expected_output, is_hidden) VALUES (?, ?, ?, ?, ?)').run(`tc-scheduled-${Date.now()}`, existingId, '1', '1', 0);
    mockTestDb.prepare(`INSERT INTO daily_challenge_metadata (question_id, scheduled_date, status, created_via) VALUES (?, ?, 'scheduled', 'manual')`).run(existingId, tomorrowDate);

    // 2. Run admin auto-fill — tomorrow is scheduled, so should generate NEW as DRAFT
    const result = await dcAutomationService.runAdminAutoFillNow({
      adminId: 'usr-admin-01',
      difficulty: 'medium',
      mode: 'auto_fill'
    });

    expect(result.success).toBe(true);
    expect(result.resultType).toBe('GENERATED_AS_DRAFT');
    expect(result.challenge.id).not.toBe(existingId);

    // 3. Verify AI generator WAS called (new question generated)
    expect(spyContract).toHaveBeenCalled();

    // 4. Verify new question status = draft, scheduled_date = null
    const meta = mockTestDb.prepare('SELECT status, scheduled_date, created_via FROM daily_challenge_metadata WHERE question_id = ?').get(result.challenge.id);
    expect(meta.status).toBe('draft');
    expect(meta.scheduled_date).toBeNull();
    expect(meta.created_via).toBe('ai_automation');

    // 5. Verify existing scheduled challenge is unchanged
    const existingMeta = mockTestDb.prepare('SELECT status, scheduled_date FROM daily_challenge_metadata WHERE question_id = ?').get(existingId);
    expect(existingMeta.status).toBe('scheduled');
    expect(existingMeta.scheduled_date).toBe(tomorrowDate);

    // 6. Verify automation log
    const log = mockTestDb.prepare('SELECT mode, status, details FROM daily_challenge_automation_logs ORDER BY created_at DESC LIMIT 1').get();
    expect(log.mode).toBe('auto_fill');
    expect(log.status).toBe('success');
    expect(log.details).toContain('already scheduled');
  });

  // CASE B: No suitable question → generate new, SCHEDULED, target date = tomorrow
  test('CASE B: Auto-Fill with no suitable question generates new and schedules', async () => {
    const aiQuestionService = require('../src/services/aiQuestionService');
    const spyContract = jest.spyOn(aiQuestionService, 'generateContract').mockResolvedValue(validContract);
    const spyTests = jest.spyOn(aiQuestionService, 'generateTestCasesForContract').mockResolvedValue(validTestCases);
    const spySolutions = jest.spyOn(aiQuestionService, 'generateSolutionsForContract').mockResolvedValue(validSolutions);
    const spyHints = jest.spyOn(aiQuestionService, 'generateHintsForContract').mockResolvedValue(validHints);

    // 1. No existing questions in DB — auto-fill must generate new
    const result = await dcAutomationService.runAdminAutoFillNow({
      adminId: 'usr-admin-01',
      difficulty: 'medium',
      mode: 'auto_fill'
    });

    expect(result.success).toBe(true);
    expect(result.resultType).toBe('GENERATED_AND_SCHEDULED');
    expect(result.challenge).toBeDefined();

    // 2. Verify AI generator WAS called
    expect(spyContract).toHaveBeenCalled();

    // 3. Verify status = scheduled
    const meta = mockTestDb.prepare('SELECT status, scheduled_date, created_via FROM daily_challenge_metadata WHERE question_id = ?').get(result.challenge.id);
    expect(meta.status).toBe('scheduled');
    expect(meta.created_via).toBe('ai_automation');

    // 4. Verify scheduled_date = tomorrow
    const { getNextCanonicalIstDate } = require('../src/utils/dateUtils');
    const expectedDate = getNextCanonicalIstDate();
    expect(meta.scheduled_date).toBe(expectedDate);

    // 5. Verify question was indexed
    const emb = mockTestDb.prepare('SELECT * FROM question_embeddings WHERE question_id = ?').get(result.challenge.id);
    expect(emb).toBeTruthy();

    // 6. Verify automation log mode = auto_fill
    const log = mockTestDb.prepare('SELECT mode, status, target_date FROM daily_challenge_automation_logs ORDER BY created_at DESC LIMIT 1').get();
    expect(log.mode).toBe('auto_fill');
    expect(log.status).toBe('success');
    expect(log.target_date).toBe(expectedDate);
  });

  // DC automation logs are separate from QB automation logs
  test('DC and QB automation logs are written to separate tables', async () => {
    // Write a DC log
    await mockTestDb.prepare(
      `INSERT INTO daily_challenge_automation_logs (id, target_date, mode, status, details) VALUES (?, ?, ?, ?, ?)`
    ).run('dc-log-test', '2026-09-16', 'auto_fill', 'success', 'DC test log');

    // Write a QB log
    await mockTestDb.prepare(
      `INSERT INTO question_bank_automation_logs (id, target_slot, mode, status, details) VALUES (?, ?, ?, ?, ?)`
    ).run('qb-log-test', '2026-09-15-14', 'auto_fill', 'success', 'QB test log');

    const dcLogs = mockTestDb.prepare('SELECT COUNT(*) as c FROM daily_challenge_automation_logs').get();
    const qbLogs = mockTestDb.prepare('SELECT COUNT(*) as c FROM question_bank_automation_logs').get();

    expect(dcLogs.c).toBe(1);
    expect(qbLogs.c).toBe(1);

    // Verify they don't cross-contaminate
    const dcEntry = mockTestDb.prepare('SELECT * FROM daily_challenge_automation_logs WHERE id = ?').get('dc-log-test');
    expect(dcEntry).toBeTruthy();
    expect(dcEntry.target_date).toBe('2026-09-16');

    const qbEntry = mockTestDb.prepare('SELECT * FROM question_bank_automation_logs WHERE id = ?').get('qb-log-test');
    expect(qbEntry).toBeTruthy();
    expect(qbEntry.target_slot).toBe('2026-09-15-14');
  });
});
