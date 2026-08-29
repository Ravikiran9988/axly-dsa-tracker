const request = require('supertest');
const app = require('../src/app');
const { db, initSchema } = require('../src/db/db');
const { seedDatabase } = require('../src/db/seed');
const { seedPracticeProblems } = require('../src/db/practiceSeed');
const {
  recordDailyLogin,
  recordDailyChallengeSolve,
  getUserStreaks,
  getCalendarDate,
  getDaysDifference
} = require('../src/services/streakService');
const {
  awardPracticeSolve,
  awardDailyChallengeSolve,
  getUserScoreBreakdown,
  syncUserScore
} = require('../src/services/gamificationService');
const { getCompetitiveLeaders } = require('../src/services/leaderboardService');

describe('Independent Streaks: Individual Activity Streak & Daily Challenge Streak', () => {
  beforeAll(async () => {
    initSchema();
    seedDatabase();
    seedPracticeProblems();
  });

  const testUser1 = 'usr-streak-test-1';
  const testUser2 = 'usr-streak-test-2';

  beforeEach(() => {
    // Create clean test users
    db.prepare('DELETE FROM users WHERE id IN (?, ?)').run(testUser1, testUser2);
    db.prepare('DELETE FROM user_daily_activity WHERE user_id IN (?, ?)').run(testUser1, testUser2);
    db.prepare('DELETE FROM points_ledger WHERE user_id IN (?, ?)').run(testUser1, testUser2);
    db.prepare('DELETE FROM submissions WHERE user_id IN (?, ?)').run(testUser1, testUser2);

    db.prepare(`
      INSERT INTO users (id, name, email, role, individual_streak, individual_best_streak, daily_challenge_streak, daily_challenge_best_streak, streak, longest_streak, points)
      VALUES (?, 'Streak Tester 1', 'streak1@test.com', 'user', 0, 0, 0, 0, 0, 0, 0),
             (?, 'Streak Tester 2', 'streak2@test.com', 'user', 0, 0, 0, 0, 0, 0, 0)
    `).run(testUser1, testUser2);
  });

  test('TEST 1: New user logs in -> Individual Streak = 1, Daily Challenge Streak = 0', async () => {
    await recordDailyLogin(testUser1, '2026-08-20');
    const streaks = await getUserStreaks(testUser1);

    expect(streaks.individualStreak).toBe(1);
    expect(streaks.individualBestStreak).toBe(1);
    expect(streaks.dailyChallengeStreak).toBe(0);
    expect(streaks.dailyChallengeBestStreak).toBe(0);
  });

  test('TEST 2: User logs in twice on same day -> Individual Streak increments only once', async () => {
    await recordDailyLogin(testUser1, '2026-08-20');
    const firstLogin = await getUserStreaks(testUser1);
    expect(firstLogin.individualStreak).toBe(1);

    // Second login same calendar date
    await recordDailyLogin(testUser1, '2026-08-20');
    const secondLogin = await getUserStreaks(testUser1);
    expect(secondLogin.individualStreak).toBe(1);
  });

  test('TEST 3: User logs in on consecutive days -> Individual Streak increases daily', async () => {
    await recordDailyLogin(testUser1, '2026-08-20');
    await recordDailyLogin(testUser1, '2026-08-21');
    await recordDailyLogin(testUser1, '2026-08-22');

    const streaks = await getUserStreaks(testUser1);
    expect(streaks.individualStreak).toBe(3);
    expect(streaks.individualBestStreak).toBe(3);
    expect(streaks.dailyChallengeStreak).toBe(0);
  });

  test('TEST 4: User misses a day and logs in next day -> Individual Streak resets to 1, Best preserved', async () => {
    // Build 3-day streak
    await recordDailyLogin(testUser1, '2026-08-20');
    await recordDailyLogin(testUser1, '2026-08-21');
    await recordDailyLogin(testUser1, '2026-08-22');

    // Miss 2026-08-23, login on 2026-08-24
    await recordDailyLogin(testUser1, '2026-08-24');

    const streaks = await getUserStreaks(testUser1);
    expect(streaks.individualStreak).toBe(1);
    expect(streaks.individualBestStreak).toBe(3);
  });

  test('TEST 5: User logs in but does not solve Daily Challenge -> Daily Challenge Streak remains 0', async () => {
    await recordDailyLogin(testUser1, '2026-08-20');
    await recordDailyLogin(testUser1, '2026-08-21');

    const streaks = await getUserStreaks(testUser1);
    expect(streaks.individualStreak).toBe(2);
    expect(streaks.dailyChallengeStreak).toBe(0);
  });

  test('TEST 6: User solves Daily Challenge -> Daily Challenge Streak increases independently', async () => {
    await awardDailyChallengeSolve(testUser1, 'dc-001');

    const streaks = await getUserStreaks(testUser1);
    expect(streaks.dailyChallengeStreak).toBe(1);
    expect(streaks.dailyChallengeBestStreak).toBe(1);
  });

  test('TEST 7: User solves Practice only -> Individual Streak and Challenge Streak unaffected', async () => {
    const beforeStreaks = await getUserStreaks(testUser1);
    expect(beforeStreaks.individualStreak).toBe(0);
    expect(beforeStreaks.dailyChallengeStreak).toBe(0);

    await awardPracticeSolve(testUser1, 'q-two-sum');

    const afterStreaks = await getUserStreaks(testUser1);
    expect(afterStreaks.individualStreak).toBe(0);
    expect(afterStreaks.dailyChallengeStreak).toBe(0);

    const score = await getUserScoreBreakdown(testUser1);
    expect(score.practice_points).toBeGreaterThan(0);
    expect(score.daily_challenge_points).toBe(0);
    expect(score.leaderboard_score).toBe(0);
  });

  test('TEST 8: User completes Daily Challenge twice on same day -> Daily Challenge Streak increments once', async () => {
    await recordDailyChallengeSolve(testUser1, '2026-08-25');
    await recordDailyChallengeSolve(testUser1, '2026-08-25');

    const streaks = await getUserStreaks(testUser1);
    expect(streaks.dailyChallengeStreak).toBe(1);
  });

  test('TEST 9: User solves Daily Challenge on consecutive days -> Challenge streak increments', async () => {
    await recordDailyChallengeSolve(testUser1, '2026-08-25');
    await recordDailyChallengeSolve(testUser1, '2026-08-26');
    await recordDailyChallengeSolve(testUser1, '2026-08-27');

    const streaks = await getUserStreaks(testUser1);
    expect(streaks.dailyChallengeStreak).toBe(3);
    expect(streaks.dailyChallengeBestStreak).toBe(3);
  });

  test('TEST 10: User misses Daily Challenge and solves later -> Challenge streak resets to 1, Best preserved', async () => {
    await recordDailyChallengeSolve(testUser1, '2026-08-25');
    await recordDailyChallengeSolve(testUser1, '2026-08-26');
    // Miss 2026-08-27, solve on 2026-08-28
    await recordDailyChallengeSolve(testUser1, '2026-08-28');

    const streaks = await getUserStreaks(testUser1);
    expect(streaks.dailyChallengeStreak).toBe(1);
    expect(streaks.dailyChallengeBestStreak).toBe(2);
  });

  test('TEST 11: Leaderboard ranking is based ONLY on Daily Challenge points', async () => {
    // User 1 has 500 practice points, 0 daily challenge points
    for (let i = 1; i <= 10; i++) {
      db.prepare(`
        INSERT INTO points_ledger (id, user_id, source_type, source_id, points, category, reason, created_at)
        VALUES (?, ?, 'PRACTICE_SOLVE', ?, 50, 'practice', 'Practice', datetime('now'))
      `).run(`pl-p-u1-${i}`, testUser1, `p-${i}`);
    }
    await syncUserScore(testUser1);

    // User 2 has 100 daily challenge points
    db.prepare(`
      INSERT INTO points_ledger (id, user_id, source_type, source_id, points, category, reason, created_at)
      VALUES (?, ?, 'DAILY_CHALLENGE_SOLVE', 'dc-001', 100, 'daily_challenge', 'Daily Challenge', datetime('now'))
    `).run(`pl-dc-u2-1`, testUser2);
    await syncUserScore(testUser2);

    const leaders = await getCompetitiveLeaders(10, 'all');
    const u1Rank = leaders.find(l => l.id === testUser1);
    const u2Rank = leaders.find(l => l.id === testUser2);

    // User 2 must rank higher than User 1 because User 2 has Daily Challenge points
    expect(u2Rank.rank).toBeLessThan(u1Rank.rank);
    expect(u2Rank.competitive_points).toBe(100);
    expect(u1Rank.competitive_points).toBe(0);
  });

  test('TEST 12: Total Score calculation = Practice + Daily Challenge + Streak Bonus', async () => {
    db.prepare(`
      INSERT INTO points_ledger (id, user_id, source_type, source_id, points, category, reason, created_at)
      VALUES (?, ?, 'PRACTICE_SOLVE', 'p-1', 200, 'practice', 'Practice', datetime('now')),
             (?, ?, 'DAILY_CHALLENGE_SOLVE', 'dc-1', 500, 'daily_challenge', 'DC', datetime('now')),
             (?, ?, 'STREAK_REWARD', '2026-08-29', 40, 'streak', 'Streak', datetime('now'))
    `).run(`pl-t12-p`, testUser1, `pl-t12-dc`, testUser1, `pl-t12-s`, testUser1);

    const score = await syncUserScore(testUser1);
    expect(score.practice_points).toBe(200);
    expect(score.daily_challenge_points).toBe(500);
    expect(score.streak_bonus).toBe(40);
    expect(score.total_score).toBe(740);
    expect(score.leaderboard_score).toBe(500);
  });

  test('TEST 13: Timezone boundary produces correct YYYY-MM-DD date', () => {
    const d1 = getCalendarDate(new Date('2026-08-29T18:35:00.000Z'), 'Asia/Kolkata'); // 12:05 AM next day in IST
    expect(d1).toBe('2026-08-30');

    const diff = getDaysDifference('2026-08-29', '2026-08-30');
    expect(diff).toBe(1);
  });

  test('TEST 14: Auth login returns explicit streak fields', async () => {
    const res = await request(app)
      .post('/api/v1/auth/dev-login')
      .send({ email: 'streak1@test.com', role: 'user' });

    expect(res.status).toBe(200);
    expect(res.body.user).toHaveProperty('individualStreak');
    expect(res.body.user).toHaveProperty('individualBestStreak');
    expect(res.body.user).toHaveProperty('dailyChallengeStreak');
    expect(res.body.user).toHaveProperty('dailyChallengeBestStreak');
    expect(res.body.user.individualStreak).toBeGreaterThanOrEqual(1);
  });
});
