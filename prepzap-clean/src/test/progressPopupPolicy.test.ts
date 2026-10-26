import { beforeEach, describe, expect, it } from "vitest";
import { claimPopupDisplay, entryStreakEvent, localDayKey, popupLedgerKey, ProgressPopupQueue, verifiedStudyDays, type PopupEvent } from "@/lib/progressPopupPolicy";

const now = new Date(2026, 9, 27, 12);
const day = localDayKey(now);
function event(overrides: Partial<PopupEvent> = {}): PopupEvent {
  return { id: "streak", type: "daily-streak", userId: "student", day, origin: "entry", priority: 5, createdAt: now.getTime(), ...overrides };
}
beforeEach(() => localStorage.clear());
describe("verified presentation evidence", () => {
  it("uses owned, dated, positive-duration sessions and ignores invalid or future data", () => {
    const row = { user_id: "student", created_at: now.toISOString(), duration_minutes: 5 };
    expect(verifiedStudyDays(JSON.stringify([row, row, { ...row, user_id: "other" }, { ...row, user_id: undefined }, { ...row, created_at: "invalid" }, { ...row, duration_minutes: 0 }, { ...row, created_at: new Date(now.getTime() + 1000).toISOString() }]), "student", now)).toEqual([day]);
    expect(verifiedStudyDays("broken", "student", now)).toEqual([]);
  });
  it("requires a real count, matching profile and confirmed study today", () => {
    expect(entryStreakEvent("student", "student", 3, [day], now)?.streakDays).toBe(3);
    for (const count of [undefined, 0, -1, 1.5, NaN, Infinity]) expect(entryStreakEvent("student", "student", count, [day], now)).toBeNull();
    expect(entryStreakEvent("student", "other", 3, [day], now)).toBeNull();
    expect(entryStreakEvent("student", "student", 3, [], now)).toBeNull();
  });
});
describe("one presentation queue", () => {
  it("deduplicates events and selects priority before arrival time", () => {
    const queue = new ProgressPopupQueue<PopupEvent>();
    const ordinary = event();
    const important = event({ id: "milestone", type: "milestone", priority: 1 });
    queue.enqueue(ordinary); queue.enqueue(ordinary); queue.enqueue(important);
    expect(queue.next("student", now)).toBe(important);
    queue.presented(important);
    expect(queue.next("student", now)).toBeNull(); // Active presentation cannot stack.
    queue.dismiss();
    expect(queue.next("student", now)).toBeNull(); // One entry presentation per session.
  });
  it("allows at most two presentations total and one per type per day", () => {
    const queue = new ProgressPopupQueue<PopupEvent>();
    const first = event(); queue.enqueue(first); queue.presented(first); queue.dismiss();
    queue.enqueue(event({ id: "duplicate", origin: "session" }));
    expect(queue.next("student", now)).toBeNull();
    const second = event({ id: "xp", type: "xp", origin: "session" });
    queue.enqueue(second); expect(queue.next("student", now)).toBe(second);
    queue.presented(second); queue.dismiss();
    queue.enqueue(event({ id: "goal", type: "goal", origin: "session" }));
    expect(queue.next("student", now)).toBeNull();
  });
  it("drops expired, previous-day and previous-account pending events", () => {
    const queue = new ProgressPopupQueue<PopupEvent>();
    queue.enqueue(event({ createdAt: now.getTime() - 5 * 60_000 }));
    expect(queue.next("student", now)).toBeNull();
    queue.enqueue(event({ day: "2026-10-26" }));
    expect(queue.next("student", now)).toBeNull();
    queue.enqueue(event());
    expect(queue.next("another-student", now)).toBeNull();
    expect(queue.next("student", now)).toBeNull();
  });
});
describe("small device-only display record", () => {
  it("survives reloads, scopes by account and replaces yesterday without keeping history", () => {
    expect(claimPopupDisplay(localStorage, event())).toBe(true);
    expect(claimPopupDisplay(localStorage, { ...event() })).toBe(false);
    expect(claimPopupDisplay(localStorage, event({ userId: "other" }))).toBe(true);
    expect(claimPopupDisplay(localStorage, event({ day: "2026-10-28" }))).toBe(true);
    expect(JSON.parse(localStorage.getItem(popupLedgerKey("student"))!)).toEqual({ version: 1, day: "2026-10-28", types: ["daily-streak"] });
  });
  it("fails quietly on malformed metadata or unavailable persistence", () => {
    localStorage.setItem(popupLedgerKey("student"), "broken");
    expect(claimPopupDisplay(localStorage, event())).toBe(false);
    expect(claimPopupDisplay({ getItem: () => null, setItem: () => { throw new Error("Storage denied"); } }, event())).toBe(false);
  });
});
