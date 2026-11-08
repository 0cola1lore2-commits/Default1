/*
 * Coșul de cumpărături, păstrat în browser (localStorage).
 * Conține doar identificatori și cantități; prețurile le calculează mereu serverul.
 */

const KEY = 'bezea:cos:v1';
const PREFS_KEY = 'bezea:client:v1';
const MAX_QTY = 50;

const listeners = new Set();
let memory = null;

function empty() {
  return { items: [], promoCode: '', fulfillment: 'ridicare' };
}

function sanitize(data) {
  const cart = empty();
  if (!data || typeof data !== 'object') return cart;
  if (Array.isArray(data.items)) {
    cart.items = data.items
      .filter((i) => i && typeof i === 'object' && typeof i.key === 'string')
      .map((i) => ({
        key: i.key,
        variantId: i.variantId ? Number(i.variantId) : undefined,
        custom: i.custom && typeof i.custom === 'object' ? i.custom : undefined,
        qty: Math.max(1, Math.min(MAX_QTY, Math.floor(Number(i.qty)) || 1)),
      }))
      .slice(0, 40);
  }
  cart.promoCode = typeof data.promoCode === 'string' ? data.promoCode.slice(0, 40) : '';
  cart.fulfillment = data.fulfillment === 'livrare' ? 'livrare' : 'ridicare';
  return cart;
}

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return sanitize(JSON.parse(raw));
    return memory ? sanitize(memory) : empty();
  } catch {
    return memory ? sanitize(memory) : empty();
  }
}

function write(cart) {
  memory = cart;
  try {
    localStorage.setItem(KEY, JSON.stringify(cart));
  } catch {
    /* stocarea poate fi blocată (navigare privată) — păstrăm coșul în memorie */
  }
  emit(cart);
}

function emit(cart) {
  for (const fn of listeners) {
    try {
      fn(cart);
    } catch (err) {
      console.error(err);
    }
  }
}

export function getCart() {
  return read();
}

export function itemCount(cart = read()) {
  return cart.items.reduce((sum, i) => sum + i.qty, 0);
}

export function addProduct(variantId, qty = 1) {
  const cart = read();
  const id = Number(variantId);
  const key = `v${id}`;
  const existing = cart.items.find((i) => i.key === key);
  if (existing) existing.qty = Math.min(MAX_QTY, existing.qty + qty);
  else cart.items.push({ key, variantId: id, qty: Math.min(MAX_QTY, Math.max(1, qty)) });
  write(cart);
  return key;
}

export function addCustom(config, qty = 1) {
  const cart = read();
  const key = `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  cart.items.push({ key, custom: config, qty: Math.max(1, Math.min(3, qty)) });
  write(cart);
  return key;
}

export function setQty(key, qty) {
  const cart = read();
  const item = cart.items.find((i) => i.key === key);
  if (!item) return;
  const n = Math.floor(Number(qty));
  if (!n || n < 1) cart.items = cart.items.filter((i) => i.key !== key);
  else item.qty = Math.min(item.custom ? 3 : MAX_QTY, n);
  write(cart);
}

export function removeItem(key) {
  const cart = read();
  cart.items = cart.items.filter((i) => i.key !== key);
  write(cart);
}

export function removeKeys(keys) {
  if (!keys.length) return;
  const cart = read();
  cart.items = cart.items.filter((i) => !keys.includes(i.key));
  write(cart);
}

export function clearCart() {
  const cart = read();
  write({ ...empty(), fulfillment: cart.fulfillment });
}

export function setPromoCode(code) {
  const cart = read();
  cart.promoCode = String(code || '')
    .trim()
    .toUpperCase()
    .slice(0, 40);
  write(cart);
}

export function setFulfillment(value) {
  const cart = read();
  cart.fulfillment = value === 'livrare' ? 'livrare' : 'ridicare';
  write(cart);
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

window.addEventListener('storage', (event) => {
  if (event.key === KEY) emit(read());
});

/* Datele clientului, salvate doar dacă a bifat „Ține minte datele mele”. */
export function getSavedCustomer() {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY)) || null;
  } catch {
    return null;
  }
}

export function saveCustomer(data) {
  try {
    if (data) localStorage.setItem(PREFS_KEY, JSON.stringify(data));
    else localStorage.removeItem(PREFS_KEY);
  } catch {
    /* ignorăm */
  }
}
