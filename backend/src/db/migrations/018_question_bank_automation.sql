-- =============================================================================
-- Axly DSA Tracker — Supabase PostgreSQL Migration 018
-- Migration 018: Question Bank AI Automation
-- =============================================================================

ALTER TABLE questions ADD COLUMN IF NOT EXISTS generation_slot TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS created_via TEXT NOT NULL DEFAULT 'manual' CHECK (created_via IN ('manual', 'ai'));

-- Add a partial unique index on generation_slot (to avoid null collisions)
CREATE UNIQUE INDEX IF NOT EXISTS idx_questions_generation_slot 
  ON questions(generation_slot) 
  WHERE generation_slot IS NOT NULL;
