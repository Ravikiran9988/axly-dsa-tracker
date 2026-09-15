-- =============================================================================
-- Axly DSA Tracker — PostgreSQL Question Runtime Parity
-- Migration 025: Repair legacy databases that were baselined without all
-- question columns now required by the canonical Question Bank / Daily
-- Challenge services.
--
-- Additive + idempotent. No data or legacy tables are dropped.
-- =============================================================================

BEGIN;

-- Columns required by current Question Bank / Daily Challenge queries and
-- inserts. These may be absent on older production databases even though the
-- database was historically considered migrated.
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
  ADD COLUMN IF NOT EXISTS prerequisites JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_questions_is_practice ON questions(is_practice);
CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_questions_generation_slot
  ON questions(generation_slot)
  WHERE generation_slot IS NOT NULL;

-- Keep legacy rows usable by the current Question Bank semantics without
-- changing existing publication decisions.
UPDATE questions
SET status = 'published'
WHERE status IS NULL OR status = '';

COMMIT;
