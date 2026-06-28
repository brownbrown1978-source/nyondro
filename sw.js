/* Нёндро service worker — офлайн + авто-обновление.
   HTML — network-first (онлайн всегда свежий, офлайн — из кэша).
   Свои ресурсы — cache-first с дозакачкой. Чужой домен (шрифты, esm.sh) — только сеть,
   не кэшируем: opaque-ответ ломает импорт модулей. */
const CACHE = 'ngondro-2026-06-28-b26';
const CORE = ['ngondro.html', 'manifest.webmanifest', 'sadhana.json'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(CORE.map((u) => c.add(u).catch(() => {})))));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // чужой домен — не трогаем (сеть как есть)
  if (url.origin !== self.location.origin) return;

  const isHTML = req.mode === 'navigate' || url.pathname.endsWith('ngondro.html');
  if (isHTML) {
    e.respondWith(
      fetch(req).then((r) => {
        const cp = r.clone();
        caches.open(CACHE).then((c) => c.put('ngondro.html', cp));
        return r;
      }).catch(() => caches.match('ngondro.html').then((r) => r || caches.match(req)))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((r) => {
      const cp = r.clone();
      caches.open(CACHE).then((c) => c.put(req, cp)).catch(() => {});
      return r;
    }).catch(() => hit))
  );
});
