import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

const FLUSH_INTERVAL_MS = 20_000; // push accumulated time to the server every 20s
const TICK_MS = 1_000;
const MIN_SECONDS_TO_FLUSH = 3; // don't bother the DB for a stray 1-2s blip

/**
 * Silently tracks how long a user is ACTIVELY viewing a page/tool (tab visible
 * + window focused) and periodically logs that time to Supabase. No "Start
 * Session" button, no modal — just visiting a page and spending time on it is
 * enough.
 *
 * Mounted ONCE, centrally, inside SharedSidebar (see SharedSidebar.tsx) —
 * since that renders on every tool/dashboard route, this single instance
 * covers the whole app. Do NOT also call this from individual pages, or
 * time gets double-counted.
 *
 * Other components that want to react to newly-logged time (e.g. Dashboard
 * refreshing its Recent Sessions list) should listen for the
 * "studenius:session-logged" window event instead of passing onFlush, since
 * they aren't the ones holding the tracker instance:
 *
 *   useEffect(() => {
 *     const handler = () => fetchSessions();
 *     window.addEventListener("studenius:session-logged", handler);
 *     return () => window.removeEventListener("studenius:session-logged", handler);
 *   }, []);
 *
 * @param toolName   Human-readable name to log this time under, e.g. "AI Tutor",
 *                   "Practice", "Dashboard". Matches the `title` shown in Recent Sessions.
 *                   Pass null/undefined for routes that aren't a study tool (settings, profile, etc.) — tracking no-ops.
 * @param userId     Current user's id. Tracking no-ops until this is defined.
 * @param onFlush    Optional direct callback, useful if the component holding the tracker itself needs to react.
 */
export function useStudyTimeTracker(
  toolName: string | null | undefined,
  userId: string | null | undefined,
  onFlush?: () => void
) {
  const accumulatedSeconds = useRef(0);
  const isActive = useRef(
    typeof document !== "undefined" &&
      document.visibilityState === "visible" &&
      document.hasFocus()
  );

  useEffect(() => {
    if (!userId || !toolName) return;

    const tick = setInterval(() => {
      if (isActive.current) accumulatedSeconds.current += TICK_MS / 1000;
    }, TICK_MS);

    const flush = async () => {
      const seconds = Math.round(accumulatedSeconds.current);
      if (seconds < MIN_SECONDS_TO_FLUSH) return;
      accumulatedSeconds.current = 0;
      try {
        const { error } = await supabase.rpc("increment_study_time", {
          p_user_id: userId,
          p_tool: toolName,
          p_seconds: seconds,
        });
        if (error) {
          console.error("Auto study-time log failed:", error);
          accumulatedSeconds.current += seconds; // don't lose the time, retry next flush
          return;
        }
        onFlush?.();
        window.dispatchEvent(
          new CustomEvent("studenius:session-logged", { detail: { tool: toolName, seconds } })
        );
      } catch (err) {
        console.error("Auto study-time log failed:", err);
        accumulatedSeconds.current += seconds;
      }
    };

    const flushInterval = setInterval(flush, FLUSH_INTERVAL_MS);

    const handleVisibility = () => {
      isActive.current = document.visibilityState === "visible" && document.hasFocus();
      if (!isActive.current) flush();
    };
    const handleFocus = () => {
      isActive.current = true;
    };
    const handleBlur = () => {
      isActive.current = false;
      flush();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("pagehide", flush);

    return () => {
      clearInterval(tick);
      clearInterval(flushInterval);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("pagehide", flush);
      flush(); // send the last partial chunk when navigating to another route
    };
    // toolName changing (e.g. user navigates to a different tool) intentionally
    // re-runs this effect, which flushes the old page's time before tracking the new one.
  }, [toolName, userId]);
}
