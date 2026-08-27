const { db } = require('../db/db');
const { v4: uuidv4 } = require('uuid');
const { AppError } = require('../middleware/errorHandler');

function safeParseJson(value) {
  try { return typeof value === 'string' ? JSON.parse(value) : value; }
  catch { return value; }
}

function listQuestions({ user, difficulty, topic_id, assigned, page = 1, limit = 20, search }) {
  const offset = (page - 1) * limit;
  const where = ['q.is_active = 1'];
  const params = [];

  if (difficulty) { where.push('q.difficulty = ?'); params.push(difficulty.toLowerCase()); }
  if (topic_id) { where.push('q.topic_id = ?'); params.push(topic_id); }
  if (search) { where.push('LOWER(q.title) LIKE ?'); params.push(`%${search.toLowerCase()}%`); }

  if (assigned !== undefined && assigned !== null && assigned !== '') {
    const isAssigned = String(assigned) === 'true';
    const existsSql = user.role === 'admin'
      ? `EXISTS (SELECT 1 FROM assignments a WHERE a.question_id = q.id AND a.status IN ('assigned','ongoing','submitted','under_review','completed'))`
      : `EXISTS (SELECT 1 FROM assignments a WHERE a.question_id = q.id AND a.user_id = ? AND a.status != 'unassigned')`;
    const notExistsSql = user.role === 'admin'
      ? `NOT EXISTS (SELECT 1 FROM assignments a WHERE a.question_id = q.id AND a.status != 'unassigned')`
      : `NOT EXISTS (SELECT 1 FROM assignments a WHERE a.question_id = q.id AND a.user_id = ? AND a.status != 'unassigned')`;
    where.push(isAssigned ? existsSql : notExistsSql);
    if (user.role !== 'admin') params.push(user.id);
  }

  const whereSql = `WHERE ${where.join(' AND ')}`;
  const total = db.prepare(`SELECT COUNT(*) AS total FROM questions q ${whereSql}`).get(...params).total || 0;

  const rows = db.prepare(`
    SELECT q.id, q.title, q.difficulty, q.topic_id, t.name AS topic_name, q.url,
      q.description, q.constraints, q.input_format, q.output_format,
      q.example_input, q.example_output, q.hints, q.tags, q.estimated_time,
      q.points, q.assigned_date, q.due_date, q.status, q.supported_languages,
      q.starter_code, q.is_active, q.created_at,
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
  `).all(user.id, user.id, ...params, Number(limit), offset);

  return {
    data: rows.map(item => ({
      ...item,
      starter_code: item.starter_code ? safeParseJson(item.starter_code) : null,
      supported_languages: item.supported_languages ? safeParseJson(item.supported_languages) : ['javascript','python'],
      tags: item.tags ? safeParseJson(item.tags) : [],
      is_active: Boolean(item.is_active),
      is_assigned_to_me: Boolean(item.assignment_id),
      submission_status: item.submission_status || 'not_started',
      active_assignees_count: item.active_assignees_count || 0,
      total_test_cases_count: item.total_test_cases_count || 0
    })),
    page: Number(page), limit: Number(limit), total
  };
}

function getQuestionById(id, user = null) {
  const q = db.prepare(`SELECT q.*, t.name AS topic_name FROM questions q LEFT JOIN topics t ON q.topic_id = t.id WHERE q.id = ?`).get(id);
  if (!q) return null;

  const isAdmin = user?.role === 'admin' || user?.role === 'mentor';
  const testCases = db.prepare(isAdmin
    ? 'SELECT id,input,expected_output,is_hidden FROM test_cases WHERE question_id=? ORDER BY is_hidden ASC,created_at ASC'
    : 'SELECT id,input,expected_output,is_hidden FROM test_cases WHERE question_id=? AND is_hidden=0 ORDER BY created_at ASC'
  ).all(id).map(tc => ({ ...tc, is_hidden: Boolean(tc.is_hidden) }));

  const submission = user
    ? db.prepare('SELECT * FROM submissions WHERE question_id=? AND user_id=?').get(id, user.id)
    : null;

  return {
    ...q,
    is_active: Boolean(q.is_active),
    starter_code: q.starter_code ? safeParseJson(q.starter_code) : null,
    supported_languages: q.supported_languages ? safeParseJson(q.supported_languages) : ['javascript','python'],
    tags: q.tags ? safeParseJson(q.tags) : [],
    test_cases: testCases,
    submission_status: submission?.status || 'not_started',
    submission: submission || null
  };
}

function validateQuestionInput({ title, difficulty, topic_id }) {
  if (!title || !title.trim()) throw new AppError('Title is required', 400, 'VALIDATION_ERROR', 'title');
  if (!['easy','medium','hard'].includes(String(difficulty || '').toLowerCase())) {
    throw new AppError('Difficulty must be easy, medium, or hard', 400, 'VALIDATION_ERROR', 'difficulty');
  }
  if (topic_id && !db.prepare('SELECT id FROM topics WHERE id=?').get(topic_id)) {
    throw new AppError('Specified topic does not exist', 400, 'VALIDATION_ERROR', 'topic_id');
  }
}

function normalizeStarterCode(starter_code) {
  return typeof starter_code === 'object' ? JSON.stringify(starter_code) : (starter_code || null);
}

function normalizeJsonArray(value, fallback) {
  if (value === undefined || value === null) return fallback;
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function insertTestCases(questionId, test_cases = []) {
  const insert = db.prepare('INSERT INTO test_cases (id,question_id,input,expected_output,is_hidden) VALUES (?,?,?,?,?)');
  for (const tc of test_cases) {
    if (!tc) continue;
    insert.run(tc.id || uuidv4(), questionId, String(tc.input || ''), String(tc.expected_output || ''), tc.is_hidden ? 1 : 0);
  }
}

function createQuestion(input) {
  const {
    title, difficulty, topic_id, url, description, problem_statement,
    constraints, input_format, output_format, example_input, example_output,
    hints, tags, estimated_time, points, assigned_date, due_date, status,
    supported_languages, starter_code, test_cases = []
  } = input;

  validateQuestionInput({ title, difficulty, topic_id });
  if (db.prepare('SELECT id FROM questions WHERE LOWER(title)=LOWER(?) AND is_active=1').get(title.trim())) {
    throw new AppError(`A question with title "${title}" already exists.`, 409, 'CONFLICT', 'title');
  }

  const id = uuidv4();
  const fallbackUrl = url?.trim() || `https://dsatracker.axly.in/questions/${id}`;
  db.prepare(`INSERT INTO questions (
    id,title,difficulty,topic_id,url,description,problem_statement,constraints,input_format,output_format,
    example_input,example_output,hints,tags,estimated_time,points,assigned_date,due_date,status,
    supported_languages,starter_code,is_active
  ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`).run(
    id, title.trim(), difficulty.toLowerCase(), topic_id || null, fallbackUrl,
    description || null, problem_statement || null, constraints || null, input_format || null, output_format || null,
    example_input || null, example_output || null, hints || null,
    normalizeJsonArray(tags, '[]'), estimated_time || '30 mins', Number(points) || 20,
    assigned_date || null, due_date || null, status || 'published',
    normalizeJsonArray(supported_languages, ['javascript','python']), normalizeStarterCode(starter_code)
  );
  insertTestCases(id, test_cases);
  return getQuestionById(id, { role: 'admin' });
}

function updateQuestion(id, updates) {
  const existing = getQuestionById(id, { role: 'admin' });
  if (!existing) throw new AppError('Question not found', 404, 'NOT_FOUND');

  if (updates.title && updates.title.trim().toLowerCase() !== existing.title.toLowerCase()) {
    if (db.prepare('SELECT id FROM questions WHERE LOWER(title)=LOWER(?) AND id!=? AND is_active=1').get(updates.title.trim(), id)) {
      throw new AppError(`A question with title "${updates.title}" already exists.`, 409, 'CONFLICT', 'title');
    }
  }
  if (updates.difficulty !== undefined || updates.topic_id !== undefined) {
    validateQuestionInput({ title: updates.title || existing.title, difficulty: updates.difficulty || existing.difficulty, topic_id: updates.topic_id !== undefined ? updates.topic_id : existing.topic_id });
  }

  const columnMap = {
    title:'title', difficulty:'difficulty', topic_id:'topic_id', url:'url', description:'description',
    problem_statement:'problem_statement', constraints:'constraints', input_format:'input_format', output_format:'output_format',
    example_input:'example_input', example_output:'example_output', hints:'hints', estimated_time:'estimated_time',
    points:'points', assigned_date:'assigned_date', due_date:'due_date', status:'status', is_active:'is_active'
  };
  const fields = [];
  const params = [];
  for (const [key, column] of Object.entries(columnMap)) {
    if (updates[key] !== undefined) {
      fields.push(`${column}=?`);
      params.push(key === 'difficulty' ? String(updates[key]).toLowerCase() : key === 'is_active' ? (updates[key] ? 1 : 0) : updates[key]);
    }
  }
  if (updates.tags !== undefined) { fields.push('tags=?'); params.push(normalizeJsonArray(updates.tags, '[]')); }
  if (updates.supported_languages !== undefined) { fields.push('supported_languages=?'); params.push(normalizeJsonArray(updates.supported_languages, ['javascript','python'])); }
  if (updates.starter_code !== undefined) { fields.push('starter_code=?'); params.push(normalizeStarterCode(updates.starter_code)); }

  if (fields.length) {
    db.prepare(`UPDATE questions SET ${fields.join(',')} WHERE id=?`).run(...params, id);
  }

  if (Array.isArray(updates.test_cases)) {
    db.prepare('DELETE FROM test_cases WHERE question_id=?').run(id);
    insertTestCases(id, updates.test_cases);
  }
  return getQuestionById(id, { role: 'admin' });
}

function deleteQuestion(id) {
  if (!getQuestionById(id)) throw new AppError('Question not found', 404, 'NOT_FOUND');
  const today = new Date().toISOString().split('T')[0];
  if (db.prepare('SELECT id FROM daily_questions WHERE question_id=? AND date=?').get(id, today)) {
    throw new AppError('Cannot delete the current daily question — change it first', 409, 'CONFLICT');
  }
  db.prepare('UPDATE questions SET is_active=0,status=\'archived\' WHERE id=?').run(id);
  return { message: 'Question successfully deactivated (soft-deleted)', id };
}

function listTopics() { return db.prepare('SELECT id,name FROM topics ORDER BY name ASC').all(); }

module.exports = { listQuestions, getQuestionById, createQuestion, updateQuestion, deleteQuestion, listTopics };
