-- =============================================================================
-- Axly DSA Tracker — Supabase PostgreSQL Production Database Schema
-- Migration 001: Initial Complete Schema
-- Compatible with Supabase Postgres & Row-Level Security (RLS)
-- =============================================================================

-- Enable UUID extension if available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ROLES TABLE
CREATE TABLE IF NOT EXISTS roles (
  name TEXT PRIMARY KEY
);

INSERT INTO roles (name) VALUES ('admin'), ('user'), ('mentor')
ON CONFLICT (name) DO NOTHING;

-- 2. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'user' REFERENCES roles(name) ON UPDATE CASCADE,
  avatar_url TEXT,
  institution TEXT,
  points INTEGER NOT NULL DEFAULT 0,
  practice_points INTEGER NOT NULL DEFAULT 0,
  daily_challenge_points INTEGER NOT NULL DEFAULT 0,
  streak_bonus INTEGER NOT NULL DEFAULT 0,
  leaderboard_score INTEGER NOT NULL DEFAULT 0,
  individual_streak INTEGER NOT NULL DEFAULT 0,
  individual_best_streak INTEGER NOT NULL DEFAULT 0,
  daily_challenge_streak INTEGER NOT NULL DEFAULT 0,
  daily_challenge_best_streak INTEGER NOT NULL DEFAULT 0,
  last_login_date DATE,
  last_daily_challenge_solve_date DATE,
  streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  password_hash TEXT,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_leaderboard_score ON users(leaderboard_score DESC);
CREATE INDEX IF NOT EXISTS idx_users_points ON users(points DESC);
CREATE INDEX IF NOT EXISTS idx_users_individual_streak ON users(individual_streak DESC);
CREATE INDEX IF NOT EXISTS idx_users_challenge_streak ON users(daily_challenge_streak DESC);

-- 2b. USER DAILY ACTIVITY TABLE (Activity / Login Streaks)
CREATE TABLE IF NOT EXISTS user_daily_activity (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  activity_type TEXT NOT NULL DEFAULT 'login' CHECK (activity_type IN ('login', 'session_refresh')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, activity_date)
);

CREATE INDEX IF NOT EXISTS idx_user_daily_activity_user_date ON user_daily_activity(user_id, activity_date);

-- 3. AUTH TOKENS TABLE (Password Reset & Email Verification)
CREATE TABLE IF NOT EXISTS auth_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  token_type TEXT NOT NULL CHECK (token_type IN ('verification', 'otp_verification', 'password_reset')),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auth_tokens_hash ON auth_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_id ON auth_tokens(user_id);

-- 4. TOPICS TABLE
CREATE TABLE IF NOT EXISTS topics (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT DEFAULT 'Core',
  description TEXT,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- 5. PATTERNS TABLE
CREATE TABLE IF NOT EXISTS patterns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  topic_id TEXT REFERENCES topics(id) ON DELETE SET NULL,
  description TEXT,
  order_index INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_patterns_topic_id ON patterns(topic_id);

-- 6. PRACTICE QUESTIONS TABLE (Question Bank)
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  points INTEGER NOT NULL DEFAULT 10,
  estimated_time INTEGER DEFAULT 30,
  topic_id TEXT REFERENCES topics(id) ON DELETE SET NULL,
  pattern_id TEXT REFERENCES patterns(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  problem_statement TEXT,
  constraints TEXT,
  input_format TEXT,
  output_format TEXT,
  example_input TEXT,
  example_output TEXT,
  hints JSONB DEFAULT '[]'::jsonb,
  tags JSONB DEFAULT '[]'::jsonb,
  solution_approach TEXT,
  solution_code TEXT,
  starter_code JSONB DEFAULT '{}'::jsonb,
  driver_code JSONB DEFAULT '{}'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_questions_slug ON questions(slug);
CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(topic_id);
CREATE INDEX IF NOT EXISTS idx_questions_pattern ON questions(pattern_id);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);

-- 7. QUESTION VERSIONING TABLE
CREATE TABLE IF NOT EXISTS question_versions (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  problem_statement TEXT,
  constraints TEXT,
  input_format TEXT,
  output_format TEXT,
  example_input TEXT,
  example_output TEXT,
  hints JSONB DEFAULT '[]'::jsonb,
  solution_approach TEXT,
  solution_code TEXT,
  changed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  change_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (question_id, version)
);

-- 8. PRACTICE TEST CASES TABLE
CREATE TABLE IF NOT EXISTS question_test_cases (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  input TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_question_test_cases_question_id ON question_test_cases(question_id);

-- 9. DEDICATED DAILY CHALLENGE PROBLEMS TABLE (Independent Pool)
CREATE TABLE IF NOT EXISTS daily_challenge_problems (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  points INTEGER NOT NULL DEFAULT 100,
  estimated_time INTEGER DEFAULT 30,
  topic_id TEXT REFERENCES topics(id) ON DELETE SET NULL,
  pattern_id TEXT REFERENCES patterns(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  problem_statement TEXT,
  constraints TEXT,
  input_format TEXT,
  output_format TEXT,
  example_input TEXT,
  example_output TEXT,
  hints JSONB DEFAULT '[]'::jsonb,
  tags JSONB DEFAULT '[]'::jsonb,
  solution_approach TEXT,
  editorial TEXT,
  complexity TEXT,
  examples JSONB DEFAULT '[]'::jsonb,
  starter_code TEXT,
  supported_languages JSONB DEFAULT '["javascript", "python", "typescript", "java", "cpp", "c"]'::jsonb,
  created_via TEXT NOT NULL DEFAULT 'manual' CHECK (created_via IN ('manual', 'ai')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
  scheduled_date DATE UNIQUE,
  custom_topic TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_daily_challenge_problems_status ON daily_challenge_problems(status);
CREATE INDEX IF NOT EXISTS idx_daily_challenge_problems_date ON daily_challenge_problems(scheduled_date);

-- 10. DAILY CHALLENGE TEST CASES TABLE
CREATE TABLE IF NOT EXISTS daily_challenge_test_cases (
  id TEXT PRIMARY KEY,
  challenge_id TEXT NOT NULL REFERENCES daily_challenge_problems(id) ON DELETE CASCADE,
  input TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_daily_challenge_test_cases_challenge_id ON daily_challenge_test_cases(challenge_id);

-- 11. DAILY QUESTIONS LINK TABLE
CREATE TABLE IF NOT EXISTS daily_questions (
  id TEXT PRIMARY KEY,
  question_id TEXT REFERENCES questions(id) ON DELETE SET NULL,
  challenge_id TEXT REFERENCES daily_challenge_problems(id) ON DELETE SET NULL,
  date DATE NOT NULL UNIQUE,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_daily_questions_date ON daily_questions(date);

-- 12. SUBMISSIONS TABLE (Daily Challenge & Overall Submissions)
CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'attempted' CHECK (status IN ('not_started', 'attempted', 'submitted', 'solved', 'completed', 'approved', 'rejected', 'failed')),
  attempt_count INTEGER NOT NULL DEFAULT 1,
  started_at TIMESTAMPTZ,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  solved_at TIMESTAMPTZ,
  solve_duration_seconds INTEGER DEFAULT 0,
  test_score NUMERIC(5,2) DEFAULT 0,
  time_score NUMERIC(5,2) DEFAULT 0,
  attempt_score NUMERIC(5,2) DEFAULT 0,
  final_score NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_submissions_user_question ON submissions(user_id, question_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);

-- 13. PRACTICE USER PROGRESS TABLE
CREATE TABLE IF NOT EXISTS practice_user_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'unattempted' CHECK (status IN ('unattempted', 'attempted', 'solved')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  first_attempted_at TIMESTAMPTZ,
  solved_at TIMESTAMPTZ,
  last_attempted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_practice_progress_user ON practice_user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_progress_question ON practice_user_progress(question_id);

-- 14. CODE SUBMISSIONS EXECUTION LOG TABLE
CREATE TABLE IF NOT EXISTS code_submissions_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  code TEXT NOT NULL,
  language TEXT NOT NULL,
  status TEXT NOT NULL,
  passed_tests INTEGER NOT NULL DEFAULT 0,
  total_tests INTEGER NOT NULL DEFAULT 0,
  execution_time_ms NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_code_submissions_log_user ON code_submissions_log(user_id);
CREATE INDEX IF NOT EXISTS idx_code_submissions_log_question ON code_submissions_log(question_id);

-- 15. POINTS LEDGER TABLE (Audit Record of All Score Events)
CREATE TABLE IF NOT EXISTS points_ledger (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('PRACTICE_SOLVE', 'DAILY_CHALLENGE_SOLVE', 'STREAK_REWARD', 'ADMIN_ADJUSTMENT')),
  source_id TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL CHECK (category IN ('practice', 'daily_challenge', 'streak', 'admin')),
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, source_type, source_id)
);

CREATE INDEX IF NOT EXISTS idx_points_ledger_user ON points_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_points_ledger_category ON points_ledger(category);

-- 16. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'system' CHECK (category IN ('daily_challenge', 'practice', 'submission', 'achievement', 'system')),
  type TEXT NOT NULL DEFAULT 'system_alert',
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- 17. BADGES & USER BADGES TABLES
CREATE TABLE IF NOT EXISTS badges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  threshold_type TEXT NOT NULL DEFAULT 'points',
  threshold_value INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_badges (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);

-- 18. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
