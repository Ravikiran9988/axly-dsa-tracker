const auditService = require('../services/auditService');

async function getAuditLogs(req, res, next) {
  try {
    const { action, resource_type, actor_id, from_date, to_date, page = 1, limit = 25 } = req.query;
    const result = await auditService.listAuditLogs({
      action,
      resourceType: resource_type,
      actorId: actor_id,
      fromDate: from_date,
      toDate: to_date,
      page,
      limit
    });
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAuditLogs
};
