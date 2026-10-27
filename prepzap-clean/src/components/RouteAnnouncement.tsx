import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

const pageTitles: Record<string, string> = { "/dashboard": "Home", "/practice": "Practice", "/sources": "Source library", "/analytics": "Study progress", "/notes": "Notes", "/flashcards": "Flashcards", "/planner": "Study planner", "/settings": "Settings", "/ai-tutor": "Study tutor", "/timer": "Focus timer", "/arena": "Arena", "/friends": "Friends", "/tools": "Study tools" };

/** Short announcements replace a full-page live region; pointer focus is never stolen. */
export function RouteAnnouncement() {
  const { pathname } = useLocation();
  const [title, setTitle] = useState("");
  useEffect(() => {
    setTitle("");
    const announce = () => {
      if (document.querySelector('[aria-label="Loading page"]')) return;
      const heading = [...document.querySelectorAll<HTMLElement>("[data-motion-page] main h1,[data-motion-page] h1,[data-motion-page] main h2,[data-motion-page] h2")].find(element => element.getClientRects().length && element.textContent?.trim());
      const next = document.querySelector("[data-motion-page]") ? pageTitles[pathname] || heading?.textContent?.trim() : undefined;
      if (!next) return;
      document.title = `${next} · Studenius`;
      setTitle(next);
      observer.disconnect();
    };
    const observer = new MutationObserver(announce);
    observer.observe(document.body, { childList: true, subtree: true });
    announce();
    return () => observer.disconnect();
  }, [pathname]);
  return <p className="route-announcement" role="status" aria-live="polite" aria-atomic="true">{title}</p>;
}
