const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('../src/db/postgres');

async function checkLocks() {
  const client = await pool.connect();
  try {
    const activeRes = await client.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE state = 'idle in transaction' AND pid != pg_backend_pid();
    `);

    console.log('Terminated idle transactions:', activeRes.rowCount);
  } finally {
    client.release();
    pool.end();
  }
}

checkLocks().catch(console.error);
