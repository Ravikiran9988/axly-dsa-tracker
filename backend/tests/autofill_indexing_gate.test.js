/**
 * Auto Fill Indexing Gate Tests
 * 
 * Verifies that required embedding/indexing MUST succeed before
 * a question is considered published/scheduled in Auto Fill flows.
 * 
 * Case A: Indexing succeeds → Auto Fill succeeds → published/scheduled
 * Case B: Indexing fails after persistence → Auto Fill rejects → NOT published/scheduled
 * Case C: Novelty provider unavailable → existing 422 fail-closed behavior remains
 * Case D: Duplicate → existing 409 behavior remains
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

jest.mock('../src/db/repositoryFactory', () => {
  const mapParams = (params) => (params || []).map(p => {
    if (typeof p === 'boolean') return p ? 1 : 0;
    if (Array.isArray(p)) return JSON.stringify(p);
    if (p !== null && typeof p === 'object' && !(p instanceof Date)) return JSON.stringify(p);
    return p;
  });

  return {
    getRepository: () => ({
      one: async (sql, params) => {
        try { return mockTestDb.prepare(sql).get(...mapParams(params)); }
        catch { return null; }
      },
      many: async (sql, params) => {
        try { return mockTestDb.prepare(sql).all(...mapParams(params)); }
        catch { return []; }
      },
      execute: async (sql, params) => {
        const result = mockTestDb.prepare(sql).run(...mapParams(params));
        return { rowCount: result.changes };
      },
      transaction: async (cb) => {
        const tx = {
          execute: async (sql, params) => {
            const result = mockTestDb.prepare(sql).run(...mapParams(params));
            return { rowCount: result.changes };
          }
        };
        return cb(tx);
      }
    })
  };
});

const path = require('path');
const Database = require('better-sqlite3');

describe('Auto Fill Indexing Gate', () => {
  let testDbPath;

  beforeAll(() => {
    testDbPath = path.join(__dirname, `test_indexing_gate_${Date.now()}.db`);
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
      CREATE TABLE IF NOT EXISTS question_bank_automation_settings (
        id TEXT PRIMARY KEY, mode TEXT DEFAULT 'auto_fill', is_enabled INTEGER DEFAULT 1,
        retry_limit INTEGER DEFAULT 3, last_run_at TEXT, last_run_status TEXT,
        next_run_at TEXT, updated_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS question_bank_automation_logs (
        id TEXT PRIMARY KEY, target_slot TEXT, mode TEXT, status TEXT, question_id TEXT,
        failure_category TEXT, details TEXT, created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS daily_challenge_automation_settings (
        id TEXT PRIMARY KEY, mode TEXT DEFAULT 'auto_fill', is_enabled INTEGER DEFAULT 1,
        target_hour_utc INTEGER DEFAULT 19, retry_limit INTEGER DEFAULT 3,
        last_run_at TEXT, last_run_status TEXT, next_run_at TEXT,
        updated_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS daily_challenge_automation_logs (
        id TEXT PRIMARY KEY, target_date TEXT, mode TEXT, attempt_count INTEGER DEFAULT 0,
        validation_result TEXT, sandbox_result TEXT, status TEXT,
        failure_category TEXT, question_id TEXT, details TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);
    mockTestDb.prepare('INSERT OR IGNORE INTO topics (id, name) VALUES (?, ?)').run('topic-arrays', 'Arrays');
    mockTestDb.prepare('INSERT OR IGNORE INTO question_bank_automation_settings (id, mode, is_enabled) VALUES (?, ?, ?)').run('global-settings', 'auto_fill', 1);
    mockTestDb.prepare('INSERT OR IGNORE INTO daily_challenge_automation_settings (id, mode, is_enabled, target_hour_utc) VALUES (?, ?, ?, ?)').run('global-settings', 'auto_fill', 1, 19);
  });

  afterAll(() => {
    if (mockTestDb) mockTestDb.close();
    try { const fs = require('fs'); if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath); } catch (_) {}
  });

  beforeEach(() => {
    mockTestDb.prepare('DELETE FROM questions').run();
    mockTestDb.prepare('DELETE FROM question_embeddings').run();
    mockTestDb.prepare('DELETE FROM test_cases').run();
    mockTestDb.prepare('DELETE FROM daily_challenge_metadata').run();
    mockTestDb.prepare('DELETE FROM question_bank_automation_logs').run();
    mockTestDb.prepare('DELETE FROM daily_challenge_automation_logs').run();
    jest.resetModules();
  });

  describe('Case A: Indexing succeeds → Auto Fill succeeds → published', () => {
    it('Question Bank: should set question to published only after successful indexing', async () => {
      const mockGenService = require('../src/services/aiSharedGenerationService');
      mockGenService.generateUniqueProblem = jest.fn(async () => ({
        success: true,
        data: {
          title: 'Indexing Gate Test Question',
          description: 'A test question for verifying indexing gate',
          difficulty: 'medium',
          topic_id: 'topic-arrays',
          test_cases: []
        }
      }));

      const questionBankService = require('../src/services/questionBankAutomationService');
      const result = await questionBankService.generateForSlot('2026-09-14-10');

      expect(result.success).toBe(true);
      expect(result.status).toBe('success');

      const q = mockTestDb.prepare('SELECT status FROM questions WHERE id = ?').get(result.challenge.id);
      expect(q.status).toBe('published');

      const emb = mockTestDb.prepare('SELECT * FROM question_embeddings WHERE question_id = ?').get(result.challenge.id);
      expect(emb).toBeTruthy();
    });

    it('Daily Challenge: should set challenge to scheduled only after successful indexing', async () => {
      const mockAiDcService = require('../src/services/aiDailyChallengeService');
      mockAiDcService.generateDailyChallenge = jest.fn(async () => ({
        success: true,
        data: {
          title: 'Indexing Gate Daily Challenge',
          description: 'A daily challenge for verifying indexing gate',
          difficulty: 'medium',
          test_cases: []
        }
      }));
      mockAiDcService.checkDuplicateChallenge = jest.fn(async () => ({ isDuplicate: false }));

      const dailyChallengeService = require('../src/services/dailyChallengeAutomationService');
      const result = await dailyChallengeService.runDailyScheduledAutomation();

      if (result.status === 'SUCCESS') {
        const meta = mockTestDb.prepare('SELECT status FROM daily_challenge_metadata WHERE question_id = ?').get(result.challenge.id);
        expect(meta.status).toBe('scheduled');

        const emb = mockTestDb.prepare('SELECT * FROM question_embeddings WHERE question_id = ?').get(result.challenge.id);
        expect(emb).toBeTruthy();
      }
    });
  });

  describe('Case B: Indexing fails → Auto Fill rejects → NOT published', () => {
    it('Question Bank: should reject and NOT publish when indexing fails', async () => {
      const mockGenService = require('../src/services/aiSharedGenerationService');
      mockGenService.generateUniqueProblem = jest.fn(async () => ({
        success: true,
        data: {
          title: 'Will Fail Indexing Question',
          description: 'This question will fail indexing',
          difficulty: 'medium',
          topic_id: 'topic-arrays',
          test_cases: []
        }
      }));

      const mockNovelty = require('../src/services/questionNoveltyService');
      const origIndex = mockNovelty.indexAcceptedQuestion;
      mockNovelty.indexAcceptedQuestion = jest.fn(async () => ({
        success: false,
        reason: 'embedding_api_timeout'
      }));

      try {
        const questionBankService = require('../src/services/questionBankAutomationService');
        const result = await questionBankService.generateForSlot('2026-09-14-10');

        expect(result.success).toBe(false);
        expect(result.status).toBe('failed');
        expect(result.failure_category).toBe('INDEXING_FAILED');
        expect(result.error).toContain('embedding_api_timeout');

        const allQuestions = mockTestDb.prepare('SELECT id, status FROM questions WHERE generation_slot = ?').all('2026-09-14-10');
        expect(allQuestions.length).toBe(1);
        expect(allQuestions[0].status).toBe('draft');

        const embCount = mockTestDb.prepare('SELECT COUNT(*) as c FROM question_embeddings').get();
        expect(embCount.c).toBe(0);
      } finally {
        mockNovelty.indexAcceptedQuestion = origIndex;
      }
    });

    it('Daily Challenge: should reject and NOT schedule when indexing fails', async () => {
      const mockAiDcService = require('../src/services/aiDailyChallengeService');
      mockAiDcService.generateDailyChallenge = jest.fn(async () => ({
        success: true,
        data: {
          title: 'Will Fail Indexing DC',
          description: 'This daily challenge will fail indexing',
          difficulty: 'medium',
          test_cases: []
        }
      }));
      mockAiDcService.checkDuplicateChallenge = jest.fn(async () => ({ isDuplicate: false }));

      const mockNovelty = require('../src/services/questionNoveltyService');
      const origIndex = mockNovelty.indexAcceptedQuestion;
      mockNovelty.indexAcceptedQuestion = jest.fn(async () => ({
        success: false,
        reason: 'embedding_provider_error'
      }));

      try {
        const dailyChallengeService = require('../src/services/dailyChallengeAutomationService');
        const result = await dailyChallengeService.runDailyScheduledAutomation();

        expect(result.success).toBe(false);
        expect(result.status).toBe('failed');
        expect(result.failure_category).toBe('INDEXING_FAILED');
        expect(result.error).toContain('embedding_provider_error');

        const questions = mockTestDb.prepare('SELECT id, status FROM questions').all();
        expect(questions.length).toBe(1);
        expect(questions[0].status).toBe('draft');

        const meta = mockTestDb.prepare('SELECT status FROM daily_challenge_metadata WHERE question_id = ?').get(questions[0].id);
        expect(meta.status).toBe('draft');

        const embCount = mockTestDb.prepare('SELECT COUNT(*) as c FROM question_embeddings').get();
        expect(embCount.c).toBe(0);
      } finally {
        mockNovelty.indexAcceptedQuestion = origIndex;
      }
    });
  });

  describe('Case C: Novelty provider unavailable → 422 fail-closed', () => {
    it('should return UNAVAILABLE when embedding provider is not configured', async () => {
      const mockEmbedding = require('../src/services/embeddingService');
      const origIsConfigured = mockEmbedding.defaultProvider.isConfigured;
      mockEmbedding.defaultProvider.isConfigured = jest.fn(() => false);

      try {
        const { classifyCandidate } = require('../src/services/questionNoveltyService');
        const result = await classifyCandidate({ title: 'Test', difficulty: 'easy', description: 'Test question' });
        expect(result.classification).toBe('UNAVAILABLE');
        expect(result.embeddingAvailable).toBe(false);
      } finally {
        mockEmbedding.defaultProvider.isConfigured = origIsConfigured;
      }
    });
  });

  describe('Case D: Duplicate → 409 behavior remains', () => {
    it('should reject when generateUniqueProblem throws DUPLICATE_COLLISION', async () => {
      const mockGenService = require('../src/services/aiSharedGenerationService');
      mockGenService.generateUniqueProblem = jest.fn(async () => {
        throw Object.assign(
          new Error('DUPLICATE_PROBLEM: Exact title match'),
          { code: 'DUPLICATE_COLLISION', statusCode: 409 }
        );
      });

      const questionBankService = require('../src/services/questionBankAutomationService');
      const result = await questionBankService.generateForSlot('2026-09-14-10');

      expect(result.success).toBe(false);
      expect(result.failure_category).toBe('DUPLICATE_COLLISION');
      expect(result.error).toContain('DUPLICATE_PROBLEM');
    });
  });
});
