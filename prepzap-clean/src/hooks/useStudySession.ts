import { useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

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
 * Fixing it once here means it only needs to be correct in one place. Any
 * tool that wants to log a session + update the streak should call this
 * instead of writing its own insert/update pair.
 *
 * Usage:
 *   const { logSession } = useStudySession();
 *   await logSession({ title: "Cell Biology notes", durationMinutes: 12 });
 */
export function useStudySession() {
  const { user, profile, refreshProfile } = useAuth();

  const logSession = useCallback(
    async ({ title, durationMinutes }: LogSessionInput): Promise<LogSessionResult> => {
      const result: LogSessionResult = { sessionError: null, streakError: null };
      if (!user?.id) return result;

      const today = new Date().toISOString().split("T")[0];

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

      // Streak logic: increment if last studied yesterday, reset to 1 if the
      // gap is bigger than a day, leave unchanged if already logged today.
      const last = profile?.last_study_date;
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      const currentStreak = profile?.streak_days ?? 0;
      const newStreak = last === today ? currentStreak : last === yesterday ? currentStreak + 1 : 1;

      if (last !== today) {
        const { error: streakError } = await supabase
          .from("profiles")
          .update({ streak_days: newStreak, last_study_date: today })
          .eq("id", user.id);
        if (streakError) {
          console.error("Error updating streak:", streakError);
          result.streakError = streakError;
        }
      }

      if (typeof refreshProfile === "function") await refreshProfile();

      return result;
    },
    [user, profile, refreshProfile]
  );

  return { logSession };
}
