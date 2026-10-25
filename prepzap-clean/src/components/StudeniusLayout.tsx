import { Outlet, useLocation } from "react-router-dom";
import { StudeniusShell } from "@/components/StudeniusShell";
import { PageTransition } from "@/components/PageTransition";
import { FloatingXPOverlay } from "@/components/FloatingXPBurst";
import { PeekingRexCompanion } from "@/components/PeekingRexCompanion";

/** Focused tool flows that hide bottom nav (per stitch mockup). */
const HIDE_NAV_PATHS = new Set(["/timer", "/pomodoro-area"]);

export function StudeniusLayout() {
  const { pathname } = useLocation();
  const hideNav = HIDE_NAV_PATHS.has(pathname);

  return (
    <StudeniusShell hideNav={hideNav}>
      <PageTransition>
        <Outlet />
      </PageTransition>
      <FloatingXPOverlay />
    </StudeniusShell>
  );
}
