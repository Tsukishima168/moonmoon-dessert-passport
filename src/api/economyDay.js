const TAIPEI_TIME_ZONE = 'Asia/Taipei';
const TAIPEI_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: TAIPEI_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * @param {Date | string | number} value
 * @returns {string}
 */
export function getTaipeiDay(value) {
  const parts = TAIPEI_DATE_FORMATTER.formatToParts(new Date(value));
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    throw new RangeError('Unable to derive an Asia/Taipei calendar day');
  }

  return `${year}-${month}-${day}`;
}
/**
 * @param {string} day
 * @param {number} offset
 * @returns {string}
 */
export function shiftTaipeiDay(day, offset) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isSafeInteger(offset)) {
    throw new RangeError('Invalid Asia/Taipei day shift');
  }

  const midnight = Date.parse(`${day}T00:00:00+08:00`);
  if (!Number.isFinite(midnight)) {
    throw new RangeError('Invalid Asia/Taipei calendar day');
  }

  return getTaipeiDay(midnight + offset * 24 * 60 * 60 * 1000);
}
