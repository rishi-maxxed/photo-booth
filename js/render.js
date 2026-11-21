// Canvas compositing: background, photos (cover-cropped, filtered, framed),
// caption/date footer and emoji stickers.

import { getLayout } from './layouts.js';
import { getDesign, getFont } from './designs.js';
import { stickerImage } from './stickers.js';
import { applyFilter } from './filters.js';
import { getFrame, frameRect, drawFramedPhoto, FRAME_REF_W } from './frames.js';
import { ADJ_MAX_ZOOM } from './store.js';

const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const M = 36;

export function formatDate(d = new Date()) {
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function roundRectPath(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Which part of the photo fills a tile of aspect `da` (width / height).
// adj = { z, px, py }: zoom (1 = cover-crop) and where the crop sits inside the
// leftover room, 0 to 1 on each axis. Missing values give the default crop.
export function cropRect(photo, da, adj) {
  const z = Math.min(ADJ_MAX_ZOOM, Math.max(1, (adj && adj.z) || 1));
  const px = Math.min(1, Math.max(0, adj && adj.px != null ? adj.px : 0.5));
  const py = Math.min(1, Math.max(0, adj && adj.py != null ? adj.py : 0.4));
  let sw;
  let sh;
  if (photo.width / photo.height > da) {
    sh = photo.height;
    sw = sh * da;
  } else {
    sw = photo.width;
    sh = sw / da;
  }
  sw /= z;
  sh /= z;
  const slackX = Math.max(0, photo.width - sw);
  const slackY = Math.max(0, photo.height - sh);
  return { sx: slackX * px, sy: slackY * py, sw, sh, slackX, slackY };
}

// Size (design units) of the visible photo area inside a slot, after the
// design's border or the chosen frame is taken off.
export function photoArea(s, design, frameId) {
  const frame = getFrame(frameId);
  if (frame.inset) {
    const k = s.w / FRAME_REF_W;
    const r = frameRect(frame, FRAME_REF_W, s.h / k);
    return { w: r.w * k, h: r.h * k };
  }
  const b = s.card ? 0 : design.photo.border || 0;
  return { w: s.w - 2 * b, h: s.h - 2 * b };
}

// Crop a photo to w x h pixels (optionally mirrored) and apply a filter.
export function photoToCanvas(photo, w, h, { mirror = false, filter = 'none', adj = null } = {}) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  const ctx = c.getContext('2d', { willReadFrequently: true });
  const { sx, sy, sw, sh } = cropRect(photo, c.width / c.height, adj);
  ctx.imageSmoothingQuality = 'high';
  if (mirror) {
    ctx.translate(c.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(photo, sx, sy, sw, sh, 0, 0, c.width, c.height);
  applyFilter(c, filter);
  return c;
}

function blankTile(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  const g = c.getContext('2d');
  g.fillStyle = '#c9c4d6';
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

function drawSlot(ctx, photo, s, design, state, scale, adj) {
  const ph = design.photo;
  const b = s.card ? 0 : ph.border || 0;
  const outerR = s.card ? 2 : ph.radius || 0;

  ctx.save();
  ctx.translate(s.x + s.w / 2, s.y + s.h / 2);
  ctx.rotate((s.rot * Math.PI) / 180);
  ctx.translate(-s.w / 2, -s.h / 2);

  // A chosen frame replaces the design's own photo border (and the Polaroid card).
  const frame = getFrame(state.frame);
  if (frame.inset) {
    const k = s.w / FRAME_REF_W;
    ctx.scale(k, k);
    drawFramedPhoto(ctx, FRAME_REF_W, s.h / k, frame, scale * k, (pw, ph) =>
      photo ? photoToCanvas(photo, pw, ph, { mirror: state.mirror, filter: state.filter, adj }) : blankTile(pw, ph)
    );
    ctx.restore();
    return;
  }

  if (s.card) {
    const c = s.card;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 18 * scale;
    ctx.shadowOffsetY = 6 * scale;
    ctx.fillStyle = '#fffdf7';
    ctx.fillRect(-c.pad, -c.top, s.w + 2 * c.pad, s.h + c.top + c.bottom);
    ctx.restore();
  } else if (ph.shadow || ph.glow) {
    ctx.save();
    if (ph.glow) {
      ctx.shadowColor = ph.glow;
      ctx.shadowBlur = 22 * scale;
    } else {
      ctx.shadowColor = 'rgba(0,0,0,0.32)';
      ctx.shadowBlur = 14 * scale;
      ctx.shadowOffsetY = 4 * scale;
    }
    roundRectPath(ctx, 0, 0, s.w, s.h, outerR);
    ctx.fillStyle = ph.borderColor || '#000';
    ctx.fill();
    ctx.restore();
  }

  if (b > 0) {
    roundRectPath(ctx, 0, 0, s.w, s.h, outerR);
    ctx.fillStyle = ph.borderColor;
    ctx.fill();
  }

  const iw = s.w - 2 * b;
  const ih = s.h - 2 * b;
  if (photo) {
    const tile = photoToCanvas(photo, iw * scale, ih * scale, {
      mirror: state.mirror,
      filter: state.filter,
      adj
    });
    ctx.save();
    roundRectPath(ctx, b, b, iw, ih, Math.max(0, outerR - b * 0.5));
    ctx.clip();
    ctx.drawImage(tile, b, b, iw, ih);
    ctx.restore();
  } else {
    ctx.fillStyle = '#c9c4d6';
    ctx.fillRect(b, b, iw, ih);
  }

  if (s.card) {
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0, 0, s.w, s.h);
  } else if (ph.stroke) {
    ctx.save();
    if (ph.glow) {
      ctx.shadowColor = ph.glow;
      ctx.shadowBlur = 14 * scale;
    }
    roundRectPath(ctx, 0, 0, s.w, s.h, outerR);
    ctx.strokeStyle = ph.stroke.color;
    ctx.lineWidth = ph.stroke.width;
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function drawFooter(ctx, layout, design, state, scale) {
  const caption = state.caption.trim();
  const date = state.showDate ? formatDate() : '';
  if (!caption && !date) return;

  const f = layout.footer;
  let rect = { x: f.x, y: f.y, w: f.w, h: f.h };
  if (design.plate) {
    const inset = f.w > 500 ? M : 10;
    rect = { x: f.x + inset, y: f.y + 10, w: f.w - 2 * inset, h: f.h - 20 };
    ctx.save();
    roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, design.plate.radius);
    ctx.fillStyle = design.plate.color;
    ctx.fill();
    ctx.restore();
  }

  const font = getFont(state.font);
  const opts = textOptions(state);
  const pad = design.plate ? 30 : M;
  const maxW = rect.w - 2 * pad;
  const shaped = opts.shape !== 'straight';
  const align = shaped ? 'center' : opts.align;
  const ax = align === 'left' ? rect.x + pad : align === 'right' ? rect.x + rect.w - pad : rect.x + rect.w / 2;
  const fill = opts.color || design.ink;
  const edge = lum(fill) > 0.6 ? '#111111' : '#ffffff';
  const dateFamily =
    state.font === 'pixel' || state.font === 'mono' ? font.family : '"Bricolage Grotesque", system-ui, sans-serif';
  const dateWeight = state.font === 'pixel' ? '400' : '700';
  const pixelDate = state.font === 'pixel';

  ctx.save();
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';

  // sizes
  let capSize = 0;
  if (caption) {
    capSize = 56 * font.scale * opts.size;
    ctx.font = `${font.weight} ${capSize}px ${font.family}`;
    const w = ctx.measureText(caption).width;
    const limit = opts.style === 'sticker' && !shaped ? maxW - 44 : maxW;
    if (w > limit) capSize *= limit / w;
    ctx.font = `${font.weight} ${capSize}px ${font.family}`;
  }
  const boxed = opts.dateStyle === 'film' || opts.dateStyle === 'digital';
  let dateSize = caption ? (pixelDate ? 14 : 26) : pixelDate ? 20 : 34;
  if (opts.dateStyle === 'digital') dateSize = caption ? 14 : 20;
  else if (opts.dateStyle !== 'plain') dateSize = caption ? 26 : 34;
  const datePad = boxed ? 14 : opts.dateStyle === 'stamp' ? 12 : 0;
  const gap = caption && date ? 10 : 0;
  const blockFor = (s) => (caption ? s + (opts.style === 'sticker' && !shaped ? 22 : 0) + (opts.shape === 'arc' ? s * 0.5 : opts.shape === 'wave' ? s * 0.4 : 0) : 0);
  const dateBlock = date ? dateSize + datePad : 0;
  // big text, labels and curves must still fit the footer
  while (caption && capSize > 14 && blockFor(capSize) + gap + dateBlock > rect.h - 14) capSize *= 0.95;
  if (caption) ctx.font = `${font.weight} ${capSize}px ${font.family}`;
  const capBlock = blockFor(capSize);
  const total = capBlock + gap + dateBlock;
  let y = rect.y + (rect.h - total) / 2;

  if (caption) {
    const cy = y + capBlock / 2;
    drawCaption(ctx, caption, { x: ax, y: cy, size: capSize, align, fill, edge, opts, shaped, font, design, scale });
    y += capBlock + gap;
  }
  if (date) {
    drawDate(ctx, date, { x: ax, y: y + (dateSize + datePad) / 2, size: dateSize, align, fill, dateFamily, dateWeight, opts, design, scale, font, maxW });
  }
  ctx.restore();
}

function lum(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return 0;
  const n = parseInt(m[1], 16);
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

export const TEXT_DEFAULTS = { textColor: null, textStyle: 'plain', textSize: 1, textAlign: 'center', textShape: 'straight', dateStyle: 'plain' };

function textOptions(state) {
  return {
    color: state.textColor || null,
    style: state.textStyle || 'plain',
    size: state.textSize || 1,
    align: state.textAlign || 'center',
    shape: state.textShape || 'straight',
    dateStyle: state.dateStyle || 'plain'
  };
}

function paintText(ctx, str, x, y, o) {
  const { size, fill, edge, style } = o;
  if (style === 'shadow') {
    ctx.fillStyle = edge;
    ctx.fillText(str, x + size * 0.06, y + size * 0.06);
  } else if (style === 'outline') {
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2, size * 0.16);
    ctx.strokeStyle = edge;
    ctx.strokeText(str, x, y);
  }
  ctx.fillStyle = fill;
  ctx.fillText(str, x, y);
}

function drawCaption(ctx, text, o) {
  const { x, y, size, align, fill, edge, opts, shaped, font, design, scale } = o;
  ctx.font = `${font.weight} ${size}px ${font.family}`;
  const glow = design.glowText && opts.style === 'plain';
  const style = shaped && opts.style === 'sticker' ? 'outline' : opts.style;
  const paint = { size, fill, edge, style: style === 'sticker' ? 'plain' : style };

  if (!shaped) {
    if (opts.style === 'sticker') {
      const w = ctx.measureText(text).width;
      const bw = w + 40;
      const bh = size * 1.2 + 10;
      const bx = align === 'left' ? x : align === 'right' ? x - bw : x - bw / 2;
      const dark = lum(fill) > 0.6;
      ctx.save();
      const pivotX = bx + bw / 2;
      ctx.translate(pivotX, y);
      ctx.rotate(-0.035);
      ctx.translate(-pivotX, -y);
      roundRectPath(ctx, bx + 5, y - bh / 2 + 5, bw, bh, 12);
      ctx.fillStyle = '#111111';
      ctx.fill();
      roundRectPath(ctx, bx, y - bh / 2, bw, bh, 12);
      ctx.fillStyle = dark ? '#111111' : '#ffffff';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#111111';
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillStyle = fill;
      ctx.fillText(text, pivotX, y + size * 0.03);
      ctx.restore();
      return;
    }
    ctx.save();
    if (glow) {
      ctx.shadowColor = fill;
      ctx.shadowBlur = 12 * scale;
    }
    paintText(ctx, text, x, y, paint);
    ctx.restore();
    return;
  }

  // curved or wavy: place one character at a time
  ctx.textAlign = 'center';
  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width);
  const sum = widths.reduce((a, b) => a + b, 0);
  let s = -sum / 2;
  ctx.save();
  if (glow) {
    ctx.shadowColor = fill;
    ctx.shadowBlur = 12 * scale;
  }
  const R = sum * 1.6;
  const rise = R * (1 - Math.cos(sum / 2 / R));
  chars.forEach((c, i) => {
    const mid = s + widths[i] / 2;
    s += widths[i];
    ctx.save();
    if (opts.shape === 'arc') {
      const a = mid / R;
      ctx.translate(x + R * Math.sin(a), y - rise / 2 + R * (1 - Math.cos(a)));
      ctx.rotate(a);
    } else {
      const amp = size * 0.2;
      const k = (Math.PI * 2 * 1.5) / sum;
      ctx.translate(x + mid, y + amp * Math.sin(mid * k));
      ctx.rotate(Math.atan(amp * k * Math.cos(mid * k)));
    }
    paintText(ctx, c, 0, 0, paint);
    ctx.restore();
  });
  ctx.restore();
}

function drawDate(ctx, text, o) {
  const { x, y, size, align, fill, dateFamily, dateWeight, opts, design, scale, font, maxW } = o;
  const now = new Date();
  const two = (n) => String(n).padStart(2, '0');
  const yy = two(now.getFullYear() % 100);
  const mon = now.toLocaleDateString('en', { month: 'short' }).toUpperCase();
  const style = opts.dateStyle;
  ctx.save();
  if (style === 'plain') {
    ctx.font = `${dateWeight} ${size}px ${dateFamily}`;
    ctx.fillStyle = fill;
    if (design.glowText) {
      ctx.shadowColor = fill;
      ctx.shadowBlur = 12 * scale;
    }
    ctx.fillText(text, x, y);
    ctx.restore();
    return;
  }
  let str;
  let family;
  let color;
  let bg = null;
  if (style === 'film') {
    str = `'${yy}  ${two(now.getMonth() + 1)}  ${two(now.getDate())}`;
    family = 'ui-monospace, Consolas, "Courier New", monospace';
    color = '#ff8a1f';
    bg = '#1d1d1d';
  } else if (style === 'digital') {
    str = `${two(now.getDate())}-${two(now.getMonth() + 1)}-${yy}`;
    family = '"Press Start 2P", monospace';
    color = '#6dff6d';
    bg = '#0c140c';
  } else {
    str = `${now.getDate()} ${mon} ${now.getFullYear()}`;
    family = font.id === 'comic' ? font.family : '"Bangers", Impact, sans-serif';
    color = '#e0283a';
  }
  const weight = style === 'film' ? '700' : '400';
  ctx.font = `${weight} ${size}px ${family}`;
  let w = ctx.measureText(str).width;
  const boxW = w + 28;
  const bx = align === 'left' ? x : align === 'right' ? x - boxW : x - boxW / 2;
  const cx = bx + boxW / 2;
  const bh = size + 14;
  if (bg) {
    roundRectPath(ctx, bx, y - bh / 2, boxW, bh, 8);
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.shadowColor = color;
    ctx.shadowBlur = 8 * scale;
  } else {
    ctx.translate(cx, y);
    ctx.rotate(-0.09);
    ctx.translate(-cx, -y);
    ctx.lineWidth = 4;
    ctx.strokeStyle = color;
    roundRectPath(ctx, bx, y - bh / 2, boxW, bh, 5);
    ctx.stroke();
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.fillText(str, cx, y + 1);
  ctx.restore();
}

// One photo with the given design styling and frame on a soft backdrop; used
// for the thumbnails in the editor's Frame tab.
export function renderFramePreview(photo, designId, frameId, { mirror = false, filter = 'none', adj = null } = {}, scale = 0.7) {
  const W = 360;
  const H = 290;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(W * scale);
  canvas.height = Math.round(H * scale);
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#d9cfe9');
  g.addColorStop(1, '#bfb2d6');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const slot = { x: 30, y: 32.5, w: 300, h: 225, rot: 0, card: null };
  drawSlot(ctx, photo, slot, getDesign(designId), { frame: frameId, mirror, filter }, scale, adj);
  return canvas;
}

// Background + photos + footer. Cached by the editor so sticker drags are cheap.
export function renderBase(state, scale) {
  const n = state.photos.length;
  const layout = getLayout(state.layout, n);
  const design = getDesign(state.design);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(layout.W * scale);
  canvas.height = Math.round(layout.H * scale);
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  design.paint(ctx, layout.W, layout.H, layout);
  layout.slots.forEach((s, i) => drawSlot(ctx, state.photos[i], s, design, state, scale, state.adjust && state.adjust[i]));
  drawFooter(ctx, layout, design, state, scale);
  return canvas;
}

export function drawStickers(ctx, stickers, W, H, scale) {
  for (const s of stickers) {
    const px = s.size * Math.min(W, H) * scale;
    ctx.save();
    ctx.translate(s.x * W * scale, s.y * H * scale);
    ctx.rotate(s.rot);
    ctx.shadowColor = 'rgba(0,0,0,0.28)';
    ctx.shadowBlur = 6 * scale;
    ctx.shadowOffsetY = 2 * scale;
    if (s.char.startsWith('svg:')) {
      const img = stickerImage(s.char.slice(4));
      if (img) ctx.drawImage(img, -px * 0.62, -px * 0.62, px * 1.24, px * 1.24);
    } else {
      ctx.font = `${px}px ${EMOJI_FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.char, 0, px * 0.04);
    }
    ctx.restore();
  }
}

// Dashed outline around the photo being adjusted (preview only, never exported).
export function drawSlotOutline(ctx, s, scale) {
  ctx.save();
  ctx.translate((s.x + s.w / 2) * scale, (s.y + s.h / 2) * scale);
  ctx.rotate((s.rot * Math.PI) / 180);
  const w = s.w * scale;
  const h = s.h * scale;
  ctx.lineWidth = 3;
  ctx.setLineDash([9, 6]);
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.lineDashOffset = 7.5;
  ctx.strokeStyle = '#ffffff';
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.restore();
}

// Dashed box around the selected sticker (preview only, never exported).
export function drawSelection(ctx, s, W, H, scale) {
  const r = s.size * Math.min(W, H) * scale * 0.62;
  ctx.save();
  ctx.translate(s.x * W * scale, s.y * H * scale);
  ctx.rotate(s.rot);
  ctx.lineWidth = 2;
  ctx.setLineDash([7, 5]);
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.strokeRect(-r, -r, 2 * r, 2 * r);
  ctx.lineDashOffset = 6;
  ctx.strokeStyle = '#ffffff';
  ctx.strokeRect(-r, -r, 2 * r, 2 * r);
  ctx.restore();
}

export function renderFull(state, scale) {
  const canvas = renderBase(state, scale);
  const layout = getLayout(state.layout, state.photos.length);
  drawStickers(canvas.getContext('2d'), state.stickers, layout.W, layout.H, scale);
  return canvas;
}

export function exportScale(layoutId, n) {
  const { W, H } = getLayout(layoutId, n);
  return Math.min(2, 4800 / Math.max(W, H));
}

export const FONT_LOADS = [
  '56px "Pacifico"',
  '20px "Press Start 2P"',
  '56px "Caveat"',
  '700 24px "Bricolage Grotesque"',
  '800 24px "Bricolage Grotesque"',
  '36px "Shrikhand"',
  '40px "Permanent Marker"',
  '40px "Lobster"',
  '600 40px "Fredoka"',
  '40px "Chewy"',
  '40px "Bungee"',
  '40px "Abril Fatface"',
  '40px "Gloria Hallelujah"',
  '40px "Sacramento"',
  '40px "Bangers"'
];

export async function loadFonts() {
  try {
    await Promise.all(FONT_LOADS.map((f) => document.fonts.load(f, 'Aa 123')));
  } catch {
    /* fall back to system fonts */
  }
}
