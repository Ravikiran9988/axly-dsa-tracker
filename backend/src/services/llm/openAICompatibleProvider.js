const BaseLLMProvider = require('./baseProvider');

class OpenAICompatibleProvider extends BaseLLMProvider {
  constructor(config = {}) {
    const name = config.name || 'openrouter';
    const apiKey = config.apiKey || process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || process.env.LLM_API_KEY;
    const baseUrl = config.baseUrl || process.env.LLM_BASE_URL || (process.env.OPENROUTER_API_KEY ? 'https://openrouter.ai/api/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions');
    const model = config.model || process.env.LLM_MODEL || 'meta-llama/llama-3.1-8b-instruct:free';

    super({
      name,
      apiKey,
      model,
      baseUrl
    });
  }

  async generate(options = {}) {
    if (!this.isConfigured()) {
      throw new Error(`[${this.name}] Provider is not configured (missing API key).`);
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
      Authorization: `Bearer ${this.apiKey}`,
      'HTTP-Referer': 'https://axly.in',
      'X-Title': 'Axly DSA Tracker'
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

module.exports = OpenAICompatibleProvider;
