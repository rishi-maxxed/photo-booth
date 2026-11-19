// Persistent settings (localStorage, wrapped for private-mode safety) and the
// in-memory session (photos + edit choices).

const KEY = 'flickora.settings.v1';
const OLD_KEY = 'stripbooth.settings.v1'; // settings saved before the rename

const defaults = {
  shots: 4,          // photos per strip: 4 or 5
  timer: 3,          // countdown seconds between shots
  sound: true,
  flash: true,
  mirrorSaved: false // mirror the saved photos (selfie look) instead of true view
};

function load() {
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem(OLD_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export const settings = { ...defaults, ...load() };
if (![4, 5].includes(settings.shots)) settings.shots = 4;
if (![3, 5, 10].includes(settings.timer)) settings.timer = 3;

export function saveSettings() {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* storage unavailable: settings last for this visit only */
  }
}

export const session = {
  photos: [],          // HTMLCanvasElement per shot, index = pose number
  rev: 0,              // bumps whenever photos change, used for render caching
  layout: 'classic',
  design: 'classic',
  frame: 'design',     // 'design' = use the design's own photo border, else a frame id
  filter: 'none',
  caption: '',
  showDate: true,
  font: 'script',
  fontTouched: false,  // true once the user picks a caption font themselves
  stickers: [],        // { id, char, x, y, size, rot }  x/y/size are fractions of strip width/height
  selectedId: null,
  adjust: [],          // per photo { z, px, py }: zoom and crop position (sparse, missing = default)
  adjRev: 0,           // bumps whenever any photo adjustment changes
  adjSel: 0            // photo being adjusted in the Adjust tab
};

// Default crop: no zoom, centred sideways, biased upward so heads are not cut off.
export const ADJ_DEFAULT = { z: 1, px: 0.5, py: 0.4 };
export const ADJ_MAX_ZOOM = 3;

export function getAdj(i) {
  return { ...ADJ_DEFAULT, ...(session.adjust[i] || {}) };
}

export function setAdj(i, patch) {
  const a = { ...getAdj(i), ...patch };
  a.z = Math.min(ADJ_MAX_ZOOM, Math.max(1, a.z));
  a.px = Math.min(1, Math.max(0, a.px));
  a.py = Math.min(1, Math.max(0, a.py));
  session.adjust[i] = a;
  session.adjRev++;
}

export function resetAdj(i) {
  session.adjust[i] = undefined;
  session.adjRev++;
}

export function resetAllAdj() {
  session.adjust = [];
  session.adjRev++;
}

export function setPhoto(index, canvas) {
  session.photos[index] = canvas;
  session.adjust[index] = undefined; // a new photo starts with the default crop
  session.adjRev++;
  session.rev++;
}

export function setPhotos(list) {
  session.photos = list;
  session.adjust = [];
  session.adjSel = 0;
  session.adjRev++;
  session.rev++;
}

export function resetEdits() {
  session.stickers = [];
  session.selectedId = null;
}
