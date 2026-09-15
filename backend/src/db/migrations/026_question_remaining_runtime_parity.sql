-- =============================================================================
-- Axly DSA Tracker — PostgreSQL Question Runtime Parity
-- Migration 026: Add remaining question fields required by current runtime.
-- Additive + idempotent. No data or legacy tables are dropped.
-- =============================================================================

BEGIN;

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS reference_solution TEXT,
  ADD COLUMN IF NOT EXISTS editorial TEXT,
  ADD COLUMN IF NOT EXISTS solution_approach TEXT,
  ADD COLUMN IF NOT EXISTS complexity TEXT;

COMMIT;
