/*
 * Validarea și plasarea comenzilor.
 */

import crypto from 'node:crypto';
import { fulfillmentMethods, orderStatuses, paymentMethods } from '../config.js';
import { formatLei, isDateKey } from '../../public/js/shared/format.js';
import { quoteCart } from './pricing.js';
import { buildSchedule, isSlotAvailable } from './schedule.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SLOT_RE = /^\d{2}:\d{2}-\d{2}:\d{2}$/;

/** „+40 712 345 678” → „0712345678”; numerele străine rămân cu prefix +. */
export function normalizePhone(raw) {
  let s = String(raw ?? '').replace(/[\s().\-/]/g, '');
  if (s.startsWith('00')) s = `+${s.slice(2)}`;
  if (/^\+40\d{9}$/.test(s)) s = `0${s.slice(3)}`;
  if (/^0\d{9}$/.test(s)) return s;
  if (/^\+\d{8,15}$/.test(s)) return s;
  return null;
}

export function formatPhone(phone) {
  const p = String(phone || '');
  return /^0\d{9}$/.test(p) ? `${p.slice(0, 4)} ${p.slice(4, 7)} ${p.slice(7)}` : p;
}

const line = (value, max) =>
  String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

const block = (value, max) =>
  String(value ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, max);

export function validateCheckout(input, { settings }) {
  const src = input && typeof input === 'object' ? input : {};
  const errors = {};
  const value = {
    name: line(src.name, 80),
    phone: normalizePhone(src.phone),
    email: line(src.email, 120).toLowerCase(),
    fulfillment: String(src.fulfillment || ''),
    address: line(src.address, 200),
    addressDetails: line(src.addressDetails, 200),
    date: String(src.date || ''),
    slot: String(src.slot || ''),
    paymentMethod: String(src.paymentMethod || ''),
    notes: block(src.notes, 1000),
    promoCode: line(src.promoCode, 40).toUpperCase(),
  };

  if (value.name.length < 3) errors.name = 'Te rugăm să scrii numele și prenumele.';
  if (!value.phone) errors.phone = 'Numărul de telefon nu pare valid (exemplu: 0712 345 678).';
  if (!EMAIL_RE.test(value.email)) errors.email = 'Adresa de email nu pare validă.';
  if (!fulfillmentMethods.some((m) => m.id === value.fulfillment)) {
    errors.fulfillment = 'Alege cum vrei să primești comanda.';
  } else if (value.fulfillment === 'livrare' && !settings.deliveryEnabled) {
    errors.fulfillment = 'Momentan nu facem livrări. Poți ridica comanda din cofetărie.';
  }
  if (value.fulfillment === 'livrare' && value.address.length < 6) errors.address = 'Scrie adresa completă: strada, numărul și localitatea.';
  if (value.fulfillment !== 'livrare') {
    value.address = '';
    value.addressDetails = '';
  }
  if (!isDateKey(value.date)) errors.date = 'Alege data la care vrei comanda.';
  if (!SLOT_RE.test(value.slot)) errors.slot = 'Alege intervalul orar.';
  if (!paymentMethods.some((m) => m.id === value.paymentMethod)) errors.paymentMethod = 'Alege metoda de plată.';
  if (!(src.acceptTerms === true || src.acceptTerms === 'on' || src.acceptTerms === 'true')) {
    errors.acceptTerms = 'Pentru a trimite comanda trebuie să accepți termenii și condițiile.';
  }
  return { errors, value };
}

export function newOrderToken() {
  return crypto.randomBytes(18).toString('base64url');
}

export function tokensMatch(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y);
}

/**
 * Validează tot (date client, coș, program) și salvează comanda.
 * Returnează { status, order } sau { status, error, errors?, quote? }.
 */
export function placeOrder(store, input, { now, settings }) {
  if (!settings.ordersEnabled) return { status: 503, error: settings.ordersPausedMessage };
  if (input?.website) return { status: 400, error: 'Comanda nu a putut fi procesată.' };

  const { errors, value } = validateCheckout(input, { settings });
  const quote = quoteCart(store, { items: input?.items, fulfillment: value.fulfillment, promoCode: value.promoCode }, { now, settings });

  if (!quote.lines.length && !quote.problems.length) return { status: 400, error: 'Coșul tău este gol.' };
  if (quote.problems.length) {
    return { status: 409, error: 'Unele produse din coș nu mai sunt disponibile. Am actualizat coșul: verifică-l și trimite din nou comanda.', quote };
  }
  if (value.promoCode && quote.promo && !quote.promo.ok) errors.promoCode = quote.promo.message;
  if (!errors.fulfillment && !quote.minOrderOk) {
    errors.fulfillment = `Pentru livrare, valoarea minimă a comenzii este ${formatLei(settings.minOrderDelivery)}. Poți alege ridicarea din cofetărie.`;
  }
  if (!errors.date && !errors.slot && !errors.fulfillment) {
    const schedule = buildSchedule({ now, leadTimeHours: quote.leadTimeHours, fulfillment: value.fulfillment, settings });
    if (!isSlotAvailable(schedule, value.date, value.slot)) {
      errors.slot = 'Intervalul ales nu mai este disponibil pentru produsele din coș. Te rugăm să alegi altul.';
    }
  }
  if (Object.keys(errors).length) return { status: 400, error: 'Te rugăm să verifici câmpurile marcate.', errors, quote };

  if (input?.expectedTotal != null && Number(input.expectedTotal) !== quote.total) {
    return { status: 409, error: 'Totalul comenzii s-a actualizat între timp. Verifică sumarul și trimite din nou comanda.', quote };
  }

  const order = store.insertOrder(
    {
      token: newOrderToken(),
      customerName: value.name,
      customerPhone: value.phone,
      customerEmail: value.email,
      fulfillment: value.fulfillment,
      address: value.address,
      addressDetails: value.addressDetails,
      scheduledDate: value.date,
      scheduledSlot: value.slot,
      paymentMethod: value.paymentMethod,
      notes: value.notes,
      subtotal: quote.subtotal,
      discount: quote.discount,
      deliveryFee: quote.deliveryFee,
      total: quote.total,
      promoCode: quote.promo?.ok ? quote.promo.code : null,
    },
    quote.lines.map((l) => ({
      productId: l.productId,
      variantId: l.variantId,
      name: l.name,
      variantLabel: l.variantLabel,
      unitPrice: l.unitPrice,
      quantity: l.qty,
      lineTotal: l.lineTotal,
      custom: l.custom ? { config: l.custom, details: l.details } : null,
    })),
  );
  return { status: 201, order };
}

/** Ce statusuri are sens să urmeze, în funcție de modul de primire. */
export function nextStatuses(order) {
  const all = Object.keys(orderStatuses);
  return all.filter((s) => !(order.fulfillment === 'ridicare' && s === 'in_livrare'));
}

export function statusLabel(status, { customer = false, fulfillment = 'ridicare' } = {}) {
  const def = orderStatuses[status];
  if (!def) return status;
  if (customer && status === 'gata') return fulfillment === 'livrare' ? 'Pregătită pentru livrare' : 'Gata de ridicare';
  if (customer && status === 'finalizata') return fulfillment === 'livrare' ? 'Livrată' : 'Ridicată';
  return customer ? def.customerLabel : def.label;
}

/** Pașii afișați clientului pe pagina comenzii. */
export function customerSteps(order) {
  const steps = ['noua', 'confirmata', 'in_preparare', 'gata'];
  if (order.fulfillment === 'livrare') steps.push('in_livrare');
  steps.push('finalizata');
  return steps;
}
