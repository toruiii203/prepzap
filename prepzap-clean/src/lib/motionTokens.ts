import type { CSSProperties } from "react";

/** Shared timings for routes, feedback, lists, dialogs and mascot reactions. */
export const motionTokens = {
  instant: 0.12,
  quick: 0.18,
  enter: 0.24,
  exit: 0.14,
  stagger: 0.035,
  count: 0.65,
  reaction: 0.65,
  idle: 3.6,
  ease: [0.2, 0.8, 0.2, 1] as const,
  spring: { type: "spring", stiffness: 420, damping: 30, mass: 0.8 } as const,
  sheet: { type: "spring", stiffness: 320, damping: 32 } as const,
};
export const motionVariables = {
  "--motion-quick": `${motionTokens.quick}s`,
  "--motion-enter": `${motionTokens.enter}s`,
  "--motion-exit": `${motionTokens.exit}s`,
  "--motion-stagger": `${motionTokens.stagger}s`,
  "--motion-reaction": `${motionTokens.reaction}s`,
  "--motion-idle": `${motionTokens.idle}s`,
  "--motion-ease": `cubic-bezier(${motionTokens.ease.join(",")})`,
} as CSSProperties;
