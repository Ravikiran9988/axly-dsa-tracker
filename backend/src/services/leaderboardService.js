const { db } = require('../db/db');

// Single source of truth for competitive leaderboard ordering.
const COMPETITIVE_ORDER = 'points DESC, streak DESC, longest_streak DESC, name ASC, id ASC';

function refreshCompetitiveRanks() {
  const users = db.prepare(`SELECT id FROM users WHERE role='user' ORDER BY ${COMPETITIVE_ORDER}`).all();
  const update = db.prepare('UPDATE users SET rank=? WHERE id=?');
  db.transaction(() => users.forEach((u, i) => update.run(i + 1, u.id)))();
}

function getCompetitiveLeaders(limit=100) {
  return db.prepare(`SELECT id,name,email,avatar_url,COALESCE(points,0) AS points,COALESCE(streak,0) AS streak,COALESCE(longest_streak,0) AS longest_streak,institution FROM users WHERE role='user' ORDER BY ${COMPETITIVE_ORDER} LIMIT ?`).all(limit);
}

module.exports = { COMPETITIVE_ORDER, refreshCompetitiveRanks, getCompetitiveLeaders };
