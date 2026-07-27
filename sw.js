// 减肥工作台 - Service Worker (离线缓存 + PWA)
const CACHE_NAME = 'weightloss-wb-v1';
const ASSETS = [
  './',
  '减肥工作台.html',
  'manifest.json',
  'icons/icon-48.png',
  'icons/icon-72.png',
  'icons/icon-96.png',
  'icons/icon-120.png',
  'icons/icon-128.png',
  'icons/icon-144.png',
  'icons/icon-152.png',
  'icons/icon-167.png',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-512-maskable.png',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js'
];

// 安装：预缓存核心资源
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(err => {
        console.warn('部分资源缓存失败:', err);
      });
    })
  );
  self.skipWaiting();
});

// 激活：清理旧缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

// 拦截请求：缓存优先 + 网络回退
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  // 跳过 chrome-extension 等非 HTTP 请求
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      // 缓存命中 → 直接返回
      if (cached) return cached;

      // 网络请求，同时缓存到本地
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, clone);
        });
        return response;
      }).catch(() => {
        // 离线且无缓存 → 返回空
        return new Response('', { status: 408 });
      });
    })
  );
});
