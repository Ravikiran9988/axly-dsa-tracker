const GeminiProvider = require('./geminiProvider');
const GroqProvider = require('./groqProvider');
const OpenAICompatibleProvider = require('./openAICompatibleProvider');
const { executeCode } = require('../executionService');

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
 * OpenAI is intentionally not part of the router.
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

    this.providers.set('gemini', new GeminiProvider());
    this.providers.set('groq', new GroqProvider());
    this.providers.set('openrouter', new OpenAICompatibleProvider({ name: 'openrouter' }));
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
    const rawOrder = this.customOrder || ['groq-1', 'gemini-1', 'groq-2', 'gemini-2', 'groq-3'];
    const activeList = [];
    for (const name of rawOrder) {
      const provider = this.providers.get(name);
      if (provider && provider.isConfigured()) activeList.push({ name, provider });
    }
    return activeList;
  }

  buildSandboxDiagnostics(sandbox) {
    if (!sandbox || !Array.isArray(sandbox.results)) return null;

    const failed = sandbox.results
      .filter(result => result && result.status && result.status !== 'Passed')
      .slice(0, 3)
      .map(result => ({
        test_index: result.test_index,
        status: result.status,
        input: String(result.input ?? '').slice(0, 4000),
        expected_output: String(result.expected_output ?? '').slice(0, 2000),
        actual_output: String(result.actual_output ?? '').slice(0, 2000),
        stderr: String(result.stderr ?? '').slice(0, 2000)
      }));

    return {
      total_tests: sandbox.total_tests,
      passed_tests: sandbox.passed_tests,
      failed_tests: sandbox.failed_tests,
      status: sandbox.verified ? 'Accepted' : (sandbox.reason || 'Failed'),
      failed_tests_detail: failed
    };
  }

  async collectSandboxDiagnostics(candidate) {
    try {
      const testCases = Array.isArray(candidate?.test_cases) ? candidate.test_cases : [];
      const codeToRun = candidate?.reference_solution || candidate?.starter_code;
      if (!testCases.length || !codeToRun) return null;

      const fullCode = candidate.driver_code
        ? `${codeToRun}\n\n${candidate.driver_code}`
        : codeToRun;

      const sandbox = await executeCode({
        language: 'javascript',
        sourceCode: fullCode,
        testCases
      });

      return this.buildSandboxDiagnostics({
        ...sandbox,
        verified: sandbox.status === 'Accepted' || sandbox.passed_tests === testCases.length,
        reason: sandbox.status !== 'Accepted' ? `Sandbox execution failed with status: ${sandbox.status}` : null,
        failed_tests: testCases.length - Number(sandbox.passed_tests || 0)
      });
    } catch (err) {
      return {
        total_tests: Array.isArray(candidate?.test_cases) ? candidate.test_cases.length : 0,
        passed_tests: 0,
        failed_tests: Array.isArray(candidate?.test_cases) ? candidate.test_cases.length : 0,
        status: `Sandbox execution failed: ${err.message}`,
        failed_tests_detail: []
      };
    }
  }

  async validateDailyChallengeCandidate(text) {
    let cleaned = String(text || '').trim();
    if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
    else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
    cleaned = cleaned.trim();

    let candidate;
    try {
      candidate = JSON.parse(cleaned);
    } catch (err) {
      return { valid: false, reason: `Invalid JSON: ${err.message}` };
    }

    if (Array.isArray(candidate.test_cases) && candidate.test_cases.length > 1) {
      const hasHidden = candidate.test_cases.some(tc => Boolean(tc?.is_hidden));
      const hasPublic = candidate.test_cases.some(tc => !tc?.is_hidden);
      if (!hasHidden) candidate.test_cases[candidate.test_cases.length - 1].is_hidden = 1;
      if (!hasPublic) candidate.test_cases[0].is_hidden = 0;
    }

    const dailyService = require('../aiDailyChallengeService');
    const validation = dailyService.validateDailyChallenge(candidate);
    if (!validation.isValid) {
      return { valid: false, reason: `Schema validation failed: ${validation.errors.join('; ')}` };
    }

    candidate.title = dailyService.stripVariantIdentifiers(candidate.title);
    candidate.problem_concept = dailyService.extractProblemConcept(candidate.title, candidate.description);
    candidate.problem_signature = dailyService.generateProblemSignature(candidate);

    const duplicate = await dailyService.checkDuplicateChallenge(candidate);
    if (duplicate.isDuplicate) {
      return { valid: false, reason: duplicate.reason || 'Duplicate Daily Challenge candidate' };
    }

    const sandbox = await dailyService.verifyReferenceSolution(candidate);
    if (!sandbox.verified) {
      const diagnostics = this.buildSandboxDiagnostics(sandbox) || await this.collectSandboxDiagnostics(candidate);
      return {
        valid: false,
        reason: sandbox.reason || 'Reference solution failed sandbox verification',
        diagnostics
      };
    }

    candidate.sandbox_verified = true;
    return { valid: true, candidate };
  }

  async repairDailyChallengeCandidate(provider, originalText, failureReason, diagnostics, options) {
    const diagnosticText = diagnostics
      ? JSON.stringify(diagnostics, null, 2)
      : 'No per-test sandbox diagnostics were available.';

    const repairPrompt = `A Daily Challenge candidate you generated failed validation.

Failure reason:
${failureReason}

Sandbox diagnostics:
${diagnosticText}

Original candidate:
${originalText}

Repair the candidate and return ONLY one complete valid JSON object.

CRITICAL RULES:
- Treat the problem statement and its constraints as the source of truth.
- Do NOT assume the original reference solution is correct.
- Do NOT blindly preserve the original expected outputs.
- Re-derive the expected output for every test case independently from the stated problem.
- If the test inputs are invalid, ambiguous, or expose a flawed problem definition, correct the problem, test cases, reference solution, driver, examples, and expected outputs together.
- The reference_solution MUST correctly solve the stated problem, not merely reproduce the supplied expected outputs.
- The driver_code, input_format, output_format, test_cases, examples, and reference_solution MUST agree exactly.
- Use executable JavaScript compatible with the provided driver.
- Fix the specific failing tests shown in the diagnostics and consider edge cases beyond them.
- Keep the same concept when it is sound; rebuild the candidate when the original formulation is inconsistent.
- Return exactly one complete JSON object.
- No markdown fences, explanations, or commentary.
- The final candidate MUST pass sandbox verification on every test case.

Return the complete corrected challenge JSON.`;

    console.warn(`[LLMRouter] Attempting one repair for candidate from ${provider.name}: ${failureReason}`);

    const response = await provider.generate({
      prompt: repairPrompt,
      systemPrompt: options.systemPrompt,
      maxTokens: Math.max(Number(options.maxTokens) || 0, 2800),
      temperature: 0.1,
      timeoutMs: options.timeoutMs
    });

    if (!response || !response.text || !response.text.trim()) {
      throw new Error('Repair attempt returned an empty completion');
    }

    return response.text.trim();
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

    const isDailyChallenge = systemPrompt && /Principal DSA Problem Author/i.test(systemPrompt);
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
          const failureReason = validationResult.reason || 'Response rejected by semantic validator';

          errors.push({
            slot: slotName,
            provider: provider.name,
            error: failureReason,
            stage: 'validation'
          });
          console.warn(`[LLMRouter] Rejected ${slotName} candidate: ${failureReason}`);

          if (isDailyChallenge && typeof validateResponse !== 'function') {
            try {
              const repairedText = await this.repairDailyChallengeCandidate(
                provider,
                response.text,
                failureReason,
                validationResult.diagnostics,
                { systemPrompt, maxTokens, timeoutMs }
              );
              const repairedValidation = await this.validateDailyChallengeCandidate(repairedText);

              if (repairedValidation && repairedValidation.valid !== false) {
                console.log(`[LLMRouter] Repaired ${slotName} candidate successfully`);
                return {
                  text: repairedText,
                  source: 'llm',
                  provider: response.provider || provider.name,
                  model: response.model || provider.model,
                  usage: response.usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
                  attemptsCount: i + 1,
                  fallbackSlot: slotName,
                  repairAttempted: true,
                  validation: repairedValidation.candidate ? { verified: true } : undefined
                };
              }

              const repairFailure = repairedValidation?.reason || 'Repair candidate failed validation';
              errors.push({
                slot: slotName,
                provider: provider.name,
                error: `Repair failed: ${repairFailure}`,
                stage: 'repair'
              });
              console.warn(`[LLMRouter] Repair rejected for ${slotName}: ${repairFailure}`);
            } catch (repairErr) {
              const repairMessage = String(repairErr.message || 'Repair request failed')
                .replace(/key=[^&\s]+/gi, 'key=***')
                .replace(/Bearer\s+[^\s]+/gi, 'Bearer ***');
              errors.push({
                slot: slotName,
                provider: provider.name,
                error: `Repair request failed: ${repairMessage}`,
                stage: 'repair'
              });
              console.warn(`[LLMRouter] Repair request failed for ${slotName}: ${repairMessage}`);
            }
          }

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
          validation: validationResult && validationResult.candidate ? { verified: true } : undefined
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
