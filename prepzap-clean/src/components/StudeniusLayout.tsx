import { PageGuidance } from "@/components/PageGuidance";
import { RouteAnnouncement } from "@/components/RouteAnnouncement";
import "@/styles/quality.css";
import { LegacyControlAccessibility } from "@/components/LegacyControlAccessibility";
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

/** Focused tool flows that hide bottom nav (per stitch mockup). */
const HIDE_NAV_PATHS = new Set(["/timer", "/pomodoro-area"]);

export function StudeniusLayout() {
  const { pathname } = useLocation();
  const hideNav = HIDE_NAV_PATHS.has(pathname) || pathname.startsWith("/arena/quiz");

  return (
    <StudeniusShell hideNav={hideNav}>
      <LegacyControlAccessibility />
      <RouteAnnouncement />
      {!hideNav && pathname !== "/practice" && pathname !== "/dashboard" && <StudyStatus />}
      {pathname === "/settings" && <div className="settings-page-frame"><InterfaceSettings /></div>}
      {pathname === "/dashboard" && <DashboardGreeting />}
      <Suspense fallback={<PageLoading />}>
        <PageErrorBoundary key={pathname}>
          <PageTransition key={pathname}>{pathname === "/settings" ? <div className="settings-page-frame"><Outlet /></div> : <Outlet />}</PageTransition>
        </PageErrorBoundary>
      </Suspense>
      <PageGuidance />
      <FloatingXPOverlay />
    </StudeniusShell>
  );
}
