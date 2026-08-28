const { isPostgresConfigured } = require('../db/postgres');

function assertProductionDatabase() {
  if (process.env.NODE_ENV === 'production' && !isPostgresConfigured()) {
    throw new Error('Production database is not configured. Set DATABASE_URL or SUPABASE_DB_URL. SQLite is local/test-only.');
  }
}

module.exports = { assertProductionDatabase };
