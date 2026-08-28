const { db } = require('../db/db');
const { v4: uuidv4 } = require('uuid');

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
function logAction({
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

    db.prepare(`
      INSERT INTO admin_audit_logs (
        id, actor_id, actor_email, action, resource_type, resource_id,
        before_data, after_data, metadata, ip_address, user_agent, created_at
      ) VALUES (
        @id, @actor_id, @actor_email, @action, @resource_type, @resource_id,
        @before_data, @after_data, @metadata, @ip_address, @user_agent, datetime('now')
      )
    `).run({
      id,
      actor_id: actorId || null,
      actor_email: actorEmail || null,
      action: String(action),
      resource_type: String(resourceType),
      resource_id: resourceId ? String(resourceId) : null,
      before_data: beforeStr,
      after_data: afterStr,
      metadata: metaStr,
      ip_address: ipAddress || null,
      user_agent: userAgent || null
    });

    return { id, action, resource_type: resourceType, resource_id: resourceId };
  } catch (err) {
    console.warn('[Audit Log Error]', err.message);
    return null;
  }
}

/**
 * Query audit logs with pagination and filters.
 */
function listAuditLogs({
  action,
  resourceType,
  actorId,
  fromDate,
  toDate,
  page = 1,
  limit = 25
}) {
  const conditions = [];
  const params = {};

  if (action && action.trim()) {
    conditions.push('action = @action');
    params.action = action.trim();
  }
  if (resourceType && resourceType.trim()) {
    conditions.push('resource_type = @resource_type');
    params.resource_type = resourceType.trim();
  }
  if (actorId && actorId.trim()) {
    conditions.push('actor_id = @actor_id');
    params.actor_id = actorId.trim();
  }
  if (fromDate && fromDate.trim()) {
    conditions.push('created_at >= @from_date');
    params.from_date = fromDate.trim();
  }
  if (toDate && toDate.trim()) {
    conditions.push('created_at <= @to_date');
    params.to_date = toDate.trim();
  }

  const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const countRow = db.prepare(`SELECT COUNT(*) AS total FROM admin_audit_logs ${whereSql}`).get(params);
  const total = countRow ? countRow.total : 0;

  const offset = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(limit));
  params.limit = Math.max(1, Number(limit));
  params.offset = offset;

  const rows = db.prepare(`
    SELECT 
      l.id, l.actor_id, l.actor_email, l.action, l.resource_type, l.resource_id,
      l.before_data, l.after_data, l.metadata, l.ip_address, l.user_agent, l.created_at,
      u.name AS actor_name, u.role AS actor_role
    FROM admin_audit_logs l
    LEFT JOIN users u ON l.actor_id = u.id
    ${whereSql}
    ORDER BY l.created_at DESC
    LIMIT @limit OFFSET @offset
  `).all(params);

  return {
    data: rows.map(r => ({
      ...r,
      before_data: r.before_data ? JSON.parse(r.before_data) : null,
      after_data: r.after_data ? JSON.parse(r.after_data) : null,
      metadata: r.metadata ? JSON.parse(r.metadata) : null
    })),
    page: Number(page),
    limit: Number(limit),
    total
  };
}

module.exports = {
  logAction,
  listAuditLogs,
  sanitizeData
};
