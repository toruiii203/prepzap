import { lazy, type ComponentType } from "react";

type PageModule<T> = { default: T };
const routePreloads = new Map<string, () => Promise<unknown>>();

export function isChunkLoadError(err: unknown): boolean {
  if (!err) return false;
  const msg = String((err as Error).message || err);
  return (
    msg.includes("dynamically imported module") ||
    msg.includes("Expected a JavaScript-or-Wasm module script") ||
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("Importing a module script failed") ||
    msg.includes("error loading dynamically imported module") ||
    msg.includes("Loading chunk") ||
    msg.includes("text/html")
  );
}

/** Render and intent-prefetch share one import; failed prefetches can be retried. */
export function lazyPage<T extends ComponentType>(loader: () => Promise<PageModule<T>>) {
  let pending: Promise<PageModule<T>> | undefined;
  const load = () => {
    if (!pending) {
      pending = loader().catch((error) => {
        pending = undefined;
        if (isChunkLoadError(error)) {
          // If a new build was deployed, reload the page once to pick up the new chunks
          const lastReload = Number(sessionStorage.getItem("pz_chunk_reload") || 0);
          if (Date.now() - lastReload > 8000) {
            sessionStorage.setItem("pz_chunk_reload", String(Date.now()));
            window.location.reload();
          }
        }
        throw error;
      });
    }
    return pending;
  };
  return Object.assign(lazy(load), { preload: load });
}

export function registerPagePreloads(pages: Record<string, { preload: () => Promise<unknown> }>) {
  for (const [path, page] of Object.entries(pages)) routePreloads.set(path, page.preload);
}

export async function preloadPage(path: string) {
  const pathname = path.split(/[?#]/)[0];
  const loader = routePreloads.get(pathname) || [...routePreloads].find(([prefix]) => prefix.endsWith('/') && pathname.startsWith(prefix))?.[1];
  if (loader) {
    try {
      await loader();
    } catch {
      // Ignored for background prefetch
    }
  }
}
