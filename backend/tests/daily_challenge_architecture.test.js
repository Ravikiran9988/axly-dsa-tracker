const request = require('supertest');
const app = require('../src/app');
const { generateTestToken } = require('../src/middleware/auth');
const { seedDatabase } = require('../src/db/seed');
const { seedPracticeProblems } = require('../src/db/practiceSeed');

describe('Daily Challenge Architecture & Practice Separation Tests', () => {
  let adminToken;
  let studentToken;

  beforeAll(async () => {
    seedDatabase();
    seedPracticeProblems();

    adminToken = generateTestToken({
      id: 'usr-admin-01',
      email: 'admin@axly.in',
      name: 'Axly Admin',
      role: 'admin'
    });

    studentToken = generateTestToken({
      id: 'usr-user-01',
      email: 'alex@example.com',
      name: 'Alex Mercer',
      role: 'user'
    });
  });

  test('1. Question Bank manages Practice problems independently (no daily challenges mixed in)', async () => {
    const res = await request(app)
      .get('/api/v1/questions?limit=100')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toBeDefined();
    // Daily challenge IDs start with dc- and should NOT be in the standard practice question list
    const hasDailyChallengesInPractice = res.body.data.some(q => q.id.startsWith('dc-'));
    expect(hasDailyChallengesInPractice).toBe(false);
    expect(res.body.total).toBeGreaterThanOrEqual(80);
  });

  test('2. Admin can list Daily Challenges with lifecycle stats', async () => {
    const res = await request(app)
      .get('/api/v1/daily-challenges')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.stats).toBeDefined();
    expect(res.body.stats.total).toBeGreaterThanOrEqual(1);
  });

  test('3. Admin can create an independent Daily Challenge problem with test cases', async () => {
    const newChallenge = {
      title: 'Sum of Two Large Integers in Base K',
      slug: 'sum-two-large-base-k',
      difficulty: 'medium',
      topic_id: 'strings',
      pattern_id: 'two-pointers',
      points: 100,
      estimated_time: 30,
      description: 'Given two numbers in base k, compute their sum representation.',
      problem_statement: 'Add two strings representing numbers in base k.',
      constraints: '1 <= s1.length, s2.length <= 10^4\n2 <= k <= 10',
      example_input: '{"s1": "101", "s2": "11", "k": 2}',
      example_output: '"1000"',
      hints: [
        'Iterate from the least significant digit to the most significant digit.',
        'Track the carry in each step.',
        'Prepend remainders to your result string.'
      ],
      status: 'draft',
      test_cases: [
        { input: '{"s1": "101", "s2": "11", "k": 2}', expected_output: '"1000"', is_hidden: false },
        { input: '{"s1": "99", "s2": "1", "k": 10}', expected_output: '"100"', is_hidden: true }
      ]
    };

    const res = await request(app)
      .post('/api/v1/daily-challenges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(newChallenge);

    expect(res.statusCode).toBe(201);
    expect(res.body.data.id).toMatch(/^dc-/);
    expect(res.body.data.title).toBe(newChallenge.title);
    expect(res.body.data.test_cases.length).toBe(2);
    expect(res.body.data.hints.length).toBe(3);
  });

  test('4. Admin can schedule a Daily Challenge for a specific date', async () => {
    const scheduleDate = '2030-05-15';
    const scheduleRes = await request(app)
      .post('/api/v1/daily-challenges/dc-001/schedule')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ date: scheduleDate });

    expect(scheduleRes.statusCode).toBe(200);
    expect(scheduleRes.body.data.status).toBe('scheduled');
    expect(scheduleRes.body.data.scheduled_date).toBe(scheduleDate);

    // Verify GET /api/v1/daily-question?date=2030-05-15 returns this challenge
    const getRes = await request(app)
      .get(`/api/v1/daily-question?date=${scheduleDate}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(getRes.statusCode).toBe(200);
    expect(getRes.body.data.id).toBe('dc-001');
    expect(getRes.body.data.title).toBe('Longest Subarray Challenge');
  });

  test('5. Student sees active Daily Challenge on GET /api/v1/daily-question', async () => {
    const res = await request(app)
      .get('/api/v1/daily-question')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.id).toBe('dc-001');
    expect(res.body.data.points).toBe(100);
  });

  test('6. Student workspace can load Daily Challenge by ID via GET /api/v1/questions/:id', async () => {
    const res = await request(app)
      .get('/api/v1/questions/dc-001')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.id).toBe('dc-001');
    expect(res.body.data.title).toBe('Longest Subarray Challenge');
    expect(res.body.data.test_cases).toBeDefined();
    expect(res.body.data.hints).toBeDefined();
    expect(res.body.data.hints.length).toBe(3);
  });
});
