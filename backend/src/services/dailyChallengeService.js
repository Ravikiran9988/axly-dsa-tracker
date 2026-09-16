const { getRepository } = require('../db/repositoryFactory');
const { v4: uuidv4 } = require('uuid');
const { AppError } = require('../middleware/errorHandler');
const { checkDuplicateChallenge } = require('./aiDailyChallengeService');
const { indexAcceptedQuestion } = require('./questionNoveltyService');
const {
  getCanonicalUtcDate,
  getNextCanonicalUtcDate,
  isValidDateString,
  isFutureUtcDate
} = require('../utils/dateUtils');

function getRepo() {
  return getRepository();
}

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

function getTodayDateString() {
  return getCanonicalUtcDate();
}

async function assertDateAvailable(date, excludeQuestionId = null) {
  if (!date) return;
  if (!isValidDateString(date)) {
    throw new AppError('Invalid date format (expected YYYY-MM-DD)', 400, 'VALIDATION_ERROR', 'date');
  }

  const existing = await getRepo().one(
    `SELECT q.title, dcm.scheduled_date 
     FROM daily_challenge_metadata dcm 
     JOIN questions q ON dcm.question_id = q.id 
     WHERE dcm.scheduled_date = ? AND dcm.status != 'archived' ${excludeQuestionId ? 'AND dcm.question_id != ?' : ''}`,
    excludeQuestionId ? [date, excludeQuestionId] : [date]
  );

  if (existing) {
    throw new AppError(
      `Another Daily Challenge ("${existing.title}") is already scheduled for ${date}.`,
      409,
      'DATE_CONFLICT',
      'scheduled_date'
    );
  }
}

async function listDailyChallenges({ status, difficulty, topic_id, search, date, page = 1, limit = 50 }) {
  const conditions = [];
  const params = [];

  if (status) {
    conditions.push('LOWER(dcm.status) = ?');
    params.push(status.toLowerCase());
  }
  if (difficulty) {
    conditions.push('LOWER(q.difficulty) = ?');
    params.push(difficulty.toLowerCase());
  }
  if (topic_id) {
    conditions.push('q.topic_id = ?');
    params.push(topic_id);
  }
  if (date) {
    conditions.push('dcm.scheduled_date = ?');
    params.push(date);
  }
  if (search && search.trim()) {
    conditions.push('(LOWER(q.title) LIKE ? OR LOWER(COALESCE(q.description, \'\')) LIKE ?)');
    params.push(`%${search.trim().toLowerCase()}%`, `%${search.trim().toLowerCase()}%`);
  }

  const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const countRow = await getRepo().one(`SELECT COUNT(*) AS total FROM daily_challenge_metadata dcm JOIN questions q ON dcm.question_id = q.id ${whereSql}`, params);
  const total = Number(countRow?.total || 0);

  const p = Math.max(1, Number(page) || 1);
  const l = Math.max(1, Number(limit) || 50);
  const offset = (p - 1) * l;

  const rows = await getRepo().many(`
    SELECT 
      q.id, q.title, q.slug, q.difficulty, q.topic_id, q.pattern_id,
      q.estimated_time, q.points, q.description, q.problem_statement, q.constraints,
      q.input_format, q.output_format, q.example_input, q.example_output, q.examples,
      q.hints, q.tags, q.solution_approach, q.editorial, q.complexity,
      q.starter_code, q.supported_languages, q.is_active, q.created_by,
      dcm.scheduled_date, dcm.status, dcm.custom_topic, dcm.created_via,
      dcm.created_at, dcm.updated_at,
      t.name AS topic_name,
      p.name AS pattern_name
    FROM daily_challenge_metadata dcm
    JOIN questions q ON dcm.question_id = q.id
    LEFT JOIN topics t ON q.topic_id = t.id
    LEFT JOIN patterns p ON q.pattern_id = p.id
    ${whereSql}
    ORDER BY dcm.created_at DESC
    LIMIT ? OFFSET ?
  `, [...params, l, offset]);

  const allStatusCounts = await getRepo().many(`
    SELECT status, COUNT(*) AS count
    FROM daily_challenge_metadata
    GROUP BY status
  `);

  const stats = { total: 0, draft: 0, published: 0, scheduled: 0, active: 0, archived: 0 };
  allStatusCounts.forEach(r => {
    const s = String(r.status || '').toLowerCase();
    const c = Number(r.count || 0);
    stats.total += c;
    if (stats[s] !== undefined) stats[s] = c;
  });

  const todayStr = getTodayDateString();

  const todayRow = await getRepo().one(`
    SELECT q.*, dcm.scheduled_date, dcm.status, dcm.custom_topic, dcm.created_via, t.name AS topic_name, p.name AS pattern_name
    FROM daily_challenge_metadata dcm
    JOIN questions q ON dcm.question_id = q.id
    LEFT JOIN topics t ON q.topic_id = t.id
    LEFT JOIN patterns p ON q.pattern_id = p.id
    WHERE dcm.scheduled_date = ? AND dcm.status IN ('published', 'scheduled')
    ORDER BY dcm.updated_at DESC LIMIT 1
  `, [todayStr]);

  const nextScheduledRow = await getRepo().one(`
    SELECT q.*, dcm.scheduled_date, dcm.status, dcm.custom_topic, dcm.created_via, t.name AS topic_name, p.name AS pattern_name
    FROM daily_challenge_metadata dcm
    JOIN questions q ON dcm.question_id = q.id
    LEFT JOIN topics t ON q.topic_id = t.id
    LEFT JOIN patterns p ON q.pattern_id = p.id
    WHERE dcm.scheduled_date > ? AND dcm.status IN ('scheduled', 'published') 
    ORDER BY dcm.scheduled_date ASC LIMIT 1
  `, [todayStr]);

  const formattedRows = rows.map(r => ({
    ...r,
    topic_name: r.custom_topic ? r.custom_topic : (r.topic_name || r.topic_id || 'Other'),
    pattern_name: r.pattern_name || r.pattern_id || null,
    hints: parseHints(r.hints),
    tags: safeParseJson(r.tags, []),
    examples: safeParseJson(r.examples, []),
    supported_languages: safeParseJson(r.supported_languages, ['javascript', 'python']),
    created_via: r.created_via || 'manual',
    editorial: r.editorial || r.solution_approach || '',
    complexity: r.complexity || '',
  }));

  return {
    data: formattedRows,
    total, page: p, limit: l, stats,
    today_challenge: todayRow ? { ...todayRow, hints: parseHints(todayRow.hints), examples: safeParseJson(todayRow.examples, []), tags: safeParseJson(todayRow.tags, []) } : null,
    next_scheduled_challenge: nextScheduledRow ? { ...nextScheduledRow, hints: parseHints(nextScheduledRow.hints), examples: safeParseJson(nextScheduledRow.examples, []), tags: safeParseJson(nextScheduledRow.tags, []) } : null
  };
}

async function getDailyChallengeById(question_id, isPrivileged = false) {
  const challenge = await getRepo().one(`
    SELECT 
      q.*,
      dcm.scheduled_date, dcm.status, dcm.custom_topic, dcm.created_via, dcm.created_at AS dc_created_at, dcm.updated_at AS dc_updated_at,
      t.name AS topic_name,
      p.name AS pattern_name
    FROM daily_challenge_metadata dcm
    JOIN questions q ON dcm.question_id = q.id
    LEFT JOIN topics t ON q.topic_id = t.id
    LEFT JOIN patterns p ON q.pattern_id = p.id
    WHERE dcm.question_id = ?
  `, [question_id]);

  if (!challenge) throw new AppError('Daily Challenge problem not found', 404, 'NOT_FOUND');

  const testCases = await getRepo().many(`
    SELECT id, input, expected_output, is_hidden
    FROM test_cases
    WHERE question_id = ?
    ORDER BY is_hidden ASC, created_at ASC, id ASC
  `, [question_id]);

  const visibleTestCases = isPrivileged ? testCases : testCases.filter(tc => !tc.is_hidden);

  return {
    ...challenge,
    id: challenge.id,
    topic_name: challenge.custom_topic ? challenge.custom_topic : (challenge.topic_name || challenge.topic_id || 'Other'),
    pattern_name: challenge.pattern_name || challenge.pattern_id || null,
    topic: challenge.custom_topic ? challenge.custom_topic : (challenge.topic_name || challenge.topic_id || 'Other'),
    pattern: challenge.pattern_name || challenge.pattern_id || null,
    hints: parseHints(challenge.hints),
    tags: safeParseJson(challenge.tags, []),
    examples: safeParseJson(challenge.examples, []),
    supported_languages: safeParseJson(challenge.supported_languages, ['javascript', 'python']),
    created_via: challenge.created_via === 'ai_automation' ? 'ai' : (challenge.created_via || 'manual'),
    editorial: challenge.editorial || challenge.solution_approach || '',
    complexity: challenge.complexity || '',
    test_cases: visibleTestCases,
    starter_code: challenge.starter_code ? safeParseJson(challenge.starter_code) : null,
    reference_solution: isPrivileged && challenge.reference_solution ? safeParseJson(challenge.reference_solution) : null,
    total_test_cases: testCases.length
  };
}

// CREATE FROM PRACTICE: The holy grail of the canonical architecture
async function createDailyChallengeFromPractice(data, admin_id) {
  const { question_id, scheduled_date, title, points, difficulty } = data;
  
  // 1. Verify source exists in questions
  const question = await getRepo().one('SELECT id FROM questions WHERE id = ?', [question_id]);
  if (!question) throw new AppError('Source practice question not found', 404, 'NOT_FOUND');

  // 2. Validate scheduling if provided
  if (scheduled_date) {
    if (!isValidDateString(scheduled_date)) {
      throw new AppError('Invalid scheduled date format (expected YYYY-MM-DD)', 400, 'VALIDATION_ERROR', 'scheduled_date');
    }
    await assertDateAvailable(scheduled_date);
  }

  // 3. Ensure this question isn't ALREADY a daily challenge
  const existingMetadata = await getRepo().one('SELECT question_id FROM daily_challenge_metadata WHERE question_id = ?', [question_id]);
  if (existingMetadata) {
    throw new AppError('This question is already configured as a Daily Challenge.', 409, 'DUPLICATE_CHALLENGE');
  }

  // 4. Update the questions table if title/points/difficulty are modified for the challenge
  const updates = [];
  const params = [];
  if (title && title !== question.title) { updates.push('title = ?'); params.push(title); }
  if (difficulty && difficulty !== question.difficulty) { updates.push('difficulty = ?'); params.push(difficulty); }
  if (points && points !== question.points) { updates.push('points = ?'); params.push(points); }

  const newStatus = scheduled_date ? 'scheduled' : 'draft';
  updates.push('status = ?');
  params.push(newStatus);

  await getRepo().transaction(async tx => {
    params.push(question_id);
    await tx.execute(`UPDATE questions SET ${updates.join(', ')} WHERE id = ?`, params);
    
    // We insert into metadata, NOT questions! That's the power of canonical mapping!
    await tx.execute(`
      INSERT INTO daily_challenge_metadata (question_id, scheduled_date, status, created_via)
      VALUES (?, ?, ?, 'manual')
    `, [question_id, scheduled_date || null, newStatus]);
  });

  return getDailyChallengeById(question_id, true);
}

// CREATE STANDALONE: Create a new canonical question that isn't (yet) in practice
async function createDailyChallenge(data, admin_id) {
  const {
    title, slug, difficulty, topic_id, pattern_id, custom_topic = null,
    estimated_time = 30, points = 100, description, problem_statement, constraints,
    input_format, output_format, example_input, example_output, examples,
    hints, tags, solution_approach, editorial, complexity, starter_code, reference_solution,
    supported_languages, created_via = 'manual', status = 'draft', scheduled_date = null, test_cases = [],
    topic, pattern
  } = data;

  // Design invariant: questions.status is NEVER set to 'archived'.
  // Archive is a daily_challenge_metadata lifecycle state, not a question status.
  if (status === 'archived') {
    throw new AppError('Cannot set question status to archived. Archive is a daily_challenge_metadata lifecycle state.', 400, 'VALIDATION_ERROR', 'status');
  }

  if (!title || !String(title).trim()) throw new AppError('Title is required', 400, 'VALIDATION_ERROR', 'title');
  if (!description || !String(description).trim()) throw new AppError('Description is required', 400, 'VALIDATION_ERROR', 'description');

  const validDifficulties = ['easy', 'medium', 'hard'];
  if (difficulty && !validDifficulties.includes(String(difficulty).toLowerCase())) {
    throw new AppError('Difficulty must be easy, medium, or hard', 400, 'VALIDATION_ERROR', 'difficulty');
  }

  let finalTopicId = topic_id || null;
  if (finalTopicId) {
    const existing = await getRepo().one('SELECT id FROM topics WHERE id = ?', [finalTopicId]);
    if (!existing) finalTopicId = null;
  }
  if (!finalTopicId && (topic || custom_topic)) {
    const topicToFind = topic || custom_topic;
    const matched = await getRepo().one(
      'SELECT id FROM topics WHERE LOWER(name) = LOWER(?) OR LOWER(id) = LOWER(?)',
      [String(topicToFind).trim(), String(topicToFind).trim()]
    );
    if (matched) finalTopicId = matched.id;
  }

  let finalPatternId = pattern_id || null;
  if (finalPatternId) {
    const existing = await getRepo().one('SELECT id FROM patterns WHERE id = ?', [finalPatternId]);
    if (!existing) finalPatternId = null;
  }
  if (!finalPatternId && pattern) {
    let matched = await getRepo().one(
      'SELECT id FROM patterns WHERE LOWER(name) = LOWER(?) OR LOWER(id) = LOWER(?)',
      [String(pattern).trim(), String(pattern).trim()]
    );
    if (!matched) {
      matched = await getRepo().one(
        'SELECT id FROM patterns WHERE LOWER(name) LIKE ? OR LOWER(id) LIKE ? LIMIT 1',
        [`%${String(pattern).trim().toLowerCase()}%`, `%${String(pattern).trim().toLowerCase()}%`]
      );
    }
    if (matched) finalPatternId = matched.id;
  }

  if (starter_code) {
    const sc = typeof starter_code === 'string' ? JSON.parse(starter_code || '{}') : starter_code;
    if (typeof sc === 'object' && sc !== null) {
      const hasValidStarter = Object.values(sc).some(v => v && String(v).trim());
      if (!hasValidStarter) {
        throw new AppError('Starter code must include at least one language with code', 400, 'VALIDATION_ERROR', 'starter_code');
      }
    }
  }

  if (Array.isArray(test_cases) && test_cases.length > 0) {
    for (let i = 0; i < test_cases.length; i++) {
      const tc = test_cases[i];
      if (!tc || tc.input === undefined || tc.expected_output === undefined) {
        throw new AppError(`Test case ${i + 1} must have input and expected_output`, 400, 'VALIDATION_ERROR', 'test_cases');
      }
    }
  }

  if (scheduled_date && (status === 'scheduled' || status === 'published')) {
    await assertDateAvailable(scheduled_date);
  }

  const question_id = `q-${uuidv4().slice(0, 8)}`;
  const finalSlug = slug ? generateSlug(slug) : generateSlug(title);
  const targetStatus = status || 'draft';

  await getRepo().transaction(async tx => {
    // 1. Insert into questions table (canonical row, explicitly storing targetStatus lifecycle)
    await tx.execute(`
      INSERT INTO questions (
        id, title, slug, url, difficulty, topic_id, pattern_id,
        estimated_time, points, description, problem_statement, constraints,
        input_format, output_format, example_input, example_output, examples,
        hints, tags, solution_approach, editorial, complexity, starter_code,
        reference_solution, supported_languages, is_practice, created_by, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      question_id, title.trim(), finalSlug, `internal://${finalSlug}`, difficulty.toLowerCase(), finalTopicId, finalPatternId,
      Number(estimated_time) || 30, Number(points) || 100, description.trim(), problem_statement || null, constraints || null,
      input_format || null, output_format || null, String(example_input || ''), String(example_output || ''), normalizeJsonArray(examples, '[]'),
      normalizeJsonArray(hints, '[]'), normalizeJsonArray(tags, '[]'), solution_approach || editorial || null,
      editorial || solution_approach || null, complexity || null, typeof starter_code === 'object' ? JSON.stringify(starter_code) : (starter_code || null),
      typeof reference_solution === 'object' ? JSON.stringify(reference_solution) : (reference_solution || null),
      normalizeJsonArray(supported_languages, '["javascript", "python"]'), false, admin_id || null, targetStatus
    ]);

    // 2. Insert into test_cases
    if (Array.isArray(test_cases) && test_cases.length > 0) {
      for (const tc of test_cases) {
        if (tc && tc.input !== undefined && tc.expected_output !== undefined) {
          await tx.execute(`
            INSERT INTO test_cases (id, question_id, input, expected_output, is_hidden)
            VALUES (?, ?, ?, ?, ?)
          `, [`tc-${uuidv4().slice(0, 8)}`, question_id, String(tc.input), String(tc.expected_output), Boolean(tc.is_hidden)]);
        }
      }
    }

    // 3. Insert into daily_challenge_metadata
    const metaCreatedVia = (created_via === 'ai' || created_via === 'ai_automation') ? 'ai_automation' : 'manual';
    await tx.execute(`
      INSERT INTO daily_challenge_metadata (question_id, scheduled_date, custom_topic, created_via, status)
      VALUES (?, ?, ?, ?, ?)
    `, [question_id, scheduled_date || null, custom_topic || null, metaCreatedVia, targetStatus]);
  });

  // Index question for novelty detection (async, non-blocking)
  const createdQuestion = await getRepo().one('SELECT * FROM questions WHERE id = ?', [question_id]);
  indexAcceptedQuestion(question_id, createdQuestion).catch(err => {
    console.warn(`[DailyChallengeService] Failed to index question ${question_id} for novelty detection:`, err.message);
  });

  return getDailyChallengeById(question_id, true);
}

async function updateDailyChallenge(id, data, admin_id) {
  const meta = await getRepo().one('SELECT status, scheduled_date FROM daily_challenge_metadata WHERE question_id = ?', [id]);
  if (!meta) throw new AppError('Daily Challenge problem not found', 404, 'NOT_FOUND');

  // Design invariant: questions.status is NEVER set to 'archived'.
  // Archive is a daily_challenge_metadata lifecycle state, not a question status.
  if (data.status === 'archived') {
    throw new AppError('Cannot set question status to archived. Archive is a daily_challenge_metadata lifecycle state.', 400, 'VALIDATION_ERROR', 'status');
  }

  const isPublished = meta.status === 'published';

  if (isPublished && data.scheduled_date && data.scheduled_date !== meta.scheduled_date) {
    throw new AppError('Cannot change scheduled date of an already published challenge.', 400, 'PROTECTED_FIELD_ERROR', 'scheduled_date');
  }

  if (data.scheduled_date && data.scheduled_date !== meta.scheduled_date) {
    await assertDateAvailable(data.scheduled_date, id);
  }

  let updatedQuestionFields = [];
  await getRepo().transaction(async tx => {
    // 1. Update questions table
    const qFields = [];
    const qValues = [];
    const qAllowed = [
      'title', 'slug', 'difficulty', 'topic_id', 'pattern_id', 'points',
      'estimated_time', 'description', 'problem_statement', 'constraints',
      'input_format', 'output_format', 'example_input', 'example_output',
      'solution_approach', 'editorial', 'complexity', 'starter_code', 'reference_solution'
    ];
    for (const key of qAllowed) {
      if (data[key] !== undefined) {
        qFields.push(`${key} = ?`);
        qValues.push(typeof data[key] === 'object' && data[key] !== null ? JSON.stringify(data[key]) : data[key]);
      }
    }
    if (data.examples !== undefined) { qFields.push('examples = ?'); qValues.push(normalizeJsonArray(data.examples, '[]')); }
    if (data.hints !== undefined) { qFields.push('hints = ?'); qValues.push(normalizeJsonArray(data.hints, '[]')); }
    if (data.tags !== undefined) { qFields.push('tags = ?'); qValues.push(normalizeJsonArray(data.tags, '[]')); }
    if (data.supported_languages !== undefined) { qFields.push('supported_languages = ?'); qValues.push(normalizeJsonArray(data.supported_languages, '["javascript", "python"]')); }
    
    if (qFields.length > 0) {
      updatedQuestionFields = qFields;
      qValues.push(id);
      await tx.execute(`UPDATE questions SET ${qFields.join(', ')} WHERE id = ?`, qValues);
    }

    // 2. Update test cases
    if (Array.isArray(data.test_cases)) {
      await tx.execute('DELETE FROM test_cases WHERE question_id = ?', [id]);
      for (const tc of data.test_cases) {
        if (tc && tc.input !== undefined && tc.expected_output !== undefined) {
          await tx.execute(`
            INSERT INTO test_cases (id, question_id, input, expected_output, is_hidden)
            VALUES (?, ?, ?, ?, ?)
          `, [`tc-${uuidv4().slice(0, 8)}`, id, String(tc.input), String(tc.expected_output), Boolean(tc.is_hidden)]);
        }
      }
    }

    // 3. Update metadata
    const mFields = [];
    const mValues = [];
    if (data.status !== undefined) { mFields.push('status = ?'); mValues.push(data.status); }
    if (data.scheduled_date !== undefined) { mFields.push('scheduled_date = ?'); mValues.push(data.scheduled_date); }
    if (data.custom_topic !== undefined) { mFields.push('custom_topic = ?'); mValues.push(data.custom_topic); }
    
    if (mFields.length > 0) {
      mFields.push('updated_at = CURRENT_TIMESTAMP');
      mValues.push(id);
      await tx.execute(`UPDATE daily_challenge_metadata SET ${mFields.join(', ')} WHERE question_id = ?`, mValues);
    }

    if (data.status !== undefined) {
      await tx.execute('UPDATE questions SET status = ? WHERE id = ?', [data.status, id]);
    }
  });

  // Re-index question for novelty detection if question content was updated
  if (updatedQuestionFields.length > 0) {
    const updatedQuestion = await getRepo().one('SELECT * FROM questions WHERE id = ?', [id]);
    indexAcceptedQuestion(id, updatedQuestion, { force: true }).catch(err => {
      console.warn(`[DailyChallengeService] Failed to re-index question ${id} for novelty detection:`, err.message);
    });
  }

  return getDailyChallengeById(id, true);
}

async function scheduleDailyChallenge(id, date, admin_id) {
  if (!date || !isValidDateString(date)) throw new AppError('Valid date in YYYY-MM-DD format is required', 400, 'VALIDATION_ERROR', 'date');
  if (!isFutureUtcDate(date, getCanonicalUtcDate())) throw new AppError('Scheduled date must be in the future relative to UTC today.', 400, 'VALIDATION_ERROR', 'date');

  await assertDateAvailable(date, id);

  await getRepo().transaction(async tx => {
    await tx.execute(`
      UPDATE daily_challenge_metadata 
      SET scheduled_date = ?, status = 'scheduled', updated_at = CURRENT_TIMESTAMP 
      WHERE question_id = ?
    `, [date, id]);
    await tx.execute(`
      UPDATE questions 
      SET status = 'scheduled' 
      WHERE id = ?
    `, [id]);
  });

  return getDailyChallengeById(id, true);
}

async function publishDailyChallenge(id, admin_id) {
  const meta = await getRepo().one('SELECT scheduled_date FROM daily_challenge_metadata WHERE question_id = ?', [id]);
  if (!meta) throw new AppError('Daily Challenge problem not found', 404, 'NOT_FOUND');

  const targetDate = meta.scheduled_date || getCanonicalUtcDate();
  await assertDateAvailable(targetDate, id);

  await getRepo().transaction(async tx => {
    await tx.execute(`
      UPDATE daily_challenge_metadata 
      SET status = 'published', scheduled_date = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE question_id = ?
    `, [targetDate, id]);
    await tx.execute(`
      UPDATE questions 
      SET status = 'published' 
      WHERE id = ?
    `, [id]);
  });

  return getDailyChallengeById(id, true);
}

async function publishNowDailyChallenge(id, admin_id) {
  const todayUtc = getCanonicalUtcDate();
  await assertDateAvailable(todayUtc, id);
  await getRepo().transaction(async tx => {
    await tx.execute(`
      UPDATE daily_challenge_metadata 
      SET status = 'published', scheduled_date = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE question_id = ?
    `, [todayUtc, id]);
    await tx.execute(`
      UPDATE questions 
      SET status = 'published' 
      WHERE id = ?
    `, [id]);
  });
  return getDailyChallengeById(id, true);
}

async function unpublishDailyChallenge(id, admin_id) {
  const meta = await getRepo().one('SELECT scheduled_date FROM daily_challenge_metadata WHERE question_id = ?', [id]);
  if (!meta) throw new AppError('Daily Challenge problem not found', 404, 'NOT_FOUND');

  const todayUtc = getCanonicalUtcDate();
  const nextStatus = (meta.scheduled_date && meta.scheduled_date > todayUtc) ? 'scheduled' : 'draft';

  await getRepo().transaction(async tx => {
    await tx.execute(`
      UPDATE daily_challenge_metadata 
      SET status = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE question_id = ?
    `, [nextStatus, id]);
    await tx.execute(`
      UPDATE questions 
      SET status = ? 
      WHERE id = ?
    `, [nextStatus, id]);
  });

  return getDailyChallengeById(id, true);
}

async function deleteDailyChallenge(id, permanent = false) {
  const meta = await getRepo().one('SELECT question_id FROM daily_challenge_metadata WHERE question_id = ?', [id]);
  const q = await getRepo().one('SELECT id, is_practice FROM questions WHERE id = ?', [id]);
  if (!meta && !q) throw new AppError('Daily Challenge problem not found', 404, 'NOT_FOUND');

  await getRepo().transaction(async tx => {
    if (meta) {
      await tx.execute('DELETE FROM daily_challenge_metadata WHERE question_id = ?', [id]);
    }
    // Safeguard automation log foreign key references
    await tx.execute('UPDATE daily_challenge_automation_logs SET question_id = NULL WHERE question_id = ?', [id]);
    await tx.execute('UPDATE question_bank_automation_logs SET question_id = NULL WHERE question_id = ?', [id]);

    const isExclusiveDaily = !q || q.is_practice === 0 || q.is_practice === false || String(id).startsWith('dc-');
    if (isExclusiveDaily || permanent) {
      const safeDelete = async (table) => {
        try {
          await tx.execute(`DELETE FROM ${table} WHERE question_id = ?`, [id]);
        } catch (_) {}
      };
      await safeDelete('test_cases');
      await safeDelete('question_embeddings');
      await safeDelete('submissions');
      await safeDelete('code_submissions_log');
      await safeDelete('practice_progress');
      await safeDelete('assignments');
      await safeDelete('question_versions');
      await tx.execute('DELETE FROM questions WHERE id = ?', [id]);
    }
  });
  return { success: true, message: 'Daily challenge deleted successfully' };
}

async function getTodayDailyChallenge(user = null, targetDate = null) {
  const dateStr = targetDate || getTodayDateString();

  let challenge = await getRepo().one(`
    SELECT q.*, dcm.scheduled_date, dcm.status, t.name AS topic_name, p.name AS pattern_name
    FROM daily_challenge_metadata dcm
    JOIN questions q ON dcm.question_id = q.id
    LEFT JOIN topics t ON q.topic_id = t.id
    LEFT JOIN patterns p ON q.pattern_id = p.id
    WHERE dcm.scheduled_date = ? AND dcm.status = 'published'
  `, [dateStr]);

  if (!challenge) return null;

  const testCases = await getRepo().many(`
    SELECT id, input, expected_output, is_hidden 
    FROM test_cases 
    WHERE question_id = ? AND is_hidden = 0
    ORDER BY created_at ASC
  `, [challenge.id]);

  let userStatus = null;
  if (user && user.id) {
    const sub = await getRepo().one(`
      SELECT status, created_at, language 
      FROM submissions 
      WHERE user_id = ? AND question_id = ? 
      ORDER BY created_at DESC LIMIT 1
    `, [user.id, challenge.id]);

    if (sub) {
      userStatus = {
        status: sub.status,
        submitted_at: sub.created_at,
        language: sub.language
      };
    }
  }

  const isPrivileged = user?.role === 'admin' || user?.role === 'mentor';
  return {
    ...challenge,
    topic_name: challenge.topic_name || challenge.topic_id || 'Other',
    pattern_name: challenge.pattern_name || challenge.pattern_id || null,
    hints: parseHints(challenge.hints),
    tags: safeParseJson(challenge.tags, []),
    examples: safeParseJson(challenge.examples, []),
    supported_languages: safeParseJson(challenge.supported_languages, ['javascript', 'python']),
    starter_code: challenge.starter_code ? safeParseJson(challenge.starter_code) : null,
    reference_solution: isPrivileged && challenge.reference_solution ? safeParseJson(challenge.reference_solution) : null,
    test_cases: testCases,
    user_status: userStatus
  };
}

async function updateDailyChallengeStatus(id, status, scheduledDate = null) {
  const meta = await getRepo().one('SELECT status FROM daily_challenge_metadata WHERE question_id = ?', [id]);
  if (!meta) throw new AppError('Daily Challenge problem not found', 404, 'NOT_FOUND');

  const updates = ['status = ?', 'updated_at = CURRENT_TIMESTAMP'];
  const params = [status];
  if (scheduledDate !== null) {
    updates.push('scheduled_date = ?');
    params.push(scheduledDate);
  }
  params.push(id);

  // Design invariant:
  //   dcm.status  → DC lifecycle (draft | scheduled | published | archived)
  //   questions.status → canonical content status (draft | scheduled | published)
  //                      NEVER set to 'archived'
  //   questions.is_practice → practice availability (set to 1 on archive/expiry)
  //
  // When archiving: dcm becomes 'archived', question stays 'published', is_practice = 1
  const questionStatus = status === 'archived' ? 'published' : status;

  await getRepo().transaction(async tx => {
    await tx.execute(
      `UPDATE daily_challenge_metadata SET ${updates.join(', ')} WHERE question_id = ?`,
      params
    );
    await tx.execute(
      `UPDATE questions SET status = ?${status === 'archived' ? ', is_practice = 1' : ''} WHERE id = ?`,
      [questionStatus, id]
    );
  });

  return getDailyChallengeById(id, true);
}

module.exports = {
  listDailyChallenges,
  getDailyChallengeById,
  createDailyChallenge,
  createDailyChallengeFromPractice,
  updateDailyChallenge,
  updateDailyChallengeStatus,
  scheduleDailyChallenge,
  publishDailyChallenge,
  publishNowDailyChallenge,
  unpublishDailyChallenge,
  deleteDailyChallenge,
  getTodayDailyChallenge
};
