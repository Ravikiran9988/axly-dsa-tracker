-- Migration 002: PostgreSQL/Supabase schema parity with the current Axly runtime model
-- This migration prepares the PostgreSQL schema for the repository-layer cutover.
-- It does not switch the backend runtime yet.

-- Questions: fields currently used by the application
ALTER TABLE questions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS problem_statement TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS constraints TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS input_format TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS output_format TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS example_input TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS example_output TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS hints TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS tags JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS estimated_time TEXT DEFAULT '30 mins';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS points INTEGER NOT NULL DEFAULT 20;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS assigned_date DATE;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'published';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS supported_languages JSONB NOT NULL DEFAULT '["python","javascript","java","cpp","c","typescript"]'::jsonb;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS starter_code JSONB;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS current_version INTEGER NOT NULL DEFAULT 1;

-- Test cases used by the code execution/evaluation layer
CREATE TABLE IF NOT EXISTS test_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    input TEXT NOT NULL,
    expected_output TEXT NOT NULL,
    is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_test_cases_question_id ON test_cases(question_id);
CREATE INDEX IF NOT EXISTS idx_test_cases_is_hidden ON test_cases(is_hidden);

-- Expand submissions to the current evaluation/review model
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS assignment_id UUID REFERENCES assignments(id) ON DELETE SET NULL;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS submission_type VARCHAR(20) NOT NULL DEFAULT 'code';
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS language VARCHAR(50) DEFAULT 'javascript';
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS source_code TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS github_url TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS review_status VARCHAR(30) DEFAULT 'pending';
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS feedback TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS passed_tests INTEGER NOT NULL DEFAULT 0;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS total_tests INTEGER NOT NULL DEFAULT 0;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS execution_time_ms DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS manual_score DOUBLE PRECISION;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS manual_feedback TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS solve_duration_seconds DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS test_score DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS time_score DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS attempt_score DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS final_score DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Submission event log: preserves every execution/submission for attempts, scoring and audits.
CREATE TABLE IF NOT EXISTS code_submissions_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    submission_type VARCHAR(20) NOT NULL DEFAULT 'code',
    language VARCHAR(50),
    source_code TEXT,
    github_url TEXT,
    status VARCHAR(50) NOT NULL,
    passed_tests INTEGER NOT NULL DEFAULT 0,
    total_tests INTEGER NOT NULL DEFAULT 0,
    execution_time_ms DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_code_submissions_log_user ON code_submissions_log(user_id);
CREATE INDEX IF NOT EXISTS idx_code_submissions_log_question ON code_submissions_log(question_id);
CREATE INDEX IF NOT EXISTS idx_code_submissions_log_created ON code_submissions_log(created_at DESC);

-- User profile/gamification fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS institution VARCHAR(255) DEFAULT 'Axly Tech Academy';
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS github_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS skills JSONB NOT NULL DEFAULT '["JavaScript","Data Structures","Algorithms"]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS points INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS streak INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS longest_streak INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS rank INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_users_points ON users(points DESC);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'general',
    link TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);

-- Badges
CREATE TABLE IF NOT EXISTS badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    icon VARCHAR(100) NOT NULL,
    criteria TEXT
);
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_badge UNIQUE(user_id, badge_id)
);

-- Admin audit trail
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_email VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id TEXT,
    before_data JSONB,
    after_data JSONB,
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_actor ON admin_audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_resource ON admin_audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_logs(created_at DESC);

-- Immutable question snapshots for published-version history.
CREATE TABLE IF NOT EXISTS question_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    snapshot JSONB NOT NULL,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    change_type VARCHAR(50) NOT NULL DEFAULT 'update',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_question_version UNIQUE(question_id, version)
);
CREATE INDEX IF NOT EXISTS idx_question_versions_question ON question_versions(question_id, version DESC);

-- Daily challenge performance/history. UTC date is represented by DATE in UTC at write time.
CREATE INDEX IF NOT EXISTS idx_daily_questions_question_date ON daily_questions(question_id, date);

-- NOTE: assignments/cohorts remain in the initial schema only for compatibility during migration.
-- They are not part of the current student/admin product flow and will be deprecated in a later cleanup migration.
