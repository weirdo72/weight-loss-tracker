const CACHE_NAME = 'wl-lite-v1';
const URLS_TO_CACHE = [
  '/weight-loss-tracker/wl-lite.html',
  '/weight-loss-tracker/manifest.json',
  '/weight-loss-tracker/icon-192.png',
  '/weight-loss-tracker/icon-512.png'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(URLS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(names.filter(function(n){return n!==CACHE_NAME}).map(function(n){return caches.delete(n)}));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  e.respondWith(
    caches.match(e.request).then(function(response) {
      return response || fetch(e.request);
    })
  );
});
