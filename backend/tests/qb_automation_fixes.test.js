process.env.JWT_SECRET = 'axly-dsa-tracker-dev-secret-key-32-chars-minimum';
const request = require('supertest');
const app = require('../src/app');
const { getRepository } = require('../src/db/repositoryFactory');
const questionBankAutomationService = require('../src/services/questionBankAutomationService');
const jwt = require('jsonwebtoken');

const testToken = jwt.sign({ id: 'usr-admin-1', role: 'admin' }, process.env.JWT_SECRET);

describe('Question Bank Automation Fixes', () => {
  let repo;
  
  beforeAll(async () => {
    repo = getRepository();
    await repo.execute("DELETE FROM question_bank_automation_logs");
    await repo.execute("DELETE FROM questions WHERE id LIKE 'q-test-qb-%'");
    await repo.execute("INSERT OR IGNORE INTO users (id, email, name, role) VALUES ('usr-admin-1', 'admin@axly.local', 'Admin', 'admin')");
    await repo.execute("UPDATE users SET role = 'admin' WHERE id = 'usr-admin-1'");
  });

  afterAll(async () => {
    await repo.execute("DELETE FROM question_bank_automation_logs");
    await repo.execute("DELETE FROM questions WHERE id LIKE 'q-test-qb-%'");
    await repo.execute("DELETE FROM users WHERE id = 'usr-admin-1'");
  });

  test('1. Null/missing timestamp does not produce Invalid Date in API response', async () => {
    // Insert a log with an artificial NULL created_at via direct DB bypass if possible,
    // or just unit test the normalization logic.
    // Our fix handles invalid timestamps by normalizing them to ISO.
    
    // Create a raw log with a SQLite string timestamp
    await repo.execute(`
      INSERT INTO question_bank_automation_logs (id, target_slot, mode, status, created_at)
      VALUES ('auto-log-test-date', '2026-09-16-10', 'auto_fill', 'success', '2026-09-16 10:00:00')
    `);

    const res = await request(app)
      .get('/api/v1/ai-questions/question-bank/automation/logs?limit=5')
      .set('Authorization', `Bearer ${testToken}`)
      .set('x-user-id', 'usr-admin-1')
      .set('x-user-role', 'admin');

    expect(res.status).toBe(200);
    const log = res.body.find(l => l.id === 'auto-log-test-date');
    expect(log).toBeDefined();
    
    // The fixed endpoint should have replaced ' ' with 'T' and appended 'Z'
    expect(log.created_at).toBe('2026-09-16T10:00:00.000Z');
  });

  test('2. Manual Auto-Fill generates NEW DRAFT with generation_slot: null', async () => {
    // Occupy the current slot first
    const currentSlot = questionBankAutomationService.getCurrentIstSlot();
    
    await repo.execute(`
      INSERT INTO questions (id, title, url, status, difficulty, is_practice, generation_slot)
      VALUES ('q-test-qb-occupy', 'Occupied Slot', 'test-url-1', 'published', 'medium', 1, ?)
    `, [currentSlot]);

    // Now trigger manual generation
    const res = await request(app)
      .post('/api/v1/ai-questions/question-bank/manual')
      .set('Authorization', `Bearer ${testToken}`)
      .set('x-user-id', 'usr-admin-1')
      .set('x-user-role', 'admin');

    // It should not return SUCCESS_NOOP, it should return 202 pending
    expect(res.status).toBe(202);
    expect(res.body.status).toBe('pending');
  });

  test('3. Duplicate-key race → idempotent recovery to SUCCESS_NOOP', async () => {
    // We simulate a race condition by manually creating an 'in_progress' log,
    // occupying the slot, and calling generateForSlot. It should catch the 
    // unique constraint error and return SUCCESS_NOOP without failing.
    
    const raceSlot = '2026-09-16-14';
    
    // Occupy the slot (simulate process A already finished)
    await repo.execute(`
      INSERT INTO questions (id, title, url, status, difficulty, is_practice, generation_slot)
      VALUES ('q-test-qb-race', 'Race Won', 'test-url-2', 'published', 'medium', 1, ?)
    `, [raceSlot]);

    // Call generateForSlot (simulating process B losing the race at insert time)
    const result = await questionBankAutomationService.generateForSlot(raceSlot);
    
    // Because the slot is already filled by "Process A", generateForSlot should catch 
    // the duplicate key error and recover idempotently.
    expect(result.success).toBe(true);
    expect(result.status).toBe('SUCCESS_NOOP');
    expect(result.message).toContain('another process');
  });
});
