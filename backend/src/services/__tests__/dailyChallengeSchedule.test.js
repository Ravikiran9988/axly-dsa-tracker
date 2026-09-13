const {
  getCanonicalIstDate,
  getNextCanonicalIstDate
} = require('../../utils/dateUtils');

describe('Daily Challenge Logical Boundaries (00:30 IST)', () => {
  const MS_PER_MINUTE = 60000;

  it('treats 00:00 IST as previous calendar day logical date', () => {
    // Note: JS Date constructor with UTC offset: 2026-09-13T00:00:00+05:30
    const testDate = new Date('2026-09-13T00:00:00+05:30');
    expect(getCanonicalIstDate(testDate)).toBe('2026-09-12');
    expect(getNextCanonicalIstDate(testDate)).toBe('2026-09-13');
  });

  it('treats 00:29 IST as previous calendar day logical date', () => {
    const testDate = new Date('2026-09-13T00:29:00+05:30');
    expect(getCanonicalIstDate(testDate)).toBe('2026-09-12');
  });

  it('treats 00:30 IST as CURRENT calendar day logical date', () => {
    const testDate = new Date('2026-09-13T00:30:00+05:30');
    expect(getCanonicalIstDate(testDate)).toBe('2026-09-13');
  });

  it('treats 00:31 IST as CURRENT calendar day logical date', () => {
    const testDate = new Date('2026-09-13T00:31:00+05:30');
    expect(getCanonicalIstDate(testDate)).toBe('2026-09-13');
  });

  it('treats 12:00 PM IST as CURRENT calendar day logical date', () => {
    const testDate = new Date('2026-09-13T12:00:00+05:30');
    expect(getCanonicalIstDate(testDate)).toBe('2026-09-13');
  });

  it('treats 23:59 IST as CURRENT calendar day logical date', () => {
    const testDate = new Date('2026-09-13T23:59:00+05:30');
    expect(getCanonicalIstDate(testDate)).toBe('2026-09-13');
  });
});
