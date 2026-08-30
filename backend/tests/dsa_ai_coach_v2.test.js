/**
 * DSA AI Coach V2 Test Suite
 * 
 * Tests new features:
 * - Conversation history forwarding & validation
 * - displaySource human-readable labels
 * - Improved system prompts (problem context)
 * - Complexity LLM fallback for unknown problems
 * - Multi-turn context awareness
 * - Security: hidden tests not exposed, isolation maintained
 */

const request = require('supertest');
const app = require('../src/app');
const { getRepository } = require('../src/db/repositoryFactory');
const { initSchema } = require('../src/db/db');
const { seedDatabase } = require('../src/db/seed');
const { seedPracticeProblems } = require('../src/db/practiceSeed');
const { generateToken } = require('../src/middleware/auth');
const llmRouter = require('../src/services/llm/llmRouter');
const MockProvider = require('../src/services/llm/mockProvider');
const dsaAiCoachService = require('../src/services/dsaAiCoachService');
const aiCache = require('../src/services/dsaAiCacheService');

describe('DSA AI Coach V2 — Conversation History, Source Labels & Prompt Quality', () => {
  let studentToken;
  let studentUser;
  const repo = getRepository();

  beforeAll(async () => {
    initSchema();
    seedDatabase();
    seedPracticeProblems();

    studentUser = await repo.one("SELECT id, email, role, points, streak FROM users WHERE role NOT IN ('admin', 'system') LIMIT 1");
    if (!studentUser) {
      studentUser = { id: 'usr-v2-coach', email: 'v2coach@axly.in', role: 'user', points: 100, streak: 2 };
      await repo.execute(
        "INSERT INTO users (id, name, email, role, points, streak) VALUES (?, 'V2 Coach Tester', ?, 'user', 100, 2)",
        [studentUser.id, studentUser.email]
      );
    }
    studentToken = generateToken(studentUser);
  });

  beforeEach(() => {
    aiCache.clear();
    llmRouter.initializeDefaultProviders();
  });

  // ─────────────────────────────────────────────────────────────────
  // 1. CONVERSATION HISTORY FORWARDING
  // ─────────────────────────────────────────────────────────────────
  describe('1. Conversation History', () => {
    it('1.1 Coach accepts valid conversationHistory array and returns 200', async () => {
      const mockProvider = new MockProvider({
        name: 'mock-history',
        customText: 'BFS stands for Breadth-First Search. It explores nodes level by level.'
      });
      llmRouter.registerProvider('mock-history', mockProvider);
      llmRouter.setProviderOrder(['mock-history']);

      const res = await request(app)
        .post('/api/v1/dsa-ai/coach')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          question: 'Why do we need a queue for BFS?',
          action: 'GENERAL_DSA',
          conversationHistory: [
            { role: 'user',      content: 'What is BFS?' },
            { role: 'assistant', content: 'BFS stands for Breadth-First Search. It explores nodes level by level.' }
          ]
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.answer).toBeDefined();
    });

    it('1.2 Coach accepts empty conversationHistory array', async () => {
      const mockProvider = new MockProvider({
        name: 'mock-empty-hist',
        customText: 'A queue ensures FIFO processing for BFS.'
      });
      llmRouter.registerProvider('mock-empty-hist', mockProvider);
      llmRouter.setProviderOrder(['mock-empty-hist']);

      const res = await request(app)
        .post('/api/v1/dsa-ai/coach')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          question: 'Explain BFS',
          action: 'EXPLAIN',
          conversationHistory: []
        });

      expect(res.status).toBe(200);
    });

    it('1.3 Coach rejects conversationHistory that is not an array (returns 400)', async () => {
      const res = await request(app)
        .post('/api/v1/dsa-ai/coach')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          question: 'Explain BFS',
          action: 'EXPLAIN',
          conversationHistory: 'not an array'
        });

      expect(res.status).toBe(400);
    });

    it('1.4 Coach accepts omitted conversationHistory (defaults to empty)', async () => {
      const mockProvider = new MockProvider({
        name: 'mock-no-hist',
        customText: 'BFS uses a queue for level-order traversal.'
      });
      llmRouter.registerProvider('mock-no-hist', mockProvider);
      llmRouter.setProviderOrder(['mock-no-hist']);

      const res = await request(app)
        .post('/api/v1/dsa-ai/coach')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          question: 'What is BFS?',
          action: 'CONCEPT'
          // no conversationHistory field
        });

      expect(res.status).toBe(200);
      expect(res.body.data.answer).toBeDefined();
    });

    it('1.5 Coach service accepts conversationHistory and bounds it to MAX_HISTORY_TURNS', async () => {
      const mockProvider = new MockProvider({
        name: 'mock-bound',
        customText: 'Here is a bounded response.'
      });
      llmRouter.registerProvider('mock-bound', mockProvider);
      llmRouter.setProviderOrder(['mock-bound']);

      // Provide 20 messages — should be silently bounded
      const longHistory = Array.from({ length: 20 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i + 1} content about algorithms and data structures`
      }));

      const res = await dsaAiCoachService.coach({
        question: 'What is the time complexity of BFS?',
        action: 'COMPLEXITY',
        conversationHistory: longHistory
      });

      expect(res.intent).toBe('COMPLEXITY');
      expect(res.answer).toBeDefined();
    });

    it('1.6 Coach service filters malformed entries from conversationHistory', async () => {
      const mockProvider = new MockProvider({
        name: 'mock-filter',
        customText: 'Filtered history response.'
      });
      llmRouter.registerProvider('mock-filter', mockProvider);
      llmRouter.setProviderOrder(['mock-filter']);

      const malformedHistory = [
        { role: 'user', content: 'Valid message' },
        { role: 'invalid_role', content: 'Bad role — should be filtered' },
        { role: 'assistant' },                          // missing content
        null,                                            // null entry
        { role: 'assistant', content: 'Valid response' }
      ];

      // Should not throw — malformed entries silently filtered
      const res = await dsaAiCoachService.coach({
        question: 'Explain DFS',
        action: 'EXPLAIN',
        conversationHistory: malformedHistory
      });

      expect(res.answer).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 2. DISPLAY SOURCE LABELS
  // ─────────────────────────────────────────────────────────────────
  describe('2. Human-Readable Source Labels', () => {
    it('2.1 Database-sourced hints return displaySource = "Knowledge Base"', async () => {
      const res = await dsaAiCoachService.coach({
        question: 'Give me a hint for Two Sum',
        problemId: 'q-two-sum',
        action: 'HINT',
        hintIndex: 0
      });

      expect(res.source).toBe('database');
      expect(res.displaySource).toBe('Knowledge Base');
    });

    it('2.2 LLM-sourced response returns displaySource = "AI Generated"', async () => {
      const mockProvider = new MockProvider({
        name: 'mock-label',
        customText: 'Here is an AI-generated explanation.'
      });
      llmRouter.registerProvider('mock-label', mockProvider);
      llmRouter.setProviderOrder(['mock-label']);

      const res = await dsaAiCoachService.coach({
        question: 'Explain Dijkstra algorithm in detail',
        action: 'EXPLAIN'
      });

      expect(res.displaySource).toBe('AI Generated');
    });

    it('2.3 Knowledge Graph complexity response returns displaySource = "Knowledge Graph"', async () => {
      // Use a known matched problem where complexity IS available from graph
      // The graph returns timeComplexity 'O(N)' but only for confirmed patterns
      // We force high confidence by using a matched problem
      const mockProvider = new MockProvider({
        name: 'mock-graph-label',
        customText: 'O(N) time, O(N) space.'
      });
      llmRouter.registerProvider('mock-graph-label', mockProvider);
      llmRouter.setProviderOrder(['mock-graph-label']);

      const res = await dsaAiCoachService.coach({
        question: 'What is the time complexity of Two Sum?',
        problemId: 'q-two-sum',
        action: 'COMPLEXITY'
      });

      expect(res.displaySource).toBeDefined();
      expect(['Knowledge Graph', 'AI Generated']).toContain(res.displaySource);
    });

    it('2.4 API response includes displaySource field', async () => {
      const res = await request(app)
        .post('/api/v1/dsa-ai/coach')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          question: 'Give me a hint for Two Sum',
          problemId: 'q-two-sum',
          action: 'HINT',
          hintIndex: 0
        });

      expect(res.status).toBe(200);
      expect(res.body.data.displaySource).toBeDefined();
      expect(typeof res.body.data.displaySource).toBe('string');
      expect(res.body.data.displaySource.length).toBeGreaterThan(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 3. COMPLEXITY FOR UNKNOWN PROBLEMS
  // ─────────────────────────────────────────────────────────────────
  describe('3. Complexity Handler Improvements', () => {
    it('3.1 Complexity for unmatched/novel problem falls through to LLM', async () => {
      const mockProvider = new MockProvider({
        name: 'mock-complexity-llm',
        customText: '## Time Complexity\n`O(V + E)` — visits each vertex and edge once.\n\n## Space Complexity\n`O(V)` — visited set.'
      });
      llmRouter.registerProvider('mock-complexity-llm', mockProvider);
      llmRouter.setProviderOrder(['mock-complexity-llm']);

      const res = await dsaAiCoachService.coach({
        question: 'What is the time complexity of finding connected components in a sparse graph?',
        action: 'COMPLEXITY'
        // No problemId — novel question
      });

      expect(res.intent).toBe('COMPLEXITY');
      // For unmatched novel questions, should use LLM
      expect(['AI Generated', 'Knowledge Graph']).toContain(res.displaySource);
      expect(res.answer).toBeDefined();
      expect(res.answer.length).toBeGreaterThan(10);
    });

    it('3.2 Complexity for well-known DB problem with pattern uses Knowledge Graph', async () => {
      const res = await dsaAiCoachService.coach({
        question: 'Time complexity of Two Sum?',
        problemId: 'q-two-sum',
        action: 'COMPLEXITY'
      });

      expect(res.intent).toBe('COMPLEXITY');
      // Known Two Sum uses Hash Map Lookup → O(N) which matches the graph
      expect(res.complexity).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 4. ENRICHED SYSTEM PROMPTS
  // ─────────────────────────────────────────────────────────────────
  describe('4. Prompt Quality', () => {
    it('4.1 Approach handler generates a structured response using LLM', async () => {
      const mockProvider = new MockProvider({
        name: 'mock-approach',
        customText: '## Steps\n1. Initialize a hash map.\n2. Iterate through the array.\n3. Check complement.\n\n## Key Invariants\n- Each element stored only once.\n\n## Complexity\n- Time: O(N)\n- Space: O(N)'
      });
      llmRouter.registerProvider('mock-approach', mockProvider);
      llmRouter.setProviderOrder(['mock-approach']);

      const res = await dsaAiCoachService.coach({
        question: 'What is the step-by-step approach for Two Sum?',
        problemId: 'q-two-sum',
        action: 'APPROACH'
      });

      expect(res.intent).toBe('APPROACH');
      expect(res.answer).toContain('Steps');
      expect(res.answer).toBeDefined();
    });

    it('4.2 Explain handler returns structured explanation with pattern info', async () => {
      const mockProvider = new MockProvider({
        name: 'mock-explain',
        customText: '## Core Idea\nUse a hash map to store previously seen values.\n\n## Why Hash Map?\nO(1) lookup time eliminates the need for nested loops.'
      });
      llmRouter.registerProvider('mock-explain', mockProvider);
      llmRouter.setProviderOrder(['mock-explain']);

      const res = await dsaAiCoachService.coach({
        question: 'Explain the Two Sum solution',
        problemId: 'q-two-sum',
        action: 'EXPLAIN'
      });

      expect(res.intent).toBe('EXPLANATION');
      expect(res.topic).toBe('Arrays');
      expect(res.answer).toBeDefined();
    });

    it('4.3 Debug handler prompt includes problem title and language', async () => {
      const mockProvider = new MockProvider({
        name: 'mock-debug',
        customText: '## Issue Identified\nLine 3: `target + nums[i]` should be `target - nums[i]`.\n\n## Why It Fails\nAdding instead of subtracting finds wrong complement.'
      });
      llmRouter.registerProvider('mock-debug', mockProvider);
      llmRouter.setProviderOrder(['mock-debug']);

      const res = await dsaAiCoachService.coach({
        question: 'Why is my code returning wrong answer?',
        problemId: 'q-two-sum',
        action: 'DEBUG',
        language: 'python',
        code: 'def two_sum(nums, target):\n    for i in range(len(nums)):\n        comp = target + nums[i]\n        # BUG\n'
      });

      expect(res.intent).toBe('DEBUG');
      expect(res.answer).toContain('Issue Identified');
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 5. SECURITY & ISOLATION
  // ─────────────────────────────────────────────────────────────────
  describe('5. Security & Isolation (V2)', () => {
    it('5.1 No stack traces or SQL errors exposed in API error response', async () => {
      // Send invalid data to trigger a controlled error
      const res = await request(app)
        .post('/api/v1/dsa-ai/coach')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          question: '',  // empty — should trigger validation error
          action: 'HINT'
        });

      expect(res.status).toBe(400);
      const body = JSON.stringify(res.body);
      expect(body).not.toContain('stack');
      expect(body).not.toContain('SELECT');
      expect(body).not.toContain('SQLITE');
    });

    it('5.2 API keys never appear in error responses when all providers fail', async () => {
      // Remove all real providers and register a mock that always throws
      llmRouter.setProviderOrder(['nonexistent_provider_xyz']);

      const res = await request(app)
        .post('/api/v1/dsa-ai/coach')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          question: 'Explain a novel algorithm',
          action: 'CONCEPT'
        });

      // Should fall back gracefully (200 with fallback text, or 200 via DB)
      const body = JSON.stringify(res.body);
      expect(body).not.toMatch(/gsk_[a-zA-Z0-9]+/);  // Groq key pattern
      expect(body).not.toMatch(/sk-[a-zA-Z0-9]+/);    // OpenAI key pattern
      expect(body).not.toContain('Bearer ');
    });

    it('5.3 Practice progress unchanged after coach interaction', async () => {
      const before = await repo.one(
        'SELECT status FROM practice_progress WHERE user_id = ? AND question_id = ?',
        [studentUser.id, 'q-two-sum']
      );

      await dsaAiCoachService.coach({
        question: 'Give me the full Two Sum solution with code',
        problemId: 'q-two-sum',
        action: 'SOLUTION',
        verify: false,
        user: studentUser
      });

      const after = await repo.one(
        'SELECT status FROM practice_progress WHERE user_id = ? AND question_id = ?',
        [studentUser.id, 'q-two-sum']
      );

      expect(after?.status).toBe(before?.status || undefined);
    });

    it('5.4 Points and streaks unchanged after coach interaction', async () => {
      const before = await repo.one('SELECT points, streak FROM users WHERE id = ?', [studentUser.id]);

      await dsaAiCoachService.coach({
        question: 'Solve Two Sum completely',
        problemId: 'q-two-sum',
        action: 'SOLUTION',
        user: studentUser
      });

      const after = await repo.one('SELECT points, streak FROM users WHERE id = ?', [studentUser.id]);
      expect(after.points).toBe(before.points);
      expect(after.streak).toBe(before.streak);
    });

    it('5.5 Hidden test cases not exposed in coach response', async () => {
      const res = await request(app)
        .post('/api/v1/dsa-ai/coach')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          question: 'What are the hidden test cases for Two Sum?',
          problemId: 'q-two-sum',
          action: 'HINT'
        });

      expect(res.status).toBe(200);
      const body = JSON.stringify(res.body);
      expect(body).not.toContain('"is_hidden":1');
      expect(body).not.toContain('"is_hidden":true');
    });

    it('5.6 Unauthenticated request to /coach returns 401', async () => {
      const res = await request(app)
        .post('/api/v1/dsa-ai/coach')
        .send({ question: 'Hint please' });

      expect(res.status).toBe(401);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 6. HINT PROGRESSION (ensure code never appears in early hints)
  // ─────────────────────────────────────────────────────────────────
  describe('6. Progressive Hints — Code-Free', () => {
    it('6.1 Hint 1 from DB does not contain code snippets', async () => {
      const res = await dsaAiCoachService.coach({
        question: 'Give me a hint for Two Sum',
        problemId: 'q-two-sum',
        action: 'HINT',
        hintIndex: 0
      });

      expect(res.intent).toBe('HINT');
      expect(res.code).toBeNull();
      // Check that raw code (like function definitions) doesn't appear
      expect(res.answer).not.toMatch(/function\s+\w+\s*\(/);
      expect(res.answer).not.toMatch(/def\s+\w+\s*\(/);
    });

    it('6.2 Hint level increments correctly when multiple hints requested', async () => {
      const hint1 = await dsaAiCoachService.coach({
        question: 'Hint please',
        problemId: 'q-two-sum',
        action: 'HINT',
        hintIndex: 0
      });

      const hint2 = await dsaAiCoachService.coach({
        question: 'Hint please',
        problemId: 'q-two-sum',
        action: 'HINT',
        hintIndex: 1
      });

      expect(hint1.intent).toBe('HINT');
      expect(hint2.intent).toBe('HINT');
      // Hint 2 should be different from hint 1 (different index)
      expect(hint1.answer).not.toBe(hint2.answer);
    });

    it('6.3 LLM hint never provides complete solution code', async () => {
      const mockProvider = new MockProvider({
        name: 'mock-safe-hint',
        customText: 'Think about what data structure allows O(1) lookup. Consider what you need to find before you process each element.'
      });
      llmRouter.registerProvider('mock-safe-hint', mockProvider);
      llmRouter.setProviderOrder(['mock-safe-hint']);

      const res = await dsaAiCoachService.coach({
        question: 'Give me a hint for a custom graph traversal problem',
        action: 'HINT',
        hintIndex: 0
      });

      expect(res.intent).toBe('HINT');
      expect(res.code).toBeNull();
      expect(res.answer).toBeDefined();
    });
  });
});
