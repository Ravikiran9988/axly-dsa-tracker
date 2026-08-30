const { pool } = require('../src/db/postgres');
async function run() {
  const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
  console.log(res.rows.map(r => r.table_name));
  pool.end();
}
run();
