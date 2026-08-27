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

  // Safe table alterations for migration on existing databases
  try {
    const userCols = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
    if (!userCols.includes('username')) db.prepare("ALTER TABLE users ADD COLUMN username TEXT").run();
    if (!userCols.includes('institution')) db.prepare("ALTER TABLE users ADD COLUMN institution TEXT DEFAULT 'Axly Tech Academy'").run();
    if (!userCols.includes('bio')) db.prepare("ALTER TABLE users ADD COLUMN bio TEXT").run();
    if (!userCols.includes('github_url')) db.prepare("ALTER TABLE users ADD COLUMN github_url TEXT").run();
    if (!userCols.includes('linkedin_url')) db.prepare("ALTER TABLE users ADD COLUMN linkedin_url TEXT").run();
    if (!userCols.includes('skills')) db.prepare("ALTER TABLE users ADD COLUMN skills TEXT DEFAULT '[\"JavaScript\", \"Data Structures\", \"Algorithms\"]'").run();
    if (!userCols.includes('avatar_url')) db.prepare("ALTER TABLE users ADD COLUMN avatar_url TEXT").run();
    if (!userCols.includes('points')) db.prepare("ALTER TABLE users ADD COLUMN points INTEGER DEFAULT 100").run();
    if (!userCols.includes('streak')) db.prepare("ALTER TABLE users ADD COLUMN streak INTEGER DEFAULT 1").run();
    if (!userCols.includes('longest_streak')) db.prepare("ALTER TABLE users ADD COLUMN longest_streak INTEGER DEFAULT 1").run();
    if (!userCols.includes('rank')) db.prepare("ALTER TABLE users ADD COLUMN rank INTEGER DEFAULT 1").run();
    if (!userCols.includes('last_active_at')) db.prepare("ALTER TABLE users ADD COLUMN last_active_at TEXT DEFAULT (datetime('now'))").run();

    const questionCols = db.prepare("PRAGMA table_info(questions)").all().map(c => c.name);
    if (!questionCols.includes('description')) db.prepare("ALTER TABLE questions ADD COLUMN description TEXT").run();
    if (!questionCols.includes('problem_statement')) db.prepare("ALTER TABLE questions ADD COLUMN problem_statement TEXT").run();
    if (!questionCols.includes('constraints')) db.prepare("ALTER TABLE questions ADD COLUMN constraints TEXT").run();
    if (!questionCols.includes('input_format')) db.prepare("ALTER TABLE questions ADD COLUMN input_format TEXT").run();
    if (!questionCols.includes('output_format')) db.prepare("ALTER TABLE questions ADD COLUMN output_format TEXT").run();
    if (!questionCols.includes('example_input')) db.prepare("ALTER TABLE questions ADD COLUMN example_input TEXT").run();
    if (!questionCols.includes('example_output')) db.prepare("ALTER TABLE questions ADD COLUMN example_output TEXT").run();
    if (!questionCols.includes('hints')) db.prepare("ALTER TABLE questions ADD COLUMN hints TEXT").run();
    if (!questionCols.includes('tags')) db.prepare("ALTER TABLE questions ADD COLUMN tags TEXT DEFAULT '[]'").run();
    if (!questionCols.includes('estimated_time')) db.prepare("ALTER TABLE questions ADD COLUMN estimated_time TEXT DEFAULT '30 mins'").run();
    if (!questionCols.includes('points')) db.prepare("ALTER TABLE questions ADD COLUMN points INTEGER DEFAULT 20").run();
    if (!questionCols.includes('assigned_date')) db.prepare("ALTER TABLE questions ADD COLUMN assigned_date TEXT").run();
    if (!questionCols.includes('due_date')) db.prepare("ALTER TABLE questions ADD COLUMN due_date TEXT").run();
    if (!questionCols.includes('status')) db.prepare("ALTER TABLE questions ADD COLUMN status TEXT DEFAULT 'published'").run();
    if (!questionCols.includes('supported_languages')) db.prepare("ALTER TABLE questions ADD COLUMN supported_languages TEXT DEFAULT '[\"python\", \"javascript\", \"java\", \"cpp\", \"c\", \"typescript\"]'").run();
    if (!questionCols.includes('starter_code')) db.prepare("ALTER TABLE questions ADD COLUMN starter_code TEXT").run();

    const assignmentCols = db.prepare("PRAGMA table_info(assignments)").all().map(c => c.name);
    if (!assignmentCols.includes('cohort_id')) db.prepare("ALTER TABLE assignments ADD COLUMN cohort_id TEXT").run();
    if (!assignmentCols.includes('due_date')) db.prepare("ALTER TABLE assignments ADD COLUMN due_date TEXT").run();
    if (!assignmentCols.includes('priority')) db.prepare("ALTER TABLE assignments ADD COLUMN priority TEXT DEFAULT 'Medium'").run();
    if (!assignmentCols.includes('instructions')) db.prepare("ALTER TABLE assignments ADD COLUMN instructions TEXT").run();

    const submissionCols = db.prepare("PRAGMA table_info(submissions)").all().map(c => c.name);
    if (!submissionCols.includes('assignment_id')) db.prepare("ALTER TABLE submissions ADD COLUMN assignment_id TEXT").run();
    if (!submissionCols.includes('submission_type')) db.prepare("ALTER TABLE submissions ADD COLUMN submission_type TEXT DEFAULT 'code'").run();
    if (!submissionCols.includes('github_url')) db.prepare("ALTER TABLE submissions ADD COLUMN github_url TEXT").run();
    if (!submissionCols.includes('review_status')) db.prepare("ALTER TABLE submissions ADD COLUMN review_status TEXT DEFAULT 'pending'").run();
    if (!submissionCols.includes('feedback')) db.prepare("ALTER TABLE submissions ADD COLUMN feedback TEXT").run();
    if (!submissionCols.includes('reviewer_id')) db.prepare("ALTER TABLE submissions ADD COLUMN reviewer_id TEXT").run();
    if (!submissionCols.includes('reviewed_at')) db.prepare("ALTER TABLE submissions ADD COLUMN reviewed_at TEXT").run();
    if (!submissionCols.includes('language')) db.prepare("ALTER TABLE submissions ADD COLUMN language TEXT DEFAULT 'javascript'").run();
    if (!submissionCols.includes('source_code')) db.prepare("ALTER TABLE submissions ADD COLUMN source_code TEXT").run();
    if (!submissionCols.includes('passed_tests')) db.prepare("ALTER TABLE submissions ADD COLUMN passed_tests INTEGER DEFAULT 0").run();
    if (!submissionCols.includes('total_tests')) db.prepare("ALTER TABLE submissions ADD COLUMN total_tests INTEGER DEFAULT 0").run();
    if (!submissionCols.includes('execution_time_ms')) db.prepare("ALTER TABLE submissions ADD COLUMN execution_time_ms REAL DEFAULT 0").run();
    if (!submissionCols.includes('created_at')) db.prepare("ALTER TABLE submissions ADD COLUMN created_at TEXT DEFAULT (datetime('now'))").run();
    if (!submissionCols.includes('updated_at')) db.prepare("ALTER TABLE submissions ADD COLUMN updated_at TEXT DEFAULT (datetime('now'))").run();
  } catch (e) {
    // Ignore migration warnings
  }
}

initSchema();

module.exports = {
  db,
  initSchema
};
