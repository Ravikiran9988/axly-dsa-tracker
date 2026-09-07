/**
 * Daily Challenge date helpers for the student UI.
 * All Daily Challenge calendar dates use India Standard Time (Asia/Kolkata).
 */

const DAILY_CHALLENGE_TIME_ZONE = 'Asia/Kolkata';

export function getIstDateString(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return getIstDateString(new Date());

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: DAILY_CHALLENGE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(d);

  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

/**
 * Format a Daily Challenge date as the IST calendar date.
 * Handles both YYYY-MM-DD values and timestamp/ISO values from the API.
 */
export function formatIstDate(value, fallback = new Date()) {
  if (!value) return getIstDateString(fallback);

  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? getIstDateString(fallback) : getIstDateString(parsed);
}
