-- Migration 003: Practice System Schema
-- Target: Supabase PostgreSQL

-- 1. Patterns table for curated problem patterns
CREATE TABLE IF NOT EXISTS patterns (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    applicable_topics JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_patterns_name ON patterns(name);

-- 2. Expand questions table with practice problem metadata
ALTER TABLE questions ADD COLUMN IF NOT EXISTS slug VARCHAR(255);
ALTER TABLE questions ADD COLUMN IF NOT EXISTS pattern_id VARCHAR(100) REFERENCES patterns(id) ON DELETE SET NULL;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS secondary_topics JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS prerequisites JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS solution_approach TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS is_practice BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_questions_practice_slug ON questions(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_questions_is_practice ON questions(is_practice);
CREATE INDEX IF NOT EXISTS idx_questions_pattern_id ON questions(pattern_id);

-- 3. Practice progress tracking per user (independent from competitive Daily Challenges)
CREATE TABLE IF NOT EXISTS practice_progress (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('not_started', 'in_progress', 'solved', 'abandoned')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    solved_at TIMESTAMPTZ,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_submission_id UUID,
    PRIMARY KEY (user_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_practice_progress_user_status ON practice_progress(user_id, status);
CREATE INDEX IF NOT EXISTS idx_practice_progress_question ON practice_progress(question_id);
