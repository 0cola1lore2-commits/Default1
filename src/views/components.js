import { allergens as ALLERGENS, productTags } from '../config.js';
import { formatLei, plural } from '../../public/js/shared/format.js';
import { cx, html } from '../lib/html.js';
import { icon } from './icons.js';

export function productImageUrl(product) {
  if (product.image) return product.image;
  const v = Buffer.from(String(product.updatedAt || '')).toString('base64url').slice(-8);
  return `/ilustratii/${product.slug}.svg${v ? `?v=${v}` : ''}`;
}

export function badge(tag) {
  const def = productTags[tag];
  if (!def) return '';
  return html`<span class="badge badge-${def.tone}">${def.label}</span>`;
}

export function badges(tags, { limit = 3 } = {}) {
  const list = (tags || []).filter((t) => productTags[t]).slice(0, limit);
  if (!list.length) return '';
  return html`<div class="badges">${list.map(badge)}</div>`;
}

export function priceFrom(product) {
  const multi = product.activeVariants.length > 1 && product.minPrice !== product.maxPrice;
  return html`<span class="price">${multi ? html`<span class="price-from">de la</span> ` : ''}<strong>${formatLei(product.minPrice)}</strong></span>`;
}

export function addButton(product, { className = 'btn btn-primary btn-small', label = 'Adaugă' } = {}) {
  const variants = product.activeVariants;
  if (variants.length === 1) {
    const v = variants[0];
    return html`<button type="button" class="${className}" data-add-to-cart data-variant-id="${v.id}" data-name="${product.name}">
      ${icon('plus', { size: 16 })}<span>${label}</span>
    </button>`;
  }
  return html`<a class="${cx(className.replace('btn-primary', 'btn-outline'))}" href="/produs/${product.slug}">Alege</a>`;
}

export function productCard(product, { headingLevel = 3 } = {}) {
  const single = product.activeVariants.length === 1 ? product.activeVariants[0] : null;
  const title = html`<a href="/produs/${product.slug}">${product.name}</a>`;
  return html`<article class="product-card">
    <a class="product-card-media" href="/produs/${product.slug}" tabindex="-1" aria-hidden="true">
      <img src="${productImageUrl(product)}" alt="" width="400" height="300" loading="lazy" decoding="async">
      ${badges(product.tags, { limit: 2 })}
    </a>
    <div class="product-card-body">
      ${headingLevel === 2 ? html`<h2 class="product-card-title">${title}</h2>` : html`<h3 class="product-card-title">${title}</h3>`}
      <p class="product-card-desc">${product.shortDescription}</p>
      <div class="product-card-foot">
        <p class="product-card-price">${priceFrom(product)}${single ? html`<span class="unit">${single.label}</span>` : html`<span class="unit">${product.activeVariants.length} variante</span>`}</p>
        ${addButton(product)}
      </div>
    </div>
  </article>`;
}

export function productGrid(products, opts) {
  return html`<div class="product-grid">${products.map((p) => productCard(p, opts))}</div>`;
}

export function categoryCard(category) {
  return html`<a class="category-card" href="/produse/${category.slug}">
    <img src="/ilustratii/categorie/${category.slug}.svg" alt="" width="400" height="300" loading="lazy" decoding="async">
    <span class="category-card-body">
      <span class="category-card-name">${category.name}</span>
      <span class="category-card-count">${plural(category.productCount, 'produs', 'produse')}</span>
    </span>
  </a>`;
}

export function breadcrumbs(items) {
  return html`<nav class="breadcrumbs" aria-label="Navigare">
    <ol>
      ${items.map((item, i) =>
        i === items.length - 1 ? html`<li aria-current="page">${item.label}</li>` : html`<li><a href="${item.href}">${item.label}</a></li>`,
      )}
    </ol>
  </nav>`;
}

export function pageHero({ eyebrow, title, lead, crumbs, className = '' }) {
  return html`<header class="${cx('page-hero', className)}">
    <div class="container">
      ${crumbs ? breadcrumbs(crumbs) : ''}
      ${eyebrow ? html`<p class="eyebrow">${eyebrow}</p>` : ''}
      <h1>${title}</h1>
      ${lead ? html`<p class="lead">${lead}</p>` : ''}
    </div>
  </header>`;
}

export function allergenList(keys) {
  if (!keys?.length) return html`<p class="muted">Nu conține niciunul dintre cei 14 alergeni majori declarați. Poate conține urme, fiind preparat în același laborator.</p>`;
  return html`<ul class="allergen-list">${keys.map((k) => html`<li>${ALLERGENS[k] || k}</li>`)}</ul>`;
}

export function notice(type, content, { title = '' } = {}) {
  const iconName = { info: 'info', warning: 'alert', success: 'check', error: 'alert' }[type] || 'info';
  return html`<div class="notice notice-${type}" role="${type === 'error' ? 'alert' : 'status'}">
    ${icon(iconName, { size: 20 })}
    <div>${title ? html`<strong>${title}</strong> ` : ''}${content}</div>
  </div>`;
}

export function emptyState({ title, text, action }) {
  return html`<div class="empty-state">
    <img src="/img/empty-plate.svg" alt="" width="160" height="120">
    <h2>${title}</h2>
    ${text ? html`<p>${text}</p>` : ''}
    ${action || ''}
  </div>`;
}
