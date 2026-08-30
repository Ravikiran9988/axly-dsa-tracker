-- =============================================================================
-- Axly DSA Tracker — Supabase PostgreSQL Production Migration 002
-- Migration 002: DSA AI Telemetry & Observability
-- =============================================================================

CREATE TABLE IF NOT EXISTS dsa_ai_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  question_id TEXT REFERENCES questions(id) ON DELETE SET NULL,
  intent TEXT NOT NULL,
  source TEXT NOT NULL,
  provider TEXT,
  latency_ms INTEGER DEFAULT 0,
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  is_verified BOOLEAN,
  status TEXT DEFAULT 'success',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dsa_ai_logs_user ON dsa_ai_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_dsa_ai_logs_intent ON dsa_ai_logs(intent);
CREATE INDEX IF NOT EXISTS idx_dsa_ai_logs_created_at ON dsa_ai_logs(created_at DESC);

-- Enable RLS for dsa_ai_logs
ALTER TABLE dsa_ai_logs ENABLE ROW LEVEL SECURITY;

-- Students can read their own logs; Admins can read all logs
DROP POLICY IF EXISTS "Users can view own dsa_ai_logs" ON dsa_ai_logs;
CREATE POLICY "Users can view own dsa_ai_logs"
  ON dsa_ai_logs FOR SELECT
  USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Admins can view all dsa_ai_logs" ON dsa_ai_logs;
CREATE POLICY "Admins can view all dsa_ai_logs"
  ON dsa_ai_logs FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'admin')
  );
