// Flickora service worker: precaches the app shell so it works offline,
// then serves from cache while refreshing in the background.
const CACHE = 'flickora-v9';
const ASSETS = ["./", "css/style.css", "fonts/abril-fatface-latin-400-normal.woff2", "fonts/bangers-latin-400-normal.woff2", "fonts/bricolage-grotesque-latin-wght-normal.woff2", "fonts/caveat-latin-700-normal.woff2", "fonts/chewy-latin-400-normal.woff2", "fonts/fredoka-latin-600-normal.woff2", "fonts/gloria-hallelujah-latin-400-normal.woff2", "fonts/lobster-latin-400-normal.woff2", "fonts/permanent-marker-latin-400-normal.woff2", "fonts/sacramento-latin-400-normal.woff2", "fonts/bungee-latin-400-normal.woff2", "fonts/comic-neue-latin-400-normal.woff2", "fonts/comic-neue-latin-700-normal.woff2", "fonts/pacifico-latin-400-normal.woff2", "fonts/press-start-2p-latin-400-normal.woff2", "fonts/shrikhand-latin-400-normal.woff2", "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "icons/icon.svg", "index.html", "js/audio.js", "js/booth.js", "js/camera.js", "js/demo.js", "js/design-kit.js", "js/designs-more.js", "js/designs.js", "js/dom.js", "js/editor.js", "js/export.js", "js/filters.js", "js/frames.js", "js/layouts.js", "js/main.js", "js/render.js", "js/stickers.js", "js/store.js", "js/upload.js", "js/vendor/gifenc.js", "manifest.webmanifest"];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  event.respondWith(
    caches.match(req).then((hit) => {
      const network = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || network;
    })
  );
});
