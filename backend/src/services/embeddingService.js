const https = require('https');

/**
 * Embedding Provider Abstraction
 * 
 * Uses Groq's embedding endpoint (snowflake-arctic-embed-m) with existing API keys.
 * Provider-abstracted: can be swapped for OpenAI, Cohere, etc. by changing the
 * embedding provider configuration.
 * 
 * Embedding model: snowflake-arctic-embed-m (1024 dimensions)
 * Endpoint: https://api.groq.com/openai/v1/embeddings
 */

const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'snowflake-arctic-embed-m';
const EMBEDDING_DIMENSIONS = Number(process.env.EMBEDDING_DIMENSIONS) || 1024;
const EMBEDDING_TIMEOUT_MS = Number(process.env.EMBEDDING_TIMEOUT_MS) || 30000;
const EMBEDDING_MAX_RETRIES = Number(process.env.EMBEDDING_MAX_RETRIES) || 2;
const EMBEDDING_RETRY_DELAY_MS = Number(process.env.EMBEDDING_RETRY_DELAY_MS) || 1000;

/**
 * Normalize embedding vector to unit length for consistent cosine similarity
 */
function normalizeVector(vec) {
  let norm = 0;
  for (let i = 0; i < vec.length; i++) {
    norm += vec[i] * vec[i];
  }
  norm = Math.sqrt(norm);
  if (norm === 0) return vec;
  return vec.map(v => v / norm);
}

/**
 * Compute cosine similarity between two vectors
 */
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, aa = 0, bb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    aa += a[i] * a[i];
    bb += b[i] * b[i];
  }
  return aa && bb ? dot / (Math.sqrt(aa) * Math.sqrt(bb)) : 0;
}

/**
 * HTTP POST with timeout and retry
 */
function postJson(url, body, headers = {}, timeoutMs = EMBEDDING_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      port: u.port || 443,
      path: u.pathname + u.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode < 200 || res.statusCode >= 300) {
            const errMsg = json.error?.message || json.error || `Embedding request failed (${res.statusCode})`;
            const err = new Error(errMsg);
            err.statusCode = res.statusCode;
            err.isQuotaOrRateLimit = res.statusCode === 429 || /\b(?:429|rate limit|quota)\b/i.test(errMsg);
            return reject(err);
          }
          resolve(json);
        } catch (e) {
          reject(new Error('Invalid embedding response'));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error('Embedding request timed out'));
    });
    req.write(JSON.stringify(body));
    req.end();
  });
}

/**
 * Embedding Provider Interface
 * 
 * Providers must implement:
 * - getEmbedding(text) -> Promise<number[]>
 * - isConfigured() -> boolean
 */
class EmbeddingProvider {
  constructor(options = {}) {
    this.name = options.name || 'groq-embedding';
    this.model = options.model || EMBEDDING_MODEL;
    this.dimensions = options.dimensions || EMBEDDING_DIMENSIONS;
    this.baseUrl = options.baseUrl || 'https://api.groq.com/openai/v1';
    this.apiKeys = options.apiKeys || [];
    this.currentKeyIndex = 0;
  }

  isConfigured() {
    return this.apiKeys.length > 0 && this.apiKeys.some(k => k && k.trim());
  }

  /**
   * Get the next healthy API key with basic rotation
   */
  getNextKey() {
    const validKeys = this.apiKeys.filter(k => k && k.trim());
    if (validKeys.length === 0) return null;
    const key = validKeys[this.currentKeyIndex % validKeys.length];
    this.currentKeyIndex = (this.currentKeyIndex + 1) % validKeys.length;
    return key;
  }

  /**
   * Generate embedding for a single text
   * @param {string} text - The text to embed
   * @returns {Promise<number[]>} - The embedding vector
   */
  async getEmbedding(text) {
    const key = this.getNextKey();
    if (!key) {
      throw new Error('No embedding API keys configured');
    }

    let lastError = null;
    for (let attempt = 0; attempt <= EMBEDDING_MAX_RETRIES; attempt++) {
      try {
        const result = await postJson(
          `${this.baseUrl}/embeddings`,
          { model: this.model, input: text },
          { Authorization: `Bearer ${key}` }
        );
        
        const embedding = result.data?.[0]?.embedding;
        if (!embedding || !Array.isArray(embedding)) {
          throw new Error('Invalid embedding response format');
        }
        return embedding;
      } catch (err) {
        lastError = err;
        
        // Don't retry on auth errors or permanent failures
        if (err.statusCode === 401 || err.statusCode === 403) {
          throw err;
        }
        
        // Retry on rate limit with backoff
        if (err.isQuotaOrRateLimit && attempt < EMBEDDING_MAX_RETRIES) {
          const delay = EMBEDDING_RETRY_DELAY_MS * Math.pow(2, attempt);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        
        // Retry on transient errors
        if (attempt < EMBEDDING_MAX_RETRIES && !err.isQuotaOrRateLimit) {
          await new Promise(r => setTimeout(r, EMBEDDING_RETRY_DELAY_MS));
          continue;
        }
      }
    }
    
    throw lastError || new Error('Embedding generation failed after retries');
  }

  /**
   * Generate embeddings for multiple texts (batched)
   * @param {string[]} texts - Array of texts to embed
   * @returns {Promise<number[][]>} - Array of embedding vectors
   */
  async getEmbeddings(texts) {
    if (!texts || texts.length === 0) return [];
    
    // Groq supports batch embeddings via the input array
    const key = this.getNextKey();
    if (!key) {
      throw new Error('No embedding API keys configured');
    }

    try {
      const result = await postJson(
        `${this.baseUrl}/embeddings`,
        { model: this.model, input: texts },
        { Authorization: `Bearer ${key}` }
      );
      
      if (!result.data || !Array.isArray(result.data)) {
        throw new Error('Invalid batch embedding response format');
      }
      
      return result.data.map(d => d.embedding).filter(Boolean);
    } catch (err) {
      // Fall back to sequential embedding on batch failure
      const embeddings = [];
      for (const text of texts) {
        try {
          const emb = await this.getEmbedding(text);
          embeddings.push(emb);
        } catch (_) {
          embeddings.push(null);
        }
      }
      return embeddings;
    }
  }
}

/**
 * Initialize the default embedding provider from environment variables
 */
function createDefaultProvider() {
  const apiKeys = [
    process.env.GROQ_API_KEY_1 || process.env.GROQ_API_KEY,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3
  ].filter(Boolean);

  return new EmbeddingProvider({
    name: 'groq-embedding',
    apiKeys
  });
}

const defaultProvider = createDefaultProvider();

module.exports = {
  EmbeddingProvider,
  createDefaultProvider,
  normalizeVector,
  cosineSimilarity,
  defaultProvider,
  EMBEDDING_MODEL,
  EMBEDDING_DIMENSIONS
};
