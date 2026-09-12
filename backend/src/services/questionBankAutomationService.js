const { getRepository } = require('../db/repositoryFactory');
const { v4: uuidv4 } = require('uuid');
const { getCanonicalIstDate } = require('../utils/dateUtils');
const { generateUniqueProblem, stripVariantIdentifiers } = require('./aiSharedGenerationService');
const { createQuestion } = require('./questionLifecycleService');

// Run every 2 hours in IST (0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22)
const SCHEDULER_CHECK_INTERVAL_MS = 5 * 60 * 1000;
const FAILED_RUN_RETRY_DELAY_MS = 30 * 60 * 1000;

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
 */
function getCurrentIstSlot() {
  const now = new Date();
  
  // Calculate IST offset (+5:30)
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
  const istDate = new Date(utcMs + istOffsetMs);
  
  const yyyy = istDate.getFullYear();
  const mm = String(istDate.getMonth() + 1).padStart(2, '0');
  const dd = String(istDate.getDate()).padStart(2, '0');
  
  // Floor the hour to the nearest even number
  const rawHour = istDate.getHours();
  const evenHour = rawHour - (rawHour % 2);
  const hh = String(evenHour).padStart(2, '0');
  
  return `${yyyy}-${mm}-${dd}-${hh}`;
}

async function checkSlotExists(slot) {
  const existing = await getRepo().one(
    `SELECT id FROM questions WHERE generation_slot = ? LIMIT 1`,
    [slot]
  );
  return !!existing;
}

async function generateForSlot(slot, adminId = 'usr-system-cron') {
  if (await checkSlotExists(slot)) {
    return { success: true, status: 'SUCCESS_NOOP', message: `Slot ${slot} already generated.` };
  }

  let generated = null;
  let failureReason = 'Unknown failure during AI synthesis';
  let failureCategory = 'UNKNOWN';
  
  try {
    const result = await generateUniqueProblem({ 
      topic: 'Surprise Me', 
      difficulty: 'medium', 
      instructions: 'Create a genuinely original algorithm problem for the practice library.',
      destination: 'question_bank',
      generation_slot: slot
    });

    if (!result || !result.success || !result.data) {
      throw new Error(result?.error || 'LLM Generation Failed.');
    }

    generated = result.data;
  } catch (err) {
    failureReason = err.message || failureReason;
    failureCategory = err.code || 'PIPELINE_ERROR';
  }

  let createdDraftId = null;
  if (generated) {
    try {
      const createdDraft = await createQuestion({ 
        ...generated,
        is_active: true
      }, adminId);
      
      createdDraftId = createdDraft.id;
      
      await getRepo().execute(
        `INSERT INTO question_bank_automation_logs (id, target_slot, mode, status, question_id) VALUES (?, ?, ?, ?, ?)`,
        [`auto-log-${uuidv4().slice(0, 8)}`, slot, 'auto_fill', 'success', createdDraftId]
      );

      return { 
        success: true, 
        status: 'success', 
        challenge: createdDraft, 
        message: `AI challenge for slot ${slot} generated successfully.` 
      };
    } catch (dbErr) {
      await getRepo().execute(
        `INSERT INTO question_bank_automation_logs (id, target_slot, mode, status, failure_category, details) VALUES (?, ?, ?, ?, ?, ?)`,
        [`auto-log-${uuidv4().slice(0, 8)}`, slot, 'auto_fill', 'failed', 'DATABASE_ERROR', dbErr.message]
      );
      return { 
        success: false, 
        status: 'failed', 
        error: `Database insert failed: ${dbErr.message}`,
        failure_category: 'DATABASE_ERROR' 
      };
    }
  }

  await getRepo().execute(
    `INSERT INTO question_bank_automation_logs (id, target_slot, mode, status, failure_category, details) VALUES (?, ?, ?, ?, ?, ?)`,
    [`auto-log-${uuidv4().slice(0, 8)}`, slot, 'auto_fill', 'failed', failureCategory, failureReason]
  );

  return { 
    success: false, 
    status: 'failed', 
    error: failureReason, 
    failure_category: failureCategory 
  };
}

let schedulerTimer = null;
let schedulerRunning = false;

async function runQuestionBankScheduledAutomation() {
  if (schedulerRunning) return null;
  
  const settings = await getAutomationSettings();
  if (!settings.is_enabled) {
    return null;
  }
  
  schedulerRunning = true;
  
  try {
    const slot = getCurrentIstSlot();
    const result = await generateForSlot(slot);
    await persistRunStatus(result.status);
    return result;
  } catch (err) {
    await persistRunStatus('failed');
    throw err;
  } finally {
    schedulerRunning = false;
  }
}

function startQuestionBankScheduler() {
  stopQuestionBankScheduler();
  console.log('⏰ Question Bank Automation Scheduler starting. Generates 1 AI Question every 2 hours (IST).');
  
  // Run immediately on startup
  runQuestionBankScheduledAutomation().catch(err => 
    console.error('❌ Question Bank scheduler startup check failed:', err.message)
  );
  
  schedulerTimer = setInterval(async () => {
    try {
      const result = await runQuestionBankScheduledAutomation();
      if (result && result.status !== 'SUCCESS_NOOP') {
        console.log(`✅ Question Bank generation for slot completed with status: ${result.status}.`);
      }
    } catch (err) {
      console.error('❌ Error executing Question Bank scheduler check:', err.message);
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
  const yyyyMmDd = today; // "YYYY-MM-DD"
  
  // Count how many questions generated today
  const rows = await getRepo().many(
    `SELECT generation_slot, created_at FROM questions WHERE generation_slot LIKE ? ORDER BY generation_slot ASC`,
    [`${yyyyMmDd}-%`]
  );
  
  const currentSlot = getCurrentIstSlot();
  
  return {
    today_date: today,
    generated_today: rows.length,
    slots_completed: rows.map(r => r.generation_slot),
    current_slot: currentSlot
  };
}

module.exports = {
  getCurrentIstSlot,
  generateForSlot,
  startQuestionBankScheduler,
  stopQuestionBankScheduler,
  runQuestionBankScheduledAutomation,
  getQuestionBankGenerationStatus,
  getAutomationSettings,
  updateAutomationSettings,
  getAutomationLogs
};
