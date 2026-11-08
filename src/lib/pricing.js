/*
 * Calculul coșului: prețurile vin mereu din baza de date (nu din browser),
 * plus reduceri, taxa de livrare și timpul minim de pregătire.
 */

import { ordering } from '../config.js';
import { formatLei } from '../../public/js/shared/format.js';
import { CUSTOM_CAKE, customCakeLeadTimeHours, describeCustomCake, normalizeCustomCake, priceCustomCake } from '../../public/js/shared/custom-cake.js';
import { todayKey } from './schedule.js';

export function productImage(product) {
  return product.image || `/ilustratii/${product.slug}.svg`;
}

function clampQty(value, max) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, max);
}

export function evaluatePromo(promo, subtotal, today) {
  if (!promo || !promo.active) return { ok: false, message: 'Codul promoțional nu există sau nu mai este activ.' };
  if (promo.expiresOn && promo.expiresOn < today) return { ok: false, message: 'Codul promoțional a expirat.' };
  if (promo.maxUses != null && promo.uses >= promo.maxUses) return { ok: false, message: 'Codul promoțional a atins numărul maxim de utilizări.' };
  if (subtotal < promo.minSubtotal) return { ok: false, message: `Codul este valabil pentru comenzi de minimum ${formatLei(promo.minSubtotal)}.` };
  const discount = promo.kind === 'percent' ? Math.round((subtotal * Math.min(100, promo.value)) / 100) : Math.min(promo.value, subtotal);
  const message = promo.kind === 'percent' ? `Reducere de ${promo.value}% aplicată.` : `Reducere de ${formatLei(promo.value)} aplicată.`;
  return { ok: true, discount, message };
}

/**
 * @param {ReturnType<import('../db.js').createStore>} store
 * @param {{ items?: any[], fulfillment?: string, promoCode?: string }} input
 * @param {{ now: Date, settings: object }} ctx
 */
export function quoteCart(store, input, { now, settings }) {
  const rawItems = Array.isArray(input?.items) ? input.items.slice(0, ordering.maxLines) : [];
  const fulfillment = input?.fulfillment === 'livrare' ? 'livrare' : 'ridicare';
  const lines = [];
  const problems = [];
  const byVariant = new Map();

  for (const raw of rawItems) {
    if (!raw || typeof raw !== 'object') continue;
    const key = String(raw.key ?? '').slice(0, 40);
    if (raw.custom) {
      const parsed = normalizeCustomCake(raw.custom);
      if (!parsed.ok) {
        problems.push({ key, message: 'Configurația unui tort personalizat nu mai este validă și a fost eliminată din coș.' });
        continue;
      }
      const qty = clampQty(raw.qty, CUSTOM_CAKE.maxQuantity);
      const price = priceCustomCake(parsed.value);
      const desc = describeCustomCake(parsed.value);
      lines.push({
        key,
        type: 'custom',
        productId: null,
        variantId: null,
        slug: null,
        name: desc.title,
        variantLabel: '',
        details: desc.details,
        unitPrice: price.total,
        qty,
        lineTotal: price.total * qty,
        leadTimeHours: customCakeLeadTimeHours(parsed.value),
        custom: parsed.value,
        image: null,
        url: '/tort-personalizat',
      });
      continue;
    }
    const found = store.getVariantWithProduct(raw.variantId);
    if (!found || !found.variant.active || !found.product.active) {
      problems.push({ key, message: 'Un produs din coș nu mai este disponibil și a fost eliminat.' });
      continue;
    }
    const { variant, product } = found;
    const existing = byVariant.get(variant.id);
    if (existing) {
      existing.qty = Math.min(existing.qty + clampQty(raw.qty, ordering.maxQuantityPerLine), ordering.maxQuantityPerLine);
      existing.lineTotal = existing.unitPrice * existing.qty;
      continue;
    }
    const qty = clampQty(raw.qty, ordering.maxQuantityPerLine);
    const line = {
      key,
      type: 'product',
      productId: product.id,
      variantId: variant.id,
      slug: product.slug,
      name: product.name,
      variantLabel: variant.label,
      details: [],
      unitPrice: variant.price,
      qty,
      lineTotal: variant.price * qty,
      leadTimeHours: product.leadTimeHours,
      custom: null,
      image: productImage(product),
      url: `/produs/${product.slug}`,
    };
    byVariant.set(variant.id, line);
    lines.push(line);
  }

  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const itemCount = lines.reduce((sum, l) => sum + l.qty, 0);
  let discount = 0;
  let promo = null;
  const code = String(input?.promoCode ?? '')
    .trim()
    .toUpperCase()
    .slice(0, 40);
  if (code) {
    const found = store.findPromo(code);
    const result = evaluatePromo(found, subtotal, todayKey(now));
    promo = { code: found?.code || code, ok: result.ok, message: result.message };
    if (result.ok) discount = result.discount;
  }

  const afterDiscount = subtotal - discount;
  const deliveryAvailable = !!settings.deliveryEnabled;
  let deliveryFee = 0;
  if (fulfillment === 'livrare' && afterDiscount < settings.freeDeliveryOver) deliveryFee = settings.deliveryFee;

  return {
    lines,
    problems,
    itemCount,
    fulfillment,
    subtotal,
    discount,
    deliveryFee,
    total: afterDiscount + deliveryFee,
    promo,
    leadTimeHours: lines.reduce((max, l) => Math.max(max, l.leadTimeHours), 0),
    deliveryAvailable,
    minOrderDelivery: settings.minOrderDelivery,
    minOrderOk: fulfillment !== 'livrare' || afterDiscount >= settings.minOrderDelivery,
    freeDeliveryOver: settings.freeDeliveryOver,
    freeDeliveryRemaining: Math.max(0, settings.freeDeliveryOver - afterDiscount),
    deliveryFeeSetting: settings.deliveryFee,
  };
}
