-- =============================================================================
-- Axly DSA Tracker — Production PostgreSQL Schema Repair
-- Migration 024: Repair the canonical question / Daily Challenge schema
--
-- This migration is intentionally additive and idempotent. It repairs databases
-- that predate the canonical Daily Challenge migration without dropping legacy
-- data or tables.
-- =============================================================================

BEGIN;

-- Canonical Daily Challenge metadata.
CREATE TABLE IF NOT EXISTS daily_challenge_metadata (
  question_id TEXT PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
  scheduled_date TEXT UNIQUE,
  custom_topic TEXT,
  created_via TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE daily_challenge_metadata
  ADD COLUMN IF NOT EXISTS scheduled_date TEXT;
ALTER TABLE daily_challenge_metadata
  ADD COLUMN IF NOT EXISTS custom_topic TEXT;
ALTER TABLE daily_challenge_metadata
  ADD COLUMN IF NOT EXISTS created_via TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE daily_challenge_metadata
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE daily_challenge_metadata
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE daily_challenge_metadata
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_challenge_metadata_date
  ON daily_challenge_metadata(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_daily_challenge_metadata_status
  ON daily_challenge_metadata(status);

-- Canonical automation logs reference questions, not the removed legacy
-- daily_challenge_problems table.
ALTER TABLE daily_challenge_automation_logs
  ADD COLUMN IF NOT EXISTS question_id TEXT REFERENCES questions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_daily_challenge_automation_logs_question
  ON daily_challenge_automation_logs(question_id);

-- Preserve existing automation history when the old challenge_id happens to
-- already be a canonical question id.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'daily_challenge_automation_logs'
      AND column_name = 'challenge_id'
  ) THEN
    UPDATE daily_challenge_automation_logs al
       SET question_id = al.challenge_id
     WHERE al.question_id IS NULL
       AND al.challenge_id IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM questions q WHERE q.id = al.challenge_id
       );
  END IF;
END $$;

-- Canonical test-case table expected by the current question services.
CREATE TABLE IF NOT EXISTS test_cases (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  input TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_test_cases_question_id
  ON test_cases(question_id);

-- RAG/novelty index used by the canonical AI generation pipeline.
CREATE TABLE IF NOT EXISTS question_embeddings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  embedding JSONB NOT NULL,
  content_hash TEXT NOT NULL,
  embedding_model TEXT NOT NULL DEFAULT 'gemini-embedding-001',
  embedding_version INTEGER NOT NULL DEFAULT 1,
  indexed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(question_id, embedding_model, embedding_version)
);

CREATE INDEX IF NOT EXISTS idx_question_embeddings_question_id
  ON question_embeddings(question_id);
CREATE INDEX IF NOT EXISTS idx_question_embeddings_content_hash
  ON question_embeddings(content_hash);

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS embedding_indexed_at TIMESTAMPTZ;

COMMIT;
