const request = require('supertest');
const app = require('../src/app');
const { db, initSchema } = require('../src/db/db');
const { generateTestToken } = require('../src/middleware/auth');

describe('Authentication Flow & Verification API (GET / POST /api/v1/auth/verify)', () => {
  let userToken;
  let adminToken;
  const adminEmail = 'admin.oauth@axly.in';
  const studentEmail = 'student.oauth@axly.in';

  beforeAll(() => {
    initSchema();
    process.env.ADMIN_EMAIL = adminEmail;

    // Seed test accounts
    db.prepare('DELETE FROM users WHERE email IN (?, ?)').run(adminEmail, studentEmail);

    db.prepare(`
      INSERT INTO users (id, name, email, role, points, streak, longest_streak)
      VALUES (?, ?, ?, 'admin', 500, 10, 15)
    `).run('usr-admin-oauth', 'Admin OAuth User', adminEmail);

    db.prepare(`
      INSERT INTO users (id, name, email, role, points, streak, longest_streak)
      VALUES (?, ?, ?, 'user', 120, 3, 5)
    `).run('usr-student-oauth', 'Student OAuth User', studentEmail);

    adminToken = generateTestToken({ id: 'usr-admin-oauth', email: adminEmail, name: 'Admin OAuth User', role: 'admin' });
    userToken = generateTestToken({ id: 'usr-student-oauth', email: studentEmail, name: 'Student OAuth User', role: 'user' });
  });

  describe('1. Endpoint Accessibility & HTTP Methods', () => {
    test('GET /api/v1/auth/verify returns 200 and user profile for valid session', async () => {
      const res = await request(app)
        .get('/api/v1/auth/verify')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(studentEmail);
      expect(res.body.user.role).toBe('user');
      expect(res.body.user.points).toBe(120);
    });

    test('POST /api/v1/auth/verify also returns 200 and user profile', async () => {
      const res = await request(app)
        .post('/api/v1/auth/verify')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(adminEmail);
      expect(res.body.user.role).toBe('admin');
      expect(res.body.user.points).toBe(500);
    });
  });

  describe('2. Unauthenticated & Malformed Request Handling', () => {
    test('GET /api/v1/auth/verify returns 401 when Authorization header is missing', async () => {
      const res = await request(app)
        .get('/api/v1/auth/verify');

      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    test('GET /api/v1/auth/verify returns 401 when token is invalid or malformed', async () => {
      const res = await request(app)
        .get('/api/v1/auth/verify')
        .set('Authorization', 'Bearer invalid-token-string-xyz');

      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    test('GET /api/v1/auth/verify returns 401 when Bearer prefix is missing', async () => {
      const res = await request(app)
        .get('/api/v1/auth/verify')
        .set('Authorization', `Basic ${userToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('3. User Auto-Provisioning & Admin Bootstrap', () => {
    test('Auto-provisions a new student user if not previously stored', async () => {
      const newEmail = 'newstudent@axly.in';
      const newToken = generateTestToken({ id: 'usr-new-123', email: newEmail, name: 'Brand New Learner' });

      const res = await request(app)
        .get('/api/v1/auth/verify')
        .set('Authorization', `Bearer ${newToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(newEmail);
      expect(res.body.user.role).toBe('user');

      // Verify row exists in DB
      const dbUser = db.prepare('SELECT * FROM users WHERE email = ?').get(newEmail);
      expect(dbUser).toBeDefined();
      expect(dbUser.role).toBe('user');
    });

    test('Grants admin role if email matches ADMIN_EMAIL', async () => {
      const bootstrapAdminEmail = 'bootstrap.root@axly.in';
      process.env.ADMIN_EMAIL = bootstrapAdminEmail;
      const rootToken = generateTestToken({ id: 'usr-root-123', email: bootstrapAdminEmail, name: 'Root Admin' });

      const res = await request(app)
        .get('/api/v1/auth/verify')
        .set('Authorization', `Bearer ${rootToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(bootstrapAdminEmail);
      expect(res.body.user.role).toBe('admin');
    });
  });

  describe('4. Protected API Access & Dev Login', () => {
    test('Protected route /api/v1/questions is accessible with valid token', async () => {
      const res = await request(app)
        .get('/api/v1/questions')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('POST /api/v1/auth/dev-login generates valid token in development mode', async () => {
      const res = await request(app)
        .post('/api/v1/auth/dev-login')
        .send({ email: 'dev.tester@axly.in', role: 'user' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('dev.tester@axly.in');

      // Check token works on verify endpoint
      const verifyRes = await request(app)
        .get('/api/v1/auth/verify')
        .set('Authorization', `Bearer ${res.body.token}`);

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.user.email).toBe('dev.tester@axly.in');
    });
  });
});
