-- =============================================================================
-- Axly DSA Tracker — Production RLS Hardening
-- Migration 012: Enable RLS across application tables and remove broad client access
--
-- Architecture note:
-- The application uses the backend PostgreSQL API as the data-access layer.
-- Therefore this migration intentionally keeps direct client access deny-by-default.
-- Supabase Auth is used for authentication, while application data is served by
-- backend APIs. The backend database connection must use a role permitted to
-- operate on these tables (typically the database owner/service role).
--
-- This migration does NOT use FORCE ROW LEVEL SECURITY, so the existing trusted
-- backend connection is not unintentionally broken by forcing RLS on the owner.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Enable RLS on every application table expected by the production schema
-- -----------------------------------------------------------------------------
ALTER TABLE IF EXISTS roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_daily_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS auth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS question_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS question_test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS daily_challenge_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS daily_challenge_test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS daily_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS practice_user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS practice_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS code_submissions_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS points_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dsa_ai_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS daily_challenge_automation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS daily_challenge_automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cohort_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS submission_score_audit ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 2. Remove the broad policies from the legacy RLS file / older migrations
--
-- The old policy set contains USING (true) policies on users, topics, patterns,
-- daily_questions and question_versions. Those are not appropriate for a
-- backend/API-first production architecture because they can expose entire
-- tables through Supabase's data API when present there.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can read profiles" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

DROP POLICY IF EXISTS "Anyone authenticated can view topics" ON topics;
DROP POLICY IF EXISTS "Admins can manage topics" ON topics;

DROP POLICY IF EXISTS "Anyone authenticated can view patterns" ON patterns;
DROP POLICY IF EXISTS "Admins can manage patterns" ON patterns;

DROP POLICY IF EXISTS "Users can view active questions, admins can view all" ON questions;
DROP POLICY IF EXISTS "Admins can insert questions" ON questions;
DROP POLICY IF EXISTS "Admins can update questions" ON questions;

DROP POLICY IF EXISTS "Users can view visible test cases, admins can view all" ON test_cases;
DROP POLICY IF EXISTS "Admins can manage test cases" ON test_cases;

DROP POLICY IF EXISTS "Users can view own submissions, admins can view all" ON submissions;
DROP POLICY IF EXISTS "Users can insert own submissions" ON submissions;
DROP POLICY IF EXISTS "Users can update own submissions" ON submissions;

DROP POLICY IF EXISTS "Users can view own execution logs, admins view all" ON code_submissions_log;
DROP POLICY IF EXISTS "Users can insert own execution logs" ON code_submissions_log;

DROP POLICY IF EXISTS "Authenticated users can view daily questions" ON daily_questions;
DROP POLICY IF EXISTS "Admins can manage daily questions" ON daily_questions;

DROP POLICY IF EXISTS "Users can view own practice progress, admins view all" ON practice_progress;
DROP POLICY IF EXISTS "Users can update own practice progress" ON practice_progress;

DROP POLICY IF EXISTS "Users can manage own notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can view and create audit logs" ON admin_audit_logs;

DROP POLICY IF EXISTS "Authenticated users can view question versions" ON question_versions;
DROP POLICY IF EXISTS "Admins can manage question versions" ON question_versions;

-- Old dsa_ai_logs migration policies are also removed so AI telemetry is not
-- directly readable from the data API.
DROP POLICY IF EXISTS "Users can view own dsa_ai_logs" ON dsa_ai_logs;
DROP POLICY IF EXISTS "Admins can view all dsa_ai_logs" ON dsa_ai_logs;

-- -----------------------------------------------------------------------------
-- 3. Intentionally deny direct Supabase Data API access by default
--
-- RLS with no policies means anon/authenticated clients cannot read or mutate
-- rows. This is deliberate: all application reads/writes go through the backend.
-- The trusted backend DB role is unaffected unless it is explicitly configured
-- to be subject to RLS.
--
-- We therefore do NOT create permissive policies such as USING (true).
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- 4. Explicit owner-only policies for dsa_ai_logs are deliberately omitted.
-- AI telemetry contains operational metadata and remains backend/admin only.
-- -----------------------------------------------------------------------------

COMMIT;
