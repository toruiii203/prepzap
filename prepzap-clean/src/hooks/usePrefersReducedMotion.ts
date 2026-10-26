import { useSyncExternalStore } from "react";
const query = "(prefers-reduced-motion: reduce)";
function subscribe(callback: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
function snapshot() { return window.matchMedia(query).matches; }
/** Reacts when the OS setting changes while the application is already open. */
export function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribe, snapshot, () => true);
}
