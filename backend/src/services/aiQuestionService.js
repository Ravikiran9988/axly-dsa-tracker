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

async function generateContract({ title, topic, pattern, difficulty, description, constraints, exclusionText, instructions }) {
  const prompt = `Create the canonical problem contract for an original algorithmic coding problem for Axly DSA Tracker.
Topic: ${topic || 'General'}
Pattern: ${pattern || 'Appropriate for topic'}
Difficulty: ${difficulty || 'medium'}
${title ? `\nTitle: ${title}\nCRITICAL INSTRUCTION: You MUST generate the problem for EXACTLY this Title. Do NOT invent a different problem.` : ''}
${description ? `\nProblem Statement Constraints: ${description}` : ''}
${constraints ? `\nConstraint rules: ${constraints}\nCRITICAL INSTRUCTION: Ensure the constraints exactly match these provided constraints.` : ''}
${exclusionText ? `\n\nCRITICAL UNIQUENESS INSTRUCTIONS:\n- The generated problem MUST be materially and conceptually different from every problem in the exclusion list unless you are explicitly given a Title that matches.\n- Do NOT create variants of existing problems by changing numbers, variable names, constraints, examples, or adding a Variant ID.\n- The underlying algorithmic task and data structures must be genuinely distinct.${exclusionText}` : ''}
${instructions ? `\n\nExtra Instructions: ${instructions}` : ''}

Return exactly one JSON object with these keys:
title, difficulty, description, constraints, input_format, output_format, examples, time_limit_ms, memory_limit_mb, function_signature.

examples MUST be an array of objects shaped as {"input": "...", "output": "...", "explanation": "..."}.
function_signature MUST be an object shaped as {"name": "...", "params": [{"name": "...", "type": "..."}], "return_type": "..."}.
Ensure constraints semantically match the title (e.g., if it's a binary array problem, explicitly state elements are 0 or 1).
Ensure input/output format descriptions explicitly describe the data types and match the examples.`;

  const result = await llmRouter.generate({
    prompt,
    systemPrompt: 'You generate reliable, original algorithmic programming problem definitions. Return strict JSON only. Never return markdown fences or commentary.',
    maxTokens: 1500,
    temperature: 0.2
  });

  if (!result || !result.text) throw new Error('Failed to generate problem contract.');
  
  const data = extractJson(result.text);
  if (!data.title || !data.description || !data.constraints || !data.function_signature) {
    throw new Error('INVALID_STRUCTURE: Contract missing required fields');
  }
  
  if (title) {
    const normalizeStr = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!normalizeStr(data.title).includes(normalizeStr(title)) && !normalizeStr(title).includes(normalizeStr(data.title))) {
      throw new Error(`INVALID_SEMANTICS: Title mismatch. Expected resembling '${title}', but got '${data.title}'`);
    }
  }

  return data;
}

async function generateTestCasesForContract(contract, count) {
  const prompt = `Create exactly ${count} test cases for this algorithmic problem. 
Return JSON only in this exact shape: {"test_cases":[{"input":"...","expected_output":"...","is_hidden":false}]}.
Use exactly 2 public cases (is_hidden: false) and the rest hidden cases (is_hidden: true).
Do not duplicate inputs.
Make every expected output deterministic and internally consistent with the problem. Include edge cases (e.g., minimum size, zeros, alternating, large inputs) based on the constraints.
CRITICAL: The "input" and "expected_output" MUST be non-empty strings. If the answer is an empty array or empty string, represent it as "[]" or "''" rather than an empty string "".

Problem Contract:
${JSON.stringify({
  title: contract.title,
  description: contract.description,
  constraints: contract.constraints,
  input_format: contract.input_format,
  output_format: contract.output_format
}, null, 2)}`;

  const result = await llmRouter.generate({
    prompt,
    systemPrompt: 'You are a senior competitive-programming test engineer. Generate ONLY valid JSON for test cases. Do not execute code or mention sandbox verification.',
    maxTokens: 1500,
    temperature: 0.1
  });

  if (!result || !result.text) throw new Error('Failed to generate test cases.');
  const data = extractJson(result.text);
  if (!data.test_cases || data.test_cases.length !== count) {
    throw new Error('INVALID_STRUCTURE: Test cases generation failed or returned wrong count.');
  }
  
  for (const tc of data.test_cases) {
    if (typeof tc.input === 'object') tc.input = JSON.stringify(tc.input);
    else tc.input = String(tc.input);
    if (typeof tc.expected_output === 'object') tc.expected_output = JSON.stringify(tc.expected_output);
    else tc.expected_output = String(tc.expected_output);
  }

  return data.test_cases;
}

async function generateSolutionsForContract(contract) {
  const prompt = `Generate the reference solution and starter code for this algorithmic problem.
Return JSON only in this exact shape:
{
  "starter_code": { "javascript": "...", "typescript": "...", "python": "...", "java": "...", "cpp": "...", "c": "..." },
  "reference_solution": { "python": "..." },
  "solution_approach": "...",
  "complexity": "..."
}

For EACH language in starter_code, provide the complete executable boilerplate that reads standard input (stdin), parses it based on the input_format, calls the function defined in function_signature, and prints to standard output (stdout) based on output_format.
The starter code MUST:
- match the exact function signature: ${JSON.stringify(contract.function_signature)}
- contain ONLY the function signature and a dummy return (e.g., 'return null', 'return 0', or 'pass') inside the function body.
- NEVER implement the algorithm logic in the starter code.

The reference_solution.python MUST be the complete working python code that solves the problem AND includes the EXACT same driver code (reading from stdin and printing to stdout) as the python starter_code. It will be run in a sandbox against test cases. It MUST handle all edge cases described in constraints: ${contract.constraints}.

Problem Contract:
${JSON.stringify({ 
  title: contract.title,
  description: contract.description,
  input_format: contract.input_format,
  output_format: contract.output_format,
  examples: contract.examples 
}, null, 2)}`;

  const result = await llmRouter.generate({
    prompt,
    systemPrompt: 'You are an expert algorithm developer. Generate clean, bug-free reference solutions and starter code templates. Return strict JSON only.',
    maxTokens: 2500,
    temperature: 0.1
  });
  
  if (!result || !result.text) throw new Error('Failed to generate solutions.');
  const data = extractJson(result.text);
  if (!data.starter_code || !data.starter_code.javascript || !data.starter_code.python || !data.reference_solution || !data.reference_solution.python) {
    throw new Error('INVALID_STRUCTURE: Missing starter code or reference solution');
  }
  return data;
}

async function verifyAndFixSolution(contract, testCases, solutions, maxRetries = 3) {
  let currentPythonSolution = solutions.reference_solution.python;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const unhiddenTestCases = testCases.map(tc => ({ ...tc, is_hidden: false }));
    let execResult;
    try {
       execResult = await executeCode({
        language: 'python',
        sourceCode: currentPythonSolution,
        testCases: unhiddenTestCases,
        isSubmit: false
      });
    } catch (err) {
      throw new Error(`SANDBOX_ERROR: Execution service failed: ${err.message}`);
    }

    if (execResult.status === 'Accepted') {
      solutions.reference_solution.python = currentPythonSolution;
      return solutions;
    }
    
    const failingTest = execResult.results.find(r => r.status !== 'Passed');
    
    if (attempt === maxRetries) {
      const errorMsg = failingTest 
        ? `${failingTest.status} on test index ${failingTest.test_index}. Input: ${failingTest.input}, Expected: ${failingTest.expected_output}, Actual: ${failingTest.actual_output}, Stderr: ${failingTest.stderr || 'None'}`
        : execResult.status;
      const statusCode = execResult.status === 'Runtime Error' ? 'SANDBOX_RUNTIME_ERROR' : 'SANDBOX_WRONG_ANSWER';
      throw new Error(`${statusCode}: Reference solution failed verification after ${maxRetries} attempts. Reason: ${errorMsg}`);
    }
    
    const retryPrompt = `Your previous reference solution failed sandbox verification.
Status: ${execResult.status}
Passed tests: ${execResult.passed_tests}/${execResult.total_tests}

${failingTest ? `First failing test case details:
Test Index: ${failingTest.test_index}
Status: ${failingTest.status}
Input: ${failingTest.input}
Expected Output: ${failingTest.expected_output}
Actual Output: ${failingTest.actual_output}
Stderr: ${failingTest.stderr || 'None'}
` : ''}

Current buggy Python code:
\`\`\`python
${currentPythonSolution}
\`\`\`

Problem Contract:
${JSON.stringify({
  title: contract.title,
  description: contract.description,
  constraints: contract.constraints,
  input_format: contract.input_format,
  output_format: contract.output_format
}, null, 2)}

Fix ONLY the Python implementation while preserving the exact problem contract.
Return JSON only in this exact shape: {"fixed_python_code": "..."}
`;

    const retryResult = await llmRouter.generate({
      prompt: retryPrompt,
      systemPrompt: 'You are an expert algorithm developer fixing buggy code. Return strict JSON only containing the fixed Python code.',
      maxTokens: 1500,
      temperature: 0.1
    });

    try {
      const fixedData = extractJson(retryResult.text);
      if (fixedData.fixed_python_code) {
        currentPythonSolution = fixedData.fixed_python_code;
      } else {
        throw new Error('No fixed_python_code provided');
      }
    } catch (err) {
      throw new Error(`INVALID_STRUCTURE: Failed to parse fixed solution: ${err.message}`);
    }
  }
}

async function generateHintsForContract(contract) {
  const prompt = `Generate exactly 3 progressive hints for this algorithmic problem.
Hint 1 = conceptual direction. Hint 2 = algorithmic idea. Hint 3 = implementation-level guidance.
Return JSON only in this exact shape: {"hints":["...","...","..."]}.
Do not reveal complete code, exact final solution, full pseudocode, or answer directly.

Problem Contract:
${JSON.stringify({ title: contract.title, description: contract.description }, null, 2)}`;

  let lastErr;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const result = await llmRouter.generate({
        prompt,
        systemPrompt: 'You are a DSA coach. Return ONLY valid JSON. Hints must guide reasoning without revealing the final algorithm or code.',
        maxTokens: 500,
        temperature: 0.2
      });
      
      const data = extractJson(result.text);
      if (!data.hints || data.hints.length !== 3) throw new Error('Need exactly 3 hints');
      const joined = data.hints.join(' ').toLowerCase();
      if (/return\s+\w+\s*\(|final answer|complete solution|full code|the answer is/.test(joined)) {
        throw new Error('Hints reveal too much of the solution.');
      }
      return data.hints;
    } catch (err) {
      lastErr = err;
    }
  }
  
  throw new Error(`INVALID_HINTS: ${lastErr.message}`);
}

async function generateQuestion(options) {
  const { title, skipSandbox = false, count = 8, topic, difficulty } = options;
  const safeCount = Math.min(Math.max(Number(count) || 8, 1), 12);
  
  try {
    const contract = await generateContract(options);
    const testCases = await generateTestCasesForContract(contract, safeCount);
    let solutions = await generateSolutionsForContract(contract);
    
    if (!skipSandbox) {
      solutions = await verifyAndFixSolution(contract, testCases, solutions, 3);
    }
    
    let hints = [];
    try {
      hints = await generateHintsForContract(contract);
    } catch (err) {
      if (title) throw err; 
      hints = ["Understand the problem constraints.", "Think about optimal data structures.", "Implement carefully considering edge cases."];
    }
    
    return {
      ...contract,
      ...solutions,
      test_cases: testCases,
      hints
    };
  } catch (err) {
    if (title || !options.is_fallback_allowed) {
      throw err;
    }
    
    // Fallback logic
    const fallbackTemplates = require('./fallbackTemplates');
    const template = fallbackTemplates.getTemplate(topic, difficulty);
    if (!template) {
       throw Object.assign(new Error(`Failed generation: ${err.message}. No valid fallback template exists for this topic/difficulty`), { statusCode: 503 });
    }
    return template;
  }
}

async function validateGeneratedQuestionAsync() {
  return { valid: true };
}

module.exports = { generateQuestion, validateGeneratedQuestionAsync };
