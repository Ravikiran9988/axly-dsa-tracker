const { getRepository } = require('../db/repositoryFactory');
const { v4: uuidv4 } = require('uuid');
const { getCanonicalIstDate, getNextCanonicalIstDate, getIstClock } = require('../utils/dateUtils');
const { generateDailyChallenge, checkDuplicateChallenge, stripVariantIdentifiers } = require('./aiDailyChallengeService');
const { createDailyChallenge, publishDailyChallenge, updateDailyChallengeStatus } = require('./dailyChallengeService');
const noveltyService = require('./questionNoveltyService');

// 12:30 AM IST = 19:00 UTC on the previous calendar day.
// At each run we publish today's scheduled challenge, then generate tomorrow's challenge.
const GENERATION_HOUR_UTC = 19;
const GENERATION_MINUTE_UTC = 0;
// QC_SAFETY_CHECK_INTERVAL_MS is a CHECK interval — NOT a generation interval.
// Every 3 hours, the scheduler verifies tomorrow's challenge exists.
const QC_SAFETY_CHECK_INTERVAL_MS = 3 * 60 * 60 * 1000;

// A QC in-progress run is considered stale after 10 minutes without a heartbeat update.
const QC_STALE_RUN_THRESHOLD_MS = 10 * 60 * 1000;

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
  const logs = await getRepo().many(`SELECT al.*, q.title AS challenge_title, q.difficulty AS challenge_difficulty FROM daily_challenge_automation_logs al LEFT JOIN questions q ON al.question_id = q.id ORDER BY al.created_at DESC LIMIT ?`, [l]);
  return logs.map(log => ({ ...log, validation_result: log.validation_result || 'Passed', sandbox_result: 'Not used' }));
}

async function generateUniqueChallenge({ topic = 'Surprise Me', difficulty = 'medium', instructions = '' } = {}) {
  const result = await generateDailyChallenge({ topic, difficulty, instructions });
  if (!result || !result.success || !result.data) {
    const error = new Error(result?.error || 'All configured LLM fallback slots failed and no unique challenge was available.');
    error.code = result?.code || 'LLM_GENERATION_FAILED';
    throw error;
  }
  return {
    ...result.data,
    title: stripVariantIdentifiers(result.data.title),
    status: 'draft',
    created_via: 'ai_automation',
    scheduled_date: null,
    sandbox_verified: result.data.sandbox_verified !== undefined ? result.data.sandbox_verified : false
  };
}

async function persistRunStatus(status) {
  await getRepo().execute(`UPDATE daily_challenge_automation_settings SET last_run_at = ?, last_run_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 'global-settings'`, [new Date().toISOString(), status]);
}

async function publishTodaysScheduledChallenge(todayDate) {
  const scheduled = await getRepo().one(`
    SELECT q.id, q.title, dcm.status, dcm.scheduled_date 
    FROM daily_challenge_metadata dcm
    JOIN questions q ON q.id = dcm.question_id
    WHERE dcm.scheduled_date = ? AND dcm.status = 'scheduled' AND q.is_active = TRUE 
    ORDER BY dcm.updated_at DESC LIMIT 1
  `, [todayDate]);
  if (!scheduled) return { published: false, challenge: null };
  const published = await publishDailyChallenge(scheduled.id, 'usr-system-cron');
  return { published: true, challenge: published };
}

/**
 * Check whether a Daily Challenge already exists for the given target date.
 * Returns the existing challenge record or null.
 */
async function findExistingScheduledChallengeForDate(targetDate) {
  return getRepo().one(`
    SELECT q.id, q.title, dcm.status, dcm.scheduled_date
    FROM daily_challenge_metadata dcm
    JOIN questions q ON q.id = dcm.question_id
    WHERE dcm.scheduled_date = ? AND dcm.status != 'archived' AND q.is_active = TRUE
  `, [targetDate]);
}

/**
 * Create or update a Daily Challenge metadata record for an existing canonical question.
 *
 * Handles:
 *   - Question has no existing metadata → INSERT new metadata row
 *   - Question has archived metadata → UPDATE archived row back to target status
 *   - Question has existing non-archived metadata → UPDATE status/scheduled_date
 */
async function upsertDailyChallengeMetadata(questionId, { status, scheduledDate, customTopic = null, createdVia = 'ai_automation' }) {
  const existing = await getRepo().one(
    'SELECT question_id, status AS current_status FROM daily_challenge_metadata WHERE question_id = ?',
    [questionId]
  );

  if (!existing) {
    await getRepo().execute(
      `INSERT INTO daily_challenge_metadata (question_id, scheduled_date, status, custom_topic, created_via)
       VALUES (?, ?, ?, ?, ?)`,
      [questionId, scheduledDate || null, status, customTopic, createdVia]
    );
  } else {
    const updates = ['status = ?', 'updated_at = CURRENT_TIMESTAMP'];
    const params = [status];
    if (scheduledDate !== undefined) { updates.push('scheduled_date = ?'); params.push(scheduledDate); }
    if (customTopic !== undefined) { updates.push('custom_topic = ?'); params.push(customTopic); }
    if (createdVia !== undefined) { updates.push('created_via = ?'); params.push(createdVia); }
    params.push(questionId);
    await getRepo().execute(
      `UPDATE daily_challenge_metadata SET ${updates.join(', ')} WHERE question_id = ?`,
      params
    );
  }

  if (status) {
    // Design invariant: questions.status is NEVER set to 'archived'.
    // On archive: dcm → 'archived', question → 'published' + is_practice = 1
    const questionStatus = status === 'archived' ? 'published' : status;
    const extraSet = status === 'archived' ? ', is_practice = 1' : '';
    await getRepo().execute(
      `UPDATE questions SET status = ?${extraSet} WHERE id = ?`,
      [questionStatus, questionId]
    );
  }
}

async function runAdminAutoFillNow(options = {}) {
  const { adminId = 'usr-admin-01', difficulty = 'medium', topic = 'Surprise Me', mode = 'auto_fill' } = options;
  const targetDate = getNextCanonicalIstDate();
  let resultChallenge = null;
  let failureReason = 'Unknown failure during AI synthesis';
  let failureCategory = 'UNKNOWN';
  let finalStatus = 'failed';
  let resultType = null; // 'GENERATED_AND_SCHEDULED' | 'GENERATED_AS_DRAFT' | null

  try {
    // ── STEP 1: Check whether tomorrow already has a scheduled Daily Challenge ─
    const existingScheduled = await findExistingScheduledChallengeForDate(targetDate);

    // ── STEP 2: Generate NEW question via central AI pipeline ──────────────────
    try {
      const generated = await generateUniqueChallenge({
        topic, difficulty,
        instructions: 'Create a genuinely original problem. Do not use a variant of an existing challenge.'
      });

      if (existingScheduled) {
        // ── CASE 1: Tomorrow already scheduled — generate NEW as DRAFT ────────
        // The existing scheduled challenge remains completely untouched.
        const created = await createDailyChallenge({
          ...generated,
          status: 'draft',
          scheduled_date: null,
          created_via: 'ai_automation'
        }, adminId);

        // Index embedding (non-blocking for draft, but we still attempt it)
        const indexResult = await noveltyService.indexAcceptedQuestion(created.id, created);
        if (!indexResult || !indexResult.success) {
          const indexReason = indexResult?.reason || 'unknown_indexing_failure';
          console.warn(`[DailyAutomation] Draft indexing failed (non-fatal for draft): ${indexReason}`);
        }

        resultChallenge = created;
        resultType = 'GENERATED_AS_DRAFT';
      } else {
        // ── CASE 2: Tomorrow NOT scheduled — generate NEW, index, then SCHEDULE ─
        // Create as draft first — indexing must succeed before promoting to scheduled
        const created = await createDailyChallenge({
          ...generated,
          status: 'draft',
          scheduled_date: targetDate,
          created_via: 'ai_automation'
        }, adminId);

        // Required embedding/indexing — must succeed before scheduling
        const indexResult = await noveltyService.indexAcceptedQuestion(created.id, created);
        if (!indexResult || !indexResult.success) {
          const indexReason = indexResult?.reason || 'unknown_indexing_failure';
          failureReason = `Required embedding/indexing failed: ${indexReason}`;
          failureCategory = 'INDEXING_FAILED';
          resultChallenge = null;
          resultType = null;
        } else {
          // Indexing succeeded — promote to scheduled
          resultChallenge = await updateDailyChallengeStatus(created.id, 'scheduled', targetDate);
          resultType = 'GENERATED_AND_SCHEDULED';
        }
      }
    } catch (err) {
      failureReason = err.message || failureReason;
      failureCategory = err.code || 'PIPELINE_ERROR';
      resultChallenge = null;
      resultType = null;
    }

    // ── STEP 3: Write automation log ─────────────────────────────────────────
    const logId = `auto-log-${uuidv4().slice(0, 8)}`;

    if (resultChallenge) {
      finalStatus = 'success';
      let details;
      let message;
      if (resultType === 'GENERATED_AS_DRAFT') {
        details = `Tomorrow (${targetDate}) already scheduled. New AI challenge "${resultChallenge.title}" generated and saved as Draft for admin review.`;
        message = `Tomorrow's challenge is already scheduled. A new Auto-Fill candidate was generated as Draft for review.`;
      } else {
        details = `AI challenge "${resultChallenge.title}" generated, validated, indexed, and scheduled for ${targetDate}.`;
        message = 'Auto-fill generated and scheduled tomorrow\'s Daily Challenge successfully.';
      }
      await getRepo().execute(
        `INSERT INTO daily_challenge_automation_logs (id, target_date, mode, attempt_count, validation_result, sandbox_result, status, question_id, details, created_at) VALUES (?, ?, ?, 1, 'Passed', 'Not used', 'success', ?, ?, CURRENT_TIMESTAMP)`,
        [logId, targetDate, mode, resultChallenge.id, details]
      );
      return {
        success: true,
        status: 'success',
        attempts: 1,
        challenge: resultChallenge,
        resultType,
        message
      };
    }

    await getRepo().execute(
      `INSERT INTO daily_challenge_automation_logs (id, target_date, mode, attempt_count, validation_result, sandbox_result, status, failure_category, details, created_at) VALUES (?, ?, ?, 1, 'Failed', 'Not used', 'failed', ?, ?, CURRENT_TIMESTAMP)`,
      [logId, targetDate, mode, failureCategory, `Admin Auto-Fill generation failed: ${failureReason}`]
    );
    return { success: false, status: 'failed', attempts: 1, error: failureReason, failure_category: failureCategory };
  } finally {
    try {
      await persistRunStatus(resultChallenge ? 'success' : finalStatus);
    } catch (persistErr) {
      console.error('[DailyAutomation] Failed to persist run status in finally block:', persistErr.message);
    }
  }
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

  // ── DB-BACKED ATOMIC CLAIM (cross-dyno duplicate guard) ───────────────────
  // Attempt to set last_run_status = 'running' only if it is NOT already 'running'.
  // Uses compare-and-swap (WHERE last_run_status != 'running') to ensure only
  // ONE process across all dynos proceeds to generate.
  const claimResult = await getRepo().execute(
    `UPDATE daily_challenge_automation_settings 
     SET last_run_status = 'running', last_run_at = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = 'global-settings' AND (last_run_status IS NULL OR last_run_status != 'running')`,
    [new Date().toISOString()]
  );
  // If changes === 0, another process already holds the claim
  if (claimResult && claimResult.changes === 0) {
    console.log(`[QC] NOOP tomorrowDate=${tomorrowDate} → another process already holds the running claim.`);
    return { success: true, status: 'SUCCESS_NOOP', target_date: tomorrowDate, message: 'Generation already running in another process.' };
  }

  let publishResult = { published: false, challenge: null };
  let tomorrowResult = null;

  try {
    // ── STEP 1: Publish today's challenge — independently error-handled ───────
    console.log(`[QC] Publishing today's challenge for ${todayDate}.`);
    try {
      publishResult = await publishTodaysScheduledChallenge(todayDate);
      console.log(`[QC] ${publishResult.published ? 'PUBLISHED' : 'NOOP'} today=${todayDate}`);
    } catch (pubErr) {
      console.error(`[QC] Failed to publish today's challenge for ${todayDate}:`, pubErr.message);
      // Publication failure does not prevent tomorrow preparation from proceeding
    }

    // ── STEP 2: Prepare tomorrow's challenge ──────────────────────────────────
    console.log(`[QC] CHECK tomorrow=${tomorrowDate}`);
    const existingTomorrow = await getRepo().one(`
      SELECT q.id, q.title, dcm.status, dcm.scheduled_date 
      FROM daily_challenge_metadata dcm
      JOIN questions q ON q.id = dcm.question_id
      WHERE dcm.scheduled_date = ? AND dcm.status != 'archived' AND q.is_active = TRUE
    `, [tomorrowDate]);

    if (existingTomorrow) {
      console.log(`[QC] NOOP tomorrow=${tomorrowDate} → status=${existingTomorrow.status} already exists.`);
      await persistRunStatus('success');
      return {
        success: true,
        status: 'SUCCESS_NOOP',
        target_date: tomorrowDate,
        published_today: publishResult.published,
        published_challenge: publishResult.challenge,
        challenge: existingTomorrow,
        message: `Today's challenge handled for ${todayDate}; tomorrow's challenge already exists for ${tomorrowDate}.`
      };
    }

    let generated = null;
    let failureReason = 'Unknown failure';
    let failureCategory = 'UNKNOWN';
    try {
      console.log(`[QC] GENERATING tomorrow=${tomorrowDate}`);
      generated = await generateUniqueChallenge({
        topic: 'Surprise Me',
        difficulty: 'medium',
        instructions: `Generate the Daily Challenge for IST date ${tomorrowDate}. It will be published tomorrow. It must be fundamentally different from every existing challenge.`
      });
    } catch (err) {
      failureReason = err.message || failureReason;
      failureCategory = err.code || 'PIPELINE_ERROR';
      console.error(`[QC] FAILED tomorrow=${tomorrowDate} failureCategory=${failureCategory}: ${failureReason}`);
    }

    const logId = `auto-log-${uuidv4().slice(0, 8)}`;
    if (generated) {
      // Always persist as draft first — required indexing must succeed before scheduling
      const created = await createDailyChallenge({ ...generated, status: 'draft', scheduled_date: tomorrowDate, created_via: 'ai_automation' }, 'usr-system-cron');

      console.log(`[QC] INDEXING tomorrow=${tomorrowDate} questionId=${created.id}`);
      const indexResult = await noveltyService.indexAcceptedQuestion(created.id, created);
      if (!indexResult || !indexResult.success) {
        const indexReason = indexResult?.reason || 'unknown_indexing_failure';
        console.error(`[QC] FAILED INDEXING tomorrow=${tomorrowDate}: ${indexReason}`);
        await getRepo().execute(
          `INSERT INTO daily_challenge_automation_logs (id, target_date, mode, attempt_count, validation_result, sandbox_result, status, failure_category, details, created_at) VALUES (?, ?, ?, 1, 'Passed', 'Not used', 'failed', ?, ?, CURRENT_TIMESTAMP)`,
          [logId, tomorrowDate, settings.mode, 'INDEXING_FAILED', `Today's challenge ${publishResult.published ? 'was published' : 'was not found to publish'} for ${todayDate}, but required indexing of tomorrow's challenge ${tomorrowDate} failed: ${indexReason}.`]
        );
        await persistRunStatus('failed');
        return { success: false, status: 'failed', target_date: tomorrowDate, attempts: 1, published_today: publishResult.published, published_challenge: publishResult.challenge, error: `Required embedding/indexing failed: ${indexReason}`, failure_category: 'INDEXING_FAILED' };
      }

      // Indexing succeeded — promote to target status
      const targetStatus = settings.mode === 'auto_fill' ? 'scheduled' : 'draft';
      let finalChallenge = created;
      if (targetStatus !== 'draft') {
        finalChallenge = await updateDailyChallengeStatus(created.id, targetStatus, tomorrowDate);
      }

      console.log(`[QC] ${targetStatus === 'scheduled' ? 'SCHEDULED' : 'DRAFT'} tomorrow=${tomorrowDate} questionId=${created.id}`);
      await getRepo().execute(
        `INSERT INTO daily_challenge_automation_logs (id, target_date, mode, attempt_count, validation_result, sandbox_result, status, question_id, details, created_at) VALUES (?, ?, ?, 1, 'Passed', 'Not used', 'success', ?, ?, CURRENT_TIMESTAMP)`,
        [logId, tomorrowDate, settings.mode, created.id, settings.mode === 'auto_fill' ? `Published today's challenge for ${todayDate} and generated/indexed/scheduled tomorrow's challenge for ${tomorrowDate}.` : `Published today's challenge for ${todayDate}; generated tomorrow's challenge for ${tomorrowDate} as a draft for admin review.`]
      );
      await persistRunStatus('success');
      tomorrowResult = { success: true, status: 'SUCCESS', target_date: tomorrowDate, attempts: 1, published_today: publishResult.published, published_challenge: publishResult.challenge, challenge: finalChallenge || created };
      return tomorrowResult;
    }

    // LLM generation failed
    await getRepo().execute(
      `INSERT INTO daily_challenge_automation_logs (id, target_date, mode, attempt_count, validation_result, sandbox_result, status, failure_category, details, created_at) VALUES (?, ?, ?, 1, 'Failed', 'Not used', 'failed', ?, ?, CURRENT_TIMESTAMP)`,
      [logId, tomorrowDate, settings.mode, failureCategory, `Today's challenge ${publishResult.published ? 'was published' : 'was not found to publish'} for ${todayDate}, but generation of tomorrow's challenge ${tomorrowDate} failed: ${failureReason}.`]
    );
    await persistRunStatus('failed');
    return { success: false, status: 'failed', target_date: tomorrowDate, attempts: 1, published_today: publishResult.published, published_challenge: publishResult.challenge, error: failureReason, failure_category: failureCategory };
  } catch (outerErr) {
    // Unexpected error — release the claim so the next check can retry
    console.error('[QC] Unexpected error in runDailyScheduledAutomation:', outerErr.message);
    try { await persistRunStatus('failed'); } catch (_) {}
    throw outerErr;
  }
}

async function runAutomationPipeline(options = {}) {
  const { source = 'scheduled_automation', force = false } = options;
  if (source === 'manual_admin' || force) return runAdminAutoFillNow(options);
  return runDailyScheduledAutomation();
}

let expireTimer = null;
let publishTimer = null;

async function runDailyExpiration(now = new Date()) {
  try {
    const clock = getIstClock(now);
    // Previous challenge stays active through 00:00–00:28 IST.
    if (clock.hour === 0 && clock.minute < 29) {
      return { expired: false, reason: 'before_expiration_window', istDate: clock.date };
    }

    const expiredIdsRow = await getRepo().many(`
      SELECT q.id 
      FROM questions q
      JOIN daily_challenge_metadata dcm ON q.id = dcm.question_id
      WHERE dcm.scheduled_date < ? AND dcm.status = 'published' AND q.is_active = TRUE
    `, [clock.date]);

    const expiredIds = expiredIdsRow.map(row => row.id);

    if (expiredIds.length > 0) {
      await getRepo().transaction(async tx => {
        // Set metadata status to archived
        await tx.execute(`
          UPDATE daily_challenge_metadata 
          SET status = 'archived', updated_at = CURRENT_TIMESTAMP 
          WHERE question_id IN (${expiredIds.map(() => '?').join(',')})
        `, expiredIds);
        
        // Expose to practice by setting is_practice = 1, is_active = 1, and status = 'published'
        await tx.execute(`
          UPDATE questions 
          SET is_practice = 1, is_active = 1, status = 'published' 
          WHERE id IN (${expiredIds.map(() => '?').join(',')})
        `, expiredIds);
      });
    }
    console.log(`✅ [00:29 IST] Daily Challenge Expiration job completed. istDate=${clock.date} expired=${expiredIds.length}`);
    return { expired: true, count: expiredIds.length, istDate: clock.date };
  } catch (err) {
    console.error(`❌ [00:29 IST] Error in Daily Challenge Expiration:`, err.message);
  }
}

function scheduleNextJob(targetHourUTC, targetMinuteUTC, jobFunction, jobName, timerRefHolder) {
  const now = new Date();
  let target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), targetHourUTC, targetMinuteUTC, 0, 0));
  
  if (now.getTime() >= target.getTime()) {
    target.setUTCDate(target.getUTCDate() + 1);
  }
  
  const delayMs = target.getTime() - now.getTime();
  console.log(`[Scheduler] Next ${jobName} scheduled in ${(delayMs / 60000).toFixed(2)} minutes (at ${target.toISOString()})`);
  
  const timer = setTimeout(async () => {
    // CRITICAL: reschedule in finally so a thrown error can NEVER permanently kill the timer.
    try {
      await jobFunction();
    } catch (err) {
      console.error(`[Scheduler] ❌ Error in ${jobName} (timer will still reschedule):`, err.message);
    } finally {
      timerRefHolder.timer = scheduleNextJob(targetHourUTC, targetMinuteUTC, jobFunction, jobName, timerRefHolder);
    }
  }, delayMs);
  
  if (typeof timer.unref === 'function') timer.unref();
  return timer;
}

// Process-local flag to prevent concurrent in-process runs.
// The DB claim (WHERE last_run_status != 'running') handles cross-dyno concurrency.
let publishRunning = false;
async function runScheduledPublicationWithRecovery() {
  if (publishRunning) {
    console.log('[QC] 00:30 run skipped — local mutex held.');
    return null;
  }
  const settings = await getAutomationSettings();
  if (!settings.is_enabled || settings.mode === 'manual') return null;

  publishRunning = true;
  try {
    console.log(`⏰ [00:30 IST] Running Daily Challenge Publication + Generation.`);
    return await runDailyScheduledAutomation();
  } finally {
    publishRunning = false;
  }
}

/**
 * 3-hour QC safety/preparation check.
 * Checks whether tomorrow's challenge exists and generates if needed.
 * Safe to run multiple times — DB claim prevents duplicate generation.
 * Respects the same mode/is_enabled settings as the 00:30 scheduler.
 */
async function runQcSafetyCheck() {
  const settings = await getAutomationSettings();
  if (!settings.is_enabled || settings.mode === 'manual') {
    console.log('[QC] 3-hour safety check: skipped (disabled or manual mode).');
    return { success: true, status: 'SUCCESS_NOOP', message: 'Automation disabled or manual mode.' };
  }

  const tomorrowDate = getNextCanonicalIstDate();
  console.log(`[QC] 3-hour CHECK tomorrow=${tomorrowDate}`);

  // Check if tomorrow already has a valid (non-failed, non-archived) challenge
  const existingTomorrow = await getRepo().one(`
    SELECT q.id, q.title, dcm.status
    FROM daily_challenge_metadata dcm
    JOIN questions q ON q.id = dcm.question_id
    WHERE dcm.scheduled_date = ? AND dcm.status NOT IN ('archived', 'failed') AND q.is_active = TRUE
  `, [tomorrowDate]);

  if (existingTomorrow) {
    console.log(`[QC] 3-hour NOOP tomorrow=${tomorrowDate} → ${existingTomorrow.status} challenge already exists.`);
    return { success: true, status: 'SUCCESS_NOOP', target_date: tomorrowDate };
  }

  // Nothing usable for tomorrow — trigger the full scheduled automation
  // which includes the atomic DB claim guard against concurrent execution
  console.log(`[QC] 3-hour GENERATING tomorrow=${tomorrowDate} — no valid challenge found.`);
  return runDailyScheduledAutomation();
}

/**
 * QC startup check — inspects tomorrow's state on every server start.
 * Safe to call on every restart. DB claim prevents concurrent generation.
 * Must be called AFTER DB health is confirmed.
 */
async function runQcStartupCheck() {
  console.log('[QC] Startup check beginning...');
  try {
    const settings = await getAutomationSettings();
    if (!settings.is_enabled || settings.mode === 'manual') {
      console.log('[QC] Startup check: automation disabled or manual mode, skipping.');
      return;
    }

    const tomorrowDate = getNextCanonicalIstDate();
    console.log(`[QC] Startup CHECK tomorrow=${tomorrowDate}`);

    const existingTomorrow = await getRepo().one(`
      SELECT q.id, q.title, dcm.status
      FROM daily_challenge_metadata dcm
      JOIN questions q ON q.id = dcm.question_id
      WHERE dcm.scheduled_date = ? AND dcm.status NOT IN ('archived') AND q.is_active = TRUE
    `, [tomorrowDate]);

    if (existingTomorrow && (existingTomorrow.status === 'scheduled' || existingTomorrow.status === 'draft')) {
      console.log(`[QC] Startup NOOP: tomorrow=${tomorrowDate} already has a ${existingTomorrow.status} challenge.`);
      return;
    }

    // Nothing usable for tomorrow — trigger the full scheduled automation (with DB claim)
    console.log(`[QC] Startup: tomorrow=${tomorrowDate} needs preparation. Starting generation...`);
    await runDailyScheduledAutomation();
  } catch (err) {
    console.error('[QC] Startup check failed:', err.message);
    try { await persistRunStatus('failed'); } catch (_) {}
  }
}

let safetyCheckTimer = null;

function startAutomationScheduler() {
  stopAutomationScheduler();
  console.log('⏰ Daily Challenge Automation Scheduler starting.');
  // NOTE: Startup check is triggered separately from server.js after DB health.
  // Do NOT call runQcStartupCheck() or runDailyScheduledAutomation() here.
  
  // Expiration runs at 18:59 UTC (00:29 IST)
  const expireHolder = { timer: null };
  expireHolder.timer = scheduleNextJob(18, 59, runDailyExpiration, 'Expiration (00:29 IST)', expireHolder);
  expireTimer = expireHolder;
  
  // Publication + Generation runs at 19:00 UTC (00:30 IST)
  const publishHolder = { timer: null };
  publishHolder.timer = scheduleNextJob(19, 0, runScheduledPublicationWithRecovery, 'Publication (00:30 IST)', publishHolder);
  publishTimer = publishHolder;

  // 3-hour safety check — verifies tomorrow's challenge exists and generates if not.
  safetyCheckTimer = setInterval(async () => {
    try {
      const result = await runQcSafetyCheck();
      if (result && result.status !== 'SUCCESS_NOOP') {
        console.log(`[QC] 3-hour safety check completed with status: ${result.status}.`);
      }
    } catch (err) {
      console.error('[QC] ❌ Error in 3-hour safety check (interval survives):', err.message);
    }
  }, QC_SAFETY_CHECK_INTERVAL_MS);

  if (typeof safetyCheckTimer.unref === 'function') {
    safetyCheckTimer.unref();
  }
}

function stopAutomationScheduler() {
  if (expireTimer && expireTimer.timer) {
    clearTimeout(expireTimer.timer);
    expireTimer = null;
  }
  if (publishTimer && publishTimer.timer) {
    clearTimeout(publishTimer.timer);
    publishTimer = null;
  }
  if (safetyCheckTimer) {
    clearInterval(safetyCheckTimer);
    safetyCheckTimer = null;
  }
}

module.exports = {
  getAutomationSettings,
  updateAutomationSettings,
  getAutomationLogs,
  findExistingScheduledChallengeForDate,
  runAdminAutoFillNow,
  runDailyScheduledAutomation,
  runQcSafetyCheck,
  runQcStartupCheck,
  runAutomationPipeline,
  startAutomationScheduler,
  stopAutomationScheduler,
  runDailyExpiration,
  toBooleanFlag,
  persistRunStatus
};
