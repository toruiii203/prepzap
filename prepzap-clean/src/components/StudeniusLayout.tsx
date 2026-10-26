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
      <Outlet />
      <FloatingXPOverlay />
    </StudeniusShell>
  );
}
