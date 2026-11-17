// App shell: screen navigation (wired to browser history so the Android back
// button works), start screen, settings, install prompt and service worker.

import { $, $$, el, showScreen, currentScreen, toast, openModal } from './dom.js';
import { settings, saveSettings, session, setPhotos, resetEdits } from './store.js';
import * as booth from './booth.js';
import * as editor from './editor.js';
import * as sfx from './audio.js';
import { renderBase, loadFonts } from './render.js';
import { DESIGNS } from './designs.js';
import { makeDemoPhotos } from './demo.js';
import { pickImages, filesToCanvases } from './upload.js';

const WORDS = { 4: 'Four', 5: 'Five' };

// ----- navigation -------------------------------------------------------------------

function push(name) {
  history.pushState({ screen: name }, '');
}

function apply(target) {
  if (currentScreen() === 'booth' && target !== 'booth') booth.close();
  if (target === 'edit') {
    if (session.photos.length < settings.shots || session.photos.some((p) => !p)) {
      history.replaceState({ screen: 'start' }, '');
      return apply('start');
    }
    showScreen('edit');
    editor.open();
  } else if (target === 'booth') {
    showScreen('booth');
    booth.open();
  } else {
    showScreen('start');
    drawHero();
  }
}

window.addEventListener('popstate', (e) => apply((e.state && e.state.screen) || 'start'));
history.replaceState({ screen: 'start' }, '');

booth.init({
  onBack: () => history.back(),
  onDone: (mode) => {
    if (mode === 'retake') {
      history.back(); // returns to the editor entry already in history
    } else {
      history.replaceState({ screen: 'edit' }, '');
      apply('edit');
    }
  }
});

editor.init({
  onRetake: (i) => {
    push('booth');
    showScreen('booth');
    booth.open({ retake: i });
  },
  onRetakeAll: () => {
    push('booth');
    showScreen('booth');
    booth.open();
  }
});

// ----- start screen -----------------------------------------------------------------------

const heroCanvas = $('#hero-canvas');
let heroDesign = 0;
let demo = null;

function drawHero() {
  if (!demo || demo.length !== settings.shots) demo = makeDemoPhotos(settings.shots);
  const design = DESIGNS[heroDesign % DESIGNS.length];
  const strip = renderBase(
    {
      photos: demo,
      layout: 'classic',
      design: design.id,
      filter: 'none',
      caption: 'Say cheese',
      showDate: false,
      font: design.fontDefault || 'script',
      mirror: false,
      stickers: []
    },
    0.7
  );
  heroCanvas.width = strip.width;
  heroCanvas.height = strip.height;
  heroCanvas.getContext('2d').drawImage(strip, 0, 0);
  heroCanvas.setAttribute('aria-label', `Sample photo strip in the ${design.name} design`);
}

function syncStart() {
  $('#hero-title').replaceChildren(el('span', {}, `${WORDS[settings.shots]} poses.`), el('span', {}, 'One strip.'));
  for (const [id, key] of [
    ['#seg-shots', 'shots'],
    ['#seg-timer', 'timer']
  ]) {
    $$(`${id} button`).forEach((b) => b.setAttribute('aria-checked', String(Number(b.dataset.value) === settings[key])));
  }
  $('#set-sound').checked = settings.sound;
  $('#set-flash').checked = settings.flash;
}

for (const [id, key] of [
  ['#seg-shots', 'shots'],
  ['#seg-timer', 'timer']
]) {
  $(id).addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    settings[key] = Number(b.dataset.value);
    saveSettings();
    syncStart();
    if (key === 'shots') drawHero();
  });
}

$('#hero-strip').addEventListener('click', () => {
  heroDesign++;
  drawHero();
});

$('#btn-start').addEventListener('click', () => {
  sfx.unlock();
  push('booth');
  showScreen('booth');
  booth.open();
});

$('#btn-upload').addEventListener('click', async () => {
  const files = await pickImages(true);
  if (!files.length) return;
  if (files.length < settings.shots) {
    toast(`Choose at least ${settings.shots} photos. You can change this above.`);
    return;
  }
  try {
    const photos = await filesToCanvases(files.slice(0, settings.shots));
    resetEdits();
    setPhotos(photos);
    push('edit');
    apply('edit');
  } catch {
    toast('One of those photos could not be opened. Try a JPEG or PNG.');
  }
});

// ----- settings & install -------------------------------------------------------------------

$('#btn-settings').addEventListener('click', () => openModal('#modal-settings'));
$('#set-sound').addEventListener('change', (e) => {
  settings.sound = e.target.checked;
  saveSettings();
});
$('#set-flash').addEventListener('change', (e) => {
  settings.flash = e.target.checked;
  saveSettings();
});

let installEvent = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installEvent = e;
  $('#install-row').hidden = false;
});
window.addEventListener('appinstalled', () => {
  installEvent = null;
  $('#install-row').hidden = true;
  toast('Strip Booth is installed.');
});
$('#btn-install').addEventListener('click', async () => {
  if (!installEvent) return;
  installEvent.prompt();
  await installEvent.userChoice;
  installEvent = null;
  $('#install-row').hidden = true;
});

// ----- boot ---------------------------------------------------------------------------------------

syncStart();
loadFonts().then(drawHero);
drawHero();

if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !location.search.includes('nosw')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
