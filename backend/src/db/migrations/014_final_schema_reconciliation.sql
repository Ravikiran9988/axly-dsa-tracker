-- Final comprehensive schema reconciliation between SQLite (db.js) and PostgreSQL
-- This migration guarantees that all tables in PostgreSQL have the exact columns expected by the application layer.

-- 1. questions
ALTER TABLE questions ADD COLUMN IF NOT EXISTS current_version INTEGER NOT NULL DEFAULT 1;

-- 2. submissions
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS ai_score NUMERIC(5,2);
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS ai_feedback TEXT;

-- 3. code_submissions_log
ALTER TABLE code_submissions_log ADD COLUMN IF NOT EXISTS submission_type TEXT DEFAULT 'code';
ALTER TABLE code_submissions_log ADD COLUMN IF NOT EXISTS source_code TEXT;
ALTER TABLE code_submissions_log ADD COLUMN IF NOT EXISTS github_url TEXT;

DO $$
BEGIN
  -- Safely migrate data from 'code' to 'source_code' and drop 'code' to match SQLite schema
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='code_submissions_log' AND column_name='code') THEN
    UPDATE code_submissions_log SET source_code = code WHERE source_code IS NULL;
    ALTER TABLE code_submissions_log DROP COLUMN code;
  END IF;
END $$;

-- 4. badges
ALTER TABLE badges ADD COLUMN IF NOT EXISTS criteria TEXT;

-- 5. user_badges
ALTER TABLE user_badges ADD COLUMN IF NOT EXISTS awarded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 6. admin_audit_logs
ALTER TABLE admin_audit_logs ADD COLUMN IF NOT EXISTS actor_email TEXT;
ALTER TABLE admin_audit_logs ADD COLUMN IF NOT EXISTS before_data JSONB;
ALTER TABLE admin_audit_logs ADD COLUMN IF NOT EXISTS after_data JSONB;
ALTER TABLE admin_audit_logs ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE admin_audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- 7. question_versions
ALTER TABLE question_versions ADD COLUMN IF NOT EXISTS snapshot JSONB;
ALTER TABLE question_versions ADD COLUMN IF NOT EXISTS change_type TEXT NOT NULL DEFAULT 'update';
