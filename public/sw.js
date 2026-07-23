// PPR Fruits & Vegetables — Service Worker
// Built with Serwist conventions
// Strategy:
//   - NetworkFirst for all navigation and API requests (3s timeout → cache fallback)
//   - CacheFirst for static assets (/_next/static/*, fonts, images)
//   - Offline fallback page for failed navigations

const CACHE_VERSION = "ppr-v3"; // Bumped to purge cached /icons/ old favicon
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DATA_CACHE = `${CACHE_VERSION}-data`;
const OFFLINE_URL = "/offline";

// Assets to pre-cache on install
const PRECACHE_URLS = [
  "/",
  "/offline",
  "/manifest.json",
];

// ─── Install ─────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      Promise.allSettled(
        PRECACHE_URLS.map((url) => cache.add(url).catch(() => {}))
      )
    )
  );
  self.skipWaiting();
});

// ─── Activate ────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith("ppr-") && key !== STATIC_CACHE && key !== DATA_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ─── Fetch ───────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Skip non-GET requests (POST, etc.)
  if (request.method !== "GET") return;

  // Static assets: CacheFirst (versioned by Next.js build hash)
  // WARNING: In development, Next.js does not hash filenames, so CacheFirst breaks HMR.
  // We check if it's localhost to disable CacheFirst for _next/static during dev.
  const isDev = self.location.hostname === "localhost" || self.location.hostname.includes("192.168");
  
  if (
    (!isDev && url.pathname.startsWith("/_next/static/")) ||
    url.pathname.startsWith("/curated/") ||
    url.pathname.startsWith("/logo.png") ||
    url.pathname.match(/\.(woff2?|ttf|otf|eot)$/)
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Everything else (pages, API): NetworkFirst with 3s timeout
  event.respondWith(networkFirst(request, DATA_CACHE));
});

// ─── NetworkFirst strategy ────────────────────────────────────────────────────
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    // Race network against 3-second timeout
    const networkResponse = await Promise.race([
      fetch(request.clone()),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 3000)
      ),
    ]);

    // Cache successful responses for pages/HTML
    if (networkResponse.ok && request.headers.get("accept")?.includes("text/html")) {
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch {
    // Network failed — try cache
    const cached = await cache.match(request);
    if (cached) return cached;

    // No cache — return offline page for navigation requests
    if (request.headers.get("accept")?.includes("text/html")) {
      const offlineCache = await caches.open(STATIC_CACHE);
      const offlinePage = await offlineCache.match(OFFLINE_URL);
      if (offlinePage) return offlinePage;
    }

    return new Response("Offline", { status: 503 });
  }
}

// ─── CacheFirst strategy ──────────────────────────────────────────────────────
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return new Response("Asset not found", { status: 404 });
  }
}
