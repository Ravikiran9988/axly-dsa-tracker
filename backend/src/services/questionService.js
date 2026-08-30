const { getRepository } = require('../db/repositoryFactory');
const { v4: uuidv4 } = require('uuid');
const { AppError } = require('../middleware/errorHandler');

const repo = getRepository();

function safeParseJson(value, fallback = null) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

function parseHints(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (typeof value === 'string') {
    const trimmed = value.trim();
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

function normalizeJsonArray(value, fallback = '[]') {
  if (value === undefined || value === null) {
    return typeof fallback === 'string' ? fallback : JSON.stringify(fallback);
  }
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function normalizeStarterCode(starter_code) {
  return typeof starter_code === 'object' ? JSON.stringify(starter_code) : (starter_code || null);
}

async function validateQuestionInput({ title, difficulty, topic_id }, currentRepo = repo) {
  if (!title || !title.trim()) throw new AppError('Title is required', 400, 'VALIDATION_ERROR', 'title');
  if (!['easy', 'medium', 'hard'].includes(String(difficulty || '').toLowerCase())) {
    throw new AppError('Difficulty must be easy, medium, or hard', 400, 'VALIDATION_ERROR', 'difficulty');
  }
  if (topic_id) {
    const topic = await currentRepo.one('SELECT id FROM topics WHERE id = ?', [topic_id]);
    if (!topic) throw new AppError('Specified topic does not exist', 400, 'VALIDATION_ERROR', 'topic_id');
  }
}

async function listQuestions({ user, difficulty, topic_id, assigned, page = 1, limit = 20, search }) {
  const conditions = [];
  const params = [];

  if (user?.role !== 'admin') {
    conditions.push('q.is_active = TRUE');
  }
  if (difficulty) {
    conditions.push('LOWER(q.difficulty) = ?');
    params.push(difficulty.toLowerCase());
  }
  if (topic_id) {
    conditions.push('q.topic_id = ?');
    params.push(topic_id);
  }
  if (assigned !== undefined && assigned !== null && assigned !== '') {
    const isAssigned = String(assigned).toLowerCase() === 'true';
    if (isAssigned) {
      conditions.push('a.id IS NOT NULL');
    } else {
      conditions.push('a.id IS NULL');
    }
  }
  if (search && search.trim()) {
    conditions.push('(LOWER(q.title) LIKE ? OR LOWER(COALESCE(q.description, \'\')) LIKE ?)');
    params.push(`%${search.trim().toLowerCase()}%`, `%${search.trim().toLowerCase()}%`);
  }

  const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const countRow = await repo.one(`
    SELECT COUNT(DISTINCT q.id) AS total
    FROM questions q
    LEFT JOIN assignments a ON a.question_id = q.id AND a.user_id = ? AND a.status != 'unassigned'
    ${whereSql}
  `, [user?.id || null, ...params]);

  const total = Number(countRow?.total || 0);
  const p = Math.max(1, Number(page) || 1);
  const l = Math.max(1, Number(limit) || 20);
  const offset = (p - 1) * l;

  const rows = await repo.many(`
    SELECT 
      q.id, q.title, q.difficulty, q.topic_id, q.url, q.is_active, q.created_at,
      q.description, q.problem_statement, q.constraints, q.input_format, q.output_format,
      q.example_input, q.example_output, q.hints, q.tags, q.estimated_time, q.points,
      q.assigned_date, q.due_date, q.status, q.supported_languages, q.starter_code,
      t.name AS topic_name,
      a.id AS assignment_id, a.status AS assignment_status,
      s.id AS submission_id, s.status AS submission_status,
      s.review_status, s.feedback, s.attempted_at, s.solved_at,
      (SELECT COUNT(*) FROM assignments x WHERE x.question_id = q.id AND x.status != 'unassigned') AS active_assignees_count,
      (SELECT COUNT(*) FROM test_cases tc WHERE tc.question_id = q.id) AS total_test_cases_count
    FROM questions q
    LEFT JOIN topics t ON q.topic_id = t.id
    LEFT JOIN assignments a ON a.question_id = q.id AND a.user_id = ? AND a.status != 'unassigned'
    LEFT JOIN submissions s ON s.question_id = q.id AND s.user_id = ?
    ${whereSql}
    ORDER BY q.created_at DESC
    LIMIT ? OFFSET ?
  `, [user?.id || null, user?.id || null, ...params, l, offset]);

  return {
    data: rows.map(item => ({
      ...item,
      hints: parseHints(item.hints),
      starter_code: item.starter_code ? safeParseJson(item.starter_code) : null,
      supported_languages: item.supported_languages ? safeParseJson(item.supported_languages) : ['javascript', 'python'],
      tags: item.tags ? safeParseJson(item.tags) : [],
      is_active: Boolean(item.is_active),
      is_assigned_to_me: Boolean(item.assignment_id),
      submission_status: item.submission_status || 'not_started',
      active_assignees_count: Number(item.active_assignees_count || 0),
      total_test_cases_count: Number(item.total_test_cases_count || 0)
    })),
    page: p,
    limit: l,
    total
  };
}

async function getQuestionById(id, user = null) {
  let q = await repo.one(
    'SELECT q.*, t.name AS topic_name FROM questions q LEFT JOIN topics t ON q.topic_id = t.id WHERE q.id = ?',
    [id]
  );
  let isDailyChallenge = false;

  if (!q) {
    // Check if this ID belongs to a Daily Challenge Problem
    const dc = await repo.one(
      'SELECT dc.*, t.name AS topic_name, p.name AS pattern_name FROM daily_challenge_problems dc LEFT JOIN topics t ON dc.topic_id = t.id LEFT JOIN patterns p ON dc.pattern_id = p.id WHERE dc.id = ? OR dc.slug = ?',
      [id, id]
    );
    if (!dc) return null;
    q = dc;
    isDailyChallenge = true;
  }

  const isAdmin = user?.role === 'admin' || user?.role === 'mentor';
  let testCaseSql = '';
  if (isDailyChallenge) {
    testCaseSql = isAdmin
      ? 'SELECT id, input, expected_output, is_hidden FROM daily_challenge_test_cases WHERE challenge_id = ? ORDER BY is_hidden ASC, created_at ASC'
      : 'SELECT id, input, expected_output, is_hidden FROM daily_challenge_test_cases WHERE challenge_id = ? AND is_hidden = FALSE ORDER BY created_at ASC';
  } else {
    testCaseSql = isAdmin
      ? 'SELECT id, input, expected_output, is_hidden FROM test_cases WHERE question_id = ? ORDER BY is_hidden ASC, created_at ASC'
      : 'SELECT id, input, expected_output, is_hidden FROM test_cases WHERE question_id = ? AND is_hidden = FALSE ORDER BY created_at ASC';
  }

  const testCases = await repo.many(testCaseSql, [q.id]);
  const formattedTestCases = testCases.map(tc => ({
    ...tc,
    is_hidden: Boolean(tc.is_hidden)
  }));

  const submission = user
    ? await repo.one('SELECT * FROM submissions WHERE question_id = ? AND user_id = ?', [q.id, user.id])
    : null;

  return {
    ...q,
    is_daily_challenge: isDailyChallenge,
    hints: parseHints(q.hints),
    is_active: Boolean(q.is_active),
    starter_code: q.starter_code ? safeParseJson(q.starter_code) : null,
    supported_languages: q.supported_languages ? safeParseJson(q.supported_languages) : ['javascript', 'python'],
    tags: q.tags ? safeParseJson(q.tags) : [],
    test_cases: formattedTestCases,
    submission_status: submission?.status || 'not_started'
  };
}

async function insertTestCases(questionId, testCases = [], currentRepo = repo) {
  for (const tc of testCases || []) {
    if (!tc) continue;
    const tcId = tc.id || uuidv4();
    const isHidden = Boolean(tc.is_hidden);
    await currentRepo.execute(
      'INSERT INTO test_cases (id, question_id, input, expected_output, is_hidden) VALUES (?, ?, ?, ?, ?)',
      [tcId, questionId, String(tc.input || ''), String(tc.expected_output || ''), isHidden]
    );
  }
}

async function createQuestion(input) {
  const {
    title, difficulty, topic_id, url, description, problem_statement,
    constraints, input_format, output_format, example_input, example_output,
    hints, tags, estimated_time, points, assigned_date, due_date, status,
    supported_languages, starter_code, test_cases = []
  } = input;

  await validateQuestionInput({ title, difficulty, topic_id });
  const duplicate = await repo.one(
    'SELECT id FROM questions WHERE LOWER(title) = LOWER(?) AND is_active = TRUE',
    [(title || '').trim()]
  );
  if (duplicate) {
    throw new AppError(`A question with title "${title}" already exists.`, 409, 'CONFLICT', 'title');
  }

  const id = input.id || uuidv4();
  const fallbackUrl = url?.trim() || `https://dsatracker.axly.in/questions/${id}`;

  await repo.transaction(async tx => {
    await tx.execute(`
      INSERT INTO questions (
        id, title, difficulty, topic_id, url, description, problem_statement,
        constraints, input_format, output_format, example_input, example_output,
        hints, tags, estimated_time, points, assigned_date, due_date, status,
        supported_languages, starter_code, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `, [
      id,
      (title || '').trim(),
      (difficulty || 'easy').toLowerCase(),
      topic_id || null,
      fallbackUrl,
      description || null,
      problem_statement || null,
      constraints || null,
      input_format || null,
      output_format || null,
      example_input || null,
      example_output || null,
      Array.isArray(hints) ? JSON.stringify(hints) : (hints || null),
      normalizeJsonArray(tags, '[]'),
      estimated_time || '30 mins',
      Number(points) || 20,
      assigned_date || null,
      due_date || null,
      status || 'published',
      normalizeJsonArray(supported_languages, ['javascript', 'python']),
      normalizeStarterCode(starter_code)
    ]);

    await insertTestCases(id, test_cases, tx);
  });

  return getQuestionById(id, { role: 'admin' });
}

async function updateQuestion(id, updates) {
  const existing = await getQuestionById(id, { role: 'admin' });
  if (!existing) throw new AppError('Question not found', 404, 'NOT_FOUND');

  if (updates.title && updates.title.trim().toLowerCase() !== existing.title.toLowerCase()) {
    const duplicate = await repo.one(
      'SELECT id FROM questions WHERE LOWER(title) = LOWER(?) AND id != ? AND is_active = TRUE',
      [updates.title.trim(), id]
    );
    if (duplicate) {
      throw new AppError(`A question with title "${updates.title}" already exists.`, 409, 'CONFLICT', 'title');
    }
  }

  if (updates.difficulty !== undefined || updates.topic_id !== undefined) {
    await validateQuestionInput({
      title: updates.title || existing.title,
      difficulty: updates.difficulty || existing.difficulty,
      topic_id: updates.topic_id !== undefined ? updates.topic_id : existing.topic_id
    });
  }

  const columnMap = {
    title: 'title', difficulty: 'difficulty', topic_id: 'topic_id', url: 'url', description: 'description',
    problem_statement: 'problem_statement', constraints: 'constraints', input_format: 'input_format', output_format: 'output_format',
    example_input: 'example_input', example_output: 'example_output', hints: 'hints', estimated_time: 'estimated_time',
    points: 'points', assigned_date: 'assigned_date', due_date: 'due_date', status: 'status', is_active: 'is_active'
  };

  const fields = [];
  const params = [];
  for (const [key, column] of Object.entries(columnMap)) {
    if (updates[key] !== undefined) {
      fields.push(`${column} = ?`);
      let val = updates[key];
      if (key === 'difficulty') val = String(val).toLowerCase();
      else if (key === 'is_active') val = Boolean(val);
      else if (key === 'hints' && Array.isArray(val)) val = JSON.stringify(val);
      params.push(val);
    }
  }

  if (updates.tags !== undefined) {
    fields.push('tags = ?');
    params.push(normalizeJsonArray(updates.tags, '[]'));
  }
  if (updates.supported_languages !== undefined) {
    fields.push('supported_languages = ?');
    params.push(normalizeJsonArray(updates.supported_languages, ['javascript', 'python']));
  }
  if (updates.starter_code !== undefined) {
    fields.push('starter_code = ?');
    params.push(normalizeStarterCode(updates.starter_code));
  }

  await repo.transaction(async tx => {
    if (fields.length) {
      await tx.execute(`UPDATE questions SET ${fields.join(', ')} WHERE id = ?`, [...params, id]);
    }
    if (Array.isArray(updates.test_cases)) {
      await tx.execute('DELETE FROM test_cases WHERE question_id = ?', [id]);
      await insertTestCases(id, updates.test_cases, tx);
    }
  });

  return getQuestionById(id, { role: 'admin' });
}

async function deleteQuestion(id) {
  const q = await repo.one('SELECT id, is_active FROM questions WHERE id = ?', [id]);
  if (!q) throw new AppError('Question not found', 404, 'NOT_FOUND');

  const today = new Date().toISOString().split('T')[0];
  const daily = await repo.one('SELECT id FROM daily_questions WHERE question_id = ? AND date = ?', [id, today]);
  if (daily) {
    throw new AppError('Cannot delete the current daily question — change it first', 409, 'CONFLICT');
  }

  await repo.execute("UPDATE questions SET is_active = FALSE, status = 'archived' WHERE id = ?", [id]);
  return { message: 'Question successfully deactivated (soft-deleted)', id, is_active: false };
}

async function listTopics() {
  return repo.many('SELECT id, name FROM topics ORDER BY name ASC');
}

module.exports = {
  listQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  listTopics,
  validateQuestionInput
};
