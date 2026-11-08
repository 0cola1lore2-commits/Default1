/* Paginile panoului de administrare. */

import { allergens as ALLERGENS, fulfillmentMethods, orderStatuses, ordering, paymentMethods, productTags, shop } from '../config.js';
import { capitalize, formatDateKey, formatLei, formatSlot, plural } from '../../public/js/shared/format.js';
import { ILLUSTRATION_KINDS } from '../../public/js/shared/illustrations.js';
import { cx, html, raw } from '../lib/html.js';
import { formatPhone, statusLabel } from '../lib/orders.js';
import { productImageUrl } from './components.js';
import { icon } from './icons.js';

const dateTimeFmt = new Intl.DateTimeFormat('ro-RO', { timeZone: ordering.timezone, day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
export const formatDateTime = (iso) => (iso ? dateTimeFmt.format(new Date(iso)) : '');

export const FLASH = {
  salvat: 'Modificările au fost salvate.',
  creat: 'Produsul a fost creat.',
  sters: 'Produsul a fost șters.',
  status: 'Statusul comenzii a fost actualizat.',
  nota: 'Nota internă a fost salvată.',
  imagine: 'Imaginea produsului a fost actualizată.',
  'imagine-stearsa': 'Imaginea a fost eliminată; produsul folosește din nou ilustrația.',
  'cod-creat': 'Codul promoțional a fost adăugat.',
  'cod-actualizat': 'Codul promoțional a fost actualizat.',
  'cod-sters': 'Codul promoțional a fost șters.',
};

export function csrfField(token) {
  return html`<input type="hidden" name="_csrf" value="${token}">`;
}

export function statusPill(status, { fulfillment } = {}) {
  const def = orderStatuses[status];
  const label = status === 'gata' && fulfillment ? (fulfillment === 'livrare' ? 'Gata de livrare' : 'Gata de ridicare') : def?.label || status;
  return html`<span class="status-pill status-${def?.tone || 'gray'}">${label}</span>`;
}

const NAV = [
  { href: '/admin', key: 'panou', label: 'Panou', icon: 'home' },
  { href: '/admin/comenzi', key: 'comenzi', label: 'Comenzi', icon: 'list' },
  { href: '/admin/productie', key: 'productie', label: 'Producție', icon: 'chef' },
  { href: '/admin/produse', key: 'produse', label: 'Produse', icon: 'cake' },
  { href: '/admin/setari', key: 'setari', label: 'Setări', icon: 'settings' },
];

export function adminLayout(ctx, { title, nav, body, actions = '', flash = '', refresh = 0 }) {
  const counts = ctx.admin.counts || {};
  const newCount = counts.noua || 0;
  return html`<!doctype html>
<html lang="ro">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
${refresh ? html`<meta http-equiv="refresh" content="${refresh}">` : ''}
<title>${newCount ? `(${newCount}) ` : ''}${title} · Administrare ${shop.name}</title>
<link rel="icon" href="/img/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="${ctx.asset('/css/style.css')}">
<link rel="stylesheet" href="${ctx.asset('/css/admin.css')}">
</head>
<body class="admin-body">
<a class="skip-link" href="#continut">Sari la conținut</a>
<div class="admin-shell">
  <aside class="admin-sidebar">
    <a class="admin-brand" href="/admin">
      <img src="/img/logo.svg" alt="" width="40" height="40">
      <span><strong>${shop.name}</strong><small>Administrare</small></span>
    </a>
    <nav class="admin-nav" aria-label="Administrare">
      ${NAV.map(
        (item) => html`<a href="${item.href}"${nav === item.key ? raw(' aria-current="page"') : ''}>
          ${icon(item.icon, { size: 20 })}<span>${item.label}</span>
          ${item.key === 'comenzi' && newCount ? html`<span class="nav-badge" title="Comenzi noi">${newCount}</span>` : ''}
        </a>`,
      )}
    </nav>
    <div class="admin-sidebar-foot">
      <a href="/" target="_blank" rel="noopener">${icon('eye', { size: 18 })} Vezi magazinul</a>
      <form method="post" action="/admin/iesire">${csrfField(ctx.admin.csrf)}<button type="submit" class="link-button">${icon('logout', { size: 18 })} Ieșire</button></form>
    </div>
  </aside>
  <main class="admin-main" id="continut" tabindex="-1">
    <header class="admin-topbar">
      <h1>${title}</h1>
      ${actions ? html`<div class="admin-actions">${actions}</div>` : ''}
    </header>
    ${flash && FLASH[flash] ? html`<div class="notice notice-success admin-flash" role="status">${icon('check', { size: 20 })}<div>${FLASH[flash]}</div></div>` : ''}
    ${body}
  </main>
</div>
<script type="module" src="${ctx.asset('/js/admin.js')}"></script>
</body>
</html>`;
}

/* ------------------------------ Autentificare ------------------------------ */

export function loginPage(ctx, { error = '', next = '' } = {}) {
  return html`<!doctype html>
<html lang="ro">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Autentificare · Administrare ${shop.name}</title>
<link rel="icon" href="/img/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="${ctx.asset('/css/style.css')}">
<link rel="stylesheet" href="${ctx.asset('/css/admin.css')}">
</head>
<body class="admin-login">
<main class="login-card">
  <img src="/img/logo.svg" alt="" width="64" height="64">
  <h1>Administrare ${shop.name}</h1>
  <p class="muted">Introdu parola pentru a gestiona comenzile și produsele.</p>
  ${error ? html`<div class="notice notice-error" role="alert">${icon('alert', { size: 20 })}<div>${error}</div></div>` : ''}
  <form method="post" action="/admin/autentificare">
    <input type="hidden" name="next" value="${next}">
    <div class="field">
      <label for="parola">Parola</label>
      <input class="input" id="parola" name="parola" type="password" autocomplete="current-password" required autofocus>
    </div>
    <button class="btn btn-primary btn-block" type="submit">Intră în cont</button>
  </form>
  <p class="small muted"><a href="/">← Înapoi la magazin</a></p>
</main>
</body>
</html>`;
}

/* --------------------------------- Panou --------------------------------- */

function ordersTable(orders, { showScheduled = true, empty = 'Nu există comenzi.' } = {}) {
  if (!orders.length) return html`<p class="muted admin-empty">${empty}</p>`;
  return html`<div class="table-wrap"><table class="admin-table">
    <thead><tr>
      <th scope="col">Comanda</th>
      ${showScheduled ? html`<th scope="col">Programată</th>` : ''}
      <th scope="col">Client</th>
      <th scope="col">Primire</th>
      <th scope="col" class="num">Total</th>
      <th scope="col">Status</th>
    </tr></thead>
    <tbody>
      ${orders.map(
        (o) => html`<tr class="${cx(o.status === 'noua' && 'is-new')}">
          <td><a class="row-link" href="/admin/comenzi/${o.id}"><strong>${o.number}</strong></a><small>${formatDateTime(o.createdAt)}</small></td>
          ${showScheduled ? html`<td><strong>${capitalize(formatDateKey(o.scheduledDate, { weekday: true }))}</strong><small>${formatSlot(o.scheduledSlot)}</small></td>` : ''}
          <td>${o.customerName}<small>${formatPhone(o.customerPhone)}</small></td>
          <td>${o.fulfillment === 'livrare' ? html`${icon('truck', { size: 16 })} Livrare` : html`${icon('store', { size: 16 })} Ridicare`}${o.itemCount != null ? html`<small>${plural(o.itemCount, 'produs', 'produse')}</small>` : ''}</td>
          <td class="num"><strong>${formatLei(o.total)}</strong></td>
          <td>${statusPill(o.status, { fulfillment: o.fulfillment })}</td>
        </tr>`,
      )}
    </tbody>
  </table></div>`;
}

export function dashboardPage(ctx, { stats, today, tomorrow }) {
  const body = html`
<section class="stat-grid">
  <a class="stat-card stat-rose" href="/admin/comenzi?status=noua">
    <span class="stat-label">${icon('bag', { size: 18 })} Comenzi noi</span>
    <strong class="stat-value">${stats.newCount}</strong>
    <span class="stat-note">${stats.newCount ? 'de confirmat cu clienții' : 'toate sunt confirmate'}</span>
  </a>
  <a class="stat-card stat-amber" href="/admin/productie?data=${today}">
    <span class="stat-label">${icon('chef', { size: 18 })} De pregătit azi</span>
    <strong class="stat-value">${stats.todayCount}</strong>
    <span class="stat-note">${capitalize(formatDateKey(today))}</span>
  </a>
  <a class="stat-card stat-blue" href="/admin/productie?data=${tomorrow}">
    <span class="stat-label">${icon('calendar', { size: 18 })} Mâine</span>
    <strong class="stat-value">${stats.tomorrowCount}</strong>
    <span class="stat-note">${capitalize(formatDateKey(tomorrow))}</span>
  </a>
  <div class="stat-card stat-green">
    <span class="stat-label">${icon('sparkle', { size: 18 })} Vânzări luna aceasta</span>
    <strong class="stat-value">${formatLei(stats.month.revenue)}</strong>
    <span class="stat-note">${plural(stats.month.n, 'comandă', 'comenzi')} (fără cele anulate)</span>
  </div>
</section>

<div class="admin-grid">
  <section class="admin-card admin-span-2">
    <div class="admin-card-head"><h2>Următoarele 7 zile</h2><a class="link-small" href="/admin/comenzi">Toate comenzile →</a></div>
    ${ordersTable(stats.upcoming, { empty: 'Nicio comandă programată în următoarele 7 zile.' })}
  </section>
  <section class="admin-card">
    <div class="admin-card-head"><h2>Cele mai vândute</h2><span class="muted small">luna aceasta</span></div>
    ${stats.topProducts.length
      ? html`<ol class="top-list">${stats.topProducts.map((p) => html`<li><span>${p.name}</span><strong>${p.qty} buc.</strong></li>`)}</ol>`
      : html`<p class="muted admin-empty">Încă nu există vânzări luna aceasta.</p>`}
  </section>
  <section class="admin-card">
    <div class="admin-card-head"><h2>Comenzi recente</h2></div>
    ${stats.recent.length
      ? html`<ul class="recent-list">${stats.recent.map(
          (o) => html`<li><a href="/admin/comenzi/${o.id}"><strong>${o.number}</strong> · ${o.customerName}</a><span>${formatLei(o.total)}</span>${statusPill(o.status, { fulfillment: o.fulfillment })}</li>`,
        )}</ul>`
      : html`<p class="muted admin-empty">Nu ai primit încă nicio comandă. Când un client comandă, o vei vedea aici.</p>`}
  </section>
</div>
<p class="small muted">Pagina se actualizează automat la fiecare minut.</p>`;
  return adminLayout(ctx, { title: 'Panou', nav: 'panou', body, refresh: 60, flash: ctx.flash });
}

/* -------------------------------- Comenzi -------------------------------- */

export function ordersPage(ctx, { result, filters, counts }) {
  const qs = (patch) => {
    const p = new URLSearchParams();
    const merged = { ...filters, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v && k !== 'page') p.set(k, v);
    if (patch.page && patch.page > 1) p.set('pagina', String(patch.page));
    const s = p.toString();
    return s ? `?${s}` : '';
  };
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const exportQs = new URLSearchParams();
  if (filters.from) exportQs.set('from', filters.from);
  if (filters.to) exportQs.set('to', filters.to);
  const body = html`
<nav class="status-tabs" aria-label="Filtrează după status">
  <a href="/admin/comenzi${qs({ status: '' })}"${!filters.status ? raw(' aria-current="page"') : ''}>Toate <span>${total}</span></a>
  ${Object.entries(orderStatuses).map(
    ([key, def]) => html`<a href="/admin/comenzi${qs({ status: key })}"${filters.status === key ? raw(' aria-current="page"') : ''}>${def.label} <span>${counts[key] || 0}</span></a>`,
  )}
</nav>
<form class="filter-bar" method="get" action="/admin/comenzi">
  ${filters.status ? html`<input type="hidden" name="status" value="${filters.status}">` : ''}
  <label class="field-inline"><span>Caută</span><input class="input input-small" type="search" name="q" value="${filters.q}" placeholder="Număr, nume, telefon, email"></label>
  <label class="field-inline"><span>Programate de la</span><input class="input input-small" type="date" name="from" value="${filters.from}"></label>
  <label class="field-inline"><span>până la</span><input class="input input-small" type="date" name="to" value="${filters.to}"></label>
  <button class="btn btn-primary btn-small" type="submit">Filtrează</button>
  ${filters.q || filters.from || filters.to ? html`<a class="btn btn-ghost btn-small" href="/admin/comenzi${filters.status ? `?status=${filters.status}` : ''}">Resetează</a>` : ''}
</form>
<section class="admin-card">
  ${ordersTable(result.rows, { empty: 'Nu am găsit comenzi pentru filtrele alese.' })}
  ${result.pages > 1
    ? html`<nav class="pagination" aria-label="Pagini">
        ${result.page > 1 ? html`<a class="btn btn-outline btn-small" href="/admin/comenzi${qs({ page: result.page - 1 })}">← Înapoi</a>` : ''}
        <span>Pagina ${result.page} din ${result.pages}</span>
        ${result.page < result.pages ? html`<a class="btn btn-outline btn-small" href="/admin/comenzi${qs({ page: result.page + 1 })}">Înainte →</a>` : ''}
      </nav>`
    : ''}
</section>`;
  return adminLayout(ctx, {
    title: 'Comenzi',
    nav: 'comenzi',
    body,
    flash: ctx.flash,
    actions: html`<a class="btn btn-outline btn-small" href="/admin/comenzi.csv${exportQs.toString() ? `?${exportQs}` : ''}">${icon('download', { size: 18 })} Export CSV</a>`,
  });
}

function nextAction(order) {
  const map = {
    noua: { status: 'confirmata', label: 'Confirmă comanda' },
    confirmata: { status: 'in_preparare', label: 'Începe prepararea' },
    in_preparare: { status: 'gata', label: order.fulfillment === 'livrare' ? 'Marchează gata de livrare' : 'Marchează gata de ridicare' },
    gata: order.fulfillment === 'livrare' ? { status: 'in_livrare', label: 'Trimite în livrare' } : { status: 'finalizata', label: 'Marchează ridicată' },
    in_livrare: { status: 'finalizata', label: 'Marchează livrată' },
  };
  return map[order.status] || null;
}

export function orderDetailPage(ctx, { order, items, events, customerUrl, notifyEnabled }) {
  const next = nextAction(order);
  const payment = paymentMethods.find((p) => p.id === order.paymentMethod);
  const fulfillment = fulfillmentMethods.find((f) => f.id === order.fulfillment);
  const body = html`
<div class="order-head">
  ${statusPill(order.status, { fulfillment: order.fulfillment })}
  <span class="muted">Plasată ${formatDateTime(order.createdAt)}</span>
</div>
<div class="admin-grid admin-grid-detail">
  <div class="admin-col">
    <section class="admin-card schedule-card">
      <div class="schedule-when">
        ${icon('calendar', { size: 26 })}
        <div>
          <p class="eyebrow">${fulfillment?.label}</p>
          <p class="schedule-date">${capitalize(formatDateKey(order.scheduledDate))}, ${formatSlot(order.scheduledSlot)}</p>
          ${order.fulfillment === 'livrare' ? html`<p>${order.address}${order.addressDetails ? html`<br>${order.addressDetails}` : ''}</p>` : html`<p class="muted">Clientul ridică din cofetărie.</p>`}
        </div>
      </div>
    </section>

    <section class="admin-card">
      <div class="admin-card-head"><h2>Produse</h2><span class="muted small">${plural(items.reduce((s, i) => s + i.quantity, 0), 'produs', 'produse')}</span></div>
      <div class="table-wrap"><table class="admin-table items-table">
        <thead><tr><th scope="col">Produs</th><th scope="col" class="num">Cant.</th><th scope="col" class="num">Preț</th><th scope="col" class="num">Total</th></tr></thead>
        <tbody>
          ${items.map(
            (item) => html`<tr>
              <td><strong>${item.name}</strong>${item.variantLabel ? html`<small>${item.variantLabel}</small>` : ''}
                ${item.custom?.details?.length ? html`<ul class="custom-spec">${item.custom.details.map((d) => html`<li>${d}</li>`)}</ul>` : ''}</td>
              <td class="num"><strong>${item.quantity}</strong></td>
              <td class="num">${formatLei(item.unitPrice)}</td>
              <td class="num"><strong>${formatLei(item.lineTotal)}</strong></td>
            </tr>`,
          )}
        </tbody>
      </table></div>
      <dl class="totals admin-totals">
        <div><dt>Subtotal</dt><dd>${formatLei(order.subtotal)}</dd></div>
        ${order.discount ? html`<div class="is-discount"><dt>Reducere${order.promoCode ? ` (${order.promoCode})` : ''}</dt><dd>−${formatLei(order.discount)}</dd></div>` : ''}
        ${order.fulfillment === 'livrare' ? html`<div><dt>Livrare</dt><dd>${order.deliveryFee ? formatLei(order.deliveryFee) : 'Gratuită'}</dd></div>` : ''}
        <div class="total"><dt>Total de încasat</dt><dd>${formatLei(order.total)}</dd></div>
      </dl>
      <p class="small muted">Plată: <strong>${payment?.label || order.paymentMethod}</strong></p>
    </section>

    ${order.notes ? html`<section class="admin-card admin-note-client"><h2>${icon('edit', { size: 20 })} Observațiile clientului</h2><p class="pre-line">${order.notes}</p></section>` : ''}
  </div>

  <div class="admin-col">
    <section class="admin-card">
      <h2>Client</h2>
      <p class="client-name">${order.customerName}</p>
      <ul class="contact-list">
        <li>${icon('phone', { size: 18 })}<a href="tel:${order.customerPhone}">${formatPhone(order.customerPhone)}</a></li>
        <li>${icon('mail', { size: 18 })}<a href="mailto:${order.customerEmail}?subject=Comanda%20${order.number}">${order.customerEmail}</a></li>
      </ul>
      <p class="small"><a href="${customerUrl}" target="_blank" rel="noopener">Pagina comenzii (vizibilă clientului) ↗</a></p>
    </section>

    <section class="admin-card">
      <h2>Status</h2>
      ${next
        ? html`<form method="post" action="/admin/comenzi/${order.id}/status" class="next-step">
            ${csrfField(ctx.admin.csrf)}
            <input type="hidden" name="status" value="${next.status}">
            <input type="hidden" name="notify" value="${notifyEnabled ? 'on' : ''}">
            <button class="btn btn-primary btn-block" type="submit">${icon('check', { size: 18 })} ${next.label}</button>
          </form>`
        : ''}
      <details class="status-other"${next ? '' : raw(' open')}>
        <summary>Alt status / adaugă o notă</summary>
        <form method="post" action="/admin/comenzi/${order.id}/status">
          ${csrfField(ctx.admin.csrf)}
          <div class="field">
            <label for="status-select">Status nou</label>
            <select class="select" id="status-select" name="status">
              ${Object.entries(orderStatuses)
                .filter(([key]) => !(order.fulfillment === 'ridicare' && key === 'in_livrare'))
                .map(([key]) => html`<option value="${key}"${key === order.status ? raw(' selected') : ''}>${statusLabel(key, { customer: false })}</option>`)}
            </select>
          </div>
          <div class="field">
            <label for="status-note">Notă (opțional, vizibilă doar în istoric)</label>
            <input class="input" id="status-note" name="note" maxlength="300">
          </div>
          <label class="check"><input type="checkbox" name="notify" value="on"${notifyEnabled ? raw(' checked') : raw(' disabled')}><span>Anunță clientul pe email${notifyEnabled ? '' : ' (email neconfigurat)'}</span></label>
          <button class="btn btn-outline btn-block" type="submit">Actualizează statusul</button>
        </form>
      </details>
      <h3 class="history-title">Istoric</h3>
      <ol class="timeline">
        ${events.map(
          (e) => html`<li><span class="timeline-dot"></span><div>${statusPill(e.status, { fulfillment: order.fulfillment })}<small>${formatDateTime(e.createdAt)}</small>${e.note ? html`<p>${e.note}</p>` : ''}</div></li>`,
        )}
      </ol>
    </section>

    <section class="admin-card">
      <h2>Notă internă</h2>
      <form method="post" action="/admin/comenzi/${order.id}/nota">
        ${csrfField(ctx.admin.csrf)}
        <textarea class="input" name="note" rows="3" maxlength="2000" placeholder="Vizibilă doar în panoul de administrare.">${order.adminNote}</textarea>
        <button class="btn btn-outline btn-small" type="submit">Salvează nota</button>
      </form>
    </section>
  </div>
</div>`;
  return adminLayout(ctx, {
    title: `Comanda ${order.number}`,
    nav: 'comenzi',
    body,
    flash: ctx.flash,
    actions: html`<a class="btn btn-ghost btn-small" href="/admin/comenzi">← Toate comenzile</a><button class="btn btn-outline btn-small" type="button" data-print>${icon('printer', { size: 18 })} Tipărește</button>`,
  });
}

/* -------------------------------- Producție -------------------------------- */

export function productionPage(ctx, { date, prev, next, today, data }) {
  const totalItems = data.items.reduce((s, i) => s + i.quantity, 0);
  const body = html`
<form class="filter-bar date-nav" method="get" action="/admin/productie">
  <a class="btn btn-outline btn-small" href="/admin/productie?data=${prev}" aria-label="Ziua anterioară">←</a>
  <input class="input input-small" type="date" name="data" value="${date}" aria-label="Data" data-autosubmit>
  <a class="btn btn-outline btn-small" href="/admin/productie?data=${next}" aria-label="Ziua următoare">→</a>
  ${date !== today ? html`<a class="btn btn-ghost btn-small" href="/admin/productie">Azi</a>` : ''}
  <noscript><button class="btn btn-primary btn-small" type="submit">Arată</button></noscript>
</form>
<p class="production-date">${capitalize(formatDateKey(date, { year: true }))} · ${plural(data.orders.length, 'comandă', 'comenzi')} · ${plural(totalItems + data.custom.length, 'produs', 'produse')}</p>

<div class="admin-grid">
  <section class="admin-card">
    <div class="admin-card-head"><h2>De preparat</h2><span class="muted small">cumulat din toate comenzile neanulate</span></div>
    ${data.items.length
      ? html`<div class="table-wrap"><table class="admin-table production-table">
          <thead><tr><th scope="col" class="num">Cant.</th><th scope="col">Produs</th><th scope="col">Variantă</th></tr></thead>
          <tbody>${data.items.map((i) => html`<tr><td class="num"><strong class="qty-big">${i.quantity}</strong></td><td><strong>${i.name}</strong></td><td>${i.variantLabel}</td></tr>`)}</tbody>
        </table></div>`
      : html`<p class="muted admin-empty">Nimic de preparat din meniu pentru această zi.</p>`}
  </section>
  <section class="admin-card">
    <div class="admin-card-head"><h2>Torturi personalizate</h2><span class="muted small">${data.custom.length}</span></div>
    ${data.custom.length
      ? data.custom.map(
          (c) => html`<article class="custom-card">
            <header><strong>${c.quantity} × ${c.name}</strong><a href="/admin/comenzi/${c.orderId}">${c.orderNumber}</a></header>
            <p class="small muted">${formatSlot(c.slot)} · ${c.customerName}</p>
            <ul class="custom-spec">${(c.custom?.details || []).map((d) => html`<li>${d}</li>`)}</ul>
          </article>`,
        )
      : html`<p class="muted admin-empty">Niciun tort personalizat pentru această zi.</p>`}
  </section>
  <section class="admin-card admin-span-2">
    <div class="admin-card-head"><h2>Comenzi programate</h2></div>
    ${data.orders.length
      ? html`<div class="table-wrap"><table class="admin-table">
          <thead><tr><th scope="col">Interval</th><th scope="col">Comanda</th><th scope="col">Client</th><th scope="col">Primire</th><th scope="col">Status</th></tr></thead>
          <tbody>${data.orders.map(
            (o) => html`<tr>
              <td><strong>${formatSlot(o.scheduledSlot)}</strong></td>
              <td><a class="row-link" href="/admin/comenzi/${o.id}"><strong>${o.number}</strong></a><small>${plural(o.itemCount || 0, 'produs', 'produse')} · ${formatLei(o.total)}</small></td>
              <td>${o.customerName}<small>${formatPhone(o.customerPhone)}</small></td>
              <td>${o.fulfillment === 'livrare' ? html`<strong>Livrare</strong><small>${o.address}${o.addressDetails ? `, ${o.addressDetails}` : ''}</small>` : html`<strong>Ridicare</strong>`}</td>
              <td>${statusPill(o.status, { fulfillment: o.fulfillment })}</td>
            </tr>`,
          )}</tbody>
        </table></div>`
      : html`<p class="muted admin-empty">Nicio comandă programată în această zi.</p>`}
  </section>
</div>`;
  return adminLayout(ctx, {
    title: 'Producție',
    nav: 'productie',
    body,
    actions: html`<button class="btn btn-outline btn-small" type="button" data-print>${icon('printer', { size: 18 })} Tipărește lista</button>`,
  });
}

/* -------------------------------- Produse -------------------------------- */

export function productsPage(ctx, { products, categories, filters }) {
  const body = html`
<form class="filter-bar" method="get" action="/admin/produse">
  <label class="field-inline"><span>Caută</span><input class="input input-small" type="search" name="q" value="${filters.q}" placeholder="Nume produs"></label>
  <label class="field-inline"><span>Categorie</span>
    <select class="select select-small" name="categorie" data-autosubmit>
      <option value="">Toate</option>
      ${categories.map((c) => html`<option value="${c.slug}"${filters.category === c.slug ? raw(' selected') : ''}>${c.name}</option>`)}
    </select>
  </label>
  <button class="btn btn-primary btn-small" type="submit">Filtrează</button>
</form>
<section class="admin-card">
  ${products.length
    ? html`<div class="table-wrap"><table class="admin-table products-table">
        <thead><tr><th scope="col"><span class="visually-hidden">Imagine</span></th><th scope="col">Produs</th><th scope="col">Categorie</th><th scope="col" class="num">Preț</th><th scope="col">Pregătire</th><th scope="col">Status</th></tr></thead>
        <tbody>
          ${products.map(
            (p) => html`<tr class="${cx(!p.active && 'is-muted')}">
              <td><img class="thumb" src="${productImageUrl(p)}" alt="" width="64" height="48" loading="lazy"></td>
              <td><a class="row-link" href="/admin/produse/${p.id}"><strong>${p.name}</strong></a>${p.featured ? html` <span class="star" title="Recomandat pe prima pagină">★</span>` : ''}<small>/produs/${p.slug}</small></td>
              <td>${p.categoryName}</td>
              <td class="num">${p.activeVariants.length ? html`<strong>${formatLei(p.minPrice)}</strong>${p.maxPrice !== p.minPrice ? html`<small>până la ${formatLei(p.maxPrice)}</small>` : ''}` : html`<span class="muted">—</span>`}</td>
              <td>${plural(p.leadTimeHours, 'oră', 'ore')}</td>
              <td>${p.active ? html`<span class="status-pill status-green">Activ</span>` : html`<span class="status-pill status-gray">Ascuns</span>`}</td>
            </tr>`,
          )}
        </tbody>
      </table></div>`
    : html`<p class="muted admin-empty">Nu am găsit produse.</p>`}
</section>`;
  return adminLayout(ctx, {
    title: 'Produse',
    nav: 'produse',
    body,
    flash: ctx.flash,
    actions: html`<a class="btn btn-primary btn-small" href="/admin/produse/nou">${icon('plus', { size: 18 })} Adaugă produs</a>`,
  });
}

const leiValue = (bani) => (bani == null || bani === '' ? '' : (Number(bani) / 100).toFixed(2).replace('.', ',').replace(',00', ''));

export function productFormPage(ctx, { product, categories, errors = {}, isNew }) {
  const p = product;
  const err = (key) => (errors[key] ? html`<p class="field-error">${errors[key]}</p>` : '');
  const variants = p.variants?.length ? p.variants : [{ label: '', price: '', weightGrams: '', active: true }];
  const action = isNew ? '/admin/produse/nou' : `/admin/produse/${p.id}`;
  const body = html`
${Object.keys(errors).length ? html`<div class="notice notice-error" role="alert">${icon('alert', { size: 20 })}<div><strong>Produsul nu a fost salvat.</strong> Verifică câmpurile marcate.</div></div>` : ''}
<form class="product-form" method="post" action="${action}" data-product-form>
  ${csrfField(ctx.admin.csrf)}
  <div class="admin-grid admin-grid-detail">
    <div class="admin-col">
      <section class="admin-card">
        <h2>Informații</h2>
        <div class="field">
          <label for="p-name">Nume</label>
          <input class="input" id="p-name" name="name" value="${p.name || ''}" required maxlength="120" data-slug-source>
          ${err('name')}
        </div>
        <div class="field">
          <label for="p-slug">Adresă (slug)</label>
          <div class="input-prefix"><span>/produs/</span><input class="input" id="p-slug" name="slug" value="${p.slug || ''}" maxlength="80" pattern="[a-z0-9\-]+" placeholder="se completează automat" data-slug-target${isNew ? '' : raw(' data-slug-locked')}></div>
          ${err('slug')}
        </div>
        <div class="field">
          <label for="p-short">Descriere scurtă <span class="optional">(apare în listă)</span></label>
          <input class="input" id="p-short" name="shortDescription" value="${p.shortDescription || ''}" maxlength="200">
        </div>
        <div class="field">
          <label for="p-desc">Descriere completă <span class="optional">(rând gol = paragraf nou)</span></label>
          <textarea class="input" id="p-desc" name="description" rows="6" maxlength="4000">${p.description || ''}</textarea>
        </div>
        <div class="field">
          <label for="p-ingr">Ingrediente</label>
          <textarea class="input" id="p-ingr" name="ingredients" rows="3" maxlength="2000">${p.ingredients || ''}</textarea>
        </div>
      </section>

      <section class="admin-card">
        <div class="admin-card-head"><h2>Variante și prețuri</h2><button class="btn btn-outline btn-small" type="button" data-add-variant>${icon('plus', { size: 16 })} Adaugă variantă</button></div>
        <p class="small muted">De exemplu „1 kg · 6–8 porții” sau „1 bucată · ~120 g”. Prețul în lei, cu TVA.</p>
        ${err('variants')}
        <div class="variant-rows" data-variant-rows>
          ${variants.map(
            (v, i) => html`<div class="variant-row" data-variant-row>
              <input type="hidden" name="variants[${i}][id]" value="${v.id || ''}">
              <label class="field-inline grow"><span>Denumire</span><input class="input input-small" name="variants[${i}][label]" value="${v.label || ''}" maxlength="80" required></label>
              <label class="field-inline"><span>Preț (lei)</span><input class="input input-small" name="variants[${i}][price]" value="${typeof v.price === 'number' ? leiValue(v.price) : v.price || ''}" inputmode="decimal" required size="7"></label>
              <label class="field-inline"><span>Gramaj (g)</span><input class="input input-small" name="variants[${i}][weight]" value="${v.weightGrams ?? ''}" inputmode="numeric" size="5"></label>
              <label class="check check-inline"><input type="checkbox" name="variants[${i}][active]" value="on"${v.active === false ? '' : raw(' checked')}><span>Activă</span></label>
              <button class="icon-button" type="button" data-remove-variant aria-label="Șterge varianta">${icon('trash', { size: 18 })}</button>
            </div>`,
          )}
        </div>
      </section>

      <section class="admin-card">
        <h2>Alergeni și etichete</h2>
        <fieldset class="check-grid">
          <legend>Alergeni</legend>
          ${Object.entries(ALLERGENS).map(
            ([key, label]) => html`<label class="check"><input type="checkbox" name="allergens" value="${key}"${p.allergens?.includes(key) ? raw(' checked') : ''}><span>${label}</span></label>`,
          )}
        </fieldset>
        <fieldset class="check-grid">
          <legend>Etichete</legend>
          ${Object.entries(productTags).map(
            ([key, def]) => html`<label class="check"><input type="checkbox" name="tags" value="${key}"${p.tags?.includes(key) ? raw(' checked') : ''}><span>${def.label}</span></label>`,
          )}
        </fieldset>
      </section>
    </div>

    <div class="admin-col">
      <section class="admin-card">
        <h2>Publicare</h2>
        <label class="check"><input type="checkbox" name="active" value="on"${p.active !== false ? raw(' checked') : ''}><span><strong>Activ</strong> — vizibil în magazin</span></label>
        <label class="check"><input type="checkbox" name="featured" value="on"${p.featured ? raw(' checked') : ''}><span><strong>Recomandat</strong> — apare pe prima pagină</span></label>
        <div class="field">
          <label for="p-cat">Categorie</label>
          <select class="select" id="p-cat" name="categoryId">
            ${categories.map((c) => html`<option value="${c.id}"${Number(p.categoryId) === c.id ? raw(' selected') : ''}>${c.name}</option>`)}
          </select>
          ${err('categoryId')}
        </div>
        <div class="field">
          <label for="p-lead">Timp minim de pregătire (ore)</label>
          <input class="input" id="p-lead" name="leadTimeHours" type="number" min="0" max="720" value="${p.leadTimeHours ?? 2}">
          <p class="field-hint">Clienții pot alege doar intervale aflate după acest timp. 24 = o zi.</p>
          ${err('leadTimeHours')}
        </div>
        <div class="field">
          <label for="p-sort">Ordine în listă</label>
          <input class="input" id="p-sort" name="sort" type="number" value="${p.sort ?? 0}">
        </div>
        <button class="btn btn-primary btn-block" type="submit">${isNew ? 'Creează produsul' : 'Salvează modificările'}</button>
        ${!isNew ? html`<p class="small center"><a href="/produs/${p.slug}" target="_blank" rel="noopener">Vezi în magazin ↗</a></p>` : ''}
      </section>

      <section class="admin-card">
        <h2>Imagine</h2>
        <img class="product-preview" src="${isNew ? `/ilustratii/categorie/${categories.find((c) => c.id === Number(p.categoryId))?.slug || categories[0]?.slug}.svg` : productImageUrl(p)}" alt="" width="400" height="300" data-image-preview>
        ${isNew
          ? html`<p class="small muted">Poți încărca o fotografie după ce creezi produsul. Până atunci, folosim o ilustrație.</p>`
          : html`<div class="upload-box">
              <label class="btn btn-outline btn-small" for="p-image">${icon('image', { size: 18 })} ${p.image ? 'Schimbă fotografia' : 'Încarcă o fotografie'}</label>
              <input class="visually-hidden" id="p-image" type="file" accept="image/jpeg,image/png,image/webp" data-image-upload data-upload-url="/admin/produse/${p.id}/imagine" data-csrf="${ctx.admin.csrf}">
              <p class="small muted" data-upload-status>JPG, PNG sau WebP. O redimensionăm automat la max. 1600 px.</p>
            </div>
            ${p.image ? html`<button class="link-button" type="submit" form="remove-image-form">Elimină fotografia (revino la ilustrație)</button>` : ''}`}
        <details class="visual-editor"${errors.visual ? raw(' open') : ''}>
          <summary>Ilustrație (avansat)</summary>
          <p class="small muted">Când produsul nu are fotografie, afișăm o ilustrație generată din aceste setări. Tipuri: ${ILLUSTRATION_KINDS.join(', ')}.</p>
          <textarea class="input mono" name="visual" rows="8" spellcheck="false" data-visual-json>${JSON.stringify(p.visual || {}, null, 2)}</textarea>
          ${err('visual')}
          <div class="visual-preview" data-visual-preview></div>
        </details>
      </section>
    </div>
  </div>
</form>
${!isNew
  ? html`<form id="remove-image-form" method="post" action="/admin/produse/${p.id}/imagine/sterge">${csrfField(ctx.admin.csrf)}</form>
    <form class="danger-zone" method="post" action="/admin/produse/${p.id}/sterge" data-confirm="Sigur ștergi definitiv produsul „${p.name}”? Comenzile existente nu sunt afectate.">
      ${csrfField(ctx.admin.csrf)}
      <div><strong>Șterge produsul</strong><p class="small muted">Dacă vrei doar să-l scoți temporar din magazin, debifează „Activ”.</p></div>
      <button class="btn btn-danger btn-small" type="submit">${icon('trash', { size: 18 })} Șterge definitiv</button>
    </form>`
  : ''}
<template data-variant-template>
  <div class="variant-row" data-variant-row>
    <input type="hidden" data-name="id" value="">
    <label class="field-inline grow"><span>Denumire</span><input class="input input-small" data-name="label" maxlength="80" required></label>
    <label class="field-inline"><span>Preț (lei)</span><input class="input input-small" data-name="price" inputmode="decimal" required size="7"></label>
    <label class="field-inline"><span>Gramaj (g)</span><input class="input input-small" data-name="weight" inputmode="numeric" size="5"></label>
    <label class="check check-inline"><input type="checkbox" data-name="active" value="on" checked><span>Activă</span></label>
    <button class="icon-button" type="button" data-remove-variant aria-label="Șterge varianta">${icon('trash', { size: 18 })}</button>
  </div>
</template>`;
  return adminLayout(ctx, {
    title: isNew ? 'Produs nou' : p.name,
    nav: 'produse',
    body,
    flash: ctx.flash,
    actions: html`<a class="btn btn-ghost btn-small" href="/admin/produse">← Toate produsele</a>`,
  });
}

/* --------------------------------- Setări --------------------------------- */

export function settingsPage(ctx, { settings, promos, errors = {}, promoErrors = {}, promoValues = {} }) {
  const err = (map, key) => (map[key] ? html`<p class="field-error">${map[key]}</p>` : '');
  const body = html`
<form method="post" action="/admin/setari" class="settings-form">
  ${csrfField(ctx.admin.csrf)}
  ${Object.keys(errors).length ? html`<div class="notice notice-error" role="alert">${icon('alert', { size: 20 })}<div><strong>Setările nu au fost salvate.</strong> Verifică câmpurile marcate.</div></div>` : ''}
  <div class="admin-grid">
    <section class="admin-card">
      <h2>Comenzi online</h2>
      <label class="check"><input type="checkbox" name="ordersEnabled" value="on"${settings.ordersEnabled ? raw(' checked') : ''}><span><strong>Primim comenzi online</strong></span></label>
      <div class="field">
        <label for="s-paused">Mesaj afișat când comenzile sunt oprite</label>
        <input class="input" id="s-paused" name="ordersPausedMessage" value="${settings.ordersPausedMessage}" maxlength="200">
      </div>
      <div class="field">
        <label for="s-announcement">Anunț în partea de sus a site-ului <span class="optional">(gol = fără anunț)</span></label>
        <input class="input" id="s-announcement" name="announcement" value="${settings.announcement}" maxlength="200">
      </div>
    </section>
    <section class="admin-card">
      <h2>Livrare</h2>
      <label class="check"><input type="checkbox" name="deliveryEnabled" value="on"${settings.deliveryEnabled ? raw(' checked') : ''}><span><strong>Oferim livrare la domiciliu</strong></span></label>
      <div class="field-grid">
        <div class="field"><label for="s-fee">Taxă de livrare (lei)</label><input class="input" id="s-fee" name="deliveryFee" inputmode="decimal" value="${leiValue(settings.deliveryFee)}">${err(errors, 'deliveryFee')}</div>
        <div class="field"><label for="s-free">Livrare gratuită peste (lei)</label><input class="input" id="s-free" name="freeDeliveryOver" inputmode="decimal" value="${leiValue(settings.freeDeliveryOver)}">${err(errors, 'freeDeliveryOver')}</div>
        <div class="field"><label for="s-min">Comandă minimă pentru livrare (lei)</label><input class="input" id="s-min" name="minOrderDelivery" inputmode="decimal" value="${leiValue(settings.minOrderDelivery)}">${err(errors, 'minOrderDelivery')}</div>
      </div>
    </section>
    <section class="admin-card">
      <h2>Zile în care suntem închiși</h2>
      <div class="field">
        <label for="s-closed">Câte o dată pe rând (AAAA-LL-ZZ sau ZZ.LL.AAAA)</label>
        <textarea class="input mono" id="s-closed" name="closedDates" rows="6">${settings.closedDates.join('\n')}</textarea>
        <p class="field-hint">În aceste zile clienții nu pot programa ridicări sau livrări. Programul obișnuit se modifică din fișierul de configurare.</p>
        ${err(errors, 'closedDates')}
      </div>
    </section>
  </div>
  <p><button class="btn btn-primary" type="submit">Salvează setările</button></p>
</form>

<section class="admin-card promo-admin" id="coduri">
  <div class="admin-card-head"><h2>Coduri promoționale</h2></div>
  ${promos.length
    ? html`<div class="table-wrap"><table class="admin-table">
        <thead><tr><th scope="col">Cod</th><th scope="col">Reducere</th><th scope="col">Comandă minimă</th><th scope="col">Expiră</th><th scope="col">Utilizări</th><th scope="col">Status</th><th scope="col"><span class="visually-hidden">Acțiuni</span></th></tr></thead>
        <tbody>${promos.map(
          (c) => html`<tr class="${cx(!c.active && 'is-muted')}">
            <td><strong class="mono">${c.code}</strong></td>
            <td>${c.kind === 'percent' ? `${c.value}%` : formatLei(c.value)}</td>
            <td>${c.minSubtotal ? formatLei(c.minSubtotal) : '—'}</td>
            <td>${c.expiresOn ? formatDateKey(c.expiresOn, { weekday: false, year: true }) : 'fără termen'}</td>
            <td>${c.uses}${c.maxUses != null ? ` / ${c.maxUses}` : ''}</td>
            <td>${c.active ? html`<span class="status-pill status-green">Activ</span>` : html`<span class="status-pill status-gray">Inactiv</span>`}</td>
            <td class="row-actions">
              <form method="post" action="/admin/coduri/${c.id}/comuta">${csrfField(ctx.admin.csrf)}<button class="btn btn-ghost btn-small" type="submit">${c.active ? 'Dezactivează' : 'Activează'}</button></form>
              <form method="post" action="/admin/coduri/${c.id}/sterge" data-confirm="Ștergi codul ${c.code}?">${csrfField(ctx.admin.csrf)}<button class="btn btn-ghost btn-small" type="submit" aria-label="Șterge codul ${c.code}">${icon('trash', { size: 16 })}</button></form>
            </td>
          </tr>`,
        )}</tbody>
      </table></div>`
    : html`<p class="muted admin-empty">Nu ai niciun cod promoțional.</p>`}
  <form class="promo-create" method="post" action="/admin/coduri">
    ${csrfField(ctx.admin.csrf)}
    <h3>Adaugă un cod</h3>
    <div class="field-grid">
      <div class="field"><label for="c-code">Cod</label><input class="input mono" id="c-code" name="code" value="${promoValues.code || ''}" maxlength="30" required placeholder="CRACIUN15" autocapitalize="characters">${err(promoErrors, 'code')}</div>
      <div class="field"><label for="c-kind">Tip</label><select class="select" id="c-kind" name="kind"><option value="percent"${promoValues.kind !== 'fixed' ? raw(' selected') : ''}>Procent (%)</option><option value="fixed"${promoValues.kind === 'fixed' ? raw(' selected') : ''}>Sumă fixă (lei)</option></select></div>
      <div class="field"><label for="c-value">Valoare</label><input class="input" id="c-value" name="value" value="${promoValues.value || ''}" inputmode="decimal" required>${err(promoErrors, 'value')}</div>
      <div class="field"><label for="c-min">Comandă minimă (lei)</label><input class="input" id="c-min" name="minSubtotal" value="${promoValues.minSubtotal || ''}" inputmode="decimal" placeholder="0">${err(promoErrors, 'minSubtotal')}</div>
      <div class="field"><label for="c-exp">Expiră la <span class="optional">(inclusiv)</span></label><input class="input" id="c-exp" name="expiresOn" type="date" value="${promoValues.expiresOn || ''}">${err(promoErrors, 'expiresOn')}</div>
      <div class="field"><label for="c-max">Număr maxim de utilizări</label><input class="input" id="c-max" name="maxUses" value="${promoValues.maxUses || ''}" inputmode="numeric" placeholder="nelimitat">${err(promoErrors, 'maxUses')}</div>
    </div>
    <button class="btn btn-outline" type="submit">${icon('plus', { size: 18 })} Adaugă codul</button>
  </form>
</section>`;
  return adminLayout(ctx, { title: 'Setări', nav: 'setari', body, flash: ctx.flash });
}

export function adminNotFound(ctx, message = 'Elementul căutat nu există.') {
  return adminLayout(ctx, {
    title: 'Nu am găsit',
    body: html`<section class="admin-card"><p>${message}</p><p><a class="btn btn-outline btn-small" href="/admin">Înapoi la panou</a></p></section>`,
  });
}
