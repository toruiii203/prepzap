import { useEffect } from "react";
import { preloadPage } from "@/lib/pagePreload";

/** Only fetch route code for navigation the user points at, focuses, or touches. */
export function NavigationPrefetch() {
  useEffect(() => {
    const intent = (event: Event) => {
      if (!(event.target instanceof Element)) return;
      const target = event.target.closest<HTMLElement>('a[href],[data-route]');
      const destination = target?.getAttribute('data-route') || target?.getAttribute('href');
      if (!destination) return;
      const url = new URL(destination, window.location.origin);
      if (url.origin !== window.location.origin) return;
      void preloadPage(url.pathname).catch(() => { /* Navigation still owns its normal error/retry UI. */ });
    };
    document.addEventListener('pointerover', intent, { passive: true });
    document.addEventListener('focusin', intent);
    document.addEventListener('touchstart', intent, { passive: true });
    return () => {
      document.removeEventListener('pointerover', intent);
      document.removeEventListener('focusin', intent);
      document.removeEventListener('touchstart', intent);
    };
  }, []);
  return null;
}
