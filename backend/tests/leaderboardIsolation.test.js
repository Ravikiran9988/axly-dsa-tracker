process.env.NODE_ENV = 'test';

const { initSchema } = require('../src/db/db');
const { getRepository } = require('../src/db/repositoryFactory');
const {
  awardPracticeSolve,
  awardDailyChallengeSolve,
  getUserScoreBreakdown
} = require('../src/services/gamificationService');
const { getCompetitiveLeaders } = require('../src/services/leaderboardService');

const repo = getRepository();

describe('Leaderboard isolation: practice is individual-only', () => {
  const practiceUser = 'usr-lb-isolation-practice';
  const dailyUser = 'usr-lb-isolation-daily';

  beforeAll(async () => {
    initSchema();

    await repo.execute('DELETE FROM points_ledger WHERE user_id IN (?, ?)', [practiceUser, dailyUser]);
    await repo.execute('DELETE FROM users WHERE id IN (?, ?)', [practiceUser, dailyUser]);

    await repo.execute(`
      INSERT INTO users (
        id, name, email, role, points, practice_points,
        daily_challenge_points, streak_bonus, leaderboard_score, streak, longest_streak
      ) VALUES
        (?, 'Practice Only', 'practice-only@axly.test', 'user', 0, 0, 0, 0, 0, 1, 1),
        (?, 'Daily Champion', 'daily-only@axly.test', 'user', 0, 0, 0, 0, 0, 1, 1)
    `, [practiceUser, dailyUser]);

    await repo.execute(`
      INSERT OR REPLACE INTO questions (id, title, difficulty, url, is_practice, is_active)
      VALUES ('lb-practice-easy', 'Leaderboard Isolation Practice', 'easy', 'internal://lb-practice-easy', 1, 1)
    `);

    await repo.execute(`
      INSERT OR REPLACE INTO daily_challenge_problems
        (id, title, slug, description, difficulty, points, status, is_active)
      VALUES ('lb-daily-hard', 'Leaderboard Isolation Daily', 'lb-daily-hard', 'Test', 'hard', 150, 'published', 1)
    `);
  });

  afterAll(async () => {
    await repo.execute('DELETE FROM points_ledger WHERE user_id IN (?, ?)', [practiceUser, dailyUser]);
    await repo.execute('DELETE FROM users WHERE id IN (?, ?)', [practiceUser, dailyUser]);
    await repo.execute("DELETE FROM questions WHERE id = 'lb-practice-easy'");
    await repo.execute("DELETE FROM daily_challenge_problems WHERE id = 'lb-daily-hard'");
  });

  test('practice solve increases individual score but never competitive leaderboard score', async () => {
    const before = await getUserScoreBreakdown(practiceUser);
    expect(before.practice_points).toBe(0);
    expect(before.leaderboard_score).toBe(0);

    const award = await awardPracticeSolve(practiceUser, 'lb-practice-easy');

    expect(award.pointsAwarded).toBe(10);
    expect(award.breakdown.practice_points).toBe(10);
    expect(award.breakdown.total_score).toBe(10);
    expect(award.breakdown.leaderboard_score).toBe(0);

    const dbUser = await repo.one(
      'SELECT practice_points, daily_challenge_points, leaderboard_score, points FROM users WHERE id = ?',
      [practiceUser]
    );
    expect(Number(dbUser.practice_points)).toBe(10);
    expect(Number(dbUser.daily_challenge_points)).toBe(0);
    expect(Number(dbUser.leaderboard_score)).toBe(0);
    expect(Number(dbUser.points)).toBe(10);
  });

  test('daily challenge solve increases competitive leaderboard score', async () => {
    const award = await awardDailyChallengeSolve(dailyUser, 'lb-daily-hard');

    expect(award.pointsAwarded).toBe(150);
    expect(award.breakdown.daily_challenge_points).toBe(150);
    expect(award.breakdown.leaderboard_score).toBe(150);

    const leaders = await getCompetitiveLeaders(100, 'all');
    const practiceEntry = leaders.find(row => row.id === practiceUser);
    const dailyEntry = leaders.find(row => row.id === dailyUser);

    expect(practiceEntry).toBeDefined();
    expect(dailyEntry).toBeDefined();
    expect(Number(practiceEntry.competitive_points)).toBe(0);
    expect(Number(dailyEntry.competitive_points)).toBe(150);
    expect(dailyEntry.rank).toBeLessThan(practiceEntry.rank);
  });
});
