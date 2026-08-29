const { getRepository } = require('./repositoryFactory');

function getRepo() {
  return getRepository();
}

async function findUserById(id) {
  return getRepo().one(
    `SELECT id, name, email, role, avatar_url, institution, points, 
            practice_points, daily_challenge_points, streak_bonus, leaderboard_score,
            individual_streak, individual_best_streak, daily_challenge_streak, daily_challenge_best_streak,
            streak, longest_streak, rank, email_verified, last_login_date, last_daily_challenge_solve_date,
            last_active_at, created_at 
     FROM users WHERE id = ?`,
    [id]
  );
}

async function findUserByEmail(email) {
  return getRepo().one(
    `SELECT id, name, email, role, password_hash, avatar_url, institution, points, 
            practice_points, daily_challenge_points, streak_bonus, leaderboard_score,
            individual_streak, individual_best_streak, daily_challenge_streak, daily_challenge_best_streak,
            streak, longest_streak, rank, email_verified, last_login_date, last_daily_challenge_solve_date,
            last_active_at, created_at 
     FROM users WHERE LOWER(email) = LOWER(?)`,
    [email]
  );
}

async function provisionUser({ id, name, email, password_hash = null, email_verified = 1 }) {
  const repo = getRepo();
  await repo.execute(`
    INSERT INTO users (id, name, email, role, password_hash, email_verified)
    VALUES (?, ?, ?, 'user', ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      email = EXCLUDED.email,
      name = COALESCE(users.name, EXCLUDED.name),
      password_hash = COALESCE(EXCLUDED.password_hash, users.password_hash),
      email_verified = CASE WHEN EXCLUDED.email_verified = 1 THEN 1 ELSE users.email_verified END
  `, [id, name, email, password_hash, email_verified]);
  return findUserById(id);
}

async function updatePassword(id, passwordHash) {
  const repo = getRepo();
  await repo.execute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, id]);
  return findUserById(id);
}

async function setEmailVerified(id, isVerified = 1) {
  const repo = getRepo();
  await repo.execute('UPDATE users SET email_verified = ? WHERE id = ?', [isVerified ? 1 : 0, id]);
  return findUserById(id);
}

async function updateProfile(id, updates) {
  const entries = Object.entries(updates).filter(([, value]) => value !== undefined);
  if (!entries.length) return findUserById(id);
  const fields = entries.map(([key]) => `${key} = ?`).join(', ');
  const values = entries.map(([, value]) => value);
  const repo = getRepo();
  await repo.execute(`UPDATE users SET ${fields} WHERE id = ?`, [...values, id]);
  return findUserById(id);
}

// Token operations (email verification & password reset)
async function createAuthToken({ id, userId, tokenHash, tokenType, expiresAt }) {
  const repo = getRepo();
  await repo.execute(
    'INSERT INTO auth_tokens (id, user_id, token_hash, token_type, expires_at) VALUES (?, ?, ?, ?, ?)',
    [id, userId, tokenHash, tokenType, expiresAt]
  );
}

async function findAuthTokenByHash(tokenHash, tokenType) {
  const repo = getRepo();
  return repo.one(
    'SELECT id, user_id, token_hash, token_type, expires_at, used_at, created_at FROM auth_tokens WHERE token_hash = ? AND token_type = ?',
    [tokenHash, tokenType]
  );
}

async function markAuthTokenUsed(id) {
  const repo = getRepo();
  await repo.execute(
    "UPDATE auth_tokens SET used_at = datetime('now') WHERE id = ?",
    [id]
  );
}

async function invalidateUserTokens(userId, tokenType) {
  const repo = getRepo();
  await repo.execute(
    "UPDATE auth_tokens SET used_at = datetime('now') WHERE user_id = ? AND token_type = ? AND used_at IS NULL",
    [userId, tokenType]
  );
}

module.exports = {
  findUserById,
  findUserByEmail,
  provisionUser,
  updatePassword,
  setEmailVerified,
  updateProfile,
  createAuthToken,
  findAuthTokenByHash,
  markAuthTokenUsed,
  invalidateUserTokens
};
