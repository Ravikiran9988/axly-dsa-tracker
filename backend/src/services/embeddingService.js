const https = require('https');

/**
 * Embedding Provider Abstraction
 * 
 * Primary provider: Google Gemini embedding (gemini-embedding-001, 3072 dimensions)
 * Native endpoint: https://generativelanguage.googleapis.com/v1beta/models/{model}:embedContent
 * 
 * Provider-abstracted: supports both native Gemini and OpenAI-compatible providers (Groq, OpenAI, etc.).
 * 
 * Configuration via environment variables:
 * - EMBEDDING_PROVIDER_BASE_URL: Base URL for embedding API (default: https://generativelanguage.googleapis.com/v1beta)
 * - EMBEDDING_PROVIDER_API_KEY: Primary API key for the embedding provider
 * - EMBEDDING_MODEL: Model name (default: gemini-embedding-001)
 * - EMBEDDING_DIMENSIONS: Expected vector dimensions (default: 3072)
 * - EMBEDDING_TIMEOUT_MS: Request timeout in milliseconds (default: 30000)
 * - EMBEDDING_MAX_RETRIES: Maximum retry attempts for transient errors (default: 2)
 * - EMBEDDING_RETRY_DELAY_MS: Base delay between retries in milliseconds (default: 1000)
 */

const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'gemini-embedding-001';
const EMBEDDING_DIMENSIONS = Number(process.env.EMBEDDING_DIMENSIONS) || 3072;
const EMBEDDING_TIMEOUT_MS = Number(process.env.EMBEDDING_TIMEOUT_MS) || 30000;
const EMBEDDING_MAX_RETRIES = Number(process.env.EMBEDDING_MAX_RETRIES) || 2;
const EMBEDDING_RETRY_DELAY_MS = Number(process.env.EMBEDDING_RETRY_DELAY_MS) || 1000;

/**
 * Check if an error represents an authentication or authorization failure
 */
function isAuthError(err) {
  if (!err) return false;
  const statusCode = err.statusCode || err.status;
  if (statusCode === 401 || statusCode === 403) {
    return true;
  }
  const message = String(err.message || '').toLowerCase();
  const reason = String(err.reason || '').toLowerCase();
  if (
    reason.includes('api_key_invalid') ||
    reason.includes('api_key_expired') ||
    reason.includes('api_key_service_blocked') ||
    reason.includes('permission_denied') ||
    message.includes('api key not valid') ||
    message.includes('please pass a valid api key') ||
    message.includes('invalid api key') ||
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('authentication')
  ) {
    return true;
  }
  return false;
}

/**
 * Clean and normalize Gemini base URL
 * Handles trailing slashes, leftover /openai suffixes, and ensures /v1beta path
 */
function normalizeGeminiBaseUrl(rawBaseUrl) {
  let url = (rawBaseUrl || 'https://generativelanguage.googleapis.com/v1beta').trim();
  url = url.replace(/\/+$/, '');
  url = url.replace(/\/openai(?:\/v\d+)?$/i, '');
  if (!/\/v\d+(?:beta\d*)?$/i.test(url)) {
    url = `${url}/v1beta`;
  }
  return url;
}

/**
 * Check whether a string looks like a documentation/config placeholder rather than a real key
 */
function isPlaceholderKey(key) {
  if (!key || typeof key !== 'string') return true;
  const trimmed = key.trim().toLowerCase();
  return (
    trimmed === '' ||
    trimmed.startsWith('your_') ||
    trimmed.startsWith('your-') ||
    trimmed.includes('placeholder') ||
    trimmed.includes('...') ||
    trimmed.includes('example') ||
    trimmed.includes('changeme')
  );
}

/**
 * Normalize embedding vector to unit length for consistent cosine similarity
 */
function normalizeVector(vec) {
  if (!vec || !Array.isArray(vec)) return vec;
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
  if (!a || !b || !Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return 0;
  let dot = 0, aa = 0, bb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    aa += a[i] * a[i];
    bb += b[i] * b[i];
  }
  return aa && bb ? dot / (Math.sqrt(aa) * Math.sqrt(bb)) : 0;
}

/**
 * HTTP POST with timeout
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
            err.reason = json.error?.details?.[0]?.reason || json.error?.status;
            err.isQuotaOrRateLimit = res.statusCode === 429 || /\b(?:429|rate limit|quota|resource_exhausted)\b/i.test(errMsg);
            if (isAuthError(err)) {
              err.isAuthError = true;
            }
            return reject(err);
          }
          resolve(json);
        } catch (e) {
          const err = new Error(res.statusCode >= 400 ? `Embedding request failed (${res.statusCode})` : 'Invalid embedding response');
          err.statusCode = res.statusCode;
          reject(err);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      const err = new Error('Embedding request timed out');
      err.isTimeout = true;
      reject(err);
    });
    req.write(JSON.stringify(body));
    req.end();
  });
}

/**
 * Embedding Provider
 * 
 * Supports both native Gemini API format and OpenAI-compatible format.
 */
class EmbeddingProvider {
  constructor(options = {}) {
    this.name = options.name || 'gemini-embedding';
    this.provider = options.provider || options.type || (this.name.includes('openai') ? 'openai' : 'gemini');
    this.model = options.model || EMBEDDING_MODEL;
    this.dimensions = options.dimensions !== undefined ? Number(options.dimensions) : EMBEDDING_DIMENSIONS;

    if (this.provider === 'gemini') {
      this.baseUrl = normalizeGeminiBaseUrl(options.baseUrl);
    } else {
      this.baseUrl = (options.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
    }

    this.apiKeys = options.apiKeys || [];
    this.currentKeyIndex = 0;
    this.timeoutMs = options.timeoutMs || EMBEDDING_TIMEOUT_MS;
    this.maxRetries = options.maxRetries !== undefined ? Number(options.maxRetries) : EMBEDDING_MAX_RETRIES;
    this.retryDelayMs = options.retryDelayMs !== undefined ? Number(options.retryDelayMs) : EMBEDDING_RETRY_DELAY_MS;
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
   * Internal implementation for Gemini native single embedding
   */
  async _getGeminiEmbedding(text, key) {
    const cleanModel = this.model.replace(/^models\//, '');
    const url = `${this.baseUrl}/models/${cleanModel}:embedContent`;

    const body = {
      content: {
        parts: [{ text: String(text) }]
      }
    };
    if (this.dimensions) {
      body.outputDimensionality = this.dimensions;
    }

    const result = await postJson(
      url,
      body,
      { 'x-goog-api-key': key },
      this.timeoutMs
    );

    const values = result?.embedding?.values;
    if (!values || !Array.isArray(values) || values.length === 0) {
      const err = new Error('Invalid Gemini embedding response format');
      err.isValidationError = true;
      throw err;
    }

    if (this.dimensions && values.length !== this.dimensions) {
      const err = new Error(`Embedding dimension mismatch: expected ${this.dimensions}, got ${values.length}`);
      err.isValidationError = true;
      err.statusCode = 422;
      throw err;
    }

    return values;
  }

  /**
   * Internal implementation for OpenAI-compatible single embedding
   */
  async _getOpenAIEmbedding(text, key) {
    const url = `${this.baseUrl}/embeddings`;
    const result = await postJson(
      url,
      { model: this.model, input: text },
      { Authorization: `Bearer ${key}` },
      this.timeoutMs
    );

    const embedding = result?.data?.[0]?.embedding;
    if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
      const err = new Error('Invalid OpenAI embedding response format');
      err.isValidationError = true;
      throw err;
    }

    if (this.dimensions && embedding.length !== this.dimensions) {
      const err = new Error(`Embedding dimension mismatch: expected ${this.dimensions}, got ${embedding.length}`);
      err.isValidationError = true;
      err.statusCode = 422;
      throw err;
    }

    return embedding;
  }

  /**
   * Generate embedding for a single text
   * @param {string} text - The text to embed
   * @returns {Promise<number[]>} - The embedding vector
   */
  async getEmbedding(text) {
    if (text === undefined || text === null) {
      throw new Error('Text is required for embedding generation');
    }

    const key = this.getNextKey();
    if (!key) {
      throw new Error('No embedding API keys configured');
    }

    let lastError = null;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        if (this.provider === 'gemini') {
          return await this._getGeminiEmbedding(text, key);
        } else {
          return await this._getOpenAIEmbedding(text, key);
        }
      } catch (err) {
        lastError = err;

        // Don't retry on auth errors or permanent failures
        if (isAuthError(err) || err.isAuthError || err.statusCode === 401 || err.statusCode === 403) {
          throw err;
        }

        // Don't retry on client validation errors (dimension mismatch, invalid format)
        if (err.isValidationError || err.statusCode === 422) {
          throw err;
        }

        // Retry on rate limit with backoff
        if (err.isQuotaOrRateLimit && attempt < this.maxRetries) {
          const delay = this.retryDelayMs * Math.pow(2, attempt);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }

        // Retry on transient errors
        if (attempt < this.maxRetries && !err.isQuotaOrRateLimit) {
          await new Promise(r => setTimeout(r, this.retryDelayMs));
          continue;
        }
      }
    }

    throw lastError || new Error('Embedding generation failed after retries');
  }

  /**
   * Internal implementation for Gemini native batch embeddings
   */
  async _getGeminiBatchEmbeddings(texts, key) {
    const cleanModel = this.model.replace(/^models\//, '');
    const url = `${this.baseUrl}/models/${cleanModel}:batchEmbedContents`;

    const requests = texts.map(text => {
      const req = {
        model: `models/${cleanModel}`,
        content: {
          parts: [{ text: String(text) }]
        }
      };
      if (this.dimensions) {
        req.outputDimensionality = this.dimensions;
      }
      return req;
    });

    const result = await postJson(
      url,
      { requests },
      { 'x-goog-api-key': key },
      this.timeoutMs
    );

    if (!result?.embeddings || !Array.isArray(result.embeddings)) {
      const err = new Error('Invalid batch embedding response format');
      err.isValidationError = true;
      throw err;
    }

    const vectors = result.embeddings.map(e => e?.values);
    for (const vec of vectors) {
      if (!vec || !Array.isArray(vec) || (this.dimensions && vec.length !== this.dimensions)) {
        const err = new Error(`Embedding dimension mismatch in batch: expected ${this.dimensions}, got ${vec ? vec.length : 'null'}`);
        err.isValidationError = true;
        err.statusCode = 422;
        throw err;
      }
    }
    return vectors;
  }

  /**
   * Internal implementation for OpenAI-compatible batch embeddings
   */
  async _getOpenAIBatchEmbeddings(texts, key) {
    const url = `${this.baseUrl}/embeddings`;
    const result = await postJson(
      url,
      { model: this.model, input: texts },
      { Authorization: `Bearer ${key}` },
      this.timeoutMs
    );

    if (!result?.data || !Array.isArray(result.data)) {
      const err = new Error('Invalid batch embedding response format');
      err.isValidationError = true;
      throw err;
    }

    const vectors = result.data.map(d => d.embedding);
    for (const vec of vectors) {
      if (!vec || !Array.isArray(vec) || (this.dimensions && vec.length !== this.dimensions)) {
        const err = new Error(`Embedding dimension mismatch in batch: expected ${this.dimensions}, got ${vec ? vec.length : 'null'}`);
        err.isValidationError = true;
        err.statusCode = 422;
        throw err;
      }
    }
    return vectors;
  }

  /**
   * Generate embeddings for multiple texts (batched with fallback)
   * @param {string[]} texts - Array of texts to embed
   * @returns {Promise<number[][]>} - Array of embedding vectors
   */
  async getEmbeddings(texts) {
    if (!texts || !Array.isArray(texts) || texts.length === 0) return [];

    const key = this.getNextKey();
    if (!key) {
      throw new Error('No embedding API keys configured');
    }

    try {
      if (this.provider === 'gemini') {
        return await this._getGeminiBatchEmbeddings(texts, key);
      } else {
        return await this._getOpenAIBatchEmbeddings(texts, key);
      }
    } catch (err) {
      // If auth error or validation error, rethrow immediately
      if (isAuthError(err) || err.isAuthError || err.isValidationError) {
        throw err;
      }

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
  const rawBaseUrl = process.env.EMBEDDING_PROVIDER_BASE_URL;
  const providerApiKey = process.env.EMBEDDING_PROVIDER_API_KEY;

  // Provider selection: defaults to gemini unless explicitly set to openai/groq
  const explicitProvider = process.env.EMBEDDING_PROVIDER;
  const isExplicitOpenAI = explicitProvider === 'openai' || explicitProvider === 'groq';
  const provider = isExplicitOpenAI ? explicitProvider : 'gemini';

  const baseUrl = provider === 'gemini'
    ? normalizeGeminiBaseUrl(rawBaseUrl)
    : (rawBaseUrl || 'https://api.groq.com/openai/v1');

  // Primary credential: EMBEDDING_PROVIDER_API_KEY
  // Fallback: Gemini keys (GEMINI_API_KEY_1, GEMINI_API_KEY_2, GEMINI_API_KEY) when provider is gemini
  const fallbackGeminiKeys = [
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY
  ].filter(k => k && k.trim() && !isPlaceholderKey(k));

  const fallbackGroqKeys = [
    process.env.GROQ_API_KEY_1 || process.env.GROQ_API_KEY,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3
  ].filter(k => k && k.trim() && !isPlaceholderKey(k));

  let apiKeys = [];
  if (providerApiKey && providerApiKey.trim() && !isPlaceholderKey(providerApiKey)) {
    apiKeys = [providerApiKey.trim()];
  } else if (provider === 'gemini' && fallbackGeminiKeys.length > 0) {
    apiKeys = fallbackGeminiKeys;
  } else if (provider !== 'gemini' && fallbackGroqKeys.length > 0) {
    apiKeys = fallbackGroqKeys;
  } else if (providerApiKey && providerApiKey.trim()) {
    // If only a placeholder was provided and no fallback, retain it so auth failure surfaces correctly
    apiKeys = [providerApiKey.trim()];
  }

  return new EmbeddingProvider({
    name: provider === 'gemini' ? 'gemini-embedding' : `${provider}-embedding`,
    provider,
    model: EMBEDDING_MODEL,
    dimensions: EMBEDDING_DIMENSIONS,
    baseUrl,
    apiKeys,
    timeoutMs: EMBEDDING_TIMEOUT_MS,
    maxRetries: EMBEDDING_MAX_RETRIES,
    retryDelayMs: EMBEDDING_RETRY_DELAY_MS
  });
}

const defaultProvider = createDefaultProvider();

module.exports = {
  EmbeddingProvider,
  createDefaultProvider,
  normalizeVector,
  cosineSimilarity,
  defaultProvider,
  isAuthError,
  normalizeGeminiBaseUrl,
  isPlaceholderKey,
  postJson,
  EMBEDDING_MODEL,
  EMBEDDING_DIMENSIONS
};
