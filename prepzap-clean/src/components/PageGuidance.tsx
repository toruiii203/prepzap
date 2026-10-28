import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { TutorialModal } from "@/components/TutorialModal";
import { guideForPage, OWNED_GUIDE_ROUTES } from "@/lib/pageGuides";

/** Manual replay on every main app page; existing first-visit tours keep ownership. */
export function PageGuidance() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const guide = guideForPage(pathname);
  useEffect(() => setOpen(false), [pathname]);
  function show() {
    if (document.querySelector('[role="dialog"]')) return;
    if (OWNED_GUIDE_ROUTES.has(guide.key))
      window.dispatchEvent(
        new CustomEvent("studenius:show-page-guide", { detail: guide.key }),
      );
    else setOpen(true);
  }
  return (
    <>
      <button
        className="page-guide-launch"
        aria-label="Show page guide"
        onClick={show}
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          help
        </span>
        <span>Page guide</span>
      </button>
      {!OWNED_GUIDE_ROUTES.has(guide.key) && (
        <TutorialModal
          isOpen={open}
          onDismiss={() => setOpen(false)}
          title={guide.title}
          features={guide.steps}
        />
      )}
    </>
  );
}
