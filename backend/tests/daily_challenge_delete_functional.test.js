const request = require('supertest');
const app = require('../src/app');
const { getRepository } = require('../src/db/repositoryFactory');
const { v4: uuidv4 } = require('uuid');

describe('Daily Challenge Delete Functionality & Archive Removal', () => {
  let repo;
  let adminToken;
  let studentToken;

  beforeAll(async () => {
    repo = getRepository();

    const adminLogin = await request(app)
      .post('/api/v1/auth/dev-login')
      .send({ email: 'admin@axly.in', role: 'admin' });
    adminToken = adminLogin.body.token;

    const studentLogin = await request(app)
      .post('/api/v1/auth/dev-login')
      .send({ email: 'john@student.axly.in', role: 'user' });
    studentToken = studentLogin.body.token;
  });

  test('1. Clean deletion of an exclusive daily challenge (is_practice = 0)', async () => {
    const qId = `test-dc-exclusive-${uuidv4().slice(0, 8)}`;
    const tcId = `tc-${uuidv4().slice(0, 8)}`;

    // Create question
    await repo.execute(`
      INSERT INTO questions (id, title, slug, difficulty, topic_id, url, is_active, is_practice, status)
      VALUES (?, 'Exclusive DC Test Problem', ?, 'medium', 'top-01', 'https://example.com', 1, 0, 'published')
    `, [qId, qId]);

    // Create test case
    await repo.execute(`
      INSERT INTO test_cases (id, question_id, input, expected_output, is_hidden)
      VALUES (?, ?, '[1, 2]', '3', 0)
    `, [tcId, qId]);

    // Create daily challenge metadata
    await repo.execute(`
      INSERT INTO daily_challenge_metadata (question_id, scheduled_date, status, created_via)
      VALUES (?, '2030-01-01', 'published', 'manual')
    `, [qId]);

    // Create automation log referencing this question
    const logId = `log-${uuidv4().slice(0, 8)}`;
    await repo.execute(`
      INSERT INTO daily_challenge_automation_logs (id, target_date, mode, status, question_id)
      VALUES (?, '2030-01-01', 'auto_fill', 'success', ?)
    `, [logId, qId]);

    // Perform DELETE request as admin
    const res = await request(app)
      .delete(`/api/v1/daily-challenges/${qId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify daily_challenge_metadata deleted
    const meta = await repo.one('SELECT question_id FROM daily_challenge_metadata WHERE question_id = ?', [qId]);
    expect(meta).toBeFalsy();

    // Verify exclusive question deleted from questions table
    const q = await repo.one('SELECT id FROM questions WHERE id = ?', [qId]);
    expect(q).toBeFalsy();

    // Verify test cases deleted
    const tc = await repo.one('SELECT id FROM test_cases WHERE question_id = ?', [qId]);
    expect(tc).toBeFalsy();

    // Verify automation log unlinked (question_id set to NULL)
    const log = await repo.one('SELECT question_id FROM daily_challenge_automation_logs WHERE id = ?', [logId]);
    expect(log.question_id).toBeNull();
  });

  test('2. Unlinking deletion of a practice problem (is_practice = 1) preserves practice problem', async () => {
    const qId = `test-dc-practice-${uuidv4().slice(0, 8)}`;

    // Create practice question
    await repo.execute(`
      INSERT INTO questions (id, title, slug, difficulty, topic_id, url, is_active, is_practice, status)
      VALUES (?, 'Practice DC Linked Problem', ?, 'easy', 'top-01', 'https://example.com', 1, 1, 'published')
    `, [qId, qId]);

    // Create daily challenge metadata
    await repo.execute(`
      INSERT INTO daily_challenge_metadata (question_id, scheduled_date, status, created_via)
      VALUES (?, '2030-01-02', 'scheduled', 'manual')
    `, [qId]);

    // Perform DELETE request as admin
    const res = await request(app)
      .delete(`/api/v1/daily-challenges/${qId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);

    // Verify daily_challenge_metadata deleted
    const meta = await repo.one('SELECT question_id FROM daily_challenge_metadata WHERE question_id = ?', [qId]);
    expect(meta).toBeFalsy();

    // Verify practice question STILL EXISTS in questions table
    const q = await repo.one('SELECT id, is_practice FROM questions WHERE id = ?', [qId]);
    expect(q).toBeTruthy();
    expect(q.is_practice === 1 || q.is_practice === true).toBe(true);

    // Cleanup practice question
    await repo.execute('DELETE FROM questions WHERE id = ?', [qId]);
  });

  test('3. Student role cannot delete Daily Challenge (RBAC check)', async () => {
    const res = await request(app)
      .delete('/api/v1/daily-challenges/dc-001')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
  });
});
