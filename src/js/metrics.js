/**
 * Dashboard metric calculations and data validation. Pure functions only.
 */

/**
 * Relative change between two values as a ratio (0.1 = +10%).
 * Returns null when there is no meaningful baseline.
 * @param {number} current
 * @param {number} previous
 * @returns {number | null}
 */
export function percentChange(current, previous) {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (previous === 0) return current === 0 ? 0 : null;
  return (current - previous) / Math.abs(previous);
}

/**
 * Classify a change ratio.
 * @param {number | null} change
 * @returns {'up' | 'down' | 'flat' | 'unknown'}
 */
export function trendDirection(change) {
  if (change === null || !Number.isFinite(change)) return 'unknown';
  // Treat sub-0.05% movement as flat so rounding noise doesn't show as a trend.
  if (Math.abs(change) < 0.0005) return 'flat';
  return change > 0 ? 'up' : 'down';
}

/**
 * Sentence describing a trend, e.g. "Up from yesterday".
 * @param {'up' | 'down' | 'flat' | 'unknown'} direction
 * @param {string} comparedTo
 * @returns {string}
 */
export function trendLabel(direction, comparedTo) {
  switch (direction) {
    case 'up':
      return `Up from ${comparedTo}`;
    case 'down':
      return `Down from ${comparedTo}`;
    case 'flat':
      return `No change from ${comparedTo}`;
    default:
      return `No data for ${comparedTo}`;
  }
}

/**
 * Stickiness = DAU / MAU: the share of monthly users who show up on a given day.
 * @param {{ dau: number, mau: number }} platform
 * @returns {number | null}
 */
export function stickiness({ dau, mau }) {
  if (!Number.isFinite(dau) || !Number.isFinite(mau) || mau <= 0) return null;
  return dau / mau;
}

/**
 * Sum active users across platforms.
 * @param {Array<{ mau: number, wau: number, dau: number }>} platforms
 * @returns {{ mau: number, wau: number, dau: number }}
 */
export function totalActiveUsers(platforms) {
  return platforms.reduce(
    (acc, p) => ({ mau: acc.mau + p.mau, wau: acc.wau + p.wau, dau: acc.dau + p.dau }),
    { mau: 0, wau: 0, dau: 0 },
  );
}

/**
 * Share of total MAU per platform, as ratios summing to 1.
 * @param {Array<{ id: string, mau: number }>} platforms
 * @returns {Record<string, number>}
 */
export function platformShare(platforms) {
  const total = platforms.reduce((sum, p) => sum + p.mau, 0);
  return Object.fromEntries(platforms.map((p) => [p.id, total > 0 ? p.mau / total : 0]));
}

const isNonNegativeNumber = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;

/**
 * Validate a dashboard payload. Returns a list of human-readable problems;
 * an empty list means the payload is usable.
 * @param {unknown} data
 * @returns {string[]}
 */
export function validateDashboard(data) {
  const errors = [];
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return ['Payload must be a JSON object.'];
  }
  const d = /** @type {Record<string, any>} */ (data);

  if (!isNonEmptyString(d.currency) || !/^[A-Z]{3}$/.test(d.currency)) {
    errors.push('currency must be a 3-letter ISO 4217 code.');
  }
  if (Number.isNaN(Date.parse(d.generatedAt))) {
    errors.push('generatedAt must be an ISO date string.');
  }

  if (!Array.isArray(d.platforms)) {
    errors.push('platforms must be an array.');
  } else {
    d.platforms.forEach((p, i) => {
      if (!isNonEmptyString(p?.id) || !isNonEmptyString(p?.name)) {
        errors.push(`platforms[${i}] needs an id and a name.`);
      }
      for (const key of ['mau', 'wau', 'dau']) {
        if (!isNonNegativeNumber(p?.[key])) {
          errors.push(`platforms[${i}].${key} must be a non-negative number.`);
        }
      }
      if (
        isNonNegativeNumber(p?.mau) &&
        isNonNegativeNumber(p?.wau) &&
        isNonNegativeNumber(p?.dau) &&
        !(p.dau <= p.wau && p.wau <= p.mau)
      ) {
        errors.push(`platforms[${i}] must satisfy DAU ≤ WAU ≤ MAU.`);
      }
    });
  }

  if (!d.revenue || typeof d.revenue !== 'object') {
    errors.push('revenue must be an object.');
  } else {
    for (const key of ['monthly', 'weekly', 'today', 'lifetime']) {
      if (!isNonNegativeNumber(d.revenue[key])) {
        errors.push(`revenue.${key} must be a non-negative number.`);
      }
    }
  }

  if (!Array.isArray(d.kpis)) {
    errors.push('kpis must be an array.');
  } else {
    d.kpis.forEach((k, i) => {
      if (!isNonEmptyString(k?.id) || !isNonEmptyString(k?.label)) {
        errors.push(`kpis[${i}] needs an id and a label.`);
      }
      if (k?.format !== 'number' && k?.format !== 'currency') {
        errors.push(`kpis[${i}].format must be "number" or "currency".`);
      }
      if (!Number.isFinite(k?.value) || !Number.isFinite(k?.previous)) {
        errors.push(`kpis[${i}] needs numeric value and previous.`);
      }
    });
  }

  if (d.integrations !== undefined && !Array.isArray(d.integrations)) {
    errors.push('integrations must be an array when present.');
  } else if (Array.isArray(d.integrations)) {
    d.integrations.forEach((it, i) => {
      if (!isNonEmptyString(it?.name) || !/^https:\/\//.test(it?.url ?? '')) {
        errors.push(`integrations[${i}] needs a name and an https:// url.`);
      }
    });
  }

  return errors;
}
