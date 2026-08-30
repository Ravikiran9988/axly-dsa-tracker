-- =============================================================================
-- Axly DSA Tracker — Supabase PostgreSQL Migration 004
-- Migration 004: User Profile & Rank Compatibility Columns
-- =============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS rank INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS github_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS skills JSONB DEFAULT '["JavaScript", "Data Structures", "Algorithms"]'::jsonb;

-- Cohorts Tables (if not already existing)
CREATE TABLE IF NOT EXISTS cohorts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  mentor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cohort_members (
  id TEXT PRIMARY KEY,
  cohort_id TEXT NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (cohort_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_cohort_members_user ON cohort_members(user_id);
