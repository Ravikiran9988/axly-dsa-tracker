const { db } = require('../db/db');
const { v4: uuidv4 } = require('uuid');
const { executeCode } = require('../services/executionService');
const { updateSubmission } = require('../services/submissionService');
const progressService = require('../services/progressService');
const { AppError } = require('../middleware/errorHandler');

/**
 * Run code against sample/public test cases or custom input (does NOT update progress)
 */
async function runCode(req, res, next) {
  try {
    const { question_id, language, source_code, custom_input } = req.body;

    const question = db.prepare('SELECT * FROM questions WHERE id = ? AND is_active = 1').get(question_id);
    if (!question) {
      throw new AppError('Question not found', 404, 'NOT_FOUND');
    }

    let testCasesToRun = [];

    if (custom_input !== undefined && custom_input !== null && custom_input.trim() !== '') {
      testCasesToRun = [
        {
          id: 'custom',
          input: custom_input,
          expected_output: '',
          is_hidden: 0
        }
      ];
    } else {
      // Fetch public test cases
      testCasesToRun = db.prepare(`
        SELECT id, input, expected_output, is_hidden 
        FROM test_cases 
        WHERE question_id = ? AND is_hidden = 0 
        ORDER BY created_at ASC
      `).all(question_id);

      // If no test cases in table, fallback to example_input/output
      if (testCasesToRun.length === 0 && question.example_input) {
        testCasesToRun = [
          {
            id: 'example-1',
            input: question.example_input,
            expected_output: question.example_output || '',
            is_hidden: 0
          }
        ];
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

/**
 * Submit solution: runs against ALL test cases (including hidden), updates progress status & logs
 */
async function submitSolution(req, res, next) {
  try {
    const { question_id, language, source_code } = req.body;
    const userId = req.user.id;

    const question = db.prepare('SELECT * FROM questions WHERE id = ? AND is_active = 1').get(question_id);
    if (!question) {
      throw new AppError('Question not found', 404, 'NOT_FOUND');
    }

    // Fetch all test cases
    let allTestCases = db.prepare(`
      SELECT id, input, expected_output, is_hidden 
      FROM test_cases 
      WHERE question_id = ? 
      ORDER BY is_hidden ASC, created_at ASC
    `).all(question_id);

    if (allTestCases.length === 0 && question.example_input) {
      allTestCases = [
        {
          id: 'example-1',
          input: question.example_input,
          expected_output: question.example_output || '',
          is_hidden: 0
        }
      ];
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

    // Update main user question submission (do not downgrade 'solved' to 'attempted')
    const currentSub = db.prepare('SELECT status FROM submissions WHERE user_id = ? AND question_id = ?').get(userId, question_id);
    const finalStatus = (currentSub?.status === 'solved' && !isAllPassed) ? 'solved' : newSubmissionStatus;

    const updatedSub = updateSubmission({
      question_id,
      user_id: userId,
      status: finalStatus
    });

    // Update detailed columns on submission
    db.prepare(`
      UPDATE submissions 
      SET language = ?, source_code = ?, passed_tests = ?, total_tests = ?, execution_time_ms = ?
      WHERE user_id = ? AND question_id = ?
    `).run(
      language,
      source_code,
      execResult.passed_tests,
      execResult.total_tests,
      execResult.execution_time_ms,
      userId,
      question_id
    );

    // Record historical submission in log
    const logId = uuidv4();
    db.prepare(`
      INSERT INTO code_submissions_log (id, user_id, question_id, language, source_code, status, passed_tests, total_tests, execution_time_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      logId,
      userId,
      question_id,
      language,
      source_code,
      execResult.status,
      execResult.passed_tests,
      execResult.total_tests,
      execResult.execution_time_ms
    );

    // Fetch updated user progress
    const progress = progressService.getUserProgress(userId);

    return res.status(200).json({
      data: {
        submission_id: logId,
        question_id,
        language,
        status: execResult.status,
        passed_tests: execResult.passed_tests,
        total_tests: execResult.total_tests,
        execution_time_ms: execResult.execution_time_ms,
        submission_status: finalStatus,
        results: execResult.results,
        progress
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get user's past submission history for a problem
 */
async function getSubmissionsHistory(req, res, next) {
  try {
    const { question_id } = req.params;
    const userId = req.user.id;

    const history = db.prepare(`
      SELECT id, question_id, language, source_code, status, passed_tests, total_tests, execution_time_ms, created_at
      FROM code_submissions_log
      WHERE user_id = ? AND question_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `).all(userId, question_id);

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
