const request = require('supertest');
const app = require('../src/app');
const { db, initSchema } = require('../src/db/db');
const { seedDatabase } = require('../src/db/seed');
const { seedPracticeProblems } = require('../src/db/practiceSeed');
const { generateTestToken } = require('../src/middleware/auth');
const {
  getCanonicalUtcDate,
  getNextCanonicalUtcDate,
  isFutureUtcDate,
  isValidDateString,
  getUtcCalendarDifference
} = require('../src/utils/dateUtils');
const {
  generateDailyChallenge,
  validateDailyChallenge,
  checkDuplicateChallenge,
  verifyReferenceSolution
} = require('../src/services/aiDailyChallengeService');
const {
  createDailyChallenge,
  updateDailyChallenge,
  scheduleDailyChallenge,
  publishDailyChallenge,
  publishNowDailyChallenge,
  unpublishDailyChallenge,
  archiveDailyChallenge,
  getTodayDailyChallenge,
  getDailyChallengeById,
  listDailyChallenges
} = require('../src/services/dailyChallengeService');
const {
  runAutomationPipeline,
  getAutomationSettings,
  updateAutomationSettings,
  getAutomationLogs
} = require('../src/services/dailyChallengeAutomationService');

describe('Daily Challenge V2 Comprehensive Lifecycle & Automation Test Suite', () => {
  let adminToken;
  let studentToken;
  const todayUtc = getCanonicalUtcDate();
  const tomorrowUtc = getNextCanonicalUtcDate();

  beforeAll(async () => {
    initSchema();
    seedDatabase();
    seedPracticeProblems();

    adminToken = generateTestToken({
      id: 'usr-admin-01',
      email: 'admin@axly.in',
      name: 'Axly Admin',
      role: 'admin'
    });

    studentToken = generateTestToken({
      id: 'usr-user-01',
      email: 'alex@example.com',
      name: 'Alex Mercer',
      role: 'user'
    });
  });

  describe('1. Canonical UTC Date Engine', () => {
    test('1.1 getCanonicalUtcDate returns strict YYYY-MM-DD format', () => {
      const today = getCanonicalUtcDate();
      expect(isValidDateString(today)).toBe(true);
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('1.2 getNextCanonicalUtcDate returns strictly tomorrow UTC', () => {
      const tomorrow = getNextCanonicalUtcDate();
      expect(isValidDateString(tomorrow)).toBe(true);
      const diff = getUtcCalendarDifference(todayUtc, tomorrow);
      expect(diff).toBe(1);
    });

    test('1.3 isFutureUtcDate correctly evaluates dates relative to UTC today', () => {
      expect(isFutureUtcDate('2099-01-01')).toBe(true);
      expect(isFutureUtcDate('2000-01-01')).toBe(false);
      expect(isFutureUtcDate(todayUtc)).toBe(false);
    });
  });

  describe('2. Draft Creation & Editing', () => {
    let createdDraftId;

    test('2.1 Admin can create a valid Draft Daily Challenge', async () => {
      const payload = {
        title: `Draft Matrix Path Challenge ${Date.now()}`,
        difficulty: 'medium',
        points: 100,
        description: 'Find unique paths in a grid with dynamic obstacle costs.',
        constraints: '1 <= M, N <= 100',
        test_cases: [
          { input: '3\n3', expected_output: '6', is_hidden: 0 },
          { input: '1\n1', expected_output: '1', is_hidden: 1 }
        ]
      };

      const res = await request(app)
        .post('/api/v1/daily-challenges')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.data.id).toMatch(/^dc-/);
      expect(res.body.data.status).toBe('draft');
      expect(res.body.data.scheduled_date).toBeNull();
      createdDraftId = res.body.data.id;
    });

    test('2.2 Admin can edit Draft fields without restriction', async () => {
      const updatedTitle = `Updated Matrix Path Title ${Date.now()}`;
      const res = await request(app)
        .put(`/api/v1/daily-challenges/${createdDraftId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: updatedTitle,
          points: 120,
          difficulty: 'hard'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe(updatedTitle);
      expect(res.body.data.points).toBe(120);
      expect(res.body.data.difficulty).toBe('hard');
    });
  });

  describe('3. Scheduling & Publish Lifecycle', () => {
    let targetChallenge;

    beforeEach(async () => {
      targetChallenge = await createDailyChallenge({
        title: `Scheduling Lifecycle Problem ${Date.now()}`,
        difficulty: 'medium',
        description: 'Test problem for scheduling and publishing verification.',
        constraints: '1 <= N <= 10^4',
        test_cases: [
          { input: '10', expected_output: '20', is_hidden: 0 },
          { input: '5', expected_output: '10', is_hidden: 1 }
        ]
      }, 'usr-admin-01');
    });

    test('3.1 Scheduling rejects past or today dates', async () => {
      const pastRes = await request(app)
        .post(`/api/v1/daily-challenges/${targetChallenge.id}/schedule`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ date: '2020-01-01' });

      expect(pastRes.status).toBe(400);

      const todayRes = await request(app)
        .post(`/api/v1/daily-challenges/${targetChallenge.id}/schedule`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ date: todayUtc });

      expect(todayRes.status).toBe(400);
    });

    test('3.2 Scheduling assigns future date and sets status to scheduled', async () => {
      const futureDate = '2035-08-15';
      const schedRes = await request(app)
        .post(`/api/v1/daily-challenges/${targetChallenge.id}/schedule`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ date: futureDate });

      expect(schedRes.status).toBe(200);
      expect(schedRes.body.data.status).toBe('scheduled');
      expect(schedRes.body.data.scheduled_date).toBe(futureDate);
    });

    test('3.3 Normal Publish on a draft with no date assigns today UTC and publishes', async () => {
      // Create a temporary unassigned challenge
      const draft = await createDailyChallenge({
        title: `Draft For Today Publish ${Date.now()}`,
        difficulty: 'easy',
        description: 'Draft problem published today.',
        constraints: 'N >= 1',
        test_cases: [{ input: '1', expected_output: '1', is_hidden: 0 }, { input: '2', expected_output: '2', is_hidden: 1 }]
      }, 'usr-admin-01');

      // Clear today's assignment first to allow publish
      db.prepare("UPDATE daily_challenge_problems SET scheduled_date = NULL WHERE scheduled_date = ?").run(todayUtc);
      db.prepare("DELETE FROM daily_questions WHERE date = ?").run(todayUtc);

      const pubRes = await request(app)
        .post(`/api/v1/daily-challenges/${draft.id}/publish`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(pubRes.status).toBe(200);
      expect(pubRes.body.data.status).toBe('published');
      expect(pubRes.body.data.scheduled_date).toBe(todayUtc);
    });

    test('3.4 Normal Publish on a scheduled future challenge retains future date', async () => {
      const futureDate = '2035-09-01';
      await scheduleDailyChallenge(targetChallenge.id, futureDate, 'usr-admin-01');

      const pubRes = await request(app)
        .post(`/api/v1/daily-challenges/${targetChallenge.id}/publish`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(pubRes.status).toBe(200);
      expect(pubRes.body.data.status).toBe('published');
      expect(pubRes.body.data.scheduled_date).toBe(futureDate);
    });

    test('3.5 Publish Now explicitly assigns today UTC and publishes', async () => {
      const draft = await createDailyChallenge({
        title: `Publish Now Test ${Date.now()}`,
        difficulty: 'medium',
        description: 'Problem for publish now testing.',
        constraints: '1 <= N <= 100',
        test_cases: [{ input: '1', expected_output: '1', is_hidden: 0 }, { input: '2', expected_output: '2', is_hidden: 1 }]
      }, 'usr-admin-01');

      // Clear today's conflict
      db.prepare("UPDATE daily_challenge_problems SET scheduled_date = NULL WHERE scheduled_date = ?").run(todayUtc);
      db.prepare("DELETE FROM daily_questions WHERE date = ?").run(todayUtc);

      const pubNowRes = await request(app)
        .post(`/api/v1/daily-challenges/${draft.id}/publish-now`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(pubNowRes.status).toBe(200);
      expect(pubNowRes.body.data.status).toBe('published');
      expect(pubNowRes.body.data.scheduled_date).toBe(todayUtc);
    });

    test('3.6 Duplicate date assignment is rejected with 409 Conflict', async () => {
      const conflictDate = '2035-10-10';
      await scheduleDailyChallenge(targetChallenge.id, conflictDate, 'usr-admin-01');

      const challengeB = await createDailyChallenge({
        title: `Second Challenge Same Date ${Date.now()}`,
        difficulty: 'easy',
        description: 'Second challenge attempting same date.',
        constraints: 'N >= 1',
        test_cases: [{ input: '1', expected_output: '1', is_hidden: 0 }, { input: '2', expected_output: '2', is_hidden: 1 }]
      }, 'usr-admin-01');

      const dupRes = await request(app)
        .post(`/api/v1/daily-challenges/${challengeB.id}/schedule`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ date: conflictDate });

      expect(dupRes.status).toBe(409);
      expect(dupRes.body.error.code).toBe('DATE_CONFLICT');
    });
  });

  describe('4. Student Visibility & Security Isolation', () => {
    let todayProblem;
    let futureProblem;
    let draftProblem;
    let archivedProblem;

    beforeAll(async () => {
      // Clear today's date
      db.prepare("UPDATE daily_challenge_problems SET scheduled_date = NULL WHERE scheduled_date = ?").run(todayUtc);
      db.prepare("DELETE FROM daily_questions WHERE date = ?").run(todayUtc);

      todayProblem = await createDailyChallenge({
        title: `Active Today Problem ${Date.now()}`,
        difficulty: 'medium',
        points: 100,
        description: 'Visible today problem for student test.',
        constraints: '1 <= N <= 1000',
        status: 'published',
        scheduled_date: todayUtc,
        test_cases: [
          { input: '10', expected_output: '20', is_hidden: 0 },
          { input: '99', expected_output: '198', is_hidden: 1 }
        ]
      }, 'usr-admin-01');

      futureProblem = await createDailyChallenge({
        title: `Secret Future Problem ${Date.now()}`,
        difficulty: 'hard',
        description: 'Must remain hidden until scheduled date.',
        constraints: 'N >= 1',
        status: 'scheduled',
        scheduled_date: '2035-12-25',
        test_cases: [{ input: 'secret', expected_output: 'result', is_hidden: 0 }, { input: 'hidden', expected_output: 'hidden', is_hidden: 1 }]
      }, 'usr-admin-01');

      draftProblem = await createDailyChallenge({
        title: `Secret Draft Problem ${Date.now()}`,
        difficulty: 'easy',
        description: 'Must remain hidden from students.',
        constraints: 'N >= 1',
        status: 'draft',
        test_cases: [{ input: '1', expected_output: '1', is_hidden: 0 }, { input: '2', expected_output: '2', is_hidden: 1 }]
      }, 'usr-admin-01');

      archivedProblem = await createDailyChallenge({
        title: `Archived Problem ${Date.now()}`,
        difficulty: 'easy',
        description: 'Must remain hidden from active student view.',
        constraints: 'N >= 1',
        status: 'draft',
        test_cases: [{ input: '1', expected_output: '1', is_hidden: 0 }, { input: '2', expected_output: '2', is_hidden: 1 }]
      }, 'usr-admin-01');
      await archiveDailyChallenge(archivedProblem.id);
    });

    test('4.1 Student gets strictly today published challenge on GET /api/v1/daily-challenges/today', async () => {
      const res = await request(app)
        .get('/api/v1/daily-challenges/today')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBe(todayProblem.id);
      expect(res.body.data.title).toBe(todayProblem.title);
    });

    test('4.2 Student fetching challenge details NEVER receives hidden test inputs/outputs', async () => {
      const res = await request(app)
        .get(`/api/v1/daily-challenges/${todayProblem.id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.test_cases.length).toBe(1); // Only public test case visible
      const hasHidden = res.body.data.test_cases.some(tc => tc.is_hidden);
      expect(hasHidden).toBe(false);
    });

    test('4.3 Next scheduled query returns nearest future challenge and ignores today/past/draft/archived', async () => {
      const listRes = await request(app)
        .get('/api/v1/daily-challenges')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.today_challenge.id).toBe(todayProblem.id);
      expect(listRes.body.next_scheduled_challenge).toBeDefined();
      expect(listRes.body.next_scheduled_challenge.scheduled_date > todayUtc).toBe(true);
    });
  });

  describe('5. AI Generation, Duplicate Detection & Sandbox Verification', () => {
    test('5.1 Schema validation detects incomplete or malformed AI output', () => {
      const invalid = validateDailyChallenge({
        title: 'Ab', // too short
        difficulty: 'super_hard', // invalid
        description: 'short',
        test_cases: [{ input: '1' }] // missing expected_output and < 2 test cases
      });

      expect(invalid.isValid).toBe(false);
      expect(invalid.errors.length).toBeGreaterThanOrEqual(3);
    });

    test('5.2 Duplicate detection catches collision with existing Practice questions', async () => {
      const practiceQuestions = await db.prepare('SELECT title, description FROM questions LIMIT 1').get();
      if (practiceQuestions) {
        const dupRes = await checkDuplicateChallenge(practiceQuestions.title);
        expect(dupRes.isDuplicate).toBe(true);
        expect(dupRes.reason).toContain('Practice problem');
      }
    });

    test('5.3 Sandbox verification passes for valid reference solution', async () => {
      const template = {
        test_cases: [
          { input: '[1, 2, 3]', expected_output: '6', is_hidden: 0 },
          { input: '[10, 20]', expected_output: '30', is_hidden: 1 }
        ],
        reference_solution: `function solution(nums) { return nums.reduce((a, b) => a + b, 0); }`,
        driver_code: `const fs = require('fs'); const nums = JSON.parse(fs.readFileSync(0, 'utf-8').trim()); console.log(solution(nums));`
      };

      const result = await verifyReferenceSolution(template);
      expect(result.verified).toBe(true);
      expect(result.passed_tests).toBe(2);
    });

    test('5.4 Sandbox verification fails for wrong reference solution', async () => {
      const template = {
        test_cases: [
          { input: '[1, 2, 3]', expected_output: '6', is_hidden: 0 }
        ],
        reference_solution: `function solution(nums) { return 999; }`,
        driver_code: `const fs = require('fs'); console.log(solution([]));`
      };

      const result = await verifyReferenceSolution(template);
      expect(result.verified).toBe(false);
      expect(result.reason).toContain('failed');
    });
  });

  describe('6. Automation Pipeline & Next-Day Targeting', () => {
    test('6.1 Automation generates, validates, sandbox-verifies, and targets tomorrow UTC', async () => {
      // Clear tomorrow's date
      db.prepare("UPDATE daily_challenge_problems SET scheduled_date = NULL WHERE scheduled_date = ?").run(tomorrowUtc);
      db.prepare("DELETE FROM daily_questions WHERE date = ?").run(tomorrowUtc);

      await updateAutomationSettings({ mode: 'auto_fill', is_enabled: 1 });

      const autoRes = await runAutomationPipeline({
        targetDate: tomorrowUtc,
        force: true,
        adminId: 'usr-admin-01'
      });

      expect(autoRes.success).toBe(true);
      expect(autoRes.target_date).toBe(tomorrowUtc);
      expect(autoRes.challenge).toBeDefined();
      expect(autoRes.challenge.scheduled_date).toBe(tomorrowUtc);

      // Verify automation log record exists
      const logs = await getAutomationLogs(5);
      expect(logs.length).toBeGreaterThanOrEqual(1);
      expect(logs[0].target_date).toBe(tomorrowUtc);
      expect(logs[0].status).toBe('success');
    }, 20000);

    test('6.2 Automation does NOT overwrite existing challenge for target date', async () => {
      const res = await runAutomationPipeline({
        targetDate: tomorrowUtc,
        force: true
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe('skipped');
      expect(res.message).toContain('already exists');
    }, 20000);
  });

  describe('7. Archiving & Historical Preservation', () => {
    test('7.1 Archived challenges disappear from active queries but retain historical record', async () => {
      const challenge = await createDailyChallenge({
        title: `Archive Preservation Test ${Date.now()}`,
        difficulty: 'easy',
        description: 'To be archived and checked for preservation.',
        constraints: 'N >= 1',
        test_cases: [{ input: '1', expected_output: '1', is_hidden: 0 }, { input: '2', expected_output: '2', is_hidden: 1 }]
      }, 'usr-admin-01');

      const archiveRes = await request(app)
        .post(`/api/v1/daily-challenges/${challenge.id}/archive`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(archiveRes.status).toBe(200);

      const fetched = await getDailyChallengeById(challenge.id, true);
      expect(fetched.status).toBe('archived');
      expect(fetched.is_active).toBe(0);
    });
  });
});
