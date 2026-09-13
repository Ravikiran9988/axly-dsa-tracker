const Database = require('better-sqlite3');
const db = new Database('data/axly_dsa.db', { readonly: true });

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
tables.forEach(t => {
  console.log('\nTABLE:', t.name);
  const cols = db.prepare(`PRAGMA table_info(${t.name})`).all();
  cols.forEach(c => console.log(`  ${c.name} (${c.type})`));
  try {
    const cnt = db.prepare(`SELECT COUNT(*) as c FROM ${t.name}`).get();
    console.log(`  rows: ${cnt.c}`);
  } catch(e) {}
});
