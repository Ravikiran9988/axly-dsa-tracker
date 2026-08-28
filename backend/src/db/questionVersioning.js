const { db } = require('./db');

function ensureQuestionVersioning() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS question_versions (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      snapshot TEXT NOT NULL,
      changed_by TEXT,
      change_type TEXT NOT NULL DEFAULT 'update',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(question_id, version)
    );
    CREATE INDEX IF NOT EXISTS idx_question_versions_question ON question_versions(question_id, version DESC);
  `);
  const columns = db.prepare('PRAGMA table_info(questions)').all().map(c => c.name);
  if (!columns.includes('current_version')) db.exec("ALTER TABLE questions ADD COLUMN current_version INTEGER NOT NULL DEFAULT 1");
}

function snapshotQuestion(question) {
  const copy = {...question};
  delete copy.topic_name;
  delete copy.test_cases;
  delete copy.submission;
  delete copy.submission_status;
  return JSON.stringify(copy);
}

function createVersion(question, changedBy, changeType='update') {
  if (!question || !question.id) return 1;
  try {
    ensureQuestionVersioning();
    const row = db.prepare('SELECT COALESCE(MAX(version),0) AS version FROM question_versions WHERE question_id=?').get(question.id);
    const version = Number(row?.version || 0) + 1;
    db.prepare(`INSERT INTO question_versions (id,question_id,version,snapshot,changed_by,change_type) VALUES (?,?,?,?,?,?)`)
      .run(require('uuid').v4(), question.id, version, snapshotQuestion(question), changedBy || null, changeType);
    db.prepare('UPDATE questions SET current_version=? WHERE id=?').run(version, question.id);
    return version;
  } catch (err) {
    console.warn('[Versioning Warning]', err.message);
    return 1;
  }
}

function listVersions(questionId) {
  ensureQuestionVersioning();
  return db.prepare('SELECT id,question_id,version,changed_by,change_type,created_at FROM question_versions WHERE question_id=? ORDER BY version DESC').all(questionId);
}

function getVersion(questionId, version) {
  ensureQuestionVersioning();
  const row = db.prepare('SELECT * FROM question_versions WHERE question_id=? AND version=?').get(questionId, Number(version));
  if (!row) return null;
  return {...row, snapshot: JSON.parse(row.snapshot)};
}

module.exports = {ensureQuestionVersioning, createVersion, listVersions, getVersion};
