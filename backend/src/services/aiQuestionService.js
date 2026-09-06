const llmRouter = require('./llm/llmRouter');

function extractJson(content) {
  const text = typeof content === 'string' ? content.trim() : JSON.stringify(content);
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : (text.match(/\{[\s\S]*\}/)?.[0] || text.match(/\[[\s\S]*\]/)?.[0]);
  if (!candidate) throw new Error('LLM did not return JSON');
  return JSON.parse(candidate);
}

function validateGeneratedQuestion(text, expectedCount) {
  let data;
  try {
    data = extractJson(text);
  } catch (err) {
    return { valid: false, reason: `Invalid JSON: ${err.message}` };
  }

  const question = Array.isArray(data) ? data[0] : data;
  if (!question || typeof question !== 'object') {
    return { valid: false, reason: 'Generated question must be a JSON object' };
  }

  const required = ['title', 'description', 'constraints', 'input_format', 'output_format', 'examples', 'solution_approach', 'test_cases', 'time_limit_ms', 'memory_limit_mb'];
  const missing = required.filter(key => question[key] === undefined || question[key] === null || question[key] === '');
  if (missing.length) {
    return { valid: false, reason: `Generated question is missing: ${missing.join(', ')}` };
  }
  if (!Array.isArray(question.test_cases) || question.test_cases.length !== expectedCount) {
    return { valid: false, reason: `Expected exactly ${expectedCount} test cases, received ${Array.isArray(question.test_cases) ? question.test_cases.length : 0}` };
  }
  if (!question.test_cases.every(tc => tc && typeof tc.input === 'string' && typeof tc.expected_output === 'string' && typeof tc.is_hidden === 'boolean')) {
    return { valid: false, reason: 'Every test case must contain string input, string expected_output, and boolean is_hidden' };
  }

  return { valid: true, candidate: question };
}

async function generateQuestion({ topic, difficulty, count = 8 }) {
  const safeCount = Math.min(Math.max(Number(count) || 8, 1), 12);
  const systemPrompt = 'You generate reliable, original algorithmic programming problems for a production DSA platform. Return strict JSON only. Never return markdown fences or commentary.';
  const prompt = `Create one original, language-independent algorithmic coding problem for Axly DSA Tracker.
Topic: ${topic}
Difficulty: ${difficulty}
Generate exactly ${safeCount} test cases, with at least 2 public and 2 hidden cases.

The problem must be language-agnostic and solvable in Python, JavaScript, TypeScript, Java, C++, and C using standard stdin/stdout.

Return exactly one JSON object with these keys:
title, description, constraints, input_format, output_format, examples, solution_approach, test_cases, time_limit_ms, memory_limit_mb.

test_cases must be an array of exactly ${safeCount} objects shaped as {"input":"...","expected_output":"...","is_hidden":true|false}.
Make every expected output deterministic and internally consistent with the problem. Include edge cases and avoid ambiguous input/output rules.
Do not include a reference solution or executable code in the response.`;

  const result = await llmRouter.generate({
    prompt,
    systemPrompt,
    maxTokens: Math.max(3500, safeCount * 450),
    temperature: 0.2,
    timeoutMs: 30000,
    validateResponse: async (text) => validateGeneratedQuestion(text, safeCount)
  });

  if (!result || result.source === 'fallback' || !result.text) {
    const detail = result?.providerErrors?.map(e => `${e.slot}: ${e.error}`).join(' | ');
    throw Object.assign(new Error(detail || result?.error || 'All configured LLM providers failed to generate a question'), { statusCode: 503 });
  }

  const validation = validateGeneratedQuestion(result.text, safeCount);
  if (!validation.valid) {
    throw Object.assign(new Error(validation.reason), { statusCode: 422 });
  }

  return validation.candidate;
}

module.exports = { generateQuestion };
