/**
 * PrepZap — XP helpers
 * All level/tier calculations derive from the user's real total_xp.
 */

export const XP_PER_LEVEL = 500

export const TIER_LABELS = ["Bronze", "Silver", "Gold", "Platinum", "Diamond"]
export const TIER_EMOJIS = ["🥉", "🥈", "🥇", "💎", "👑"]

export function levelFromXp(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1
}

export function xpToNextLevel(xp: number): number {
  return XP_PER_LEVEL - (xp % XP_PER_LEVEL)
}

export function xpProgressPercent(xp: number): number {
  return Math.round(((xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100)
}

export function tierFromLevel(level: number): string {
  const idx = Math.min(Math.floor((level - 1) / 3), TIER_LABELS.length - 1)
  return TIER_LABELS[idx]
}

export function tierEmojiFromLevel(level: number): string {
  const idx = Math.min(Math.floor((level - 1) / 3), TIER_EMOJIS.length - 1)
  return TIER_EMOJIS[idx]
}
