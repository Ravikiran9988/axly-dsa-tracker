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

async function updateAutomationSettings({ mode, is_enabled, retry_limit }) {
  const current = await getAutomationSettings();
  const nextMode = mode && ['manual', 'ai_assist', 'auto_fill'].includes(mode) ? mode : current.mode;

  // AI Assist and Auto Fill are the two user-facing automation modes.
  // Selecting either mode activates automation; the UI no longer needs a
  // separate enable/disable control. Keep explicit is_enabled support for
  // backwards compatibility with older API clients.
  const nextEnabled = mode === 'ai_assist' || mode === 'auto_fill'
    ? 1
    : is_enabled !== undefined
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
// 1. MANUAL ADMIN: RUN AUTO-FILL NOW
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
  let rejectedTitles = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    attemptCount = attempt;
    try {
      const selectedDifficulty = difficulty || (attempt === 1 ? 'medium' : attempt === 2 ? 'easy' : 'hard');
      const retryInstructions = rejectedTitles.length > 0
        ? `Previous generation attempts were rejected as duplicates. NEVER reuse or create a variant of these titles: ${rejectedTitles.map(t => `"${t}"`).join(', ')}. Generate a genuinely different algorithmic problem, not a renamed or parameter-changed variant.`
        : 'Generate a genuinely original problem and avoid all existing Daily Challenge and Practice concepts.';

      const aiResult = await generateDailyChallenge({
        topic: topic || 'Surprise Me',
        difficulty: selectedDifficulty,
        scheduled_date: null,
        skipSandbox: false,
        instructions: retryInstructions
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
        const duplicateTitle = dupCheck.duplicateOf?.title || generated.title;
        if (duplicateTitle && !rejectedTitles.includes(duplicateTitle)) rejectedTitles.push(duplicateTitle);
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
      if (err.code === 'DUPLICATE_COLLISION' && err.message) {
        const match = err.message.match(/title [\"']([^\"']+)[\"']/i);
        if (match?.[1] && !rejectedTitles.includes(match[1])) rejectedTitles.push(match[1]);
      }
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
      ? 'Unable to generate a sufficiently unique challenge after multiple attempts. Please try again.'
      : `AI generation failed after ${attemptCount} attempts (${lastFailureReason}).`,
    failure_category: lastFailureCategory
  };
}

// =========================================================================
// 2. SCHEDULED AUTOMATION
// Runs at/after the daily UTC boundary targeting TOMORROW.
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