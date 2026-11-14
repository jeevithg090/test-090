import { h, icon } from './dom.js';
import {
  formatCompact,
  formatCurrency,
  formatNumber,
  formatPercent,
  formatValue,
} from './format.js';
import {
  percentChange,
  platformShare,
  stickiness,
  totalActiveUsers,
  trendDirection,
  trendLabel,
} from './metrics.js';

const KPI_ICONS = { 'total-users': 'users', 'ad-revenue': 'revenue', ngo: 'ngo' };
const TREND_ICONS = {
  up: 'trend-up',
  down: 'trend-down',
  flat: 'trend-flat',
  unknown: 'trend-flat',
};

/** Section wrapper with a visible heading. */
function section(id, title, description, ...children) {
  const headingId = `${id}-heading`;
  return h(
    'section',
    { class: `panel-group panel-group--${id}`, 'aria-labelledby': headingId },
    h(
      'div',
      { class: 'section-head' },
      h('h2', { id: headingId, class: 'section-head__title' }, title),
      description && h('p', { class: 'section-head__desc' }, description),
    ),
    ...children,
  );
}

function emptyCard(message) {
  return h(
    'div',
    { class: 'card state state--empty' },
    h('p', { class: 'state__title' }, 'Nothing to show yet'),
    h('p', null, message),
  );
}

function platformCard(platform, share) {
  const ratio = stickiness(platform);
  const metric = (label, full, value) =>
    h(
      'div',
      { class: 'metric' },
      h('dt', { class: 'metric__label' }, h('abbr', { title: full }, label)),
      h('dd', { class: 'metric__value' }, formatNumber(value)),
    );

  return h(
    'article',
    { class: `card platform platform--${platform.id}`, 'aria-labelledby': `p-${platform.id}` },
    h(
      'header',
      { class: 'platform__head' },
      h(
        'span',
        { class: 'platform__badge' },
        icon(
          platform.id === 'ios' || platform.id === 'android' ? platform.id : 'system',
          'platform__icon',
        ),
      ),
      h(
        'div',
        null,
        h('h3', { id: `p-${platform.id}`, class: 'card__title' }, platform.name),
        h('p', { class: 'card__subtitle' }, `${formatPercent(share)} of monthly users`),
      ),
    ),
    h(
      'dl',
      { class: 'metrics' },
      metric('MAU', 'Monthly active users', platform.mau),
      metric('WAU', 'Weekly active users', platform.wau),
      metric('DAU', 'Daily active users', platform.dau),
    ),
    h(
      'div',
      { class: 'meter' },
      h(
        'div',
        { class: 'meter__label' },
        h('span', null, 'Stickiness (DAU / MAU)'),
        h('strong', null, formatPercent(ratio)),
      ),
      h(
        'div',
        {
          class: 'meter__track',
          role: 'meter',
          'aria-label': `${platform.name} stickiness`,
          'aria-valuemin': '0',
          'aria-valuemax': '100',
          'aria-valuenow': ratio === null ? '0' : (ratio * 100).toFixed(1),
          'aria-valuetext': formatPercent(ratio),
        },
        h('span', {
          class: 'meter__fill',
          style: { width: `${Math.min(100, (ratio ?? 0) * 100)}%` },
        }),
      ),
    ),
  );
}

function revenueCard(revenue, currency) {
  const row = (label, value) =>
    h(
      'div',
      { class: 'metric' },
      h('dt', { class: 'metric__label' }, label),
      h('dd', { class: 'metric__value' }, formatCurrency(value, currency)),
    );
  return h(
    'article',
    { class: 'card revenue', 'aria-labelledby': 'revenue-title' },
    h(
      'header',
      { class: 'platform__head' },
      h('span', { class: 'platform__badge' }, icon('revenue', 'platform__icon')),
      h(
        'div',
        null,
        h('h3', { id: 'revenue-title', class: 'card__title' }, 'Revenue'),
        h('p', { class: 'card__subtitle' }, 'All sources'),
      ),
    ),
    h(
      'dl',
      { class: 'metrics metrics--list' },
      row('This month', revenue.monthly),
      row('This week', revenue.weekly),
      row('Today', revenue.today),
    ),
    h(
      'div',
      { class: 'revenue__total' },
      h('span', null, 'Lifetime total'),
      h('strong', null, formatCurrency(revenue.lifetime, currency)),
    ),
  );
}

function kpiCard(kpi, currency) {
  const change = percentChange(kpi.value, kpi.previous);
  const direction = trendDirection(change);
  const label = trendLabel(direction, kpi.comparedTo ?? 'previous period');
  return h(
    'article',
    { class: 'card kpi', 'aria-labelledby': `k-${kpi.id}` },
    h(
      'div',
      { class: 'kpi__top' },
      h(
        'div',
        null,
        h('h3', { id: `k-${kpi.id}`, class: 'kpi__label' }, kpi.label),
        h('p', { class: 'kpi__value' }, formatValue(kpi.value, kpi.format, currency)),
      ),
      h(
        'span',
        { class: `kpi__icon kpi__icon--${kpi.id}` },
        icon(KPI_ICONS[kpi.id] ?? 'dashboard'),
      ),
    ),
    h(
      'p',
      { class: `trend trend--${direction}` },
      icon(TREND_ICONS[direction], 'icon trend__icon'),
      direction !== 'unknown' && direction !== 'flat' && h('strong', null, formatPercent(change)),
      h('span', null, label),
    ),
  );
}

function integrationCard(item) {
  return h(
    'li',
    null,
    h(
      'a',
      {
        class: `card integration integration--${item.id}`,
        href: item.url,
        target: '_blank',
        rel: 'noopener noreferrer',
      },
      h('span', { class: 'integration__mark', 'aria-hidden': 'true' }, item.name.charAt(0)),
      h(
        'span',
        { class: 'integration__body' },
        h('span', { class: 'integration__name' }, item.name),
        item.description && h('span', { class: 'integration__desc' }, item.description),
      ),
      icon('external', 'icon integration__ext'),
      h('span', { class: 'visually-hidden' }, ' (opens in a new tab)'),
    ),
  );
}

/**
 * Build the full dashboard from a validated payload.
 * @param {any} data
 * @returns {DocumentFragment}
 */
export function renderDashboard(data) {
  const frag = document.createDocumentFragment();
  const { currency, platforms, revenue, kpis, integrations = [] } = data;
  const shares = platformShare(platforms);
  const totals = totalActiveUsers(platforms);

  frag.append(
    section(
      'overview',
      'Active users & revenue',
      platforms.length > 0
        ? `${formatCompact(totals.mau)} monthly active users across ${platforms.length} platform${platforms.length === 1 ? '' : 's'}.`
        : null,
      h(
        'div',
        { class: 'grid grid--overview' },
        platforms.length > 0
          ? platforms.map((p) => platformCard(p, shares[p.id]))
          : emptyCard('No platform analytics have been reported yet.'),
        revenueCard(revenue, currency),
      ),
    ),
    section(
      'kpis',
      'Key indicators',
      null,
      kpis.length > 0
        ? h(
            'div',
            { class: 'grid grid--kpis' },
            kpis.map((k) => kpiCard(k, currency)),
          )
        : emptyCard('No key indicators are configured.'),
    ),
    section(
      'integrations',
      'Services',
      'Consoles for the services behind the app.',
      integrations.length > 0
        ? h(
            'ul',
            { class: 'grid grid--integrations', role: 'list' },
            integrations.map(integrationCard),
          )
        : emptyCard('No services are linked.'),
    ),
  );
  return frag;
}

/** Skeleton placeholders shown while data loads. */
export function renderLoading() {
  const block = (cls) => h('div', { class: `card skeleton ${cls}`, 'aria-hidden': 'true' });
  return h(
    'div',
    { class: 'loading' },
    h('p', { class: 'visually-hidden', role: 'status' }, 'Loading dashboard data…'),
    h('div', { class: 'skeleton skeleton--heading', 'aria-hidden': 'true' }),
    h(
      'div',
      { class: 'grid grid--overview' },
      block('skeleton--tall'),
      block('skeleton--tall'),
      block('skeleton--tall'),
    ),
    h('div', { class: 'skeleton skeleton--heading', 'aria-hidden': 'true' }),
    h('div', { class: 'grid grid--kpis' }, block(''), block(''), block('')),
  );
}

/**
 * Error panel with a retry button.
 * @param {Error & { details?: string[] }} error
 * @param {() => void} onRetry
 */
export function renderError(error, onRetry) {
  return h(
    'div',
    { class: 'card state state--error', role: 'alert' },
    icon('alert', 'icon state__icon'),
    h('p', { class: 'state__title' }, 'We couldn’t load the dashboard'),
    h('p', null, error.message || 'Something went wrong.'),
    error.details?.length
      ? h(
          'details',
          { class: 'state__details' },
          h('summary', null, 'Technical details'),
          h(
            'ul',
            null,
            error.details.map((d) => h('li', null, d)),
          ),
        )
      : null,
    h(
      'button',
      { class: 'button button--primary', type: 'button', onclick: onRetry },
      icon('refresh'),
      'Try again',
    ),
  );
}
