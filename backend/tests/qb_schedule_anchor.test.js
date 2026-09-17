/**
 * QB schedule-anchor regression tests.
 * Verifies that slots are anchored to 00:30 IST rather than the top of the hour,
 * and that the next scheduler run is calculated independently of process start time.
 */

const {
  getCurrentIstSlot,
  getDelayToNextQbBoundary
} = require('../src/services/questionBankAutomationService');

describe('Question Bank 12:30 AM IST schedule anchor', () => {
  test('00:15 IST belongs to the previous day 22:30 slot', () => {
    expect(getCurrentIstSlot(new Date('2026-09-16T18:45:00.000Z'))).toBe('2026-09-16-22');
  });

  test('00:30 IST starts the new 00:30 slot', () => {
    expect(getCurrentIstSlot(new Date('2026-09-16T19:00:00.000Z'))).toBe('2026-09-17-00');
  });

  test('02:29 IST is still the 00:30 slot', () => {
    expect(getCurrentIstSlot(new Date('2026-09-16T20:59:00.000Z'))).toBe('2026-09-17-00');
  });

  test('02:30 IST starts the 02:30 slot', () => {
    expect(getCurrentIstSlot(new Date('2026-09-16T21:00:00.000Z'))).toBe('2026-09-17-02');
  });

  test('10:29 IST does not enter the 10:30 slot early', () => {
    expect(getCurrentIstSlot(new Date('2026-09-17T04:59:00.000Z'))).toBe('2026-09-17-08');
  });

  test('10:30 IST starts the 10:30 slot', () => {
    expect(getCurrentIstSlot(new Date('2026-09-17T05:00:00.000Z'))).toBe('2026-09-17-10');
  });

  test('09:17 IST schedules the next run for 10:30 IST', () => {
    const now = new Date('2026-09-17T03:47:00.000Z');
    const delay = getDelayToNextQbBoundary(now);
    const expected = new Date('2026-09-17T05:00:00.000Z').getTime() - now.getTime();
    expect(delay).toBe(expected);
  });

  test('17:06 IST schedules the next run for 18:30 IST', () => {
    const now = new Date('2026-09-17T11:36:00.000Z');
    const delay = getDelayToNextQbBoundary(now);
    const expected = new Date('2026-09-17T13:00:00.000Z').getTime() - now.getTime();
    expect(delay).toBe(expected);
  });
});
