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

function generateSlug(title) {
  return String(title || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || `dc-${Date.now()}`;
}

async function listDailyChallenges({ status, difficulty, topic_id, search, page = 1, limit = 50 }) {
  const conditions = [];
  const params = [];

  if (status) {
    conditions.push('LOWER(dc.status) = ?');
    params.push(status.toLowerCase());
  }
  if (difficulty) {
    conditions.push('LOWER(dc.difficulty) = ?');
    params.push(difficulty.toLowerCase());
  }
  if (topic_id) {
    conditions.push('dc.topic_id = ?');
    params.push(topic_id);
  }
  if (search && search.trim()) {
    conditions.push('(LOWER(dc.title) LIKE ? OR LOWER(COALESCE(dc.description, \'\')) LIKE ?)');
    params.push(`%${search.trim().toLowerCase()}%`, `%${search.trim().toLowerCase()}%`);
  }

  const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const countRow = await repo.one(`SELECT COUNT(*) AS total FROM daily_challenge_problems dc ${whereSql}`, params);
  const total = Number(countRow?.total || 0);

  const p = Math.max(1, Number(page) || 1);
  const l = Math.max(1, Number(limit) || 50);
  const offset = (p - 1) * l;

  const rows = await repo.many(`
    SELECT 
      dc.id, dc.title, dc.slug, dc.difficulty, dc.topic_id, dc.pattern_id,
      dc.secondary_topics, dc.prerequisites, dc.estimated_time, dc.points,
      dc.description, dc.problem_statement, dc.constraints, dc.input_format,
      dc.output_format, dc.example_input, dc.example_output, dc.hints, dc.tags,
      dc.solution_approach, dc.starter_code, dc.supported_languages, dc.status,
      dc.scheduled_date, dc.is_active, dc.created_by, dc.created_at, dc.updated_at,
      t.name AS topic_name,
      p.name AS pattern_name,
      (SELECT COUNT(*) FROM daily_challenge_test_cases tc WHERE tc.challenge_id = dc.id) AS total_test_cases_count,
      (SELECT dq.date FROM daily_questions dq WHERE dq.challenge_id = dc.id OR dq.question_id = dc.id LIMIT 1) AS active_daily_date
    FROM daily_challenge_problems dc
    LEFT JOIN topics t ON dc.topic_id = t.id
    LEFT JOIN patterns p ON dc.pattern_id = p.id
    ${whereSql}
    ORDER BY dc.created_at DESC
    LIMIT ? OFFSET ?
  `, [...params, l, offset]);

  // Aggregate stats across all daily challenges
  const allStatusCounts = await repo.many(`
    SELECT status, COUNT(*) AS count
    FROM daily_challenge_problems
    GROUP BY status
  `);

  const stats = {
    total: 0,
    draft: 0,
    published: 0,
    scheduled: 0,
    active: 0,
    archived: 0
  };

  allStatusCounts.forEach(r => {
    const s = String(r.status || '').toLowerCase();
    const c = Number(r.count || 0);
    stats.total += c;
    if (stats[s] !== undefined) {
      stats[s] = c;
    }
  });

  const formattedRows = rows.map(r => ({
    ...r,
    hints: parseHints(r.hints),
    tags: safeParseJson(r.tags, []),
    secondary_topics: safeParseJson(r.secondary_topics, []),
    prerequisites: safeParseJson(r.prerequisites, []),
    supported_languages: safeParseJson(r.supported_languages, ['javascript', 'python']),
    scheduled_date: r.scheduled_date || r.active_daily_date || null
  }));

  return {
    data: formattedRows,
    total,
    page: p,
    limit: l,
    stats
  };
}

async function getDailyChallengeById(id, includeHiddenTestCases = false) {
  const row = await repo.one(`
    SELECT 
      dc.*,
      t.name AS topic_name,
      p.name AS pattern_name,
      (SELECT dq.date FROM daily_questions dq WHERE dq.challenge_id = dc.id OR dq.question_id = dc.id LIMIT 1) AS active_daily_date
    FROM daily_challenge_problems dc
    LEFT JOIN topics t ON dc.topic_id = t.id
    LEFT JOIN patterns p ON dc.pattern_id = p.id
    WHERE dc.id = ? OR dc.slug = ?
  `, [id, id]);

  if (!row) throw new AppError('Daily Challenge problem not found', 404, 'NOT_FOUND');

  const testCasesQuery = includeHiddenTestCases
    ? 'SELECT id, input, expected_output, is_hidden FROM daily_challenge_test_cases WHERE challenge_id = ? ORDER BY is_hidden ASC, created_at ASC'
    : 'SELECT id, input, expected_output, is_hidden FROM daily_challenge_test_cases WHERE challenge_id = ? AND (is_hidden = 0 OR is_hidden = FALSE) ORDER BY created_at ASC';

  const testCases = await repo.many(testCasesQuery, [row.id]);

  return {
    ...row,
    hints: parseHints(row.hints),
    tags: safeParseJson(row.tags, []),
    secondary_topics: safeParseJson(row.secondary_topics, []),
    prerequisites: safeParseJson(row.prerequisites, []),
    supported_languages: safeParseJson(row.supported_languages, ['javascript', 'python']),
    scheduled_date: row.scheduled_date || row.active_daily_date || null,
    test_cases: testCases.map(tc => ({
      id: tc.id,
      input: tc.input,
      expected_output: tc.expected_output,
      is_hidden: Boolean(tc.is_hidden)
    }))
  };
}

async function createDailyChallenge(data, admin_id) {
  const {
    title,
    slug,
    difficulty,
    topic_id,
    pattern_id,
    secondary_topics,
    prerequisites,
    estimated_time = 30,
    points = 100,
    description,
    problem_statement,
    constraints,
    input_format,
    output_format,
    example_input,
    example_output,
    hints,
    tags,
    solution_approach,
    starter_code,
    supported_languages,
    status = 'draft',
    scheduled_date = null,
    test_cases = []
  } = data;

  if (!title || !title.trim()) throw new AppError('Title is required', 400, 'VALIDATION_ERROR', 'title');
  if (!['easy', 'medium', 'hard'].includes(String(difficulty || '').toLowerCase())) {
    throw new AppError('Difficulty must be easy, medium, or hard', 400, 'VALIDATION_ERROR', 'difficulty');
  }

  const id = `dc-${uuidv4().slice(0, 8)}`;
  const finalSlug = slug ? generateSlug(slug) : generateSlug(title);

  await repo.transaction(async tx => {
    await tx.execute(`
      INSERT INTO daily_challenge_problems (
        id, title, slug, difficulty, topic_id, pattern_id,
        secondary_topics, prerequisites, estimated_time, points,
        description, problem_statement, constraints, input_format,
        output_format, example_input, example_output, hints, tags,
        solution_approach, starter_code, supported_languages, status,
        scheduled_date, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [
      id,
      title.trim(),
      finalSlug,
      difficulty.toLowerCase(),
      topic_id || null,
      pattern_id || null,
      normalizeJsonArray(secondary_topics, '[]'),
      normalizeJsonArray(prerequisites, '[]'),
      Number(estimated_time) || 30,
      Number(points) || 100,
      description || title,
      problem_statement || null,
      constraints || null,
      input_format || null,
      output_format || null,
      example_input || null,
      example_output || null,
      normalizeJsonArray(hints, '[]'),
      normalizeJsonArray(tags, '[]'),
      solution_approach || null,
      typeof starter_code === 'object' ? JSON.stringify(starter_code) : (starter_code || null),
      normalizeJsonArray(supported_languages, '["javascript", "python"]'),
      status,
      scheduled_date || null,
      admin_id || null
    ]);

    if (Array.isArray(test_cases) && test_cases.length > 0) {
      for (const tc of test_cases) {
        if (tc && tc.input !== undefined && tc.expected_output !== undefined) {
          await tx.execute(`
            INSERT INTO daily_challenge_test_cases (id, challenge_id, input, expected_output, is_hidden)
            VALUES (?, ?, ?, ?, ?)
          `, [
            tc.id || `dc-tc-${uuidv4().slice(0, 8)}`,
            id,
            String(tc.input),
            String(tc.expected_output),
            tc.is_hidden ? 1 : 0
          ]);
        }
      }
    }

    if (scheduled_date && (status === 'scheduled' || status === 'published')) {
      await tx.execute(`
        INSERT INTO daily_questions (id, question_id, challenge_id, date, created_by)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(date) DO UPDATE SET
          question_id = excluded.question_id,
          challenge_id = excluded.challenge_id,
          created_by = excluded.created_by
      `, [uuidv4(), id, id, scheduled_date, admin_id || 'usr-admin-01']);
    }
  });

  return getDailyChallengeById(id, true);
}

async function updateDailyChallenge(id, data, admin_id) {
  const current = await repo.one('SELECT id FROM daily_challenge_problems WHERE id = ?', [id]);
  if (!current) throw new AppError('Daily Challenge problem not found', 404, 'NOT_FOUND');

  const fields = [];
  const params = [];

  const stringFields = ['title', 'difficulty', 'topic_id', 'pattern_id', 'description', 'problem_statement', 'constraints', 'input_format', 'output_format', 'example_input', 'example_output', 'solution_approach', 'status', 'scheduled_date'];
  for (const f of stringFields) {
    if (data[f] !== undefined) {
      fields.push(`${f} = ?`);
      params.push(data[f]);
    }
  }

  if (data.slug !== undefined) {
    fields.push('slug = ?');
    params.push(generateSlug(data.slug));
  }
  if (data.points !== undefined) {
    fields.push('points = ?');
    params.push(Number(data.points) || 100);
  }
  if (data.estimated_time !== undefined) {
    fields.push('estimated_time = ?');
    params.push(Number(data.estimated_time) || 30);
  }
  if (data.hints !== undefined) {
    fields.push('hints = ?');
    params.push(normalizeJsonArray(data.hints, '[]'));
  }
  if (data.tags !== undefined) {
    fields.push('tags = ?');
    params.push(normalizeJsonArray(data.tags, '[]'));
  }
  if (data.secondary_topics !== undefined) {
    fields.push('secondary_topics = ?');
    params.push(normalizeJsonArray(data.secondary_topics, '[]'));
  }
  if (data.prerequisites !== undefined) {
    fields.push('prerequisites = ?');
    params.push(normalizeJsonArray(data.prerequisites, '[]'));
  }
  if (data.starter_code !== undefined) {
    fields.push('starter_code = ?');
    params.push(typeof data.starter_code === 'object' ? JSON.stringify(data.starter_code) : (data.starter_code || null));
  }

  fields.push('updated_at = CURRENT_TIMESTAMP');

  await repo.transaction(async tx => {
    if (fields.length > 1) {
      await tx.execute(`UPDATE daily_challenge_problems SET ${fields.join(', ')} WHERE id = ?`, [...params, id]);
    }

    if (Array.isArray(data.test_cases)) {
      await tx.execute('DELETE FROM daily_challenge_test_cases WHERE challenge_id = ?', [id]);
      for (const tc of data.test_cases) {
        if (tc && tc.input !== undefined && tc.expected_output !== undefined) {
          await tx.execute(`
            INSERT INTO daily_challenge_test_cases (id, challenge_id, input, expected_output, is_hidden)
            VALUES (?, ?, ?, ?, ?)
          `, [
            tc.id || `dc-tc-${uuidv4().slice(0, 8)}`,
            id,
            String(tc.input),
            String(tc.expected_output),
            tc.is_hidden ? 1 : 0
          ]);
        }
      }
    }

    if (data.scheduled_date && (data.status === 'scheduled' || data.status === 'published')) {
      await tx.execute(`
        INSERT INTO daily_questions (id, question_id, challenge_id, date, created_by)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(date) DO UPDATE SET
          question_id = excluded.question_id,
          challenge_id = excluded.challenge_id,
          created_by = excluded.created_by
      `, [uuidv4(), id, id, data.scheduled_date, admin_id || 'usr-admin-01']);
    }
  });

  return getDailyChallengeById(id, true);
}

async function scheduleDailyChallenge(id, date, admin_id) {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new AppError('Valid date in YYYY-MM-DD format is required', 400, 'VALIDATION_ERROR', 'date');
  }

  const challenge = await repo.one('SELECT id, status, is_active FROM daily_challenge_problems WHERE id = ?', [id]);
  if (!challenge) throw new AppError('Daily Challenge problem not found', 404, 'NOT_FOUND');

  await repo.transaction(async tx => {
    await tx.execute(`
      UPDATE daily_challenge_problems 
      SET scheduled_date = ?, status = 'scheduled', updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, [date, id]);

    await tx.execute(`
      INSERT INTO daily_questions (id, question_id, challenge_id, date, created_by)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(date) DO UPDATE SET
        question_id = excluded.question_id,
        challenge_id = excluded.challenge_id,
        created_by = excluded.created_by
    `, [uuidv4(), id, id, date, admin_id || 'usr-admin-01']);
  });

  return getDailyChallengeById(id, true);
}

async function archiveDailyChallenge(id) {
  const challenge = await repo.one('SELECT id FROM daily_challenge_problems WHERE id = ?', [id]);
  if (!challenge) throw new AppError('Daily Challenge problem not found', 404, 'NOT_FOUND');

  await repo.execute(`
    UPDATE daily_challenge_problems 
    SET status = 'archived', is_active = 0, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `, [id]);

  return { success: true, message: 'Daily challenge archived' };
}

module.exports = {
  listDailyChallenges,
  getDailyChallengeById,
  createDailyChallenge,
  updateDailyChallenge,
  scheduleDailyChallenge,
  archiveDailyChallenge
};
