/*
 * Programarea comenzilor: zilele și intervalele orare disponibile, calculate
 * în fusul orar al cofetăriei (Europe/Bucharest), indiferent unde rulează serverul.
 */

import { ordering, shop } from '../config.js';
import { addDaysToKey, capitalize, formatDateKey, weekdayOfKey } from '../../public/js/shared/format.js';

const pad = (n) => String(n).padStart(2, '0');

const partsFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: ordering.timezone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export function zonedParts(date) {
  const parts = {};
  for (const p of partsFormatter.formatToParts(date)) parts[p.type] = p.value;
  return { year: +parts.year, month: +parts.month, day: +parts.day, hour: +parts.hour % 24, minute: +parts.minute };
}

/** Data de azi („AAAA-LL-ZZ”) în fusul orar al cofetăriei. */
export function todayKey(now = new Date()) {
  const p = zonedParts(now);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

export function toMinutes(time) {
  const [h, m] = String(time).split(':').map(Number);
  return h * 60 + m;
}

export function fromMinutes(total) {
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

/** Ora locală (din fusul cofetăriei) → momentul UTC corespunzător. */
export function zonedToUtc(dateKey, time) {
  const [y, mo, d] = dateKey.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  let guess = wall;
  for (let i = 0; i < 3; i++) {
    const p = zonedParts(new Date(guess));
    const offset = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - guess;
    const next = wall - offset;
    if (next === guess) break;
    guess = next;
  }
  return new Date(guess);
}

/** Programul pentru o zi anume sau null dacă e închis. */
export function openingHours(dateKey, settings) {
  if ((settings?.closedDates || []).includes(dateKey)) return null;
  return shop.hours[weekdayOfKey(dateKey)] || null;
}

/**
 * Zilele (și intervalele orare) în care se poate ridica sau livra o comandă.
 * @param {{ now: Date, leadTimeHours: number, fulfillment: 'ridicare'|'livrare', settings: object, days?: number }} opts
 */
export function buildSchedule({ now, leadTimeHours, fulfillment, settings, days = ordering.maxDaysAhead }) {
  const earliest = now.getTime() + Math.max(0, leadTimeHours) * 3600_000;
  const start = todayKey(now);
  const step = fulfillment === 'livrare' ? ordering.deliverySlotMinutes : ordering.pickupSlotMinutes;
  const schedule = [];
  for (let i = 0; i < days; i++) {
    const date = addDaysToKey(start, i);
    const day = { date, label: capitalize(formatDateKey(date)), weekday: weekdayOfKey(date), closed: false, slots: [] };
    const hours = openingHours(date, settings);
    if (!hours) {
      day.closed = true;
      schedule.push(day);
      continue;
    }
    let open = toMinutes(hours[0]);
    const close = toMinutes(hours[1]);
    if (fulfillment === 'livrare') open = Math.max(open, toMinutes(ordering.deliveryStart));
    for (let t = open; t + step <= close; t += step) {
      if (zonedToUtc(date, fromMinutes(t)).getTime() >= earliest) {
        day.slots.push(`${fromMinutes(t)}-${fromMinutes(t + step)}`);
      }
    }
    schedule.push(day);
  }
  return schedule;
}

export function isSlotAvailable(schedule, date, slot) {
  return schedule.some((day) => day.date === date && day.slots.includes(slot));
}

export function firstAvailable(schedule) {
  for (const day of schedule) if (day.slots.length) return { date: day.date, slot: day.slots[0] };
  return null;
}

/** Programul afișat pe site: „Luni – Vineri: 08:00–20:00” etc. */
export function hoursSummary() {
  const names = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă'];
  const order = [1, 2, 3, 4, 5, 6, 0];
  const rows = [];
  for (const d of order) {
    const h = shop.hours[d];
    const text = h ? `${h[0]}–${h[1]}` : 'Închis';
    const last = rows[rows.length - 1];
    if (last && last.text === text) {
      last.to = names[d];
    } else {
      rows.push({ from: names[d], to: null, text });
    }
  }
  return rows.map((r) => ({ days: r.to ? `${r.from} – ${r.to}` : r.from, hours: r.text }));
}
