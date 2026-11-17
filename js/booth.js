// The booth screen: live camera, framing guide, countdown sequence, shutter
// flash, per-shot thumbnails and single-shot retakes.

import { $, el, sleep, toast } from './dom.js';
import { Camera } from './camera.js';
import { settings, session, setPhoto, setPhotos, resetEdits } from './store.js';
import * as sfx from './audio.js';
import { pickImages, filesToCanvases } from './upload.js';

const video = $('#video');
const stage = $('#stage');
const guide = $('#guide');
const countEl = $('#count');
const flashEl = $('#flash');
const bulbsEl = $('#bulbs');
const trayEl = $('#tray');
const statusEl = $('#booth-status');
const shutter = $('#shutter');
const shutterLabel = $('#shutter-label');
const flipBtn = $('#booth-flip');
const msg = $('#booth-msg');

const camera = new Camera(video);
let hooks = { onDone() {}, onBack() {} };
let mode = 'new';
let retakeIndex = -1;
let running = false;
let token = 0;
let active = false;
let msgShown = false;

export function init(h) {
  hooks = h;
  shutter.addEventListener('click', () => (running ? cancel() : run()));
  $('#booth-back').addEventListener('click', () => hooks.onBack());
  flipBtn.addEventListener('click', onFlip);
  $('#msg-retry').addEventListener('click', startCamera);
  $('#msg-upload').addEventListener('click', chooseInstead);
  video.addEventListener('loadedmetadata', layoutGuide);
  video.addEventListener('resize', layoutGuide);
  new ResizeObserver(layoutGuide).observe(stage);
  camera.onEnded = () => {
    if (active && !msgShown) {
      cancel();
      showMessage('unknown', 'The camera disconnected.');
    }
  };
  document.addEventListener('visibilitychange', () => {
    if (!active) return;
    if (document.hidden) {
      if (running) cancel();
      camera.stop();
    } else if (!camera.active && !msgShown) {
      startCamera();
    }
  });
}

export async function open({ retake = -1 } = {}) {
  active = true;
  mode = retake >= 0 ? 'retake' : 'new';
  retakeIndex = retake;
  if (mode === 'new') {
    setPhotos([]);
    resetEdits();
  }
  buildBulbs();
  renderTray();
  setIdle();
  await startCamera();
}

export function close() {
  active = false;
  token++;
  running = false;
  hideCount();
  camera.stop();
}

// ----- camera ---------------------------------------------------------------

async function startCamera() {
  hideMessage();
  shutter.disabled = true;
  try {
    await camera.start({ facing: camera.facing });
    if (!active) {
      camera.stop();
      return;
    }
    video.classList.toggle('mirror', camera.mirrored);
    flipBtn.hidden = camera.cameraCount < 2;
    layoutGuide();
    shutter.disabled = false;
  } catch (err) {
    if (active) showMessage(err.code || 'unknown', err.message);
  }
}

async function onFlip() {
  if (running) return;
  flipBtn.disabled = true;
  try {
    await camera.flip();
    video.classList.toggle('mirror', camera.mirrored);
    layoutGuide();
  } catch (err) {
    showMessage(err.code || 'unknown', err.message);
  } finally {
    flipBtn.disabled = false;
  }
}

const MESSAGES = {
  insecure: ['Camera needs a secure page', null],
  denied: [
    'Camera is blocked',
    'Allow camera access for this site in the address bar or your browser settings, then try again.'
  ],
  none: ['No camera found', 'Plug in a webcam or use photos from your gallery instead.'],
  busy: ['Camera is in use', 'Close other apps that are using the camera, then try again.'],
  unknown: ['Camera could not start', null]
};

function showMessage(code, detail) {
  const [title, text] = MESSAGES[code] || MESSAGES.unknown;
  $('#msg-title').textContent = title;
  $('#msg-text').textContent = text || detail || 'Try again, or use photos from your gallery.';
  msg.hidden = false;
  msgShown = true;
  shutter.disabled = true;
  $('#msg-retry').focus();
}

function hideMessage() {
  msg.hidden = true;
  msgShown = false;
}

async function chooseInstead() {
  const files = await pickImages(mode === 'new');
  if (!files.length) return;
  try {
    if (mode === 'retake') {
      const [c] = await filesToCanvases(files.slice(0, 1));
      setPhoto(retakeIndex, c);
    } else {
      if (files.length < settings.shots) {
        toast(`Choose at least ${settings.shots} photos.`);
        return;
      }
      setPhotos(await filesToCanvases(files.slice(0, settings.shots)));
    }
    finish();
  } catch {
    toast('One of those photos could not be opened. Try a JPEG or PNG.');
  }
}

// Frame the 4:3 area every layout is cropped from, so people can see what lands in the strip.
function layoutGuide() {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const box = stage.getBoundingClientRect();
  if (!vw || !vh || !box.width) {
    guide.hidden = true;
    return;
  }
  const cover = Math.max(box.width / vw, box.height / vh);
  let w = (vw / vh > 4 / 3 ? (vh * 4) / 3 : vw) * cover;
  let h = w * 0.75;
  const k = Math.min(1, (box.width * 0.9) / w, (box.height * 0.82) / h);
  w *= k;
  h *= k;
  guide.style.width = `${w}px`;
  guide.style.height = `${h}px`;
  guide.style.left = `${(box.width - w) / 2}px`;
  guide.style.top = `${(box.height - h) / 2}px`;
  guide.hidden = false;
}

// ----- sequence ---------------------------------------------------------------

function setIdle() {
  running = false;
  shutterLabel.textContent = mode === 'retake' ? 'Retake' : 'Start';
  shutter.setAttribute('aria-label', mode === 'retake' ? 'Retake this photo' : 'Start the countdown');
  shutter.classList.remove('running');
  statusEl.textContent =
    mode === 'retake'
      ? `Retaking pose ${retakeIndex + 1} of ${settings.shots}`
      : `${settings.shots} poses, ${settings.timer} seconds apart`;
  updateBulbs(mode === 'retake' ? retakeIndex : firstEmpty());
}

function firstEmpty() {
  for (let i = 0; i < settings.shots; i++) if (!session.photos[i]) return i;
  return -1;
}

async function run() {
  if (running || !camera.active) return;
  running = true;
  const mine = ++token;
  sfx.unlock();
  shutterLabel.textContent = 'Cancel';
  shutter.setAttribute('aria-label', 'Cancel the countdown');
  shutter.classList.add('running');

  if (mode === 'new') {
    setPhotos([]);
    renderTray();
  }
  const targets = mode === 'retake' ? [retakeIndex] : Array.from({ length: settings.shots }, (_, i) => i);

  for (let k = 0; k < targets.length; k++) {
    const idx = targets[k];
    statusEl.textContent = `Pose ${idx + 1} of ${settings.shots}`;
    updateBulbs(idx);
    for (let t = settings.timer; t > 0; t--) {
      showCount(t);
      sfx.tick(t === 1);
      await sleep(1000);
      if (mine !== token) return;
    }
    hideCount();
    if (!camera.active) {
      cancel();
      toast('The camera stopped. Try again.');
      return;
    }
    doFlash();
    sfx.shutter();
    setPhoto(idx, camera.capture());
    renderTray();
    updateBulbs(-1);
    if (k < targets.length - 1) {
      await sleep(1100);
      if (mine !== token) return;
    }
  }

  running = false;
  sfx.done();
  statusEl.textContent = 'Developing your strip';
  await sleep(700);
  if (mine !== token) return;
  finish();
}

function finish() {
  camera.stop();
  hooks.onDone(mode);
}

function cancel() {
  token++;
  hideCount();
  setIdle();
}

// ----- on-screen bits ---------------------------------------------------------

function showCount(n) {
  countEl.textContent = String(n);
  countEl.classList.remove('pop');
  void countEl.offsetWidth; // restart the animation
  countEl.classList.add('pop');
  countEl.hidden = false;
}

function hideCount() {
  countEl.hidden = true;
  countEl.textContent = '';
}

function doFlash() {
  if (!settings.flash) return;
  flashEl.classList.remove('on');
  void flashEl.offsetWidth;
  flashEl.classList.add('on');
}

function buildBulbs() {
  bulbsEl.replaceChildren(
    ...Array.from({ length: settings.shots }, (_, i) => el('span', { class: 'bulb', 'data-i': String(i) }))
  );
}

function updateBulbs(activeIdx) {
  [...bulbsEl.children].forEach((b, i) => {
    b.classList.toggle('lit', !!session.photos[i] && i !== activeIdx);
    b.classList.toggle('active', i === activeIdx);
  });
}

function renderTray() {
  const items = [];
  for (let i = 0; i < settings.shots; i++) {
    const photo = session.photos[i];
    const slot = el('div', { class: 'tray-slot' + (photo ? ' filled' : '') });
    if (photo) {
      const c = document.createElement('canvas');
      c.width = 112;
      c.height = 84;
      const sa = photo.width / photo.height;
      let sw = photo.width;
      let sh = photo.height;
      let sx = 0;
      let sy = 0;
      if (sa > 4 / 3) {
        sw = sh * (4 / 3);
        sx = (photo.width - sw) / 2;
      } else {
        sh = sw * 0.75;
        sy = (photo.height - sh) * 0.4;
      }
      c.getContext('2d').drawImage(photo, sx, sy, sw, sh, 0, 0, 112, 84);
      slot.appendChild(c);
    } else {
      slot.textContent = String(i + 1);
    }
    items.push(slot);
  }
  trayEl.replaceChildren(...items);
}
