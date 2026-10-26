import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { EntryStreakPopup } from "@/components/EntryStreakPopup";
import EntryStreakHost from "@/components/EntryStreakHost";
import { entryStreakEvent, localDayKey, popupLedgerKey } from "@/lib/progressPopupPolicy";

const auth = vi.hoisted(() => ({ user: { id: "" }, profile: { id: "", streak_days: 3, onboarding_complete: true }, loading: false, needsOnboarding: false }));
const preference = vi.hoisted(() => ({ reduced: false }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("@/hooks/usePrefersReducedMotion", () => ({ usePrefersReducedMotion: () => preference.reduced }));
vi.mock("@/lib/soundFX", () => ({ playPop: vi.fn(), playTap: vi.fn() }));
let sequence = 0;
const previousLocks = Object.getOwnPropertyDescriptor(navigator, "locks");
beforeEach(() => {
  localStorage.clear(); preference.reduced = false;
  auth.user.id = `student-${++sequence}`; auth.profile.id = auth.user.id;
  auth.profile.streak_days = 3; auth.loading = false; auth.needsOnboarding = false;
  Object.defineProperty(navigator, "locks", { configurable: true, value: { request: (_name: string, options: { signal: AbortSignal }, callback: () => unknown) => Promise.resolve().then(() => { if (!options.signal.aborted) return callback(); }) } });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); if (previousLocks) Object.defineProperty(navigator, "locks", previousLocks); else Reflect.deleteProperty(navigator, "locks"); });
function seedOwnedSession() {
  localStorage.setItem("pz_study_sessions", JSON.stringify([{ user_id: auth.user.id, created_at: new Date().toISOString(), duration_minutes: 5 }]));
}
function SafeDashboard({ blocked = false }: { blocked?: boolean }) {
  return <div className="studenius-app"><div data-motion-page><main><button>Study next</button></main></div>{blocked && <div role="dialog" aria-label="Existing lesson">Active learning</div>}<EntryStreakHost /></div>;
}
describe("entry streak integration", () => {
  it("shows owned activity once and remains quiet after remount/reload", async () => {
    seedOwnedSession();
    const { unmount } = render(<SafeDashboard />);
    expect(await screen.findByRole("dialog", { name: /3 day streak/ })).toHaveAttribute("aria-modal", "false");
    expect(localStorage.getItem(popupLedgerKey(auth.user.id))).toContain("daily-streak");
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    unmount(); render(<SafeDashboard />);
    await act(async () => {});
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("waits behind existing learning/modals without consuming a display cap", async () => {
    seedOwnedSession();
    const { rerender } = render(<SafeDashboard blocked />);
    await act(async () => {});
    expect(screen.queryByRole("dialog", { name: /day streak/ })).toBeNull();
    expect(localStorage.getItem(popupLedgerKey(auth.user.id))).toBeNull();
    rerender(<SafeDashboard />);
    expect(await screen.findByRole("dialog", { name: /day streak/ })).toBeInTheDocument();
  });
  it("does not invent today's activity or show another account's cached sessions", async () => {
    seedOwnedSession();
    auth.user.id = "different-account"; auth.profile.id = auth.user.id;
    render(<SafeDashboard />);
    await act(async () => {});
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(localStorage.getItem(popupLedgerKey(auth.user.id))).toBeNull();
  });
  it("yields immediately if another dialog opens after presentation", async () => {
    seedOwnedSession();
    const { rerender } = render(<SafeDashboard />);
    await screen.findByRole("dialog", { name: /day streak/ });
    rerender(<SafeDashboard blocked />);
    await waitFor(() => expect(screen.queryByRole("dialog", { name: /day streak/ })).toBeNull());
    expect(screen.getByRole("dialog", { name: "Existing lesson" })).toBeInTheDocument();
  });
  it("cancels navigation while waiting for a cross-tab lock", async () => {
    seedOwnedSession();
    let release: () => unknown = () => {};
    Object.defineProperty(navigator, "locks", { configurable: true, value: { request: (_name: string, _options: unknown, callback: () => unknown) => new Promise<void>(resolve => { release = () => { callback(); resolve(); }; }) } });
    const { unmount } = render(<SafeDashboard />);
    unmount();
    await act(async () => { release(); });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(localStorage.getItem(popupLedgerKey(auth.user.id))).toBeNull();
  });
  it("fails quiet without cross-tab locks or persistence", async () => {
    seedOwnedSession();
    Object.defineProperty(navigator, "locks", { configurable: true, value: undefined });
    render(<SafeDashboard />);
    await act(async () => {});
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("clears an active popup when the account changes", async () => {
    seedOwnedSession();
    const { rerender } = render(<SafeDashboard />);
    await screen.findByRole("dialog", { name: /day streak/ });
    auth.user.id = "changed-account"; auth.profile.id = auth.user.id;
    rerender(<SafeDashboard />);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
describe("entry streak presentation", () => {
  it("uses the approved no-shadow artwork, real values, known days and static reduced motion", () => {
    preference.reduced = true;
    const today = localDayKey(new Date());
    const event = entryStreakEvent("student", "student", 7, [today], new Date())!;
    const { container } = render(<EntryStreakPopup event={event} onDismiss={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: /7 day streak/ })).toBeInTheDocument();
    expect(document.querySelector('[data-layer="shadow"]')).toHaveAttribute("opacity", "0");
    expect(document.querySelector('[data-mascot]')).toHaveAttribute("data-reduced-motion", "true");
    expect(document.querySelectorAll('[data-confirmed="true"]')).toHaveLength(1);
    expect(container.querySelector("[data-part=cap]")).toBeNull();
  });
  it("focuses dismiss, closes with Escape and restores the invoker", async () => {
    const event = entryStreakEvent("student", "student", 3, [localDayKey(new Date())], new Date())!;
    function Example() {
      const [open, setOpen] = useState(false);
      return <><button onClick={() => setOpen(true)}>Show streak</button>{open && <EntryStreakPopup event={event} onDismiss={() => setOpen(false)} />}</>;
    }
    render(<Example />);
    const opener = screen.getByRole("button", { name: "Show streak" });
    opener.focus(); fireEvent.click(opener);
    expect(await screen.findByRole("button", { name: "Dismiss streak update" })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(opener).toHaveFocus();
  });
});
