/* Pagina „Coșul tău”. */

import * as cart from '../cart-store.js';
import { bindLineEvents, bindPromo, handleProblems, renderFreeDelivery, renderLines, renderPreservingFocus, renderPromo, renderTotals } from '../cart-view.js';
import { fetchQuote, formatLei, html, icon, raw } from '../ui.js';

export function init() {
  const root = document.querySelector('[data-cart-page]');
  const linesEl = root.querySelector('[data-cart-lines]');
  const summaryEl = root.querySelector('[data-cart-summary]');
  let seq = 0;

  bindLineEvents(linesEl);
  bindPromo(summaryEl);
  summaryEl.addEventListener('change', (event) => {
    if (event.target.name === 'fulfillment-preview') cart.setFulfillment(event.target.value);
  });
  cart.subscribe(render);
  render();

  async function render() {
    const current = cart.getCart();
    const mySeq = ++seq;
    if (!current.items.length) {
      root.classList.add('is-empty');
      summaryEl.hidden = true;
      linesEl.innerHTML = String(html`<div class="empty-state">
        <img src="/img/empty-plate.svg" alt="" width="200" height="150">
        <h2>Coșul tău este gol</h2>
        <p>Răsfoiește meniul și adaugă ce îți face poftă. Te așteptăm!</p>
        <p class="cluster center"><a class="btn btn-primary" href="/produse">Vezi produsele</a><a class="btn btn-outline" href="/tort-personalizat">Tort personalizat</a></p>
      </div>`);
      return;
    }
    root.classList.remove('is-empty');
    summaryEl.hidden = false;
    try {
      const quote = await fetchQuote(current);
      if (mySeq !== seq) return;
      if (handleProblems(quote)) return;
      renderPreservingFocus(
        linesEl,
        html`<div class="card cart-card">${renderLines(quote)}</div>
          <p><a class="link-arrow link-back" href="/produse">${raw(icon('arrowLeft', 18))} Continuă cumpărăturile</a></p>`,
      );
      const delivery = quote.fulfillment === 'livrare';
      summaryEl.innerHTML = String(html`
        <h2 class="summary-title">Sumar</h2>
        <fieldset class="segmented">
          <legend class="visually-hidden">Cum primești comanda</legend>
          <label><input type="radio" name="fulfillment-preview" value="ridicare"${delivery ? '' : raw(' checked')}><span>${raw(icon('store', 18))} Ridicare</span></label>
          <label class="${quote.deliveryAvailable ? '' : 'is-disabled'}"><input type="radio" name="fulfillment-preview" value="livrare"${delivery ? raw(' checked') : ''}${quote.deliveryAvailable ? '' : raw(' disabled')}><span>${raw(icon('truck', 18))} Livrare</span></label>
        </fieldset>
        ${renderPromo(quote)}
        ${renderTotals(quote)}
        ${delivery && !quote.minOrderOk ? html`<p class="notice notice-warning">${raw(icon('alert', 18))}<span>Pentru livrare, comanda minimă este de ${formatLei(quote.minOrderDelivery)}.</span></p>` : ''}
        ${renderFreeDelivery(quote)}
        <a class="btn btn-primary btn-block btn-large" href="/finalizare-comanda">Continuă ${raw(icon('arrowRight', 18))}</a>
        <p class="small muted center">Alegi ziua, ora și metoda de plată la pasul următor.</p>`);
    } catch (err) {
      if (mySeq !== seq) return;
      linesEl.innerHTML = String(html`<div class="notice notice-error" role="alert">${raw(icon('alert', 20))}<div>${err.message}</div></div>`);
    }
  }
}
