import { lazy, Suspense } from "react";
import { Mascot } from "@/components/Mascot";
import { SpringButton } from "@/components/ui/SpringButton";
import { useNavigate } from "react-router-dom";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

const EntryStreakHost = lazy(() => import("@/components/EntryStreakHost").catch(() => ({ default: () => null })));

export function DashboardGreeting() {
  const navigate = useNavigate();
  const reduced = usePrefersReducedMotion();
  const findNextLesson = () => {
    const next = document.querySelector<HTMLButtonElement>('[data-motion-page] button[aria-label$=": active"]');
    if (!next) { navigate("/practice"); return; }
    next.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
    next.focus({ preventScroll: true });
  };
  return (
    <>
      <aside className="dashboard-greeting" aria-label="A little encouragement">
        <Mascot mood="idle" size="sm" interactive />
        <div><p className="font-bold">A little practice goes a long way.</p><p className="text-sm opacity-75">Pick up your next lesson below.</p><SpringButton className="dashboard-next-step" onClick={findNextLesson}>Find my next lesson</SpringButton></div>
      </aside>
      <Suspense fallback={null}><EntryStreakHost /></Suspense>
    </>
  );
}
