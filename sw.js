// ラベルウォッチ：オフライン用のサービスワーカー
// このアプリ自身のファイル（同じ場所にあるもの）だけを端末にキャッシュします。
// 記録データには触れず、外部への通信も行いません。
const CACHE = 'labelwatch-v1.6';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './apple-touch-icon.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('labelwatch-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// キャッシュがあればすぐそれを返し、つながる時だけ裏でアプリのファイルを新しくする
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const update = fetch(req)
    .then(async (res) => {
      if (res && res.ok && res.type === 'basic') {
        const cache = await caches.open(CACHE);
        await cache.put(req, res.clone());
      }
      return res;
    })
    .catch(() => undefined);
  event.waitUntil(update);

  event.respondWith((async () => {
    const cached = await caches.match(req, { ignoreSearch: true });
    if (cached) return cached;
    const res = await update;
    if (res) return res;
    if (req.mode === 'navigate') {
      const page = (await caches.match('./index.html')) || (await caches.match('./'));
      if (page) return page;
    }
    return Response.error();
  })());
});
