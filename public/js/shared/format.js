/* Formatări comune pentru server și browser (prețuri, date, plural). */

const intFmt = new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 0 });
const decFmt = new Intl.NumberFormat('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 14500 (bani) → „145 lei”; 1450 → „14,50 lei”. */
export function formatLei(bani) {
  const value = Math.round(Number(bani) || 0);
  const fmt = value % 100 === 0 ? intFmt : decFmt;
  return `${fmt.format(value / 100)} lei`;
}

/** Pluralul românesc: 1 produs, 2 produse, 20 de produse, 101 produse. */
export function plural(n, one, many) {
  if (n === 1) return `1 ${one}`;
  const rest = Math.abs(n) % 100;
  const de = n !== 0 && (rest === 0 || rest >= 20) ? 'de ' : '';
  return `${n} ${de}${many}`;
}

export const MONTHS = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'];
export const WEEKDAYS = ['duminică', 'luni', 'marți', 'miercuri', 'joi', 'vineri', 'sâmbătă'];
export const WEEKDAYS_SHORT = ['dum.', 'lun.', 'mar.', 'mie.', 'joi', 'vin.', 'sâm.'];

const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isDateKey(value) {
  const m = DATE_KEY.exec(String(value || ''));
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

/** Ziua săptămânii (0 = duminică) pentru o dată „AAAA-LL-ZZ”. */
export function weekdayOfKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function addDaysToKey(key, days) {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/** „2026-11-09” → „luni, 9 noiembrie” (opțional cu anul). */
export function formatDateKey(key, { weekday = true, year = false } = {}) {
  if (!isDateKey(key)) return String(key || '');
  const [y, m, d] = key.split('-').map(Number);
  let out = `${d} ${MONTHS[m - 1]}`;
  if (year) out += ` ${y}`;
  if (weekday) out = `${WEEKDAYS[weekdayOfKey(key)]}, ${out}`;
  return out;
}

export function capitalize(text) {
  const s = String(text || '');
  return s.charAt(0).toLocaleUpperCase('ro-RO') + s.slice(1);
}

/** „10:00-12:00” → „10:00–12:00”. */
export function formatSlot(slot) {
  return String(slot || '').replace('-', '–');
}
