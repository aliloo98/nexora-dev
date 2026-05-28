const CACHE_NAME = 'budget-ali-megane-v12';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './favicon.png',
  './icon-192.png',
  './icon-512.png',
  './icon-gold-192.png',
  './icon-gold-512.png',
  './icon-emerald-192.png',
  './icon-emerald-512.png',
  './icon-amethyst-192.png',
  './icon-amethyst-512.png',
  './icon-ruby-192.png',
  './icon-ruby-512.png',
  './icon-ocean-192.png',
  './icon-ocean-512.png',
  './styles.css',
  './js/storage.js',
  './js/utils.js',
  './js/theme-manager.js',
  './js/logo-manager.js'
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
          const iconTheme = url.searchParams.get('icon') || 'gold';
          data.icons = [
            { "src": `icon-${iconTheme}-192.png`, "sizes": "192x192", "type": "image/png" },
            { "src": `icon-${iconTheme}-512.png`, "sizes": "512x512", "type": "image/png" }
          ];
          return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
        })
        .catch(() => {
          return caches.match(e.request, { ignoreSearch: true }).then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse.json().then(data => {
                const iconTheme = url.searchParams.get('icon') || 'gold';
                data.icons = [
                  { "src": `icon-${iconTheme}-192.png`, "sizes": "192x192", "type": "image/png" },
                  { "src": `icon-${iconTheme}-512.png`, "sizes": "512x512", "type": "image/png" }
                ];
                return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
              });
            }
            // Absolute fallback manifest if cache is empty
            const iconTheme = url.searchParams.get('icon') || 'gold';
            const fallback = {
              "name": "Budget Ali & Megane",
              "short_name": "Budget",
              "description": "Application de gestion de budget de couple pour Ali & Megane.",
              "start_url": "./index.html",
              "display": "standalone",
              "background_color": "#07070a",
              "theme_color": "#07070a",
              "orientation": "portrait-primary",
              "icons": [
                { "src": `icon-${iconTheme}-192.png`, "sizes": "192x192", "type": "image/png" },
                { "src": `icon-${iconTheme}-512.png`, "sizes": "512x512", "type": "image/png" }
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
