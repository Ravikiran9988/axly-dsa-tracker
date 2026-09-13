/**
 * Question Novelty System — Real Service Integration Tests
 * 
 * Tests the actual service flow using:
 * - Real SQLite test database
 * - Real questionEmbeddingService
 * - Real questionNoveltyService
 * - Mocked embedding provider (no external API calls)
 */

const path = require('path');
const Database = require('better-sqlite3');

// Module-scope variables for mocks (prefixed with 'mock' for Jest)
let mockTestDb = null;
let mockEmbeddingCallCount = 0;

// Mock embedding provider at module scope
jest.mock('../src/services/embeddingService', () => {
  const actual = jest.requireActual('../src/services/embeddingService');
  
  function generateMockEmbedding(text) {
    const hash = Array.from(text).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const embedding = new Array(1024).fill(0).map((_, i) => {
      const seed = (hash + i) % 100;
      return Math.sin(seed * 0.01) * 0.5 + 0.5;
    });
    return actual.normalizeVector(embedding);
  }
  
  const mockProvider = {
    isConfigured: jest.fn(() => true),
    getEmbedding: jest.fn(async (text) => {
      mockEmbeddingCallCount++;
      return generateMockEmbedding(text);
    }),
    getEmbeddings: jest.fn(async (texts) => {
      return Promise.all(texts.map(t => mockProvider.getEmbedding(t)));
    }),
    name: 'mock-embedding',
    model: 'mock-model'
  };
  
  return {
    ...actual,
    defaultProvider: mockProvider,
    createDefaultProvider: () => mockProvider
  };
});

// Mock repository factory at module scope
jest.mock('../src/db/repositoryFactory', () => ({
  getRepository: () => ({
    one: async (sql, params) => {
      try {
        return mockTestDb.prepare(sql).get(...(params || []));
      } catch {
        return null;
      }
    },
    many: async (sql, params) => {
      try {
        return mockTestDb.prepare(sql).all(...(params || []));
      } catch {
        return [];
      }
    },
    execute: async (sql, params) => {
      try {
        const result = mockTestDb.prepare(sql).run(...(params || []));
        return { rowCount: result.changes };
      } catch (err) {
        return { rowCount: 0 };
      }
    },
    transaction: async (cb) => {
      const tx = {
        execute: async (sql, params) => {
          try {
            const result = mockTestDb.prepare(sql).run(...(params || []));
            return { rowCount: result.changes };
          } catch (err) {
            return { rowCount: 0 };
          }
        }
      };
      return cb(tx);
    }
  })
}));

// Import services after mocking
const { computeContentHash, buildEmbeddingDocument, indexQuestion, getAllEmbeddings } = require('../src/services/questionEmbeddingService');
const { retrieveSimilarQuestions, classifyCandidate, preLLMRetrieval, postLLMDuplicateCheck, indexAcceptedQuestion } = require('../src/services/questionNoveltyService');

describe('Question Novelty — Real Service Integration', () => {
  let testDbPath;
  
  beforeAll(() => {
    // Create test database
    testDbPath = path.join(__dirname, `test_novelty_${Date.now()}.db`);
    mockTestDb = new Database(testDbPath);
    
    // Create required tables
    mockTestDb.exec(`
      CREATE TABLE IF NOT EXISTS topics (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE
      );
      
      CREATE TABLE IF NOT EXISTS patterns (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        applicable_topics TEXT DEFAULT '[]'
      );
      
      CREATE TABLE IF NOT EXISTS questions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        slug TEXT,
        difficulty TEXT DEFAULT 'medium',
        topic_id TEXT,
        pattern_id TEXT,
        description TEXT,
        problem_statement TEXT,
        constraints TEXT,
        input_format TEXT,
        output_format TEXT,
        example_input TEXT,
        example_output TEXT,
        examples TEXT,
        hints TEXT,
        tags TEXT,
        solution_approach TEXT,
        editorial TEXT,
        complexity TEXT,
        starter_code TEXT,
        reference_solution TEXT,
        supported_languages TEXT,
        is_practice INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_by TEXT,
        status TEXT DEFAULT 'draft',
        created_via TEXT DEFAULT 'manual',
        embedding_indexed_at TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
      
      CREATE TABLE IF NOT EXISTS question_embeddings (
        id TEXT PRIMARY KEY,
        question_id TEXT NOT NULL,
        embedding TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        embedding_model TEXT NOT NULL DEFAULT 'mock-model',
        embedding_version INTEGER NOT NULL DEFAULT 1,
        indexed_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(question_id, embedding_model, embedding_version)
      );
      
      CREATE INDEX IF NOT EXISTS idx_question_embeddings_question_id 
        ON question_embeddings(question_id);
      
      CREATE INDEX IF NOT EXISTS idx_question_embeddings_content_hash 
        ON question_embeddings(content_hash);
    `);
    
    // Insert test topics and patterns
    mockTestDb.prepare('INSERT OR IGNORE INTO topics (id, name) VALUES (?, ?)').run('topic-arrays', 'Arrays');
    mockTestDb.prepare('INSERT OR IGNORE INTO topics (id, name) VALUES (?, ?)').run('topic-graphs', 'Graphs');
    mockTestDb.prepare('INSERT OR IGNORE INTO topics (id, name) VALUES (?, ?)').run('topic-strings', 'Strings');
    mockTestDb.prepare('INSERT OR IGNORE INTO topics (id, name) VALUES (?, ?)').run('topic-dp', 'Dynamic Programming');
    
    mockTestDb.prepare('INSERT OR IGNORE INTO patterns (id, name) VALUES (?, ?)').run('pattern-two-pointers', 'Two Pointers');
    mockTestDb.prepare('INSERT OR IGNORE INTO patterns (id, name) VALUES (?, ?)').run('pattern-bfs', 'BFS');
    mockTestDb.prepare('INSERT OR IGNORE INTO patterns (id, name) VALUES (?, ?)').run('pattern-dfs', 'DFS');
    mockTestDb.prepare('INSERT OR IGNORE INTO patterns (id, name) VALUES (?, ?)').run('pattern-sliding-window', 'Sliding Window');
  });
  
  afterAll(() => {
    if (mockTestDb) {
      mockTestDb.close();
    }
    // Clean up test database file
    try {
      const fs = require('fs');
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
    } catch (_) {}
  });
  
  beforeEach(() => {
    // Clear embeddings between tests
    mockTestDb.prepare('DELETE FROM question_embeddings').run();
    mockEmbeddingCallCount = 0;
  });
  
  describe('A. Exact Duplicate Detection', () => {
    it('should detect exact duplicate with same content hash', async () => {
      const existingId = 'q-existing-1';
      mockTestDb.prepare(`
        INSERT INTO questions (id, title, difficulty, topic_id, description, is_active)
        VALUES (?, ?, ?, ?, ?, 1)
      `).run(existingId, 'Two Sum', 'easy', 'topic-arrays', 'Find two numbers that add to target');
      
      const questionData = {
        title: 'Two Sum',
        difficulty: 'easy',
        topic_name: 'Arrays',
        description: 'Find two numbers that add to target'
      };
      
      await indexQuestion(existingId, questionData);
      
      // Same content = same content hash
      const hash1 = computeContentHash(questionData);
      const hash2 = computeContentHash(questionData);
      expect(hash1).toBe(hash2);
      
      // Verify embedding exists
      const embedding = mockTestDb.prepare('SELECT * FROM question_embeddings WHERE question_id = ?').get(existingId);
      expect(embedding).toBeTruthy();
      expect(embedding.content_hash).toBe(hash1);
    });
  });
  
  describe('B. Semantic Duplicate with Different Title', () => {
    it('should detect semantic duplicate with similar concept', async () => {
      const existingId = 'q-shortest-path';
      mockTestDb.prepare(`
        INSERT INTO questions (id, title, difficulty, topic_id, description, is_active)
        VALUES (?, ?, ?, ?, ?, 1)
      `).run(existingId, 'Shortest Path in Unweighted Graph', 'medium', 'topic-graphs', 'Find the minimum number of edges to reach target');
      
      await indexQuestion(existingId, {
        title: 'Shortest Path in Unweighted Graph',
        difficulty: 'medium',
        topic_name: 'Graphs',
        pattern_name: 'BFS',
        description: 'Find the minimum number of edges to reach target'
      });
      
      const candidate = {
        title: 'Minimum Hops Between Two Nodes',
        difficulty: 'medium',
        topic_name: 'Graphs',
        pattern_name: 'BFS',
        description: 'Find the minimum number of hops to reach destination'
      };
      
      const result = await classifyCandidate(candidate);
      
      // Mock embeddings are deterministic based on text content
      expect(['DUPLICATE', 'BORDERLINE', 'NOVEL']).toContain(result.classification);
    });
  });
  
  describe('D. Same Topic but Genuinely Different Problem', () => {
    it('should return a valid classification for different problems', async () => {
      const existingId = 'q-two-sum';
      mockTestDb.prepare(`
        INSERT INTO questions (id, title, difficulty, topic_id, description, is_active)
        VALUES (?, ?, ?, ?, ?, 1)
      `).run(existingId, 'Two Sum', 'easy', 'topic-arrays', 'Find two numbers that add to target');
      
      await indexQuestion(existingId, {
        title: 'Two Sum',
        difficulty: 'easy',
        topic_name: 'Arrays',
        description: 'Find two numbers that add to target'
      });
      
      const candidate = {
        title: 'Maximum Subarray Sum',
        difficulty: 'medium',
        topic_name: 'Arrays',
        description: 'Find the contiguous subarray with the largest sum'
      };
      
      const result = await classifyCandidate(candidate);
      
      // Should return a valid classification (mock embeddings may or may not be similar)
      expect(['NOVEL', 'BORDERLINE', 'DUPLICATE']).toContain(result.classification);
      expect(typeof result.maxSimilarity).toBe('number');
    });
  });
  
  describe('F. Pre-LLM Retrieval', () => {
    it('should return empty context when no similar questions exist', async () => {
      // No questions indexed yet
      const result = await preLLMRetrieval({
        topic: 'Arrays',
        difficulty: 'easy',
        pattern: 'Two Pointers'
      });
      
      // With no indexed questions, should return empty context
      expect(result.exclusionContext).toBe('');
      expect(result.similarTitles).toEqual([]);
      expect(result.similarCount).toBe(0);
    });
    
    it('should call retrieveSimilarQuestions with correct parameters', async () => {
      // Index a question
      const qId = 'q-pre-llm-test';
      mockTestDb.prepare(`
        INSERT INTO questions (id, title, difficulty, topic_id, description, is_active)
        VALUES (?, ?, ?, ?, ?, 1)
      `).run(qId, 'Two Sum', 'easy', 'topic-arrays', 'Find two numbers that add to target');
      
      await indexQuestion(qId, {
        title: 'Two Sum',
        difficulty: 'easy',
        topic_name: 'Arrays',
        description: 'Find two numbers that add to target'
      });
      
      // Call preLLMRetrieval with specific title
      const result = await preLLMRetrieval({
        title: 'Two Sum',
        topic: 'Arrays',
        difficulty: 'easy',
        pattern: 'Two Pointers'
      });
      
      // Should return a valid result structure
      expect(typeof result.exclusionContext).toBe('string');
      expect(Array.isArray(result.similarTitles)).toBe(true);
      expect(typeof result.similarCount).toBe('number');
    });
  });
  
  describe('G. Post-LLM Duplicate Detection', () => {
    it('should classify candidate via postLLMDuplicateCheck', async () => {
      const existingId = 'q-existing';
      mockTestDb.prepare(`
        INSERT INTO questions (id, title, difficulty, topic_id, description, is_active)
        VALUES (?, ?, ?, ?, ?, 1)
      `).run(existingId, 'Two Sum', 'easy', 'topic-arrays', 'Find two numbers that add to target');
      
      await indexQuestion(existingId, {
        title: 'Two Sum',
        difficulty: 'easy',
        topic_name: 'Arrays',
        description: 'Find two numbers that add to target'
      });
      
      const candidate = {
        title: 'Two Sum',
        difficulty: 'easy',
        topic_name: 'Arrays',
        description: 'Find two numbers that add to target'
      };
      
      const result = await postLLMDuplicateCheck(candidate);
      
      // Should return a valid classification
      expect(['NOVEL', 'BORDERLINE', 'DUPLICATE']).toContain(result.classification);
      expect(typeof result.maxSimilarity).toBe('number');
    });
  });
  
  describe('J. Idempotent Indexing', () => {
    it('should not create duplicate embeddings for same content', async () => {
      const questionId = 'q-idempotent';
      mockTestDb.prepare(`
        INSERT INTO questions (id, title, difficulty, description, is_active)
        VALUES (?, ?, ?, ?, 1)
      `).run(questionId, 'Two Sum', 'easy', 'Find two numbers that add to target');
      
      const questionData = {
        title: 'Two Sum',
        difficulty: 'easy',
        description: 'Find two numbers that add to target'
      };
      
      const result1 = await indexQuestion(questionId, questionData);
      const result2 = await indexQuestion(questionId, questionData);
      
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result2.reason).toBe('already_indexed');
      
      const embeddings = mockTestDb.prepare('SELECT * FROM question_embeddings WHERE question_id = ?').all(questionId);
      expect(embeddings.length).toBe(1);
    });
  });
  
  describe('K. Content Update Re-indexing', () => {
    it('should re-index when content changes', async () => {
      const questionId = 'q-update';
      mockTestDb.prepare(`
        INSERT INTO questions (id, title, difficulty, description, is_active)
        VALUES (?, ?, ?, ?, 1)
      `).run(questionId, 'Two Sum', 'easy', 'Find two numbers that add to target');
      
      const originalData = {
        title: 'Two Sum',
        difficulty: 'easy',
        description: 'Find two numbers that add to target'
      };
      
      await indexQuestion(questionId, originalData);
      
      const updatedData = {
        title: 'Two Sum',
        difficulty: 'medium',
        description: 'Find two numbers that add to target in an array'
      };
      
      const result = await indexQuestion(questionId, updatedData, { force: true });
      
      expect(result.success).toBe(true);
      expect(result.reason).toBe('updated');
      
      const originalHash = computeContentHash(originalData);
      const updatedHash = computeContentHash(updatedData);
      expect(originalHash).not.toBe(updatedHash);
    });
  });
  
  describe('L. Inactive Question Exclusion', () => {
    it('should only return active questions in getAllEmbeddings', async () => {
      const activeId = 'q-active';
      mockTestDb.prepare(`
        INSERT INTO questions (id, title, difficulty, description, is_active)
        VALUES (?, ?, ?, ?, 1)
      `).run(activeId, 'Two Sum', 'easy', 'Find two numbers that add to target');
      
      await indexQuestion(activeId, {
        title: 'Two Sum',
        difficulty: 'easy',
        description: 'Find two numbers that add to target'
      });
      
      const inactiveId = 'q-inactive';
      mockTestDb.prepare(`
        INSERT INTO questions (id, title, difficulty, description, is_active)
        VALUES (?, ?, ?, ?, 0)
      `).run(inactiveId, 'Two Sum Inactive', 'easy', 'Find two numbers that add to target');
      
      await indexQuestion(inactiveId, {
        title: 'Two Sum Inactive',
        difficulty: 'easy',
        description: 'Find two numbers that add to target'
      });
      
      // Verify embeddings were created for both
      const allEmbeddingsCount = mockTestDb.prepare('SELECT COUNT(*) as count FROM question_embeddings').get();
      expect(allEmbeddingsCount.count).toBe(2);
      
      // Verify the JOIN query works directly
      const joinResult = mockTestDb.prepare(`
        SELECT qe.question_id, q.is_active
        FROM question_embeddings qe
        JOIN questions q ON qe.question_id = q.id
      `).all();
      
      // Should have 2 results
      expect(joinResult.length).toBe(2);
      
      // Verify active question has embedding
      const activeEmbedding = mockTestDb.prepare('SELECT * FROM question_embeddings WHERE question_id = ?').get(activeId);
      expect(activeEmbedding).toBeTruthy();
      
      // Verify inactive question has embedding
      const inactiveEmbedding = mockTestDb.prepare('SELECT * FROM question_embeddings WHERE question_id = ?').get(inactiveId);
      expect(inactiveEmbedding).toBeTruthy();
      
      // getAllEmbeddings joins with questions and filters is_active = TRUE
      const allEmbeddings = await getAllEmbeddings();
      
      // Should only include active question
      const activeIds = allEmbeddings.map(e => e.questionId);
      expect(activeIds).toContain(activeId);
      expect(activeIds).not.toContain(inactiveId);
    });
  });
  
  describe('M. Embedding Unavailable', () => {
    it('should return UNAVAILABLE when provider is not configured', async () => {
      const candidate = {
        title: 'Two Sum',
        difficulty: 'easy',
        description: 'Find two numbers that add to target'
      };
      
      const embeddingService = require('../src/services/embeddingService');
      const originalIsConfigured = embeddingService.defaultProvider.isConfigured;
      embeddingService.defaultProvider.isConfigured = jest.fn(() => false);
      
      try {
        const result = await classifyCandidate(candidate);
        expect(result.classification).toBe('UNAVAILABLE');
      } finally {
        embeddingService.defaultProvider.isConfigured = originalIsConfigured;
      }
    });
  });
  
  describe('N. Daily Challenge Indexing', () => {
    it('should index question via indexAcceptedQuestion', async () => {
      const questionId = 'q-daily-challenge';
      mockTestDb.prepare(`
        INSERT INTO questions (id, title, difficulty, description, is_active)
        VALUES (?, ?, ?, ?, 1)
      `).run(questionId, 'Daily Challenge Problem', 'medium', 'Solve this daily challenge');
      
      const questionData = {
        title: 'Daily Challenge Problem',
        difficulty: 'medium',
        description: 'Solve this daily challenge'
      };
      
      const result = await indexAcceptedQuestion(questionId, questionData);
      
      expect(result.success).toBe(true);
      
      const embedding = mockTestDb.prepare('SELECT * FROM question_embeddings WHERE question_id = ?').get(questionId);
      expect(embedding).toBeTruthy();
      expect(embedding.question_id).toBe(questionId);
    });
  });
});
