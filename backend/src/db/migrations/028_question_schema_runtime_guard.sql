-- =============================================================================
-- Axly DSA Tracker — PostgreSQL Question Runtime Parity
-- Migration 028: Explicit guard for admin/editorial question fields.
-- Additive and idempotent.
-- =============================================================================

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS editorial TEXT,
  ADD COLUMN IF NOT EXISTS reference_solution TEXT,
  ADD COLUMN IF NOT EXISTS solution_approach TEXT,
  ADD COLUMN IF NOT EXISTS complexity TEXT;
