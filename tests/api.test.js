import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DashboardError, fetchDashboard } from '../src/js/api.js';

const demo = JSON.parse(
  await readFile(new URL('../src/data/dashboard.json', import.meta.url), 'utf8'),
);

const respond =
  (body, { ok = true, status = 200, badJson = false } = {}) =>
  async () => ({
    ok,
    status,
    json: async () => {
      if (badJson) throw new SyntaxError('Unexpected token');
      return body;
    },
  });

test('returns validated data on success', async () => {
  const data = await fetchDashboard('/data.json', { fetchImpl: respond(demo) });
  assert.deepEqual(data, demo);
});

test('sends an Accept header and an abort signal', async () => {
  let seen;
  await fetchDashboard('/data.json', {
    fetchImpl: async (url, init) => {
      seen = { url, init };
      return respond(demo)();
    },
  });
  assert.equal(seen.url, '/data.json');
  assert.equal(seen.init.headers.Accept, 'application/json');
  assert.ok(seen.init.signal instanceof AbortSignal);
});

test('wraps HTTP errors', async () => {
  await assert.rejects(
    fetchDashboard('/x', { fetchImpl: respond(null, { ok: false, status: 503 }) }),
    (err) => err instanceof DashboardError && /HTTP 503/.test(err.message),
  );
});

test('wraps network failures', async () => {
  await assert.rejects(
    fetchDashboard('/x', {
      fetchImpl: async () => {
        throw new TypeError('Failed to fetch');
      },
    }),
    (err) => err instanceof DashboardError && /Could not reach/.test(err.message),
  );
});

test('reports timeouts', async () => {
  const hang = (_url, { signal }) =>
    new Promise((_resolve, reject) =>
      signal.addEventListener('abort', () =>
        reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
      ),
    );
  await assert.rejects(
    fetchDashboard('/x', { fetchImpl: hang, timeoutMs: 10 }),
    (err) => err instanceof DashboardError && /too long/.test(err.message),
  );
});

test('wraps invalid JSON', async () => {
  await assert.rejects(
    fetchDashboard('/x', { fetchImpl: respond(null, { badJson: true }) }),
    (err) => err instanceof DashboardError && /invalid JSON/.test(err.message),
  );
});

test('rejects payloads that fail validation, with details', async () => {
  await assert.rejects(
    fetchDashboard('/x', { fetchImpl: respond({ currency: 'USD' }) }),
    (err) => err instanceof DashboardError && err.details.length > 0,
  );
});
