const { getRepository } = require('../db/repositoryFactory');
const { ensurePracticeSchema } = require('../db/practiceSchema');
const { AppError } = require('../middleware/errorHandler');

const repo = getRepository();
const VALID_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);
const MAX_PAGE = 100;

function parseJsonField(val, fallback = []) {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return fallback; }
}

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

function positiveInt(v, fallback, max) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? Math.min(n, max) : fallback;
}

async function validatePatternForTopic(patternId, topicId) {
  if (!patternId) return;
  if (!topicId) throw new AppError('topic_id is required with pattern_id', 400, 'VALIDATION_ERROR', 'topic_id');
  const p = await repo.one('SELECT id, applicable_topics FROM patterns WHERE id = ?', [patternId]);
  if (!p) throw new AppError('Invalid pattern_id', 400, 'VALIDATION_ERROR', 'pattern_id');
  const topics = parseJsonField(p.applicable_topics, []);
  if (!topics.includes(topicId)) {
    throw new AppError('Pattern is not applicable to the selected topic', 400, 'VALIDATION_ERROR', 'pattern_id');
  }
}

async function validateFilters({ difficulty, topic_id, pattern_id, status }) {
  if (difficulty && !VALID_DIFFICULTIES.has(String(difficulty).toLowerCase())) {
    throw new AppError('Invalid difficulty', 400, 'VALIDATION_ERROR', 'difficulty');
  }
  if (status && !['solved', 'in-progress', 'unsolved'].includes(status)) {
    throw new AppError('Invalid practice status', 400, 'VALIDATION_ERROR', 'status');
  }
  if (topic_id) {
    const topic = await repo.one('SELECT 1 FROM topics WHERE id = ?', [topic_id]);
    if (!topic) throw new AppError('Invalid topic_id', 400, 'VALIDATION_ERROR', 'topic_id');
  }
  await validatePatternForTopic(pattern_id, topic_id);
}

async function listPracticeProblems({ user, difficulty, topic_id, pattern_id, status, search, page = 1, limit = 24 }) {
  ensurePracticeSchema();
  await validateFilters({ difficulty, topic_id, pattern_id, status });

  const conditions = ['q.is_practice = TRUE', 'q.is_active = TRUE'];
  const params = [];

  if (difficulty) {
    conditions.push('LOWER(q.difficulty) = ?');
    params.push(String(difficulty).toLowerCase());
  }
  if (topic_id) {
    conditions.push('q.topic_id = ?');
    params.push(topic_id);
  }
  if (pattern_id) {
    conditions.push('q.pattern_id = ?');
    params.push(pattern_id);
  }
  if (search && search.trim()) {
    conditions.push('(LOWER(q.title) LIKE ? OR LOWER(COALESCE(q.description, \'\')) LIKE ?)');
    const s = `%${search.trim().toLowerCase()}%`;
    params.push(s, s);
  }
  if (status === 'solved') {
    conditions.push("pp.status = 'solved'");
  } else if (status === 'in-progress') {
    conditions.push("pp.status = 'in_progress'");
  } else if (status === 'unsolved') {
    conditions.push("(pp.status IS NULL OR pp.status = 'abandoned')");
  }

  const whereSql = `WHERE ${conditions.join(' AND ')}`;
  const countRow = await repo.one(`
    SELECT COUNT(*) AS total
    FROM questions q
    LEFT JOIN topics t ON t.id = q.topic_id
    LEFT JOIN practice_progress pp ON pp.question_id = q.id AND pp.user_id = ?
    ${whereSql}
  `, [user?.id || null, ...params]);

  const total = Number(countRow?.total || 0);
  const p = positiveInt(page, 1, 100000);
  const l = positiveInt(limit, 24, MAX_PAGE);
  const offset = (p - 1) * l;

  const rows = await repo.many(`
    SELECT 
      q.id, q.title, q.slug, q.difficulty, q.topic_id, q.pattern_id,
      q.secondary_topics, q.prerequisites, q.description, q.estimated_time,
      q.solution_approach, t.name AS topic_name,
      pp.status AS practice_status, pp.attempts, pp.started_at, pp.updated_at, pp.solved_at
    FROM questions q
    LEFT JOIN topics t ON t.id = q.topic_id
    LEFT JOIN practice_progress pp ON pp.question_id = q.id AND pp.user_id = ?
    ${whereSql}
    ORDER BY CASE q.difficulty WHEN 'easy' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, q.id ASC
    LIMIT ? OFFSET ?
  `, [user?.id || null, ...params, l, offset]);

  return {
    data: rows.map(r => ({
      ...r,
      secondary_topics: parseJsonField(r.secondary_topics, []),
      prerequisites: parseJsonField(r.prerequisites, []),
      practice_status: r.practice_status || 'not_started'
    })),
    page: p,
    limit: l,
    total,
    totalPages: Math.ceil(total / l),
    hasNext: p * l < total
  };
}

async function getPracticeProblem({ user, questionId }) {
  ensurePracticeSchema();
  const r = await repo.one(`
    SELECT 
      q.*, t.name AS topic_name,
      pp.status AS practice_status, pp.attempts, pp.started_at, pp.updated_at, pp.solved_at
    FROM questions q
    LEFT JOIN topics t ON t.id = q.topic_id
    LEFT JOIN practice_progress pp ON pp.question_id = q.id AND pp.user_id = ?
    WHERE q.id = ? AND q.is_practice = TRUE AND q.is_active = TRUE
  `, [user?.id || null, questionId]);

  if (!r) return null;
  return {
    ...r,
    hints: parseHints(r.hints),
    secondary_topics: parseJsonField(r.secondary_topics, []),
    prerequisites: parseJsonField(r.prerequisites, []),
    practice_status: r.practice_status || 'not_started'
  };
}

async function startPractice({ user, questionId }) {
  ensurePracticeSchema();
  const q = await repo.one(
    'SELECT id FROM questions WHERE id = ? AND is_practice = TRUE AND is_active = TRUE',
    [questionId]
  );
  if (!q) throw new AppError('Practice problem not found', 404, 'NOT_FOUND');

  const now = new Date().toISOString();
  await repo.execute(`
    INSERT INTO practice_progress (user_id, question_id, status, started_at, updated_at)
    VALUES (?, ?, 'in_progress', ?, ?)
    ON CONFLICT(user_id, question_id) DO UPDATE SET
      status = CASE WHEN practice_progress.status = 'solved' THEN 'solved' ELSE 'in_progress' END,
      updated_at = ?
  `, [user.id, questionId, now, now, now]);

  return getPracticeProblem({ user, questionId });
}

async function abandonPractice({ user, questionId }) {
  ensurePracticeSchema();
  const now = new Date().toISOString();
  const result = await repo.execute(`
    UPDATE practice_progress
    SET status = 'abandoned', updated_at = ?
    WHERE user_id = ? AND question_id = ? AND status = 'in_progress'
  `, [now, user.id, questionId]);

  if (!result.rowCount && !result.changes) {
    throw new AppError('Practice problem is not in progress', 409, 'CONFLICT');
  }

  return getPracticeProblem({ user, questionId });
}

async function recordPracticeSubmission({ user, questionId, submissionId, passed }) {
  ensurePracticeSchema();
  const q = await repo.one(
    'SELECT id FROM questions WHERE id = ? AND is_practice = TRUE AND is_active = TRUE',
    [questionId]
  );
  if (!q) throw new AppError('Practice problem not found', 404, 'NOT_FOUND');

  const now = new Date().toISOString();
  const status = passed ? 'solved' : 'in_progress';
  const solvedAt = passed ? now : null;

  await repo.execute(`
    INSERT INTO practice_progress (user_id, question_id, status, started_at, updated_at, solved_at, attempts, last_submission_id)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?)
    ON CONFLICT(user_id, question_id) DO UPDATE SET
      status = CASE WHEN practice_progress.status = 'solved' THEN 'solved' ELSE excluded.status END,
      updated_at = excluded.updated_at,
      solved_at = CASE WHEN practice_progress.status = 'solved' THEN practice_progress.solved_at WHEN excluded.status = 'solved' THEN excluded.solved_at ELSE practice_progress.solved_at END,
      attempts = practice_progress.attempts + 1,
      last_submission_id = excluded.last_submission_id
  `, [user.id, questionId, status, now, now, solvedAt, submissionId || null]);

  return getPracticeProblem({ user, questionId });
}

async function getPracticeProgress({ user }) {
  ensurePracticeSchema();
  const totalRow = await repo.one(
    'SELECT COUNT(*) AS total FROM questions WHERE is_practice = TRUE AND is_active = TRUE'
  );
  const total = Number(totalRow?.total || 0);

  const counts = await repo.many(`
    SELECT COALESCE(pp.status, 'not_started') AS status, COUNT(*) AS count
    FROM questions q
    LEFT JOIN practice_progress pp ON pp.question_id = q.id AND pp.user_id = ?
    WHERE q.is_practice = TRUE AND q.is_active = TRUE
    GROUP BY pp.status
  `, [user.id]);

  const c = { not_started: 0, in_progress: 0, solved: 0, abandoned: 0 };
  counts.forEach(x => {
    if (c[x.status] !== undefined) c[x.status] = Number(x.count || 0);
  });

  const topics = await repo.many(`
    SELECT 
      t.id, t.name,
      COUNT(q.id) AS total,
      SUM(CASE WHEN pp.status = 'solved' THEN 1 ELSE 0 END) AS solved,
      SUM(CASE WHEN pp.status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress
    FROM topics t
    JOIN questions q ON q.topic_id = t.id AND q.is_practice = TRUE AND q.is_active = TRUE
    LEFT JOIN practice_progress pp ON pp.question_id = q.id AND pp.user_id = ?
    GROUP BY t.id, t.name
    ORDER BY t.name ASC
  `, [user.id]);

  const difficulties = await repo.many(`
    SELECT 
      q.difficulty,
      COUNT(q.id) AS total,
      SUM(CASE WHEN pp.status = 'solved' THEN 1 ELSE 0 END) AS solved
    FROM questions q
    LEFT JOIN practice_progress pp ON pp.question_id = q.id AND pp.user_id = ?
    WHERE q.is_practice = TRUE AND q.is_active = TRUE
    GROUP BY q.difficulty
    ORDER BY CASE q.difficulty WHEN 'easy' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END
  `, [user.id]);

  return {
    total,
    solved: c.solved,
    inProgress: c.in_progress,
    notStarted: c.not_started,
    abandoned: c.abandoned,
    completionPercent: total ? Math.round((c.solved * 10000) / total) / 100 : 0,
    topics: topics.map(x => ({ ...x, total: Number(x.total || 0), solved: Number(x.solved || 0), in_progress: Number(x.in_progress || 0) })),
    difficulties: difficulties.map(x => ({ ...x, total: Number(x.total || 0), solved: Number(x.solved || 0) }))
  };
}

async function listPracticeTopics() {
  ensurePracticeSchema();
  return repo.many(`
    SELECT t.id, t.name, COUNT(q.id) AS problem_count
    FROM topics t
    JOIN questions q ON q.topic_id = t.id AND q.is_practice = TRUE AND q.is_active = TRUE
    GROUP BY t.id, t.name
    ORDER BY t.name ASC
  `);
}

async function listPracticePatterns() {
  ensurePracticeSchema();
  const patterns = await repo.many('SELECT id, name, applicable_topics FROM patterns ORDER BY name ASC');
  return patterns.map(p => ({
    ...p,
    applicable_topics: parseJsonField(p.applicable_topics, [])
  }));
}

module.exports = {
  listPracticeProblems,
  getPracticeProblem,
  startPractice,
  abandonPractice,
  recordPracticeSubmission,
  getPracticeProgress,
  listPracticeTopics,
  listPracticePatterns
};