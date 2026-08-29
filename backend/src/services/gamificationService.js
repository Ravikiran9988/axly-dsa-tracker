const { getRepository } = require('../db/repositoryFactory');
const { refreshCompetitiveRanks } = require('./leaderboardService');
const { getDailyQuestionForDate } = require('./dailyQuestionService');

const repo = getRepository();

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

async function awardSolve(userId, questionId, startedAt = null) {
  const user = await repo.one(
    'SELECT id, points, streak, longest_streak, last_active_at FROM users WHERE id = ?',
    [userId]
  );
  if (!user) return null;

  // Midnight Rule: If student started before UTC midnight, associate solve with challenge date of startedAt
  const startDate = startedAt ? String(startedAt).slice(0, 10) : todayUtc();
  const daily = await getDailyQuestionForDate(startDate);
  if (!daily || daily.id !== questionId) return null;

  const already = await repo.one(
    "SELECT id FROM code_submissions_log WHERE user_id = ? AND question_id = ? AND status IN ('Accepted', 'approved', 'Approved') LIMIT 1",
    [userId, questionId]
  );

  const today = todayUtc();
  const last = user.last_active_at ? String(user.last_active_at).slice(0, 10) : null;
  let streak = Number(user.streak || 0);

  if (last === today) {
    // Already solved a challenge today; maintain active streak
    if (streak === 0) streak = 1;
  } else if (last) {
    const days = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${last}T00:00:00Z`)) / 86400000);
    streak = days === 1 ? streak + 1 : 1;
  } else {
    streak = 1;
  }

  const longest = Math.max(Number(user.longest_streak || 0), streak);
  const nextPoints = already ? Number(user.points || 0) : Number(user.points || 0) + 100;
  const nowIso = new Date().toISOString();

  await repo.execute(
    'UPDATE users SET points = ?, streak = ?, longest_streak = ?, last_active_at = ? WHERE id = ?',
    [nextPoints, streak, longest, nowIso, userId]
  );

  await refreshCompetitiveRanks();
  return { points: nextPoints, streak, longest_streak: longest };
}

module.exports = {
  awardSolve,
  refreshCompetitiveRanks
};
