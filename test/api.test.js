import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { DEFAULT_CUSTOM_CAKE } from '../public/js/shared/custom-cake.js';
import { findVariant, postJson, startTestServer } from './helpers.js';

describe('magazinul public', () => {
  let srv;
  before(async () => {
    srv = await startTestServer();
  });
  after(async () => {
    await srv.close();
  });

  test('paginile principale se încarcă', async () => {
    const pages = ['/', '/produse', '/produse/torturi', '/produse?q=cremsnit', '/produs/savarina', '/tort-personalizat', '/cos', '/finalizare-comanda', '/livrare-si-plata', '/intrebari-frecvente', '/termeni-si-conditii', '/politica-de-confidentialitate', '/contact', '/despre-noi', '/urmareste-comanda'];
    for (const p of pages) {
      const res = await fetch(srv.base + p);
      assert.equal(res.status, 200, p);
      assert.match(res.headers.get('content-security-policy'), /default-src 'self'/);
      const body = await res.text();
      assert.match(body, /<html lang="ro">/);
    }
  });

  test('căutarea ignoră diacriticele', async () => {
    const body = await (await fetch(`${srv.base}/produse?q=cremsnit`)).text();
    assert.match(body, /Cremșnit/);
    assert.match(body, /1 produs/);
  });

  test('produsele ascunse și paginile inexistente întorc 404', async () => {
    assert.equal((await fetch(`${srv.base}/produs/pasca-cu-branza`)).status, 404);
    assert.equal((await fetch(`${srv.base}/produse/nu-exista`)).status, 404);
    assert.equal((await fetch(`${srv.base}/nu-exista`)).status, 404);
    assert.equal((await fetch(`${srv.base}/api/nu-exista`)).status, 404);
  });

  test('ilustrațiile, sitemap-ul și robots.txt', async () => {
    const svg = await fetch(`${srv.base}/ilustratii/savarina.svg`);
    assert.equal(svg.status, 200);
    assert.match(svg.headers.get('content-type'), /image\/svg\+xml/);
    assert.match(await svg.text(), /^<svg/);
    const sitemap = await (await fetch(`${srv.base}/sitemap.xml`)).text();
    assert.match(sitemap, /\/produs\/tort-diplomat/);
    assert.doesNotMatch(sitemap, /pasca-cu-branza/);
    const robots = await (await fetch(`${srv.base}/robots.txt`)).text();
    assert.match(robots, /Disallow: \/admin/);
  });

  test('API-ul de coș întoarce totalurile și programul', async () => {
    const savarina = findVariant(srv.store, 'savarina');
    const res = await postJson(srv.base, '/api/cos', { items: [{ key: 'a', variantId: savarina.id, qty: 2 }], withSchedule: true });
    assert.equal(res.status, 200);
    const quote = await res.json();
    assert.equal(quote.subtotal, savarina.price * 2);
    assert.equal(quote.schedule.length, 30);
    assert.equal(quote.schedule[0].slots[0], '12:00-13:00');
  });

  const validOrder = (srv, extra = {}) => ({
    name: 'Ana Popescu',
    phone: '+40 712 345 678',
    email: 'Ana@Example.com',
    fulfillment: 'ridicare',
    date: '2026-11-09',
    slot: '12:00-13:00',
    paymentMethod: 'numerar',
    acceptTerms: true,
    items: [{ key: 'a', variantId: findVariant(srv.store, 'savarina').id, qty: 2 }],
    ...extra,
  });

  test('comanda cu date lipsă este respinsă cu erori pe câmpuri', async () => {
    const res = await postJson(srv.base, '/api/comenzi', validOrder(srv, { name: 'A', phone: '123', email: 'nu-e-email', acceptTerms: false, slot: '' }));
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.deepEqual(Object.keys(data.errors).sort(), ['acceptTerms', 'email', 'name', 'phone', 'slot']);
  });

  test('intervalul trebuie să respecte timpul de pregătire', async () => {
    const res = await postJson(srv.base, '/api/comenzi', validOrder(srv, { slot: '10:00-11:00' }));
    assert.equal(res.status, 400);
    assert.ok((await res.json()).errors.slot);
  });

  test('livrarea cere adresă și comandă minimă', async () => {
    const res = await postJson(srv.base, '/api/comenzi', validOrder(srv, { fulfillment: 'livrare', slot: '12:00-14:00' }));
    assert.equal(res.status, 400);
    const { errors } = await res.json();
    assert.ok(errors.address);
    assert.ok(errors.fulfillment);
  });

  test('câmpul capcană oprește roboții', async () => {
    const res = await postJson(srv.base, '/api/comenzi', validOrder(srv, { website: 'http://spam.example' }));
    assert.equal(res.status, 400);
  });

  test('totalul așteptat diferit cere reconfirmare', async () => {
    const res = await postJson(srv.base, '/api/comenzi', validOrder(srv, { expectedTotal: 1 }));
    assert.equal(res.status, 409);
  });

  test('o comandă validă este salvată, iar pagina ei cere tokenul', async () => {
    const res = await postJson(srv.base, '/api/comenzi', validOrder(srv, { promoCode: '', notes: 'Fără nucă, vă rog.' }));
    assert.equal(res.status, 201);
    const { number, url } = await res.json();
    assert.match(number, /^BZ-\d+$/);
    const order = srv.store.getOrderByNumber(number);
    assert.equal(order.customerPhone, '0712345678');
    assert.equal(order.customerEmail, 'ana@example.com');
    assert.equal(order.status, 'noua');
    assert.equal(order.total, findVariant(srv.store, 'savarina').price * 2);
    assert.deepEqual(srv.sent.at(-1), { type: 'placed', number });

    const page = await fetch(srv.base + url);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Mulțumim, Ana!/);
    assert.equal((await fetch(`${srv.base}/comanda/${number}`)).status, 404);
    assert.equal((await fetch(`${srv.base}/comanda/${number}?t=gresit`)).status, 404);
  });

  test('comanda cu tort personalizat și livrare', async () => {
    const res = await postJson(srv.base, '/api/comenzi', {
      ...validOrder(srv),
      fulfillment: 'livrare',
      address: 'Str. Florilor nr. 5, București',
      date: '2026-11-12',
      slot: '10:00-12:00',
      items: [{ key: 'c1', custom: { ...DEFAULT_CUSTOM_CAKE, message: 'La mulți ani!' }, qty: 1 }],
    });
    assert.equal(res.status, 201);
    const { number } = await res.json();
    const order = srv.store.getOrderByNumber(number);
    const [item] = srv.store.getOrderItems(order.id);
    assert.equal(item.custom.config.message, 'La mulți ani!');
    assert.ok(item.custom.details.some((d) => d.includes('La mulți ani!')));
    assert.equal(order.deliveryFee, 0);
  });

  test('urmărirea comenzii după număr și telefon', async () => {
    const res = await postJson(srv.base, '/api/comenzi', validOrder(srv));
    const { number } = await res.json();
    const found = await fetch(`${srv.base}/urmareste-comanda`, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ number: number.toLowerCase(), phone: '0712 345 678' }),
    });
    assert.equal(found.status, 303);
    assert.match(found.headers.get('location'), new RegExp(`/comanda/${number}\\?t=`));
    const wrong = await fetch(`${srv.base}/urmareste-comanda`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ number, phone: '0799 999 999' }),
    });
    assert.equal(wrong.status, 404);
  });
});

describe('comenzi oprite din setări', () => {
  test('API-ul refuză comenzile când magazinul e în pauză', async () => {
    const srv = await startTestServer();
    try {
      srv.store.saveSettings({ ordersEnabled: false });
      const res = await postJson(srv.base, '/api/comenzi', { items: [] });
      assert.equal(res.status, 503);
      const page = await (await fetch(`${srv.base}/finalizare-comanda`)).text();
      assert.match(page, /Comenzile online sunt în pauză/);
    } finally {
      await srv.close();
    }
  });
});
