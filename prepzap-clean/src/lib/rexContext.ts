/**
 * Studenius Context-Aware Rex Engine (Phase 4B)
 * Dynamically computes Rex's mood, animated asset, and greeting copy
 * based on local time of day, streak status, and upcoming exam countdown.
 */

export interface RexContext {
  animation: string; // e.g. "/animations/rex_waving.webp"
  stateName: "waving" | "celebrating" | "explaining" | "thinking" | "smile" | "nodding";
  mood: "welcoming" | "celebrating" | "focused" | "night_owl" | "steady";
  headline: string;
  speechBubble: string;
  badgeEmoji: string;
}

export function getRexContext(params: {
  streakDays?: number;
  examDaysLeft?: number | null;
  hour?: number;
  userName?: string;
}): RexContext {
  const hour = params.hour ?? new Date().getHours();
  const streak = params.streakDays ?? 0;
  const examDays = params.examDaysLeft;

  // 1. High Priority: Exam within 3 days -> Focused / Explaining Rex
  if (examDays !== undefined && examDays !== null && examDays >= 0 && examDays <= 3) {
    const daysLabel = examDays === 0 ? "today!" : examDays === 1 ? "tomorrow!" : `in ${examDays} days!`;
    return {
      animation: "/animations/rex_explaining.webp",
      stateName: "explaining",
      mood: "focused",
      headline: `Exam ${daysLabel}`,
      speechBubble: "High-yield recall mode! 🎯",
      badgeEmoji: "🎯",
    };
  }

  // 2. High Streak (>= 3 days) -> Celebratory Rex
  if (streak >= 3) {
    return {
      animation: "/animations/rex_celebrating.webp",
      stateName: "celebrating",
      mood: "celebrating",
      headline: `${streak}-Day Streak! 🔥`,
      speechBubble: `${streak}d on fire! Keep it going!`,
      badgeEmoji: "🔥",
    };
  }

  // 3. Night Owl (10 PM to 4 AM) -> Thinking / Night Owl Rex
  if (hour >= 22 || hour < 5) {
    return {
      animation: "/animations/rex_thinking.webp",
      stateName: "thinking",
      mood: "night_owl",
      headline: "Night Owl Scholar 🦉",
      speechBubble: "Late grind? Let's finish strong!",
      badgeEmoji: "🌙",
    };
  }

  // 4. Morning (5 AM to 11 AM) -> Waving / Energetic Rex
  if (hour >= 5 && hour < 12) {
    return {
      animation: "/animations/rex_waving.webp",
      stateName: "waving",
      mood: "welcoming",
      headline: "Good Morning! ☀️",
      speechBubble: "Ready to conquer today? ⚡",
      badgeEmoji: "☀️",
    };
  }

  // 5. Afternoon (12 PM to 5 PM) -> Smiling / Encouraging Rex
  if (hour >= 12 && hour < 17) {
    return {
      animation: "/animations/rex_smile.webp",
      stateName: "smile",
      mood: "steady",
      headline: "Afternoon Momentum ⚡",
      speechBubble: "5 minutes locks the memory in!",
      badgeEmoji: "⚡",
    };
  }

  // 6. Evening (6 PM to 9 PM) -> Nodding / Steady Rex
  return {
    animation: "/animations/rex_nodding.webp",
    stateName: "nodding",
    mood: "steady",
    headline: "Evening Session 🌙",
    speechBubble: "Solid work building your habit!",
    badgeEmoji: "✨",
  };
}
