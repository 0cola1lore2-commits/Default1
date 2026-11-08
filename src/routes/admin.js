/*
 * Panoul de administrare: comenzi, producție, produse și setări.
 * Toate rutele (cu excepția autentificării) cer sesiune validă; toate cererile POST
 * sunt verificate cu un token CSRF.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { allergens as ALLERGENS, fulfillmentMethods, orderStatuses, paymentMethods, productTags } from '../config.js';
import { categories as seedCategories } from '../data/catalog.js';
import { addDaysToKey, isDateKey } from '../../public/js/shared/format.js';
import { searchable } from '../db.js';
import { rateLimit } from '../lib/security.js';
import { todayKey, zonedToUtc } from '../lib/schedule.js';
import * as views from '../views/admin.js';
import { baseUrl } from './api.js';

const send = (res, view, status = 200) => res.status(status).type('html').send(String(view));
const first = (value) => (Array.isArray(value) ? value[0] : value);

const line = (value, max) =>
  String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

const block = (value, max) =>
  String(value ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f]+/g, ' ')
    .trim()
    .slice(0, max);

/** „145”, „14,50”, „14.50 lei” → bani; null dacă valoarea nu e validă. */
export function parseLei(value) {
  const s = String(value ?? '')
    .trim()
    .replace(/\s|lei/gi, '')
    .replace(',', '.');
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(s)) return null;
  return Math.round(Number(s) * 100);
}

export function slugify(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}

export function parseClosedDates(text) {
  const dates = new Set();
  const bad = [];
  for (const raw of String(text || '').split(/[\n,;]+/)) {
    const t = raw.trim();
    if (!t) continue;
    let key = null;
    let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
    if (m) key = `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
    m = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/.exec(t);
    if (m) key = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    if (key && isDateKey(key)) dates.add(key);
    else bad.push(t);
  }
  return { dates: [...dates].sort(), bad };
}

function csvCell(value) {
  let s = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const money = (bani) => (Number(bani || 0) / 100).toFixed(2).replace('.', ',');

function sniffImage(buf) {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length > 12 && buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp';
  return null;
}

const defaultVisuals = Object.fromEntries(seedCategories.map((c) => [c.slug, c.visual]));

export function adminRoutes({ store, auth, notifier, env, clock, logger = console, uploadsDir }) {
  const router = express.Router();
  const productUploads = path.join(uploadsDir, 'produse');

  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    res.set('X-Robots-Tag', 'noindex, nofollow');
    next();
  });
  router.use(express.urlencoded({ extended: true, limit: '300kb', parameterLimit: 2000 }));

  /* ---------------------------- Autentificare ---------------------------- */

  const safeNext = (value) => {
    const v = String(value || '');
    return v.startsWith('/admin') && !v.startsWith('//') && !v.includes('\\') && !v.startsWith('/admin/autentificare') ? v : '/admin';
  };

  router.get('/autentificare', (req, res) => {
    if (auth.session(req)) return res.redirect(303, '/admin');
    return send(res, views.loginPage(res.locals.ctx, { next: safeNext(first(req.query.next)) }));
  });

  router.post(
    '/autentificare',
    rateLimit({
      windowMs: 15 * 60_000,
      max: 10,
      onLimit: (req, res) => send(res, views.loginPage(res.locals.ctx, { error: 'Prea multe încercări. Așteaptă câteva minute și încearcă din nou.' }), 429),
    }),
    (req, res) => {
      const password = String(req.body?.parola ?? '');
      if (password && auth.checkPassword(password)) {
        auth.login(res);
        return res.redirect(303, safeNext(req.body?.next));
      }
      return send(res, views.loginPage(res.locals.ctx, { error: 'Parola nu este corectă.', next: safeNext(req.body?.next) }), 401);
    },
  );

  router.use((req, res, next) => {
    const session = auth.session(req);
    if (!session) {
      if (req.method === 'GET') return res.redirect(303, `/admin/autentificare?next=${encodeURIComponent(req.originalUrl)}`);
      return res.status(401).type('text/plain').send('Sesiunea a expirat. Autentifică-te din nou.');
    }
    const token = typeof req.body === 'object' && req.body && !Buffer.isBuffer(req.body) ? req.body._csrf : undefined;
    if (req.method === 'POST' && !auth.verifyCsrf(session, token || req.get('x-csrf-token'))) {
      return res.status(403).type('text/plain').send('Cererea nu a putut fi verificată (token CSRF invalid). Reîncarcă pagina și încearcă din nou.');
    }
    res.locals.ctx.admin = { csrf: auth.csrfToken(session), counts: store.countOrdersByStatus() };
    res.locals.ctx.flash = String(first(req.query.mesaj) || '');
    return next();
  });

  router.post('/iesire', (req, res) => {
    auth.logout(res);
    res.redirect(303, '/admin/autentificare');
  });

  /* --------------------------------- Panou --------------------------------- */

  router.get('/', (req, res) => {
    const today = todayKey(clock());
    const tomorrow = addDaysToKey(today, 1);
    const monthStartIso = zonedToUtc(`${today.slice(0, 7)}-01`, '00:00').toISOString();
    const stats = store.dashboard({ today, tomorrow, upTo: addDaysToKey(today, 6), monthStartIso });
    send(res, views.dashboardPage(res.locals.ctx, { stats, today, tomorrow }));
  });

  /* -------------------------------- Comenzi -------------------------------- */

  const readOrderFilters = (query) => {
    const status = first(query.status);
    const from = first(query.from);
    const to = first(query.to);
    return {
      status: status && Object.hasOwn(orderStatuses, status) ? status : '',
      q: line(first(query.q), 80),
      from: isDateKey(from) ? from : '',
      to: isDateKey(to) ? to : '',
    };
  };

  router.get('/comenzi', (req, res) => {
    const filters = readOrderFilters(req.query);
    const page = Math.max(1, Number.parseInt(first(req.query.pagina), 10) || 1);
    const result = store.listOrders({ ...filters, page, perPage: 30 });
    send(res, views.ordersPage(res.locals.ctx, { result, filters, counts: res.locals.ctx.admin.counts }));
  });

  router.get('/comenzi.csv', (req, res) => {
    const filters = readOrderFilters(req.query);
    const orders = store.allOrdersForExport(filters);
    const header = ['Număr', 'Plasată la', 'Status', 'Client', 'Telefon', 'Email', 'Primire', 'Adresă', 'Data programată', 'Interval', 'Plată', 'Subtotal', 'Reducere', 'Livrare', 'Total', 'Cod promoțional', 'Produse', 'Observații client', 'Notă internă'];
    const rows = orders.map((o) => {
      const items = store
        .getOrderItems(o.id)
        .map((i) => `${i.quantity}× ${i.name}${i.variantLabel ? ` (${i.variantLabel})` : ''}`)
        .join('; ');
      return [
        o.number,
        views.formatDateTime(o.createdAt),
        orderStatuses[o.status]?.label || o.status,
        o.customerName,
        o.customerPhone,
        o.customerEmail,
        fulfillmentMethods.find((f) => f.id === o.fulfillment)?.label || o.fulfillment,
        [o.address, o.addressDetails].filter(Boolean).join(', '),
        o.scheduledDate,
        o.scheduledSlot,
        paymentMethods.find((p) => p.id === o.paymentMethod)?.label || o.paymentMethod,
        money(o.subtotal),
        money(o.discount),
        money(o.deliveryFee),
        money(o.total),
        o.promoCode || '',
        items,
        o.notes,
        o.adminNote,
      ];
    });
    const csv = [header, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n');
    res
      .set('Content-Disposition', `attachment; filename="comenzi-${todayKey(clock())}.csv"`)
      .type('text/csv; charset=utf-8')
      .send(`\uFEFF${csv}\r\n`);
  });

  router.get('/comenzi/:id', (req, res) => {
    const order = store.getOrderById(req.params.id);
    if (!order) return send(res, views.adminNotFound(res.locals.ctx, 'Comanda nu există.'), 404);
    return send(
      res,
      views.orderDetailPage(res.locals.ctx, {
        order,
        items: store.getOrderItems(order.id),
        events: store.getOrderEvents(order.id),
        customerUrl: `/comanda/${order.number}?t=${encodeURIComponent(order.token)}`,
        notifyEnabled: notifier.enabled,
      }),
    );
  });

  router.post('/comenzi/:id/status', (req, res) => {
    const order = store.getOrderById(req.params.id);
    if (!order) return send(res, views.adminNotFound(res.locals.ctx, 'Comanda nu există.'), 404);
    const status = String(req.body?.status || '');
    if (!Object.hasOwn(orderStatuses, status)) return res.status(400).type('text/plain').send('Status necunoscut.');
    const note = line(req.body?.note, 300);
    if (status !== order.status || note) {
      const updated = store.updateOrderStatus(order.id, status, note);
      if (status !== order.status && req.body?.notify === 'on') {
        notifier.statusChanged(updated, store.getOrderItems(order.id), baseUrl(req, env)).catch((err) => logger.error('Notificare eșuată:', err));
      }
    }
    return res.redirect(303, `/admin/comenzi/${order.id}?mesaj=status`);
  });

  router.post('/comenzi/:id/nota', (req, res) => {
    const order = store.getOrderById(req.params.id);
    if (!order) return send(res, views.adminNotFound(res.locals.ctx, 'Comanda nu există.'), 404);
    store.setAdminNote(order.id, block(req.body?.note, 2000));
    return res.redirect(303, `/admin/comenzi/${order.id}?mesaj=nota`);
  });

  /* -------------------------------- Producție -------------------------------- */

  router.get('/productie', (req, res) => {
    const today = todayKey(clock());
    const requested = first(req.query.data);
    const date = isDateKey(requested) ? requested : today;
    send(
      res,
      views.productionPage(res.locals.ctx, {
        date,
        today,
        prev: addDaysToKey(date, -1),
        next: addDaysToKey(date, 1),
        data: store.production(date),
      }),
    );
  });

  /* -------------------------------- Produse -------------------------------- */

  router.get('/produse', (req, res) => {
    const categories = store.listCategories();
    const categoryParam = first(req.query.categorie);
    const category = categories.some((c) => c.slug === categoryParam) ? categoryParam : '';
    const q = line(first(req.query.q), 60);
    let products = store.listProducts({ includeInactive: true, category: category || null });
    if (q) products = products.filter((p) => searchable(p.name).includes(searchable(q)));
    send(res, views.productsPage(res.locals.ctx, { products, categories, filters: { q, category } }));
  });

  function readProductForm(body, existingId = 0) {
    const errors = {};
    const list = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]).map(String);
    const categories = store.listCategories();
    const name = line(body.name, 120);
    if (name.length < 2) errors.name = 'Scrie numele produsului.';
    const slug = slugify(line(body.slug, 80) || name);
    if (!slug) errors.slug = 'Adresa produsului nu poate fi goală.';
    else if (store.slugExists(slug, existingId)) errors.slug = 'Există deja un produs cu această adresă. Alege alta.';
    const categoryId = Number(body.categoryId);
    const category = categories.find((c) => c.id === categoryId);
    if (!category) errors.categoryId = 'Alege o categorie.';
    const lead = Number(body.leadTimeHours);
    if (!Number.isInteger(lead) || lead < 0 || lead > 720) errors.leadTimeHours = 'Introdu un număr întreg de ore, între 0 și 720.';

    const rawVariants = body.variants && typeof body.variants === 'object' ? Object.values(body.variants) : [];
    const variants = [];
    for (const v of rawVariants.slice(0, 20)) {
      const label = line(v?.label, 80);
      const priceText = line(v?.price, 20);
      if (!label && !priceText) continue;
      const price = parseLei(priceText);
      if (!label || price == null || price <= 0) errors.variants = 'Fiecare variantă are nevoie de o denumire și de un preț valid (de exemplu 145 sau 14,50).';
      const weight = Math.round(Number(String(v?.weight ?? '').replace(',', '.')));
      variants.push({
        id: Number(v?.id) || null,
        label,
        price: price ?? 0,
        priceText,
        weightGrams: Number.isFinite(weight) && weight > 0 ? weight : null,
        active: v?.active === 'on',
      });
    }
    if (!variants.length) errors.variants = 'Adaugă cel puțin o variantă cu preț.';
    else if (!variants.some((v) => v.active)) errors.variants = 'Cel puțin o variantă trebuie să fie activă.';

    let visual = {};
    const visualText = String(body.visual ?? '').trim();
    if (visualText) {
      try {
        visual = JSON.parse(visualText);
        if (!visual || typeof visual !== 'object' || Array.isArray(visual)) throw new Error('not an object');
      } catch {
        errors.visual = 'Setările ilustrației nu sunt un JSON valid.';
        visual = {};
      }
    }
    if (!visual.kind && category) visual = { ...(defaultVisuals[category.slug] || { kind: 'cake' }), ...visual };

    const sort = Number(body.sort);
    return {
      errors,
      data: {
        id: existingId || undefined,
        slug,
        categoryId,
        name,
        shortDescription: line(body.shortDescription, 200),
        description: block(body.description, 4000),
        ingredients: block(body.ingredients, 2000),
        allergens: list(body.allergens).filter((k) => Object.hasOwn(ALLERGENS, k)),
        tags: list(body.tags).filter((k) => Object.hasOwn(productTags, k)),
        leadTimeHours: Number.isInteger(lead) ? lead : 2,
        visual,
        featured: body.featured === 'on',
        active: body.active === 'on',
        sort: Number.isInteger(sort) ? sort : 0,
        variants,
      },
    };
  }

  const formValues = (data, extra = {}) => ({ ...data, ...extra, variants: data.variants.map((v) => ({ ...v, price: v.priceText })) });

  router.get('/produse/nou', (req, res) => {
    const categories = store.listCategories();
    const product = { active: true, categoryId: categories[0]?.id, leadTimeHours: 2, sort: 0, visual: defaultVisuals[categories[0]?.slug] || {}, variants: [] };
    send(res, views.productFormPage(res.locals.ctx, { product, categories, isNew: true }));
  });

  router.post('/produse/nou', (req, res) => {
    const { data, errors } = readProductForm(req.body || {});
    if (Object.keys(errors).length) {
      return send(res, views.productFormPage(res.locals.ctx, { product: formValues(data), categories: store.listCategories(), errors, isNew: true }), 400);
    }
    const id = store.saveProduct(data);
    return res.redirect(303, `/admin/produse/${id}?mesaj=creat`);
  });

  router.get('/produse/:id', (req, res) => {
    const product = store.getProductById(req.params.id);
    if (!product) return send(res, views.adminNotFound(res.locals.ctx, 'Produsul nu există.'), 404);
    return send(res, views.productFormPage(res.locals.ctx, { product, categories: store.listCategories(), isNew: false }));
  });

  router.post('/produse/:id', (req, res) => {
    const product = store.getProductById(req.params.id);
    if (!product) return send(res, views.adminNotFound(res.locals.ctx, 'Produsul nu există.'), 404);
    const { data, errors } = readProductForm(req.body || {}, product.id);
    if (Object.keys(errors).length) {
      return send(
        res,
        views.productFormPage(res.locals.ctx, { product: formValues(data, { id: product.id, image: product.image, updatedAt: product.updatedAt }), categories: store.listCategories(), errors, isNew: false }),
        400,
      );
    }
    store.saveProduct(data);
    return res.redirect(303, `/admin/produse/${product.id}?mesaj=salvat`);
  });

  const removeUpload = (image) => {
    if (!image || !image.startsWith('/uploads/produse/')) return;
    const file = path.join(productUploads, path.basename(image));
    fs.promises.unlink(file).catch(() => {});
  };

  router.post('/produse/:id/sterge', (req, res) => {
    const product = store.getProductById(req.params.id);
    if (!product) return send(res, views.adminNotFound(res.locals.ctx, 'Produsul nu există.'), 404);
    store.deleteProduct(product.id);
    removeUpload(product.image);
    return res.redirect(303, '/admin/produse?mesaj=sters');
  });

  router.post('/produse/:id/imagine', express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: '8mb' }), async (req, res) => {
    const product = store.getProductById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Produsul nu există.' });
    const buf = req.body;
    if (!Buffer.isBuffer(buf) || !buf.length) return res.status(400).json({ error: 'Nu am primit nicio imagine.' });
    const ext = sniffImage(buf);
    if (!ext) return res.status(415).json({ error: 'Formatul imaginii nu este acceptat. Folosește JPG, PNG sau WebP.' });
    await fs.promises.mkdir(productUploads, { recursive: true });
    const name = `${product.slug}-${crypto.randomBytes(5).toString('hex')}.${ext}`;
    await fs.promises.writeFile(path.join(productUploads, name), buf);
    store.setProductImage(product.id, `/uploads/produse/${name}`);
    removeUpload(product.image);
    return res.json({ ok: true, url: `/uploads/produse/${name}` });
  });

  router.post('/produse/:id/imagine/sterge', (req, res) => {
    const product = store.getProductById(req.params.id);
    if (!product) return send(res, views.adminNotFound(res.locals.ctx, 'Produsul nu există.'), 404);
    store.setProductImage(product.id, null);
    removeUpload(product.image);
    return res.redirect(303, `/admin/produse/${product.id}?mesaj=imagine-stearsa`);
  });

  /* --------------------------------- Setări --------------------------------- */

  router.get('/setari', (req, res) => {
    send(res, views.settingsPage(res.locals.ctx, { settings: store.getSettings(), promos: store.listPromos() }));
  });

  router.post('/setari', (req, res) => {
    const body = req.body || {};
    const errors = {};
    const amount = (key) => {
      const v = parseLei(body[key]);
      if (v == null) errors[key] = 'Introdu o sumă validă (de exemplu 15 sau 12,50).';
      return v ?? 0;
    };
    const current = store.getSettings();
    const { dates, bad } = parseClosedDates(body.closedDates);
    if (bad.length) errors.closedDates = `Nu am înțeles aceste date: ${bad.slice(0, 3).join(', ')}.`;
    const today = todayKey(clock());
    const next = {
      announcement: line(body.announcement, 200),
      ordersEnabled: body.ordersEnabled === 'on',
      ordersPausedMessage: line(body.ordersPausedMessage, 200) || current.ordersPausedMessage,
      deliveryEnabled: body.deliveryEnabled === 'on',
      deliveryFee: amount('deliveryFee'),
      freeDeliveryOver: amount('freeDeliveryOver'),
      minOrderDelivery: amount('minOrderDelivery'),
      closedDates: dates.filter((d) => d >= today),
    };
    if (Object.keys(errors).length) {
      return send(res, views.settingsPage(res.locals.ctx, { settings: { ...next, closedDates: String(body.closedDates || '').split(/\r?\n/) }, promos: store.listPromos(), errors }), 400);
    }
    store.saveSettings(next);
    return res.redirect(303, '/admin/setari?mesaj=salvat');
  });

  router.post('/coduri', (req, res) => {
    const body = req.body || {};
    const errors = {};
    const code = line(body.code, 30).toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9-]{2,29}$/.test(code)) errors.code = 'Codul are 3–30 caractere: litere, cifre și cratimă.';
    else if (store.findPromo(code)) errors.code = 'Acest cod există deja.';
    const kind = body.kind === 'fixed' ? 'fixed' : 'percent';
    let value;
    if (kind === 'percent') {
      value = Number(String(body.value ?? '').replace('%', '').trim());
      if (!Number.isInteger(value) || value < 1 || value > 90) errors.value = 'Procentul trebuie să fie un număr întreg între 1 și 90.';
    } else {
      value = parseLei(body.value);
      if (!value) errors.value = 'Introdu o sumă validă.';
    }
    const minSubtotal = String(body.minSubtotal ?? '').trim() ? parseLei(body.minSubtotal) : 0;
    if (minSubtotal == null) errors.minSubtotal = 'Introdu o sumă validă.';
    const expiresOn = String(body.expiresOn ?? '').trim() || null;
    if (expiresOn && !isDateKey(expiresOn)) errors.expiresOn = 'Data nu este validă.';
    const maxUsesText = String(body.maxUses ?? '').trim();
    const maxUses = maxUsesText ? Number(maxUsesText) : null;
    if (maxUses != null && (!Number.isInteger(maxUses) || maxUses < 1)) errors.maxUses = 'Introdu un număr întreg pozitiv.';
    if (Object.keys(errors).length) {
      return send(
        res,
        views.settingsPage(res.locals.ctx, { settings: store.getSettings(), promos: store.listPromos(), promoErrors: errors, promoValues: { ...body, code } }),
        400,
      );
    }
    store.createPromo({ code, kind, value, minSubtotal, expiresOn, maxUses });
    return res.redirect(303, '/admin/setari?mesaj=cod-creat#coduri');
  });

  router.post('/coduri/:id/comuta', (req, res) => {
    const promo = store.listPromos().find((p) => p.id === Number(req.params.id));
    if (promo) store.setPromoActive(promo.id, !promo.active);
    res.redirect(303, '/admin/setari?mesaj=cod-actualizat');
  });

  router.post('/coduri/:id/sterge', (req, res) => {
    store.deletePromo(req.params.id);
    res.redirect(303, '/admin/setari?mesaj=cod-sters');
  });

  router.use((req, res) => send(res, views.adminNotFound(res.locals.ctx, 'Pagina nu există.'), 404));

  return router;
}
