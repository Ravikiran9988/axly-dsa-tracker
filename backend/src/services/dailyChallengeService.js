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

const { getCalendarDate, getUserStreaks } = require('./streakService');

function getTodayDateString() {
  return getCalendarDate();
}

async function assertDateAvailable(date, excludeId = null) {
  if (!date) return;
  const existing = await repo.one(
    `SELECT id, title, scheduled_date FROM daily_challenge_problems 
     WHERE scheduled_date = ? AND status != 'archived' AND is_active = 1 ${excludeId ? 'AND id != ?' : ''}`,
    excludeId ? [date, excludeId] : [date]
  );
  if (existing) {
    throw new AppError(`A Daily Challenge ("${existing.title}") is already scheduled for ${date}. Only one challenge can be scheduled per date.`, 409, 'DATE_CONFLICT', 'date');
  }
}

async function listDailyChallenges({ status, difficulty, topic_id, search, date, page = 1, limit = 50 }) {
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
  if (date) {
    conditions.push('dc.scheduled_date = ?');
    params.push(date);
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
      dc.source_question_id,
      dc.secondary_topics, dc.prerequisites, dc.estimated_time, dc.points,
      dc.description, dc.problem_statement, dc.constraints, dc.input_format,
      dc.output_format, dc.example_input, dc.example_output, dc.hints, dc.tags,
      dc.solution_approach, dc.starter_code, dc.supported_languages, dc.status,
      dc.scheduled_date, dc.is_active, dc.created_by, dc.created_at, dc.updated_at,
      t.name AS topic_name,
      p.name AS pattern_name,
      (SELECT COUNT(*) FROM daily_challenge_test_cases tc WHERE tc.challenge_id = dc.id) AS total_test_cases_count,
      (SELECT dq.date FROM daily_questions dq WHERE dq.challenge_id = dc.id OR dq.question_id = dc.id LIMIT 1) AS active_daily_date,
      sq.title AS source_question_title
    FROM daily_challenge_problems dc
    LEFT JOIN topics t ON dc.topic_id = t.id
    LEFT JOIN patterns p ON dc.pattern_id = p.id
    LEFT JOIN questions sq ON dc.source_question_id = sq.id
    ${whereSql}
    ORDER BY dc.created_at DESC
    LIMIT ? OFFSET ?
  `, [...params, l, offset]);

  // Aggregate stats across all daily challenges
  const allStatusCounts = await repo.many(`
    SELECT status, COUNT(*) AS count
    FROM daily_challenge_problems
    WHERE is_active = 1
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

  const todayStr = getTodayDateString();

  // Find today's challenge
  const todayRow = await repo.one(`
    SELECT dc.*, t.name AS topic_name, p.name AS pattern_name
    FROM daily_challenge_problems dc
    LEFT JOIN topics t ON dc.topic_id = t.id
    LEFT JOIN patterns p ON dc.pattern_id = p.id
    WHERE (dc.scheduled_date = ? OR dc.id IN (SELECT challenge_id FROM daily_questions WHERE date = ?))
      AND dc.is_active = 1 AND dc.status != 'archived'
    ORDER BY dc.updated_at DESC LIMIT 1
  `, [todayStr, todayStr]);

  // Find next scheduled challenge
  const nextScheduledRow = await repo.one(`
    SELECT dc.*, t.name AS topic_name, p.name AS pattern_name
    FROM daily_challenge_problems dc
    LEFT JOIN topics t ON dc.topic_id = t.id
    LEFT JOIN patterns p ON dc.pattern_id = p.id
    WHERE dc.scheduled_date > ? AND dc.status IN ('scheduled', 'published') AND dc.is_active = 1
    ORDER BY dc.scheduled_date ASC LIMIT 1
  `, [todayStr]);

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
    stats,
    today_challenge: todayRow ? {
      ...todayRow,
      hints: parseHints(todayRow.hints),
      scheduled_date: todayRow.scheduled_date || todayStr
    } : null,
    next_scheduled_challenge: nextScheduledRow ? {
      ...nextScheduledRow,
      hints: parseHints(nextScheduledRow.hints)
    } : null
  };
}

async function getDailyChallengeById(id, includeHiddenTestCases = false) {
  const row = await repo.one(`
    SELECT 
      dc.*,
      t.name AS topic_name,
      p.name AS pattern_name,
      (SELECT dq.date FROM daily_questions dq WHERE dq.challenge_id = dc.id OR dq.question_id = dc.id LIMIT 1) AS active_daily_date,
      sq.title AS source_question_title
    FROM daily_challenge_problems dc
    LEFT JOIN topics t ON dc.topic_id = t.id
    LEFT JOIN patterns p ON dc.pattern_id = p.id
    LEFT JOIN questions sq ON dc.source_question_id = sq.id
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
    source_question_id = null,
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
  if (!description || !description.trim()) throw new AppError('Description is required', 400, 'VALIDATION_ERROR', 'description');
  if (!['easy', 'medium', 'hard'].includes(String(difficulty || '').toLowerCase())) {
    throw new AppError('Difficulty must be easy, medium, or hard', 400, 'VALIDATION_ERROR', 'difficulty');
  }
  if (Number(points) <= 0) {
    throw new AppError('Points must be greater than 0', 400, 'VALIDATION_ERROR', 'points');
  }

  if (scheduled_date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduled_date)) {
      throw new AppError('Invalid scheduled date format (expected YYYY-MM-DD)', 400, 'VALIDATION_ERROR', 'scheduled_date');
    }
    if (status === 'scheduled' || status === 'published') {
      await assertDateAvailable(scheduled_date);
    }
  }

  const id = `dc-${uuidv4().slice(0, 8)}`;
  const finalSlug = slug ? generateSlug(slug) : generateSlug(title);

  await repo.transaction(async tx => {
    await tx.execute(`
      INSERT INTO daily_challenge_problems (
        id, title, slug, difficulty, topic_id, pattern_id, source_question_id,
        secondary_topics, prerequisites, estimated_time, points,
        description, problem_statement, constraints, input_format,
        output_format, example_input, example_output, hints, tags,
        solution_approach, starter_code, supported_languages, status,
        scheduled_date, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [
      id,
      title.trim(),
      finalSlug,
      difficulty.toLowerCase(),
      topic_id || null,
      pattern_id || null,
      source_question_id || null,
      normalizeJsonArray(secondary_topics, '[]'),
      normalizeJsonArray(prerequisites, '[]'),
      Number(estimated_time) || 30,
      Number(points) || 100,
      description.trim(),
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

async function createFromPractice(questionId, customData = {}, adminId) {
  const practice = await repo.one('SELECT * FROM questions WHERE id = ?', [questionId]);
  if (!practice) throw new AppError('Practice problem not found', 404, 'NOT_FOUND');

  const practiceTestCases = await repo.many(
    'SELECT input, expected_output, is_hidden FROM test_cases WHERE question_id = ? ORDER BY is_hidden ASC, created_at ASC',
    [questionId]
  );

  const mergedData = {
    title: customData.title || `${practice.title} Challenge`,
    slug: customData.slug || `${practice.slug}-challenge`,
    difficulty: customData.difficulty || practice.difficulty,
    topic_id: customData.topic_id || practice.topic_id,
    pattern_id: customData.pattern_id || practice.pattern_id,
    source_question_id: practice.id,
    points: Number(customData.points) || 100,
    estimated_time: Number(customData.estimated_time) || practice.estimated_time || 30,
    description: customData.description || practice.description || practice.problem_statement || practice.title,
    problem_statement: customData.problem_statement || practice.problem_statement,
    constraints: customData.constraints || practice.constraints,
    input_format: customData.input_format || practice.input_format,
    output_format: customData.output_format || practice.output_format,
    example_input: customData.example_input || practice.example_input,
    example_output: customData.example_output || practice.example_output,
    hints: customData.hints !== undefined ? customData.hints : parseHints(practice.hints),
    solution_approach: customData.solution_approach || practice.solution_approach,
    starter_code: customData.starter_code || practice.starter_code,
    supported_languages: practice.supported_languages,
    status: customData.status || (customData.scheduled_date ? 'scheduled' : 'draft'),
    scheduled_date: customData.scheduled_date || null,
    test_cases: Array.isArray(customData.test_cases) && customData.test_cases.length > 0
      ? customData.test_cases
      : practiceTestCases
  };

  return createDailyChallenge(mergedData, adminId);
}

async function updateDailyChallenge(id, data, admin_id) {
  const current = await repo.one('SELECT id, status, scheduled_date FROM daily_challenge_problems WHERE id = ?', [id]);
  if (!current) throw new AppError('Daily Challenge problem not found', 404, 'NOT_FOUND');

  if (data.scheduled_date && data.scheduled_date !== current.scheduled_date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.scheduled_date)) {
      throw new AppError('Invalid scheduled date format (expected YYYY-MM-DD)', 400, 'VALIDATION_ERROR', 'scheduled_date');
    }
    const targetStatus = data.status || current.status;
    if (targetStatus === 'scheduled' || targetStatus === 'published') {
      await assertDateAvailable(data.scheduled_date, id);
    }
  }

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

    if (data.scheduled_date && (data.status === 'scheduled' || data.status === 'published' || current.status === 'scheduled')) {
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

  // Prevent duplicate schedule for the same date
  await assertDateAvailable(date, id);

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

async function publishDailyChallenge(id, admin_id) {
  const challenge = await repo.one('SELECT id, status, scheduled_date FROM daily_challenge_problems WHERE id = ?', [id]);
  if (!challenge) throw new AppError('Daily Challenge problem not found', 404, 'NOT_FOUND');

  const nextStatus = challenge.status === 'published' ? 'draft' : (challenge.scheduled_date ? 'scheduled' : 'published');
  
  if (nextStatus === 'published' && challenge.scheduled_date) {
    await assertDateAvailable(challenge.scheduled_date, id);
  }

  await repo.execute(`
    UPDATE daily_challenge_problems 
    SET status = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `, [nextStatus, id]);

  const result = await getDailyChallengeById(id, true);

  if (nextStatus === 'published' || (nextStatus === 'scheduled' && challenge.scheduled_date === getTodayDateString())) {
    try {
      const notificationService = require('./notificationService');
      await notificationService.broadcastNotification({
        title: `New Daily Challenge: ${result.title}`,
        message: `Today's competitive challenge is live! Solve it to earn +${result.points || 100} pts and build your streak.`,
        category: 'daily_challenge',
        type: 'daily_challenge_published',
        link: '/daily-challenge'
      });
    } catch (_) {}
  }

  return result;
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

async function getTodayDailyChallenge(user = null) {
  const todayStr = getTodayDateString();
  const challenge = await repo.one(`
    SELECT dc.*, t.name AS topic_name, p.name AS pattern_name
    FROM daily_challenge_problems dc
    LEFT JOIN topics t ON dc.topic_id = t.id
    LEFT JOIN patterns p ON dc.pattern_id = p.id
    WHERE (dc.scheduled_date = ? OR dc.id IN (SELECT challenge_id FROM daily_questions WHERE date = ?))
      AND dc.is_active = 1 AND dc.status != 'archived'
    ORDER BY dc.updated_at DESC LIMIT 1
  `, [todayStr, todayStr]);

  if (!challenge) {
    return { data: null, message: 'No Daily Challenge available today.' };
  }

  const submission = user ? await repo.one(`
    SELECT id, status, attempted_at, started_at, solved_at, final_score
    FROM submissions WHERE user_id = ? AND question_id = ?
  `, [user.id, challenge.id]) : null;

  const streaks = user ? await getUserStreaks(user.id) : {
    individualStreak: 0,
    individualBestStreak: 0,
    dailyChallengeStreak: 0,
    dailyChallengeBestStreak: 0
  };

  return {
    data: {
      id: challenge.id,
      date: todayStr,
      title: challenge.title,
      difficulty: challenge.difficulty,
      topic_id: challenge.topic_id,
      topic_name: challenge.topic_name,
      pattern_id: challenge.pattern_id,
      pattern_name: challenge.pattern_name,
      description: challenge.description,
      points: Number(challenge.points) || 100,
      hints: parseHints(challenge.hints),
      submission_status: submission?.status || 'not_started',
      is_solved: ['solved', 'completed', 'approved'].includes(submission?.status),
      dailyChallengeStreak: streaks.dailyChallengeStreak,
      dailyChallengeBestStreak: streaks.dailyChallengeBestStreak,
      individualStreak: streaks.individualStreak,
      individualBestStreak: streaks.individualBestStreak,
      streak: streaks.dailyChallengeStreak
    }
  };
}

module.exports = {
  listDailyChallenges,
  getDailyChallengeById,
  createDailyChallenge,
  createFromPractice,
  updateDailyChallenge,
  scheduleDailyChallenge,
  publishDailyChallenge,
  archiveDailyChallenge,
  getTodayDailyChallenge
};
