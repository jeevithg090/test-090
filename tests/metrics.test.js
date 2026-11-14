import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  percentChange,
  platformShare,
  stickiness,
  totalActiveUsers,
  trendDirection,
  trendLabel,
  validateDashboard,
} from '../src/js/metrics.js';

const demo = JSON.parse(
  await readFile(new URL('../src/data/dashboard.json', import.meta.url), 'utf8'),
);
const clone = () => structuredClone(demo);

test('percentChange computes relative change', () => {
  assert.equal(percentChange(110, 100), 0.1);
  assert.equal(percentChange(90, 100), -0.1);
  assert.equal(percentChange(50, -100), 1.5);
});

test('percentChange handles a zero or missing baseline', () => {
  assert.equal(percentChange(0, 0), 0);
  assert.equal(percentChange(5, 0), null);
  assert.equal(percentChange(NaN, 1), null);
});

test('trendDirection classifies changes, ignoring rounding noise', () => {
  assert.equal(trendDirection(0.05), 'up');
  assert.equal(trendDirection(-0.05), 'down');
  assert.equal(trendDirection(0.0001), 'flat');
  assert.equal(trendDirection(0), 'flat');
  assert.equal(trendDirection(null), 'unknown');
});

test('trendLabel matches the actual direction (not hardcoded)', () => {
  assert.equal(trendLabel('up', 'yesterday'), 'Up from yesterday');
  assert.equal(trendLabel('down', 'past week'), 'Down from past week');
  assert.equal(trendLabel('flat', 'yesterday'), 'No change from yesterday');
  assert.equal(trendLabel('unknown', 'yesterday'), 'No data for yesterday');
});

test('stickiness is DAU / MAU and null without monthly users', () => {
  assert.equal(stickiness({ dau: 25, mau: 100 }), 0.25);
  assert.equal(stickiness({ dau: 0, mau: 0 }), null);
});

test('totalActiveUsers sums each metric across platforms', () => {
  assert.deepEqual(
    totalActiveUsers([
      { mau: 10, wau: 5, dau: 2 },
      { mau: 30, wau: 15, dau: 4 },
    ]),
    { mau: 40, wau: 20, dau: 6 },
  );
  assert.deepEqual(totalActiveUsers([]), { mau: 0, wau: 0, dau: 0 });
});

test('platformShare returns ratios that sum to 1', () => {
  const share = platformShare([
    { id: 'a', mau: 25 },
    { id: 'b', mau: 75 },
  ]);
  assert.deepEqual(share, { a: 0.25, b: 0.75 });
  assert.deepEqual(platformShare([{ id: 'a', mau: 0 }]), { a: 0 });
});

test('the bundled demo data is valid', () => {
  assert.deepEqual(validateDashboard(demo), []);
});

test('validateDashboard rejects non-objects', () => {
  assert.deepEqual(validateDashboard(null), ['Payload must be a JSON object.']);
  assert.deepEqual(validateDashboard([]), ['Payload must be a JSON object.']);
});

test('validateDashboard flags inconsistent active-user counts', () => {
  const data = clone();
  data.platforms[0].dau = data.platforms[0].mau + 1;
  assert.match(validateDashboard(data).join('\n'), /DAU ≤ WAU ≤ MAU/);
});

test('validateDashboard flags missing and negative numbers', () => {
  const data = clone();
  data.revenue.today = -1;
  delete data.kpis[0].previous;
  const errors = validateDashboard(data);
  assert.ok(errors.includes('revenue.today must be a non-negative number.'));
  assert.ok(errors.includes('kpis[0] needs numeric value and previous.'));
});

test('validateDashboard enforces currency codes and https integration links', () => {
  const data = clone();
  data.currency = 'dollars';
  data.integrations[0].url = 'javascript:alert(1)';
  const errors = validateDashboard(data);
  assert.ok(errors.some((e) => e.startsWith('currency')));
  assert.ok(errors.some((e) => e.startsWith('integrations[0]')));
});

test('validateDashboard allows integrations to be omitted', () => {
  const data = clone();
  delete data.integrations;
  assert.deepEqual(validateDashboard(data), []);
});
