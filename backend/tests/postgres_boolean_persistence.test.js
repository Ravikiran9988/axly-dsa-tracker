const { createQuestion } = require('../src/services/questionService');
const { createDailyChallenge } = require('../src/services/dailyChallengeService');
const { createNotification } = require('../src/services/notificationService');
const repo = require('../src/db/repositoryFactory').getRepository();

const SqliteRepository = require('../src/db/sqliteRepository');

describe('PostgreSQL Boolean Persistence Parity', () => {
  let executeSpy;

  beforeEach(() => {
    executeSpy = jest.spyOn(SqliteRepository.prototype, 'execute');
  });

  afterEach(() => {
    executeSpy.mockRestore();
  });

  test('1. createQuestion passes boolean false for is_practice when false is requested', async () => {
    await createQuestion({
      id: 'q-test-bool-1',
      title: 'Boolean Test 1',
      difficulty: 'easy',
      is_practice: false
    });

    // Find the insert query
    const insertCall = executeSpy.mock.calls.find(call => call[0].includes('INSERT INTO questions'));
    expect(insertCall).toBeDefined();
    
    const params = insertCall[1];
    
    // Validate that we are passing actual booleans, not integers 0/1
    const bools = params.filter(p => typeof p === 'boolean');
    expect(bools.includes(false)).toBe(true);
  });

  test('2. createDailyChallenge passes boolean false for is_practice in VALUES', async () => {
    await createDailyChallenge({
      title: 'Boolean DC',
      description: 'Test description',
      difficulty: 'easy',
      admin_id: 'u-1',
      status: 'draft'
    });

    const insertCall = executeSpy.mock.calls.find(call => call[0].includes('INSERT INTO questions') && call[0].includes('is_practice'));
    expect(insertCall).toBeDefined();

    const params = insertCall[1];
    // We expect false to be in the params (for is_practice)
    const bools = params.filter(p => typeof p === 'boolean');
    expect(bools.includes(false)).toBe(true);
    
    // Verify 0 is not hardcoded in VALUES for is_practice
    expect(insertCall[0]).not.toMatch(/VALUES\s*\([^)]*,\s*0\s*,[^)]*\)/);
  });

  test('3. createNotification passes boolean false for is_read', async () => {
    await createNotification({
      userId: 'u-2',
      title: 'Test',
      message: 'Test notification'
    });

    const insertCall = executeSpy.mock.calls.find(call => call[0].includes('INSERT INTO notifications'));
    expect(insertCall).toBeDefined();
    
    const params = insertCall[1];
    // We expect false to be in the params (for is_read)
    const bools = params.filter(p => typeof p === 'boolean');
    expect(bools.includes(false)).toBe(true);
  });
});
