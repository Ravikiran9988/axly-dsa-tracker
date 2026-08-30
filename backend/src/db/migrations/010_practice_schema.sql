-- =============================================================================
-- Axly DSA Tracker — Supabase PostgreSQL Migration 010
-- Migration 010: Practice Library & Progress Schema
-- Uses TEXT identifiers to match the production schema in migration 001.
-- =============================================================================

CREATE TABLE IF NOT EXISTS patterns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  applicable_topics JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_patterns_name ON patterns(name);

ALTER TABLE questions ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS pattern_id TEXT REFERENCES patterns(id) ON DELETE SET NULL;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS secondary_topics JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS prerequisites JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS solution_approach TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS is_practice BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS estimated_time INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS idx_questions_practice_slug
  ON questions(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_questions_is_practice ON questions(is_practice);
CREATE INDEX IF NOT EXISTS idx_questions_pattern_id ON questions(pattern_id);

CREATE TABLE IF NOT EXISTS practice_progress (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('not_started', 'in_progress', 'solved', 'abandoned')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  solved_at TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_submission_id TEXT,
  PRIMARY KEY (user_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_practice_progress_user_status
  ON practice_progress(user_id, status);
CREATE INDEX IF NOT EXISTS idx_practice_progress_question
  ON practice_progress(question_id);
