const { getRepository } = require('../db/repositoryFactory');
const { v4: uuidv4 } = require('uuid');

const repo = getRepository();

const SENSITIVE_KEYS = new Set([
  'password', 'password_hash', 'token', 'jwt', 'secret',
  'api_key', 'authorization', 'cookie', 'session',
  'access_token', 'refresh_token', 'private_key'
]);

function sanitizeData(data) {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(item => sanitizeData(item));

  const clean = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey) || lowerKey.includes('secret') || lowerKey.includes('token') || lowerKey.includes('password')) {
      clean[key] = '[REDACTED]';
    } else if (key === 'test_cases' && Array.isArray(value)) {
      clean[key] = value.map(tc => ({
        ...tc,
        expected_output: tc.is_hidden ? '[HIDDEN_EXPECTED_OUTPUT]' : tc.expected_output
      }));
    } else if (typeof value === 'object' && value !== null) {
      clean[key] = sanitizeData(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

function stringifySafe(val) {
  if (val === undefined || val === null) return null;
  if (typeof val === 'string') return val;
  try {
    return JSON.stringify(sanitizeData(val));
  } catch {
    return String(val);
  }
}

/**
 * Log a sensitive admin or business action to the audit trail.
 */
async function logAction({
  actorId = null,
  actorEmail = null,
  action,
  resourceType,
  resourceId = null,
  beforeData = null,
  afterData = null,
  metadata = null,
  ipAddress = null,
  userAgent = null
}) {
  try {
    const id = uuidv4();
    const beforeStr = stringifySafe(beforeData);
    const afterStr = stringifySafe(afterData);
    const metaStr = stringifySafe(metadata);
    const nowIso = new Date().toISOString();

    await repo.execute(`
      INSERT INTO admin_audit_logs (
        id, actor_id, actor_email, action, resource_type, resource_id,
        before_data, after_data, metadata, ip_address, user_agent, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      actorId || null,
      actorEmail || null,
      String(action),
      String(resourceType),
      resourceId ? String(resourceId) : null,
      beforeStr,
      afterStr,
      metaStr,
      ipAddress || null,
      userAgent || null,
      nowIso
    ]);

    return { id, action, resource_type: resourceType, resource_id: resourceId };
  } catch (err) {
    console.warn('[Audit Log Error]', err.message);
    return null;
  }
}

/**
 * Query audit logs with pagination and filters.
 */
async function listAuditLogs({
  action,
  resourceType,
  actorId,
  fromDate,
  toDate,
  page = 1,
  limit = 25
}) {
  const conditions = [];
  const params = [];

  if (action && action.trim()) {
    conditions.push('action = ?');
    params.push(action.trim());
  }
  if (resourceType && resourceType.trim()) {
    conditions.push('resource_type = ?');
    params.push(resourceType.trim());
  }
  if (actorId && actorId.trim()) {
    conditions.push('actor_id = ?');
    params.push(actorId.trim());
  }
  if (fromDate && fromDate.trim()) {
    conditions.push('created_at >= ?');
    params.push(fromDate.trim());
  }
  if (toDate && toDate.trim()) {
    conditions.push('created_at <= ?');
    params.push(toDate.trim());
  }

  const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const countRow = await repo.one(`SELECT COUNT(*) AS total FROM admin_audit_logs ${whereSql}`, params);
  const total = Number(countRow?.total || 0);

  const p = Math.max(1, Number(page) || 1);
  const l = Math.max(1, Number(limit) || 25);
  const offset = (p - 1) * l;

  const rows = await repo.many(`
    SELECT 
      l.id, l.actor_id, l.actor_email, l.action, l.resource_type, l.resource_id,
      l.before_data, l.after_data, l.metadata, l.ip_address, l.user_agent, l.created_at,
      u.name AS actor_name, u.role AS actor_role
    FROM admin_audit_logs l
    LEFT JOIN users u ON l.actor_id = u.id
    ${whereSql}
    ORDER BY l.created_at DESC
    LIMIT ? OFFSET ?
  `, [...params, l, offset]);

  function parseJson(str) {
    if (!str) return null;
    if (typeof str === 'object') return str;
    try { return JSON.parse(str); } catch { return null; }
  }

  return {
    data: rows.map(r => ({
      ...r,
      before_data: parseJson(r.before_data),
      after_data: parseJson(r.after_data),
      metadata: parseJson(r.metadata)
    })),
    page: p,
    limit: l,
    total
  };
}

module.exports = {
  logAction,
  listAuditLogs,
  sanitizeData
};
