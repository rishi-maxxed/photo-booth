// The editor: live strip preview, option tabs (layout, design, filter,
// stickers, text, photos), sticker drag/pinch gestures and export actions.

import { $, $$, el, toast, openModal, closeModal } from './dom.js';
import { session, settings, saveSettings, getAdj, setAdj, resetAdj, resetAllAdj, ADJ_MAX_ZOOM } from './store.js';
import { LAYOUTS, getLayout } from './layouts.js';
import { DESIGNS, FONTS, STICKERS, getDesign } from './designs.js';
import { STICKER_PACKS, loadStickers, stickerSrc } from './stickers.js';
import { FILTERS } from './filters.js';
import { FRAMES } from './frames.js';
import {
  renderBase,
  renderFramePreview,
  drawStickers,
  drawSelection,
  drawSlotOutline,
  photoToCanvas,
  cropRect,
  photoArea,
  loadFonts
} from './render.js';
import * as exp from './export.js';

const preview = $('#preview');
const canvas = $('#preview-canvas');
const ctx = canvas.getContext('2d');

let hooks = { onRetake() {}, onRetakeAll() {} };
let currentTab = 'layout';
let built = false;
let baseCanvas = null;
let baseKey = '';
let scale = 1;
let raf = 0;
let stickerSeq = 0;
const dirty = { layout: true, design: true, frame: true, filter: true };
const thumbs = { layout: [], design: [], frame: [], filter: [] };

// ----- state helpers --------------------------------------------------------

function renderState(over = {}) {
  return {
    photos: session.photos,
    layout: session.layout,
    design: session.design,
    frame: session.frame,
    filter: session.filter,
    caption: session.caption,
    showDate: session.showDate,
    font: session.font,
    mirror: settings.mirrorSaved,
    stickers: session.stickers,
    adjust: session.adjust,
    ...over
  };
}

function markDirty(...kinds) {
  for (const k of kinds) dirty[k] = true;
}

// ----- preview canvas ---------------------------------------------------------

function fit() {
  if (!session.photos.length) return;
  const L = getLayout(session.layout, session.photos.length);
  const cs = getComputedStyle(preview);
  const availW = preview.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const availH = preview.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  if (availW <= 0 || availH <= 0) return;
  const k = Math.min(availW / L.W, availH / L.H);
  const cssW = Math.floor(L.W * k);
  const cssH = Math.floor(L.H * k);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const pw = Math.round(cssW * dpr);
  if (canvas.style.width !== `${cssW}px` || canvas.style.height !== `${cssH}px` || canvas.width !== pw) {
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.width = pw;
    canvas.height = Math.round(cssH * dpr);
  }
  scale = canvas.width / L.W;
}

function baseFingerprint() {
  return [
    session.rev,
    session.adjRev,
    session.layout,
    session.design,
    session.frame,
    session.filter,
    session.caption,
    session.showDate,
    session.font,
    settings.mirrorSaved,
    canvas.width,
    canvas.height
  ].join('|');
}

function draw() {
  raf = 0;
  if (!session.photos.length || !canvas.width) return;
  const L = getLayout(session.layout, session.photos.length);
  const key = baseFingerprint();
  if (key !== baseKey || !baseCanvas) {
    baseCanvas = renderBase(renderState({ stickers: [] }), scale);
    baseKey = key;
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(baseCanvas, 0, 0, canvas.width, canvas.height);
  drawStickers(ctx, session.stickers, L.W, L.H, scale);
  if (currentTab === 'adjust') {
    const slot = L.slots[adjIndex()];
    if (slot) drawSlotOutline(ctx, slot, scale);
  } else {
    const sel = session.stickers.find((s) => s.id === session.selectedId);
    if (sel) drawSelection(ctx, sel, L.W, L.H, scale);
  }
}

function schedule() {
  if (!raf) raf = requestAnimationFrame(draw);
}

function refit() {
  fit();
  schedule();
}

// ----- thumbnails -------------------------------------------------------------

function blit(dst, src) {
  dst.width = src.width;
  dst.height = src.height;
  dst.getContext('2d').drawImage(src, 0, 0);
}

function stripThumb(over) {
  const st = renderState({ stickers: [], ...over });
  const L = getLayout(st.layout, st.photos.length);
  const k = Math.min(200 / L.H, 280 / L.W);
  return renderBase(st, k);
}

function makeThumb(kind, id, label, onPick) {
  const c = document.createElement('canvas');
  const name = el('span', { text: label });
  const btn = el('button', { type: 'button', class: 'thumb', 'aria-pressed': 'false' }, c, name);
  btn.addEventListener('click', () => onPick(id));
  thumbs[kind].push({ id, canvas: c, btn });
  return btn;
}

function refreshThumbs(kind) {
  if (!session.photos.length) return;
  for (const t of thumbs[kind]) {
    let src;
    if (kind === 'layout') src = stripThumb({ layout: t.id });
    else if (kind === 'design') src = stripThumb({ design: t.id });
    else if (kind === 'frame') {
      src = renderFramePreview(session.photos[0], session.design, t.id, {
        mirror: settings.mirrorSaved,
        filter: session.filter,
        adj: session.adjust[0]
      });
    }
    else {
      const f = photoToCanvas(session.photos[0], 160, 120, { mirror: settings.mirrorSaved, filter: t.id, adj: session.adjust[0] });
      src = f;
    }
    blit(t.canvas, src);
  }
  dirty[kind] = false;
}

function markPressed() {
  const cur = { layout: session.layout, design: session.design, frame: session.frame, filter: session.filter };
  for (const kind of Object.keys(thumbs)) {
    for (const t of thumbs[kind]) t.btn.setAttribute('aria-pressed', String(t.id === cur[kind]));
  }
}

// ----- panes --------------------------------------------------------------------

function build() {
  if (built) return;
  built = true;

  $('#chips-layout').replaceChildren(
    ...LAYOUTS.map((l) =>
      makeThumb('layout', l.id, l.name, (id) => {
        session.layout = id;
        markDirty('design');
        markPressed();
        refit();
        refreshCurrent();
      })
    )
  );
  $('#chips-design').replaceChildren(
    ...DESIGNS.map((d) =>
      makeThumb('design', d.id, d.name, (id) => {
        session.design = id;
        if (!session.fontTouched) session.font = getDesign(id).fontDefault || 'script';
        markDirty('layout', 'frame');
        markPressed();
        syncText();
        schedule();
        refreshCurrent();
      })
    )
  );
  $('#chips-frame').replaceChildren(
    ...FRAMES.map((f) =>
      makeThumb('frame', f.id, f.name, (id) => {
        session.frame = id;
        markDirty('layout', 'design');
        markPressed();
        schedule();
        refreshCurrent();
      })
    )
  );
  $('#chips-filter').replaceChildren(
    ...FILTERS.map((f) =>
      makeThumb('filter', f.id, f.name, (id) => {
        session.filter = id;
        markDirty('layout', 'design', 'frame');
        markPressed();
        schedule();
        refreshCurrent();
      })
    )
  );

  // stickers: emoji plus drawn packs
  buildStickerPicker();
  $('#st-smaller').addEventListener('click', () => changeSticker((s) => (s.size = Math.max(0.04, s.size * 0.88))));
  $('#st-larger').addEventListener('click', () => changeSticker((s) => (s.size = Math.min(0.6, s.size * 1.14))));
  $('#st-left').addEventListener('click', () => changeSticker((s) => (s.rot -= Math.PI / 12)));
  $('#st-right').addEventListener('click', () => changeSticker((s) => (s.rot += Math.PI / 12)));
  $('#st-delete').addEventListener('click', deleteSelected);
  $('#st-clear').addEventListener('click', () => {
    session.stickers = [];
    session.selectedId = null;
    stickerTools();
    schedule();
  });

  // text
  const fontWrap = $('#chips-font');
  fontWrap.replaceChildren(
    ...FONTS.map((f) =>
      el('button', {
        type: 'button',
        class: 'fontchip',
        'data-font': f.id,
        'aria-pressed': 'false',
        style: `font-family:${f.family};font-weight:${f.weight}`,
        text: f.name,
        onclick: () => {
          session.font = f.id;
          session.fontTouched = true;
          syncText();
          schedule();
        }
      })
    )
  );
  $('#caption').addEventListener('input', (e) => {
    session.caption = e.target.value;
    schedule();
  });
  $('#show-date').addEventListener('change', (e) => {
    session.showDate = e.target.checked;
    schedule();
  });
  $('#mirror-saved').addEventListener('change', (e) => {
    settings.mirrorSaved = e.target.checked;
    saveSettings();
    markDirty('layout', 'design', 'frame', 'filter');
    buildShots();
    buildAdjust();
    refreshCurrent();
    schedule();
  });
  $('#retake-all').addEventListener('click', () => openModal('#modal-confirm'));

  // adjust
  $('#adj-zoom').addEventListener('input', (e) => zoomTo(adjIndex(), Number(e.target.value) / 100, '#adj-zoom'));
  $('#adj-x').addEventListener('input', (e) => {
    const v = Number(e.target.value) / 100;
    changeAdj(adjIndex(), { px: settings.mirrorSaved ? v : 1 - v }, '#adj-x');
  });
  $('#adj-y').addEventListener('input', (e) => changeAdj(adjIndex(), { py: 1 - Number(e.target.value) / 100 }, '#adj-y'));
  $('#adj-reset').addEventListener('click', () => {
    const i = adjIndex();
    resetAdj(i);
    afterAdjust(i);
  });
  $('#adj-reset-all').addEventListener('click', () => {
    resetAllAdj();
    markDirty('layout', 'design', 'frame', 'filter');
    buildAdjust();
    syncAdjust();
    schedule();
  });

  // tabs
  const tabs = $$('#tabs [role=tab]');
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => setTab(t.dataset.tab));
    t.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      next.focus();
      setTab(next.dataset.tab);
    });
  });

  bindPreviewGestures();
  bindExport();
  new ResizeObserver(refit).observe(preview);
}

function setTab(name) {
  currentTab = name;
  $$('#tabs [role=tab]').forEach((t) => {
    const on = t.dataset.tab === name;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
  });
  $$('.pane').forEach((p) => (p.hidden = p.id !== `pane-${name}`));
  canvas.style.cursor = name === 'adjust' ? 'grab' : 'default';
  refreshCurrent();
  schedule(); // the Adjust tab outlines a photo on the strip
}

function refreshCurrent() {
  if (['layout', 'design', 'frame', 'filter'].includes(currentTab) && dirty[currentTab]) refreshThumbs(currentTab);
  const active = $(`#pane-${currentTab} .thumb[aria-pressed=true]`);
  if (active) active.scrollIntoView({ block: 'nearest', inline: 'center' });
  if (built && session.photos.length) syncAdjust();
}

function syncText() {
  $('#caption').value = session.caption;
  $('#show-date').checked = session.showDate;
  $('#mirror-saved').checked = settings.mirrorSaved;
  $$('#chips-font .fontchip').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.font === session.font)));
}

function buildShots() {
  const wrap = $('#shots');
  wrap.replaceChildren(
    ...session.photos.map((p, i) => {
      const c = photoToCanvas(p, 168, 126, { mirror: settings.mirrorSaved });
      return el(
        'div',
        { class: 'shot' },
        c,
        el('button', {
          type: 'button',
          class: 'btn btn-small',
          text: `Retake ${i + 1}`,
          'aria-label': `Retake photo ${i + 1}`,
          onclick: () => hooks.onRetake(i)
        })
      );
    })
  );
}

// ----- adjust (move and zoom each photo inside its slot) ----------------------------

function adjIndex() {
  const i = Math.min(Math.max(0, session.adjSel), session.photos.length - 1);
  session.adjSel = i;
  return i;
}

function adjustInfo(i) {
  const L = getLayout(session.layout, session.photos.length);
  const s = L.slots[i];
  const area = photoArea(s, getDesign(session.design), session.frame);
  const cr = cropRect(session.photos[i], area.w / area.h, getAdj(i));
  return { L, s, area, cr };
}

function adjThumb(i) {
  return photoToCanvas(session.photos[i], 128, 96, { mirror: settings.mirrorSaved, adj: session.adjust[i] });
}

function buildAdjust() {
  $('#adj-photos').replaceChildren(
    ...session.photos.map((p, i) =>
      el(
        'button',
        {
          type: 'button',
          class: 'adj-photo',
          'aria-pressed': 'false',
          'aria-label': `Adjust photo ${i + 1}`,
          onclick: () => {
            session.adjSel = i;
            syncAdjust();
            schedule();
          }
        },
        adjThumb(i),
        el('span', { text: String(i + 1) })
      )
    )
  );
}

function updateAdjThumb(i) {
  const c = $$('#adj-photos .adj-photo canvas')[i];
  if (c) blit(c, adjThumb(i));
}

// Refresh the Adjust controls from the session. `except` is the slider being
// dragged right now, which must not be rewritten under the user's finger.
function syncAdjust(except) {
  if (!session.photos.length) return;
  const i = adjIndex();
  const a = getAdj(i);
  const { cr } = adjustInfo(i);
  const setValue = (id, v) => {
    if (id !== except) $(id).value = String(Math.round(v));
  };
  $$('#adj-photos .adj-photo').forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
  setValue('#adj-zoom', a.z * 100);
  $('#adj-zoom-val').textContent = `${Math.round(a.z * 100)}%`;
  setValue('#adj-x', settings.mirrorSaved ? a.px * 100 : (1 - a.px) * 100);
  setValue('#adj-y', (1 - a.py) * 100);
  const canX = cr.slackX > 0.5;
  const canY = cr.slackY > 0.5;
  $('#adj-x').disabled = !canX;
  $('#adj-y').disabled = !canY;
  $('#adjust-hint').textContent =
    canX || canY
      ? 'Drag a photo on your strip to move it. Pinch or scroll to zoom.'
      : 'Zoom in, then drag the photo on your strip to move it.';
  $('#adj-reset').disabled = !session.adjust[i];
  $('#adj-reset-all').disabled = !session.adjust.some(Boolean);
}

function afterAdjust(i, except) {
  markDirty('layout', 'design', 'frame', 'filter');
  updateAdjThumb(i);
  syncAdjust(except);
  schedule();
}

function changeAdj(i, patch, except) {
  setAdj(i, patch);
  afterAdjust(i, except);
}

// Zoom while keeping whatever is in the middle of the crop in the middle.
function zoomTo(i, z, except) {
  const { area } = adjustInfo(i);
  const photo = session.photos[i];
  const da = area.w / area.h;
  const cur = getAdj(i);
  const nz = Math.min(ADJ_MAX_ZOOM, Math.max(1, z));
  const before = cropRect(photo, da, cur);
  const after = cropRect(photo, da, { ...cur, z: nz });
  const cx = before.sx + before.sw / 2;
  const cy = before.sy + before.sh / 2;
  changeAdj(
    i,
    {
      z: nz,
      px: after.slackX > 0.5 ? (cx - after.sw / 2) / after.slackX : cur.px,
      py: after.slackY > 0.5 ? (cy - after.sh / 2) / after.slackY : cur.py
    },
    except
  );
}

// Which photo slot is under a point on the strip (fractions of the canvas)?
function slotAt(nx, ny) {
  const L = getLayout(session.layout, session.photos.length);
  const x = nx * L.W;
  const y = ny * L.H;
  for (let i = L.slots.length - 1; i >= 0; i--) {
    const s = L.slots[i];
    const a = (-s.rot * Math.PI) / 180;
    const dx = x - (s.x + s.w / 2);
    const dy = y - (s.y + s.h / 2);
    const lx = dx * Math.cos(a) - dy * Math.sin(a);
    const ly = dx * Math.sin(a) + dy * Math.cos(a);
    if (Math.abs(lx) <= s.w / 2 && Math.abs(ly) <= s.h / 2) return i;
  }
  return null;
}

// Move the photo so it follows a drag of (dxCss, dyCss) pixels from `start`.
function panFrom(i, start, dxCss, dyCss) {
  const { L, s, area } = adjustInfo(i);
  const unit = canvas.getBoundingClientRect().width / L.W; // screen pixels per design unit
  const dx = dxCss / unit;
  const dy = dyCss / unit;
  const a = (-s.rot * Math.PI) / 180;
  const lx = dx * Math.cos(a) - dy * Math.sin(a);
  const ly = dx * Math.sin(a) + dy * Math.cos(a);
  const cr = cropRect(session.photos[i], area.w / area.h, start);
  const flip = settings.mirrorSaved ? -1 : 1;
  const patch = {};
  if (cr.slackX > 0.5) patch.px = start.px + (-lx * flip * (cr.sw / area.w)) / cr.slackX;
  if (cr.slackY > 0.5) patch.py = start.py + (-ly * (cr.sh / area.h)) / cr.slackY;
  changeAdj(i, patch);
}

// ----- sticker picker ---------------------------------------------------------------

let stickerPack = 'emoji';

function buildStickerPicker() {
  const packs = [{ id: 'emoji', name: 'Emoji' }, ...STICKER_PACKS];
  $('#sticker-packs').replaceChildren(
    ...packs.map((p) =>
      el('button', {
        type: 'button',
        class: 'packchip',
        'data-pack': p.id,
        'aria-pressed': String(p.id === stickerPack),
        text: p.name,
        onclick: () => {
          stickerPack = p.id;
          showStickerPack();
        }
      })
    )
  );
  showStickerPack();
  loadStickers().then(showStickerPack);
}

function showStickerPack() {
  $$('#sticker-packs .packchip').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.pack === stickerPack)));
  const grid = $('#sticker-grid');
  grid.classList.toggle('drawn', stickerPack !== 'emoji');
  if (stickerPack === 'emoji') {
    grid.replaceChildren(
      ...STICKERS.map((ch) =>
        el('button', { type: 'button', 'aria-label': `Add sticker ${ch}`, text: ch, onclick: () => addSticker(ch) })
      )
    );
    return;
  }
  const pack = STICKER_PACKS.find((p) => p.id === stickerPack);
  grid.replaceChildren(
    ...pack.items.map((s) => {
      const src = stickerSrc(s.id);
      return el(
        'button',
        { type: 'button', 'aria-label': `Add sticker ${s.name}`, onclick: () => addSticker('svg:' + s.id) },
        ...(src ? [el('img', { src, alt: '', draggable: 'false' })] : [])
      );
    })
  );
}

// ----- stickers -------------------------------------------------------------------

function addSticker(char) {
  const s = {
    id: ++stickerSeq,
    char,
    x: 0.3 + Math.random() * 0.4,
    y: 0.25 + Math.random() * 0.4,
    size: 0.16,
    rot: (Math.random() - 0.5) * 0.5
  };
  session.stickers.push(s);
  session.selectedId = s.id;
  stickerTools();
  schedule();
}

function selected() {
  return session.stickers.find((s) => s.id === session.selectedId) || null;
}

function changeSticker(fn) {
  const s = selected();
  if (!s) return;
  fn(s);
  schedule();
}

function deleteSelected() {
  session.stickers = session.stickers.filter((s) => s.id !== session.selectedId);
  session.selectedId = null;
  stickerTools();
  schedule();
}

function stickerTools() {
  const has = !!selected();
  for (const id of ['#st-smaller', '#st-larger', '#st-left', '#st-right', '#st-delete']) $(id).disabled = !has;
  $('#st-clear').disabled = session.stickers.length === 0;
  $('#sticker-hint').textContent = has
    ? 'Drag to move. Pinch with two fingers to resize and turn.'
    : session.stickers.length
      ? 'Tap a sticker on your strip to select it.'
      : 'Tap a sticker to add it to your strip.';
}

function bindPreviewGestures() {
  const pointers = new Map();
  let drag = null;
  let pinch = null;
  let tap = null; // a press on empty canvas: only a clean tap deselects
  let adjPan = null; // Adjust tab: one finger moving a photo
  let adjPinch = null; // Adjust tab: two fingers zooming it

  const norm = (e) => {
    const r = canvas.getBoundingClientRect();
    return { nx: (e.clientX - r.left) / r.width, ny: (e.clientY - r.top) / r.height };
  };

  const hit = (nx, ny) => {
    const L = getLayout(session.layout, session.photos.length);
    const ref = Math.min(L.W, L.H);
    const minR = (24 * L.W) / canvas.getBoundingClientRect().width; // fingers need a 24px target
    for (let i = session.stickers.length - 1; i >= 0; i--) {
      const s = session.stickers[i];
      const dx = (nx - s.x) * L.W;
      const dy = (ny - s.y) * L.H;
      const r = Math.max(s.size * ref * 0.62, minR);
      if (dx * dx + dy * dy <= r * r) return s;
    }
    return null;
  };

  const pairMetrics = () => {
    const [a, b] = [...pointers.values()];
    return { dist: Math.hypot(b.x - a.x, b.y - a.y), angle: Math.atan2(b.y - a.y, b.x - a.x) };
  };

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (currentTab === 'adjust') {
      adjustDown(e);
      return;
    }
    if (pointers.size === 1) {
      const { nx, ny } = norm(e);
      const s = hit(nx, ny);
      if (s) {
        session.selectedId = s.id;
        session.stickers = session.stickers.filter((x) => x !== s).concat(s); // bring to front
        drag = { id: s.id, dx: s.x - nx, dy: s.y - ny };
        tap = null;
      } else {
        drag = null;
        tap = { x: e.clientX, y: e.clientY };
      }
      stickerTools();
    } else if (pointers.size === 2) {
      tap = null;
      if (selected()) {
        const s = selected();
        const m = pairMetrics();
        pinch = { dist: m.dist, angle: m.angle, size: s.size, rot: s.rot };
        drag = null;
      }
    }
    schedule();
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (currentTab === 'adjust') {
      adjustMove(e);
      return;
    }
    if (tap && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > 8) tap = null;
    const s = selected();
    if (!s) return;
    if (pinch && pointers.size >= 2) {
      const m = pairMetrics();
      s.size = Math.min(0.6, Math.max(0.04, pinch.size * (m.dist / pinch.dist)));
      s.rot = pinch.rot + (m.angle - pinch.angle);
      schedule();
    } else if (drag && drag.id === s.id) {
      const { nx, ny } = norm(e);
      s.x = Math.min(1, Math.max(0, nx + drag.dx));
      s.y = Math.min(1, Math.max(0, ny + drag.dy));
      schedule();
    }
  });

  const end = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) {
      pinch = null;
      adjPinch = null;
    }
    if (pointers.size === 0) {
      adjPan = null;
      canvas.style.cursor = currentTab === 'adjust' ? 'grab' : 'default';
    }
    if (pointers.size === 0) {
      drag = null;
      if (tap && e.type === 'pointerup') {
        session.selectedId = null; // tapped empty space
        stickerTools();
        schedule();
      }
      tap = null;
    }
  };
  function adjustDown(e) {
    if (pointers.size === 1) {
      const { nx, ny } = norm(e);
      const i = slotAt(nx, ny);
      if (i == null) return;
      session.adjSel = i;
      adjPan = { i, x: e.clientX, y: e.clientY, start: getAdj(i) };
      canvas.style.cursor = 'grabbing';
      syncAdjust();
    } else if (pointers.size === 2) {
      const i = adjIndex();
      adjPan = null;
      adjPinch = { i, dist: pairMetrics().dist, z: getAdj(i).z };
    }
    schedule();
  }

  function adjustMove(e) {
    if (adjPinch && pointers.size >= 2) {
      zoomTo(adjPinch.i, adjPinch.z * (pairMetrics().dist / adjPinch.dist));
    } else if (adjPan && pointers.size === 1) {
      panFrom(adjPan.i, adjPan.start, e.clientX - adjPan.x, e.clientY - adjPan.y);
    }
  }

  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  canvas.addEventListener(
    'wheel',
    (e) => {
      if (currentTab === 'adjust') {
        e.preventDefault();
        const { nx, ny } = norm(e);
        const over = slotAt(nx, ny);
        if (over != null) session.adjSel = over;
        const i = adjIndex();
        zoomTo(i, getAdj(i).z * (1 - e.deltaY * 0.0015));
        return;
      }
      const s = selected();
      if (!s) return;
      e.preventDefault();
      s.size = Math.min(0.6, Math.max(0.04, s.size * (1 - e.deltaY * 0.0015)));
      schedule();
    },
    { passive: false }
  );

  document.addEventListener('keydown', (e) => {
    if ($('#screen-edit').hidden || currentTab === 'adjust' || !selected()) return;
    if (e.target.closest('input, textarea, button')) return;
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      deleteSelected();
    }
  });
}

// ----- export -----------------------------------------------------------------------

async function busy(btn, label, work) {
  const sub = $('span', btn);
  const original = sub.textContent;
  btn.disabled = true;
  sub.textContent = label;
  try {
    await work((text) => (sub.textContent = text));
  } catch (err) {
    if (err && err.name === 'AbortError') return; // share sheet dismissed
    toast(err && err.message ? err.message : 'Something went wrong. Try again.');
  } finally {
    btn.disabled = false;
    sub.textContent = original;
  }
}

function bindExport() {
  $('#btn-save').addEventListener('click', () => {
    $('#exp-share').hidden = !exp.canShareFiles();
    openModal('#modal-export');
  });

  $('#exp-png').addEventListener('click', (e) =>
    busy(e.currentTarget, 'Preparing...', async () => {
      const blob = await exp.stripBlob(renderState());
      exp.download(blob, `flickora-${exp.stamp()}.png`);
      toast('Saved. Check your downloads.');
    })
  );
  $('#exp-share').addEventListener('click', (e) =>
    busy(e.currentTarget, 'Preparing...', async () => {
      const blob = await exp.stripBlob(renderState());
      await exp.shareBlob(blob, `flickora-${exp.stamp()}.png`);
    })
  );
  $('#exp-gif').addEventListener('click', (e) =>
    busy(e.currentTarget, 'Making GIF...', async (setLabel) => {
      const blob = await exp.gifBlob(renderState(), (p) => setLabel(`Making GIF ${Math.round(p * 100)}%`));
      exp.download(blob, `flickora-${exp.stamp()}.gif`);
      toast('Saved. Check your downloads.');
    })
  );
  $('#exp-sheet').addEventListener('click', (e) =>
    busy(e.currentTarget, 'Preparing...', async () => {
      const blob = await exp.sheetBlob(renderState());
      exp.download(blob, `flickora-4x6-${exp.stamp()}.png`);
      toast('Saved. Check your downloads.');
    })
  );
  $('#exp-print').addEventListener('click', (e) =>
    busy(e.currentTarget, 'Preparing...', async () => {
      closeModal('#modal-export');
      await exp.printSheet(renderState());
    })
  );

  $('#confirm-yes').addEventListener('click', () => {
    closeModal('#modal-confirm');
    hooks.onRetakeAll();
  });
}

// ----- public -------------------------------------------------------------------------

export function init(h) {
  hooks = h;
}

export async function open() {
  await loadFonts();
  build();
  markDirty('layout', 'design', 'frame', 'filter');
  baseCanvas = null;
  syncText();
  markPressed();
  buildShots();
  buildAdjust();
  stickerTools();
  setTab(currentTab);
  fit();
  schedule();
}
