-- =============================================================================
-- Axly DSA Tracker — Supabase PostgreSQL Migration 008
-- Migration 008: Missing Columns for Questions
-- Adds supported_languages to questions table.
-- =============================================================================

ALTER TABLE questions ADD COLUMN IF NOT EXISTS supported_languages JSONB DEFAULT '["python", "javascript", "java", "cpp", "c", "typescript"]'::jsonb;
