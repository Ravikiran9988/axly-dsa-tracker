const request = require('supertest');
const app = require('../src/app');
const { generateTestToken } = require('../src/middleware/auth');
const authUserRepository = require('../src/db/authUserRepository');
const { getRepository } = require('../src/db/repositoryFactory');
const {
  createDailyChallenge,
  scheduleDailyChallenge,
  publishDailyChallenge,
  getDailyChallengeById
} = require('../src/services/dailyChallengeService');
const { runDailyExpiration } = require('../src/services/dailyChallengeAutomationService');

describe('Canonical Question & Daily Challenge Status Synchronization Suite', () => {
  let adminToken;
  let studentToken;
  let repo;

  beforeAll(async () => {
    repo = getRepository();

    // authenticate() resolves the role from the persisted user record rather than
    // trusting the role claim in the JWT. Provision the test identity explicitly so
    // this suite exercises the real admin authorization path in CI as well as locally.
    const adminId = 'eba97636-6160-4787-bb23-2db2d4081f4f';
    const adminEmail = 'medicharlaravikiran88@gmail.com';
    await authUserRepository.provisionUser({
      id: adminId,
      email: adminEmail,
      name: 'Admin',
      email_verified: true
    });
    await repo.execute('UPDATE users SET role = ? WHERE id = ?', ['admin', adminId]);

    adminToken = generateTestToken({
      id: adminId,
      email: adminEmail,
      name: 'Admin',
      role: 'admin'
    });

    studentToken = generateTestToken({
      id: 'usr-user-01',
      email: 'alex@example.com',
      name: 'Alex Mercer',
      role: 'user'
    });
  });

  test('1. Creating Daily Challenge draft synchronizes status to draft in both tables', async () => {
    const draftChallenge = await createDailyChallenge({
      title: 'Canonical Draft Sync Test Problem',
      slug: 'canonical-draft-sync-test',
      difficulty: 'medium',
      description: 'Testing canonical status sync for draft creations.',
      status: 'draft',
      test_cases: [{ input: '5', expected_output: '10', is_hidden: false }]
    }, 'usr-admin-sync');

    expect(draftChallenge.id).toBeDefined();

    // Check questions table
    const questionRow = await repo.one('SELECT id, status, is_practice FROM questions WHERE id = ?', [draftChallenge.id]);
    expect(questionRow).toBeDefined();
    expect(questionRow.status).toBe('draft');
    expect(questionRow.is_practice).toBe(0);

    // Check daily_challenge_metadata table
    const metaRow = await repo.one('SELECT question_id, status, scheduled_date FROM daily_challenge_metadata WHERE question_id = ?', [draftChallenge.id]);
    expect(metaRow).toBeDefined();
    expect(metaRow.status).toBe('draft');
    expect(metaRow.scheduled_date).toBeNull();
  });

  test('2. Creating / Scheduling Daily Challenge synchronizes status to scheduled in both tables', async () => {
    const challenge = await createDailyChallenge({
      title: 'Canonical Scheduled Sync Test Problem',
      slug: 'canonical-scheduled-sync-test',
      difficulty: 'hard',
      description: 'Testing scheduled status sync.',
      status: 'draft',
      test_cases: [{ input: '1', expected_output: '2', is_hidden: false }]
    }, 'usr-admin-sync');

    const futureDate = '2035-11-20';
    const scheduled = await scheduleDailyChallenge(challenge.id, futureDate, 'usr-admin-sync');
    expect(scheduled.status).toBe('scheduled');

    // Check questions table
    const questionRow = await repo.one('SELECT id, status, is_practice FROM questions WHERE id = ?', [challenge.id]);
    expect(questionRow.status).toBe('scheduled');

    // Check daily_challenge_metadata table
    const metaRow = await repo.one('SELECT question_id, status, scheduled_date FROM daily_challenge_metadata WHERE question_id = ?', [challenge.id]);
    expect(metaRow.status).toBe('scheduled');
    expect(metaRow.scheduled_date).toBe(futureDate);
  });

  test('3. Publishing Daily Challenge synchronizes status to published in both tables', async () => {
    const challenge = await createDailyChallenge({
      title: 'Canonical Published Sync Test Problem',
      slug: 'canonical-published-sync-test',
      difficulty: 'easy',
      description: 'Testing published status sync.',
      status: 'draft',
      test_cases: [{ input: '0', expected_output: '0', is_hidden: false }]
    }, 'usr-admin-sync');

    const published = await publishDailyChallenge(challenge.id, 'usr-admin-sync');
    expect(published.status).toBe('published');

    // Check questions table
    const questionRow = await repo.one('SELECT id, status FROM questions WHERE id = ?', [challenge.id]);
    expect(questionRow.status).toBe('published');

    // Check daily_challenge_metadata table
    const metaRow = await repo.one('SELECT question_id, status FROM daily_challenge_metadata WHERE question_id = ?', [challenge.id]);
    expect(metaRow.status).toBe('published');
  });

  test('4. Expiring / Archiving Daily Challenge preserves canonical ID and exposes to Practice without duplicates', async () => {
    const challenge = await createDailyChallenge({
      title: 'Canonical Expiry Sync Test Problem',
      slug: 'canonical-expiry-sync-test',
      difficulty: 'medium',
      description: 'Testing expiration to practice.',
      status: 'draft',
      test_cases: [{ input: '3', expected_output: '6', is_hidden: false }]
    }, 'usr-admin-sync');

    // Simulate expiration via runDailyExpiration logic or manual archive
    await repo.transaction(async tx => {
      await tx.execute('UPDATE daily_challenge_metadata SET status = ?, scheduled_date = ? WHERE question_id = ?', ['published', '2026-09-01', challenge.id]);
      await tx.execute('UPDATE questions SET status = ?, is_active = 1, is_practice = 0 WHERE id = ?', ['published', challenge.id]);
    });

    // Run expiration
    const expiryResult = await runDailyExpiration(new Date('2026-09-15T12:00:00Z'));
    expect(expiryResult.expired).toBe(true);

    // Verify metadata is archived
    const metaRow = await repo.one('SELECT question_id, status FROM daily_challenge_metadata WHERE question_id = ?', [challenge.id]);
    expect(metaRow.status).toBe('archived');

    // Verify question is practice-available with the SAME ID
    const questionRow = await repo.one('SELECT id, is_practice, is_active, status FROM questions WHERE id = ?', [challenge.id]);
    expect(questionRow.id).toBe(challenge.id);
    expect(questionRow.is_practice).toBe(1);
    expect(questionRow.is_active).toBe(1);
    expect(questionRow.status).toBe('published');

    // Verify no duplicate question was created
    const countRow = await repo.one('SELECT COUNT(*) as c FROM questions WHERE slug = ?', ['canonical-expiry-sync-test']);
    expect(Number(countRow.c)).toBe(1);
  });

  test('5. Question Bank admin listing returns effective DRAFT status for draft Daily Challenges', async () => {
    const draftChallenge = await createDailyChallenge({
      title: 'Admin Listing Draft Verification Problem',
      slug: 'admin-listing-draft-verification',
      difficulty: 'easy',
      description: 'Verifying that Question Bank does not report this as published.',
      status: 'draft',
      test_cases: [{ input: '10', expected_output: '20', is_hidden: false }]
    }, 'usr-admin-sync');

    // Standard Question Bank listing (Option A: practice-available problems only)
    const practiceBankRes = await request(app)
      .get('/api/v1/questions')
      .query({ search: 'Admin Listing Draft Verification' })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(practiceBankRes.status).toBe(200);
    const inPracticeBank = practiceBankRes.body.data.find(q => q.id === draftChallenge.id);
    expect(inPracticeBank).toBeUndefined();

    // Comprehensive Admin Question query (is_practice=all)
    const allRes = await request(app)
      .get('/api/v1/questions')
      .query({ search: 'Admin Listing Draft Verification', is_practice: 'all' })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(allRes.status).toBe(200);
    const item = allRes.body.data.find(q => q.id === draftChallenge.id);
    expect(item).toBeDefined();
    expect(item.status).toBe('draft');
    expect(item.status).not.toBe('published');
  });

  test('6. Student Practice listing never displays unexpired Daily Challenge', async () => {
    const draft = await createDailyChallenge({
      title: 'Student Isolation Draft Problem',
      slug: 'student-isolation-draft',
      difficulty: 'easy',
      description: 'Hidden from student practice.',
      status: 'draft',
      test_cases: [{ input: '1', expected_output: '1', is_hidden: false }]
    }, 'usr-admin-sync');

    const res = await request(app)
      .get('/api/v1/practice/problems?search=Student Isolation Draft')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    const problemsList = Array.isArray(res.body.data) ? res.body.data : (res.body.data?.problems || []);
    const found = problemsList.some(p => p.id === draft.id);
    expect(found).toBe(false);
  });

  test('7. Daily Challenge student today endpoint returns only the currently published challenge', async () => {
    const res = await request(app)
      .get('/api/v1/daily-challenges/today')
      .set('Authorization', `Bearer ${studentToken}`);

    if (res.status === 200 && res.body.data) {
      expect(res.body.data.status).toBe('published');
      expect(res.body.data.status).not.toBe('draft');
      expect(res.body.data.status).not.toBe('scheduled');
    } else {
      expect([200, 404]).toContain(res.status);
    }
  });

  test('8. Daily Challenge becomes available in Practice using the EXACT SAME canonical question ID', async () => {
    const challenge = await createDailyChallenge({
      title: 'Practice Availability After Expiry Test',
      slug: 'practice-availability-after-expiry',
      difficulty: 'easy',
      description: 'Checking practice availability with same canonical ID.',
      status: 'draft',
      test_cases: [{ input: '4', expected_output: '8', is_hidden: false }]
    }, 'usr-admin-sync');

    // Simulate lifecycle expiration: dcm → archived, question → published + practice
    await repo.execute(
      `UPDATE daily_challenge_metadata SET status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE question_id = ?`,
      [challenge.id]
    );
    await repo.execute('UPDATE questions SET is_practice = 1, is_active = 1, status = \'published\' WHERE id = ?', [challenge.id]);

    const res = await request(app)
      .get(`/api/v1/practice/problems/${challenge.id}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(challenge.id);
    expect(res.body.data.title).toBe(challenge.title);
  });

  test('9. createDailyChallengeFromPractice WITHOUT scheduled_date syncs status to draft', async () => {
    const qid = 'test-prac-draft';
    await repo.execute(
      "INSERT INTO questions (id, title, slug, difficulty, status, is_practice, is_active, url) VALUES (?, ?, ?, 'medium', 'published', 1, 1, 'http://test')",
      [qid, 'Practice to Draft DC Test', 'practice-to-draft-dc']
    );

    await require('../src/services/dailyChallengeService').createDailyChallengeFromPractice({
      question_id: qid
    }, 'usr-admin-sync');

    // Assert questions table
    const questionRow = await repo.one('SELECT id, status FROM questions WHERE id = ?', [qid]);
    expect(questionRow.status).toBe('draft');

    // Assert metadata table
    const metaRow = await repo.one('SELECT status, scheduled_date FROM daily_challenge_metadata WHERE question_id = ?', [qid]);
    expect(metaRow.status).toBe('draft');
    expect(metaRow.scheduled_date).toBeNull();
    
    // Assert 1 row
    const countRow = await repo.one('SELECT COUNT(*) as c FROM questions WHERE id = ?', [qid]);
    expect(Number(countRow.c)).toBe(1);
  });

  test('10. createDailyChallengeFromPractice WITH scheduled_date syncs status to scheduled', async () => {
    const qid = 'test-prac-sched';
    await repo.execute(
      "INSERT INTO questions (id, title, slug, difficulty, status, is_practice, is_active, url) VALUES (?, ?, ?, 'medium', 'published', 1, 1, 'http://test2')",
      [qid, 'Practice to Sched DC Test', 'practice-to-sched-dc']
    );

    const futureDate = '2036-12-01';
    await require('../src/services/dailyChallengeService').createDailyChallengeFromPractice({
      question_id: qid,
      scheduled_date: futureDate
    }, 'usr-admin-sync');

    // Assert questions table
    const questionRow = await repo.one('SELECT id, status FROM questions WHERE id = ?', [qid]);
    expect(questionRow.status).toBe('scheduled');

    // Assert metadata table
    const metaRow = await repo.one('SELECT status, scheduled_date FROM daily_challenge_metadata WHERE question_id = ?', [qid]);
    expect(metaRow.status).toBe('scheduled');
    expect(metaRow.scheduled_date).toBe(futureDate);
    
    // Assert 1 row
    const countRow = await repo.one('SELECT COUNT(*) as c FROM questions WHERE id = ?', [qid]);
    expect(Number(countRow.c)).toBe(1);
  });

  afterAll(async () => {
    const testSlugs = [
      'canonical-draft-sync-test',
      'canonical-scheduled-sync-test',
      'canonical-published-sync-test',
      'canonical-expiry-sync-test',
      'admin-listing-draft-verification',
      'student-isolation-draft',
      'practice-availability-after-expiry',
      'practice-to-draft-dc',
      'practice-to-sched-dc'
    ];
    for (const slug of testSlugs) {
      const q = await repo.one('SELECT id FROM questions WHERE slug = ?', [slug]);
      if (q) {
        await repo.execute('DELETE FROM daily_challenge_metadata WHERE question_id = ?', [q.id]);
        await repo.execute('DELETE FROM test_cases WHERE question_id = ?', [q.id]);
        await repo.execute('DELETE FROM questions WHERE id = ?', [q.id]);
      }
    }
  });
});
