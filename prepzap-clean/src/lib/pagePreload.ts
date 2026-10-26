import { lazy, type ComponentType } from "react";

type PageModule<T> = { default: T };
const routePreloads = new Map<string, () => Promise<unknown>>();

/** Render and intent-prefetch share one import; failed prefetches can be retried. */
export function lazyPage<T extends ComponentType>(loader: () => Promise<PageModule<T>>) {
  let pending: Promise<PageModule<T>> | undefined;
  const load = () => {
    if (!pending) pending = loader().catch(error => { pending = undefined; throw error; });
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
  if (loader) await loader();
}
