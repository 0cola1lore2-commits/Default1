/*
 * Securitate: secrete persistente, sesiunea de administrator (cookie semnat),
 * protecție CSRF și limitarea numărului de cereri.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

function readOrCreate(file, generate) {
  try {
    const value = fs.readFileSync(file, 'utf8').trim();
    if (value) return { value, created: false };
  } catch {
    /* fișierul nu există încă */
  }
  const value = generate();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${value}\n`, { mode: 0o600 });
  return { value, created: true };
}

function friendlyPassword() {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(12);
  let out = '';
  for (let i = 0; i < 12; i++) {
    out += alphabet[bytes[i] % alphabet.length];
    if (i === 3 || i === 7) out += '-';
  }
  return out;
}

/** Secretul sesiunii și parola de admin: din variabile de mediu sau generate o singură dată în dataDir. */
export function resolveSecrets(env) {
  const session = env.sessionSecret ? { value: env.sessionSecret, created: false } : readOrCreate(path.join(env.dataDir, 'session-secret.txt'), () => crypto.randomBytes(32).toString('base64url'));
  const password = env.adminPassword
    ? { value: env.adminPassword, created: false, fromEnv: true }
    : { ...readOrCreate(path.join(env.dataDir, 'admin-password.txt'), friendlyPassword), fromEnv: false, file: path.join(env.dataDir, 'admin-password.txt') };
  return { sessionSecret: session.value, adminPassword: password.value, passwordInfo: password };
}

export function parseCookies(header) {
  const out = {};
  for (const part of String(header || '').split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const key = part.slice(0, i).trim();
    if (!key) continue;
    try {
      out[key] = decodeURIComponent(part.slice(i + 1).trim());
    } catch {
      out[key] = part.slice(i + 1).trim();
    }
  }
  return out;
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export function createAdminAuth({ secret, password, secureCookies, sameSite = 'lax', ttlHours = 12 }) {
  const COOKIE = 'bezea_admin';
  const sign = (data) => crypto.createHmac('sha256', secret).update(data).digest('base64url');
  const hash = (text) => crypto.createHash('sha256').update(String(text)).digest();

  return {
    checkPassword(input) {
      return crypto.timingSafeEqual(hash(input), hash(password));
    },

    login(res) {
      const payload = Buffer.from(JSON.stringify({ exp: Date.now() + ttlHours * 3600_000, n: crypto.randomBytes(12).toString('base64url') })).toString('base64url');
      res.cookie(COOKIE, `${payload}.${sign(payload)}`, {
        httpOnly: true,
        sameSite,
        secure: secureCookies,
        path: '/admin',
        maxAge: ttlHours * 3600_000,
      });
    },

    logout(res) {
      res.clearCookie(COOKIE, { path: '/admin', httpOnly: true, sameSite, secure: secureCookies });
    },

    /** Sesiunea curentă sau null. */
    session(req) {
      const value = parseCookies(req.headers.cookie)[COOKIE];
      if (!value) return null;
      const [payload, signature] = value.split('.');
      if (!payload || !signature || !safeEqual(sign(payload), signature)) return null;
      try {
        const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
        if (!data || typeof data.exp !== 'number' || data.exp < Date.now()) return null;
        return data;
      } catch {
        return null;
      }
    },

    csrfToken(session) {
      return sign(`csrf:${session.n}`);
    },

    verifyCsrf(session, token) {
      return !!session && typeof token === 'string' && safeEqual(sign(`csrf:${session.n}`), token);
    },
  };
}

/**
 * Limitare simplă în memorie, per IP. Pentru un singur proces e suficientă.
 */
export function rateLimit({ windowMs, max, onLimit }) {
  const hits = new Map();
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) if (entry.reset <= now) hits.delete(key);
  }, windowMs);
  timer.unref();
  return function limiter(req, res, next) {
    const now = Date.now();
    const key = req.ip || 'necunoscut';
    let entry = hits.get(key);
    if (!entry || entry.reset <= now) {
      entry = { count: 0, reset: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.reset - now) / 1000)));
      return onLimit(req, res);
    }
    return next();
  };
}
