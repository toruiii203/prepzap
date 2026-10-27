/** One-shot gestures, independent of the mascot's facial mood. Durations in seconds. */
export const mascotMovements = {
  wave: { duration: 0.95, label: "Hello wave" },
  curious: { duration: 0.9, label: "Curious lean" },
  hop: { duration: 0.8, label: "Happy hop" },
  cheer: { duration: 1.35, label: "Double cheer" },
  dance: { duration: 1.9, label: "Side-step dance" },
} as const;
export type MascotMovement = keyof typeof mascotMovements;
export type MascotMovementPose = MascotMovement | "rest";

export function nextTapMovement(previous?: MascotMovement): MascotMovement {
  const options = (Object.keys(mascotMovements) as MascotMovement[]).filter(item => item !== previous);
  return options[Math.floor(Math.random() * options.length)];
}
