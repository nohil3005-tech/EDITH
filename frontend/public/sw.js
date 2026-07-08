const CACHE_NAME = 'edith-mobile-cache-v4';
const STATIC_ASSETS = [
  '/mobile',
  '/manifest.json',
  '/icon.svg',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap'
];

// Install Event - cache initial pages and static files
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching static shell');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - clean up old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - handle offline caching & strategies
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Skip chrome-extension, internal schemes
  if (!url.protocol.startsWith('http')) return;

  // Strategy for API calls (Network-First, fallback to cached data)
  if (url.pathname.includes('/api/v1/')) {
    e.respondWith(
      fetch(e.request)
        .then((response) => {
          // If successful response, clone and cache it
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              // Cache API queries so we can show dashboards offline
              cache.put(e.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Offline fallback: try to serve matching cached response
          return caches.match(e.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // If API call fails and no cache, return offline JSON error
            return new Response(
              JSON.stringify({ error: { message: 'You are offline. Showing cached data.' } }),
              { headers: { 'Content-Type': 'application/json' }, status: 503 }
            );
          });
        })
    );
    return;
  }

  // Strategy for Static Assets (Cache-First, fallback to Network)
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(e.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, responseToCache);
        });

        return networkResponse;
      });
    }).catch(() => {
      // Fallback for navigation requests (HTML pages)
      if (e.request.mode === 'navigate') {
        return caches.match('/mobile');
      }
    })
  );
});
