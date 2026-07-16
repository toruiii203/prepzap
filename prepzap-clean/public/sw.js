const CACHE_NAME = "studenius-v" + Date.now(); // busts on every SW update

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
  "/",
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

// Activate — clean up ALL old caches
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

  // Skip all API calls — always go to network
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

  // Navigation requests — NETWORK FIRST, no stale HTML ever
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match("/").then((cached) => cached || fetch(event.request))
      )
    );
    return;
  }

  // JS/CSS bundles — NETWORK FIRST so new deploys always get picked up
  // Falls back to cache only if completely offline
  if (
    event.request.destination === "script" ||
    event.request.destination === "style"
  ) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type === "error") {
            return response;
          }
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() =>
          // FIX: previously this could resolve to `undefined` when nothing was
          // cached yet (e.g. a CSP-blocked font stylesheet on first load),
          // and event.respondWith(undefined) throws "Failed to convert value
          // to 'Response'" — which is what turned a single blocked request
          // into a hard crash instead of a graceful miss. Falling back to a
          // real network fetch (letting it fail on its own if it must) keeps
          // this a normal failed request instead of an uncaught SW exception.
          caches.match(event.request).then((cached) => cached || fetch(event.request))
        )
    );
    return;
  }

  // Images and fonts — cache first (these don't change often)
  if (
    event.request.destination === "image" ||
    event.request.destination === "font"
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request)
          .then((response) => {
            if (!response || response.status !== 200 || response.type === "error") {
              return response;
            }
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            return response;
          })
          .catch(() => fetch(event.request));
          // FIX: this branch previously had NO .catch() at all — if a font
          // request was blocked (CSP, offline, ad-blocker) the returned
          // promise just rejected with nothing handling it, which is the
          // other failure mode seen alongside the CSS one above. Not
          // "recoverable" here since there's nothing cached to fall back to,
          // but this at least keeps it a normal rejected fetch instead of an
          // unhandled promise rejection inside the SW.
      })
    );
    return;
  }

  // Everything else — network only
  event.respondWith(fetch(event.request));
});