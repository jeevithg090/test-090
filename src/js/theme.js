/**
 * Theme preference handling: "light", "dark" or "system".
 */

export const THEMES = /** @type {const} */ (['system', 'light', 'dark']);
const STORAGE_KEY = 'yogo-theme';

/**
 * Normalise a stored value into a known theme.
 * @param {unknown} value
 * @returns {'system' | 'light' | 'dark'}
 */
export function parseTheme(value) {
  return THEMES.includes(/** @type {any} */ (value)) ? /** @type {any} */ (value) : 'system';
}

/**
 * The theme that comes after `current` in the toggle cycle.
 * @param {'system' | 'light' | 'dark'} current
 */
export function nextTheme(current) {
  return THEMES[(THEMES.indexOf(current) + 1) % THEMES.length];
}

/**
 * Resolve a preference into the theme actually shown.
 * @param {'system' | 'light' | 'dark'} preference
 * @param {boolean} systemPrefersDark
 * @returns {'light' | 'dark'}
 */
export function resolveTheme(preference, systemPrefersDark) {
  if (preference === 'system') return systemPrefersDark ? 'dark' : 'light';
  return preference;
}

/** Read the saved preference. Storage can be unavailable (private mode). */
export function loadTheme(storage = globalThis.localStorage) {
  try {
    return parseTheme(storage?.getItem(STORAGE_KEY));
  } catch {
    return 'system';
  }
}

/** Persist the preference, ignoring storage failures. */
export function saveTheme(theme, storage = globalThis.localStorage) {
  try {
    storage?.setItem(STORAGE_KEY, theme);
  } catch {
    /* storage unavailable: preference lasts for this page view only */
  }
}
