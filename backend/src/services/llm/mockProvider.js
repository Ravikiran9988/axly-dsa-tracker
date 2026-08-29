const BaseLLMProvider = require('./baseProvider');

class MockProvider extends BaseLLMProvider {
  constructor(config = {}) {
    super({
      name: config.name || 'mock-provider',
      apiKey: config.apiKey !== undefined ? config.apiKey : 'mock-key',
      model: config.model || 'mock-model'
    });
    this.behavior = config.behavior || 'success'; // 'success' | 'timeout' | 'quota_error' | 'server_error' | 'empty'
    this.delayMs = config.delayMs || 10;
    this.customText = config.customText || null;
  }

  setBehavior(behavior, customText = null) {
    this.behavior = behavior;
    if (customText) this.customText = customText;
  }

  async generate(options = {}) {
    if (this.delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delayMs));
    }

    if (this.behavior === 'timeout') {
      const err = new Error(`[${this.name}] Request timed out after ${options.timeoutMs || 8000}ms`);
      err.isTimeout = true;
      err.provider = this.name;
      throw err;
    }

    if (this.behavior === 'quota_error') {
      const err = new Error(`[${this.name}] API error (429): Quota exceeded or rate limited`);
      err.status = 429;
      err.isQuotaOrRateLimit = true;
      err.provider = this.name;
      throw err;
    }

    if (this.behavior === 'server_error') {
      const err = new Error(`[${this.name}] API error (500): Internal server error`);
      err.status = 500;
      err.provider = this.name;
      throw err;
    }

    if (this.behavior === 'empty') {
      return {
        text: '',
        provider: this.name,
        model: this.model,
        usage: { promptTokens: 10, completionTokens: 0, totalTokens: 10 }
      };
    }

    const output = this.customText || `Guidance from ${this.name}: Consider using a hash map to track elements in O(N) time.`;

    return {
      text: output,
      provider: this.name,
      model: this.model,
      usage: {
        promptTokens: 45,
        completionTokens: 25,
        totalTokens: 70
      }
    };
  }
}

module.exports = MockProvider;
