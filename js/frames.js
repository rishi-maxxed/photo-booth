// Photo frames. A frame draws the border, mat and decoration around one photo
// and works on any design. Frames are drawn in a fixed 300-unit-wide reference
// slot (FRAME_REF_W) and scaled to whatever size the layout gives the photo,
// so a frame looks the same on a big hero photo and a small banner one.
// The photo itself goes in the inset rectangle.

export const FRAME_REF_W = 300;

import { rng } from './design-kit.js';

function rr(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ---- outline shapes: each builds a closed path inside (x, y, w, h) ----------

const SHAPES = {
  rect(ctx, x, y, w, h, f) {
    rr(ctx, x, y, w, h, f.radius || 0);
  },

  // Postage stamp: semicircle notches all the way round.
  stamp(ctx, x, y, w, h) {
    const r = 7;
    const nx = Math.round(w / (r * 3.2));
    const ny = Math.round(h / (r * 3.2));
    const sx = w / nx;
    const sy = h / ny;
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let i = 0; i < nx; i++) {
      const cx = (i + 0.5) * sx;
      ctx.lineTo(cx - r, 0);
      ctx.arc(cx, 0, r, Math.PI, 0, true);
    }
    ctx.lineTo(w, 0);
    for (let j = 0; j < ny; j++) {
      const cy = (j + 0.5) * sy;
      ctx.lineTo(w, cy - r);
      ctx.arc(w, cy, r, -Math.PI / 2, Math.PI / 2, true);
    }
    ctx.lineTo(w, h);
    for (let i = nx - 1; i >= 0; i--) {
      const cx = (i + 0.5) * sx;
      ctx.lineTo(cx + r, h);
      ctx.arc(cx, h, r, 0, Math.PI, true);
    }
    ctx.lineTo(0, h);
    for (let j = ny - 1; j >= 0; j--) {
      const cy = (j + 0.5) * sy;
      ctx.lineTo(0, cy + r);
      ctx.arc(0, cy, r, Math.PI / 2, -Math.PI / 2, true);
    }
    ctx.closePath();
    ctx.restore();
  },

  // Ticket stub: round bites out of the middle of both short sides.
  ticket(ctx, x, y, w, h) {
    const r = Math.min(20, h / 6);
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(w, 0);
    ctx.lineTo(w, h / 2 - r);
    ctx.arc(w, h / 2, r, -Math.PI / 2, Math.PI / 2, true);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.lineTo(0, h / 2 + r);
    ctx.arc(0, h / 2, r, Math.PI / 2, -Math.PI / 2, true);
    ctx.closePath();
    ctx.restore();
  },




  // Hand-drawn: a rectangle whose outline wobbles.
  doodle(ctx, x, y, w, h) {
    const r = rng(17);
    const jit = () => (r() - 0.5) * 6;
    const step = 34;
    const pts = [];
    for (let px = 0; px < w; px += step) pts.push([px + jit(), 2 + jit()]);
    for (let py = 0; py < h; py += step) pts.push([w - 2 + jit(), py + jit()]);
    for (let px = w; px > 0; px -= step) pts.push([px + jit(), h - 2 + jit()]);
    for (let py = h; py > 0; py -= step) pts.push([2 + jit(), py + jit()]);
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    const m0 = mid(pts[pts.length - 1], pts[0]);
    ctx.moveTo(m0[0], m0[1]);
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const m = mid(p, pts[(i + 1) % pts.length]);
      ctx.quadraticCurveTo(p[0], p[1], m[0], m[1]);
    }
    ctx.closePath();
    ctx.restore();
  },

  // 8-bit window: corners cut in square steps.
  pixel(ctx, x, y, w, h) {
    const s = 6;
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(s * 2, 0);
    ctx.lineTo(w - s * 2, 0);
    ctx.lineTo(w - s * 2, s);
    ctx.lineTo(w - s, s);
    ctx.lineTo(w - s, s * 2);
    ctx.lineTo(w, s * 2);
    ctx.lineTo(w, h - s * 2);
    ctx.lineTo(w - s, h - s * 2);
    ctx.lineTo(w - s, h - s);
    ctx.lineTo(w - s * 2, h - s);
    ctx.lineTo(w - s * 2, h);
    ctx.lineTo(s * 2, h);
    ctx.lineTo(s * 2, h - s);
    ctx.lineTo(s, h - s);
    ctx.lineTo(s, h - s * 2);
    ctx.lineTo(0, h - s * 2);
    ctx.lineTo(0, s * 2);
    ctx.lineTo(s, s * 2);
    ctx.lineTo(s, s);
    ctx.lineTo(s * 2, s);
    ctx.closePath();
    ctx.restore();
  }
};

function shapePath(ctx, shape, x, y, w, h, f) {
  (SHAPES[shape] || SHAPES.rect)(ctx, x, y, w, h, f);
}

// ---- frame list -------------------------------------------------------------

const goldFill = (ctx, w, h) => {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#fbe7a1');
  g.addColorStop(0.3, '#c8942f');
  g.addColorStop(0.55, '#f6dc8a');
  g.addColorStop(0.8, '#a9751c');
  g.addColorStop(1, '#f0cf7a');
  return g;
};

export const FRAMES = [
  { id: 'design', name: 'Design default' },
  {
    id: 'soft',
    name: 'Soft round',
    inset: { t: 10, r: 10, b: 10, l: 10 },
    shape: 'rect',
    radius: 32,
    innerRadius: 24,
    fill: '#ffffff',
    shadow: 'soft'
  },
  {
    id: 'gold',
    name: 'Gold frame',
    inset: { t: 26, r: 26, b: 26, l: 26 },
    shape: 'rect',
    radius: 3,
    innerRadius: 0,
    fill: goldFill,
    shadow: 'soft',
    before(ctx, w, h) {
      ctx.fillStyle = '#fff6df';
      rr(ctx, 11, 11, w - 22, h - 22, 1);
      ctx.fill();
      ctx.strokeStyle = '#8a6a1f';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    },
    after(ctx, w, h, s, r) {
      ctx.strokeStyle = '#8a6a1f';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = '#6e4f12';
      for (const [cx, cy] of [[6, 6], [w - 6, 6], [6, h - 6], [w - 6, h - 6]]) {
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  },
  {
    id: 'stitch',
    name: 'Stitched',
    inset: { t: 20, r: 20, b: 20, l: 20 },
    shape: 'rect',
    radius: 20,
    innerRadius: 8,
    fill: '#f7c8db',
    shadow: 'soft',
    after(ctx, w, h) {
      ctx.save();
      ctx.setLineDash([9, 6]);
      ctx.strokeStyle = '#b8416f';
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      rr(ctx, 9, 9, w - 18, h - 18, 13);
      ctx.stroke();
      ctx.restore();
    }
  },
  {
    id: 'tape',
    name: 'Taped on',
    inset: { t: 14, r: 14, b: 14, l: 14 },
    shape: 'rect',
    radius: 2,
    innerRadius: 0,
    fill: '#ffffff',
    shadow: 'soft',
    after(ctx, w) {
      const strip = (x, y, rot) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.fillStyle = 'rgba(250,222,130,0.85)';
        ctx.fillRect(-40, -13, 80, 26);
        ctx.strokeStyle = 'rgba(190,150,40,0.35)';
        ctx.lineWidth = 1;
        ctx.strokeRect(-40, -13, 80, 26);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        for (let i = -34; i < 36; i += 12) ctx.fillRect(i, -13, 4, 26);
        ctx.restore();
      };
      strip(12, 8, -0.62);
      strip(w - 12, 8, 0.62);
    }
  },
  {
    id: 'stamp',
    name: 'Postage stamp',
    inset: { t: 24, r: 24, b: 24, l: 24 },
    shape: 'stamp',
    innerRadius: 0,
    fill: '#fffdf7',
    shadow: 'soft',
    after(ctx, w, h) {
      ctx.save();
      ctx.strokeStyle = 'rgba(50,50,80,0.55)';
      ctx.fillStyle = 'rgba(50,50,80,0.55)';
      ctx.lineWidth = 2.5;
      const cx = w - 86;
      const cy = h - 48;
      ctx.beginPath();
      ctx.arc(cx, cy, 26, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, 19, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        for (let k = 0; k <= 17; k++) ctx.lineTo(cx + 32 + k * 2, cy - 18 + i * 12 + Math.sin(k / 2.2) * 3);
        ctx.stroke();
      }
      ctx.restore();
    }
  },
  {
    id: 'filmcell',
    name: 'Film cell',
    inset: { t: 10, r: 28, b: 10, l: 28 },
    shape: 'rect',
    radius: 3,
    innerRadius: 0,
    fill: '#121212',
    shadow: 'soft',
    after(ctx, w, h) {
      ctx.fillStyle = '#efe8d4';
      for (let y = 12; y < h - 14; y += 26) {
        rr(ctx, 7, y, 14, 16, 3);
        ctx.fill();
        rr(ctx, w - 21, y, 14, 16, 3);
        ctx.fill();
      }
    }
  },
  {
    id: 'ticket',
    name: 'Ticket stub',
    inset: { t: 14, r: 38, b: 14, l: 38 },
    shape: 'ticket',
    innerRadius: 0,
    fill: '#ffe9a8',
    shadow: 'soft',
    after(ctx, w, h) {
      ctx.save();
      ctx.setLineDash([5, 6]);
      ctx.strokeStyle = 'rgba(120,80,0,0.55)';
      ctx.lineWidth = 2;
      for (const x of [27, w - 27]) {
        ctx.beginPath();
        ctx.moveTo(x, 12);
        ctx.lineTo(x, h - 12);
        ctx.stroke();
      }
      ctx.restore();
    }
  },
  {
    id: 'retro',
    name: 'Retro window',
    inset: { t: 40, r: 12, b: 12, l: 12 },
    shape: 'pixel',
    innerRadius: 0,
    fill: '#bfaeff',
    stroke: { color: '#111111', width: 4 },
    under(ctx, w, h, s, f) {
      ctx.save();
      ctx.translate(8, 8);
      ctx.fillStyle = '#111111';
      shapePath(ctx, 'pixel', 0, 0, w, h, f);
      ctx.fill();
      ctx.restore();
    },
    before(ctx, w) {
      ctx.fillStyle = '#6b4cff';
      ctx.fillRect(10, 10, w - 20, 24);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const x = w - 34 - i * 20;
        ctx.fillRect(x, 15, 13, 13);
        ctx.strokeRect(x, 15, 13, 13);
      }
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(18, 17, 10, 10);
    },
    after(ctx, w, h, s, r) {
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 3;
      ctx.strokeRect(r.x, r.y, r.w, r.h);
    }
  },
  {
    id: 'doodle',
    name: 'Doodle',
    inset: { t: 16, r: 16, b: 16, l: 16 },
    shape: 'doodle',
    innerRadius: 6,
    fill: '#ffffff',
    stroke: { color: '#2a2438', width: 4 },
    shadow: 'soft',
    after(ctx, w, h) {
      ctx.save();
      ctx.strokeStyle = '#2a2438';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      const sparkle = (x, y, s) => {
        ctx.beginPath();
        ctx.moveTo(x - s, y);
        ctx.lineTo(x + s, y);
        ctx.moveTo(x, y - s);
        ctx.lineTo(x, y + s);
        ctx.moveTo(x - s * 0.6, y - s * 0.6);
        ctx.lineTo(x + s * 0.6, y + s * 0.6);
        ctx.moveTo(x + s * 0.6, y - s * 0.6);
        ctx.lineTo(x - s * 0.6, y + s * 0.6);
        ctx.stroke();
      };
      sparkle(w - 26, 24, 9);
      sparkle(24, h - 26, 7);
      ctx.restore();
    }
  }
];

export function getFrame(id) {
  return FRAMES.find((f) => f.id === id) || FRAMES[0];
}

export function frameRect(f, w, h) {
  const i = f.inset;
  return { x: i.l, y: i.t, w: w - i.l - i.r, h: h - i.t - i.b };
}

// Draws the frame and the photo. makeTile(pxW, pxH) must return a canvas of
// the photo already cropped (and filtered) to that pixel size.
export function drawFramedPhoto(ctx, w, h, f, scale, makeTile) {
  const r = frameRect(f, w, h);
  ctx.save();
  if (f.under) f.under(ctx, w, h, scale, f);

  ctx.save();
  if (f.shadow === 'soft') {
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 16 * scale;
    ctx.shadowOffsetY = 5 * scale;
  }
  shapePath(ctx, f.shape, 0, 0, w, h, f);
  ctx.fillStyle = typeof f.fill === 'function' ? f.fill(ctx, w, h) : f.fill;
  ctx.fill();
  ctx.restore();

  if (f.stroke) {
    shapePath(ctx, f.shape, 0, 0, w, h, f);
    ctx.strokeStyle = f.stroke.color;
    ctx.lineWidth = f.stroke.width;
    ctx.stroke();
  }
  if (f.before) f.before(ctx, w, h, scale);

  ctx.save();
  rr(ctx, r.x, r.y, r.w, r.h, f.innerRadius || 0);
  ctx.clip();
  ctx.drawImage(makeTile(r.w * scale, r.h * scale), r.x, r.y, r.w, r.h);
  ctx.restore();

  if (f.after) f.after(ctx, w, h, scale, r);
  ctx.restore();
}
