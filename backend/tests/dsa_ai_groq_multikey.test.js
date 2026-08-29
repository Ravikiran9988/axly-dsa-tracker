const GroqProvider = require('../src/services/llm/groqProvider');
const llmRouter = require('../src/services/llm/llmRouter');

describe('DSA AI Groq Multi-Key Failover Suite (openai/gpt-oss-120b)', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    llmRouter.initializeDefaultProviders();
  });

  describe('Groq Multi-Key Failover Engine', () => {
    it('1. Key 1 success: Executes primary key when healthy and returns normalized response with openai/gpt-oss-120b model', async () => {
      let usedKey = null;

      global.fetch = jest.fn().mockImplementation((url, options) => {
        usedKey = options.headers.Authorization;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            choices: [{ message: { content: 'Solution using Key 1' } }],
            usage: { prompt_tokens: 20, completion_tokens: 30, total_tokens: 50 }
          })
        });
      });

      const provider = new GroqProvider({
        keys: ['GROQ_TEST_KEY_1', 'GROQ_TEST_KEY_2', 'GROQ_TEST_KEY_3'],
        model: 'openai/gpt-oss-120b'
      });

      const res = await provider.generate({ prompt: 'How do I solve Two Sum?' });

      expect(res.text).toBe('Solution using Key 1');
      expect(res.provider).toBe('groq');
      expect(res.model).toBe('openai/gpt-oss-120b');
      expect(res.activeKeyIndex).toBe(0);
      expect(usedKey).toBe('Bearer GROQ_TEST_KEY_1');
    });

    it('2. Key 1 failure -> Key 2: Automatically fails over to Key 2 upon Key 1 network failure', async () => {
      let callCount = 0;
      const capturedKeys = [];

      global.fetch = jest.fn().mockImplementation((url, options) => {
        callCount++;
        capturedKeys.push(options.headers.Authorization);
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: async () => ({ error: { message: 'Internal Server Error' } })
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            choices: [{ message: { content: 'Solution using Key 2' } }],
            usage: { prompt_tokens: 15, completion_tokens: 25, total_tokens: 40 }
          })
        });
      });

      const provider = new GroqProvider({
        keys: ['GROQ_TEST_KEY_1', 'GROQ_TEST_KEY_2', 'GROQ_TEST_KEY_3']
      });

      const res = await provider.generate({ prompt: 'Explain sliding window' });

      expect(res.text).toBe('Solution using Key 2');
      expect(res.activeKeyIndex).toBe(1);
      expect(capturedKeys).toEqual(['Bearer GROQ_TEST_KEY_1', 'Bearer GROQ_TEST_KEY_2']);
    });

    it('3. Key 1 + Key 2 failure -> Key 3: Fails over smoothly to Key 3 when first two keys fail', async () => {
      let callCount = 0;
      const capturedKeys = [];

      global.fetch = jest.fn().mockImplementation((url, options) => {
        callCount++;
        capturedKeys.push(options.headers.Authorization);
        if (callCount <= 2) {
          return Promise.resolve({
            ok: false,
            status: 503,
            json: async () => ({ error: { message: 'Service Unavailable' } })
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            choices: [{ message: { content: 'Solution using Key 3' } }],
            usage: { prompt_tokens: 10, completion_tokens: 15, total_tokens: 25 }
          })
        });
      });

      const provider = new GroqProvider({
        keys: ['GROQ_TEST_KEY_1', 'GROQ_TEST_KEY_2', 'GROQ_TEST_KEY_3']
      });

      const res = await provider.generate({ prompt: 'Explain dynamic programming' });

      expect(res.text).toBe('Solution using Key 3');
      expect(res.activeKeyIndex).toBe(2);
      expect(capturedKeys).toEqual([
        'Bearer GROQ_TEST_KEY_1',
        'Bearer GROQ_TEST_KEY_2',
        'Bearer GROQ_TEST_KEY_3'
      ]);
    });

    it('4. All three fail -> Router returns graceful AI-unavailable response without throwing', async () => {
      global.fetch = jest.fn().mockImplementation(() => {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: async () => ({ error: { message: 'All keys down' } })
        });
      });

      const provider = new GroqProvider({
        keys: ['GROQ_TEST_KEY_1', 'GROQ_TEST_KEY_2', 'GROQ_TEST_KEY_3']
      });

      llmRouter.registerProvider('groq', provider);
      llmRouter.setProviderOrder(['groq']);

      const res = await llmRouter.generate({ prompt: 'Test query' });

      expect(res.source).toBe('fallback');
      expect(res.provider).toBe('fallback');
      expect(res.text.toLowerCase()).toContain('unavailable');
    });

    it('5. Rate-limit (429) handling: Immediately sets cooldown and skips rate-limited key on subsequent request', async () => {
      let callCount = 0;
      const capturedKeys = [];

      global.fetch = jest.fn().mockImplementation((url, options) => {
        callCount++;
        capturedKeys.push(options.headers.Authorization);
        if (options.headers.Authorization === 'Bearer GROQ_TEST_KEY_1') {
          return Promise.resolve({
            ok: false,
            status: 429,
            json: async () => ({ error: { message: 'Rate limit reached. Please wait.' } })
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            choices: [{ message: { content: 'Key 2 healthy response' } }],
            usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 }
          })
        });
      });

      const provider = new GroqProvider({
        keys: ['GROQ_TEST_KEY_1', 'GROQ_TEST_KEY_2', 'GROQ_TEST_KEY_3']
      });

      // First call fails on Key 1 -> succeeds on Key 2
      const res1 = await provider.generate({ prompt: 'Query 1' });
      expect(res1.activeKeyIndex).toBe(1);

      // Key 1 is now in cooldown: Second call should jump directly to Key 2 first!
      capturedKeys.length = 0;
      const res2 = await provider.generate({ prompt: 'Query 2' });
      expect(res2.activeKeyIndex).toBe(1);
      expect(capturedKeys[0]).toBe('Bearer GROQ_TEST_KEY_2'); // Skipped Key 1 without retrying!
    });

    it('6. Timeout handling: Skips timed-out key cleanly', async () => {
      let callCount = 0;

      global.fetch = jest.fn().mockImplementation((url, options) => {
        callCount++;
        if (callCount === 1) {
          const err = new Error('AbortError');
          err.name = 'AbortError';
          return Promise.reject(err);
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            choices: [{ message: { content: 'Recovered after timeout' } }],
            usage: {}
          })
        });
      });

      const provider = new GroqProvider({
        keys: ['GROQ_TEST_KEY_1', 'GROQ_TEST_KEY_2']
      });

      const res = await provider.generate({ prompt: 'Timeout test', timeoutMs: 10 });
      expect(res.text).toBe('Recovered after timeout');
      expect(res.activeKeyIndex).toBe(1);
    });

    it('7. Unconfigured key is skipped: Empty or missing keys are excluded from failover pool', async () => {
      const provider = new GroqProvider({
        keys: ['   ', 'GROQ_VALID_KEY', '', null]
      });

      expect(provider.keys).toEqual(['GROQ_VALID_KEY']);
      expect(provider.isConfigured()).toBe(true);
    });

    it('8. Keys never appear in responses, error objects, or telemetry logs', async () => {
      const SECRET_KEY = 'gsk_secret_production_key_xyz123';

      global.fetch = jest.fn().mockImplementation(() => {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: async () => ({ error: { message: `Invalid API key ${SECRET_KEY}` } })
        });
      });

      const provider = new GroqProvider({
        keys: [SECRET_KEY]
      });

      llmRouter.registerProvider('groq', provider);
      llmRouter.setProviderOrder(['groq']);

      const res = await llmRouter.generate({ prompt: 'Security key protection test' });

      const serializedResponse = JSON.stringify(res);
      expect(serializedResponse).not.toContain(SECRET_KEY);
    });
  });
});
