/* Afișarea liniilor din coș, a totalurilor și a codului promoțional. */

import * as cart from './cart-store.js';
import { customCakeVisual } from './shared/custom-cake.js';
import { renderCustomCakeSvg } from './shared/illustrations.js';
import { formatLei, html, icon, raw, toast } from './ui.js';

function lineMedia(line) {
  if (line.type === 'custom') return raw(renderCustomCakeSvg(customCakeVisual(line.custom), { uid: `cc-${line.key}`, bg: '#FCE8EC' }));
  return html`<img src="${line.image}" alt="" width="120" height="90" loading="lazy" decoding="async">`;
}

export function renderLines(quote, { editable = true, compact = false } = {}) {
  return html`<ul class="cart-lines${compact ? ' is-compact' : ''}">
    ${quote.lines.map(
      (line) => html`<li class="cart-line" data-key="${line.key}">
        <a class="cart-line-media" href="${line.url}" tabindex="-1" aria-hidden="true">${lineMedia(line)}</a>
        <div class="cart-line-info">
          <a class="cart-line-name" href="${line.url}">${line.name}</a>
          ${line.variantLabel ? html`<p class="cart-line-variant">${line.variantLabel}</p>` : ''}
          ${line.details?.length
            ? html`<details class="cart-line-details"${compact ? '' : raw(' open')}><summary>Detaliile tortului</summary><ul>${line.details.map((d) => html`<li>${d}</li>`)}</ul></details>`
            : ''}
          ${editable
            ? html`<div class="cart-line-actions">
                <div class="qty-control qty-small">
                  <button type="button" class="qty-btn" data-line-step="-1" aria-label="Scade cantitatea: ${line.name}">${raw(icon('minus', 16))}</button>
                  <input type="number" min="1" max="${line.type === 'custom' ? 3 : 50}" value="${line.qty}" inputmode="numeric" data-line-qty aria-label="Cantitate: ${line.name}">
                  <button type="button" class="qty-btn" data-line-step="1" aria-label="Crește cantitatea: ${line.name}">${raw(icon('plus', 16))}</button>
                </div>
                <button type="button" class="link-button" data-line-remove>${raw(icon('trash', 16))}<span>Șterge</span></button>
              </div>`
            : html`<p class="cart-line-variant">${line.qty} × ${formatLei(line.unitPrice)}</p>`}
        </div>
        <p class="cart-line-total">${formatLei(line.lineTotal)}</p>
      </li>`,
    )}
  </ul>`;
}

export function renderTotals(quote, { showFulfillment = true } = {}) {
  const delivery = quote.fulfillment === 'livrare';
  return html`<dl class="totals">
    <div><dt>Subtotal</dt><dd>${formatLei(quote.subtotal)}</dd></div>
    ${quote.discount ? html`<div class="is-discount"><dt>Reducere (${quote.promo.code})</dt><dd>−${formatLei(quote.discount)}</dd></div>` : ''}
    ${showFulfillment ? html`<div><dt>${delivery ? 'Livrare' : 'Ridicare din cofetărie'}</dt><dd>${delivery && quote.deliveryFee ? formatLei(quote.deliveryFee) : 'Gratuită'}</dd></div>` : ''}
    <div class="total"><dt>Total</dt><dd>${formatLei(quote.total)}</dd></div>
  </dl>`;
}

export function renderFreeDelivery(quote) {
  if (!quote.deliveryAvailable) return '';
  if (quote.freeDeliveryRemaining <= 0) return html`<p class="free-delivery is-done">${raw(icon('truck', 18))}<span>Ai livrare gratuită!</span></p>`;
  const pct = Math.max(4, Math.round(100 * (1 - quote.freeDeliveryRemaining / quote.freeDeliveryOver)));
  return html`<div class="free-delivery">
    <p>${raw(icon('truck', 18))}<span>Mai adaugă <strong>${formatLei(quote.freeDeliveryRemaining)}</strong> pentru livrare gratuită.</span></p>
    <div class="meter" role="progressbar" aria-label="Progres către livrarea gratuită" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span style="width:${pct}%"></span></div>
  </div>`;
}

export function renderPromo(quote) {
  if (quote.promo?.ok) {
    return html`<div class="promo-applied">
      ${raw(icon('tag', 18))}<span>Codul <strong>${quote.promo.code}</strong> este aplicat.</span>
      <button type="button" class="link-button" data-promo-remove>Elimină</button>
    </div>`;
  }
  const failed = quote.promo && !quote.promo.ok;
  return html`<form class="promo-form" data-promo-form novalidate>
    <label class="visually-hidden" for="promo-code">Cod promoțional</label>
    <input class="input input-small" id="promo-code" name="promo" placeholder="Ai un cod promoțional?" value="${failed ? quote.promo.code : ''}" maxlength="40" autocomplete="off" autocapitalize="characters"${failed ? raw(' aria-invalid="true" aria-describedby="promo-error"') : ''}>
    <button class="btn btn-outline btn-small" type="submit">Aplică</button>
    ${failed ? html`<p class="field-error" id="promo-error">${quote.promo.message}</p>` : ''}
  </form>`;
}

export function bindPromo(container) {
  container.addEventListener('submit', (event) => {
    const form = event.target.closest('[data-promo-form]');
    if (!form) return;
    event.preventDefault();
    const code = form.elements.promo.value.trim();
    if (code) cart.setPromoCode(code);
  });
  container.addEventListener('click', (event) => {
    if (event.target.closest('[data-promo-remove]')) cart.setPromoCode('');
  });
}

/** Elimină din coș produsele indisponibile raportate de server. Întoarce true dacă a modificat coșul. */
export function handleProblems(quote) {
  if (!quote?.problems?.length) return false;
  cart.removeKeys(quote.problems.map((p) => p.key));
  toast(quote.problems[0].message, { tone: 'error', timeout: 6000 });
  return true;
}

/** Evenimente pentru cantitate și ștergere (delegare pe container). */
export function bindLineEvents(container) {
  container.addEventListener('click', (event) => {
    const line = event.target.closest('[data-key]');
    if (!line) return;
    const key = line.dataset.key;
    const step = event.target.closest('[data-line-step]');
    if (step) {
      const input = line.querySelector('[data-line-qty]');
      const next = (Number(input.value) || 1) + Number(step.dataset.lineStep);
      if (next < 1) return removeWithUndo(key, line);
      input.value = String(Math.min(Number(input.max) || 50, next));
      cart.setQty(key, input.value);
      return undefined;
    }
    if (event.target.closest('[data-line-remove]')) removeWithUndo(key, line);
    return undefined;
  });
  container.addEventListener('change', (event) => {
    const input = event.target.closest('[data-line-qty]');
    if (!input) return;
    const line = input.closest('[data-key]');
    const value = Math.floor(Number(input.value));
    if (!value || value < 1) removeWithUndo(line.dataset.key, line);
    else cart.setQty(line.dataset.key, Math.min(Number(input.max) || 50, value));
  });
}

function removeWithUndo(key, lineEl) {
  const before = cart.getCart();
  const index = before.items.findIndex((i) => i.key === key);
  if (index < 0) return;
  const item = before.items[index];
  const name = lineEl?.querySelector('.cart-line-name')?.textContent?.trim() || 'Produsul';
  cart.removeItem(key);
  toast(`${name} a fost scos din coș.`, {
    actionLabel: 'Anulează',
    onAction: () => {
      const now = cart.getCart();
      if (now.items.some((i) => i.key === key)) return;
      if (item.custom) cart.addCustom(item.custom, item.qty);
      else cart.addProduct(item.variantId, item.qty);
    },
  });
}

/** Re-randează păstrând focusul pe același control (pentru navigarea cu tastatura). */
export function renderPreservingFocus(container, markup) {
  const active = document.activeElement;
  let restore = null;
  if (active && container.contains(active)) {
    const line = active.closest('[data-key]');
    const attr = ['data-line-step', 'data-line-qty', 'data-line-remove'].find((a) => active.hasAttribute(a));
    if (line && attr) restore = { key: line.dataset.key, selector: attr === 'data-line-step' ? `[data-line-step="${active.getAttribute(attr)}"]` : `[${attr}]` };
  }
  container.innerHTML = String(markup);
  if (restore) {
    const line = [...container.querySelectorAll('[data-key]')].find((el) => el.dataset.key === restore.key);
    line?.querySelector(restore.selector)?.focus();
  }
}
