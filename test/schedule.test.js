import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildSchedule, firstAvailable, isSlotAvailable, todayKey, zonedToUtc } from '../src/lib/schedule.js';
import { FIXED_NOW } from './helpers.js';

const settings = { closedDates: ['2026-11-11'] };

test('conversia orei locale (București) în UTC, inclusiv la schimbarea orei', () => {
  assert.equal(zonedToUtc('2026-11-09', '10:00').toISOString(), '2026-11-09T08:00:00.000Z');
  assert.equal(zonedToUtc('2026-07-01', '10:00').toISOString(), '2026-07-01T07:00:00.000Z');
  assert.equal(zonedToUtc('2026-03-29', '12:00').toISOString(), '2026-03-29T09:00:00.000Z');
  assert.equal(zonedToUtc('2026-10-25', '12:00').toISOString(), '2026-10-25T10:00:00.000Z');
  assert.equal(todayKey(new Date('2026-11-08T22:30:00Z')), '2026-11-09');
});

test('ridicarea respectă timpul de pregătire și programul', () => {
  const schedule = buildSchedule({ now: FIXED_NOW, leadTimeHours: 2, fulfillment: 'ridicare', settings });
  const today = schedule[0];
  assert.equal(today.date, '2026-11-09');
  assert.equal(today.slots[0], '12:00-13:00');
  assert.equal(today.slots.at(-1), '19:00-20:00');
  assert.deepEqual(firstAvailable(schedule), { date: '2026-11-09', slot: '12:00-13:00' });
  assert.ok(!isSlotAvailable(schedule, '2026-11-09', '11:00-12:00'));
});

test('livrarea are intervale de două ore, începând cu 10:00', () => {
  const schedule = buildSchedule({ now: FIXED_NOW, leadTimeHours: 24, fulfillment: 'livrare', settings });
  assert.deepEqual(schedule[0].slots, []);
  assert.deepEqual(schedule[1].slots, ['10:00-12:00', '12:00-14:00', '14:00-16:00', '16:00-18:00', '18:00-20:00']);
  const sunday = schedule.find((d) => d.date === '2026-11-15');
  assert.deepEqual(sunday.slots, ['10:00-12:00', '12:00-14:00', '14:00-16:00']);
});

test('zilele închise nu au intervale', () => {
  const schedule = buildSchedule({ now: FIXED_NOW, leadTimeHours: 2, fulfillment: 'ridicare', settings });
  const closed = schedule.find((d) => d.date === '2026-11-11');
  assert.equal(closed.closed, true);
  assert.deepEqual(closed.slots, []);
  assert.equal(schedule.length, 30);
});
