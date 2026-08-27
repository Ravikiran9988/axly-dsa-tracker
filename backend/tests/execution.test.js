const request = require('supertest');
const app = require('../src/app');
const { db, initSchema } = require('../src/db/db');
const { seedDatabase } = require('../src/db/seed');
const jwt = require('jsonwebtoken');

describe('In-Platform Code Execution & Submissions API', () => {
  let userToken;
  let adminToken;

  beforeAll(() => {
    initSchema();
    seedDatabase();

    const JWT_SECRET = process.env.JWT_SECRET || 'axly-dsa-tracker-dev-secret-key-32-chars-minimum';
    userToken = jwt.sign(
      { sub: 'usr-user-01', email: 'alex@example.com', role: 'user', name: 'Alex Mercer' },
      JWT_SECRET
    );
    adminToken = jwt.sign(
      { sub: 'usr-admin-01', email: 'admin@axly.in', role: 'admin', name: 'Axly Admin' },
      JWT_SECRET
    );
  });

  describe('1. In-Platform Question Details & Test Cases Privacy', () => {
    it('Regular user can fetch problem details with visible test cases only', async () => {
      const res = await request(app)
        .get('/api/v1/questions/q-two-sum')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('q-two-sum');
      expect(res.body.data.description).toBeDefined();
      expect(res.body.data.starter_code).toBeDefined();
      expect(Array.isArray(res.body.data.test_cases)).toBe(true);

      // Verify that hidden test cases are NOT exposed to regular users
      const hasHidden = res.body.data.test_cases.some(tc => tc.is_hidden === true);
      expect(hasHidden).toBe(false);
    });

    it('Admin user can fetch problem details including hidden test cases', async () => {
      const res = await request(app)
        .get('/api/v1/questions/q-two-sum')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.test_cases.some(tc => tc.is_hidden === true)).toBe(true);
    });
  });

  describe('2. Run Code (Public Test Cases)', () => {
    it('Runs JavaScript solution against visible test cases and returns Passed status', async () => {
      const solution = `const fs = require('fs');
function twoSum(target, nums) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) return [map.get(complement), i];
    map.set(nums[i], i);
  }
  return [];
}
const input = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/);
if (input.length >= 2) {
  const target = parseInt(input[0].trim(), 10);
  const nums = input[1].trim().split(/\\s+/).map(Number);
  console.log(twoSum(target, nums).join(' '));
}`;

      const res = await request(app)
        .post('/api/v1/code/run')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          question_id: 'q-two-sum',
          language: 'javascript',
          source_code: solution
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('Accepted');
      expect(res.body.data.passed_tests).toBeGreaterThanOrEqual(1);
      expect(res.body.data.results[0].status).toBe('Passed');
    });

    it('Handles wrong output with Wrong Answer status', async () => {
      const wrongSolution = `console.log("99 99");`;

      const res = await request(app)
        .post('/api/v1/code/run')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          question_id: 'q-two-sum',
          language: 'javascript',
          source_code: wrongSolution
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('Wrong Answer');
      expect(res.body.data.results[0].status).toBe('Wrong Answer');
    });

    it('Handles runtime errors gracefully without crashing the server', async () => {
      const errorSolution = `throw new Error("Syntax or runtime boom!");`;

      const res = await request(app)
        .post('/api/v1/code/run')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          question_id: 'q-two-sum',
          language: 'javascript',
          source_code: errorSolution
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('Runtime Error');
      expect(res.body.data.results[0].status).toBe('Runtime Error');
    });
  });

  describe('3. Submit Solution & Progress Update', () => {
    it('Submits Accepted solution, passes all hidden tests, and marks question solved', async () => {
      const solution = `const fs = require('fs');
function twoSum(target, nums) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) return [map.get(complement), i];
    map.set(nums[i], i);
  }
  return [];
}
const input = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/);
if (input.length >= 2) {
  const target = parseInt(input[0].trim(), 10);
  const nums = input[1].trim().split(/\\s+/).map(Number);
  console.log(twoSum(target, nums).join(' '));
}`;

      const res = await request(app)
        .post('/api/v1/code/submit')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          question_id: 'q-two-sum',
          language: 'javascript',
          source_code: solution
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('Accepted');
      expect(res.body.data.submission_status).toBe('solved');
      expect(res.body.data.passed_tests).toBe(res.body.data.total_tests);

      // Verify hidden test case inputs are masked
      const hiddenCase = res.body.data.results.find(r => r.is_hidden);
      if (hiddenCase) {
        expect(hiddenCase.input).toBe('[Hidden Test Case]');
        expect(hiddenCase.expected_output).toBe('[Hidden Output]');
      }

      // Verify submission history log endpoint
      const histRes = await request(app)
        .get('/api/v1/code/submissions/q-two-sum')
        .set('Authorization', `Bearer ${userToken}`);

      expect(histRes.status).toBe(200);
      expect(Array.isArray(histRes.body.data)).toBe(true);
      expect(histRes.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('4. Admin Coding Problem CRUD with Test Cases', () => {
    it('Admin can create a new problem with starter code and test cases', async () => {
      const newProblem = {
        title: `Custom DSA Problem ${Date.now()}`,
        difficulty: 'medium',
        description: 'Find if a number is even.',
        constraints: '1 <= N <= 10^9',
        input_format: 'Single integer N',
        output_format: 'true or false',
        example_input: '4',
        example_output: 'true',
        starter_code: {
          javascript: 'const fs = require("fs"); const n = parseInt(fs.readFileSync(0, "utf-8").trim(), 10); console.log(n % 2 === 0 ? "true" : "false");',
          python: 'import sys\nn = int(sys.stdin.read().strip())\nprint("true" if n % 2 == 0 else "false")'
        },
        test_cases: [
          { input: '4', expected_output: 'true', is_hidden: false },
          { input: '7', expected_output: 'false', is_hidden: false },
          { input: '100', expected_output: 'true', is_hidden: true }
        ]
      };

      const res = await request(app)
        .post('/api/v1/questions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newProblem);

      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe(newProblem.title);
      expect(res.body.data.test_cases.length).toBe(3);
    });

    it('Regular user cannot create coding problems (RBAC)', async () => {
      const res = await request(app)
        .post('/api/v1/questions')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Unauthorized Problem',
          difficulty: 'easy'
        });

      expect(res.status).toBe(403);
    });
  });
});
