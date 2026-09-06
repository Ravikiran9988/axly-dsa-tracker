const llmRouter = require('./llm/llmRouter');
const dailyChallengeService = require('./aiDailyChallengeService');

function parseJson(text) {
  let cleaned = String(text || '').trim();
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
  return JSON.parse(cleaned.trim());
}

function challengeContext(input = {}) {
  return {
    title: String(input.title || '').trim(),
    description: String(input.description || input.problem_statement || '').trim(),
    constraints: String(input.constraints || '').trim(),
    input_format: String(input.input_format || '').trim(),
    output_format: String(input.output_format || '').trim(),
    topic: String(input.topic_name || input.topic || '').trim(),
    pattern: String(input.pattern_name || input.pattern || '').trim(),
    difficulty: String(input.difficulty || 'medium').trim(),
    starter_code: input.starter_code || '',
    solution_approach: String(input.solution_approach || input.editorial || '').trim(),
    complexity: String(input.complexity || '').trim(),
    examples: Array.isArray(input.examples) ? input.examples : []
  };
}

async function generateTestCases(input = {}) {
  const c = challengeContext(input);
  if (!c.title || !c.description) throw new Error('Challenge title and problem statement are required before generating test cases.');

  const systemPrompt = `You are a senior competitive-programming test engineer. Generate ONLY valid JSON for test cases. Never invent a different problem. Every expected output must be correct for the supplied problem. Include normal, boundary, and adversarial cases. Keep inputs compact enough for a code runner.`;
  const prompt = `Create exactly 4 test cases for this Daily Challenge. Return JSON only in this exact shape: {"test_cases":[{"input":"...","expected_output":"...","is_hidden":false},{"input":"...","expected_output":"...","is_hidden":false},{"input":"...","expected_output":"...","is_hidden":true},{"input":"...","expected_output":"...","is_hidden":true}]}. Use exactly 2 public and 2 hidden cases. Do not duplicate inputs.\n\nChallenge:\n${JSON.stringify(c)}`;

  const result = await llmRouter.generate({
    prompt,
    systemPrompt,
    maxTokens: 1200,
    temperature: 0.1,
    validateResponse: async (text) => {
      let data;
      try { data = parseJson(text); } catch (err) { return { valid: false, reason: `Invalid JSON: ${err.message}` }; }
      const cases = Array.isArray(data?.test_cases) ? data.test_cases : [];
      if (cases.length !== 4) return { valid: false, reason: 'Exactly 4 test cases are required.' };
      if (cases.filter(tc => tc && tc.is_hidden === true).length !== 2) return { valid: false, reason: 'Exactly 2 hidden test cases are required.' };
      if (cases.some(tc => typeof tc?.input !== 'string' || !tc.input.trim() || typeof tc?.expected_output !== 'string' || !tc.expected_output.trim())) {
        return { valid: false, reason: 'Every test case needs non-empty string input and expected_output.' };
      }
      const unique = new Set(cases.map(tc => tc.input.trim()));
      if (unique.size !== cases.length) return { valid: false, reason: 'Test case inputs must be unique.' };

      const candidate = { ...input, test_cases: cases };
      const validation = dailyChallengeService.validateDailyChallenge(candidate);
      if (!validation.isValid) return { valid: false, reason: validation.errors.join('; ') };
      const sandbox = await dailyChallengeService.verifyReferenceSolution(candidate);
      if (!sandbox.verified) return { valid: false, reason: sandbox.reason || 'Reference solution failed generated test cases.' };
      return { valid: true, candidate: { test_cases: cases } };
    }
  });

  const data = parseJson(result.text);
  return { test_cases: data.test_cases, provider: result.provider, model: result.model };
}

async function generateHints(input = {}) {
  const c = challengeContext(input);
  if (!c.title || !c.description) throw new Error('Challenge title and problem statement are required before generating hints.');

  const systemPrompt = `You are a DSA coach writing progressive hints. Return ONLY valid JSON. Hints must guide reasoning without revealing the final algorithm, code, exact implementation, or final answer. Hint 1 should be an observation, Hint 2 should suggest a useful technique/data structure, and Hint 3 should give a stronger directional nudge while still requiring the learner to finish the solution.`;
  const prompt = `Generate exactly 3 progressive hints for this Daily Challenge. Return JSON only in this exact shape: {"hints":["hint 1","hint 2","hint 3"]}. Do not mention a complete solution, code, final answer, or complexity. Do not make hints generic; tie them directly to the problem.\n\nChallenge:\n${JSON.stringify(c)}`;

  const result = await llmRouter.generate({
    prompt,
    systemPrompt,
    maxTokens: 650,
    temperature: 0.2,
    validateResponse: async (text) => {
      let data;
      try { data = parseJson(text); } catch (err) { return { valid: false, reason: `Invalid JSON: ${err.message}` }; }
      const hints = Array.isArray(data?.hints) ? data.hints.map(h => String(h || '').trim()) : [];
      if (hints.length !== 3 || hints.some(h => h.length < 12)) return { valid: false, reason: 'Exactly 3 meaningful hints are required.' };
      const joined = hints.join(' ').toLowerCase();
      if (/```|return\s+\w+\s*\(|final answer|complete solution|full code|the answer is/.test(joined)) {
        return { valid: false, reason: 'Hints reveal too much of the solution.' };
      }
      return { valid: true, candidate: { hints } };
    }
  });

  const data = parseJson(result.text);
  return { hints: data.hints, provider: result.provider, model: result.model };
}

module.exports = { generateTestCases, generateHints };
