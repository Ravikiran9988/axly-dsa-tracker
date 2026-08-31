-- =============================================================================
-- Axly DSA Tracker — Supabase PostgreSQL Migration 016
-- Keep duration fields compatible with fractional second measurements.
-- Some production schemas were created with INTEGER duration columns while the
-- application calculates elapsed time with sub-second precision.
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'submissions'
      AND column_name = 'solve_duration_seconds'
  ) THEN
    ALTER TABLE submissions
      ALTER COLUMN solve_duration_seconds TYPE DOUBLE PRECISION
      USING solve_duration_seconds::DOUBLE PRECISION;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'submissions'
      AND column_name = 'execution_time_ms'
  ) THEN
    ALTER TABLE submissions
      ALTER COLUMN execution_time_ms TYPE DOUBLE PRECISION
      USING execution_time_ms::DOUBLE PRECISION;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'code_submissions_log'
      AND column_name = 'execution_time_ms'
  ) THEN
    ALTER TABLE code_submissions_log
      ALTER COLUMN execution_time_ms TYPE DOUBLE PRECISION
      USING execution_time_ms::DOUBLE PRECISION;
  END IF;
END $$;
