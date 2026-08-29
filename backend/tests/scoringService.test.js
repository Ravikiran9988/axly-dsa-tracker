process.env.NODE_ENV = 'test';

const { initSchema } = require('../src/db/db');
const { getRepository } = require('../src/db/repositoryFactory');
const { calculateScore, recordAttempt } = require('../src/services/scoringService');

const repo = getRepository();

describe('Phase 1 scoring', () => {
  beforeAll(async () => {
    initSchema();
  });

  test('calculates full objective score for a first-attempt fast solve', () => {
    const score = calculateScore({
      passedTests: 10,
      totalTests: 10,
      durationSeconds: 300,
      attempts: 1,
      estimatedTime: '30 mins'
    });

    expect(score.test_score).toBe(60);
    expect(score.time_score).toBe(20);
    expect(score.attempt_score).toBe(20);
    expect(score.final_score).toBe(100);
  });

  test('penalizes failed tests and repeated attempts', () => {
    const score = calculateScore({
      passedTests: 6,
      totalTests: 10,
      durationSeconds: 3600,
      attempts: 3,
      estimatedTime: '30 mins'
    });

    expect(score.test_score).toBe(36);
    expect(score.time_score).toBeGreaterThanOrEqual(5);
    expect(score.attempt_score).toBe(10);
    expect(score.final_score).toBeLessThan(60);
  });

  test('persists attempt count and solve duration from assignment start', async () => {
    const userId = 'score-user';
    const questionId = 'score-question';

    await repo.execute(
      'INSERT INTO users (id, name, email, role) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO NOTHING',
      [userId, 'Score User', 'score@example.com', 'user']
    );
    await repo.execute(
      'INSERT INTO questions (id, title, difficulty, url, estimated_time) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING',
      [questionId, 'Score Question', 'easy', 'internal://score-question', '30 mins']
    );
    await repo.execute(
      'INSERT INTO assignments (id, user_id, question_id, assigned_by, status, assigned_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING',
      ['score-assignment', userId, questionId, userId, 'assigned', new Date(Date.now() - 60000).toISOString()]
    );

    const submission = await recordAttempt({
      userId,
      questionId,
      passedTests: 2,
      totalTests: 2,
      executionTimeMs: 12,
      solved: true
    });

    expect(submission.attempt_count).toBe(1);
    expect(submission.solve_duration_seconds).toBeGreaterThanOrEqual(59);
    expect(submission.final_score).toBeGreaterThan(0);
  });
});
