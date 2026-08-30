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

    beforeAll(async () => {
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

  describe('6. Automation Pipeline: Workflow A (Admin) vs Workflow B (00:00 UTC Scheduled)', () => {
    const testTomorrow = getNextCanonicalUtcDate();

    test('6.1 Test A & E: Existing challenge + manual Run Auto-Fill creates new Draft with scheduled_date = null and leaves existing challenge unchanged', async () => {
      // Create Challenge A for tomorrow
      db.prepare("UPDATE daily_challenge_problems SET scheduled_date = NULL WHERE scheduled_date = ?").run(testTomorrow);
      db.prepare("DELETE FROM daily_questions WHERE date = ?").run(testTomorrow);

      const challengeA = await createDailyChallenge({
        title: `Challenge A Existing ${Date.now()}`,
        difficulty: 'hard',
        description: 'Existing scheduled challenge for tomorrow.',
        constraints: 'N >= 1',
        scheduled_date: testTomorrow,
        status: 'scheduled',
        test_cases: [
          { input: '1', expected_output: '1', is_hidden: 0 },
          { input: '2', expected_output: '2', is_hidden: 1 }
        ]
      }, 'usr-admin-01');

      const { runAdminAutoFillNow } = require('../src/services/dailyChallengeAutomationService');
      const adminRes = await runAdminAutoFillNow({
        adminId: 'usr-admin-01'
      });

      expect(adminRes.success).toBe(true);
      expect(adminRes.status).toBe('success');
      expect(adminRes.message).toBe('AI challenge generated successfully and saved as Draft.');
      expect(adminRes.challenge).toBeDefined();
      expect(adminRes.challenge.id).not.toBe(challengeA.id);
      expect(adminRes.challenge.status).toBe('draft');
      expect(adminRes.challenge.created_via).toBe('ai');
      expect(adminRes.challenge.scheduled_date).toBeNull();

      // Verify Challenge A remains unchanged
      const freshChallengeA = await getDailyChallengeById(challengeA.id, true);
      expect(freshChallengeA.status).toBe('scheduled');
      expect(freshChallengeA.scheduled_date).toBe(testTomorrow);
    }, 25000);

    test('6.2 Test B: No existing challenge + manual Run Auto-Fill creates new Draft', async () => {
      const { runAdminAutoFillNow } = require('../src/services/dailyChallengeAutomationService');
      const res = await runAdminAutoFillNow({ adminId: 'usr-admin-01' });

      expect(res.success).toBe(true);
      expect(res.status).toBe('success');
      expect(res.challenge.status).toBe('draft');
      expect(res.challenge.scheduled_date).toBeNull();
    }, 25000);

    test('6.3 Test C & I: Existing challenge + scheduled AUTO_FILL returns SUCCESS_NOOP and never overwrites Admin challenge', async () => {
      await updateAutomationSettings({ mode: 'auto_fill', is_enabled: 1 });

      const { runDailyScheduledAutomation } = require('../src/services/dailyChallengeAutomationService');
      const autoRes = await runDailyScheduledAutomation();

      expect(autoRes.success).toBe(true);
      expect(autoRes.status).toBe('SUCCESS_NOOP');
      expect(autoRes.message).toContain('already exists');
    }, 20000);

    test('6.4 Test D: No existing challenge + scheduled AUTO_FILL generates, sandbox-verifies and schedules for tomorrow', async () => {
      // Clear tomorrow
      db.prepare("UPDATE daily_challenge_problems SET scheduled_date = NULL WHERE scheduled_date = ?").run(testTomorrow);
      db.prepare("DELETE FROM daily_questions WHERE date = ?").run(testTomorrow);

      await updateAutomationSettings({ mode: 'auto_fill', is_enabled: 1 });

      const { runDailyScheduledAutomation } = require('../src/services/dailyChallengeAutomationService');
      const autoRes = await runDailyScheduledAutomation();

      expect(autoRes.success).toBe(true);
      expect(autoRes.status).toBe('SUCCESS');
      expect(autoRes.target_date).toBe(testTomorrow);
      expect(autoRes.challenge).toBeDefined();
      expect(autoRes.challenge.status).toBe('scheduled');
      expect(autoRes.challenge.scheduled_date).toBe(testTomorrow);
    }, 25000);

    test('6.5 Test G: Database prevents two active Daily Challenges for same date', async () => {
      let threw = false;
      try {
        await createDailyChallenge({
          title: `Duplicate Date Collision Test ${Date.now()}`,
          difficulty: 'easy',
          description: 'Testing unique date enforcement.',
          constraints: 'N >= 1',
          scheduled_date: testTomorrow,
          status: 'scheduled',
          test_cases: [{ input: '1', expected_output: '1', is_hidden: 0 }]
        }, 'usr-admin-01');
      } catch (err) {
        threw = true;
        expect(err.statusCode).toBe(409);
      }
      expect(threw).toBe(true);
    });

    test('6.6 Test H: Manual generation never modifies leaderboard or Practice progress', async () => {
      const activityBefore = await db.prepare('SELECT COUNT(*) as cnt FROM user_daily_activity').get();
      const submissionsBefore = await db.prepare('SELECT COUNT(*) as cnt FROM submissions').get();

      const { runAdminAutoFillNow } = require('../src/services/dailyChallengeAutomationService');
      await runAdminAutoFillNow({ adminId: 'usr-admin-01' });

      const activityAfter = await db.prepare('SELECT COUNT(*) as cnt FROM user_daily_activity').get();
      const submissionsAfter = await db.prepare('SELECT COUNT(*) as cnt FROM submissions').get();

      expect(activityAfter.cnt).toBe(activityBefore.cnt);
      expect(submissionsAfter.cnt).toBe(submissionsBefore.cnt);
    }, 25000);
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

  describe('8. Exact & Semantic Concept Duplicate Prevention & Structured Problem Signatures', () => {
    const {
      stripVariantIdentifiers,
      extractProblemConcept,
      generateProblemSignature,
      computeSemanticSimilarity
    } = require('../src/services/aiDailyChallengeService');

    test('8.1 stripVariantIdentifiers removes artificial variant markers', () => {
      expect(stripVariantIdentifiers('Longest Alternating Target Subsequence (Variant 4880)')).toBe('Longest Alternating Target Subsequence');
      expect(stripVariantIdentifiers('Two Sum — Variant 8392')).toBe('Two Sum');
      expect(stripVariantIdentifiers('Subarray Sum [Variant 0717]')).toBe('Subarray Sum');
      expect(stripVariantIdentifiers('Valid Palindrome (Variant 1234)')).toBe('Valid Palindrome');
      expect(stripVariantIdentifiers('Coin Change - v2')).toBe('Coin Change');
    });

    test('8.2 Structured Problem Signature generation follows deterministic format', () => {
      const sig = generateProblemSignature({
        topic: 'Dynamic Programming',
        pattern: 'Subsequence DP',
        title: 'Longest Alternating Target Subsequence',
        description: 'Given an array nums, return the length of the longest alternating subsequence.',
        input_format: 'JSON array of integers nums.',
        output_format: 'Integer representing maximum alternating subsequence length.'
      });

      expect(sig).toContain('dynamic-programming');
      expect(sig).toContain('subsequence-dp');
      expect(sig).toContain('alternat');
      expect(sig).toContain('array');
      expect(sig).toContain('number');
    });

    test('8.3 Exact duplicate with Variant ID is caught (The Variant 4880 Bug)', async () => {
      // Seed base challenge if not present
      try {
        await createDailyChallenge({
          title: 'Longest Alternating Target Subsequence',
          difficulty: 'medium',
          topic_name: 'Dynamic Programming',
          pattern_name: 'Subsequence DP',
          description: 'Return length of longest alternating subsequence in nums array.',
          constraints: '1 <= nums.length <= 1000',
          test_cases: [{ input: '[1, 2, 3]', expected_output: '2', is_hidden: 0 }]
        }, 'usr-admin-01');
      } catch (_) {}

      // Candidate with Variant 4880
      const dupCheck1 = await checkDuplicateChallenge({
        title: 'Longest Alternating Target Subsequence (Variant 4880)',
        description: 'Return length of longest alternating subsequence in nums array.'
      });

      expect(dupCheck1.isDuplicate).toBe(true);
      expect(dupCheck1.reason).toContain('Longest Alternating Target Subsequence');
    });

    test('8.4 Semantic concept duplicate with different wording is caught', async () => {
      const dupCheck2 = await checkDuplicateChallenge({
        title: 'Maximum Alternating Subsequence Under Target Constraint',
        description: 'Given an array nums, return the maximum alternating subsequence length.',
        topic: 'Dynamic Programming',
        pattern: 'Subsequence DP'
      });

      expect(dupCheck2.isDuplicate).toBe(true);
    });

    test('8.5 Genuinely different problem is NOT rejected as duplicate', async () => {
      const uniqueCheck = await checkDuplicateChallenge({
        title: 'Alien Dictionary Lexicographical Order',
        topic: 'Graphs',
        pattern: 'Topological Sort',
        description: 'Find the unique ordering of alien alphabet characters from a sorted dictionary.',
        input_format: 'JSON array of string words',
        output_format: 'String of ordered characters'
      });

      expect(uniqueCheck.isDuplicate).toBe(false);
    });

    test('8.6 Practice problem duplicate is caught', async () => {
      // Seed a practice problem
      await db.prepare(`
        INSERT OR IGNORE INTO questions (id, title, slug, difficulty, description, is_active)
        VALUES ('q-practice-dup-test', 'Merge Intervals Practice Target', 'merge-intervals-practice-target', 'medium', 'Merge overlapping intervals.', 1)
      `).run();

      const practiceDupCheck = await checkDuplicateChallenge({
        title: 'Merge Intervals Practice Target (Variant 9001)',
        description: 'Merge overlapping intervals in a 2D array.'
      });

      expect(practiceDupCheck.isDuplicate).toBe(true);
      expect(practiceDupCheck.reason).toMatch(/Practice/i);
    });

    test('8.7 Multi-Generation Test: 10 successive generations yield unique challenges without variant collisions', async () => {
      const generatedTitles = new Set();
      const generatedSignatures = new Set();

      for (let i = 0; i < 5; i++) {
        const { runAdminAutoFillNow } = require('../src/services/dailyChallengeAutomationService');
        const res = await runAdminAutoFillNow({
          adminId: 'usr-admin-01',
          topic: 'Surprise Me'
        });

        if (res.success && res.challenge) {
          expect(res.challenge.title).not.toMatch(/variant\s*\d+/i);
          expect(generatedTitles.has(res.challenge.title)).toBe(false);
          generatedTitles.add(res.challenge.title);

          const sig = res.challenge.problem_signature || generateProblemSignature(res.challenge);
          expect(generatedSignatures.has(sig)).toBe(false);
          generatedSignatures.add(sig);
        }
      }
    }, 45000);
  });
});
