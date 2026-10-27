import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export interface StudySession { id: string; title: string; duration_minutes: number; created_at: string; user_id?: string; }
export interface StudyStats { sessions: number; studyHrs: number; avgScore: number; streak: number; }
function rows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter((row): row is Record<string, unknown> => !!row && typeof row === "object" && !Array.isArray(row)) : [];
}
function minutes(value: unknown) { const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : 0; return Number.isFinite(number) && number >= 0 ? number : 0; }
function session(row: Record<string, unknown>, userId: string, activity = false): StudySession | null {
  if ((typeof row.id !== "string" && typeof row.id !== "number") || typeof row.created_at !== "string" || !Number.isFinite(new Date(row.created_at).getTime()) || (typeof row.user_id === "string" && row.user_id !== userId)) return null;
  const metadata = row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata) ? row.metadata as Record<string, unknown> : {};
  return { id: String(row.id), user_id: userId, title: activity ? String(row.tool || row.activity_type || "Study activity") : typeof row.title === "string" ? row.title : "Study session", duration_minutes: activity ? Math.round(minutes(metadata.time_seconds) / 60) : minutes(row.duration_minutes || row.duration), created_at: row.created_at };
}
function cachedSessions(userId: string): StudySession[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem("pz_study_sessions") || "[]");
    return rows(value).filter(row => row.user_id === userId).flatMap(row => { const item = session(row, userId); return item ? [item] : []; });
  } catch { return []; }
}

/** A read-only presentation adapter. Study-writing flows own durable persistence. */
export function useStudyStats() {
  const { user, profile } = useAuth();
  const userId = user?.id;
  const request = useRef(0);
  const active = useRef<{ controller: AbortController; timeout?: ReturnType<typeof setTimeout> }>();
  const [view, setView] = useState<{ userId: string | undefined; sessions: StudySession[] }>({ userId: undefined, sessions: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchStats = useCallback(async () => {
    const job = ++request.current;
    active.current?.controller.abort(); clearTimeout(active.current?.timeout);
    const controller = new AbortController();
    active.current = { controller };
    if (!userId) { setView({ userId: undefined, sessions: [] }); setLoading(false); setError(null); return; }
    const saved = cachedSessions(userId);
    setView(previous => previous.userId === userId ? previous : { userId, sessions: saved });
    setLoading(true); setError(null);
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      // PostgREST builders are PromiseLike; wrap before using Promise.catch.
      // These are the same read queries, filters and sort order as before.
      const sessionsQuery = Promise.resolve(supabase.from("study_sessions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).abortSignal(controller.signal));
      const activityQuery = Promise.resolve(supabase.from("study_activity").select("*").eq("user_id", userId).order("created_at", { ascending: false }).abortSignal(controller.signal));
      const timedOut = new Promise<never>((_, reject) => { timeout = setTimeout(() => { controller.abort(); reject(new Error("Refresh timed out")); }, 8000); if (active.current?.controller === controller) active.current.timeout = timeout; });
      const [sessionResult, activityResult] = await Promise.race([Promise.all([sessionsQuery, activityQuery]), timedOut]);
      if (job !== request.current) return;
      if (sessionResult.error && activityResult.error) throw new Error("Study data unavailable");
      const incoming = [
        ...rows(sessionResult.data).flatMap(row => { const item = session(row, userId); return item ? [item] : []; }),
        ...rows(activityResult.data).flatMap(row => { const item = session(row, userId, true); return item ? [item] : []; }),
      ];
      const combined = [...incoming, ...saved.filter(row => !incoming.some(item => item.id === row.id))].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setView({ userId, sessions: combined });
      if (sessionResult.error || activityResult.error) setError("Some study data couldn’t refresh. Saved sessions are still shown.");
      // Do not overwrite the global legacy cache with one account's response.
    } catch {
      if (job === request.current) setError("Couldn’t refresh your study data. Saved sessions are still shown when available.");
    } finally {
      clearTimeout(timeout);
      if (job === request.current) setLoading(false);
    }
  }, [userId]);
  const cancelCurrent = useCallback(() => {
    request.current++;
    active.current?.controller.abort();
    clearTimeout(active.current?.timeout);
  }, []);
  useEffect(() => {
    void fetchStats();
    const refresh = () => { void fetchStats(); };
    window.addEventListener("studenius:session-logged", refresh);
    return () => { cancelCurrent(); window.removeEventListener("studenius:session-logged", refresh); };
  }, [fetchStats, cancelCurrent]);
  const sessions = useMemo(() => view.userId === userId ? view.sessions : [], [view, userId]);
  const stats: StudyStats = useMemo(() => ({ sessions: sessions.length, studyHrs: Math.round(sessions.reduce((sum, item) => sum + item.duration_minutes, 0) / 60 * 10) / 10, avgScore: 0, streak: profile?.streak_days || 0 }), [sessions, profile?.streak_days]);
  return { sessions, stats, loading, error, refreshStats: fetchStats };
}
