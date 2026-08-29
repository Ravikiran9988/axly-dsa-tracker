const { getRepository } = require('../db/repositoryFactory');
const { v4: uuidv4 } = require('uuid');
const { executeCode } = require('../services/executionService');
const { updateSubmission } = require('../services/submissionService');
const { recordAttempt } = require('../services/scoringService');
const progressService = require('../services/progressService');
const practiceService = require('../services/practiceService');
const gamificationService = require('../services/gamificationService');
const { AppError } = require('../middleware/errorHandler');

const repo = getRepository();

/** Run code against public/sample test cases or custom input without updating progress. */
async function runCode(req, res, next) {
  try {
    const { question_id, language, source_code, custom_input } = req.body;
    let question = await repo.one(
      'SELECT * FROM questions WHERE id = ? AND (is_active = 1 OR is_active = TRUE)',
      [question_id]
    );
    let isDailyChallenge = false;

    if (!question) {
      const dc = await repo.one(
        'SELECT * FROM daily_challenge_problems WHERE id = ? AND (is_active = 1 OR is_active = TRUE)',
        [question_id]
      );
      if (!dc) throw new AppError('Question not found', 404, 'NOT_FOUND');
      question = dc;
      isDailyChallenge = true;
    }

    let testCasesToRun = [];
    if (custom_input !== undefined && custom_input !== null && custom_input.trim() !== '') {
      testCasesToRun = [{ id: 'custom', input: custom_input, expected_output: '', is_hidden: 0 }];
    } else {
      const tcSql = isDailyChallenge
        ? 'SELECT id, input, expected_output, is_hidden FROM daily_challenge_test_cases WHERE challenge_id = ? AND (is_hidden = 0 OR is_hidden = FALSE) ORDER BY created_at ASC'
        : 'SELECT id, input, expected_output, is_hidden FROM test_cases WHERE question_id = ? AND (is_hidden = 0 OR is_hidden = FALSE) ORDER BY created_at ASC';
      testCasesToRun = await repo.many(tcSql, [question_id]);
      if (testCasesToRun.length === 0 && question.example_input) {
        testCasesToRun = [{ id: 'example-1', input: question.example_input, expected_output: question.example_output || '', is_hidden: 0 }];
      }
    }
    if (testCasesToRun.length === 0) {
      testCasesToRun = [{ id: 'sample', input: '', expected_output: '', is_hidden: 0 }];
    }

    const execResult = await executeCode({
      language,
      sourceCode: source_code,
      testCases: testCasesToRun,
      isSubmit: false
    });

    return res.status(200).json({
      data: {
        question_id,
        language,
        status: execResult.status,
        passed_tests: execResult.passed_tests,
        total_tests: execResult.total_tests,
        execution_time_ms: execResult.execution_time_ms,
        results: execResult.results
      }
    });
  } catch (err) {
    next(err);
  }
}

/** Submit against all tests. Practice submissions update practice progress but never competitive scoring. */
async function submitSolution(req, res, next) {
  try {
    const { question_id, language, source_code } = req.body;
    const userId = req.user.id;
    let question = await repo.one(
      'SELECT * FROM questions WHERE id = ? AND (is_active = 1 OR is_active = TRUE)',
      [question_id]
    );
    let isDailyChallenge = false;

    if (!question) {
      const dc = await repo.one(
        'SELECT * FROM daily_challenge_problems WHERE id = ? AND (is_active = 1 OR is_active = TRUE)',
        [question_id]
      );
      if (!dc) throw new AppError('Question not found', 404, 'NOT_FOUND');
      question = dc;
      isDailyChallenge = true;
    }

    const allTcSql = isDailyChallenge
      ? 'SELECT id, input, expected_output, is_hidden FROM daily_challenge_test_cases WHERE challenge_id = ? ORDER BY is_hidden ASC, created_at ASC'
      : 'SELECT id, input, expected_output, is_hidden FROM test_cases WHERE question_id = ? ORDER BY is_hidden ASC, created_at ASC';

    let allTestCases = await repo.many(allTcSql, [question_id]);
    if (allTestCases.length === 0 && question.example_input) {
      allTestCases = [{ id: 'example-1', input: question.example_input, expected_output: question.example_output || '', is_hidden: 0 }];
    }
    if (allTestCases.length === 0) {
      allTestCases = [{ id: 'sample', input: '', expected_output: '', is_hidden: 0 }];
    }

    const execResult = await executeCode({
      language,
      sourceCode: source_code,
      testCases: allTestCases,
      isSubmit: true
    });

    const isAllPassed = execResult.status === 'Accepted' && execResult.passed_tests === allTestCases.length;
    const newSubmissionStatus = isAllPassed ? 'solved' : 'attempted';
    const reviewStatus = isAllPassed ? 'approved' : 'pending';
    const logId = uuidv4();
    const nowIso = new Date().toISOString();

    await repo.execute(`
      INSERT INTO code_submissions_log (
        id, user_id, question_id, language, source_code, status, passed_tests, total_tests, execution_time_ms, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [logId, userId, question_id, language, source_code, execResult.status, execResult.passed_tests, allTestCases.length, execResult.execution_time_ms, nowIso]);

    // Upsert into submissions table so that submissions history has complete record
    const existingSub = await repo.one(
      'SELECT id, status, review_status, attempted_at, started_at, solved_at FROM submissions WHERE user_id = ? AND question_id = ?',
      [userId, question_id]
    );

    const finalStatus = (['solved', 'approved', 'completed'].includes(existingSub?.status) && !isAllPassed)
      ? existingSub.status
      : newSubmissionStatus;
    const finalReviewStatus = (['approved'].includes(existingSub?.review_status) && !isAllPassed)
      ? existingSub.review_status
      : reviewStatus;

    const solvedAt = isAllPassed ? (existingSub?.solved_at || nowIso) : (existingSub?.solved_at || null);

    if (existingSub) {
      await repo.execute(`
        UPDATE submissions SET
          submission_type = 'code',
          language = ?,
          source_code = ?,
          status = ?,
          review_status = ?,
          passed_tests = ?,
          total_tests = ?,
          execution_time_ms = ?,
          attempted_at = COALESCE(attempted_at, ?),
          solved_at = ?,
          updated_at = ?
        WHERE id = ?
      `, [
        language,
        source_code,
        finalStatus,
        finalReviewStatus,
        execResult.passed_tests,
        allTestCases.length,
        execResult.execution_time_ms,
        nowIso,
        solvedAt,
        nowIso,
        existingSub.id
      ]);
    } else {
      const subId = uuidv4();
      await repo.execute(`
        INSERT INTO submissions (
          id, user_id, question_id, submission_type, language, source_code,
          status, review_status, passed_tests, total_tests, execution_time_ms,
          attempted_at, started_at, solved_at, created_at, updated_at
        ) VALUES (?, ?, ?, 'code', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        subId,
        userId,
        question_id,
        language,
        source_code,
        finalStatus,
        finalReviewStatus,
        execResult.passed_tests,
        allTestCases.length,
        execResult.execution_time_ms,
        nowIso,
        nowIso,
        isAllPassed ? nowIso : null,
        nowIso,
        nowIso
      ]);
    }

    // Create submission notification
    try {
      const notificationService = require('../services/notificationService');
      const qTitle = question?.title || 'Coding Challenge';
      const qLink = question?.is_practice ? '/practice' : '/daily-challenge';
      if (isAllPassed) {
        await notificationService.createNotification({
          userId,
          title: `Submission Accepted: ${qTitle}`,
          message: `All ${execResult.passed_tests}/${allTestCases.length} test cases passed (${Math.round(execResult.execution_time_ms)}ms). Solution verified.`,
          category: 'submission',
          type: 'submission_accepted',
          link: qLink
        });
      } else {
        await notificationService.createNotification({
          userId,
          title: `Submission Attempted: ${qTitle}`,
          message: `Passed ${execResult.passed_tests}/${allTestCases.length} test cases. Review your logic and try again!`,
          category: 'submission',
          type: 'submission_failed',
          link: qLink
        });
      }
    } catch (_) {}

    if (question.is_practice) {
      await practiceService.recordPracticeSubmission({
        user: req.user,
        questionId: question_id,
        submissionId: logId,
        passed: isAllPassed
      });
      const practice = await practiceService.getPracticeProblem({ user: req.user, questionId: question_id });

      let awardResult = { pointsAwarded: 0, breakdown: null };
      if (isAllPassed) {
        awardResult = await gamificationService.awardPracticeSolve(userId, question_id);
      }

      return res.status(200).json({
        data: {
          submission_id: logId,
          question_id,
          language,
          status: execResult.status,
          passed_tests: execResult.passed_tests,
          total_tests: allTestCases.length,
          execution_time_ms: execResult.execution_time_ms,
          submission_status: practice.practice_status,
          results: execResult.results,
          points_awarded: awardResult.pointsAwarded,
          score_breakdown: awardResult.breakdown,
          scoring: awardResult.breakdown ? {
            practice_points: awardResult.breakdown.practice_points,
            total_score: awardResult.breakdown.total_score,
            leaderboard_score: awardResult.breakdown.leaderboard_score,
            points_awarded: awardResult.pointsAwarded
          } : null,
          practice_progress: practice
        }
      });
    }

    await recordAttempt({
      userId,
      questionId: question_id,
      passedTests: execResult.passed_tests,
      totalTests: allTestCases.length,
      executionTimeMs: execResult.execution_time_ms,
      solved: isAllPassed
    });

    await updateSubmission({ question_id, user_id: userId, status: finalStatus });

    let dcAwardResult = null;
    if (isAllPassed) {
      dcAwardResult = await gamificationService.awardDailyChallengeSolve(userId, question_id, existingSub?.started_at);
    }

    const progress = await progressService.getUserProgress(userId);
    const refreshed = await repo.one(
      'SELECT * FROM submissions WHERE user_id = ? AND question_id = ?',
      [userId, question_id]
    );

    return res.status(200).json({
      data: {
        submission_id: logId,
        question_id,
        language,
        status: execResult.status,
        passed_tests: execResult.passed_tests,
        total_tests: allTestCases.length,
        execution_time_ms: execResult.execution_time_ms,
        submission_status: finalStatus,
        results: execResult.results,
        points_awarded: dcAwardResult?.pointsAwarded || 0,
        streak_bonus_awarded: dcAwardResult?.streakBonusAwarded || 0,
        score_breakdown: dcAwardResult?.breakdown || null,
        scoring: {
          test_score: refreshed?.test_score || 0,
          time_score: refreshed?.time_score || 0,
          attempt_score: refreshed?.attempt_score || 0,
          final_score: refreshed?.final_score || 0,
          attempt_count: refreshed?.attempt_count || 1,
          solve_duration_seconds: refreshed?.solve_duration_seconds || 0,
          score_max: 100,
          points_awarded: dcAwardResult?.pointsAwarded || 0,
          streak_bonus_awarded: dcAwardResult?.streakBonusAwarded || 0,
          total_score: dcAwardResult?.breakdown?.total_score,
          leaderboard_score: dcAwardResult?.breakdown?.leaderboard_score
        },
        progress
      }
    });
  } catch (err) {
    next(err);
  }
}

async function getSubmissionsHistory(req, res, next) {
  try {
    const { question_id } = req.params;
    const userId = req.user.id;
    const history = await repo.many(`
      SELECT id, question_id, language, source_code, status, passed_tests, total_tests, execution_time_ms, created_at
      FROM code_submissions_log
      WHERE user_id = ? AND question_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `, [userId, question_id]);
    return res.status(200).json({ data: history });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  runCode,
  submitSolution,
  getSubmissionsHistory
};
