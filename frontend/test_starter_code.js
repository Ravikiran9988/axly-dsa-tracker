import assert from 'assert';
import fs from 'fs';

// We'll just read the function out of the file to avoid dealing with JSX compilation in raw Node.js
const code = fs.readFileSync('./src/pages/ProblemWorkspace.jsx', 'utf-8');
const funcMatch = code.match(/export function getStarterCodeForQuestion\(question, language\) \{([\s\S]*?)  const title/);
const body = funcMatch[1];
const fn = new Function('question', 'language', body + `\n  const title = question?.title || 'Coding Challenge';
  const templates = {
    javascript: \`// Problem: \${title}\\nconst fs = require('fs');\\nfunction solve(input) {\\n  // TODO: Implement your solution\\n  return input;\\n}\\nconst raw = fs.readFileSync(0, 'utf-8').trim();\\nif (raw) {\\n  const result = solve(raw);\\n  console.log(typeof result === 'object' ? JSON.stringify(result) : result);\\n}\\n\`,
    python: \`# Problem: \${title}\\nimport sys\\nimport json\\n\\ndef solve(raw_input: str):\\n    # TODO: Implement your solution\\n    return raw_input\\n\\nif __name__ == '__main__':\\n    data = sys.stdin.read().strip()\\n    if data:\\n        res = solve(data)\\n        if isinstance(res, (list, dict)):\\n            print(json.dumps(res, separators=(',', ':')))\\n        elif res is not None:\\n            print(res)\\n\`,
    typescript: \`// Problem: \${title}\\nimport * as fs from 'fs';\\nfunction solve(input: string): any {\\n  // TODO: Implement your solution\\n  return input;\\n}\\nconst raw = fs.readFileSync(0, 'utf-8').trim();\\nif (raw) {\\n  const result = solve(raw);\\n  console.log(typeof result === 'object' ? JSON.stringify(result) : result);\\n}\\n\`,
    java: \`// Problem: \${title}\\nimport java.util.*;\\npublic class Main {\\n    public static void main(String[] args) {\\n        Scanner sc = new Scanner(System.in);\\n        if (!sc.hasNextLine()) return;\\n        String line = sc.nextLine().trim();\\n        // TODO: Implement your solution\\n        System.out.println(line);\\n    }\\n}\\n\`,
    cpp: \`// Problem: \${title}\\n#include <iostream>\\n#include <vector>\\n#include <string>\\n#include <algorithm>\\nusing namespace std;\\nint main() {\\n    ios::sync_with_stdio(false);\\n    cin.tie(nullptr);\\n    string input;\\n    if (getline(cin, input)) {\\n        // TODO: Implement your solution\\n        cout << input << "\\\\n";\\n    }\\n    return 0;\\n}\\n\`,
    c: \`// Problem: \${title}\\n#include <stdio.h>\\n#include <string.h>\\nint main() {\\n    char input[4096];\\n    if (fgets(input, sizeof(input), stdin)) {\\n        // TODO: Implement your solution\\n        printf("%s\\\\n", input);\\n    }\\n    return 0;\\n}\\n\`
  };
  return templates[lang] || templates.javascript;
`);

function runTests() {
  console.log('--- Testing getStarterCodeForQuestion ---');

  // Test 1: New Question (Object starter_code)
  const newQuestion = {
    title: 'New AI Question',
    starter_code: {
      javascript: 'function solve(nums) { return 0; }',
      python: 'def solve(nums): return 0'
    }
  };

  assert.strictEqual(
    fn(newQuestion, 'javascript'),
    'function solve(nums) { return 0; }',
    'Failed: New Question JS'
  );
  assert.strictEqual(
    fn(newQuestion, 'python'),
    'def solve(nums): return 0',
    'Failed: New Question Python'
  );
  assert.ok(
    fn(newQuestion, 'java').includes('class Main'),
    'Failed: New Question missing language should fallback to template'
  );
  
  // Test 2: Old Question (String JSON starter_code)
  const stringJsonQuestion = {
    title: 'String JSON Question',
    starter_code: JSON.stringify({
      javascript: 'console.log("js");',
      cpp: 'cout << "cpp";'
    })
  };

  assert.strictEqual(
    fn(stringJsonQuestion, 'javascript'),
    'console.log("js");',
    'Failed: String JSON JS'
  );
  assert.strictEqual(
    fn(stringJsonQuestion, 'cpp'),
    'cout << "cpp";',
    'Failed: String JSON CPP'
  );

  // Test 3: Old Legacy Question (Raw String starter_code)
  const legacyQuestion = {
    title: 'Legacy Question',
    starter_code: 'function legacySolve() { return true; }'
  };

  assert.strictEqual(
    fn(legacyQuestion, 'javascript'),
    'function legacySolve() { return true; }',
    'Failed: Legacy Question JS'
  );

  assert.strictEqual(
    fn(legacyQuestion, 'python'),
    'function legacySolve() { return true; }',
    'Failed: Legacy Question Python fallback'
  );

  console.log('All frontend starter-code tests passed successfully!');
}

runTests();
