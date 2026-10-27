import { lazy, Suspense } from "react";
const EntryStreakHost = lazy(() => import("@/components/EntryStreakHost").catch(() => ({ default: () => null })));
/** Preserve earned entry celebrations without a persistent dashboard banner. */
export function DashboardGreeting() {
  return <Suspense fallback={null}><EntryStreakHost /></Suspense>;
}
