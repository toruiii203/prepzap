const CACHE_NAME = "studenius-v1";

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
  "/",
  "/dashboard",
  "/manifest.webmanifest",
  "/fox_icon_final.png",
  "/icon-512.png",
];

// Install — precache core assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  // Skip R2 media — let browser handle range requests natively
  if (url.includes("r2.dev") || url.includes("r2.cloudflarestorage.com")) {
    return;
  }

  // Skip Supabase, Groq, PayMongo, PayPal API calls — always go to network
  if (
    url.includes("supabase.co") ||
    url.includes("groq.com") ||
    url.includes("paymongo.com") ||
    url.includes("paypal.com") ||
    url.includes("workers.dev")
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // For navigation requests (page loads) — network first, fall back to cache
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match("/").then((cached) => cached || fetch(event.request))
      )
    );
    return;
  }

  // For static assets (JS, CSS, images, fonts) — cache first, then network
  if (
    event.request.destination === "script" ||
    event.request.destination === "style" ||
    event.request.destination === "image" ||
    event.request.destination === "font"
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          // Only cache valid responses
          if (!response || response.status !== 200 || response.type === "error") {
            return response;
          }
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }

  // Everything else — network only
  event.respondWith(fetch(event.request));
});
