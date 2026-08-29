const { getRepository } = require('./repositoryFactory');

function getRepo() {
  return getRepository();
}

async function findUserById(id) {
  return getRepo().one('SELECT id, name, email, role, avatar_url, institution, points, streak, longest_streak, rank, last_active_at, created_at FROM users WHERE id = ?', [id]);
}

async function findUserByEmail(email) {
  return getRepo().one('SELECT id, name, email, role, avatar_url, institution, points, streak, longest_streak, rank, last_active_at, created_at FROM users WHERE LOWER(email) = LOWER(?)', [email]);
}

async function provisionUser({ id, name, email }) {
  const repo = getRepo();
  await repo.execute(`
    INSERT INTO users (id, name, email, role)
    VALUES (?, ?, ?, 'user')
    ON CONFLICT(id) DO UPDATE SET email = EXCLUDED.email
  `, [id, name, email]);
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

module.exports = { findUserById, findUserByEmail, provisionUser, updateProfile };
