/* BAD App offline support.
   - The app page: network first, so every update arrives straight away; the saved copy opens it when there's no signal.
   - Photos, icons and the Firebase library: saved copy first, refreshed in the background.
   - The database (Firestore) is never touched here: Firebase keeps its own offline copy.
   - The BAD DAY video is skipped (phones stream it in pieces). */
const SHELL = 'bad-shell-v2', FILES = 'bad-files-v1';
const START = ['./', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png', './favicon-32.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(START)).catch(() => {}).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== SHELL && k !== FILES).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const isPage = (req, url) => req.mode === 'navigate' || (url.origin === location.origin && /\/(index\.html)?$/.test(url.pathname));
const isFile = url =>
  (url.origin === location.origin && /(\.(png|jpe?g|webp|svg|ico|webmanifest)|\/config\.js)$/i.test(url.pathname)) ||
  (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/')) ||
  url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com' || url.hostname === 'cdnjs.cloudflare.com';

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (/\.mp4$/i.test(url.pathname)) return;

  if (isPage(req, url)) {
    /* no-cache: always ask the server, so a long browser cache setting never holds back an update */
    e.respondWith(fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(SHELL).then(c => c.put('./', copy)); }
      return res;
    }).catch(() => caches.match('./', { ignoreSearch: true }).then(r => r || caches.match(req))));
    return;
  }

  if (isFile(url)) {
    e.respondWith(caches.open(FILES).then(c => c.match(req).then(hit => {
      const fresh = fetch(req).then(res => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || fresh;
    })));
  }
});
