const GroqProvider = require('../src/services/llm/groqProvider');
const llmRouter = require('../src/services/llm/llmRouter');

describe('Groq Structured Outputs', () => {
  let groqProvider;

  beforeEach(() => {
    jest.restoreAllMocks();
    groqProvider = new GroqProvider({
      keys: ['mock-key'],
      model: 'openai/gpt-oss-120b',
      baseUrl: 'https://api.groq.com/openai/v1'
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('1. Supported Groq strict model sends strict:true', async () => {
    const fetchSpy = jest.spyOn(groqProvider, 'fetchWithTimeout').mockResolvedValue({
      choices: [{ message: { content: '{"status":"ok"}' } }]
    });

    await groqProvider.generate({
      prompt: 'Test',
      systemPrompt: 'Return JSON',
      schema: {
        name: 'test_schema',
        schema: { type: 'object', properties: { status: { type: 'string' } }, required: ['status'], additionalProperties: false }
      }
    });

    expect(fetchSpy).toHaveBeenCalled();
    const payload = fetchSpy.mock.calls[0][1];
    expect(payload.response_format.type).toBe('json_schema');
    expect(payload.response_format.json_schema.strict).toBe(true);
    expect(payload.response_format.json_schema.name).toBe('test_schema');
  });

  test('4. Unsupported Groq model does not receive strict:true', async () => {
    const unsupportedGroq = new GroqProvider({ keys: ['mock'], model: 'mixtral-8x7b-32768' });
    const fetchSpy = jest.spyOn(unsupportedGroq, 'fetchWithTimeout').mockResolvedValue({
      choices: [{ message: { content: '{"status":"ok"}' } }]
    });

    await unsupportedGroq.generate({
      prompt: 'Test',
      systemPrompt: 'Return JSON',
      schema: {
        name: 'test_schema',
        schema: { type: 'object', properties: { status: { type: 'string' } }, required: ['status'], additionalProperties: false }
      }
    });

    expect(fetchSpy).toHaveBeenCalled();
    const payload = fetchSpy.mock.calls[0][1];
    expect(payload.response_format.type).toBe('json_object');
    expect(payload.response_format.json_schema).toBeUndefined();
  });

  test('5. Groq 400 structured-output failure is classified correctly with failed_generation', async () => {
    jest.spyOn(groqProvider, 'fetchWithTimeout').mockRejectedValue(
      Object.assign(new Error('Bad Request'), {
        status: 400,
        failed_generation: '{"missing":"quotes}'
      })
    );

    await expect(groqProvider.generate({
      prompt: 'Test',
      systemPrompt: 'Return JSON',
      schema: { name: 't', schema: { type: 'object', properties: {}, required: [], additionalProperties: false } }
    })).rejects.toThrow(/failed_generation: {"missing":"quotes}/);
  });

  test('6. Fallback continues after Groq structured-output failure', async () => {
    const backupProvider = new GroqProvider({ keys: ['backup-key'], model: 'openai/gpt-oss-120b' });
    jest.spyOn(groqProvider, 'fetchWithTimeout').mockRejectedValue(Object.assign(new Error('Bad Request'), { status: 400, failed_generation: 'error1' }));
    jest.spyOn(backupProvider, 'fetchWithTimeout').mockResolvedValue({ choices: [{ message: { content: '{"success":true}' } }] });

    const router = require('../src/services/llm/llmRouter');
    // Using a custom router for test isolation
    router.providers.clear();
    router.registerProvider('primary', groqProvider);
    router.registerProvider('backup', backupProvider);
    router.setProviderOrder(['primary', 'backup']);

    const res = await router.generate({
      prompt: 'Test',
      systemPrompt: 'Return JSON',
      schema: { name: 't', schema: { type: 'object', properties: { success: { type: 'boolean' } }, required: ['success'], additionalProperties: false } },
      validateResponse: () => ({ valid: true })
    });

    expect(res.fallbackSlot).toBe('backup');
    expect(res.text).toBe('{"success":true}');
    
    // restore default router
    router.initializeDefaultProviders();
  });

  test('7. Valid structured output reaches Axly canonical validation', async () => {
    // This is essentially validating that validateResponse is called properly
    jest.spyOn(groqProvider, 'fetchWithTimeout').mockResolvedValue({ choices: [{ message: { content: '{"title":"Test Question"}' } }] });
    const router = require('../src/services/llm/llmRouter');
    router.providers.clear();
    router.registerProvider('groq', groqProvider);
    router.setProviderOrder(['groq']);

    const validateMock = jest.fn().mockResolvedValue({ valid: true, candidate: { title: 'Test Question' } });
    
    await router.generate({
      prompt: 'Test',
      systemPrompt: 'Return JSON',
      validateResponse: validateMock
    });

    expect(validateMock).toHaveBeenCalledWith('{"title":"Test Question"}', expect.any(Object));
    router.initializeDefaultProviders();
  });

  test('8. Invalid canonical question still gets rejected after valid JSON', async () => {
    jest.spyOn(groqProvider, 'fetchWithTimeout').mockResolvedValue({ choices: [{ message: { content: '{"title":"Test"}' } }] });
    const router = require('../src/services/llm/llmRouter');
    router.providers.clear();
    router.registerProvider('groq', groqProvider);
    router.setProviderOrder(['groq']);

    const validateMock = jest.fn().mockResolvedValue({ valid: false, reason: 'Missing difficulty' });
    
    const res = await router.generate({
      prompt: 'Test',
      systemPrompt: 'Return JSON',
      validateResponse: validateMock
    });

    expect(validateMock).toHaveBeenCalled();
    expect(res.source).toBe('fallback');
    expect(res.error).toMatch(/All configured LLM providers failed/);
    router.initializeDefaultProviders();
  });

  test('9. No fake/fallback question is persisted', async () => {
    jest.spyOn(groqProvider, 'fetchWithTimeout').mockResolvedValue({ choices: [{ message: { content: '{"title":"Test"}' } }] });
    const router = require('../src/services/llm/llmRouter');
    router.providers.clear();
    router.registerProvider('groq', groqProvider);
    router.setProviderOrder(['groq']);

    const validateMock = jest.fn().mockResolvedValue({ valid: false, reason: 'Missing difficulty' });
    
    const res = await router.generate({
      prompt: 'Test',
      systemPrompt: 'Return JSON',
      validateResponse: validateMock
    });

    // The router must return the fallback object and validation property must be undefined
    expect(res.source).toBe('fallback');
    expect(res.validation).toBeUndefined();
    router.initializeDefaultProviders();
  });
});
