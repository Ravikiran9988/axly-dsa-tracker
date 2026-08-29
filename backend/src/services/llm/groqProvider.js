const BaseLLMProvider = require('./baseProvider');

class GroqProvider extends BaseLLMProvider {
  constructor(config = {}) {
    const apiKey = config.apiKey || process.env.GROQ_API_KEY;
    const model = config.model || process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
    super({
      name: 'groq',
      apiKey,
      model,
      baseUrl: config.baseUrl || 'https://api.groq.com/openai/v1/chat/completions'
    });
  }

  async generate(options = {}) {
    if (!this.isConfigured()) {
      throw new Error('[groq] Provider is not configured (missing GROQ_API_KEY).');
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

    const headers = {
      Authorization: `Bearer ${this.apiKey}`
    };

    const data = await this.fetchWithTimeout(this.baseUrl, payload, headers, timeoutMs);

    const choice = data?.choices?.[0];
    const text = choice?.message?.content || '';
    const usage = data?.usage || {};

    return {
      text: text.trim(),
      provider: this.name,
      model: this.model,
      usage: {
        promptTokens: usage.prompt_tokens || 0,
        completionTokens: usage.completion_tokens || 0,
        totalTokens: usage.total_tokens || 0
      }
    };
  }
}

module.exports = GroqProvider;
