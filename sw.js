// 减肥工作台 - Service Worker (网络优先 + 离线回退 + 自动更新)
const CACHE_NAME = 'weightloss-wb-v2';
const CORE_ASSETS = [
  './',
  'index.html',
  '减肥工作台.html',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js'
];

// 安装：预缓存核心资源，跳过等待立即激活
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CORE_ASSETS).catch(err => {
        console.warn('部分资源预缓存失败:', err);
      });
    })
  );
  self.skipWaiting();  // 新 SW 立即接管
});

// 激活：清理所有旧版本缓存，通知客户端刷新
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('🗑 删除旧缓存:', k);
          return caches.delete(k);
        })
      );
    }).then(() => {
      // 通知所有打开的页面：有新版本，请刷新
      return self.clients.matchAll({ type: 'window' });
    }).then(clients => {
      clients.forEach(client => client.postMessage({ type: 'SW_UPDATED' }));
    })
  );
  self.clients.claim();
});

// 拦截请求：网络优先（保证拿到最新内容）+ 离线时回退缓存
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  // HTML 文档类请求：网络优先 + 后台更新缓存
  if (event.request.mode === 'navigate' ||
      event.request.destination === 'document' ||
      event.request.url.includes('.html')) {
    event.respondWith(
      fetch(event.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => {
        return caches.match(event.request).then(cached => {
          return cached || caches.match('./') || caches.match('index.html');
        });
      })
    );
    return;
  }

  // 其他资源（JS/CSS/图片/图标）：缓存优先 + 后台更新
  event.respondWith(
    caches.match(event.request).then(cached => {
      const networkFetch = fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);

      return cached || networkFetch;
    })
  );
});

// 接收客户端消息：手动触发立即更新
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CHECK_UPDATE') {
    // 主动检查是否有新版本
    fetch('./', { cache: 'no-store' }).then(() => {
      self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(c => c.postMessage({ type: 'UPDATE_AVAILABLE' }));
      });
    }).catch(() => {});
  }
});
