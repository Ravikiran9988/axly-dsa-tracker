const { getRepository } = require('../db/repositoryFactory');
const { v4: uuidv4 } = require('uuid');
const { AppError } = require('../middleware/errorHandler');

const repo = getRepository();

function getTodayUtcDate() {
  return new Date().toISOString().slice(0, 10);
}

async function getAutoDailyQuestion() {
  // Try to find an unscheduled/published daily challenge problem first
  const unusedChallenge = await repo.one(`
    SELECT dc.id, dc.title, dc.difficulty, dc.topic_id, t.name AS topic_name, dc.pattern_id, p.name AS pattern_name,
      dc.is_active, dc.points, dc.description, dc.solution_approach, dc.hints, dc.status
    FROM daily_challenge_problems dc
    LEFT JOIN topics t ON dc.topic_id = t.id
    LEFT JOIN patterns p ON dc.pattern_id = p.id
    WHERE (dc.is_active = 1 OR dc.is_active = TRUE) AND dc.status IN ('published', 'scheduled')
      AND NOT EXISTS (SELECT 1 FROM daily_questions dq WHERE dq.challenge_id = dc.id OR dq.question_id = dc.id)
    ORDER BY dc.created_at ASC, dc.id ASC
  `);
  if (unusedChallenge) return unusedChallenge;

  const recycledChallenge = await repo.one(`
    SELECT dc.id, dc.title, dc.difficulty, dc.topic_id, t.name AS topic_name, dc.pattern_id, p.name AS pattern_name,
      dc.is_active, dc.points, dc.description, dc.solution_approach, dc.hints, dc.status,
      (SELECT MAX(dq.date) FROM daily_questions dq WHERE dq.challenge_id = dc.id OR dq.question_id = dc.id) AS last_daily_date
    FROM daily_challenge_problems dc
    LEFT JOIN topics t ON dc.topic_id = t.id
    LEFT JOIN patterns p ON dc.pattern_id = p.id
    WHERE (dc.is_active = 1 OR dc.is_active = TRUE) AND dc.status IN ('published', 'scheduled')
    ORDER BY last_daily_date ASC, dc.created_at ASC, dc.id ASC
  `);
  if (recycledChallenge) return recycledChallenge;

  // Fallback if no daily challenge problems exist in db
  const fallbackQ = await repo.one(`
    SELECT q.id, q.title, q.difficulty, q.topic_id, t.name AS topic_name, q.url, q.is_active, q.points, q.status
    FROM questions q
    LEFT JOIN topics t ON q.topic_id = t.id
    WHERE (q.is_active = 1 OR q.is_active = TRUE) AND q.status = 'published'
    ORDER BY q.created_at ASC, q.id ASC
  `);
  return fallbackQ || null;
}

async function getDailyQuestionForDate(date) {
  // 1. First check if a daily challenge problem is scheduled in daily_questions for this date
  const scheduledChallenge = await repo.one(`
    SELECT dq.id AS daily_question_id, dq.date, dq.created_at AS scheduled_at,
      dc.id, dc.title, dc.difficulty, dc.topic_id, t.name AS topic_name, dc.pattern_id, p.name AS pattern_name,
      dc.is_active, dc.points, dc.description, dc.solution_approach, dc.hints, dc.status
    FROM daily_questions dq
    JOIN daily_challenge_problems dc ON (dq.challenge_id = dc.id OR dq.question_id = dc.id)
    LEFT JOIN topics t ON dc.topic_id = t.id
    LEFT JOIN patterns p ON dc.pattern_id = p.id
    WHERE dq.date = ? AND (dc.is_active = 1 OR dc.is_active = TRUE)
  `, [date]);

  if (scheduledChallenge) return scheduledChallenge;

  // 2. Also check if daily_challenge_problems has scheduled_date directly matching
  const directDateChallenge = await repo.one(`
    SELECT dc.id, dc.title, dc.difficulty, dc.topic_id, t.name AS topic_name, dc.pattern_id, p.name AS pattern_name,
      dc.is_active, dc.points, dc.description, dc.solution_approach, dc.hints, dc.status, dc.scheduled_date AS date
    FROM daily_challenge_problems dc
    LEFT JOIN topics t ON dc.topic_id = t.id
    LEFT JOIN patterns p ON dc.pattern_id = p.id
    WHERE dc.scheduled_date = ? AND (dc.is_active = 1 OR dc.is_active = TRUE) AND dc.status IN ('published', 'scheduled')
  `, [date]);

  if (directDateChallenge) return directDateChallenge;

  // 3. Check legacy questions table via daily_questions
  const scheduledLegacy = await repo.one(`
    SELECT dq.id AS daily_question_id, dq.date, dq.created_at AS scheduled_at,
      q.id, q.title, q.difficulty, q.topic_id, t.name AS topic_name, q.url, q.is_active, q.points, q.status
    FROM daily_questions dq
    JOIN questions q ON dq.question_id = q.id
    LEFT JOIN topics t ON q.topic_id = t.id
    WHERE dq.date = ? AND (q.is_active = 1 OR q.is_active = TRUE)
  `, [date]);

  return scheduledLegacy || getAutoDailyQuestion();
}

async function getDailyQuestion(user, targetDate = null) {
  const date = targetDate || getTodayUtcDate();
  const question = await getDailyQuestionForDate(date);
  if (!question) return { data: null, message: 'No published Daily Challenge available for today' };

  const submission = await repo.one(`
    SELECT id, status, attempted_at, started_at, solved_at, final_score
    FROM submissions WHERE user_id = ? AND question_id = ?
  `, [user.id, question.id]);

  return {
    data: {
      id: question.id,
      daily_question_id: question.daily_question_id || null,
      date,
      title: question.title,
      difficulty: question.difficulty,
      topic_id: question.topic_id,
      topic_name: question.topic_name,
      pattern_id: question.pattern_id || null,
      pattern_name: question.pattern_name || null,
      description: question.description || null,
      points: 100,
      is_active: Boolean(question.is_active),
      status: question.status || 'published',
      is_assigned_to_me: true,
      is_auto_selected: !question.daily_question_id,
      submission_id: submission?.id || null,
      submission_status: submission?.status || 'not_started',
      attempted_at: submission?.attempted_at || null,
      started_at: submission?.started_at || null,
      solved_at: submission?.solved_at || null,
      final_score: submission?.final_score ?? null
    }
  };
}

async function setDailyQuestion({ question_id, challenge_id, date, admin_id }) {
  const targetDate = date || getTodayUtcDate();
  const targetId = challenge_id || question_id;

  // Check in daily_challenge_problems first
  const challenge = await repo.one(
    'SELECT id, title, difficulty, is_active, status FROM daily_challenge_problems WHERE id = ?',
    [targetId]
  );

  let verifiedId = null;
  if (challenge) {
    verifiedId = challenge.id;
    await repo.execute(`
      UPDATE daily_challenge_problems SET scheduled_date = ?, status = 'scheduled', updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `, [targetDate, verifiedId]);
  } else {
    // Fallback: check questions
    const question = await repo.one(
      'SELECT id, title, difficulty, is_active, status FROM questions WHERE id = ?',
      [targetId]
    );
    if (!question) throw new AppError('Problem not found', 404, 'NOT_FOUND');
    verifiedId = question.id;
  }

  await repo.transaction(async tx => {
    const existing = await tx.one('SELECT id FROM daily_questions WHERE date = ?', [targetDate]);
    if (existing) {
      await tx.execute(
        'UPDATE daily_questions SET question_id = ?, challenge_id = ?, created_by = ?, created_at = CURRENT_TIMESTAMP WHERE date = ?',
        [verifiedId, verifiedId, admin_id, targetDate]
      );
    } else {
      await tx.execute(
        'INSERT INTO daily_questions (id, question_id, challenge_id, date, created_by) VALUES (?, ?, ?, ?, ?)',
        [uuidv4(), verifiedId, verifiedId, targetDate, admin_id]
      );
    }
  });

  return getDailyQuestion({ id: admin_id }, targetDate);
}

module.exports = {
  getDailyQuestion,
  getDailyQuestionForDate,
  setDailyQuestion,
  getTodayUtcDate
};
