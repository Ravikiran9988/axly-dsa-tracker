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
      institution TEXT,
      bio TEXT,
      github_url TEXT,
      linkedin_url TEXT,
      skills TEXT DEFAULT '["JavaScript", "Data Structures", "Algorithms"]',
      avatar_url TEXT,
      password_hash TEXT,
      email_verified INTEGER DEFAULT 1,
      points INTEGER DEFAULT 100,
      streak INTEGER DEFAULT 1,
      longest_streak INTEGER DEFAULT 1,
      rank INTEGER DEFAULT 1,
      last_active_at TEXT DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS auth_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      token_type TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_auth_tokens_hash ON auth_tokens(token_hash);
    CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_type ON auth_tokens(user_id, token_type);

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
      manual_score REAL DEFAULT NULL,
      manual_feedback TEXT,
      started_at TEXT,
      attempt_count INTEGER DEFAULT 0,
      solve_duration_seconds REAL DEFAULT 0,
      test_score REAL DEFAULT 0,
      time_score REAL DEFAULT 0,
      attempt_score REAL DEFAULT 0,
      final_score REAL DEFAULT 0,
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

    CREATE TABLE IF NOT EXISTS daily_challenge_problems (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT UNIQUE,
      difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
      topic_id TEXT REFERENCES topics(id) ON DELETE SET NULL,
      pattern_id TEXT,
      secondary_topics TEXT DEFAULT '[]',
      prerequisites TEXT DEFAULT '[]',
      estimated_time INTEGER DEFAULT 30,
      points INTEGER NOT NULL DEFAULT 100,
      description TEXT NOT NULL,
      problem_statement TEXT,
      constraints TEXT,
      input_format TEXT,
      output_format TEXT,
      example_input TEXT,
      example_output TEXT,
      hints TEXT DEFAULT '[]',
      tags TEXT DEFAULT '[]',
      solution_approach TEXT,
      starter_code TEXT,
      supported_languages TEXT DEFAULT '["javascript", "python", "typescript", "java", "cpp", "c"]',
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'scheduled', 'active', 'archived', 'completed')),
      scheduled_date TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_daily_challenge_problems_status ON daily_challenge_problems(status);
    CREATE INDEX IF NOT EXISTS idx_daily_challenge_problems_topic ON daily_challenge_problems(topic_id);
    CREATE INDEX IF NOT EXISTS idx_daily_challenge_problems_date ON daily_challenge_problems(scheduled_date);

    CREATE TABLE IF NOT EXISTS daily_challenge_test_cases (
      id TEXT PRIMARY KEY,
      challenge_id TEXT NOT NULL REFERENCES daily_challenge_problems(id) ON DELETE CASCADE,
      input TEXT NOT NULL,
      expected_output TEXT NOT NULL,
      is_hidden INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_daily_challenge_test_cases_challenge ON daily_challenge_test_cases(challenge_id);

    CREATE TABLE IF NOT EXISTS daily_questions (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL,
      challenge_id TEXT,
      date TEXT NOT NULL UNIQUE,
      created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_daily_questions_date ON daily_questions(date);

    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id TEXT PRIMARY KEY,
      actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      actor_email TEXT,
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT,
      before_data TEXT,
      after_data TEXT,
      metadata TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_actor ON admin_audit_logs(actor_id);
    CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_resource ON admin_audit_logs(resource_type, resource_id);
    CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created ON admin_audit_logs(created_at DESC);

    CREATE TABLE IF NOT EXISTS question_versions (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      snapshot TEXT NOT NULL,
      changed_by TEXT,
      change_type TEXT NOT NULL DEFAULT 'update',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(question_id, version)
    );

    CREATE INDEX IF NOT EXISTS idx_question_versions_question ON question_versions(question_id, version DESC);

    CREATE TABLE IF NOT EXISTS submission_score_audit (
      id TEXT PRIMARY KEY,
      submission_id TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
      reviewer_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      previous_score REAL,
      new_score REAL NOT NULL,
      feedback TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_submission_score_audit_submission ON submission_score_audit(submission_id);
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

  // Daily Questions & Challenges migrations
  addColumnIfNotExists('daily_questions', 'challenge_id', 'TEXT');
  try {
    const fks = db.prepare('PRAGMA foreign_key_list(daily_questions)').all();
    const hasQuestionFk = fks.some(f => f.table === 'questions');
    if (hasQuestionFk) {
      db.pragma('foreign_keys = OFF');
      db.exec(`
        CREATE TABLE IF NOT EXISTS daily_questions_new (
          id TEXT PRIMARY KEY,
          question_id TEXT NOT NULL,
          challenge_id TEXT,
          date TEXT NOT NULL UNIQUE,
          created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        INSERT OR IGNORE INTO daily_questions_new (id, question_id, challenge_id, date, created_by, created_at)
        SELECT id, question_id, challenge_id, date, created_by, created_at FROM daily_questions;
        DROP TABLE daily_questions;
        ALTER TABLE daily_questions_new RENAME TO daily_questions;
        CREATE INDEX IF NOT EXISTS idx_daily_questions_date ON daily_questions(date);
      `);
      db.pragma('foreign_keys = ON');
    }
  } catch (e) {}

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
  addColumnIfNotExists('questions', 'is_practice', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfNotExists('questions', 'slug', 'TEXT');
  addColumnIfNotExists('questions', 'pattern_id', 'TEXT');
  addColumnIfNotExists('questions', 'secondary_topics', "TEXT DEFAULT '[]'");
  addColumnIfNotExists('questions', 'prerequisites', "TEXT DEFAULT '[]'");
  addColumnIfNotExists('questions', 'solution_approach', 'TEXT');

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
  addColumnIfNotExists('submissions', 'manual_score', 'REAL');
  addColumnIfNotExists('submissions', 'manual_feedback', 'TEXT');
  addColumnIfNotExists('submissions', 'manual_reviewer_id', 'TEXT');
  addColumnIfNotExists('submissions', 'manual_reviewed_at', 'TEXT');
  addColumnIfNotExists('submissions', 'ai_score', 'REAL');
  addColumnIfNotExists('submissions', 'ai_feedback', 'TEXT');
  addColumnIfNotExists('submissions', 'ai_reviewed_at', 'TEXT');
  addColumnIfNotExists('submissions', 'started_at', 'TEXT');
  addColumnIfNotExists('submissions', 'attempt_count', 'INTEGER DEFAULT 0');
  addColumnIfNotExists('submissions', 'solve_duration_seconds', 'REAL DEFAULT 0');
  addColumnIfNotExists('submissions', 'test_score', 'REAL DEFAULT 0');
  addColumnIfNotExists('submissions', 'time_score', 'REAL DEFAULT 0');
  addColumnIfNotExists('submissions', 'attempt_score', 'REAL DEFAULT 0');
  addColumnIfNotExists('submissions', 'final_score', 'REAL DEFAULT 0');
  addColumnIfNotExists('submissions', 'created_at', "TEXT DEFAULT (datetime('now'))");
  addColumnIfNotExists('submissions', 'updated_at', "TEXT DEFAULT (datetime('now'))");

  // Users auth migrations
  addColumnIfNotExists('users', 'password_hash', 'TEXT');
  addColumnIfNotExists('users', 'email_verified', 'INTEGER DEFAULT 1');
}

initSchema();

module.exports = {
  db,
  initSchema
};
