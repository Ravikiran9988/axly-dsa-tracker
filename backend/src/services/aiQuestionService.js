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
Ensure constraints semantically match the title (e.g., if it's a binary array problem, explicitly state elements are 0 or 1, and ensure examples only use 0 and 1).
If the problem title implies elements are positive integers only, explicitly constrain them to be >= 1 or >= 0.
CRITICAL FORMAT RULE: The input_format MUST strictly describe plain text tokens (space or newline separated), NOT JSON, NOT key-value pairs, and NOT labeled arrays. For example: "The first line contains N. The second line contains N integers." NOT "parents: [1, 2, 3]". 
The examples MUST strictly match this exact plain text format without any labels like 'Input:' or 'parents:'. For complex structures like Trees or Linked Lists, explicitly state that the input is a flat space-separated array (e.g., level-order traversal).`;

  const result = await llmRouter.generate({
    prompt,
    systemPrompt: 'You generate reliable, original algorithmic programming problem definitions. Return strict JSON only. Never return markdown fences or commentary.',
    maxTokens: 4000,
    temperature: 0.2
  });

  if (!result || !result.text) throw new Error('Failed to generate problem contract.');
  if (result.error) throw new Error(`LLM_ROUTER_ERROR: ${result.error}. Details: ${JSON.stringify(result.providerErrors || [])}`);
  
  const data = extractJson(result.text);
  
  if (data.functionSignature && !data.function_signature) data.function_signature = data.functionSignature;
  
  if (!data.title || !data.description || !data.constraints || !data.function_signature) {
    console.error('INVALID_STRUCTURE returned by LLM:', JSON.stringify(data, null, 2));
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
CRITICAL: Test cases MUST STRICTLY adhere to the constraints defined in the contract. Do not use numbers outside the defined ranges (e.g., do not use -1 if the problem constraints specify positive integers or binary values).
CRITICAL: The "input" and "expected_output" MUST be non-empty strings. If the answer is an empty array or empty string, represent it as "[]" or "''" rather than an empty string "".
CRITICAL FORMAT RULE: The "input" string MUST exactly match the problem's input_format as raw space/newline separated text. DO NOT use display labels (like "parents: " or "delays: "), and DO NOT use array brackets or JSON formatting for the input. Just provide the raw tokens (e.g., "3\\n-1 0 0\\n0 5 5").

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
  if (result.error) throw new Error(`LLM_ROUTER_ERROR: ${result.error}. Details: ${JSON.stringify(result.providerErrors || [])}`);
  
  const data = extractJson(result.text);
  if (data.testCases && !data.test_cases) data.test_cases = data.testCases;
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
  "reference_solution": { "javascript": "...", "typescript": "...", "python": "...", "java": "...", "cpp": "...", "c": "..." },
  "solution_approach": "...",
  "complexity": "..."
}

For EACH language in starter_code, provide the complete executable boilerplate that reads standard input (stdin), parses it based on the input_format, calls the function defined in function_signature, and prints to standard output (stdout) based on output_format.
CRITICAL I/O INSTRUCTION: You MUST write the complete driver code to parse the input into the required data types. If the problem involves complex structures like Linked Lists or Binary Trees, YOU MUST implement the full helper functions to deserialize the string/array from stdin into actual Node objects, and serialize the result back to string for stdout. DO NOT use placeholders like "Boilerplate for reading input". Your code will be executed exactly as generated.
Input streams will ALWAYS be plain text (space or newline separated tokens). DO NOT assume the input is a JSON string and DO NOT use JSON parsing libraries (like json.load) to read stdin unless the problem explicitly requires parsing a JSON string. Parse tokens manually.
The starter code MUST:
- match the exact function signature: ${JSON.stringify(contract.function_signature)}
- contain ONLY the function signature and a dummy return (e.g., 'return 0', 'return null') inside the function body.
- explicitly include a comment like "// TODO: Write your solution here" or "# TODO: Write your solution here" right before the dummy return.
- NEVER implement the algorithm logic in the starter code.
- ONLY include imports strictly necessary for reading/parsing the I/O boilerplate. Do NOT include unused algorithmic imports (e.g., 'from collections import deque').

For EACH language in reference_solution, you MUST provide the complete working code that solves the problem AND includes the EXACT same driver code (reading from stdin and printing to stdout) as the corresponding starter_code. It will be run in a sandbox against test cases. It MUST handle all edge cases described in constraints: ${contract.constraints}.
Make absolutely sure you include all required imports for your algorithmic logic (e.g., 'from collections import deque' in Python if using a queue, or '#include <queue>' in C++). Do not use functions or classes without importing them!

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
    maxTokens: 8192,
    temperature: 0.1
  });
  
  if (!result || !result.text) throw new Error('Failed to generate solutions.');
  if (result.error) throw new Error(`LLM_ROUTER_ERROR: ${result.error}. Details: ${JSON.stringify(result.providerErrors || [])}`);
  
  const data = extractJson(result.text);
  
  if (data.starterCode && !data.starter_code) data.starter_code = data.starterCode;
  if (data.referenceSolution && !data.reference_solution) data.reference_solution = data.referenceSolution;
  
  if (!data.starter_code || !data.starter_code.javascript || !data.starter_code.python || !data.reference_solution || !data.reference_solution.python) {
    console.error('INVALID_STRUCTURE returned by LLM:', JSON.stringify(data, null, 2));
    throw new Error('INVALID_STRUCTURE: Missing starter code or reference solution');
  }
  return data;
}

function validatePythonAst(code) {
  return new Promise((resolve) => {
    const { spawn } = require('child_process');
    const pyCode = `
import ast
import sys

try:
    code = sys.stdin.read()
    tree = ast.parse(code)
    
    uses_deque = False
    imports_deque = False
    
    for node in ast.walk(tree):
        if isinstance(node, ast.Name) and node.id == 'deque':
            uses_deque = True
        elif isinstance(node, ast.ImportFrom) and getattr(node, 'module', None) == 'collections':
            if any(n.name == 'deque' for n in node.names):
                imports_deque = True
                
    if uses_deque and not imports_deque:
        print("NameError: 'deque' is used but not imported from collections", file=sys.stderr)
        sys.exit(1)
        
    sys.exit(0)
except SyntaxError as e:
    print(f"SyntaxError: {e}", file=sys.stderr)
    sys.exit(1)
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    sys.exit(1)
`;

    const proc = spawn('python', ['-c', pyCode]);
    let stderr = '';
    
    proc.stderr.on('data', data => { stderr += data.toString(); });
    
    proc.on('close', code => {
      if (code !== 0) {
        resolve({ valid: false, error: stderr.trim() });
      } else {
        resolve({ valid: true });
      }
    });

    proc.stdin.write(code);
    proc.stdin.end();
  });
}

async function validateAllSolutions(contract, testCases, solutions) {
  const languages = ['javascript', 'typescript', 'python', 'java', 'cpp', 'c'];
  const errors = [];
  const unhiddenTestCases = testCases.map(tc => ({ ...tc, is_hidden: false }));

  for (const lang of languages) {
    const starter = solutions.starter_code?.[lang];
    const ref = solutions.reference_solution?.[lang];

    if (!starter) {
      errors.push(`[${lang}] Missing starter_code`);
      continue;
    }
    if (!ref) {
      errors.push(`[${lang}] Missing reference_solution`);
      continue;
    }

    if (!starter.includes('TODO:')) {
      errors.push(`[${lang}] Starter code missing 'TODO:' instruction`);
    }

    if (lang === 'python') {
      const astCheck = await validatePythonAst(ref);
      if (!astCheck.valid) {
        errors.push(`[python] AST Validation Failed: ${astCheck.error}`);
      }
    }

    try {
      const starterExec = await executeCode({
        language: lang,
        sourceCode: starter,
        testCases: [unhiddenTestCases[0]],
        isSubmit: false
      });
      if (starterExec.status === 'Compile Error') {
        errors.push(`[${lang}] Starter code failed to compile: ${starterExec.results[0]?.stderr || 'Compile Error'}`);
      } else if (starterExec.status === 'Runtime Error') {
         errors.push(`[${lang}] Starter code Runtime Error (invalid wrapper/syntax?): ${starterExec.results[0]?.stderr || 'Runtime Error'}`);
      }
    } catch (err) {
      errors.push(`[${lang}] Starter code execution service error: ${err.message}`);
    }

    try {
      const refExec = await executeCode({
        language: lang,
        sourceCode: ref,
        testCases: unhiddenTestCases,
        isSubmit: false
      });

      if (refExec.status !== 'Accepted') {
        const failingTest = refExec.results.find(r => r.status !== 'Passed');
        const errorMsg = failingTest 
          ? `Status: ${failingTest.status} on test ${failingTest.test_index}. Input: ${failingTest.input}, Expected: ${failingTest.expected_output}, Actual: ${failingTest.actual_output}, Stderr: ${failingTest.stderr || 'None'}`
          : refExec.status;
        errors.push(`[${lang}] Reference solution failed verification. ${errorMsg}`);
      }
    } catch (err) {
      errors.push(`[${lang}] Reference solution execution service error: ${err.message}`);
    }
  }

  if (errors.length > 0) {
    const err = new Error(`AI_VALIDATION_ERROR: Generation rejected due to validation failures:\n${errors.join('\n')}`);
    err.code = 'AI_VALIDATION_ERROR';
    throw err;
  }

  return solutions;
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
      if (!result || !result.text) throw new Error('Failed to generate hints.');
      if (result.error) throw new Error(`LLM_ROUTER_ERROR: ${result.error}. Details: ${JSON.stringify(result.providerErrors || [])}`);
      
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
      solutions = await validateAllSolutions(contract, testCases, solutions);
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
