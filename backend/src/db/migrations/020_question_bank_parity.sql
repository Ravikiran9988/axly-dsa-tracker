-- Migration 020: Question Bank schema parity
-- Idempotent so it is safe on existing PostgreSQL databases and fresh installs.

ALTER TABLE questions ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS pattern_id TEXT REFERENCES patterns(id) ON DELETE SET NULL;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS reference_solution TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS editorial TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS solution_approach TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS complexity TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_questions_slug ON questions(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_questions_pattern_id ON questions(pattern_id);
