/*
 * Opțiunile și prețurile pentru „Tort personalizat”.
 * Același fișier e folosit de configuratorul din browser (preț live) și de
 * server (care recalculează mereu prețul — nu ne bazăm pe prețul din browser).
 * Prețurile sunt în bani.
 */

import { formatLei } from './format.js';

export const CUSTOM_CAKE = {
  basePerKg: 15500,
  messageMaxLength: 40,
  notesMaxLength: 500,
  maxQuantity: 3,
  sizes: [
    { id: '1kg', label: '1 kg', servings: '6–8 porții', kg: 1, tiers: 1, scale: 0.84 },
    { id: '1.5kg', label: '1,5 kg', servings: '10–12 porții', kg: 1.5, tiers: 1, scale: 0.92 },
    { id: '2kg', label: '2 kg', servings: '14–16 porții', kg: 2, tiers: 1, scale: 1 },
    { id: '3kg', label: '3 kg', servings: '20–24 porții', kg: 3, tiers: 2, scale: 1 },
    { id: '4kg', label: '4 kg', servings: '28–32 porții', kg: 4, tiers: 2, scale: 1 },
    { id: '6kg', label: '6 kg', servings: '40–48 porții', kg: 6, tiers: 3, scale: 1 },
  ],
  sponges: [
    { id: 'vanilie', label: 'Vanilie', perKg: 0, color: '#F2CC86' },
    { id: 'ciocolata', label: 'Ciocolată', perKg: 0, color: '#6A3D29' },
    { id: 'red-velvet', label: 'Red velvet', perKg: 1000, color: '#A3283A' },
    { id: 'nuca', label: 'Nucă', perKg: 1500, color: '#B98A57' },
  ],
  creams: [
    { id: 'vanilie', label: 'Vanilie & frișcă', perKg: 0, color: '#FFF4E0' },
    { id: 'ciocolata', label: 'Ciocolată belgiană', perKg: 1000, color: '#6B3F2A' },
    { id: 'mascarpone', label: 'Mascarpone', perKg: 1500, color: '#FFF9EE' },
    { id: 'caramel', label: 'Caramel sărat', perKg: 1500, color: '#D9A05B' },
    { id: 'lamaie', label: 'Lămâie & ciocolată albă', perKg: 1000, color: '#FBF1B8' },
    { id: 'fistic', label: 'Fistic', perKg: 3000, color: '#C2D69B' },
  ],
  fillings: [
    { id: 'fara', label: 'Fără umplutură', perKg: 0, color: null },
    { id: 'fructe-de-padure', label: 'Fructe de pădure', perKg: 1000, color: '#7B2D4F' },
    { id: 'zmeura', label: 'Zmeură', perKg: 1000, color: '#C2304F' },
    { id: 'visine', label: 'Vișine', perKg: 1000, color: '#8B1E2D' },
    { id: 'capsuni', label: 'Căpșuni', perKg: 1000, color: '#E0475C' },
    { id: 'caramel-nuci', label: 'Caramel & nuci', perKg: 1500, color: '#B9772F' },
  ],
  finishes: [
    { id: 'crema', label: 'Cremă cu rozete', perKg: 0, hint: 'Clasic, cu margini din rozete de cremă.' },
    { id: 'drip', label: 'Glazură „drip”', perKg: 1000, hint: 'Glazură de ciocolată care se prelinge pe margini.' },
    { id: 'naked', label: 'Semi-naked', perKg: 0, hint: 'Strat subțire de cremă, blaturile se văd.' },
    { id: 'fondant', label: 'Fondant', perKg: 3500, hint: 'Suprafață netedă, perfectă pentru decoruri elaborate.' },
  ],
  colors: [
    { id: 'alb', label: 'Alb vanilie', hex: '#FFF7EC' },
    { id: 'roz', label: 'Roz pudrat', hex: '#F7C6D0' },
    { id: 'piersica', label: 'Piersică', hex: '#F9CDB0' },
    { id: 'galben', label: 'Galben pai', hex: '#FBE6A6' },
    { id: 'menta', label: 'Mentă', hex: '#C6E8D6' },
    { id: 'bleu', label: 'Bleu', hex: '#CFE2F6' },
    { id: 'lavanda', label: 'Lavandă', hex: '#D8CCF1' },
    { id: 'ciocolata', label: 'Ciocolată', hex: '#5A3524' },
  ],
  toppings: [
    { id: 'fructe', label: 'Fructe proaspete', price: 3500 },
    { id: 'flori', label: 'Flori comestibile', price: 6000 },
    { id: 'macarons', label: 'Macarons', price: 4500 },
    { id: 'bezea', label: 'Bezele', price: 2500 },
    { id: 'aur', label: 'Foiță aurie', price: 3000 },
  ],
  extras: [
    { id: 'topper', label: 'Topper personalizat', price: 4500, hint: 'Nume sau vârstă, din carton auriu.' },
    { id: 'poza', label: 'Imagine comestibilă', price: 4000, hint: 'Ne trimiți fotografia pe email după comandă.' },
    { id: 'artificii', label: 'Artificii de tort', price: 1500, hint: 'Două artificii reci, de interior.' },
  ],
  occasions: [
    { id: 'zi-de-nastere', label: 'Zi de naștere' },
    { id: 'aniversare', label: 'Aniversare' },
    { id: 'nunta', label: 'Nuntă' },
    { id: 'botez', label: 'Botez' },
    { id: 'corporate', label: 'Eveniment corporate' },
    { id: 'alta', label: 'Altă ocazie' },
  ],
};

export const DEFAULT_CUSTOM_CAKE = {
  size: '1.5kg',
  sponge: 'vanilie',
  cream: 'vanilie',
  filling: 'fructe-de-padure',
  finish: 'crema',
  color: 'roz',
  occasion: 'zi-de-nastere',
  toppings: ['fructe'],
  extras: [],
  message: '',
  notes: '',
};

const byId = (list, id) => list.find((item) => item.id === id);

/** Validează și curăță configurația venită din browser. */
export function normalizeCustomCake(input) {
  const src = input && typeof input === 'object' ? input : {};
  const errors = [];
  const one = (key, list) => {
    const value = String(src[key] ?? '');
    if (!byId(list, value)) errors.push(key);
    return value;
  };
  const many = (key, list) => {
    const raw = Array.isArray(src[key]) ? src[key].map(String) : [];
    if (raw.some((id) => !byId(list, id))) errors.push(key);
    return list.map((item) => item.id).filter((id) => raw.includes(id));
  };
  const text = (key, max) =>
    String(src[key] ?? '')
      .replace(/[\u0000-\u001f\u007f]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, max);

  const value = {
    size: one('size', CUSTOM_CAKE.sizes),
    sponge: one('sponge', CUSTOM_CAKE.sponges),
    cream: one('cream', CUSTOM_CAKE.creams),
    filling: one('filling', CUSTOM_CAKE.fillings),
    finish: one('finish', CUSTOM_CAKE.finishes),
    color: one('color', CUSTOM_CAKE.colors),
    occasion: one('occasion', CUSTOM_CAKE.occasions),
    toppings: many('toppings', CUSTOM_CAKE.toppings),
    extras: many('extras', CUSTOM_CAKE.extras),
    message: text('message', CUSTOM_CAKE.messageMaxLength),
    notes: text('notes', CUSTOM_CAKE.notesMaxLength),
  };
  return errors.length ? { ok: false, errors } : { ok: true, value };
}

/** Calculează prețul unui tort personalizat (configurație deja validată). */
export function priceCustomCake(cfg) {
  const size = byId(CUSTOM_CAKE.sizes, cfg.size);
  const sponge = byId(CUSTOM_CAKE.sponges, cfg.sponge);
  const cream = byId(CUSTOM_CAKE.creams, cfg.cream);
  const filling = byId(CUSTOM_CAKE.fillings, cfg.filling);
  const finish = byId(CUSTOM_CAKE.finishes, cfg.finish);
  const perKg = CUSTOM_CAKE.basePerKg + sponge.perKg + cream.perKg + filling.perKg + finish.perKg;
  const byWeight = Math.round((size.kg * perKg) / 100) * 100;
  const lines = [{ label: `${size.label} × ${formatLei(perKg)}/kg`, amount: byWeight }];
  for (const id of cfg.toppings) {
    const t = byId(CUSTOM_CAKE.toppings, id);
    lines.push({ label: t.label, amount: t.price });
  }
  for (const id of cfg.extras) {
    const e = byId(CUSTOM_CAKE.extras, id);
    lines.push({ label: e.label, amount: e.price });
  }
  const total = lines.reduce((sum, l) => sum + l.amount, 0);
  return { total, perKg, lines };
}

/** Timpul minim de pregătire, în ore. Torturile pe 3 etaje cer mai mult timp. */
export function customCakeLeadTimeHours(cfg) {
  const size = byId(CUSTOM_CAKE.sizes, cfg.size);
  return size && size.tiers >= 3 ? 120 : 72;
}

/** Titlu și detalii lizibile (pentru coș, comandă și email). */
export function describeCustomCake(cfg) {
  const size = byId(CUSTOM_CAKE.sizes, cfg.size);
  const label = (list, id) => byId(list, id)?.label || id;
  const details = [
    `Ocazie: ${label(CUSTOM_CAKE.occasions, cfg.occasion)}`,
    `Blat: ${label(CUSTOM_CAKE.sponges, cfg.sponge)}`,
    `Cremă: ${label(CUSTOM_CAKE.creams, cfg.cream)}`,
    `Umplutură: ${label(CUSTOM_CAKE.fillings, cfg.filling)}`,
    `Finisaj: ${label(CUSTOM_CAKE.finishes, cfg.finish)}, culoare ${label(CUSTOM_CAKE.colors, cfg.color).toLowerCase()}`,
  ];
  if (cfg.toppings.length) details.push(`Decor: ${cfg.toppings.map((id) => label(CUSTOM_CAKE.toppings, id)).join(', ')}`);
  if (cfg.extras.length) details.push(`Extra: ${cfg.extras.map((id) => label(CUSTOM_CAKE.extras, id)).join(', ')}`);
  if (cfg.message) details.push(`Mesaj pe tort: „${cfg.message}”`);
  if (cfg.notes) details.push(`Observații: ${cfg.notes}`);
  return {
    title: `Tort personalizat · ${size ? `${size.label} (${size.servings})` : ''}`.trim(),
    details,
  };
}

/** Starea vizuală pentru renderCustomCakeSvg(). */
export function customCakeVisual(cfg) {
  const size = byId(CUSTOM_CAKE.sizes, cfg.size) || CUSTOM_CAKE.sizes[1];
  return {
    tiers: size.tiers,
    scale: size.scale,
    color: byId(CUSTOM_CAKE.colors, cfg.color)?.hex,
    finish: cfg.finish,
    sponge: byId(CUSTOM_CAKE.sponges, cfg.sponge)?.color,
    cream: byId(CUSTOM_CAKE.creams, cfg.cream)?.color,
    filling: byId(CUSTOM_CAKE.fillings, cfg.filling)?.color || null,
    toppings: cfg.toppings || [],
    extras: cfg.extras || [],
    message: cfg.message || '',
  };
}
