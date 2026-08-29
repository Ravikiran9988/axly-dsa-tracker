-- Migration 006: Daily challenge lifecycle hardening
-- Exactly one daily challenge per calendar date is enforced by a unique index.
CREATE UNIQUE INDEX IF NOT EXISTS uq_daily_questions_date ON daily_questions(date);
-- A question may be used on multiple dates, but the same question is not eligible
-- for automatic rotation until the deterministic pool has cycled through all questions.
