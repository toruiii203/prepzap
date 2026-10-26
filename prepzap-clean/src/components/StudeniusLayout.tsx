import { Suspense } from "react";
import { PageLoading } from "@/components/PageLoading";
import { PageTransition } from "@/components/PageTransition";
import { PageErrorBoundary } from "@/components/PageErrorBoundary";
import { Outlet, useLocation } from "react-router-dom";
import { StudeniusShell } from "@/components/StudeniusShell";
import { StudyStatus } from "@/components/StudyStatus";
import { InterfaceSettings } from "@/components/InterfaceSettings";
import { DashboardGreeting } from "@/components/DashboardGreeting";
import { FloatingXPOverlay } from "@/components/FloatingXPBurst";
import { PeekingRexCompanion } from "@/components/PeekingRexCompanion";

/** Focused tool flows that hide bottom nav (per stitch mockup). */
const HIDE_NAV_PATHS = new Set(["/timer", "/pomodoro-area"]);

export function StudeniusLayout() {
  const { pathname } = useLocation();
  const hideNav = HIDE_NAV_PATHS.has(pathname);

  return (
    <StudeniusShell hideNav={hideNav}>
      {!hideNav && pathname !== "/practice" && <StudyStatus />}
      {pathname === "/settings" && <InterfaceSettings />}
      {pathname === "/dashboard" && <DashboardGreeting />}
      <Suspense fallback={<PageLoading />}>
        <PageErrorBoundary key={pathname}>
          <PageTransition key={pathname}><Outlet /></PageTransition>
        </PageErrorBoundary>
      </Suspense>
      <FloatingXPOverlay />
    </StudeniusShell>
  );
}
