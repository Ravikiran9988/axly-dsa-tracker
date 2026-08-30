const app = require('./app');
const { assertProductionDatabase } = require('./config/runtimeDatabase');
const { checkPostgresHealth } = require('./db/postgres');
const { initPostgresSchema } = require('./db/postgresSchema');

const PORT = process.env.PORT || 5000;

async function startServer() {
  assertProductionDatabase();

  let startupError = null;
  if (process.env.NODE_ENV === 'production') {
    const health = await checkPostgresHealth();
    if (!health.healthy) {
      startupError = `PostgreSQL health check failed: ${health.reason || 'database unavailable'}`;
      console.error('❌', startupError);
    } else {
      console.log('✅ Production PostgreSQL connection verified.');
      console.log('🔄 Applying PostgreSQL migrations...');
      await initPostgresSchema();
      console.log('✅ PostgreSQL migrations applied.');
    }
  } else {
    // Local / Test SQLite initialization
    const { initSchema } = require('./db/db');
    const { seedDatabase } = require('./db/seed');
    const { seedPracticeProblems } = require('./db/practiceSeed');
    initSchema();
    seedDatabase();
    seedPracticeProblems();
  }

  // Initialize Background 00:00 UTC Daily Challenge Automation Scheduler
  try {
    const { startAutomationScheduler } = require('./services/dailyChallengeAutomationService');
    startAutomationScheduler();
  } catch (err) {
    console.error('Failed to start scheduler:', err);
  }

  const server = app.listen(PORT, () => {
    console.log(`🚀 Axly DSA Tracker API running on port ${PORT}`);
    console.log(`📡 API Version 1 mounted at /api/v1`);
  });
  
  // Attach startup error to app for health check to read
  app.locals.startupError = startupError;

  return server;
}

if (require.main === module) {
  startServer().catch(error => {
    console.error('❌ Failed to start Axly API:', error.message);
    process.exit(1);
  });
}

module.exports = { startServer };
