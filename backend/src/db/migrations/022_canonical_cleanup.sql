-- =============================================================================
-- Axly DSA Tracker — Canonical Question Architecture Cleanup
-- Migration 022: Drop redundant legacy tables
--
-- This migration removes:
--   - daily_challenge_problems (data already in questions table)
--   - daily_challenge_test_cases (data already in test_cases table)
--
-- And updates:
--   - daily_questions: set challenge_id to NULL (was referencing daily_challenge_problems)
--
-- PREREQUISITES:
--   - All DC problem data must already exist in questions table
--   - All DC test case data must already exist in test_cases table
--   - daily_challenge_metadata must point to questions.id
--
-- ROLLBACK: Use backup database or restore from pre-migration snapshot
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Drop daily_challenge_test_cases (references daily_challenge_problems)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS daily_challenge_test_cases CASCADE;

-- -----------------------------------------------------------------------------
-- 2. Drop daily_challenge_problems (redundant - data in questions)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS daily_challenge_problems CASCADE;

-- -----------------------------------------------------------------------------
-- 3. Update daily_questions: set challenge_id to NULL
--    (was referencing daily_challenge_problems which no longer exists)
-- -----------------------------------------------------------------------------
UPDATE daily_questions SET challenge_id = NULL WHERE challenge_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 4. Drop RLS policies for dropped tables (if any exist)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can view daily questions" ON daily_questions;
DROP POLICY IF EXISTS "Admins can manage daily questions" ON daily_questions;

-- -----------------------------------------------------------------------------
-- 5. Add comment documenting the migration
-- -----------------------------------------------------------------------------
COMMENT ON TABLE daily_challenge_metadata IS 
  'Daily Challenge lifecycle/scheduling. PK is questions.id (canonical). Replaces legacy daily_challenge_problems table.';

COMMENT ON COLUMN daily_questions.challenge_id IS 
  'Legacy column - was references daily_challenge_problems.id. Set to NULL in migration 022. Daily challenges now use daily_challenge_metadata.question_id -> questions.id.';

COMMIT;
