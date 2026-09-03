const { db, initSchema } = require('../src/db/db');
const { seedDatabase } = require('../src/db/seed');
const {
  getAutomationSettings,
  updateAutomationSettings,
  toBooleanFlag
} = require('../src/services/dailyChallengeAutomationService');

describe('Daily Challenge automation settings', () => {
  beforeAll(() => {
    initSchema();
    seedDatabase();
  });

  afterAll(() => {
    // Leave the local test database in the normal enabled auto-fill state.
    db.prepare(`
      UPDATE daily_challenge_automation_settings
      SET mode = 'auto_fill', is_enabled = 1, retry_limit = 3
      WHERE id = 'global-settings'
    `).run();
  });

  test('normalizes boolean values without PostgreSQL INTEGER mismatch', async () => {
    await updateAutomationSettings({ mode: 'auto_fill', is_enabled: true });
    const enabled = await getAutomationSettings();
    expect(enabled.is_enabled).toBe(true);

    const rawEnabled = db.prepare(`
      SELECT is_enabled FROM daily_challenge_automation_settings
      WHERE id = 'global-settings'
    `).get();
    expect(rawEnabled.is_enabled).toBe(1);

    await updateAutomationSettings({ is_enabled: false });
    const disabled = await getAutomationSettings();
    expect(disabled.is_enabled).toBe(false);

    const rawDisabled = db.prepare(`
      SELECT is_enabled FROM daily_challenge_automation_settings
      WHERE id = 'global-settings'
    `).get();
    expect(rawDisabled.is_enabled).toBe(0);
  });

  test.each([
    [true, true],
    [false, false],
    [1, true],
    [0, false],
    ['true', true],
    ['false', false],
    ['1', true],
    ['0', false]
  ])('toBooleanFlag(%p) -> %p', (input, expected) => {
    expect(toBooleanFlag(input)).toBe(expected);
  });
});
