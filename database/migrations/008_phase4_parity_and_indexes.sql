-- Migration 008: Production hardening indexes, constraints, and audit tables
-- Target: Supabase PostgreSQL

-- 1. Ensure question_versions schema
CREATE TABLE IF NOT EXISTS question_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    snapshot JSONB NOT NULL,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    change_type VARCHAR(50) NOT NULL DEFAULT 'update',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_question_version UNIQUE(question_id, version)
);
CREATE INDEX IF NOT EXISTS idx_question_versions_question_version ON question_versions(question_id, version DESC);

-- 2. Ensure submission_score_audit schema
CREATE TABLE IF NOT EXISTS submission_score_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    previous_score NUMERIC(5,2),
    new_score NUMERIC(5,2) NOT NULL,
    feedback TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_score_audit_submission ON submission_score_audit(submission_id);
CREATE INDEX IF NOT EXISTS idx_score_audit_reviewer ON submission_score_audit(reviewer_id);

-- 3. Production Query Performance Indexes
CREATE INDEX IF NOT EXISTS idx_submissions_user_question ON submissions(user_id, question_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status_updated ON submissions(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_code_submissions_log_user_question ON code_submissions_log(user_id, question_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_questions_active_published ON questions(is_active, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);
