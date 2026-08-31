-- =============================================================================
-- Axly DSA Tracker — Supabase PostgreSQL Migration 015
-- Fix legacy practice_progress status CHECK constraint.
--
-- Some production databases retained the old constraint name and/or allowed
-- a different status vocabulary after practice_user_progress was renamed to
-- practice_progress. The application consistently uses:
--   not_started | in_progress | solved | abandoned
-- =============================================================================

DO $$
BEGIN
  -- Remove legacy constraints left behind by the renamed table/schema.
  ALTER TABLE practice_progress
    DROP CONSTRAINT IF EXISTS practice_user_progress_status_check;

  ALTER TABLE practice_progress
    DROP CONSTRAINT IF EXISTS practice_progress_status_check;

  -- Normalize any legacy values before installing the canonical constraint.
  UPDATE practice_progress
  SET status = CASE
    WHEN status IS NULL THEN 'in_progress'
    WHEN LOWER(TRIM(status)) IN ('not_started', 'not started', 'not-started') THEN 'not_started'
    WHEN LOWER(TRIM(status)) IN ('in_progress', 'in progress', 'in-progress', 'started') THEN 'in_progress'
    WHEN LOWER(TRIM(status)) IN ('solved', 'complete', 'completed') THEN 'solved'
    WHEN LOWER(TRIM(status)) IN ('abandoned', 'abandon') THEN 'abandoned'
    ELSE 'in_progress'
  END;

  ALTER TABLE practice_progress
    ADD CONSTRAINT practice_progress_status_check
    CHECK (status IN ('not_started', 'in_progress', 'solved', 'abandoned'));
END $$;
