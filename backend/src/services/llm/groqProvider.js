const BaseLLMProvider = require('./baseProvider');

const DEFAULT_COOLDOWN_MS = 60 * 1000; // 60 seconds cooldown on failure

class GroqProvider extends BaseLLMProvider {
  /**
   * @param {object} [config]
   * @param {string[]} [config.keys] - Optional explicit array of Groq keys
   * @param {string} [config.apiKey] - Single fallback API key
   * @param {string} [config.model] - Model name (defaults to openai/gpt-oss-120b)
   * @param {string} [config.baseUrl] - Base URL (defaults to https://api.groq.com/openai/v1)
   */
  constructor(config = {}) {
    const rawKeys = config.keys || [
      process.env.GROQ_API_KEY_1 || process.env.GROQ_API_KEY,
      process.env.GROQ_API_KEY_2,
      process.env.GROQ_API_KEY_3
    ];

    const sanitizedKeys = (Array.isArray(rawKeys) ? rawKeys : [config.apiKey])
      .filter(k => typeof k === 'string' && k.trim().length > 0)
      .map(k => k.trim());

    const model = config.model || process.env.LLM_MODEL || process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
    const baseUrl = config.baseUrl || process.env.LLM_BASE_URL || 'https://api.groq.com/openai/v1';

    super({
      name: 'groq',
      apiKey: sanitizedKeys[0] || null,
      model,
      baseUrl: baseUrl.replace(/\/$/, '').endsWith('/chat/completions')
        ? baseUrl.replace(/\/$/, '')
        : `${baseUrl.replace(/\/$/, '')}/chat/completions`
    });

    this.keys = sanitizedKeys;
    this.keyHealth = new Map(); // keyIndex -> { failureCount: number, cooldownUntil: number }
  }

  /**
   * Check if at least one Groq API key is configured
   */
  isConfigured() {
    return this.keys.length > 0;
  }

  /**
   * Set or update configured keys (useful for testing or dynamic failover)
   */
  setKeys(keysArray) {
    this.keys = (Array.isArray(keysArray) ? keysArray : [keysArray])
      .filter(k => typeof k === 'string' && k.trim().length > 0)
      .map(k => k.trim());
    this.apiKey = this.keys[0] || null;
    this.keyHealth.clear();
  }

  /**
   * Check if a specific key index is currently healthy and not in cooldown
   */
  isKeyHealthy(index) {
    const health = this.keyHealth.get(index);
    if (!health) return true;
    return Date.now() >= health.cooldownUntil;
  }

  /**
   * Mark a key as healthy and reset its backoff counters
   */
  markKeyHealthy(index) {
    this.keyHealth.set(index, { failureCount: 0, cooldownUntil: 0 });
  }

  /**
   * Mark a key in cooldown on timeout, 429 quota exhaustion, or server error
   */
  markKeyCooldown(index, error = null) {
    const prev = this.keyHealth.get(index) || { failureCount: 0, cooldownUntil: 0 };
    const failureCount = prev.failureCount + 1;
    const cooldownDuration = DEFAULT_COOLDOWN_MS * Math.min(failureCount, 5);
    this.keyHealth.set(index, {
      failureCount,
      cooldownUntil: Date.now() + cooldownDuration,
      lastError: error ? (error.message || 'Key failure') : 'Unknown error'
    });
  }

  /**
   * Reset cooldowns for all keys
   */
  resetHealth() {
    this.keyHealth.clear();
  }

  /**
   * Generate text completion with health-aware multi-key failover (Key 1 -> Key 2 -> Key 3)
   */
  async generate(options = {}) {
    if (!this.isConfigured()) {
      throw new Error('[groq] Provider is not configured (missing GROQ_API_KEY_1 / GROQ_API_KEY_2 / GROQ_API_KEY_3).');
    }

    const {
      prompt,
      systemPrompt,
      maxTokens = 800,
      temperature = 0.4,
      timeoutMs = 8000
    } = options;

    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const payload = {
      model: this.model,
      messages,
      max_tokens: maxTokens,
      temperature
    };

    // Sort candidate key indices: Healthy keys first in priority order, followed by recovering keys
    const candidateIndices = [];
    for (let i = 0; i < this.keys.length; i++) {
      if (this.isKeyHealthy(i)) {
        candidateIndices.push(i);
      }
    }
    // If all keys are currently in cooldown, include all keys in order of earliest cooldown expiration
    if (candidateIndices.length === 0) {
      for (let i = 0; i < this.keys.length; i++) {
        candidateIndices.push(i);
      }
    }

    const errors = [];

    for (const keyIndex of candidateIndices) {
      const currentKey = this.keys[keyIndex];
      const keyLabel = `Key #${keyIndex + 1}`;

      try {
        const headers = {
          Authorization: `Bearer ${currentKey}`
        };

        const data = await this.fetchWithTimeout(this.baseUrl, payload, headers, timeoutMs);

        const choice = data?.choices?.[0];
        const text = choice?.message?.content || '';
        const usage = data?.usage || {};

        if (!text || !text.trim()) {
          throw new Error(`[groq] ${keyLabel} returned empty completion text.`);
        }

        // Successfully executed -> mark key healthy
        this.markKeyHealthy(keyIndex);

        return {
          text: text.trim(),
          provider: this.name,
          model: this.model,
          activeKeyIndex: keyIndex,
          usage: {
            promptTokens: usage.prompt_tokens || 0,
            completionTokens: usage.completion_tokens || 0,
            totalTokens: usage.total_tokens || 0
          }
        };
      } catch (err) {
        // Mark failed key in cooldown
        this.markKeyCooldown(keyIndex, err);
        // Sanitize error message to ensure no API key is ever logged or exposed
        const sanitizedMsg = this.sanitizeError(err?.message || 'Request failed');
        errors.push(`${keyLabel}: ${sanitizedMsg}`);
      }
    }

    // All configured Groq keys failed
    const combinedError = new Error(`[groq] All ${this.keys.length} Groq API keys failed. Failures: ${errors.join(' | ')}`);
    combinedError.provider = this.name;
    throw combinedError;
  }

  /**
   * Helper to strip any configured secret keys from error messages
   */
  sanitizeError(errorMsg) {
    if (!errorMsg || typeof errorMsg !== 'string') return 'Request failed';
    let clean = errorMsg.replace(/Bearer\s+[a-zA-Z0-9_\-\.]+/gi, 'Bearer [REDACTED]');
    for (const key of this.keys) {
      if (key && key.length > 4) {
        clean = clean.split(key).join('[REDACTED]');
      }
    }
    return clean;
  }
}

module.exports = GroqProvider;
