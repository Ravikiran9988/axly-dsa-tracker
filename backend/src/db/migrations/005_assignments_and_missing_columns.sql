-- =============================================================================
-- Axly DSA Tracker — Supabase PostgreSQL Migration 005
-- Migration 005: Missing Tables & Columns (assignments, questions columns)
-- Adds everything present in db.js SQLite schema but absent from migration 001.
-- All statements are idempotent (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
-- =============================================================================

-- 1. ASSIGNMENTS TABLE
-- Tracks mentor-assigned questions to individual students or cohorts.
CREATE TABLE IF NOT EXISTS assignments (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id  TEXT NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  cohort_id    TEXT REFERENCES cohorts(id) ON DELETE SET NULL,
  assigned_by  TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status       TEXT NOT NULL DEFAULT 'assigned'
               CHECK (status IN ('assigned','ongoing','submitted','under_review',
                                 'completed','incomplete','overdue','unassigned')),
  priority     TEXT DEFAULT 'Medium'
               CHECK (priority IN ('Low','Medium','High')),
  instructions TEXT,
  assigned_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  due_date     TIMESTAMPTZ,
  CONSTRAINT unique_user_question_assignment UNIQUE (user_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_assignments_user_id     ON assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_question_id ON assignments(question_id);
CREATE INDEX IF NOT EXISTS idx_assignments_cohort_id   ON assignments(cohort_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status      ON assignments(status);

-- 2. QUESTIONS - missing columns
-- is_practice: TRUE for the curated practice problem pool (seeded via practiceSeed)
ALTER TABLE questions ADD COLUMN IF NOT EXISTS is_practice BOOLEAN NOT NULL DEFAULT FALSE;
-- status: publication lifecycle state
ALTER TABLE questions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published';
-- secondary_topics / prerequisites (used by practice seed and recommendation engine)
ALTER TABLE questions ADD COLUMN IF NOT EXISTS secondary_topics JSONB DEFAULT '[]'::jsonb;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS prerequisites    JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_questions_is_practice ON questions(is_practice);
CREATE INDEX IF NOT EXISTS idx_questions_status      ON questions(status);

-- 3. Backfill: mark all existing seeded questions as published + is_practice = TRUE
-- Seed inserts questions with is_active=TRUE but no status. Set them published.
UPDATE questions SET status = 'published' WHERE status IS NULL OR status = '';
-- All questions seeded via postgresSeed are practice problems.
UPDATE questions SET is_practice = TRUE WHERE is_practice IS NULL OR is_practice = FALSE;
