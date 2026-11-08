import { fulfillmentMethods, paymentMethods, shop } from '../config.js';
import { capitalize, formatDateKey, formatLei, formatSlot } from '../../public/js/shared/format.js';
import { html } from '../lib/html.js';
import { customerSteps, statusLabel } from '../lib/orders.js';
import { breadcrumbs, notice, pageHero } from './components.js';
import { icon } from './icons.js';
import { layout } from './layout.js';

/* ------------------------------- Coșul ------------------------------- */

export function cartPage(ctx) {
  const body = html`
${pageHero({ title: 'Coșul tău', crumbs: [{ href: '/', label: 'Acasă' }, { label: 'Coș' }] })}
<section class="section section-cart">
  <div class="container cart-layout" data-cart-page>
    <div class="cart-main" data-cart-lines>
      <div class="loading-card" aria-busy="true"><span class="spinner"></span> Se încarcă coșul…</div>
    </div>
    <aside class="summary-card" data-cart-summary aria-label="Sumarul comenzii"></aside>
  </div>
</section>`;
  return layout(ctx, { title: 'Coșul tău', body, page: 'cart', noindex: true });
}

/* ---------------------------- Finalizare comandă ---------------------------- */

function field({ id, name, label, type = 'text', autocomplete = '', placeholder = '', required = true, hint = '', inputmode = '', maxlength = 120 }) {
  return html`<div class="field" data-field="${name}">
    <label for="${id}">${label}${required ? '' : html` <span class="optional">(opțional)</span>`}</label>
    <input class="input" id="${id}" name="${name}" type="${type}"${autocomplete ? html` autocomplete="${autocomplete}"` : ''}${placeholder ? html` placeholder="${placeholder}"` : ''}${inputmode ? html` inputmode="${inputmode}"` : ''} maxlength="${maxlength}"${required ? html` required aria-required="true"` : ''} aria-describedby="${id}-error${hint ? ` ${id}-hint` : ''}">
    ${hint ? html`<p class="field-hint" id="${id}-hint">${hint}</p>` : ''}
    <p class="field-error" id="${id}-error" data-error-for="${name}" hidden></p>
  </div>`;
}

export function checkoutPage(ctx) {
  const { settings } = ctx;
  const crumbs = [{ href: '/', label: 'Acasă' }, { href: '/cos', label: 'Coș' }, { label: 'Finalizare comandă' }];
  if (!settings.ordersEnabled) {
    return layout(ctx, {
      title: 'Finalizare comandă',
      noindex: true,
      body: html`${pageHero({ title: 'Finalizare comandă', crumbs })}
      <section class="section"><div class="container narrow">${notice('warning', settings.ordersPausedMessage, { title: 'Comenzile online sunt în pauză.' })}
      <p class="cluster"><a class="btn btn-outline" href="/contact">Contactează-ne</a></p></div></section>`,
    });
  }

  const body = html`
${pageHero({ title: 'Finalizare comandă', crumbs })}
<section class="section section-checkout">
  <div class="container checkout-layout" data-checkout>
    <form class="checkout-form" data-checkout-form novalidate>
      <div class="notice notice-error" data-form-alert role="alert" tabindex="-1" hidden></div>

      <section class="form-section" aria-labelledby="pas-date">
        <h2 id="pas-date"><span class="step-num">1</span> Datele tale</h2>
        <div class="field-grid">
          ${field({ id: 'f-name', name: 'name', label: 'Nume și prenume', autocomplete: 'name', maxlength: 80 })}
          ${field({ id: 'f-phone', name: 'phone', label: 'Telefon', type: 'tel', autocomplete: 'tel', inputmode: 'tel', placeholder: '07xx xxx xxx', hint: 'Te sunăm doar pentru confirmarea comenzii.', maxlength: 20 })}
          ${field({ id: 'f-email', name: 'email', label: 'Email', type: 'email', autocomplete: 'email', placeholder: 'nume@exemplu.ro', hint: 'Aici primești confirmarea și linkul de urmărire.' })}
        </div>
      </section>

      <section class="form-section" aria-labelledby="pas-primire">
        <h2 id="pas-primire"><span class="step-num">2</span> Cum primești comanda</h2>
        <div class="radio-cards" role="radiogroup" aria-labelledby="pas-primire" data-field="fulfillment">
          ${fulfillmentMethods.map(
            (m, i) => html`<label class="radio-card${m.id === 'livrare' && !settings.deliveryEnabled ? ' is-disabled' : ''}">
              <input type="radio" name="fulfillment" value="${m.id}"${i === 0 ? html` checked` : ''}${m.id === 'livrare' && !settings.deliveryEnabled ? html` disabled` : ''}>
              <span class="radio-card-body">
                ${icon(m.id === 'livrare' ? 'truck' : 'store', { size: 24 })}
                <span>
                  <strong>${m.label}</strong>
                  <small>${m.id === 'livrare'
                    ? settings.deliveryEnabled
                      ? `${formatLei(settings.deliveryFee)}, gratuit peste ${formatLei(settings.freeDeliveryOver)}. Comandă minimă ${formatLei(settings.minOrderDelivery)}.`
                      : 'Momentan indisponibilă.'
                    : `Gratuit, din ${shop.address.street}.`}</small>
                </span>
              </span>
            </label>`,
          )}
        </div>
        <p class="field-error" data-error-for="fulfillment" hidden></p>
        <div class="delivery-fields" data-delivery-fields hidden>
          <div class="field-grid">
            ${field({ id: 'f-address', name: 'address', label: 'Adresa de livrare', autocomplete: 'street-address', placeholder: 'Strada, numărul, localitatea', maxlength: 200 })}
            ${field({ id: 'f-address2', name: 'addressDetails', label: 'Bloc, scară, etaj, apartament, interfon', required: false, maxlength: 200 })}
          </div>
          <p class="small muted">${icon('info', { size: 16 })} ${shop.deliveryArea}</p>
        </div>
      </section>

      <section class="form-section" aria-labelledby="pas-data">
        <h2 id="pas-data"><span class="step-num">3</span> Ziua și ora</h2>
        <p class="small muted" data-lead-note></p>
        <div class="date-picker" data-date-picker role="radiogroup" aria-label="Ziua">
          <div class="loading-inline"><span class="spinner"></span> Calculăm intervalele disponibile…</div>
        </div>
        <p class="field-error" data-error-for="date" hidden></p>
        <h3 class="slot-title" data-slot-title hidden>Intervalul orar</h3>
        <div class="slot-picker" data-slot-picker role="radiogroup" aria-label="Intervalul orar"></div>
        <p class="field-error" data-error-for="slot" hidden></p>
      </section>

      <section class="form-section" aria-labelledby="pas-plata">
        <h2 id="pas-plata"><span class="step-num">4</span> Plata</h2>
        <div class="radio-cards radio-cards-3" role="radiogroup" aria-labelledby="pas-plata">
          ${paymentMethods.map(
            (m, i) => html`<label class="radio-card">
              <input type="radio" name="paymentMethod" value="${m.id}"${i === 0 ? html` checked` : ''}>
              <span class="radio-card-body">
                ${icon(m.id === 'numerar' ? 'cash' : m.id === 'card' ? 'card' : 'bank', { size: 24 })}
                <span><strong>${m.label}</strong><small>${m.description}</small></span>
              </span>
            </label>`,
          )}
        </div>
        <p class="field-error" data-error-for="paymentMethod" hidden></p>
      </section>

      <section class="form-section" aria-labelledby="pas-final">
        <h2 id="pas-final"><span class="step-num">5</span> Ultimele detalii</h2>
        <div class="field">
          <label for="f-notes">Observații pentru noi <span class="optional">(opțional)</span></label>
          <textarea class="input" id="f-notes" name="notes" rows="3" maxlength="1000" placeholder="Alergii, detalii de livrare, un mesaj pentru cofetar…"></textarea>
        </div>
        <div class="hp-field" aria-hidden="true">
          <label for="f-website">Lasă acest câmp gol</label>
          <input id="f-website" name="website" type="text" tabindex="-1" autocomplete="off">
        </div>
        <label class="check">
          <input type="checkbox" name="remember" value="1">
          <span>Ține minte datele mele pe acest dispozitiv, pentru comenzile viitoare.</span>
        </label>
        <label class="check" data-field="acceptTerms">
          <input type="checkbox" name="acceptTerms" value="on" required aria-describedby="f-terms-error">
          <span>Am citit și accept <a href="/termeni-si-conditii" target="_blank">termenii și condițiile</a> și <a href="/politica-de-confidentialitate" target="_blank">politica de confidențialitate</a>.</span>
        </label>
        <p class="field-error" id="f-terms-error" data-error-for="acceptTerms" hidden></p>
      </section>

      <div class="checkout-submit">
        <button class="btn btn-primary btn-large btn-block" type="submit" data-submit>
          <span data-submit-label>Trimite comanda</span>
        </button>
        <p class="small muted center">Prin trimiterea comenzii, aceasta devine fermă după confirmarea noastră telefonică sau pe email.</p>
      </div>
    </form>

    <aside class="summary-card checkout-summary" data-checkout-summary aria-label="Sumarul comenzii">
      <div class="loading-inline"><span class="spinner"></span> Se încarcă sumarul…</div>
    </aside>
  </div>
</section>`;
  return layout(ctx, { title: 'Finalizare comandă', body, page: 'checkout', noindex: true });
}

/* ------------------------------ Pagina comenzii ------------------------------ */

export function orderPage(ctx, { order, items, events, justPlaced }) {
  const firstName = order.customerName.split(' ')[0];
  const cancelled = order.status === 'anulata';
  const steps = customerSteps(order);
  const currentIndex = steps.indexOf(order.status);
  const payment = paymentMethods.find((p) => p.id === order.paymentMethod);
  const when = `${capitalize(formatDateKey(order.scheduledDate))}, ${formatSlot(order.scheduledSlot)}`;
  const lastEvent = events[events.length - 1];

  const body = html`
<section class="section order-section">
  <div class="container narrow">
    ${breadcrumbs([{ href: '/', label: 'Acasă' }, { label: `Comanda ${order.number}` }])}
    <div class="order-hero${justPlaced ? ' is-new' : ''}">
      ${justPlaced ? html`<div class="order-hero-icon">${icon('check', { size: 34 })}</div>` : ''}
      <p class="eyebrow">Comanda ${order.number}</p>
      <h1>${justPlaced ? html`Mulțumim, ${firstName}! Am primit comanda.` : cancelled ? 'Comanda a fost anulată' : html`Bună, ${firstName}!`}</h1>
      <p class="lead">${justPlaced
        ? html`Ți-am trimis confirmarea pe <strong>${order.customerEmail}</strong>. Te sunăm în curând pentru a confirma detaliile.`
        : cancelled
          ? 'Dacă ai întrebări despre anulare, ne poți contacta oricând.'
          : html`Statusul comenzii: <strong>${statusLabel(order.status, { customer: true, fulfillment: order.fulfillment })}</strong>.`}</p>
    </div>

    ${!cancelled
      ? html`<ol class="progress" aria-label="Stadiul comenzii">
          ${steps.map((s, i) => {
            const state = i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'todo';
            return html`<li class="progress-step is-${state}"${state === 'current' ? html` aria-current="step"` : ''}>
              <span class="progress-dot">${state === 'done' ? icon('check', { size: 14 }) : ''}</span>
              <span class="progress-label">${statusLabel(s, { customer: true, fulfillment: order.fulfillment })}</span>
            </li>`;
          })}
        </ol>`
      : ''}

    <div class="order-grid">
      <div class="card">
        <h2 class="card-title">${icon('calendar', { size: 20 })} ${order.fulfillment === 'livrare' ? 'Livrare' : 'Ridicare'}</h2>
        <p><strong>${when}</strong></p>
        ${order.fulfillment === 'livrare'
          ? html`<p>${order.address}${order.addressDetails ? html`<br>${order.addressDetails}` : ''}</p>`
          : html`<p>${shop.fullName}<br>${shop.address.street}, ${shop.address.region}, ${shop.address.locality}</p>`}
      </div>
      <div class="card">
        <h2 class="card-title">${icon('card', { size: 20 })} Plată</h2>
        <p><strong>${payment?.label || order.paymentMethod}</strong></p>
        <p class="small">${payment?.description || ''}</p>
        ${order.paymentMethod === 'transfer'
          ? html`<p class="small">Beneficiar: ${shop.company.name}<br>IBAN: <span class="mono">${shop.company.iban}</span> (${shop.company.bank})<br>Detalii plată: comanda ${order.number}</p>`
          : ''}
      </div>
    </div>

    <div class="card">
      <h2 class="card-title">${icon('bag', { size: 20 })} Produse</h2>
      <ul class="order-items">
        ${items.map(
          (item) => html`<li>
            <span class="order-item-qty">${item.quantity}×</span>
            <span class="order-item-name">
              <strong>${item.name}</strong>${item.variantLabel ? html`<small>${item.variantLabel}</small>` : ''}
              ${item.custom?.details?.length ? html`<small class="custom-details">${item.custom.details.join(' · ')}</small>` : ''}
            </span>
            <span class="order-item-total">${formatLei(item.lineTotal)}</span>
          </li>`,
        )}
      </ul>
      <dl class="totals">
        <div><dt>Subtotal</dt><dd>${formatLei(order.subtotal)}</dd></div>
        ${order.discount ? html`<div class="is-discount"><dt>Reducere${order.promoCode ? ` (${order.promoCode})` : ''}</dt><dd>−${formatLei(order.discount)}</dd></div>` : ''}
        ${order.fulfillment === 'livrare' ? html`<div><dt>Livrare</dt><dd>${order.deliveryFee ? formatLei(order.deliveryFee) : 'Gratuită'}</dd></div>` : ''}
        <div class="total"><dt>Total</dt><dd>${formatLei(order.total)}</dd></div>
      </dl>
    </div>

    ${order.notes ? html`<div class="card"><h2 class="card-title">${icon('edit', { size: 20 })} Observațiile tale</h2><p class="pre-line">${order.notes}</p></div>` : ''}

    <div class="card card-soft">
      <p>Ai o întrebare despre comandă? Sună-ne la <a href="tel:${shop.phoneHref}"><strong>${shop.phone}</strong></a> sau scrie-ne la <a href="mailto:${shop.email}?subject=Comanda%20${order.number}">${shop.email}</a> și menționează numărul <strong>${order.number}</strong>.</p>
      ${lastEvent ? html`<p class="small muted">Ultima actualizare: ${new Date(lastEvent.createdAt).toLocaleString('ro-RO', { timeZone: 'Europe/Bucharest', dateStyle: 'long', timeStyle: 'short' })}</p>` : ''}
      <p class="small muted">Salvează această pagină: linkul este personal și îți arată oricând stadiul comenzii.</p>
    </div>
    <p class="cluster center"><a class="btn btn-outline" href="/produse">Înapoi la produse</a></p>
  </div>
</section>`;
  return layout(ctx, { title: `Comanda ${order.number}`, body, page: justPlaced ? 'order-placed' : 'order', noindex: true });
}

/* ------------------------------ Urmărire comandă ------------------------------ */

export function trackPage(ctx, { error = '', values = {} } = {}) {
  const body = html`
${pageHero({ title: 'Urmărește comanda', lead: 'Introdu numărul comenzii și telefonul folosit la comandă.', crumbs: [{ href: '/', label: 'Acasă' }, { label: 'Urmărește comanda' }] })}
<section class="section">
  <div class="container narrow">
    <form class="card track-form" method="post" action="/urmareste-comanda">
      ${error ? notice('error', error) : ''}
      <div class="field-grid">
        <div class="field">
          <label for="t-number">Numărul comenzii</label>
          <input class="input" id="t-number" name="number" required placeholder="${shop.orderPrefix}-1001" value="${values.number || ''}" maxlength="20" autocapitalize="characters">
        </div>
        <div class="field">
          <label for="t-phone">Telefon</label>
          <input class="input" id="t-phone" name="phone" type="tel" required placeholder="07xx xxx xxx" value="${values.phone || ''}" maxlength="20" autocomplete="tel">
        </div>
      </div>
      <button class="btn btn-primary" type="submit">${icon('search', { size: 18 })} Caută comanda</button>
      <p class="small muted">Numărul comenzii îl găsești în emailul de confirmare.</p>
    </form>
  </div>
</section>`;
  return layout(ctx, { title: 'Urmărește comanda', body, noindex: true });
}

