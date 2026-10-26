import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { EntryStreakPopup } from "@/components/EntryStreakPopup";
import { claimPopupDisplay, entryStreakEvent, popupLedgerKey, ProgressPopupQueue, verifiedStudyDays, type EntryStreakEvent } from "@/lib/progressPopupPolicy";

const queue = new ProgressPopupQueue<EntryStreakEvent>();

/** The entry adapter is mounted only on the dashboard; it never starts requests. */
export default function EntryStreakHost() {
  const { user, profile, loading, needsOnboarding } = useAuth();
  const stopWatching = useRef<() => void>(() => {});
  const [active, setActive] = useState<EntryStreakEvent | null>(null);
  const userId = user?.id;
  const profileId = profile?.id;
  const streakDays = profile?.streak_days;
  useEffect(() => {
    setActive(null);
    queue.clearPending();
    if (!userId || loading || needsOnboarding || !profile?.onboarding_complete) return;
    const controller = new AbortController();
    let alive = true;
    let busy = false;
    let showing = false;
    const now = new Date();
    let candidate: EntryStreakEvent | null = null;
    try {
      candidate = entryStreakEvent(userId, profileId, streakDays, verifiedStudyDays(localStorage.getItem("pz_study_sessions"), userId, now), now);
    } catch { return; }
    if (!candidate || !navigator.locks) return; // Fail quiet if durable cross-tab caps cannot be guaranteed.
    queue.enqueue(candidate);
    const anotherDialog = () => !!document.querySelector('[role="dialog"]:not([data-entry-streak-popup]), [role="alertdialog"], [data-victory-screen], .fixed.inset-0');
    const blocked = () => document.hidden || !document.querySelector(".studenius-app [data-motion-page] main") || !!document.querySelector('[aria-label="Loading page"]') || anotherDialog();
    const consider = () => {
      if (!alive) return;
      if (showing && anotherDialog()) { setActive(null); stopWatching.current(); return; }
      if (showing || busy || blocked()) return;
      if (!queue.next(userId, new Date())) { stop(); return; }
      busy = true;
      void navigator.locks.request(popupLedgerKey(userId), { signal: controller.signal }, () => {
        if (!alive || blocked()) return;
        const next = queue.next(userId, new Date());
        if (!next) return;
        if (!claimPopupDisplay(localStorage, next)) { stop(); return; }
        queue.presented(next);
        showing = true;
        setActive(next);
      }).catch(() => { stop(); /* Optional feedback stays quiet on cancellation or denial. */ }).finally(() => { busy = false; });
    };
    const observer = new MutationObserver(consider);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["role", "aria-modal"] });
    document.addEventListener("visibilitychange", consider);
    window.addEventListener("focus", consider);
    const stop = () => {
      if (!alive) return;
      alive = false;
      controller.abort();
      observer.disconnect();
      document.removeEventListener("visibilitychange", consider);
      window.removeEventListener("focus", consider);
      queue.clearPending();
    };
    stopWatching.current = stop;
    consider();
    return stop;
  }, [userId, profileId, streakDays, loading, needsOnboarding, profile?.onboarding_complete]);

  if (!active || active.userId !== userId) return null;
  return <EntryStreakPopup event={active} onDismiss={() => { stopWatching.current(); setActive(null); }} />;
}
