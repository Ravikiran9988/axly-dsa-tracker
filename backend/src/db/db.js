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

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      name TEXT PRIMARY KEY
    );

    INSERT OR IGNORE INTO roles (name) VALUES ('admin'), ('user'), ('mentor');

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL DEFAULT 'user' REFERENCES roles(name),
      username TEXT,
      institution TEXT DEFAULT 'Axly Tech Academy',
      bio TEXT,
      github_url TEXT,
      linkedin_url TEXT,
      skills TEXT DEFAULT '["JavaScript", "Data Structures", "Algorithms"]',
      avatar_url TEXT,
      points INTEGER DEFAULT 100,
      streak INTEGER DEFAULT 1,
      longest_streak INTEGER DEFAULT 1,
      rank INTEGER DEFAULT 1,
      last_active_at TEXT DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

    CREATE TABLE IF NOT EXISTS topics (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    );

    CREATE INDEX IF NOT EXISTS idx_topics_name ON topics(name);

    CREATE TABLE IF NOT EXISTS cohorts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      mentor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      start_date TEXT,
      end_date TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cohort_members (
      id TEXT PRIMARY KEY,
      cohort_id TEXT NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      joined_at TEXT NOT NULL DEFAULT (datetime('now')),
      CONSTRAINT unique_cohort_member UNIQUE (cohort_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
      topic_id TEXT REFERENCES topics(id) ON DELETE SET NULL,
      url TEXT NOT NULL,
      description TEXT,
      problem_statement TEXT,
      constraints TEXT,
      input_format TEXT,
      output_format TEXT,
      example_input TEXT,
      example_output TEXT,
      hints TEXT,
      tags TEXT DEFAULT '[]',
      estimated_time TEXT DEFAULT '30 mins',
      points INTEGER DEFAULT 20,
      assigned_date TEXT,
      due_date TEXT,
      status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
      supported_languages TEXT DEFAULT '["python", "javascript", "java", "cpp", "c", "typescript"]',
      starter_code TEXT,
      current_version INTEGER NOT NULL DEFAULT 1,
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
      cohort_id TEXT REFERENCES cohorts(id) ON DELETE SET NULL,
      assigned_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      status TEXT NOT NULL CHECK (status IN ('assigned', 'ongoing', 'submitted', 'under_review', 'completed', 'incomplete', 'overdue', 'unassigned')),
      priority TEXT DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High')),
      instructions TEXT,
      assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
      due_date TEXT,
      CONSTRAINT unique_user_question_assignment UNIQUE (user_id, question_id)
    );

    CREATE INDEX IF NOT EXISTS idx_assignments_user_id ON assignments(user_id);
    CREATE INDEX IF NOT EXISTS idx_assignments_question_id ON assignments(question_id);
    CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);

    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
      assignment_id TEXT REFERENCES assignments(id) ON DELETE SET NULL,
      submission_type TEXT DEFAULT 'code' CHECK (submission_type IN ('code', 'github')),
      language TEXT DEFAULT 'javascript',
      source_code TEXT,
      github_url TEXT,
      status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'attempted', 'solved', 'skipped', 'pending', 'submitted', 'under_review', 'approved', 'changes_requested', 'completed', 'rejected')),
      review_status TEXT DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'changes_requested', 'rejected')),
      feedback TEXT,
      reviewer_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      reviewed_at TEXT,
      passed_tests INTEGER DEFAULT 0,
      total_tests INTEGER DEFAULT 0,
      execution_time_ms REAL DEFAULT 0,
      attempted_at TEXT,
      solved_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      CONSTRAINT unique_user_question_submission UNIQUE (user_id, question_id)
    );

    CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON submissions(user_id);
    CREATE INDEX IF NOT EXISTS idx_submissions_question_id ON submissions(question_id);
    CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);

    CREATE TABLE IF NOT EXISTS code_submissions_log (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      submission_type TEXT DEFAULT 'code',
      language TEXT,
      source_code TEXT,
      github_url TEXT,
      status TEXT NOT NULL,
      passed_tests INTEGER NOT NULL,
      total_tests INTEGER NOT NULL,
      execution_time_ms REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_code_submissions_log_user ON code_submissions_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_code_submissions_log_question ON code_submissions_log(question_id);

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'general' CHECK (type IN ('assignment', 'submission', 'mentor', 'cohort', 'general')),
      link TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

    CREATE TABLE IF NOT EXISTS badges (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      icon TEXT NOT NULL,
      criteria TEXT
    );

    CREATE TABLE IF NOT EXISTS user_badges (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      badge_id TEXT NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
      awarded_at TEXT NOT NULL DEFAULT (datetime('now')),
      CONSTRAINT unique_user_badge UNIQUE (user_id, badge_id)
    );

    CREATE TABLE IF NOT EXISTS live_sessions (
      id TEXT PRIMARY KEY,
      cohort_id TEXT REFERENCES cohorts(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      mentor_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      title TEXT NOT NULL,
      meet_link TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS daily_questions (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
      date TEXT NOT NULL UNIQUE,
      created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_daily_questions_date ON daily_questions(date);
  `);

  // Safe individual column migrations
  function addColumnIfNotExists(table, column, def) {
    try {
      const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
      if (!cols.includes(column)) {
        db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`).run();
      }
    } catch (e) {
      // ignore
    }
  }

  // Users migrations
  addColumnIfNotExists('users', 'username', 'TEXT');
  addColumnIfNotExists('users', 'institution', "TEXT DEFAULT 'Axly Tech Academy'");
  addColumnIfNotExists('users', 'bio', 'TEXT');
  addColumnIfNotExists('users', 'github_url', 'TEXT');
  addColumnIfNotExists('users', 'linkedin_url', 'TEXT');
  addColumnIfNotExists('users', 'skills', 'TEXT DEFAULT \'["JavaScript", "Data Structures", "Algorithms"]\'');
  addColumnIfNotExists('users', 'avatar_url', 'TEXT');
  addColumnIfNotExists('users', 'points', 'INTEGER DEFAULT 100');
  addColumnIfNotExists('users', 'streak', 'INTEGER DEFAULT 1');
  addColumnIfNotExists('users', 'longest_streak', 'INTEGER DEFAULT 1');
  addColumnIfNotExists('users', 'rank', 'INTEGER DEFAULT 1');
  addColumnIfNotExists('users', 'last_active_at', "TEXT DEFAULT (datetime('now'))");

  // Questions migrations
  addColumnIfNotExists('questions', 'description', 'TEXT');
  addColumnIfNotExists('questions', 'problem_statement', 'TEXT');
  addColumnIfNotExists('questions', 'constraints', 'TEXT');
  addColumnIfNotExists('questions', 'input_format', 'TEXT');
  addColumnIfNotExists('questions', 'output_format', 'TEXT');
  addColumnIfNotExists('questions', 'example_input', 'TEXT');
  addColumnIfNotExists('questions', 'example_output', 'TEXT');
  addColumnIfNotExists('questions', 'hints', 'TEXT');
  addColumnIfNotExists('questions', 'tags', "TEXT DEFAULT '[]'");
  addColumnIfNotExists('questions', 'estimated_time', "TEXT DEFAULT '30 mins'");
  addColumnIfNotExists('questions', 'points', 'INTEGER DEFAULT 20');
  addColumnIfNotExists('questions', 'assigned_date', 'TEXT');
  addColumnIfNotExists('questions', 'due_date', 'TEXT');
  addColumnIfNotExists('questions', 'status', "TEXT DEFAULT 'published'");
  addColumnIfNotExists('questions', 'supported_languages', 'TEXT DEFAULT \'["python", "javascript", "java", "cpp", "c", "typescript"]\'');
  addColumnIfNotExists('questions', 'starter_code', 'TEXT');
  addColumnIfNotExists('questions', 'current_version', 'INTEGER NOT NULL DEFAULT 1');

  // Assignments migrations
  addColumnIfNotExists('assignments', 'cohort_id', 'TEXT');
  addColumnIfNotExists('assignments', 'due_date', 'TEXT');
  addColumnIfNotExists('assignments', 'priority', "TEXT DEFAULT 'Medium'");
  addColumnIfNotExists('assignments', 'instructions', 'TEXT');

  // Submissions migrations
  addColumnIfNotExists('submissions', 'assignment_id', 'TEXT');
  addColumnIfNotExists('submissions', 'submission_type', "TEXT DEFAULT 'code'");
  addColumnIfNotExists('submissions', 'github_url', 'TEXT');
  addColumnIfNotExists('submissions', 'review_status', "TEXT DEFAULT 'pending'");
  addColumnIfNotExists('submissions', 'feedback', 'TEXT');
  addColumnIfNotExists('submissions', 'reviewer_id', 'TEXT');
  addColumnIfNotExists('submissions', 'reviewed_at', 'TEXT');
  addColumnIfNotExists('submissions', 'language', "TEXT DEFAULT 'javascript'");
  addColumnIfNotExists('submissions', 'source_code', 'TEXT');
  addColumnIfNotExists('submissions', 'passed_tests', 'INTEGER DEFAULT 0');
  addColumnIfNotExists('submissions', 'total_tests', 'INTEGER DEFAULT 0');
  addColumnIfNotExists('submissions', 'execution_time_ms', 'REAL DEFAULT 0');
  addColumnIfNotExists('submissions', 'created_at', "TEXT DEFAULT (datetime('now'))");
  addColumnIfNotExists('submissions', 'updated_at', "TEXT DEFAULT (datetime('now'))");
}

initSchema();

module.exports = {
  db,
  initSchema
};
