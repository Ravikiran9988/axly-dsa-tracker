/**
 * Question Novelty System — Real Service Integration Tests
 * 
 * Tests the actual service flow using:
 * - Real SQLite test database
 * - Real questionEmbeddingService
 * - Real questionNoveltyService
 * - Mocked embedding provider with deterministic semantic similarity
 * 
 * Mock Embedding Design:
 * - Identical content → identical embedding → similarity = 1.0
 * - Content in same "concept group" → similar embedding → similarity ≈ 0.92
 * - Content in different "concept groups" → different embedding → similarity ≈ 0.3
 */

const path = require('path');
const Database = require('better-sqlite3');

let mockTestDb = null;

// Mock embedding provider — all logic must be self-contained inside the factory
jest.mock('../src/services/embeddingService', () => {
  const actual = jest.requireActual('../src/services/embeddingService');
  
  const CONCEPT_GROUPS = {
    'two-sum': ['two sum', 'two numbers', 'add to target', 'pair sum', 'find two'],
    'shortest-path': ['shortest path', 'minimum hops', 'minimum edges', 'min distance', 'unweighted graph'],
    'maximum-subarray': ['maximum subarray', 'largest sum', 'contiguous subarray', 'max sum'],
    'valid-anagram': ['valid anagram', 'anagram', 'rearrange letters', 'check if two strings'],
    'binary-search': ['binary search', 'search sorted', 'find target in sorted'],
  };

  function getConceptGroup(text) {
    const lower = text.toLowerCase();
    for (const [group, keywords] of Object.entries(CONCEPT_GROUPS)) {
      for (const keyword of keywords) {
        if (lower.includes(keyword)) return group;
      }
    }
    return 'other-' + Array.from(lower).reduce((acc, c) => acc + c.charCodeAt(0), 0) % 100;
  }

  function generateDeterministicEmbedding(text, conceptGroup) {
    const seed = Array.from(conceptGroup).reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const embedding = new Array(1024).fill(0).map((_, i) => {
      const s = (seed + i) % 100;
      return Math.sin(s * 0.1) * 0.5 + 0.5;
    });
    // Normalize
    let norm = 0;
    for (let i = 0; i < embedding.length; i++) norm += embedding[i] * embedding[i];
    norm = Math.sqrt(norm);
    if (norm > 0) for (let i = 0; i < embedding.length; i++) embedding[i] /= norm;
    // Small variation for identical vs same-concept distinction
    const textHash = Array.from(text).reduce((acc, c) => acc + c.charCodeAt(0), 0);
    for (let i = 0; i < Math.min(10, embedding.length); i++) {
      embedding[i] += Math.sin(textHash + i) * 0.001;
    }
    // Re-normalize
    norm = 0;
    for (let i = 0; i < embedding.length; i++) norm += embedding[i] * embedding[i];
    norm = Math.sqrt(norm);
    if (norm > 0) for (let i = 0; i < embedding.length; i++) embedding[i] /= norm;
    return embedding;
  }

  const mockProvider = {
    isConfigured: jest.fn(() => true),
    getEmbedding: jest.fn(async (text) => {
      return generateDeterministicEmbedding(text, getConceptGroup(text));
    }),
    getEmbeddings: jest.fn(async (texts) => {
      return Promise.all(texts.map(t => mockProvider.getEmbedding(t)));
    }),
    name: 'mock-embedding',
    model: 'mock-model'
  };
  
  return {
    EmbeddingProvider: class MockEmbeddingProvider {},
    createDefaultProvider: () => mockProvider,
    normalizeVector: actual.normalizeVector,
    cosineSimilarity: actual.cosineSimilarity,
    defaultProvider: mockProvider,
    EMBEDDING_MODEL: 'mock-model',
    EMBEDDING_DIMENSIONS: 1024
  };
});

// Mock repository factory
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

const { computeContentHash, buildEmbeddingDocument, indexQuestion, getAllEmbeddings } = require('../src/services/questionEmbeddingService');
const { retrieveSimilarQuestions, classifyCandidate, preLLMRetrieval, postLLMDuplicateCheck, indexAcceptedQuestion } = require('../src/services/questionNoveltyService');
const { cosineSimilarity } = require('../src/services/embeddingService');

describe('Question Novelty — Real Service Integration', () => {
  let testDbPath;
  
  beforeAll(() => {
    testDbPath = path.join(__dirname, `test_novelty_${Date.now()}.db`);
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
        content_hash TEXT NOT NULL, embedding_model TEXT NOT NULL DEFAULT 'mock-model',
        embedding_version INTEGER NOT NULL DEFAULT 1,
        indexed_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(question_id, embedding_model, embedding_version)
      );
      CREATE INDEX IF NOT EXISTS idx_qe_qid ON question_embeddings(question_id);
      CREATE INDEX IF NOT EXISTS idx_qe_hash ON question_embeddings(content_hash);
    `);
    mockTestDb.prepare('INSERT OR IGNORE INTO topics (id, name) VALUES (?, ?)').run('topic-arrays', 'Arrays');
    mockTestDb.prepare('INSERT OR IGNORE INTO topics (id, name) VALUES (?, ?)').run('topic-graphs', 'Graphs');
    mockTestDb.prepare('INSERT OR IGNORE INTO topics (id, name) VALUES (?, ?)').run('topic-strings', 'Strings');
  });
  
  afterAll(() => {
    if (mockTestDb) mockTestDb.close();
    try { const fs = require('fs'); if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath); } catch (_) {}
  });
  
  beforeEach(() => {
    mockTestDb.prepare('DELETE FROM question_embeddings').run();
    mockTestDb.prepare('DELETE FROM questions').run();
  });
  
  describe('A. Exact Duplicate Detection', () => {
    it('should classify exact identical question as DUPLICATE (similarity ≥ 0.88)', async () => {
      mockTestDb.prepare(`INSERT INTO questions (id, title, difficulty, topic_id, description, is_active) VALUES (?, ?, ?, ?, ?, 1)`).run('q-1', 'Two Sum', 'easy', 'topic-arrays', 'Find two numbers that add to target');
      await indexQuestion('q-1', { title: 'Two Sum', difficulty: 'easy', topic_name: 'Arrays', description: 'Find two numbers that add to target' });
      const result = await classifyCandidate({ title: 'Two Sum', difficulty: 'easy', topic_name: 'Arrays', description: 'Find two numbers that add to target' });
      expect(result.classification).toBe('DUPLICATE');
      expect(result.maxSimilarity).toBeGreaterThanOrEqual(0.88);
    });
  });
  
  describe('B. Semantic Duplicate with Different Title', () => {
    it('should classify semantic duplicate as DUPLICATE or BORDERLINE (similarity ≥ 0.75)', async () => {
      mockTestDb.prepare(`INSERT INTO questions (id, title, difficulty, topic_id, description, is_active) VALUES (?, ?, ?, ?, ?, 1)`).run('q-sp', 'Shortest Path in Unweighted Graph', 'medium', 'topic-graphs', 'Find the minimum number of edges to reach target');
      await indexQuestion('q-sp', { title: 'Shortest Path in Unweighted Graph', difficulty: 'medium', topic_name: 'Graphs', pattern_name: 'BFS', description: 'Find the minimum number of edges to reach target' });
      const result = await classifyCandidate({ title: 'Minimum Hops Between Two Nodes', difficulty: 'medium', topic_name: 'Graphs', pattern_name: 'BFS', description: 'Find the minimum number of hops to reach destination' });
      expect(['DUPLICATE', 'BORDERLINE']).toContain(result.classification);
      expect(result.maxSimilarity).toBeGreaterThanOrEqual(0.75);
    });
  });
  
  describe('D. Same Topic but Genuinely Different Problem', () => {
    it('should classify genuinely different problems as NOVEL (similarity < 0.75)', async () => {
      mockTestDb.prepare(`INSERT INTO questions (id, title, difficulty, topic_id, description, is_active) VALUES (?, ?, ?, ?, ?, 1)`).run('q-ts', 'Two Sum', 'easy', 'topic-arrays', 'Find two numbers that add to target');
      await indexQuestion('q-ts', { title: 'Two Sum', difficulty: 'easy', topic_name: 'Arrays', description: 'Find two numbers that add to target' });
      const result = await classifyCandidate({ title: 'Valid Anagram', difficulty: 'easy', topic_name: 'Strings', description: 'Check if two strings are anagrams of each other' });
      expect(result.classification).toBe('NOVEL');
      expect(result.maxSimilarity).toBeLessThan(0.75);
    });
  });
  
  describe('F. Pre-LLM Retrieval', () => {
    it('should return empty context when no questions are indexed', async () => {
      const result = await preLLMRetrieval({ topic: 'Arrays', difficulty: 'easy', pattern: 'Two Pointers' });
      expect(result.exclusionContext).toBe('');
      expect(result.similarTitles).toEqual([]);
      expect(result.similarCount).toBe(0);
    });
    
    it('should retrieve similar questions and build exclusion context with metadata', async () => {
      const qs = [
        { id: 'q-1', title: 'Two Sum', desc: 'Find two numbers that add to target', topic: 'topic-arrays' },
        { id: 'q-2', title: 'Three Sum', desc: 'Find three numbers that add to zero', topic: 'topic-arrays' },
        { id: 'q-3', title: 'Valid Anagram', desc: 'Check if two strings are anagrams', topic: 'topic-strings' }
      ];
      for (const q of qs) {
        mockTestDb.prepare(`INSERT INTO questions (id, title, difficulty, topic_id, description, is_active) VALUES (?, ?, ?, ?, ?, 1)`).run(q.id, q.title, 'easy', q.topic, q.desc);
        await indexQuestion(q.id, { title: q.title, difficulty: 'easy', topic_name: q.topic === 'topic-arrays' ? 'Arrays' : 'Strings', description: q.desc });
      }
      const result = await preLLMRetrieval({ title: 'Two Sum', topic: 'Arrays', difficulty: 'easy', pattern: 'Two Pointers' });
      expect(result.similarTitles.length).toBeGreaterThan(0);
      expect(result.similarCount).toBeGreaterThan(0);
      expect(result.exclusionContext).toContain('EXISTING QUESTIONS TO AVOID');
      // Must contain at least one relevant title from same concept group
      const hasRelevant = result.similarTitles.some(t => t.includes('Two Sum') || t.includes('Three Sum'));
      expect(hasRelevant).toBe(true);
    });
  });
  
  describe('G. Post-LLM Duplicate Detection', () => {
    it('should reject exact duplicate via postLLMDuplicateCheck', async () => {
      mockTestDb.prepare(`INSERT INTO questions (id, title, difficulty, topic_id, description, is_active) VALUES (?, ?, ?, ?, ?, 1)`).run('q-ex', 'Two Sum', 'easy', 'topic-arrays', 'Find two numbers that add to target');
      await indexQuestion('q-ex', { title: 'Two Sum', difficulty: 'easy', topic_name: 'Arrays', description: 'Find two numbers that add to target' });
      const result = await postLLMDuplicateCheck({ title: 'Two Sum', difficulty: 'easy', topic_name: 'Arrays', description: 'Find two numbers that add to target' });
      expect(result.classification).toBe('DUPLICATE');
      expect(result.maxSimilarity).toBeGreaterThanOrEqual(0.88);
      expect(result.similarQuestions.length).toBeGreaterThan(0);
    });
  });
  
  describe('J. Idempotent Indexing', () => {
    it('should not create duplicate embeddings for same content (exactly 1 row)', async () => {
      mockTestDb.prepare(`INSERT INTO questions (id, title, difficulty, description, is_active) VALUES (?, ?, ?, ?, 1)`).run('q-id', 'Two Sum', 'easy', 'Find two numbers that add to target');
      const data = { title: 'Two Sum', difficulty: 'easy', description: 'Find two numbers that add to target' };
      const r1 = await indexQuestion('q-id', data);
      const r2 = await indexQuestion('q-id', data);
      expect(r1.success).toBe(true);
      expect(r2.success).toBe(true);
      expect(r2.reason).toBe('already_indexed');
      const rows = mockTestDb.prepare('SELECT * FROM question_embeddings WHERE question_id = ?').all('q-id');
      expect(rows.length).toBe(1);
      expect(rows[0].content_hash).toBe(computeContentHash(data));
    });
  });
  
  describe('K. Content Update Re-indexing', () => {
    it('should re-index when content changes (new hash, updated embedding)', async () => {
      mockTestDb.prepare(`INSERT INTO questions (id, title, difficulty, description, is_active) VALUES (?, ?, ?, ?, 1)`).run('q-up', 'Two Sum', 'easy', 'Find two numbers that add to target');
      const orig = { title: 'Two Sum', difficulty: 'easy', description: 'Find two numbers that add to target' };
      await indexQuestion('q-up', orig);
      const origHash = computeContentHash(orig);
      const e1 = mockTestDb.prepare('SELECT * FROM question_embeddings WHERE question_id = ?').get('q-up');
      expect(e1.content_hash).toBe(origHash);
      const updated = { title: 'Two Sum', difficulty: 'medium', description: 'Find two numbers that add to target in an array' };
      const r2 = await indexQuestion('q-up', updated, { force: true });
      expect(r2.success).toBe(true);
      expect(r2.reason).toBe('updated');
      const newHash = computeContentHash(updated);
      expect(origHash).not.toBe(newHash);
      const e2 = mockTestDb.prepare('SELECT * FROM question_embeddings WHERE question_id = ?').get('q-up');
      expect(e2.content_hash).toBe(newHash);
    });
  });
  
  describe('L. Inactive Question Exclusion', () => {
    it('should exclude inactive questions from getAllEmbeddings retrieval', async () => {
      mockTestDb.prepare(`INSERT INTO questions (id, title, difficulty, description, is_active) VALUES (?, ?, ?, ?, 1)`).run('q-act', 'Two Sum', 'easy', 'Find two numbers that add to target');
      await indexQuestion('q-act', { title: 'Two Sum', difficulty: 'easy', description: 'Find two numbers that add to target' });
      mockTestDb.prepare(`INSERT INTO questions (id, title, difficulty, description, is_active) VALUES (?, ?, ?, ?, 0)`).run('q-inact', 'Valid Anagram', 'easy', 'Check if two strings are anagrams');
      await indexQuestion('q-inact', { title: 'Valid Anagram', difficulty: 'easy', description: 'Check if two strings are anagrams' });
      const dbCount = mockTestDb.prepare('SELECT COUNT(*) as c FROM question_embeddings').get();
      expect(dbCount.c).toBe(2);
      const all = await getAllEmbeddings();
      expect(all.length).toBe(1);
      expect(all[0].questionId).toBe('q-act');
    });
  });
  
  describe('M. Embedding Unavailable', () => {
    it('should return UNAVAILABLE when provider is not configured', async () => {
      const svc = require('../src/services/embeddingService');
      const orig = svc.defaultProvider.isConfigured;
      svc.defaultProvider.isConfigured = jest.fn(() => false);
      try {
        const result = await classifyCandidate({ title: 'Two Sum', difficulty: 'easy', description: 'Find two numbers' });
        expect(result.classification).toBe('UNAVAILABLE');
        expect(result.embeddingAvailable).toBe(false);
      } finally { svc.defaultProvider.isConfigured = orig; }
    });
  });
  
  describe('N. Daily Challenge Indexing', () => {
    it('should create embedding for Daily Challenge question via indexAcceptedQuestion', async () => {
      mockTestDb.prepare(`INSERT INTO questions (id, title, difficulty, description, is_active) VALUES (?, ?, ?, ?, 1)`).run('q-dc', 'Daily Challenge Problem', 'medium', 'Solve this daily challenge');
      const before = mockTestDb.prepare('SELECT COUNT(*) as c FROM question_embeddings WHERE question_id = ?').get('q-dc');
      expect(before.c).toBe(0);
      const result = await indexAcceptedQuestion('q-dc', { title: 'Daily Challenge Problem', difficulty: 'medium', description: 'Solve this daily challenge' });
      expect(result.success).toBe(true);
      const emb = mockTestDb.prepare('SELECT * FROM question_embeddings WHERE question_id = ?').get('q-dc');
      expect(emb).toBeTruthy();
      expect(emb.question_id).toBe('q-dc');
      const parsed = JSON.parse(emb.embedding);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(1024);
    });
  });
  
  describe('Cosine Similarity Verification', () => {
    it('should produce similarity = 1.0 for identical embeddings', async () => {
      const e1 = await require('../src/services/embeddingService').defaultProvider.getEmbedding('Two Sum');
      const e2 = await require('../src/services/embeddingService').defaultProvider.getEmbedding('Two Sum');
      expect(cosineSimilarity(e1, e2)).toBeCloseTo(1.0, 4);
    });
    it('should produce high similarity (≥ 0.88) for same-concept content', async () => {
      const e1 = await require('../src/services/embeddingService').defaultProvider.getEmbedding('Find two numbers that add to target');
      const e2 = await require('../src/services/embeddingService').defaultProvider.getEmbedding('Two Sum');
      expect(cosineSimilarity(e1, e2)).toBeGreaterThanOrEqual(0.88);
    });
    it('should produce low similarity (< 0.75) for different-concept content', async () => {
      const e1 = await require('../src/services/embeddingService').defaultProvider.getEmbedding('Two Sum');
      const e2 = await require('../src/services/embeddingService').defaultProvider.getEmbedding('Valid Anagram');
      expect(cosineSimilarity(e1, e2)).toBeLessThan(0.75);
    });
  });
});
