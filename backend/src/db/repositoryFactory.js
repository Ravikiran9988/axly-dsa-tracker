const repository = require('./repository');
const PostgresRepository = require('./postgresRepository');

function getRepository() {
  const driver = repository.getDatabaseDriver();
  if (driver === 'postgres') return new PostgresRepository(repository.getPostgres());

  // SQLite is intentionally lazy-loaded so production never loads
  // better-sqlite3/native SQLite code when PostgreSQL is configured.
  const SqliteRepository = require('./sqliteRepository');
  return new SqliteRepository(repository.getSqlite());
}

function assertDriverCompatibility() {
  const driver = getDatabaseDriver();
  return { driver, repository: getRepository() };
}

module.exports = { getRepository, assertDriverCompatibility };
