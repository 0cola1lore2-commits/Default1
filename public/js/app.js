/* Punctul de intrare pentru toate paginile magazinului. */

import * as cart from './cart-store.js';
import { initDrawer, openDrawer } from './drawer.js';
import { bumpCartBadge, toast } from './ui.js';

const badge = document.querySelector('[data-cart-count]');
const cartButton = document.querySelector('[data-cart-open]');

function updateBadge(current = cart.getCart()) {
  const n = cart.itemCount(current);
  if (badge) {
    badge.textContent = n > 99 ? '99+' : String(n);
    badge.hidden = n === 0;
  }
  cartButton?.setAttribute('aria-label', n ? `Deschide coșul (${n} ${n === 1 ? 'produs' : 'produse'})` : 'Deschide coșul');
}

cart.subscribe(updateBadge);
updateBadge();
initDrawer();

// Butoanele „Adaugă” din listele de produse
document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-add-to-cart]');
  if (!button) return;
  cart.addProduct(button.dataset.variantId, 1);
  bumpCartBadge();
  toast(`${button.dataset.name} a fost adăugat în coș.`, { actionLabel: 'Vezi coșul', onAction: openDrawer });
});

// Meniul pe mobil
const toggle = document.querySelector('[data-menu-toggle]');
const nav = document.querySelector('[data-nav]');
function setMenu(open) {
  toggle?.setAttribute('aria-expanded', String(open));
  document.documentElement.classList.toggle('nav-open', open);
}
toggle?.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
nav?.addEventListener('click', (event) => {
  if (event.target.closest('a')) setMenu(false);
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && document.documentElement.classList.contains('nav-open')) {
    setMenu(false);
    toggle?.focus();
  }
});
window.matchMedia('(min-width: 961px)').addEventListener('change', (event) => {
  if (event.matches) setMenu(false);
});

// Selecturi care trimit formularul la schimbare (sortarea din catalog)
for (const el of document.querySelectorAll('[data-autosubmit]')) {
  el.addEventListener('change', () => el.form?.requestSubmit());
}

// Umbră pentru antet la derulare
const header = document.querySelector('[data-header]');
const onScroll = () => header?.classList.toggle('is-scrolled', window.scrollY > 4);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Module specifice paginii
const PAGES = {
  product: () => import('./pages/product.js'),
  cart: () => import('./pages/cart.js'),
  checkout: () => import('./pages/checkout.js'),
  'custom-cake': () => import('./pages/custom-cake.js'),
};
const page = document.body.dataset.page;
if (PAGES[page]) {
  PAGES[page]()
    .then((mod) => mod.init())
    .catch((err) => console.error(err));
}
