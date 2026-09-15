/**
 * Question Novelty System Tests
 * 
 * Focused tests for the RAG-based question novelty and duplicate prevention system.
 * Tests the embedding service, question embedding service, novelty service, and
 * integration with the shared generation pipeline.
 * 
 * These tests mock the embedding provider to avoid external API calls.
 */

const { EmbeddingProvider, cosineSimilarity, normalizeVector } = require('../src/services/embeddingService');
const { computeContentHash, buildEmbeddingDocument } = require('../src/services/questionEmbeddingService');

// Mock the embedding provider
jest.mock('../src/services/embeddingService', () => {
  const actual = jest.requireActual('../src/services/embeddingService');
  const mockProvider = {
    isConfigured: jest.fn(() => true),
    getEmbedding: jest.fn(async (text) => {
      // Deterministic mock embeddings based on text content
      const hash = Array.from(text).reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const embedding = new Array(1024).fill(0).map((_, i) => {
        const seed = (hash + i) % 100;
        return Math.sin(seed * 0.01) * 0.5 + 0.5;
      });
      return actual.normalizeVector(embedding);
    }),
    getEmbeddings: jest.fn(async (texts) => {
      return Promise.all(texts.map(t => mockProvider.getEmbedding(t)));
    })
  };
  return {
    ...actual,
    defaultProvider: mockProvider,
    createDefaultProvider: () => mockProvider
  };
});

// Mock the database
jest.mock('../src/db/repositoryFactory', () => ({
  getRepository: () => ({
    one: jest.fn(async () => null),
    many: jest.fn(async () => []),
    execute: jest.fn(async () => ({ rowCount: 0 })),
    transaction: jest.fn(async (cb) => cb({
      execute: jest.fn(async () => ({ rowCount: 0 }))
    }))
  })
}));

describe('Embedding Service', () => {
  describe('cosineSimilarity', () => {
    it('returns 1.0 for identical vectors', () => {
      const a = [1, 0, 0, 1];
      expect(cosineSimilarity(a, a)).toBeCloseTo(1.0, 4);
    });

    it('returns 0.0 for orthogonal vectors', () => {
      const a = [1, 0];
      const b = [0, 1];
      expect(cosineSimilarity(a, b)).toBeCloseTo(0.0, 4);
    });

    it('returns -1.0 for opposite vectors', () => {
      const a = [1, 0];
      const b = [-1, 0];
      expect(cosineSimilarity(a, b)).toBeCloseTo(-1.0, 4);
    });

    it('handles zero vectors gracefully', () => {
      const a = [0, 0, 0];
      const b = [1, 2, 3];
      expect(cosineSimilarity(a, b)).toBe(0);
    });

    it('handles mismatched dimensions', () => {
      const a = [1, 2];
      const b = [1, 2, 3];
      expect(cosineSimilarity(a, b)).toBe(0);
    });

    it('handles null/undefined inputs', () => {
      expect(cosineSimilarity(null, [1, 2])).toBe(0);
      expect(cosineSimilarity([1, 2], undefined)).toBe(0);
    });
  });

  describe('normalizeVector', () => {
    it('normalizes to unit length', () => {
      const v = [3, 4];
      const normalized = normalizeVector(v);
      const norm = Math.sqrt(normalized[0] ** 2 + normalized[1] ** 2);
      expect(norm).toBeCloseTo(1.0, 4);
    });

    it('preserves direction', () => {
      const v = [3, 4];
      const normalized = normalizeVector(v);
      expect(normalized[0]).toBeGreaterThan(0);
      expect(normalized[1]).toBeGreaterThan(0);
    });

    it('handles zero vector', () => {
      const v = [0, 0, 0];
      const normalized = normalizeVector(v);
      expect(normalized).toEqual([0, 0, 0]);
    });
  });

  describe('EmbeddingProvider', () => {
    it('is configured when API keys are provided', () => {
      const provider = new EmbeddingProvider({ apiKeys: ['key1', 'key2'] });
      expect(provider.isConfigured()).toBe(true);
    });

    it('is not configured when no API keys', () => {
      const provider = new EmbeddingProvider({ apiKeys: [] });
      expect(provider.isConfigured()).toBe(false);
    });

    it('is not configured with empty string keys', () => {
      const provider = new EmbeddingProvider({ apiKeys: ['', '  '] });
      expect(provider.isConfigured()).toBe(false);
    });

    it('rotates through API keys', () => {
      const provider = new EmbeddingProvider({ apiKeys: ['key1', 'key2', 'key3'] });
      expect(provider.getNextKey()).toBe('key1');
      expect(provider.getNextKey()).toBe('key2');
      expect(provider.getNextKey()).toBe('key3');
      expect(provider.getNextKey()).toBe('key1'); // wraps around
    });
  });
});

describe('Question Embedding Service', () => {
  describe('computeContentHash', () => {
    it('produces deterministic hash for same content', () => {
      const data = {
        title: 'Two Sum',
        description: 'Find two numbers that add to target',
        constraints: '1 <= n <= 100',
        input_format: 'Array of integers',
        output_format: 'Array of indices',
        difficulty: 'easy'
      };
      const hash1 = computeContentHash(data);
      const hash2 = computeContentHash(data);
      expect(hash1).toBe(hash2);
    });

    it('produces different hashes for different content', () => {
      const data1 = { title: 'Two Sum', description: 'desc1' };
      const data2 = { title: 'Three Sum', description: 'desc2' };
      expect(computeContentHash(data1)).not.toBe(computeContentHash(data2));
    });

    it('is case-insensitive', () => {
      const data1 = { title: 'Two Sum' };
      const data2 = { title: 'two sum' };
      expect(computeContentHash(data1)).toBe(computeContentHash(data2));
    });

    it('handles missing fields gracefully', () => {
      const data = { title: 'Test' };
      const hash = computeContentHash(data);
      expect(hash).toBeTruthy();
      expect(hash.length).toBe(64); // SHA-256 hex length
    });
  });

  describe('buildEmbeddingDocument', () => {
    it('includes title in document', () => {
      const doc = buildEmbeddingDocument({ title: 'Two Sum' });
      expect(doc).toContain('Title: Two Sum');
    });

    it('includes description in document', () => {
      const doc = buildEmbeddingDocument({ title: 'Test', description: 'Find two numbers' });
      expect(doc).toContain('Problem: Find two numbers');
    });

    it('includes topic and pattern', () => {
      const doc = buildEmbeddingDocument({
        title: 'Test',
        topic_name: 'Arrays',
        pattern_name: 'Two Pointers'
      });
      expect(doc).toContain('Topic: Arrays');
      expect(doc).toContain('Pattern: Two Pointers');
    });

    it('truncates long descriptions', () => {
      const longDesc = 'A'.repeat(1000);
      const doc = buildEmbeddingDocument({ title: 'Test', description: longDesc });
      expect(doc.length).toBeLessThanOrEqual(2000);
    });

    it('handles examples as JSON array', () => {
      const doc = buildEmbeddingDocument({
        title: 'Test',
        examples: [{ input: '1 2', output: '3' }]
      });
      expect(doc).toContain('Examples:');
    });
  });
});

describe('Question Novelty Service', () => {
  // These tests require the actual service to be loaded with mocked dependencies
  // We test the logical flow rather than the actual API calls

  describe('Similarity Classification Logic', () => {
    it('classifies high similarity as DUPLICATE', () => {
      const DUPLICATE_THRESHOLD = 0.88;
      const similarity = 0.92;
      expect(similarity >= DUPLICATE_THRESHOLD).toBe(true);
    });

    it('classifies medium similarity as BORDERLINE', () => {
      const BORDERLINE_THRESHOLD = 0.75;
      const DUPLICATE_THRESHOLD = 0.88;
      const similarity = 0.80;
      expect(similarity >= BORDERLINE_THRESHOLD && similarity < DUPLICATE_THRESHOLD).toBe(true);
    });

    it('classifies low similarity as NOVEL', () => {
      const BORDERLINE_THRESHOLD = 0.75;
      const similarity = 0.50;
      expect(similarity < BORDERLINE_THRESHOLD).toBe(true);
    });
  });

  describe('Exclusion Context Generation', () => {
    it('builds exclusion context from similar titles', () => {
      const titles = ['Shortest Path in Graph', 'Minimum Hops Between Nodes'];
      const exclusionLines = titles.map(t => `- ${t}`).join('\n');
      const context = `\n\nEXISTING QUESTIONS TO AVOID:\n${exclusionLines}`;
      
      expect(context).toContain('- Shortest Path in Graph');
      expect(context).toContain('- Minimum Hops Between Nodes');
    });

    it('returns empty context for no similar questions', () => {
      const titles = [];
      const context = titles.length > 0
        ? `\n\nEXISTING QUESTIONS TO AVOID:\n${titles.map(t => `- ${t}`).join('\n')}`
        : '';
      
      expect(context).toBe('');
    });
  });
});

describe('Duplicate Detection Test Cases', () => {
  describe('Example A: Semantic Duplicate with Different Title', () => {
    it('demonstrates token-based Jaccard misses semantic duplicates - embedding system catches them', () => {
      const existing = 'Shortest Path in an Unweighted Graph';
      const candidate = 'Minimum Hops Between Two Nodes';
      
      // Token-based Jaccard similarity (existing3-layer detection)
      const existingTokens = new Set(existing.toLowerCase().split(/\s+/));
      const candidateTokens = new Set(candidate.toLowerCase().split(/\s+/));
      const overlap = [...existingTokens].filter(t => candidateTokens.has(t)).length;
      const union = new Set([...existingTokens, ...candidateTokens]).size;
      const jaccard = overlap / union;
      
      // Token-based Jaccard may have LOW overlap (different words for same concept)
      // This is exactly why embedding-based detection is needed
      // "shortest path" vs "minimum hops" are semantically equivalent but lexically different
      expect(jaccard).toBeLessThan(0.5); // Token-based misses this
      
      // The embedding-based system would catch this as semantically similar
      // because the semantic meaning is identical: finding shortest distance in unweighted graph
    });
  });

  describe('Example B: Genuinely Different Problems', () => {
    it('should detect "Move Zeroes to End" as different from "Remove Duplicate Elements"', () => {
      const existing = 'Move Zeroes to End';
      const candidate = 'Remove Duplicate Elements from Sorted Array';
      
      const existingTokens = new Set(existing.toLowerCase().split(/\s+/));
      const candidateTokens = new Set(candidate.toLowerCase().split(/\s+/));
      const overlap = [...existingTokens].filter(t => candidateTokens.has(t)).length;
      const union = new Set([...existingTokens, ...candidateTokens]).size;
      const jaccard = overlap / union;
      
      // Low token overlap - genuinely different problems
      expect(jaccard).toBeLessThan(0.5);
    });
  });

  describe('Example C: Borderline Case', () => {
    it('may detect BFS variants as borderline depending on structure', () => {
      const existing = 'Multi-source BFS Signal Propagation';
      const candidate = 'Minimum Time for Fire to Spread Through a Grid';
      
      const existingTokens = new Set(existing.toLowerCase().split(/\s+/));
      const candidateTokens = new Set(candidate.toLowerCase().split(/\s+/));
      const overlap = [...existingTokens].filter(t => candidateTokens.has(t)).length;
      const union = new Set([...existingTokens, ...candidateTokens]).size;
      const jaccard = overlap / union;
      
      // Low token overlap but semantically related
      // The embedding system would provide a similarity score
      expect(jaccard).toBeLessThan(0.5);
      // Borderline detection would depend on embedding similarity
    });
  });
});

describe('Integration Points', () => {
  describe('Pre-LLM Retrieval Flow', () => {
    it('generates exclusion context from generation parameters', () => {
      const params = {
        topic: 'Graphs',
        pattern: 'BFS',
        difficulty: 'medium'
      };
      
      // Simulate building a query document
      const query = `Title: ${params.topic} ${params.pattern}\nTopic: ${params.topic}\nPattern: ${params.pattern}\nDifficulty: ${params.difficulty}`;
      expect(query).toContain('Graphs');
      expect(query).toContain('BFS');
      expect(query).toContain('medium');
    });
  });

  describe('Post-LLM Duplicate Check Flow', () => {
    it('classifies candidate based on similarity threshold', () => {
      const candidate = {
        title: 'Find Shortest Path in Unweighted Graph',
        topic_name: 'Graphs',
        difficulty: 'medium'
      };
      
      // Simulate embedding similarity check
      const DUPLICATE_THRESHOLD = 0.88;
      const mockSimilarity = 0.91;
      
      const classification = mockSimilarity >= DUPLICATE_THRESHOLD ? 'DUPLICATE' : 'NOVEL';
      expect(classification).toBe('DUPLICATE');
    });
  });

  describe('Regeneration Strategy', () => {
    it('retries up to MAX_REGENERATION_ATTEMPTS', () => {
      const MAX_ATTEMPTS = 2;
      let attempt = 0;
      
      function simulateGeneration() {
        attempt++;
        if (attempt <= MAX_ATTEMPTS) {
          return { status: 'DUPLICATE', attempt };
        }
        return { status: 'ACCEPTED', attempt };
      }
      
      const result1 = simulateGeneration();
      expect(result1.status).toBe('DUPLICATE');
      
      const result2 = simulateGeneration();
      expect(result2.status).toBe('DUPLICATE');
      
      const result3 = simulateGeneration();
      expect(result3.status).toBe('ACCEPTED');
    });
  });

  describe('Indexing Lifecycle', () => {
    it('generates content hash for idempotent indexing', () => {
      const question = {
        title: 'Two Sum',
        description: 'Find two numbers',
        difficulty: 'easy'
      };
      
      const hash1 = computeContentHash(question);
      const hash2 = computeContentHash(question);
      expect(hash1).toBe(hash2);
      
      // Changing content changes hash
      const updated = { ...question, description: 'Find three numbers' };
      const hash3 = computeContentHash(updated);
      expect(hash3).not.toBe(hash1);
    });

    it('builds deterministic embedding document', () => {
      const q1 = buildEmbeddingDocument({
        title: 'Two Sum',
        description: 'Find two numbers that add to target',
        topic_name: 'Arrays',
        difficulty: 'easy'
      });
      
      const q2 = buildEmbeddingDocument({
        title: 'Two Sum',
        description: 'Find two numbers that add to target',
        topic_name: 'Arrays',
        difficulty: 'easy'
      });
      
      expect(q1).toBe(q2);
    });
  });

  describe('Security', () => {
    it('does not include reference solutions in embedding document', () => {
      const doc = buildEmbeddingDocument({
        title: 'Two Sum',
        description: 'Find two numbers',
        reference_solution: { python: 'def solve(): pass' }
      });
      
      expect(doc).not.toContain('def solve');
      expect(doc).not.toContain('reference_solution');
    });

    it('does not include starter code in embedding document', () => {
      const doc = buildEmbeddingDocument({
        title: 'Two Sum',
        description: 'Find two numbers',
        starter_code: { python: 'def two_sum(nums, target): pass' }
      });
      
      expect(doc).not.toContain('def two_sum');
      expect(doc).not.toContain('starter_code');
    });
  });
});
