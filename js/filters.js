// Photo filters implemented as plain pixel math so they behave the same in every
// browser (CanvasRenderingContext2D.filter is not supported everywhere).

export const FILTERS = [
  { id: 'none', name: 'Original' },
  { id: 'bw', name: 'Black and white' },
  { id: 'sepia', name: 'Sepia' },
  { id: 'vintage', name: 'Vintage' },
  { id: 'warm', name: 'Warm' },
  { id: 'cool', name: 'Cool' },
  { id: 'vivid', name: 'Vivid' },
  { id: 'fade', name: 'Faded' },
  { id: 'noir', name: 'Noir' },
  { id: 'pixel', name: 'Pixel' }
];

const PARAMS = {
  bw: { gray: true, contrast: 1.06 },
  sepia: { sepia: true, contrast: 1.05 },
  vintage: { sat: 0.78, contrast: 0.92, lift: 24, mul: [1.05, 1.0, 0.9], add: [8, 0, -6], vignette: 0.38 },
  warm: { add: [18, 5, -16], sat: 1.1 },
  cool: { add: [-14, 0, 18], sat: 1.05 },
  vivid: { sat: 1.5, contrast: 1.12 },
  fade: { sat: 0.78, contrast: 0.86, lift: 32 },
  noir: { gray: true, contrast: 1.5, bright: -12, vignette: 0.5 },
  pixel: { sat: 1.25, contrast: 1.08, posterize: 6, pixelate: 84 }
};

function colorOp(data, p) {
  const sat = p.sat ?? 1;
  const contrast = p.contrast ?? 1;
  const bright = p.bright ?? 0;
  const lift = p.lift ?? 0;
  const mul = p.mul || [1, 1, 1];
  const add = p.add || [0, 0, 0];
  const levels = p.posterize || 0;
  const step = levels ? 255 / (levels - 1) : 0;
  const lerpK = (255 - lift) / 255;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    if (p.gray) {
      r = g = b = 0.299 * r + 0.587 * g + 0.114 * b;
    } else if (p.sepia) {
      const nr = 0.393 * r + 0.769 * g + 0.189 * b;
      const ng = 0.349 * r + 0.686 * g + 0.168 * b;
      const nb = 0.272 * r + 0.534 * g + 0.131 * b;
      r = nr;
      g = ng;
      b = nb;
    }
    if (sat !== 1) {
      const l = 0.299 * r + 0.587 * g + 0.114 * b;
      r = l + (r - l) * sat;
      g = l + (g - l) * sat;
      b = l + (b - l) * sat;
    }
    if (contrast !== 1) {
      r = (r - 128) * contrast + 128;
      g = (g - 128) * contrast + 128;
      b = (b - 128) * contrast + 128;
    }
    r = r * mul[0] + add[0] + bright;
    g = g * mul[1] + add[1] + bright;
    b = b * mul[2] + add[2] + bright;
    if (lift) {
      r = lift + r * lerpK;
      g = lift + g * lerpK;
      b = lift + b * lerpK;
    }
    if (levels) {
      r = Math.round(Math.max(0, Math.min(255, r)) / step) * step;
      g = Math.round(Math.max(0, Math.min(255, g)) / step) * step;
      b = Math.round(Math.max(0, Math.min(255, b)) / step) * step;
    }
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }
}

function vignette(ctx, w, h, strength) {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

// Applies the filter to the canvas in place and returns it.
export function applyFilter(canvas, id) {
  const p = PARAMS[id];
  if (!p) return canvas;
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (p.pixelate) {
    // Shrink, process the few pixels, then enlarge without smoothing.
    const sw = Math.max(16, Math.min(p.pixelate, w));
    const sh = Math.max(12, Math.round((sw * h) / w));
    const small = document.createElement('canvas');
    small.width = sw;
    small.height = sh;
    const sctx = small.getContext('2d', { willReadFrequently: true });
    sctx.imageSmoothingEnabled = true;
    sctx.drawImage(canvas, 0, 0, sw, sh);
    const img = sctx.getImageData(0, 0, sw, sh);
    colorOp(img.data, p);
    sctx.putImageData(img, 0, 0);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(small, 0, 0, sw, sh, 0, 0, w, h);
    ctx.restore();
    return canvas;
  }

  const img = ctx.getImageData(0, 0, w, h);
  colorOp(img.data, p);
  ctx.putImageData(img, 0, 0);
  if (p.vignette) vignette(ctx, w, h, p.vignette);
  return canvas;
}
