import { supabase } from "@/lib/supabase";

interface StreakUpdateResult {
  streakError: { message: string } | null;
  newStreak?: number;
}

/**
 * Single source of truth for streak math + persistence.
 *
 * IMPORTANT: this reads the CURRENT streak/last_study_date straight from the
 * `profiles` table rather than trusting a possibly-stale `profile` object
 * held in React state/context. useStudyTimeTracker's flush() in particular
 * runs on a 20s timer with no guarantee AuthContext's `profile` is fresh —
 * computing off a stale `last_study_date` could double-increment or skip a
 * day. Fetch-then-write here keeps the logic correct no matter which caller
 * (passive tracker or manual logSession) triggers it.
 *
 * No-ops the write if the user already has a streak update logged for today.
 */
export async function bumpStreakIfNeeded(userId: string): Promise<StreakUpdateResult> {
  if (!userId) return { streakError: null };

  const { data: row, error: fetchError } = await supabase
    .from("profiles")
    .select("streak_days, last_study_date")
    .eq("id", userId)
    .maybeSingle();

  if (fetchError) {
    console.error("Error reading streak state:", fetchError);
    return { streakError: fetchError };
  }

  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const last = row?.last_study_date;
  const currentStreak = row?.streak_days ?? 0;

  if (last === today) {
    // Already bumped today — nothing to do.
    return { streakError: null, newStreak: currentStreak };
  }

  const newStreak = last === yesterday ? currentStreak + 1 : 1;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ streak_days: newStreak, last_study_date: today })
    .eq("id", userId);

  if (updateError) {
    console.error("Error updating streak:", updateError);
    return { streakError: updateError };
  }

  return { streakError: null, newStreak };
}
