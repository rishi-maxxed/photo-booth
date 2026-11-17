// More strip designs, appended to the list in designs.js. Same shape as the
// entries there: paint(ctx, W, H, layout) draws the background in design units.

import { rng, sparkle, fillBg } from './design-kit.js';

function flower(ctx, x, y, s, rot, petal, core) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = petal;
  for (let i = 0; i < 5; i++) {
    ctx.rotate((Math.PI * 2) / 5);
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.55, s * 0.38, s * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export const MORE_DESIGNS = [
  {
    id: 'holo',
    name: 'Holographic',
    ink: '#5a3b8a',
    photo: { border: 7, borderColor: 'rgba(255,255,255,0.92)', radius: 10, shadow: true },
    paint(ctx, W, H) {
      const g = ctx.createLinearGradient(0, 0, W, H);
      ['#ffc8ee', '#c8d6ff', '#b6fff1', '#fff2b0', '#ffc6e4', '#d3c6ff'].forEach((c, i, a) =>
        g.addColorStop(i / (a.length - 1), c)
      );
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.rotate(-0.6);
      for (let i = -9; i <= 9; i++) {
        const x = i * 120;
        const lg = ctx.createLinearGradient(x, 0, x + 70, 0);
        lg.addColorStop(0, 'rgba(255,255,255,0)');
        lg.addColorStop(0.5, 'rgba(255,255,255,0.4)');
        lg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = lg;
        ctx.fillRect(x, -H, 70, H * 2);
      }
      ctx.restore();
      const r = rng(3);
      const n = Math.floor((W * H) / 800);
      for (let i = 0; i < n; i++) {
        ctx.globalAlpha = 0.25 + r() * 0.7;
        ctx.fillStyle = r() < 0.6 ? '#ffffff' : ['#ff9ad5', '#9ad7ff', '#b6ffd8'][Math.floor(r() * 3)];
        const s = 0.8 + r() * 1.8;
        ctx.fillRect(r() * W, r() * H, s, s);
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 16; i++) {
        sparkle(ctx, r() * W, r() * H, 7 + r() * 10);
        ctx.fill();
      }
    }
  },
  {
    id: 'gingham',
    name: 'Gingham',
    ink: '#9b1c2e',
    fontDefault: 'hand',
    plate: { color: '#fffdf7', radius: 18 },
    photo: { border: 8, borderColor: '#ffffff', radius: 4, shadow: true },
    paint(ctx, W, H) {
      fillBg(ctx, W, H, '#fffdf8');
      const t = 26;
      ctx.fillStyle = 'rgba(203,36,62,0.55)';
      for (let y = 0; y < H; y += t * 2) ctx.fillRect(0, y, W, t);
      for (let x = 0; x < W; x += t * 2) ctx.fillRect(x, 0, t, H);
    }
  },
  {
    id: 'comic',
    name: 'Comic pop',
    ink: '#111111',
    fontDefault: 'sans',
    plate: { color: '#ffffff', radius: 6 },
    photo: { border: 5, borderColor: '#ffffff', radius: 0, stroke: { color: '#111111', width: 5 } },
    paint(ctx, W, H) {
      fillBg(ctx, W, H, '#ffd23f');
      const step = 18;
      for (let y = 0, row = 0; y < H + step; y += step, row++) {
        const k = y / H;
        for (let x = (row % 2) * (step / 2); x < W + step; x += step) {
          if (k > 0.55) {
            ctx.fillStyle = '#e63946';
            ctx.beginPath();
            ctx.arc(x, y, 1 + (k - 0.55) * 18, 0, Math.PI * 2);
            ctx.fill();
          } else if (k < 0.3) {
            ctx.fillStyle = '#29b6f6';
            ctx.beginPath();
            ctx.arc(x, y, 1 + (0.3 - k) * 18, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
  },
  {
    id: 'vapor',
    name: 'Vaporwave',
    ink: '#ffe3fb',
    glowText: true,
    fontDefault: 'pixel',
    photo: { border: 0, radius: 0, stroke: { color: '#6df7ff', width: 4 }, glow: '#6df7ff' },
    paint(ctx, W, H) {
      const hz = H * 0.64;
      const sky = ctx.createLinearGradient(0, 0, 0, hz);
      sky.addColorStop(0, '#1d0b45');
      sky.addColorStop(0.55, '#7a2aa6');
      sky.addColorStop(1, '#ff6fb1');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, hz);
      ctx.fillStyle = '#1a0636';
      ctx.fillRect(0, hz, W, H - hz);
      const r = rng(31);
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 60; i++) {
        ctx.globalAlpha = 0.3 + r() * 0.7;
        ctx.fillRect(r() * W, r() * hz * 0.8, 2, 2);
      }
      ctx.globalAlpha = 1;
      const R = W * 0.3;
      const sg = ctx.createLinearGradient(0, hz - R * 2, 0, hz);
      sg.addColorStop(0, '#ffe86b');
      sg.addColorStop(1, '#ff4fa3');
      ctx.save();
      ctx.beginPath();
      ctx.arc(W / 2, hz - R * 0.1, R, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = sg;
      ctx.fillRect(0, 0, W, hz);
      ctx.fillStyle = '#7a2aa6';
      for (let i = 0; i < 6; i++) ctx.fillRect(0, hz - R * 0.1 - i * R * 0.14 - 4, W, 3 + i * 1.6);
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,79,216,0.85)';
      ctx.lineWidth = 1.5;
      for (let k = 1; k <= 14; k++) {
        const y = hz + (H - hz) * Math.pow(k / 14, 2);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
      for (let i = -14; i <= 14; i++) {
        ctx.beginPath();
        ctx.moveTo(W / 2 + i * W * 0.02, hz);
        ctx.lineTo(W / 2 + i * W * 0.2, H);
        ctx.stroke();
      }
    }
  },
  {
    id: 'sakura',
    name: 'Sakura',
    ink: '#b03a65',
    photo: { border: 7, borderColor: '#ffffff', radius: 14, shadow: true },
    paint(ctx, W, H) {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#ffeaf1');
      g.addColorStop(1, '#ffcfde');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      const r = rng(12);
      ctx.fillStyle = '#ffc2d6';
      for (let i = 0; i < 70; i++) {
        ctx.save();
        ctx.translate(r() * W, r() * H);
        ctx.rotate(r() * Math.PI);
        ctx.beginPath();
        ctx.ellipse(0, 0, 4 + r() * 4, 8 + r() * 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      for (let i = 0; i < 22; i++) {
        const edge = r() < 0.5;
        const x = edge ? (r() < 0.5 ? r() * 60 : W - r() * 60) : r() * W;
        flower(ctx, x, r() * H, 16 + r() * 16, r() * 6, '#ffadc6', '#ff6f9c');
      }
    }
  },
  {
    id: 'blueprint',
    name: 'Blueprint',
    ink: '#d6eaff',
    fontDefault: 'mono',
    photo: { border: 0, radius: 0, stroke: { color: '#d6eaff', width: 2.5 } },
    paint(ctx, W, H) {
      fillBg(ctx, W, H, '#12407c');
      for (let x = 0; x <= W; x += 20) {
        ctx.strokeStyle = x % 100 === 0 ? 'rgba(214,234,255,0.26)' : 'rgba(214,234,255,0.1)';
        ctx.lineWidth = x % 100 === 0 ? 1.5 : 1;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = 0; y <= H; y += 20) {
        ctx.strokeStyle = y % 100 === 0 ? 'rgba(214,234,255,0.26)' : 'rgba(214,234,255,0.1)';
        ctx.lineWidth = y % 100 === 0 ? 1.5 : 1;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
      ctx.strokeStyle = '#d6eaff';
      ctx.fillStyle = '#d6eaff';
      ctx.lineWidth = 1.5;
      ctx.font = '11px ui-monospace, Menlo, Consolas, monospace';
      for (let y = 0; y < H; y += 20) {
        const long = y % 100 === 0;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(long ? 14 : 7, y);
        ctx.stroke();
        if (long && y > 0) ctx.fillText(String(y), 17, y + 4);
      }
      [[16, 16], [W - 16, 16], [16, H - 16], [W - 16, H - 16]].forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.moveTo(x - 14, y);
        ctx.lineTo(x + 14, y);
        ctx.moveTo(x, y - 14);
        ctx.lineTo(x, y + 14);
        ctx.stroke();
      });
    }
  },
  {
    id: 'watercolor',
    name: 'Watercolor',
    ink: '#4a3b5c',
    photo: { border: 8, borderColor: '#fffdf8', radius: 3, shadow: true },
    paint(ctx, W, H) {
      fillBg(ctx, W, H, '#fffaf1');
      const r = rng(16);
      const cols = ['255,158,196', '142,201,255', '255,224,122', '159,227,181', '195,166,255'];
      ctx.globalCompositeOperation = 'multiply';
      for (let i = 0; i < 18; i++) {
        const x = r() * W;
        const y = r() * H;
        const R = 90 + r() * 140;
        const c = cols[Math.floor(r() * cols.length)];
        const g = ctx.createRadialGradient(x, y, R * 0.1, x, y, R);
        g.addColorStop(0, `rgba(${c},0.62)`);
        g.addColorStop(0.7, `rgba(${c},0.25)`);
        g.addColorStop(1, `rgba(${c},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, R, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      for (let i = 0; i < (W * H) / 220; i++) {
        ctx.fillStyle = `rgba(120,100,140,${(r() * 0.08).toFixed(3)})`;
        ctx.fillRect(r() * W, r() * H, 1.5, 1.5);
      }
    }
  },
  {
    id: 'candy',
    name: 'Candy stripes',
    ink: '#d6336c',
    fontDefault: 'hand',
    plate: { color: '#ffffff', radius: 22 },
    photo: { border: 8, borderColor: '#ffffff', radius: 16, shadow: true },
    paint(ctx, W, H) {
      fillBg(ctx, W, H, '#ffffff');
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.rotate(-Math.PI / 4);
      const L = Math.hypot(W, H);
      ctx.fillStyle = '#ff8fb8';
      for (let x = -L; x < L; x += 60) ctx.fillRect(x, -L, 30, L * 2);
      ctx.restore();
    }
  },
  {
    id: 'deco',
    name: 'Art deco gold',
    ink: '#e8c872',
    photo: { border: 6, borderColor: '#e0b95a', radius: 0, stroke: { color: '#7a5a1e', width: 1.5 } },
    paint(ctx, W, H) {
      fillBg(ctx, W, H, '#0d0d11');
      ctx.strokeStyle = 'rgba(217,178,90,0.6)';
      ctx.lineWidth = 1.4;
      const step = 64;
      for (let y = 0, row = 0; y < H + step; y += step / 2, row++) {
        for (let x = (row % 2) * (step / 2); x < W + step; x += step) {
          for (let k = 1; k <= 4; k++) {
            ctx.beginPath();
            ctx.arc(x, y, k * 8, Math.PI, 0);
            ctx.stroke();
          }
        }
      }
      ctx.strokeStyle = '#d9b25a';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(12, 12, W - 24, H - 24);
      ctx.lineWidth = 1;
      ctx.strokeRect(20, 20, W - 40, H - 40);
    }
  }
];
