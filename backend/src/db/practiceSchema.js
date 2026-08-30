const { getDatabaseDriver } = require('./repository');

function addColumnIfNotExists(db, table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
  if (!columns.includes(column)) {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
  }
}

/**
 * Practice schema compatibility helper.
 *
 * Production uses the Supabase PostgreSQL migrations, so never load the
 * native better-sqlite3 module from this path in production. SQLite schema
 * bootstrapping remains available for local/test environments.
 */
function ensurePracticeSchema() {
  if (getDatabaseDriver() === 'postgres') return;

  const { db } = require('./db');
  db.exec(`
    CREATE TABLE IF NOT EXISTS patterns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applicable_topics TEXT NOT NULL DEFAULT '[]'
    );
    CREATE INDEX IF NOT EXISTS idx_patterns_name ON patterns(name);
  `);

  addColumnIfNotExists(db, 'questions', 'slug', 'TEXT');
  addColumnIfNotExists(db, 'questions', 'pattern_id', 'TEXT');
  addColumnIfNotExists(db, 'questions', 'secondary_topics', "TEXT DEFAULT '[]'");
  addColumnIfNotExists(db, 'questions', 'prerequisites', "TEXT DEFAULT '[]'");
  addColumnIfNotExists(db, 'questions', 'solution_approach', 'TEXT');
  addColumnIfNotExists(db, 'questions', 'is_practice', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfNotExists(db, 'questions', 'estimated_time', 'INTEGER');

  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_questions_practice_slug
      ON questions(slug) WHERE slug IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_questions_is_practice ON questions(is_practice);
    CREATE TABLE IF NOT EXISTS practice_progress (
      user_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'in_progress',
      started_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      solved_at TEXT,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_submission_id TEXT,
      PRIMARY KEY(user_id, question_id)
    );
    CREATE INDEX IF NOT EXISTS idx_practice_progress_user_status
      ON practice_progress(user_id,status);
  `);
}

module.exports = { ensurePracticeSchema };
