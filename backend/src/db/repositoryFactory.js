const { getDatabaseDriver, getSqlite, getPostgres } = require('./repository');

function assertDriverCompatibility() {
  const driver = getDatabaseDriver();
  if (driver === 'postgres') {
    return { driver, db: getPostgres() };
  }
  return { driver, db: getSqlite() };
}

module.exports = { assertDriverCompatibility };
