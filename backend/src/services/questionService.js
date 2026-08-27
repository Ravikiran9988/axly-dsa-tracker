const { db } = require('../db/db');
const { v4: uuidv4 } = require('uuid');
const { AppError } = require('../middleware/errorHandler');

function listQuestions({ user, difficulty, topic_id, assigned, page = 1, limit = 20, search }) {
  const offset = (page - 1) * limit;
  let whereClauses = ['q.is_active = 1'];
  const params = [];

  if (difficulty) {
    whereClauses.push('q.difficulty = ?');
    params.push(difficulty.toLowerCase());
  }

  if (topic_id) {
    whereClauses.push('q.topic_id = ?');
    params.push(topic_id);
  }

  if (search) {
    whereClauses.push('LOWER(q.title) LIKE ?');
    params.push(`%${search.toLowerCase()}%`);
  }

  // Assigned / Unassigned filter per PRD Section 9.1
  if (assigned !== undefined && assigned !== null && assigned !== '') {
    const isAssigned = String(assigned) === 'true';
    if (user.role === 'admin') {
      if (isAssigned) {
        whereClauses.push(`EXISTS (
          SELECT 1 FROM assignments a 
          WHERE a.question_id = q.id AND a.status = 'assigned'
        )`);
      } else {
        whereClauses.push(`NOT EXISTS (
          SELECT 1 FROM assignments a 
          WHERE a.question_id = q.id AND a.status = 'assigned'
        )`);
      }
    } else {
      // User perspective: assigned to self
      if (isAssigned) {
        whereClauses.push(`EXISTS (
          SELECT 1 FROM assignments a 
          WHERE a.question_id = q.id AND a.user_id = ? AND a.status = 'assigned'
        )`);
        params.push(user.id);
      } else {
        whereClauses.push(`NOT EXISTS (
          SELECT 1 FROM assignments a 
          WHERE a.question_id = q.id AND a.user_id = ? AND a.status = 'assigned'
        )`);
        params.push(user.id);
      }
    }
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // Count total matching
  const countQuery = `SELECT COUNT(*) as total FROM questions q ${whereSql}`;
  const total = db.prepare(countQuery).get(...params).total;

  // Query paginated questions
  const selectQuery = `
    SELECT 
      q.id,
      q.title,
      q.difficulty,
      q.topic_id,
      t.name as topic_name,
      q.url,
      q.description,
      q.constraints,
      q.input_format,
      q.output_format,
      q.example_input,
      q.example_output,
      q.starter_code,
      q.is_active,
      q.created_at,
      a.id as assignment_id,
      a.status as assignment_status,
      s.id as submission_id,
      s.status as submission_status,
      s.attempted_at,
      s.solved_at,
      (SELECT COUNT(*) FROM assignments sub_a WHERE sub_a.question_id = q.id AND sub_a.status = 'assigned') as active_assignees_count,
      (SELECT COUNT(*) FROM test_cases tc WHERE tc.question_id = q.id) as total_test_cases_count
    FROM questions q
    LEFT JOIN topics t ON q.topic_id = t.id
    LEFT JOIN assignments a ON a.question_id = q.id AND a.user_id = ? AND a.status = 'assigned'
    LEFT JOIN submissions s ON s.question_id = q.id AND s.user_id = ?
    ${whereSql}
    ORDER BY q.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const data = db.prepare(selectQuery).all(user.id, user.id, ...params, limit, offset);

  // Normalize booleans / statuses
  const normalizedData = data.map(item => ({
    id: item.id,
    title: item.title,
    difficulty: item.difficulty,
    topic_id: item.topic_id,
    topic_name: item.topic_name || null,
    url: item.url,
    description: item.description || null,
    constraints: item.constraints || null,
    input_format: item.input_format || null,
    output_format: item.output_format || null,
    example_input: item.example_input || null,
    example_output: item.example_output || null,
    starter_code: item.starter_code ? safeParseJson(item.starter_code) : null,
    is_active: Boolean(item.is_active),
    created_at: item.created_at,
    assignment_id: item.assignment_id || null,
    is_assigned_to_me: item.assignment_status === 'assigned',
    submission_id: item.submission_id || null,
    submission_status: item.submission_status || 'not_started',
    attempted_at: item.attempted_at || null,
    solved_at: item.solved_at || null,
    active_assignees_count: item.active_assignees_count || 0,
    total_test_cases_count: item.total_test_cases_count || 0
  }));

  return {
    data: normalizedData,
    page: Number(page),
    limit: Number(limit),
    total
  };
}

function safeParseJson(str) {
  try {
    return typeof str === 'string' ? JSON.parse(str) : str;
  } catch (e) {
    return str;
  }
}

function getQuestionById(id, user = null) {
  const stmt = db.prepare(`
    SELECT q.*, t.name as topic_name 
    FROM questions q 
    LEFT JOIN topics t ON q.topic_id = t.id 
    WHERE q.id = ?
  `);
  const q = stmt.get(id);
  if (!q) return null;

  // Fetch test cases (filter hidden if not admin)
  const isAdmin = user?.role === 'admin';
  const testCasesQuery = isAdmin
    ? 'SELECT id, input, expected_output, is_hidden FROM test_cases WHERE question_id = ? ORDER BY is_hidden ASC, created_at ASC'
    : 'SELECT id, input, expected_output, is_hidden FROM test_cases WHERE question_id = ? AND is_hidden = 0 ORDER BY created_at ASC';

  const testCases = db.prepare(testCasesQuery).all(id).map(tc => ({
    id: tc.id,
    input: tc.input,
    expected_output: tc.expected_output,
    is_hidden: Boolean(tc.is_hidden)
  }));

  // Fetch user submission status if user is passed
  let submission = null;
  if (user) {
    submission = db.prepare('SELECT * FROM submissions WHERE question_id = ? AND user_id = ?').get(id, user.id);
  }

  return {
    ...q,
    is_active: Boolean(q.is_active),
    starter_code: q.starter_code ? safeParseJson(q.starter_code) : null,
    test_cases: testCases,
    submission_status: submission?.status || 'not_started',
    submission: submission || null
  };
}

function createQuestion({ 
  title, 
  difficulty, 
  topic_id, 
  url, 
  description, 
  constraints, 
  input_format, 
  output_format, 
  example_input, 
  example_output, 
  starter_code, 
  test_cases = [] 
}) {
  // Check duplicate title
  const existing = db.prepare('SELECT id FROM questions WHERE LOWER(title) = LOWER(?) AND is_active = 1').get(title);
  if (existing) {
    throw new AppError(`A question with title "${title}" already exists.`, 409, 'CONFLICT', 'title');
  }

  // Verify topic if provided
  if (topic_id) {
    const topic = db.prepare('SELECT id FROM topics WHERE id = ?').get(topic_id);
    if (!topic) {
      throw new AppError('Specified topic does not exist', 400, 'VALIDATION_ERROR', 'topic_id');
    }
  }

  const id = uuidv4();
  const fallbackUrl = url && url.trim() ? url.trim() : `https://dsatracker.axly.in/questions/${id}`;
  const starterCodeStr = typeof starter_code === 'object' ? JSON.stringify(starter_code) : starter_code || null;

  const insert = db.prepare(`
    INSERT INTO questions (
      id, title, difficulty, topic_id, url, 
      description, constraints, input_format, output_format, 
      example_input, example_output, starter_code, is_active
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  insert.run(
    id,
    title,
    difficulty.toLowerCase(),
    topic_id || null,
    fallbackUrl,
    description || null,
    constraints || null,
    input_format || null,
    output_format || null,
    example_input || null,
    example_output || null,
    starterCodeStr
  );

  // Insert test cases
  if (Array.isArray(test_cases) && test_cases.length > 0) {
    const insertTc = db.prepare(`
      INSERT INTO test_cases (id, question_id, input, expected_output, is_hidden)
      VALUES (?, ?, ?, ?, ?)
    `);
    test_cases.forEach((tc) => {
      insertTc.run(
        tc.id || uuidv4(),
        id,
        tc.input || '',
        tc.expected_output || '',
        tc.is_hidden ? 1 : 0
      );
    });
  }

  return getQuestionById(id, { role: 'admin' });
}

function updateQuestion(id, updates) {
  const existing = getQuestionById(id, { role: 'admin' });
  if (!existing) {
    throw new AppError('Question not found', 404, 'NOT_FOUND');
  }

  if (updates.title && updates.title.toLowerCase() !== existing.title.toLowerCase()) {
    const duplicate = db.prepare('SELECT id FROM questions WHERE LOWER(title) = LOWER(?) AND id != ? AND is_active = 1').get(updates.title, id);
    if (duplicate) {
      throw new AppError(`A question with title "${updates.title}" already exists.`, 409, 'CONFLICT', 'title');
    }
  }

  if (updates.topic_id) {
    const topic = db.prepare('SELECT id FROM topics WHERE id = ?').get(updates.topic_id);
    if (!topic) {
      throw new AppError('Specified topic does not exist', 400, 'VALIDATION_ERROR', 'topic_id');
    }
  }

  const fields = [];
  const params = [];

  if (updates.title !== undefined) {
    fields.push('title = ?');
    params.push(updates.title);
  }
  if (updates.difficulty !== undefined) {
    fields.push('difficulty = ?');
    params.push(updates.difficulty.toLowerCase());
  }
  if (updates.topic_id !== undefined) {
    fields.push('topic_id = ?');
    params.push(updates.topic_id);
  }
  if (updates.url !== undefined) {
    fields.push('url = ?');
    params.push(updates.url);
  }
  if (updates.description !== undefined) {
    fields.push('description = ?');
    params.push(updates.description);
  }
  if (updates.constraints !== undefined) {
    fields.push('constraints = ?');
    params.push(updates.constraints);
  }
  if (updates.input_format !== undefined) {
    fields.push('input_format = ?');
    params.push(updates.input_format);
  }
  if (updates.output_format !== undefined) {
    fields.push('output_format = ?');
    params.push(updates.output_format);
  }
  if (updates.example_input !== undefined) {
    fields.push('example_input = ?');
    params.push(updates.example_input);
  }
  if (updates.example_output !== undefined) {
    fields.push('example_output = ?');
    params.push(updates.example_output);
  }
  if (updates.starter_code !== undefined) {
    fields.push('starter_code = ?');
    params.push(typeof updates.starter_code === 'object' ? JSON.stringify(updates.starter_code) : updates.starter_code);
  }
  if (updates.is_active !== undefined) {
    fields.push('is_active = ?');
    params.push(updates.is_active ? 1 : 0);
  }

  if (fields.length > 0) {
    params.push(id);
    db.prepare(`UPDATE questions SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  }

  // Update test cases if passed
  if (Array.isArray(updates.test_cases)) {
    db.prepare('DELETE FROM test_cases WHERE question_id = ?').run(id);
    const insertTc = db.prepare(`
      INSERT INTO test_cases (id, question_id, input, expected_output, is_hidden)
      VALUES (?, ?, ?, ?, ?)
    `);
    updates.test_cases.forEach((tc) => {
      insertTc.run(
        tc.id || uuidv4(),
        id,
        tc.input || '',
        tc.expected_output || '',
        tc.is_hidden ? 1 : 0
      );
    });
  }

  return getQuestionById(id, { role: 'admin' });
}

function deleteQuestion(id) {
  const existing = getQuestionById(id);
  if (!existing) {
    throw new AppError('Question not found', 404, 'NOT_FOUND');
  }

  const todayUtc = new Date().toISOString().split('T')[0];
  const isDailyToday = db.prepare(`
    SELECT id FROM daily_questions 
    WHERE question_id = ? AND date = ?
  `).get(id, todayUtc);

  if (isDailyToday) {
    throw new AppError('Cannot delete the current daily question — change it first', 409, 'CONFLICT');
  }

  db.prepare('UPDATE questions SET is_active = 0 WHERE id = ?').run(id);

  return { message: 'Question successfully deactivated (soft-deleted)', id };
}

function listTopics() {
  return db.prepare('SELECT id, name FROM topics ORDER BY name ASC').all();
}

module.exports = {
  listQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  listTopics
};
