const crypto = require('crypto');
const request = require('supertest');
const app = require('../src/app');
const { db, initSchema } = require('../src/db/db');
const { generateTestToken } = require('../src/middleware/auth');

function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

describe('Authentication & Security Suite (Email/Password, Tokens & OAuth)', () => {
  const adminEmail = 'admin.oauth@axly.in';
  const studentEmail = 'student.oauth@axly.in';
  let userToken;
  let adminToken;

  beforeAll(() => {
    initSchema();
    process.env.ADMIN_EMAIL = adminEmail;

    // Seed test accounts
    db.prepare('DELETE FROM users WHERE email IN (?, ?, ?, ?)').run(
      adminEmail,
      studentEmail,
      'signup.user@example.com',
      'verify.test@example.com'
    );

    db.prepare(`
      INSERT INTO users (id, name, email, role, points, streak, longest_streak, email_verified)
      VALUES (?, ?, ?, 'admin', 500, 10, 15, 1)
    `).run('usr-admin-oauth', 'Admin OAuth User', adminEmail);

    db.prepare(`
      INSERT INTO users (id, name, email, role, points, streak, longest_streak, email_verified)
      VALUES (?, ?, ?, 'user', 120, 3, 5, 1)
    `).run('usr-student-oauth', 'Student OAuth User', studentEmail);

    adminToken = generateTestToken({ id: 'usr-admin-oauth', email: adminEmail, name: 'Admin OAuth User', role: 'admin' });
    userToken = generateTestToken({ id: 'usr-student-oauth', email: studentEmail, name: 'Student OAuth User', role: 'user' });
  });

  describe('1. Signup & Validation Flow', () => {
    test('1. Successful signup creates unverified user and returns 201', async () => {
      const res = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          name: 'Signup Tester',
          email: 'signup.user@example.com',
          password: 'Password123'
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toContain('Account created successfully');

      // Verify in DB that email_verified is 0 (unverified)
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get('signup.user@example.com');
      expect(user).toBeDefined();
      expect(user.email_verified).toBe(0);
      expect(user.password_hash).toBeDefined();
    });

    test('2. Duplicate email signup returns 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          name: 'Duplicate Tester',
          email: 'signup.user@example.com',
          password: 'Password123'
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('EMAIL_EXISTS');
    });

    test('3. Invalid email format returns 400 Validation Error', async () => {
      const res = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          name: 'Invalid Email',
          email: 'not-an-email',
          password: 'Password123'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('4. Weak password (<8 chars or no numbers/uppercase) returns 400', async () => {
      const res = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          name: 'Weak Pass',
          email: 'weakpass@example.com',
          password: 'short'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('WEAK_PASSWORD');
    });
  });

  describe('2. Email Verification Flow', () => {
    let rawToken;

    beforeEach(() => {
      // Seed an unverified user with verification token
      db.prepare('DELETE FROM users WHERE email = ?').run('verify.test@example.com');
      db.prepare(`
        INSERT INTO users (id, name, email, role, password_hash, email_verified)
        VALUES ('usr-verify-test', 'Verify Tester', 'verify.test@example.com', 'user', 'fakehash', 0)
      `).run();

      rawToken = 'test-raw-token-1234567890abcdef1234567890';
      const tokenHash = hashToken(rawToken);
      db.prepare(`
        INSERT INTO auth_tokens (id, user_id, token_hash, token_type, expires_at)
        VALUES ('tok-v1', 'usr-verify-test', ?, 'verification', datetime('now', '+1 day'))
      `).run(tokenHash);
    });

    test('5. Unverified user login returns 403 UNVERIFIED_EMAIL', async () => {
      // Set real bcrypt password for verify.test@example.com
      const bcrypt = require('bcryptjs');
      const hash = bcrypt.hashSync('Password123', 10);
      db.prepare('UPDATE users SET password_hash = ? WHERE email = ?').run(hash, 'verify.test@example.com');

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'verify.test@example.com',
          password: 'Password123'
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('UNVERIFIED_EMAIL');
    });

    test('6. Successful email verification with valid token activates account', async () => {
      const res = await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ token: rawToken });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();

      const user = db.prepare('SELECT * FROM users WHERE email = ?').get('verify.test@example.com');
      expect(user.email_verified).toBe(1);

      // Verify token marked used
      const tok = db.prepare('SELECT * FROM auth_tokens WHERE id = ?').get('tok-v1');
      expect(tok.used_at).not.toBeNull();
    });

    test('7. Verification with already used or invalid token returns 400', async () => {
      // First use
      await request(app).post('/api/v1/auth/verify-email').send({ token: rawToken });
      // Second use
      const res = await request(app).post('/api/v1/auth/verify-email').send({ token: rawToken });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_OR_EXPIRED_TOKEN');
    });

    test('8. Verification with expired token returns 400 EXPIRED_TOKEN', async () => {
      const expiredRaw = 'expired-raw-token-123';
      const expiredHash = hashToken(expiredRaw);
      db.prepare(`
        INSERT INTO auth_tokens (id, user_id, token_hash, token_type, expires_at)
        VALUES ('tok-exp', 'usr-verify-test', ?, 'verification', datetime('now', '-1 hour'))
      `).run(expiredHash);

      const res = await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ token: expiredRaw });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('EXPIRED_TOKEN');
    });

    test('9. Resend verification generates new token for unverified user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/resend-verification')
        .send({ email: 'verify.test@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('If an unverified account exists');
    });
  });

  describe('3. Login & Authentication Flow', () => {
    beforeAll(() => {
      const bcrypt = require('bcryptjs');
      const hash = bcrypt.hashSync('StrongPass123', 10);
      db.prepare('DELETE FROM users WHERE email = ?').run('active.user@example.com');
      db.prepare(`
        INSERT INTO users (id, name, email, role, password_hash, email_verified)
        VALUES ('usr-active-1', 'Active User', 'active.user@example.com', 'user', ?, 1)
      `).run(hash);
    });

    test('10. Successful email + password login returns JWT token and user profile', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'active.user@example.com',
          password: 'StrongPass123'
        });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('active.user@example.com');
      expect(res.body.user.password_hash).toBeUndefined(); // no password leaked
    });

    test('11. Wrong password returns generic 401 INVALID_CREDENTIALS', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'active.user@example.com',
          password: 'WrongPassword999'
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    test('12. Non-existent email returns generic 401 INVALID_CREDENTIALS', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nobody@example.com',
          password: 'StrongPass123'
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('4. Forgot & Reset Password Flow', () => {
    let resetRawToken;

    beforeEach(() => {
      const bcrypt = require('bcryptjs');
      const hash = bcrypt.hashSync('InitialPass123', 10);
      db.prepare('DELETE FROM users WHERE email = ?').run('reset.user@example.com');
      db.prepare(`
        INSERT INTO users (id, name, email, role, password_hash, email_verified)
        VALUES ('usr-reset-1', 'Reset User', 'reset.user@example.com', 'user', ?, 1)
      `).run(hash);

      resetRawToken = 'raw-reset-token-xyz987';
      const resetHash = hashToken(resetRawToken);
      db.prepare(`
        INSERT INTO auth_tokens (id, user_id, token_hash, token_type, expires_at)
        VALUES ('tok-rst-1', 'usr-reset-1', ?, 'password_reset', datetime('now', '+1 hour'))
      `).run(resetHash);
    });

    test('13. Forgot password returns safe message preventing email enumeration', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'reset.user@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('If an account exists');
    });

    test('14. Successful password reset updates password and allows login with new password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: resetRawToken,
          password: 'BrandNewPass999'
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Password has been reset successfully');

      // Now verify new password logs in
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'reset.user@example.com',
          password: 'BrandNewPass999'
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.token).toBeDefined();
    });

    test('15. Reset password with invalid token returns 400', async () => {
      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: 'totally-invalid-token',
          password: 'BrandNewPass999'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_OR_EXPIRED_TOKEN');
    });
  });

  describe('5. Session Verification & Protected Routes', () => {
    test('16. GET /api/v1/auth/verify returns 200 for authenticated session', async () => {
      const res = await request(app)
        .get('/api/v1/auth/verify')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(studentEmail);
      expect(res.body.user.role).toBe('user');
    });

    test('17. Student cannot access admin audit logs', async () => {
      const res = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
    });

    test('18. Admin can access admin audit logs', async () => {
      const res = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });
  });
});
