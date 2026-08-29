const request = require('supertest');
const app = require('../src/app');
const { db, initSchema } = require('../src/db/db');
const { seedDatabase } = require('../src/db/seed');
const { generateTestToken } = require('../src/middleware/auth');
const { calculateScore } = require('../src/services/scoringService');
const { getCompetitiveLeaders } = require('../src/services/leaderboardService');
const { getRepository } = require('../src/db/repositoryFactory');
const { v4: uuidv4 } = require('uuid');

describe('Phase 4: Comprehensive PostgreSQL/Runtime Parity & Production Verification', () => {
  let adminUser;
  let studentUser;
  let secondStudentUser;
  let adminToken;
  let studentToken;
  let secondStudentToken;
  const repo = getRepository();

  beforeAll(async () => {
    initSchema();
    seedDatabase();

    adminUser = { id: 'usr-admin-p4', name: 'Phase 4 Admin', email: 'admin-p4@axly.in', role: 'admin' };
    studentUser = { id: 'usr-student-p4', name: 'Phase 4 Student Alpha', email: 'student-alpha-p4@example.com', role: 'user' };
    secondStudentUser = { id: 'usr-student-p4-2', name: 'Phase 4 Student Beta', email: 'student-beta-p4@example.com', role: 'user' };

    await repo.execute(
      'INSERT INTO users (id, name, email, role, points, streak, longest_streak) VALUES (?, ?, ?, ?, 0, 0, 0) ON CONFLICT(id) DO UPDATE SET role = EXCLUDED.role',
      [adminUser.id, adminUser.name, adminUser.email, adminUser.role]
    );
    await repo.execute(
      'INSERT INTO users (id, name, email, role, points, streak, longest_streak) VALUES (?, ?, ?, ?, 0, 0, 0) ON CONFLICT(id) DO UPDATE SET role = EXCLUDED.role',
      [studentUser.id, studentUser.name, studentUser.email, studentUser.role]
    );
    await repo.execute(
      'INSERT INTO users (id, name, email, role, points, streak, longest_streak) VALUES (?, ?, ?, ?, 0, 0, 0) ON CONFLICT(id) DO UPDATE SET role = EXCLUDED.role',
      [secondStudentUser.id, secondStudentUser.name, secondStudentUser.email, secondStudentUser.role]
    );

    adminToken = generateTestToken(adminUser);
    studentToken = generateTestToken(studentUser);
    secondStudentToken = generateTestToken(secondStudentUser);
  });

  describe('1. Auth & RBAC Boundaries', () => {
    it('Unauthenticated requests are rejected with 401 UNAUTHORIZED', async () => {
      const res = await request(app).get('/api/v1/questions');
      expect(res.status).toBe(401);
      expect(res.body.error?.code).toBe('UNAUTHORIZED');
    });

    it('Student cannot access admin-only endpoints', async () => {
      const res = await request(app)
        .post('/api/v1/questions')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ title: 'Unauthorized', difficulty: 'easy' });
      expect(res.status).toBe(403);
    });

    it('Authenticated session resolves user profile and role', async () => {
      const res = await request(app)
        .get('/api/v1/auth/verify')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      expect(res.body.user.id).toBe(studentUser.id);
      expect(res.body.user.role).toBe('user');
    });
  });

  describe('2. Questions CRUD, Versioning & Hidden Test Case Privacy', () => {
    let createdQuestionId;

    it('Admin creates question with public and hidden test cases in transaction', async () => {
      const res = await request(app)
        .post('/api/v1/questions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: `Unique Dynamic Problem ${Date.now()}`,
          difficulty: 'medium',
          description: 'Calculate factorial recursively.',
          points: 30,
          test_cases: [
            { input: '3', expected_output: '6', is_hidden: false },
            { input: '5', expected_output: '120', is_hidden: true }
          ]
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      createdQuestionId = res.body.data.id;
      expect(res.body.data.test_cases.length).toBe(2);
    });

    it('Student fetching question details receives only visible test cases (hidden cases masked)', async () => {
      const res = await request(app)
        .get(`/api/v1/questions/${createdQuestionId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.test_cases.length).toBe(1);
      expect(res.body.data.test_cases.some(tc => tc.is_hidden)).toBe(false);
    });

    it('Admin fetching question details sees all test cases including hidden', async () => {
      const res = await request(app)
        .get(`/api/v1/questions/${createdQuestionId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.test_cases.length).toBe(2);
      expect(res.body.data.test_cases.some(tc => tc.is_hidden)).toBe(true);
    });

    it('Duplicate title creation is rejected with 409 CONFLICT', async () => {
      const existing = await repo.one('SELECT title FROM questions WHERE id = ?', [createdQuestionId]);
      const res = await request(app)
        .post('/api/v1/questions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: existing.title,
          difficulty: 'easy'
        });

      expect(res.status).toBe(409);
    });

    it('Admin updates question and generates a new immutable version snapshot', async () => {
      const res = await request(app)
        .put(`/api/v1/questions/${createdQuestionId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Updated factorial description with new constraints.',
          points: 35
        });

      expect(res.status).toBe(200);
      expect(res.body.data.description).toContain('Updated factorial description');

      // Check versions endpoint
      const vRes = await request(app)
        .get(`/api/v1/questions/${createdQuestionId}/versions`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(vRes.status).toBe(200);
      expect(Array.isArray(vRes.body.data)).toBe(true);
      expect(vRes.body.data.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('3. Daily Challenge & Midnight Rule Verification', () => {
    let dailyQId;
    const testDate = '2026-08-15';

    beforeAll(async () => {
      const q = await repo.one('SELECT id FROM questions WHERE (is_active = 1 OR is_active = TRUE) LIMIT 1');
      dailyQId = q.id;
      await request(app)
        .post('/api/v1/daily-question')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ question_id: dailyQId, date: testDate });
    });

    it('Returns same Daily Challenge for all students on a given UTC date', async () => {
      const resAdmin = await request(app)
        .get(`/api/v1/daily-question?date=${testDate}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resAdmin.status).toBe(200);
      expect(resAdmin.body.data.id).toBe(dailyQId);
      expect(resAdmin.body.data.points).toBe(100);
    });

    it('Midnight Rule: Solution started before midnight UTC is evaluated against started challenge and awards daily solve', async () => {
      const startedAt = `${testDate}T23:55:00Z`; // 5 mins before UTC midnight
      const nowIso = new Date().toISOString();

      await repo.execute(`
        INSERT INTO submissions (id, user_id, question_id, status, started_at, attempted_at, created_at, updated_at)
        VALUES (?, ?, ?, 'attempted', ?, ?, ?, ?)
        ON CONFLICT(user_id, question_id) DO UPDATE SET started_at = EXCLUDED.started_at, status = 'attempted'
      `, [uuidv4(), studentUser.id, dailyQId, startedAt, startedAt, nowIso, nowIso]);

      const submissionService = require('../src/services/submissionService');
      const updated = await submissionService.updateSubmission({
        user_id: studentUser.id,
        question_id: dailyQId,
        status: 'solved'
      });

      expect(updated.status).toBe('solved');

      const user = await repo.one('SELECT points, streak FROM users WHERE id = ?', [studentUser.id]);
      expect(Number(user.points)).toBeGreaterThanOrEqual(100);
      expect(Number(user.streak)).toBeGreaterThanOrEqual(1);
    });
  });

  describe('4. Practice Problem Lifecycle (No Competitive Points)', () => {
    let practiceQuestionId;

    beforeAll(async () => {
      const p = await repo.one('SELECT id FROM questions WHERE (is_practice = 1 OR is_practice = TRUE) AND (is_active = 1 OR is_active = TRUE) LIMIT 1');
      practiceQuestionId = p?.id || 'practice-test-q';
      if (!p) {
        await repo.execute(`
          INSERT INTO questions (id, title, difficulty, is_practice, is_active, status, url)
          VALUES (?, 'Practice Array Sum', 'easy', 1, 1, 'published', 'https://example.com/practice-test')
        `, [practiceQuestionId]);
      }
    });

    it('Student starts a practice problem -> state is in_progress', async () => {
      const res = await request(app)
        .post(`/api/v1/practice/${practiceQuestionId}/start`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.practice_status).toBe('in_progress');
    });

    it('Student abandons problem -> status becomes abandoned (excluded from in_progress)', async () => {
      const res = await request(app)
        .post(`/api/v1/practice/${practiceQuestionId}/abandon`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.practice_status).toBe('abandoned');

      // Check practice progress
      const progRes = await request(app)
        .get('/api/v1/practice/progress')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(progRes.status).toBe(200);
      expect(progRes.body.data.abandoned).toBeGreaterThanOrEqual(1);
    });

    it('Solving practice problem updates practice progress but awards 0 competitive leaderboard points', async () => {
      const userBefore = await repo.one('SELECT points FROM users WHERE id = ?', [studentUser.id]);
      const initialPoints = Number(userBefore.points || 0);

      const res = await request(app)
        .post(`/api/v1/practice/${practiceQuestionId}/submission`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ passed: true });

      expect(res.status).toBe(200);
      expect(res.body.data.practice_status).toBe('solved');

      const userAfter = await repo.one('SELECT points FROM users WHERE id = ?', [studentUser.id]);
      expect(Number(userAfter.points)).toBe(initialPoints); // No competitive points awarded for practice!
    });
  });

  describe('5. Canonical Scoring & Deterministic Leaderboards', () => {
    it('Canonical score calculation awards full points for fast 1st attempt and penalizes failed attempts', () => {
      const fastScore = calculateScore({
        passedTests: 10,
        totalTests: 10,
        durationSeconds: 120,
        attempts: 1,
        estimatedTime: '30 mins'
      });
      expect(fastScore.final_score).toBe(100);

      const penalizedScore = calculateScore({
        passedTests: 8,
        totalTests: 10,
        durationSeconds: 3600,
        attempts: 3,
        estimatedTime: '30 mins'
      });
      expect(penalizedScore.final_score).toBeLessThan(70);
      expect(penalizedScore.test_score).toBe(48);
    });

    it('Leaderboard ordering is deterministic and centralized in leaderboardService', async () => {
      const leadersAll = await getCompetitiveLeaders(10, 'all');
      expect(Array.isArray(leadersAll)).toBe(true);
      if (leadersAll.length > 1) {
        expect(leadersAll[0].points).toBeGreaterThanOrEqual(leadersAll[1].points);
      }

      const leadersWeekly = await getCompetitiveLeaders(10, 'weekly');
      expect(Array.isArray(leadersWeekly)).toBe(true);
      expect(leadersWeekly[0]?.period).toBe('weekly');
    });
  });

  describe('6. Admin Review & Score Override Audit Trail', () => {
    let subId;

    beforeAll(async () => {
      const q = await repo.one('SELECT id FROM questions LIMIT 1');
      subId = uuidv4();
      await repo.execute(`
        INSERT INTO submissions (id, user_id, question_id, status, final_score, created_at, updated_at)
        VALUES (?, ?, ?, 'attempted', 65, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [subId, studentUser.id, q.id]);
    });

    it('Admin can review submission and manually override score with mandatory audit logging', async () => {
      const res = await request(app)
        .post(`/api/v1/submissions/${subId}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          review_status: 'approved',
          manual_score: 95,
          manual_feedback: 'Excellent edge case handling in resubmission.',
          feedback: 'Approved'
        });

      expect(res.status).toBe(200);
      expect(Number(res.body.data.final_score)).toBe(95);

      // Verify audit trail entry was recorded
      const audit = await repo.one(
        'SELECT * FROM submission_score_audit WHERE submission_id = ? ORDER BY created_at DESC LIMIT 1',
        [subId]
      );
      expect(audit).toBeDefined();
      expect(Number(audit.previous_score)).toBe(65);
      expect(Number(audit.new_score)).toBe(95);
      expect(audit.reviewer_id).toBe(adminUser.id);
    });
  });

  describe('7. Notifications & Unread State', () => {
    it('Lists notifications and updates read/unread status', async () => {
      const notifId = uuidv4();
      await repo.execute(`
        INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at)
        VALUES (?, ?, 'Daily Reminder', 'Solve today challenge', 'general', 0, CURRENT_TIMESTAMP)
      `, [notifId, studentUser.id]);

      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.unreadCount).toBeGreaterThanOrEqual(1);

      const markRes = await request(app)
        .patch(`/api/v1/notifications/${notifId}/read`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(markRes.status).toBe(200);
    });
  });

  describe('8. Repository Layer Transaction Rollback Parity', () => {
    it('Rolls back all changes if an error occurs inside a transaction', async () => {
      const testId = `rollback-test-${Date.now()}`;
      try {
        await repo.transaction(async tx => {
          await tx.execute(
            'INSERT INTO topics (id, name) VALUES (?, ?)',
            [testId, `Rollback Topic ${Date.now()}`]
          );
          throw new Error('Intentional transaction test rollback');
        });
      } catch (err) {
        expect(err.message).toContain('rollback');
      }

      const check = await repo.one('SELECT id FROM topics WHERE id = ?', [testId]);
      expect(check).toBeNull();
    });
  });
});
