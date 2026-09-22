import { useState, useEffect } from "react";

export function useTutorialModal(pageKey: string) {
  const storageKey = `pz_tutorial_seen_${pageKey}`;
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasSeen = localStorage.getItem(storageKey);
    if (!hasSeen) {
      setIsOpen(true);
    }
  }, [storageKey]);

  const dismiss = () => {
    localStorage.setItem(storageKey, "true");
    setIsOpen(false);
  };

  const show = () => {
    setIsOpen(true);
  };

  return { isOpen, dismiss, show };
}
