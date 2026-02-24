const STATIC_CACHE = 'kitchen-static-v1';
const GROCERY_CACHE = 'kitchen-grocery-v1';
const ALL_CACHES = [STATIC_CACHE, GROCERY_CACHE];

// No precaching on install — let runtime visits populate the cache
self.addEventListener('install', () => self.skipWaiting());

// Clean up any caches from old versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !ALL_CACHES.includes(key))
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GET requests
  if (url.origin !== location.origin || request.method !== 'GET') return;

  // ── Cache-first for Next.js static assets ────────────────────────────────
  // These are content-hashed by Next.js so they're safe to cache indefinitely.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              caches
                .open(STATIC_CACHE)
                .then((cache) => cache.put(request, response.clone()));
            }
            return response;
          })
      )
    );
    return;
  }

  // ── Network-first with offline fallback for grocery list ─────────────────
  // Caches both the page HTML and the API response so the grocery list is
  // readable in the store even without internet.
  if (
    url.pathname === '/grocery' ||
    url.pathname.startsWith('/api/grocery')
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            caches
              .open(GROCERY_CACHE)
              .then((cache) => cache.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }
});
