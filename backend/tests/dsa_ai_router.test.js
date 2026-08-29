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
const aiCache = require('../src/services/dsaAiCacheService');

describe('Phase 2: DSA LLM Router & Provider Fallback Suite', () => {
  let studentToken;
  let studentUser;
  const repo = getRepository();

  beforeAll(async () => {
    initSchema();
    seedDatabase();
    seedPracticeProblems();

    studentUser = await repo.one("SELECT id, email, role FROM users WHERE role NOT IN ('admin', 'system') LIMIT 1");
    if (!studentUser) {
      studentUser = { id: 'usr-student-ai-p2', email: 'aip2@axly.in', role: 'user' };
      await repo.execute(
        "INSERT INTO users (id, name, email, role) VALUES (?, 'AI Tester P2', ?, 'user')",
        [studentUser.id, studentUser.email]
      );
    }
    studentToken = generateToken(studentUser);
  });

  beforeEach(() => {
    aiCache.clear();
    llmRouter.initializeDefaultProviders();
  });

  describe('1. Provider Abstraction & Router Fallback', () => {
    it('Provider A success: executes primary provider when healthy', async () => {
      const mockA = new MockProvider({ name: 'mock-a', customText: 'Direct answer from Provider A' });
      const mockB = new MockProvider({ name: 'mock-b', customText: 'Backup answer from Provider B' });

      llmRouter.registerProvider('mock-a', mockA);
      llmRouter.registerProvider('mock-b', mockB);
      llmRouter.setProviderOrder(['mock-a', 'mock-b']);

      const res = await llmRouter.generate({ prompt: 'How do I solve Two Sum?' });

      expect(res.source).toBe('llm');
      expect(res.provider).toBe('mock-a');
      expect(res.text).toBe('Direct answer from Provider A');
      expect(res.usage).toBeDefined();
    });

    it('Provider A timeout -> Falls back to Provider B', async () => {
      const mockA = new MockProvider({ name: 'mock-a', behavior: 'timeout' });
      const mockB = new MockProvider({ name: 'mock-b', customText: 'Recovered answer from Provider B' });

      llmRouter.registerProvider('mock-a', mockA);
      llmRouter.registerProvider('mock-b', mockB);
      llmRouter.setProviderOrder(['mock-a', 'mock-b']);

      const res = await llmRouter.generate({ prompt: 'How do I solve Two Sum?', timeoutMs: 50 });

      expect(res.source).toBe('llm');
      expect(res.provider).toBe('mock-b');
      expect(res.text).toBe('Recovered answer from Provider B');
    });

    it('Provider A quota/rate-limit error -> Falls back to Provider B', async () => {
      const mockA = new MockProvider({ name: 'mock-a', behavior: 'quota_error' });
      const mockB = new MockProvider({ name: 'mock-b', customText: 'Provider B succeeded after quota exceeded' });

      llmRouter.registerProvider('mock-a', mockA);
      llmRouter.registerProvider('mock-b', mockB);
      llmRouter.setProviderOrder(['mock-a', 'mock-b']);

      const res = await llmRouter.generate({ prompt: 'Explain dynamic programming memoization.' });

      expect(res.source).toBe('llm');
      expect(res.provider).toBe('mock-b');
      expect(res.text).toBe('Provider B succeeded after quota exceeded');
    });

    it('All providers fail -> Returns graceful fallback response without crashing', async () => {
      const mockA = new MockProvider({ name: 'mock-a', behavior: 'server_error' });
      const mockB = new MockProvider({ name: 'mock-b', behavior: 'quota_error' });

      llmRouter.registerProvider('mock-a', mockA);
      llmRouter.registerProvider('mock-b', mockB);
      llmRouter.setProviderOrder(['mock-a', 'mock-b']);

      const res = await llmRouter.generate({ prompt: 'How to traverse a binary tree?' });

      expect(res.source).toBe('fallback');
      expect(res.provider).toBe('fallback');
      expect(res.text).toContain('temporarily unavailable');
      expect(res.error).toBeDefined();
    });

    it('Skips unconfigured providers in the order list', async () => {
      const unconfigured = new MockProvider({ name: 'unconfigured-prov', apiKey: '' });
      const configured = new MockProvider({ name: 'configured-prov', apiKey: 'valid-key', customText: 'Configured response' });

      llmRouter.registerProvider('unconfigured-prov', unconfigured);
      llmRouter.registerProvider('configured-prov', configured);
      llmRouter.setProviderOrder(['unconfigured-prov', 'configured-prov']);

      const res = await llmRouter.generate({ prompt: 'Test skipping unconfigured' });

      expect(res.source).toBe('llm');
      expect(res.provider).toBe('configured-prov');
      expect(res.text).toBe('Configured response');
    });
  });

  describe('2. Deterministic Intelligence & Token Controls', () => {
    it('Deterministic database answer avoids LLM call for stored hints', async () => {
      // Setup mock to fail if called
      const failingMock = new MockProvider({ name: 'should-not-be-called', behavior: 'server_error' });
      llmRouter.registerProvider('failing-mock', failingMock);
      llmRouter.setProviderOrder(['failing-mock']);

      const res = await dsaAiService.generateGuidance({
        question: 'Give me a hint for Two Sum',
        problemId: 'q-two-sum'
      });

      expect(res.source).toBe('database');
      expect(res.provider).toBe('database');
      expect(res.guidance).toBeDefined();
      expect(res.guidance.toLowerCase()).toContain('hash');
    });

    it('Caches deterministic non-personalized queries and reuses cached response', async () => {
      const mockA = new MockProvider({ name: 'mock-cache-test', customText: 'Original LLM calculation' });
      llmRouter.registerProvider('mock-cache-test', mockA);
      llmRouter.setProviderOrder(['mock-cache-test']);

      // 1st call -> LLM
      const res1 = await dsaAiService.generateGuidance({
        question: 'Explain the complexity of Two Sum in detail',
        forceLlm: true
      });
      expect(res1.source).toBe('llm');
      expect(res1.guidance).toBe('Original LLM calculation');

      // Change provider behavior to verify second call comes from cache
      mockA.setBehavior('server_error');

      // 2nd call -> Cache
      const res2 = await dsaAiService.generateGuidance({
        question: 'Explain the complexity of Two Sum in detail',
        forceLlm: true
      });
      expect(res2.source).toBe('cache');
      expect(res2.guidance).toBe('Original LLM calculation');
    });

    it('API key credentials never appear in response payloads', async () => {
      const secretKey = 'sk-SUPER-SECRET-API-KEY-12345';
      const mockWithSecret = new MockProvider({
        name: 'secret-prov',
        apiKey: secretKey,
        behavior: 'server_error'
      });
      llmRouter.registerProvider('secret-prov', mockWithSecret);
      llmRouter.setProviderOrder(['secret-prov']);

      const res = await llmRouter.generate({ prompt: 'Test secrecy' });
      const serialized = JSON.stringify(res);

      expect(serialized).not.toContain(secretKey);
    });
  });

  describe('3. Authenticated AI Generation API (POST /api/v1/dsa-ai/generate)', () => {
    it('returns 401 Unauthorized when no token is provided', async () => {
      const res = await request(app)
        .post('/api/v1/dsa-ai/generate')
        .send({ question: 'How do I solve Two Sum?' });

      expect(res.status).toBe(401);
    });

    it('returns 400 Bad Request when question is missing or empty', async () => {
      const res = await request(app)
        .post('/api/v1/dsa-ai/generate')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ question: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('generates guidance with multi-provider fallback via API', async () => {
      const mockA = new MockProvider({ name: 'mock-api-prov', customText: 'Step-by-step guidance from Mock Provider.' });
      llmRouter.registerProvider('mock-api-prov', mockA);
      llmRouter.setProviderOrder(['mock-api-prov']);

      const res = await request(app)
        .post('/api/v1/dsa-ai/generate')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          question: 'How do I approach Two Sum?',
          forceLlm: true
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.intent).toBe('APPROACH');
      expect(res.body.data.guidance).toBe('Step-by-step guidance from Mock Provider.');
      expect(res.body.data.source).toBe('llm');
    });

    it('no longer responds via legacy alias route /api/dsa-ai/generate', async () => {
      const res = await request(app)
        .post('/api/dsa-ai/generate')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          question: 'Give me a hint for Two Sum'
        });

      expect(res.status).toBe(404);
    });
  });
});
