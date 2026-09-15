const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../data/axly_dsa.db');
console.log('Connecting to:', dbPath);

const db = new Database(dbPath);

// SQLite-compatible migration for question_embeddings table
const migration = `
CREATE TABLE IF NOT EXISTS question_embeddings (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  embedding TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  embedding_model TEXT NOT NULL DEFAULT 'gemini-embedding-001',
  embedding_version INTEGER NOT NULL DEFAULT 1,
  indexed_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(question_id, embedding_model, embedding_version)
);

CREATE INDEX IF NOT EXISTS idx_question_embeddings_question_id 
  ON question_embeddings(question_id);

CREATE INDEX IF NOT EXISTS idx_question_embeddings_content_hash 
  ON question_embeddings(content_hash);
`;

console.log('Running SQLite migration...');
try {
  db.exec(migration);
  console.log('Migration complete!');
} catch (err) {
  console.error('Migration error:', err.message);
}

// Verify table exists
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='question_embeddings'").all();
console.log('Table exists:', tables.length > 0);

// Count questions
const count = db.prepare('SELECT COUNT(*) as count FROM questions WHERE is_active = TRUE').get();
console.log('Active questions:', count.count);

db.close();
