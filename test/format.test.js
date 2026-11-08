import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addDaysToKey, formatDateKey, formatLei, isDateKey, plural } from '../public/js/shared/format.js';
import { escapeHtml, html, raw } from '../public/js/shared/html.js';

test('formatLei afișează prețurile în format românesc', () => {
  assert.equal(formatLei(14500), '145 lei');
  assert.equal(formatLei(1450), '14,50 lei');
  assert.equal(formatLei(104040), '1.040,40 lei');
  assert.equal(formatLei(0), '0 lei');
});

test('plural respectă regula lui „de”', () => {
  assert.equal(plural(1, 'produs', 'produse'), '1 produs');
  assert.equal(plural(2, 'produs', 'produse'), '2 produse');
  assert.equal(plural(19, 'produs', 'produse'), '19 produse');
  assert.equal(plural(20, 'produs', 'produse'), '20 de produse');
  assert.equal(plural(101, 'produs', 'produse'), '101 produse');
  assert.equal(plural(120, 'produs', 'produse'), '120 de produse');
});

test('datele calendaristice', () => {
  assert.equal(formatDateKey('2026-11-09'), 'luni, 9 noiembrie');
  assert.equal(formatDateKey('2026-12-25', { weekday: false, year: true }), '25 decembrie 2026');
  assert.equal(addDaysToKey('2026-12-31', 1), '2027-01-01');
  assert.ok(isDateKey('2028-02-29'));
  assert.ok(!isDateKey('2026-02-30'));
  assert.ok(!isDateKey('09.11.2026'));
});

test('șabloanele HTML escapează conținutul', () => {
  assert.equal(escapeHtml(`<a href="x">'&`), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;');
  const name = '<img src=x onerror=alert(1)>';
  assert.equal(String(html`<p>${name}</p>`), '<p>&lt;img src=x onerror=alert(1)&gt;</p>');
  assert.equal(String(html`<p>${raw('<b>ok</b>')}${['a', html`<i>b</i>`]}${null}${false}</p>`), '<p><b>ok</b>a<i>b</i></p>');
});
