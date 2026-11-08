/*
 * Baza de date (SQLite, prin modulul încorporat node:sqlite) și funcțiile de acces.
 */

import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { defaultSettings, shop } from './config.js';
import { categories as seedCategories, products as seedProducts } from './data/catalog.js';

const MIGRATIONS = [
  `
  CREATE TABLE categories (
    id INTEGER PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    visual TEXT NOT NULL DEFAULT '{}',
    sort INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE products (
    id INTEGER PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    category_id INTEGER NOT NULL REFERENCES categories(id),
    name TEXT NOT NULL,
    short_description TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    ingredients TEXT NOT NULL DEFAULT '',
    allergens TEXT NOT NULL DEFAULT '[]',
    tags TEXT NOT NULL DEFAULT '[]',
    lead_time_hours INTEGER NOT NULL DEFAULT 2,
    image TEXT,
    visual TEXT NOT NULL DEFAULT '{}',
    featured INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    sort INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX idx_products_category ON products(category_id);

  CREATE TABLE product_variants (
    id INTEGER PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    price INTEGER NOT NULL CHECK (price >= 0),
    weight_grams INTEGER,
    sort INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1
  );
  CREATE INDEX idx_variants_product ON product_variants(product_id);

  CREATE TABLE orders (
    id INTEGER PRIMARY KEY,
    number TEXT NOT NULL UNIQUE,
    token TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'noua',
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    fulfillment TEXT NOT NULL,
    address TEXT NOT NULL DEFAULT '',
    address_details TEXT NOT NULL DEFAULT '',
    scheduled_date TEXT NOT NULL,
    scheduled_slot TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    subtotal INTEGER NOT NULL,
    discount INTEGER NOT NULL DEFAULT 0,
    delivery_fee INTEGER NOT NULL DEFAULT 0,
    total INTEGER NOT NULL,
    promo_code TEXT,
    admin_note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX idx_orders_status ON orders(status);
  CREATE INDEX idx_orders_scheduled ON orders(scheduled_date);
  CREATE INDEX idx_orders_created ON orders(created_at);

  CREATE TABLE order_items (
    id INTEGER PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER,
    variant_id INTEGER,
    name TEXT NOT NULL,
    variant_label TEXT NOT NULL DEFAULT '',
    unit_price INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    line_total INTEGER NOT NULL,
    custom TEXT
  );
  CREATE INDEX idx_order_items_order ON order_items(order_id);

  CREATE TABLE order_events (
    id INTEGER PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );
  CREATE INDEX idx_order_events_order ON order_events(order_id);

  CREATE TABLE promo_codes (
    id INTEGER PRIMARY KEY,
    code TEXT NOT NULL UNIQUE COLLATE NOCASE,
    kind TEXT NOT NULL CHECK (kind IN ('percent', 'fixed')),
    value INTEGER NOT NULL CHECK (value > 0),
    min_subtotal INTEGER NOT NULL DEFAULT 0,
    expires_on TEXT,
    max_uses INTEGER,
    uses INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  );

  CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  `,
];

export function openDatabase(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  if (file !== ':memory:') db.exec('PRAGMA journal_mode = WAL;');
  migrate(db);
  return db;
}

function migrate(db) {
  const version = db.prepare('PRAGMA user_version').get().user_version;
  for (let i = version; i < MIGRATIONS.length; i++) {
    db.exec('BEGIN');
    try {
      db.exec(MIGRATIONS[i]);
      db.exec(`PRAGMA user_version = ${i + 1}`);
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }
}

export function transaction(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

function parseJson(text, fallback) {
  try {
    const value = JSON.parse(text);
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

/** Normalizare pentru căutare fără diacritice: „Cremșnit” → „cremsnit”. */
export function searchable(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

function mapVariant(row) {
  return {
    id: row.id,
    productId: row.product_id,
    label: row.label,
    price: row.price,
    weightGrams: row.weight_grams,
    sort: row.sort,
    active: !!row.active,
  };
}

function mapProduct(row, variants) {
  const active = variants.filter((v) => v.active);
  const prices = active.map((v) => v.price);
  return {
    id: row.id,
    slug: row.slug,
    categoryId: row.category_id,
    categorySlug: row.category_slug,
    categoryName: row.category_name,
    name: row.name,
    shortDescription: row.short_description,
    description: row.description,
    ingredients: row.ingredients,
    allergens: parseJson(row.allergens, []),
    tags: parseJson(row.tags, []),
    leadTimeHours: row.lead_time_hours,
    image: row.image || null,
    visual: parseJson(row.visual, {}),
    featured: !!row.featured,
    active: !!row.active,
    sort: row.sort,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    variants,
    activeVariants: active,
    minPrice: prices.length ? Math.min(...prices) : 0,
    maxPrice: prices.length ? Math.max(...prices) : 0,
  };
}

function mapOrder(row) {
  if (!row) return null;
  return {
    id: row.id,
    number: row.number,
    token: row.token,
    status: row.status,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email,
    fulfillment: row.fulfillment,
    address: row.address,
    addressDetails: row.address_details,
    scheduledDate: row.scheduled_date,
    scheduledSlot: row.scheduled_slot,
    paymentMethod: row.payment_method,
    notes: row.notes,
    subtotal: row.subtotal,
    discount: row.discount,
    deliveryFee: row.delivery_fee,
    total: row.total,
    promoCode: row.promo_code,
    adminNote: row.admin_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    itemCount: row.item_count ?? undefined,
  };
}

function mapItem(row) {
  return {
    id: row.id,
    orderId: row.order_id,
    productId: row.product_id,
    variantId: row.variant_id,
    name: row.name,
    variantLabel: row.variant_label,
    unitPrice: row.unit_price,
    quantity: row.quantity,
    lineTotal: row.line_total,
    custom: row.custom ? parseJson(row.custom, null) : null,
  };
}

function mapPromo(row) {
  if (!row) return null;
  return {
    id: row.id,
    code: row.code,
    kind: row.kind,
    value: row.value,
    minSubtotal: row.min_subtotal,
    expiresOn: row.expires_on,
    maxUses: row.max_uses,
    uses: row.uses,
    active: !!row.active,
    createdAt: row.created_at,
  };
}

const PRODUCT_SELECT = `
  SELECT p.*, c.slug AS category_slug, c.name AS category_name, c.sort AS category_sort
  FROM products p JOIN categories c ON c.id = p.category_id`;

export function createStore(db, { clock = () => new Date() } = {}) {
  const nowIso = () => clock().toISOString();

  function variantsByProduct() {
    const map = new Map();
    for (const row of db.prepare('SELECT * FROM product_variants ORDER BY sort, id').all()) {
      const list = map.get(row.product_id) || [];
      list.push(mapVariant(row));
      map.set(row.product_id, list);
    }
    return map;
  }

  const store = {
    db,

    /* ---------------------------- Categorii ---------------------------- */
    listCategories() {
      return db
        .prepare(
          `SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.active = 1
             AND EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id = p.id AND v.active = 1)) AS product_count
           FROM categories c ORDER BY c.sort, c.name`,
        )
        .all()
        .map((row) => ({
          id: row.id,
          slug: row.slug,
          name: row.name,
          description: row.description,
          visual: parseJson(row.visual, {}),
          sort: row.sort,
          productCount: row.product_count,
        }));
    },

    getCategoryBySlug(slug) {
      return store.listCategories().find((c) => c.slug === slug) || null;
    },

    /* ----------------------------- Produse ----------------------------- */
    listProducts({ category = null, q = '', tag = null, sort = 'recomandate', includeInactive = false, featured = false } = {}) {
      const vmap = variantsByProduct();
      let list = db
        .prepare(`${PRODUCT_SELECT} ORDER BY c.sort, p.sort, p.name`)
        .all()
        .map((row) => mapProduct(row, vmap.get(row.id) || []));
      if (!includeInactive) list = list.filter((p) => p.active && p.activeVariants.length);
      if (category) list = list.filter((p) => p.categorySlug === category);
      if (tag) list = list.filter((p) => p.tags.includes(tag));
      if (featured) list = list.filter((p) => p.featured);
      const terms = searchable(q).split(/\s+/).filter(Boolean);
      if (terms.length) {
        list = list.filter((p) => {
          const hay = searchable(`${p.name} ${p.shortDescription} ${p.categoryName} ${p.ingredients}`);
          return terms.every((t) => hay.includes(t));
        });
      }
      const byName = (a, b) => a.name.localeCompare(b.name, 'ro');
      if (sort === 'pret-crescator') list.sort((a, b) => a.minPrice - b.minPrice || byName(a, b));
      else if (sort === 'pret-descrescator') list.sort((a, b) => b.minPrice - a.minPrice || byName(a, b));
      else if (sort === 'nume') list.sort(byName);
      return list;
    },

    getProductBySlug(slug, { includeInactive = false } = {}) {
      const row = db.prepare(`${PRODUCT_SELECT} WHERE p.slug = ?`).get(slug);
      if (!row) return null;
      const product = mapProduct(row, db.prepare('SELECT * FROM product_variants WHERE product_id = ? ORDER BY sort, id').all(row.id).map(mapVariant));
      if (!includeInactive && (!product.active || !product.activeVariants.length)) return null;
      return product;
    },

    getProductById(id) {
      const row = db.prepare(`${PRODUCT_SELECT} WHERE p.id = ?`).get(Number(id) || 0);
      if (!row) return null;
      return mapProduct(row, db.prepare('SELECT * FROM product_variants WHERE product_id = ? ORDER BY sort, id').all(row.id).map(mapVariant));
    },

    /** Varianta + produsul ei (folosit la calculul coșului). */
    getVariantWithProduct(variantId) {
      const v = db.prepare('SELECT * FROM product_variants WHERE id = ?').get(Number(variantId) || 0);
      if (!v) return null;
      const product = store.getProductById(v.product_id);
      return product ? { variant: mapVariant(v), product } : null;
    },

    slugExists(slug, exceptId = 0) {
      return !!db.prepare('SELECT 1 FROM products WHERE slug = ? AND id != ?').get(slug, Number(exceptId) || 0);
    },

    /** Creează sau actualizează un produs împreună cu variantele lui. */
    saveProduct(data) {
      return transaction(db, () => {
        const ts = nowIso();
        const params = {
          slug: data.slug,
          category_id: data.categoryId,
          name: data.name,
          short_description: data.shortDescription || '',
          description: data.description || '',
          ingredients: data.ingredients || '',
          allergens: JSON.stringify(data.allergens || []),
          tags: JSON.stringify(data.tags || []),
          lead_time_hours: data.leadTimeHours ?? 2,
          visual: JSON.stringify(data.visual || {}),
          featured: data.featured ? 1 : 0,
          active: data.active ? 1 : 0,
          sort: data.sort ?? 0,
          updated_at: ts,
        };
        let id = data.id;
        if (id) {
          db.prepare(
            `UPDATE products SET slug = :slug, category_id = :category_id, name = :name, short_description = :short_description,
               description = :description, ingredients = :ingredients, allergens = :allergens, tags = :tags,
               lead_time_hours = :lead_time_hours, visual = :visual, featured = :featured, active = :active, sort = :sort,
               updated_at = :updated_at
             WHERE id = :id`,
          ).run({ ...params, id });
        } else {
          id = Number(
            db
              .prepare(
                `INSERT INTO products (slug, category_id, name, short_description, description, ingredients, allergens, tags,
                   lead_time_hours, visual, featured, active, sort, created_at, updated_at)
                 VALUES (:slug, :category_id, :name, :short_description, :description, :ingredients, :allergens, :tags,
                   :lead_time_hours, :visual, :featured, :active, :sort, :created_at, :updated_at)`,
              )
              .run({ ...params, created_at: ts }).lastInsertRowid,
          );
        }
        const existing = new Set(db.prepare('SELECT id FROM product_variants WHERE product_id = ?').all(id).map((r) => r.id));
        const keep = new Set();
        (data.variants || []).forEach((v, index) => {
          const vp = { label: v.label, price: v.price, weight_grams: v.weightGrams ?? null, sort: index, active: v.active === false ? 0 : 1 };
          if (v.id && existing.has(Number(v.id))) {
            db.prepare('UPDATE product_variants SET label = :label, price = :price, weight_grams = :weight_grams, sort = :sort, active = :active WHERE id = :id').run({
              ...vp,
              id: Number(v.id),
            });
            keep.add(Number(v.id));
          } else {
            db.prepare('INSERT INTO product_variants (product_id, label, price, weight_grams, sort, active) VALUES (:product_id, :label, :price, :weight_grams, :sort, :active)').run({
              ...vp,
              product_id: id,
            });
          }
        });
        for (const old of existing) if (!keep.has(old)) db.prepare('DELETE FROM product_variants WHERE id = ?').run(old);
        return id;
      });
    },

    setProductImage(id, image) {
      db.prepare('UPDATE products SET image = ?, updated_at = ? WHERE id = ?').run(image ?? null, nowIso(), Number(id));
    },

    deleteProduct(id) {
      db.prepare('DELETE FROM products WHERE id = ?').run(Number(id));
    },

    /* ----------------------------- Setări ----------------------------- */
    getSettings() {
      const settings = structuredClone(defaultSettings);
      for (const row of db.prepare('SELECT key, value FROM settings').all()) {
        if (Object.hasOwn(settings, row.key)) settings[row.key] = parseJson(row.value, settings[row.key]);
      }
      return settings;
    },

    saveSettings(patch) {
      transaction(db, () => {
        const stmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
        for (const [key, value] of Object.entries(patch)) {
          if (Object.hasOwn(defaultSettings, key)) stmt.run(key, JSON.stringify(value));
        }
      });
    },

    /* ------------------------- Coduri promoționale ------------------------- */
    findPromo(code) {
      const clean = String(code || '').trim();
      if (!clean) return null;
      return mapPromo(db.prepare('SELECT * FROM promo_codes WHERE code = ?').get(clean));
    },

    listPromos() {
      return db.prepare('SELECT * FROM promo_codes ORDER BY active DESC, created_at DESC').all().map(mapPromo);
    },

    createPromo({ code, kind, value, minSubtotal = 0, expiresOn = null, maxUses = null }) {
      db.prepare(
        `INSERT INTO promo_codes (code, kind, value, min_subtotal, expires_on, max_uses, created_at)
         VALUES (:code, :kind, :value, :min_subtotal, :expires_on, :max_uses, :created_at)`,
      ).run({ code, kind, value, min_subtotal: minSubtotal, expires_on: expiresOn, max_uses: maxUses, created_at: nowIso() });
    },

    setPromoActive(id, active) {
      db.prepare('UPDATE promo_codes SET active = ? WHERE id = ?').run(active ? 1 : 0, Number(id));
    },

    deletePromo(id) {
      db.prepare('DELETE FROM promo_codes WHERE id = ?').run(Number(id));
    },

    /* ----------------------------- Comenzi ----------------------------- */
    insertOrder(order, items) {
      return transaction(db, () => {
        const ts = nowIso();
        const temp = `TMP-${order.token}`;
        const id = Number(
          db
            .prepare(
              `INSERT INTO orders (number, token, status, customer_name, customer_phone, customer_email, fulfillment, address,
                 address_details, scheduled_date, scheduled_slot, payment_method, notes, subtotal, discount, delivery_fee, total,
                 promo_code, created_at, updated_at)
               VALUES (:number, :token, 'noua', :customer_name, :customer_phone, :customer_email, :fulfillment, :address,
                 :address_details, :scheduled_date, :scheduled_slot, :payment_method, :notes, :subtotal, :discount, :delivery_fee, :total,
                 :promo_code, :created_at, :updated_at)`,
            )
            .run({
              number: temp,
              token: order.token,
              customer_name: order.customerName,
              customer_phone: order.customerPhone,
              customer_email: order.customerEmail,
              fulfillment: order.fulfillment,
              address: order.address || '',
              address_details: order.addressDetails || '',
              scheduled_date: order.scheduledDate,
              scheduled_slot: order.scheduledSlot,
              payment_method: order.paymentMethod,
              notes: order.notes || '',
              subtotal: order.subtotal,
              discount: order.discount,
              delivery_fee: order.deliveryFee,
              total: order.total,
              promo_code: order.promoCode || null,
              created_at: ts,
              updated_at: ts,
            }).lastInsertRowid,
        );
        const number = `${shop.orderPrefix}-${1000 + id}`;
        db.prepare('UPDATE orders SET number = ? WHERE id = ?').run(number, id);
        const insertItem = db.prepare(
          `INSERT INTO order_items (order_id, product_id, variant_id, name, variant_label, unit_price, quantity, line_total, custom)
           VALUES (:order_id, :product_id, :variant_id, :name, :variant_label, :unit_price, :quantity, :line_total, :custom)`,
        );
        for (const item of items) {
          insertItem.run({
            order_id: id,
            product_id: item.productId ?? null,
            variant_id: item.variantId ?? null,
            name: item.name,
            variant_label: item.variantLabel || '',
            unit_price: item.unitPrice,
            quantity: item.quantity,
            line_total: item.lineTotal,
            custom: item.custom ? JSON.stringify(item.custom) : null,
          });
        }
        db.prepare("INSERT INTO order_events (order_id, status, note, created_at) VALUES (?, 'noua', 'Comandă plasată online', ?)").run(id, ts);
        if (order.promoCode) db.prepare('UPDATE promo_codes SET uses = uses + 1 WHERE code = ?').run(order.promoCode);
        return store.getOrderById(id);
      });
    },

    getOrderById(id) {
      return mapOrder(db.prepare('SELECT * FROM orders WHERE id = ?').get(Number(id) || 0));
    },

    getOrderByNumber(number) {
      return mapOrder(db.prepare('SELECT * FROM orders WHERE number = ?').get(String(number || '').toUpperCase()));
    },

    getOrderItems(orderId) {
      return db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id').all(orderId).map(mapItem);
    },

    getOrderEvents(orderId) {
      return db
        .prepare('SELECT * FROM order_events WHERE order_id = ? ORDER BY id')
        .all(orderId)
        .map((r) => ({ id: r.id, status: r.status, note: r.note, createdAt: r.created_at }));
    },

    listOrders({ status = '', q = '', from = '', to = '', page = 1, perPage = 30 } = {}) {
      const where = [];
      const params = {};
      if (status) {
        where.push('status = :status');
        params.status = status;
      }
      if (from) {
        where.push('scheduled_date >= :from');
        params.from = from;
      }
      if (to) {
        where.push('scheduled_date <= :to');
        params.to = to;
      }
      const term = String(q || '').trim();
      if (term) {
        const digits = term.replace(/\D/g, '');
        where.push(`(number LIKE :q OR customer_name LIKE :q OR customer_email LIKE :q${digits.length >= 4 ? ' OR replace(customer_phone, \'+40\', \'0\') LIKE :digits' : ''})`);
        params.q = `%${term}%`;
        if (digits.length >= 4) params.digits = `%${digits.replace(/^40/, '0')}%`;
      }
      const sqlWhere = where.length ? `WHERE ${where.join(' AND ')}` : '';
      const total = db.prepare(`SELECT COUNT(*) AS n FROM orders ${sqlWhere}`).get(params).n;
      const offset = (Math.max(1, page) - 1) * perPage;
      const rows = db
        .prepare(
          `SELECT o.*, (SELECT COALESCE(SUM(quantity), 0) FROM order_items i WHERE i.order_id = o.id) AS item_count
           FROM orders o ${sqlWhere} ORDER BY o.created_at DESC, o.id DESC LIMIT ${Number(perPage)} OFFSET ${Number(offset)}`,
        )
        .all(params)
        .map(mapOrder);
      return { rows, total, page: Math.max(1, page), perPage, pages: Math.max(1, Math.ceil(total / perPage)) };
    },

    allOrdersForExport({ from = '', to = '' } = {}) {
      const where = [];
      const params = {};
      if (from) {
        where.push('scheduled_date >= :from');
        params.from = from;
      }
      if (to) {
        where.push('scheduled_date <= :to');
        params.to = to;
      }
      return db
        .prepare(`SELECT * FROM orders ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at`)
        .all(params)
        .map(mapOrder);
    },

    updateOrderStatus(id, status, note = '') {
      transaction(db, () => {
        const ts = nowIso();
        db.prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?').run(status, ts, Number(id));
        db.prepare('INSERT INTO order_events (order_id, status, note, created_at) VALUES (?, ?, ?, ?)').run(Number(id), status, note || '', ts);
      });
      return store.getOrderById(id);
    },

    setAdminNote(id, note) {
      db.prepare('UPDATE orders SET admin_note = ?, updated_at = ? WHERE id = ?').run(note || '', nowIso(), Number(id));
    },

    countOrdersByStatus() {
      const out = {};
      for (const row of db.prepare('SELECT status, COUNT(*) AS n FROM orders GROUP BY status').all()) out[row.status] = row.n;
      return out;
    },

    dashboard({ today, tomorrow, upTo, monthStartIso }) {
      const one = (sql, params = {}) => db.prepare(sql).get(params);
      return {
        newCount: one("SELECT COUNT(*) AS n FROM orders WHERE status = 'noua'").n,
        todayCount: one("SELECT COUNT(*) AS n FROM orders WHERE scheduled_date = :d AND status NOT IN ('anulata', 'finalizata')", { d: today }).n,
        tomorrowCount: one("SELECT COUNT(*) AS n FROM orders WHERE scheduled_date = :d AND status NOT IN ('anulata', 'finalizata')", { d: tomorrow }).n,
        month: one("SELECT COUNT(*) AS n, COALESCE(SUM(total), 0) AS revenue FROM orders WHERE created_at >= :s AND status != 'anulata'", { s: monthStartIso }),
        upcoming: db
          .prepare(
            `SELECT o.*, (SELECT COALESCE(SUM(quantity), 0) FROM order_items i WHERE i.order_id = o.id) AS item_count FROM orders o
             WHERE scheduled_date BETWEEN :from AND :to AND status NOT IN ('anulata', 'finalizata')
             ORDER BY scheduled_date, scheduled_slot LIMIT 30`,
          )
          .all({ from: today, to: upTo })
          .map(mapOrder),
        recent: db
          .prepare('SELECT o.*, (SELECT COALESCE(SUM(quantity), 0) FROM order_items i WHERE i.order_id = o.id) AS item_count FROM orders o ORDER BY created_at DESC, id DESC LIMIT 8')
          .all()
          .map(mapOrder),
        topProducts: db
          .prepare(
            `SELECT i.name, SUM(i.quantity) AS qty, SUM(i.line_total) AS revenue FROM order_items i JOIN orders o ON o.id = i.order_id
             WHERE o.created_at >= :s AND o.status != 'anulata' GROUP BY COALESCE(i.product_id, -1), i.name ORDER BY qty DESC LIMIT 5`,
          )
          .all({ s: monthStartIso }),
      };
    },

    /** Lista de producție pentru o zi: produse cumulate + torturi personalizate. */
    production(date) {
      const items = db
        .prepare(
          `SELECT i.product_id, i.variant_id, i.name, i.variant_label, SUM(i.quantity) AS qty
           FROM order_items i JOIN orders o ON o.id = i.order_id
           WHERE o.scheduled_date = ? AND o.status != 'anulata' AND i.custom IS NULL
           GROUP BY i.product_id, i.variant_id, i.name, i.variant_label ORDER BY i.name, i.variant_label`,
        )
        .all(date)
        .map((r) => ({ name: r.name, variantLabel: r.variant_label, quantity: r.qty }));
      const custom = db
        .prepare(
          `SELECT i.*, o.number, o.scheduled_slot, o.customer_name FROM order_items i JOIN orders o ON o.id = i.order_id
           WHERE o.scheduled_date = ? AND o.status != 'anulata' AND i.custom IS NOT NULL ORDER BY o.scheduled_slot`,
        )
        .all(date)
        .map((r) => ({ ...mapItem(r), orderNumber: r.number, slot: r.scheduled_slot, customerName: r.customer_name }));
      const orders = db
        .prepare(
          `SELECT o.*, (SELECT COALESCE(SUM(quantity), 0) FROM order_items i WHERE i.order_id = o.id) AS item_count FROM orders o
           WHERE scheduled_date = ? AND status != 'anulata' ORDER BY scheduled_slot, id`,
        )
        .all(date)
        .map(mapOrder);
      return { items, custom, orders };
    },
  };
  return store;
}

/** Încarcă produsele inițiale dacă baza de date este goală. */
export function seedIfEmpty(store) {
  const { db } = store;
  if (db.prepare('SELECT COUNT(*) AS n FROM categories').get().n > 0) return false;
  transaction(db, () => {
    const ts = new Date().toISOString();
    const catIds = new Map();
    seedCategories.forEach((c, i) => {
      const id = Number(
        db
          .prepare('INSERT INTO categories (slug, name, description, visual, sort) VALUES (?, ?, ?, ?, ?)')
          .run(c.slug, c.name, c.description, JSON.stringify(c.visual || {}), i + 1).lastInsertRowid,
      );
      catIds.set(c.slug, id);
    });
    const insertProduct = db.prepare(
      `INSERT INTO products (slug, category_id, name, short_description, description, ingredients, allergens, tags, lead_time_hours,
         visual, featured, active, sort, created_at, updated_at)
       VALUES (:slug, :category_id, :name, :short_description, :description, :ingredients, :allergens, :tags, :lead_time_hours,
         :visual, :featured, :active, :sort, :ts, :ts)`,
    );
    const insertVariant = db.prepare('INSERT INTO product_variants (product_id, label, price, weight_grams, sort) VALUES (?, ?, ?, ?, ?)');
    seedProducts.forEach((p, i) => {
      const id = Number(
        insertProduct.run({
          slug: p.slug,
          category_id: catIds.get(p.category),
          name: p.name,
          short_description: p.shortDescription,
          description: p.description,
          ingredients: p.ingredients,
          allergens: JSON.stringify(p.allergens),
          tags: JSON.stringify(p.tags),
          lead_time_hours: p.leadTimeHours,
          visual: JSON.stringify(p.visual),
          featured: p.featured ? 1 : 0,
          active: p.active === false ? 0 : 1,
          sort: i + 1,
          ts,
        }).lastInsertRowid,
      );
      p.variants.forEach((v, k) => insertVariant.run(id, v.label, v.price, v.weight ?? null, k));
    });
    db.prepare(
      `INSERT INTO promo_codes (code, kind, value, min_subtotal, expires_on, max_uses, created_at)
       VALUES ('BUNVENIT10', 'percent', 10, 10000, NULL, NULL, ?)`,
    ).run(ts);
  });
  return true;
}
