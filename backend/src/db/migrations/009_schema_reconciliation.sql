-- =============================================================================
-- Axly DSA Tracker — Supabase PostgreSQL Migration 009
-- Migration 009: Schema Reconciliation
-- Renames mismatched tables and adds missing ones from SQLite db.js
-- =============================================================================

DO $$ 
BEGIN
  -- 1. Handle question_test_cases -> test_cases
  IF EXISTS(SELECT 1 FROM pg_class WHERE relname = 'test_cases') THEN
    -- test_cases already exists. Any question_test_cases present is an empty dummy from 001.
    IF EXISTS(SELECT 1 FROM pg_class WHERE relname = 'question_test_cases') THEN
      DROP TABLE question_test_cases CASCADE;
    END IF;
  ELSE
    -- test_cases does not exist. This is the first run, so rename the real table.
    IF EXISTS(SELECT 1 FROM pg_class WHERE relname = 'question_test_cases') THEN
      ALTER TABLE question_test_cases RENAME TO test_cases;
      ALTER INDEX IF EXISTS idx_question_test_cases_question_id RENAME TO idx_test_cases_question_id;
    END IF;
  END IF;

  -- 2. Handle practice_user_progress -> practice_progress
  IF EXISTS(SELECT 1 FROM pg_class WHERE relname = 'practice_progress') THEN
    IF EXISTS(SELECT 1 FROM pg_class WHERE relname = 'practice_user_progress') THEN
      DROP TABLE practice_user_progress CASCADE;
    END IF;
  ELSE
    IF EXISTS(SELECT 1 FROM pg_class WHERE relname = 'practice_user_progress') THEN
      ALTER TABLE practice_user_progress RENAME TO practice_progress;
      ALTER INDEX IF EXISTS idx_practice_progress_user RENAME TO idx_practice_progress_user_status;
    END IF;
  END IF;

  -- 3. Handle audit_logs -> admin_audit_logs
  IF EXISTS(SELECT 1 FROM pg_class WHERE relname = 'admin_audit_logs') THEN
    IF EXISTS(SELECT 1 FROM pg_class WHERE relname = 'audit_logs') THEN
      DROP TABLE audit_logs CASCADE;
    END IF;
  ELSE
    IF EXISTS(SELECT 1 FROM pg_class WHERE relname = 'audit_logs') THEN
      ALTER TABLE audit_logs RENAME TO admin_audit_logs;
      ALTER INDEX IF EXISTS idx_audit_logs_actor RENAME TO idx_admin_audit_logs_actor;
      ALTER INDEX IF EXISTS idx_audit_logs_resource RENAME TO idx_admin_audit_logs_resource;
      ALTER INDEX IF EXISTS idx_audit_logs_created RENAME TO idx_admin_audit_logs_created;
    END IF;
  END IF;
END $$;

-- 4. Create live_sessions table
CREATE TABLE IF NOT EXISTS live_sessions (
  id TEXT PRIMARY KEY,
  cohort_id TEXT REFERENCES cohorts(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  mentor_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  meet_link TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create submission_score_audit table
CREATE TABLE IF NOT EXISTS submission_score_audit (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  reviewer_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  previous_score REAL,
  new_score REAL NOT NULL,
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_submission_score_audit_submission ON submission_score_audit(submission_id);
