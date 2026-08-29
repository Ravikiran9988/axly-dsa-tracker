process.env.NODE_ENV = 'test';
process.env.JWT_EXPIRES_IN = '30d';

const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../src/app');
const { initSchema } = require('../src/db/db');
const { getRepository } = require('../src/db/repositoryFactory');
const { generateToken, JWT_SECRET, JWT_EXPIRES_IN } = require('../src/middleware/auth');

const repo = getRepository();

describe('JWT Authentication & 30-Day Expiration Suite', () => {
  const adminId = 'usr-jwt-test-admin';
  const studentId = 'usr-jwt-test-student';
  let adminToken;
  let studentToken;

  beforeAll(async () => {
    initSchema();

    await repo.execute('DELETE FROM users WHERE id IN (?, ?)', [adminId, studentId]);

    await repo.execute(`
      INSERT INTO users (id, name, email, role, points, streak, longest_streak, email_verified)
      VALUES (?, ?, ?, 'admin', 500, 10, 15, 1),
             (?, ?, ?, 'user', 100, 3, 5, 1)
    `, [adminId, 'Admin JWT User', 'admin.jwt@axly.in', studentId, 'Student JWT User', 'student.jwt@axly.in']);

    adminToken = generateToken({ id: adminId, email: 'admin.jwt@axly.in', name: 'Admin JWT User', role: 'admin' });
    studentToken = generateToken({ id: studentId, email: 'student.jwt@axly.in', name: 'Student JWT User', role: 'user' });
  });

  test('1. JWT token payload expiration defaults to 30 days (2,592,000 seconds)', () => {
    const decoded = jwt.verify(studentToken, JWT_SECRET);
    expect(decoded.id).toBe(studentId);
    expect(decoded.email).toBe('student.jwt@axly.in');
    expect(decoded.role).toBe('user');

    const durationSeconds = decoded.exp - decoded.iat;
    // 30 days = 30 * 24 * 60 * 60 = 2592000 seconds
    expect(durationSeconds).toBe(30 * 24 * 60 * 60);
  });

  test('2. Authenticated API requests succeed with 30-day JWT token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/verify')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(studentId);
    expect(res.body.user.email).toBe('student.jwt@axly.in');
  });

  test('3. Role-based protection: Student token cannot access admin routes (403)', async () => {
    const res = await request(app)
      .get('/api/v1/admin/audit-logs')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
  });

  test('4. Role-based protection: Admin token successfully accesses admin routes (200)', async () => {
    const res = await request(app)
      .get('/api/v1/admin/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });

  test('5. Invalid or tampered token returns 401 UNAUTHORIZED', async () => {
    const tampered = studentToken.slice(0, -5) + 'abcde';
    const res = await request(app)
      .get('/api/v1/auth/verify')
      .set('Authorization', `Bearer ${tampered}`);

    expect(res.status).toBe(401);
  });
});
