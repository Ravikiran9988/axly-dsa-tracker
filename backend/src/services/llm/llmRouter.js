const GeminiProvider = require('./geminiProvider');
const GroqProvider = require('./groqProvider');
const OpenAICompatibleProvider = require('./openAICompatibleProvider');

class LLMRouter {
  constructor() {
    this.providers = new Map();
    this.customOrder = null;
    this.initializeDefaultProviders();
  }

  initializeDefaultProviders() {
    this.providers.clear();
    this.providers.set('gemini', new GeminiProvider());
    this.providers.set('groq', new GroqProvider());
    this.providers.set('openrouter', new OpenAICompatibleProvider({ name: 'openrouter' }));
    this.providers.set('openai', new OpenAICompatibleProvider({ name: 'openai' }));
  }

  /**
   * Register a custom or mock provider (useful for testing or dynamic plugin)
   */
  registerProvider(name, providerInstance) {
    this.providers.set(name.toLowerCase(), providerInstance);
  }

  /**
   * Remove a provider
   */
  removeProvider(name) {
    this.providers.delete(name.toLowerCase());
  }

  /**
   * Override provider order for this session or test
   */
  setProviderOrder(orderArray) {
    if (Array.isArray(orderArray)) {
      this.customOrder = orderArray.map(s => String(s).trim().toLowerCase()).filter(Boolean);
    } else if (typeof orderArray === 'string') {
      this.customOrder = orderArray.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    } else {
      this.customOrder = null;
    }
  }

  /**
   * Get active ordered list of configured providers
   */
  getConfiguredProviders() {
    const rawOrder = this.customOrder || (process.env.LLM_PROVIDER_ORDER 
      ? process.env.LLM_PROVIDER_ORDER.split(',').map(s => s.trim().toLowerCase()) 
      : ['groq', 'gemini', 'openrouter', 'openai']);

    const activeList = [];
    for (const name of rawOrder) {
      const provider = this.providers.get(name);
      if (provider && provider.isConfigured()) {
        activeList.push(provider);
      }
    }
    return activeList;
  }

  /**
   * Generate completion with multi-provider fallback
   * @param {object} options
   * @param {string} options.prompt - Prompt content
   * @param {string} [options.systemPrompt] - System instructions
   * @param {number} [options.maxTokens] - Max tokens to generate (default 800)
   * @param {number} [options.temperature] - Sampling temperature (default 0.4)
   * @param {number} [options.timeoutMs] - Timeout per provider (default 8000ms)
   * @returns {Promise<{ text: string, source: string, provider: string, model: string, usage: object, error?: string }>}
   */
  async generate(options = {}) {
    const {
      prompt,
      systemPrompt,
      maxTokens = 800,
      temperature = 0.4,
      timeoutMs = 8000
    } = options;

    const availableProviders = this.getConfiguredProviders();

    if (availableProviders.length === 0) {
      return {
        text: 'AI generation is temporarily unavailable (no LLM providers configured). Please refer to the structured problem hints and verified approach.',
        source: 'fallback',
        provider: 'fallback',
        model: 'none',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        error: 'No configured LLM providers available'
      };
    }

    const maxAttempts = availableProviders.length;
    const errors = [];

    for (let i = 0; i < maxAttempts; i++) {
      const provider = availableProviders[i];
      try {
        const response = await provider.generate({
          prompt,
          systemPrompt,
          maxTokens,
          temperature,
          timeoutMs
        });

        if (response && response.text && response.text.trim().length > 0) {
          return {
            text: response.text.trim(),
            source: 'llm',
            provider: response.provider || provider.name,
            model: response.model || provider.model,
            usage: response.usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
            attemptsCount: i + 1
          };
        }

        // Empty response counts as failure, try next
        errors.push({ provider: provider.name, error: 'Empty completion received' });
      } catch (err) {
        // Sanitize error to ensure API keys are never exposed in error objects
        const sanitizedMsg = String(err.message || 'Provider request failed')
          .replace(/key=[^&\s]+/gi, 'key=***')
          .replace(/Bearer\s+[^\s]+/gi, 'Bearer ***');

        errors.push({
          provider: provider.name,
          error: sanitizedMsg,
          isTimeout: Boolean(err.isTimeout),
          isQuotaOrRateLimit: Boolean(err.isQuotaOrRateLimit)
        });
      }
    }

    // All configured providers failed -> graceful fallback
    return {
      text: 'AI generation is temporarily unavailable. Please refer to the structured problem hints, complexity breakdown, and algorithmic approach above.',
      source: 'fallback',
      provider: 'fallback',
      model: 'none',
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      error: 'All configured LLM providers failed',
      providerErrors: errors
    };
  }
}

module.exports = new LLMRouter();
