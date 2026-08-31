const { getRepository } = require('../db/repositoryFactory');
const { v4: uuidv4 } = require('uuid');

const repo = getRepository();

async function ensureScoringColumns() {
  // Handled via schema migrations in PostgreSQL / SQLite.
}

function parseEstimatedMinutes(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const match = String(value || '').match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 30;
}

function calculateScore({ passedTests, totalTests, durationSeconds, attempts, estimatedTime }) {
  const safeTotal = Math.max(Number(totalTests) || 0, 0);
  const safePassed = Math.min(Math.max(Number(passedTests) || 0, 0), safeTotal);
  const testScore = safeTotal > 0 ? (safePassed / safeTotal) * 60 : 0;

  const expectedSeconds = Math.max(parseEstimatedMinutes(estimatedTime) * 60, 60);
  const duration = Math.max(Number(durationSeconds) || 0, 0);
  let timeScore = 20;
  if (duration > expectedSeconds) {
    timeScore = Math.max(5, 20 * (expectedSeconds / duration));
  }

  const attemptNumber = Math.max(Number(attempts) || 1, 1);
  const attemptScore = Math.max(5, 20 - ((attemptNumber - 1) * 5));
  const finalScore = Math.round(Math.min(100, testScore + timeScore + attemptScore) * 100) / 100;

  return {
    test_score: Math.round(testScore * 100) / 100,
    time_score: Math.round(timeScore * 100) / 100,
    attempt_score: Math.round(attemptScore * 100) / 100,
    final_score: finalScore
  };
}

function normalizeDurationSeconds(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  // Keep sub-second precision in application logic while preventing accidental
  // string/NaN/Infinity values from reaching PostgreSQL.
  return Math.round(n * 1000) / 1000;
}

async function recordAttempt({ userId, questionId, passedTests, totalTests, executionTimeMs, solved }) {
  const now = new Date();
  const nowIso = now.toISOString();

  const submission = await repo.one('SELECT * FROM submissions WHERE user_id = ? AND question_id = ?', [userId, questionId]);
  const question = (await repo.one('SELECT estimated_time, is_practice FROM questions WHERE id = ?', [questionId])) || {};
  const assignment = await repo.one('SELECT assigned_at FROM assignments WHERE user_id = ? AND question_id = ?', [userId, questionId]);

  if (question.is_practice) return submission;

  const startedAt = submission?.started_at || submission?.attempted_at || assignment?.assigned_at || nowIso;
  const startedMs = Date.parse(startedAt);
  const rawDurationSeconds = Number.isFinite(startedMs) ? Math.max(0, (now.getTime() - startedMs) / 1000) : 0;
  const durationSeconds = normalizeDurationSeconds(rawDurationSeconds);
  const attempts = (submission?.attempt_count || 0) + 1;
  const score = calculateScore({
    passedTests,
    totalTests,
    durationSeconds,
    attempts,
    estimatedTime: question.estimated_time
  });

  if (!submission) {
    const id = uuidv4();
    await repo.execute(`
      INSERT INTO submissions (
        id, user_id, question_id, status, attempted_at, started_at, attempt_count,
        solve_duration_seconds, test_score, time_score, attempt_score, final_score,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, userId, questionId, solved ? 'solved' : 'attempted', nowIso, startedAt, attempts,
      solved ? durationSeconds : 0, score.test_score, score.time_score, score.attempt_score,
      score.final_score, nowIso, nowIso
    ]);
  } else {
    const existingSolved = ['solved', 'approved', 'completed'].includes(submission.status);
    const effectiveSolved = existingSolved || solved;
    const solvedAt = effectiveSolved ? (submission.solved_at || nowIso) : null;
    const finalDuration = effectiveSolved
      ? normalizeDurationSeconds(submission.solve_duration_seconds || durationSeconds)
      : normalizeDurationSeconds(submission.solve_duration_seconds || 0);

    await repo.execute(`
      UPDATE submissions SET
        attempted_at = COALESCE(attempted_at, ?),
        started_at = COALESCE(started_at, ?),
        attempt_count = ?,
        solve_duration_seconds = ?,
        test_score = ?,
        time_score = ?,
        attempt_score = ?,
        final_score = ?,
        status = ?,
        solved_at = ?,
        updated_at = ?
      WHERE id = ?
    `, [
      nowIso, startedAt, attempts, finalDuration,
      score.test_score, score.time_score, score.attempt_score, score.final_score,
      effectiveSolved ? 'solved' : 'attempted', solvedAt, nowIso, submission.id
    ]);
  }

  return repo.one('SELECT * FROM submissions WHERE user_id = ? AND question_id = ?', [userId, questionId]);
}

module.exports = {
  ensureScoringColumns,
  calculateScore,
  recordAttempt
};
