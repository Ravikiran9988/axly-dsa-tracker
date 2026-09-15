-- =============================================================================
-- Axly DSA Tracker — PostgreSQL Question Runtime Parity
-- Migration 027: Final additive parity guard for fields required by the
-- canonical Question Bank / Daily Challenge runtime.
--
-- Safe to run after 025/026. Idempotent and non-destructive.
-- =============================================================================

BEGIN;

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS url TEXT,
  ADD COLUMN IF NOT EXISTS examples JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS assigned_date DATE,
  ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS supported_languages JSONB NOT NULL DEFAULT '["javascript","python","typescript","java","cpp","c"]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_practice BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS generation_slot TEXT,
  ADD COLUMN IF NOT EXISTS created_via TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS secondary_topics JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS prerequisites JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS reference_solution TEXT,
  ADD COLUMN IF NOT EXISTS editorial TEXT,
  ADD COLUMN IF NOT EXISTS solution_approach TEXT,
  ADD COLUMN IF NOT EXISTS complexity TEXT;

CREATE INDEX IF NOT EXISTS idx_questions_is_practice ON questions(is_practice);
CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_questions_generation_slot
  ON questions(generation_slot)
  WHERE generation_slot IS NOT NULL;

UPDATE questions
SET status = 'published'
WHERE status IS NULL OR status = '';

COMMIT;
