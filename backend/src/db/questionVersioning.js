const { db } = require('./db');
const { v4: uuidv4 } = require('uuid');

function ensureQuestionVersioning() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS question_versions (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      snapshot TEXT NOT NULL,
      changed_by TEXT,
      change_type TEXT NOT NULL DEFAULT 'update',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(question_id, version)
    );
    CREATE INDEX IF NOT EXISTS idx_question_versions_question ON question_versions(question_id, version DESC);
  `);
  const columns = db.prepare('PRAGMA table_info(questions)').all().map(c => c.name);
  if (!columns.includes('current_version')) {
    db.exec("ALTER TABLE questions ADD COLUMN current_version INTEGER NOT NULL DEFAULT 1");
  }
}

function snapshotQuestion(question) {
  const copy = { ...question };
  delete copy.submission;
  delete copy.submission_status;
  delete copy.is_assigned_to_me;
  delete copy.active_assignees_count;
  delete copy.total_test_cases_count;
  return JSON.stringify(copy);
}

function createVersion(question, changedBy, changeType = 'update') {
  if (!question || !question.id) return 1;
  try {
    ensureQuestionVersioning();
    const row = db.prepare('SELECT COALESCE(MAX(version),0) AS version FROM question_versions WHERE question_id=?').get(question.id);
    const version = Number(row?.version || 0) + 1;
    db.prepare(`
      INSERT INTO question_versions (id, question_id, version, snapshot, changed_by, change_type, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(uuidv4(), question.id, version, snapshotQuestion(question), changedBy || null, changeType);

    db.prepare('UPDATE questions SET current_version=? WHERE id=?').run(version, question.id);
    return version;
  } catch (err) {
    console.warn('[Versioning Warning]', err.message);
    return 1;
  }
}

function listVersions(questionId) {
  ensureQuestionVersioning();
  const rows = db.prepare(`
    SELECT v.id, v.question_id, v.version, v.changed_by, v.change_type, v.created_at, u.name AS changed_by_name, u.email AS changed_by_email
    FROM question_versions v
    LEFT JOIN users u ON v.changed_by = u.id
    WHERE v.question_id = ?
    ORDER BY v.version DESC
  `).all(questionId);
  return rows;
}

function getVersion(questionId, version) {
  ensureQuestionVersioning();
  const row = db.prepare(`
    SELECT v.*, u.name AS changed_by_name, u.email AS changed_by_email
    FROM question_versions v
    LEFT JOIN users u ON v.changed_by = u.id
    WHERE v.question_id = ? AND v.version = ?
  `).get(questionId, Number(version));

  if (!row) return null;
  return { ...row, snapshot: JSON.parse(row.snapshot) };
}

function compareVersions(questionId, v1, v2) {
  const version1 = getVersion(questionId, v1);
  const version2 = getVersion(questionId, v2);
  if (!version1 || !version2) return null;

  const s1 = version1.snapshot;
  const s2 = version2.snapshot;

  const comparedFields = [
    'title', 'difficulty', 'description', 'problem_statement', 'constraints',
    'input_format', 'output_format', 'example_input', 'example_output', 'hints',
    'starter_code', 'points', 'estimated_time', 'status', 'test_cases'
  ];

  const diff = {};
  for (const field of comparedFields) {
    const val1 = JSON.stringify(s1[field] ?? '');
    const val2 = JSON.stringify(s2[field] ?? '');
    if (val1 !== val2) {
      diff[field] = {
        v1: s1[field],
        v2: s2[field]
      };
    }
  }

  return {
    question_id: questionId,
    v1: { version: version1.version, changed_by: version1.changed_by_name || version1.changed_by, created_at: version1.created_at },
    v2: { version: version2.version, changed_by: version2.changed_by_name || version2.changed_by, created_at: version2.created_at },
    differences: diff
  };
}

function restoreVersion(questionId, targetVersion, restoredBy) {
  ensureQuestionVersioning();
  const target = getVersion(questionId, targetVersion);
  if (!target) throw new Error('Target version not found');

  const s = target.snapshot;
  const questionService = require('../services/questionService');

  // Update question core fields
  const updated = questionService.updateQuestion(questionId, {
    title: s.title,
    difficulty: s.difficulty,
    topic_id: s.topic_id,
    url: s.url,
    description: s.description,
    problem_statement: s.problem_statement,
    constraints: s.constraints,
    input_format: s.input_format,
    output_format: s.output_format,
    example_input: s.example_input,
    example_output: s.example_output,
    hints: s.hints,
    tags: s.tags,
    estimated_time: s.estimated_time,
    points: s.points,
    starter_code: s.starter_code,
    test_cases: s.test_cases || []
  });

  const newVersion = createVersion(updated, restoredBy, `restore_v${targetVersion}`);
  return { message: `Question successfully restored to version ${targetVersion}`, new_version: newVersion, question: updated };
}

module.exports = {
  ensureQuestionVersioning,
  createVersion,
  listVersions,
  getVersion,
  compareVersions,
  restoreVersion
};
