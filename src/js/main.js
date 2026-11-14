import { DashboardError, fetchDashboard } from './api.js';
import { formatDateTime } from './format.js';
import demoDataUrl from 'url:../data/dashboard.json';
import { renderDashboard, renderError, renderLoading } from './render.js';
import { loadTheme, nextTheme, resolveTheme, saveTheme } from './theme.js';

// Bundled demo data. Set DASHBOARD_DATA_URL at build time to use a real endpoint.
const DEMO_DATA_URL = demoDataUrl;
const CONFIGURED_URL = process.env.DASHBOARD_DATA_URL || '';
const DATA_URL = CONFIGURED_URL || DEMO_DATA_URL;
const USING_DEMO = !CONFIGURED_URL;

const root = /** @type {HTMLElement} */ (document.getElementById('dashboard'));
const meta = /** @type {HTMLElement} */ (document.getElementById('data-meta'));
const refreshButton = /** @type {HTMLButtonElement} */ (
  document.querySelector('[data-action="refresh"]')
);

/**
 * Developer aid: append ?state=loading|empty|error to preview each UI state
 * against the demo data.
 */
const previewState = new URLSearchParams(window.location.search).get('state');

let loadId = 0;

async function load() {
  const id = ++loadId;
  root.setAttribute('aria-busy', 'true');
  refreshButton.disabled = true;
  root.replaceChildren(renderLoading());
  meta.textContent = 'Loading data…';

  try {
    if (previewState === 'loading') return;
    if (previewState === 'error') {
      throw new DashboardError('Could not reach the data source. Check your connection.');
    }
    let data = await fetchDashboard(DATA_URL);
    if (previewState === 'empty') data = { ...data, platforms: [], kpis: [], integrations: [] };
    if (id !== loadId) return; // a newer refresh superseded this one

    root.replaceChildren(renderDashboard(data));
    meta.textContent = `${USING_DEMO ? 'Demo data' : 'Live data'} · Updated ${formatDateTime(data.generatedAt)} UTC`;
  } catch (error) {
    if (id !== loadId) return;
    console.warn('[dashboard] load failed:', error);
    const err =
      error instanceof DashboardError ? error : new DashboardError('Something went wrong.');
    root.replaceChildren(renderError(err, load));
    meta.textContent = 'Data unavailable';
  } finally {
    if (id === loadId && previewState !== 'loading') {
      root.setAttribute('aria-busy', 'false');
      refreshButton.disabled = false;
    }
  }
}

/* ---------- Theme ---------- */

const themeButton = /** @type {HTMLButtonElement} */ (
  document.querySelector('[data-action="toggle-theme"]')
);
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
const THEME_ICON = { system: 'system', light: 'sun', dark: 'moon' };
let theme = loadTheme();

function applyTheme() {
  const html = document.documentElement;
  if (theme === 'system') delete html.dataset.theme;
  else html.dataset.theme = theme;
  const shown = resolveTheme(theme, darkQuery.matches);
  themeButton.setAttribute(
    'aria-label',
    `Theme: ${theme}${theme === 'system' ? ` (${shown})` : ''}. Change theme`,
  );
  themeButton.title = `Theme: ${theme}`;
  themeButton.querySelector('use')?.setAttribute('href', `#i-${THEME_ICON[theme]}`);
}

themeButton.addEventListener('click', () => {
  theme = nextTheme(theme);
  saveTheme(theme);
  applyTheme();
});
darkQuery.addEventListener('change', applyTheme);

/* ---------- Mobile navigation ---------- */

const sidebar = /** @type {HTMLElement} */ (document.getElementById('sidebar'));
const backdrop = /** @type {HTMLElement} */ (document.querySelector('.sidebar-backdrop'));
const openButton = /** @type {HTMLButtonElement} */ (
  document.querySelector('[data-action="open-nav"]')
);
const closeButton = /** @type {HTMLButtonElement} */ (
  sidebar.querySelector('[data-action="close-nav"]')
);
const drawerQuery = window.matchMedia('(max-width: 767.98px)');

function setNavOpen(open) {
  document.body.classList.toggle('nav-open', open);
  backdrop.hidden = !open;
  openButton.setAttribute('aria-expanded', String(open));
  // Off-canvas sidebar must not be reachable by keyboard while hidden.
  sidebar.inert = drawerQuery.matches && !open;
  if (open) closeButton.focus();
  else if (drawerQuery.matches) openButton.focus();
}

openButton.addEventListener('click', () => setNavOpen(true));
document
  .querySelectorAll('[data-action="close-nav"]')
  .forEach((el) => el.addEventListener('click', () => setNavOpen(false)));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && document.body.classList.contains('nav-open')) setNavOpen(false);
});
drawerQuery.addEventListener('change', () => {
  document.body.classList.remove('nav-open');
  backdrop.hidden = true;
  openButton.setAttribute('aria-expanded', 'false');
  sidebar.inert = drawerQuery.matches;
});
sidebar.inert = drawerQuery.matches;

/* ---------- Boot ---------- */

refreshButton.addEventListener('click', load);
applyTheme();
load();
