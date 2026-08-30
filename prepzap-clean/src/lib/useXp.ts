/**
 * PrepZap — useXp hook
 *
 * Call `awardXp(amount, reason)` from any tool page after a successful
 * AI interaction to increment the user's XP in Supabase and refresh
 * the AuthContext profile so the dashboard updates immediately.
 *
 * Supabase prerequisite — run this SQL once in your SQL editor:
 *
 *   create or replace function increment_xp(user_id uuid, amount int)
 *   returns void language plpgsql security definer as $$
 *   begin
 *     update profiles
 *     set total_xp = total_xp + amount
 *     where id = user_id;
 *   end;
 *   $$;
 *
 * Usage in a tool page:
 *   import { useXp } from "@/lib/useXp"
 *   const { awardXp } = useXp()
 *   // after successful quiz answer:
 *   await awardXp(10, "practice_answer")
 */

import { useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"

export const XP_REWARDS = {
  practice_answer:    10,
  flashcard_correct:   5,
  daily_quiz_complete: 25,
  feynman_complete:    20,
  math_solved:         15,
  ai_tutor_session:     5,
  essay_complete:      20,
  error_hunt_found:    10,
  concepts_complete:   15,
  mind_map_saved:      10,
  roadmap_generated:   15,
  pomodoro_complete:   10,
} as const

export type XpReason = keyof typeof XP_REWARDS

export function useXp() {
  const { user, refreshProfile } = useAuth()

  const awardXp = useCallback(async (
    amountOrReason: number | XpReason,
    _reason?: string
  ) => {
    if (!user?.id) return

    const amount = typeof amountOrReason === "number"
      ? amountOrReason
      : XP_REWARDS[amountOrReason]

    if (!amount || amount <= 0) return

    try {
      // Optimistically update via Supabase RPC
      const { error } = await supabase.rpc("increment_xp", {
        user_id: user.id,
        amount,
      })

      if (error) {
        // Fallback: direct update if RPC not created yet
        await supabase
          .from("profiles")
          .update({ total_xp: (await supabase
            .from("profiles")
            .select("total_xp")
            .eq("id", user.id)
            .maybeSingle()
            .then(r => (r.data?.total_xp ?? 0) + amount)
          )})
          .eq("id", user.id)
      }

      // Refresh the AuthContext so XP/level update everywhere instantly
      await refreshProfile()
    } catch (err) {
      console.warn("[PrepZap] awardXp failed:", err)
    }
  }, [user?.id, refreshProfile])

  return { awardXp, XP_REWARDS }
}
