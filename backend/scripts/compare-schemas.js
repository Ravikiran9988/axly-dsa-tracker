require('dotenv').config({ path: '.env' });
const { db } = require('../src/db/db');
const postgres = require('../src/db/postgres');

async function getSqliteSchema() {
  const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`).all();
  const schema = {};
  for (const t of tables) {
    const cols = db.prepare(`PRAGMA table_info(${t.name})`).all();
    schema[t.name] = cols.map(c => c.name);
  }
  return schema;
}

async function getPostgresSchema() {
  if (!postgres.pool) {
    console.error("No postgres pool");
    process.exit(1);
  }
  const tablesRes = await postgres.pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
  `);
  
  const schema = {};
  for (const t of tablesRes.rows) {
    const colsRes = await postgres.pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = $1
    `, [t.table_name]);
    schema[t.table_name] = colsRes.rows.map(c => c.column_name);
  }
  return schema;
}

async function main() {
  const { initSchema } = require('../src/db/db');
  initSchema(); // Ensure sqlite schema is created in memory
  
  const sqliteSchema = await getSqliteSchema();
  const pgSchema = await getPostgresSchema();
  
  for (const table of Object.keys(sqliteSchema)) {
    if (!pgSchema[table]) {
      console.log(`Table missing in Postgres: ${table}`);
      continue;
    }
    
    const sqliteCols = sqliteSchema[table];
    const pgCols = pgSchema[table];
    
    const missingInPg = sqliteCols.filter(c => !pgCols.includes(c));
    if (missingInPg.length > 0) {
      console.log(`Table ${table} missing columns in Postgres: ${missingInPg.join(', ')}`);
    }
  }
  console.log('Schema comparison complete.');
  process.exit(0);
}

main().catch(console.error);
