// Standard error response handler per PRD Section 20.6

class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', field = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.field = field;
  }
}

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const code = err.code || (statusCode === 400 ? 'VALIDATION_ERROR' : statusCode === 401 ? 'UNAUTHORIZED' : statusCode === 403 ? 'FORBIDDEN' : statusCode === 404 ? 'NOT_FOUND' : statusCode === 409 ? 'CONFLICT' : 'INTERNAL_ERROR');
  const message = err.message || 'An unexpected error occurred';

  const errorResponse = {
    error: {
      code,
      message,
      ...(err.field ? { field: err.field } : {})
    }
  };

  if (statusCode === 500) {
    console.error('[Error 500]', err);
  }

  res.status(statusCode).json(errorResponse);
}

module.exports = {
  AppError,
  errorHandler
};
