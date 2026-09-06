const GeminiProvider = require('./geminiProvider');
const GroqProvider = require('./groqProvider');
const OpenAICompatibleProvider = require('./openAICompatibleProvider');

/**
 * Ordered LLM fallback router.
 *
 * Default production chain:
 *   1. Groq Key 1 -> GPT-OSS 120B
 *   2. Gemini Key 1 -> Gemini 3.1 Flash-Lite
 *   3. Groq Key 2 -> GPT-OSS 120B
 *   4. Gemini Key 2 -> Gemini 3.6 Flash-Lite
 *   5. Groq Key 3 -> GPT-OSS 120B
 *
 * The GroqProvider normally supports multi-key failover itself. For this
 * router, each Groq key is intentionally instantiated as a single-key
 * provider so fallback happens in the exact slot order above rather than
 * exhausting all Groq keys before trying Gemini.
 */
class LLMRouter {
  constructor() {
    this.providers = new Map();
    this.customOrder = null;
    this.initializeDefaultProviders();
  }

  initializeDefaultProviders() {
    this.providers.clear();
    this.customOrder = null;

    const groqModel = process.env.LLM_MODEL || process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
    const geminiModel1 = process.env.GEMINI_MODEL_1 || 'gemini-3.1-flash-lite';
    const geminiModel2 = process.env.GEMINI_MODEL_2 || 'gemini-3.6-flash-lite';

    // Each provider instance gets exactly ONE credential. This is deliberate:
    // the router, not GroqProvider, owns the cross-provider fallback order.
    this.providers.set('groq-1', new GroqProvider({
      keys: [process.env.GROQ_API_KEY_1 || process.env.GROQ_API_KEY],
      model: groqModel,
      baseUrl: process.env.LLM_BASE_URL || 'https://api.groq.com/openai/v1'
    }));

    this.providers.set('gemini-1', new GeminiProvider({
      apiKey: process.env.GEMINI_API_KEY_1 || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY,
      model: geminiModel1
    }));

    this.providers.set('groq-2', new GroqProvider({
      keys: [process.env.GROQ_API_KEY_2],
      model: groqModel,
      baseUrl: process.env.LLM_BASE_URL || 'https://api.groq.com/openai/v1'
    }));

    this.providers.set('gemini-2', new GeminiProvider({
      apiKey: process.env.GEMINI_API_KEY_2,
      model: geminiModel2
    }));

    this.providers.set('groq-3', new GroqProvider({
      keys: [process.env.GROQ_API_KEY_3],
      model: groqModel,
      baseUrl: process.env.LLM_BASE_URL || 'https://api.groq.com/openai/v1'
    }));

    // Keep the legacy providers available for explicit custom/test ordering,
    // but do not include them in the default production fallback chain.
    this.providers.set('gemini', new GeminiProvider());
    this.providers.set('groq', new GroqProvider());
    this.providers.set('openrouter', new OpenAICompatibleProvider({ name: 'openrouter' }));
    this.providers.set('openai', new OpenAICompatibleProvider({ name: 'openai' }));
  }

  registerProvider(name, providerInstance) {
    this.providers.set(name.toLowerCase(), providerInstance);
  }

  removeProvider(name) {
    this.providers.delete(name.toLowerCase());
  }

  setProviderOrder(orderArray) {
    if (Array.isArray(orderArray)) {
      this.customOrder = orderArray.map(s => String(s).trim().toLowerCase()).filter(Boolean);
    } else if (typeof orderArray === 'string') {
      this.customOrder = orderArray.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    } else {
      this.customOrder = null;
    }
  }

  getConfiguredProviders() {
    const rawOrder = this.customOrder || [
      'groq-1',
      'gemini-1',
      'groq-2',
      'gemini-2',
      'groq-3'
    ];

    const activeList = [];
    for (const name of rawOrder) {
      const provider = this.providers.get(name);
      if (provider && provider.isConfigured()) {
        activeList.push({ name, provider });
      }
    }
    return activeList;
  }

  /**
   * Generate completion using the exact configured fallback sequence.
   *
   * A provider only counts as successful when it returns non-empty text.
   * Provider-specific failures (429, timeout, 5xx, invalid model, etc.) are
   * recorded and the next slot is attempted. No automatic jump to OpenRouter
   * or OpenAI occurs in the default chain.
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
      console.warn('[LLMRouter] No configured LLM fallback slots are available.');
      return this.buildFallbackResponse([], 'No configured LLM providers available');
    }

    const errors = [];

    for (let i = 0; i < availableProviders.length; i++) {
      const { name: slotName, provider } = availableProviders[i];

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
            attemptsCount: i + 1,
            fallbackSlot: slotName
          };
        }

        errors.push({
          slot: slotName,
          provider: provider.name,
          error: 'Empty completion received'
        });
      } catch (err) {
        const sanitizedMsg = String(err.message || 'Provider request failed')
          .replace(/key=[^&\s]+/gi, 'key=***')
          .replace(/Bearer\s+[^\s]+/gi, 'Bearer ***');

        errors.push({
          slot: slotName,
          provider: provider.name,
          error: sanitizedMsg,
          isTimeout: Boolean(err.isTimeout),
          isQuotaOrRateLimit: Boolean(err.isQuotaOrRateLimit)
        });
      }
    }

    console.error('[LLMRouter] All configured LLM fallback slots failed:', JSON.stringify(errors));
    return this.buildFallbackResponse(errors, 'All configured LLM providers failed');
  }

  buildFallbackResponse(providerErrors, error) {
    return {
      text: 'AI generation is temporarily unavailable. Please refer to the structured problem hints, complexity breakdown, and algorithmic approach above.',
      source: 'fallback',
      provider: 'fallback',
      model: 'none',
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      error,
      providerErrors
    };
  }
}

module.exports = new LLMRouter();
