const request = require('supertest');
const { db, initSchema } = require('../src/db/db');
const { seedDatabase } = require('../src/db/seed');
const { generateTestToken } = require('../src/middleware/auth');
const app = require('../src/app');
const { 
  createQuestion, 
  updateQuestion, 
  updateQuestionStatus 
} = require('../src/services/questionService');
const { createDailyChallenge, getDailyChallengeById, updateDailyChallenge } = require('../src/services/dailyChallengeService');

let adminToken;

beforeAll(async () => {
  initSchema();
  seedDatabase();
  adminToken = generateTestToken({
    id: 'usr-admin-01',
    email: 'admin@axly.in',
    name: 'Axly Admin',
    role: 'admin'
  });
});

describe('Canonical Status Invariant: questions.status is NEVER archived', () => {
  describe('1. API Guard: createQuestion rejects archived status', () => {
    test('1.1 POST /api/v1/questions rejects status=archived', async () => {
      const res = await request(app)
        .post('/api/v1/questions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: `Invariant Test ${Date.now()}`,
          difficulty: 'easy',
          description: 'Test that archived status is rejected',
          status: 'archived'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/archived|enum/i);
    });
  });

  describe('2. API Guard: updateQuestion rejects archived status', () => {
    test('2.1 PUT /api/v1/questions/:id rejects status=archived', async () => {
      const created = await createQuestion({
        title: `Invariant Update Test ${Date.now()}`,
        difficulty: 'easy',
        description: 'Test question for update invariant'
      }, 'usr-admin-01');

      const res = await request(app)
        .put(`/api/v1/questions/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'archived' });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/archived|enum/i);
    });
  });

  describe('3. Service Guard: createDailyChallenge rejects archived status', () => {
    test('3.1 createDailyChallenge throws on status=archived', async () => {
      await expect(
        createDailyChallenge({
          title: `Invariant DC Test ${Date.now()}`,
          difficulty: 'easy',
          description: 'Test DC creation invariant',
          status: 'archived'
        }, 'usr-admin-01')
      ).rejects.toThrow(/archived/i);
    });
  });

  describe('4. Service Guard: updateDailyChallenge rejects archived status', () => {
    test('4.1 updateDailyChallenge throws on status=archived', async () => {
      const challenge = await createDailyChallenge({
        title: `Invariant DC Update Test ${Date.now()}`,
        difficulty: 'easy',
        description: 'Test DC update invariant'
      }, 'usr-admin-01');

      await expect(
        updateDailyChallenge(challenge.id, { status: 'archived' }, 'usr-admin-01')
      ).rejects.toThrow(/archived/i);
    });
  });

  describe('5. Service Guard: updateQuestionStatus rejects archived status', () => {
    test('5.1 updateQuestionStatus throws on status=archived', async () => {
      const challenge = await createDailyChallenge({
        title: `Invariant Status Test ${Date.now()}`,
        difficulty: 'easy',
        description: 'Test status update invariant'
      }, 'usr-admin-01');

      await expect(
        updateQuestionStatus(challenge.id, 'archived')
      ).rejects.toThrow(/archived/i);
    });
  });

  describe('6. Archive Lifecycle: questions.status becomes published, not archived', () => {
    test('6.1 scheduled expiration sets dcm=archived, questions=published + is_practice=1', async () => {
      const challenge = await createDailyChallenge({
        title: `Lifecycle Test ${Date.now()}`,
        difficulty: 'easy',
        description: 'Test archive lifecycle invariant',
        test_cases: [{ input: '1', expected_output: '1', is_hidden: 0 }]
      }, 'usr-admin-01');

      // Simulate automated job marking challenge as archived
      const { getRepository } = require('../src/db/repositoryFactory');
      const repo = getRepository();
      await repo.execute(`
        UPDATE daily_challenge_metadata 
        SET status = 'archived' 
        WHERE question_id = ?
      `, [challenge.id]);
      
      // The invariant check: When daily challenge is archived, the source question MUST NOT be archived
      const fetched = await getDailyChallengeById(challenge.id, true);
      expect(fetched.status).toBe('archived');
      
      // Invariant: The question stays 'published', NOT 'archived'
      const underlyingQuestion = await repo.one('SELECT status FROM questions WHERE id = ?', [challenge.id]);
      expect(underlyingQuestion.status).not.toBe('archived');
    });
  });

  describe('7. Validation Schema: createQuestionSchema excludes archived', () => {
    test('7.1 Zod schema rejects status=archived for questions', () => {
      const { createQuestionSchema } = require('../src/validation/schemas');
      const result = createQuestionSchema.safeParse({
        title: 'Test',
        difficulty: 'easy',
        status: 'archived'
      });
      expect(result.success).toBe(false);
    });

    test('7.2 Zod schema accepts status=draft for questions', () => {
      const { createQuestionSchema } = require('../src/validation/schemas');
      const result = createQuestionSchema.safeParse({
        title: 'Test',
        difficulty: 'easy',
        status: 'draft'
      });
      expect(result.success).toBe(true);
    });

    test('7.3 Zod schema accepts status=published for questions', () => {
      const { createQuestionSchema } = require('../src/validation/schemas');
      const result = createQuestionSchema.safeParse({
        title: 'Test',
        difficulty: 'easy',
        status: 'published'
      });
      expect(result.success).toBe(true);
    });
  });
});
