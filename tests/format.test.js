import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCompact,
  formatCurrency,
  formatDateTime,
  formatNumber,
  formatPercent,
  formatValue,
} from '../src/js/format.js';

test('formatNumber groups thousands and rounds', () => {
  assert.equal(formatNumber(45310), '45,310');
  assert.equal(formatNumber(0), '0');
  assert.equal(formatNumber(12.6), '13');
});

test('formatters return an em dash for non-finite input', () => {
  for (const fn of [formatNumber, formatCompact, formatCurrency]) {
    assert.equal(fn(NaN), '—');
    assert.equal(fn(Infinity), '—');
  }
  assert.equal(formatPercent(null), '—');
});

test('formatCompact shortens large counts', () => {
  assert.equal(formatCompact(18420), '18.4K');
  assert.equal(formatCompact(1_250_000), '1.3M');
});

test('formatCurrency drops cents for whole amounts only', () => {
  assert.equal(formatCurrency(610), '$610');
  assert.equal(formatCurrency(164.8), '$164.80');
  assert.equal(formatCurrency(1030), '$1,030');
  assert.equal(formatCurrency(10, 'EUR'), '€10');
});

test('formatPercent uses the absolute value', () => {
  assert.equal(formatPercent(0.2408), '24.1%');
  assert.equal(formatPercent(-0.069), '6.9%');
  assert.equal(formatPercent(0), '0%');
});

test('formatValue dispatches on the KPI format', () => {
  assert.equal(formatValue(2960.4, 'currency'), '$2,960.40');
  assert.equal(formatValue(45310, 'number'), '45,310');
});

test('formatDateTime renders UTC and tolerates bad input', () => {
  assert.equal(formatDateTime('2026-11-14T09:00:00Z'), 'Nov 14, 2026, 9:00 AM');
  assert.equal(formatDateTime('not a date'), 'unknown');
});
