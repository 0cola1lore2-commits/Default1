import express from 'express';
import { productTags } from '../config.js';
import { renderProductSvg } from '../../public/js/shared/illustrations.js';
import { escapeHtml } from '../lib/html.js';
import { normalizePhone, tokensMatch } from '../lib/orders.js';
import { rateLimit } from '../lib/security.js';
import { cartPage, checkoutPage, orderPage, trackPage } from '../views/checkout.js';
import { errorPage } from '../views/layout.js';
import { aboutPage, contactPage, deliveryPage, faqPage, privacyPage, termsPage } from '../views/pages.js';
import { catalogPage, customCakePage, homePage, productPage } from '../views/shop.js';

const SORTS = ['recomandate', 'pret-crescator', 'pret-descrescator', 'nume'];

export function send(res, view, status = 200) {
  res.status(status).type('html').send(String(view));
}

const first = (value) => (Array.isArray(value) ? value[0] : value);

export function publicRoutes({ store }) {
  const router = express.Router();
  const notFound = (req, res, opts = {}) => send(res, errorPage(res.locals.ctx, { status: 404, ...opts }), 404);

  router.get('/', (req, res) => {
    const ctx = res.locals.ctx;
    send(
      res,
      homePage(ctx, {
        categories: ctx.categories,
        ...(() => {
          const seasonal = store.listProducts({ tag: 'sezonier' });
          const featured = store.listProducts({ featured: true });
          const regular = featured.filter((p) => !p.tags.includes('sezonier'));
          return { seasonal, featured: (regular.length >= 4 ? regular : featured).slice(0, 8) };
        })(),
      }),
    );
  });

  const catalog = (req, res) => {
    const ctx = res.locals.ctx;
    const slug = req.params.categorie;
    const category = slug ? store.getCategoryBySlug(slug) : null;
    if (slug && !category) return notFound(req, res);
    const q = String(first(req.query.q) ?? '')
      .trim()
      .slice(0, 60);
    const sortParam = first(req.query.ordine);
    const tagParam = first(req.query.eticheta);
    const sort = SORTS.includes(sortParam) ? sortParam : 'recomandate';
    const tag = tagParam && Object.hasOwn(productTags, tagParam) ? tagParam : '';
    const products = store.listProducts({ category: category?.slug, q, tag, sort });
    return send(res, catalogPage(ctx, { categories: ctx.categories, category, products, query: { q, sort, tag } }));
  };
  router.get('/produse', catalog);
  router.get('/produse/:categorie', catalog);

  router.get('/produs/:slug', (req, res) => {
    const product = store.getProductBySlug(req.params.slug);
    if (!product) return notFound(req, res, { title: 'Produsul nu mai este disponibil', text: 'Este posibil ca produsul să fi fost retras sau să fie de sezon. Uită-te prin celelalte bunătăți!' });
    const related = store
      .listProducts({ category: product.categorySlug })
      .filter((p) => p.id !== product.id)
      .slice(0, 4);
    return send(res, productPage(res.locals.ctx, { product, related }));
  });

  router.get('/tort-personalizat', (req, res) => send(res, customCakePage(res.locals.ctx)));
  router.get('/cos', (req, res) => send(res, cartPage(res.locals.ctx)));
  router.get('/finalizare-comanda', (req, res) => send(res, checkoutPage(res.locals.ctx)));

  router.get('/comanda/:number', (req, res) => {
    const order = store.getOrderByNumber(req.params.number);
    if (!order || !tokensMatch(order.token, first(req.query.t))) {
      return notFound(req, res, { title: 'Comanda nu a fost găsită', text: 'Verifică linkul din emailul de confirmare sau caută comanda după număr și telefon, din pagina „Urmărește comanda”.' });
    }
    res.set('Cache-Control', 'no-store');
    return send(
      res,
      orderPage(res.locals.ctx, {
        order,
        items: store.getOrderItems(order.id),
        events: store.getOrderEvents(order.id),
        justPlaced: first(req.query.nou) === '1',
      }),
    );
  });

  router.get('/urmareste-comanda', (req, res) => send(res, trackPage(res.locals.ctx)));
  router.post(
    '/urmareste-comanda',
    rateLimit({
      windowMs: 15 * 60_000,
      max: 20,
      onLimit: (req, res) => send(res, trackPage(res.locals.ctx, { error: 'Prea multe încercări. Te rugăm să revii peste câteva minute.' }), 429),
    }),
    (req, res) => {
      const number = String(req.body?.number || '')
        .trim()
        .toUpperCase()
        .slice(0, 20);
      const phoneRaw = String(req.body?.phone || '').slice(0, 20);
      const order = number ? store.getOrderByNumber(number) : null;
      const phone = normalizePhone(phoneRaw);
      if (!order || !phone || order.customerPhone !== phone) {
        return send(res, trackPage(res.locals.ctx, { error: 'Nu am găsit o comandă cu acest număr și acest telefon. Verifică datele și încearcă din nou.', values: { number, phone: phoneRaw } }), 404);
      }
      return res.redirect(303, `/comanda/${order.number}?t=${order.token}`);
    },
  );

  router.get('/despre-noi', (req, res) => send(res, aboutPage(res.locals.ctx)));
  router.get('/contact', (req, res) => send(res, contactPage(res.locals.ctx)));
  router.get('/livrare-si-plata', (req, res) => send(res, deliveryPage(res.locals.ctx)));
  router.get('/intrebari-frecvente', (req, res) => send(res, faqPage(res.locals.ctx)));
  router.get('/termeni-si-conditii', (req, res) => send(res, termsPage(res.locals.ctx)));
  router.get('/politica-de-confidentialitate', (req, res) => send(res, privacyPage(res.locals.ctx)));

  const svg = (res, markup) =>
    res
      .type('image/svg+xml')
      .set('Cache-Control', 'public, max-age=86400')
      .set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'")
      .send(markup);

  router.get('/ilustratii/categorie/:file', (req, res, next) => {
    const m = /^([a-z0-9-]+)\.svg$/.exec(req.params.file);
    const category = m && store.getCategoryBySlug(m[1]);
    if (!category) return next();
    return svg(res, renderProductSvg(category.visual, { seed: `categorie-${category.slug}`, label: category.name }));
  });

  router.get('/ilustratii/:file', (req, res, next) => {
    const m = /^([a-z0-9-]+)\.svg$/.exec(req.params.file);
    const product = m && store.getProductBySlug(m[1], { includeInactive: true });
    if (!product) return next();
    return svg(res, renderProductSvg(product.visual, { seed: product.slug, label: product.name }));
  });

  router.get('/robots.txt', (req, res) => {
    res.type('text/plain').send(
      ['User-agent: *', 'Disallow: /admin', 'Disallow: /api/', 'Disallow: /cos', 'Disallow: /finalizare-comanda', 'Disallow: /comanda/', '', `Sitemap: ${res.locals.ctx.siteUrl}/sitemap.xml`, ''].join('\n'),
    );
  });

  router.get('/sitemap.xml', (req, res) => {
    const base = res.locals.ctx.siteUrl;
    const pages = ['/', '/produse', '/tort-personalizat', '/livrare-si-plata', '/intrebari-frecvente', '/despre-noi', '/contact', '/termeni-si-conditii', '/politica-de-confidentialitate'];
    const urls = [
      ...pages.map((p) => ({ loc: p })),
      ...res.locals.ctx.categories.map((c) => ({ loc: `/produse/${c.slug}` })),
      ...store.listProducts().map((p) => ({ loc: `/produs/${p.slug}`, lastmod: p.updatedAt.slice(0, 10) })),
    ];
    res
      .type('application/xml')
      .send(
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
          .map((u) => `  <url><loc>${escapeHtml(base + u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`)
          .join('\n')}\n</urlset>\n`,
      );
  });

  return router;
}
