const { getDatabaseDriver, getPostgres } = require('./repository');
const PostgresRepository = require('./postgresRepository');

function getRepository() {
  const driver = getDatabaseDriver();
  if (driver === 'postgres') return new PostgresRepository(getPostgres());

  // SQLite is intentionally lazy-loaded so production never loads
  // better-sqlite3/native SQLite code when PostgreSQL is configured.
  const SqliteRepository = require('./sqliteRepository');
  const { getSqlite } = require('./repository');
  return new SqliteRepository(getSqlite());
}

function assertDriverCompatibility() {
  const driver = getDatabaseDriver();
  return { driver, repository: getRepository() };
}

module.exports = { getRepository, assertDriverCompatibility };
