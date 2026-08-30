const request = require('supertest');
const app = require('../src/app');
const { db, initSchema } = require('../src/db/db');
const { seedDatabase } = require('../src/db/seed');
const {
  generateDailyChallenge,
  checkDuplicateChallenge,
  validateDailyChallenge
} = require('../src/services/aiDailyChallengeService');
const {
  createDailyChallenge,
  deleteDailyChallenge,
  unpublishDailyChallenge,
  getDailyChallengeById
} = require('../src/services/dailyChallengeService');

describe('Daily Challenge Admin Portal & AI Generation Suite', () => {
  let adminToken;
  let studentToken;

  jest.setTimeout(30000);

  beforeAll(async () => {
    initSchema();
    seedDatabase();

    // Login Admin
    const adminLogin = await request(app)
      .post('/api/v1/auth/dev-login')
      .send({ email: 'admin@axly.in', role: 'admin' });
    adminToken = adminLogin.body.token;

    // Login Student
    const studentLogin = await request(app)
      .post('/api/v1/auth/dev-login')
      .send({ email: 'john@student.axly.in', role: 'user' });
    studentToken = studentLogin.body.token;
  });

  test('1. AI Daily Challenge Generator produces complete, valid problem schema', async () => {
    const res = await generateDailyChallenge({
      topic: 'Arrays',
      difficulty: 'medium',
      pattern: 'Sliding Window',
      points: 100,
      instructions: 'Target O(N) linear time'
    });

    expect(res.success).toBe(true);
    expect(res.data.title).toBeDefined();
    expect(res.data.difficulty).toBe('medium');
    expect(res.data.points).toBe(100);
    expect(res.data.created_via).toBe('ai');
    expect(res.data.status).toBe('draft');
    expect(Array.isArray(res.data.test_cases)).toBe(true);
    expect(res.data.test_cases.length).toBeGreaterThanOrEqual(2);
    expect(Array.isArray(res.data.hints)).toBe(true);
  });

  test('2. AI-generated challenge is saved as Draft and is never automatically published', async () => {
    const aiRes = await generateDailyChallenge({
      topic: 'Strings',
      difficulty: 'easy'
    });

    const createRes = await request(app)
      .post('/api/v1/daily-challenges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ...aiRes.data,
        status: 'draft'
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.status).toBe('draft');
    expect(createRes.body.data.created_via).toBe('ai');
  });

  test('3. Quality Validation catches invalid test cases or empty descriptions', () => {
    const invalid = validateDailyChallenge({
      title: 'Hi', // too short
      difficulty: 'invalid',
      description: 'short',
      test_cases: []
    });

    expect(invalid.isValid).toBe(false);
    expect(invalid.errors.length).toBeGreaterThanOrEqual(3);
  });

  test('4. Duplicate check catches existing daily challenge titles', async () => {
    const title = `Unique Test Title ${Date.now()}`;
    const created = await createDailyChallenge({
      title,
      difficulty: 'medium',
      description: 'Comprehensive problem description with sufficient length.',
      constraints: '1 <= N <= 10^5',
      test_cases: [
        { input: '1', expected_output: '1' },
        { input: '2', expected_output: '2' }
      ]
    }, 'usr-admin-01');

    const dupCheck = await checkDuplicateChallenge(title);
    expect(dupCheck.isDuplicate).toBe(true);
    expect(dupCheck.reason).toContain(title);
  });

  test('5. Admin can create a manual Daily Challenge with full schema', async () => {
    const manualTitle = `Manual Authored Challenge ${Date.now()}`;
    const res = await request(app)
      .post('/api/v1/daily-challenges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: manualTitle,
        difficulty: 'hard',
        points: 150,
        description: 'Hard difficulty dynamic programming problem requiring optimal memoization.',
        constraints: '1 <= N <= 2000',
        input_format: 'Integer array',
        output_format: 'Max subsequence sum',
        examples: [
          { input: '[1, 2, 3]', output: '6', explanation: 'All sum up.' }
        ],
        hints: ['Consider 2D DP table', 'Optimize space to O(N)'],
        editorial: 'Optimal O(N) approach using space compression.',
        complexity: 'Time: O(N) | Space: O(1)',
        created_via: 'manual',
        status: 'draft',
        test_cases: [
          { input: '[1, 2, 3]', expected_output: '6', is_hidden: 0 },
          { input: '[-1, -2]', expected_output: '-1', is_hidden: 1 }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe(manualTitle);
    expect(res.body.data.created_via).toBe('manual');
    expect(res.body.data.status).toBe('draft');
    expect(res.body.data.points).toBe(150);
  });

  test('6. Admin can schedule, publish, and unpublish a Daily Challenge', async () => {
    const target = await createDailyChallenge({
      title: `Lifecycle Test ${Date.now()}`,
      difficulty: 'easy',
      description: 'Problem description for lifecycle testing.',
      constraints: '1 <= N <= 100',
      test_cases: [
        { input: '1', expected_output: '1' },
        { input: '2', expected_output: '2' }
      ]
    }, 'usr-admin-01');

    // 1. Schedule for future date
    const schedRes = await request(app)
      .post(`/api/v1/daily-challenges/${target.id}/schedule`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ date: '2026-12-31' });

    expect(schedRes.status).toBe(200);
    expect(schedRes.body.data.status).toBe('scheduled');
    expect(schedRes.body.data.scheduled_date).toBe('2026-12-31');

    // 2. Publish
    const pubRes = await request(app)
      .post(`/api/v1/daily-challenges/${target.id}/publish`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(pubRes.status).toBe(200);
    expect(pubRes.body.data.status).toBe('published');

    // 3. Unpublish back
    const unpubRes = await request(app)
      .post(`/api/v1/daily-challenges/${target.id}/unpublish`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(unpubRes.status).toBe(200);
    expect(unpubRes.body.data.status).toBe('scheduled');
  });

  test('7. Admin can delete a Daily Challenge', async () => {
    const challenge = await createDailyChallenge({
      title: `To Be Deleted ${Date.now()}`,
      difficulty: 'easy',
      description: 'Temporary problem to delete.',
      constraints: 'N >= 1',
      test_cases: [
        { input: '1', expected_output: '1' },
        { input: '2', expected_output: '2' }
      ]
    }, 'usr-admin-01');

    const delRes = await request(app)
      .delete(`/api/v1/daily-challenges/${challenge.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(delRes.status).toBe(200);

    const check = db.prepare('SELECT id FROM daily_challenge_problems WHERE id = ?').get(challenge.id);
    expect(check).toBeUndefined();
  });

  test('8. Student cannot call admin Daily Challenge authoring endpoints (RBAC Protection)', async () => {
    const res = await request(app)
      .post('/api/v1/daily-challenges/generate-ai')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ topic: 'Arrays' });

    expect(res.status).toBe(403);
  });
});
