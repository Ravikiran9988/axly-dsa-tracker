const fs = require('fs');
const path = require('path');
const llmRouter = require('./llm/llmRouter');
const { executeCode } = require('./executionService');

let canonicalTopicsCache = null;
let canonicalPatternsCache = null;

function getCanonicalTaxonomy() {
  if (!canonicalTopicsCache) {
    try {
      const topicsPath = path.join(__dirname, '..', 'db', 'data', 'topics.json');
      canonicalTopicsCache = JSON.parse(fs.readFileSync(topicsPath, 'utf8'));
    } catch (_) {
      canonicalTopicsCache = [
        { id: 'arrays', name: 'Arrays' },
        { id: 'trees', name: 'Trees' },
        { id: 'graphs', name: 'Graphs' },
        { id: 'dynamic-programming', name: 'Dynamic Programming' },
        { id: 'strings', name: 'Strings' }
      ];
    }
  }
  if (!canonicalPatternsCache) {
    try {
      const patternsPath = path.join(__dirname, '..', 'db', 'data', 'patterns.json');
      canonicalPatternsCache = JSON.parse(fs.readFileSync(patternsPath, 'utf8'));
    } catch (_) {
      canonicalPatternsCache = [
        { id: 'two-pointers', name: 'Two Pointers' },
        { id: 'sliding-window', name: 'Sliding Window' },
        { id: 'tree-bfs', name: 'Tree BFS (Level Order)' },
        { id: '1d-dp', name: '1D DP' }
      ];
    }
  }
  return { topics: canonicalTopicsCache, patterns: canonicalPatternsCache };
}

function resolveCanonicalTaxonomy(rawTopic, rawPattern) {
  const { topics, patterns } = getCanonicalTaxonomy();

  const cleanTopicStr = String(rawTopic || '').trim();
  const cleanPatternStr = String(rawPattern || '').trim();

  let matchedTopic = null;
  if (cleanTopicStr) {
    matchedTopic = topics.find(t => 
      t.name.toLowerCase() === cleanTopicStr.toLowerCase() || 
      t.id.toLowerCase() === cleanTopicStr.toLowerCase()
    );
    if (!matchedTopic) {
      matchedTopic = topics.find(t => 
        t.name.toLowerCase().includes(cleanTopicStr.toLowerCase()) || 
        cleanTopicStr.toLowerCase().includes(t.name.toLowerCase())
      );
    }
  }

  let matchedPattern = null;
  if (cleanPatternStr) {
    matchedPattern = patterns.find(p => 
      p.name.toLowerCase() === cleanPatternStr.toLowerCase() || 
      p.id.toLowerCase() === cleanPatternStr.toLowerCase()
    );
    if (!matchedPattern) {
      matchedPattern = patterns.find(p => 
        p.name.toLowerCase().includes(cleanPatternStr.toLowerCase()) || 
        cleanPatternStr.toLowerCase().includes(p.name.toLowerCase())
      );
    }
  }

  const topicName = matchedTopic ? matchedTopic.name : (cleanTopicStr || 'Arrays');
  const topicId = matchedTopic ? matchedTopic.id : (cleanTopicStr ? cleanTopicStr.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'arrays');

  let patternName = cleanPatternStr;
  if (!patternName && matchedPattern) {
    patternName = matchedPattern.name;
  }
  if (!patternName) {
    patternName = 'Two Pointers';
  }

  const patternId = matchedPattern ? matchedPattern.id : null;

  return { topicName, topicId, patternName, patternId };
}

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
Target Topic: ${topic || 'Appropriate canonical topic'}
Target Pattern: ${pattern || 'Appropriate canonical pattern'}
Difficulty: ${difficulty || 'medium'}
${title ? `\nTitle: ${title}\nCRITICAL INSTRUCTION: You MUST generate the problem for EXACTLY this Title. Do NOT invent a different problem.` : ''}
${description ? `\nProblem Statement Constraints: ${description}` : ''}
${constraints ? `\nConstraint rules: ${constraints}\nCRITICAL INSTRUCTION: Ensure the constraints exactly match these provided constraints.` : ''}
${exclusionText ? `\n\nCRITICAL UNIQUENESS INSTRUCTIONS:\n- The generated problem MUST be materially and conceptually different from every problem in the exclusion list unless you are explicitly given a Title that matches.\n- Do NOT create variants of existing problems by changing numbers, variable names, constraints, examples, or adding a Variant ID.\n- The underlying algorithmic task and data structures must be genuinely distinct.${exclusionText}` : ''}
${instructions ? `\n\nExtra Instructions: ${instructions}` : ''}

CANONICAL TOPIC & PATTERN INSTRUCTIONS:
- You MUST generate both the canonical "topic" and "pattern" together with the question itself.
- "topic": The canonical DSA topic name for this problem (e.g., "Trees", "Arrays", "Graphs", "Dynamic Programming", "Strings", "Two Pointers", "Sliding Window", "Stack", "Queue", "Linked List", "Binary Search", "Sorting", "Heap / Priority Queue", "Greedy", "Backtracking", "Bit Manipulation", "Math", "Prefix Sum", "Monotonic Stack", "Tries", "Intervals").
- "pattern": The canonical algorithmic pattern/technique (e.g., "BFS", "DFS", "Two Pointers", "Sliding Window", "Fast & Slow Pointers", "Hash Map Lookup", "Prefix Sum", "Kadane's Algorithm", "Monotonic Stack", "Binary Search", "Binary Search on Answer", "1D DP", "2D DP", "Dijkstra's Shortest Path", "Topological Sort", "Disjoint Set Union (DSU)", "Knapsack DP", "Subsequence DP", "Interval Scheduling", "Subsets & Permutations Backtracking", "Top K Elements / Heap").

Return exactly one JSON object with these keys:
title, topic, pattern, difficulty, description, constraints, input_format, output_format, examples, time_limit_ms, memory_limit_mb, function_signature.

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
    temperature: 0.2,
    schema: {
      name: "canonical_question_contract",
      schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          topic: { type: "string" },
          pattern: { type: "string" },
          difficulty: { type: "string" },
          description: { type: "string" },
          constraints: { type: "string" },
          input_format: { type: "string" },
          output_format: { type: "string" },
          examples: {
            type: "array",
            items: {
              type: "object",
              properties: {
                input: { type: "string" },
                output: { type: "string" },
                explanation: { type: "string" }
              },
              required: ["input", "output", "explanation"],
              additionalProperties: false
            }
          },
          time_limit_ms: { type: ["number", "null"] },
          memory_limit_mb: { type: ["number", "null"] },
          function_signature: {
            type: "object",
            properties: {
              name: { type: "string" },
              params: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    type: { type: "string" }
                  },
                  required: ["name", "type"],
                  additionalProperties: false
                }
              },
              return_type: { type: "string" }
            },
            required: ["name", "params", "return_type"],
            additionalProperties: false
          }
        },
        required: [
          "title", "topic", "pattern", "difficulty", "description",
          "constraints", "input_format", "output_format", "examples",
          "time_limit_ms", "memory_limit_mb", "function_signature"
        ],
        additionalProperties: false
      }
    }
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

  const taxonomy = resolveCanonicalTaxonomy(data.topic || topic, data.pattern || pattern);
  data.topic = taxonomy.topicName;
  data.pattern = taxonomy.patternName;
  data.topic_id = taxonomy.topicId;
  data.pattern_id = taxonomy.patternId;
  data.difficulty = data.difficulty || difficulty || 'medium';
  return data;
}

async function generateTestCasesForContract(contract, count) {
  const publicCount = Math.min(2, Math.max(1, Math.floor(count / 2) || 1));
  const prompt = `Create exactly ${count} test cases for this algorithmic problem. 
Return JSON only in this exact shape: {"test_cases":[{"input":"...","expected_output":"...","is_hidden":false}]}.
Use exactly ${publicCount} public cases (is_hidden: false) and the rest hidden cases (is_hidden: true).
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
    temperature: 0.1,
    schema: {
      name: "test_cases_array",
      schema: {
        type: "object",
        properties: {
          test_cases: {
            type: "array",
            items: {
              type: "object",
              properties: {
                input: { type: "string" },
                expected_output: { type: "string" },
                is_hidden: { type: "boolean" }
              },
              required: ["input", "expected_output", "is_hidden"],
              additionalProperties: false
            }
          }
        },
        required: ["test_cases"],
        additionalProperties: false
      }
    }
  });

  if (!result || !result.text) throw new Error('Failed to generate test cases.');
  if (result.error) throw new Error(`LLM_ROUTER_ERROR: ${result.error}. Details: ${JSON.stringify(result.providerErrors || [])}`);
  
  const data = extractJson(result.text);
  if (data.testCases && !data.test_cases) data.test_cases = data.testCases;
  if (!data.test_cases || !Array.isArray(data.test_cases) || data.test_cases.length < 2) {
    throw new Error('INVALID_STRUCTURE: Test cases generation failed or returned insufficient cases.');
  }
  if (data.test_cases.length > count) {
    data.test_cases = data.test_cases.slice(0, count);
  }
  
  for (const tc of data.test_cases) {
    if (typeof tc.input === 'object') tc.input = JSON.stringify(tc.input);
    else tc.input = String(tc.input);
    if (typeof tc.expected_output === 'object') tc.expected_output = JSON.stringify(tc.expected_output);
    else tc.expected_output = String(tc.expected_output);
  }

  return data.test_cases;
}

async function generateSolutionsForContract(contract, testCases = [], feedbackErrors = []) {
  const sampleCases = Array.isArray(testCases) && testCases.length > 0
    ? testCases.slice(0, 2).map((tc, idx) => ({
        case_index: idx + 1,
        input: tc.input,
        expected_output: tc.expected_output
      }))
    : (contract.examples || []).slice(0, 2);

  /**
   * Build targeted feedback text based on the categories of failures.
   * Generic "fix stdin parsing" advice is counterproductive for Wrong Answer errors.
   */
  function buildFeedbackText(feedbackErrors) {
    if (!feedbackErrors || feedbackErrors.length === 0) return '';

    const fullMsg = feedbackErrors.join('\n');

    // Categorise by failure type
    const hasWrongAnswer   = /Wrong Answer/i.test(fullMsg);
    const hasMissingSol    = /Missing reference_solution|Missing starter_code/i.test(fullMsg);
    const hasRuntimeError  = /Runtime Error|Index.*out of range|cannot read property|TypeError|cannot read.*undefined/i.test(fullMsg);
    const hasCompileError  = /Compile Error|SyntaxError/i.test(fullMsg);
    const hasStructure     = /INVALID_STRUCTURE|Missing starter code/i.test(fullMsg);

    const parts = [
      `\n\nCRITICAL FIX REQUIRED — PREVIOUS GENERATION FAILED SANDBOX VERIFICATION:`,
      fullMsg,
      `\nYou MUST fix ALL of the issues above. Specific guidance:`
    ];

    if (hasStructure || hasMissingSol) {
      parts.push(`- MISSING SOLUTIONS: You MUST include non-empty "javascript", "python", "typescript", "java", "cpp", and "c" entries in both starter_code AND reference_solution. Do NOT omit any language key.`);
    }

    if (hasWrongAnswer) {
      parts.push(`- WRONG ANSWER: Your algorithm logic is incorrect for the failing test case(s) shown above. Do NOT touch stdin parsing. Instead, carefully trace your algorithm step-by-step through the failing input, identify the logical error, and produce a correct algorithm. Verify your solution produces the exact expected output for EVERY test case shown.`);
    }

    if (hasRuntimeError) {
      // Detect missing class/function definition (ReferenceError: X is not defined)
      const refErrorMatch = fullMsg.match(/ReferenceError:\s*(\w+) is not defined/i);
      if (refErrorMatch) {
        parts.push(`- MISSING DEFINITION: '${refErrorMatch[1]}' is used but never defined. You MUST define ALL helper classes and functions (like TreeNode, ListNode, GraphNode, etc.) at the top of your code. Do not assume they exist globally.`);
      } else {
        parts.push(`- RUNTIME ERROR: Check stdin token index management. Ensure all array accesses are bounds-checked. For graphs, verify node indexing (0-based vs 1-based). Ensure all required imports are present.`);
      }
    }

    if (hasCompileError) {
      parts.push(`- COMPILE ERROR: Fix all syntax errors. Do NOT use TypeScript-only syntax in JavaScript solutions. Ensure all language-specific imports are correct.`);
    }

    if (!hasWrongAnswer && !hasRuntimeError && !hasCompileError) {
      parts.push(`- Ensure all reference solutions produce the exact expected output for every test case.`);
    }

    return parts.join('\n');
  }

  const feedbackText = buildFeedbackText(feedbackErrors);

  const prompt = `Generate the reference solution and starter code for this algorithmic problem.
Return JSON only in this exact shape:
{
  "starter_code": { "javascript": "...", "typescript": "...", "python": "...", "java": "...", "cpp": "...", "c": "..." },
  "reference_solution": { "javascript": "...", "typescript": "...", "python": "...", "java": "...", "cpp": "...", "c": "..." },
  "solution_approach": "...",
  "complexity": "..."
}

For EACH language in starter_code, provide the complete executable boilerplate that reads standard input (stdin), parses it based on the input_format, calls the function defined in function_signature, and prints to standard output (stdout) based on output_format.
CRITICAL I/O INSTRUCTION: You MUST write the complete driver code to parse the input into the required data types. If the problem involves complex structures like Linked Lists or Binary Trees or Graphs, YOU MUST implement the full helper functions to deserialize the string/array from stdin into actual data structures, and serialize the result back to string for stdout. DO NOT use placeholders like "Boilerplate for reading input". Your code will be executed exactly as generated.
CRITICAL CLASS DEFINITION RULE: If your code uses any custom class or constructor (e.g., TreeNode, ListNode, GraphNode, MinHeap, etc.), you MUST define that class IN THE SAME FILE, at the top, BEFORE any code that references it. Never assume these classes are globally available — the sandbox starts with a blank environment.

INPUT PARSING AND INDEXING RULES:
- Input streams will ALWAYS be plain text (space or newline separated tokens). DO NOT assume the input is a JSON string and DO NOT use JSON parsing libraries (like json.load) to read stdin unless the problem explicitly requires parsing a JSON string. Parse tokens manually.
- When reading tokens from stdin (e.g. fs.readFileSync(0, 'utf-8').trim().split(/\\s+/) in JS, or sys.stdin.read().split() in Python), carefully manage token pointer indices so you NEVER get 'IndexError: list index out of range' or 'TypeError: cannot read property of undefined'.
- For graph problems: check whether node indices are 1-based (1 to N) or 0-based (0 to N-1). If nodes are 1-based, allocate adjacency structures of size N + 1 or convert node IDs to 0-based so that adj[u] is ALWAYS an array/list and NEVER undefined.
- Ensure your reference solution produces the exact expected output format matching sample test cases.${feedbackText}

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
  examples: contract.examples,
  sample_test_cases: sampleCases
}, null, 2)}`;

  const result = await llmRouter.generate({
    prompt,
    systemPrompt: 'You are an expert algorithm developer. Generate clean, bug-free reference solutions and starter code templates. Return strict JSON only.',
    maxTokens: 8192,
    temperature: 0.1,
    schema: {
      name: "solutions_contract",
      schema: {
        type: "object",
        properties: {
          starter_code: {
            type: "object",
            properties: {
              javascript: { type: ["string", "null"] },
              typescript: { type: ["string", "null"] },
              python: { type: ["string", "null"] },
              java: { type: ["string", "null"] },
              cpp: { type: ["string", "null"] },
              c: { type: ["string", "null"] }
            },
            required: ["javascript", "typescript", "python", "java", "cpp", "c"],
            additionalProperties: false
          },
          reference_solution: {
            type: "object",
            properties: {
              javascript: { type: ["string", "null"] },
              typescript: { type: ["string", "null"] },
              python: { type: ["string", "null"] },
              java: { type: ["string", "null"] },
              cpp: { type: ["string", "null"] },
              c: { type: ["string", "null"] }
            },
            required: ["javascript", "typescript", "python", "java", "cpp", "c"],
            additionalProperties: false
          },
          solution_approach: { type: "string" },
          complexity: { type: "string" }
        },
        required: ["starter_code", "reference_solution", "solution_approach", "complexity"],
        additionalProperties: false
      }
    }
  });
  
  if (!result || !result.text) throw new Error('Failed to generate solutions.');
  if (result.error) throw new Error(`LLM_ROUTER_ERROR: ${result.error}. Details: ${JSON.stringify(result.providerErrors || [])}`);
  
  const data = extractJson(result.text);
  
  if (data.starterCode && !data.starter_code) data.starter_code = data.starterCode;
  if (data.referenceSolution && !data.reference_solution) data.reference_solution = data.referenceSolution;
  
  if (!data.starter_code || !data.starter_code.javascript || !data.starter_code.python || !data.reference_solution || !data.reference_solution.javascript || !data.reference_solution.python) {
    console.error('INVALID_STRUCTURE returned by LLM:', JSON.stringify(data, null, 2));
    throw new Error('INVALID_STRUCTURE: Missing starter code or reference solution');
  }
  return data;
}

async function validatePythonAst(code) {
  const pyCode = `
import ast
import sys

try:
    code_text = sys.stdin.read()
    tree = ast.parse(code_text)
    
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
        
    print("VALID")
    sys.exit(0)
except SyntaxError as e:
    print(f"SyntaxError: {e}", file=sys.stderr)
    sys.exit(1)
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    sys.exit(1)
`;

  try {
    const execResult = await executeCode({
      language: 'python',
      sourceCode: pyCode,
      testCases: [{ input: code, expected_output: 'VALID', is_hidden: false }],
      isSubmit: false
    });

    if (execResult.status === 'Accepted' || execResult.status === 'Passed') {
      return { valid: true };
    }
    
    const stderr = execResult.results?.[0]?.stderr || '';
    const actual_output = execResult.results?.[0]?.actual_output || '';
    
    let errorMsg = stderr.trim();
    if (!errorMsg && actual_output && actual_output !== '[Output Failed]' && actual_output !== '[Output Passed]') {
      errorMsg = actual_output.trim();
    }
    
    return { valid: false, error: errorMsg || execResult.status };
  } catch (err) {
    return { valid: false, error: `Sandbox validation failed: ${err.message}` };
  }
}

async function validateAllSolutions(contract, testCases, solutions) {
  // Strict languages: failures block the pipeline.
  // Warn-only languages: failures are logged but do NOT block.
  //   - TypeScript: Node.js built-in TS stripper fails on complex generics (ERR_INVALID_TYPESCRIPT_SYNTAX)
  //   - Java/C++/C: compilers not installed in local dev environment
  const STRICT_LANGUAGES = ['javascript', 'python'];
  const WARN_LANGUAGES   = ['typescript', 'java', 'cpp', 'c'];
  const ALL_LANGUAGES    = [...STRICT_LANGUAGES, ...WARN_LANGUAGES];

  const errors   = [];
  const warnings = [];
  const unhiddenTestCases = testCases.map(tc => ({ ...tc, is_hidden: false }));

  /**
   * Detect a TODO instruction regardless of comment style.
   */
  function hasTodoComment(code) {
    return /todo[\s:]/i.test(code) || /\/\/\s*todo/i.test(code) || /#\s*todo/i.test(code) || /\/\*\s*todo/i.test(code);
  }

  for (const lang of ALL_LANGUAGES) {
    const starter = solutions.starter_code?.[lang];
    const ref     = solutions.reference_solution?.[lang];
    const isStrict = STRICT_LANGUAGES.includes(lang);
    const collect  = isStrict ? errors : warnings;

    if (!starter) {
      collect.push(`[${lang}] Missing starter_code`);
      continue;
    }
    if (!ref) {
      collect.push(`[${lang}] Missing reference_solution`);
      continue;
    }

    if (!hasTodoComment(starter)) {
      collect.push(`[${lang}] Starter code missing TODO instruction`);
    }

    if (contract.function_signature?.name && !starter.includes(contract.function_signature.name)) {
      collect.push(`[${lang}] Starter code does not contain the function signature name '${contract.function_signature.name}'`);
    }

    // Leak check: fail regardless of language tier
    const strippedStarter = starter.replace(/\s+/g, '');
    const strippedRef     = ref.replace(/\s+/g, '');
    if (strippedStarter.includes(strippedRef) && strippedRef.length > 20) {
      errors.push(`[${lang}] starter_code appears to contain the complete reference_solution.`);
    }

    if (lang === 'python') {
      const astCheck = await validatePythonAst(ref);
      if (!astCheck.valid) {
        errors.push(`[python] AST Validation Failed: ${astCheck.error}`);
      }
    }

    // ── Starter code sandbox ─────────────────────────────────────────────────
    // Starter code sandbox is the publishability gate.
    try {
      const starterExec = await executeCode({
        language: lang,
        sourceCode: starter,
        testCases: [unhiddenTestCases[0]],
        isSubmit: false
      });
      if (starterExec.status === 'Compiler Missing') {
        console.warn(`[${lang}] Skipping starter code validation: Compiler/runtime missing in environment.`);
      } else if (starterExec.status === 'Compile Error') {
        collect.push(`[${lang}] Starter code failed to compile: ${starterExec.results[0]?.stderr || 'Compile Error'}`);
      } else if (starterExec.status === 'Runtime Error') {
        const stderr = starterExec.results[0]?.stderr || 'Runtime Error';
        // TypeScript-specific: Node.js TS stripping syntax errors → treat as warning
        if (lang === 'typescript' && /ERR_INVALID_TYPESCRIPT_SYNTAX|SyntaxError/i.test(stderr)) {
          warnings.push(`[typescript] Skipping starter validation: Node.js TS stripping failed (${stderr.slice(0, 80)})`);
        } else {
          collect.push(`[${lang}] Starter code Runtime Error (invalid wrapper/syntax?): ${stderr}`);
        }
      }
    } catch (err) {
      collect.push(`[${lang}] Starter code execution service error: ${err.message}`);
    }

    // ── Reference solution sandbox ────────────────────────────────────────────
    // Reference solutions are not sandbox-executed by product rule.
  }

  if (warnings.length > 0) {
    console.warn('[validateAllSolutions] Non-blocking warnings:', warnings.join('; '));
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
        temperature: 0.2,
        schema: {
          name: "hints_array",
          schema: {
            type: "object",
            properties: {
              hints: {
                type: "array",
                items: { type: "string" }
              }
            },
            required: ["hints"],
            additionalProperties: false
          }
        }
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


async function validateGeneratedQuestionAsync(jsonString, timeoutSeconds = 30) {
  let candidate;
  try {
    candidate = extractJson(jsonString);
  } catch (err) {
    return { valid: false, reason: err.message };
  }

  const requiredFields = ['title', 'difficulty', 'description', 'constraints', 'input_format', 'output_format', 'examples', 'starter_code', 'reference_solution', 'test_cases'];
  for (const field of requiredFields) {
    if (!candidate[field]) {
      return { valid: false, reason: `INVALID_GENERATION: missing: ${field}` };
    }
  }

  // Solution leakage check (basic heuristic)
  for (const lang of Object.keys(candidate.starter_code)) {
    const starter = candidate.starter_code[lang] || '';
    const ref = candidate.reference_solution[lang] || '';
    if (starter.length > 50 && ref.length > 50 && starter === ref) {
      return { valid: false, reason: `INVALID_GENERATION: Solution leakage detected in ${lang}` };
    }
  }

  try {
    await validateAllSolutions(candidate, candidate.test_cases, {
      starter_code: candidate.starter_code,
      reference_solution: candidate.reference_solution
    });
    return { valid: true, candidate };
  } catch (err) {
    return { valid: false, reason: err.message };
  }
}

module.exports = {
  validateGeneratedQuestionAsync,
  generateContract,
  generateTestCasesForContract,
  generateSolutionsForContract,
  validateAllSolutions,
  generateHintsForContract
};
