/* Utilitare de interfață: cereri către API, notificări (toast), formatări. */

import { iconMarkup } from './shared/icons.js';

export { formatLei, plural } from './shared/format.js';
export { html, raw, escapeHtml } from './shared/html.js';

export const icon = (name, size = 18) => iconMarkup(name, { size });

export async function api(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body),
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}

/** Trimite coșul la server și primește prețurile, totalurile și (opțional) programul. */
export async function fetchQuote(cart, { withSchedule = false, fulfillment } = {}) {
  const { ok, data } = await api('/api/cos', {
    items: cart.items,
    promoCode: cart.promoCode,
    fulfillment: fulfillment || cart.fulfillment,
    withSchedule,
  });
  if (!ok || !data) throw new Error('Nu am putut încărca coșul. Verifică conexiunea și încearcă din nou.');
  return data;
}

let toastRegion = null;

export function toast(message, { actionLabel = '', onAction = null, tone = 'default', timeout = 4500 } = {}) {
  toastRegion ||= document.querySelector('[data-toasts]');
  if (!toastRegion) return;
  const el = document.createElement('div');
  el.className = `toast toast-${tone}`;
  const text = document.createElement('p');
  text.innerHTML = `${icon(tone === 'error' ? 'alert' : 'check', 18)}<span></span>`;
  text.querySelector('span').textContent = message;
  el.append(text);
  if (actionLabel && onAction) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'toast-action';
    btn.textContent = actionLabel;
    btn.addEventListener('click', () => {
      dismiss();
      onAction();
    });
    el.append(btn);
  }
  toastRegion.append(el);
  requestAnimationFrame(() => el.classList.add('is-visible'));
  let timer = setTimeout(dismiss, timeout);
  el.addEventListener('mouseenter', () => clearTimeout(timer));
  el.addEventListener('mouseleave', () => {
    timer = setTimeout(dismiss, 2000);
  });
  function dismiss() {
    clearTimeout(timer);
    el.classList.remove('is-visible');
    setTimeout(() => el.remove(), 300);
  }
}

export function debounce(fn, wait = 250) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

/** Animație scurtă pe insigna coșului din antet. */
export function bumpCartBadge() {
  const badge = document.querySelector('[data-cart-count]');
  if (!badge) return;
  badge.classList.remove('is-bumped');
  void badge.offsetWidth;
  badge.classList.add('is-bumped');
}
