const llmRouter = require('./llm/llmRouter');
const { executeCode } = require('./executionService');

function extractJson(content) {
  try {
    const text = typeof content === 'string' ? content.trim() : JSON.stringify(content);
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fenced ? fenced[1].trim() : (text.match(/\{[\s\S]*\}/)?.[0] || text.match(/\[[\s\S]*\]/)?.[0]);
    if (!candidate) throw new Error('LLM did not return JSON');
    return JSON.parse(candidate);
  } catch (err) {
    throw new Error(`INVALID_GENERATION: ${err.message}`);
  }
}

async function validateGeneratedQuestionAsync(text, expectedCount, context = {}) {
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

  if (context.title) {
    const normalizeStr = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const reqTitle = normalizeStr(context.title);
    const genTitle = normalizeStr(question.title);
    if (!genTitle.includes(reqTitle) && !reqTitle.includes(genTitle)) {
      return { valid: false, reason: `INVALID_GENERATION: Conflicting problem definition. Expected title resembling '${context.title}', but generated '${question.title}'` };
    }
  }

  const required = ['title', 'difficulty', 'description', 'constraints', 'input_format', 'output_format', 'examples', 'solution_approach', 'complexity', 'test_cases', 'time_limit_ms', 'memory_limit_mb', 'function_signature', 'starter_code', 'reference_solution'];
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
  if (!question.starter_code || typeof question.starter_code !== 'object' || !question.starter_code.javascript || !question.starter_code.python) {
    return { valid: false, reason: 'starter_code must be an object containing at least javascript and python keys' };
  }
  if (!question.function_signature || typeof question.function_signature !== 'object' || !question.function_signature.name) {
    return { valid: false, reason: 'function_signature must be an object containing at least a name string' };
  }

  const normalize = (s) => String(s || '').replace(/_/g, '').toLowerCase();
  const normalizedName = normalize(question.function_signature.name);

  const languages = ['javascript', 'typescript', 'python', 'java', 'cpp', 'c'];
  for (const lang of languages) {
    if (typeof question.starter_code[lang] !== 'string' || !question.starter_code[lang].trim()) {
      return { valid: false, reason: `starter_code is missing or invalid for language: ${lang}` };
    }
    // Signature matching check (normalized to handle snake_case vs camelCase)
    if (!normalize(question.starter_code[lang]).includes(normalizedName)) {
      return { valid: false, reason: `starter_code for ${lang} does not contain the function signature name '${question.function_signature.name}'` };
    }
  }

  if (!question.reference_solution || typeof question.reference_solution.python !== 'string' || !question.reference_solution.python.trim()) {
    return { valid: false, reason: 'reference_solution must be an object containing a valid python solution' };
  }
  
  if (!normalize(question.reference_solution.python).includes(normalizedName)) {
    return { valid: false, reason: `reference_solution for python does not contain the function signature name '${question.function_signature.name}'` };
  }

  // Leak check: ensure starter_code does not accidentally contain the complete reference solution
  const refLines = question.reference_solution.python.split('\n');
  let inDef = false;
  let bodyLines = [];
  for (const line of refLines) {
    if (line.trim().startsWith('def ')) {
      inDef = true;
      continue;
    }
    if (inDef) {
      if (line.trim() === '' || line.startsWith(' ') || line.startsWith('\t')) {
        bodyLines.push(line);
      } else if (!line.trim().startsWith('#')) {
        inDef = false;
      }
    }
  }
  
  const refBody = bodyLines.join('\n').trim();
  const strippedRefBody = refBody.replace(/[\s\n\r#]/g, '');
  
  if (strippedRefBody.length > 15) {
    const leakPattern = strippedRefBody.substring(0, Math.min(30, strippedRefBody.length));
    for (const lang of languages) {
      const strippedStarter = question.starter_code[lang].replace(/[\s\n\r#\/]/g, '');
      if (strippedStarter.includes(leakPattern)) {
        return { valid: false, reason: `INVALID_GENERATION: Solution leakage detected in ${lang} starter code` };
      }
    }
  }

  // Sandbox Verification
  try {
    const combinedTestCases = [...question.test_cases];
    if (Array.isArray(question.examples)) {
      for (const ex of question.examples) {
        if (ex.input && ex.output) {
          combinedTestCases.push({ input: ex.input, expected_output: ex.output, is_hidden: false });
        }
      }
    }

    const sandboxResult = await executeCode({
      language: 'python',
      sourceCode: question.reference_solution.python,
      testCases: combinedTestCases,
      isSubmit: false
    });
    
    if (sandboxResult.status !== 'Accepted') {
      return { valid: false, reason: `INVALID_GENERATION: Sandbox verification failed: Reference solution resulted in ${sandboxResult.status}` };
    }
  } catch (err) {
    return { valid: false, reason: `INVALID_GENERATION: Sandbox verification error: ${err.message}` };
  }

  return { valid: true, candidate: question };
}

async function generateQuestion({ title, description, constraints, topic, difficulty, count = 8, pattern, exclusionText, instructions }) {
  const safeCount = Math.min(Math.max(Number(count) || 8, 1), 12);
  const systemPrompt = 'You generate reliable, original algorithmic programming problems for a production DSA platform. Return strict JSON only. Never return markdown fences or commentary.';
  
  let prompt = `Create one original, language-independent algorithmic coding problem for Axly DSA Tracker.
Topic: ${topic}
Difficulty: ${difficulty}`;

  if (title) prompt += `\\nTitle: ${title}\\nCRITICAL INSTRUCTION: You MUST generate the problem for EXACTLY this Title. Do NOT invent a different problem.`;
  if (description) prompt += `\\nProblem Statement: ${description}`;
  if (constraints) prompt += `\\nConstraints: ${constraints}\\nCRITICAL INSTRUCTION: Ensure the constraints exactly match these provided constraints.`;

  if (pattern) prompt += `\\nPattern: ${pattern}`;
  if (exclusionText) prompt += `\\n\\nCRITICAL UNIQUENESS INSTRUCTIONS:\\n- The generated problem MUST be materially and conceptually different from every problem in the exclusion list unless you are explicitly given a Title that matches.\\n- Do NOT create variants of existing problems by changing numbers, variable names, constraints, examples, or adding a Variant ID.\\n- The underlying algorithmic task and data structures must be genuinely distinct.${exclusionText}`;
  if (instructions) prompt += `\\n\\nExtra Instructions: ${instructions}`;

  prompt += `\\n\\nGenerate exactly ${safeCount} test cases, with at least 2 public and 2 hidden cases.

The problem must be language-agnostic and solvable in Python, JavaScript, TypeScript, Java, C++, and C using standard stdin/stdout.

Return exactly one JSON object with these keys:
title, difficulty, description, constraints, input_format, output_format, examples, solution_approach, complexity, test_cases, time_limit_ms, memory_limit_mb, function_signature, starter_code, reference_solution, hints.

function_signature MUST be an object shaped as {"name": "...", "params": [{"name": "...", "type": "..."}], "return_type": "..."}.
starter_code MUST be a dictionary containing exactly these keys: javascript, typescript, python, java, cpp, c.
For EACH language, provide the complete executable boilerplate that reads standard input (stdin), parses it, calls the function defined in function_signature, and prints to standard output (stdout).
The starter code MUST:
- match the exact function signature and expected input/output contract
- be syntactically valid and problem-specific
- contain ONLY the function signature and a dummy return (e.g., 'return null', 'return 0', or 'pass')
- STRICTLY FORBIDDEN: Do NOT implement the algorithm logic in the starter code. Do NOT provide solution-specific pseudocode.
- NOT contain the completed solution or hidden test cases.
reference_solution MUST be a dictionary containing at least a 'python' key with the full working code. The reference solution and starter code MUST use the same function signature and input/output contract. Do NOT expose the reference solution in the starter code.

test_cases must be an array of exactly ${safeCount} objects shaped as {"input":"...","expected_output":"...","is_hidden":true|false}.
Make every expected output deterministic and internally consistent with the problem. Include edge cases and avoid ambiguous input/output rules.`;

  const result = await llmRouter.generate({
    prompt,
    systemPrompt,
    maxTokens: Math.max(3500, safeCount * 450),
    temperature: 0.2,
    timeoutMs: 30000,
    validateResponse: async (text) => validateGeneratedQuestionAsync(text, safeCount, { title })
  });

  if (!result || (!result.text && result.source !== 'fallback')) {
    const detail = result?.providerErrors?.map(e => `${e.slot}: ${e.error}`).join(' | ');
    throw Object.assign(new Error(detail || result?.error || 'All configured LLM providers failed to generate a question'), { statusCode: 503 });
  }

  let textToValidate = result.text || '';

  if (result.source === 'fallback') {
    const fallbackTemplates = require('./fallbackTemplates');
    const template = fallbackTemplates.getTemplate(topic, difficulty);
    if (!template) {
       throw Object.assign(new Error('All configured LLM providers failed and no valid fallback template exists for this topic/difficulty'), { statusCode: 503 });
    }
    // We treat the template as a generated JSON string so it goes through the EXACT same validation
    textToValidate = JSON.stringify(template);
  }

  const validation = await validateGeneratedQuestionAsync(textToValidate, safeCount);
  if (!validation.valid) {
    throw Object.assign(new Error(validation.reason), { statusCode: 422 });
  }

  return validation.candidate;
}

module.exports = { generateQuestion, validateGeneratedQuestionAsync };
