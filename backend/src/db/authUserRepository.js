const SqliteRepository = require('./sqliteRepository');
const PostgresRepository = require('./postgresRepository');
const { getDatabaseDriver } = require('./repository');

function createRepository() {
  return getDatabaseDriver() === 'postgres' ? new PostgresRepository() : new SqliteRepository();
}

async function findUserById(id) {
  return createRepository().one('SELECT id, name, email, role, created_at FROM users WHERE id = ?', [id]);
}

async function findUserByEmail(email) {
  return createRepository().one('SELECT id, name, email, role FROM users WHERE email = ?', [email]);
}

async function provisionUser({ id, name, email }) {
  const repo = createRepository();
  await repo.execute(`
    INSERT INTO users (id, name, email, role)
    VALUES (?, ?, ?, 'user')
    ON CONFLICT(id) DO UPDATE SET email=excluded.email
  `, [id, name, email]);
  return findUserById(id);
}

async function updateProfile(id, updates) {
  const entries = Object.entries(updates).filter(([, value]) => value !== undefined);
  if (!entries.length) return findUserById(id);
  const fields = entries.map(([key]) => `${key} = ?`).join(', ');
  const values = entries.map(([, value]) => value);
  const repo = createRepository();
  await repo.execute(`UPDATE users SET ${fields} WHERE id = ?`, [...values, id]);
  return findUserById(id);
}

module.exports = { findUserById, findUserByEmail, provisionUser, updateProfile };
