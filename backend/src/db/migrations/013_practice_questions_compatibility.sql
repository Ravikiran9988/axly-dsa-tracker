-- =============================================================================
-- Axly DSA Tracker — Supabase PostgreSQL Migration 013
-- Ensure all practice question columns required by practiceService exist.
-- =============================================================================

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS pattern_id TEXT REFERENCES patterns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS secondary_topics JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS prerequisites JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS solution_approach TEXT,
  ADD COLUMN IF NOT EXISTS is_practice BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS estimated_time INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS idx_questions_practice_slug
  ON questions(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_questions_is_practice ON questions(is_practice);
CREATE INDEX IF NOT EXISTS idx_questions_pattern_id ON questions(pattern_id);
