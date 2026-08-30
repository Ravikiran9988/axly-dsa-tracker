-- =============================================================================
-- Axly DSA Tracker — Supabase PostgreSQL Migration 007
-- Migration 007: Missing Columns for Questions and Daily Challenge Problems
-- Adds missing columns present in db.js SQLite schema but absent in Postgres.
-- =============================================================================

-- 1. QUESTIONS
ALTER TABLE questions ADD COLUMN IF NOT EXISTS assigned_date DATE;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS due_date DATE;

-- 2. DAILY CHALLENGE PROBLEMS
ALTER TABLE daily_challenge_problems ADD COLUMN IF NOT EXISTS secondary_topics JSONB DEFAULT '[]'::jsonb;
ALTER TABLE daily_challenge_problems ADD COLUMN IF NOT EXISTS prerequisites JSONB DEFAULT '[]'::jsonb;
