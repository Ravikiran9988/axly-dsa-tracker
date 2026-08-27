const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.NODE_ENV === 'test' 
  ? ':memory:' 
  : path.join(__dirname, '../../data/axly_dsa.db');

if (dbPath !== ':memory:') {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize schema if not exists
function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      name TEXT PRIMARY KEY
    );

    INSERT OR IGNORE INTO roles (name) VALUES ('admin'), ('user');

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL DEFAULT 'user' REFERENCES roles(name),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

    CREATE TABLE IF NOT EXISTS topics (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    );

    CREATE INDEX IF NOT EXISTS idx_topics_name ON topics(name);

    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
      topic_id TEXT REFERENCES topics(id) ON DELETE SET NULL,
      url TEXT NOT NULL,
      description TEXT,
      constraints TEXT,
      input_format TEXT,
      output_format TEXT,
      example_input TEXT,
      example_output TEXT,
      starter_code TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
    CREATE INDEX IF NOT EXISTS idx_questions_topic_id ON questions(topic_id);
    CREATE INDEX IF NOT EXISTS idx_questions_is_active ON questions(is_active);

    CREATE TABLE IF NOT EXISTS test_cases (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      input TEXT NOT NULL,
      expected_output TEXT NOT NULL,
      is_hidden INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_test_cases_question_id ON test_cases(question_id);
    CREATE INDEX IF NOT EXISTS idx_test_cases_is_hidden ON test_cases(is_hidden);

    CREATE TABLE IF NOT EXISTS assignments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
      assigned_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      status TEXT NOT NULL CHECK (status IN ('assigned', 'unassigned')),
      assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
      CONSTRAINT unique_user_question_assignment UNIQUE (user_id, question_id)
    );

    CREATE INDEX IF NOT EXISTS idx_assignments_user_id ON assignments(user_id);
    CREATE INDEX IF NOT EXISTS idx_assignments_question_id ON assignments(question_id);
    CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);

    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
      status TEXT NOT NULL CHECK (status IN ('not_started', 'attempted', 'solved', 'skipped')),
      attempted_at TEXT,
      solved_at TEXT,
      language TEXT,
      source_code TEXT,
      passed_tests INTEGER DEFAULT 0,
      total_tests INTEGER DEFAULT 0,
      execution_time_ms REAL DEFAULT 0,
      CONSTRAINT unique_user_question_submission UNIQUE (user_id, question_id)
    );

    CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON submissions(user_id);
    CREATE INDEX IF NOT EXISTS idx_submissions_question_id ON submissions(question_id);
    CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);

    CREATE TABLE IF NOT EXISTS code_submissions_log (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      language TEXT NOT NULL,
      source_code TEXT NOT NULL,
      status TEXT NOT NULL,
      passed_tests INTEGER NOT NULL,
      total_tests INTEGER NOT NULL,
      execution_time_ms REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_code_submissions_log_user ON code_submissions_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_code_submissions_log_question ON code_submissions_log(question_id);

    CREATE TABLE IF NOT EXISTS daily_questions (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
      date TEXT NOT NULL UNIQUE,
      created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_daily_questions_date ON daily_questions(date);
  `);

  // Migrate existing tables if columns are missing
  try {
    const questionCols = db.prepare("PRAGMA table_info(questions)").all().map(c => c.name);
    if (!questionCols.includes('description')) db.prepare("ALTER TABLE questions ADD COLUMN description TEXT").run();
    if (!questionCols.includes('constraints')) db.prepare("ALTER TABLE questions ADD COLUMN constraints TEXT").run();
    if (!questionCols.includes('input_format')) db.prepare("ALTER TABLE questions ADD COLUMN input_format TEXT").run();
    if (!questionCols.includes('output_format')) db.prepare("ALTER TABLE questions ADD COLUMN output_format TEXT").run();
    if (!questionCols.includes('example_input')) db.prepare("ALTER TABLE questions ADD COLUMN example_input TEXT").run();
    if (!questionCols.includes('example_output')) db.prepare("ALTER TABLE questions ADD COLUMN example_output TEXT").run();
    if (!questionCols.includes('starter_code')) db.prepare("ALTER TABLE questions ADD COLUMN starter_code TEXT").run();

    const submissionCols = db.prepare("PRAGMA table_info(submissions)").all().map(c => c.name);
    if (!submissionCols.includes('language')) db.prepare("ALTER TABLE submissions ADD COLUMN language TEXT").run();
    if (!submissionCols.includes('source_code')) db.prepare("ALTER TABLE submissions ADD COLUMN source_code TEXT").run();
    if (!submissionCols.includes('passed_tests')) db.prepare("ALTER TABLE submissions ADD COLUMN passed_tests INTEGER DEFAULT 0").run();
    if (!submissionCols.includes('total_tests')) db.prepare("ALTER TABLE submissions ADD COLUMN total_tests INTEGER DEFAULT 0").run();
    if (!submissionCols.includes('execution_time_ms')) db.prepare("ALTER TABLE submissions ADD COLUMN execution_time_ms REAL DEFAULT 0").run();
  } catch (e) {
    // Ignore migration warnings if already up to date
  }
}

initSchema();

module.exports = {
  db,
  initSchema
};
