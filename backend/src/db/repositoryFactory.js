const { getDatabaseDriver, getSqlite, getPostgres } = require('./repository');
const SqliteRepository = require('./sqliteRepository');
const PostgresRepository = require('./postgresRepository');

function getRepository() {
  const driver = getDatabaseDriver();
  if (driver === 'postgres') return new PostgresRepository(getPostgres());
  return new SqliteRepository(getSqlite());
}

function assertDriverCompatibility() {
  const driver = getDatabaseDriver();
  return { driver, repository: getRepository() };
}

module.exports = { getRepository, assertDriverCompatibility };
