// Exporting: PNG strip, 4x6 print sheet, animated GIF, native share and print.

import { GIFEncoder, quantize, applyPalette } from './vendor/gifenc.js';
import { renderFull, photoToCanvas, exportScale } from './render.js';
import { getLayout } from './layouts.js';

export function canvasToBlob(canvas, type = 'image/png', quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('The image could not be created.'))), type, quality);
  });
}

export function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

export function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 15000);
}

export async function stripBlob(state) {
  const scale = exportScale(state.layout, state.photos.length);
  return canvasToBlob(renderFull(state, scale));
}

// A 4 x 6 inch sheet at 300 dpi. Tall strips are printed twice side by side
// with a cut line; other layouts are centered once.
export async function sheetBlob(state) {
  const SW = 1200;
  const SH = 1800;
  const layout = getLayout(state.layout, state.photos.length);
  const sheet = document.createElement('canvas');
  sheet.width = SW;
  sheet.height = SH;
  const ctx = sheet.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, SW, SH);

  const tall = layout.H / layout.W >= 1.5;
  if (tall) {
    const k = Math.min(SW / 2 / layout.W, SH / layout.H);
    const strip = renderFull(state, k);
    const y = (SH - strip.height) / 2;
    ctx.drawImage(strip, (SW / 2 - strip.width) / 2, y);
    ctx.drawImage(strip, SW / 2 + (SW / 2 - strip.width) / 2, y);
    ctx.strokeStyle = '#c8c8c8';
    ctx.lineWidth = 2;
    ctx.setLineDash([14, 10]);
    ctx.beginPath();
    ctx.moveTo(SW / 2, 0);
    ctx.lineTo(SW / 2, SH);
    ctx.stroke();
  } else {
    const margin = 60;
    const k = Math.min((SW - 2 * margin) / layout.W, (SH - 2 * margin) / layout.H);
    const strip = renderFull(state, k);
    ctx.drawImage(strip, (SW - strip.width) / 2, (SH - strip.height) / 2);
  }
  return canvasToBlob(sheet);
}

export function canShareFiles() {
  try {
    if (!navigator.canShare || !navigator.share) return false;
    const f = new File([new Blob(['x'])], 'x.png', { type: 'image/png' });
    return navigator.canShare({ files: [f] });
  } catch {
    return false;
  }
}

export async function shareBlob(blob, filename) {
  const file = new File([blob], filename, { type: blob.type });
  await navigator.share({ files: [file], title: 'My photo strip' });
}

const nextFrame = () => new Promise((r) => setTimeout(r, 0));

export async function gifBlob(state, onProgress = () => {}) {
  const W = 480;
  const H = 360;
  const gif = GIFEncoder();
  const n = state.photos.length;
  for (let i = 0; i < n; i++) {
    const frame = photoToCanvas(state.photos[i], W, H, {
      mirror: state.mirror,
      filter: state.filter,
      adj: state.adjust && state.adjust[i]
    });
    const { data } = frame.getContext('2d').getImageData(0, 0, W, H);
    const palette = quantize(data, 256, { format: 'rgb565' });
    const index = applyPalette(data, palette, 'rgb565');
    gif.writeFrame(index, W, H, { palette, delay: 800 });
    onProgress((i + 1) / n);
    await nextFrame();
  }
  gif.finish();
  return new Blob([gif.bytes()], { type: 'image/gif' });
}

export async function printSheet(state) {
  const blob = await sheetBlob(state);
  const url = URL.createObjectURL(blob);
  const root = document.getElementById('print-root');
  root.innerHTML = '';
  const img = new Image();
  img.alt = 'Photo strip print sheet';
  root.appendChild(img);
  img.src = url;
  await img.decode();
  const cleanup = () => {
    root.innerHTML = '';
    URL.revokeObjectURL(url);
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  window.print();
}
