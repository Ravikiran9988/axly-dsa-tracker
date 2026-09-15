CREATE TABLE IF NOT EXISTS question_bank_automation_settings (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL DEFAULT 'auto_fill' CHECK (mode IN ('ai_assist', 'auto_fill')),
  is_enabled INTEGER NOT NULL DEFAULT 1,
  retry_limit INTEGER NOT NULL DEFAULT 3,
  last_run_at TEXT,
  last_run_status TEXT,
  next_run_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS question_bank_automation_logs (
  id TEXT PRIMARY KEY,
  target_slot TEXT NOT NULL,
  mode TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 1,
  validation_result TEXT,
  sandbox_result TEXT,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'skipped', 'success_noop')),
  failure_category TEXT,
  question_id TEXT REFERENCES questions(id) ON DELETE SET NULL,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS idx_qb_auto_logs_slot ON question_bank_automation_logs(target_slot);
CREATE INDEX IF NOT EXISTS idx_qb_auto_logs_created ON question_bank_automation_logs(created_at DESC);
