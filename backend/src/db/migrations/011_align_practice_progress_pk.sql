-- =============================================================================
-- Axly DSA Tracker — Supabase PostgreSQL Migration 011
-- Migration 011: Align Practice Progress Primary Key
-- Drops the unused `id` column and sets the composite primary key.
-- =============================================================================

DO $$ 
BEGIN

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='practice_progress' AND column_name='id') THEN
    -- Drop the existing primary key constraint (which is on 'id')
    ALTER TABLE practice_progress DROP CONSTRAINT IF EXISTS practice_user_progress_pkey CASCADE;
    ALTER TABLE practice_progress DROP CONSTRAINT IF EXISTS practice_progress_pkey CASCADE;
    
    -- Drop the id column
    ALTER TABLE practice_progress DROP COLUMN id;
    
    -- Add the new composite primary key, which matches SQLite
    ALTER TABLE practice_progress ADD PRIMARY KEY (user_id, question_id);
  END IF;

END $$;
