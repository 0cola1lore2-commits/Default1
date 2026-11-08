/* Configuratorul de tort personalizat: previzualizare și preț live. */

import * as cart from '../cart-store.js';
import { openDrawer } from '../drawer.js';
import { CUSTOM_CAKE, customCakeVisual, normalizeCustomCake, priceCustomCake } from '../shared/custom-cake.js';
import { renderCustomCakeSvg } from '../shared/illustrations.js';
import { bumpCartBadge, formatLei, html, toast } from '../ui.js';

export function init() {
  const form = document.querySelector('[data-builder-form]');
  if (!form) return;
  const preview = document.querySelector('[data-preview]');
  const totals = document.querySelectorAll('[data-total]');
  const lines = document.querySelector('[data-price-lines]');
  const sizeLabel = document.querySelector('[data-summary-size]');
  const counter = form.querySelector('[data-message-count]');
  let lastSvgKey = '';

  const readConfig = () => {
    const fd = new FormData(form);
    return {
      size: fd.get('size'),
      sponge: fd.get('sponge'),
      cream: fd.get('cream'),
      filling: fd.get('filling'),
      finish: fd.get('finish'),
      color: fd.get('color'),
      occasion: fd.get('occasion'),
      toppings: fd.getAll('toppings'),
      extras: fd.getAll('extras'),
      message: fd.get('message') || '',
      notes: fd.get('notes') || '',
    };
  };

  function update() {
    const parsed = normalizeCustomCake(readConfig());
    if (!parsed.ok) return;
    const cfg = parsed.value;
    const price = priceCustomCake(cfg);
    const visual = customCakeVisual(cfg);
    const key = JSON.stringify(visual);
    if (key !== lastSvgKey) {
      preview.innerHTML = renderCustomCakeSvg(visual, { uid: 'builder', label: 'Previzualizarea tortului tău' });
      lastSvgKey = key;
    }
    for (const el of totals) el.textContent = formatLei(price.total);
    lines.innerHTML = String(html`${price.lines.map((l) => html`<li><span>${l.label}</span><span>${formatLei(l.amount)}</span></li>`)}`);
    const size = CUSTOM_CAKE.sizes.find((s) => s.id === cfg.size);
    sizeLabel.textContent = `${size.label} · ${size.servings}`;
    counter.textContent = String(form.elements.message.value.length);
  }

  form.addEventListener('input', update);
  form.addEventListener('change', update);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const parsed = normalizeCustomCake(readConfig());
    if (!parsed.ok) {
      toast('Te rugăm să alegi câte o opțiune la fiecare pas.', { tone: 'error' });
      return;
    }
    cart.addCustom(parsed.value, 1);
    bumpCartBadge();
    toast('Tortul tău personalizat a fost adăugat în coș.', { actionLabel: 'Vezi coșul', onAction: openDrawer });
    openDrawer();
  });
  update();
}
