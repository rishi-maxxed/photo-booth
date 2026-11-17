// Drawn stand-in photos for the start screen, so the strip shown there is
// rendered by the same engine as a real one.

const PALETTES = [
  ['#ffb36b', '#ff5d8f'],
  ['#6ee7d8', '#4f7cff'],
  ['#ffd86b', '#ff8f5d'],
  ['#c58bff', '#ff6bb5'],
  ['#7be495', '#2fa3d6']
];
const OFFSETS = [0, -34, 30, -12, 22];
const TILTS = [0, -0.12, 0.1, 0.04, -0.06];

export function makeDemoPhotos(n) {
  const photos = [];
  for (let i = 0; i < n; i++) {
    const c = document.createElement('canvas');
    c.width = 800;
    c.height = 600;
    const ctx = c.getContext('2d');
    const [a, b] = PALETTES[i % PALETTES.length];
    const g = ctx.createLinearGradient(0, 0, 800, 600);
    g.addColorStop(0, a);
    g.addColorStop(1, b);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 800, 600);

    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    for (let k = 0; k < 7; k++) {
      ctx.beginPath();
      ctx.arc(80 + ((k * 211 + i * 97) % 700), 70 + ((k * 137 + i * 61) % 300), 24 + ((k * 13) % 38), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(400 + OFFSETS[i % 5], 0);
    ctx.fillStyle = '#2a1236';
    ctx.beginPath();
    ctx.ellipse(0, 640, 250, 210, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.translate(0, 290);
    ctx.rotate(TILTS[i % 5]);
    ctx.fillStyle = '#2a1236';
    ctx.beginPath();
    ctx.arc(0, 0, 118, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff4e6';
    ctx.beginPath();
    ctx.arc(-40, -14, 11, 0, Math.PI * 2);
    ctx.arc(40, -14, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff4e6';
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 18, 50, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    ctx.restore();
    photos.push(c);
  }
  return photos;
}
