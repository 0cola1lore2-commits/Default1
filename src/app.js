/*
 * Aplicația Express: asamblează baza de date, rutele publice, API-ul și panoul de administrare.
 */

import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { ROOT_DIR, loadEnv } from './config.js';
import { createStore, openDatabase, seedIfEmpty } from './db.js';
import { createNotifier } from './lib/notify.js';
import { createAdminAuth, resolveSecrets } from './lib/security.js';
import { adminRoutes } from './routes/admin.js';
import { apiRoutes } from './routes/api.js';
import { publicRoutes } from './routes/public.js';
import { errorPage } from './views/layout.js';

const CSP = [
  "default-src 'self'",
  "img-src 'self' data: blob:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self'",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

/**
 * @param {{ env?: object, dbFile?: string, clock?: () => Date, notifier?: object, logger?: Console }} options
 */
export function createApp(options = {}) {
  const env = loadEnv(options.env);
  const logger = options.logger || console;
  const clock = options.clock || (() => new Date());
  const db = openDatabase(options.dbFile || path.join(env.dataDir, 'cofetarie.db'));
  const store = createStore(db, { clock });
  const seeded = seedIfEmpty(store);
  const secrets = resolveSecrets(env);
  const auth = createAdminAuth({ secret: secrets.sessionSecret, password: secrets.adminPassword, secureCookies: env.secureCookies });
  const notifier = options.notifier || createNotifier(env, logger);
  const uploadsDir = path.join(env.dataDir, 'uploads');
  fs.mkdirSync(uploadsDir, { recursive: true });

  const publicDir = path.join(ROOT_DIR, 'public');
  const versions = new Map();
  const asset = (file) => {
    let v = env.isProduction ? versions.get(file) : null;
    if (!v) {
      try {
        v = Math.floor(fs.statSync(path.join(publicDir, file)).mtimeMs).toString(36);
      } catch {
        v = '1';
      }
      versions.set(file, v);
    }
    return `${file}?v=${v}`;
  };

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', env.trustProxy);

  app.use((req, res, next) => {
    res.set({
      'Content-Security-Policy': CSP,
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-Frame-Options': 'DENY',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    });
    if (req.secure) res.set('Strict-Transport-Security', 'max-age=15552000');
    next();
  });

  app.use(
    express.static(publicDir, {
      index: false,
      setHeaders(res, file) {
        if (file.includes(`${path.sep}fonts${path.sep}`)) res.set('Cache-Control', 'public, max-age=31536000, immutable');
        else if (file.includes(`${path.sep}img${path.sep}`)) res.set('Cache-Control', 'public, max-age=86400');
        else res.set('Cache-Control', 'no-cache');
      },
    }),
  );
  app.use(
    '/uploads',
    express.static(uploadsDir, {
      index: false,
      dotfiles: 'deny',
      setHeaders(res) {
        res.set('Cache-Control', 'public, max-age=2592000, immutable');
      },
    }),
  );

  app.use((req, res, next) => {
    res.locals.ctx = {
      path: req.path,
      settings: store.getSettings(),
      categories: store.listCategories(),
      asset,
      siteUrl: env.siteUrl || `${req.protocol}://${req.get('host')}`,
    };
    next();
  });

  const deps = { store, env, auth, notifier, clock, logger, uploadsDir };
  app.use('/api', express.json({ limit: '100kb' }), apiRoutes(deps));
  app.use('/admin', adminRoutes(deps));
  app.use(express.urlencoded({ extended: false, limit: '20kb' }), publicRoutes(deps));

  app.use((req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Resursa nu există.' });
    return res.status(404).type('html').send(String(errorPage(res.locals.ctx, { status: 404 })));
  });

  app.use((err, req, res, next) => {
    const status = Number(err.status || err.statusCode) || 500;
    if (status >= 500) logger.error(err);
    if (res.headersSent) return undefined;
    const wantsJson = req.path.startsWith('/api/') || req.get('accept')?.includes('application/json');
    if (wantsJson) {
      const message = status === 413 ? 'Fișierul sau cererea este prea mare.' : status < 500 ? 'Cererea nu este validă.' : 'A apărut o eroare. Te rugăm să încerci din nou.';
      return res.status(status).json({ error: message });
    }
    const ctx = res.locals.ctx || { path: req.path, settings: store.getSettings(), categories: store.listCategories(), asset, siteUrl: env.siteUrl || '' };
    return res
      .status(status)
      .type('html')
      .send(
        String(
          errorPage(ctx, {
            status,
            title: status === 404 ? undefined : status < 500 ? 'Cererea nu a putut fi procesată' : 'A apărut o eroare',
            text: status === 404 ? undefined : 'Ceva n-a mers cum trebuia. Te rugăm să încerci din nou peste câteva momente.',
          }),
        ),
      );
  });

  return {
    app,
    db,
    store,
    env,
    auth,
    secrets,
    seeded,
    close() {
      db.close();
    },
  };
}
