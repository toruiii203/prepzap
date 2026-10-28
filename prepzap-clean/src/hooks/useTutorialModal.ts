import { useState, useEffect } from "react";
/** Preserve the existing seen keys; add safe manual replay from the shared guide button. */
export function useTutorialModal(pageKey: string) {
  const storageKey = `pz_tutorial_seen_${pageKey}`;
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => {
    let seen = false;
    try {
      seen = Boolean(localStorage.getItem(storageKey));
    } catch {
      seen = false;
    }
    setIsOpen(false);
    let observer: MutationObserver | null = null;
    if (!seen) {
      const blocked = () =>
        Boolean(
          document.querySelector(
            '[role="dialog"],[data-victory-screen="true"],.quiz-shell',
          ),
        );
      const attempt = () => {
        if (blocked()) return;
        setIsOpen(true);
        observer?.disconnect();
      };
      attempt();
      if (blocked()) {
        observer = new MutationObserver(attempt);
        observer.observe(document.body, { childList: true, subtree: true });
      }
    }
    return () => observer?.disconnect();
  }, [storageKey]);
  useEffect(() => {
    const replay = (event: Event) => {
      if (event instanceof CustomEvent && event.detail === pageKey)
        setIsOpen(true);
    };
    window.addEventListener("studenius:show-page-guide", replay);
    return () =>
      window.removeEventListener("studenius:show-page-guide", replay);
  }, [pageKey]);
  const dismiss = () => {
    try {
      localStorage.setItem(storageKey, "true");
    } catch {
      /* Keep the dialog dismissible when storage is unavailable. */
    }
    setIsOpen(false);
  };
  return { isOpen, dismiss, show: () => setIsOpen(true) };
}
