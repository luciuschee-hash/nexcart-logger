// Nexcart Ops · Recorder Service Worker
// Version-aware cache. Bumping the VERSION constant invalidates all old caches.
// 部署时如果改了 recorder.html 大版本，记得把这里 VERSION 加 1。

const VERSION = 'recorder-v3-0-1';
const ASSETS = [
  './recorder.html',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION).then((c) => c.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith('recorder-') && k !== VERSION)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Never cache API calls (Cloudflare Worker)
  if (url.hostname.includes('workers.dev') || url.pathname.includes('/api/')) return;
  // Network-first for HTML so updates land fast; cache fallback for offline
  if (e.request.mode === 'navigate' || e.request.destination === 'document') {
    e.respondWith(
      fetch(e.request)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(VERSION).then((c) => c.put(e.request, copy)).catch(() => {});
          return resp;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }
  // Cache-first for other static assets
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((resp) => {
      const copy = resp.clone();
      caches.open(VERSION).then((c) => c.put(e.request, copy)).catch(() => {});
      return resp;
    }).catch(() => hit))
  );
});
