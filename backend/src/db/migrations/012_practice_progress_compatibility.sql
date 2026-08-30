-- =============================================================================
-- Axly DSA Tracker — Supabase PostgreSQL Migration 012
-- Repair legacy practice_progress schema drift.
-- =============================================================================

ALTER TABLE practice_progress
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'in_progress',
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS solved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_submission_id TEXT;

UPDATE practice_progress
SET status = 'in_progress'
WHERE status IS NULL
   OR status NOT IN ('not_started', 'in_progress', 'solved', 'abandoned');

UPDATE practice_progress
SET attempts = 0
WHERE attempts IS NULL OR attempts < 0;

UPDATE practice_progress
SET started_at = CURRENT_TIMESTAMP
WHERE started_at IS NULL;

UPDATE practice_progress
SET updated_at = CURRENT_TIMESTAMP
WHERE updated_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_practice_progress_user_status
  ON practice_progress(user_id, status);
CREATE INDEX IF NOT EXISTS idx_practice_progress_question
  ON practice_progress(question_id);
