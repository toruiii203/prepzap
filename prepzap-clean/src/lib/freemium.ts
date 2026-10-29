import { supabase } from "@/lib/supabase";
import { withTimeout } from "@/lib/withTimeout";

// ─── Feature keys (match usage_logs.feature column) ──────────────────────────
export type FeatureKey =
  | "ai_tutor"
  | "flashcard_gen"
  | "math_solver"
  | "quick_study"
  | "teach_it"
  | "mistake_journal"
  | "cram"
  | "practice"
  | "recall"
  | "visual"
  | "high_yield";

// 🔵 Daily limits for free users 🔵
export const LIMITS: Record<FeatureKey, number> = {
  ai_tutor:        20,
  flashcard_gen:   3,
  math_solver:     5,
  quick_study:     3,
  teach_it:        3,
  mistake_journal: 5,
  cram:            3,
  practice:        3,
  recall:          3,
  visual:          3,
  high_yield:      3,
};

// ─── Philippines timezone helper ─────────────────────────────────────────────
function todayInManila(): { start: string; end: string } {
  const now = new Date();
  // Get today's date string in Asia/Manila
  const manilaFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const dateStr = manilaFormatter.format(now); // "YYYY-MM-DD"

  // Convert midnight Manila → UTC for the query window
  const startManila = new Date(`${dateStr}T00:00:00+08:00`);
  const endManila   = new Date(`${dateStr}T23:59:59.999+08:00`);

  return {
    start: startManila.toISOString(),
    end:   endManila.toISOString(),
  };
}

// ─── Count today's usage for a feature ───────────────────────────────────────
export async function getUsageToday(
  userId: string,
  feature: FeatureKey
): Promise<number> {
  const { start, end } = todayInManila();

  try {
    const query = supabase
      .from("usage_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("feature", feature)
      .gte("used_at", start)
      .lte("used_at", end);

    const { count, error } = await withTimeout(query, 2500, "freemium usage query");

    if (error) {
      console.error("[freemium] getUsageToday error:", error.message);
      return 0; // fail open — don't block the user on a DB error
    }

    return count ?? 0;
  } catch (err) {
    console.warn("[freemium] getUsageToday timed out or failed (failing open):", err);
    return 0;
  }
}

// ─── Can this user use the feature right now? ─────────────────────────────────
export async function canUse(
  userId: string,
  feature: FeatureKey,
  plan: "free" | "pro"
): Promise<boolean> {
  if (plan === "pro") return true;
  try {
    const used = await getUsageToday(userId, feature);
    return used < LIMITS[feature];
  } catch {
    return true; // fail open
  }
}

// ─── Log a usage event ────────────────────────────────────────────────────────
export async function logUsage(
  userId: string,
  feature: FeatureKey
): Promise<void> {
  try {
    const query = supabase
      .from("usage_logs")
      .insert({ user_id: userId, feature });
    await withTimeout(query, 2500, "freemium log usage");
  } catch (err) {
    console.warn("[freemium] logUsage warning:", err);
  }
}

// ─── How many uses remain today? ─────────────────────────────────────────────
export async function getRemainingUses(
  userId: string,
  feature: FeatureKey,
  plan: "free" | "pro"
): Promise<number> {
  if (plan === "pro") return Infinity;
  const used = await getUsageToday(userId, feature);
  return Math.max(0, LIMITS[feature] - used);
}
