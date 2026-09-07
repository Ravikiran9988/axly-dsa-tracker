/**
 * Canonical calendar date utilities for Axly.
 *
 * Daily Challenge uses Asia/Kolkata (IST) as its calendar boundary.
 * UTC helpers are retained explicitly for non-Daily-Challenge callers.
 */

function getActualUtcDate(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function getCanonicalIstDate(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return getCanonicalIstDate(new Date());
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(d);
  const values = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function getNextCanonicalIstDate(date = new Date()) {
  const d = date instanceof Date ? new Date(date.getTime()) : new Date(date);
  if (isNaN(d.getTime())) return getNextCanonicalIstDate(new Date());
  const istDate = getCanonicalIstDate(d);
  const [y, m, day] = istDate.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, day + 1));
  return getActualUtcDate(next);
}

// Backwards-compatible names used by the Daily Challenge codebase.
// These now represent the canonical IST calendar, not UTC.
function getCanonicalUtcDate(date = new Date()) {
  return getCanonicalIstDate(date);
}

function getNextCanonicalUtcDate(date = new Date()) {
  return getNextCanonicalIstDate(date);
}

function isValidDateString(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dateObj = new Date(Date.UTC(y, m - 1, d));
  return dateObj.getUTCFullYear() === y && dateObj.getUTCMonth() === m - 1 && dateObj.getUTCDate() === d;
}

function isFutureIstDate(targetDateStr, baseDateStr = null) {
  if (!isValidDateString(targetDateStr)) return false;
  return targetDateStr > (baseDateStr || getCanonicalIstDate());
}

// Legacy alias retained for existing Daily Challenge callers.
function isFutureUtcDate(targetDateStr, baseDateStr = null) {
  return isFutureIstDate(targetDateStr, baseDateStr);
}

function getUtcCalendarDifference(dateStr1, dateStr2) {
  if (!isValidDateString(dateStr1) || !isValidDateString(dateStr2)) return null;
  const [y1, m1, d1] = dateStr1.split('-').map(Number);
  const [y2, m2, d2] = dateStr2.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

module.exports = {
  getCanonicalUtcDate,
  getNextCanonicalUtcDate,
  getCanonicalIstDate,
  getNextCanonicalIstDate,
  getActualUtcDate,
  isValidDateString,
  isFutureUtcDate,
  isFutureIstDate,
  getUtcCalendarDifference
};
