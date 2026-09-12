ALTER TABLE questions ADD COLUMN slug TEXT;
ALTER TABLE questions ADD COLUMN pattern_id TEXT REFERENCES patterns(id) ON DELETE SET NULL;
ALTER TABLE questions ADD COLUMN reference_solution TEXT;
ALTER TABLE questions ADD COLUMN editorial TEXT;
ALTER TABLE questions ADD COLUMN solution_approach TEXT;
ALTER TABLE questions ADD COLUMN complexity TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_questions_slug ON questions(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_questions_pattern_id ON questions(pattern_id);
