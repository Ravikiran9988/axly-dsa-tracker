process.env.NODE_ENV = 'test';

const { initSchema } = require('../src/db/db');
const { getRepository } = require('../src/db/repositoryFactory');
const { calculateScore, recordAttempt } = require('../src/services/scoringService');
const {
  awardPracticeSolve,
  awardDailyChallengeSolve,
  getUserScoreBreakdown
} = require('../src/services/gamificationService');
const { getCompetitiveLeaders } = require('../src/services/leaderboardService');

const repo = getRepository();

describe('Axly DSA Tracker Scoring Model Tests', () => {
  const user1 = 'usr-score-student-1';
  const user2 = 'usr-score-student-2';

  beforeAll(async () => {
    initSchema();

    // Clean up test fixtures
    await repo.execute("DELETE FROM points_ledger WHERE user_id IN (?, ?)", [user1, user2]);
    await repo.execute("DELETE FROM users WHERE id IN (?, ?)", [user1, user2]);

    await repo.execute(
      `INSERT INTO users (id, name, email, role, points, practice_points, daily_challenge_points, streak_bonus, leaderboard_score, streak, longest_streak)
       VALUES (?, ?, ?, 'user', 0, 0, 0, 0, 0, 1, 1), (?, ?, ?, 'user', 0, 0, 0, 0, 0, 1, 1)`,
      [user1, 'Alice Practice Star', 'alice.scoring@example.com', user2, 'Bob Daily Champion', 'bob.scoring@example.com']
    );

    // Seed test problems
    await repo.execute(`
      INSERT OR REPLACE INTO questions (id, title, difficulty, url, is_practice, is_active)
      VALUES 
        ('q-easy-1', 'Two Sum Easy', 'easy', 'internal://q-easy-1', 1, 1),
        ('q-med-1', 'Container With Most Water', 'medium', 'internal://q-med-1', 1, 1),
        ('q-hard-1', 'Trapping Rain Water', 'hard', 'internal://q-hard-1', 1, 1)
    `);

    await repo.execute(`
      INSERT OR REPLACE INTO daily_challenge_problems (id, title, slug, description, difficulty, points, status, is_active)
      VALUES 
        ('dc-easy-1', 'Daily Easy Challenge', 'dc-easy-1', 'Test Description Easy', 'easy', 50, 'published', 1),
        ('dc-med-1', 'Daily Medium Challenge', 'dc-med-1', 'Test Description Medium', 'medium', 100, 'published', 1),
        ('dc-hard-1', 'Daily Hard Challenge', 'dc-hard-1', 'Test Description Hard', 'hard', 150, 'published', 1)
    `);
  });

  test('1. Student solves Easy practice problem -> +10 Practice Points, +10 Total Score, 0 Leaderboard Score', async () => {
    const res = await awardPracticeSolve(user1, 'q-easy-1');
    expect(res.pointsAwarded).toBe(10);
    expect(res.breakdown.practice_points).toBe(10);
    expect(res.breakdown.total_score).toBe(10);
    expect(res.breakdown.leaderboard_score).toBe(0);
  });

  test('2. Student solves Medium practice problem -> +20 Practice Points, +30 Total Score cumulative, 0 Leaderboard Score', async () => {
    const res = await awardPracticeSolve(user1, 'q-med-1');
    expect(res.pointsAwarded).toBe(20);
    expect(res.breakdown.practice_points).toBe(30);
    expect(res.breakdown.total_score).toBe(30);
    expect(res.breakdown.leaderboard_score).toBe(0);
  });

  test('3. Student solves Hard practice problem -> +30 Practice Points, +60 Total Score cumulative, 0 Leaderboard Score', async () => {
    const res = await awardPracticeSolve(user1, 'q-hard-1');
    expect(res.pointsAwarded).toBe(30);
    expect(res.breakdown.practice_points).toBe(60);
    expect(res.breakdown.total_score).toBe(60);
    expect(res.breakdown.leaderboard_score).toBe(0);
  });

  test('4. Idempotency: Solving the same practice problem again yields +0 points', async () => {
    const res = await awardPracticeSolve(user1, 'q-easy-1');
    expect(res.pointsAwarded).toBe(0);
    expect(res.breakdown.practice_points).toBe(60);
    expect(res.breakdown.total_score).toBe(60);
    expect(res.breakdown.leaderboard_score).toBe(0);
  });

  test('5. Student logs in and solves Medium Daily Challenge -> +100 Daily Challenge, +100 Leaderboard, +20 Activity Streak Bonus', async () => {
    const { recordDailyLogin } = require('../src/services/streakService');
    await recordDailyLogin(user2);
    const res = await awardDailyChallengeSolve(user2, 'dc-med-1');
    expect(res.pointsAwarded).toBe(100);
    expect(res.breakdown.daily_challenge_points).toBe(100);
    expect(res.breakdown.leaderboard_score).toBe(100);
    expect(res.breakdown.streak_bonus).toBe(20);
    expect(res.breakdown.total_score).toBe(120);
  });

  test('6. Idempotency: Solving the same Daily Challenge again yields +0 points', async () => {
    const res = await awardDailyChallengeSolve(user2, 'dc-med-1');
    expect(res.pointsAwarded).toBe(0);
    expect(res.breakdown.daily_challenge_points).toBe(100);
    expect(res.breakdown.leaderboard_score).toBe(100);
    expect(res.breakdown.streak_bonus).toBe(20);
    expect(res.breakdown.total_score).toBe(120);
  });

  test('7. Leaderboard Ranking: Strictly based on Daily Challenge points (User2 outranks User1 regardless of practice points)', async () => {
    // User1 has 60 practice points, 0 Daily Challenge points
    // User2 has 100 Daily Challenge points, 20 streak bonus (120 total)
    const leaders = await getCompetitiveLeaders(100, 'all');

    const u1 = leaders.find(l => l.id === user1);
    const u2 = leaders.find(l => l.id === user2);

    expect(u1).toBeDefined();
    expect(u2).toBeDefined();

    expect(u1.competitive_points).toBe(0);
    expect(u2.competitive_points).toBe(100);
    expect(u2.rank).toBeLessThan(u1.rank);
  });

  test('8. Objective attempt scoring calculations', () => {
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
});
