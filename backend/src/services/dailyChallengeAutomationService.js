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
const { createDailyChallenge } = require('./dailyChallengeService');

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
      is_enabled: true,
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
  const nextEnabled = is_enabled !== undefined ? Boolean(is_enabled) : Boolean(current.is_enabled);
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

// =========================================================================
// 1. MANUAL ADMIN: RUN AUTO-FILL NOW (source: "manual_admin")
// ALWAYS generates a NEW Draft with scheduled_date = NULL.
// Never skips due to existing dates. Existing challenges remain untouched.
// =========================================================================
async function runAdminAutoFillNow(options = {}) {
  const {
    adminId = 'usr-admin-01',
    difficulty = null,
    topic = 'Surprise Me'
  } = options;

  const settings = await getAutomationSettings();
  const maxAttempts = settings.retry_limit || 3;
  let lastFailureReason = 'Unknown failure during AI synthesis';
  let lastFailureCategory = 'UNKNOWN';
  let createdDraft = null;
  let attemptCount = 0;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    attemptCount = attempt;
    try {
      // 1. AI Generation via LLM router
      const selectedDifficulty = difficulty || (attempt === 1 ? 'medium' : attempt === 2 ? 'easy' : 'hard');
      const aiResult = await generateDailyChallenge({
        topic: topic || 'Surprise Me',
        difficulty: selectedDifficulty,
        scheduled_date: null,
        skipSandbox: false
      });

      if (!aiResult || !aiResult.data) {
        lastFailureReason = 'AI generation returned empty payload';
        lastFailureCategory = 'AI_EMPTY_RESPONSE';
        continue;
      }

      const generated = aiResult.data;

      // 2. Schema & Structure Validation
      const validation = validateDailyChallenge(generated);
      if (!validation.isValid) {
        lastFailureReason = `Validation failed: ${validation.errors.join(', ')}`;
        lastFailureCategory = 'VALIDATION_FAILED';
        continue;
      }

      // 3. Content Duplicate Check (Daily Challenges + Practice Problems)
      const dupCheck = await checkDuplicateChallenge(generated);
      if (dupCheck.isDuplicate) {
        lastFailureReason = `Content duplicate detected: ${dupCheck.reason}`;
        lastFailureCategory = 'DUPLICATE_COLLISION';
        continue;
      }

      // 4. Sandbox Verification of Reference Solution
      const sandboxRes = await verifyReferenceSolution(generated);
      if (!sandboxRes.verified) {
        lastFailureReason = `Sandbox verification failed: ${sandboxRes.reason}`;
        lastFailureCategory = 'SANDBOX_FAILED';
        continue;
      }

      // 5. SAVE AS DRAFT WITH scheduled_date = NULL
      // The new Draft does NOT claim or overwrite any calendar date.
      const created = await createDailyChallenge({
        ...generated,
        status: 'draft',
        scheduled_date: null,
        created_via: 'ai'
      }, adminId);

      createdDraft = created;
      break;
    } catch (err) {
      lastFailureReason = err.message || 'Error occurred during generation attempt';
      lastFailureCategory = err.code || 'PIPELINE_ERROR';
    }
  }

  const logId = `auto-log-${uuidv4().slice(0, 8)}`;
  const nowIso = new Date().toISOString();
  const logTargetDate = getCanonicalUtcDate();

  if (createdDraft) {
    await getRepo().execute(`
      INSERT INTO daily_challenge_automation_logs (
        id, target_date, mode, attempt_count, validation_result, sandbox_result,
        status, challenge_id, details, created_at
      ) VALUES (?, ?, 'manual_admin', ?, 'Passed', 'Passed', 'success', ?, ?, CURRENT_TIMESTAMP)
    `, [
      logId,
      logTargetDate,
      attemptCount,
      createdDraft.id,
      `AI challenge "${createdDraft.title}" generated successfully and saved as Draft (scheduled_date = NULL).`
    ]);

    await getRepo().execute(`
      UPDATE daily_challenge_automation_settings
      SET last_run_at = ?, last_run_status = 'success', updated_at = CURRENT_TIMESTAMP
      WHERE id = 'global-settings'
    `, [nowIso]);

    return {
      success: true,
      status: 'success',
      attempts: attemptCount,
      challenge: {
        id: createdDraft.id,
        title: createdDraft.title,
        difficulty: createdDraft.difficulty,
        topic: createdDraft.topic,
        pattern: createdDraft.pattern,
        status: createdDraft.status,
        created_via: createdDraft.created_via,
        scheduled_date: createdDraft.scheduled_date || null
      },
      message: 'AI challenge generated successfully and saved as Draft.'
    };
  }

  // All attempts failed
  await getRepo().execute(`
    INSERT INTO daily_challenge_automation_logs (
      id, target_date, mode, attempt_count, validation_result, sandbox_result,
      status, failure_category, details, created_at
    ) VALUES (?, ?, 'manual_admin', ?, 'Failed', 'Failed', 'failed', ?, ?, CURRENT_TIMESTAMP)
  `, [
    logId,
    logTargetDate,
    attemptCount,
    lastFailureCategory,
    `Admin Auto-Fill generation failed after ${attemptCount} attempts (${lastFailureReason}).`
  ]);

  await getRepo().execute(`
    UPDATE daily_challenge_automation_settings
    SET last_run_at = ?, last_run_status = 'failed', updated_at = CURRENT_TIMESTAMP
    WHERE id = 'global-settings'
  `, [nowIso]);

  return {
    success: false,
    status: 'failed',
    attempts: attemptCount,
    error: lastFailureCategory === 'DUPLICATE_COLLISION'
      ? 'Unable to generate a sufficiently unique challenge. Please try again.'
      : `AI generation failed after ${attemptCount} attempts (${lastFailureReason}).`,
    failure_category: lastFailureCategory
  };
}

// =========================================================================
// 2. SCHEDULED AUTOMATION: AUTO_FILL / AI_ASSIST (source: "scheduled_automation")
// Runs daily at 00:00 UTC targeting TOMORROW.
// If tomorrow already has a challenge -> returns SUCCESS_NOOP (no-op).
// If tomorrow is empty -> generates, validates, sandbox-tests, and publishes/drafts.
// =========================================================================
async function runDailyScheduledAutomation() {
  const tomorrowUtc = getNextCanonicalUtcDate();
  const settings = await getAutomationSettings();

  // If automation is disabled or set to manual, skip safely with SUCCESS_NOOP
  if (!settings.is_enabled || settings.mode === 'manual') {
    const logId = `auto-log-${uuidv4().slice(0, 8)}`;
    await getRepo().execute(`
      INSERT INTO daily_challenge_automation_logs (
        id, target_date, mode, attempt_count, validation_result, sandbox_result,
        status, failure_category, details, created_at
      ) VALUES (?, ?, ?, 0, 'Skipped', 'Skipped', 'skipped', 'DISABLED_MODE', ?, CURRENT_TIMESTAMP)
    `, [logId, tomorrowUtc, settings.mode, `Scheduled automation skipped: system is in ${settings.mode} mode.`]);

    return {
      success: true,
      status: 'SUCCESS_NOOP',
      target_date: tomorrowUtc,
      message: `Scheduled automation skipped: mode is ${settings.mode}.`
    };
  }

  // Check if tomorrow already has an active scheduled/published challenge
  const existingChallenge = await getRepo().one(`
    SELECT id, title, status, scheduled_date
    FROM daily_challenge_problems
    WHERE scheduled_date = ? AND status != 'archived' AND is_active = TRUE
  `, [tomorrowUtc]);

  if (existingChallenge) {
    const logId = `auto-log-${uuidv4().slice(0, 8)}`;
    await getRepo().execute(`
      INSERT INTO daily_challenge_automation_logs (
        id, target_date, mode, attempt_count, validation_result, sandbox_result,
        status, challenge_id, details, created_at
      ) VALUES (?, ?, ?, 0, 'Passed', 'Passed', 'skipped', ?, ?, CURRENT_TIMESTAMP)
    `, [
      logId,
      tomorrowUtc,
      settings.mode,
      existingChallenge.id,
      `Target date ${tomorrowUtc} already has an active challenge ("${existingChallenge.title}"). Preserved existing challenge.`
    ]);

    return {
      success: true,
      status: 'SUCCESS_NOOP',
      target_date: tomorrowUtc,
      challenge: existingChallenge,
      message: `Challenge already exists for ${tomorrowUtc}. No action required.`
    };
  }

  // Loop retry attempts (up to 3)
  const maxAttempts = settings.retry_limit || 3;
  let lastFailureReason = 'Unknown failure';
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
        scheduled_date: tomorrowUtc,
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

      // 3. Content Duplicate Check
      const dupCheck = await checkDuplicateChallenge(generated);
      if (dupCheck.isDuplicate) {
        lastFailureReason = `Content duplicate detected: ${dupCheck.reason}`;
        lastFailureCategory = 'DUPLICATE_COLLISION';
        continue;
      }

      // 4. Sandbox Verification of Reference Solution
      const sandboxRes = await verifyReferenceSolution(generated);
      if (!sandboxRes.verified) {
        lastFailureReason = `Sandbox verification failed: ${sandboxRes.reason}`;
        lastFailureCategory = 'SANDBOX_FAILED';
        continue;
      }

      // 5. Schedule & Publish for Tomorrow (mode determines scheduled vs draft)
      const targetStatus = settings.mode === 'auto_fill' ? 'scheduled' : 'draft';
      const created = await createDailyChallenge({
        ...generated,
        status: targetStatus,
        scheduled_date: tomorrowUtc,
        created_via: 'ai'
      }, 'usr-system-cron');

      successfulChallenge = created;
      break;
    } catch (err) {
      lastFailureReason = err.message || 'Error occurred during generation';
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
      tomorrowUtc,
      settings.mode,
      attemptCount,
      successfulChallenge.id,
      `Tomorrow's Daily Challenge was generated and published successfully for ${tomorrowUtc}.`
    ]);

    await getRepo().execute(`
      UPDATE daily_challenge_automation_settings
      SET last_run_at = ?, last_run_status = 'success', updated_at = CURRENT_TIMESTAMP
      WHERE id = 'global-settings'
    `, [nowIso]);

    return {
      success: true,
      status: 'SUCCESS',
      target_date: tomorrowUtc,
      attempts: attemptCount,
      challenge: successfulChallenge,
      message: "Tomorrow's Daily Challenge was generated and published successfully."
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
    tomorrowUtc,
    settings.mode,
    attemptCount,
    lastFailureCategory,
    `Automated 00:00 UTC generation failed after ${attemptCount} attempts (${lastFailureReason}). Admin review required.`
  ]);

  await getRepo().execute(`
    UPDATE daily_challenge_automation_settings
    SET last_run_at = ?, last_run_status = 'failed', updated_at = CURRENT_TIMESTAMP
    WHERE id = 'global-settings'
  `, [nowIso]);

  return {
    success: false,
    status: 'failed',
    target_date: tomorrowUtc,
    attempts: attemptCount,
    error: `Automated daily challenge generation failed after ${attemptCount} attempts.`,
    failure_category: lastFailureCategory
  };
}

/**
 * Unified pipeline entry point with backend source enforcement
 */
async function runAutomationPipeline(options = {}) {
  const { source = 'scheduled_automation', force = false } = options;

  if (source === 'manual_admin' || force) {
    return runAdminAutoFillNow(options);
  }

  return runDailyScheduledAutomation();
}

// =========================================================================
// BACKGROUND SCHEDULER (00:00 UTC Daily Trigger)
// =========================================================================
let schedulerTimer = null;

function getMsUntilNextUtcMidnight() {
  const now = new Date();
  const nextMidnight = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 0, 0
  ));
  return Math.max(1000, nextMidnight.getTime() - now.getTime());
}

function startAutomationScheduler() {
  if (schedulerTimer) {
    clearTimeout(schedulerTimer);
    schedulerTimer = null;
  }

  const msUntilMidnight = getMsUntilNextUtcMidnight();
  const nextMidnightIso = new Date(Date.now() + msUntilMidnight).toISOString();
  console.log(`⏰ Daily Challenge Automation Scheduler initialized. Next run at 00:00 UTC (${nextMidnightIso}, in ${Math.round(msUntilMidnight / 60000)} mins).`);

  function scheduleNext() {
    schedulerTimer = setTimeout(async () => {
      try {
        console.log('⏰ Executing 00:00 UTC Daily Challenge Automation pipeline...');
        await runDailyScheduledAutomation();
      } catch (err) {
        console.error('❌ Error executing scheduled 00:00 UTC automation:', err.message);
      } finally {
        scheduleNext();
      }
    }, getMsUntilNextUtcMidnight());
  }

  scheduleNext();
}

function stopAutomationScheduler() {
  if (schedulerTimer) {
    clearTimeout(schedulerTimer);
    schedulerTimer = null;
    console.log('⏹️ Daily Challenge Automation Scheduler stopped.');
  }
}

module.exports = {
  getAutomationSettings,
  updateAutomationSettings,
  getAutomationLogs,
  runAdminAutoFillNow,
  runDailyScheduledAutomation,
  runAutomationPipeline,
  startAutomationScheduler,
  stopAutomationScheduler
};
