const crypto = require('crypto');

class DsaAiCacheService {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 500;
    this.defaultTtlMs = options.defaultTtlMs || (60 * 60 * 1000); // 1 hour
    this.cache = new Map();
  }

  generateKey({ problemId, intent, queryText, code = '' }) {
    const raw = `${problemId || 'general'}:${intent || 'general'}:${queryText.trim().toLowerCase()}:${code ? crypto.createHash('md5').update(code.trim()).digest('hex') : ''}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  get(key) {
    if (!key || !this.cache.has(key)) return null;
    const item = this.cache.get(key);
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }

  set(key, value, ttlMs = this.defaultTtlMs) {
    if (!key || !value) return;

    if (this.cache.size >= this.maxSize) {
      // Evict oldest entry
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs
    });
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }
}

module.exports = new DsaAiCacheService();
