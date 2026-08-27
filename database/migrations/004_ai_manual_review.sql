-- Migration 004: AI + Manual Submission Review
-- Target: Supabase PostgreSQL

ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS test_case_score NUMERIC(5,2) CHECK (test_case_score IS NULL OR (test_case_score >= 0 AND test_case_score <= 60)),
  ADD COLUMN IF NOT EXISTS time_score NUMERIC(5,2) CHECK (time_score IS NULL OR (time_score >= 0 AND time_score <= 20)),
  ADD COLUMN IF NOT EXISTS attempt_score NUMERIC(5,2) CHECK (attempt_score IS NULL OR (attempt_score >= 0 AND attempt_score <= 20)),
  ADD COLUMN IF NOT EXISTS ai_score NUMERIC(5,2) CHECK (ai_score IS NULL OR (ai_score >= 0 AND ai_score <= 100)),
  ADD COLUMN IF NOT EXISTS ai_feedback TEXT,
  ADD COLUMN IF NOT EXISTS ai_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS manual_score NUMERIC(5,2) CHECK (manual_score IS NULL OR (manual_score >= 0 AND manual_score <= 100)),
  ADD COLUMN IF NOT EXISTS manual_feedback TEXT,
  ADD COLUMN IF NOT EXISTS manual_reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS manual_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS final_score NUMERIC(5,2) CHECK (final_score IS NULL OR (final_score >= 0 AND final_score <= 100));

CREATE INDEX IF NOT EXISTS idx_submissions_final_score ON submissions(final_score);
CREATE INDEX IF NOT EXISTS idx_submissions_manual_reviewer ON submissions(manual_reviewer_id);

-- Audit trail for manual score changes.
CREATE TABLE IF NOT EXISTS submission_score_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  previous_score NUMERIC(5,2),
  new_score NUMERIC(5,2) NOT NULL CHECK (new_score >= 0 AND new_score <= 100),
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_submission_score_audit_submission ON submission_score_audit(submission_id);
CREATE INDEX IF NOT EXISTS idx_submission_score_audit_reviewer ON submission_score_audit(reviewer_id);
