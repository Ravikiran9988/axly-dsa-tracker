const db = require('better-sqlite3')(':memory:');
db.exec('CREATE TABLE test (id INT)');
try {
  db.prepare('INSERT INTO test (id) VALUES (?)').run(1, 2);
} catch (e) {
  console.log('Error 1:', e.message);
}
try {
  db.prepare('INSERT INTO test (id) VALUES (?)').run([1, 2]);
} catch (e) {
  console.log('Error 2:', e.message);
}
