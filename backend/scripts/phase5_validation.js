const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../data/axly_dsa_migration_copy.db');
const db = new Database(dbPath);

console.log('--- Phase 5 Database Parity Validation ---');

// Check schema of daily_challenge_metadata
const cols = db.prepare('PRAGMA table_info(daily_challenge_metadata)').all();
const hasStatus = cols.some(c => c.name === 'status');
console.log('daily_challenge_metadata has status column:', hasStatus);

if (hasStatus) {
  const publishedCount = db.prepare('SELECT COUNT(*) as c FROM daily_challenge_metadata WHERE status = ?').get('published').c;
  console.log('Published challenges in metadata:', publishedCount);
}

const dcQuestionsCount = db.prepare('SELECT COUNT(*) as c FROM questions WHERE id LIKE ?').get('dc-%').c;
console.log('Daily challenge questions in questions table:', dcQuestionsCount);

// Test querying gamification data
try {
  const q = db.prepare(`
    SELECT q.id, q.title, dcm.status 
    FROM daily_challenge_metadata dcm
    JOIN questions q ON dcm.question_id = q.id
    WHERE q.is_active = TRUE
    LIMIT 3
  `).all();
  console.log('Sample canonical challenge fetch:', q);
} catch (err) {
  console.error('Error fetching canonical challenges:', err);
}
