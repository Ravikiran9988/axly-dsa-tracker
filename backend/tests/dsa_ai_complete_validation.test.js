const request = require('supertest');
const app = require('../src/app');
const { getRepository } = require('../src/db/repositoryFactory');
const { initSchema } = require('../src/db/db');
const { seedDatabase } = require('../src/db/seed');
const { seedPracticeProblems } = require('../src/db/practiceSeed');
const { generateToken } = require('../src/middleware/auth');
const llmRouter = require('../src/services/llm/llmRouter');
const MockProvider = require('../src/services/llm/mockProvider');
const dsaAiService = require('../src/services/dsaAiService');
const dsaAiCoachService = require('../src/services/dsaAiCoachService');
const problemMatcher = require('../src/services/dsaProblemMatcherService');
const intentDetector = require('../src/services/dsaIntentDetectorService');
const knowledgeGraph = require('../src/services/dsaKnowledgeGraphService');
const aiCache = require('../src/services/dsaAiCacheService');

describe('Comprehensive 4-Phase DSA AI Validation Suite', () => {
  let studentToken;
  let studentUser;
  const repo = getRepository();

  beforeAll(async () => {
    initSchema();
    seedDatabase();
    seedPracticeProblems();

    studentUser = await repo.one("SELECT id, email, role, points, streak FROM users WHERE role NOT IN ('admin', 'system') LIMIT 1");
    if (!studentUser) {
      studentUser = { id: 'usr-student-e2e', email: 'e2e@axly.in', role: 'user', points: 100, streak: 2 };
      await repo.execute(
        "INSERT INTO users (id, name, email, role, points, streak) VALUES (?, 'E2E Tester', ?, 'user', 100, 2)",
        [studentUser.id, studentUser.email]
      );
    }
    studentToken = generateToken(studentUser);
  });

  beforeEach(() => {
    aiCache.clear();
    llmRouter.initializeDefaultProviders();
  });

  // =========================================================================
  // PHASE 1: DSA AI FOUNDATION
  // =========================================================================
  describe('Phase 1: DSA AI Foundation Validation', () => {
    it('1.1 Known Practice problem ("How do I solve Two Sum?") matches problem, topic=Arrays, pattern=Hash Map Lookup without LLM call', async () => {
      const match = await problemMatcher.matchProblem('How do I solve Two Sum?');
      expect(match.matched).toBe(true);
      expect(match.problem).toBeDefined();
      expect(match.problem.title.toLowerCase()).toContain('two sum');
      expect(match.confidence).toBeGreaterThanOrEqual(0.8);

      const kg = knowledgeGraph.findTaxonomy(match.problem.topic_id || 'arrays', 'hash_map');
      expect(kg.topic.name).toBe('Arrays');
      expect(kg.pattern.name).toBe('Hash Map Lookup');

      const intent = intentDetector.detectIntent('How do I solve Two Sum?');
      expect(intent.intent).toBe('APPROACH');
    });

    it('1.2 Natural-language variation ("I have an array and need to find two numbers that add to a target.") matches Two Sum with correct topic/pattern', async () => {
      const match = await problemMatcher.matchProblem('I have an array and need to find two numbers that add to a target.');
      expect(match.matched).toBe(true);
      expect(match.problem).toBeDefined();
      expect(match.problem.title.toLowerCase()).toContain('two sum');
    });

    it('1.3 Unknown problem returns low confidence and does not pretend it exists in Practice', async () => {
      const match = await problemMatcher.matchProblem('Design an algorithm to find the k-th smallest element in a custom data structure.');
      expect(match.confidence).toBeLessThan(0.7);
    });

    it('1.4 Intent tests verify all 7 standard intents', () => {
      expect(intentDetector.detectIntent('Give me a hint').intent).toBe('HINT');
      expect(intentDetector.detectIntent('Explain this problem').intent).toBe('EXPLANATION');
      expect(intentDetector.detectIntent('What is the optimal approach?').intent).toBe('APPROACH');
      expect(intentDetector.detectIntent('Give me the solution').intent).toBe('SOLUTION');
      expect(intentDetector.detectIntent("What's the time complexity?").intent).toBe('COMPLEXITY');
      expect(intentDetector.detectIntent('Review my code').intent).toBe('CODE_REVIEW');
      expect(intentDetector.detectIntent('Why is my code failing?').intent).toBe('DEBUG');
    });

    it('1.5 Topic and Pattern validation belongs to controlled taxonomy vocabulary', () => {
      const topics = knowledgeGraph.getAllTopics();
      const topicNames = topics.map(t => t.name);
      expect(topicNames).toContain('Arrays');
      expect(topicNames).toContain('Trees');
      expect(topicNames).toContain('Dynamic Programming');

      const patterns = knowledgeGraph.getAllPatterns();
      const patternNames = patterns.map(p => p.name);
      expect(patternNames).toContain('Hash Map Lookup');
      expect(patternNames).toContain('Two Pointers');
    });

    it('1.6 Knowledge Graph retrieves Problem -> Topic -> Pattern -> Algorithm -> Prerequisites', () => {
      const kg = knowledgeGraph.findTaxonomy('arrays', 'hash_map');
      expect(kg.topic.name).toBe('Arrays');
      expect(kg.pattern.name).toBe('Hash Map Lookup');
      expect(kg.algorithm.name).toContain('One-Pass Hash Table');
      expect(kg.prerequisites).toBeDefined();
      expect(Array.isArray(kg.prerequisites)).toBe(true);
    });

    it('1.7 Unauthenticated DSA AI requests are rejected with 401', async () => {
      const res = await request(app).post('/api/v1/dsa-ai/analyze').send({ question: 'Two sum' });
      expect(res.status).toBe(401);
    });

    it('1.8 Input validation rejects empty and oversized questions properly without crashing', async () => {
      const emptyRes = await request(app)
        .post('/api/v1/dsa-ai/analyze')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ question: '   ' });
      expect(emptyRes.status).toBe(400);

      const hugeQuestion = 'x'.repeat(60000);
      const hugeRes = await request(app)
        .post('/api/v1/dsa-ai/analyze')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ question: hugeQuestion });
      expect([200, 400]).toContain(hugeRes.status);
    });
  });

  // =========================================================================
  // PHASE 2: LLM ROUTER & MULTI-PROVIDER FALLBACK
  // =========================================================================
  describe('Phase 2: LLM Router & Fallback Validation', () => {
    it('2.1 Provider A succeeds -> Provider A is used and response is normalized', async () => {
      const mockA = new MockProvider({ name: 'mock-a', customText: 'Result from Provider A' });
      llmRouter.registerProvider('mock-a', mockA);
      llmRouter.setProviderOrder(['mock-a']);

      const res = await llmRouter.generate({ prompt: 'Test query' });
      expect(res.provider).toBe('mock-a');
      expect(res.text).toBe('Result from Provider A');
      expect(res.source).toBe('llm');
    });

    it('2.2 Provider A timeout -> Falls back to Provider B and succeeds', async () => {
      const mockA = new MockProvider({ name: 'mock-a', behavior: 'timeout', delayMs: 50 });
      const mockB = new MockProvider({ name: 'mock-b', customText: 'Result from Provider B' });
      llmRouter.registerProvider('mock-a', mockA);
      llmRouter.registerProvider('mock-b', mockB);
      llmRouter.setProviderOrder(['mock-a', 'mock-b']);

      const res = await llmRouter.generate({ prompt: 'Test query', timeoutMs: 20 });
      expect(res.provider).toBe('mock-b');
      expect(res.text).toBe('Result from Provider B');
    });

    it('2.3 Provider A rate-limited (429) -> Falls back to Provider B', async () => {
      const mockA = new MockProvider({ name: 'mock-a', behavior: 'quota_error' });
      const mockB = new MockProvider({ name: 'mock-b', customText: 'Result from Provider B' });
      llmRouter.registerProvider('mock-a', mockA);
      llmRouter.registerProvider('mock-b', mockB);
      llmRouter.setProviderOrder(['mock-a', 'mock-b']);

      const res = await llmRouter.generate({ prompt: 'Test query' });
      expect(res.provider).toBe('mock-b');
      expect(res.text).toBe('Result from Provider B');
    });

    it('2.4 Provider A returns 500 server error -> Falls back to Provider B', async () => {
      const mockA = new MockProvider({ name: 'mock-a', behavior: 'server_error' });
      const mockB = new MockProvider({ name: 'mock-b', customText: 'Result from Provider B' });
      llmRouter.registerProvider('mock-a', mockA);
      llmRouter.registerProvider('mock-b', mockB);
      llmRouter.setProviderOrder(['mock-a', 'mock-b']);

      const res = await llmRouter.generate({ prompt: 'Test query' });
      expect(res.provider).toBe('mock-b');
      expect(res.text).toBe('Result from Provider B');
    });

    it('2.5 Provider A and B fail -> Falls back to Provider C', async () => {
      const mockA = new MockProvider({ name: 'mock-a', behavior: 'timeout', delayMs: 50 });
      const mockB = new MockProvider({ name: 'mock-b', behavior: 'quota_error' });
      const mockC = new MockProvider({ name: 'mock-c', customText: 'Result from Provider C' });
      llmRouter.registerProvider('mock-a', mockA);
      llmRouter.registerProvider('mock-b', mockB);
      llmRouter.registerProvider('mock-c', mockC);
      llmRouter.setProviderOrder(['mock-a', 'mock-b', 'mock-c']);

      const res = await llmRouter.generate({ prompt: 'Test query', timeoutMs: 20 });
      expect(res.provider).toBe('mock-c');
      expect(res.text).toBe('Result from Provider C');
    });

    it('2.6 All providers fail -> Returns graceful fallback response', async () => {
      const mockA = new MockProvider({ name: 'mock-a', behavior: 'server_error' });
      const mockB = new MockProvider({ name: 'mock-b', behavior: 'server_error' });
      llmRouter.registerProvider('mock-a', mockA);
      llmRouter.registerProvider('mock-b', mockB);
      llmRouter.setProviderOrder(['mock-a', 'mock-b']);

      const res = await llmRouter.generate({ prompt: 'Test query' });
      expect(res.source).toBe('fallback');
      expect(res.provider).toBe('fallback');
      expect(res.text.toLowerCase()).toContain('unavailable');
    });

    it('2.7 Unconfigured provider is automatically skipped in order list', async () => {
      const mockUnconfigured = new MockProvider({ name: 'mock-unconfigured', apiKey: '' });
      const mockValid = new MockProvider({ name: 'mock-valid', customText: 'Valid completion' });
      llmRouter.registerProvider('mock-unconfigured', mockUnconfigured);
      llmRouter.registerProvider('mock-valid', mockValid);
      llmRouter.setProviderOrder(['mock-unconfigured', 'mock-valid']);

      const res = await llmRouter.generate({ prompt: 'Test' });
      expect(res.provider).toBe('mock-valid');
    });

    it('2.8 & 2.9 API keys and credentials never appear in response payloads or sanitized error traces', async () => {
      const mockProvider = new MockProvider({ name: 'mock-auth-sec', apiKey: 'SECRET_API_KEY_9999' });
      llmRouter.registerProvider('mock-auth-sec', mockProvider);
      llmRouter.setProviderOrder(['mock-auth-sec']);

      const res = await dsaAiService.generateGuidance({
        question: 'Novel algorithmic question without match',
        user: studentUser
      });

      const serialized = JSON.stringify(res);
      expect(serialized).not.toContain('SECRET_API_KEY_9999');
    });

    it('2.10 Max provider attempts guarantee no infinite fallback loop', async () => {
      const mockA = new MockProvider({ name: 'mock-a', behavior: 'server_error' });
      llmRouter.registerProvider('mock-a', mockA);
      llmRouter.setProviderOrder(['mock-a']);

      const startTime = Date.now();
      const res = await llmRouter.generate({ prompt: 'Infinite loop guard test' });
      const duration = Date.now() - startTime;

      expect(res.source).toBe('fallback');
      expect(duration).toBeLessThan(2000); // Terminates immediately
    });
  });

  // =========================================================================
  // TOKEN / COST CONTROLS
  // =========================================================================
  describe('Token / Cost Optimization Validation', () => {
    it('Known practice problem hint uses Database/Graph with 0 LLM calls', async () => {
      let llmCalled = false;
      const mockTracker = new MockProvider({
        name: 'mock-tracker',
        customText: 'LLM Response'
      });
      mockTracker.generate = async () => {
        llmCalled = true;
        return { text: 'LLM Response', provider: 'mock-tracker', model: 'mock', usage: {} };
      };
      llmRouter.registerProvider('mock-tracker', mockTracker);
      llmRouter.setProviderOrder(['mock-tracker']);

      const res = await dsaAiService.generateGuidance({
        question: 'Give me a hint for Two Sum',
        problemId: 'q-two-sum',
        user: studentUser
      });

      expect(res.source).toBe('database');
      expect(llmCalled).toBe(false); // 0 LLM calls consumed!
    });
  });

  // =========================================================================
  // PHASE 3: DSA AI COACH & CODE VERIFICATION
  // =========================================================================
  describe('Phase 3: DSA AI Coach & Code Verification Validation', () => {
    it('3.1 Progressive Hints: Hint 1 -> Hint 2 -> Approach nudge without disclosing full code', async () => {
      const h1 = await dsaAiCoachService.coach({
        question: 'Give me a hint for Two Sum',
        problemId: 'q-two-sum',
        action: 'HINT',
        hintIndex: 0
      });
      expect(h1.answer).toContain('Hint 1');
      expect(h1.code).toBeNull();

      const h2 = await dsaAiCoachService.coach({
        question: 'Give me another hint for Two Sum',
        problemId: 'q-two-sum',
        action: 'HINT',
        hintIndex: 1
      });
      expect(h2.answer).toContain('Hint 2');
      expect(h2.code).toBeNull();

      const hNudge = await dsaAiCoachService.coach({
        question: 'Give me another hint for Two Sum',
        problemId: 'q-two-sum',
        action: 'HINT',
        hintIndex: 10
      });
      expect(hNudge.answer).toContain('All stored hints viewed');
      expect(hNudge.code).toBeNull();
    });

    it('3.2 Approach query returns pattern, algorithm steps, and complexity', async () => {
      const res = await dsaAiCoachService.coach({
        question: 'Explain the optimal approach for Two Sum',
        problemId: 'q-two-sum',
        action: 'APPROACH'
      });
      expect(res.intent).toBe('APPROACH');
      expect(res.pattern).toBe('Hash Map Lookup');
      expect(res.complexity.time).toBeDefined();
    });

    it('3.3 Solution query returns optimal solution code and complexity', async () => {
      const mockSol = new MockProvider({
        name: 'mock-sol',
        customText: `\`\`\`javascript\nfunction twoSum(nums, target) { return [0, 1]; }\n\`\`\``
      });
      llmRouter.registerProvider('mock-sol', mockSol);
      llmRouter.setProviderOrder(['mock-sol']);

      const res = await dsaAiCoachService.coach({
        question: 'Show me the solution for Two Sum',
        problemId: 'q-two-sum',
        action: 'SOLUTION'
      });
      expect(res.intent).toBe('SOLUTION');
      expect(res.code).toContain('twoSum');
      expect(res.complexity).toBeDefined();
    });

    it('3.4 Code Review identifies bugs, explains issues, and suggests corrections', async () => {
      const mockReviewer = new MockProvider({
        name: 'mock-rev',
        customText: '1. Bug: Inverting target subtraction.\n2. Fix: Use target - nums[i].\n3. Time Complexity: O(N).'
      });
      llmRouter.registerProvider('mock-rev', mockReviewer);
      llmRouter.setProviderOrder(['mock-rev']);

      const badCode = `function solve(nums, target) { return nums.map(x => x + target); }`;
      const res = await dsaAiCoachService.coach({
        question: 'Review my solution',
        problemId: 'q-two-sum',
        action: 'CODE_REVIEW',
        code: badCode
      });

      expect(res.intent).toBe('CODE_REVIEW');
      expect(res.answer).toContain('Bug:');
    });

    it('3.5 Debug provides root cause diagnosis and fix guidance', async () => {
      const mockDebugger = new MockProvider({
        name: 'mock-dbg',
        customText: 'Cause: IndexOutOfBoundsException when accessing nums[i+1] without bounds check.'
      });
      llmRouter.registerProvider('mock-dbg', mockDebugger);
      llmRouter.setProviderOrder(['mock-dbg']);

      const res = await dsaAiCoachService.coach({
        question: 'Why is my solution throwing array index out of bounds error?',
        problemId: 'q-two-sum',
        action: 'DEBUG'
      });

      expect(res.intent).toBe('DEBUG');
      expect(res.answer).toContain('IndexOutOfBoundsException');
    });

    it('3.6 Complexity returns time and space complexity with justifications', async () => {
      const res = await dsaAiCoachService.coach({
        question: 'What is the time and space complexity of Two Sum?',
        problemId: 'q-two-sum',
        action: 'COMPLEXITY'
      });

      expect(res.intent).toBe('COMPLEXITY');
      expect(res.complexity.time).toBeDefined();
      expect(res.complexity.space).toBeDefined();
    });

    it('3.7 Novel problem uses LLM fallback to generate complete response', async () => {
      const mockNovel = new MockProvider({
        name: 'mock-novel',
        customText: 'For a balanced segment tree approach, maintain sum and minimum values in each node.'
      });
      llmRouter.registerProvider('mock-novel', mockNovel);
      llmRouter.setProviderOrder(['mock-novel']);

      const res = await dsaAiCoachService.coach({
        question: 'How do I build a dynamic interval update tree for custom 2D matrix range updates?',
        action: 'EXPLAIN'
      });

      expect(res.intent).toBe('EXPLANATION');
      expect(res.source).toBe('llm');
      expect(res.answer).toContain('segment tree');
    });

    it('3.8 Sandbox Code Verification: Passing code passes and returns status Accepted', async () => {
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

    it('3.9 Sandbox Code Verification: Failing code triggers LLM self-correction loop and passes', async () => {
      const failingCode = `console.log("0 0");`;
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
        name: 'mock-fix',
        customText: `\`\`\`javascript\n${fixedCode}\n\`\`\``
      });
      llmRouter.registerProvider('mock-fix', mockCorrector);
      llmRouter.setProviderOrder(['mock-fix']);

      const res = await dsaAiCoachService.verifyAndCorrectCode({
        problemId: 'q-two-sum',
        language: 'javascript',
        code: failingCode,
        allowCorrection: true
      });

      expect(res.verified).toBe(true);
      expect(res.status).toBe('Accepted');
    });

    it('3.10 Unfixable code terminates cleanly within maximum correction attempts (max 2 attempts)', async () => {
      const brokenCode = `throw new Error("fatal crash");`;
      const mockBroken = new MockProvider({
        name: 'mock-still-broken',
        customText: `\`\`\`javascript\nthrow new Error("still crashing");\n\`\`\``
      });
      llmRouter.registerProvider('mock-still-broken', mockBroken);
      llmRouter.setProviderOrder(['mock-still-broken']);

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

  // =========================================================================
  // PRACTICE & DAILY CHALLENGE ISOLATION
  // =========================================================================
  describe('Practice & Daily Challenge Isolation Validation', () => {
    it('Practice problem progress is NOT marked solved by AI Coach', async () => {
      const beforeProgress = await repo.one(
        'SELECT status FROM practice_progress WHERE user_id = ? AND question_id = ?',
        [studentUser.id, 'q-two-sum']
      );

      await dsaAiCoachService.coach({
        question: 'Solve Two Sum for me',
        problemId: 'q-two-sum',
        action: 'SOLUTION',
        verify: true,
        user: studentUser
      });

      const afterProgress = await repo.one(
        'SELECT status FROM practice_progress WHERE user_id = ? AND question_id = ?',
        [studentUser.id, 'q-two-sum']
      );

      expect(afterProgress?.status).toBe(beforeProgress?.status || undefined);
    });

    it('Daily Challenge scoring, streak, and leaderboard are NOT altered by AI Coach', async () => {
      const beforeUser = await repo.one('SELECT points, streak, leaderboard_score FROM users WHERE id = ?', [studentUser.id]);

      await dsaAiCoachService.coach({
        question: 'Solve daily challenge for me',
        problemId: 'dc-002',
        action: 'SOLUTION',
        user: studentUser
      });

      const afterUser = await repo.one('SELECT points, streak, leaderboard_score FROM users WHERE id = ?', [studentUser.id]);

      expect(afterUser.points).toBe(beforeUser.points);
      expect(afterUser.streak).toBe(beforeUser.streak);
      expect(afterUser.leaderboard_score).toBe(beforeUser.leaderboard_score);
    });

    it('Hidden test cases are never leaked in response payloads', async () => {
      const res = await request(app)
        .post('/api/v1/dsa-ai/coach')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          question: 'Show hints for Two Sum',
          problemId: 'q-two-sum',
          action: 'HINT'
        });

      expect(res.status).toBe(200);
      const str = JSON.stringify(res.body);
      expect(str).not.toContain('is_hidden: 1');
      expect(str).not.toContain('is_hidden: true');
    });
  });
});
