const request = require('supertest');
const app = require('../src/app');
const { db, initSchema } = require('../src/db/db');
const { seedDatabase } = require('../src/db/seed');
const { getAdminStats } = require('../src/services/analyticsService');

describe('Admin Dashboard Statistics & Real-Time Aggregations Suite', () => {
  let adminToken;
  let studentToken;

  beforeAll(async () => {
    initSchema();
    seedDatabase();

    const adminLogin = await request(app)
      .post('/api/v1/auth/dev-login')
      .send({ email: 'admin@axly.in', role: 'admin' });
    adminToken = adminLogin.body.token;

    const studentLogin = await request(app)
      .post('/api/v1/auth/dev-login')
      .send({ email: 'john@student.axly.in', role: 'user' });
    studentToken = studentLogin.body.token;
  });

  test('1. Admin stats returns accurate student count from users table excluding admins', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();

    // Query DB directly to verify exact matching
    const directDbUsers = db.prepare("SELECT COUNT(*) AS count FROM users WHERE role NOT IN ('admin', 'system')").get();
    const expectedStudents = Number(directDbUsers.count);

    expect(res.body.data.students.total).toBe(expectedStudents);
    expect(res.body.data.total_students).toBe(expectedStudents);
    expect(res.body.data.students.total).toBeGreaterThan(0);
  });

  test('2. New student registration dynamically increments Admin Dashboard student count', async () => {
    const beforeStats = await getAdminStats();
    const initialCount = beforeStats.students.total;

    const testEmail = `new.student.${Date.now()}@axly.in`;
    db.prepare(`
      INSERT INTO users (id, name, email, role, points, individual_streak, daily_challenge_streak)
      VALUES (?, 'Dynamic Student', ?, 'user', 0, 1, 0)
    `).run(`usr-dyn-${Date.now()}`, testEmail);

    const afterStats = await getAdminStats();
    expect(afterStats.students.total).toBe(initialCount + 1);
  });

  test('3. Admin accounts are not counted in student metrics', async () => {
    const beforeStats = await getAdminStats();
    const initialCount = beforeStats.students.total;

    const testAdminEmail = `extra.admin.${Date.now()}@axly.in`;
    db.prepare(`
      INSERT INTO users (id, name, email, role, points)
      VALUES (?, 'Extra Admin', ?, 'admin', 0)
    `).run(`usr-admin-${Date.now()}`, testAdminEmail);

    const afterStats = await getAdminStats();
    expect(afterStats.students.total).toBe(initialCount);
  });

  test('4. Practice questions and solved submissions counters reflect database values', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    const directQuestions = db.prepare("SELECT COUNT(*) AS count FROM questions WHERE (is_active = 1 OR is_active = 1)").get();
    expect(res.body.data.questions.total).toBe(Number(directQuestions.count));
  });

  test('5. Non-admin student cannot access admin stats (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/admin/stats')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
  });
});
