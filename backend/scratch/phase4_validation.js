const Database = require('better-sqlite3');
const path = require('path');

async function validatePhase4() {
  const dbPath = path.join(__dirname, '../data/axly_dsa_migration_copy.db');
  const db = new Database(dbPath);

  console.log("==========================================");
  console.log("PHASE 4 DATA INTEGRITY & BOUNDARY VALIDATION");
  console.log("==========================================");

  try {
    const cols = db.prepare(`PRAGMA table_info(daily_challenge_metadata)`).all().map(c => c.name);
    if (!cols.includes('status')) {
      db.prepare(`ALTER TABLE daily_challenge_metadata ADD COLUMN status TEXT NOT NULL DEFAULT 'draft'`).run();
    }
  } catch (e) {}

  // Check 1: Find a published challenge to expire
  console.log("\n1. Preparing mock published challenge for yesterday...");
  
  const mockDate = new Date();
  mockDate.setUTCDate(mockDate.getUTCDate() - 1);
  const yyyy = mockDate.getUTCFullYear();
  const mm = String(mockDate.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(mockDate.getUTCDate()).padStart(2, '0');
  const yesterdayStr = `${yyyy}-${mm}-${dd}`;

  db.exec(`
    INSERT INTO questions (id, title, difficulty, url, status, is_practice) 
    VALUES ('q-mock-p4', 'Phase 4 Expiration Mock', 'easy', 'N/A', 'published', 0)
    ON CONFLICT DO NOTHING;
  `);

  db.exec(`
    INSERT INTO daily_challenge_metadata (question_id, scheduled_date, status)
    VALUES ('q-mock-p4', '${yesterdayStr}', 'published')
    ON CONFLICT DO NOTHING;
  `);

  console.log("Mock data inserted.");

  // Check 2: Manually run the expiration logic
  console.log("\n2. Running expiration logic manually...");
  
  // Need to get Canonical IST Date equivalent
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset);
  const istHours = istTime.getUTCHours();
  const istMinutes = istTime.getUTCMinutes();
  
  if (istHours === 0 && istMinutes < 30) {
      istTime.setUTCDate(istTime.getUTCDate() - 1);
  }
  const tY = istTime.getUTCFullYear();
  const tM = String(istTime.getUTCMonth() + 1).padStart(2, '0');
  const tD = String(istTime.getUTCDate()).padStart(2, '0');
  const targetDate = `${tY}-${tM}-${tD}`;

  console.log(`Target Canonical IST Date: ${targetDate}`);

  // Query mimicking the service
  const expiredIdsRow = db.prepare(`
    SELECT q.id 
    FROM questions q
    JOIN daily_challenge_metadata dcm ON q.id = dcm.question_id
    WHERE dcm.scheduled_date <= ? AND dcm.status = 'published' AND q.is_active = 1
  `).all(targetDate);

  const expiredIds = expiredIdsRow.map(row => row.id);
  console.log(`Found ${expiredIds.length} expired challenges:`, expiredIds);

  if (expiredIds.length > 0) {
    const updateMeta = db.prepare(`
      UPDATE daily_challenge_metadata 
      SET status = 'archived', updated_at = CURRENT_TIMESTAMP 
      WHERE question_id = ?
    `);
    const updateQ = db.prepare(`
      UPDATE questions 
      SET is_practice = 1, status = 'archived', updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);

    db.transaction(() => {
      for (const id of expiredIds) {
        updateMeta.run(id);
        updateQ.run(id);
      }
    })();
    console.log("Expiration transaction applied successfully.");
  }

  // Check 3: Verify the changes
  console.log("\n3. Verifying post-expiration state...");
  const verifyRow = db.prepare(`
    SELECT q.is_practice, q.status as q_status, dcm.status as dcm_status 
    FROM questions q
    JOIN daily_challenge_metadata dcm ON q.id = dcm.question_id
    WHERE q.id = 'q-mock-p4'
  `).get();

  console.log("Mock Question State:", verifyRow);

  if (verifyRow && verifyRow.is_practice === 1 && verifyRow.q_status === 'archived' && verifyRow.dcm_status === 'archived') {
    console.log("✅ SUCCESS: Transition to practice mode correctly applied.");
  } else {
    console.log("❌ FAILED: State transition did not match expectations.");
  }

  // Check 4: Check what happens if a user solves this in practice
  console.log("\n4. Verifying gamification logic on expired challenge...");
  console.log("The gamificationService uses the query:");
  console.log("SELECT question_id FROM daily_challenge_metadata WHERE question_id = ? AND status IN ('published', 'scheduled')");
  
  const isDaily = db.prepare(`SELECT question_id FROM daily_challenge_metadata WHERE question_id = ? AND status IN ('published', 'scheduled') LIMIT 1`).get('q-mock-p4');
  console.log("Is Daily Challenge Score eligible? : ", Boolean(isDaily));
  if (!isDaily) {
      console.log("✅ SUCCESS: Because status is archived, it evaluates to false, correctly yielding Practice Points instead of Daily Points.");
  }
}

validatePhase4().catch(console.error);
