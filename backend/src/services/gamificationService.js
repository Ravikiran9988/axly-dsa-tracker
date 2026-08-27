const { db } = require('../db/db');

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function refreshRankings() {
  const users = db.prepare(`
    SELECT id FROM users WHERE role = 'user'
    ORDER BY points DESC, streak DESC, longest_streak DESC, name ASC
  `).all();
  const update = db.prepare('UPDATE users SET rank=? WHERE id=?');
  const tx = db.transaction(() => users.forEach((u, i) => update.run(i + 1, u.id)));
  tx();
}

function awardSolve(userId, questionId, points) {
  const user = db.prepare('SELECT id, points, streak, longest_streak, last_active_at FROM users WHERE id=?').get(userId);
  if (!user) return;

  // Idempotent: a question can only award points once.
  const awarded = db.prepare(`
    SELECT id FROM code_submissions_log
    WHERE user_id=? AND question_id=? AND status IN ('Accepted','approved','Approved')
    LIMIT 1
  `).get(userId, questionId);

  const today = todayUtc();
  const last = user.last_active_at ? String(user.last_active_at).slice(0, 10) : null;
  let streak = Number(user.streak || 0);
  if (last === today) {
    // Keep today's streak unchanged.
  } else if (last) {
    const lastDate = new Date(`${last}T00:00:00Z`);
    const currentDate = new Date(`${today}T00:00:00Z`);
    const days = Math.round((currentDate - lastDate) / 86400000);
    streak = days === 1 ? streak + 1 : 1;
  } else {
    streak = 1;
  }

  const longest = Math.max(Number(user.longest_streak || 0), streak);
  const nextPoints = awarded ? Number(user.points || 0) : Number(user.points || 0) + Number(points || 0);
  db.prepare(`
    UPDATE users SET points=?, streak=?, longest_streak=?, last_active_at=? WHERE id=?
  `).run(nextPoints, streak, longest, new Date().toISOString(), userId);

  refreshRankings();
  return { points: nextPoints, streak, longest_streak: longest, rank: db.prepare('SELECT rank FROM users WHERE id=?').get(userId)?.rank || 1 };
}

module.exports = { awardSolve, refreshRankings };
