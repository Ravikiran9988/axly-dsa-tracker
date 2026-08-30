/**
 * Database repository boundary.
 *
 * PostgreSQL is the production driver. SQLite is kept for local/test use only
 * and is loaded lazily so native better-sqlite3 is never initialized in a
 * production PostgreSQL process.
 */
const postgres = require('./postgres');

function getDatabaseDriver() {
  if (process.env.NODE_ENV === 'production' && process.env.DB_DRIVER === 'sqlite') {
    throw new Error('Production environment cannot run on SQLite. Set DATABASE_URL and DB_DRIVER=postgres.');
  }

  const driver = (process.env.DB_DRIVER || (process.env.NODE_ENV === 'production' ? 'postgres' : 'sqlite')).toLowerCase();

  if (driver === 'postgres') {
    if (!postgres.pool) {
      throw new Error('PostgreSQL repository requested but DATABASE_URL/SUPABASE_DB_URL is not configured');
    }
    return 'postgres';
  }

  if (driver === 'sqlite') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Production environment cannot run on SQLite. Set DATABASE_URL and DB_DRIVER=postgres.');
    }
    return 'sqlite';
  }

  throw new Error(`Unsupported DB_DRIVER: ${driver}`);
}

function getSqlite() {
  // Lazy-load SQLite so production never initializes better-sqlite3.
  return require('./db').db;
}

function getPostgres() {
  if (!postgres.pool) throw new Error('PostgreSQL pool is not configured');
  return postgres.pool;
}

module.exports = {
  getDatabaseDriver,
  getSqlite,
  getPostgres,
  postgresPool: postgres.pool
};
