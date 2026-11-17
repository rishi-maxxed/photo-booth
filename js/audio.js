// Tiny synthesized sound effects (no audio files). Everything is gated by the
// sound setting and lazily created so mobile browsers allow it after a tap.

import { settings } from './store.js';

let ctx = null;

function ac() {
  if (!settings.sound) return null;
  try {
    if (!ctx) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

export function unlock() {
  ac();
}

function tone(c, { freq, dur, type = 'square', gain = 0.06, when = 0 }) {
  const t0 = c.currentTime + when;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export function tick(last = false) {
  const c = ac();
  if (!c) return;
  tone(c, { freq: last ? 1320 : 880, dur: last ? 0.16 : 0.09 });
}

export function shutter() {
  const c = ac();
  if (!c) return;
  const len = Math.floor(c.sampleRate * 0.14);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 2400;
  const g = c.createGain();
  g.gain.value = 0.5;
  src.connect(filter).connect(g).connect(c.destination);
  src.start();
  tone(c, { freq: 160, dur: 0.08, type: 'sine', gain: 0.18 });
}

export function done() {
  const c = ac();
  if (!c) return;
  [660, 880, 1100].forEach((freq, i) =>
    tone(c, { freq, dur: 0.14, type: 'triangle', gain: 0.07, when: i * 0.09 })
  );
}
