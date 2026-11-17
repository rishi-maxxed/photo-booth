// Layout geometry. Everything is in "design units"; the renderer scales the
// canvas so one unit becomes `scale` pixels. Every layout uses all of the
// photos taken (4 or 5) so nothing needs to be chosen or dropped.

const M = 36;   // outer margin
const G = 24;   // gap between photos
const ASPECT = 3 / 4; // height / width of a standard photo slot

export const LAYOUTS = [
  { id: 'classic', name: 'Classic strip' },
  { id: 'grid', name: 'Grid' },
  { id: 'polaroid', name: 'Polaroids' },
  { id: 'banner', name: 'Wide strip' },
  { id: 'hero', name: 'Big and small' }
];

const cache = new Map();

export function getLayout(id, n) {
  const key = `${id}:${n}`;
  if (!cache.has(key)) cache.set(key, build(id, n));
  return cache.get(key);
}

function slot(x, y, w, h, extra = {}) {
  return { x, y, w, h, rot: 0, card: null, ...extra };
}

function build(id, n) {
  switch (id) {
    case 'grid':
      return grid(n);
    case 'polaroid':
      return polaroid(n);
    case 'banner':
      return banner(n);
    case 'hero':
      return hero(n);
    default:
      return classic(n);
  }
}

function classic(n) {
  const W = 600;
  const sw = W - 2 * M;
  const sh = sw * ASPECT;
  const footH = 140;
  const slots = [];
  for (let i = 0; i < n; i++) slots.push(slot(M, M + i * (sh + G), sw, sh));
  const H = M + n * sh + (n - 1) * G + footH;
  return { id: 'classic', W, H, slots, footer: { x: 0, y: H - footH, w: W, h: footH } };
}

function grid(n) {
  const sw = 420;
  const sh = sw * ASPECT;
  const W = 2 * M + 2 * sw + G;
  const rows = Math.ceil(n / 2);
  const slots = [];
  for (let i = 0; i < n; i++) {
    const c = i % 2;
    const r = Math.floor(i / 2);
    slots.push(slot(M + c * (sw + G), M + r * (sh + G), sw, sh));
  }
  const gridH = M + rows * sh + (rows - 1) * G;
  if (n % 2 === 1) {
    // The empty last cell becomes the caption tile.
    const x = M + (sw + G);
    const y = M + (rows - 1) * (sh + G);
    return { id: 'grid', W, H: gridH + M, slots, footer: { x, y, w: sw, h: sh } };
  }
  const footH = 130;
  return { id: 'grid', W, H: gridH + footH, slots, footer: { x: 0, y: gridH, w: W, h: footH } };
}

function polaroid(n) {
  const pw = 400;
  const ph = pw * ASPECT;
  const pad = 22;
  const top = 22;
  const bottom = 74;
  const cardW = pw + 2 * pad;
  const cardH = ph + top + bottom;
  const gap = 36;
  const W = 2 * cardW + 3 * gap;
  const rows = Math.ceil(n / 2);
  const rots = [-5, 4, -3, 6, -4];
  const slots = [];
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / 2);
    const lastAlone = n % 2 === 1 && i === n - 1;
    const colX = lastAlone ? (W - cardW) / 2 : gap + (i % 2) * (cardW + gap);
    const x = colX + pad;
    const y = gap + r * (cardH + gap) + top;
    slots.push(slot(x, y, pw, ph, { rot: rots[i % rots.length], card: { pad, top, bottom } }));
  }
  const footH = 120;
  const H = gap + rows * (cardH + gap) + footH - gap;
  return { id: 'polaroid', W, H, slots, footer: { x: 0, y: H - footH, w: W, h: footH } };
}

function banner(n) {
  const sw = 360;
  const sh = sw * ASPECT;
  const footH = 110;
  const W = 2 * M + n * sw + (n - 1) * G;
  const slots = [];
  for (let i = 0; i < n; i++) slots.push(slot(M + i * (sw + G), M, sw, sh));
  const H = M + sh + footH;
  return { id: 'banner', W, H, slots, footer: { x: 0, y: M + sh, w: W, h: footH } };
}

function hero(n) {
  const W = 900;
  const bw = W - 2 * M;
  const bh = bw * ASPECT;
  const small = n - 1;
  const sw = (bw - (small - 1) * G) / small;
  const sh = sw * ASPECT;
  const slots = [slot(M, M, bw, bh)];
  for (let i = 0; i < small; i++) slots.push(slot(M + i * (sw + G), M + bh + G, sw, sh));
  const footH = 130;
  const H = M + bh + G + sh + footH;
  return { id: 'hero', W, H, slots, footer: { x: 0, y: H - footH, w: W, h: footH } };
}
