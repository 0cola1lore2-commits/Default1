/* Pagina de produs: alegerea variantei, cantitatea și adăugarea în coș. */

import * as cart from '../cart-store.js';
import { openDrawer } from '../drawer.js';
import { bumpCartBadge } from '../ui.js';

const clamp = (value) => Math.max(1, Math.min(50, Math.floor(Number(value)) || 1));

export function init() {
  const form = document.querySelector('[data-buy-form]');
  if (!form) return;
  const price = form.querySelector('[data-price]');
  const qty = form.elements.qty;

  form.addEventListener('change', (event) => {
    if (event.target.name === 'variant' && event.target.dataset.priceLabel) price.textContent = event.target.dataset.priceLabel;
    if (event.target === qty) qty.value = String(clamp(qty.value));
  });

  form.addEventListener('click', (event) => {
    const step = event.target.closest('[data-qty-step]');
    if (!step) return;
    qty.value = String(clamp(Number(qty.value) + Number(step.dataset.qtyStep)));
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const variant = form.querySelector('input[name="variant"]:checked') || form.querySelector('input[name="variant"]');
    if (!variant) return;
    cart.addProduct(variant.value, clamp(qty.value));
    qty.value = '1';
    bumpCartBadge();
    openDrawer();
  });
}
