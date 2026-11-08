import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_CUSTOM_CAKE, customCakeLeadTimeHours, normalizeCustomCake, priceCustomCake } from '../public/js/shared/custom-cake.js';
import { defaultSettings } from '../src/config.js';
import { quoteCart } from '../src/lib/pricing.js';
import { FIXED_NOW, findVariant, memoryStore } from './helpers.js';

const ctx = { now: FIXED_NOW, settings: { ...defaultSettings } };

test('prețul tortului personalizat se calculează pe kilogram plus extra', () => {
  const cfg = normalizeCustomCake({ ...DEFAULT_CUSTOM_CAKE, size: '2kg', sponge: 'ciocolata', cream: 'mascarpone', filling: 'zmeura', finish: 'drip', toppings: ['fructe', 'macarons'], extras: ['topper'] }).value;
  const price = priceCustomCake(cfg);
  // 2 kg × (155 + 0 + 15 + 10 + 10) lei = 380 lei; + 35 + 45 + 45 lei
  assert.equal(price.perKg, 19000);
  assert.equal(price.total, 50500);
  assert.equal(customCakeLeadTimeHours(cfg), 72);
  assert.equal(customCakeLeadTimeHours({ ...cfg, size: '6kg' }), 120);
});

test('configurațiile invalide de tort sunt respinse', () => {
  const bad = normalizeCustomCake({ ...DEFAULT_CUSTOM_CAKE, size: '99kg', toppings: ['diamante'] });
  assert.equal(bad.ok, false);
  assert.deepEqual(bad.errors.sort(), ['size', 'toppings']);
  const long = normalizeCustomCake({ ...DEFAULT_CUSTOM_CAKE, message: 'x'.repeat(100) });
  assert.equal(long.value.message.length, 40);
});

test('coșul folosește prețurile din baza de date, nu din browser', () => {
  const store = memoryStore();
  const savarina = findVariant(store, 'savarina');
  const quote = quoteCart(store, { items: [{ key: 'a', variantId: savarina.id, qty: 3, price: 1 }], fulfillment: 'ridicare' }, ctx);
  assert.equal(quote.subtotal, savarina.price * 3);
  assert.equal(quote.total, savarina.price * 3);
  assert.equal(quote.deliveryFee, 0);
  assert.equal(quote.leadTimeHours, 2);
});

test('produsele duplicate se cumulează, cantitățile sunt limitate', () => {
  const store = memoryStore();
  const ecler = findVariant(store, 'ecler-cu-vanilie');
  const quote = quoteCart(store, { items: [{ key: 'a', variantId: ecler.id, qty: 30 }, { key: 'b', variantId: ecler.id, qty: 30 }, { key: 'c', variantId: ecler.id, qty: -4 }] }, ctx);
  assert.equal(quote.lines.length, 1);
  assert.equal(quote.lines[0].qty, 50);
});

test('produsele inexistente sau ascunse sunt raportate ca probleme', () => {
  const store = memoryStore();
  const pasca = findVariant(store, 'pasca-cu-branza');
  const quote = quoteCart(store, { items: [{ key: 'x', variantId: 999999, qty: 1 }, { key: 'y', variantId: pasca.id, qty: 1 }] }, ctx);
  assert.equal(quote.lines.length, 0);
  assert.deepEqual(quote.problems.map((p) => p.key), ['x', 'y']);
});

test('taxa de livrare, pragul de livrare gratuită și comanda minimă', () => {
  const store = memoryStore();
  const savarina = findVariant(store, 'savarina');
  const small = quoteCart(store, { items: [{ key: 'a', variantId: savarina.id, qty: 2 }], fulfillment: 'livrare' }, ctx);
  assert.equal(small.deliveryFee, defaultSettings.deliveryFee);
  assert.equal(small.minOrderOk, false);
  const big = quoteCart(store, { items: [{ key: 'a', variantId: savarina.id, qty: 20 }], fulfillment: 'livrare' }, ctx);
  assert.equal(big.deliveryFee, 0);
  assert.equal(big.minOrderOk, true);
  assert.equal(big.total, big.subtotal);
});

test('codurile promoționale: procent, prag minim, expirare și limită de utilizări', () => {
  const store = memoryStore();
  const diplomat = findVariant(store, 'tort-diplomat', 0);
  const savarina = findVariant(store, 'savarina');
  const ok = quoteCart(store, { items: [{ key: 'a', variantId: diplomat.id, qty: 1 }], promoCode: 'bunvenit10' }, ctx);
  assert.equal(ok.promo.ok, true);
  assert.equal(ok.discount, Math.round(diplomat.price / 10));
  const tooSmall = quoteCart(store, { items: [{ key: 'a', variantId: savarina.id, qty: 1 }], promoCode: 'BUNVENIT10' }, ctx);
  assert.equal(tooSmall.promo.ok, false);
  assert.equal(tooSmall.discount, 0);

  store.createPromo({ code: 'VECHI', kind: 'fixed', value: 2000, expiresOn: '2026-11-01' });
  const expired = quoteCart(store, { items: [{ key: 'a', variantId: diplomat.id, qty: 1 }], promoCode: 'VECHI' }, ctx);
  assert.equal(expired.promo.ok, false);

  store.createPromo({ code: 'FIX20', kind: 'fixed', value: 2000, maxUses: 1 });
  const fixed = quoteCart(store, { items: [{ key: 'a', variantId: diplomat.id, qty: 1 }], promoCode: 'FIX20' }, ctx);
  assert.equal(fixed.discount, 2000);
  store.db.prepare("UPDATE promo_codes SET uses = 1 WHERE code = 'FIX20'").run();
  const used = quoteCart(store, { items: [{ key: 'a', variantId: diplomat.id, qty: 1 }], promoCode: 'FIX20' }, ctx);
  assert.equal(used.promo.ok, false);

  const unknown = quoteCart(store, { items: [{ key: 'a', variantId: diplomat.id, qty: 1 }], promoCode: 'NUEXISTA' }, ctx);
  assert.equal(unknown.promo.ok, false);
});

test('tortul personalizat din coș are timp de pregătire de 3 zile', () => {
  const store = memoryStore();
  const quote = quoteCart(store, { items: [{ key: 'c1', custom: DEFAULT_CUSTOM_CAKE, qty: 1 }] }, ctx);
  assert.equal(quote.lines[0].type, 'custom');
  assert.equal(quote.leadTimeHours, 72);
  assert.equal(quote.subtotal, priceCustomCake(normalizeCustomCake(DEFAULT_CUSTOM_CAKE).value).total);
});
