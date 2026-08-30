const { getDatabaseDriver, getSqlite, getPostgres } = require('./repository');
const PostgresRepository = require('./postgresRepository');

function getRepository() {
  const driver = getDatabaseDriver();
  if (driver === 'postgres') return new PostgresRepository(getPostgres());

  // SQLite is local/test-only. Load the adapter lazily so better-sqlite3 is
  // never initialized by a production PostgreSQL process.
  const SqliteRepository = require('./sqliteRepository');
  return new SqliteRepository(getSqlite());
}

function assertDriverCompatibility() {
  const driver = getDatabaseDriver();
  return { driver, repository: getRepository() };
}

module.exports = { getRepository, assertDriverCompatibility };
