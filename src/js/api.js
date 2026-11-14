import { validateDashboard } from './metrics.js';

export class DashboardError extends Error {
  /**
   * @param {string} message user-facing explanation
   * @param {{ cause?: unknown, details?: string[] }} [options]
   */
  constructor(message, { cause, details = [] } = {}) {
    super(message, { cause });
    this.name = 'DashboardError';
    this.details = details;
  }
}

/**
 * Fetch and validate the dashboard payload.
 * @param {string} url
 * @param {{ fetchImpl?: typeof fetch, timeoutMs?: number }} [options]
 */
export async function fetchDashboard(
  url,
  { fetchImpl = globalThis.fetch, timeoutMs = 10000 } = {},
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetchImpl(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
  } catch (cause) {
    const timedOut = cause?.name === 'AbortError';
    throw new DashboardError(
      timedOut
        ? 'The data source took too long to respond.'
        : 'Could not reach the data source. Check your connection.',
      { cause },
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new DashboardError(`The data source responded with HTTP ${response.status}.`);
  }

  let data;
  try {
    data = await response.json();
  } catch (cause) {
    throw new DashboardError('The data source returned invalid JSON.', { cause });
  }

  const problems = validateDashboard(data);
  if (problems.length > 0) {
    throw new DashboardError('The data source returned data in an unexpected shape.', {
      details: problems,
    });
  }
  return data;
}
