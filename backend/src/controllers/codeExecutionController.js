const { getRepository } = require('../db/repositoryFactory');
const { v4: uuidv4 } = require('uuid');
const { executeCode } = require('../services/executionService');
const { updateSubmission } = require('../services/submissionService');
const { recordAttempt } = require('../services/scoringService');
const progressService = require('../services/progressService');
const practiceService = require('../services/practiceService');
const { AppError } = require('../middleware/errorHandler');

const repo = getRepository();

/** Run code against public/sample test cases or custom input without updating progress. */
async function runCode(req, res, next) {
  try {
    const { question_id, language, source_code, custom_input } = req.body;
    const question = await repo.one(
      'SELECT * FROM questions WHERE id = ? AND (is_active = 1 OR is_active = TRUE)',
      [question_id]
    );
    if (!question) throw new AppError('Question not found', 404, 'NOT_FOUND');

    let testCasesToRun = [];
    if (custom_input !== undefined && custom_input !== null && custom_input.trim() !== '') {
      testCasesToRun = [{ id: 'custom', input: custom_input, expected_output: '', is_hidden: 0 }];
    } else {
      testCasesToRun = await repo.many(
        'SELECT id, input, expected_output, is_hidden FROM test_cases WHERE question_id = ? AND (is_hidden = 0 OR is_hidden = FALSE) ORDER BY created_at ASC',
        [question_id]
      );
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
    const question = await repo.one(
      'SELECT * FROM questions WHERE id = ? AND (is_active = 1 OR is_active = TRUE)',
      [question_id]
    );
    if (!question) throw new AppError('Question not found', 404, 'NOT_FOUND');

    let allTestCases = await repo.many(
      'SELECT id, input, expected_output, is_hidden FROM test_cases WHERE question_id = ? ORDER BY is_hidden ASC, created_at ASC',
      [question_id]
    );
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
    const logId = uuidv4();
    const nowIso = new Date().toISOString();

    await repo.execute(`
      INSERT INTO code_submissions_log (
        id, user_id, question_id, language, source_code, status, passed_tests, total_tests, execution_time_ms, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [logId, userId, question_id, language, source_code, execResult.status, execResult.passed_tests, allTestCases.length, execResult.execution_time_ms, nowIso]);

    if (question.is_practice) {
      // Practice has no competitive score, streak points, or leaderboard impact.
      await practiceService.recordPracticeSubmission({
        user: req.user,
        questionId: question_id,
        submissionId: logId,
        passed: isAllPassed
      });
      const practice = await practiceService.getPracticeProblem({ user: req.user, questionId: question_id });

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
          scoring: null,
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

    const currentSub = await repo.one(
      'SELECT status FROM submissions WHERE user_id = ? AND question_id = ?',
      [userId, question_id]
    );
    const finalStatus = (['solved', 'approved', 'completed'].includes(currentSub?.status) && !isAllPassed)
      ? currentSub.status
      : newSubmissionStatus;

    await updateSubmission({ question_id, user_id: userId, status: finalStatus });

    await repo.execute(`
      UPDATE submissions SET
        language = ?,
        source_code = ?,
        passed_tests = ?,
        total_tests = ?,
        execution_time_ms = ?,
        updated_at = ?
      WHERE user_id = ? AND question_id = ?
    `, [language, source_code, execResult.passed_tests, allTestCases.length, execResult.execution_time_ms, nowIso, userId, question_id]);

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
        scoring: {
          test_score: refreshed?.test_score || 0,
          time_score: refreshed?.time_score || 0,
          attempt_score: refreshed?.attempt_score || 0,
          final_score: refreshed?.final_score || 0,
          attempt_count: refreshed?.attempt_count || 1,
          solve_duration_seconds: refreshed?.solve_duration_seconds || 0,
          score_max: 100
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
