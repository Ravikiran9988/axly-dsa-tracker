const { AppError } = require('./errorHandler');

function requireRole(...requiredRoles) {
  const roles = requiredRoles.flatMap((role) => Array.isArray(role) ? role : [role]);

  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError(`Access forbidden: requires ${roles.join(' or ')} role`, 403, 'FORBIDDEN'));
    }

    next();
  };
}

module.exports = {
  requireRole
};
