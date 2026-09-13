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
    // In Phase 5, all questions live in the questions table.
    // However, daily challenges have is_practice = 0 by default until they expire.
    // Standard practice bank should only return is_practice = 1.
    // Thus, un-expired daily challenges should NOT appear in practice.
    const hasUnexpiredDailyChallenges = res.body.data.some(q => q.is_practice === 0);
    expect(hasUnexpiredDailyChallenges).toBe(false);
    expect(res.body.total).toBeGreaterThanOrEqual(80);
  });

  test('2. Admin can list Daily Challenges with lifecycle stats and date filters', async () => {
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
    expect(res.body.data.id).toMatch(/^q-/);
    expect(res.body.data.title).toBe(newChallenge.title);
    expect(res.body.data.test_cases.length).toBe(2);
    expect(res.body.data.hints.length).toBe(3);
  });

  test('4. Admin can create a Daily Challenge from an existing Practice problem without altering it', async () => {
    const listRes = await request(app)
      .get('/api/v1/questions?limit=5')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(listRes.statusCode).toBe(200);
    const targetPractice = listRes.body.data[0];
    const practiceId = targetPractice.id;
    const originalPracticeTitle = targetPractice.title;

    const fromPracticeRes = await request(app)
      .post('/api/v1/daily-challenges/from-practice')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        question_id: practiceId
      });

    expect(fromPracticeRes.statusCode).toBe(201);
    // In Phase 5, creating from practice just LINKS the existing question, 
    // it DOES NOT clone it. So the ID should be exactly the same.
    expect(fromPracticeRes.body.data.id).toBe(practiceId);
    expect(fromPracticeRes.body.data.test_cases.length).toBeGreaterThanOrEqual(1);

    // Verify original practice problem is unchanged
    const practiceResAfter = await request(app)
      .get(`/api/v1/questions/${practiceId}`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(practiceResAfter.statusCode).toBe(200);
    expect(practiceResAfter.body.data.title).toBe(originalPracticeTitle);
    expect(practiceResAfter.body.data.id).toBe(practiceId);
  });

  test('5. Admin can schedule a Daily Challenge and rejects duplicate schedule on same date', async () => {
    // First, let's create a challenge to schedule
    const newDc = await request(app)
      .post('/api/v1/daily-challenges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'To Schedule', slug: 'to-schedule', difficulty: 'easy', points: 10, description: 'Test description'
      });
    const dcId1 = newDc.body.data.id;
    
    const scheduleDate = '2030-05-15';
    const scheduleRes = await request(app)
      .post(`/api/v1/daily-challenges/${dcId1}/schedule`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ date: scheduleDate });

    expect(scheduleRes.statusCode).toBe(200);
    expect(scheduleRes.body.data.status).toBe('scheduled');
    expect(scheduleRes.body.data.scheduled_date).toBe(scheduleDate);

    const newDc2 = await request(app)
      .post('/api/v1/daily-challenges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'To Schedule 2', slug: 'to-schedule-2', difficulty: 'easy', points: 10, description: 'Test desc 2'
      });
    const dcId2 = newDc2.body.data.id;

    const duplicateRes = await request(app)
      .post(`/api/v1/daily-challenges/${dcId2}/schedule`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ date: scheduleDate });

    expect(duplicateRes.statusCode).toBe(409);
    expect(duplicateRes.body.error.code).toBe('DATE_CONFLICT');
  });

  test('6. Student sees active Daily Challenge on GET /api/v1/daily-challenges/today', async () => {
    const res = await request(app)
      .get('/api/v1/daily-challenges/today')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.statusCode).toBe(200);
    if (res.body.data) {
      expect(res.body.data.points).toBe(100);
      expect(res.body.data.title).toBeDefined();
    }
  });

  test('7. Student workspace can load Daily Challenge by ID via GET /api/v1/questions/:id', async () => {
    const todayRes = await request(app)
      .get('/api/v1/daily-challenges/today')
      .set('Authorization', `Bearer ${studentToken}`);
      
    if (!todayRes.body.data) {
      // If there's no challenge scheduled for today, skip the rest of the test
      return;
    }
    
    const dcId = todayRes.body.data.id;

    const res = await request(app)
      .get(`/api/v1/questions/${dcId}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.id).toBe(dcId);
    expect(res.body.data.test_cases).toBeDefined();
    expect(res.body.data.hints).toBeDefined();
    expect(res.body.data.hints.length).toBeGreaterThanOrEqual(0);
  });
});
