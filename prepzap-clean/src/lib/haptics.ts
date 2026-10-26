/** Optional browser feedback; unsupported devices continue with visual feedback. */
export function vibrate(pattern: number | number[] = [10]) {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  try { navigator.vibrate(pattern); } catch { /* Haptics must never block an action. */ }
}
