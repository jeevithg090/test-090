import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTheme, nextTheme, parseTheme, resolveTheme, saveTheme } from '../src/js/theme.js';

const memoryStorage = () => {
  const map = new Map();
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, v) };
};
const brokenStorage = {
  getItem() {
    throw new Error('SecurityError');
  },
  setItem() {
    throw new Error('QuotaExceeded');
  },
};

test('parseTheme falls back to system for unknown values', () => {
  assert.equal(parseTheme('dark'), 'dark');
  assert.equal(parseTheme('purple'), 'system');
  assert.equal(parseTheme(null), 'system');
});

test('nextTheme cycles system → light → dark → system', () => {
  assert.equal(nextTheme('system'), 'light');
  assert.equal(nextTheme('light'), 'dark');
  assert.equal(nextTheme('dark'), 'system');
});

test('resolveTheme follows the OS only for "system"', () => {
  assert.equal(resolveTheme('system', true), 'dark');
  assert.equal(resolveTheme('system', false), 'light');
  assert.equal(resolveTheme('light', true), 'light');
});

test('theme round-trips through storage', () => {
  const storage = memoryStorage();
  saveTheme('dark', storage);
  assert.equal(loadTheme(storage), 'dark');
});

test('storage failures never throw', () => {
  assert.doesNotThrow(() => saveTheme('dark', brokenStorage));
  assert.equal(loadTheme(brokenStorage), 'system');
});
