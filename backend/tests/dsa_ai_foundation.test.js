const request = require('supertest');
const app = require('../src/app');
const { getRepository } = require('../src/db/repositoryFactory');
const { initSchema } = require('../src/db/db');
const { seedDatabase } = require('../src/db/seed');
const { seedPracticeProblems } = require('../src/db/practiceSeed');
const { generateToken } = require('../src/middleware/auth');
const intentDetector = require('../src/services/dsaIntentDetectorService');
const problemMatcher = require('../src/services/dsaProblemMatcherService');
const knowledgeGraph = require('../src/services/dsaKnowledgeGraphService');

describe('Phase 1: DSA AI Foundation Suite', () => {
  let studentToken;
  let studentUser;
  const repo = getRepository();

  beforeAll(async () => {
    initSchema();
    seedDatabase();
    seedPracticeProblems();

    // Fetch a student user for authentication
    studentUser = await repo.one("SELECT id, email, role FROM users WHERE role NOT IN ('admin', 'system') LIMIT 1");
    if (!studentUser) {
      studentUser = { id: 'usr-student-ai-test', email: 'aitest@axly.in', role: 'user' };
      await repo.execute(
        "INSERT INTO users (id, name, email, role) VALUES (?, 'AI Tester', ?, 'user')",
        [studentUser.id, studentUser.email]
      );
    }
    studentToken = generateToken(studentUser);
  });

  describe('1. Problem Matcher Service', () => {
    it('matches an exact problem by known ID (e.g., q-two-sum or dc-002)', async () => {
      const match = await problemMatcher.matchProblem('Can you help me with problem q-two-sum?');
      expect(match.matched).toBe(true);
      expect(match.confidence).toBeGreaterThanOrEqual(0.9);
      expect(match.title.toLowerCase()).toContain('two sum');
      expect(match.topic).toBe('Arrays');
    });

    it('matches a known problem by natural wording ("How do I solve Two Sum?")', async () => {
      const match = await problemMatcher.matchProblem('How do I solve Two Sum with linear time complexity?');
      expect(match.matched).toBe(true);
      expect(match.confidence).toBeGreaterThanOrEqual(0.85);
      expect(match.title.toLowerCase()).toContain('two sum');
      expect(match.topic).toBe('Arrays');
      expect(match.pattern).toBe('Hash Map Lookup');
    });

    it('returns matched: false for unknown / low-confidence query', async () => {
      const match = await problemMatcher.matchProblem('Explain how to make a cup of hot espresso coffee.');
      expect(match.matched).toBe(false);
      expect(match.confidence).toBeLessThan(0.48);
    });
  });

  describe('2. Intent Detection Service', () => {
    it('detects HINT intent', () => {
      const res = intentDetector.detectIntent('Give me a small hint for this problem without spoiling the full answer');
      expect(res.intent).toBe('HINT');
    });

    it('detects EXPLANATION intent', () => {
      const res = intentDetector.detectIntent('Can you explain what this problem is asking?');
      expect(res.intent).toBe('EXPLANATION');
    });

    it('detects APPROACH intent', () => {
      const res = intentDetector.detectIntent('What is the optimal approach and strategy to solve this?');
      expect(res.intent).toBe('APPROACH');
    });

    it('detects SOLUTION intent', () => {
      const res = intentDetector.detectIntent('Please give me the complete code solution in python');
      expect(res.intent).toBe('SOLUTION');
    });

    it('detects CODE_REVIEW intent', () => {
      const codeQuery = 'Can you review my code to see if it can be optimized?\n```javascript\nfunction solve() { return 1; }\n```';
      const res = intentDetector.detectIntent(codeQuery);
      expect(res.intent).toBe('CODE_REVIEW');
    });

    it('detects DEBUG intent', () => {
      const res = intentDetector.detectIntent('Why is my solution getting Time Limit Exceeded (TLE) on large inputs?');
      expect(res.intent).toBe('DEBUG');
    });

    it('detects COMPLEXITY intent', () => {
      const res = intentDetector.detectIntent('What is the time complexity and space complexity (Big O) of this algorithm?');
      expect(res.intent).toBe('COMPLEXITY');
    });

    it('detects TEST_CASE intent', () => {
      const res = intentDetector.detectIntent('What are the edge cases and boundary test cases for an empty array?');
      expect(res.intent).toBe('TEST_CASE');
    });

    it('detects CONCEPT intent', () => {
      const res = intentDetector.detectIntent('What is a Monotonic Stack and how does it work?');
      expect(res.intent).toBe('CONCEPT');
    });

    it('falls back to GENERAL_DSA for generic inquiries', () => {
      const res = intentDetector.detectIntent('Hello DSA tracker assistant');
      expect(res.intent).toBe('GENERAL_DSA');
    });
  });

  describe('3. Knowledge Graph & Controlled Taxonomy Integration', () => {
    it('resolves controlled topics and patterns without creating arbitrary taxonomy', () => {
      const topic = knowledgeGraph.findTopic('arrays');
      expect(topic).toBeDefined();
      expect(topic.name).toBe('Arrays');

      const pattern = knowledgeGraph.findPattern('hash-map-lookup');
      expect(pattern).toBeDefined();
      expect(pattern.name).toBe('Hash Map Lookup');
    });

    it('builds structured Knowledge Graph context chain', () => {
      const graph = knowledgeGraph.getGraphContext('Arrays', 'Hash Map Lookup', {
        id: 'arr-01',
        title: 'Two Sum',
        difficulty: 'easy',
        prerequisites: ['Arrays', 'Hash Tables']
      });

      expect(graph.topic).toBe('Arrays');
      expect(graph.pattern).toBe('Hash Map Lookup');
      expect(graph.dataStructure).toBeDefined();
      expect(graph.algorithm).toBeDefined();
      expect(Array.isArray(graph.nodes)).toBe(true);
      expect(graph.nodes.some(n => n.entity === 'Problem')).toBe(true);
      expect(graph.nodes.some(n => n.entity === 'Topic')).toBe(true);
      expect(graph.nodes.some(n => n.entity === 'Pattern')).toBe(true);
      expect(graph.nodes.some(n => n.entity === 'DataStructure')).toBe(true);
      expect(graph.nodes.some(n => n.entity === 'Algorithm')).toBe(true);
    });
  });

  describe('4. DSA AI API Endpoint (POST /api/v1/dsa-ai/analyze)', () => {
    it('returns 401 Unauthorized when no auth token is provided', async () => {
      const res = await request(app)
        .post('/api/v1/dsa-ai/analyze')
        .send({ question: 'How do I solve Two Sum?' });

      expect(res.status).toBe(401);
    });

    it('returns 400 Bad Request when question is empty or missing', async () => {
      const res = await request(app)
        .post('/api/v1/dsa-ai/analyze')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ question: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 Bad Request when question exceeds 4000 characters', async () => {
      const oversized = 'a'.repeat(4001);
      const res = await request(app)
        .post('/api/v1/dsa-ai/analyze')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ question: oversized });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('analyzes a known problem and returns normalized DSA AI context structure', async () => {
      const res = await request(app)
        .post('/api/v1/dsa-ai/analyze')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ question: 'What is the optimal approach to solve Two Sum?' });

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();

      const { intent, matchedProblem, topic, pattern, context } = res.body.data;
      expect(intent).toBe('APPROACH');
      expect(matchedProblem).toBeDefined();
      expect(matchedProblem.title.toLowerCase()).toContain('two sum');
      expect(topic).toBe('Arrays');
      expect(pattern).toBe('Hash Map Lookup');

      // Normalized context structure
      expect(context).toBeDefined();
      expect(context.question).toBe('What is the optimal approach to solve Two Sum?');
      expect(context.intent).toBe('APPROACH');
      expect(context.matched).toBe(true);
      expect(context.confidence).toBeGreaterThan(0.8);
      expect(Array.isArray(context.graphContext)).toBe(true);
      expect(context.dataStructure).toBeDefined();
      expect(context.algorithm).toBeDefined();
    });

    it('analyzes a complexity question for an unknown query without crashing', async () => {
      const res = await request(app)
        .post('/api/v1/dsa-ai/analyze')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ question: 'What is the time complexity of nested loops O(N^2)?' });

      expect(res.status).toBe(200);
      expect(res.body.data.intent).toBe('COMPLEXITY');
      expect(res.body.data.matchedProblem).toBeNull();
      expect(res.body.data.context.matched).toBe(false);
    });

    it('no longer responds via legacy alias route /api/dsa-ai/analyze', async () => {
      const res = await request(app)
        .post('/api/dsa-ai/analyze')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ question: 'Give me a hint for Two Sum' });

      expect(res.status).toBe(404);
    });
  });
});
