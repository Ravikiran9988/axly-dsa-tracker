process.env.JWT_SECRET = 'axly-dsa-tracker-dev-secret-key-32-chars-minimum';
const request = require('supertest');
const app = require('../src/app');
const { getRepository } = require('../src/db/repositoryFactory');
const jwt = require('jsonwebtoken');

const adminToken = jwt.sign({ id: 'usr-admin-delete-test', role: 'admin' }, process.env.JWT_SECRET);
const userToken = jwt.sign({ id: 'usr-student-delete-test', role: 'user' }, process.env.JWT_SECRET);

describe('Admin Student Deletion', () => {
  let repo;

  beforeAll(async () => {
    repo = getRepository();
    // Setup test accounts
    await repo.execute("INSERT OR IGNORE INTO users (id, email, name, role) VALUES ('usr-admin-delete-test', 'admin.del@axly.local', 'Admin', 'admin')");
    await repo.execute("INSERT OR IGNORE INTO users (id, email, name, role) VALUES ('usr-student-delete-test', 'student.del@axly.local', 'Student', 'user')");
    await repo.execute("UPDATE users SET role = 'admin' WHERE id = 'usr-admin-delete-test'");
    await repo.execute("UPDATE users SET role = 'user' WHERE id = 'usr-student-delete-test'");
  });

  afterAll(async () => {
    await repo.execute("DELETE FROM users WHERE id IN ('usr-admin-delete-test', 'usr-student-delete-test')");
  });

  beforeEach(async () => {
    // Recreate a clean target student before each test to ensure tests are isolated
    await repo.execute("DELETE FROM users WHERE id = 'usr-target-del'");
    await repo.execute("INSERT INTO users (id, email, name, role) VALUES ('usr-target-del', 'target.del@axly.local', 'Target', 'user')");
  });

  afterEach(async () => {
    await repo.execute("DELETE FROM users WHERE id = 'usr-target-del'");
  });

  test('1. Admin can successfully delete a student', async () => {
    // Create some dependent data to verify CASCADE/SET NULL works
    await repo.execute(`
      INSERT INTO submissions (id, user_id, question_id, status) 
      VALUES ('sub-target-1', 'usr-target-del', 'q-1', 'attempted')
    `);

    const res = await request(app)
      .delete('/api/v1/users/usr-target-del')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-user-id', 'usr-admin-delete-test')
      .set('x-user-role', 'admin');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify user is gone
    const checkUser = await repo.one("SELECT id FROM users WHERE id = 'usr-target-del'");
    expect(checkUser).toBeNull();
  });

  test('2. Non-admin receives 403 Forbidden', async () => {
    const res = await request(app)
      .delete('/api/v1/users/usr-target-del')
      .set('Authorization', `Bearer ${userToken}`)
      .set('x-user-id', 'usr-student-delete-test')
      .set('x-user-role', 'user');

    expect(res.status).toBe(403);
    
    // Verify user is NOT deleted
    const checkUser = await repo.one("SELECT id FROM users WHERE id = 'usr-target-del'");
    expect(checkUser).not.toBeNull();
  });

  test('3. Unauthenticated requests are rejected', async () => {
    const res = await request(app)
      .delete('/api/v1/users/usr-target-del');

    expect(res.status).toBe(401);
  });

  test('4. Admin cannot delete another Admin account', async () => {
    // Try to delete the admin test account
    const res = await request(app)
      .delete('/api/v1/users/usr-admin-delete-test')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-user-id', 'usr-admin-delete-test')
      .set('x-user-role', 'admin');

    // Controller blocks self deletion first, let's create a second admin
    expect(res.status).toBe(403);
    expect(res.body.error.message).toContain('cannot delete yourself');

    // Create a second admin to test admin deleting admin
    await repo.execute("INSERT INTO users (id, email, name, role) VALUES ('usr-admin-2', 'admin2.del@axly.local', 'Admin2', 'admin')");
    
    const res2 = await request(app)
      .delete('/api/v1/users/usr-admin-2')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-user-id', 'usr-admin-delete-test')
      .set('x-user-role', 'admin');

    expect(res2.status).toBe(403);
    expect(res2.body.error.message).toContain('Cannot delete an admin');

    await repo.execute("DELETE FROM users WHERE id = 'usr-admin-2'");
  });

  test('5. Deletion gracefully fails if the user does not exist', async () => {
    const res = await request(app)
      .delete('/api/v1/users/usr-does-not-exist')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-user-id', 'usr-admin-delete-test')
      .set('x-user-role', 'admin');

    expect(res.status).toBe(404);
  });
});
