CREATE TABLE IF NOT EXISTS daily_challenge_metadata (
  question_id TEXT PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
  scheduled_date TEXT UNIQUE,
  custom_topic TEXT,
  created_via TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE daily_challenge_metadata ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft';
CREATE INDEX IF NOT EXISTS idx_daily_challenge_metadata_status ON daily_challenge_metadata(status);
CREATE INDEX IF NOT EXISTS idx_daily_challenge_metadata_date ON daily_challenge_metadata(scheduled_date);
