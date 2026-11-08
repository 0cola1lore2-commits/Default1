import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { adminClient, findVariant, postJson, startTestServer } from './helpers.js';

describe('panoul de administrare', () => {
  let srv;
  let admin;
  let orderNumber;

  before(async () => {
    srv = await startTestServer();
    const res = await postJson(srv.base, '/api/comenzi', {
      name: 'Ion Ionescu',
      phone: '0722 111 222',
      email: 'ion@example.com',
      fulfillment: 'ridicare',
      date: '2026-11-10',
      slot: '10:00-11:00',
      paymentMethod: 'card',
      acceptTerms: true,
      items: [{ key: 'a', variantId: findVariant(srv.store, 'tort-diplomat', 1).id, qty: 1 }],
    });
    orderNumber = (await res.json()).number;
    admin = await adminClient(srv.base);
  });
  after(async () => {
    await srv.close();
  });

  test('fără autentificare, paginile redirecționează la login', async () => {
    const res = await fetch(`${srv.base}/admin/comenzi`, { redirect: 'manual' });
    assert.equal(res.status, 303);
    assert.match(res.headers.get('location'), /^\/admin\/autentificare\?next=/);
  });

  test('parola greșită este refuzată', async () => {
    const bad = await adminClient(srv.base, 'gresit');
    assert.equal(bad.status, 401);
    assert.equal(bad.cookie, '');
  });

  test('autentificarea setează un cookie HttpOnly', async () => {
    assert.equal(admin.status, 303);
    assert.match(admin.cookie, /^bezea_admin=/);
    const page = await admin.get('/admin');
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Comenzi noi/);
  });

  test('cererile POST fără token CSRF sunt refuzate', async () => {
    const res = await admin.post('/admin/setari', { announcement: 'x' }, { csrf: false });
    assert.equal(res.status, 403);
  });

  test('schimbarea statusului unei comenzi', async () => {
    const order = srv.store.getOrderByNumber(orderNumber);
    const detail = await admin.get(`/admin/comenzi/${order.id}`);
    assert.match(await detail.text(), /Confirmă comanda/);
    const res = await admin.post(`/admin/comenzi/${order.id}/status`, { status: 'confirmata', note: 'Confirmat telefonic', notify: 'on' });
    assert.equal(res.status, 303);
    assert.equal(srv.store.getOrderById(order.id).status, 'confirmata');
    const events = srv.store.getOrderEvents(order.id);
    assert.equal(events.at(-1).note, 'Confirmat telefonic');
    assert.deepEqual(srv.sent.at(-1), { type: 'status', number: orderNumber, status: 'confirmata' });
    const invalid = await admin.post(`/admin/comenzi/${order.id}/status`, { status: 'inventat' });
    assert.equal(invalid.status, 400);
  });

  test('lista de producție cumulează produsele zilei', async () => {
    const page = await (await admin.get('/admin/productie?data=2026-11-10')).text();
    assert.match(page, /Tort Diplomat/);
    assert.match(page, new RegExp(orderNumber));
  });

  test('exportul CSV conține comenzile', async () => {
    const res = await admin.get('/admin/comenzi.csv');
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /text\/csv/);
    const bytes = Buffer.from(await res.arrayBuffer());
    assert.deepEqual([...bytes.subarray(0, 3)], [0xef, 0xbb, 0xbf], 'BOM pentru Excel');
    const csv = bytes.subarray(3).toString('utf8');
    assert.ok(csv.startsWith('Număr;'));
    assert.match(csv, new RegExp(`${orderNumber};`));
  });

  test('crearea, editarea și ștergerea unui produs', async () => {
    const category = srv.store.listCategories().find((c) => c.slug === 'prajituri');
    const invalid = await admin.post('/admin/produse/nou', { name: 'X', categoryId: String(category.id), leadTimeHours: '2' });
    assert.equal(invalid.status, 400);

    const created = await admin.post('/admin/produse/nou', {
      name: 'Tartă cu lămâie și bezea',
      categoryId: String(category.id),
      shortDescription: 'Cremă de lămâie și bezea italiană.',
      leadTimeHours: '3',
      active: 'on',
      'variants[0][label]': '1 bucată · ~120 g',
      'variants[0][price]': '15,50',
      'variants[0][active]': 'on',
      allergens: 'oua',
    });
    assert.equal(created.status, 303);
    const product = srv.store.getProductBySlug('tarta-cu-lamaie-si-bezea');
    assert.ok(product);
    assert.equal(product.variants[0].price, 1550);
    assert.equal(product.visual.kind, 'eclair');
    assert.deepEqual(product.allergens, ['oua']);

    const updated = await admin.post(`/admin/produse/${product.id}`, {
      name: 'Tartă cu lămâie',
      slug: 'tarta-cu-lamaie',
      categoryId: String(category.id),
      leadTimeHours: '3',
      'variants[0][id]': String(product.variants[0].id),
      'variants[0][label]': '1 bucată',
      'variants[0][price]': '16',
      'variants[0][active]': 'on',
      'variants[1][label]': 'Tartă mare · 8 porții',
      'variants[1][price]': '120',
      'variants[1][active]': 'on',
      visual: '{"kind":"tart","bg":"#FFF1DC"}',
    });
    assert.equal(updated.status, 303);
    const after = srv.store.getProductById(product.id);
    assert.equal(after.slug, 'tarta-cu-lamaie');
    assert.equal(after.active, false);
    assert.equal(after.variants.length, 2);
    assert.equal(after.variants[0].id, product.variants[0].id);
    assert.equal(after.visual.kind, 'tart');

    const badJson = await admin.post(`/admin/produse/${product.id}`, {
      name: 'Tartă cu lămâie',
      categoryId: String(category.id),
      leadTimeHours: '3',
      'variants[0][label]': '1 bucată',
      'variants[0][price]': '16',
      'variants[0][active]': 'on',
      visual: '{nu e json',
    });
    assert.equal(badJson.status, 400);

    const removed = await admin.post(`/admin/produse/${product.id}/sterge`, {});
    assert.equal(removed.status, 303);
    assert.equal(srv.store.getProductById(product.id), null);
  });

  test('încărcarea imaginilor acceptă doar imagini reale', async () => {
    const product = srv.store.getProductBySlug('savarina');
    const csrf = await admin.csrf();
    const png = Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000', 'hex');
    const ok = await fetch(`${srv.base}/admin/produse/${product.id}/imagine`, {
      method: 'POST',
      headers: { cookie: admin.cookie, 'x-csrf-token': csrf, 'content-type': 'image/png' },
      body: png,
    });
    assert.equal(ok.status, 200);
    const { url } = await ok.json();
    assert.match(url, /^\/uploads\/produse\/savarina-[0-9a-f]+\.png$/);
    assert.equal((await fetch(srv.base + url)).status, 200);

    const fake = await fetch(`${srv.base}/admin/produse/${product.id}/imagine`, {
      method: 'POST',
      headers: { cookie: admin.cookie, 'x-csrf-token': csrf, 'content-type': 'image/png' },
      body: Buffer.from('<svg onload="alert(1)"></svg>'),
    });
    assert.equal(fake.status, 415);
  });

  test('setările și codurile promoționale', async () => {
    const bad = await admin.post('/admin/setari', { deliveryFee: 'abc', freeDeliveryOver: '250', minOrderDelivery: '80', closedDates: '' });
    assert.equal(bad.status, 400);
    const ok = await admin.post('/admin/setari', {
      announcement: 'Program special de sărbători',
      ordersEnabled: 'on',
      deliveryEnabled: 'on',
      deliveryFee: '20',
      freeDeliveryOver: '300',
      minOrderDelivery: '100',
      closedDates: '25.12.2026\n2026-12-26\n2020-01-01',
    });
    assert.equal(ok.status, 303);
    const settings = srv.store.getSettings();
    assert.equal(settings.deliveryFee, 2000);
    assert.equal(settings.freeDeliveryOver, 30000);
    assert.deepEqual(settings.closedDates, ['2026-12-25', '2026-12-26']);
    assert.equal(settings.announcement, 'Program special de sărbători');

    const promo = await admin.post('/admin/coduri', { code: 'craciun15', kind: 'percent', value: '15', minSubtotal: '150' });
    assert.equal(promo.status, 303);
    const code = srv.store.findPromo('CRACIUN15');
    assert.equal(code.value, 15);
    assert.equal(code.minSubtotal, 15000);
    const duplicate = await admin.post('/admin/coduri', { code: 'CRACIUN15', kind: 'percent', value: '10' });
    assert.equal(duplicate.status, 400);
    await admin.post(`/admin/coduri/${code.id}/comuta`, {});
    assert.equal(srv.store.findPromo('CRACIUN15').active, false);
  });

  test('ieșirea din cont', async () => {
    const res = await admin.post('/admin/iesire', {});
    assert.equal(res.status, 303);
    assert.match(res.headers.get('set-cookie'), /bezea_admin=;/);
  });
});
