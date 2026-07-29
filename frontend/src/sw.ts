/* eslint-disable @typescript-eslint/no-unused-vars */
/// <reference lib="webworker" />

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `shranix-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `shranix-dynamic-${CACHE_VERSION}`;
const API_CACHE = `shranix-api-${CACHE_VERSION}`;
const ASSET_CACHE = `shranix-assets-${CACHE_VERSION}`;

const STATIC_ASSETS: string[] = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
];

const ctx = self as any as ServiceWorkerGlobalScope;

ctx.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting()),
  );
});

ctx.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE && key !== API_CACHE && key !== ASSET_CACHE)
          .map((key) => caches.delete(key)),
      );
    }).then(() => self.clients.claim()),
  );
});

ctx.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || !url.protocol.startsWith('http:')) {return;}

  if (request.mode === 'navigate') {
    event.respondWith(navigateWithCache(request));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirstAsset(request));
    return;
  }

  if (url.pathname.startsWith('/api/health') || url.pathname.startsWith('/api/ai/health')) {
    event.respondWith(cacheFirstApi(request));
    return;
  }

  event.respondWith(networkFirstWithFallback(request));
});

function isStaticAsset(url: URL): boolean {
  // .js files are Vite modules (transformed TS/TSX at runtime), never cache them
  const extensions = ['.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot'];
  return extensions.some((ext) => url.pathname.endsWith(ext));
}

async function navigateWithCache(request: Request): Promise<Response> {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    throw new Error('Network response not OK');
  } catch {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {return cachedResponse;}

    const offlinePage = await caches.match('/offline.html');
    if (offlinePage) {return offlinePage;}

    return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }
}

async function cacheFirstAsset(request: Request): Promise<Response> {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {return cachedResponse;}

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(ASSET_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    return new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain' } });
  }
}

async function cacheFirstApi(request: Request): Promise<Response> {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {return cachedResponse;}

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    return new Response(JSON.stringify({ error: 'Offline' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function networkFirstWithFallback(request: Request): Promise<Response> {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {return cachedResponse;}

    return new Response(JSON.stringify({ error: 'Network unavailable', offline: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

ctx.addEventListener('push', (event: PushEvent) => {
  const data = event.data?.json();
  if (!data) {return;}

  const title = data.title || 'SHRANIX ERP';
  const options: NotificationOptions = {
    body: data.body || 'New notification',
    icon: '/logo.png',
    badge: '/logo.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'default',
    data: data.data || {},
    requireInteraction: data.requireInteraction || false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

ctx.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const data = event.notification.data || {};
  const url = (data as Record<string, unknown>).url as string || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({ type: 'NAVIGATE', url });
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});

ctx.addEventListener('sync', (event: SyncEvent) => {
  if (event.tag.startsWith('sync-offline-')) {
    event.waitUntil(Promise.resolve());
  }
});
