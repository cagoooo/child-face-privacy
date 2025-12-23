/* =====================================================
   Service Worker - 離線快取支援
   ===================================================== */

const CACHE_NAME = 'child-face-privacy-v1.2.0';
const STATIC_ASSETS = [
    './',
    './index.html',
    './style.css',
    './rwd.css',
    './mask-types.css',
    './loading-progress.css',
    './upload-progress.css',
    './app.js',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

const CDN_ASSETS = [
    'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js',
    'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
    'https://cdn.jsdelivr.net/npm/file-saver@2.0.5/dist/FileSaver.min.js',
    'https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&display=swap'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Caching static assets...');
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Skip blob URLs (for downloads)
    if (url.protocol === 'blob:') return;

    // Handle CDN requests with cache-first strategy
    if (url.origin !== location.origin) {
        event.respondWith(
            caches.match(request).then((cached) => {
                if (cached) return cached;

                return fetch(request).then((response) => {
                    // Clone and cache CDN responses
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, clone);
                        });
                    }
                    return response;
                }).catch(() => {
                    // Return offline fallback if needed
                    return new Response('Offline', { status: 503 });
                });
            })
        );
        return;
    }

    // Handle local requests with NETWORK-FIRST strategy (to get latest updates)
    event.respondWith(
        fetch(request).then((response) => {
            // Cache successful responses
            if (response.ok) {
                const clone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(request, clone);
                });
            }
            return response;
        }).catch(() => {
            // Fallback to cache if network fails
            return caches.match(request);
        })
    );
});
