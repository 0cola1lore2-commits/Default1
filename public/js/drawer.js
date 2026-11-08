/* Sertarul lateral cu coșul de cumpărături. */

import * as cart from './cart-store.js';
import { bindLineEvents, bindPromo, handleProblems, renderFreeDelivery, renderLines, renderPreservingFocus, renderTotals } from './cart-view.js';
import { fetchQuote, html, icon, raw } from './ui.js';

let drawer;
let backdrop;
let body;
let foot;
let lastFocus = null;
let isOpen = false;
let seq = 0;

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, summary, [tabindex]:not([tabindex="-1"])';

export function initDrawer() {
  drawer = document.querySelector('[data-cart-drawer]');
  backdrop = document.querySelector('[data-drawer-backdrop]');
  if (!drawer) return;
  body = drawer.querySelector('[data-drawer-body]');
  foot = drawer.querySelector('[data-drawer-foot]');

  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-cart-open]')) {
      event.preventDefault();
      openDrawer();
    } else if (event.target.closest('[data-cart-close]') || event.target === backdrop) {
      closeDrawer();
    }
  });
  document.addEventListener('keydown', (event) => {
    if (!isOpen) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeDrawer();
    } else if (event.key === 'Tab') {
      const items = [...drawer.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === firstEl || document.activeElement === drawer)) {
        event.preventDefault();
        lastEl.focus();
      } else if (!event.shiftKey && document.activeElement === lastEl) {
        event.preventDefault();
        firstEl.focus();
      }
    }
  });
  bindLineEvents(body);
  bindPromo(foot);
  cart.subscribe(() => {
    if (isOpen) refresh();
  });
}

export function openDrawer() {
  if (!drawer || isOpen) {
    if (isOpen) refresh();
    return;
  }
  isOpen = true;
  lastFocus = document.activeElement;
  drawer.hidden = false;
  backdrop.hidden = false;
  document.documentElement.classList.add('has-drawer');
  requestAnimationFrame(() => {
    drawer.classList.add('is-open');
    backdrop.classList.add('is-open');
  });
  drawer.setAttribute('tabindex', '-1');
  drawer.focus({ preventScroll: true });
  refresh();
}

export function closeDrawer() {
  if (!isOpen) return;
  isOpen = false;
  drawer.classList.remove('is-open');
  backdrop.classList.remove('is-open');
  document.documentElement.classList.remove('has-drawer');
  setTimeout(() => {
    if (!isOpen) {
      drawer.hidden = true;
      backdrop.hidden = true;
    }
  }, 260);
  if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
}

async function refresh() {
  const current = cart.getCart();
  const mySeq = ++seq;
  if (!current.items.length) {
    body.innerHTML = String(html`<div class="drawer-empty">
      <img src="/img/empty-plate.svg" alt="" width="160" height="120">
      <p><strong>Coșul tău e gol.</strong></p>
      <p class="muted">Hai să-l umplem cu ceva bun!</p>
      <a class="btn btn-primary" href="/produse">Vezi produsele</a>
    </div>`);
    foot.innerHTML = '';
    return;
  }
  if (!body.querySelector('.cart-lines')) body.innerHTML = '<div class="loading-inline"><span class="spinner"></span> Se încarcă…</div>';
  try {
    const quote = await fetchQuote(current);
    if (mySeq !== seq) return;
    if (handleProblems(quote)) return;
    renderPreservingFocus(body, renderLines(quote, { compact: true }));
    foot.innerHTML = String(html`
      ${renderFreeDelivery(quote)}
      ${renderTotals(quote, { showFulfillment: false })}
      <p class="small muted">Taxa de livrare se calculează la finalizarea comenzii.</p>
      <a class="btn btn-primary btn-block btn-large" href="/finalizare-comanda">Finalizează comanda ${raw(icon('arrowRight', 18))}</a>
      <a class="btn btn-ghost btn-block" href="/cos">Vezi coșul complet</a>`);
  } catch (err) {
    if (mySeq !== seq) return;
    body.innerHTML = String(html`<div class="notice notice-error" role="alert">${raw(icon('alert', 20))}<div>${err.message}</div></div>`);
  }
}
