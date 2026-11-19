// Strip designs. Each design paints its own background procedurally (so it is
// sharp at any export size) and describes how photos are framed and how the
// caption looks. Coordinates are design units; the context is pre-scaled.

import { rng, heartPath, sparkle, fillBg } from './design-kit.js';
import { MORE_DESIGNS } from './designs-more.js';

const PIXEL_SPRITES = {
  heart: ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'],
  star: ['...X...', '...X...', 'XXXXXXX', '.XXXXX.', '..XXX..', '.XX.XX.', '.X...X.'],
  bolt: ['...XX', '..XX.', '.XX..', 'XXXXX', '..XX.', '.XX..', 'XX...']
};

function drawSprite(ctx, name, x, y, px, color) {
  const rows = PIXEL_SPRITES[name];
  ctx.fillStyle = color;
  rows.forEach((row, ry) => {
    for (let rx = 0; rx < row.length; rx++) {
      if (row[rx] === 'X') ctx.fillRect(x + rx * px, y + ry * px, px, px);
    }
  });
}

export const DESIGNS = [
  {
    id: 'classic',
    name: 'Classic',
    ink: '#1d1a17',
    photo: { border: 0, radius: 0, stroke: { color: 'rgba(0,0,0,0.18)', width: 1.5 } },
    paint(ctx, W, H) {
      fillBg(ctx, W, H, '#fffdf7');
      ctx.strokeStyle = '#e3ddcf';
      ctx.lineWidth = 2;
      ctx.strokeRect(9, 9, W - 18, H - 18);
    }
  },
  {
    id: 'midnight',
    name: 'Midnight',
    ink: '#ffe3a1',
    photo: { border: 5, borderColor: '#fff8e7', radius: 6 },
    paint(ctx, W, H) {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#0e1a44');
      g.addColorStop(1, '#3d1f70');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      const r = rng(11);
      const count = Math.floor((W * H) / 7000);
      for (let i = 0; i < count; i++) {
        ctx.globalAlpha = 0.35 + r() * 0.65;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(r() * W, r() * H, 0.7 + r() * 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffd77a';
      for (let i = 0; i < 16; i++) {
        sparkle(ctx, r() * W, r() * H, 8 + r() * 10);
        ctx.fill();
      }
    }
  },
  {
    id: 'sunset',
    name: 'Sunset',
    ink: '#fff4e0',
    photo: { border: 6, borderColor: '#fff4e0', radius: 10 },
    paint(ctx, W, H) {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#ffb27a');
      g.addColorStop(0.5, '#ff6f91');
      g.addColorStop(1, '#6a3b8f');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255, 236, 170, 0.22)';
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(W * 0.5, H * 0.96, W * (0.28 + i * 0.16), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  },
  {
    id: 'pixel',
    name: 'Pixel',
    ink: '#ffd166',
    fontDefault: 'pixel',
    photo: { border: 6, borderColor: '#ffd166', radius: 0, stroke: { color: '#14092f', width: 3 } },
    paint(ctx, W, H) {
      fillBg(ctx, W, H, '#2b1a63');
      const t = 24;
      ctx.fillStyle = '#341f72';
      for (let y = 0; y < H; y += t) {
        for (let x = (Math.floor(y / t) % 2) * t; x < W; x += t * 2) ctx.fillRect(x, y, t, t);
      }
      const r = rng(5);
      const names = Object.keys(PIXEL_SPRITES);
      const colors = ['#ff5d8f', '#ffd166', '#5ee7df', '#b8f27c'];
      for (let y = 18; y < H; y += 96) {
        drawSprite(ctx, names[Math.floor(r() * 3)], 3 + r() * 4, y, 4, colors[Math.floor(r() * 4)]);
        drawSprite(ctx, names[Math.floor(r() * 3)], W - 33 - r() * 4, y + 40, 4, colors[Math.floor(r() * 4)]);
      }
      const count = Math.floor((W * H) / 26000);
      for (let i = 0; i < count; i++) {
        drawSprite(ctx, names[Math.floor(r() * 3)], r() * (W - 30), r() * (H - 30), 4, colors[Math.floor(r() * 4)]);
      }
    }
  },
  {
    id: 'polka',
    name: 'Polka',
    ink: '#7b1f4a',
    photo: { border: 8, borderColor: '#ffffff', radius: 12, shadow: true },
    paint(ctx, W, H) {
      fillBg(ctx, W, H, '#ffb7cf');
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      const step = 48;
      for (let y = 0, row = 0; y < H + step; y += step, row++) {
        for (let x = (row % 2) * (step / 2); x < W + step; x += step) {
          ctx.beginPath();
          ctx.arc(x, y, 10, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  },
  {
    id: 'checker',
    name: 'Checker',
    ink: '#141414',
    plate: { color: '#fffdf7', radius: 18 },
    photo: { border: 8, borderColor: '#fffdf7', radius: 0, stroke: { color: '#141414', width: 3 } },
    paint(ctx, W, H) {
      const t = 24;
      for (let y = 0; y < H; y += t) {
        for (let x = 0; x < W; x += t) {
          ctx.fillStyle = ((x / t + y / t) & 1) === 0 ? '#151515' : '#f4f1ea';
          ctx.fillRect(x, y, t, t);
        }
      }
    }
  },
  {
    id: 'film',
    name: 'Film',
    ink: '#ffb43c',
    fontDefault: 'mono',
    photo: { border: 0, radius: 3, stroke: { color: '#3a3a3a', width: 2 } },
    paint(ctx, W, H) {
      fillBg(ctx, W, H, '#121212');
      ctx.fillStyle = '#ece4d0';
      const hole = (x, y) => {
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, 16, 22, 4);
        else ctx.rect(x, y, 16, 22);
        ctx.fill();
      };
      for (let y = 14; y < H - 10; y += 36) {
        hole(10, y);
        hole(W - 26, y);
      }
    }
  },
  {
    id: 'mint',
    name: 'Confetti',
    ink: '#0d5a47',
    photo: { border: 7, borderColor: '#ffffff', radius: 14, shadow: true },
    paint(ctx, W, H) {
      fillBg(ctx, W, H, '#c5f0d9');
      const r = rng(23);
      const colors = ['#ff8fab', '#ffd166', '#4cc9f0', '#ff6b6b', '#ffffff', '#9b5de5'];
      const count = Math.floor((W * H) / 5200);
      for (let i = 0; i < count; i++) {
        const x = r() * W;
        const y = r() * H;
        const s = 6 + r() * 9;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(r() * Math.PI);
        ctx.fillStyle = colors[Math.floor(r() * colors.length)];
        const shape = Math.floor(r() * 3);
        if (shape === 0) {
          ctx.beginPath();
          ctx.arc(0, 0, s / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (shape === 1) {
          ctx.fillRect(-s / 2, -s / 4, s, s / 2);
        } else {
          ctx.beginPath();
          ctx.moveTo(0, -s / 2);
          ctx.lineTo(s / 2, s / 2);
          ctx.lineTo(-s / 2, s / 2);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }
    }
  },
  {
    id: 'hearts',
    name: 'Hearts',
    ink: '#ffffff',
    photo: { border: 8, borderColor: '#fff5f7', radius: 8, shadow: true },
    paint(ctx, W, H) {
      fillBg(ctx, W, H, '#ff5c7c');
      ctx.fillStyle = 'rgba(255,255,255,0.24)';
      const step = 64;
      for (let y = 0, row = 0; y < H + step; y += step, row++) {
        for (let x = (row % 2) * (step / 2); x < W + step; x += step) {
          heartPath(ctx, x, y, 17);
          ctx.fill();
        }
      }
    }
  },
  {
    id: 'kraft',
    name: 'Vintage paper',
    ink: '#5a3818',
    fontDefault: 'hand',
    photo: { border: 11, borderColor: '#f7edd8', radius: 2, shadow: true },
    paint(ctx, W, H) {
      fillBg(ctx, W, H, '#d6bb92');
      const r = rng(41);
      const count = Math.floor((W * H) / 120);
      for (let i = 0; i < count; i++) {
        ctx.fillStyle = r() < 0.5 ? 'rgba(90,56,24,0.12)' : 'rgba(255,255,255,0.14)';
        ctx.fillRect(r() * W, r() * H, 1 + r() * 1.5, 1 + r() * 1.5);
      }
      const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
      g.addColorStop(0, 'rgba(90,56,24,0)');
      g.addColorStop(1, 'rgba(90,56,24,0.28)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
  },
  {
    id: 'neon',
    name: 'Neon',
    ink: '#5cf2ff',
    glowText: true,
    photo: { border: 0, radius: 8, stroke: { color: '#ff3fd8', width: 4 }, glow: '#ff3fd8' },
    paint(ctx, W, H) {
      fillBg(ctx, W, H, '#0c0618');
      ctx.strokeStyle = '#2b1654';
      ctx.lineWidth = 1.5;
      for (let x = 0; x <= W; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = 0; y <= H; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
    }
  }
];

DESIGNS.push(...MORE_DESIGNS);

export function getDesign(id) {
  return DESIGNS.find((d) => d.id === id) || DESIGNS[0];
}

export const FONTS = [
  { id: 'script', name: 'Script', family: '"Pacifico", cursive', weight: '400', scale: 1 },
  { id: 'pixel', name: 'Pixel', family: '"Press Start 2P", monospace', weight: '400', scale: 0.62 },
  { id: 'hand', name: 'Handwritten', family: '"Caveat", cursive', weight: '700', scale: 1.2 },
  { id: 'sans', name: 'Bold', family: '"Bricolage Grotesque", system-ui, sans-serif', weight: '800', scale: 1 },
  { id: 'mono', name: 'Typewriter', family: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace', weight: '700', scale: 0.9 },
  { id: 'marker', name: 'Marker', family: '"Permanent Marker", cursive', weight: '400', scale: 0.95 },
  { id: 'lobster', name: 'Lobster', family: '"Lobster", cursive', weight: '400', scale: 1 },
  { id: 'bubble', name: 'Bubble', family: '"Fredoka", system-ui, sans-serif', weight: '600', scale: 1 },
  { id: 'chewy', name: 'Chewy', family: '"Chewy", cursive', weight: '400', scale: 1.05 },
  { id: 'block', name: 'Block', family: '"Bungee", Impact, sans-serif', weight: '400', scale: 0.78 },
  { id: 'fashion', name: 'Fashion', family: '"Abril Fatface", Georgia, serif', weight: '400', scale: 1 },
  { id: 'doodle', name: 'Doodle', family: '"Gloria Hallelujah", cursive', weight: '400', scale: 0.95 },
  { id: 'signature', name: 'Signature', family: '"Sacramento", cursive', weight: '400', scale: 1.4 },
  { id: 'comic', name: 'Comic', family: '"Bangers", Impact, sans-serif', weight: '400', scale: 1.15 }
];

export function getFont(id) {
  return FONTS.find((f) => f.id === id) || FONTS[0];
}

export const STICKERS = [
  '❤️', '💖', '⭐', '✨', '🌟', '💫', '🎀', '🌸',
  '🦋', '🌈', '☁️', '🔥', '🎉', '🥳', '😎', '🤪',
  '🥰', '👑', '🍒', '🍓', '🍕', '🎶', '📸', '🧸'
];
