import { allergens as ALLERGENS, productTags, shop } from '../config.js';
import { CUSTOM_CAKE, DEFAULT_CUSTOM_CAKE, customCakeVisual, priceCustomCake } from '../../public/js/shared/custom-cake.js';
import { formatLei, plural } from '../../public/js/shared/format.js';
import { renderCustomCakeSvg } from '../../public/js/shared/illustrations.js';
import { cx, html, paragraphs, raw } from '../lib/html.js';
import { hoursSummary } from '../lib/schedule.js';
import { allergenList, badges, breadcrumbs, categoryCard, emptyState, pageHero, productGrid, productImageUrl } from './components.js';
import { icon } from './icons.js';
import { layout } from './layout.js';

export function leadTimeText(hours) {
  if (hours <= 3) return `Gata în aproximativ ${plural(hours, 'oră', 'ore')} — poți comanda și pentru azi.`;
  if (hours < 24) return `Se comandă cu minimum ${plural(hours, 'oră', 'ore')} înainte.`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'Se comandă cu minimum 24 de ore înainte.' : `Se comandă cu minimum ${plural(days, 'zi', 'zile')} înainte.`;
}

const STORAGE = {
  fursecuri: 'A se păstra într-o cutie închisă, la loc uscat și răcoros. Se consumă de preferință în 14 zile.',
  traditionale: 'A se păstra ambalat, la temperatura camerei, ferit de soare. Se consumă de preferință în 5 zile.',
  'macarons-si-mignon': 'A se păstra la frigider (2–6 °C). Scoate-le cu 15 minute înainte de servire, pentru gust și textură perfecte.',
};

function storageText(categorySlug) {
  return STORAGE[categorySlug] || 'A se păstra la frigider (2–6 °C). Recomandăm consumul în cel mult 48 de ore de la ridicare sau livrare.';
}

/* --------------------------------- Acasă --------------------------------- */

export function homePage(ctx, { categories, featured, seasonal }) {
  const { settings } = ctx;
  const heroCake = renderCustomCakeSvg(
    { tiers: 2, color: '#F7C6D0', finish: 'drip', sponge: '#F2CC86', cream: '#FFF4E0', toppings: ['fructe', 'flori'], extras: ['topper'] },
    { uid: 'hero', bg: 'transparent', label: 'Ilustrație: tort pe două etaje cu glazură, fructe și flori' },
  );
  const promoCake = renderCustomCakeSvg(
    { tiers: 3, color: '#D8CCF1', finish: 'fondant', toppings: ['flori'], extras: ['aur'], message: 'Ana & Mihai' },
    { uid: 'promo', bg: 'transparent' },
  );
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Bakery',
    name: shop.fullName,
    description: shop.description,
    url: ctx.siteUrl,
    telephone: shop.phoneHref,
    email: shop.email,
    priceRange: '10–450 lei',
    address: {
      '@type': 'PostalAddress',
      streetAddress: shop.address.street,
      addressLocality: shop.address.locality,
      addressRegion: shop.address.region,
      postalCode: shop.address.postalCode,
      addressCountry: shop.address.country,
    },
    openingHoursSpecification: Object.entries(shop.hours)
      .filter(([, h]) => h)
      .map(([d, h]) => ({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][Number(d)],
        opens: h[0],
        closes: h[1],
      })),
  };

  const body = html`
<section class="hero">
  <div class="container hero-inner">
    <div class="hero-copy">
      <p class="eyebrow">${shop.tagline} · ${shop.city}</p>
      <h1>Dulciuri făcute <em>azi</em>, pentru momentele tale frumoase.</h1>
      <p class="lead">Torturi, prăjituri clasice și deserturi de sezon, preparate zilnic din ingrediente adevărate. Comandă online, apoi ridică din cofetărie sau primește comanda acasă.</p>
      <div class="cluster hero-actions">
        <a class="btn btn-primary btn-large" href="/produse">Vezi produsele ${icon('arrowRight', { size: 18 })}</a>
        <a class="btn btn-outline btn-large" href="/tort-personalizat">${icon('cake', { size: 18 })} Creează-ți tortul</a>
      </div>
      <ul class="hero-points">
        <li>${icon('store', { size: 20 })}<span>Ridicare gratuită din cofetărie</span></li>
        ${settings.deliveryEnabled ? html`<li>${icon('truck', { size: 20 })}<span>Livrare gratuită peste ${formatLei(settings.freeDeliveryOver)}</span></li>` : ''}
        <li>${icon('clock', { size: 20 })}<span>Prăjituri gata în 2 ore</span></li>
      </ul>
    </div>
    <div class="hero-art">
      <div class="hero-blob" aria-hidden="true"></div>
      ${raw(heroCake)}
      <a class="hero-sticker" href="/produse?eticheta=post">
        <span>Ai grijă<br>de post?</span>
        <strong>Vezi dulciurile de post</strong>
      </a>
    </div>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="section-head">
      <div>
        <p class="eyebrow">Meniul nostru</p>
        <h2>Ce poftă ai azi?</h2>
      </div>
      <a class="link-arrow" href="/produse">Toate produsele ${icon('arrowRight', { size: 18 })}</a>
    </div>
    <div class="category-grid">${categories.filter((c) => c.productCount > 0).map(categoryCard)}</div>
  </div>
</section>

<section class="section section-tinted">
  <div class="container">
    <div class="section-head">
      <div>
        <p class="eyebrow">Preferatele clienților</p>
        <h2>Cele mai iubite dulciuri</h2>
      </div>
      <a class="link-arrow" href="/produse?ordine=recomandate">Vezi tot meniul ${icon('arrowRight', { size: 18 })}</a>
    </div>
    ${productGrid(featured)}
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="promo-band">
      <div class="promo-copy">
        <p class="eyebrow">Tort personalizat</p>
        <h2>Tortul visat, exact cum ți-l dorești</h2>
        <p>Alegi mărimea, blatul, crema, umplutura și decorul, iar noi îl pregătim cu grijă pentru ziua cea mare. Vezi prețul pe loc, încă de la configurare.</p>
        <ul class="check-list">
          <li>${icon('check', { size: 18 })} De la 1 kg până la torturi pe trei etaje</li>
          <li>${icon('check', { size: 18 })} Mesaj pe tort, topper și imagine comestibilă</li>
          <li>${icon('check', { size: 18 })} Previzualizare instantanee și preț transparent</li>
        </ul>
        <a class="btn btn-primary btn-large" href="/tort-personalizat">Configurează tortul ${icon('arrowRight', { size: 18 })}</a>
      </div>
      <div class="promo-art">${raw(promoCake)}</div>
    </div>
  </div>
</section>

${seasonal.length
  ? html`<section class="section section-tinted section-season">
  <div class="container">
    <div class="section-head">
      <div>
        <p class="eyebrow">De sezon</p>
        <h2>Pregătiți pentru sărbători</h2>
      </div>
      <a class="link-arrow" href="/produse?eticheta=sezonier">Toate produsele de sezon ${icon('arrowRight', { size: 18 })}</a>
    </div>
    ${productGrid(seasonal.slice(0, 4))}
  </div>
</section>`
  : ''}

<section class="section">
  <div class="container">
    <div class="section-head center">
      <div>
        <p class="eyebrow">Simplu și rapid</p>
        <h2>Cum comanzi</h2>
      </div>
    </div>
    <ol class="steps">
      <li>
        <span class="step-icon">${icon('bag', { size: 26 })}</span>
        <h3>Alegi dulciurile</h3>
        <p>Răsfoiește meniul sau configurează-ți tortul. Prețul îl vezi pe loc, fără surprize.</p>
      </li>
      <li>
        <span class="step-icon">${icon('calendar', { size: 26 })}</span>
        <h3>Alegi ziua și ora</h3>
        <p>Programează ridicarea sau livrarea. Prăjiturile pot fi gata chiar și în aceeași zi.</p>
      </li>
      <li>
        <span class="step-icon">${icon('heart', { size: 26 })}</span>
        <h3>Te bucuri de ele</h3>
        <p>Le ridici proaspete din cofetărie sau ți le aducem acasă, în cutii care le păstrează perfect.</p>
      </li>
    </ol>
  </div>
</section>

<section class="section section-visit">
  <div class="container visit-grid">
    <div class="visit-card">
      <p class="eyebrow">Vino în cofetărie</p>
      <h2>Te așteptăm la o cafea și o prăjitură</h2>
      <ul class="contact-list">
        <li>${icon('pin', { size: 20 })}<span>${shop.address.street}, ${shop.address.region}, ${shop.address.locality}</span></li>
        <li>${icon('phone', { size: 20 })}<a href="tel:${shop.phoneHref}">${shop.phone}</a></li>
        <li>${icon('mail', { size: 20 })}<a href="mailto:${shop.email}">${shop.email}</a></li>
      </ul>
      ${shop.mapUrl ? html`<a class="btn btn-outline" href="${shop.mapUrl}" target="_blank" rel="noopener">${icon('pin', { size: 18 })} Deschide harta</a>` : ''}
    </div>
    <div class="visit-card">
      <h3>${icon('clock', { size: 20 })} Program</h3>
      <dl class="hours hours-large">${hoursSummary().map((h) => html`<div><dt>${h.days}</dt><dd>${h.hours}</dd></div>`)}</dl>
    </div>
    <div class="visit-card">
      <h3>${icon('truck', { size: 20 })} Livrare</h3>
      ${settings.deliveryEnabled
        ? html`<p>${shop.deliveryArea}</p>
          <p><strong>${formatLei(settings.deliveryFee)}</strong> taxa de livrare · <strong>gratuit</strong> peste ${formatLei(settings.freeDeliveryOver)}.</p>`
        : html`<p>Momentan nu facem livrări, dar comenzile pot fi ridicate din cofetărie.</p>`}
      <a class="link-arrow" href="/livrare-si-plata">Detalii despre livrare ${icon('arrowRight', { size: 18 })}</a>
    </div>
  </div>
</section>`;

  return layout(ctx, { title: '', description: shop.description, body, page: 'home', jsonLd, bodyClass: 'page-home' });
}

/* ------------------------------- Catalog ------------------------------- */

const SORTS = [
  { id: 'recomandate', label: 'Recomandate' },
  { id: 'pret-crescator', label: 'Preț crescător' },
  { id: 'pret-descrescator', label: 'Preț descrescător' },
  { id: 'nume', label: 'Nume (A–Z)' },
];
const FILTER_TAGS = ['post', 'fara-gluten', 'nou', 'sezonier', 'popular'];

export function catalogPage(ctx, { categories, category, products, query }) {
  const base = category ? `/produse/${category.slug}` : '/produse';
  const linkWith = (patch) => {
    const params = new URLSearchParams();
    const merged = { q: query.q, ordine: query.sort === 'recomandate' ? '' : query.sort, eticheta: query.tag, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  };
  const catLink = (slug) => {
    const params = new URLSearchParams();
    if (query.q) params.set('q', query.q);
    if (query.tag) params.set('eticheta', query.tag);
    if (query.sort && query.sort !== 'recomandate') params.set('ordine', query.sort);
    const qs = params.toString();
    return `${slug ? `/produse/${slug}` : '/produse'}${qs ? `?${qs}` : ''}`;
  };
  const title = category ? category.name : query.tag ? `Produse: ${productTags[query.tag]?.label.toLowerCase()}` : 'Toate produsele';
  const lead = category ? category.description : 'Torturi, prăjituri, deserturi la pahar, fursecuri și cozonaci, preparate zilnic în laboratorul nostru.';
  const crumbs = [{ href: '/', label: 'Acasă' }, { href: '/produse', label: 'Produse' }];
  if (category) crumbs.push({ href: base, label: category.name });

  const body = html`
${pageHero({ title, lead, crumbs: crumbs.length > 2 ? crumbs : [crumbs[0], { label: 'Produse' }] })}
<section class="section section-catalog">
  <div class="container">
    <form class="catalog-toolbar" method="get" action="${base}" role="search" id="cautare">
      <label class="search-field">
        ${icon('search', { size: 20 })}
        <span class="visually-hidden">Caută produse</span>
        <input type="search" name="q" value="${query.q}" placeholder="Caută: ecler, cozonac, de post…" autocomplete="off" maxlength="60">
      </label>
      ${query.tag ? html`<input type="hidden" name="eticheta" value="${query.tag}">` : ''}
      <label class="sort-field">
        <span>Sortează:</span>
        <select name="ordine" data-autosubmit>
          ${SORTS.map((s) => html`<option value="${s.id}"${s.id === query.sort ? html` selected` : ''}>${s.label}</option>`)}
        </select>
      </label>
      <button class="btn btn-primary" type="submit">Caută</button>
    </form>

    <nav class="chip-row" aria-label="Categorii">
      <a class="chip" href="${catLink('')}"${!category ? html` aria-current="page"` : ''}>Toate</a>
      ${categories.map((c) => html`<a class="chip" href="${catLink(c.slug)}"${category?.slug === c.slug ? html` aria-current="page"` : ''}>${c.name}</a>`)}
    </nav>
    <div class="chip-row chip-row-small" aria-label="Filtre rapide">
      ${FILTER_TAGS.map((t) => {
        const on = query.tag === t;
        return html`<a class="${cx('chip', 'chip-tag', on && 'is-on')}" href="${linkWith({ eticheta: on ? '' : t })}"${on ? html` aria-pressed="true"` : html` aria-pressed="false"`}>${on ? icon('check', { size: 14 }) : ''}${productTags[t].label}</a>`;
      })}
    </div>

    <p class="result-count" role="status">${plural(products.length, 'produs', 'produse')}${query.q ? html` pentru „<strong>${query.q}</strong>”` : ''}</p>
    ${products.length
      ? productGrid(products, { headingLevel: 2 })
      : emptyState({
          title: 'Nu am găsit nimic potrivit',
          text: 'Încearcă alt cuvânt sau renunță la filtre. Pentru ceva cu totul special, poți configura un tort personalizat.',
          action: html`<p class="cluster center"><a class="btn btn-outline" href="/produse">Vezi toate produsele</a><a class="btn btn-primary" href="/tort-personalizat">Tort personalizat</a></p>`,
        })}
  </div>
</section>`;

  return layout(ctx, {
    title,
    description: category ? category.description : 'Toate produsele cofetăriei: torturi, prăjituri, deserturi la pahar, fursecuri și cozonaci.',
    body,
    nav: 'produse',
    page: 'catalog',
    canonical: base,
  });
}

/* ------------------------------- Produs ------------------------------- */

export function productPage(ctx, { product, related }) {
  const { settings } = ctx;
  const variants = product.activeVariants;
  const first = variants[0];
  const image = productImageUrl(product);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.shortDescription,
    image: `${ctx.siteUrl}${image}`,
    category: product.categoryName,
    brand: { '@type': 'Brand', name: shop.fullName },
    offers: variants.map((v) => ({
      '@type': 'Offer',
      name: v.label,
      price: (v.price / 100).toFixed(2),
      priceCurrency: 'RON',
      availability: 'https://schema.org/InStock',
      url: `${ctx.siteUrl}/produs/${product.slug}`,
    })),
  };

  const body = html`
<section class="section product-section">
  <div class="container">
    ${breadcrumbs([
      { href: '/', label: 'Acasă' },
      { href: '/produse', label: 'Produse' },
      { href: `/produse/${product.categorySlug}`, label: product.categoryName },
      { label: product.name },
    ])}
    <div class="product-layout">
      <div class="product-media">
        <img src="${image}" alt="${product.name}" width="800" height="600" fetchpriority="high">
      </div>
      <div class="product-info">
        ${badges(product.tags, { limit: 4 })}
        <h1>${product.name}</h1>
        <p class="lead">${product.shortDescription}</p>
        <form class="buy-box" data-buy-form data-product-name="${product.name}">
          <p class="buy-price"><strong data-price>${formatLei(first.price)}</strong>${variants.length === 1 ? html` <span class="unit">${first.label}</span>` : ''}</p>
          ${variants.length > 1
            ? html`<fieldset class="variant-picker">
                <legend>Alege varianta</legend>
                <div class="variant-options">
                  ${variants.map(
                    (v, i) => html`<label class="variant-option">
                      <input type="radio" name="variant" value="${v.id}" data-price="${v.price}" data-price-label="${formatLei(v.price)}"${i === 0 ? html` checked` : ''}>
                      <span><strong>${v.label}</strong><small>${formatLei(v.price)}</small></span>
                    </label>`,
                  )}
                </div>
              </fieldset>`
            : html`<input type="hidden" name="variant" value="${first.id}">`}
          <div class="buy-row">
            <div class="qty-control" data-qty>
              <button type="button" class="qty-btn" data-qty-step="-1" aria-label="Scade cantitatea">${icon('minus', { size: 18 })}</button>
              <input type="number" name="qty" value="1" min="1" max="50" inputmode="numeric" aria-label="Cantitate">
              <button type="button" class="qty-btn" data-qty-step="1" aria-label="Crește cantitatea">${icon('plus', { size: 18 })}</button>
            </div>
            <button class="btn btn-primary btn-large buy-submit" type="submit">${icon('bag', { size: 20 })} Adaugă în coș</button>
          </div>
          <ul class="buy-notes">
            <li>${icon('clock', { size: 18 })}<span>${leadTimeText(product.leadTimeHours)}</span></li>
            <li>${icon('store', { size: 18 })}<span>Ridicare gratuită din cofetărie, ${shop.address.street}.</span></li>
            ${settings.deliveryEnabled ? html`<li>${icon('truck', { size: 18 })}<span>Livrare ${formatLei(settings.deliveryFee)}, gratuită pentru comenzi de peste ${formatLei(settings.freeDeliveryOver)}.</span></li>` : ''}
          </ul>
        </form>
        <div class="product-details">
          <details open>
            <summary>Descriere</summary>
            <div class="prose">${paragraphs(product.description)}</div>
          </details>
          <details>
            <summary>Ingrediente</summary>
            <div class="prose"><p>${product.ingredients || 'Lista de ingrediente este disponibilă la cerere.'}</p></div>
          </details>
          <details open>
            <summary>Alergeni</summary>
            <div class="prose">
              ${allergenList(product.allergens)}
              <p class="muted small">Toate produsele sunt preparate în același laborator și pot conține urme de: ${Object.values(ALLERGENS).join(', ').toLowerCase()}.</p>
            </div>
          </details>
          <details>
            <summary>Păstrare</summary>
            <div class="prose"><p>${storageText(product.categorySlug)}</p></div>
          </details>
        </div>
      </div>
    </div>
  </div>
</section>
${related.length
  ? html`<section class="section section-tinted">
  <div class="container">
    <div class="section-head">
      <div><p class="eyebrow">Din aceeași categorie</p><h2>Ți-ar mai putea plăcea</h2></div>
      <a class="link-arrow" href="/produse/${product.categorySlug}">${product.categoryName} ${icon('arrowRight', { size: 18 })}</a>
    </div>
    ${productGrid(related)}
  </div>
</section>`
  : ''}`;

  return layout(ctx, {
    title: product.name,
    description: `${product.shortDescription} De la ${formatLei(product.minPrice)}. Comandă online de la ${shop.fullName}.`,
    body,
    nav: 'produse',
    page: 'product',
    image,
    jsonLd,
    canonical: `/produs/${product.slug}`,
  });
}

/* --------------------------- Tort personalizat --------------------------- */

function optionDelta(perKg) {
  return perKg ? `+${formatLei(perKg)}/kg` : 'inclus';
}

export function customCakePage(ctx) {
  const cfg = DEFAULT_CUSTOM_CAKE;
  const price = priceCustomCake(cfg);
  const preview = renderCustomCakeSvg(customCakeVisual(cfg), { uid: 'builder', label: 'Previzualizarea tortului tău' });
  const radio = (name, item, checked, inner) =>
    html`<label class="option-card"><input type="radio" name="${name}" value="${item.id}"${checked ? html` checked` : ''}><span class="option-body">${inner}</span></label>`;
  const check = (name, item, checked, inner) =>
    html`<label class="option-card"><input type="checkbox" name="${name}" value="${item.id}"${checked ? html` checked` : ''}><span class="option-body">${inner}</span></label>`;
  const step = (n, title, hint, content) => html`<fieldset class="builder-step">
    <legend><span class="step-num">${n}</span><span>${title}</span></legend>
    ${hint ? html`<p class="step-hint">${hint}</p>` : ''}
    ${content}
  </fieldset>`;

  const body = html`
<section class="section builder-section" data-builder>
  <div class="container">
    ${breadcrumbs([{ href: '/', label: 'Acasă' }, { label: 'Tort personalizat' }])}
    <div class="builder-layout">
      <div class="builder-preview">
        <div class="preview-card">
          <div class="preview-art" data-preview>${raw(preview)}</div>
          <div class="preview-summary">
            <p class="preview-size" data-summary-size>${CUSTOM_CAKE.sizes.find((s) => s.id === cfg.size).label} · ${CUSTOM_CAKE.sizes.find((s) => s.id === cfg.size).servings}</p>
            <p class="preview-price"><span>Preț estimat</span><strong data-total>${formatLei(price.total)}</strong></p>
            <ul class="price-lines" data-price-lines>${price.lines.map((l) => html`<li><span>${l.label}</span><span>${formatLei(l.amount)}</span></li>`)}</ul>
            <p class="small muted">${icon('clock', { size: 16 })} Se comandă cu minimum 3 zile înainte (5 zile pentru torturile pe trei etaje).</p>
          </div>
        </div>
      </div>

      <form class="builder-form" data-builder-form novalidate>
        <header class="builder-head">
          <p class="eyebrow">Tort personalizat</p>
          <h1>Creează-ți tortul</h1>
          <p class="lead">Alege pas cu pas tot ce-ți dorești. Previzualizarea și prețul se actualizează pe loc, iar înainte de preparare te sunăm să confirmăm detaliile.</p>
        </header>

        ${step(
          1,
          'Ocazia',
          '',
          html`<div class="option-grid option-grid-chips">${CUSTOM_CAKE.occasions.map((o) => radio('occasion', o, o.id === cfg.occasion, html`<strong>${o.label}</strong>`))}</div>`,
        )}
        ${step(
          2,
          'Mărimea',
          'Calculăm cam 120–150 g de tort de persoană.',
          html`<div class="option-grid">${CUSTOM_CAKE.sizes.map((s) =>
            radio('size', s, s.id === cfg.size, html`<strong>${s.label}</strong><small>${s.servings}</small><small class="tier-note">${s.tiers === 1 ? 'un etaj' : s.tiers === 2 ? 'două etaje' : 'trei etaje'}</small>`),
          )}</div>`,
        )}
        ${step(
          3,
          'Blatul',
          '',
          html`<div class="option-grid">${CUSTOM_CAKE.sponges.map((o) =>
            radio('sponge', o, o.id === cfg.sponge, html`<span class="dot" style="--dot:${o.color}"></span><strong>${o.label}</strong><small>${optionDelta(o.perKg)}</small>`),
          )}</div>`,
        )}
        ${step(
          4,
          'Crema',
          '',
          html`<div class="option-grid">${CUSTOM_CAKE.creams.map((o) =>
            radio('cream', o, o.id === cfg.cream, html`<span class="dot" style="--dot:${o.color}"></span><strong>${o.label}</strong><small>${optionDelta(o.perKg)}</small>`),
          )}</div>`,
        )}
        ${step(
          5,
          'Umplutura',
          '',
          html`<div class="option-grid">${CUSTOM_CAKE.fillings.map((o) =>
            radio('filling', o, o.id === cfg.filling, html`${o.color ? html`<span class="dot" style="--dot:${o.color}"></span>` : html`<span class="dot dot-empty"></span>`}<strong>${o.label}</strong><small>${optionDelta(o.perKg)}</small>`),
          )}</div>`,
        )}
        ${step(
          6,
          'Finisajul și culoarea',
          '',
          html`<div class="option-grid">${CUSTOM_CAKE.finishes.map((o) =>
            radio('finish', o, o.id === cfg.finish, html`<strong>${o.label}</strong><small>${o.hint}</small><small class="delta">${optionDelta(o.perKg)}</small>`),
          )}</div>
          <div class="swatches" role="radiogroup" aria-label="Culoarea tortului">
            ${CUSTOM_CAKE.colors.map(
              (c) => html`<label class="swatch" title="${c.label}">
                <input type="radio" name="color" value="${c.id}"${c.id === cfg.color ? html` checked` : ''}>
                <span class="swatch-color" style="--swatch:${c.hex}"></span>
                <span class="swatch-label">${c.label}</span>
              </label>`,
            )}
          </div>`,
        )}
        ${step(
          7,
          'Decorul',
          'Poți alege mai multe.',
          html`<div class="option-grid">${CUSTOM_CAKE.toppings.map((o) =>
            check('toppings', o, cfg.toppings.includes(o.id), html`<strong>${o.label}</strong><small>+${formatLei(o.price)}</small>`),
          )}</div>`,
        )}
        ${step(
          8,
          'Extra',
          '',
          html`<div class="option-grid">${CUSTOM_CAKE.extras.map((o) =>
            check('extras', o, cfg.extras.includes(o.id), html`<strong>${o.label}</strong><small>${o.hint}</small><small class="delta">+${formatLei(o.price)}</small>`),
          )}</div>`,
        )}
        ${step(
          9,
          'Mesaj și detalii',
          '',
          html`<div class="field">
            <label for="cake-message">Mesajul de pe tort <span class="optional">(opțional)</span></label>
            <input class="input" id="cake-message" name="message" maxlength="${CUSTOM_CAKE.messageMaxLength}" placeholder="De exemplu: La mulți ani, Ana!" autocomplete="off">
            <p class="field-hint"><span data-message-count>0</span>/${CUSTOM_CAKE.messageMaxLength} caractere</p>
          </div>
          <div class="field">
            <label for="cake-notes">Alte detalii <span class="optional">(opțional)</span></label>
            <textarea class="input" id="cake-notes" name="notes" rows="3" maxlength="${CUSTOM_CAKE.notesMaxLength}" placeholder="Culori preferate, temă, alergii, inspirație…"></textarea>
          </div>`,
        )}

        <div class="builder-submit">
          <div>
            <p class="small muted">Total estimat</p>
            <p class="builder-total" data-total>${formatLei(price.total)}</p>
          </div>
          <button class="btn btn-primary btn-large" type="submit">${icon('bag', { size: 20 })} Adaugă în coș</button>
        </div>
      </form>
    </div>
  </div>
</section>`;

  return layout(ctx, {
    title: 'Tort personalizat',
    description: 'Configurează-ți online tortul personalizat: mărime, blat, cremă, umplutură, decor și mesaj. Vezi prețul pe loc.',
    body,
    nav: 'tort',
    page: 'custom-cake',
  });
}
