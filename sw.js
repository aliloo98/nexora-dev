const CACHE_NAME = 'nexora-v14';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/styles.css',
  '/js/storage.js',
  '/js/utils.js',
  '/js/theme-manager.js',
  '/js/logo-manager.js'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then(keys => {
        return Promise.all(
          keys.map(key => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        );
      })
    ])
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.pathname.endsWith('manifest.json')) {
    e.respondWith(
      fetch(e.request)
        .then(response => response.json())
        .then(data => {
          data.icons = [
            { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
            { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
          ];
          return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
        })
        .catch(() => {
          return caches.match(e.request, { ignoreSearch: true }).then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse.json().then(data => {
                data.icons = [
                  { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
                  { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
                ];
                return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
              });
            }
            // Absolute fallback manifest if cache is empty
            const fallback = {
              "name": "NEXORA",
              "short_name": "NEXORA",
              "description": "Application de gestion de budget NEXORA.",
              "start_url": "/",
              "display": "standalone",
              "scope": "/",
              "background_color": "#07070a",
              "theme_color": "#07070a",
              "orientation": "portrait-primary",
              "icons": [
                { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
                { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
              ]
            };
            return new Response(JSON.stringify(fallback), { headers: { 'Content-Type': 'application/json' } });
          });
        })
    );
  } else {
    const request = e.request;
    const shouldNetworkFirst = request.destination === 'document' || request.destination === 'script' || request.destination === 'style' || request.url.endsWith('.html') || request.url.endsWith('.js') || request.url.endsWith('.css');
    if (shouldNetworkFirst) {
      e.respondWith(
        fetch(request)
          .then(response => {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
            return response;
          })
          .catch(() => caches.match(request))
      );
    } else {
      e.respondWith(
        caches.match(request).then(cachedResponse => cachedResponse || fetch(request))
      );
    }
  }
});
