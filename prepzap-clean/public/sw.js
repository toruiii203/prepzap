self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Skip R2 media — let the browser handle range requests natively.
  // The old pass-through was re-fetching every range chunk through the SW,
  // causing hundreds of cancelled/failed requests and severe lag.
  if (url.includes('r2.dev') || url.includes('r2.cloudflarestorage.com')) {
    return;
  }

  event.respondWith(fetch(event.request));
});
