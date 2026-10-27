import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStudyStats } from "@/hooks/useStudyStats";
const data = vi.hoisted(() => ({ userId: "alice", pending: false, fail: false, calls: [] as string[], signal: undefined as AbortSignal | undefined }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: data.userId }, profile: { streak_days: 2 } }) }));
vi.mock("@/lib/supabase", () => ({ supabase: { from: (table: string) => {
  const builder = {
    select: () => builder, eq: () => builder, order: () => builder,
    abortSignal: (signal: AbortSignal) => { data.signal = signal; return builder; },
    // Deliberately PromiseLike with no .catch, matching PostgREST's contract.
    then: (resolve: (result: unknown) => void) => {
      data.calls.push(table);
      if (data.pending) return new Promise(() => {});
      resolve(data.fail ? { data: null, error: { message: "Offline fixture" } } : { data: table === "study_sessions" ? [{ id: "server", user_id: data.userId, title: "Biology", duration_minutes: 20, created_at: new Date().toISOString() }] : [], error: null });
    },
  }; return builder;
} } }));
beforeEach(() => { localStorage.clear(); data.userId = "alice"; data.pending = false; data.fail = false; data.calls = []; data.signal = undefined; });
afterEach(() => { cleanup(); vi.useRealTimers(); });
describe("read-only study data adapter", () => {
  it("loads real results from PromiseLike builders without changing cache data", async () => {
    const stored = JSON.stringify([{ id: "local", user_id: "alice", title: "Offline work", duration_minutes: 5, created_at: new Date().toISOString() }]);
    localStorage.setItem("pz_study_sessions", stored);
    const { result } = renderHook(() => useStudyStats());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.sessions).toHaveLength(2);
    expect(data.calls).toEqual(["study_sessions", "study_activity"]);
    expect(result.current.error).toBeNull();
    expect(localStorage.getItem("pz_study_sessions")).toBe(stored);
  });
  it("does not hydrate foreign or unattributed cache entries", async () => {
    localStorage.setItem("pz_study_sessions", JSON.stringify([{ id: "foreign", user_id: "bob", created_at: new Date().toISOString(), duration_minutes: 500 }, { id: "unowned", created_at: new Date().toISOString(), duration_minutes: 500 }]));
    const { result } = renderHook(() => useStudyStats());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.sessions.map(session => session.id)).toEqual(["server"]);
  });
  it("reports unavailable data while preserving confirmed cached sessions", async () => {
    data.fail = true;
    localStorage.setItem("pz_study_sessions", JSON.stringify([{ id: "local", user_id: "alice", title: "Saved work", duration_minutes: 5, created_at: new Date().toISOString() }]));
    const { result } = renderHook(() => useStudyStats());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toContain("Couldn’t refresh");
    expect(result.current.sessions[0].title).toBe("Saved work");
  });
  it("times out without losing saved data and cancels its request on unmount", async () => {
    vi.useFakeTimers(); data.pending = true;
    const { result, unmount } = renderHook(() => useStudyStats());
    await act(async () => { await Promise.resolve(); vi.advanceTimersByTime(8001); });
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toContain("Couldn’t refresh");
    expect(data.signal?.aborted).toBe(true);
    unmount(); expect(vi.getTimerCount()).toBe(0);
  });
  it("clears the prior account's visible data before a new request completes", async () => {
    const { result, rerender } = renderHook(() => useStudyStats());
    await waitFor(() => expect(result.current.loading).toBe(false));
    data.userId = "bob"; data.pending = true; rerender();
    expect(result.current.sessions).toEqual([]);
  });
});
