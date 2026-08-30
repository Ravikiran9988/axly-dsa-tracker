-- =============================================================================
-- Axly DSA Tracker — Supabase PostgreSQL Migration 006
-- Migration 006: Missing Columns for Submissions, Daily Challenge, Questions
-- Adds missing columns present in db.js SQLite schema but absent in Postgres.
-- =============================================================================

-- 1. QUESTIONS
ALTER TABLE questions ADD COLUMN IF NOT EXISTS url TEXT DEFAULT '';

-- 2. DAILY CHALLENGE PROBLEMS
ALTER TABLE daily_challenge_problems ADD COLUMN IF NOT EXISTS source_question_id TEXT REFERENCES questions(id) ON DELETE SET NULL;

-- 3. SUBMISSIONS
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS assignment_id TEXT REFERENCES assignments(id) ON DELETE SET NULL;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS submission_type TEXT DEFAULT 'code';
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'javascript';
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS source_code TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS github_url TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS review_status TEXT DEFAULT 'pending';
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS feedback TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS reviewer_id TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS passed_tests INTEGER DEFAULT 0;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS total_tests INTEGER DEFAULT 0;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS execution_time_ms NUMERIC(10,2) DEFAULT 0;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS manual_score NUMERIC(5,2) DEFAULT NULL;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS manual_feedback TEXT;
