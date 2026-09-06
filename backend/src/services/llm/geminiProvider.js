const BaseLLMProvider = require('./baseProvider');

class GeminiProvider extends BaseLLMProvider {
  constructor(config = {}) {
    const apiKey = config.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    const model = config.model || process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    super({
      name: 'gemini',
      apiKey,
      model,
      baseUrl: config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta/models'
    });
  }

  async generate(options = {}) {
    if (!this.isConfigured()) {
      throw new Error('[gemini] Provider is not configured (missing GEMINI_API_KEY).');
    }

    const {
      prompt,
      systemPrompt,
      maxTokens = 800,
      temperature = 0.4,
      timeoutMs = 8000
    } = options;

    const url = `${this.baseUrl}/${this.model}:generateContent?key=${this.apiKey}`;
    const isDailyChallenge = /Principal DSA Problem Author/i.test(systemPrompt || '');

    const contents = [];
    if (systemPrompt) {
      contents.push({ role: 'user', parts: [{ text: `SYSTEM INSTRUCTIONS: ${systemPrompt}` }] });
    }
    contents.push({ role: 'user', parts: [{ text: prompt }] });

    const generationConfig = {
      maxOutputTokens: maxTokens
    };

    // Gemini structured output is important for Daily Challenge generation:
    // it eliminates markdown fences and greatly reduces malformed JSON.
    if (isDailyChallenge) {
      generationConfig.responseMimeType = 'application/json';
    } else {
      generationConfig.temperature = temperature;
    }

    const payload = {
      contents,
      generationConfig
    };

    const data = await this.fetchWithTimeout(url, payload, {}, timeoutMs);

    const candidate = data?.candidates?.[0];
    const text = candidate?.content?.parts?.map(part => part?.text || '').join('') || '';
    const usageMetadata = data?.usageMetadata || {};

    return {
      text: text.trim(),
      provider: this.name,
      model: this.model,
      usage: {
        promptTokens: usageMetadata.promptTokenCount || 0,
        completionTokens: usageMetadata.candidatesTokenCount || 0,
        totalTokens: usageMetadata.totalTokenCount || 0
      }
    };
  }
}

module.exports = GeminiProvider;
