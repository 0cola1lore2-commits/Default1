import { shop } from '../config.js';
import { formatLei } from '../../public/js/shared/format.js';
import { cx, html, jsonForScript } from '../lib/html.js';
import { hoursSummary } from '../lib/schedule.js';
import { icon } from './icons.js';

const NAV = [
  { href: '/produse', label: 'Produse', key: 'produse' },
  { href: '/tort-personalizat', label: 'Tort personalizat', key: 'tort' },
  { href: '/livrare-si-plata', label: 'Livrare și plată', key: 'livrare' },
  { href: '/despre-noi', label: 'Despre noi', key: 'despre' },
  { href: '/contact', label: 'Contact', key: 'contact' },
];

export function layout(ctx, { title, description, body, nav = '', page = '', canonical = '', image = '', jsonLd = null, noindex = false, bodyClass = '' }) {
  const fullTitle = title ? `${title} · ${shop.fullName}` : `${shop.fullName} — ${shop.tagline}`;
  const desc = description || shop.description;
  const url = `${ctx.siteUrl}${canonical || ctx.path}`;
  const ogImage = image ? `${ctx.siteUrl}${image}` : `${ctx.siteUrl}/img/og-image.jpg`;
  const { settings } = ctx;
  const announcement = settings.ordersEnabled ? settings.announcement : settings.ordersPausedMessage;

  return html`<!doctype html>
<html lang="ro">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${fullTitle}</title>
<meta name="description" content="${desc}">
${noindex ? html`<meta name="robots" content="noindex">` : html`<link rel="canonical" href="${url}">`}
<meta property="og:type" content="website">
<meta property="og:locale" content="ro_RO">
<meta property="og:site_name" content="${shop.fullName}">
<meta property="og:title" content="${title || shop.fullName}">
<meta property="og:description" content="${desc}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${ogImage}">
<meta name="theme-color" content="#fff9f4">
<link rel="icon" href="/img/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/fonts/fraunces-latin-soft-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/nunito-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${ctx.asset('/css/style.css')}">
${jsonLd ? html`<script type="application/ld+json">${jsonForScript(jsonLd)}</script>` : ''}
</head>
<body class="${cx(bodyClass)}"${page ? html` data-page="${page}"` : ''}>
<a class="skip-link" href="#continut">Sari la conținut</a>
${announcement ? html`<div class="announcement${settings.ordersEnabled ? '' : ' announcement-warning'}"><div class="container">${icon(settings.ordersEnabled ? 'sparkle' : 'info', { size: 16 })}<p>${announcement}</p></div></div>` : ''}
<header class="site-header" data-header>
  <div class="container header-inner">
    <a class="brand" href="/" aria-label="${shop.fullName} — prima pagină">
      <img class="brand-mark" src="/img/logo.svg" alt="" width="44" height="44">
      <span class="brand-text"><span class="brand-name">${shop.name}</span><span class="brand-tag">${shop.tagline}</span></span>
    </a>
    <nav class="main-nav" id="meniu-principal" aria-label="Meniu principal" data-nav>
      <ul>
        ${NAV.map((item) => html`<li><a href="${item.href}"${nav === item.key ? html` aria-current="page"` : ''}>${item.label}</a></li>`)}
        <li class="nav-extra"><a href="/urmareste-comanda">Urmărește comanda</a></li>
        <li class="nav-extra"><a href="tel:${shop.phoneHref}">${icon('phone', { size: 16 })} ${shop.phone}</a></li>
      </ul>
    </nav>
    <div class="header-actions">
      <a class="icon-button" href="/produse#cautare" aria-label="Caută produse">${icon('search', { size: 22 })}</a>
      <button class="icon-button cart-button" type="button" data-cart-open aria-label="Deschide coșul" aria-haspopup="dialog">
        ${icon('bag', { size: 22 })}<span class="cart-count" data-cart-count hidden>0</span>
      </button>
      <button class="icon-button menu-toggle" type="button" aria-label="Meniu" aria-expanded="false" aria-controls="meniu-principal" data-menu-toggle>${icon('menu', { size: 24 })}</button>
    </div>
  </div>
</header>
<main id="continut" tabindex="-1">
${body}
</main>
${footer(ctx)}
<div class="drawer-backdrop" data-drawer-backdrop hidden></div>
<aside class="drawer" id="cos-rapid" role="dialog" aria-modal="true" aria-labelledby="drawer-title" data-cart-drawer hidden>
  <div class="drawer-head">
    <h2 id="drawer-title">Coșul tău</h2>
    <button type="button" class="icon-button" data-cart-close aria-label="Închide coșul">${icon('close', { size: 22 })}</button>
  </div>
  <div class="drawer-body" data-drawer-body aria-live="polite"></div>
  <div class="drawer-foot" data-drawer-foot></div>
</aside>
<div class="toast-region" data-toasts aria-live="polite" aria-atomic="false"></div>
<noscript><div class="noscript-bar">Pentru a adăuga produse în coș și a plasa comenzi, te rugăm să activezi JavaScript.</div></noscript>
<script type="module" src="${ctx.asset('/js/app.js')}"></script>
</body>
</html>`;
}

function footer(ctx) {
  const year = new Date().getFullYear();
  const hours = hoursSummary();
  const { settings } = ctx;
  return html`<footer class="site-footer">
  <div class="container footer-grid">
    <div class="footer-brand">
      <a class="brand brand-footer" href="/">
        <img class="brand-mark" src="/img/logo.svg" alt="" width="44" height="44">
        <span class="brand-text"><span class="brand-name">${shop.name}</span><span class="brand-tag">${shop.tagline}</span></span>
      </a>
      <p>${shop.description}</p>
      ${shop.social.instagram || shop.social.facebook
        ? html`<p class="social">
            ${shop.social.instagram ? html`<a href="${shop.social.instagram}" rel="noopener" target="_blank">${icon('instagram', { size: 20 })} Instagram</a>` : ''}
            ${shop.social.facebook ? html`<a href="${shop.social.facebook}" rel="noopener" target="_blank">${icon('facebook', { size: 20 })} Facebook</a>` : ''}
          </p>`
        : ''}
    </div>
    <div>
      <h2 class="footer-title">Magazin</h2>
      <ul class="footer-links">
        <li><a href="/produse">Toate produsele</a></li>
        ${ctx.categories.map((c) => html`<li><a href="/produse/${c.slug}">${c.name}</a></li>`)}
        <li><a href="/tort-personalizat">Tort personalizat</a></li>
      </ul>
    </div>
    <div>
      <h2 class="footer-title">Informații</h2>
      <ul class="footer-links">
        <li><a href="/livrare-si-plata">Livrare și plată</a></li>
        <li><a href="/intrebari-frecvente">Întrebări frecvente</a></li>
        <li><a href="/urmareste-comanda">Urmărește comanda</a></li>
        <li><a href="/despre-noi">Despre noi</a></li>
        <li><a href="/contact">Contact</a></li>
      </ul>
    </div>
    <div>
      <h2 class="footer-title">Ne găsești</h2>
      <ul class="footer-contact">
        <li>${icon('pin', { size: 18 })}<span>${shop.address.street}, ${shop.address.region}, ${shop.address.locality}</span></li>
        <li>${icon('phone', { size: 18 })}<a href="tel:${shop.phoneHref}">${shop.phone}</a></li>
        <li>${icon('mail', { size: 18 })}<a href="mailto:${shop.email}">${shop.email}</a></li>
      </ul>
      <dl class="hours">
        ${hours.map((h) => html`<div><dt>${h.days}</dt><dd>${h.hours}</dd></div>`)}
      </dl>
    </div>
  </div>
  <div class="footer-bottom-wrap"><div class="container footer-bottom">
    <p>© ${year} ${shop.company.name} · CUI ${shop.company.cui} · ${shop.company.regCom}. Prețurile includ TVA.${settings.deliveryEnabled ? ` Livrare gratuită peste ${formatLei(settings.freeDeliveryOver)}.` : ''}</p>
    <ul class="legal-links">
      <li><a href="/termeni-si-conditii">Termeni și condiții</a></li>
      <li><a href="/politica-de-confidentialitate">Confidențialitate</a></li>
      <li><a href="https://anpc.ro/" rel="noopener" target="_blank">ANPC</a></li>
      <li><a href="https://anpc.ro/ce-este-sal/" rel="noopener" target="_blank">Soluționarea alternativă a litigiilor</a></li>
    </ul>
  </div></div>
</footer>`;
}

/** Pagină simplă pentru erori (404, 500, comenzi indisponibile). */
export function errorPage(ctx, { status = 404, title, text }) {
  return layout(ctx, {
    title: title || 'Pagina nu a fost găsită',
    noindex: true,
    body: html`<section class="section error-page">
      <div class="container narrow center">
        <img src="/img/empty-plate.svg" alt="" width="200" height="150">
        <p class="eyebrow">Eroare ${status}</p>
        <h1>${title || 'Ups! Pagina asta s-a mâncat.'}</h1>
        <p class="lead">${text || 'Nu am găsit pagina căutată. Poate te tentează totuși ceva dulce?'}</p>
        <p class="cluster center"><a class="btn btn-primary" href="/produse">Vezi produsele</a><a class="btn btn-outline" href="/">Prima pagină</a></p>
      </div>
    </section>`,
  });
}

