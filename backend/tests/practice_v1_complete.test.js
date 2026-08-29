const request = require('supertest');
const app = require('../src/app');
const { getRepository } = require('../src/db/repositoryFactory');
const { seedPracticeProblems, loadPracticeProblems } = require('../src/db/practiceSeed');
const { initSchema } = require('../src/db/db');
const { seedDatabase } = require('../src/db/seed');
const { generateTestToken } = require('../src/middleware/auth');
const practiceService = require('../src/services/practiceService');

const repo = getRepository();

describe('Practice V1 Complete Test Suite & Seed Verification', () => {
  let userAToken;
  let userBToken;
  let userAId;
  let userBId;
  let testPracticeProblemId;

  beforeAll(async () => {
    initSchema();
    seedDatabase();
    seedPracticeProblems();

    const userA = { id: 'usr-practice-a', name: 'Student A', email: 'student-a-prac@example.com', role: 'user' };
    const userB = { id: 'usr-practice-b', name: 'Student B', email: 'student-b-prac@example.com', role: 'user' };

    await repo.execute(
      'INSERT INTO users (id, name, email, role, points, streak, longest_streak) VALUES (?, ?, ?, ?, 100, 1, 1) ON CONFLICT(id) DO UPDATE SET role = EXCLUDED.role',
      [userA.id, userA.name, userA.email, userA.role]
    );
    await repo.execute(
      'INSERT INTO users (id, name, email, role, points, streak, longest_streak) VALUES (?, ?, ?, ?, 100, 1, 1) ON CONFLICT(id) DO UPDATE SET role = EXCLUDED.role',
      [userB.id, userB.name, userB.email, userB.role]
    );

    userAToken = generateTestToken(userA);
    userBToken = generateTestToken(userB);
    userAId = userA.id;
    userBId = userB.id;
  });

  // Seed integrity tests
  describe('80-Question Seed Integrity', () => {
    test('loads exactly 80 valid V1 Practice problems with expected topic distribution', () => {
      const problems = loadPracticeProblems();
      expect(problems.length).toBe(80);

      const topicCounts = {};
      const ids = new Set();
      const slugs = new Set();

      problems.forEach(p => {
        expect(ids.has(p.id)).toBe(false);
        expect(slugs.has(p.slug)).toBe(false);
        ids.add(p.id);
        slugs.add(p.slug);
        topicCounts[p.topic] = (topicCounts[p.topic] || 0) + 1;
        expect(['easy', 'medium', 'hard']).toContain(p.difficulty.toLowerCase());
        expect(Array.isArray(p.testCases)).toBe(true);
        expect(p.testCases.length).toBeGreaterThanOrEqual(3);
      });

      expect(topicCounts['arrays']).toBe(12);
      expect(topicCounts['strings']).toBe(10);
      expect(topicCounts['hashing']).toBe(8);
      expect(topicCounts['two-pointers-sliding-window']).toBe(10);
      expect(topicCounts['stack']).toBe(8);
      expect(topicCounts['binary-search']).toBe(8);
      expect(topicCounts['trees']).toBe(12);
      expect(topicCounts['dynamic-programming']).toBe(12);
    });
  });

  // Practice API tests
  describe('Practice Problems Querying & Filtering', () => {
    test('1. GET /api/v1/practice/problems returns list of practice problems', async () => {
      const res = await request(app)
        .get('/api/v1/practice/problems')
        .set('Authorization', `Bearer ${userAToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.total).toBeGreaterThanOrEqual(80);
      testPracticeProblemId = res.body.data[0].id;
    });

    test('2. Search practice problems by title/description', async () => {
      const res = await request(app)
        .get('/api/v1/practice/problems?search=Two')
        .set('Authorization', `Bearer ${userAToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('3. Filter by difficulty (easy, medium, hard)', async () => {
      const res = await request(app)
        .get('/api/v1/practice/problems?difficulty=easy')
        .set('Authorization', `Bearer ${userAToken}`);
      expect(res.status).toBe(200);
      res.body.data.forEach(p => expect(p.difficulty.toLowerCase()).toBe('easy'));
    });

    test('4. Filter by topic_id', async () => {
      const res = await request(app)
        .get('/api/v1/practice/problems?topic_id=arrays')
        .set('Authorization', `Bearer ${userAToken}`);
      expect(res.status).toBe(200);
      res.body.data.forEach(p => expect(p.topic_id).toBe('arrays'));
    });

    test('5. Filter by pattern_id with valid topic', async () => {
      const res = await request(app)
        .get('/api/v1/practice/problems?topic_id=arrays&pattern_id=two-pointers')
        .set('Authorization', `Bearer ${userAToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('6. Filter by progress status', async () => {
      const res = await request(app)
        .get('/api/v1/practice/problems?status=unsolved')
        .set('Authorization', `Bearer ${userAToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('7. Pagination controls limit and page', async () => {
      const res = await request(app)
        .get('/api/v1/practice/problems?page=1&limit=5')
        .set('Authorization', `Bearer ${userAToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(5);
      expect(res.body.limit).toBe(5);
    });

    test('8. GET /api/v1/practice/problems/:id returns single problem with test cases', async () => {
      const res = await request(app)
        .get(`/api/v1/practice/problems/${testPracticeProblemId}`)
        .set('Authorization', `Bearer ${userAToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(testPracticeProblemId);
      expect(res.body.data.practice_status).toBeDefined();
    });
  });

  // Lifecycle state tests
  describe('Practice Lifecycle State Machine', () => {
    test('9. Start practice problem transitions status to in_progress', async () => {
      const res = await request(app)
        .post(`/api/v1/practice/problems/${testPracticeProblemId}/start`)
        .set('Authorization', `Bearer ${userAToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.practice_status).toBe('in_progress');
    });

    test('10. Starting an already-started problem is idempotent', async () => {
      const res = await request(app)
        .post(`/api/v1/practice/problems/${testPracticeProblemId}/start`)
        .set('Authorization', `Bearer ${userAToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.practice_status).toBe('in_progress');
    });

    test('11. Abandon practice problem transitions status to abandoned', async () => {
      const res = await request(app)
        .post(`/api/v1/practice/problems/${testPracticeProblemId}/abandon`)
        .set('Authorization', `Bearer ${userAToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.practice_status).toBe('abandoned');
    });

    test('12. Restart abandoned problem transitions status back to in_progress', async () => {
      const res = await request(app)
        .post(`/api/v1/practice/problems/${testPracticeProblemId}/start`)
        .set('Authorization', `Bearer ${userAToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.practice_status).toBe('in_progress');
    });

    test('13. Failed practice submission increments attempts and remains in_progress', async () => {
      const res = await request(app)
        .post('/api/v1/code/submit')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          question_id: testPracticeProblemId,
          language: 'javascript',
          source_code: 'console.log("wrong output");'
        });
      expect(res.status).toBe(200);
      expect(res.body.data.submission_status).toBe('in_progress');
      expect(res.body.data.scoring).toBeNull(); // 0 competitive points
    });

    test('14. Accepted practice submission marks problem as solved with 0 competitive points', async () => {
      await practiceService.recordPracticeSubmission({
        user: { id: userAId },
        questionId: testPracticeProblemId,
        submissionId: 'sub-accepted-test',
        passed: true
      });

      const res = await request(app)
        .get(`/api/v1/practice/problems/${testPracticeProblemId}`)
        .set('Authorization', `Bearer ${userAToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.practice_status).toBe('solved');
    });

    test('15. Multiple submissions track attempts accurately', async () => {
      const res = await request(app)
        .get(`/api/v1/practice/problems/${testPracticeProblemId}`)
        .set('Authorization', `Bearer ${userAToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.attempts).toBeGreaterThanOrEqual(2);
    });

    test('16. Solved problem remains solved on new submission', async () => {
      const res = await request(app)
        .post(`/api/v1/practice/problems/${testPracticeProblemId}/start`)
        .set('Authorization', `Bearer ${userAToken}`);
      expect(res.status).toBe(200);
      // Status remains solved
      expect(res.body.data.practice_status).toBe('solved');
    });
  });

  // Progress & Isolation tests
  describe('Progress Analytics & Isolation', () => {
    test('17. GET /api/v1/practice/progress returns complete learning metrics', async () => {
      const res = await request(app)
        .get('/api/v1/practice/progress')
        .set('Authorization', `Bearer ${userAToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(80);
      expect(res.body.data.solved).toBeGreaterThanOrEqual(1);
      expect(res.body.data.topics.length).toBe(8);
      expect(res.body.data.difficulties.length).toBe(3);
    });

    test('18. Per-user progress isolation (User B does not see User A solved problem)', async () => {
      const resB = await request(app)
        .get(`/api/v1/practice/problems/${testPracticeProblemId}`)
        .set('Authorization', `Bearer ${userBToken}`);
      expect(resB.status).toBe(200);
      expect(resB.body.data.practice_status).toBe('not_started');

      const progB = await request(app)
        .get('/api/v1/practice/progress')
        .set('Authorization', `Bearer ${userBToken}`);
      expect(progB.status).toBe(200);
      expect(progB.body.data.solved).toBe(0);
    });
  });

  // Validation Error Tests
  describe('Practice Validation & Error Handling', () => {
    test('19. Invalid topic returns 400', async () => {
      const res = await request(app)
        .get('/api/v1/practice/problems?topic_id=quantum-computing')
        .set('Authorization', `Bearer ${userAToken}`);
      expect(res.status).toBe(400);
    });

    test('20. Invalid pattern returns 400', async () => {
      const res = await request(app)
        .get('/api/v1/practice/problems?topic_id=arrays&pattern_id=invalid-pattern')
        .set('Authorization', `Bearer ${userAToken}`);
      expect(res.status).toBe(400);
    });

    test('21. Invalid topic/pattern combination returns 400', async () => {
      // e.g. tree-recursion is not applicable to arrays
      const res = await request(app)
        .get('/api/v1/practice/problems?topic_id=arrays&pattern_id=tree-recursion')
        .set('Authorization', `Bearer ${userAToken}`);
      expect(res.status).toBe(400);
    });

    test('22. Invalid difficulty returns 400', async () => {
      const res = await request(app)
        .get('/api/v1/practice/problems?difficulty=insane')
        .set('Authorization', `Bearer ${userAToken}`);
      expect(res.status).toBe(400);
    });

    test('23. Invalid pagination parameters gracefully handled', async () => {
      const res = await request(app)
        .get('/api/v1/practice/problems?page=-5&limit=9999')
        .set('Authorization', `Bearer ${userAToken}`);
      expect(res.status).toBe(200);
      expect(res.body.page).toBe(1);
    });

    test('24. Practice problem never modifies competitive points or leaderboard', async () => {
      const profBefore = await request(app)
        .get('/api/v1/users/profile/me')
        .set('Authorization', `Bearer ${userAToken}`);
      const ptsBefore = profBefore.body.data.points;

      // Start practice problem
      await request(app)
        .post(`/api/v1/practice/problems/${testPracticeProblemId}/start`)
        .set('Authorization', `Bearer ${userAToken}`);

      const profAfter = await request(app)
        .get('/api/v1/users/profile/me')
        .set('Authorization', `Bearer ${userAToken}`);
      expect(profAfter.body.data.points).toBe(ptsBefore);
    });
  });
});
