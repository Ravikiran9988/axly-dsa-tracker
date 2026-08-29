/**
 * Base abstract class for LLM Providers
 */
class BaseLLMProvider {
  /**
   * @param {object} config
   * @param {string} config.name - Identifier (e.g. 'gemini', 'groq', 'openrouter')
   * @param {string} config.apiKey - Secret API key
   * @param {string} [config.model] - Model name
   * @param {string} [config.baseUrl] - Base API URL
   */
  constructor(config = {}) {
    this.name = config.name || 'unnamed-provider';
    this.apiKey = config.apiKey || null;
    this.model = config.model || 'default-model';
    this.baseUrl = config.baseUrl || null;
  }

  /**
   * Check if provider is configured with required credentials
   * @returns {boolean}
   */
  isConfigured() {
    return Boolean(this.apiKey && String(this.apiKey).trim().length > 0);
  }

  /**
   * Generate text completion from LLM provider
   * @param {object} options
   * @param {string} options.prompt - The main user/system prompt
   * @param {string} [options.systemPrompt] - System instructions
   * @param {number} [options.maxTokens] - Max tokens to return
   * @param {number} [options.temperature] - Sampling temperature
   * @param {number} [options.timeoutMs] - Request timeout in milliseconds
   * @returns {Promise<{ text: string, provider: string, model: string, usage: { promptTokens: number, completionTokens: number, totalTokens: number } }>}
   */
  async generate(options) {
    throw new Error(`generate() method must be implemented by subclass ${this.constructor.name}`);
  }

  /**
   * Standardized helper to build HTTP post request with timeout
   */
  async fetchWithTimeout(url, payload, headers = {}, timeoutMs = 8000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMessage = data?.error?.message || data?.message || `HTTP ${response.status} ${response.statusText}`;
        const error = new Error(`[${this.name}] API error (${response.status}): ${errorMessage}`);
        error.status = response.status;
        error.provider = this.name;
        error.isQuotaOrRateLimit = response.status === 429 || response.status === 402 || /quota|rate\s*limit|credit/i.test(errorMessage);
        throw error;
      }

      return data;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError' || err.code === 'ECONNABORTED') {
        const timeoutErr = new Error(`[${this.name}] Request timed out after ${timeoutMs}ms`);
        timeoutErr.isTimeout = true;
        timeoutErr.provider = this.name;
        throw timeoutErr;
      }
      err.provider = this.name;
      throw err;
    }
  }
}

module.exports = BaseLLMProvider;
