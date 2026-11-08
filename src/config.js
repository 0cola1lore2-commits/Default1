/*
 * Configurarea cofetăriei.
 *
 * ▸ `shop`     — datele afișate pe site (nume, adresă, telefon, program, date firmă).
 *                Sunt valori de exemplu: înlocuiește-le cu datele tale reale.
 * ▸ `ordering` — regulile pentru comenzi (intervale orare, câte zile în avans).
 * ▸ `env`      — setări tehnice citite din variabile de mediu (vezi .env.example).
 *
 * Taxa de livrare, pragul de livrare gratuită, zilele închise și anunțul din
 * partea de sus a site-ului se modifică din panoul de administrare (Setări).
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const shop = {
  name: 'Bezea',
  fullName: 'Cofetăria Bezea',
  tagline: 'cofetărie artizanală',
  description: 'Torturi, prăjituri clasice și deserturi de sezon, preparate zilnic. Comandă online și ridică din cofetărie sau primește comanda acasă.',
  city: 'București',
  address: {
    street: 'Strada Exemplului nr. 12',
    locality: 'București',
    region: 'Sector 1',
    postalCode: '010101',
    country: 'RO',
  },
  phone: '0700 000 000',
  phoneHref: '+40700000000',
  email: 'comenzi@example.com',
  // Link opțional către hartă (Google Maps, OpenStreetMap etc.)
  mapUrl: '',
  social: {
    instagram: '',
    facebook: '',
  },
  company: {
    name: 'Exemplu Dulce SRL',
    cui: 'RO00000000',
    regCom: 'J40/0000/2026',
    iban: 'RO00 BANK 0000 0000 0000 0000',
    bank: 'Banca Exemplu',
  },
  // Programul cofetăriei: 0 = duminică, 1 = luni, ... 6 = sâmbătă. null = închis.
  hours: {
    1: ['08:00', '20:00'],
    2: ['08:00', '20:00'],
    3: ['08:00', '20:00'],
    4: ['08:00', '20:00'],
    5: ['08:00', '20:00'],
    6: ['09:00', '18:00'],
    0: ['10:00', '16:00'],
  },
  deliveryArea: 'Livrăm în București (toate sectoarele) și în localitățile din Ilfov aflate la cel mult 10 km de oraș.',
  orderPrefix: 'BZ',
};

export const ordering = {
  timezone: 'Europe/Bucharest',
  pickupSlotMinutes: 60,
  deliverySlotMinutes: 120,
  // Livrările pornesc la 10:00 și se termină odată cu programul.
  deliveryStart: '10:00',
  maxDaysAhead: 30,
  maxLines: 40,
  maxQuantityPerLine: 50,
};

export const paymentMethods = [
  { id: 'numerar', label: 'Numerar', description: 'Plătești la ridicare sau la livrare.' },
  { id: 'card', label: 'Card, la primire', description: 'Plătești cu cardul la POS, când primești comanda.' },
  { id: 'transfer', label: 'Transfer bancar', description: 'Îți trimitem datele de plată după confirmarea comenzii. Potrivit pentru firme și evenimente.' },
];

export const fulfillmentMethods = [
  { id: 'ridicare', label: 'Ridicare din cofetărie', description: 'Gratuit. Te așteptăm în intervalul ales.' },
  { id: 'livrare', label: 'Livrare la adresă', description: 'Livrăm cu grijă, în cutii izoterme.' },
];

export const allergens = {
  gluten: 'Gluten',
  oua: 'Ouă',
  lapte: 'Lapte',
  nuci: 'Fructe cu coajă (nuci, alune, migdale, fistic)',
  arahide: 'Arahide',
  soia: 'Soia',
  susan: 'Susan',
  sulfiti: 'Sulfiți',
};

export const productTags = {
  popular: { label: 'Preferat', tone: 'rose' },
  nou: { label: 'Nou', tone: 'mint' },
  post: { label: 'De post', tone: 'green' },
  'fara-gluten': { label: 'Fără gluten', tone: 'amber' },
  sezonier: { label: 'De sezon', tone: 'lavender' },
  alcool: { label: 'Conține alcool', tone: 'gray' },
};

export const orderStatuses = {
  noua: { label: 'Nouă', customerLabel: 'Primită', tone: 'rose' },
  confirmata: { label: 'Confirmată', customerLabel: 'Confirmată', tone: 'blue' },
  in_preparare: { label: 'În preparare', customerLabel: 'În preparare', tone: 'amber' },
  gata: { label: 'Gata', customerLabel: 'Gata', tone: 'mint' },
  in_livrare: { label: 'În livrare', customerLabel: 'În drum spre tine', tone: 'lavender' },
  finalizata: { label: 'Finalizată', customerLabel: 'Finalizată', tone: 'green' },
  anulata: { label: 'Anulată', customerLabel: 'Anulată', tone: 'gray' },
};

/** Setările implicite, modificabile din panoul de administrare. Prețurile sunt în bani. */
export const defaultSettings = {
  announcement: 'Livrare gratuită pentru comenzile de peste 250 lei. Comenzile pentru Crăciun se primesc până pe 20 decembrie.',
  ordersEnabled: true,
  ordersPausedMessage: 'Momentan nu preluăm comenzi online. Ne poți suna pentru comenzi speciale.',
  deliveryEnabled: true,
  deliveryFee: 1500,
  freeDeliveryOver: 25000,
  minOrderDelivery: 8000,
  closedDates: ['2026-12-25', '2026-12-26', '2027-01-01', '2027-01-02'],
};

function bool(value, fallback = false) {
  if (value == null || value === '') return fallback;
  return ['1', 'true', 'da', 'yes', 'on'].includes(String(value).toLowerCase());
}

export function loadEnv(overrides = {}) {
  const e = { ...process.env, ...overrides };
  return {
    port: Number(e.PORT) || 3000,
    host: e.HOST || '0.0.0.0',
    isProduction: e.NODE_ENV === 'production',
    siteUrl: String(e.SITE_URL || '').replace(/\/+$/, ''),
    dataDir: path.resolve(ROOT_DIR, e.DATA_DIR || 'data'),
    adminPassword: e.ADMIN_PASSWORD || '',
    sessionSecret: e.SESSION_SECRET || '',
    trustProxy: e.TRUST_PROXY ? (/^\d+$/.test(e.TRUST_PROXY) ? Number(e.TRUST_PROXY) : bool(e.TRUST_PROXY)) : false,
    secureCookies: bool(e.SECURE_COOKIES, e.NODE_ENV === 'production'),
    // Permite afișarea site-ului într-un cadru (iframe), de exemplu într-un panou de previzualizare.
    allowEmbed: bool(e.ALLOW_EMBED),
    mail: {
      host: e.SMTP_HOST || '',
      port: Number(e.SMTP_PORT) || 587,
      secure: bool(e.SMTP_SECURE),
      user: e.SMTP_USER || '',
      pass: e.SMTP_PASS || '',
      from: e.MAIL_FROM || `${shop.fullName} <${shop.email}>`,
      notify: e.SHOP_NOTIFY_EMAIL || shop.email,
    },
  };
}
