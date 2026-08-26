const app = require('./app');
const { initSchema } = require('./db/db');
const { seedDatabase } = require('./db/seed');

const PORT = process.env.PORT || 5000;

// Initialize database schema and initial data
initSchema();
if (process.env.NODE_ENV !== 'production') {
  seedDatabase();
}

const server = app.listen(PORT, () => {
  console.log(`🚀 Axly DSA Tracker API running on http://localhost:${PORT}`);
  console.log(`📡 API Version 1 mounted at http://localhost:${PORT}/api/v1`);
});

module.exports = server;
