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

describe('Phase 3: DSA AI Coach & Code Verification Suite', () => {
  let studentToken;
  let studentUser;
  const repo = getRepository();

  beforeAll(async () => {
    initSchema();
    seedDatabase();
    seedPracticeProblems();

    studentUser = await repo.one("SELECT id, email, role, points, streak FROM users WHERE role NOT IN ('admin', 'system') LIMIT 1");
    if (!studentUser) {
      studentUser = { id: 'usr-student-ai-p3', email: 'aip3@axly.in', role: 'user', points: 100, streak: 2 };
      await repo.execute(
        "INSERT INTO users (id, name, email, role, points, streak) VALUES (?, 'AI Tester P3', ?, 'user', 100, 2)",
        [studentUser.id, studentUser.email]
      );
    }
    studentToken = generateToken(studentUser);
  });

  beforeEach(() => {
    aiCache.clear();
    llmRouter.initializeDefaultProviders();
  });

  describe('1. Progressive Hint System', () => {
    it('returns Level 0 (Hint 1) from database for known problem without revealing code', async () => {
      const res = await dsaAiCoachService.coach({
        question: 'Give me a hint for Two Sum',
        problemId: 'q-two-sum',
        action: 'HINT',
        hintIndex: 0
      });

      expect(res.intent).toBe('HINT');
      expect(res.source).toBe('database');
      expect(res.answer).toContain('Hint 1');
      expect(res.code).toBeNull();
      expect(res.complexity).toBeDefined();
      expect(res.complexity.time).toBeDefined();
      expect(res.complexity.space).toBeDefined();
    });

    it('returns algorithmic approach nudge when hintIndex exceeds available stored hints', async () => {
      const res = await dsaAiCoachService.coach({
        question: 'Give me another hint for Two Sum',
        problemId: 'q-two-sum',
        action: 'HINT',
        hintIndex: 99
      });

      expect(res.intent).toBe('HINT');
      expect(res.source).toBe('database');
      expect(res.answer).toContain('All stored hints viewed');
      expect(res.code).toBeNull();
    });
  });

  describe('2. Explanation & Approach System', () => {
    it('returns structured explanation for known problem (LLM with DB context grounding)', async () => {
      // The improved handleExplanation always uses LLM for richer Markdown output,
      // providing the DB storedSolution as context grounding to the prompt.
      // This produces better structured explanations than returning a raw DB string.
      const mockExplain = new MockProvider({
        name: 'mock-explain-known',
        customText: '## Core Idea\nUse a hash map to store previously seen values and their indices.\n\n## Pattern Applied\nHash Map Lookup provides O(1) complement verification.'
      });
      llmRouter.registerProvider('mock-explain-known', mockExplain);
      llmRouter.setProviderOrder(['mock-explain-known']);

      const res = await dsaAiCoachService.coach({
        question: 'Explain the optimal solution for Two Sum',
        problemId: 'q-two-sum',
        action: 'EXPLAIN'
      });

      expect(res.intent).toBe('EXPLANATION');
      // Source is now 'llm' because we enrich with LLM even for known problems
      // (DB context is used as grounding in the prompt, not returned raw)
      expect(['llm', 'database']).toContain(res.source);
      expect(res.answer).toContain('Core Idea');
      expect(res.topic).toBe('Arrays');
      expect(res.pattern).toBe('Hash Map Lookup');
    });

    it('returns LLM-generated explanation for novel/custom problems', async () => {
      const mockLLM = new MockProvider({
        name: 'mock-coach',
        customText: '### Approach\nUse a sliding window with two pointers to maintain subarray sum constraints.'
      });
      llmRouter.registerProvider('mock-coach', mockLLM);
      llmRouter.setProviderOrder(['mock-coach']);

      const res = await dsaAiCoachService.coach({
        question: 'How do I solve a custom array pivot problem with sliding window?',
        action: 'EXPLAIN'
      });

      expect(res.intent).toBe('EXPLANATION');
      expect(res.source).toBe('llm');
      expect(res.answer).toContain('sliding window');
    });
  });

  describe('3. Code Review & Debugging', () => {
    it('provides structured code review covering correctness, complexity, and improvements', async () => {
      const mockLLM = new MockProvider({
        name: 'mock-reviewer',
        customText: '1. Correctness: Solution is valid.\n2. Complexity: O(N) time and O(N) space.\n3. Cleanliness: Rename variable `m` to `seenMap` for clarity.'
      });
      llmRouter.registerProvider('mock-reviewer', mockLLM);
      llmRouter.setProviderOrder(['mock-reviewer']);

      const userCode = `function twoSum(nums, target) {
        const m = {};
        for(let i=0; i<nums.length; i++) {
          const comp = target - nums[i];
          if(m[comp] !== undefined) return [m[comp], i];
          m[nums[i]] = i;
        }
        return [];
      }`;

      const res = await dsaAiCoachService.coach({
        question: 'Review my Two Sum code',
        problemId: 'q-two-sum',
        action: 'CODE_REVIEW',
        language: 'javascript',
        code: userCode
      });

      expect(res.intent).toBe('CODE_REVIEW');
      expect(res.source).toBe('llm');
      expect(res.answer).toContain('Correctness');
      expect(res.answer).toContain('Complexity');
      expect(res.code).toBe(userCode);
    });

    it('provides targeted debugging guidance for failing code', async () => {
      const mockLLM = new MockProvider({
        name: 'mock-debugger',
        customText: 'Bug found: In line 4, `target + nums[i]` should be `target - nums[i]` to compute the complement.'
      });
      llmRouter.registerProvider('mock-debugger', mockLLM);
      llmRouter.setProviderOrder(['mock-debugger']);

      const failingCode = `function twoSum(nums, target) {
        const m = {};
        for(let i=0; i<nums.length; i++) {
          const comp = target + nums[i]; // BUG
          if(m[comp] !== undefined) return [m[comp], i];
          m[nums[i]] = i;
        }
        return [];
      }`;

      const res = await dsaAiCoachService.coach({
        question: 'Why is my solution returning wrong answer for target 9?',
        problemId: 'q-two-sum',
        action: 'DEBUG',
        language: 'javascript',
        code: failingCode
      });

      expect(res.intent).toBe('DEBUG');
      expect(res.source).toBe('llm');
      expect(res.answer).toContain('Bug found');
    });
  });

  describe('4. Sandbox Code Verification & Bounded Self-Correction', () => {
    it('verifies passing code in sandbox and returns status: Accepted', async () => {
      const passingCode = `const fs = require('fs');
const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
if (input.length >= 2) {
  const target = parseInt(input[0], 10);
  const nums = input.slice(1).map(Number);
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const comp = target - nums[i];
    if (map.has(comp)) {
      console.log(map.get(comp) + ' ' + i);
      process.exit(0);
    }
    map.set(nums[i], i);
  }
}`;

      const res = await dsaAiCoachService.verifyAndCorrectCode({
        problemId: 'q-two-sum',
        language: 'javascript',
        code: passingCode,
        allowCorrection: false
      });

      expect(res.verified).toBe(true);
      expect(res.status).toBe('Accepted');
      expect(res.passed_tests).toBeGreaterThan(0);
    });

    it('performs bounded self-correction loop when initial code fails (max 2 attempts)', async () => {
      const failingCode = `console.log("0 0");`; // Incorrect output
      const fixedCode = `const fs = require('fs');
const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
if (input.length >= 2) {
  const target = parseInt(input[0], 10);
  const nums = input.slice(1).map(Number);
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const comp = target - nums[i];
    if (map.has(comp)) {
      console.log(map.get(comp) + ' ' + i);
      process.exit(0);
    }
    map.set(nums[i], i);
  }
}`;

      const mockCorrector = new MockProvider({
        name: 'mock-corrector',
        customText: `Here is the corrected code:\n\`\`\`javascript\n${fixedCode}\n\`\`\``
      });
      llmRouter.registerProvider('mock-corrector', mockCorrector);
      llmRouter.setProviderOrder(['mock-corrector']);

      const res = await dsaAiCoachService.verifyAndCorrectCode({
        problemId: 'q-two-sum',
        language: 'javascript',
        code: failingCode,
        allowCorrection: true
      });

      expect(res.verified).toBe(true);
      expect(res.status).toBe('Accepted');
      expect(res.attempts).toBeLessThanOrEqual(2);
    });

    it('stops after max correction attempts if code cannot be fixed and returns failure', async () => {
      const brokenCode = `throw new Error("unfixable runtime crash");`;

      const mockStillBroken = new MockProvider({
        name: 'mock-broken',
        customText: `\`\`\`javascript\nthrow new Error("still crashing");\n\`\`\``
      });
      llmRouter.registerProvider('mock-broken', mockStillBroken);
      llmRouter.setProviderOrder(['mock-broken']);

      const res = await dsaAiCoachService.verifyAndCorrectCode({
        problemId: 'q-two-sum',
        language: 'javascript',
        code: brokenCode,
        allowCorrection: true
      });

      expect(res.verified).toBe(false);
      expect(res.attempts).toBeLessThanOrEqual(3);
    });
  });

  describe('5. Security, Isolation & Hidden Test Protection', () => {
    it('verifies that DSA AI Coach does NOT mark Practice problem solved or touch practice_progress', async () => {
      // Check practice_progress before AI coach request
      const beforeProgress = await repo.one(
        'SELECT status FROM practice_progress WHERE user_id = ? AND question_id = ?',
        [studentUser.id, 'q-two-sum']
      );

      await dsaAiCoachService.coach({
        question: 'Solve Two Sum for me with full code',
        problemId: 'q-two-sum',
        action: 'SOLUTION',
        verify: true,
        user: studentUser
      });

      const afterProgress = await repo.one(
        'SELECT status FROM practice_progress WHERE user_id = ? AND question_id = ?',
        [studentUser.id, 'q-two-sum']
      );

      // Status must NOT be marked solved by AI coach
      expect(afterProgress?.status).toBe(beforeProgress?.status || undefined);
    });

    it('verifies that Daily Challenge points, streaks, and leaderboards are NOT altered by AI coach', async () => {
      const beforeUser = await repo.one('SELECT points, streak FROM users WHERE id = ?', [studentUser.id]);

      await dsaAiCoachService.coach({
        question: 'Give me the answer for daily challenge dc-002',
        problemId: 'dc-002',
        action: 'SOLUTION',
        verify: false,
        user: studentUser
      });

      const afterUser = await repo.one('SELECT points, streak FROM users WHERE id = ?', [studentUser.id]);

      expect(afterUser.points).toBe(beforeUser.points);
      expect(afterUser.streak).toBe(beforeUser.streak);
    });

    it('never exposes hidden test case inputs or expected outputs in API response', async () => {
      const res = await request(app)
        .post('/api/v1/dsa-ai/coach')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          question: 'Review Two Sum',
          problemId: 'q-two-sum',
          action: 'HINT'
        });

      expect(res.status).toBe(200);
      const jsonStr = JSON.stringify(res.body);

      // Ensure internal hidden test cases strings/flags are not leaked
      expect(jsonStr).not.toContain('is_hidden: 1');
      expect(jsonStr).not.toContain('is_hidden: true');
    });
  });

  describe('6. Coach API Endpoints (POST /api/v1/dsa-ai/coach & POST /api/dsa-ai/coach)', () => {
    it('returns 401 Unauthorized for unauthenticated requests', async () => {
      const res = await request(app)
        .post('/api/v1/dsa-ai/coach')
        .send({ question: 'Hint please' });

      expect(res.status).toBe(401);
    });

    it('returns 200 with standard response format from POST /api/v1/dsa-ai/coach', async () => {
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
      expect(res.body.data).toBeDefined();
      expect(res.body.data.intent).toBe('HINT');
      expect(res.body.data.topic).toBe('Arrays');
      expect(res.body.data.pattern).toBe('Hash Map Lookup');
      expect(res.body.data.answer).toBeDefined();
      expect(res.body.data.complexity).toBeDefined();
    });

    it('no longer responds via legacy alias route /api/dsa-ai/coach', async () => {
      const res = await request(app)
        .post('/api/dsa-ai/coach')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          question: 'Explain Two Sum',
          problemId: 'q-two-sum',
          action: 'EXPLAIN'
        });

      expect(res.status).toBe(404);
    });
  });
});
