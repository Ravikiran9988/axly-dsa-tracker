const { getRepository } = require('../db/repositoryFactory');
const { v4: uuidv4 } = require('uuid');
const { getCanonicalIstDate, getNextCanonicalIstDate } = require('../utils/dateUtils');
const { generateDailyChallenge, checkDuplicateChallenge, stripVariantIdentifiers } = require('./aiDailyChallengeService');
const { createDailyChallenge, publishDailyChallenge } = require('./dailyChallengeService');

// 12:30 AM IST = 19:00 UTC on the previous calendar day.
// At each run we publish today's scheduled challenge, then generate tomorrow's challenge.
const GENERATION_HOUR_UTC = 19;
const GENERATION_MINUTE_UTC = 0;
const SCHEDULER_CHECK_INTERVAL_MS = 5 * 60 * 1000;
const FAILED_RUN_RETRY_DELAY_MS = 60 * 60 * 1000;

function getRepo() { return getRepository(); }

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
    return { id: 'global-settings', mode: 'ai_assist', is_enabled: true, target_hour_utc: GENERATION_HOUR_UTC, retry_limit: 3, last_run_at: null, last_run_status: null, next_run_at: null };
  }
  return { ...row, is_enabled: toBooleanFlag(row.is_enabled), target_hour_utc: GENERATION_HOUR_UTC };
}

async function updateAutomationSettings({ mode, is_enabled, retry_limit }) {
  const current = await getAutomationSettings();
  const nextMode = mode && ['manual', 'ai_assist', 'auto_fill'].includes(mode) ? mode : current.mode;
  const nextEnabled = is_enabled !== undefined ? (toBooleanFlag(is_enabled) ? 1 : 0) : (current.is_enabled ? 1 : 0);
  const nextRetryLimit = Number(retry_limit) > 0 ? Number(retry_limit) : current.retry_limit;
  await getRepo().execute(`UPDATE daily_challenge_automation_settings SET mode = ?, is_enabled = ?, retry_limit = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 'global-settings'`, [nextMode, nextEnabled, nextRetryLimit]);
  return getAutomationSettings();
}

async function getAutomationLogs(limit = 20) {
  const l = Math.max(1, Math.min(100, Number(limit) || 20));
  const logs = await getRepo().many(`SELECT al.*, dc.title AS challenge_title, dc.difficulty AS challenge_difficulty FROM daily_challenge_automation_logs al LEFT JOIN daily_challenge_problems dc ON al.challenge_id = dc.id ORDER BY al.created_at DESC LIMIT ?`, [l]);
  return logs.map(log => ({ ...log, validation_result: log.validation_result || 'Passed', sandbox_result: 'Not used' }));
}

async function generateUniqueChallenge({ topic = 'Surprise Me', difficulty = 'medium', instructions = '' } = {}) {
  const result = await generateDailyChallenge({ topic, difficulty, instructions, skipSandbox: true });
  if (!result || !result.success || !result.data) {
    const error = new Error(result?.error || 'All configured LLM fallback slots failed and no unique challenge was available.');
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
  const duplicate = await checkDuplicateChallenge(candidate);
  if (duplicate.isDuplicate) {
    const error = new Error(duplicate.reason || 'Duplicate challenge candidate');
    error.code = 'DUPLICATE_COLLISION';
    throw error;
  }
  return candidate;
}

async function persistRunStatus(status) {
  await getRepo().execute(`UPDATE daily_challenge_automation_settings SET last_run_at = ?, last_run_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 'global-settings'`, [new Date().toISOString(), status]);
}

async function publishTodaysScheduledChallenge(todayDate) {
  const scheduled = await getRepo().one(`SELECT id, title, status, scheduled_date FROM daily_challenge_problems WHERE scheduled_date = ? AND status = 'scheduled' AND is_active = TRUE ORDER BY updated_at DESC LIMIT 1`, [todayDate]);
  if (!scheduled) return { published: false, challenge: null };
  const published = await publishDailyChallenge(scheduled.id, 'usr-system-cron');
  return { published: true, challenge: published };
}

async function runAdminAutoFillNow(options = {}) {
  const { adminId = 'usr-admin-01', difficulty = 'medium', topic = 'Surprise Me' } = options;
  let createdDraft = null;
  let failureReason = 'Unknown failure during AI synthesis';
  let failureCategory = 'UNKNOWN';
  try {
    const generated = await generateUniqueChallenge({ topic, difficulty, instructions: 'Create a genuinely original problem. Do not use a variant of an existing challenge.' });
    createdDraft = await createDailyChallenge({ ...generated, status: 'draft', scheduled_date: null, created_via: 'ai' }, adminId);
  } catch (err) {
    failureReason = err.message || failureReason;
    failureCategory = err.code || 'PIPELINE_ERROR';
  }
  const logId = `auto-log-${uuidv4().slice(0, 8)}`;
  const targetDate = getCanonicalIstDate();
  if (createdDraft) {
    await getRepo().execute(`INSERT INTO daily_challenge_automation_logs (id, target_date, mode, attempt_count, validation_result, sandbox_result, status, challenge_id, details, created_at) VALUES (?, ?, 'manual_admin', 1, 'Passed', 'Not used', 'success', ?, ?, CURRENT_TIMESTAMP)`, [logId, targetDate, createdDraft.id, `AI challenge "${createdDraft.title}" generated through the five-slot LLM fallback chain and saved as Draft.`]);
    await persistRunStatus('success');
    return { success: true, status: 'success', attempts: 1, challenge: createdDraft, message: 'AI challenge generated successfully and saved as Draft.' };
  }
  await getRepo().execute(`INSERT INTO daily_challenge_automation_logs (id, target_date, mode, attempt_count, validation_result, sandbox_result, status, failure_category, details, created_at) VALUES (?, ?, 'manual_admin', 1, 'Failed', 'Not used', 'failed', ?, ?, CURRENT_TIMESTAMP)`, [logId, targetDate, failureCategory, `Admin Auto-Fill generation failed: ${failureReason}`]);
  await persistRunStatus('failed');
  return { success: false, status: 'failed', attempts: 1, error: failureReason, failure_category: failureCategory };
}

async function runDailyScheduledAutomation() {
  const todayDate = getCanonicalIstDate();
  const tomorrowDate = getNextCanonicalIstDate();
  const settings = await getAutomationSettings();

  if (!settings.is_enabled || settings.mode === 'manual') {
    const logId = `auto-log-${uuidv4().slice(0, 8)}`;
    await getRepo().execute(`INSERT INTO daily_challenge_automation_logs (id, target_date, mode, attempt_count, validation_result, sandbox_result, status, failure_category, details, created_at) VALUES (?, ?, ?, 0, 'Skipped', 'Not used', 'skipped', 'DISABLED_MODE', ?, CURRENT_TIMESTAMP)`, [logId, tomorrowDate, settings.mode, `Scheduled automation skipped: system is in ${settings.mode} mode.`]);
    return { success: true, status: 'SUCCESS_NOOP', target_date: tomorrowDate };
  }

  // Step 1: publish the challenge that was prepared for today's IST date.
  const publishResult = await publishTodaysScheduledChallenge(todayDate);

  // Step 2: generate and schedule tomorrow's challenge.
  const existingTomorrow = await getRepo().one(`SELECT id, title, status, scheduled_date FROM daily_challenge_problems WHERE scheduled_date = ? AND status != 'archived' AND is_active = TRUE`, [tomorrowDate]);
  if (existingTomorrow) {
    await persistRunStatus('success');
    return {
      success: true,
      status: 'SUCCESS_NOOP',
      target_date: tomorrowDate,
      published_today: publishResult.published,
      published_challenge: publishResult.challenge,
      challenge: existingTomorrow,
      message: `Today's challenge published for ${todayDate}; tomorrow's challenge already exists for ${tomorrowDate}.`
    };
  }

  let generated = null;
  let failureReason = 'Unknown failure';
  let failureCategory = 'UNKNOWN';
  try {
    generated = await generateUniqueChallenge({
      topic: 'Surprise Me',
      difficulty: 'medium',
      instructions: `Generate the Daily Challenge for IST date ${tomorrowDate}. It will be published tomorrow. It must be fundamentally different from every existing challenge.`
    });
  } catch (err) {
    failureReason = err.message || failureReason;
    failureCategory = err.code || 'PIPELINE_ERROR';
  }

  const logId = `auto-log-${uuidv4().slice(0, 8)}`;
  if (generated) {
    const targetStatus = settings.mode === 'auto_fill' ? 'scheduled' : 'draft';
    const created = await createDailyChallenge({ ...generated, status: targetStatus, scheduled_date: tomorrowDate, created_via: 'ai' }, 'usr-system-cron');
    await getRepo().execute(`INSERT INTO daily_challenge_automation_logs (id, target_date, mode, attempt_count, validation_result, sandbox_result, status, challenge_id, details, created_at) VALUES (?, ?, ?, 1, 'Passed', 'Not used', 'success', ?, ?, CURRENT_TIMESTAMP)`, [logId, tomorrowDate, settings.mode, created.id, settings.mode === 'auto_fill' ? `Published today's challenge for ${todayDate} and generated/scheduled tomorrow's challenge for ${tomorrowDate}.` : `Published today's challenge for ${todayDate}; generated tomorrow's challenge for ${tomorrowDate} as a draft for admin review.`]);
    await persistRunStatus('success');
    return { success: true, status: 'SUCCESS', target_date: tomorrowDate, attempts: 1, published_today: publishResult.published, published_challenge: publishResult.challenge, challenge: created };
  }

  await getRepo().execute(`INSERT INTO daily_challenge_automation_logs (id, target_date, mode, attempt_count, validation_result, sandbox_result, status, failure_category, details, created_at) VALUES (?, ?, ?, 1, 'Failed', 'Not used', 'failed', ?, ?, CURRENT_TIMESTAMP)`, [logId, tomorrowDate, settings.mode, failureCategory, `Today's challenge ${publishResult.published ? 'was published' : 'was not found to publish'} for ${todayDate}, but generation of tomorrow's challenge ${tomorrowDate} failed: ${failureReason}.`]);
  await persistRunStatus('failed');
  return { success: false, status: 'failed', target_date: tomorrowDate, attempts: 1, published_today: publishResult.published, published_challenge: publishResult.challenge, error: failureReason, failure_category: failureCategory };
}

async function runAutomationPipeline(options = {}) {
  const { source = 'scheduled_automation', force = false } = options;
  if (source === 'manual_admin' || force) return runAdminAutoFillNow(options);
  return runDailyScheduledAutomation();
}

let schedulerTimer = null;
let schedulerRunning = false;

function isPastGenerationTime(now = new Date()) {
  const hour = now.getUTCHours();
  const minute = now.getUTCMinutes();
  return hour > GENERATION_HOUR_UTC || (hour === GENERATION_HOUR_UTC && minute >= GENERATION_MINUTE_UTC);
}

async function runScheduledAutomationWithRecovery() {
  if (schedulerRunning) return null;
  const settings = await getAutomationSettings();
  if (!settings.is_enabled || settings.mode === 'manual') return null;
  if (!isPastGenerationTime()) return null;

  const todayDate = getCanonicalIstDate();
  const latestLog = await getRepo().one(`SELECT status, created_at FROM daily_challenge_automation_logs WHERE target_date = ? AND mode IN ('scheduled_automation', 'ai_assist', 'auto_fill') ORDER BY created_at DESC LIMIT 1`, [getNextCanonicalIstDate()]);
  if (latestLog?.status === 'success' || latestLog?.status === 'skipped') return null;
  if (latestLog?.status === 'failed') {
    const lastAttemptMs = new Date(latestLog.created_at).getTime();
    if (Number.isFinite(lastAttemptMs) && Date.now() - lastAttemptMs < FAILED_RUN_RETRY_DELAY_MS) return null;
  }

  schedulerRunning = true;
  try {
    console.log(`⏰ Running Daily Challenge automation at 12:30 AM IST (19:00 UTC): publish ${todayDate}, generate ${getNextCanonicalIstDate()}.`);
    return await runDailyScheduledAutomation();
  } finally {
    schedulerRunning = false;
  }
}

function startAutomationScheduler() {
  stopAutomationScheduler();
  console.log('⏰ Daily Challenge Automation Scheduler starting. 12:30 AM IST: publish today + generate tomorrow.');
  runScheduledAutomationWithRecovery().catch(err => console.error('❌ Daily Challenge scheduler startup check failed:', err.message));
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
