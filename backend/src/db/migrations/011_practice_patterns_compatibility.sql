-- =============================================================================
-- Axly DSA Tracker — Supabase PostgreSQL Migration 011
-- Fix existing patterns tables created before Migration 010.
-- =============================================================================

-- Migration 010 used CREATE TABLE IF NOT EXISTS. If patterns already existed,
-- PostgreSQL kept the old shape and applicable_topics was never added.
ALTER TABLE patterns
  ADD COLUMN IF NOT EXISTS applicable_topics JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_patterns_name ON patterns(name);

-- Normalize NULL values from any legacy rows before application code reads them.
UPDATE patterns
SET applicable_topics = '[]'::jsonb
WHERE applicable_topics IS NULL;
