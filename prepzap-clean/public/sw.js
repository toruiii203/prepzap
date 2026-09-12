// Static, manually-bumped version instead of Date.now(). Date.now() re-runs
// every time the browser restarts this (idle) service worker — which
// happens routinely, not just on real deploys — so CACHE_NAME was drifting
// on every restart. That fragmented storage into many orphaned caches that
// only the ONE-TIME activate cleanup (tied to whatever CACHE_NAME existed
// at that specific activation) would ever clean up. Bump SW_VERSION when
// you actually change what's precached; the browser's own update algorithm
// (byte-diffing this file) still handles detecting real deploys on its own.
const SW_VERSION = "v7";
const CACHE_NAME = "studenius-" + SW_VERSION;

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
    caches.open(CACHE_NAME).then((cache) =>
      // Previously cache.addAll(PRECACHE_ASSETS). addAll() is atomic — if
      // ANY single asset in the list 404s or fails to fetch, the WHOLE
      // install rejects and NOTHING gets precached, including "/". That's
      // how the offline app shell (the "/" entry the navigate handler
      // below depends on) could silently never get cached at all, just
      // because one icon path was wrong. Caching each asset independently
      // means "/" still gets cached even if another asset fails.
      Promise.all(
        PRECACHE_ASSETS.map((asset) =>
          cache.add(asset).catch((err) => {
            console.error("[sw] failed to precache", asset, err);
          })
        )
      )
    )
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
    event.respondWith(
      fetch(event.request).catch((err) => {
        // Re-throw so calling code still sees a normal failed fetch,
        // exactly as if there were no service worker involved at all —
        // your own code (e.g. the study-time tracker) already handles
        // this failure gracefully. The only change is attaching this
        // .catch() explicitly, so Chrome stops ALSO flagging the same
        // rejection as an uncaught error inside the service worker's own
        // scope — that's what was spamming the console every time an API
        // call failed while offline, even though nothing was actually
        // broken.
        throw err;
      })
    );
    return;
  }



  // Navigation requests — NETWORK FIRST, no stale HTML ever
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cached = await caches.match("/");
        if (cached) return cached;

        // FIX: this used to fall back to fetch(event.request) here — but
        // we only reach this branch because the network fetch ABOVE just
        // failed (we're offline), so retrying fetch() rejects again, this
        // time uncaught. An uncaught rejection reaching respondWith() is
        // exactly what makes Chrome show its own native "You're offline"
        // interstitial instead of anything from this app — the app's JS
        // never even gets a chance to run. This always resolves to a real
        // Response instead, even in the worst case where "/" somehow isn't
        // cached yet (e.g. right after install, before it's finished).
        return new Response(
          "<!doctype html><html><head><meta charset='utf-8'><title>Studenius — Offline</title></head>" +
          "<body style='font-family:sans-serif;text-align:center;padding:60px 20px;'>" +
          "<h1>You're offline</h1>" +
          "<p>This page hasn't been cached yet. Connect once and reload — after that it'll work offline.</p>" +
          "</body></html>",
          { status: 200, headers: { "Content-Type": "text/html" } }
        );
      })
    );
    return;
  }

  // JS/CSS bundles, and worker scripts (e.g. PDF.js's pdf.worker.min.mjs) —
  // NETWORK FIRST so new deploys always get picked up. Falls back to cache
  // only if completely offline.
  //
  // "worker" was missing from this list entirely. PDF.js loads its parsing
  // engine as a separate Worker script, which has destination "worker" —
  // not "script". That request fell into the final catch-all bucket below,
  // which has zero caching AND no catch, so it was never cached during a
  // normal online PDF upload, and rejected uncaught the moment you tried a
  // PDF offline. That's what "Failed to read this PDF" actually was — not
  // a corrupted file, just the worker script never having a cached copy
  // to fall back to.
  if (
    event.request.destination === "script" ||
    event.request.destination === "style" ||
    event.request.destination === "worker" ||
    event.request.destination === "sharedworker"
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
          //
          // FIX 2: that retry fetch can ALSO get blocked (e.g. still no CSP
          // allowance), rejecting again — and with nothing left to catch it,
          // that surfaces as its own "Uncaught (in promise)" error. This final
          // catch guarantees respondWith always resolves to a real Response,
          // never a rejected promise, no matter how many fallbacks fail.
          caches
            .match(event.request)
            .then((cached) => cached || fetch(event.request))
            .catch(() => new Response("", { status: 504, statusText: "Network error" }))
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
          .catch(() =>
            fetch(event.request).catch(
              () => new Response("", { status: 504, statusText: "Network error" })
            )
          );
          // FIX: this branch previously had NO .catch() at all — if a font
          // request was blocked (CSP, offline, ad-blocker) the returned
          // promise just rejected with nothing handling it, which is the
          // other failure mode seen alongside the CSS one above. Now it
          // always resolves to a real Response, even when there's nothing
          // cached to fall back to, so it can never surface as an uncaught
          // rejection inside the SW.
      })
    );
    return;
  }

  // Everything else — network only, but still catch so an offline failure
  // here can't ALSO surface as an uncaught rejection inside the SW itself
  // (same fix as the API-passthrough branch above).
  event.respondWith(
    fetch(event.request).catch((err) => {
      throw err;
    })
  );
});
