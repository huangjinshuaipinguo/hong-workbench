/* 洪小姐工作台 — 离线缓存（PWA）
   缓存应用外壳，使「添加到主屏幕」后可离线打开、秒开。
   数据文件（feed.js）每日更新时会随部署刷新；本机收藏等存在 localStorage，不受缓存影响。 */
const CACHE = 'hb-workbench-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/style.css',
  './assets/app.js',
  './data/knowledge.js',
  './data/feed.js',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-maskable.png',
  './assets/favicon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const isFeed = url.pathname.endsWith('/feed.json') || url.pathname.endsWith('/data/feed.json');
  if (isFeed) {
    // 情报数据：网络优先，保证每日最新；离线时退回缓存
    e.respondWith(
      fetch(e.request).then(res => {
        const cp = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, cp));
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }
  // 其余资源：缓存优先（秒开 + 离线）
  e.respondWith(
    caches.match(e.request).then(cached =>
      cached || fetch(e.request).then(res => {
        const cp = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, cp));
        return res;
      }).catch(() => caches.match('./index.html'))
    )
  );
});
