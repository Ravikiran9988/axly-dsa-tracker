const { getRepository } = require('../db/repositoryFactory');
const { v4: uuidv4 } = require('uuid');
const { getCanonicalIstDate } = require('../utils/dateUtils');
const { generateUniqueProblem } = require('./aiSharedGenerationService');
const { createQuestion, updateQuestionStatus } = require('./questionService');
const noveltyService = require('./questionNoveltyService');

// QB generates once per 2-hour IST slot: 00,02,04,06,08,10,12,14,16,18,20,22
// SCHEDULER_CHECK_INTERVAL_MS is a CHECK interval — NOT a generation interval.
// The LLM is only called when the slot has no valid question AND no active claim.
const SCHEDULER_CHECK_INTERVAL_MS = 30 * 60 * 1000;

// A QB in-progress claim is considered stale after 10 minutes.
// LLM + validation + sandbox + indexing completes well within this window.
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
  return logs.map(log => ({ ...log, validation_result: log.validation_result || 'Passed', sandbox_result: 'Not used' }));
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
 * Returns the current 2-hour IST slot in the format YYYY-MM-DD-HH
 * For example: "2026-09-13-14"
 * Hours are floored to the nearest even number (0,2,4,...,22).
 */
function getCurrentIstSlot() {
  const now = new Date();
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
  const istDate = new Date(utcMs + istOffsetMs);
  
  const yyyy = istDate.getFullYear();
  const mm = String(istDate.getMonth() + 1).padStart(2, '0');
  const dd = String(istDate.getDate()).padStart(2, '0');
  const rawHour = istDate.getHours();
  const evenHour = rawHour - (rawHour % 2);
  const hh = String(evenHour).padStart(2, '0');
  
  return `${yyyy}-${mm}-${dd}-${hh}`;
}

/**
 * Inspects the authoritative DB state for a given slot.
 *
 * Returns one of:
 *   { state: 'completed', questionId, questionStatus }
 *     → A publishable question exists. NOOP.
 *   { state: 'draft_recoverable', questionId, questionStatus }
 *     → A draft exists (indexing may have failed). Attempt re-indexing.
 *   { state: 'in_progress', claimId, claimedAt }
 *     → An active generation claim exists. NOOP.
 *   { state: 'stale_in_progress', claimId, claimedAt, ageMs }
 *     → Claim exists but older than QB_STALE_CLAIM_THRESHOLD_MS. Can be recovered.
 *   { state: 'none' }
 *     → No question and no active claim. Safe to claim and generate.
 */
async function getSlotState(slot) {
  // 1. Check for an existing question row for this slot
  const existingQuestion = await getRepo().one(
    `SELECT id, status, embedding_indexed_at FROM questions WHERE generation_slot = ? LIMIT 1`,
    [slot]
  );

  if (existingQuestion) {
    if (existingQuestion.status === 'published') {
      return { state: 'completed', questionId: existingQuestion.id, questionStatus: existingQuestion.status };
    }
    // draft or any other non-published status — may be recoverable
    return { state: 'draft_recoverable', questionId: existingQuestion.id, questionStatus: existingQuestion.status };
  }

  // 2. No question row — check for an active in-progress log claim
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

/**
 * Atomically claims a slot by inserting an in-progress log entry.
 * Returns { claimed: true, claimId } on success.
 * Returns { claimed: false, reason } if the insert fails.
 *
 * This is the cross-dyno duplicate-generation guard:
 * Only the process that successfully inserts this row proceeds to call the LLM.
 * A short race window exists between getSlotState() and claimSlot(), which is
 * why getSlotState() is always called before any generation.
 */
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

/**
 * Releases a slot claim by updating the in-progress log entry to 'failed'.
 * Called when generation fails after claiming the slot.
 */
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

/**
 * Recovers a stale in-progress log entry by marking it as failed.
 * This unblocks the next scheduler check so it can attempt generation again.
 */
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

/**
 * Attempts to re-index an existing draft question for a slot.
 * Used when a draft exists but indexing previously failed.
 */
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

/**
 * Generates a new question for a slot.
 *
 * IMPORTANT: This function claims the slot atomically before calling the LLM.
 * If the claim fails (another process won), it returns SUCCESS_NOOP immediately.
 * Callers should call getSlotState() before calling generateForSlot() to avoid
 * unnecessary work, but generateForSlot() is safe to call directly for manual triggers.
 */
async function generateForSlot(slot, adminId = 'usr-system-cron') {
  const settings = await getAutomationSettings();
  const mode = settings.mode;

  let generated = null;
  let failureReason = 'Unknown failure during AI synthesis';
  let failureCategory = 'UNKNOWN';
  let claimId = null;

  // Atomically claim the slot before calling the LLM
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
      generation_slot: slot,
      skipSandbox: false
    });

    if (!result || !result.success || !result.data) {
      throw new Error(result?.error || 'LLM Generation Failed.');
    }

    generated = result.data;
  } catch (err) {
    failureReason = err.message || failureReason;
    failureCategory = err.code || 'PIPELINE_ERROR';
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
        // Release the in-progress claim but keep the draft row intact
        // so the next check can attempt re-indexing via recoverDraftQuestion()
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
      
      // Update the in-progress claim to success
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
        // DB uniqueness constraint is the final safety net — rarely triggered
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

  // LLM/pipeline failure — release claim so next check can retry
  await releaseSlotClaim(claimId, failureCategory, failureReason);
  console.error(`[QB] FAILED slot=${slot} failureCategory=${failureCategory}`);
  return { 
    success: false, 
    status: 'failed', 
    error: failureReason, 
    failure_category: failureCategory 
  };
}

// Process-local mutex — prevents concurrent runs within the SAME process.
// The DB claim (claimSlot) handles cross-dyno concurrency.
let schedulerRunning = false;

/**
 * State-aware QB scheduler tick. Called by the 30-minute interval.
 * Always inspects DB state first — only calls LLM if truly needed.
 */
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
      // After releasing the stale claim, treat as 'none' and fall through to generate
    }

    if (slotState.state === 'draft_recoverable') {
      console.log(`[QB] RECOVERING slot=${slot} → draft questionId=${slotState.questionId}`);
      const result = await recoverDraftQuestion(slot, slotState.questionId, settings.mode);
      await persistRunStatus(result.status);
      return result;
    }

    // state === 'none' (or stale was just recovered)
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

/**
 * QB startup check — safe to call on every server start.
 * Inspects the current slot state and only generates if truly needed.
 * Must be called AFTER DB health is confirmed.
 */
async function runQbStartupCheck() {
  console.log('[QB] Startup check beginning...');
  try {
    const settings = await getAutomationSettings();
    if (!settings.is_enabled) {
      console.log('[QB] Startup check: automation disabled, skipping.');
      return;
    }

    const slot = getCurrentIstSlot();
    
    // First, recover any stale in-progress claims from a previously crashed process
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

    // No question, no active claim — generate
    console.log(`[QB] Startup: slot ${slot} needs generation.`);
    const result = await generateForSlot(slot);
    await persistRunStatus(result.status);
  } catch (err) {
    console.error('[QB] Startup check failed:', err.message);
    try { await persistRunStatus('failed'); } catch (_) {}
  }
}

let schedulerTimer = null;

function startQuestionBankScheduler() {
  stopQuestionBankScheduler();
  console.log('⏰ Question Bank Automation Scheduler starting. Checks every 30 minutes (IST 2-hour slots).');
  // NOTE: Startup check is triggered separately from server.js after DB health.
  // Do NOT call runQbStartupCheck() or runQuestionBankScheduledAutomation() here.
  schedulerTimer = setInterval(async () => {
    try {
      const result = await runQuestionBankScheduledAutomation();
      if (result && result.status && result.status !== 'SUCCESS_NOOP') {
        console.log(`[QB] Scheduler tick completed with status: ${result.status}.`);
      }
    } catch (err) {
      // Error is logged inside runQuestionBankScheduledAutomation.
      // The interval continues regardless of the error.
      console.error('[QB] ❌ Error in scheduler tick (interval survives):', err.message);
    }
  }, SCHEDULER_CHECK_INTERVAL_MS);
  
  if (typeof schedulerTimer.unref === 'function') {
    schedulerTimer.unref();
  }
}

function stopQuestionBankScheduler() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
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

