const FALLBACK_TEMPLATES = [
  {
    topic: "Arrays",
    difficulty: "Easy",
    title: "Array Sum Even",
    description: "Given an array of integers `nums`, return the sum of all even integers in the array.",
    constraints: "1 <= nums.length <= 10^5\n-10^4 <= nums[i] <= 10^4",
    input_format: "First line: JSON array `nums`.",
    output_format: "A single integer representing the sum.",
    examples: [
      { input: "[1, 2, 3, 4]", output: "6", explanation: "2 + 4 = 6" },
      { input: "[1, 3, 5]", output: "0", explanation: "No even numbers." }
    ],
    hints: ["Iterate through the array and check if each number is divisible by 2."],
    solution_approach: "Initialize a sum variable to 0. Iterate over all numbers in the array. For each number, use the modulo operator to check if it's even. If it is, add it to the sum. Finally, return the sum.",
    complexity: "Time: O(N) | Space: O(1)",
    time_limit_ms: 2000,
    memory_limit_mb: 256,
    function_signature: {
      name: "sumEven",
      params: [{ name: "nums", type: "array<integer>" }],
      return_type: "integer"
    },
    starter_code: {
      javascript: "const fs = require('fs');\n\nfunction sumEven(nums) {\n  return 0;\n}\n\nconst raw = fs.readFileSync(0, 'utf-8').trim();\nif(raw) {\n  const nums = JSON.parse(raw);\n  console.log(sumEven(nums));\n}",
      typescript: "import * as fs from 'fs';\n\nfunction sumEven(nums: number[]): number {\n  return 0;\n}\n\nconst raw = fs.readFileSync(0, 'utf-8').trim();\nif(raw) {\n  const nums = JSON.parse(raw);\n  console.log(sumEven(nums));\n}",
      python: "import sys\nimport json\n\ndef sumEven(nums):\n    pass\n\nif __name__ == '__main__':\n    raw = sys.stdin.read().strip()\n    if raw:\n        nums = json.loads(raw)\n        print(sumEven(nums))",
      java: "import java.util.*;\n\npublic class Solution {\n    public static int sumEven(int[] nums) {\n        return 0;\n    }\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNextLine()) {\n            String line = sc.nextLine();\n            // simple parsing placeholder\n            System.out.println(0);\n        }\n    }\n}",
      cpp: "#include <iostream>\n#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    int sumEven(vector<int>& nums) {\n        return 0;\n    }\n};\n\nint main() {\n    // simple parsing placeholder\n    cout << 0 << endl;\n    return 0;\n}",
      c: "#include <stdio.h>\n\nint sumEven(int* nums, int numsSize) {\n    return 0;\n}\n\nint main() {\n    printf(\"0\\n\");\n    return 0;\n}"
    },
    reference_solution: {
      javascript: "const fs = require('fs');\n\nfunction sumEven(nums) {\n  let sum = 0;\n  for(let n of nums) {\n    if(n % 2 === 0) sum += n;\n  }\n  return sum;\n}\n\nconst raw = fs.readFileSync(0, 'utf-8').trim();\nif(raw) {\n  const nums = JSON.parse(raw);\n  console.log(sumEven(nums));\n}",
      typescript: "import * as fs from 'fs';\n\nfunction sumEven(nums: number[]): number {\n  let sum = 0;\n  for(let n of nums) {\n    if(n % 2 === 0) sum += n;\n  }\n  return sum;\n}\n\nconst raw = fs.readFileSync(0, 'utf-8').trim();\nif(raw) {\n  const nums = JSON.parse(raw);\n  console.log(sumEven(nums));\n}",
      python: "import sys\nimport json\n\ndef sumEven(nums):\n    s = 0\n    for n in nums:\n        if n % 2 == 0:\n            s += n\n    return s\n\nif __name__ == '__main__':\n    raw = sys.stdin.read().strip()\n    if raw:\n        nums = json.loads(raw)\n        print(sumEven(nums))",
      java: "import java.util.*;\n\npublic class Solution {\n    public static int sumEven(int[] nums) {\n        int sum = 0;\n        for (int n : nums) { if (n % 2 == 0) sum += n; }\n        return sum;\n    }\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if(sc.hasNextLine()) {\n            String line = sc.nextLine().replace(\"[\",\"\").replace(\"]\",\"\").trim();\n            if (line.isEmpty()) { System.out.println(0); return; }\n            String[] parts = line.split(\",\");\n            int[] nums = new int[parts.length];\n            for(int i=0; i<parts.length; i++) nums[i] = Integer.parseInt(parts[i].trim());\n            System.out.println(sumEven(nums));\n        }\n    }\n}",
      cpp: "#include <iostream>\n#include <vector>\n#include <string>\n#include <sstream>\nusing namespace std;\n\nclass Solution {\npublic:\n    int sumEven(vector<int>& nums) {\n        int sum = 0;\n        for (int n : nums) { if (n % 2 == 0) sum += n; }\n        return sum;\n    }\n};\n\nint main() {\n    string line;\n    if (getline(cin, line)) {\n        vector<int> nums;\n        for(char &c: line) if(c=='[' || c==']' || c==',') c = ' ';\n        stringstream ss(line);\n        int val;\n        while(ss >> val) nums.push_back(val);\n        Solution sol;\n        cout << sol.sumEven(nums) << endl;\n    }\n    return 0;\n}",
      c: "#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n\nint sumEven(int* nums, int numsSize) {\n    int sum = 0;\n    for(int i=0; i<numsSize; i++) {\n        if(nums[i] % 2 == 0) sum += nums[i];\n    }\n    return sum;\n}\n\nint main() {\n    char line[10000];\n    if(fgets(line, sizeof(line), stdin)) {\n        int nums[10000];\n        int size = 0;\n        char* token = strtok(line, \"[], \\n\");\n        while(token) {\n            nums[size++] = atoi(token);\n            token = strtok(NULL, \"[], \\n\");\n        }\n        printf(\"%d\\n\", sumEven(nums, size));\n    }\n    return 0;\n}"
    },
    test_cases: [
      { input: "[1, 2, 3, 4]", expected_output: "6", is_hidden: false },
      { input: "[1, 3, 5]", expected_output: "0", is_hidden: false },
      { input: "[2, 2, 2]", expected_output: "6", is_hidden: true },
      { input: "[-2, 4, 3]", expected_output: "2", is_hidden: true }
    ]
  }
];

function getTemplate(topic, difficulty) {
  const normTopic = String(topic || '').toLowerCase();
  const normDiff = String(difficulty || '').toLowerCase();
  const match = FALLBACK_TEMPLATES.find(t => t.topic.toLowerCase() === normTopic && t.difficulty.toLowerCase() === normDiff);
  return match || FALLBACK_TEMPLATES[0];
}

module.exports = {
  getTemplate,
  FALLBACK_TEMPLATES
};
