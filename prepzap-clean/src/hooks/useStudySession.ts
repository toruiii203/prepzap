import { useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { bumpStreakIfNeeded } from "@/lib/streak";

interface LogSessionInput {
  /** What shows up in Recent Sessions / Study History, e.g. the problem text or note title */
  title: string;
  /** How long this counts as, in minutes — used for Time Studied + weekly bars */
  durationMinutes: number;
}

interface LogSessionResult {
  sessionError: { message: string } | null;
  streakError: { message: string } | null;
}

/**
 * Single source of truth for "a tool was used, log it."
 *
 * This replaces separately copy-pasted versions of this logic that existed in
 * Dashboard.tsx and MathSolver.tsx (and very possibly QuickStudy.tsx /
 * TeachIt.tsx too) — each had drifted slightly and each had the same two bugs:
 *
 *   1. Inserted `duration` into study_sessions instead of the real column,
 *      `duration_minutes` — Postgres silently rejected every insert.
 *   2. Referenced `profile.streak` (doesn't exist — real column is
 *      `streak_days`) and `profile.last_study_date` (never existed as a
 *      column at all until the 002 migration) — every streak update also
 *      silently failed.
 *
 * FIX: streak math now lives in lib/streak.ts (`bumpStreakIfNeeded`), shared
 * with useStudyTimeTracker.ts's passive auto-tracking flush. Previously this
 * hook was the ONLY place with correct streak logic, but nothing on the
 * always-running passive-tracking path called it — so the streak never
 * actually moved in practice. Delegating to the shared helper here means both
 * logging paths (manual + passive) stay correct without re-drifting apart.
 *
 * Usage:
 *   const { logSession } = useStudySession();
 *   await logSession({ title: "Cell Biology notes", durationMinutes: 12 });
 */
export function useStudySession() {
  const { user, refreshProfile } = useAuth();

  const logSession = useCallback(
    async ({ title, durationMinutes }: LogSessionInput): Promise<LogSessionResult> => {
      const result: LogSessionResult = { sessionError: null, streakError: null };
      if (!user?.id) return result;

      const { error: sessionError } = await supabase.from("study_sessions").insert({
        user_id: user.id,
        title: (title || "Study Session").slice(0, 80),
        duration_minutes: durationMinutes,
        created_at: new Date().toISOString(),
      });
      if (sessionError) {
        console.error("Error logging study session:", sessionError);
        result.sessionError = sessionError;
      }

      const { streakError } = await bumpStreakIfNeeded(user.id);
      result.streakError = streakError;

      if (typeof refreshProfile === "function") await refreshProfile();

      return result;
    },
    [user, refreshProfile]
  );

  return { logSession };
}
