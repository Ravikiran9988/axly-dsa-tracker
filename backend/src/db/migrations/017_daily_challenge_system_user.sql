-- =============================================================================
-- Axly DSA Tracker — Supabase PostgreSQL Migration 017
-- Provide a stable database identity for scheduled Daily Challenge automation.
-- =============================================================================

-- The scheduled AI generator uses usr-system-cron as created_by. Keep this
-- identity as an inactive system account so the foreign-key constraint remains
-- valid without creating a real/login-enabled student account.
INSERT INTO users (
  id,
  name,
  email,
  role,
  email_verified,
  is_active
)
VALUES (
  'usr-system-cron',
  'Axly System Automation',
  'system-cron@axly.internal',
  'user',
  TRUE,
  FALSE
)
ON CONFLICT (id) DO NOTHING;
