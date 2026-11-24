// ASCII art: turns a canvas into text characters. Used by the ASCII filters (drawn back onto the
// canvas), the text export, and the live preview in the booth.

export const ASCII_STYLES = {
  'ascii-term': { ramp: ' .:-=+*#%@', dark: true, bg: '#0c140c', fg: '#6dff6d' },
  'ascii-color': { ramp: ' .:-=+*#%@', dark: true, bg: '#111111', fg: null },
  'ascii-news': { ramp: ' .,:;i1tfLCG08@', dark: false, bg: '#fbf8ef', fg: '#1a1a1a' },
  'ascii-bin': { ramp: '01', dark: true, bg: '#0c140c', fg: '#6dff6d', binary: true }
};

export const isAscii = (id) => id in ASCII_STYLES;

export const ASCII_DETAIL = { min: 40, max: 120, step: 5, default: 70 };
let detail = ASCII_DETAIL.default;
export function setAsciiDetail(n) {
  detail = Math.max(ASCII_DETAIL.min, Math.min(ASCII_DETAIL.max, Number(n) || ASCII_DETAIL.default));
}

const FONT = 'ui-monospace, "SF Mono", Consolas, "Liberation Mono", "Courier New", monospace';
const CELL_ASPECT = 1.8; // a character cell is this much taller than wide

// Samples a canvas down to a grid of cells: brightness (0..1, auto-contrasted) and colour.
export function sampleGrid(src, cols, rows) {
  const s = document.createElement('canvas');
  s.width = cols;
  s.height = rows;
  const sctx = s.getContext('2d', { willReadFrequently: true });
  sctx.imageSmoothingQuality = 'high';
  sctx.drawImage(src, 0, 0, cols, rows);
  const px = sctx.getImageData(0, 0, cols, rows).data;
  const lum = new Float32Array(cols * rows);
  const hist = new Uint32Array(256);
  for (let i = 0; i < lum.length; i++) {
    const v = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];
    lum[i] = v;
    hist[v | 0]++;
  }
  // stretch between the 2nd and 98th percentile so flat photos still show shape
  let lo = 0;
  let hi = 255;
  let acc = 0;
  for (let v = 0; v < 256; v++) {
    acc += hist[v];
    if (acc >= lum.length * 0.02) {
      lo = v;
      break;
    }
  }
  acc = 0;
  for (let v = 255; v >= 0; v--) {
    acc += hist[v];
    if (acc >= lum.length * 0.02) {
      hi = v;
      break;
    }
  }
  const span = Math.max(24, hi - lo);
  for (let i = 0; i < lum.length; i++) lum[i] = Math.max(0, Math.min(1, (lum[i] - lo) / span));
  return { cols, rows, lum, px };
}

function gridSize(w, h, wantCols) {
  const cols = Math.max(8, Math.min(Math.round(wantCols), Math.floor(w / 5)));
  const cw = w / cols;
  const rows = Math.max(4, Math.round(h / (cw * CELL_ASPECT)));
  return { cols, rows, cw, ch: h / rows };
}

function charFor(style, v) {
  if (style.binary) return v > 0.5 ? '1' : '0';
  const r = style.ramp;
  const t = style.dark ? v : 1 - v;
  return r[Math.min(r.length - 1, Math.floor(t * r.length))];
}

function cellColor(style, grid, i, v) {
  if (style.fg) {
    if (!style.binary) return style.fg;
    return null; // binary varies by alpha, handled by the caller
  }
  // colour text: the photo's own colour, lifted so dark areas stay readable
  const r = grid.px[i * 4];
  const g = grid.px[i * 4 + 1];
  const b = grid.px[i * 4 + 2];
  const k = 1.15 + 0.5 * (1 - v);
  const f = (c) => Math.min(255, Math.round(c * k + 28));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

// Replaces the canvas content with its ASCII version (in place).
export function asciiFilter(canvas, id) {
  const style = ASCII_STYLES[id];
  const w = canvas.width;
  const h = canvas.height;
  const { cols, rows, cw, ch } = gridSize(w, h, detail);
  const grid = sampleGrid(canvas, cols, rows);
  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.fillStyle = style.bg;
  ctx.fillRect(0, 0, w, h);
  ctx.font = `700 ${cw / 0.6}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      const v = grid.lum[i];
      const c = charFor(style, v);
      if (c === ' ') continue;
      if (style.binary) {
        ctx.globalAlpha = 0.28 + 0.72 * v;
        ctx.fillStyle = style.fg;
      } else {
        ctx.fillStyle = cellColor(style, grid, i, v);
      }
      ctx.fillText(c, x * cw + cw / 2, y * ch + ch / 2 + ch * 0.04);
    }
  }
  ctx.restore();
  return canvas;
}

// Plain text version of a canvas, for copying or saving as .txt (bright areas = dense characters).
export function asciiText(canvas, cols = 60, ramp = ASCII_STYLES['ascii-term'].ramp) {
  const cw = canvas.width / cols;
  const rows = Math.max(4, Math.round(canvas.height / (cw * CELL_ASPECT)));
  const grid = sampleGrid(canvas, cols, rows);
  const lines = [];
  for (let y = 0; y < rows; y++) {
    let line = '';
    for (let x = 0; x < cols; x++) line += ramp[Math.min(ramp.length - 1, Math.floor(grid.lum[y * cols + x] * ramp.length))];
    lines.push(line.replace(/\s+$/, ''));
  }
  return lines.join('\n');
}

// Live preview: draws the current video frame as terminal-green text onto an overlay canvas.
export function drawAsciiLive(video, canvas, mirror) {
  const bw = canvas.clientWidth;
  const bh = canvas.clientHeight;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (!bw || !bh || !video.videoWidth) return;
  if (canvas.width !== Math.round(bw * dpr) || canvas.height !== Math.round(bh * dpr)) {
    canvas.width = Math.round(bw * dpr);
    canvas.height = Math.round(bh * dpr);
  }
  const style = ASCII_STYLES['ascii-term'];
  const cols = bw < 520 ? 56 : 96;
  const { rows, cw, ch } = gridSize(canvas.width, canvas.height, cols);
  // cover-crop the video to the overlay's shape
  const va = video.videoWidth / video.videoHeight;
  const ba = canvas.width / canvas.height;
  let sx = 0;
  let sy = 0;
  let sw = video.videoWidth;
  let sh = video.videoHeight;
  if (va > ba) {
    sw = sh * ba;
    sx = (video.videoWidth - sw) / 2;
  } else {
    sh = sw / ba;
    sy = (video.videoHeight - sh) / 2;
  }
  const tmp = liveTmp(cols, rows);
  const tctx = tmp.getContext('2d', { willReadFrequently: true });
  tctx.save();
  if (mirror) {
    tctx.translate(cols, 0);
    tctx.scale(-1, 1);
  }
  tctx.drawImage(video, sx, sy, sw, sh, 0, 0, cols, rows);
  tctx.restore();
  const grid = sampleGrid(tmp, cols, rows);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = style.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = style.fg;
  ctx.font = `700 ${cw / 0.6}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const c = charFor(style, grid.lum[y * cols + x]);
      if (c !== ' ') ctx.fillText(c, x * cw + cw / 2, y * ch + ch / 2 + ch * 0.04);
    }
  }
}

let tmpCanvas = null;
function liveTmp(cols, rows) {
  if (!tmpCanvas) tmpCanvas = document.createElement('canvas');
  if (tmpCanvas.width !== cols || tmpCanvas.height !== rows) {
    tmpCanvas.width = cols;
    tmpCanvas.height = rows;
  }
  return tmpCanvas;
}
