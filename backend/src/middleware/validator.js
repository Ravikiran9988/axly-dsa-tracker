const { AppError } = require('./errorHandler');

function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const firstIssue = result.error.issues[0];
      const field = firstIssue.path.join('.') || undefined;
      const message = firstIssue.message;
      return next(new AppError(message, 400, 'VALIDATION_ERROR', field));
    }
    req.body = result.data;
    next();
  };
}

function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const firstIssue = result.error.issues[0];
      const field = firstIssue.path.join('.') || undefined;
      const message = firstIssue.message;
      return next(new AppError(message, 400, 'VALIDATION_ERROR', field));
    }
    req.query = result.data;
    next();
  };
}

module.exports = {
  validateBody,
  validateQuery
};
