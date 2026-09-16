-- =============================================================================
-- Axly DSA Tracker — Supabase PostgreSQL Migration 038
-- Migration 038: Fix question_bank_automation_logs status check constraint
-- =============================================================================

DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'question_bank_automation_logs'::regclass
    AND contype = 'c';
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE question_bank_automation_logs DROP CONSTRAINT ' || constraint_name;
    END IF;
END $$;

ALTER TABLE question_bank_automation_logs ADD CONSTRAINT question_bank_automation_logs_status_check CHECK (status IN ('success', 'failed', 'skipped', 'success_noop', 'in_progress'));
