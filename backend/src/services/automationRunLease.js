const { getRepository } = require('../db/repositoryFactory');
const { getCanonicalIstDate } = require('../utils/dateUtils');

// Manual AI generation is asynchronous. Keep the database timestamp fresh while
// the Node process is alive so a real long-running job is not mistaken for a
// crashed job after the stale-run threshold.
const HEARTBEAT_INTERVAL_MS = 60 * 1000;
const STALE_RUN_THRESHOLD_MS = 5 * 60 * 1000;

function getRepo() {
  return getRepository();
}

function startAutomationRunHeartbeat() {
  const heartbeat = setInterval(async () => {
    try {
      await getRepo().execute(`
        UPDATE daily_challenge_automation_settings
        SET last_run_at = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = 'global-settings' AND last_run_status = 'running'
      `, [new Date().toISOString()]);
    } catch (err) {
      console.error('[DailyAutomation] Heartbeat update failed:', err.message);
    }
  }, HEARTBEAT_INTERVAL_MS);

  if (typeof heartbeat.unref === 'function') heartbeat.unref();
  return heartbeat;
}

function stopAutomationRunHeartbeat(heartbeat) {
  if (heartbeat) clearInterval(heartbeat);
}

async function recoverStaleAutomationRun() {
  const row = await getRepo().one(`
    SELECT last_run_status, last_run_at
    FROM daily_challenge_automation_settings
    WHERE id = 'global-settings'
  `);

  if (!row || row.last_run_status !== 'running') {
    return { recovered: false };
  }

  const lastRunAt = Date.parse(row.last_run_at || '');
  if (!Number.isFinite(lastRunAt)) {
    return { recovered: false, reason: 'invalid_last_run_at' };
  }

  const ageMs = Date.now() - lastRunAt;
  if (ageMs < STALE_RUN_THRESHOLD_MS) {
    return { recovered: false, ageMs };
  }

  const now = new Date().toISOString();
  const result = await getRepo().execute(`
    UPDATE daily_challenge_automation_settings
    SET last_run_status = 'failed', last_run_at = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = 'global-settings' AND last_run_status = 'running' AND last_run_at = ?
  `, [now, row.last_run_at]);

  // Do not create a duplicate recovery record if another request won the
  // compare-and-update race.
  if (result && result.changes === 0) {
    return { recovered: false, reason: 'run_changed_concurrently' };
  }

  try {
    await getRepo().execute(`
      INSERT INTO daily_challenge_automation_logs
        (id, target_date, mode, attempt_count, validation_result, sandbox_result,
         status, failure_category, details, created_at)
      VALUES (?, ?, ?, 0, 'Failed', 'Not used', 'failed', ?, ?, CURRENT_TIMESTAMP)
    `, [
      `auto-recovery-${Date.now()}`,
      getCanonicalIstDate(),
      'auto_fill',
      'STALE_RUN_RECOVERED',
      `Recovered a stale Daily Challenge automation run after ${Math.round(ageMs / 60000)} minutes without a heartbeat. The previous process likely terminated before persisting its final status.`
    ]);
  } catch (logErr) {
    console.error('[DailyAutomation] Failed to write stale-run recovery log:', logErr.message);
  }

  console.warn(`[DailyAutomation] Recovered stale RUNNING status after ${Math.round(ageMs / 60000)} minutes.`);
  return { recovered: true, ageMs };
}

module.exports = {
  HEARTBEAT_INTERVAL_MS,
  STALE_RUN_THRESHOLD_MS,
  startAutomationRunHeartbeat,
  stopAutomationRunHeartbeat,
  recoverStaleAutomationRun
};
