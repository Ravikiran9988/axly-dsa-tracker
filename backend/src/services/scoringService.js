const { db } = require('../db/db');

// Phase 1 scoring: objective score from test performance, time-to-solve and attempts.
// AI review is intentionally left for Phase 3.
function ensureScoringColumns() {
  const columns = [
    ['started_at', 'TEXT'],
    ['attempt_count', 'INTEGER DEFAULT 0'],
    ['solve_duration_seconds', 'REAL DEFAULT 0'],
    ['test_score', 'REAL DEFAULT 0'],
    ['time_score', 'REAL DEFAULT 0'],
    ['attempt_score', 'REAL DEFAULT 0'],
    ['final_score', 'REAL DEFAULT 0']
  ];

  const existing = new Set(db.prepare('PRAGMA table_info(submissions)').all().map(c => c.name));
  for (const [name, definition] of columns) {
    if (!existing.has(name)) {
      db.prepare(`ALTER TABLE submissions ADD COLUMN ${name} ${definition}`).run();
    }
  }
}

ensureScoringColumns();

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
    // Gradual penalty, never below 5 for a correct solution.
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

function recordAttempt({ userId, questionId, passedTests, totalTests, executionTimeMs, solved }) {
  const now = new Date();
  const nowIso = now.toISOString();
  let submission = db.prepare('SELECT * FROM submissions WHERE user_id=? AND question_id=?').get(userId, questionId);
  const question = db.prepare('SELECT estimated_time FROM questions WHERE id=?').get(questionId) || {};
  const assignment = db.prepare('SELECT assigned_at FROM assignments WHERE user_id=? AND question_id=?').get(userId, questionId);

  const startedAt = submission?.started_at || submission?.attempted_at || assignment?.assigned_at || nowIso;
  const startedMs = Date.parse(startedAt);
  const durationSeconds = Number.isFinite(startedMs) ? Math.max(0, (now.getTime() - startedMs) / 1000) : 0;
  const attempts = (submission?.attempt_count || 0) + 1;
  const score = calculateScore({
    passedTests,
    totalTests,
    durationSeconds,
    attempts,
    estimatedTime: question.estimated_time
  });

  if (!submission) {
    const id = require('uuid').v4();
    db.prepare(`INSERT INTO submissions
      (id,user_id,question_id,status,attempted_at,started_at,attempt_count,solve_duration_seconds,test_score,time_score,attempt_score,final_score,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      id, userId, questionId, solved ? 'solved' : 'attempted', nowIso, startedAt, attempts,
      solved ? durationSeconds : 0, score.test_score, score.time_score, score.attempt_score,
      score.final_score, nowIso, nowIso
    );
    submission = db.prepare('SELECT * FROM submissions WHERE id=?').get(id);
  } else {
    const existingSolved = ['solved', 'approved', 'completed'].includes(submission.status);
    const effectiveSolved = existingSolved || solved;
    db.prepare(`UPDATE submissions SET
      attempted_at=COALESCE(attempted_at, ?), started_at=COALESCE(started_at, ?), attempt_count=?,
      solve_duration_seconds=?, test_score=?, time_score=?, attempt_score=?, final_score=?,
      status=?, solved_at=CASE WHEN ? THEN COALESCE(solved_at, ?) ELSE solved_at END, updated_at=?
      WHERE id=?`).run(
      nowIso, startedAt, attempts, effectiveSolved ? durationSeconds : (submission.solve_duration_seconds || 0),
      score.test_score, score.time_score, score.attempt_score, score.final_score,
      effectiveSolved ? 'solved' : 'attempted', effectiveSolved ? 1 : 0, nowIso, nowIso, submission.id
    );
  }

  return db.prepare('SELECT * FROM submissions WHERE user_id=? AND question_id=?').get(userId, questionId);
}

module.exports = { ensureScoringColumns, calculateScore, recordAttempt };
