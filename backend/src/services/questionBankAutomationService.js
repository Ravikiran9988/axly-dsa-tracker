const { getRepository } = require('../db/repositoryFactory');
const { v4: uuidv4 } = require('uuid');
const { getCanonicalIstDate } = require('../utils/dateUtils');
const { generateUniqueProblem } = require('./aiSharedGenerationService');
const { createQuestion, updateQuestionStatus } = require('./questionService');
const noveltyService = require('./questionNoveltyService');

// QB daily cycle starts at 12:30 AM IST and runs every 2 hours:
// 00:30, 02:30, 04:30, 06:30, 08:30, 10:30,
// 12:30, 14:30, 16:30, 18:30, 20:30, 22:30 (12 slots/day).
// The scheduler is anchored to these boundaries; it does NOT depend on
// when the Node process/dyno happened to start.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const QB_INTERVAL_MS = 2 * 60 * 60 * 1000;
const SCHEDULER_RETRY_INTERVAL_MS = 30 * 60 * 1000;

// A QB in-progress claim is considered stale after 10 minutes.
const QB_STALE_CLAIM_THRESHOLD_MS = 10 * 60 * 1000;

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
  const row = await getRepo().one('SELECT * FROM question_bank_automation_settings WHERE id = ?', ['global-settings']);
  if (!row) {
    return { id: 'global-settings', mode: 'auto_fill', is_enabled: true, retry_limit: 3, last_run_at: null, last_run_status: null, next_run_at: null };
  }
  return { ...row, is_enabled: toBooleanFlag(row.is_enabled) };
}

async function updateAutomationSettings({ mode, is_enabled, retry_limit }) {
  const current = await getAutomationSettings();
  const nextMode = mode && ['ai_assist', 'auto_fill'].includes(mode) ? mode : current.mode;
  const nextEnabled = is_enabled !== undefined ? (toBooleanFlag(is_enabled) ? 1 : 0) : (current.is_enabled ? 1 : 0);
  const nextRetryLimit = Number(retry_limit) > 0 ? Number(retry_limit) : current.retry_limit;

  await getRepo().execute(
    `INSERT INTO question_bank_automation_settings (id, mode, is_enabled, retry_limit, updated_at)
     VALUES ('global-settings', ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(id) DO UPDATE SET mode = excluded.mode, is_enabled = excluded.is_enabled, retry_limit = excluded.retry_limit, updated_at = CURRENT_TIMESTAMP`,
    [nextMode, nextEnabled, nextRetryLimit]
  );
  return getAutomationSettings();
}

async function getAutomationLogs(limit = 20) {
  const l = Math.max(1, Math.min(100, Number(limit) || 20));
  const logs = await getRepo().many(
    `SELECT al.*, q.title AS challenge_title, q.difficulty AS challenge_difficulty
     FROM question_bank_automation_logs al
     LEFT JOIN questions q ON al.question_id = q.id
     ORDER BY al.created_at DESC LIMIT ?`,
    [l]
  );
  return logs.map(log => {
    let normalizedCreatedAt = log.created_at;
    if (normalizedCreatedAt) {
      if (normalizedCreatedAt instanceof Date) {
        normalizedCreatedAt = normalizedCreatedAt.toISOString();
      } else if (typeof normalizedCreatedAt === 'string') {
        normalizedCreatedAt = new Date(normalizedCreatedAt.includes('Z') || normalizedCreatedAt.includes('+') ? normalizedCreatedAt : normalizedCreatedAt.replace(' ', 'T') + 'Z').toISOString();
      }
    }

    return {
      ...log,
      created_at: normalizedCreatedAt,
      validation_result: log.validation_result || 'Passed',
      sandbox_result: 'Not used'
    };
  });
}

async function persistRunStatus(status) {
  await getRepo().execute(
    `UPDATE question_bank_automation_settings
     SET last_run_at = ?, last_run_status = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = 'global-settings'`,
    [new Date().toISOString(), status]
  );
}

/**
 * Converts the current instant into the QB slot that is currently active.
 *
 * The QB day is intentionally anchored at 00:30 IST, not 00:00 IST.
 * Therefore:
 *   00:30-02:29 -> YYYY-MM-DD-00
 *   02:30-04:29 -> YYYY-MM-DD-02
 *   ...
 *   22:30-00:29 -> YYYY-MM-DD-22 (the 00:00-00:29 part belongs to the previous IST date)
 *
 * Slot IDs remain YYYY-MM-DD-HH for DB compatibility.
 */
function getCurrentIstSlot(now = new Date()) {
  const istDate = new Date(now.getTime() + IST_OFFSET_MS);
  let year = istDate.getUTCFullYear();
  let month = istDate.getUTCMonth();
  let day = istDate.getUTCDate();
  const hour = istDate.getUTCHours();
  const minute = istDate.getUTCMinutes();

  const minutesSinceMidnight = hour * 60 + minute;
  const slotIndex = Math.floor((minutesSinceMidnight - 30) / 120);

  if (slotIndex < 0) {
    // 00:00-00:29 belongs to the previous day's 22:30 slot.
    const previousDay = new Date(Date.UTC(year, month, day) - 24 * 60 * 60 * 1000);
    year = previousDay.getUTCFullYear();
    month = previousDay.getUTCMonth();
    day = previousDay.getUTCDate();
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}-22`;
  }

  const slotHour = slotIndex * 2;
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}-${String(slotHour).padStart(2, '0')}`;
}

/**
 * Returns the delay until the NEXT exact QB boundary in milliseconds.
 * Boundaries are always 00:30 + N*2 hours IST.
 *
 * This is deliberately calculated from the current instant rather than using
 * a fixed setInterval so deployments/restarts cannot shift the generation time.
 */
function getDelayToNextQbBoundary(now = new Date()) {
  const istDate = new Date(now.getTime() + IST_OFFSET_MS);
  const year = istDate.getUTCFullYear();
  const month = istDate.getUTCMonth();
  const day = istDate.getUTCDate();
  const currentMinutes = istDate.getUTCHours() * 60 + istDate.getUTCMinutes();
  const currentSeconds = istDate.getUTCSeconds() * 1000 + istDate.getUTCMilliseconds();

  // 00:30 is minute 30, then every 120 minutes.
  let nextBoundaryMinutes;
  if (currentMinutes < 30) {
    nextBoundaryMinutes = 30;
  } else {
    const elapsedFromFirstBoundary = currentMinutes - 30;
    const nextIndex = Math.floor(elapsedFromFirstBoundary / 120) + 1;
    nextBoundaryMinutes = 30 + nextIndex * 120;
  }

  const dayStartUtc = Date.UTC(year, month, day);
  const targetUtc = dayStartUtc + nextBoundaryMinutes * 60 * 1000;
  const currentUtc = now.getTime() + IST_OFFSET_MS;
  const delay = targetUtc - currentUtc;

  // targetUtc can be on the following day when nextBoundaryMinutes > 1439.
  // The calculation above naturally handles that because Date.UTC rolls over.
  return Math.max(0, delay);
}

async function getSlotState(slot) {
  const existingQuestion = await getRepo().one(
    `SELECT id, status, embedding_indexed_at FROM questions WHERE generation_slot = ? LIMIT 1`,
    [slot]
  );

  if (existingQuestion) {
    if (existingQuestion.status === 'published') {
      return { state: 'completed', questionId: existingQuestion.id, questionStatus: existingQuestion.status };
    }
    return { state: 'draft_recoverable', questionId: existingQuestion.id, questionStatus: existingQuestion.status };
  }

  const inProgressLog = await getRepo().one(
    `SELECT id, created_at FROM question_bank_automation_logs
     WHERE target_slot = ? AND status = 'in_progress'
     ORDER BY created_at DESC LIMIT 1`,
    [slot]
  );

  if (inProgressLog) {
    const claimedAt = Date.parse(inProgressLog.created_at || '');
    const ageMs = Number.isFinite(claimedAt) ? Date.now() - claimedAt : Infinity;
    if (ageMs < QB_STALE_CLAIM_THRESHOLD_MS) {
      return { state: 'in_progress', claimId: inProgressLog.id, claimedAt: inProgressLog.created_at };
    }
    return { state: 'stale_in_progress', claimId: inProgressLog.id, claimedAt: inProgressLog.created_at, ageMs };
  }

  return { state: 'none' };
}

async function claimSlot(slot, mode) {
  const claimId = `auto-log-${uuidv4().slice(0, 8)}`;
  try {
    await getRepo().execute(
      `INSERT INTO question_bank_automation_logs (id, target_slot, mode, status, details, created_at)
       VALUES (?, ?, ?, 'in_progress', 'Slot claimed, generation starting.', CURRENT_TIMESTAMP)`,
      [claimId, slot, mode]
    );
    return { claimed: true, claimId };
  } catch (err) {
    console.warn(`[QB] Failed to claim slot ${slot}: ${err.message}`);
    return { claimed: false, reason: err.message };
  }
}

async function releaseSlotClaim(claimId, failureCategory, failureReason) {
  try {
    await getRepo().execute(
      `UPDATE question_bank_automation_logs
       SET status = 'failed', failure_category = ?, details = ?
       WHERE id = ? AND status = 'in_progress'`,
      [failureCategory, failureReason, claimId]
    );
  } catch (err) {
    console.error(`[QB] Failed to release slot claim ${claimId}:`, err.message);
  }
}

async function recoverStaleQbSlot(slot) {
  const staleLog = await getRepo().one(
    `SELECT id, created_at FROM question_bank_automation_logs
     WHERE target_slot = ? AND status = 'in_progress'
     ORDER BY created_at DESC LIMIT 1`,
    [slot]
  );
  if (!staleLog) return { recovered: false };

  const claimedAt = Date.parse(staleLog.created_at || '');
  const ageMs = Number.isFinite(claimedAt) ? Date.now() - claimedAt : Infinity;
  if (ageMs < QB_STALE_CLAIM_THRESHOLD_MS) {
    return { recovered: false, reason: 'claim_not_yet_stale', ageMs };
  }

  try {
    await getRepo().execute(
      `UPDATE question_bank_automation_logs
       SET status = 'failed', failure_category = 'STALE_CLAIM_RECOVERED',
           details = 'Recovered stale in-progress claim after process termination.'
       WHERE id = ? AND status = 'in_progress'`,
      [staleLog.id]
    );
    console.warn(`[QB] Recovered stale in-progress claim for slot ${slot} after ${Math.round(ageMs / 60000)} minutes.`);
    return { recovered: true, claimId: staleLog.id, ageMs };
  } catch (err) {
    console.error(`[QB] Failed to recover stale claim for slot ${slot}:`, err.message);
    return { recovered: false, reason: err.message };
  }
}

async function recoverDraftQuestion(slot, questionId, mode) {
  console.log(`[QB] RECOVERING slot=${slot} questionId=${questionId} — attempting re-indexing.`);

  const draft = await getRepo().one(`SELECT * FROM questions WHERE id = ?`, [questionId]);
  if (!draft) {
    return { success: false, status: 'failed', error: 'Draft question not found during recovery', failure_category: 'RECOVERY_ERROR' };
  }

  const indexResult = await noveltyService.indexAcceptedQuestion(questionId, draft);
  if (!indexResult || !indexResult.success) {
    const indexReason = indexResult?.reason || 'unknown_indexing_failure';
    console.warn(`[QB] Re-indexing of draft ${questionId} for slot ${slot} failed: ${indexReason}`);
    await getRepo().execute(
      `INSERT INTO question_bank_automation_logs (id, target_slot, mode, status, question_id, failure_category, details) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [`auto-log-${uuidv4().slice(0, 8)}`, slot, mode, 'failed', questionId, 'INDEXING_FAILED', `Re-indexing attempt failed: ${indexReason}`]
    );
    return { success: false, status: 'failed', error: `Re-indexing failed: ${indexReason}`, failure_category: 'INDEXING_FAILED' };
  }

  const targetStatus = mode === 'auto_fill' ? 'published' : 'draft';
  if (targetStatus !== 'draft') {
    await updateQuestionStatus(questionId, targetStatus);
  }

  await getRepo().execute(
    `INSERT INTO question_bank_automation_logs (id, target_slot, mode, status, question_id, details) VALUES (?, ?, ?, ?, ?, ?)`,
    [`auto-log-${uuidv4().slice(0, 8)}`, slot, mode, 'success', questionId, `Draft recovered: re-indexed and set to ${targetStatus}.`]
  );

  const recovered = await getRepo().one(`SELECT * FROM questions WHERE id = ?`, [questionId]);
  console.log(`[QB] RECOVERED slot=${slot} → questionId=${questionId} set to ${targetStatus}.`);
  return {
    success: true,
    status: 'success',
    challenge: recovered,
    message: `Recovered draft for slot ${slot}: re-indexed and set to ${targetStatus}.`
  };
}

async function generateForSlot(slot, adminId = 'usr-system-cron', options = {}) {
  const { isManual = false } = options;
  const settings = await getAutomationSettings();
  const mode = isManual ? 'manual_trigger' : settings.mode;

  let generated = null;
  let failureReason = 'Unknown failure during AI synthesis';
  let failureCategory = 'UNKNOWN';
  let claimId = null;

  const claim = await claimSlot(slot, mode);
  if (!claim.claimed) {
    console.log(`[QB] NOOP slot=${slot} → failed to claim (another process likely won). reason=${claim.reason}`);
    return { success: true, status: 'SUCCESS_NOOP', message: `Slot ${slot} already claimed by another process.` };
  }
  claimId = claim.claimId;
  console.log(`[QB] CLAIMED slot=${slot} claimId=${claimId}`);

  try {
    console.log(`[QB] GENERATING slot=${slot}`);
    const result = await generateUniqueProblem({
      topic: 'Surprise Me',
      difficulty: 'medium',
      instructions: 'Create a genuinely original algorithm problem for the practice library.',
      destination: 'question_bank',
      generation_slot: isManual ? null : slot,
      skipSandbox: false
    });

    if (!result || !result.success || !result.data) {
      throw new Error(result?.error || 'LLM Generation Failed.');
    }

    generated = result.data;
  } catch (err) {
    failureReason = err.message || failureReason;
    failureCategory = err.code || 'PIPELINE_ERROR';

    if (!isManual && (failureCategory === '23505' || failureReason.includes('UNIQUE constraint failed') || failureReason.includes('idx_questions_generation_slot'))) {
      const currentSlotState = await getSlotState(slot);
      if (currentSlotState.state === 'completed' || currentSlotState.state === 'draft_recoverable') {
        console.log(`[QB] NOOP slot=${slot} → another process won the race to insert the scheduled question.`);
        await getRepo().execute(
          `UPDATE question_bank_automation_logs SET status = 'success_noop', details = 'Slot filled by another concurrent worker' WHERE id = ?`,
          [claimId]
        );
        return { success: true, status: 'SUCCESS_NOOP', message: 'Slot was filled by another process during generation.' };
      }
    }

    console.error(`[QB] FAILED slot=${slot} failureCategory=${failureCategory}: ${failureReason}`);
  }

  if (generated) {
    try {
      console.log(`[QB] VALIDATING/PERSISTING slot=${slot}`);
      const createdDraft = await createQuestion({
        ...generated,
        status: 'draft',
        is_active: true,
        generation_slot: slot
      }, adminId);

      const createdDraftId = createdDraft.id;

      console.log(`[QB] INDEXING slot=${slot} questionId=${createdDraftId}`);
      const indexResult = await noveltyService.indexAcceptedQuestion(createdDraftId, createdDraft);
      if (!indexResult || !indexResult.success) {
        const indexReason = indexResult?.reason || 'unknown_indexing_failure';
        console.error(`[QB] FAILED slot=${slot} INDEXING failed: ${indexReason}`);
        await releaseSlotClaim(claimId, 'INDEXING_FAILED', `Required embedding/indexing failed: ${indexReason}. Draft ${createdDraftId} preserved for recovery.`);
        await getRepo().execute(
          `INSERT INTO question_bank_automation_logs (id, target_slot, mode, status, question_id, failure_category, details) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [`auto-log-${uuidv4().slice(0, 8)}`, slot, mode, 'failed', createdDraftId, 'INDEXING_FAILED', `Required embedding/indexing failed: ${indexReason}`]
        );
        return {
          success: false,
          status: 'failed',
          error: `Required embedding/indexing failed: ${indexReason}`,
          failure_category: 'INDEXING_FAILED'
        };
      }

      const targetStatus = mode === 'auto_fill' ? 'published' : 'draft';
      if (targetStatus !== 'draft') {
        await updateQuestionStatus(createdDraftId, targetStatus);
      }

      await getRepo().execute(
        `UPDATE question_bank_automation_logs SET status = 'success', question_id = ?, details = ? WHERE id = ? AND status = 'in_progress'`,
        [createdDraftId, `AI challenge for slot ${slot} generated, indexed, and set to ${targetStatus}.`, claimId]
      );

      console.log(`[QB] ${targetStatus === 'published' ? 'PUBLISHED' : 'DRAFT'} slot=${slot} questionId=${createdDraftId}`);
      return {
        success: true,
        status: 'success',
        challenge: createdDraft,
        message: `AI challenge for slot ${slot} generated, indexed, and set to ${targetStatus}.`
      };
    } catch (dbErr) {
      if (dbErr.message && dbErr.message.includes('UNIQUE') && dbErr.message.includes('generation_slot')) {
        await releaseSlotClaim(claimId, 'DUPLICATE_SLOT', `DB uniqueness constraint triggered for slot ${slot}.`);
        return { success: true, status: 'SUCCESS_NOOP', message: `Slot ${slot} already claimed (DB constraint).` };
      }
      const errMsg = dbErr.message || 'Database error';
      await releaseSlotClaim(claimId, 'DATABASE_ERROR', errMsg);
      await getRepo().execute(
        `INSERT INTO question_bank_automation_logs (id, target_slot, mode, status, failure_category, details) VALUES (?, ?, ?, ?, ?, ?)`,
        [`auto-log-${uuidv4().slice(0, 8)}`, slot, mode, 'failed', 'DATABASE_ERROR', errMsg]
      );
      console.error(`[QB] FAILED slot=${slot} dbError=${errMsg}`);
      return {
        success: false,
        status: 'failed',
        error: `Database insert failed: ${errMsg}`,
        failure_category: 'DATABASE_ERROR'
      };
    }
  }

  await releaseSlotClaim(claimId, failureCategory, failureReason);
  console.error(`[QB] FAILED slot=${slot} failureCategory=${failureCategory}`);
  return {
    success: false,
    status: 'failed',
    error: failureReason,
    failure_category: failureCategory
  };
}

let schedulerRunning = false;

async function runQuestionBankScheduledAutomation() {
  if (schedulerRunning) {
    console.log('[QB] CHECK skipped — local mutex held by concurrent execution.');
    return null;
  }

  const settings = await getAutomationSettings();
  if (!settings.is_enabled) {
    return null;
  }

  schedulerRunning = true;

  try {
    const slot = getCurrentIstSlot();
    console.log(`[QB] CHECK slot=${slot}`);

    const slotState = await getSlotState(slot);

    if (slotState.state === 'completed') {
      console.log(`[QB] NOOP slot=${slot} → completed (status=${slotState.questionStatus})`);
      return { success: true, status: 'SUCCESS_NOOP', message: `Slot ${slot} already has a completed question.` };
    }

    if (slotState.state === 'in_progress') {
      console.log(`[QB] NOOP slot=${slot} → generation already in_progress (claimId=${slotState.claimId})`);
      return { success: true, status: 'SUCCESS_NOOP', message: `Slot ${slot} generation already in progress.` };
    }

    if (slotState.state === 'stale_in_progress') {
      console.warn(`[QB] STALE_CLAIM slot=${slot} ageMs=${slotState.ageMs}. Recovering stale claim.`);
      await recoverStaleQbSlot(slot);
    }

    if (slotState.state === 'draft_recoverable') {
      console.log(`[QB] RECOVERING slot=${slot} → draft questionId=${slotState.questionId}`);
      const result = await recoverDraftQuestion(slot, slotState.questionId, settings.mode);
      await persistRunStatus(result.status);
      return result;
    }

    console.log(`[QB] GENERATING slot=${slot} → no question and no active claim.`);
    const result = await generateForSlot(slot);
    await persistRunStatus(result.status);
    return result;
  } catch (err) {
    console.error('[QB] Scheduler error:', err.message);
    try { await persistRunStatus('failed'); } catch (_) {}
    throw err;
  } finally {
    schedulerRunning = false;
  }
}

async function runQbStartupCheck() {
  console.log('[QB] Startup check beginning...');
  try {
    const settings = await getAutomationSettings();
    if (!settings.is_enabled) {
      console.log('[QB] Startup check: automation disabled, skipping.');
      return;
    }

    const slot = getCurrentIstSlot();

    const staleResult = await recoverStaleQbSlot(slot);
    if (staleResult.recovered) {
      console.log(`[QB] Startup: recovered stale claim for slot ${slot}.`);
    }

    const slotState = await getSlotState(slot);

    if (slotState.state === 'completed') {
      console.log(`[QB] Startup NOOP: slot ${slot} already has a completed question (${slotState.questionStatus}).`);
      return;
    }
    if (slotState.state === 'in_progress') {
      console.log(`[QB] Startup NOOP: slot ${slot} generation already in progress.`);
      return;
    }
    if (slotState.state === 'draft_recoverable') {
      console.log(`[QB] Startup: recovering draft for slot ${slot}...`);
      const result = await recoverDraftQuestion(slot, slotState.questionId, settings.mode);
      await persistRunStatus(result.status);
      return;
    }

    console.log(`[QB] Startup: slot ${slot} needs generation.`);
    const result = await generateForSlot(slot);
    await persistRunStatus(result.status);
  } catch (err) {
    console.error('[QB] Startup check failed:', err.message);
    try { await persistRunStatus('failed'); } catch (_) {}
  }
}

let schedulerTimer = null;

function scheduleNextQuestionBankRun() {
  if (schedulerTimer) {
    clearTimeout(schedulerTimer);
    schedulerTimer = null;
  }

  const delay = getDelayToNextQbBoundary();
  const delayMinutes = Math.round(delay / 60000);
  console.log(`[QB] Next scheduled run in ${delayMinutes} minutes (next boundary is 00:30 + N*2h IST).`);

  schedulerTimer = setTimeout(async () => {
    schedulerTimer = null;
    let result = null;
    try {
      result = await runQuestionBankScheduledAutomation();
      if (result && result.status && result.status !== 'SUCCESS_NOOP') {
        console.log(`[QB] Scheduled run completed with status: ${result.status}.`);
      }
    } catch (err) {
      console.error('[QB] ❌ Error in scheduled run (scheduler will continue):', err.message);
    }

    // On a failed generation, retry within the same slot every 30 minutes.
    // On success/NOOP, wait for the next exact 2-hour boundary.
    if (result && result.status === 'failed') {
      schedulerTimer = setTimeout(() => scheduleNextQuestionBankRun(), SCHEDULER_RETRY_INTERVAL_MS);
    } else {
      scheduleNextQuestionBankRun();
    }
  }, delay);

  if (typeof schedulerTimer.unref === 'function') {
    schedulerTimer.unref();
  }
}

function startQuestionBankScheduler() {
  stopQuestionBankScheduler();
  console.log('⏰ Question Bank Automation Scheduler starting at 12:30 AM IST, then every 2 hours.');
  // Startup recovery is intentionally separate and is invoked from server.js.
  // The timer itself is anchored to the exact 00:30/02:30/... IST boundaries.
  scheduleNextQuestionBankRun();
}

function stopQuestionBankScheduler() {
  if (schedulerTimer) {
    clearTimeout(schedulerTimer);
    schedulerTimer = null;
  }
}

async function getQuestionBankGenerationStatus() {
  const today = getCanonicalIstDate();
  const currentSlot = getCurrentIstSlot();

  const rows = await getRepo().many(
    `SELECT generation_slot, status, created_at FROM questions
     WHERE generation_slot LIKE ? ORDER BY generation_slot ASC`,
    [`${today}-%`]
  );

  const completed = rows.filter(r => r.status === 'published');
  const drafts = rows.filter(r => r.status === 'draft');
  const currentSlotState = await getSlotState(currentSlot);

  return {
    today_date: today,
    generated_today: completed.length,
    draft_count_today: drafts.length,
    slots_completed: completed.map(r => r.generation_slot),
    current_slot: currentSlot,
    current_slot_state: currentSlotState.state
  };
}

module.exports = {
  getCurrentIstSlot,
  getDelayToNextQbBoundary,
  getSlotState,
  generateForSlot,
  recoverDraftQuestion,
  recoverStaleQbSlot,
  runQbStartupCheck,
  startQuestionBankScheduler,
  stopQuestionBankScheduler,
  runQuestionBankScheduledAutomation,
  getQuestionBankGenerationStatus,
  getAutomationSettings,
  updateAutomationSettings,
  getAutomationLogs,
  persistRunStatus
};
