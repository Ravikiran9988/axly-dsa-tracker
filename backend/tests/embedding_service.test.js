/**
 * Focused Tests for Gemini Embedding Service & Integration
 * 
 * Tests the 11 required scenarios:
 * 1. missing embedding key -> clean configuration/auth error
 * 2. valid Gemini response -> embedding returned
 * 3. invalid credentials -> authentication failure is surfaced correctly
 * 4. malformed embedding response -> clear error
 * 5. wrong vector dimensions -> clear validation error
 * 6. retry transient error
 * 7. no retry for 401/403
 * 8. questionNoveltyService.retrieveSimilarQuestions()
 * 9. preLLMRetrieval()
 * 10. postLLMDuplicateCheck()
 * 11. indexAcceptedQuestion()
 */

const https = require('https');
const EventEmitter = require('events');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

let mockTestDb = null;

// Mock database repository factory for novelty & indexing integration
jest.mock('../src/db/repositoryFactory', () => ({
  getRepository: () => ({
    one: async (sql, params) => {
      try { return mockTestDb.prepare(sql).get(...(params || [])); }
      catch { return null; }
    },
    many: async (sql, params) => {
      try { return mockTestDb.prepare(sql).all(...(params || [])); }
      catch { return []; }
    },
    execute: async (sql, params) => {
      try {
        const result = mockTestDb.prepare(sql).run(...(params || []));
        return { rowCount: result.changes };
      } catch { return { rowCount: 0 }; }
    },
    transaction: async (cb) => {
      const tx = {
        execute: async (sql, params) => {
          try {
            const result = mockTestDb.prepare(sql).run(...(params || []));
            return { rowCount: result.changes };
          } catch { return { rowCount: 0 }; }
        }
      };
      return cb(tx);
    }
  })
}));

const {
  EmbeddingProvider,
  createDefaultProvider,
  normalizeVector,
  cosineSimilarity,
  isAuthError,
  normalizeGeminiBaseUrl,
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL
} = require('../src/services/embeddingService');

const {
  retrieveSimilarQuestions,
  preLLMRetrieval,
  postLLMDuplicateCheck,
  indexAcceptedQuestion
} = require('../src/services/questionNoveltyService');

const {
  indexQuestion,
  getAllEmbeddings
} = require('../src/services/questionEmbeddingService');

describe('Gemini Embedding Integration & Provider Abstraction', () => {

  describe('1. Missing embedding key -> clean configuration/auth error', () => {
    it('reports isConfigured() = false when no keys are provided', () => {
      const provider = new EmbeddingProvider({ apiKeys: [] });
      expect(provider.isConfigured()).toBe(false);
    });

    it('reports isConfigured() = false when keys are empty strings or whitespace', () => {
      const provider = new EmbeddingProvider({ apiKeys: ['', '   '] });
      expect(provider.isConfigured()).toBe(false);
    });

    it('throws clean error on getEmbedding when unconfigured', async () => {
      const provider = new EmbeddingProvider({ apiKeys: [] });
      await expect(provider.getEmbedding('test problem text')).rejects.toThrow(
        'No embedding API keys configured'
      );
    });

    it('throws clean error on getEmbeddings when unconfigured', async () => {
      const provider = new EmbeddingProvider({ apiKeys: [] });
      await expect(provider.getEmbeddings(['test problem text'])).rejects.toThrow(
        'No embedding API keys configured'
      );
    });
  });

  describe('2. Valid Gemini response -> embedding returned with correct headers and schema', () => {
    let requestSpy;

    afterEach(() => {
      if (requestSpy) requestSpy.mockRestore();
    });

    it('calls Gemini endpoint with x-goog-api-key and returns 3072-dimension vector', async () => {
      const mockVector = new Array(3072).fill(0).map((_, i) => (i % 100) / 100);
      let capturedRequest = null;

      requestSpy = jest.spyOn(https, 'request').mockImplementation((options, callback) => {
        capturedRequest = options;
        const res = new EventEmitter();
        res.statusCode = 200;

        const req = new EventEmitter();
        req.write = jest.fn((body) => {
          capturedRequest.body = JSON.parse(body);
        });
        req.end = jest.fn(() => {
          process.nextTick(() => {
            callback(res);
            res.emit('data', JSON.stringify({
              embedding: {
                values: mockVector
              }
            }));
            res.emit('end');
          });
        });
        req.setTimeout = jest.fn();
        req.destroy = jest.fn();
        return req;
      });

      const provider = new EmbeddingProvider({
        provider: 'gemini',
        model: 'gemini-embedding-001',
        dimensions: 3072,
        apiKeys: ['test-gemini-key']
      });

      const embedding = await provider.getEmbedding('Given an array of integers, find two sum');

      // Verify URL and path
      expect(capturedRequest.hostname).toBe('generativelanguage.googleapis.com');
      expect(capturedRequest.path).toBe('/v1beta/models/gemini-embedding-001:embedContent');
      expect(capturedRequest.method).toBe('POST');

      // Verify header authentication
      expect(capturedRequest.headers['x-goog-api-key']).toBe('test-gemini-key');
      expect(capturedRequest.headers['Authorization']).toBeUndefined();

      // Verify Gemini request schema
      expect(capturedRequest.body).toEqual({
        content: {
          parts: [{ text: 'Given an array of integers, find two sum' }]
        },
        outputDimensionality: 3072
      });

      // Verify returned embedding
      expect(embedding).toHaveLength(3072);
      expect(embedding[0]).toBeCloseTo(0);
      expect(embedding[99]).toBeCloseTo(0.99);
    });

    it('normalizes base URLs ending with /openai to native Gemini endpoint', () => {
      const normalized = normalizeGeminiBaseUrl('https://generativelanguage.googleapis.com/v1beta/openai');
      expect(normalized).toBe('https://generativelanguage.googleapis.com/v1beta');

      const provider = new EmbeddingProvider({
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
        apiKeys: ['test-key']
      });
      expect(provider.baseUrl).toBe('https://generativelanguage.googleapis.com/v1beta');
    });

    it('handles batch embedding for Gemini via :batchEmbedContents', async () => {
      const mockVectorA = new Array(3072).fill(0.1);
      const mockVectorB = new Array(3072).fill(0.2);
      let capturedRequest = null;

      requestSpy = jest.spyOn(https, 'request').mockImplementation((options, callback) => {
        capturedRequest = options;
        const res = new EventEmitter();
        res.statusCode = 200;

        const req = new EventEmitter();
        req.write = jest.fn((body) => {
          capturedRequest.body = JSON.parse(body);
        });
        req.end = jest.fn(() => {
          process.nextTick(() => {
            callback(res);
            res.emit('data', JSON.stringify({
              embeddings: [
                { values: mockVectorA },
                { values: mockVectorB }
              ]
            }));
            res.emit('end');
          });
        });
        req.setTimeout = jest.fn();
        req.destroy = jest.fn();
        return req;
      });

      const provider = new EmbeddingProvider({
        provider: 'gemini',
        apiKeys: ['test-key'],
        dimensions: 3072
      });

      const embeddings = await provider.getEmbeddings(['Problem 1', 'Problem 2']);

      expect(capturedRequest.path).toBe('/v1beta/models/gemini-embedding-001:batchEmbedContents');
      expect(capturedRequest.body.requests).toHaveLength(2);
      expect(capturedRequest.body.requests[0].model).toBe('models/gemini-embedding-001');
      expect(capturedRequest.body.requests[0].outputDimensionality).toBe(3072);
      expect(embeddings).toHaveLength(2);
      expect(embeddings[0]).toHaveLength(3072);
      expect(embeddings[1]).toHaveLength(3072);
    });
  });

  describe('3. Invalid credentials -> authentication failure is surfaced correctly', () => {
    let requestSpy;

    afterEach(() => {
      if (requestSpy) requestSpy.mockRestore();
    });

    it('surfaces Gemini API_KEY_INVALID error cleanly', async () => {
      requestSpy = jest.spyOn(https, 'request').mockImplementation((options, callback) => {
        const res = new EventEmitter();
        res.statusCode = 400;

        const req = new EventEmitter();
        req.write = jest.fn();
        req.end = jest.fn(() => {
          process.nextTick(() => {
            callback(res);
            res.emit('data', JSON.stringify({
              error: {
                code: 400,
                message: 'API key not valid. Please pass a valid API key.',
                status: 'INVALID_ARGUMENT',
                details: [{
                  '@type': 'type.googleapis.com/google.rpc.ErrorInfo',
                  reason: 'API_KEY_INVALID'
                }]
              }
            }));
            res.emit('end');
          });
        });
        req.setTimeout = jest.fn();
        req.destroy = jest.fn();
        return req;
      });

      const provider = new EmbeddingProvider({
        apiKeys: ['invalid-gemini-key']
      });

      let caughtError = null;
      try {
        await provider.getEmbedding('test');
      } catch (err) {
        caughtError = err;
      }

      expect(caughtError).toBeTruthy();
      expect(caughtError.message).toContain('API key not valid');
      expect(isAuthError(caughtError)).toBe(true);
    });
  });

  describe('4. Malformed embedding response -> clear error', () => {
    let requestSpy;

    afterEach(() => {
      if (requestSpy) requestSpy.mockRestore();
    });

    it('throws when Gemini response lacks embedding.values', async () => {
      requestSpy = jest.spyOn(https, 'request').mockImplementation((options, callback) => {
        const res = new EventEmitter();
        res.statusCode = 200;

        const req = new EventEmitter();
        req.write = jest.fn();
        req.end = jest.fn(() => {
          process.nextTick(() => {
            callback(res);
            res.emit('data', JSON.stringify({
              embedding: { somethingElse: true }
            }));
            res.emit('end');
          });
        });
        req.setTimeout = jest.fn();
        req.destroy = jest.fn();
        return req;
      });

      const provider = new EmbeddingProvider({
        apiKeys: ['test-key']
      });

      await expect(provider.getEmbedding('test')).rejects.toThrow(
        'Invalid Gemini embedding response format'
      );
    });

    it('throws when response body is not valid JSON', async () => {
      requestSpy = jest.spyOn(https, 'request').mockImplementation((options, callback) => {
        const res = new EventEmitter();
        res.statusCode = 200;

        const req = new EventEmitter();
        req.write = jest.fn();
        req.end = jest.fn(() => {
          process.nextTick(() => {
            callback(res);
            res.emit('data', '<html><body>502 Bad Gateway</body></html>');
            res.emit('end');
          });
        });
        req.setTimeout = jest.fn();
        req.destroy = jest.fn();
        return req;
      });

      const provider = new EmbeddingProvider({
        apiKeys: ['test-key'],
        maxRetries: 0
      });

      await expect(provider.getEmbedding('test')).rejects.toThrow(
        'Invalid embedding response'
      );
    });
  });

  describe('5. Wrong vector dimensions -> clear validation error', () => {
    let requestSpy;

    afterEach(() => {
      if (requestSpy) requestSpy.mockRestore();
    });

    it('throws validation error when vector dimension does not match EMBEDDING_DIMENSIONS', async () => {
      const wrongVector = new Array(768).fill(0.1);

      requestSpy = jest.spyOn(https, 'request').mockImplementation((options, callback) => {
        const res = new EventEmitter();
        res.statusCode = 200;

        const req = new EventEmitter();
        req.write = jest.fn();
        req.end = jest.fn(() => {
          process.nextTick(() => {
            callback(res);
            res.emit('data', JSON.stringify({
              embedding: { values: wrongVector }
            }));
            res.emit('end');
          });
        });
        req.setTimeout = jest.fn();
        req.destroy = jest.fn();
        return req;
      });

      const provider = new EmbeddingProvider({
        apiKeys: ['test-key'],
        dimensions: 3072
      });

      await expect(provider.getEmbedding('test')).rejects.toThrow(
        'Embedding dimension mismatch: expected 3072, got 768'
      );
    });
  });

  describe('6. Retry transient error', () => {
    let requestSpy;

    afterEach(() => {
      if (requestSpy) requestSpy.mockRestore();
    });

    it('retries on 503 Service Unavailable and succeeds on subsequent attempt', async () => {
      let callCount = 0;
      const validVector = new Array(3072).fill(0.5);

      requestSpy = jest.spyOn(https, 'request').mockImplementation((options, callback) => {
        callCount++;
        const res = new EventEmitter();
        const req = new EventEmitter();
        req.write = jest.fn();
        req.setTimeout = jest.fn();
        req.destroy = jest.fn();

        if (callCount === 1) {
          res.statusCode = 503;
          req.end = jest.fn(() => {
            process.nextTick(() => {
              callback(res);
              res.emit('data', JSON.stringify({ error: { message: 'Service Temporarily Unavailable' } }));
              res.emit('end');
            });
          });
        } else {
          res.statusCode = 200;
          req.end = jest.fn(() => {
            process.nextTick(() => {
              callback(res);
              res.emit('data', JSON.stringify({ embedding: { values: validVector } }));
              res.emit('end');
            });
          });
        }
        return req;
      });

      const provider = new EmbeddingProvider({
        apiKeys: ['test-key'],
        maxRetries: 2,
        retryDelayMs: 10
      });

      const embedding = await provider.getEmbedding('test');
      expect(callCount).toBe(2);
      expect(embedding).toHaveLength(3072);
    });

    it('retries on 429 rate limit with backoff and succeeds', async () => {
      let callCount = 0;
      const validVector = new Array(3072).fill(0.3);

      requestSpy = jest.spyOn(https, 'request').mockImplementation((options, callback) => {
        callCount++;
        const res = new EventEmitter();
        const req = new EventEmitter();
        req.write = jest.fn();
        req.setTimeout = jest.fn();
        req.destroy = jest.fn();

        if (callCount === 1) {
          res.statusCode = 429;
          req.end = jest.fn(() => {
            process.nextTick(() => {
              callback(res);
              res.emit('data', JSON.stringify({ error: { message: 'Resource has been exhausted (quota)' } }));
              res.emit('end');
            });
          });
        } else {
          res.statusCode = 200;
          req.end = jest.fn(() => {
            process.nextTick(() => {
              callback(res);
              res.emit('data', JSON.stringify({ embedding: { values: validVector } }));
              res.emit('end');
            });
          });
        }
        return req;
      });

      const provider = new EmbeddingProvider({
        apiKeys: ['test-key'],
        maxRetries: 2,
        retryDelayMs: 10
      });

      const embedding = await provider.getEmbedding('test');
      expect(callCount).toBe(2);
      expect(embedding).toHaveLength(3072);
    });
  });

  describe('7. No retry for 401/403 or invalid API key', () => {
    let requestSpy;

    afterEach(() => {
      if (requestSpy) requestSpy.mockRestore();
    });

    it('does not retry when receiving 401 Unauthorized', async () => {
      let callCount = 0;

      requestSpy = jest.spyOn(https, 'request').mockImplementation((options, callback) => {
        callCount++;
        const res = new EventEmitter();
        res.statusCode = 401;

        const req = new EventEmitter();
        req.write = jest.fn();
        req.end = jest.fn(() => {
          process.nextTick(() => {
            callback(res);
            res.emit('data', JSON.stringify({ error: { message: 'Request had invalid authentication credentials.' } }));
            res.emit('end');
          });
        });
        req.setTimeout = jest.fn();
        req.destroy = jest.fn();
        return req;
      });

      const provider = new EmbeddingProvider({
        apiKeys: ['bad-key'],
        maxRetries: 3
      });

      await expect(provider.getEmbedding('test')).rejects.toThrow('invalid authentication');
      expect(callCount).toBe(1);
    });

    it('does not retry when receiving 403 Forbidden', async () => {
      let callCount = 0;

      requestSpy = jest.spyOn(https, 'request').mockImplementation((options, callback) => {
        callCount++;
        const res = new EventEmitter();
        res.statusCode = 403;

        const req = new EventEmitter();
        req.write = jest.fn();
        req.end = jest.fn(() => {
          process.nextTick(() => {
            callback(res);
            res.emit('data', JSON.stringify({ error: { message: 'The caller does not have permission' } }));
            res.emit('end');
          });
        });
        req.setTimeout = jest.fn();
        req.destroy = jest.fn();
        return req;
      });

      const provider = new EmbeddingProvider({
        apiKeys: ['bad-key'],
        maxRetries: 3
      });

      await expect(provider.getEmbedding('test')).rejects.toThrow('does not have permission');
      expect(callCount).toBe(1);
    });

    it('does not retry when receiving 400 with API_KEY_INVALID', async () => {
      let callCount = 0;

      requestSpy = jest.spyOn(https, 'request').mockImplementation((options, callback) => {
        callCount++;
        const res = new EventEmitter();
        res.statusCode = 400;

        const req = new EventEmitter();
        req.write = jest.fn();
        req.end = jest.fn(() => {
          process.nextTick(() => {
            callback(res);
            res.emit('data', JSON.stringify({
              error: {
                message: 'API key not valid. Please pass a valid API key.',
                details: [{ reason: 'API_KEY_INVALID' }]
              }
            }));
            res.emit('end');
          });
        });
        req.setTimeout = jest.fn();
        req.destroy = jest.fn();
        return req;
      });

      const provider = new EmbeddingProvider({
        apiKeys: ['bad-key'],
        maxRetries: 3
      });

      await expect(provider.getEmbedding('test')).rejects.toThrow('Please pass a valid API key');
      expect(callCount).toBe(1);
    });
  });

  describe('Configurable Provider Abstraction', () => {
    it('supports OpenAI-compatible provider when explicitly configured', async () => {
      let capturedRequest = null;
      const mockVector = new Array(1536).fill(0.05);

      const requestSpy = jest.spyOn(https, 'request').mockImplementation((options, callback) => {
        capturedRequest = options;
        const res = new EventEmitter();
        res.statusCode = 200;

        const req = new EventEmitter();
        req.write = jest.fn((body) => {
          capturedRequest.body = JSON.parse(body);
        });
        req.end = jest.fn(() => {
          process.nextTick(() => {
            callback(res);
            res.emit('data', JSON.stringify({
              data: [{ embedding: mockVector }]
            }));
            res.emit('end');
          });
        });
        req.setTimeout = jest.fn();
        req.destroy = jest.fn();
        return req;
      });

      const provider = new EmbeddingProvider({
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        model: 'text-embedding-3-small',
        dimensions: 1536,
        apiKeys: ['sk-openai-key']
      });

      const embedding = await provider.getEmbedding('OpenAI embedding test');

      expect(capturedRequest.hostname).toBe('api.openai.com');
      expect(capturedRequest.path).toBe('/v1/embeddings');
      expect(capturedRequest.headers['Authorization']).toBe('Bearer sk-openai-key');
      expect(capturedRequest.body).toEqual({
        model: 'text-embedding-3-small',
        input: 'OpenAI embedding test'
      });
      expect(embedding).toHaveLength(1536);

      requestSpy.mockRestore();
    });
  });
});

describe('Novelty & Indexing Lifecycle Integration with Gemini Provider', () => {
  let testDbPath;

  // Deterministic mock vector generator
  function createDeterministicVector(seed, dim = 3072) {
    const vec = new Array(dim).fill(0).map((_, i) => Math.sin((seed + i) * 0.05));
    return normalizeVector(vec);
  }

  const mockProvider = {
    isConfigured: () => true,
    name: 'gemini-embedding',
    model: 'gemini-embedding-001',
    dimensions: 3072,
    getEmbedding: jest.fn(async (text) => {
      const lower = String(text).toLowerCase();
      if (lower.includes('two sum') || lower.includes('pair sum')) {
        return createDeterministicVector(100);
      }
      if (lower.includes('three sum')) {
        return createDeterministicVector(200);
      }
      if (lower.includes('lru cache')) {
        return createDeterministicVector(500);
      }
      const seed = Array.from(text).reduce((acc, c) => acc + c.charCodeAt(0), 0);
      return createDeterministicVector(seed);
    }),
    getEmbeddings: jest.fn(async (texts) => {
      return Promise.all(texts.map(t => mockProvider.getEmbedding(t)));
    })
  };

  beforeAll(() => {
    testDbPath = path.join(__dirname, `test_gemini_novelty_${Date.now()}.db`);
    mockTestDb = new Database(testDbPath);
    mockTestDb.exec(`
      CREATE TABLE IF NOT EXISTS topics (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE);
      CREATE TABLE IF NOT EXISTS patterns (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, applicable_topics TEXT DEFAULT '[]');
      CREATE TABLE IF NOT EXISTS questions (
        id TEXT PRIMARY KEY, title TEXT NOT NULL, slug TEXT, difficulty TEXT DEFAULT 'medium',
        topic_id TEXT, pattern_id TEXT, description TEXT, problem_statement TEXT,
        constraints TEXT, input_format TEXT, output_format TEXT,
        example_input TEXT, example_output TEXT, examples TEXT,
        hints TEXT, tags TEXT, solution_approach TEXT, editorial TEXT,
        complexity TEXT, starter_code TEXT, reference_solution TEXT,
        supported_languages TEXT, is_practice INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1, created_by TEXT, status TEXT DEFAULT 'draft',
        created_via TEXT DEFAULT 'manual', embedding_indexed_at TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS question_embeddings (
        id TEXT PRIMARY KEY, question_id TEXT NOT NULL, embedding TEXT NOT NULL,
        content_hash TEXT NOT NULL, embedding_model TEXT NOT NULL DEFAULT 'gemini-embedding-001',
        embedding_version INTEGER NOT NULL DEFAULT 1,
        indexed_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(question_id, embedding_model, embedding_version)
      );
    `);

    // Insert sample topic and pattern
    mockTestDb.prepare("INSERT INTO topics (id, name) VALUES ('top-1', 'Arrays')").run();
    mockTestDb.prepare("INSERT INTO patterns (id, name) VALUES ('pat-1', 'Two Pointers')").run();

    // Insert existing questions
    mockTestDb.prepare(`
      INSERT INTO questions (id, title, topic_id, pattern_id, difficulty, description, is_active)
      VALUES ('q-1', 'Two Sum', 'top-1', 'pat-1', 'easy', 'Find two numbers that add up to target', 1)
    `).run();

    mockTestDb.prepare(`
      INSERT INTO questions (id, title, topic_id, pattern_id, difficulty, description, is_active)
      VALUES ('q-2', 'Three Sum', 'top-1', 'pat-1', 'medium', 'Find three numbers that sum to zero', 1)
    `).run();

    // Index existing questions
    const vec1 = createDeterministicVector(100);
    const vec2 = createDeterministicVector(200);

    mockTestDb.prepare(`
      INSERT INTO question_embeddings (id, question_id, embedding, content_hash, embedding_model)
      VALUES ('emb-1', 'q-1', ?, 'hash1', 'gemini-embedding-001')
    `).run(JSON.stringify(vec1));

    mockTestDb.prepare(`
      INSERT INTO question_embeddings (id, question_id, embedding, content_hash, embedding_model)
      VALUES ('emb-2', 'q-2', ?, 'hash2', 'gemini-embedding-001')
    `).run(JSON.stringify(vec2));
  });

  afterAll(() => {
    if (mockTestDb) {
      mockTestDb.close();
      try { fs.unlinkSync(testDbPath); } catch (_) {}
    }
  });

  describe('8. questionNoveltyService.retrieveSimilarQuestions()', () => {
    it('returns similar questions ranked by cosine similarity', async () => {
      const results = await retrieveSimilarQuestions(
        { title: 'Two Sum' },
        { provider: mockProvider, topK: 5 }
      );

      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].questionId).toBe('q-1');
      expect(results[0].similarity).toBeCloseTo(1.0, 2);
    });

    it('returns empty array when provider is not configured', async () => {
      const unconfiguredProvider = { isConfigured: () => false };
      const results = await retrieveSimilarQuestions(
        { title: 'Two Sum' },
        { provider: unconfiguredProvider }
      );
      expect(results).toEqual([]);
    });
  });

  describe('9. preLLMRetrieval()', () => {
    it('generates exclusion context containing existing question titles and patterns', async () => {
      const result = await preLLMRetrieval(
        { title: 'Two Sum', topic: 'Arrays', pattern: 'Two Pointers', difficulty: 'easy' },
        { provider: mockProvider }
      );

      expect(result.similarCount).toBeGreaterThan(0);
      expect(result.similarTitles).toContain('Two Sum');
      expect(result.exclusionContext).toContain('EXISTING QUESTIONS TO AVOID');
      expect(result.exclusionContext).toContain('Two Sum');
    });

    it('returns empty context when provider is not configured', async () => {
      const unconfiguredProvider = { isConfigured: () => false };
      const result = await preLLMRetrieval(
        { topic: 'Graphs', pattern: 'Dijkstra' },
        { provider: unconfiguredProvider }
      );

      expect(result.similarCount).toBe(0);
      expect(result.similarTitles).toEqual([]);
      expect(result.exclusionContext).toBe('');
    });
  });

  describe('10. postLLMDuplicateCheck()', () => {
    it('classifies identical semantic candidate as DUPLICATE', async () => {
      const result = await postLLMDuplicateCheck(
        { title: 'Two Sum', difficulty: 'easy', topic_name: 'Arrays', description: 'Find two numbers that sum to target' },
        { provider: mockProvider }
      );

      expect(result.classification).toBe('DUPLICATE');
      expect(result.maxSimilarity).toBeCloseTo(1.0, 2);
      expect(result.embeddingAvailable).toBe(true);
    });

    it('classifies completely distinct candidate as NOVEL', async () => {
      const result = await postLLMDuplicateCheck(
        { title: 'LRU Cache Design', difficulty: 'hard', topic_name: 'Design', description: 'Implement LRU Cache structure' },
        { provider: mockProvider }
      );

      expect(result.classification).toBe('NOVEL');
      expect(result.embeddingAvailable).toBe(true);
    });

    it('returns UNAVAILABLE when provider is not configured (fail-closed preserving gate)', async () => {
      const unconfiguredProvider = { isConfigured: () => false };
      const result = await postLLMDuplicateCheck(
        { title: 'Any Problem' },
        { provider: unconfiguredProvider }
      );

      expect(result.classification).toBe('UNAVAILABLE');
      expect(result.embeddingAvailable).toBe(false);
    });
  });

  describe('11. indexAcceptedQuestion()', () => {
    it('indexes accepted question idempotently using content hash into database', async () => {
      // First, insert question into questions table
      mockTestDb.prepare(`
        INSERT INTO questions (id, title, topic_id, difficulty, description, is_active)
        VALUES ('q-3', 'Maximum Subarray Sum', 'top-1', 'medium', 'Find contiguous subarray with maximum sum', 1)
      `).run();

      const questionData = {
        title: 'Maximum Subarray Sum',
        description: 'Find contiguous subarray with maximum sum',
        difficulty: 'medium',
        topic_name: 'Arrays'
      };

      const result1 = await indexAcceptedQuestion('q-3', questionData, { provider: mockProvider });
      expect(result1.success).toBe(true);
      expect(result1.stored).toBe(true);

      // Verify row exists in DB
      const row = mockTestDb.prepare('SELECT * FROM question_embeddings WHERE question_id = ?').get('q-3');
      expect(row).toBeTruthy();
      expect(row.embedding_model).toBe('gemini-embedding-001');

      // Second call with same data -> idempotent skip (already_indexed)
      const result2 = await indexAcceptedQuestion('q-3', questionData, { provider: mockProvider });
      expect(result2.success).toBe(true);
      expect(result2.reason).toBe('already_indexed');
      expect(result2.id).toBeTruthy();
    });
  });
});
