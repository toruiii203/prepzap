import { describe, expect, it } from "vitest";
import { checklistSummary, studySummary, studyTimeLabel } from "@/lib/analyticsPresentation";

describe("truthful analytics presentation", () => {
  const now = new Date(2026, 9, 28, 12);
  it("groups this calendar week, excluding previous weeks and future records", () => {
    const result = studySummary([
      { id: "monday", created_at: new Date(2026, 9, 26, 10).toISOString(), duration_minutes: 25 },
      { id: "tuesday", created_at: new Date(2026, 9, 27, 10).toISOString(), duration_minutes: 35 },
      { id: "previous", created_at: new Date(2026, 9, 25, 10).toISOString(), duration_minutes: 60 },
      { id: "future", created_at: new Date(2026, 9, 29, 10).toISOString(), duration_minutes: 500 },
    ], now);
    expect(result.weeklyMinutes).toBe(60);
    expect(result.totalMinutes).toBe(120);
    expect(result.week.map(day => day.minutes)).toEqual([25, 35, 0, 0, 0, 0, 0]);
    expect(result.sessions[0].id).toBe("tuesday");
  });
  it("preserves real zeroes and ignores invalid, negative or missing durations", () => {
    const date = now.toISOString();
    const result = studySummary([{ created_at: date, duration_minutes: 0 }, { created_at: date, duration_minutes: -4 }, { created_at: "invalid", duration_minutes: 5 }, { created_at: date }, { created_at: date, duration: "15" }], now);
    expect(result.sessions).toHaveLength(2);
    expect(result.totalMinutes).toBe(15);
    expect(studySummary([], now).week.every(day => day.minutes === 0)).toBe(true);
  });
  it("formats recorded time without inventing a minimum", () => {
    expect(studyTimeLabel(0)).toBe("0 min"); expect(studyTimeLabel(.2)).toBe("<1 min");
    expect(studyTimeLabel(60)).toBe("1h"); expect(studyTimeLabel(75)).toBe("1h 15m");
  });
  it("does not display records explicitly owned by another account", () => {
    const rows = [{ user_id: "alice", created_at: now.toISOString(), duration_minutes: 60 }, { user_id: "bob", created_at: now.toISOString(), duration_minutes: 10 }];
    expect(studySummary(rows, now, "bob").totalMinutes).toBe(10);
    expect(rows).toHaveLength(2); // Presentation never migrates or overwrites storage.
  });
  it("uses only valid checklist booleans and handles malformed storage", () => {
    expect(checklistSummary(JSON.stringify([{ completed: true }, { completed: false }, { completed: "yes" }, null]))).toEqual({ total: 2, completed: 1 });
    expect(checklistSummary("broken")).toEqual({ total: 0, completed: 0 });
  });
});
