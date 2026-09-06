const { getRepository } = require('../db/repositoryFactory');
const { v4: uuidv4 } = require('uuid');
const {
  getCanonicalUtcDate,
  getNextCanonicalUtcDate
} = require('../utils/dateUtils');
const {
  generateDailyChallenge,
  checkDuplicateChallenge,
  stripVariantIdentifiers
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
  const row = await getRepo().one(
    'SELECT * FROM daily_challenge_automation_settings WHERE id = ?',
    ['global-settings']
  );

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

  return { ...row, is_enabled: toBooleanFlag(row.is_enabled) };
}

async function updateAutomationSettings({ mode, is_enabled, retry_limit }) {
  const current = await getAutomationSettings();
  const nextMode = mode && ['manual', 'ai_assist', 'auto_fill'].includes(mode)
    ? mode
    : current.mode;
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
    sandbox_result: 'Not used'
  }));
}

async function generateUniqueChallenge({ topic = 'Surprise Me', difficulty = 'medium', instructions = '' } = {}) {
  console.log(`[DailyChallenge] Requesting unique challenge through the five-slot LLM router (topic=${topic}, difficulty=${difficulty}).`);

  // Reuse the canonical Daily Challenge generator so the same five-slot LLM
  // fallback chain and curated uniqueness fallback are used everywhere.
  // Sandbox execution is explicitly disabled for automation generation.
  const result = await generateDailyChallenge({
    topic,
    difficulty,
    instructions,
    skipSandbox: true
  });

  if (!result || !result.success || !result.data) {
    const error = new Error(result?.error || 'All configured LLM fallback slots failed and no unique curated challenge was available.');
    error.code = result?.code || 'LLM_GENERATION_FAILED';
    throw error;
  }

  const candidate = {
    ...result.data,
    title: stripVariantIdentifiers(result.data.title),
    status: 'draft',
    created_via: 'ai',
    scheduled_date: null,
    sandbox_verified: false
  };

  // Defense-in-depth: generateDailyChallenge already checks uniqueness, but
  // repeat the check immediately before persistence to protect against races.
  const duplicate = await checkDuplicateChallenge(candidate);
  if (duplicate.isDuplicate) {
    const error = new Error(duplicate.reason || 'Duplicate challenge candidate');
    error.code = 'DUPLICATE_COLLISION';
    throw error;
  }

  console.log(`[DailyChallenge] Accepted unique ${result.source || 'generated'} candidate.`);
  return candidate;
}

async function persistRunStatus(status) {
  await getRepo().execute(`
    UPDATE daily_challenge_automation_settings
    SET last_run_at = ?, last_run_status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = 'global-settings'
  `, [new Date().toISOString(), status]);
}

async function runAdminAutoFillNow(options = {}) {
  const {
    adminId = 'usr-admin-01',
    difficulty = 'medium',
    topic = 'Surprise Me'
  } = options;

  let createdDraft = null;
  let lastFailureReason = 'Unknown failure during AI synthesis';
  let lastFailureCategory = 'UNKNOWN';

  try {
    const generated = await generateUniqueChallenge({
      topic,
      difficulty,
      instructions: 'Create a genuinely original problem. Do not use a variant of an existing challenge.'
    });

    createdDraft = await createDailyChallenge({
      ...generated,
      status: 'draft',
      scheduled_date: null,
      created_via: 'ai'
    }, adminId);
  } catch (err) {
    lastFailureReason = err.message || lastFailureReason;
    lastFailureCategory = err.code || 'PIPELINE_ERROR';
  }

  const logId = `auto-log-${uuidv4().slice(0, 8)}`;
  const targetDate = getCanonicalUtcDate();

  if (createdDraft) {
    await getRepo().execute(`
      INSERT INTO daily_challenge_automation_logs
      (id, target_date, mode, attempt_count, validation_result, sandbox_result, status, challenge_id, details, created_at)
      VALUES (?, ?, 'manual_admin', 1, 'Passed', 'Not used', 'success', ?, ?, CURRENT_TIMESTAMP)
    `, [
      logId,
      targetDate,
      createdDraft.id,
      `AI challenge "${createdDraft.title}" generated through the five-slot LLM fallback chain and saved as Draft.`
    ]);

    await persistRunStatus('success');
    return {
      success: true,
      status: 'success',
      attempts: 1,
      challenge: createdDraft,
      message: 'AI challenge generated successfully and saved as Draft.'
    };
  }

  await getRepo().execute(`
    INSERT INTO daily_challenge_automation_logs
    (id, target_date, mode, attempt_count, validation_result, sandbox_result, status, failure_category, details, created_at)
    VALUES (?, ?, 'manual_admin', 1, 'Failed', 'Not used', 'failed', ?, ?, CURRENT_TIMESTAMP)
  `, [
    logId,
    targetDate,
    lastFailureCategory,
    `Admin Auto-Fill generation failed: ${lastFailureReason}`
  ]);

  await persistRunStatus('failed');
  return {
    success: false,
    status: 'failed',
    attempts: 1,
    error: lastFailureReason,
    failure_category: lastFailureCategory
  };
}

async function runDailyScheduledAutomation() {
  const targetDate = getNextCanonicalUtcDate();
  const settings = await getAutomationSettings();

  if (!settings.is_enabled || settings.mode === 'manual') {
    const logId = `auto-log-${uuidv4().slice(0, 8)}`;
    await getRepo().execute(`
      INSERT INTO daily_challenge_automation_logs
      (id, target_date, mode, attempt_count, validation_result, sandbox_result, status, failure_category, details, created_at)
      VALUES (?, ?, ?, 0, 'Skipped', 'Not used', 'skipped', 'DISABLED_MODE', ?, CURRENT_TIMESTAMP)
    `, [logId, targetDate, settings.mode, `Scheduled automation skipped: system is in ${settings.mode} mode.`]);
    return { success: true, status: 'SUCCESS_NOOP', target_date: targetDate };
  }

  const existing = await getRepo().one(`
    SELECT id, title, status, scheduled_date
    FROM daily_challenge_problems
    WHERE scheduled_date = ? AND status != 'archived' AND is_active = TRUE
  `, [targetDate]);

  if (existing) {
    return {
      success: true,
      status: 'SUCCESS_NOOP',
      target_date: targetDate,
      challenge: existing,
      message: `Challenge already exists for ${targetDate}. No action required.`
    };
  }

  let generated = null;
  let failureReason = 'Unknown failure';
  let failureCategory = 'UNKNOWN';

  try {
    generated = await generateUniqueChallenge({
      topic: 'Surprise Me',
      difficulty: 'medium',
      instructions: `Generate the challenge for UTC date ${targetDate}. It must be fundamentally different from every existing challenge.`
    });
  } catch (err) {
    failureReason = err.message || failureReason;
    failureCategory = err.code || 'PIPELINE_ERROR';
  }

  const logId = `auto-log-${uuidv4().slice(0, 8)}`;

  if (generated) {
    const targetStatus = settings.mode === 'auto_fill' ? 'scheduled' : 'draft';
    const created = await createDailyChallenge({
      ...generated,
      status: targetStatus,
      scheduled_date: targetDate,
      created_via: 'ai'
    }, 'usr-system-cron');

    await getRepo().execute(`
      INSERT INTO daily_challenge_automation_logs
      (id, target_date, mode, attempt_count, validation_result, sandbox_result, status, challenge_id, details, created_at)
      VALUES (?, ?, ?, 1, 'Passed', 'Not used', 'success', ?, ?, CURRENT_TIMESTAMP)
    `, [
      logId,
      targetDate,
      settings.mode,
      created.id,
      settings.mode === 'auto_fill'
        ? `Daily Challenge generated and scheduled for ${targetDate}.`
        : `Daily Challenge generated as a draft for ${targetDate}; admin review required.`
    ]);

    await persistRunStatus('success');
    return { success: true, status: 'SUCCESS', target_date: targetDate, attempts: 1, challenge: created };
  }

  await getRepo().execute(`
    INSERT INTO daily_challenge_automation_logs
    (id, target_date, mode, attempt_count, validation_result, sandbox_result, status, failure_category, details, created_at)
    VALUES (?, ?, ?, 1, 'Failed', 'Not used', 'failed', ?, ?, CURRENT_TIMESTAMP)
  `, [
    logId,
    targetDate,
    settings.mode,
    failureCategory,
    `Automated Daily Challenge generation failed: ${failureReason}. Admin review required.`
  ]);

  await persistRunStatus('failed');
  return {
    success: false,
    status: 'failed',
    target_date: targetDate,
    attempts: 1,
    error: failureReason,
    failure_category: failureCategory
  };
}

async function runAutomationPipeline(options = {}) {
  const { source = 'scheduled_automation', force = false } = options;
  if (source === 'manual_admin' || force) return runAdminAutoFillNow(options);
  return runDailyScheduledAutomation();
}

let schedulerTimer = null;
let schedulerRunning = false;
const SCHEDULER_CHECK_INTERVAL_MS = 3 * 60 * 60 * 1000;
const FAILED_RUN_RETRY_DELAY_MS = 60 * 60 * 1000;

async function runScheduledAutomationWithRecovery() {
  if (schedulerRunning) {
    console.log('⏳ Daily Challenge automation already running; skipping overlapping trigger.');
    return null;
  }

  const settings = await getAutomationSettings();
  if (!settings.is_enabled || settings.mode === 'manual') return null;

  const targetDate = getNextCanonicalUtcDate();
  const latestLog = await getRepo().one(`
    SELECT status, created_at
    FROM daily_challenge_automation_logs
    WHERE target_date = ? AND mode = 'scheduled_automation'
    ORDER BY created_at DESC
    LIMIT 1
  `, [targetDate]);

  if (latestLog?.status === 'success' || latestLog?.status === 'skipped') return null;

  if (latestLog?.status === 'failed') {
    const lastAttemptMs = new Date(latestLog.created_at).getTime();
    if (Number.isFinite(lastAttemptMs) && Date.now() - lastAttemptMs < FAILED_RUN_RETRY_DELAY_MS) return null;
  }

  schedulerRunning = true;
  try {
    console.log(`⏰ Running Daily Challenge automation for target ${targetDate}.`);
    return await runDailyScheduledAutomation();
  } finally {
    schedulerRunning = false;
  }
}

function startAutomationScheduler() {
  stopAutomationScheduler();
  console.log('⏰ Daily Challenge Automation Scheduler starting with resilient 3-hour checks.');

  runScheduledAutomationWithRecovery()
    .then(result => {
      if (result) console.log(`✅ Daily Challenge scheduler startup check completed with status: ${result.status}.`);
      else console.log('ℹ️ Daily Challenge scheduler startup check: no work required.');
    })
    .catch(err => console.error('❌ Daily Challenge scheduler startup check failed:', err.message));

  schedulerTimer = setInterval(async () => {
    try {
      const result = await runScheduledAutomationWithRecovery();
      if (result) console.log(`✅ Daily Challenge scheduler check completed with status: ${result.status}.`);
    } catch (err) {
      console.error('❌ Error executing Daily Challenge scheduler check:', err.message);
    }
  }, SCHEDULER_CHECK_INTERVAL_MS);

  if (typeof schedulerTimer.unref === 'function') schedulerTimer.unref();
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