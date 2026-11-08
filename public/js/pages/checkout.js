/* Finalizarea comenzii: date client, ridicare/livrare, zi și interval, plată, trimitere. */

import * as cart from '../cart-store.js';
import { bindPromo, handleProblems, renderLines, renderPromo, renderTotals } from '../cart-view.js';
import { api, fetchQuote, formatLei, html, icon, raw } from '../ui.js';

const WEEKDAYS = ['dum', 'lun', 'mar', 'mie', 'joi', 'vin', 'sâm'];
const MONTHS = ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function init() {
  const root = document.querySelector('[data-checkout]');
  if (!root) return;
  const form = root.querySelector('[data-checkout-form]');
  const summary = root.querySelector('[data-checkout-summary]');
  const datePicker = form.querySelector('[data-date-picker]');
  const slotPicker = form.querySelector('[data-slot-picker]');
  const slotTitle = form.querySelector('[data-slot-title]');
  const leadNote = form.querySelector('[data-lead-note]');
  const deliveryFields = form.querySelector('[data-delivery-fields]');
  const alertBox = form.querySelector('[data-form-alert]');
  const submitBtn = form.querySelector('[data-submit]');
  const submitLabel = form.querySelector('[data-submit-label]');

  let quote = null;
  let selected = { date: '', slot: '' };
  let submitting = false;
  let seq = 0;

  if (!cart.getCart().items.length) return showEmpty();

  const saved = cart.getSavedCustomer();
  if (saved) {
    for (const key of ['name', 'phone', 'email', 'address', 'addressDetails']) {
      if (saved[key] && form.elements[key]) form.elements[key].value = saved[key];
    }
    form.elements.remember.checked = true;
  }
  const preferred = form.querySelector(`input[name="fulfillment"][value="${cart.getCart().fulfillment}"]`);
  if (preferred && !preferred.disabled) preferred.checked = true;
  toggleDelivery();

  form.addEventListener('change', (event) => {
    const { name, value } = event.target;
    if (name === 'fulfillment') {
      toggleDelivery();
      cart.setFulfillment(value);
    } else if (name === 'date') {
      selected = { date: value, slot: '' };
      renderSlots();
      clearError('date');
    } else if (name === 'slot') {
      selected.slot = value;
      clearError('slot');
    }
    if (name) clearError(name);
  });
  form.addEventListener('input', (event) => {
    if (event.target.name) clearError(event.target.name);
  });
  form.addEventListener('submit', onSubmit);
  bindPromo(summary);
  cart.subscribe(refresh);
  refresh();
  return undefined;

  function showEmpty() {
    root.innerHTML = String(html`<div class="empty-state wide">
      <img src="/img/empty-plate.svg" alt="" width="200" height="150">
      <h2>Coșul tău este gol</h2>
      <p>Adaugă câteva bunătăți în coș, apoi revino aici pentru a finaliza comanda.</p>
      <p class="cluster center"><a class="btn btn-primary" href="/produse">Vezi produsele</a></p>
    </div>`);
  }

  function fulfillment() {
    return form.querySelector('input[name="fulfillment"]:checked')?.value || 'ridicare';
  }

  function toggleDelivery() {
    const delivery = fulfillment() === 'livrare';
    deliveryFields.hidden = !delivery;
    form.elements.address.required = delivery;
  }

  async function refresh() {
    const current = cart.getCart();
    if (!current.items.length) return showEmpty();
    const mySeq = ++seq;
    try {
      const q = await fetchQuote(current, { withSchedule: true, fulfillment: fulfillment() });
      if (mySeq !== seq) return undefined;
      if (handleProblems(q)) return undefined;
      quote = q;
      if (!q.ordersEnabled) {
        showAlert(q.ordersPausedMessage);
        submitBtn.disabled = true;
      }
      renderSummary();
      renderDates();
      renderLeadNote();
      updateSubmitLabel();
    } catch (err) {
      if (mySeq !== seq) return undefined;
      summary.innerHTML = String(html`<div class="notice notice-error" role="alert">${raw(icon('alert', 20))}<div>${err.message}</div></div>`);
    }
    return undefined;
  }

  function renderSummary() {
    summary.innerHTML = String(html`
      <div class="summary-head"><h2 class="summary-title">Comanda ta</h2><a class="link-small" href="/cos">Modifică</a></div>
      ${renderLines(quote, { editable: false, compact: true })}
      ${renderPromo(quote)}
      ${renderTotals(quote)}
      ${quote.fulfillment === 'livrare' && !quote.minOrderOk
        ? html`<p class="notice notice-warning">${raw(icon('alert', 18))}<span>Pentru livrare, comanda minimă este de ${formatLei(quote.minOrderDelivery)}. Poți alege ridicarea din cofetărie.</span></p>`
        : ''}
      ${quote.fulfillment === 'livrare' && quote.deliveryFee && quote.freeDeliveryRemaining > 0
        ? html`<p class="small muted">Mai adaugă ${formatLei(quote.freeDeliveryRemaining)} în coș pentru livrare gratuită.</p>`
        : ''}`);
  }

  function renderLeadNote() {
    const hours = quote.leadTimeHours;
    if (hours >= 48) leadNote.textContent = `Unele produse din coș se pregătesc cu minimum ${Math.round(hours / 24)} zile înainte, așa că îți arătăm doar zilele în care le putem avea gata.`;
    else if (hours >= 24) leadNote.textContent = 'Unele produse din coș se pregătesc cu minimum 24 de ore înainte, așa că îți arătăm doar zilele în care le putem avea gata.';
    else leadNote.textContent = 'Alege ziua și intervalul în care vrei să ridici sau să primești comanda.';
  }

  function renderDates() {
    const days = quote.schedule || [];
    const available = days.filter((d) => d.slots.length);
    if (!available.length) {
      datePicker.innerHTML = String(html`<p class="notice notice-warning">${raw(icon('alert', 18))}<span>Nu mai avem intervale libere în perioada următoare pentru produsele din coș. Te rugăm să ne suni.</span></p>`);
      slotPicker.innerHTML = '';
      slotTitle.hidden = true;
      return;
    }
    if (!available.some((d) => d.date === selected.date)) selected = { date: available[0].date, slot: '' };
    const lastIndex = days.indexOf(available[available.length - 1]);
    const visible = days.slice(0, Math.max(lastIndex + 1, 7));
    datePicker.innerHTML = String(html`${visible.map((d) => {
      const [, m, day] = d.date.split('-').map(Number);
      const disabled = !d.slots.length;
      const note = d.closed ? 'închis' : disabled ? 'indisponibil' : `${d.slots.length} ${d.slots.length === 1 ? 'interval' : 'intervale'}`;
      return html`<label class="date-option${disabled ? ' is-disabled' : ''}">
        <input type="radio" name="date" value="${d.date}"${disabled ? raw(' disabled') : ''}${d.date === selected.date ? raw(' checked') : ''} aria-label="${d.label}${disabled ? ` (${note})` : ''}">
        <span class="date-wd">${WEEKDAYS[d.weekday]}</span>
        <span class="date-day">${day}</span>
        <span class="date-month">${MONTHS[m - 1]}</span>
        <span class="date-note">${note}</span>
      </label>`;
    })}`);
    renderSlots();
    const option = datePicker.querySelector('input:checked')?.closest('.date-option');
    if (option) {
      const left = option.offsetLeft - datePicker.offsetLeft;
      if (left < datePicker.scrollLeft || left + option.offsetWidth > datePicker.scrollLeft + datePicker.clientWidth) {
        datePicker.scrollLeft = Math.max(0, left - 8);
      }
    }
  }

  function renderSlots() {
    const day = quote?.schedule?.find((d) => d.date === selected.date);
    if (!day || !day.slots.length) {
      slotPicker.innerHTML = '';
      slotTitle.hidden = true;
      return;
    }
    if (!day.slots.includes(selected.slot)) selected.slot = '';
    slotTitle.hidden = false;
    slotTitle.textContent = `Intervalul orar — ${day.label}`;
    slotPicker.innerHTML = String(html`${day.slots.map(
      (slot) => html`<label class="slot-option"><input type="radio" name="slot" value="${slot}"${slot === selected.slot ? raw(' checked') : ''}><span>${slot.replace('-', '–')}</span></label>`,
    )}`);
  }

  function updateSubmitLabel() {
    submitLabel.textContent = quote ? `Trimite comanda · ${formatLei(quote.total)}` : 'Trimite comanda';
  }

  function clearError(name) {
    const el = form.querySelector(`[data-error-for="${name}"]`);
    if (el && !el.hidden) {
      el.hidden = true;
      el.textContent = '';
    }
    const input = form.elements[name];
    if (input && input.removeAttribute) input.removeAttribute('aria-invalid');
  }

  function showAlert(message, list = []) {
    alertBox.innerHTML = String(html`${raw(icon('alert', 20))}<div><strong>${message}</strong>${list.length ? html`<ul>${list.map((m) => html`<li>${m}</li>`)}</ul>` : ''}</div>`);
    alertBox.hidden = false;
  }

  function showErrors(errors, message = 'Te rugăm să verifici câmpurile marcate.') {
    let firstInvalid = null;
    for (const [name, text] of Object.entries(errors)) {
      const el = form.querySelector(`[data-error-for="${name}"]`);
      if (el) {
        el.textContent = text;
        el.hidden = false;
      }
      const input = form.elements[name];
      if (input && input.setAttribute) input.setAttribute('aria-invalid', 'true');
      const target = input && input.focus ? input : el?.closest('.form-section')?.querySelector('input:not([disabled])');
      if (!firstInvalid && target) firstInvalid = target;
    }
    showAlert(message, Object.values(errors));
    if (firstInvalid) {
      firstInvalid.focus({ preventScroll: true });
      firstInvalid.closest('.form-section, .field')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      alertBox.focus();
    }
  }

  function clientValidate(p) {
    const errors = {};
    if (p.name.trim().length < 3) errors.name = 'Te rugăm să scrii numele și prenumele.';
    if (p.phone.replace(/\D/g, '').length < 9) errors.phone = 'Numărul de telefon nu pare valid (exemplu: 0712 345 678).';
    if (!EMAIL_RE.test(p.email.trim())) errors.email = 'Adresa de email nu pare validă.';
    if (p.fulfillment === 'livrare' && p.address.trim().length < 6) errors.address = 'Scrie adresa completă: strada, numărul și localitatea.';
    if (!p.date) errors.date = 'Alege data la care vrei comanda.';
    else if (!p.slot) errors.slot = 'Alege intervalul orar.';
    if (!p.paymentMethod) errors.paymentMethod = 'Alege metoda de plată.';
    if (!p.acceptTerms) errors.acceptTerms = 'Pentru a trimite comanda trebuie să accepți termenii și condițiile.';
    return errors;
  }

  async function onSubmit(event) {
    event.preventDefault();
    if (submitting || !quote) return;
    alertBox.hidden = true;
    const fd = new FormData(form);
    const value = (k) => String(fd.get(k) || '');
    const payload = {
      name: value('name'),
      phone: value('phone'),
      email: value('email'),
      fulfillment: value('fulfillment'),
      address: value('address'),
      addressDetails: value('addressDetails'),
      date: selected.date,
      slot: selected.slot,
      paymentMethod: value('paymentMethod'),
      notes: value('notes'),
      acceptTerms: fd.get('acceptTerms') === 'on',
      website: value('website'),
      promoCode: quote.promo?.ok ? quote.promo.code : '',
      items: cart.getCart().items,
      expectedTotal: quote.total,
    };
    const errors = clientValidate(payload);
    if (Object.keys(errors).length) {
      showErrors(errors);
      return;
    }
    submitting = true;
    submitBtn.disabled = true;
    submitLabel.textContent = 'Se trimite comanda…';
    try {
      const res = await api('/api/comenzi', payload);
      if (res.status === 201 && res.data?.url) {
        cart.saveCustomer(
          fd.get('remember')
            ? { name: payload.name, phone: payload.phone, email: payload.email, address: payload.address, addressDetails: payload.addressDetails }
            : null,
        );
        cart.clearCart();
        window.location.assign(res.data.url);
        return;
      }
      if (res.data?.errors) {
        showErrors(res.data.errors, res.data.error);
        if (res.data.errors.slot || res.data.errors.date || res.data.errors.promoCode) await refresh();
      } else {
        showAlert(res.data?.error || 'Comanda nu a putut fi trimisă. Te rugăm să încerci din nou.');
        alertBox.focus();
        if (res.status === 409) {
          if (res.data?.quote) handleProblems(res.data.quote);
          await refresh();
        }
      }
    } catch {
      showAlert('Nu am putut trimite comanda. Verifică conexiunea la internet și încearcă din nou.');
      alertBox.focus();
    }
    submitting = false;
    submitBtn.disabled = false;
    updateSubmitLabel();
  }
}
