const request = require('supertest');
const app = require('../src/app');
const { db, initSchema } = require('../src/db/db');
const { generateTestToken } = require('../src/middleware/auth');
const { v4: uuidv4 } = require('uuid');

describe('Axly DSA Tracker — Acceptance Criteria & API Contract Tests', () => {
  let adminUser;
  let regularUser;
  let secondUser;
  let adminToken;
  let userToken;
  let secondUserToken;

  beforeAll(() => {
    initSchema();

    // Clean up tables
    db.prepare('DELETE FROM daily_questions').run();
    db.prepare('DELETE FROM submissions').run();
    db.prepare('DELETE FROM assignments').run();
    db.prepare('DELETE FROM questions').run();
    db.prepare('DELETE FROM topics').run();
    db.prepare('DELETE FROM users').run();

    // Insert topics
    db.prepare("INSERT INTO topics (id, name) VALUES ('top-arrays', 'Arrays & Hashing'), ('top-stack', 'Stack')").run();

    // Insert Users
    adminUser = { id: 'usr-admin-test', name: 'Admin Test', email: 'admin@axly.in', role: 'admin' };
    regularUser = { id: 'usr-user-test', name: 'User One', email: 'user1@example.com', role: 'user' };
    secondUser = { id: 'usr-user-test-2', name: 'User Two', email: 'user2@example.com', role: 'user' };

    const insertUser = db.prepare('INSERT INTO users (id, name, email, role) VALUES (?, ?, ?, ?)');
    insertUser.run(adminUser.id, adminUser.name, adminUser.email, adminUser.role);
    insertUser.run(regularUser.id, regularUser.name, regularUser.email, regularUser.role);
    insertUser.run(secondUser.id, secondUser.name, secondUser.email, secondUser.role);

    adminToken = generateTestToken({ id: adminUser.id, email: adminUser.email, name: adminUser.name, role: adminUser.role });
    userToken = generateTestToken({ id: regularUser.id, email: regularUser.email, name: regularUser.name, role: regularUser.role });
    secondUserToken = generateTestToken({ id: secondUser.id, email: secondUser.email, name: secondUser.name, role: secondUser.role });
  });

  describe('25.1 Authentication', () => {
    test('Given an unauthenticated request, protected routes return 401 Unauthorized', async () => {
      const res = await request(app).get('/api/v1/questions');
      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    test('Given an authenticated session, POST /api/v1/auth/verify returns the resolved user and role', async () => {
      const res = await request(app)
        .post('/api/v1/auth/verify')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.id).toBe(regularUser.id);
      expect(res.body.user.role).toBe('user');
    });
  });

  describe('25.2 RBAC', () => {
    test('Given an authenticated user with role "user", calling an admin endpoint returns 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/questions')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Forbidden Question',
          difficulty: 'easy',
          url: 'https://leetcode.com/problems/test/'
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    test('Given an authenticated admin, calling admin endpoints succeeds', async () => {
      const res = await request(app)
        .post('/api/v1/questions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Two Sum Test',
          difficulty: 'easy',
          topic_id: 'top-arrays',
          url: 'https://leetcode.com/problems/two-sum/'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.title).toBe('Two Sum Test');
      expect(res.body.data.difficulty).toBe('easy');
    });
  });

  describe('25.3 Question CRUD & Soft Delete', () => {
    let createdQuestionId;

    test('Admin can create questions with duplicate-title check', async () => {
      const res = await request(app)
        .post('/api/v1/questions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Valid Parentheses Test',
          difficulty: 'medium',
          topic_id: 'top-stack',
          url: 'https://leetcode.com/problems/valid-parentheses/'
        });

      expect(res.statusCode).toBe(201);
      createdQuestionId = res.body.data.id;

      // Duplicate creation attempt should return 409 Conflict
      const dupRes = await request(app)
        .post('/api/v1/questions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'valid parentheses test', // case-insensitive duplicate check
          difficulty: 'medium',
          url: 'https://leetcode.com/problems/valid-parentheses/'
        });

      expect(dupRes.statusCode).toBe(409);
      expect(dupRes.body.error.code).toBe('CONFLICT');
    });

    test('Admin can soft-delete a question, setting is_active = false', async () => {
      const res = await request(app)
        .delete(`/api/v1/questions/${createdQuestionId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);

      // Verify it is excluded from normal listing
      const listRes = await request(app)
        .get('/api/v1/questions')
        .set('Authorization', `Bearer ${userToken}`);
      
      const found = listRes.body.data.find(q => q.id === createdQuestionId);
      expect(found).toBeUndefined();
    });
  });

  describe('25.4 Daily Question & Deletion Protection', () => {
    let dailyQId;

    beforeAll(async () => {
      const qRes = await request(app)
        .post('/api/v1/questions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Daily Question Candidate',
          difficulty: 'medium',
          url: 'https://leetcode.com/problems/daily-candidate/'
        });
      dailyQId = qRes.body.data.id;
    });    test('When no daily question is set for a date, returns data: null with safe message (200 OK)', async () => {
      const res = await request(app)
        .get('/api/v1/daily-question?date=2099-01-01')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toBeNull();
    });

    test('Admin can set today\'s daily question', async () => {
      const todayUtc = new Date().toISOString().split('T')[0];
      const res = await request(app)
        .post('/api/v1/daily-question')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          question_id: dailyQId,
          date: todayUtc
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.id).toBe(dailyQId);
    });

    test('FR-14 / 25.4: Admin cannot soft-delete the current daily question (returns 409 Conflict)', async () => {
      const res = await request(app)
        .delete(`/api/v1/questions/${dailyQId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
      expect(res.body.error.message).toContain('Cannot delete the current daily question');
    });

    test('When daily question is changed to another question, the previous question can now be deleted', async () => {
      const otherQ = await request(app)
        .post('/api/v1/questions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Another Question for Daily Replacement',
          difficulty: 'hard',
          url: 'https://leetcode.com/problems/another-q/'
        });

      const todayUtc = new Date().toISOString().split('T')[0];
      await request(app)
        .post('/api/v1/daily-question')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          question_id: otherQ.body.data.id,
          date: todayUtc
        });

      const delRes = await request(app)
        .delete(`/api/v1/questions/${dailyQId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(delRes.statusCode).toBe(200);
      expect(delRes.body.is_active).toBe(false);
    });
  });

  describe('25.6 & 25.7 Deprecated Assignment Endpoints', () => {
    test('Calling /api/v1/assignments returns 410 FEATURE_REMOVED', async () => {
      const res = await request(app)
        .post('/api/v1/assignments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          user_id: regularUser.id,
          question_id: 'any-q'
        });

      expect(res.statusCode).toBe(410);
      expect(res.body.error.code).toBe('FEATURE_REMOVED');
    });
  });

  describe('25.8 Submission Status & Cross-User Security', () => {
    let questionForSub;

    beforeAll(async () => {
      const q = await request(app)
        .post('/api/v1/questions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Submission Test Question',
          difficulty: 'medium',
          url: 'https://leetcode.com/problems/sub-test/'
        });
      questionForSub = q.body.data.id;

      db.prepare(`
        INSERT OR IGNORE INTO assignments (id, user_id, question_id, assigned_by, status)
        VALUES ('asgn-sub-test', ?, ?, ?, 'assigned')
      `).run(regularUser.id, questionForSub, adminUser.id);
    });

    test('User can update own submission status to solved', async () => {
      const res = await request(app)
        .post('/api/v1/submissions/toggle')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          question_id: questionForSub,
          status: 'solved'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.status).toBe('solved');
      expect(res.body.data.solved_at).toBeDefined();
    });

    test('Another user cannot modify this submission by ID (403 Forbidden)', async () => {
      const sub = db.prepare('SELECT id FROM submissions WHERE user_id = ? AND question_id = ?')
        .get(regularUser.id, questionForSub);

      const res = await request(app)
        .patch(`/api/v1/submissions/${sub.id}`)
        .set('Authorization', `Bearer ${secondUserToken}`)
        .send({
          status: 'skipped'
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('25.9 Progress Calculation & Unassigned Retention', () => {
    let progQ1, progQ2;

    beforeAll(async () => {
      // Clean previous assignments and submissions for user2
      db.prepare('DELETE FROM submissions WHERE user_id = ?').run(secondUser.id);
      db.prepare('DELETE FROM assignments WHERE user_id = ?').run(secondUser.id);

      const q1 = await request(app)
        .post('/api/v1/questions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Prog Q1', difficulty: 'easy', url: 'https://leetcode.com/problems/prog1/' });
      progQ1 = q1.body.data.id;

      const q2 = await request(app)
        .post('/api/v1/questions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Prog Q2', difficulty: 'easy', url: 'https://leetcode.com/problems/prog2/' });
      progQ2 = q2.body.data.id;

      // Assign both Q1 and Q2 to secondUser (Total assigned = 2)
      db.prepare("INSERT INTO assignments (id, user_id, question_id, assigned_by, status) VALUES ('asgn-p1', ?, ?, ?, 'assigned')").run(secondUser.id, progQ1, adminUser.id);
      db.prepare("INSERT INTO assignments (id, user_id, question_id, assigned_by, status) VALUES ('asgn-p2', ?, ?, ?, 'unassigned')").run(secondUser.id, progQ2, adminUser.id);

      // Solve Q1 and Q2
      await request(app).post('/api/v1/submissions/toggle').set('Authorization', `Bearer ${secondUserToken}`).send({ question_id: progQ1, status: 'solved' });
      await request(app).post('/api/v1/submissions/toggle').set('Authorization', `Bearer ${secondUserToken}`).send({ question_id: progQ2, status: 'solved' });
    }); 

    test('Progress calculation excludes unassigned questions from denominator, while retaining historical solved submission', async () => {
      const res = await request(app)
        .get('/api/v1/progress/me')
        .set('Authorization', `Bearer ${secondUserToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.assigned_count).toBe(1);
      expect(res.body.data.solved_count).toBe(1);
      expect(res.body.data.completion_percentage).toBe(100);
      // Historical solved count includes unassigned Q2 (total 2)
      expect(res.body.data.historical_solved_count).toBe(2);
    });
  });

  describe('25.10 Standard Error Schema Validation', () => {
    test('Invalid request body returns 400 with standard error schema', async () => {
      const res = await request(app)
        .post('/api/v1/questions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Bad Difficulty Question',
          difficulty: 'super_hard', // invalid enum
          url: 'https://leetcode.com/problems/test/'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toContain('difficulty must be one of');
      expect(res.body.error.field).toBe('difficulty');
    });
  });
});
