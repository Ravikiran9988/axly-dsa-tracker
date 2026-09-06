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
 *   4. Gemini Key 2 -> Gemini 3.5 Flash-Lite
 *   5. Groq Key 3 -> GPT-OSS 120B
 *
 * Daily Challenge generation intentionally does NOT execute generated
 * reference solutions in the sandbox. It validates structure and uniqueness,
 * then accepts the generated question, test cases, and hints.
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
    const geminiModel2 = process.env.GEMINI_MODEL_2 || 'gemini-3.5-flash-lite';
    const groqBaseUrl = process.env.LLM_BASE_URL || 'https://api.groq.com/openai/v1';

    this.providers.set('groq-1', new GroqProvider({
      keys: [process.env.GROQ_API_KEY_1 || process.env.GROQ_API_KEY],
      model: groqModel,
      baseUrl: groqBaseUrl
    }));
    this.providers.set('gemini-1', new GeminiProvider({
      apiKey: process.env.GEMINI_API_KEY_1 || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY,
      model: geminiModel1
    }));
    this.providers.set('groq-2', new GroqProvider({
      keys: [process.env.GROQ_API_KEY_2],
      model: groqModel,
      baseUrl: groqBaseUrl
    }));
    this.providers.set('gemini-2', new GeminiProvider({
      apiKey: process.env.GEMINI_API_KEY_2,
      model: geminiModel2
    }));
    this.providers.set('groq-3', new GroqProvider({
      keys: [process.env.GROQ_API_KEY_3],
      model: groqModel,
      baseUrl: groqBaseUrl
    }));

    // Legacy/custom providers remain available for explicit registration.
    this.providers.set('gemini', new GeminiProvider());
    this.providers.set('groq', new GroqProvider());
    this.providers.set('openrouter', new OpenAICompatibleProvider({ name: 'openrouter' }));
  }

  registerProvider(name, providerInstance) {
    this.providers.set(String(name).toLowerCase(), providerInstance);
  }

  removeProvider(name) {
    this.providers.delete(String(name).toLowerCase());
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
    const rawOrder = this.customOrder || ['groq-1', 'gemini-1', 'groq-2', 'gemini-2', 'groq-3'];
    return rawOrder
      .map(name => ({ name, provider: this.providers.get(name) }))
      .filter(({ provider }) => provider && provider.isConfigured());
  }

  parseJson(text) {
    let cleaned = String(text || '').trim();
    if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
    else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
    cleaned = cleaned.trim();

    try {
      return JSON.parse(cleaned);
    } catch (firstError) {
      const objectStart = cleaned.indexOf('{');
      const objectEnd = cleaned.lastIndexOf('}');
      if (objectStart >= 0 && objectEnd > objectStart) {
        try {
          return JSON.parse(cleaned.slice(objectStart, objectEnd + 1));
        } catch (_) {
          // Fall through to the original parse error.
        }
      }
      throw firstError;
    }
  }

  async validateDailyChallengeCandidate(text) {
    let candidate;
    try {
      candidate = this.parseJson(text);
    } catch (err) {
      return { valid: false, reason: `Invalid JSON: ${err.message}` };
    }

    if (!candidate || Array.isArray(candidate) || typeof candidate !== 'object') {
      return { valid: false, reason: 'Generated challenge must be a JSON object' };
    }

    const dailyService = require('../aiDailyChallengeService');
    const validation = dailyService.validateDailyChallenge(candidate);
    if (!validation.isValid) {
      return { valid: false, reason: `Schema validation failed: ${validation.errors.join('; ')}` };
    }

    candidate.title = dailyService.stripVariantIdentifiers(candidate.title);
    candidate.problem_concept = dailyService.extractProblemConcept(candidate.title, candidate.description);
    candidate.problem_signature = dailyService.generateProblemSignature(candidate);

    // Uniqueness is the only semantic/database gate for generated Daily Challenges.
    // No reference solution, driver, or test case is executed here.
    const duplicate = await dailyService.checkDuplicateChallenge(candidate);
    if (duplicate.isDuplicate) {
      return { valid: false, reason: duplicate.reason || 'Duplicate Daily Challenge candidate' };
    }

    candidate.sandbox_verified = false;
    return { valid: true, candidate };
  }

  async generate(options = {}) {
    let {
      prompt,
      systemPrompt,
      maxTokens = 800,
      temperature = 0.4,
      timeoutMs = 8000,
      validateResponse = null
    } = options;

    const isDailyChallenge = Boolean(systemPrompt && /Principal DSA Problem Author/i.test(systemPrompt));
    if (isDailyChallenge) {
      maxTokens = Math.max(Number(maxTokens) || 0, 2400);
      temperature = 0.2;
    }

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

        if (!response || !response.text || response.text.trim().length === 0) {
          errors.push({ slot: slotName, provider: provider.name, error: 'Empty completion received' });
          continue;
        }

        let validationResult = null;
        if (typeof validateResponse === 'function') {
          validationResult = await validateResponse(response.text, {
            slotName,
            provider: provider.name,
            model: provider.model
          });
        } else if (isDailyChallenge) {
          validationResult = await this.validateDailyChallengeCandidate(response.text);
        }

        if (validationResult && validationResult.valid === false) {
          const failureReason = validationResult.reason || 'Response rejected by validator';
          errors.push({
            slot: slotName,
            provider: provider.name,
            error: failureReason,
            stage: 'validation'
          });
          console.warn(`[LLMRouter] Rejected ${slotName} candidate: ${failureReason}`);
          continue;
        }

        return {
          text: response.text.trim(),
          source: 'llm',
          provider: response.provider || provider.name,
          model: response.model || provider.model,
          usage: response.usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          attemptsCount: i + 1,
          fallbackSlot: slotName,
          validation: validationResult && validationResult.candidate
            ? { unique: true, sandbox: false }
            : undefined
        };
      } catch (err) {
        const sanitizedMsg = String(err.message || 'Provider request failed')
          .replace(/key=[^&\s]+/gi, 'key=***')
          .replace(/Bearer\s+[^\s]+/gi, 'Bearer ***');

        errors.push({
          slot: slotName,
          provider: provider.name,
          error: sanitizedMsg,
          isTimeout: Boolean(err.isTimeout),
          isQuotaOrRateLimit: Boolean(err.isQuotaOrRateLimit) || /\b(?:429|rate limit|tokens per day|quota)\b/i.test(sanitizedMsg)
        });
      }
    }

    console.error('[LLMRouter] All configured LLM fallback slots failed or rejected:', JSON.stringify(errors));
    return this.buildFallbackResponse(errors, 'All configured LLM providers failed or returned invalid/duplicate challenges');
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
