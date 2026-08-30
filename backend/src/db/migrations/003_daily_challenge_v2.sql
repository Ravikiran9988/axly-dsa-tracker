-- Migration 003: Daily Challenge V2 Automation & Uniqueness Protection

-- 1. Partial Unique Index on Daily Challenge Problems
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_challenge_problems_unique_active_date 
  ON daily_challenge_problems(scheduled_date) 
  WHERE scheduled_date IS NOT NULL AND status != 'archived' AND is_active = TRUE;

-- 2. Daily Challenge Automation Settings Table
CREATE TABLE IF NOT EXISTS daily_challenge_automation_settings (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL DEFAULT 'ai_assist' CHECK (mode IN ('manual', 'ai_assist', 'auto_fill')),
  is_enabled INTEGER NOT NULL DEFAULT 1,
  target_hour_utc INTEGER NOT NULL DEFAULT 0,
  retry_limit INTEGER NOT NULL DEFAULT 3,
  last_run_at TIMESTAMPTZ,
  last_run_status TEXT,
  next_run_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Default Settings
INSERT INTO daily_challenge_automation_settings (id, mode, is_enabled, target_hour_utc, retry_limit)
VALUES ('global-settings', 'ai_assist', 1, 0, 3)
ON CONFLICT (id) DO NOTHING;

-- 3. Daily Challenge Automation Logs Table
CREATE TABLE IF NOT EXISTS daily_challenge_automation_logs (
  id TEXT PRIMARY KEY,
  target_date TEXT NOT NULL,
  mode TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 1,
  validation_result TEXT,
  sandbox_result TEXT,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
  failure_category TEXT,
  challenge_id TEXT REFERENCES daily_challenge_problems(id) ON DELETE SET NULL,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_daily_challenge_automation_logs_date ON daily_challenge_automation_logs(target_date);
CREATE INDEX IF NOT EXISTS idx_daily_challenge_automation_logs_created ON daily_challenge_automation_logs(created_at DESC);

-- 4. Structured Problem Signature Columns
ALTER TABLE daily_challenge_problems ADD COLUMN IF NOT EXISTS problem_signature TEXT;
ALTER TABLE daily_challenge_problems ADD COLUMN IF NOT EXISTS problem_concept TEXT;
CREATE INDEX IF NOT EXISTS idx_daily_challenge_problem_signature ON daily_challenge_problems(problem_signature);
