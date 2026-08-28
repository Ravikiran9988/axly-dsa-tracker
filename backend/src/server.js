const app = require('./app');
const { initSchema } = require('./db/db');
const { seedDatabase } = require('./db/seed');
const { assertProductionDatabase } = require('./config/runtimeDatabase');
const { checkPostgresHealth } = require('./db/postgres');

const PORT = process.env.PORT || 5000;

async function startServer() {
  assertProductionDatabase();
  initSchema();
  if (process.env.NODE_ENV !== 'production') seedDatabase();

  if (process.env.NODE_ENV === 'production') {
    const health = await checkPostgresHealth();
    if (!health.healthy) throw new Error(`PostgreSQL health check failed: ${health.reason || 'database unavailable'}`);
    console.log('✅ PostgreSQL connection verified.');
  }

  const server = app.listen(PORT, () => {
    console.log(`🚀 Axly DSA Tracker API running on port ${PORT}`);
    console.log(`📡 API Version 1 mounted at /api/v1`);
  });
  return server;
}

if (require.main === module) {
  startServer().catch(error => {
    console.error('❌ Failed to start Axly API:', error.message);
    process.exit(1);
  });
}

module.exports = { startServer };
