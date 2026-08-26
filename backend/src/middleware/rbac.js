const { AppError } = require('./errorHandler');

function requireRole(requiredRole) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
    }

    if (req.user.role !== requiredRole) {
      return next(new AppError(`Access forbidden: requires ${requiredRole} role`, 403, 'FORBIDDEN'));
    }

    next();
  };
}

module.exports = {
  requireRole
};
