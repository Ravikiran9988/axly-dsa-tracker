const { getRepository } = require('../db/repositoryFactory');
const { v4: uuidv4 } = require('uuid');
const { AppError } = require('../middleware/errorHandler');
const {
  getCanonicalUtcDate,
  getNextCanonicalUtcDate,
  isValidDateString
} = require('../utils/dateUtils');
const {
  generateDailyChallenge,
  validateDailyChallenge,
  checkDuplicateChallenge,
  verifyReferenceSolution
} = require('./aiDailyChallengeService');
const { createDailyChallenge, assertDateAvailable } = require('./dailyChallengeService');

function getRepo() {
  return getRepository();
}

/**
 * Get current Daily Challenge Automation Settings
 */
async function getAutomationSettings() {
  const row = await getRepo().one('SELECT * FROM daily_challenge_automation_settings WHERE id = ?', ['global-settings']);
  if (!row) {
    return {
      id: 'global-settings',
      mode: 'ai_assist',
      is_enabled: 1,
      target_hour_utc: 0,
      retry_limit: 3,
      last_run_at: null,
      last_run_status: null,
      next_run_at: null
    };
  }
  return {
    ...row,
    is_enabled: Boolean(row.is_enabled)
  };
}

/**
 * Update Daily Challenge Automation Settings
 */
async function updateAutomationSettings({ mode, is_enabled, retry_limit }) {
  const current = await getAutomationSettings();
  const nextMode = mode && ['manual', 'ai_assist', 'auto_fill'].includes(mode) ? mode : current.mode;
  const nextEnabled = is_enabled !== undefined ? (is_enabled ? 1 : 0) : current.is_enabled;
  const nextRetryLimit = Number(retry_limit) > 0 ? Number(retry_limit) : current.retry_limit;

  await getRepo().execute(`
    UPDATE daily_challenge_automation_settings
    SET mode = ?, is_enabled = ?, retry_limit = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = 'global-settings'
  `, [nextMode, nextEnabled, nextRetryLimit]);

  return getAutomationSettings();
}

/**
 * Get Automation Run Logs
 */
async function getAutomationLogs(limit = 20) {
  const l = Math.max(1, Math.min(100, Number(limit) || 20));
  const logs = await getRepo().many(`
    SELECT al.*, dc.title AS challenge_title, dc.difficulty AS challenge_difficulty
    FROM daily_challenge_automation_logs al
    LEFT JOIN daily_challenge_problems dc ON al.challenge_id = dc.id
    ORDER BY al.created_at DESC
    LIMIT ?
  `, [l]);

  return logs.map(log => ({
    ...log,
    validation_result: log.validation_result || 'Passed',
    sandbox_result: log.sandbox_result || 'Passed'
  }));
}

/**
 * Execute the Daily Challenge Automation Pipeline
 * 
 * Runs daily at 00:00 UTC targeting NEXT calendar day (or triggered via Run Auto-Fill Now).
 * Flow:
 * 1. Determine target date (tomorrow canonical UTC).
 * 2. Check if valid challenge already exists for target date -> if yes, stop safely.
 * 3. Loop up to 3 attempts: Generate AI -> Validate -> Duplicate check -> Sandbox test.
 * 4. On pass -> Save and Schedule/Draft according to mode.
 * 5. On failure -> Safe log and admin notification.
 */
async function runAutomationPipeline(options = {}) {
  const {
    targetDate: customTargetDate = null,
    force = false,
    adminId = 'usr-admin-01'
  } = options;

  const targetDate = customTargetDate || getNextCanonicalUtcDate();
  if (!isValidDateString(targetDate)) {
    throw new AppError('Invalid target date format for automation (expected YYYY-MM-DD)', 400, 'VALIDATION_ERROR');
  }

  const settings = await getAutomationSettings();

  if (!force && (!settings.is_enabled || settings.mode === 'manual')) {
    const logId = `auto-log-${uuidv4().slice(0, 8)}`;
    await getRepo().execute(`
      INSERT INTO daily_challenge_automation_logs (
        id, target_date, mode, attempt_count, validation_result, sandbox_result,
        status, failure_category, details, created_at
      ) VALUES (?, ?, ?, 0, 'Skipped', 'Skipped', 'skipped', 'DISABLED_MODE', ?, CURRENT_TIMESTAMP)
    `, [logId, targetDate, settings.mode, `Automation is set to ${settings.mode} mode or disabled.`]);

    return {
      success: true,
      status: 'skipped',
      message: `Automation skipped: system is in ${settings.mode} mode.`,
      target_date: targetDate
    };
  }

  // Check if a valid published/scheduled challenge already exists for targetDate
  const existingChallenge = await getRepo().one(`
    SELECT id, title, status, scheduled_date
    FROM daily_challenge_problems
    WHERE scheduled_date = ? AND status IN ('published', 'scheduled') AND (is_active = 1 OR is_active = TRUE)
  `, [targetDate]);

  if (existingChallenge) {
    const logId = `auto-log-${uuidv4().slice(0, 8)}`;
    await getRepo().execute(`
      INSERT INTO daily_challenge_automation_logs (
        id, target_date, mode, attempt_count, validation_result, sandbox_result,
        status, challenge_id, details, created_at
      ) VALUES (?, ?, ?, 0, 'Passed', 'Passed', 'skipped', ?, ?, CURRENT_TIMESTAMP)
    `, [logId, targetDate, settings.mode, existingChallenge.id, `Target date ${targetDate} already has an active challenge ("${existingChallenge.title}").`]);

    return {
      success: true,
      status: 'skipped',
      message: `Challenge already exists for ${targetDate} ("${existingChallenge.title}"). No action required.`,
      challenge: existingChallenge,
      target_date: targetDate
    };
  }

  const maxAttempts = settings.retry_limit || 3;
  let lastFailureReason = 'Unknown failure during AI synthesis';
  let lastFailureCategory = 'UNKNOWN';
  let successfulChallenge = null;
  let attemptCount = 0;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    attemptCount = attempt;
    try {
      // 1. AI Generation
      const aiResult = await generateDailyChallenge({
        topic: 'Surprise Me',
        difficulty: attempt === 1 ? 'medium' : attempt === 2 ? 'easy' : 'hard',
        scheduled_date: targetDate,
        skipSandbox: false
      });

      if (!aiResult || !aiResult.data) {
        lastFailureReason = 'AI generation returned empty payload';
        lastFailureCategory = 'AI_EMPTY_RESPONSE';
        continue;
      }

      const generated = aiResult.data;

      // 2. Schema Validation
      const validation = validateDailyChallenge(generated);
      if (!validation.isValid) {
        lastFailureReason = `Validation failed: ${validation.errors.join(', ')}`;
        lastFailureCategory = 'VALIDATION_FAILED';
        continue;
      }

      // 3. Duplicate Detection
      const dupCheck = await checkDuplicateChallenge(generated.title, generated.description);
      if (dupCheck.isDuplicate) {
        lastFailureReason = `Duplicate collision detected: ${dupCheck.reason}`;
        lastFailureCategory = 'DUPLICATE_COLLISION';
        continue;
      }

      // 4. Sandbox Verification
      const sandboxRes = await verifyReferenceSolution(generated);
      if (!sandboxRes.verified) {
        lastFailureReason = `Sandbox verification failed: ${sandboxRes.reason}`;
        lastFailureCategory = 'SANDBOX_FAILED';
        continue;
      }

      // 5. Concurrency Check: re-verify date availability before creating
      try {
        await assertDateAvailable(targetDate);
      } catch (dateErr) {
        lastFailureReason = `Date became unavailable mid-pipeline: ${dateErr.message}`;
        lastFailureCategory = 'DATE_CONFLICT';
        break; // Stop immediately if manual admin operation claimed the date
      }

      // 6. Save Challenge
      const targetStatus = settings.mode === 'auto_fill' ? 'scheduled' : 'draft';
      const created = await createDailyChallenge({
        ...generated,
        status: targetStatus,
        scheduled_date: targetDate,
        created_via: 'ai'
      }, adminId);

      successfulChallenge = created;
      break; // Successfully generated, validated, and saved!
    } catch (err) {
      lastFailureReason = err.message || 'Error occurred during generation attempt';
      lastFailureCategory = err.code || 'PIPELINE_ERROR';
    }
  }

  const logId = `auto-log-${uuidv4().slice(0, 8)}`;
  const nowIso = new Date().toISOString();

  if (successfulChallenge) {
    await getRepo().execute(`
      INSERT INTO daily_challenge_automation_logs (
        id, target_date, mode, attempt_count, validation_result, sandbox_result,
        status, challenge_id, details, created_at
      ) VALUES (?, ?, ?, ?, 'Passed', 'Passed', 'success', ?, ?, CURRENT_TIMESTAMP)
    `, [
      logId,
      targetDate,
      settings.mode,
      attemptCount,
      successfulChallenge.id,
      `Successfully generated, validated, sandbox-verified and ${successfulChallenge.status} challenge for ${targetDate}.`
    ]);

    await getRepo().execute(`
      UPDATE daily_challenge_automation_settings
      SET last_run_at = ?, last_run_status = 'success', updated_at = CURRENT_TIMESTAMP
      WHERE id = 'global-settings'
    `, [nowIso]);

    return {
      success: true,
      status: 'success',
      target_date: targetDate,
      attempts: attemptCount,
      challenge: successfulChallenge,
      message: `Daily challenge successfully generated and set to ${successfulChallenge.status} for ${targetDate}.`
    };
  }

  // All attempts failed
  await getRepo().execute(`
    INSERT INTO daily_challenge_automation_logs (
      id, target_date, mode, attempt_count, validation_result, sandbox_result,
      status, failure_category, details, created_at
    ) VALUES (?, ?, ?, ?, 'Failed', 'Failed', 'failed', ?, ?, CURRENT_TIMESTAMP)
  `, [
    logId,
    targetDate,
    settings.mode,
    attemptCount,
    lastFailureCategory,
    `Automatic challenge generation failed after ${attemptCount} attempts. Admin action required.`
  ]);

  await getRepo().execute(`
    UPDATE daily_challenge_automation_settings
    SET last_run_at = ?, last_run_status = 'failed', updated_at = CURRENT_TIMESTAMP
    WHERE id = 'global-settings'
  `, [nowIso]);

  return {
    success: false,
    status: 'failed',
    target_date: targetDate,
    attempts: attemptCount,
    error: 'Automatic challenge generation failed. Admin action required.',
    failure_category: lastFailureCategory
  };
}

module.exports = {
  getAutomationSettings,
  updateAutomationSettings,
  getAutomationLogs,
  runAutomationPipeline
};
