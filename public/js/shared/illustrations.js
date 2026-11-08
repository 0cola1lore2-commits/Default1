/*
 * Ilustrații SVG generate procedural pentru produse și pentru previzualizarea
 * tortului personalizat. Modulul este folosit atât pe server (imaginile
 * produselor) cât și în browser (previzualizarea live a tortului).
 *
 * Fiecare produs are o „rețetă vizuală” (câmpul `visual`), de exemplu:
 *   { kind: 'cake', bg: '#FCE8EC', side: '#FFF6EE', drip: '#3B2218', topping: 'berries' }
 * Câmpurile lipsă primesc valori implicite, deci orice combinație e validă.
 */

const f = (v) => Math.round(v * 10) / 10;
const TAU = Math.PI * 2;

export function seededRandom(seed) {
  let h = 2166136261 >>> 0;
  const str = String(seed);
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function parseHex(hex) {
  let h = String(hex || '#000000').replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  const n = Number.parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(n)) return [0, 0, 0];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Amestecă o culoare cu negru (amount < 0) sau alb (amount > 0). */
export function mix(hex, amount) {
  const target = amount < 0 ? 0 : 255;
  const p = Math.min(1, Math.abs(amount));
  return (
    '#' +
    parseHex(hex)
      .map((v) => Math.round(v + (target - v) * p))
      .map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0'))
      .join('')
  );
}

export function isDark(hex) {
  const [r, g, b] = parseHex(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b < 150;
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

const SAFE_COLOR = /^#[0-9a-f]{3}([0-9a-f]{3})?$/i;
const color = (value, fallback) => (typeof value === 'string' && SAFE_COLOR.test(value) ? value : fallback);

export const COLORS = {
  chocolate: '#4A2A1C',
  darkChocolate: '#2E1912',
  milkChocolate: '#7A4A30',
  caramel: '#C8862F',
  cream: '#FFF4E2',
  whipped: '#FFFDF8',
  vanilla: '#F6DFA8',
  sponge: '#F0C77F',
  cocoaSponge: '#6A3D29',
  pastry: '#D99F57',
  gold: '#D7AE46',
};

/* ------------------------------------------------------------------------ */
/* Pictor: primitive de desen care împart același generator pseudo-aleator  */
/* ------------------------------------------------------------------------ */

function createPainter(uid, seed) {
  const rand = seededRandom(seed);
  const rnd = (a, b) => a + (b - a) * rand();
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];

  const p = {
    uid,
    rand,
    rnd,
    pick,

    defs() {
      return `<defs>
<linearGradient id="${uid}-cyl" x1="0" x2="1" y1="0" y2="0">
<stop offset="0" stop-color="#000" stop-opacity=".2"/><stop offset=".2" stop-color="#000" stop-opacity="0"/>
<stop offset=".36" stop-color="#fff" stop-opacity=".22"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/>
<stop offset=".82" stop-color="#000" stop-opacity=".04"/><stop offset="1" stop-color="#000" stop-opacity=".24"/>
</linearGradient>
<linearGradient id="${uid}-vert" x1="0" x2="0" y1="0" y2="1">
<stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/>
<stop offset="1" stop-color="#000" stop-opacity=".14"/>
</linearGradient>
<radialGradient id="${uid}-ball" cx=".36" cy=".32" r=".72">
<stop offset="0" stop-color="#fff" stop-opacity=".6"/><stop offset=".32" stop-color="#fff" stop-opacity="0"/>
<stop offset="1" stop-color="#000" stop-opacity=".28"/>
</radialGradient>
<linearGradient id="${uid}-glass" x1="0" x2="1" y1="0" y2="0">
<stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".12" stop-color="#fff" stop-opacity=".12"/>
<stop offset=".8" stop-color="#fff" stop-opacity=".06"/><stop offset="1" stop-color="#fff" stop-opacity=".4"/>
</linearGradient>
</defs>`;
    },

    background(bg, w, h) {
      const tint = mix(bg, -0.075);
      let s = `<rect width="${w}" height="${h}" fill="${bg}"/>`;
      s += `<ellipse cx="${f(w / 2)}" cy="${f(h * 0.52)}" rx="${f(w * 0.4)}" ry="${f(h * 0.46)}" fill="#fff" opacity=".42"/>`;
      for (let i = 0; i < 22; i++) {
        const x = rand() * w;
        const y = rand() * h;
        if (Math.hypot((x - w / 2) / (w * 0.43), (y - h / 2) / (h * 0.5)) < 1) continue;
        if (rand() < 0.45) {
          s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rnd(2.2, 4.2))}" fill="${tint}"/>`;
        } else {
          s += `<rect x="${f(x - 6)}" y="${f(y - 2)}" width="12" height="4" rx="2" fill="${tint}" transform="rotate(${f(rnd(0, 180))} ${f(x)} ${f(y)})"/>`;
        }
      }
      return s;
    },

    shadow(cx, cy, rx, ry, opacity = 0.1) {
      return `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="#3a2320" opacity="${opacity}"/>`;
    },

    plate(cx, cy, rx, ry) {
      return (
        p.shadow(cx, cy + ry * 0.38, rx * 1.03, ry * 1.06, 0.09) +
        `<ellipse cx="${f(cx)}" cy="${f(cy + 4)}" rx="${f(rx)}" ry="${f(ry)}" fill="#e9ddd2"/>` +
        `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="#fff"/>` +
        `<ellipse cx="${f(cx)}" cy="${f(cy + ry * 0.05)}" rx="${f(rx * 0.78)}" ry="${f(ry * 0.66)}" fill="#f6f0ea"/>`
      );
    },

    stand(cx, cy, rx, ry, baseY) {
      const stemW = rx * 0.13;
      return (
        p.shadow(cx, baseY + 7, rx * 0.62, ry * 0.36, 0.1) +
        `<ellipse cx="${f(cx)}" cy="${f(baseY + 3)}" rx="${f(rx * 0.46)}" ry="${f(ry * 0.3)}" fill="#e6d9cd"/>` +
        `<ellipse cx="${f(cx)}" cy="${f(baseY)}" rx="${f(rx * 0.46)}" ry="${f(ry * 0.3)}" fill="#fbf7f3"/>` +
        `<path d="M${f(cx - stemW)},${f(cy + ry * 0.6)}C${f(cx - stemW * 0.5)},${f(baseY - 18)} ${f(cx - stemW * 0.9)},${f(baseY - 8)} ${f(cx - stemW * 1.4)},${f(baseY - 2)}L${f(cx + stemW * 1.4)},${f(baseY - 2)}C${f(cx + stemW * 0.9)},${f(baseY - 8)} ${f(cx + stemW * 0.5)},${f(baseY - 18)} ${f(cx + stemW)},${f(cy + ry * 0.6)}Z" fill="#f3ece5"/>` +
        `<path d="M${f(cx + stemW * 0.2)},${f(cy + ry * 0.8)}L${f(cx + stemW * 0.5)},${f(baseY - 4)}" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8"/>` +
        `<ellipse cx="${f(cx)}" cy="${f(cy + 7)}" rx="${f(rx)}" ry="${f(ry)}" fill="#e4d6c9"/>` +
        `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="#fff"/>`
      );
    },

    /** Corp cilindric (blat de tort): cy = centrul elipsei de sus. */
    cylinder({ cx, cy, rx, ry, h, side, top, bands = [], shading = true }) {
      const L = f(cx - rx);
      const R = f(cx + rx);
      const B = f(cy + h);
      const sidePath = `M${L},${f(cy)}L${L},${B}A${f(rx)},${f(ry)} 0 0 0 ${R},${B}L${R},${f(cy)}Z`;
      let s = `<path d="${sidePath}" fill="${side}"/>`;
      for (const b of bands) {
        const y1 = f(cy + h * b.from);
        const y2 = f(cy + h * b.to);
        s += `<path d="M${L},${y1}A${f(rx)},${f(ry)} 0 0 0 ${R},${y1}L${R},${y2}A${f(rx)},${f(ry)} 0 0 1 ${L},${y2}Z" fill="${b.color}"${b.opacity != null ? ` opacity="${b.opacity}"` : ''}/>`;
      }
      if (shading) s += `<path d="${sidePath}" fill="url(#${uid}-cyl)"/>`;
      if (top) {
        s += `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${top}"/>`;
        s += `<ellipse cx="${f(cx - rx * 0.18)}" cy="${f(cy - ry * 0.18)}" rx="${f(rx * 0.62)}" ry="${f(ry * 0.5)}" fill="#fff" opacity=".12"/>`;
      }
      return s;
    },

    /** Glazură care curge pe marginea din față a unui cilindru. */
    drip({ cx, cy, rx, ry, color: c, depth = 26, count = 9, band = 5 }) {
      const drips = [];
      for (let i = 0; i < count; i++) {
        const t = Math.PI * (1 - (i + 0.5 + rnd(-0.22, 0.22)) / count);
        drips.push({ t, len: depth * rnd(0.3, 1), w: rnd(4.2, 6.8) });
      }
      const steps = 72;
      let d = `M${f(cx - rx)},${f(cy)}L${f(cx - rx)},${f(cy + band * 0.6)}`;
      let di = 0;
      let minX = -Infinity;
      for (let k = 1; k <= steps; k++) {
        const t = Math.PI * (1 - k / steps);
        while (di < drips.length && drips[di].t >= t) {
          const dr = drips[di++];
          const dx = cx + rx * Math.cos(dr.t);
          const dy = cy + ry * Math.sin(dr.t) + band;
          const w = dr.w * Math.max(0.45, Math.sin(dr.t));
          if (dx - w <= minX) continue;
          d += `L${f(dx - w)},${f(dy)}L${f(dx - w)},${f(dy + dr.len)}A${f(w)},${f(w)} 0 0 0 ${f(dx + w)},${f(dy + dr.len)}L${f(dx + w)},${f(dy)}`;
          minX = dx + w;
        }
        const x = cx + rx * Math.cos(t);
        if (x <= minX) continue;
        const y = cy + ry * Math.sin(t) + band * Math.max(0.6, Math.sin(t));
        d += `L${f(x)},${f(y)}`;
      }
      d += `L${f(cx + rx)},${f(cy)}A${f(rx)},${f(ry)} 0 0 0 ${f(cx - rx)},${f(cy)}Z`;
      return (
        `<path d="${d}" fill="${c}"/>` +
        `<path d="M${f(cx - rx * 0.7)},${f(cy - ry * 0.45)}A${f(rx * 0.86)},${f(ry * 0.8)} 0 0 1 ${f(cx + rx * 0.2)},${f(cy - ry * 0.78)}" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".28"/>`
      );
    },

    /** Moț de cremă (rozetă) cu vârf. (x, y) = baza. */
    dollop(x, y, r, c) {
      const dark = mix(c, -0.14);
      const light = mix(c, 0.65);
      return (
        `<path d="M${f(x - r)},${f(y)}C${f(x - r)},${f(y - r * 0.95)} ${f(x - r * 0.25)},${f(y - r * 1.05)} ${f(x)},${f(y - r * 1.75)}C${f(x + r * 0.25)},${f(y - r * 1.05)} ${f(x + r)},${f(y - r * 0.95)} ${f(x + r)},${f(y)}C${f(x + r)},${f(y + r * 0.6)} ${f(x - r)},${f(y + r * 0.6)} ${f(x - r)},${f(y)}Z" fill="${c}"/>` +
        `<path d="M${f(x - r * 0.9)},${f(y - r * 0.02)}Q${f(x)},${f(y + r * 0.38)} ${f(x + r * 0.9)},${f(y - r * 0.24)}M${f(x - r * 0.62)},${f(y - r * 0.74)}Q${f(x)},${f(y - r * 0.44)} ${f(x + r * 0.56)},${f(y - r * 0.94)}" fill="none" stroke="${dark}" stroke-width="${f(Math.max(1, r * 0.13))}" stroke-linecap="round" opacity=".75"/>` +
        `<ellipse cx="${f(x - r * 0.38)}" cy="${f(y - r * 0.5)}" rx="${f(r * 0.17)}" ry="${f(r * 0.27)}" fill="${light}" opacity=".9"/>`
      );
    },

    /** Nor de frișcă (mai mulți moți rotunjiți). */
    cloud(x, y, r, c) {
      const dark = mix(c, -0.1);
      const puffs = [
        [-0.75, 0.05, 0.55],
        [0.75, 0.05, 0.55],
        [-0.38, -0.32, 0.62],
        [0.38, -0.3, 0.6],
        [0, -0.62, 0.55],
        [0, 0.08, 0.6],
      ];
      let s = `<ellipse cx="${f(x)}" cy="${f(y + r * 0.25)}" rx="${f(r * 1.25)}" ry="${f(r * 0.38)}" fill="${dark}" opacity=".35"/>`;
      for (const [dx, dy, k] of puffs) s += `<circle cx="${f(x + dx * r)}" cy="${f(y + dy * r)}" r="${f(r * k)}" fill="${c}"/>`;
      s += `<path d="M${f(x - r * 0.9)},${f(y)}Q${f(x)},${f(y + r * 0.35)} ${f(x + r * 0.9)},${f(y)}M${f(x - r * 0.45)},${f(y - r * 0.45)}Q${f(x)},${f(y - r * 0.2)} ${f(x + r * 0.45)},${f(y - r * 0.48)}" fill="none" stroke="${dark}" stroke-width="${f(r * 0.08)}" stroke-linecap="round" opacity=".8"/>`;
      s += `<ellipse cx="${f(x - r * 0.35)}" cy="${f(y - r * 0.55)}" rx="${f(r * 0.14)}" ry="${f(r * 0.2)}" fill="#fff" opacity=".9"/>`;
      return s;
    },

    ball(x, y, r, c) {
      return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${c}"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="url(#${uid}-ball)"/>`;
    },

    raspberry(x, y, r) {
      const pts = [
        [-0.45, -0.35],
        [0.1, -0.52],
        [0.52, -0.16],
        [-0.52, 0.2],
        [0, 0.02],
        [0.45, 0.36],
        [-0.14, 0.52],
      ];
      let s = `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="#A0213F"/>`;
      for (const [dx, dy] of pts) s += `<circle cx="${f(x + dx * r)}" cy="${f(y + dy * r)}" r="${f(r * 0.42)}" fill="#D33C5C"/>`;
      s += `<circle cx="${f(x - r * 0.38)}" cy="${f(y - r * 0.42)}" r="${f(r * 0.16)}" fill="#fff" opacity=".55"/>`;
      return s;
    },

    blackberry(x, y, r) {
      const pts = [
        [-0.45, -0.35],
        [0.1, -0.52],
        [0.52, -0.16],
        [-0.52, 0.2],
        [0, 0.02],
        [0.45, 0.36],
        [-0.14, 0.52],
      ];
      let s = `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="#24112A"/>`;
      for (const [dx, dy] of pts) s += `<circle cx="${f(x + dx * r)}" cy="${f(y + dy * r)}" r="${f(r * 0.42)}" fill="#4A2350"/>`;
      s += `<circle cx="${f(x - r * 0.38)}" cy="${f(y - r * 0.42)}" r="${f(r * 0.15)}" fill="#fff" opacity=".45"/>`;
      return s;
    },

    blueberry(x, y, r) {
      return (
        `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="#3C4A8E"/>` +
        `<circle cx="${f(x - r * 0.3)}" cy="${f(y - r * 0.35)}" r="${f(r * 0.3)}" fill="#9AA6E0" opacity=".5"/>` +
        `<circle cx="${f(x + r * 0.15)}" cy="${f(y - r * 0.05)}" r="${f(r * 0.22)}" fill="#252F60"/>`
      );
    },

    cherry(x, y, r, stem = true) {
      return (
        (stem
          ? `<path d="M${f(x)},${f(y - r * 0.75)}Q${f(x + r * 0.2)},${f(y - r * 1.9)} ${f(x + r * 1.25)},${f(y - r * 2.3)}" fill="none" stroke="#6B4A2A" stroke-width="${f(Math.max(1.2, r * 0.2))}" stroke-linecap="round"/>`
          : '') + p.ball(x, y, r, '#A4122F')
      );
    },

    strawberry(x, y, r, rot = 0) {
      let s = `<g transform="rotate(${f(rot)} ${f(x)} ${f(y)})">`;
      s += `<path d="M${f(x)},${f(y + r * 1.25)}C${f(x - r * 1.15)},${f(y + r * 0.45)} ${f(x - r * 1.1)},${f(y - r * 0.85)} ${f(x)},${f(y - r * 0.62)}C${f(x + r * 1.1)},${f(y - r * 0.85)} ${f(x + r * 1.15)},${f(y + r * 0.45)} ${f(x)},${f(y + r * 1.25)}Z" fill="#E2344C"/>`;
      for (const [dx, dy] of [
        [-0.4, -0.1],
        [0.35, -0.15],
        [0, 0.2],
        [-0.3, 0.5],
        [0.3, 0.55],
        [0, 0.85],
      ]) {
        s += `<ellipse cx="${f(x + dx * r)}" cy="${f(y + dy * r)}" rx="${f(r * 0.07)}" ry="${f(r * 0.11)}" fill="#FCE38A"/>`;
      }
      s += `<path d="M${f(x - r * 0.7)},${f(y - r * 0.62)}L${f(x - r * 0.2)},${f(y - r * 0.5)}L${f(x)},${f(y - r * 0.95)}L${f(x + r * 0.2)},${f(y - r * 0.5)}L${f(x + r * 0.7)},${f(y - r * 0.62)}L${f(x + r * 0.25)},${f(y - r * 0.35)}L${f(x - r * 0.25)},${f(y - r * 0.35)}Z" fill="#4E9A4A"/>`;
      s += `<ellipse cx="${f(x - r * 0.42)}" cy="${f(y - r * 0.2)}" rx="${f(r * 0.14)}" ry="${f(r * 0.24)}" fill="#fff" opacity=".35"/>`;
      return s + '</g>';
    },

    strawberryHalf(x, y, r, rot = 0) {
      return (
        `<g transform="rotate(${f(rot)} ${f(x)} ${f(y)})">` +
        `<path d="M${f(x)},${f(y + r * 1.2)}C${f(x - r * 1.1)},${f(y + r * 0.4)} ${f(x - r * 1.05)},${f(y - r * 0.8)} ${f(x)},${f(y - r * 0.6)}C${f(x + r * 1.05)},${f(y - r * 0.8)} ${f(x + r * 1.1)},${f(y + r * 0.4)} ${f(x)},${f(y + r * 1.2)}Z" fill="#E0354B"/>` +
        `<path d="M${f(x)},${f(y + r * 0.85)}C${f(x - r * 0.7)},${f(y + r * 0.3)} ${f(x - r * 0.65)},${f(y - r * 0.5)} ${f(x)},${f(y - r * 0.35)}C${f(x + r * 0.65)},${f(y - r * 0.5)} ${f(x + r * 0.7)},${f(y + r * 0.3)} ${f(x)},${f(y + r * 0.85)}Z" fill="#F7A3AE"/>` +
        `<path d="M${f(x)},${f(y - r * 0.3)}L${f(x)},${f(y + r * 0.7)}" stroke="#FCE1E5" stroke-width="${f(r * 0.18)}" stroke-linecap="round"/>` +
        `</g>`
      );
    },

    kiwi(x, y, r, flat = false) {
      const ry = flat ? r * 0.55 : r;
      let s =
        `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(r)}" ry="${f(ry)}" fill="#7A5A2E"/>` +
        `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(r * 0.9)}" ry="${f(ry * 0.9)}" fill="#8CC43F"/>` +
        `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(r * 0.34)}" ry="${f(ry * 0.34)}" fill="#EEF0C2"/>`;
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU;
        s += `<ellipse cx="${f(x + Math.cos(a) * r * 0.52)}" cy="${f(y + Math.sin(a) * ry * 0.52)}" rx="${f(r * 0.05)}" ry="${f(ry * 0.09)}" fill="#2A2A16"/>`;
      }
      return s;
    },

    orangeSlice(x, y, r) {
      let s =
        `<path d="M${f(x - r)},${f(y)}A${f(r)},${f(r)} 0 0 1 ${f(x + r)},${f(y)}Z" fill="#EE8423"/>` +
        `<path d="M${f(x - r * 0.84)},${f(y)}A${f(r * 0.84)},${f(r * 0.84)} 0 0 1 ${f(x + r * 0.84)},${f(y)}Z" fill="#FFC35C"/>`;
      for (const a of [30, 60, 90, 120, 150]) {
        const rad = (a * Math.PI) / 180;
        s += `<path d="M${f(x)},${f(y)}L${f(x + Math.cos(rad) * r * 0.84)},${f(y - Math.sin(rad) * r * 0.84)}" stroke="#F6A23E" stroke-width="${f(r * 0.08)}"/>`;
      }
      return s;
    },

    peach(x, y, r, rot = 0) {
      return `<path transform="rotate(${f(rot)} ${f(x)} ${f(y)})" d="M${f(x - r)},${f(y)}Q${f(x)},${f(y - r * 1.4)} ${f(x + r)},${f(y)}Q${f(x)},${f(y - r * 0.55)} ${f(x - r)},${f(y)}Z" fill="#F7B04A"/>`;
    },

    pineapple(x, y, r, rot = 0) {
      return `<path transform="rotate(${f(rot)} ${f(x)} ${f(y)})" d="M${f(x - r)},${f(y + r * 0.5)}L${f(x - r * 0.6)},${f(y - r * 0.6)}L${f(x + r * 0.6)},${f(y - r * 0.6)}L${f(x + r)},${f(y + r * 0.5)}Z" fill="#F9D65C" stroke="#E9B83B" stroke-width="1"/>`;
    },

    mango(x, y, r, rot = 0) {
      return `<rect x="${f(x - r)}" y="${f(y - r)}" width="${f(r * 2)}" height="${f(r * 1.8)}" rx="${f(r * 0.35)}" fill="#F8A928" transform="rotate(${f(rot)} ${f(x)} ${f(y)})"/><rect x="${f(x - r * 0.7)}" y="${f(y - r * 0.8)}" width="${f(r * 0.7)}" height="${f(r * 0.4)}" rx="${f(r * 0.2)}" fill="#FFD27A" transform="rotate(${f(rot)} ${f(x)} ${f(y)})"/>`;
    },

    leaf(x, y, r, rot = 0, c = '#4F9A57') {
      return `<g transform="rotate(${f(rot)} ${f(x)} ${f(y)})"><path d="M${f(x)},${f(y)}Q${f(x + r * 0.9)},${f(y - r * 0.9)} ${f(x + r * 2)},${f(y)}Q${f(x + r * 0.9)},${f(y + r * 0.9)} ${f(x)},${f(y)}Z" fill="${c}"/><path d="M${f(x + r * 0.2)},${f(y)}L${f(x + r * 1.7)},${f(y)}" stroke="${mix(c, 0.35)}" stroke-width="${f(r * 0.12)}" stroke-linecap="round"/></g>`;
    },

    hollyLeaf(x, y, r, rot = 0) {
      const c = '#2F7A45';
      return `<g transform="rotate(${f(rot)} ${f(x)} ${f(y)})"><path d="M${f(x)},${f(y)}L${f(x + r * 0.4)},${f(y - r * 0.5)}L${f(x + r * 0.7)},${f(y - r * 0.25)}L${f(x + r * 1.1)},${f(y - r * 0.6)}L${f(x + r * 1.35)},${f(y - r * 0.25)}L${f(x + r * 1.8)},${f(y - r * 0.4)}L${f(x + r * 2)},${f(y)}L${f(x + r * 1.8)},${f(y + r * 0.4)}L${f(x + r * 1.35)},${f(y + r * 0.25)}L${f(x + r * 1.1)},${f(y + r * 0.6)}L${f(x + r * 0.7)},${f(y + r * 0.25)}L${f(x + r * 0.4)},${f(y + r * 0.5)}Z" fill="${c}"/><path d="M${f(x + r * 0.2)},${f(y)}L${f(x + r * 1.8)},${f(y)}" stroke="#6FB07F" stroke-width="1.2"/></g>`;
    },

    curl(x, y, len, rot, c) {
      return `<g transform="rotate(${f(rot)} ${f(x)} ${f(y)})"><rect x="${f(x - len / 2)}" y="${f(y - 3.6)}" width="${f(len)}" height="7.2" rx="3.6" fill="${c}"/><rect x="${f(x - len / 2 + 2)}" y="${f(y - 2.6)}" width="${f(len - 6)}" height="2" rx="1" fill="${mix(c, 0.3)}" opacity=".7"/><ellipse cx="${f(x + len / 2 - 2.5)}" cy="${f(y)}" rx="2.4" ry="3.4" fill="${mix(c, -0.35)}"/></g>`;
    },

    shard(x, y, s, rot, c) {
      return `<g transform="rotate(${f(rot)} ${f(x)} ${f(y)})"><path d="M${f(x - s * 0.6)},${f(y + s * 0.4)}L${f(x - s * 0.1)},${f(y - s)}L${f(x + s * 0.7)},${f(y + s * 0.35)}Z" fill="${c}"/><path d="M${f(x - s * 0.1)},${f(y - s)}L${f(x + s * 0.7)},${f(y + s * 0.35)}" stroke="${mix(c, 0.35)}" stroke-width="1.4"/></g>`;
    },

    walnut(x, y, r) {
      let d = '';
      for (let i = 0; i <= 24; i++) {
        const a = (i / 24) * TAU;
        const k = 0.86 + 0.14 * Math.sin(a * 6);
        d += `${i ? 'L' : 'M'}${f(x + Math.cos(a) * r * k)},${f(y + Math.sin(a) * r * k * 0.8)}`;
      }
      return `<path d="${d}Z" fill="#A86C3A"/><path d="M${f(x - r * 0.6)},${f(y)}Q${f(x)},${f(y - r * 0.5)} ${f(x + r * 0.6)},${f(y)}M${f(x - r * 0.5)},${f(y + r * 0.25)}Q${f(x)},${f(y + r * 0.55)} ${f(x + r * 0.5)},${f(y + r * 0.2)}M${f(x)},${f(y - r * 0.6)}L${f(x)},${f(y + r * 0.6)}" fill="none" stroke="#7A4A22" stroke-width="1.3" stroke-linecap="round"/>`;
    },

    almond(x, y, r, rot = 0, c = '#C48E58') {
      return `<g transform="rotate(${f(rot)} ${f(x)} ${f(y)})"><path d="M${f(x - r)},${f(y)}Q${f(x - r * 0.2)},${f(y - r * 0.75)} ${f(x + r)},${f(y)}Q${f(x - r * 0.2)},${f(y + r * 0.75)} ${f(x - r)},${f(y)}Z" fill="${c}"/><path d="M${f(x - r * 0.6)},${f(y - r * 0.05)}Q${f(x)},${f(y - r * 0.25)} ${f(x + r * 0.6)},${f(y)}" fill="none" stroke="${mix(c, -0.2)}" stroke-width="1" opacity=".7"/></g>`;
    },

    crumbs(x, y, w, h, n, colors, size = 2.4) {
      let s = '';
      for (let i = 0; i < n; i++) {
        const cx = x + rand() * w;
        const cy = y + rand() * h;
        const sz = size * rnd(0.6, 1.3);
        s += `<rect x="${f(cx - sz)}" y="${f(cy - sz * 0.7)}" width="${f(sz * 2)}" height="${f(sz * 1.4)}" rx="${f(sz * 0.5)}" fill="${pick(colors)}" transform="rotate(${f(rnd(0, 180))} ${f(cx)} ${f(cy)})"/>`;
      }
      return s;
    },

    sprinkles(x, y, w, h, n, colors) {
      let s = '';
      for (let i = 0; i < n; i++) {
        const cx = x + rand() * w;
        const cy = y + rand() * h;
        s += `<rect x="${f(cx - 3.5)}" y="${f(cy - 1.2)}" width="7" height="2.4" rx="1.2" fill="${pick(colors)}" transform="rotate(${f(rnd(0, 180))} ${f(cx)} ${f(cy)})"/>`;
      }
      return s;
    },

    sugarDust(points, r = 1.3) {
      return points.map(([x, y]) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * rnd(0.6, 1.2))}" fill="#fff" opacity="${f(rnd(0.55, 0.95))}"/>`).join('');
    },

    flower(x, y, r, c, center = '#F6C945') {
      let s = '';
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU - Math.PI / 2;
        s += `<circle cx="${f(x + Math.cos(a) * r * 0.55)}" cy="${f(y + Math.sin(a) * r * 0.55)}" r="${f(r * 0.5)}" fill="${c}"/>`;
      }
      s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 0.32)}" fill="${center}"/>`;
      s += `<circle cx="${f(x - r * 0.1)}" cy="${f(y - r * 0.1)}" r="${f(r * 0.12)}" fill="#fff" opacity=".6"/>`;
      return s;
    },

    goldFlake(x, y, s) {
      return `<path d="M${f(x - s)},${f(y)}L${f(x - s * 0.2)},${f(y - s * 0.8)}L${f(x + s)},${f(y - s * 0.3)}L${f(x + s * 0.5)},${f(y + s * 0.7)}Z" fill="${COLORS.gold}" transform="rotate(${f(rnd(0, 180))} ${f(x)} ${f(y)})"/><circle cx="${f(x - s * 0.2)}" cy="${f(y - s * 0.2)}" r="${f(s * 0.25)}" fill="#FFF3C4"/>`;
    },

    /** Macaron văzut din lateral; (x, y) = centrul bazei. */
    macaron(x, y, w, c, filling) {
      const shell = w * 0.27;
      const foot = w * 0.07;
      const fill = w * 0.11;
      const hw = w / 2;
      const fc = filling || mix(c, 0.55);
      const foot1 = y - shell * 0.55;
      const fillTop = foot1 - foot - fill;
      const foot2 = fillTop - foot;
      const top = foot2 - shell;
      return (
        `<path d="M${f(x - hw)},${f(foot1)}L${f(x + hw)},${f(foot1)}C${f(x + hw)},${f(y + shell * 0.1)} ${f(x - hw)},${f(y + shell * 0.1)} ${f(x - hw)},${f(foot1)}Z" fill="${mix(c, -0.06)}"/>` +
        `<rect x="${f(x - hw + 1)}" y="${f(foot1 - foot)}" width="${f(w - 2)}" height="${f(foot + 0.6)}" fill="${mix(c, 0.12)}"/>` +
        `<line x1="${f(x - hw + 3)}" y1="${f(foot1 - foot / 2)}" x2="${f(x + hw - 3)}" y2="${f(foot1 - foot / 2)}" stroke="${mix(c, -0.12)}" stroke-width="${f(foot * 0.55)}" stroke-dasharray="1.6 1.8"/>` +
        `<rect x="${f(x - hw + 3)}" y="${f(fillTop)}" width="${f(w - 6)}" height="${f(fill)}" rx="${f(fill / 2)}" fill="${fc}"/>` +
        `<rect x="${f(x - hw + 1)}" y="${f(foot2)}" width="${f(w - 2)}" height="${f(foot + 0.6)}" fill="${mix(c, 0.12)}"/>` +
        `<line x1="${f(x - hw + 3)}" y1="${f(foot2 + foot / 2)}" x2="${f(x + hw - 3)}" y2="${f(foot2 + foot / 2)}" stroke="${mix(c, -0.12)}" stroke-width="${f(foot * 0.55)}" stroke-dasharray="1.6 1.8"/>` +
        `<path d="M${f(x - hw)},${f(foot2)}C${f(x - hw)},${f(top - shell * 0.15)} ${f(x + hw)},${f(top - shell * 0.15)} ${f(x + hw)},${f(foot2)}Z" fill="${c}"/>` +
        `<ellipse cx="${f(x - hw * 0.35)}" cy="${f(top + shell * 0.32)}" rx="${f(hw * 0.32)}" ry="${f(shell * 0.16)}" fill="#fff" opacity=".35"/>`
      );
    },

    truffle(x, y, r, coating) {
      const base = coating === 'coconut' ? '#F8F3EA' : coating === 'white' ? '#F6E7C8' : coating === 'nuts' ? '#7B4B2B' : '#4A2A1C';
      let s = p.shadow(x, y + r * 0.85, r * 0.9, r * 0.25, 0.14) + p.ball(x, y, r, base);
      if (coating === 'cocoa') s += p.sugarDust(Array.from({ length: 10 }, () => [x + rnd(-r, r) * 0.7, y + rnd(-r, r) * 0.7]), 0.9).replaceAll('#fff', '#2A160E');
      if (coating === 'coconut') s += p.crumbs(x - r * 0.75, y - r * 0.75, r * 1.5, r * 1.5, 12, ['#fff', '#EFE6D8'], 1.6);
      if (coating === 'nuts') s += p.crumbs(x - r * 0.75, y - r * 0.75, r * 1.5, r * 1.5, 10, ['#C99A62', '#E3C08E'], 1.8);
      if (coating === 'drizzle') s += `<path d="M${f(x - r * 0.8)},${f(y - r * 0.2)}l${f(r * 0.4)},${f(-r * 0.3)}l${f(r * 0.4)},${f(r * 0.3)}l${f(r * 0.4)},${f(-r * 0.3)}l${f(r * 0.4)},${f(r * 0.3)}" fill="none" stroke="#F3E3C3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
      if (coating === 'white') s += `<circle cx="${f(x + r * 0.1)}" cy="${f(y - r * 0.15)}" r="${f(r * 0.18)}" fill="#E25A7A"/>`;
      return s;
    },

    /** Puncte distribuite pe suprafața unei elipse (sortate din spate în față). */
    topPoints(cx, cy, rx, ry, n, kMax = 0.6) {
      const pts = [];
      for (let i = 0; i < n; i++) {
        const a = rnd(0, TAU);
        const k = Math.sqrt(rand()) * kMax;
        pts.push({ x: cx + rx * k * Math.cos(a), y: cy + ry * k * Math.sin(a) });
      }
      return pts.sort((a, b) => a.y - b.y);
    },

    /** Rozete pe marginea de sus a tortului (spate sau față). */
    border(cx, cy, rx, ry, c, n, size, part, extra) {
      const items = [];
      for (let i = 0; i < n; i++) {
        const t = (i / n) * TAU + 0.12;
        const isBack = Math.sin(t) < 0;
        if ((part === 'back') !== isBack) continue;
        items.push({ x: cx + rx * Math.cos(t), y: cy + ry * Math.sin(t), i });
      }
      items.sort((a, b) => a.y - b.y);
      return items
        .map(({ x, y, i }) => {
          const k = 0.82 + 0.18 * ((y - (cy - ry)) / (2 * ry));
          let s = p.dollop(x, y, size * k, c);
          if (extra === 'cherry' && i % 2 === 0) s += p.cherry(x + 1, y - size * k * 1.75, size * k * 0.62);
          if (extra === 'berry' && i % 2 === 0) s += p.raspberry(x, y - size * k * 1.7, size * k * 0.55);
          if (extra === 'gold' && i % 3 === 0) s += p.goldFlake(x, y - size * k * 1.5, 3);
          return s;
        })
        .join('');
    },

    /** Mărgele mici la baza tortului (doar partea din față). */
    beads(cx, cy, rx, ry, c, n = 22, r = 5) {
      let s = '';
      for (let i = 0; i <= n; i++) {
        const t = Math.PI * (i / n);
        s += p.ball(cx + rx * Math.cos(t), cy + ry * Math.sin(t) - r * 0.4, r, c);
      }
      return s;
    },
  };
  return p;
}

/* ------------------------------------------------------------------------ */
/* Topping-uri pe suprafața de sus a unui tort                               */
/* ------------------------------------------------------------------------ */

function cakeToppings(p, type, a, v) {
  const { cx, cy, rx, ry } = a;
  let s = '';
  switch (type) {
    case 'berries': {
      const pts = p.topPoints(cx, cy, rx, ry, 11, 0.55);
      pts.forEach(({ x, y }, i) => {
        const r = p.rnd(7, 9.5);
        if (i % 3 === 0) s += p.raspberry(x, y - r * 0.6, r);
        else if (i % 3 === 1) s += p.blueberry(x, y - r * 0.5, r * 0.8);
        else s += p.blackberry(x, y - r * 0.6, r * 0.95);
      });
      s += p.leaf(cx - 6, cy - 14, 7, -35) + p.leaf(cx + 4, cy - 12, 6, -150);
      break;
    }
    case 'raspberries': {
      for (const { x, y } of p.topPoints(cx, cy, rx, ry, 10, 0.6)) s += p.raspberry(x, y - 5, p.rnd(7, 9));
      s += p.leaf(cx - 4, cy - 10, 7, -40);
      break;
    }
    case 'strawberries': {
      for (const { x, y } of p.topPoints(cx, cy, rx, ry, 7, 0.55)) s += p.strawberry(x, y - 8, p.rnd(9, 11), p.rnd(-25, 25));
      break;
    }
    case 'fruit': {
      const spots = [
        [-0.55, -0.35, 'orange'],
        [0.05, -0.55, 'kiwi'],
        [0.55, -0.3, 'orange'],
        [-0.25, -0.05, 'peach'],
        [0.3, 0.0, 'pineapple'],
        [-0.62, 0.3, 'pineapple'],
        [0.65, 0.35, 'peach'],
        [0.0, 0.45, 'orange'],
      ];
      for (const [kx, ky, kind] of spots) {
        const x = cx + rx * kx;
        const y = cy + ry * ky;
        if (kind === 'orange') s += p.orangeSlice(x, y + 4, p.rnd(17, 20));
        else if (kind === 'kiwi') s += p.kiwi(x, y - 10, 14);
        else if (kind === 'peach') s += p.peach(x, y, 17, p.rnd(-15, 15));
        else s += p.pineapple(x, y - 5, 11, p.rnd(-15, 15));
      }
      s += p.cherry(cx - 8, cy - 2, 7.5) + p.leaf(cx + 6, cy - 6, 7, -30);
      break;
    }
    case 'curls': {
      for (const { x, y } of p.topPoints(cx, cy, rx, ry, 12, 0.5)) s += p.curl(x, y - 4, p.rnd(16, 26), p.rnd(-60, 60), v.toppingColor || COLORS.chocolate);
      break;
    }
    case 'shards': {
      for (const { x, y } of p.topPoints(cx, cy, rx, ry, 7, 0.5)) s += p.shard(x, y - 10, p.rnd(12, 17), p.rnd(-25, 25), v.toppingColor || COLORS.darkChocolate);
      for (const { x, y } of p.topPoints(cx, cy, rx, ry, 6, 0.6)) s += p.curl(x, y - 3, p.rnd(14, 20), p.rnd(-40, 40), COLORS.milkChocolate);
      break;
    }
    case 'shavings': {
      s += p.crumbs(cx - rx * 0.6, cy - ry * 0.55, rx * 1.2, ry * 1.1, 46, [COLORS.chocolate, COLORS.darkChocolate, COLORS.milkChocolate], 2.6);
      break;
    }
    case 'caramel': {
      for (const { x, y } of p.topPoints(cx, cy, rx, ry, 8, 0.55)) {
        s += `<g opacity=".92">${p.shard(x, y - 8, p.rnd(10, 15), p.rnd(-35, 35), '#D9912E')}</g>`;
      }
      s += p.crumbs(cx - rx * 0.6, cy - ry * 0.5, rx * 1.2, ry, 30, ['#B47A3C', '#E2B474', '#8E5A2B'], 2.4);
      break;
    }
    case 'radial': {
      const c = mix(v.top || COLORS.caramel, -0.22);
      for (let i = 0; i < 12; i++) {
        const t = (i / 12) * TAU;
        s += `<path d="M${f(cx)},${f(cy)}L${f(cx + rx * 0.97 * Math.cos(t))},${f(cy + ry * 0.97 * Math.sin(t))}" stroke="${c}" stroke-width="1.6" opacity=".8"/>`;
      }
      s += `<ellipse cx="${f(cx - 20)}" cy="${f(cy - 8)}" rx="40" ry="7" fill="#fff" opacity=".22"/>`;
      break;
    }
    case 'crumbs': {
      const c = v.toppingColor || '#A3283A';
      s += p.crumbs(cx - rx * 0.75, cy - ry * 0.6, rx * 1.5, ry * 1.2, 40, [c, mix(c, -0.2), mix(c, 0.15)], 2.8);
      for (const { x, y } of p.topPoints(cx, cy, rx, ry, 4, 0.35)) s += p.raspberry(x, y - 5, 7);
      break;
    }
    case 'nuts': {
      for (const { x, y } of p.topPoints(cx, cy, rx, ry, 7, 0.5)) s += p.walnut(x, y - 4, p.rnd(7, 9));
      break;
    }
    case 'gold': {
      for (const { x, y } of p.topPoints(cx, cy, rx, ry, 9, 0.6)) s += p.goldFlake(x, y - 2, p.rnd(3, 5));
      break;
    }
    case 'macarons': {
      const cols = v.toppingColors || ['#F4A7B9', '#B9D98C', '#F7D774'];
      s += p.macaron(cx - 34, cy + 4, 30, cols[0]) + p.macaron(cx + 2, cy - 2, 30, cols[1]) + p.macaron(cx + 36, cy + 5, 30, cols[2]);
      break;
    }
    case 'christmas': {
      s += p.hollyLeaf(cx - 20, cy - 4, 12, -20) + p.hollyLeaf(cx + 4, cy - 2, 12, 200);
      s += p.ball(cx - 2, cy - 6, 5, '#C81E3A') + p.ball(cx + 7, cy - 3, 5, '#C81E3A') + p.ball(cx - 8, cy, 5, '#C81E3A');
      break;
    }
    default:
      break;
  }
  return s;
}

/* ------------------------------------------------------------------------ */
/* Tipuri de produse                                                         */
/* ------------------------------------------------------------------------ */

function drawCake(p, v) {
  const cx = 200;
  const cy = 114;
  const rx = 110;
  const ry = 29;
  const h = 88;
  const side = color(v.side, '#FFF4E6');
  const top = color(v.top, mix(side, 0.15));
  let s = p.stand(cx, cy + h + 3, 150, 36, 283);
  s += p.cylinder({ cx, cy, rx, ry, h, side, bands: v.bands || [] });

  if (v.sideDecor === 'crumbs' || v.sideDecor === 'shavings') {
    const c = color(v.sideDecorColor, v.sideDecor === 'shavings' ? COLORS.chocolate : '#C9955B');
    for (let i = 0; i < (v.sideDecor === 'crumbs' ? 90 : 55); i++) {
      const x = cx - rx + 6 + p.rand() * (rx * 2 - 12);
      const yFront = cy + ry * Math.sqrt(Math.max(0, 1 - ((x - cx) / rx) ** 2));
      const from = v.sideDecor === 'crumbs' ? 0.45 : 0.08;
      const y = yFront + h * (from + p.rand() * (0.95 - from));
      const sz = p.rnd(1.6, 3);
      s += `<rect x="${f(x - sz)}" y="${f(y - sz * 0.6)}" width="${f(sz * 2)}" height="${f(sz * 1.2)}" rx="${f(sz * 0.4)}" fill="${p.pick([c, mix(c, -0.2), mix(c, 0.2)])}" transform="rotate(${f(p.rnd(0, 180))} ${f(x)} ${f(y)})"/>`;
    }
  }
  if (v.sideLines) {
    for (let i = 1; i < 6; i++) {
      const y = f(cy + (h * i) / 6);
      s += `<path d="M${f(cx - rx)},${y}A${rx},${ry} 0 0 0 ${f(cx + rx)},${y}" fill="none" stroke="${color(v.sideLines, '#3A2018')}" stroke-width="1.6" opacity=".45"/>`;
    }
  }
  if (v.bottomBorder) s += p.beads(cx, cy + h, rx, ry, color(v.bottomBorder, '#fff'), 24, 5.5);

  if (v.drip) {
    s += p.drip({ cx, cy, rx, ry, color: color(v.drip, COLORS.chocolate), depth: v.dripDepth || 28 });
  } else {
    s += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${top}"/>`;
    s += `<ellipse cx="${f(cx - 18)}" cy="${f(cy - 6)}" rx="70" ry="13" fill="#fff" opacity=".14"/>`;
  }

  const area = { cx, cy, rx: rx * 0.78, ry: ry * 0.78 };
  if (v.border) s += p.border(cx, cy, rx * 0.86, ry * 0.84, color(v.border, '#fff'), 14, 11, 'back', v.borderExtra);
  s += cakeToppings(p, v.topping, area, v);
  if (v.border) s += p.border(cx, cy, rx * 0.86, ry * 0.84, color(v.border, '#fff'), 14, 11, 'front', v.borderExtra);
  return s;
}

function drawSlice(p, v) {
  const A = [104, 150];
  const F = [286, 150];
  const D = [42, -25];
  const h = 82;
  const Bk = [F[0] + D[0], F[1] + D[1]];
  const layers = (v.layers && v.layers.length ? v.layers : [{ color: COLORS.sponge, h: 1 }]).map((l) => ({ color: color(l.color, COLORS.sponge), h: Number(l.h) || 1, sponge: !!l.sponge }));
  const total = layers.reduce((a, l) => a + l.h, 0);
  const outer = color(v.outer, layers[layers.length - 1].color);
  const top = color(v.top, outer);
  const ctrl = [F[0] + D[0] * 0.78, F[1] + D[1] * 0.12];

  let s = p.plate(210, 232, 156, 34);
  let yb = A[1] + h;
  for (const l of layers) {
    const lh = (l.h / total) * h;
    s += `<rect x="${A[0]}" y="${f(yb - lh)}" width="${F[0] - A[0]}" height="${f(lh + 0.6)}" fill="${l.color}"/>`;
    if (l.sponge) {
      for (let i = 0; i < Math.round((lh * (F[0] - A[0])) / 90); i++) {
        s += `<circle cx="${f(A[0] + 4 + p.rand() * (F[0] - A[0] - 8))}" cy="${f(yb - lh + 2 + p.rand() * Math.max(1, lh - 4))}" r="${f(p.rnd(0.8, 1.6))}" fill="${mix(l.color, -0.18)}" opacity=".7"/>`;
      }
    }
    yb -= lh;
  }
  s += `<rect x="${A[0]}" y="${A[1]}" width="${F[0] - A[0]}" height="${h}" fill="url(#${p.uid}-vert)" opacity=".7"/>`;
  const outerPath = `M${F[0]},${F[1]}Q${f(ctrl[0])},${f(ctrl[1])} ${Bk[0]},${Bk[1]}L${Bk[0]},${Bk[1] + h}Q${f(ctrl[0])},${f(ctrl[1] + h)} ${F[0]},${F[1] + h}Z`;
  s += `<path d="${outerPath}" fill="${outer}"/><path d="${outerPath}" fill="#000" opacity=".1"/>`;
  s += `<path d="M${A[0]},${A[1]}L${F[0]},${F[1]}Q${f(ctrl[0])},${f(ctrl[1])} ${Bk[0]},${Bk[1]}Z" fill="${top}"/>`;
  s += `<path d="M${A[0] + 30},${A[1] - 3}L${F[0] - 10},${F[1] - 12}" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".18"/>`;

  if (v.sauce) {
    const c = color(v.sauce, '#8E1F3F');
    let d = `M${A[0]},${A[1]}L${F[0]},${F[1]}L${F[0]},${F[1] + 6}`;
    const n = 7;
    for (let i = n - 1; i >= 0; i--) {
      const x = A[0] + ((i + 0.5) / n) * (F[0] - A[0]);
      const len = p.rnd(6, 20);
      d += `L${f(x + 5)},${F[1] + 5}L${f(x + 5)},${f(F[1] + len)}A5,5 0 0 1 ${f(x - 5)},${f(F[1] + len)}L${f(x - 5)},${F[1] + 5}`;
    }
    d += `L${A[0]},${A[1] + 4}Z`;
    s += `<path d="${d}" fill="${c}"/>`;
    s += `<path d="M${A[0]},${A[1]}L${F[0]},${F[1]}Q${f(ctrl[0])},${f(ctrl[1])} ${Bk[0]},${Bk[1]}Z" fill="${c}"/>`;
  }
  const tx = F[0] - 8;
  const ty = F[1] - 10;
  switch (v.topping) {
    case 'berries':
      s += p.blueberry(tx - 70, ty + 5, 7) + p.raspberry(tx - 40, ty + 1, 9) + p.blackberry(tx - 8, ty - 3, 9) + p.raspberry(tx + 18, ty - 9, 8) + p.leaf(tx - 26, ty - 6, 6, -40);
      break;
    case 'cherry':
      s += p.dollop(tx, ty, 13, color(v.creamColor, COLORS.whipped)) + p.cherry(tx + 1, ty - 24, 8);
      break;
    case 'strawberry':
      s += p.dollop(tx - 2, ty, 13, color(v.creamColor, COLORS.whipped)) + p.strawberry(tx, ty - 26, 10, 10);
      break;
    case 'curls':
      for (let i = 0; i < 5; i++) s += p.curl(A[0] + 70 + i * 26, A[1] - 5 - i * 2.6, 20, p.rnd(-30, 30), COLORS.chocolate);
      break;
    default:
      break;
  }
  return s;
}

function drawSquare(p, v) {
  const x0 = 112;
  const x1 = 266;
  const yT = 142;
  const h = 76;
  const D = [54, -30];
  const layers = (v.layers && v.layers.length ? v.layers : [{ color: COLORS.sponge, h: 1 }]).map((l) => ({ color: color(l.color, COLORS.sponge), h: Number(l.h) || 1, sponge: !!l.sponge }));
  const total = layers.reduce((a, l) => a + l.h, 0);
  const top = color(v.top, layers[layers.length - 1].color);

  let s = p.plate(214, 214, 156, 38);
  let yb = yT + h;
  for (const l of layers) {
    const lh = (l.h / total) * h;
    const ya = yb - lh;
    s += `<rect x="${x0}" y="${f(ya)}" width="${x1 - x0}" height="${f(lh + 0.6)}" fill="${l.color}"/>`;
    s += `<path d="M${x1},${f(ya)}L${x1 + D[0]},${f(ya + D[1])}L${x1 + D[0]},${f(yb + D[1] + 0.6)}L${x1},${f(yb + 0.6)}Z" fill="${mix(l.color, -0.13)}"/>`;
    if (l.sponge) {
      for (let i = 0; i < Math.round((lh * (x1 - x0)) / 80); i++) {
        s += `<circle cx="${f(x0 + 3 + p.rand() * (x1 - x0 - 6))}" cy="${f(ya + 2 + p.rand() * Math.max(1, lh - 4))}" r="${f(p.rnd(0.8, 1.5))}" fill="${mix(l.color, -0.2)}" opacity=".7"/>`;
      }
    }
    yb = ya;
  }
  s += `<rect x="${x0}" y="${yT}" width="${x1 - x0}" height="${h}" fill="url(#${p.uid}-vert)" opacity=".6"/>`;
  const topPath = `M${x0},${yT}L${x1},${yT}L${x1 + D[0]},${yT + D[1]}L${x0 + D[0]},${yT + D[1]}Z`;
  s += `<path d="${topPath}" fill="${top}"/>`;

  const tcx = (x0 + x1 + D[0]) / 2;
  const tcy = yT + D[1] / 2;
  const topPts = (n) => {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const u = p.rand();
      const w = p.rand();
      pts.push([x0 + u * (x1 - x0) + w * D[0], yT + w * D[1]]);
    }
    return pts;
  };
  switch (v.decor) {
    case 'powder':
      s += `<path d="${topPath}" fill="#fff" opacity=".55"/>` + p.sugarDust(topPts(70), 1.4);
      break;
    case 'glaze':
      s += `<path d="M${x0 + 24},${yT - 4}L${x0 + 24 + D[0] * 0.6},${yT - 4 + D[1] * 0.6}" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".22"/>`;
      break;
    case 'jelly':
      s += `<path d="M${x0 + 18},${yT - 5}L${x1 - 20},${yT - 5}" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".45"/><path d="M${x0 + 40},${yT - 14}L${x1 - 10},${yT - 14}" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".3"/>`;
      break;
    case 'cherry':
      s += `<path d="M${x0 + 24},${yT - 4}L${x0 + 24 + D[0] * 0.6},${yT - 4 + D[1] * 0.6}" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".2"/>`;
      s += p.dollop(tcx, tcy + 6, 14, color(v.creamColor, COLORS.whipped)) + p.cherry(tcx + 1, tcy - 19, 8);
      break;
    case 'walnut':
      s += `<path d="M${x0 + 24},${yT - 4}L${x0 + 24 + D[0] * 0.6},${yT - 4 + D[1] * 0.6}" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".18"/>`;
      s += p.walnut(tcx - 34, tcy + 2, 11) + p.walnut(tcx + 30, tcy - 2, 11);
      break;
    case 'drizzle': {
      const c = color(v.decorColor, '#fff');
      let d = '';
      for (let i = 0; i < 7; i++) {
        const u = (i + 0.5) / 7;
        const xa = x0 + u * (x1 - x0);
        d += `M${f(xa)},${yT - 2}L${f(xa + D[0] * 0.95)},${f(yT + D[1] * 0.95)}`;
      }
      s += `<path d="${d}" stroke="${c}" stroke-width="2.6" stroke-linecap="round" opacity=".9"/>`;
      break;
    }
    case 'nuts':
      s += p.crumbs(x0 + 10, yT + D[1] + 4, x1 - x0 + D[0] - 30, -D[1] - 8, 40, [color(v.decorColor, '#9DBB6A'), mix(color(v.decorColor, '#9DBB6A'), -0.2), '#E7D49B'], 2.6);
      break;
    case 'rosettes':
      s += p.dollop(tcx - 40, tcy + 6, 11, color(v.creamColor, COLORS.whipped)) + p.dollop(tcx, tcy + 4, 11, color(v.creamColor, COLORS.whipped)) + p.dollop(tcx + 40, tcy + 2, 11, color(v.creamColor, COLORS.whipped));
      if (v.decorColor) s += p.ball(tcx - 40, tcy - 14, 4.5, v.decorColor) + p.ball(tcx, tcy - 16, 4.5, v.decorColor) + p.ball(tcx + 40, tcy - 18, 4.5, v.decorColor);
      break;
    case 'lattice': {
      const c = color(v.decorColor, COLORS.pastry);
      let d = '';
      for (let i = 1; i < 6; i++) {
        const u = i / 6;
        d += `M${f(x0 + u * (x1 - x0))},${yT}L${f(x0 + u * (x1 - x0) + D[0])},${yT + D[1]}`;
      }
      for (let i = 1; i < 3; i++) {
        const w = i / 3;
        d += `M${f(x0 + w * D[0])},${f(yT + w * D[1])}L${f(x1 + w * D[0])},${f(yT + w * D[1])}`;
      }
      s += `<path d="${d}" stroke="${c}" stroke-width="7" stroke-linecap="round"/>` + p.sugarDust(topPts(40), 1.2);
      break;
    }
    default:
      break;
  }
  return s;
}

function drawEclair(p, v) {
  const pastry = color(v.pastry, COLORS.pastry);
  const glaze = color(v.glaze, COLORS.chocolate);
  const one = (x, y, w, scale) => {
    const h = 50 * scale;
    let s = p.shadow(x + w / 2, y + h + 4, w * 0.52, 9 * scale, 0.12);
    s += `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(h / 2)}" fill="${pastry}"/>`;
    s += `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(h / 2)}" fill="url(#${p.uid}-vert)"/>`;
    for (let i = 0; i < 6; i++) {
      const cx = x + w * (0.15 + i * 0.14);
      s += `<path d="M${f(cx)},${f(y + h * 0.62)}q${f(6 * scale)},${f(-4 * scale)} ${f(12 * scale)},0" fill="none" stroke="${mix(pastry, -0.2)}" stroke-width="1.4" opacity=".6"/>`;
    }
    const gy = y - 5 * scale;
    const gh = h * 0.58;
    let d = `M${f(x + 6)},${f(gy + gh / 2)}A${f(gh / 2)},${f(gh / 2)} 0 0 1 ${f(x + 6 + gh / 2)},${f(gy)}L${f(x + w - 6 - gh / 2)},${f(gy)}A${f(gh / 2)},${f(gh / 2)} 0 0 1 ${f(x + w - 6)},${f(gy + gh / 2)}`;
    const n = 9;
    for (let i = n; i >= 0; i--) {
      const xx = x + 6 + ((w - 12) * i) / n;
      d += `L${f(xx)},${f(gy + gh + (i % 2 ? p.rnd(1, 5) : p.rnd(-2, 1)) * scale)}`;
    }
    d += 'Z';
    s += `<path d="${d}" fill="${glaze}"/>`;
    s += `<rect x="${f(x + 22 * scale)}" y="${f(gy + 5 * scale)}" width="${f(w * 0.55)}" height="${f(4 * scale)}" rx="${f(2 * scale)}" fill="#fff" opacity=".3"/>`;
    if (v.decor === 'stripes') {
      let z = `M${f(x + 18)},${f(gy + gh * 0.55)}`;
      for (let i = 1; i <= 12; i++) z += `L${f(x + 18 + ((w - 36) * i) / 12)},${f(gy + (i % 2 ? gh * 0.25 : gh * 0.7))}`;
      s += `<path d="${z}" fill="none" stroke="${color(v.decorColor, '#fff')}" stroke-width="${f(2.2 * scale)}" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>`;
    }
    if (v.decor === 'crumbs') s += p.crumbs(x + 18, gy + 3, w - 36, gh - 8, 26, [color(v.decorColor, '#7FA34C'), mix(color(v.decorColor, '#7FA34C'), 0.25), '#D9C27A'], 2.4 * scale);
    if (v.decor === 'dots') {
      for (let i = 0; i < 5; i++) s += p.ball(x + w * (0.2 + i * 0.15), gy + gh * 0.45, 4 * scale, color(v.decorColor, '#fff'));
    }
    if (v.decor === 'gold') for (let i = 0; i < 4; i++) s += p.goldFlake(x + w * (0.25 + i * 0.17), gy + gh * 0.45, 4);
    return s;
  };
  let s = p.plate(200, 214, 172, 38);
  s += `<g transform="rotate(-7 200 160)">${one(132, 104, 196, 0.9)}${one(92, 150, 214, 1)}</g>`;
  return s;
}

function drawCup(p, v) {
  const cx = 200;
  const topY = 92;
  const botY = 236;
  const wTop = 70;
  const wBot = 54;
  const ry = 10;
  const hw = (y) => wBot + ((botY - y) / (botY - topY)) * (wTop - wBot);
  const layers = (v.layers && v.layers.length ? v.layers : [{ color: '#F3E3C3', h: 1 }]).map((l) => ({ color: color(l.color, '#F3E3C3'), h: Number(l.h) || 1, dots: l.dots }));
  const total = layers.reduce((a, l) => a + l.h, 0);
  const fillTop = 118;
  const fillBot = botY - 6;

  let s = p.shadow(cx, botY + 10, 92, 14, 0.12);
  s += `<path d="M${cx - wTop},${topY}L${cx - wBot},${botY}A${wBot},${ry} 0 0 0 ${cx + wBot},${botY}L${cx + wTop},${topY}Z" fill="#fff" opacity=".35"/>`;
  s += `<ellipse cx="${cx}" cy="${topY}" rx="${wTop}" ry="${ry}" fill="#fff" opacity=".35"/>`;
  let y = fillBot;
  for (const l of layers) {
    const lh = ((l.h / total) * (fillBot - fillTop));
    const y2 = y - lh;
    const w1 = hw(y) - 5;
    const w2 = hw(y2) - 5;
    s += `<path d="M${f(cx - w1)},${f(y)}A${f(w1)},${ry} 0 0 0 ${f(cx + w1)},${f(y)}L${f(cx + w2)},${f(y2)}A${f(w2)},${ry} 0 0 1 ${f(cx - w2)},${f(y2)}Z" fill="${l.color}"/>`;
    if (l.dots) {
      for (let i = 0; i < Math.round(lh * 1.6); i++) {
        const yy = y2 + 3 + p.rand() * (lh - 2);
        const ww = hw(yy) - 9;
        s += `<circle cx="${f(cx + p.rnd(-ww, ww))}" cy="${f(yy + ry * 0.6)}" r="1.2" fill="${l.dots}" opacity=".8"/>`;
      }
    }
    y = y2;
  }
  const wt = hw(fillTop) - 5;
  const topColor = color(v.surface, mix(layers[layers.length - 1].color, 0.08));
  s += `<ellipse cx="${cx}" cy="${fillTop}" rx="${f(wt)}" ry="${ry}" fill="${topColor}"/>`;
  const t = v.topping;
  if (v.cream !== false && t !== 'cocoa' && t !== 'caramel' && t !== 'choux') s += p.cloud(cx, fillTop - 6, 30, color(v.cream, COLORS.whipped));
  switch (t) {
    case 'cocoa':
      s += `<ellipse cx="${cx}" cy="${fillTop}" rx="${f(wt)}" ry="${ry}" fill="#5A321F"/>`;
      s += p.sugarDust(Array.from({ length: 50 }, () => [cx + p.rnd(-wt, wt) * 0.95, fillTop + p.rnd(-ry, ry) * 0.8]), 1.1).replaceAll('#fff', '#3B2014');
      s += p.dollop(cx - 18, fillTop + 2, 9, '#FBF4E6') + p.dollop(cx + 14, fillTop - 1, 9, '#FBF4E6') + p.ball(cx + 32, fillTop - 4, 5, '#3A1F14');
      break;
    case 'berries': {
      const b = v.cream === false ? fillTop + 2 : fillTop - 30;
      s += p.raspberry(cx - 6, b - 6, 8) + p.blueberry(cx + 14, b, 6.5) + p.blackberry(cx - 22, b + 4, 7) + p.raspberry(cx + 30, b + 6, 6.5) + p.leaf(cx + 4, b - 10, 6, -50);
      break;
    }
    case 'shavings':
      s += p.curl(cx - 8, fillTop - 36, 18, -30, COLORS.chocolate) + p.curl(cx + 10, fillTop - 32, 16, 40, COLORS.milkChocolate) + p.crumbs(cx - 24, fillTop - 28, 48, 14, 16, [COLORS.chocolate, COLORS.darkChocolate], 2);
      break;
    case 'mango': {
      const b = v.cream === false ? fillTop + 1 : fillTop - 30;
      s += p.mango(cx - 14, b, 7, 10) + p.mango(cx + 10, b - 4, 7, -12) + p.mango(cx + 30, b + 3, 6, 25) + p.leaf(cx - 2, b - 12, 6, -60);
      break;
    }
    case 'caramel':
      s += `<ellipse cx="${cx}" cy="${fillTop}" rx="${f(wt)}" ry="${ry}" fill="#B86A1E"/><ellipse cx="${cx - 18}" cy="${fillTop - 2}" rx="22" ry="3" fill="#fff" opacity=".3"/>`;
      s += p.dollop(cx, fillTop + 2, 10, '#FFF8EC') + p.cherry(cx + 1, fillTop - 17, 6);
      break;
    case 'choux': {
      const cap = (x, y, r) =>
        `<path d="M${f(x - r * 0.98)},${f(y - r * 0.05)}A${f(r)},${f(r)} 0 0 1 ${f(x + r * 0.98)},${f(y - r * 0.05)}L${f(x + r * 0.8)},${f(y + r * 0.2)}Q${f(x + r * 0.62)},${f(y + r * 0.62)} ${f(x + r * 0.45)},${f(y + r * 0.18)}L${f(x + r * 0.1)},${f(y + r * 0.3)}Q${f(x - r * 0.08)},${f(y + r * 0.8)} ${f(x - r * 0.26)},${f(y + r * 0.26)}L${f(x - r * 0.62)},${f(y + r * 0.22)}Q${f(x - r * 0.8)},${f(y + r * 0.5)} ${f(x - r * 0.9)},${f(y + r * 0.2)}Z" fill="${COLORS.chocolate}"/>` +
        `<path d="M${f(x - r * 0.55)},${f(y - r * 0.55)}A${f(r * 0.7)},${f(r * 0.7)} 0 0 1 ${f(x + r * 0.1)},${f(y - r * 0.82)}" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".35"/>`;
      s += p.ball(cx - 22, fillTop - 6, 18, COLORS.pastry) + cap(cx - 22, fillTop - 6, 18);
      s += p.ball(cx + 22, fillTop - 6, 18, COLORS.pastry) + cap(cx + 22, fillTop - 6, 18);
      s += p.ball(cx, fillTop - 30, 18, COLORS.pastry) + cap(cx, fillTop - 30, 18);
      break;
    }
    default:
      break;
  }
  s += `<path d="M${cx - wTop},${topY}L${cx - wBot},${botY}A${wBot},${ry} 0 0 0 ${cx + wBot},${botY}L${cx + wTop},${topY}A${wTop},${ry} 0 0 1 ${cx - wTop},${topY}Z" fill="url(#${p.uid}-glass)"/>`;
  s += `<path d="M${cx - wTop + 10},${topY + 12}L${cx - wBot + 8},${botY - 10}" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".55"/>`;
  s += `<path d="M${cx - wBot},${botY}A${wBot},${ry} 0 0 0 ${cx + wBot},${botY}" fill="none" stroke="#fff" stroke-width="3" opacity=".7"/>`;
  s += `<ellipse cx="${cx}" cy="${topY}" rx="${wTop}" ry="${ry}" fill="none" stroke="#fff" stroke-width="3" opacity=".9"/>`;
  s += `<path d="M${cx - wTop},${topY}L${cx - wBot},${botY}M${cx + wTop},${topY}L${cx + wBot},${botY}" stroke="#fff" stroke-width="2" opacity=".7"/>`;
  return s;
}

function drawCookies(p, v) {
  const style = v.style || 'assorted';
  let s = p.plate(200, 214, 168, 44);
  const dough = color(v.dough, '#E9B873');
  const disc = (x, y, r, kind) => {
    const ry = r * 0.5;
    const th = r * 0.22;
    let c = `<ellipse cx="${f(x)}" cy="${f(y + th)}" rx="${f(r)}" ry="${f(ry)}" fill="${mix(dough, -0.2)}"/>`;
    c += `<rect x="${f(x - r)}" y="${f(y)}" width="${f(r * 2)}" height="${f(th)}" fill="${mix(dough, -0.12)}"/>`;
    c += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(r)}" ry="${f(ry)}" fill="${dough}"/>`;
    if (kind === 'choc') c += `<path d="M${f(x)},${f(y - ry)}A${f(r)},${f(ry)} 0 0 1 ${f(x)},${f(y + ry)}L${f(x)},${f(y + ry + th)}A${f(r)},${f(ry)} 0 0 0 ${f(x + r)},${f(y + th)}L${f(x + r)},${f(y)}A${f(r)},${f(ry)} 0 0 0 ${f(x)},${f(y - ry)}Z" fill="${COLORS.chocolate}"/>`;
    if (kind === 'jam') c += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(r * 0.32)}" ry="${f(ry * 0.32)}" fill="#C42645"/><ellipse cx="${f(x - r * 0.08)}" cy="${f(y - ry * 0.1)}" rx="${f(r * 0.1)}" ry="${f(ry * 0.08)}" fill="#fff" opacity=".5"/>`;
    if (kind === 'chips') for (let i = 0; i < 6; i++) c += `<circle cx="${f(x + p.rnd(-r, r) * 0.65)}" cy="${f(y + p.rnd(-ry, ry) * 0.6)}" r="${f(r * 0.08)}" fill="${COLORS.darkChocolate}"/>`;
    if (kind === 'sugar') c += p.sugarDust(Array.from({ length: 14 }, () => [x + p.rnd(-r, r) * 0.7, y + p.rnd(-ry, ry) * 0.6]), 1.1);
    if (kind === 'linzer') {
      c += p.sugarDust(Array.from({ length: 24 }, () => [x + p.rnd(-r, r) * 0.8, y + p.rnd(-ry, ry) * 0.7]), 1.1);
      c += `<path d="M${f(x)},${f(y - ry * 0.4)}C${f(x - r * 0.35)},${f(y - ry * 0.75)} ${f(x - r * 0.45)},${f(y + ry * 0.05)} ${f(x)},${f(y + ry * 0.38)}C${f(x + r * 0.45)},${f(y + ry * 0.05)} ${f(x + r * 0.35)},${f(y - ry * 0.75)} ${f(x)},${f(y - ry * 0.4)}Z" fill="#B91F3E"/>`;
    }
    if (kind === 'almond') {
      c = `<ellipse cx="${f(x)}" cy="${f(y + th)}" rx="${f(r)}" ry="${f(r * 0.62)}" fill="${mix(dough, -0.22)}"/><ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(r)}" ry="${f(r * 0.62)}" fill="${dough}"/>`;
      c += `<path d="M${f(x - r * 0.6)},${f(y - r * 0.1)}l${f(r * 0.25)},${f(r * 0.12)}l${f(r * 0.2)},${f(-r * 0.16)}M${f(x + r * 0.2)},${f(y + r * 0.25)}l${f(r * 0.2)},${f(-r * 0.1)}l${f(r * 0.2)},${f(r * 0.12)}" fill="none" stroke="${mix(dough, -0.25)}" stroke-width="1.4" stroke-linecap="round"/>`;
      c += p.almond(x, y - r * 0.15, r * 0.36, -20, '#E9CFA4');
    }
    return c;
  };
  if (style === 'crescents') {
    const crescent = (x, y, r, rot) => {
      const c = `<g transform="rotate(${f(rot)} ${f(x)} ${f(y)})"><path d="M${f(x - r)},${f(y + 2)}C${f(x - r * 1.05)},${f(y - r * 1.05)} ${f(x + r * 1.05)},${f(y - r * 1.05)} ${f(x + r)},${f(y + 2)}C${f(x + r * 0.6)},${f(y - r * 0.12)} ${f(x - r * 0.6)},${f(y - r * 0.12)} ${f(x - r)},${f(y + 2)}Z" fill="${dough}" stroke="${mix(dough, -0.22)}" stroke-width="2.2"/><path d="M${f(x - r * 0.55)},${f(y - r * 0.45)}Q${f(x)},${f(y - r * 0.8)} ${f(x + r * 0.55)},${f(y - r * 0.45)}" fill="none" stroke="${mix(dough, 0.35)}" stroke-width="3" stroke-linecap="round" opacity=".7"/></g>`;
      return c + p.sugarDust(Array.from({ length: 22 }, () => [x + p.rnd(-r, r) * 0.7, y - r * 0.5 + p.rnd(-6, 5)]), 1.4);
    };
    const pos = [
      [140, 186, -12],
      [200, 178, 6],
      [262, 186, 14],
      [118, 214, -4],
      [178, 210, 8],
      [240, 212, -10],
      [292, 214, 4],
    ];
    for (const [x, y, r] of pos) s += crescent(x, y, 34, r);
    return s;
  }
  if (style === 'sticks') {
    for (let i = 0; i < 9; i++) {
      const x = 118 + i * 20 + p.rnd(-4, 4);
      const y = 200 + p.rnd(-6, 6);
      const rot = p.rnd(-70, -50);
      s += `<g transform="rotate(${f(rot)} ${f(x)} ${f(y)})"><rect x="${f(x - 46)}" y="${f(y - 7)}" width="92" height="14" rx="7" fill="${dough}"/><rect x="${f(x - 46)}" y="${f(y - 7)}" width="92" height="14" rx="7" fill="url(#${p.uid}-vert)"/>`;
      for (let k = 0; k < 9; k++) s += `<ellipse cx="${f(x - 40 + k * 10)}" cy="${f(y + p.rnd(-3, 3))}" rx="1.8" ry="1" fill="#FFF7E0"/>`;
      s += `</g>`;
    }
    return s;
  }
  if (style === 'gingerbread') {
    const gb = '#A9652F';
    const star = (x, y, r, rot) => {
      let d = '';
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU - Math.PI / 2;
        const k = i % 2 ? 0.48 : 1;
        d += `${i ? 'L' : 'M'}${f(x + Math.cos(a) * r * k)},${f(y + Math.sin(a) * r * k * 0.8)}`;
      }
      return `<g transform="rotate(${f(rot)} ${f(x)} ${f(y)})"><path d="${d}Z" fill="${gb}" stroke="${mix(gb, -0.2)}" stroke-width="2"/><path d="${d}Z" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="4 3" transform="translate(${f(x * 0.25)} ${f(y * 0.25)}) scale(.75)"/></g>`;
    };
    const tree = (x, y, r) => `<path d="M${f(x)},${f(y - r)}L${f(x + r * 0.75)},${f(y + r * 0.7)}L${f(x - r * 0.75)},${f(y + r * 0.7)}Z" fill="${gb}" stroke="${mix(gb, -0.2)}" stroke-width="2"/><path d="M${f(x - r * 0.4)},${f(y)}l${f(r * 0.2)},${f(-r * 0.1)}l${f(r * 0.2)},${f(r * 0.1)}l${f(r * 0.2)},${f(-r * 0.1)}l${f(r * 0.2)},${f(r * 0.1)}M${f(x - r * 0.55)},${f(y + r * 0.4)}l${f(r * 0.27)},${f(-r * 0.1)}l${f(r * 0.27)},${f(r * 0.1)}l${f(r * 0.27)},${f(-r * 0.1)}l${f(r * 0.27)},${f(r * 0.1)}" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/>` + p.ball(x, y - r * 0.35, 3, '#D8344F');
    const heart = (x, y, r) => `<path d="M${f(x)},${f(y + r * 0.8)}C${f(x - r * 1.2)},${f(y)} ${f(x - r * 0.7)},${f(y - r * 0.9)} ${f(x)},${f(y - r * 0.35)}C${f(x + r * 0.7)},${f(y - r * 0.9)} ${f(x + r * 1.2)},${f(y)} ${f(x)},${f(y + r * 0.8)}Z" fill="${gb}" stroke="${mix(gb, -0.2)}" stroke-width="2"/><path d="M${f(x)},${f(y + r * 0.55)}C${f(x - r * 0.9)},${f(y)} ${f(x - r * 0.5)},${f(y - r * 0.6)} ${f(x)},${f(y - r * 0.15)}C${f(x + r * 0.5)},${f(y - r * 0.6)} ${f(x + r * 0.9)},${f(y)} ${f(x)},${f(y + r * 0.55)}Z" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="3 3"/>`;
    s += tree(150, 160, 34) + star(222, 168, 34, 8) + heart(282, 178, 30) + star(132, 214, 30, -10) + heart(200, 214, 30) + tree(262, 212, 32);
    return s;
  }
  const kinds = style === 'linzer' ? ['linzer'] : style === 'almond' ? ['almond'] : ['choc', 'jam', 'chips', 'sugar', 'jam', 'choc', 'sugar'];
  const pos = [
    [150, 170, 34],
    [222, 164, 34],
    [290, 176, 32],
    [116, 206, 34],
    [186, 206, 36],
    [258, 208, 36],
    [314, 214, 28],
  ];
  pos.forEach(([x, y, r], i) => {
    s += disc(x, y, r, kinds[i % kinds.length]);
  });
  return s;
}

function drawMacarons(p, v) {
  const cols = (v.colors && v.colors.length ? v.colors : ['#F4A7B9', '#B9D98C', '#F7D774', '#C9B2E8', '#F6C08F', '#9FD3E0']).map((c) => color(c, '#F4A7B9'));
  let s = p.plate(200, 222, 164, 40);
  const w = 66;
  const rows = [
    [150, 216, 0],
    [210, 220, 1],
    [270, 216, 2],
    [180, 178, 3],
    [240, 178, 4],
    [210, 140, 5],
  ];
  for (const [x, y, i] of rows) s += p.macaron(x, y, w, cols[i % cols.length]);
  s += p.macaron(108, 236, 54, cols[(cols.length - 1) % cols.length]) + p.macaron(300, 240, 54, cols[1 % cols.length]);
  return s;
}

function drawTruffles(p, v) {
  const coatings = v.coatings || ['cocoa', 'coconut', 'nuts', 'drizzle', 'white', 'cocoa', 'drizzle', 'coconut'];
  let s = p.plate(200, 218, 166, 44);
  const cup = (x, y, r) => {
    let c = `<path d="M${f(x - r * 1.15)},${f(y - r * 0.15)}L${f(x - r * 0.85)},${f(y + r * 0.75)}L${f(x + r * 0.85)},${f(y + r * 0.75)}L${f(x + r * 1.15)},${f(y - r * 0.15)}Z" fill="#7A4E36"/>`;
    for (let i = 0; i < 7; i++) c += `<path d="M${f(x - r * 1.05 + i * r * 0.35)},${f(y - r * 0.1)}L${f(x - r * 0.78 + i * r * 0.26)},${f(y + r * 0.72)}" stroke="#5E3926" stroke-width="1.2"/>`;
    return c;
  };
  const pos = [
    [146, 168, 24],
    [204, 162, 24],
    [262, 168, 24],
    [118, 212, 26],
    [176, 210, 26],
    [234, 210, 26],
    [292, 212, 26],
  ];
  pos.forEach(([x, y, r], i) => {
    s += cup(x, y + r * 0.35, r) + p.truffle(x, y, r, coatings[i % coatings.length]);
  });
  return s;
}

function drawCozonac(p, v) {
  const crust = color(v.crust, '#B8692B');
  const crumb = color(v.crumb, '#F5D79A');
  const fill = color(v.filling, '#5B3524');
  let s = p.plate(196, 222, 170, 40);
  const body = 'M70,214L70,140C70,104 98,96 130,96L232,96C262,96 290,104 290,140L290,214Z';
  s += p.shadow(180, 216, 120, 10, 0.12);
  s += `<path d="${body}" fill="${crust}"/><path d="${body}" fill="url(#${p.uid}-vert)"/>`;
  for (let i = 0; i < 6; i++) {
    const x = 92 + i * 34;
    s += `<path d="M${x},${f(104 + (i === 0 || i === 5 ? 10 : 0))}q16,18 32,0" fill="none" stroke="${mix(crust, -0.22)}" stroke-width="3" stroke-linecap="round" opacity=".6"/>`;
    s += `<path d="M${x + 4},${118}q12,12 26,0" fill="none" stroke="${mix(crust, 0.3)}" stroke-width="2" stroke-linecap="round" opacity=".4"/>`;
  }
  s += `<path d="M90,112Q180,96 268,112" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".18"/>`;
  s += p.sugarDust(Array.from({ length: 24 }, () => [p.rnd(90, 270), p.rnd(98, 112)]), 1.2);

  const sx = 246;
  const sy = 150;
  const slice = `M${sx - 52},${sy + 92}L${sx - 52},${sy + 22}C${sx - 52},${sy - 6} ${sx - 34},${sy - 14} ${sx - 14},${sy - 14}L${sx + 14},${sy - 14}C${sx + 34},${sy - 14} ${sx + 52},${sy - 6} ${sx + 52},${sy + 22}L${sx + 52},${sy + 92}Z`;
  s += `<g transform="rotate(8 ${sx} ${sy + 92})">`;
  s += `<path d="${slice}" fill="${crumb}" stroke="${crust}" stroke-width="7" stroke-linejoin="round"/>`;
  if (v.style === 'rahat') {
    for (let i = 0; i < 26; i++) {
      const x = sx + p.rnd(-38, 38);
      const y = sy + p.rnd(-2, 82);
      s += p.rand() < 0.62 ? `<rect x="${f(x - 4.5)}" y="${f(y - 4.5)}" width="9" height="9" rx="2" fill="${p.pick(['#EE7E9C', '#F5D76E', '#E14F74', '#9ED07A'])}" transform="rotate(${f(p.rnd(-25, 25))} ${f(x)} ${f(y)})"/>` : `<ellipse cx="${f(x)}" cy="${f(y)}" rx="3.4" ry="2.5" fill="#5B341F"/>`;
    }
  } else {
    let d = '';
    const turns = TAU * 2.4;
    for (let a = 0; a <= turns; a += 0.16) {
      const r = 3 + (a / turns) * 33;
      d += `${a ? 'L' : 'M'}${f(sx + Math.cos(a) * r)},${f(sy + 40 + Math.sin(a) * r * 1.08)}`;
    }
    s += `<path d="${d}" fill="none" stroke="${fill}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`;
    s += p.crumbs(sx - 38, sy, 76, 84, 10, [mix(fill, 0.15)], 1.6);
  }
  s += `</g>`;
  return s;
}

function drawTart(p, v) {
  const cx = 200;
  const cy = 150;
  const rx = 118;
  const ry = 38;
  const h = 26;
  const crust = color(v.crust, '#D99A52');
  const cream = color(v.cream, '#FBE7B0');
  let s = p.plate(cx, cy + h + 6, 160, 46);
  s += p.cylinder({ cx, cy, rx, ry, h, side: crust, top: mix(crust, 0.12) });
  for (let i = 0; i <= 26; i++) {
    const t = Math.PI * (i / 26);
    const x = cx + rx * Math.cos(t);
    const y = cy + ry * Math.sin(t);
    s += `<path d="M${f(x)},${f(y + 2)}L${f(x)},${f(y + h - 2)}" stroke="${mix(crust, -0.18)}" stroke-width="1.4" opacity=".6"/>`;
  }
  s += `<ellipse cx="${cx}" cy="${cy + 1}" rx="${rx - 11}" ry="${ry - 7}" fill="${cream}"/>`;
  const a = { cx, cy: cy + 1, rx: rx - 22, ry: ry - 12 };
  if (v.style === 'pasca') {
    const braid = (x1, y1, x2, y2) => {
      let d = '';
      const n = 9;
      for (let i = 0; i < n; i++) {
        const x = x1 + ((x2 - x1) * (i + 0.5)) / n;
        const y = y1 + ((y2 - y1) * (i + 0.5)) / n;
        d += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="9" ry="6" fill="${crust}" stroke="${mix(crust, -0.2)}" stroke-width="1.2" transform="rotate(${i % 2 ? 30 : -30} ${f(x)} ${f(y)})"/>`;
      }
      return d;
    };
    s += braid(cx - 92, cy + 1, cx + 92, cy + 1) + braid(cx, cy - 24, cx, cy + 26);
    s += p.sugarDust(Array.from({ length: 30 }, () => [cx + p.rnd(-90, 90), cy + p.rnd(-20, 20)]), 1.1).replaceAll('#fff', '#C99A55');
    return s;
  }
  const pts = p.topPoints(a.cx, a.cy, a.rx, a.ry, 14, 0.95);
  pts.forEach(({ x, y }, i) => {
    const k = i % 4;
    if (k === 0) s += p.strawberryHalf(x, y - 6, 10, p.rnd(-30, 30));
    else if (k === 1) s += p.blueberry(x, y - 4, 6.5);
    else if (k === 2) s += p.kiwi(x, y, 13, true);
    else s += p.raspberry(x, y - 5, 7.5);
  });
  s += `<ellipse cx="${cx - 30}" cy="${cy - 10}" rx="50" ry="8" fill="#fff" opacity=".18"/>`;
  return s;
}

function drawSavarin(p, v) {
  const cx = 200;
  const cy = 162;
  const rx = 82;
  const ry = 24;
  const h = 56;
  const body = color(v.body, '#D58E3E');
  let s = p.plate(cx, cy + h + 6, 150, 40);
  s += p.cylinder({ cx, cy, rx, ry, h, side: body, top: mix(body, -0.1) });
  s += `<path d="M${cx - rx + 12},${cy + 12}Q${cx - 30},${cy + 30} ${cx - 10},${cy + 28}" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".35"/>`;
  for (let i = 0; i < 18; i++) {
    const x = cx + p.rnd(-rx * 0.9, rx * 0.9);
    const y = cy + ry * Math.sqrt(Math.max(0, 1 - ((x - cx) / rx) ** 2)) + p.rnd(6, h - 4);
    s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(p.rnd(1, 2.2))}" fill="${mix(body, -0.25)}" opacity=".6"/>`;
  }
  s += p.cloud(cx, cy - 18, 46, color(v.cream, COLORS.whipped));
  s += p.cherry(cx + 4, cy - 70, 10);
  if (v.orange !== false) s += `<path d="M${cx - 34},${cy - 34}q10,-8 20,-2M${cx + 24},${cy - 40}q8,-6 18,0" fill="none" stroke="#F08A24" stroke-width="3" stroke-linecap="round"/>`;
  return s;
}

function drawRoll(p, v) {
  const outer = color(v.outer, '#E9B26A');
  const cream = color(v.cream, '#FFF6E8');
  const sponge = color(v.sponge, outer);
  const isLog = v.style === 'log';
  let s = p.plate(196, 212, 176, 40);
  const x0 = 76;
  const x1 = 276;
  const yc = 160;
  const r = 46;
  s += p.shadow(178, 206, 120, 9, 0.14);
  s += `<path d="M${x0},${yc - r}L${x1},${yc - r}L${x1},${yc + r}L${x0},${yc + r}A12,${r} 0 0 1 ${x0},${yc - r}Z" fill="${outer}"/>`;
  s += `<path d="M${x0},${yc - r}L${x1},${yc - r}L${x1},${yc + r}L${x0},${yc + r}A12,${r} 0 0 1 ${x0},${yc - r}Z" fill="url(#${p.uid}-vert)"/>`;
  if (isLog) {
    for (let i = 0; i < 7; i++) {
      const y = yc - r + 10 + i * 12;
      let d = `M${x0 + 4},${y}`;
      for (let k = 1; k <= 8; k++) d += `Q${x0 + k * 25 - 12},${f(y + p.rnd(-4, 4))} ${x0 + k * 25},${f(y + p.rnd(-2, 2))}`;
      s += `<path d="${d}" fill="none" stroke="${mix(outer, -0.3)}" stroke-width="2.2" stroke-linecap="round" opacity=".75"/>`;
    }
    s += `<path d="M150,${yc - r + 2}l0,-22a16,7 0 0 1 32,0l0,22Z" fill="${outer}"/><ellipse cx="166" cy="${yc - r - 20}" rx="16" ry="7" fill="${sponge === outer ? '#7A4A30' : sponge}"/><path d="M166,${yc - r - 20}m-9,0a9,4 0 1 0 18,0a6,3 0 1 0 -12,0" fill="none" stroke="${cream}" stroke-width="2"/>`;
  } else {
    s += p.sugarDust(Array.from({ length: 50 }, () => [p.rnd(x0 + 6, x1 - 6), p.rnd(yc - r + 2, yc - r + 22)]), 1.3);
  }
  s += `<ellipse cx="${x1}" cy="${yc}" rx="24" ry="${r}" fill="${mix(outer, -0.12)}"/>`;
  s += `<ellipse cx="${x1}" cy="${yc}" rx="20" ry="${r - 5}" fill="${sponge}"/>`;
  let d = '';
  const turns = TAU * 2.3;
  for (let a = 0; a <= turns; a += 0.12) {
    const k = 0.08 + (a / turns) * 0.86;
    d += `${a ? 'L' : 'M'}${f(x1 + Math.cos(a) * k * 18)},${f(yc + Math.sin(a) * k * (r - 7))}`;
  }
  s += `<path d="${d}" fill="none" stroke="${cream}" stroke-width="5.5" stroke-linecap="round"/>`;
  if (v.jam) s += `<path d="${d}" fill="none" stroke="${color(v.jam, '#C42645')}" stroke-width="2" stroke-linecap="round" opacity=".9"/>`;
  if (isLog) {
    s += p.sugarDust(Array.from({ length: 70 }, () => [p.rnd(x0 + 6, x1 - 6), p.rnd(yc - r - 2, yc - r + 14)]), 1.5);
    s += p.hollyLeaf(100, yc - r - 4, 13, -25) + p.hollyLeaf(112, yc - r - 2, 13, 205) + p.ball(112, yc - r - 8, 5, '#C81E3A') + p.ball(121, yc - r - 5, 5, '#C81E3A');
    const mush = (x, y, rr) => `<rect x="${f(x - rr * 0.25)}" y="${f(y)}" width="${f(rr * 0.5)}" height="${f(rr * 0.9)}" rx="${f(rr * 0.2)}" fill="#F6EEE2"/><path d="M${f(x - rr)},${f(y + 2)}Q${f(x)},${f(y - rr * 1.2)} ${f(x + rr)},${f(y + 2)}Z" fill="#E9D7BF"/><circle cx="${f(x - rr * 0.3)}" cy="${f(y - rr * 0.3)}" r="1.6" fill="#A9774A"/>`;
    s += mush(222, yc - r - 18, 13) + mush(244, yc - r - 10, 9);
  } else if (v.topping === 'berries') {
    s += p.dollop(120, yc - r + 4, 10, cream) + p.dollop(170, yc - r + 4, 10, cream) + p.dollop(220, yc - r + 4, 10, cream);
    s += p.raspberry(120, yc - r - 14, 6) + p.blueberry(170, yc - r - 13, 5.5) + p.raspberry(220, yc - r - 14, 6);
  }
  return s;
}

function drawPlatter(p) {
  let s = `<ellipse cx="200" cy="216" rx="190" ry="68" fill="#3a2320" opacity=".09"/><ellipse cx="200" cy="208" rx="188" ry="66" fill="#e8ddd2"/><ellipse cx="200" cy="204" rx="188" ry="66" fill="#fff"/><ellipse cx="200" cy="205" rx="160" ry="52" fill="#f6f0ea"/>`;
  const miniTart = (x, y, k) =>
    p.cylinder({ cx: x, cy: y - 7 * k, rx: 17 * k, ry: 6 * k, h: 9 * k, side: '#D99A52', top: '#F9E3A8' }) + p.raspberry(x, y - 12 * k, 5 * k);
  const miniEclair = (x, y, k) => `<rect x="${f(x - 20 * k)}" y="${f(y - 12 * k)}" width="${f(40 * k)}" height="${f(13 * k)}" rx="${f(6.5 * k)}" fill="${COLORS.pastry}"/><rect x="${f(x - 19 * k)}" y="${f(y - 14 * k)}" width="${f(38 * k)}" height="${f(8 * k)}" rx="${f(4 * k)}" fill="${p.pick([COLORS.chocolate, '#F2A9BC', '#9DBB6A'])}"/>`;
  const miniSquare = (x, y, k) => {
    const c = p.pick(['#4A2A1C', '#F6E2B5', '#C83A57']);
    return `<rect x="${f(x - 13 * k)}" y="${f(y - 18 * k)}" width="${f(22 * k)}" height="${f(18 * k)}" fill="${COLORS.cocoaSponge}"/><rect x="${f(x - 13 * k)}" y="${f(y - 18 * k)}" width="${f(22 * k)}" height="${f(6 * k)}" fill="${c}"/><path d="M${f(x + 9 * k)},${f(y - 18 * k)}l${f(8 * k)},${f(-5 * k)}l0,${f(18 * k)}l${f(-8 * k)},${f(5 * k)}Z" fill="${mix(COLORS.cocoaSponge, -0.2)}"/><path d="M${f(x - 13 * k)},${f(y - 18 * k)}l${f(8 * k)},${f(-5 * k)}l${f(22 * k)},0l${f(-8 * k)},${f(5 * k)}Z" fill="${mix(c, 0.1)}"/>`;
  };
  const items = [miniTart, miniEclair, miniSquare, (x, y, k) => p.truffle(x, y - 10 * k, 10 * k, p.pick(['cocoa', 'coconut', 'drizzle'])), (x, y, k) => p.macaron(x, y, 28 * k, p.pick(['#F4A7B9', '#B9D98C', '#F7D774', '#C9B2E8']))];
  const rows = [
    { y: 176, xs: [118, 172, 226, 280], k: 1.25 },
    { y: 212, xs: [84, 144, 204, 264, 322], k: 1.4 },
    { y: 252, xs: [128, 196, 264], k: 1.55 },
  ];
  let idx = 0;
  for (const row of rows) for (const x of row.xs) s += items[idx++ % items.length](x, row.y, row.k);
  return s;
}

const KINDS = {
  cake: drawCake,
  slice: drawSlice,
  square: drawSquare,
  eclair: drawEclair,
  cup: drawCup,
  cookies: drawCookies,
  macarons: drawMacarons,
  truffles: drawTruffles,
  cozonac: drawCozonac,
  tart: drawTart,
  savarin: drawSavarin,
  roll: drawRoll,
  platter: drawPlatter,
};

export const ILLUSTRATION_KINDS = Object.keys(KINDS);

/**
 * Generează ilustrația SVG a unui produs.
 * @param {object} visual rețeta vizuală
 * @param {{seed?: string, label?: string, uid?: string}} opts
 */
export function renderProductSvg(visual = {}, opts = {}) {
  const v = visual && typeof visual === 'object' ? visual : {};
  const seed = opts.seed || JSON.stringify(v);
  const uid = opts.uid || 'p' + Math.floor(seededRandom(seed)() * 1e8).toString(36);
  const p = createPainter(uid, seed);
  const draw = KINDS[v.kind] || drawCake;
  const bg = color(v.bg, '#FCEBEF');
  const label = opts.label ? ` role="img" aria-label="${esc(opts.label)}"` : ' aria-hidden="true"';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"${label}>${p.defs()}${p.background(bg, 400, 300)}${draw(p, v)}</svg>`;
}

/* ------------------------------------------------------------------------ */
/* Tortul personalizat (1–3 etaje)                                          */
/* ------------------------------------------------------------------------ */

/**
 * @param {object} s starea tortului, cu valori deja rezolvate:
 *   { tiers, scale, color, finish, sponge, cream, filling, dripColor,
 *     toppings: string[], extras: string[], message }
 */
export function renderCustomCakeSvg(s, opts = {}) {
  const uid = opts.uid || 'cc';
  const p = createPainter(uid, 'custom-cake');
  const W = 400;
  const H = 400;
  const tiers = Math.max(1, Math.min(3, s.tiers || 1));
  const scale = s.scale || 1;
  const exterior = color(s.color, '#FFF7EC');
  const sponge = color(s.sponge, COLORS.sponge);
  const cream = color(s.cream, COLORS.cream);
  const filling = s.filling ? color(s.filling, '#7B2D4F') : null;
  const finish = s.finish || 'crema';
  const dripColor = color(s.dripColor, isDark(exterior) ? '#F3E3C3' : '#3B2218');
  const toppings = new Set(s.toppings || []);
  const extras = new Set(s.extras || []);

  const specs = {
    1: [{ rx: 118 * scale, h: 124 }],
    2: [
      { rx: 128, h: 100 },
      { rx: 88, h: 88 },
    ],
    3: [
      { rx: 130, h: 84 },
      { rx: 98, h: 74 },
      { rx: 66, h: 64 },
    ],
  }[tiers];

  const cx = 200;
  const plateY = 330;
  let out = opts.bg === 'transparent' ? '' : p.background(opts.bg || '#FBEFF1', W, H);
  out += p.stand(cx, plateY, 172, 40, 386);

  let bottom = plateY - 3;
  const tops = [];
  for (let i = 0; i < specs.length; i++) {
    const { rx, h } = specs[i];
    const ry = rx * 0.25;
    const cy = bottom - h;
    let side = exterior;
    const bands = [];
    if (finish === 'naked') {
      side = sponge;
      const n = 3;
      for (let k = 0; k < n; k++) {
        const from = (k + 1) / (n + 1) - 0.035;
        bands.push({ from, to: from + 0.07, color: cream });
        if (filling) bands.push({ from: from + 0.018, to: from + 0.052, color: filling });
      }
      bands.push({ from: 0, to: 1, color: exterior, opacity: 0.38 });
    }
    out += p.cylinder({ cx, cy, rx, ry, h, side, bands });
    if (finish === 'fondant') {
      out += `<path d="M${f(cx - rx * 0.55)},${f(cy + ry + 8)}L${f(cx - rx * 0.5)},${f(cy + h + ry * 0.6)}" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".25"/>`;
      out += p.beads(cx, bottom, rx, ry, mix(exterior, 0.5), Math.round(rx / 5.5), 4.5);
    }
    if (finish === 'crema') out += p.border(cx, bottom - 2, rx, ry, mix(exterior, 0.25), Math.round(rx / 6.5), 8, 'front');
    if (extras.has('aur') || toppings.has('aur')) {
      for (let k = 0; k < 6; k++) {
        const x = cx + p.rnd(-rx * 0.8, rx * 0.8);
        const y = cy + ry * Math.sqrt(Math.max(0, 1 - ((x - cx) / rx) ** 2)) + p.rnd(10, h - 10);
        out += p.goldFlake(x, y, p.rnd(3, 5.5));
      }
    }
    if (finish === 'drip') out += p.drip({ cx, cy, rx, ry, color: dripColor, depth: Math.min(34, h * 0.36), count: Math.round(rx / 13) });
    else {
      out += `<ellipse cx="${cx}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${finish === 'naked' ? cream : mix(exterior, 0.12)}"/>`;
      out += `<ellipse cx="${f(cx - rx * 0.15)}" cy="${f(cy - ry * 0.2)}" rx="${f(rx * 0.6)}" ry="${f(ry * 0.45)}" fill="#fff" opacity=".14"/>`;
    }
    if (finish === 'crema' && i < specs.length - 1) out += p.border(cx, cy, rx * 0.93, ry * 0.9, mix(exterior, 0.25), Math.round(rx / 7), 8, 'front');
    tops.push({ cx, cy, rx, ry, h, bottom });
    bottom = cy + ry * 0.2;
  }

  const t = tops[tops.length - 1];
  const area = { cx: t.cx, cy: t.cy, rx: t.rx * 0.72, ry: t.ry * 0.72 };
  const creamTop = finish === 'drip' ? '#FFFDF8' : mix(exterior, 0.3);
  if (finish === 'crema' || finish === 'drip' || toppings.has('bezea')) {
    out += p.border(t.cx, t.cy, t.rx * 0.86, t.ry * 0.84, toppings.has('bezea') ? '#FFFDF8' : creamTop, Math.max(8, Math.round(t.rx / 8)), 10, 'back');
  }
  if (extras.has('poza')) {
    const clip = `${uid}-photo`;
    out += `<clipPath id="${clip}"><ellipse cx="${t.cx}" cy="${f(t.cy)}" rx="${f(t.rx * 0.55)}" ry="${f(t.ry * 0.55)}"/></clipPath>`;
    out += `<g clip-path="url(#${clip})"><rect x="${f(t.cx - t.rx)}" y="${f(t.cy - t.ry)}" width="${f(t.rx * 2)}" height="${f(t.ry * 2)}" fill="#BFE0F4"/><circle cx="${f(t.cx + t.rx * 0.2)}" cy="${f(t.cy - t.ry * 0.25)}" r="${f(t.ry * 0.25)}" fill="#FFD66B"/><path d="M${f(t.cx - t.rx)},${f(t.cy + t.ry * 0.5)}L${f(t.cx - t.rx * 0.2)},${f(t.cy - t.ry * 0.2)}L${f(t.cx + t.rx * 0.2)},${f(t.cy + t.ry * 0.2)}L${f(t.cx + t.rx * 0.4)},${f(t.cy)}L${f(t.cx + t.rx)},${f(t.cy + t.ry * 0.5)}Z" fill="#7DBF7A"/></g>`;
    out += `<ellipse cx="${t.cx}" cy="${f(t.cy)}" rx="${f(t.rx * 0.55)}" ry="${f(t.ry * 0.55)}" fill="none" stroke="#fff" stroke-width="2.5"/>`;
  }
  if (toppings.has('fructe')) {
    const pts = p.topPoints(area.cx, area.cy, area.rx, area.ry, extras.has('poza') ? 5 : 9, extras.has('poza') ? 0.95 : 0.6);
    pts.forEach(({ x, y }, i) => {
      if (i % 3 === 0) out += p.strawberry(x, y - 8, 8.5, p.rnd(-25, 25));
      else if (i % 3 === 1) out += p.blueberry(x, y - 4, 6.5);
      else out += p.raspberry(x, y - 5, 7.5);
    });
  }
  if (toppings.has('macarons')) {
    out += p.macaron(t.cx - 26, t.cy + 2, 26, '#F4A7B9') + p.macaron(t.cx + 4, t.cy - 4, 26, '#C9B2E8') + p.macaron(t.cx + 30, t.cy + 3, 26, '#B9D98C');
  }
  if (extras.has('artificii')) {
    for (const [dx, h] of [
      [-t.rx * 0.35, 70],
      [t.rx * 0.3, 60],
    ]) {
      const x = t.cx + dx;
      const y0 = t.cy - 2;
      out += `<path d="M${f(x)},${f(y0)}L${f(x)},${f(y0 - h)}" stroke="#9B9B9B" stroke-width="2.2"/>`;
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * TAU;
        const r = 8 + (k % 2) * 6;
        out += `<path d="M${f(x)},${f(y0 - h)}L${f(x + Math.cos(a) * r)},${f(y0 - h + Math.sin(a) * r)}" stroke="#FFC94A" stroke-width="2" stroke-linecap="round"/>`;
      }
      out += `<circle cx="${f(x)}" cy="${f(y0 - h)}" r="4" fill="#FFF3B0"/>`;
    }
  }
  if (extras.has('topper')) {
    const x = t.cx + (extras.has('artificii') ? 0 : 0);
    const y0 = t.cy - 4;
    out += `<path d="M${f(x - 18)},${f(y0)}L${f(x - 18)},${f(y0 - 46)}M${f(x + 18)},${f(y0)}L${f(x + 18)},${f(y0 - 46)}" stroke="${COLORS.gold}" stroke-width="2.5"/>`;
    out += `<path d="M${f(x)},${f(y0 - 44)}C${f(x - 34)},${f(y0 - 70)} ${f(x - 22)},${f(y0 - 96)} ${f(x)},${f(y0 - 78)}C${f(x + 22)},${f(y0 - 96)} ${f(x + 34)},${f(y0 - 70)} ${f(x)},${f(y0 - 44)}Z" fill="${COLORS.gold}"/><path d="M${f(x - 10)},${f(y0 - 80)}q4,-6 10,-2" fill="none" stroke="#FFF3C4" stroke-width="2.5" stroke-linecap="round"/>`;
  }
  if (finish === 'crema' || finish === 'drip' || toppings.has('bezea')) {
    out += p.border(t.cx, t.cy, t.rx * 0.86, t.ry * 0.84, toppings.has('bezea') ? '#FFFDF8' : creamTop, Math.max(8, Math.round(t.rx / 8)), 10, 'front', toppings.has('fructe') ? 'berry' : undefined);
  }
  if (toppings.has('flori')) {
    const cols = ['#F7A8B8', '#FFFFFF', '#F4C27A', '#E87D98'];
    const spots = [];
    const top = tops[tops.length - 1];
    spots.push([top.cx - top.rx * 0.55, top.cy - 2, 13], [top.cx - top.rx * 0.3, top.cy + top.ry * 0.5, 11], [top.cx - top.rx * 0.8, top.cy + top.ry * 0.3, 10]);
    for (let i = tops.length - 1; i >= 0; i--) {
      const tt = tops[i];
      spots.push([tt.cx - tt.rx * 0.82, tt.cy + tt.ry + tt.h * 0.3, 11], [tt.cx - tt.rx * 0.62, tt.cy + tt.ry + tt.h * 0.62, 9]);
    }
    spots.forEach(([x, y, r], i) => {
      out += p.leaf(x - 4, y + 3, r * 0.6, 160 + i * 17) + p.flower(x, y, r, cols[i % cols.length]);
    });
  }
  const msg = String(s.message || '').trim().slice(0, 40);
  if (msg) {
    const bottomTier = tops[0];
    const tier = tops.length > 1 ? tops[0] : bottomTier;
    const width = tier.rx * 1.45;
    const size = Math.max(11, Math.min(26, (width / Math.max(4, msg.length)) * 1.85));
    const ty = tier.cy + tier.ry + tier.h * (finish === 'drip' ? 0.62 : 0.52);
    const fg = isDark(finish === 'naked' ? mix(sponge, 0.3) : exterior) ? '#FFF6E8' : '#5A2A2A';
    out += `<text x="${cx}" y="${f(ty)}" text-anchor="middle" font-family="'Fraunces Variable', 'Fraunces', Georgia, serif" font-style="italic" font-weight="600" font-size="${f(size)}" fill="${fg}">${esc(msg)}</text>`;
  }
  const label = opts.label ? ` role="img" aria-label="${esc(opts.label)}"` : ' aria-hidden="true"';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"${label}>${p.defs()}${out}</svg>`;
}
