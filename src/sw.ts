// Service worker (built by vite-plugin-pwa in injectManifest mode). Precaches the app shell,
// caches the heavy ffmpeg cores on first use, and updates quietly on the next launch.

import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

// vite-plugin-pwa replaces the literal `self.__WB_MANIFEST` with the precache manifest at build
// time, so that token must survive verbatim — the `as` casts below are erased by the bundler,
// leaving exactly `self.__WB_MANIFEST`. (The project's tsconfig has both DOM and WebWorker libs,
// so we cast `self` rather than redeclare it.)
precacheAndRoute(
  (self as unknown as { __WB_MANIFEST: Array<string | { url: string; revision: string | null }> })
    .__WB_MANIFEST,
);
cleanupOutdatedCaches();
// No skipWaiting(): a new shell installs quietly and takes over on the next launch. The cached
// index.html keeps the server's COOP/COEP headers, so SW-served navigations stay
// cross-origin-isolated and the multi-threaded ffmpeg core still works offline.

const worker = self as unknown as ServiceWorkerGlobalScope;
const ENGINE_CACHE = 'cove-engines-v1';

// Cache the lazily-loaded ffmpeg cores on first use, so a tool used once works offline next time.
worker.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== worker.location.origin) return;
  if (!url.pathname.startsWith('/ffmpeg/')) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(ENGINE_CACHE);
      const cached = await cache.match(event.request);
      if (cached) return cached;
      const response = await fetch(event.request);
      if (response.ok) await cache.put(event.request, response.clone());
      return response;
    })(),
  );
});
