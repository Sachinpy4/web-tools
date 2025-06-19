// ToolsCandy Service Worker
// Provides offline functionality and caching for image processing tools

const CACHE_NAME = 'toolscandy-v1';
const OFFLINE_URL = '/offline';
const MAX_CACHE_SIZE = 50; // Maximum number of cached items
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// Assets to cache immediately when service worker installs
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/favicon.ico',
  '/favicon.svg',
  '/logo.svg'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        // Cache assets individually to handle failures gracefully
        const cachePromises = STATIC_ASSETS.map(async (url) => {
          try {
            await cache.add(url);
          } catch (error) {
            // Silently handle caching failures
          }
        });
        
        await Promise.all(cachePromises);
        
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
      .catch(() => {
        // Silently handle cache opening failures
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Take control of all clients immediately
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip API requests (they should handle their own offline behavior)
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Check if cached response is expired
        if (cachedResponse) {
          const cacheTimestamp = cachedResponse.headers.get('sw-cache-timestamp');
          if (cacheTimestamp) {
            const age = Date.now() - parseInt(cacheTimestamp);
            if (age > CACHE_EXPIRY) {
              // Remove expired cache entry
              caches.open(CACHE_NAME).then(cache => cache.delete(event.request));
            } else {
              return cachedResponse;
            }
          } else {
            // Legacy cache without timestamp, serve but mark for refresh
            return cachedResponse;
          }
        }

        // Try to fetch from network
        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Cache successful responses for future use with size management
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(async (cache) => {
                // Check cache size and clean if necessary
                const keys = await cache.keys();
                if (keys.length >= MAX_CACHE_SIZE) {
                  // Remove oldest entries (first 10 items)
                  const keysToDelete = keys.slice(0, 10);
                  await Promise.all(keysToDelete.map(key => cache.delete(key)));
                }
                
                // Add timestamp to response for expiry checking
                const headers = new Headers(responseToCache.headers);
                headers.set('sw-cache-timestamp', Date.now().toString());
                const responseWithTimestamp = new Response(responseToCache.body, {
                  status: responseToCache.status,
                  statusText: responseToCache.statusText,
                  headers: headers
                });
                
                cache.put(event.request, responseWithTimestamp);
              })
              .catch(() => {
                // Silently handle caching failures
              });

            return response;
          })
          .catch(() => {
            // For navigation requests, serve offline page
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_URL);
            }
            // For other requests, return a generic offline response
            return new Response('Offline', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});

// Handle background sync for failed requests (if supported)
if ('sync' in self.registration) {
  self.addEventListener('sync', (event) => {
    if (event.tag === 'background-sync') {
      event.waitUntil(
        // Retry failed requests here
        Promise.resolve()
      );
    }
  });
}

// Handle push notifications (if supported)
self.addEventListener('push', (event) => {
  const options = {
    body: 'Your image processing is complete!',
    icon: '/logo.svg',
    badge: '/favicon.svg',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Results',
        icon: '/logo.svg'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('ToolsCandy', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    // Open the app when notification is clicked
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message handler for communication with main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
}); 