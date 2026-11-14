/**
 * Locale-aware formatting helpers. Pure functions with no DOM access, so they
 * can be unit-tested in Node.
 */

const DEFAULT_LOCALE = 'en-US';

/**
 * Format a count, e.g. 45310 -> "45,310".
 * @param {number} value
 * @param {string} [locale]
 * @returns {string}
 */
export function formatNumber(value, locale = DEFAULT_LOCALE) {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
}

/**
 * Compact count for tight spaces, e.g. 18420 -> "18.4K".
 * @param {number} value
 * @param {string} [locale]
 * @returns {string}
 */
export function formatCompact(value, locale = DEFAULT_LOCALE) {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

/**
 * Format a monetary amount. Whole amounts drop the cents ("$610"), others keep
 * two decimals ("$164.80").
 * @param {number} value
 * @param {string} [currency] ISO 4217 code
 * @param {string} [locale]
 * @returns {string}
 */
export function formatCurrency(value, currency = 'USD', locale = DEFAULT_LOCALE) {
  if (!Number.isFinite(value)) return '—';
  const whole = Number.isInteger(value);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(value);
}

/**
 * Format a ratio (0.24) as a percentage ("24%"). Absolute value is used so the
 * caller decides how to express direction.
 * @param {number | null} ratio
 * @param {string} [locale]
 * @returns {string}
 */
export function formatPercent(ratio, locale = DEFAULT_LOCALE) {
  if (ratio === null || !Number.isFinite(ratio)) return '—';
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(Math.abs(ratio));
}

/**
 * Format a value according to a KPI's declared format.
 * @param {number} value
 * @param {'number' | 'currency'} format
 * @param {string} [currency]
 * @returns {string}
 */
export function formatValue(value, format, currency = 'USD') {
  return format === 'currency' ? formatCurrency(value, currency) : formatNumber(value);
}

/**
 * Human-readable timestamp, e.g. "Nov 14, 2026, 9:00 AM".
 * @param {string} iso
 * @param {string} [locale]
 * @returns {string}
 */
export function formatDateTime(iso, locale = DEFAULT_LOCALE) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'unknown';
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(date);
}
