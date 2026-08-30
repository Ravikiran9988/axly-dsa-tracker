/**
 * Canonical UTC Date Utility for Axly Daily Challenge & Platform
 * 
 * Enforces strict UTC calendar dates across:
 * - Daily Challenge Scheduling & Publishing
 * - Daily Challenge Automation & Next-Day Targeting
 * - Today's Challenge queries
 * - Admin counters & Next scheduled queries
 * - Streaks & Leaderboards
 */

/**
 * Returns canonical UTC date string in 'YYYY-MM-DD' format.
 * @param {Date|string|number} [date=new Date()]
 * @returns {string} 'YYYY-MM-DD'
 */
function getCanonicalUtcDate(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns tomorrow's canonical UTC date string in 'YYYY-MM-DD' format.
 * Used by 00:00 UTC Daily Challenge Automation to target the next calendar day.
 * @param {Date|string|number} [date=new Date()]
 * @returns {string} 'YYYY-MM-DD'
 */
function getNextCanonicalUtcDate(date = new Date()) {
  const d = date instanceof Date ? new Date(date.getTime()) : new Date(date);
  if (isNaN(d.getTime())) {
    const now = new Date();
    now.setUTCDate(now.getUTCDate() + 1);
    return getCanonicalUtcDate(now);
  }
  d.setUTCDate(d.getUTCDate() + 1);
  return getCanonicalUtcDate(d);
}

/**
 * Validates whether a string is a strict YYYY-MM-DD calendar date.
 * @param {string} dateStr
 * @returns {boolean}
 */
function isValidDateString(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  const dateObj = new Date(Date.UTC(y, m - 1, d));
  return (
    dateObj.getUTCFullYear() === y &&
    dateObj.getUTCMonth() === m - 1 &&
    dateObj.getUTCDate() === d
  );
}

/**
 * Checks if targetDateStr is strictly in the future relative to baseDateStr (in UTC).
 * @param {string} targetDateStr - 'YYYY-MM-DD'
 * @param {string} [baseDateStr] - 'YYYY-MM-DD' (defaults to current UTC today)
 * @returns {boolean}
 */
function isFutureUtcDate(targetDateStr, baseDateStr = null) {
  if (!isValidDateString(targetDateStr)) return false;
  const base = baseDateStr || getCanonicalUtcDate();
  return targetDateStr > base;
}

/**
 * Calculates the difference in UTC calendar days (d2 - d1).
 * @param {string} dateStr1 - 'YYYY-MM-DD'
 * @param {string} dateStr2 - 'YYYY-MM-DD'
 * @returns {number|null}
 */
function getUtcCalendarDifference(dateStr1, dateStr2) {
  if (!isValidDateString(dateStr1) || !isValidDateString(dateStr2)) return null;
  const [y1, m1, d1] = dateStr1.split('-').map(Number);
  const [y2, m2, d2] = dateStr2.split('-').map(Number);
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

module.exports = {
  getCanonicalUtcDate,
  getNextCanonicalUtcDate,
  isValidDateString,
  isFutureUtcDate,
  getUtcCalendarDifference
};
