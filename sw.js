// Offline support: everything is cached on first visit and served from the cache.
// When online, files are refreshed in the background, so updates show up on the next launch.
// Bump VERSION when you add or rename files.
const VERSION = 'bbict-v9';
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
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(VERSION).then(cache =>
      cache.match(e.request, { ignoreSearch: true }).then(hit => {
        const net = fetch(e.request).then(res => {
          if (res && res.ok && res.type === 'basic') cache.put(e.request, res.clone());
          return res;
        }).catch(() => hit);
        return hit || net;
      })
    )
  );
});
