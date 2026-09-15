-- =============================================================================
-- Axly DSA Tracker — PostgreSQL Question Runtime Parity
-- Migration 035: Add fields required by current Question Bank / Daily
-- Challenge admin/runtime queries on legacy PostgreSQL databases.
-- Additive and idempotent; no data or tables are removed.
-- =============================================================================

BEGIN;

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS reference_solution TEXT,
  ADD COLUMN IF NOT EXISTS editorial TEXT,
  ADD COLUMN IF NOT EXISTS solution_approach TEXT,
  ADD COLUMN IF NOT EXISTS complexity TEXT;

COMMIT;
