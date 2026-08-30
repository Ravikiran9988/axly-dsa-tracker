const { getRepository } = require('../db/repositoryFactory');
const { v4: uuidv4 } = require('uuid');
const { AppError } = require('../middleware/errorHandler');
const { getUserStreaks } = require('./streakService');
const { checkDuplicateChallenge, validateDailyChallenge } = require('./aiDailyChallengeService');
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

/**
 * Asserts that a target calendar date is available for assignment.
 * Throws 409 Conflict if another active, non-archived challenge is assigned to it.
 */
async function assertDateAvailable(date, excludeId = null) {
  if (!date) return;
  if (!isValidDateString(date)) {
    throw new AppError('Invalid date format (expected YYYY-MM-DD)', 400, 'VALIDATION_ERROR', 'date');
  }

  const existing = await getRepo().one(
    `SELECT id, title, scheduled_date FROM daily_challenge_problems 
     WHERE scheduled_date = ? AND status != 'archived' AND (is_active = 1 OR is_active = TRUE) ${excludeId ? 'AND id != ?' : ''}`,
    excludeId ? [date, excludeId] : [date]
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

/**
 * List Daily Challenges with filtering, pagination, and KPI counters
 */
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
  const countRow = await getRepo().one(`SELECT COUNT(*) AS total FROM daily_challenge_problems dc ${whereSql}`, params);
  const total = Number(countRow?.total || 0);

  const p = Math.max(1, Number(page) || 1);
  const l = Math.max(1, Number(limit) || 50);
  const offset = (p - 1) * l;

  const rows = await getRepo().many(`
    SELECT 
      dc.id, dc.title, dc.slug, dc.difficulty, dc.topic_id, dc.pattern_id, dc.custom_topic,
      dc.source_question_id,
      dc.secondary_topics, dc.prerequisites, dc.estimated_time, dc.points,
      dc.description, dc.problem_statement, dc.constraints, dc.input_format,
      dc.output_format, dc.example_input, dc.example_output, dc.examples,
      dc.hints, dc.tags, dc.solution_approach, dc.editorial, dc.complexity,
      dc.starter_code, dc.supported_languages, dc.created_via, dc.status,
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
  const allStatusCounts = await getRepo().many(`
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

  const todayStr = getTodayDateString();

  // Find today's challenge
  const todayRow = await getRepo().one(`
    SELECT dc.*, t.name AS topic_name, p.name AS pattern_name
    FROM daily_challenge_problems dc
    LEFT JOIN topics t ON dc.topic_id = t.id
    LEFT JOIN patterns p ON dc.pattern_id = p.id
    WHERE (dc.scheduled_date = ? OR dc.id IN (SELECT challenge_id FROM daily_questions WHERE date = ?))
      AND (dc.is_active = 1 OR dc.is_active = TRUE) 
      AND dc.status IN ('published', 'scheduled')
    ORDER BY dc.updated_at DESC LIMIT 1
  `, [todayStr, todayStr]);

  // Find next scheduled challenge (strictly future)
  const nextScheduledRow = await getRepo().one(`
    SELECT dc.*, t.name AS topic_name, p.name AS pattern_name
    FROM daily_challenge_problems dc
    LEFT JOIN topics t ON dc.topic_id = t.id
    LEFT JOIN patterns p ON dc.pattern_id = p.id
    WHERE dc.scheduled_date > ? 
      AND dc.status IN ('scheduled', 'published') 
      AND (dc.is_active = 1 OR dc.is_active = TRUE)
    ORDER BY dc.scheduled_date ASC LIMIT 1
  `, [todayStr]);

  const formattedRows = rows.map(r => ({
    ...r,
    topic_name: r.custom_topic ? r.custom_topic : (r.topic_name || r.topic_id || 'Other'),
    pattern_name: r.pattern_name || r.pattern_id || null,
    hints: parseHints(r.hints),
    tags: safeParseJson(r.tags, []),
    examples: safeParseJson(r.examples, []),
    secondary_topics: safeParseJson(r.secondary_topics, []),
    prerequisites: safeParseJson(r.prerequisites, []),
    supported_languages: safeParseJson(r.supported_languages, ['javascript', 'python']),
    created_via: r.created_via || 'manual',
    editorial: r.editorial || r.solution_approach || '',
    complexity: r.complexity || '',
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
      examples: safeParseJson(todayRow.examples, []),
      tags: safeParseJson(todayRow.tags, [])
    } : null,
    next_scheduled_challenge: nextScheduledRow ? {
      ...nextScheduledRow,
      hints: parseHints(nextScheduledRow.hints),
      examples: safeParseJson(nextScheduledRow.examples, []),
      tags: safeParseJson(nextScheduledRow.tags, [])
    } : null
  };
}

/**
 * Get Daily Challenge by ID
 */
async function getDailyChallengeById(id, isPrivileged = false) {
  const challenge = await getRepo().one(`
    SELECT 
      dc.*,
      t.name AS topic_name,
      p.name AS pattern_name,
      sq.title AS source_question_title,
      (SELECT dq.date FROM daily_questions dq WHERE dq.challenge_id = dc.id OR dq.question_id = dc.id LIMIT 1) AS active_daily_date
    FROM daily_challenge_problems dc
    LEFT JOIN topics t ON dc.topic_id = t.id
    LEFT JOIN patterns p ON dc.pattern_id = p.id
    LEFT JOIN questions sq ON dc.source_question_id = sq.id
    WHERE dc.id = ?
  `, [id]);

  if (!challenge) {
    throw new AppError('Daily Challenge problem not found', 404, 'NOT_FOUND');
  }

  const testCases = await getRepo().many(`
    SELECT id, input, expected_output, is_hidden
    FROM daily_challenge_test_cases
    WHERE challenge_id = ?
    ORDER BY is_hidden ASC, id ASC
  `, [id]);

  const visibleTestCases = isPrivileged
    ? testCases
    : testCases.filter(tc => !tc.is_hidden);

  return {
    ...challenge,
    topic_name: challenge.custom_topic ? challenge.custom_topic : (challenge.topic_name || challenge.topic_id || 'Other'),
    pattern_name: challenge.pattern_name || challenge.pattern_id || null,
    hints: parseHints(challenge.hints),
    tags: safeParseJson(challenge.tags, []),
    examples: safeParseJson(challenge.examples, []),
    secondary_topics: safeParseJson(challenge.secondary_topics, []),
    prerequisites: safeParseJson(challenge.prerequisites, []),
    supported_languages: safeParseJson(challenge.supported_languages, ['javascript', 'python']),
    created_via: challenge.created_via || 'manual',
    editorial: challenge.editorial || challenge.solution_approach || '',
    complexity: challenge.complexity || '',
    scheduled_date: challenge.scheduled_date || challenge.active_daily_date || null,
    test_cases: visibleTestCases,
    total_test_cases: testCases.length
  };
}

/**
 * Create a new Daily Challenge (Manual or AI draft)
 */
async function createDailyChallenge(data, admin_id) {
  const {
    title,
    slug,
    difficulty,
    topic_id,
    pattern_id,
    custom_topic = null,
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
    examples,
    hints,
    tags,
    solution_approach,
    editorial,
    complexity,
    starter_code,
    supported_languages,
    created_via = 'manual',
    status = 'draft',
    scheduled_date = null,
    test_cases = []
  } = data;

  if (!title || !String(title).trim()) throw new AppError('Title is required', 400, 'VALIDATION_ERROR', 'title');
  if (!description || !String(description).trim()) throw new AppError('Description is required', 400, 'VALIDATION_ERROR', 'description');
  if (!['easy', 'medium', 'hard'].includes(String(difficulty || '').toLowerCase())) {
    throw new AppError('Difficulty must be easy, medium, or hard', 400, 'VALIDATION_ERROR', 'difficulty');
  }
  if (Number(points) <= 0) {
    throw new AppError('Points must be greater than 0', 400, 'VALIDATION_ERROR', 'points');
  }

  // Duplicate check across Daily Challenges and Practice
  const dupCheck = await checkDuplicateChallenge(data);
  if (dupCheck.isDuplicate) {
    throw new AppError(dupCheck.reason, 409, 'DUPLICATE_CHALLENGE', 'title');
  }

  if (scheduled_date) {
    if (!isValidDateString(scheduled_date)) {
      throw new AppError('Invalid scheduled date format (expected YYYY-MM-DD)', 400, 'VALIDATION_ERROR', 'scheduled_date');
    }
    if (status === 'scheduled' || status === 'published') {
      await assertDateAvailable(scheduled_date);
    }
  }

  const id = `dc-${uuidv4().slice(0, 8)}`;
  const finalSlug = slug ? generateSlug(slug) : generateSlug(title);

  let resolvedPatternId = pattern_id || null;
  if (data.pattern_name) {
    const pName = String(data.pattern_name).trim();
    const exactP = await getRepo().one('SELECT id FROM patterns WHERE LOWER(name) = LOWER(?) OR id = ?', [pName, pName]);
    if (exactP) {
      resolvedPatternId = exactP.id;
    } else {
      resolvedPatternId = pName;
    }
  }

  const { generateProblemSignature, extractProblemConcept } = require('./aiDailyChallengeService');
  const signature = data.problem_signature || generateProblemSignature({
    title,
    description,
    topic: data.topic_name || custom_topic || data.topic,
    pattern: data.pattern_name || resolvedPatternId,
    input_format,
    output_format
  });
  const concept = data.problem_concept || extractProblemConcept(title, description);

  await getRepo().transaction(async tx => {
    await tx.execute(`
      INSERT INTO daily_challenge_problems (
        id, title, slug, difficulty, topic_id, pattern_id, custom_topic, source_question_id,
        secondary_topics, prerequisites, estimated_time, points,
        description, problem_statement, constraints, input_format,
        output_format, example_input, example_output, examples, hints, tags,
        solution_approach, editorial, complexity, starter_code, supported_languages,
        created_via, status, scheduled_date, problem_signature, problem_concept, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [
      id,
      title.trim(),
      finalSlug,
      difficulty.toLowerCase(),
      topic_id || null,
      resolvedPatternId,
      custom_topic || null,
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
      example_input || (examples && examples[0]?.input) || null,
      example_output || (examples && examples[0]?.output) || null,
      normalizeJsonArray(examples, '[]'),
      normalizeJsonArray(hints, '[]'),
      normalizeJsonArray(tags, '[]'),
      solution_approach || editorial || null,
      editorial || solution_approach || null,
      complexity || null,
      typeof starter_code === 'object' ? JSON.stringify(starter_code) : (starter_code || null),
      normalizeJsonArray(supported_languages, '["javascript", "python"]'),
      created_via === 'ai' ? 'ai' : 'manual',
      status,
      scheduled_date || null,
      signature,
      concept,
      admin_id || null
    ]);

    if (Array.isArray(test_cases) && test_cases.length > 0) {
      for (const tc of test_cases) {
        if (tc && tc.input !== undefined && tc.expected_output !== undefined) {
          await tx.execute(`
            INSERT INTO daily_challenge_test_cases (id, challenge_id, input, expected_output, is_hidden)
            VALUES (?, ?, ?, ?, ?)
          `, [
            `dc-tc-${uuidv4().slice(0, 8)}`,
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
      `, [uuidv4(), null, id, scheduled_date, admin_id || 'usr-admin-01']);
    }
  });

  return getDailyChallengeById(id, true);
}

/**
 * Update an existing Daily Challenge with Controlled Editing for Published Problems
 */
async function updateDailyChallenge(id, data, admin_id) {
  const current = await getRepo().one('SELECT * FROM daily_challenge_problems WHERE id = ?', [id]);
  if (!current) throw new AppError('Daily Challenge problem not found', 404, 'NOT_FOUND');

  const isPublished = current.status === 'published';

  // Check if live submissions exist
  const submissionRow = await getRepo().one(
    'SELECT COUNT(*) AS sub_count FROM submissions WHERE question_id = ?',
    [id]
  );
  const hasSubmissions = Number(submissionRow?.sub_count || 0) > 0;

  // Controlled Editing Protection for Published Challenges
  if (isPublished) {
    if (data.scheduled_date && data.scheduled_date !== current.scheduled_date) {
      throw new AppError('Cannot change scheduled date of an already published challenge.', 400, 'PROTECTED_FIELD_ERROR', 'scheduled_date');
    }
    if (data.points !== undefined && Number(data.points) !== Number(current.points) && hasSubmissions) {
      throw new AppError('Cannot modify points of a published challenge with existing student submissions.', 400, 'PROTECTED_FIELD_ERROR', 'points');
    }
  }

  if (data.scheduled_date && data.scheduled_date !== current.scheduled_date && (data.status === 'scheduled' || data.status === 'published' || current.status === 'scheduled')) {
    await assertDateAvailable(data.scheduled_date, id);
  }

  if (data.title && data.title !== current.title) {
    const dupCheck = await checkDuplicateChallenge(data.title, data.description || current.description, id);
    if (dupCheck.isDuplicate) {
      throw new AppError(dupCheck.reason, 409, 'DUPLICATE_CHALLENGE', 'title');
    }
  }

  await getRepo().transaction(async tx => {
    const fields = [];
    const values = [];

    const allowed = [
      'title', 'slug', 'difficulty', 'topic_id', 'pattern_id', 'custom_topic', 'points',
      'estimated_time', 'description', 'problem_statement', 'constraints',
      'input_format', 'output_format', 'example_input', 'example_output',
      'solution_approach', 'editorial', 'complexity', 'starter_code',
      'status', 'scheduled_date', 'is_active', 'created_via'
    ];

    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        if (key === 'starter_code' && typeof data[key] === 'object') {
          values.push(JSON.stringify(data[key]));
        } else if (key === 'is_active') {
          values.push(data[key] ? 1 : 0);
        } else {
          values.push(data[key]);
        }
      }
    }

    if (data.examples !== undefined) {
      fields.push('examples = ?');
      values.push(normalizeJsonArray(data.examples, '[]'));
    }
    if (data.hints !== undefined) {
      fields.push('hints = ?');
      values.push(normalizeJsonArray(data.hints, '[]'));
    }
    if (data.tags !== undefined) {
      fields.push('tags = ?');
      values.push(normalizeJsonArray(data.tags, '[]'));
    }
    if (data.secondary_topics !== undefined) {
      fields.push('secondary_topics = ?');
      values.push(normalizeJsonArray(data.secondary_topics, '[]'));
    }
    if (data.prerequisites !== undefined) {
      fields.push('prerequisites = ?');
      values.push(normalizeJsonArray(data.prerequisites, '[]'));
    }
    if (data.supported_languages !== undefined) {
      fields.push('supported_languages = ?');
      values.push(normalizeJsonArray(data.supported_languages, '["javascript", "python"]'));
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');

    if (fields.length > 1) {
      values.push(id);
      await tx.execute(`UPDATE daily_challenge_problems SET ${fields.join(', ')} WHERE id = ?`, values);
    }

    if (Array.isArray(data.test_cases)) {
      if (isPublished && hasSubmissions) {
        // Reject test case replacement if submissions exist
        throw new AppError('Cannot replace test cases of a live published challenge with active student submissions.', 400, 'PROTECTED_FIELD_ERROR', 'test_cases');
      }

      await tx.execute('DELETE FROM daily_challenge_test_cases WHERE challenge_id = ?', [id]);
      for (const tc of data.test_cases) {
        if (tc && tc.input !== undefined && tc.expected_output !== undefined) {
          await tx.execute(`
            INSERT INTO daily_challenge_test_cases (id, challenge_id, input, expected_output, is_hidden)
            VALUES (?, ?, ?, ?, ?)
          `, [
            `dc-tc-${uuidv4().slice(0, 8)}`,
            id,
            String(tc.input),
            String(tc.expected_output),
            tc.is_hidden ? 1 : 0
          ]);
        }
      }
    }

    const effectiveDate = data.scheduled_date || current.scheduled_date;
    const effectiveStatus = data.status || current.status;
    if (effectiveDate && (effectiveStatus === 'scheduled' || effectiveStatus === 'published')) {
      await tx.execute(`
        INSERT INTO daily_questions (id, question_id, challenge_id, date, created_by)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(date) DO UPDATE SET
          question_id = excluded.question_id,
          challenge_id = excluded.challenge_id,
          created_by = excluded.created_by
      `, [uuidv4(), null, id, effectiveDate, admin_id || 'usr-admin-01']);
    }
  });

  return getDailyChallengeById(id, true);
}

/**
 * Schedule a Daily Challenge for a strictly future calendar date (UTC)
 */
async function scheduleDailyChallenge(id, date, admin_id) {
  if (!date || !isValidDateString(date)) {
    throw new AppError('Valid date in YYYY-MM-DD format is required', 400, 'VALIDATION_ERROR', 'date');
  }

  const todayUtc = getCanonicalUtcDate();
  if (!isFutureUtcDate(date, todayUtc)) {
    throw new AppError('Scheduled date must be in the future relative to UTC today.', 400, 'VALIDATION_ERROR', 'date');
  }

  const challenge = await getRepo().one('SELECT id, status, is_active FROM daily_challenge_problems WHERE id = ?', [id]);
  if (!challenge) throw new AppError('Daily Challenge problem not found', 404, 'NOT_FOUND');

  // Prevent duplicate schedule for the same date
  await assertDateAvailable(date, id);

  await getRepo().transaction(async tx => {
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
    `, [uuidv4(), null, id, date, admin_id || 'usr-admin-01']);
  });

  return getDailyChallengeById(id, true);
}

/**
 * Normal Publish / Approve:
 * - If draft with no date -> assigns today's canonical UTC date & status = 'published'.
 * - If draft or scheduled with future date -> retains future date & status = 'published'.
 */
async function publishDailyChallenge(id, admin_id) {
  const challenge = await getRepo().one('SELECT id, title, status, scheduled_date FROM daily_challenge_problems WHERE id = ?', [id]);
  if (!challenge) throw new AppError('Daily Challenge problem not found', 404, 'NOT_FOUND');

  let targetDate = challenge.scheduled_date;
  const todayUtc = getCanonicalUtcDate();

  if (!targetDate) {
    targetDate = todayUtc;
  }

  await assertDateAvailable(targetDate, id);

  await getRepo().transaction(async tx => {
    await tx.execute(`
      UPDATE daily_challenge_problems 
      SET status = 'published', scheduled_date = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, [targetDate, id]);

    await tx.execute(`
      INSERT INTO daily_questions (id, question_id, challenge_id, date, created_by)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(date) DO UPDATE SET
        question_id = excluded.question_id,
        challenge_id = excluded.challenge_id,
        created_by = excluded.created_by
    `, [uuidv4(), null, id, targetDate, admin_id || 'usr-admin-01']);
  });

  const result = await getDailyChallengeById(id, true);

  if (targetDate === todayUtc) {
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

/**
 * Explicit Publish Now:
 * Assigns today's canonical UTC date regardless of previous date,
 * validates availability, and publishes immediately.
 */
async function publishNowDailyChallenge(id, admin_id) {
  const challenge = await getRepo().one('SELECT id, title, status, scheduled_date FROM daily_challenge_problems WHERE id = ?', [id]);
  if (!challenge) throw new AppError('Daily Challenge problem not found', 404, 'NOT_FOUND');

  const todayUtc = getCanonicalUtcDate();
  await assertDateAvailable(todayUtc, id);

  await getRepo().transaction(async tx => {
    await tx.execute(`
      UPDATE daily_challenge_problems 
      SET status = 'published', scheduled_date = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, [todayUtc, id]);

    await tx.execute(`
      INSERT INTO daily_questions (id, question_id, challenge_id, date, created_by)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(date) DO UPDATE SET
        question_id = excluded.question_id,
        challenge_id = excluded.challenge_id,
        created_by = excluded.created_by
    `, [uuidv4(), null, id, todayUtc, admin_id || 'usr-admin-01']);
  });

  const result = await getDailyChallengeById(id, true);

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

  return result;
}

/**
 * Unpublish Daily Challenge (revert to scheduled if future date, or draft)
 */
async function unpublishDailyChallenge(id, admin_id) {
  const challenge = await getRepo().one('SELECT id, status, scheduled_date FROM daily_challenge_problems WHERE id = ?', [id]);
  if (!challenge) throw new AppError('Daily Challenge problem not found', 404, 'NOT_FOUND');

  const todayUtc = getCanonicalUtcDate();
  const nextStatus = (challenge.scheduled_date && challenge.scheduled_date > todayUtc) ? 'scheduled' : 'draft';

  await getRepo().execute(`
    UPDATE daily_challenge_problems 
    SET status = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `, [nextStatus, id]);

  return getDailyChallengeById(id, true);
}

/**
 * Archive Daily Challenge (soft-archive, retains historical submissions)
 */
async function archiveDailyChallenge(id) {
  const challenge = await getRepo().one('SELECT id FROM daily_challenge_problems WHERE id = ?', [id]);
  if (!challenge) throw new AppError('Daily Challenge problem not found', 404, 'NOT_FOUND');

  await getRepo().execute(`
    UPDATE daily_challenge_problems 
    SET status = 'archived', is_active = 0, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `, [id]);

  return { success: true, message: 'Daily challenge archived' };
}

/**
 * Permanently Delete Daily Challenge
 */
async function deleteDailyChallenge(id) {
  const challenge = await getRepo().one('SELECT id, title FROM daily_challenge_problems WHERE id = ?', [id]);
  if (!challenge) throw new AppError('Daily Challenge problem not found', 404, 'NOT_FOUND');

  await getRepo().transaction(async tx => {
    await tx.execute('DELETE FROM daily_challenge_test_cases WHERE challenge_id = ?', [id]);
    await tx.execute('DELETE FROM daily_questions WHERE challenge_id = ? OR question_id = ?', [id, id]);
    await tx.execute('DELETE FROM daily_challenge_problems WHERE id = ?', [id]);
  });

  return { success: true, message: `Daily challenge "${challenge.title}" deleted successfully` };
}

/**
 * Student Daily Challenge query:
 * Returns strictly today's valid published/scheduled challenge.
 * Hides drafts, future, and archived challenges.
 * Masks hidden test cases for students.
 */
async function getTodayDailyChallenge(user = null, targetDate = null) {
  const dateStr = targetDate || getTodayDateString();

  // 1. Primary query: Find active published/scheduled challenge for dateStr in daily_challenge_problems
  let challenge = await getRepo().one(`
    SELECT dc.*, t.name AS topic_name, p.name AS pattern_name
    FROM daily_challenge_problems dc
    LEFT JOIN topics t ON dc.topic_id = t.id
    LEFT JOIN patterns p ON dc.pattern_id = p.id
    WHERE dc.scheduled_date = ?
      AND (dc.is_active = 1 OR dc.is_active = TRUE)
      AND dc.status IN ('published', 'scheduled')
    ORDER BY 
      CASE WHEN dc.status = 'published' THEN 1 ELSE 2 END,
      dc.updated_at DESC,
      dc.created_at DESC
    LIMIT 1
  `, [dateStr]);

  // 2. Fallback query: Check daily_questions mapping for dateStr
  if (!challenge) {
    challenge = await getRepo().one(`
      SELECT dc.*, t.name AS topic_name, p.name AS pattern_name
      FROM daily_challenge_problems dc
      LEFT JOIN topics t ON dc.topic_id = t.id
      LEFT JOIN patterns p ON dc.pattern_id = p.id
      WHERE (dc.id IN (SELECT challenge_id FROM daily_questions WHERE date = ?) OR dc.source_question_id IN (SELECT question_id FROM daily_questions WHERE date = ?))
        AND (dc.is_active = 1 OR dc.is_active = TRUE)
        AND dc.status IN ('published', 'scheduled')
      ORDER BY dc.updated_at DESC LIMIT 1
    `, [dateStr, dateStr]);
  }

  // 3. If no published/scheduled challenge exists for today, return null (do NOT fall back to old/future challenges)
  if (!challenge) {
    return { data: null, message: 'No Daily Challenge available today.' };
  }

  const submission = user ? await getRepo().one(`
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
      date: challenge.scheduled_date || dateStr,
      scheduled_date: challenge.scheduled_date || dateStr,
      title: challenge.title,
      difficulty: challenge.difficulty,
      topic_id: challenge.topic_id,
      topic_name: challenge.custom_topic ? challenge.custom_topic : (challenge.topic_name || challenge.topic_id || 'Other'),
      pattern_id: challenge.pattern_id,
      pattern_name: challenge.pattern_name || challenge.pattern_id || null,
      description: challenge.description,
      problem_statement: challenge.problem_statement || challenge.description,
      constraints: challenge.constraints,
      input_format: challenge.input_format,
      output_format: challenge.output_format,
      examples: safeParseJson(challenge.examples, []),
      example_input: challenge.example_input,
      example_output: challenge.example_output,
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

/**
 * Create Daily Challenge from Practice problem
 */
async function createDailyChallengeFromPractice(data, admin_id) {
  const { question_id, title, points, difficulty, scheduled_date } = data;
  const question = await getRepo().one('SELECT * FROM questions WHERE id = ?', [question_id]);
  if (!question) throw new AppError('Source practice question not found', 404, 'NOT_FOUND');

  const testCaseTable = getRepo().isPostgres ? 'question_test_cases' : 'test_cases';
  const testCases = await getRepo().many(`SELECT input, expected_output, is_hidden FROM ${testCaseTable} WHERE question_id = ?`, [question_id]);

  return createDailyChallenge({
    title: title || `${question.title} Daily Challenge`,
    difficulty: difficulty || question.difficulty || 'medium',
    topic_id: question.topic_id,
    pattern_id: question.pattern_id,
    source_question_id: question.id,
    points: points || 100,
    estimated_time: question.estimated_time || 30,
    description: question.description || question.problem_statement || '',
    problem_statement: question.problem_statement || question.description,
    constraints: question.constraints,
    input_format: question.input_format,
    output_format: question.output_format,
    example_input: question.example_input,
    example_output: question.example_output,
    hints: parseHints(question.hints),
    tags: safeParseJson(question.tags, []),
    solution_approach: question.solution_approach,
    starter_code: question.starter_code,
    status: scheduled_date ? 'scheduled' : 'draft',
    scheduled_date: scheduled_date || null,
    test_cases: testCases
  }, admin_id);
}

module.exports = {
  listDailyChallenges,
  getDailyChallengeById,
  createDailyChallenge,
  createDailyChallengeFromPractice,
  updateDailyChallenge,
  scheduleDailyChallenge,
  publishDailyChallenge,
  publishNowDailyChallenge,
  unpublishDailyChallenge,
  archiveDailyChallenge,
  deleteDailyChallenge,
  getTodayDailyChallenge,
  assertDateAvailable
};
