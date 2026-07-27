// vBox Service Worker - Network First Strategy
const CACHE_NAME = 'wl-box-v1';

self.addEventListener('install', function(e) {
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(names.map(function(n) { return caches.delete(n); }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  // 只处理 GET 请求
  if (e.request.method !== 'GET') return;

  e.respondWith(
    fetch(e.request)
      .then(function(response) {
        // 网络成功 → 更新缓存
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(e.request, clone);
        });
        return response;
      })
      .catch(function() {
        // 网络失败 → 回退缓存
        return caches.match(e.request);
      })
  );
});
