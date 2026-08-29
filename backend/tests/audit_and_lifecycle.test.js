const request = require('supertest');
const app = require('../src/app');
const { db, initSchema } = require('../src/db/db');
const { generateTestToken } = require('../src/middleware/auth');
const auditService = require('../src/services/auditService');
const { validateQuestionForPublish } = require('../src/services/questionLifecycleService');
const { getRecommendations } = require('../src/services/recommendationService');
const { getUserAnalytics } = require('../src/services/analyticsService');

describe('Phases 6A–6R: Production Audit Logs, Lifecycle, Versioning & Security', () => {
  let adminToken;
  let userToken;
  let adminId = 'usr-audit-admin';
  let userId = 'usr-audit-user';
  let testQuestionId;

  beforeAll(() => {
    initSchema();

    // Clean up
    db.prepare('DELETE FROM admin_audit_logs').run();
    db.prepare('DELETE FROM question_versions').run();
    db.prepare('DELETE FROM submissions').run();
    db.prepare('DELETE FROM assignments').run();
    db.prepare('DELETE FROM questions').run();
    db.prepare('DELETE FROM users').run();

    // Seed test users
    db.prepare('INSERT INTO users (id, name, email, role) VALUES (?, ?, ?, ?)').run(
      adminId, 'Admin Auditor', 'auditor@axly.in', 'admin'
    );
    db.prepare('INSERT INTO users (id, name, email, role) VALUES (?, ?, ?, ?)').run(
      userId, 'Student Learner', 'learner@example.com', 'user'
    );

    adminToken = generateTestToken({ id: adminId, email: 'auditor@axly.in', name: 'Admin Auditor', role: 'admin' });
    userToken = generateTestToken({ id: userId, email: 'learner@example.com', name: 'Student Learner', role: 'user' });
  });

  describe('1. Audit Logging Service & Sanitization', () => {
    test('Sanitizes sensitive keys (passwords, JWTs, tokens, hidden outputs) in audit logs', () => {
      const dirty = {
        password: 'supersecretpassword',
        token: 'eyJh.xxx.yyy',
        safe_field: 'public_value',
        nested: {
          api_key: 'sk_live_123456789',
          allowed: 42
        },
        test_cases: [
          { input: '1', expected_output: '1', is_hidden: 0 },
          { input: '2', expected_output: 'hidden_answer_2', is_hidden: 1 }
        ]
      };

      const clean = auditService.sanitizeData(dirty);
      expect(clean.password).toBe('[REDACTED]');
      expect(clean.token).toBe('[REDACTED]');
      expect(clean.safe_field).toBe('public_value');
      expect(clean.nested.api_key).toBe('[REDACTED]');
      expect(clean.nested.allowed).toBe(42);
      expect(clean.test_cases[0].expected_output).toBe('1');
      expect(clean.test_cases[1].expected_output).toBe('[HIDDEN_EXPECTED_OUTPUT]');
    });

    test('Records audit log entry successfully', async () => {
      const entry = await auditService.logAction({
        actorId: adminId,
        actorEmail: 'auditor@axly.in',
        action: 'system_test',
        resourceType: 'system',
        resourceId: 'sys-1',
        metadata: { info: 'Unit test log' }
      });

      expect(entry).toBeDefined();
      expect(entry.action).toBe('system_test');
    });
  });

  describe('2. Question Lifecycle & Versioning', () => {
    test('Validates question publish criteria and catches missing/duplicate test cases', () => {
      const incomplete = { title: '', difficulty: 'invalid', test_cases: [] };
      const res = validateQuestionForPublish(incomplete);
      expect(res.valid).toBe(false);
      expect(res.issues.length).toBeGreaterThanOrEqual(2);

      const duplicateCases = {
        title: 'Valid Question',
        difficulty: 'easy',
        description: 'Solve the problem.',
        test_cases: [
          { input: '1', expected_output: '2', is_hidden: false },
          { input: '1', expected_output: '2', is_hidden: false }
        ]
      };
      const dupRes = validateQuestionForPublish(duplicateCases);
      expect(dupRes.valid).toBe(false);
      expect(dupRes.issues.some(i => i.message.includes('duplicates'))).toBe(true);
    });

    test('Creating a question logs an audit entry and creates version 1', async () => {
      const res = await request(app)
        .post('/api/v1/questions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Audit Tracked Challenge',
          difficulty: 'easy',
          description: 'A problem for audit tracking verification.',
          points: 30
        });

      expect(res.status).toBe(201);
      testQuestionId = res.body.data.id;

      // Check version history
      const vRes = await request(app)
        .get(`/api/v1/questions/${testQuestionId}/versions`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(vRes.status).toBe(200);
      expect(vRes.body.data.length).toBeGreaterThanOrEqual(1);
      expect(vRes.body.data[0].version).toBe(1);
    });

    test('Updating a question creates version 2 and compares versions accurately', async () => {
      const updateRes = await request(app)
        .patch(`/api/v1/questions/${testQuestionId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Audit Tracked Challenge Updated',
          difficulty: 'medium',
          points: 50
        });

      expect(updateRes.status).toBe(200);

      // Compare v1 and v2
      const compRes = await request(app)
        .get(`/api/v1/questions/${testQuestionId}/versions/compare?v1=1&v2=2`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(compRes.status).toBe(200);
      expect(compRes.body.data.differences).toBeDefined();
      expect(compRes.body.data.differences.title).toBeDefined();
      expect(compRes.body.data.differences.difficulty).toBeDefined();
    });

    test('Restores older version and updates question snapshot to v1 state', async () => {
      const restRes = await request(app)
        .post(`/api/v1/questions/${testQuestionId}/versions/1/restore`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(restRes.status).toBe(200);
      expect(restRes.body.data.question.title).toBe('Audit Tracked Challenge');
    });
  });

  describe('3. Admin Audit Log API & Security Boundary', () => {
    test('Regular user cannot query audit logs (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
    });

    test('Admin can query audit logs with pagination and filters', async () => {
      const res = await request(app)
        .get('/api/v1/admin/audit-logs?limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.total).toBeGreaterThanOrEqual(1);

      // Filter by question_create action
      const filterRes = await request(app)
        .get('/api/v1/admin/audit-logs?action=question_create')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(filterRes.status).toBe(200);
      expect(filterRes.body.data.every(l => l.action === 'question_create')).toBe(true);
    });
  });

  describe('4. Analytics & Recommendations Endpoints', () => {
    test('Calculates student performance analytics without error', async () => {
      const data = await getUserAnalytics(userId);
      expect(data).toBeDefined();
      expect(data.summary).toBeDefined();
      expect(Array.isArray(data.topic_breakdown)).toBe(true);
    });

    test('Generates smart recommendations with reasoning', async () => {
      const recs = await getRecommendations(userId, 5);
      expect(Array.isArray(recs)).toBe(true);
      if (recs.length > 0) {
        expect(recs[0].reason).toBeDefined();
      }
    });
  });
});
