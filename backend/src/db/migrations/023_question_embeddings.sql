-- =============================================================================
-- Axly DSA Tracker — Question Embeddings for RAG-based Novelty Detection
-- Migration 023: Add question_embeddings table for vector-based duplicate prevention
--
-- This migration creates:
--   - question_embeddings: stores pre-computed embeddings for semantic similarity
--
-- PREREQUISITES:
--   - questions table must exist (canonical question store)
--
-- ROLLBACK: DROP TABLE IF EXISTS question_embeddings;
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Create question_embeddings table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS question_embeddings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  embedding JSONB NOT NULL,
  content_hash TEXT NOT NULL,
  embedding_model TEXT NOT NULL DEFAULT 'gemini-embedding-001',
  embedding_version INTEGER NOT NULL DEFAULT 1,
  indexed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(question_id, embedding_model, embedding_version)
);

-- -----------------------------------------------------------------------------
-- 2. Index for fast lookups by question_id
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_question_embeddings_question_id 
  ON question_embeddings(question_id);

-- -----------------------------------------------------------------------------
-- 3. Index for content hash deduplication
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_question_embeddings_content_hash 
  ON question_embeddings(content_hash);

-- -----------------------------------------------------------------------------
-- 4. Add embedding metadata columns to questions table
--    (tracking when a question was last indexed)
-- -----------------------------------------------------------------------------
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'questions' AND column_name = 'embedding_indexed_at'
  ) THEN
    ALTER TABLE questions ADD COLUMN embedding_indexed_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 5. Add comment documenting the table
-- -----------------------------------------------------------------------------
COMMENT ON TABLE question_embeddings IS 
  'Pre-computed embeddings for RAG-based question novelty detection. Supports duplicate prevention in AI generation pipeline.';

COMMENT ON COLUMN question_embeddings.embedding IS 
  'JSONB array of floating-point numbers representing the semantic embedding vector.';

COMMENT ON COLUMN question_embeddings.content_hash IS 
  'SHA-256 hash of the question content used to generate the embedding. Used for idempotent re-indexing.';

COMMENT ON COLUMN question_embeddings.embedding_model IS 
  'The embedding model used (e.g., gemini-embedding-001). Supports future model upgrades.';

COMMENT ON COLUMN question_embeddings.embedding_version IS 
  'Version number for embedding model upgrades. Allows re-indexing with new models.';

COMMIT;
