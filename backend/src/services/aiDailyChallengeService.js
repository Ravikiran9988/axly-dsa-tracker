const shared = require('./aiSharedGenerationService');

module.exports = {
  ...shared,
  generateDailyChallenge: (options) => shared.generateUniqueProblem({ ...options, destination: 'daily_challenge' })
};
