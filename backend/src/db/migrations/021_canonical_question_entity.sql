-- =============================================================================
-- Axly DSA Tracker — Supabase PostgreSQL Migration 021
-- Migration 021: Canonical Question Entity Refactor
-- Merges Daily Challenges into Questions to create a single Canonical Identity.
-- =============================================================================

-- 1. Ensure questions table has all superset columns
ALTER TABLE questions ADD COLUMN IF NOT EXISTS examples JSONB DEFAULT '[]'::jsonb;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS supported_languages JSONB DEFAULT '["javascript", "python", "typescript", "java", "cpp", "c"]'::jsonb;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS problem_signature TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS problem_concept TEXT;

-- 2. Migrate daily_challenge_problems into questions
INSERT INTO questions (
  id, title, slug, difficulty, points, estimated_time, topic_id, pattern_id, 
  description, problem_statement, constraints, input_format, output_format, 
  example_input, example_output, hints, tags, solution_approach, solution_code, 
  starter_code, driver_code, version, created_by, is_active, created_at, updated_at,
  is_practice, status, secondary_topics, prerequisites, reference_solution, editorial, complexity,
  examples, supported_languages, problem_signature, problem_concept
)
SELECT 
  id, title, slug, difficulty, points, estimated_time, topic_id, pattern_id, 
  description, problem_statement, constraints, input_format, output_format, 
  example_input, example_output, hints, tags, solution_approach, NULL AS solution_code, 
  CASE WHEN starter_code IS NULL OR starter_code = '' THEN '{}'::jsonb ELSE starter_code::jsonb END AS starter_code, 
  '{}'::jsonb AS driver_code, 1 AS version, created_by, is_active, created_at, updated_at,
  FALSE AS is_practice, status, '[]'::jsonb AS secondary_topics, '[]'::jsonb AS prerequisites, NULL AS reference_solution, editorial, complexity,
  examples, supported_languages, problem_signature, problem_concept
FROM daily_challenge_problems
ON CONFLICT (id) DO NOTHING;

-- 3. Migrate test cases
INSERT INTO question_test_cases (
  id, question_id, input, expected_output, is_hidden, created_at
)
SELECT 
  id, challenge_id, input, expected_output, is_hidden, created_at
FROM daily_challenge_test_cases
ON CONFLICT (id) DO NOTHING;

-- 4. Create daily_challenge_metadata table
CREATE TABLE IF NOT EXISTS daily_challenge_metadata (
  question_id TEXT PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
  scheduled_date DATE UNIQUE,
  custom_topic TEXT,
  created_via TEXT NOT NULL DEFAULT 'manual' CHECK (created_via IN ('manual', 'ai')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Backfill daily_challenge_metadata
INSERT INTO daily_challenge_metadata (
  question_id, scheduled_date, custom_topic, created_via, created_at, updated_at
)
SELECT 
  id, scheduled_date, custom_topic, created_via, created_at, updated_at
FROM daily_challenge_problems
ON CONFLICT (question_id) DO NOTHING;

-- 6. Update daily_questions table to point question_id to the canonical ID
UPDATE daily_questions 
SET question_id = challenge_id 
WHERE question_id IS NULL AND challenge_id IS NOT NULL;
