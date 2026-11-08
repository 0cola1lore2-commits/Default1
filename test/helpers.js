import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../src/app.js';
import { createStore, openDatabase, seedIfEmpty } from '../src/db.js';

/** Luni, 9 noiembrie 2026, ora 10:00 în București. */
export const FIXED_NOW = new Date('2026-11-09T08:00:00Z');

export const silentLogger = { log() {}, info() {}, warn() {}, error() {} };

export function memoryStore() {
  const db = openDatabase(':memory:');
  const store = createStore(db, { clock: () => FIXED_NOW });
  seedIfEmpty(store);
  return store;
}

export function findVariant(store, slug, index = 0) {
  const product = store.getProductBySlug(slug, { includeInactive: true });
  return product.variants[index];
}

export async function startTestServer({ now = FIXED_NOW, env = {} } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bezea-test-'));
  const sent = [];
  const notifier = {
    enabled: true,
    async orderPlaced(order) {
      sent.push({ type: 'placed', number: order.number });
    },
    async statusChanged(order) {
      sent.push({ type: 'status', number: order.number, status: order.status });
    },
  };
  const instance = createApp({
    env: { DATA_DIR: dir, ADMIN_PASSWORD: 'parola-de-test', SESSION_SECRET: 'secret-de-test', NODE_ENV: 'test', SITE_URL: '', ...env },
    clock: () => now,
    notifier,
    logger: silentLogger,
  });
  const server = await new Promise((resolve) => {
    const s = instance.app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  return {
    ...instance,
    base,
    sent,
    dir,
    async close() {
      await new Promise((resolve) => server.close(resolve));
      instance.close();
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}

export function postJson(base, url, body) {
  return fetch(base + url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
}

/** Autentificare în panou: întoarce un client care trimite cookie-ul și tokenul CSRF. */
export async function adminClient(base, password = 'parola-de-test') {
  const res = await fetch(`${base}/admin/autentificare`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ parola: password }),
  });
  const cookie = (res.headers.get('set-cookie') || '').split(';')[0];
  const client = {
    status: res.status,
    cookie,
    async get(url) {
      return fetch(base + url, { headers: { cookie }, redirect: 'manual' });
    },
    async csrf() {
      const html = await (await client.get('/admin/setari')).text();
      return /name="_csrf" value="([^"]+)"/.exec(html)?.[1];
    },
    async post(url, fields, { csrf = true } = {}) {
      const body = new URLSearchParams(fields);
      if (csrf) body.set('_csrf', await client.csrf());
      return fetch(base + url, {
        method: 'POST',
        redirect: 'manual',
        headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
        body,
      });
    },
  };
  return client;
}
