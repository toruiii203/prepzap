/**
 * Single source of truth for streak-at-risk status and combo rewards across Studenius.
 */

/**
 * Checks whether a user's streak is currently in jeopardy.
 *
 * Rules:
 * - User has an active streak (streakDays >= 1)
 * - User has NOT completed a study session today (!studiedToday)
 * - Local time is 8:00 PM (20:00) or later
 */
export function isStreakAtRisk(
  streakDays: number,
  studiedToday: boolean,
  currentHour: number = new Date().getHours()
): boolean {
  if (streakDays < 1) return false;
  if (studiedToday) return false;
  return currentHour >= 20;
}

/**
 * Returns hours remaining until midnight in the user's local timezone.
 */
export function getHoursUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
  const diffHours = (midnight.getTime() - now.getTime()) / (1000 * 60 * 60);
  return Math.max(1, Math.ceil(diffHours));
}

/**
 * Returns the combo tier icon, label, and screen edge glow for Practice mode.
 * Tier:
 * - 3 correct: ⚡ Combo Bonus ✨
 * - 4 correct: 🔥 Mega Combo Bonus ✨
 * - 5+ correct: 💥 Ultra Combo Bonus ✨
 */
export function getComboTier(comboCount: number): {
  icon: string;
  label: string;
  flashColor: string;
} {
  if (comboCount >= 5) {
    return { icon: "💥", label: "ULTRA COMBO BONUS ✨", flashColor: "rgba(255, 77, 46, 0.25)" };
  }
  if (comboCount === 4) {
    return { icon: "🔥", label: "MEGA COMBO BONUS ✨", flashColor: "rgba(255, 209, 59, 0.25)" };
  }
  if (comboCount === 3) {
    return { icon: "⚡", label: "COMBO BONUS ✨", flashColor: "rgba(16, 185, 129, 0.25)" };
  }
  return { icon: "", label: "", flashColor: "transparent" };
}
