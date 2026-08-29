const crypto = require('crypto');
const request = require('supertest');
const app = require('../src/app');
const { db, initSchema } = require('../src/db/db');
const { generateTestToken } = require('../src/middleware/auth');
const { getLatestSentEmail, clearMailLog, SMTP_FROM } = require('../src/services/emailService');

function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

describe('Axly DSA Tracker — End-to-End Registration & OTP Verification Suite', () => {
  const adminEmail = 'admin.oauth@axly.in';
  const studentEmail = 'student.oauth@axly.in';
  let userToken;
  let adminToken;

  beforeAll(() => {
    initSchema();
    process.env.ADMIN_EMAIL = adminEmail;

    // Clean up test accounts
    db.prepare('DELETE FROM users WHERE email IN (?, ?, ?, ?, ?)').run(
      adminEmail,
      studentEmail,
      'signup.user@example.com',
      'verify.test@example.com',
      'e2e.otp.user@axly.in'
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

  beforeEach(() => {
    clearMailLog();
  });

  describe('1. Full Registration, OTP Generation & Delivery Flow', () => {
    const testRegEmail = 'e2e.otp.user@axly.in';
    let receivedOtp;

    test('1. Registration submits form, creates unverified user, and sends 6-digit OTP from Axly <noreply@axly.in>', async () => {
      const res = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          name: 'Priya Sharma',
          email: testRegEmail,
          password: 'Password123'
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toContain('6-digit verification code');

      // Verify user created with email_verified = 0
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(testRegEmail);
      expect(user).toBeDefined();
      expect(user.name).toBe('Priya Sharma');
      expect(user.email_verified).toBe(0);

      // Verify email was dispatched from Axly <noreply@axly.in>
      const sentEmail = getLatestSentEmail(testRegEmail);
      expect(sentEmail).toBeDefined();
      expect(sentEmail.from).toBe(SMTP_FROM);
      expect(sentEmail.to).toBe(testRegEmail);
      expect(sentEmail.subject).toBe('Your Axly Verification Code');

      // Extract 6-digit OTP from email
      const match = sentEmail.text.match(/\b\d{6}\b/) || sentEmail.html.match(/class="otp-code">(\d{6})</);
      expect(match).toBeTruthy();
      receivedOtp = match[1] || match[0];
      expect(receivedOtp).toHaveLength(6);
    });

    test('2. Submitting an incorrect OTP fails and blocks registration with clear error message', async () => {
      const res = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          email: testRegEmail,
          otp: '999999' // deliberately wrong OTP
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_OTP');
      expect(res.body.error.message).toContain('Invalid verification code');

      // Verify user is still unverified
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(testRegEmail);
      expect(user.email_verified).toBe(0);
    });

    test('3. Submitting an expired OTP fails with EXPIRED_OTP error', async () => {
      // Seed an expired OTP token in DB
      const expiredOtp = '777777';
      const expiredHash = hashToken(expiredOtp);
      const user = db.prepare('SELECT id FROM users WHERE email = ?').get(testRegEmail);

      db.prepare(`
        INSERT INTO auth_tokens (id, user_id, token_hash, token_type, expires_at)
        VALUES ('tok-exp-otp', ?, ?, 'otp_verification', datetime('now', '-15 minutes'))
      `).run(user.id, expiredHash);

      const res = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          email: testRegEmail,
          otp: expiredOtp
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('EXPIRED_OTP');
      expect(res.body.error.message).toContain('expired');
    });

    test('4. Resend OTP invalidates the previous OTP and sends a fresh 6-digit OTP', async () => {
      // Clear mail log before resending
      clearMailLog();

      const resendRes = await request(app)
        .post('/api/v1/auth/resend-otp')
        .send({ email: testRegEmail });

      expect(resendRes.status).toBe(200);

      // Verify newly sent email
      const newEmail = getLatestSentEmail(testRegEmail);
      expect(newEmail).toBeDefined();
      expect(newEmail.from).toBe(SMTP_FROM);

      const newMatch = newEmail.text.match(/\b\d{6}\b/) || newEmail.html.match(/class="otp-code">(\d{6})</);
      const newOtp = newMatch[1] || newMatch[0];
      expect(newOtp).toHaveLength(6);

      // 1. Verify OLD OTP no longer works (invalidated!)
      const oldOtpRes = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          email: testRegEmail,
          otp: receivedOtp
        });
      expect(oldOtpRes.status).toBe(400);
      expect(oldOtpRes.body.error.code).toBe('INVALID_OTP');

      // 2. Verify NEW OTP succeeds and confirms registration!
      const newOtpRes = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          email: testRegEmail,
          otp: newOtp
        });

      expect(newOtpRes.status).toBe(200);
      expect(newOtpRes.body.token).toBeDefined();
      expect(newOtpRes.body.user.email).toBe(testRegEmail);

      // Verify user is now verified in DB
      const verifiedUser = db.prepare('SELECT * FROM users WHERE email = ?').get(testRegEmail);
      expect(verifiedUser.email_verified).toBe(1);

      // Verify subsequent use of the new OTP fails (single-use)
      const reuseRes = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          email: testRegEmail,
          otp: newOtp
        });
      expect(reuseRes.status).toBe(400);
    });

    test('5. Verified user can now log in normally with email and password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testRegEmail,
          password: 'Password123'
        });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.name).toBe('Priya Sharma');
    });
  });

  describe('2. Signup Validation & Edge Cases', () => {
    test('6. Duplicate email signup returns 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          name: 'Duplicate Tester',
          email: 'e2e.otp.user@axly.in',
          password: 'Password123'
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('EMAIL_EXISTS');
    });

    test('7. Invalid email format returns 400 Validation Error', async () => {
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

    test('8. Weak password returns 400 WEAK_PASSWORD', async () => {
      const res = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          name: 'Weak Pass',
          email: 'weak@example.com',
          password: 'short'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('WEAK_PASSWORD');
    });
  });

  describe('3. Forgot & Reset Password Flow', () => {
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
      db.prepare('DELETE FROM auth_tokens WHERE user_id = ? OR id = ? OR token_hash = ?').run('usr-reset-1', 'tok-rst-1', resetHash);
      db.prepare(`
        INSERT INTO auth_tokens (id, user_id, token_hash, token_type, expires_at)
        VALUES ('tok-rst-1', 'usr-reset-1', ?, 'password_reset', datetime('now', '+1 hour'))
      `).run(resetHash);
    });

    test('9. Forgot password returns safe message preventing email enumeration', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'reset.user@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('If an account exists');
    });

    test('10. Successful password reset updates password and allows login', async () => {
      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: resetRawToken,
          password: 'BrandNewPass999'
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Password has been reset successfully');

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'reset.user@example.com',
          password: 'BrandNewPass999'
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.token).toBeDefined();
    });
  });

  describe('4. Session & Role Protection', () => {
    test('11. Student session verified via /api/v1/auth/verify', async () => {
      const res = await request(app)
        .get('/api/v1/auth/verify')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(studentEmail);
      expect(res.body.user.role).toBe('user');
    });

    test('12. Student cannot access admin audit logs', async () => {
      const res = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
    });

    test('13. Admin can access admin audit logs', async () => {
      const res = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });
  });
});
