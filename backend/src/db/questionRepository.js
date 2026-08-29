const { getRepository } = require('./repositoryFactory');

function parseHints(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean).map(String);
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed || trimmed === '[]') return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
      if (typeof parsed === 'string' && parsed.trim() && parsed !== '[]') return [parsed.trim()];
    } catch {
      return [trimmed];
    }
  }
  return [];
}

function normalize(row) {
  if (!row) return row;
  const copy = { ...row };
  for (const key of ['starter_code', 'supported_languages', 'tags']) {
    if (copy[key] && typeof copy[key] === 'string') {
      try { copy[key] = JSON.parse(copy[key]); } catch (_) {}
    }
  }
  if (copy.hints !== undefined) copy.hints = parseHints(copy.hints);
  if (copy.is_active !== undefined) copy.is_active = Boolean(copy.is_active);
  if (copy.is_hidden !== undefined) copy.is_hidden = Boolean(copy.is_hidden);
  return copy;
}

function questionRepository() {
  const repo = getRepository();

  return {
    async findById(id) {
      const row = await repo.one('SELECT q.*, t.name AS topic_name FROM questions q LEFT JOIN topics t ON q.topic_id = t.id WHERE q.id = ?', [id]);
      return normalize(row);
    },
    async findTopic(id) {
      return repo.one('SELECT id FROM topics WHERE id = ?', [id]);
    },
    async findDuplicateTitle(title, excludeId = null) {
      const sql = excludeId
        ? 'SELECT id FROM questions WHERE LOWER(title) = LOWER(?) AND id != ? AND (is_active = 1 OR is_active = TRUE)'
        : 'SELECT id FROM questions WHERE LOWER(title) = LOWER(?) AND (is_active = 1 OR is_active = TRUE)';
      const params = excludeId ? [title, excludeId] : [title];
      return repo.one(sql, params);
    },
    async listTestCases(questionId, includeHidden) {
      const sql = includeHidden
        ? 'SELECT id, input, expected_output, is_hidden FROM test_cases WHERE question_id = ? ORDER BY is_hidden ASC, created_at ASC'
        : 'SELECT id, input, expected_output, is_hidden FROM test_cases WHERE question_id = ? AND (is_hidden = 0 OR is_hidden = FALSE) ORDER BY created_at ASC';
      const rows = await repo.many(sql, [questionId]);
      return rows.map(normalize);
    },
    async findSubmission(questionId, userId) {
      return repo.one('SELECT * FROM submissions WHERE question_id = ? AND user_id = ?', [questionId, userId]);
    },
    async insertTestCases(questionId, cases) {
      for (const tc of cases || []) {
        if (!tc) continue;
        const id = tc.id || require('uuid').v4();
        const isHidden = tc.is_hidden ? 1 : 0;
        await repo.execute(
          'INSERT INTO test_cases (id, question_id, input, expected_output, is_hidden) VALUES (?, ?, ?, ?, ?)',
          [id, questionId, String(tc.input || ''), String(tc.expected_output || ''), isHidden]
        );
      }
    },
    async execute(sql, params = []) {
      return repo.execute(sql, params);
    },
    async all(sql, params = []) {
      return repo.many(sql, params);
    },
    async get(sql, params = []) {
      return repo.one(sql, params);
    },
    async transaction(fn) {
      return repo.transaction(fn);
    }
  };
}

module.exports = { questionRepository };
