const { getRepository } = require('../db/repositoryFactory');
const { v4: uuidv4 } = require('uuid');
const {
  getCanonicalUtcDate,
  getNextCanonicalUtcDate
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

function toBooleanFlag(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off', ''].includes(normalized)) return false;
  }
  return Boolean(value);
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
    is_enabled: toBooleanFlag(row.is_enabled)
  };
}

/**
 * Update Daily Challenge Automation Settings.
 * The database schema stores is_enabled as INTEGER (0/1), while the API
 * exposes it as a boolean. Normalize at the persistence boundary.
 */
async function updateAutomationSettings({ mode, is_enabled, retry_limit }) {
  const current = await getAutomationSettings();
  const nextMode = mode && ['manual', 'ai_assist', 'auto_fill'].includes(mode) ? mode : current.mode;
  const nextEnabled = is_enabled !== undefined
    ? (toBooleanFlag(is_enabled) ? 1 : 0)
    : (current.is_enabled ? 1 : 0);
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
      const validation = validateDailyChallenge(generated);
      if (!validation.isValid) {
        lastFailureReason = `Validation failed: ${validation.errors.join(', ')}`;
        lastFailureCategory = 'VALIDATION_FAILED';
        continue;
      }

      const dupCheck = await checkDuplicateChallenge(generated);
      if (dupCheck.isDuplicate) {
        lastFailureReason = `Content duplicate detected: ${dupCheck.reason}`;
        lastFailureCategory = 'DUPLICATE_COLLISION';
        continue;
      }

      const sandboxRes = await verifyReferenceSolution(generated);
      if (!sandboxRes.verified) {
        lastFailureReason = `Sandbox verification failed: ${sandboxRes.reason}`;
        lastFailureCategory = 'SANDBOX_FAILED';
        continue;
      }

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
// 2. SCHEDULED AUTOMATION
// Runs at/after the daily UTC boundary targeting TOMORROW.
// A startup/recovery check may run the same pipeline if the midnight run was
// missed because the web dyno restarted or was redeployed.
// =========================================================================
async function runDailyScheduledAutomation() {
  const tomorrowUtc = getNextCanonicalUtcDate();
  const settings = await getAutomationSettings();

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

  const maxAttempts = settings.retry_limit || 3;
  let lastFailureReason = 'Unknown failure';
  let lastFailureCategory = 'UNKNOWN';
  let successfulChallenge = null;
  let attemptCount = 0;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    attemptCount = attempt;
    try {
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
      const validation = validateDailyChallenge(generated);
      if (!validation.isValid) {
        lastFailureReason = `Validation failed: ${validation.errors.join(', ')}`;
        lastFailureCategory = 'VALIDATION_FAILED';
        continue;
      }

      const dupCheck = await checkDuplicateChallenge(generated);
      if (dupCheck.isDuplicate) {
        lastFailureReason = `Content duplicate detected: ${dupCheck.reason}`;
        lastFailureCategory = 'DUPLICATE_COLLISION';
        continue;
      }

      const sandboxRes = await verifyReferenceSolution(generated);
      if (!sandboxRes.verified) {
        lastFailureReason = `Sandbox verification failed: ${sandboxRes.reason}`;
        lastFailureCategory = 'SANDBOX_FAILED';
        continue;
      }

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
    const resultDescription = settings.mode === 'auto_fill'
      ? `Tomorrow's Daily Challenge was generated and scheduled successfully for ${tomorrowUtc}.`
      : `Tomorrow's Daily Challenge was generated as a draft for ${tomorrowUtc}; admin review is required.`;

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
      resultDescription
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
      message: resultDescription
    };
  }

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
    `Automated Daily Challenge generation failed after ${attemptCount} attempts (${lastFailureReason}). Admin review required.`
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
    error: `Automated daily challenge generation failed after ${attemptCount} attempts (${lastFailureReason}).`,
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
// RESILIENT BACKGROUND SCHEDULER
// =========================================================================
// The old scheduler waited for one in-memory timeout until midnight. A Heroku
// restart/redeploy around midnight could therefore miss the run entirely.
// This scheduler checks periodically and also performs a recovery check at
// startup. It is idempotent because the scheduled pipeline first checks for an
// existing challenge for the target date.
let schedulerTimer = null;
let schedulerRunning = false;

const SCHEDULER_CHECK_INTERVAL_MS = 60 * 60 * 1000;
const FAILED_RUN_RETRY_DELAY_MS = 60 * 60 * 1000;

async function runScheduledAutomationWithRecovery() {
  if (schedulerRunning) {
    console.log('⏳ Daily Challenge automation already running; skipping overlapping trigger.');
    return null;
  }

  const settings = await getAutomationSettings();
  if (!settings.is_enabled || settings.mode === 'manual') {
    return runDailyScheduledAutomation();
  }

  const targetDate = getNextCanonicalUtcDate();
  const latestLog = await getRepo().one(`
    SELECT status, created_at
    FROM daily_challenge_automation_logs
    WHERE target_date = ? AND mode = 'scheduled_automation'
    ORDER BY created_at DESC
    LIMIT 1
  `, [targetDate]);

  if (latestLog?.status === 'success' || latestLog?.status === 'skipped') {
    return null;
  }

  if (latestLog?.status === 'failed') {
    const lastAttemptMs = new Date(latestLog.created_at).getTime();
    if (Number.isFinite(lastAttemptMs) && Date.now() - lastAttemptMs < FAILED_RUN_RETRY_DELAY_MS) {
      return null;
    }
  }

  schedulerRunning = true;
  try {
    console.log(`⏰ Running Daily Challenge automation for target ${targetDate} (scheduled/recovery check).`);
    return await runDailyScheduledAutomation();
  } finally {
    schedulerRunning = false;
  }
}

function startAutomationScheduler() {
  stopAutomationScheduler();

  console.log('⏰ Daily Challenge Automation Scheduler starting with resilient hourly checks.');

  // Recovery check immediately after the server starts. This catches a missed
  // midnight run after Heroku deploys/restarts without waiting another day.
  runScheduledAutomationWithRecovery()
    .then(result => {
      if (result) {
        console.log(`✅ Daily Challenge scheduler startup check completed with status: ${result.status}.`);
      } else {
        console.log('ℹ️ Daily Challenge scheduler startup check: no work required.');
      }
    })
    .catch(err => {
      console.error('❌ Daily Challenge scheduler startup check failed:', err.message);
    });

  schedulerTimer = setInterval(async () => {
    try {
      const result = await runScheduledAutomationWithRecovery();
      if (result) {
        console.log(`✅ Daily Challenge scheduler check completed with status: ${result.status}.`);
      }
    } catch (err) {
      console.error('❌ Error executing Daily Challenge scheduler check:', err.message);
    }
  }, SCHEDULER_CHECK_INTERVAL_MS);

  if (typeof schedulerTimer.unref === 'function') {
    schedulerTimer.unref();
  }
}

function stopAutomationScheduler() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
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
  stopAutomationScheduler,
  toBooleanFlag
};
