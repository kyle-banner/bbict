// Offline support.
// - The page itself loads network-first (fresh when you have signal, saved copy when you don't
//   or when the network takes longer than 3 seconds).
// - Sounds and icons load from the saved copy instantly and refresh in the background.
// - Every network request skips the browser's HTTP cache, because GitHub Pages lets browsers
//   reuse files for 10 minutes, which otherwise gets old files saved under a new version.
// Bump VERSION on every release so phones pick up the new service worker.
const VERSION = 'bbict-v20';
const FILES = [
  './',
  'index.html',
  'manifest.json',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'sounds/airhorn.wav',
  'sounds/damn-son.mp3',
  'sounds/chad-alert.mp3'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function fresh(req) {
  return fetch(req, { cache: 'no-cache' });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  if (req.mode === 'navigate') {
    // Page: network first, saved copy as fallback.
    e.respondWith(caches.open(VERSION).then(cache => {
      const net = fresh(req).then(res => {
        if (res && res.ok) cache.put('./', res.clone());
        return res;
      });
      const timeout = new Promise(r => setTimeout(r, 3000));
      const saved = () => cache.match('./').then(hit => hit || cache.match('index.html'));
      return Promise.race([net.catch(() => null), timeout.then(() => null)])
        .then(res => res || saved().then(hit => hit || net));
    }));
    return;
  }

  // Everything else: saved copy first, refresh in the background.
  e.respondWith(caches.open(VERSION).then(cache =>
    cache.match(req, { ignoreSearch: true }).then(hit => {
      const net = fresh(req).then(res => {
        if (res && res.ok && res.type === 'basic') cache.put(req, res.clone());
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  ));
});
