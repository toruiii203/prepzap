/** One-shot gestures, independent of the mascot's facial mood. Durations in seconds. */
export const mascotMovements = {
  wave: { duration: 0.95, label: "Hello wave" },
  curious: { duration: 0.9, label: "Curious lean" },
  hop: { duration: 0.8, label: "Happy hop" },
  cheer: { duration: 1.35, label: "Double cheer" },
  dance: { duration: 1.9, label: "Side-step dance" },
  spin: { duration: 0.7, label: "Spin" },
  "twirl-jump": { duration: 0.9, label: "Twirl jump" },
  "somersault-lite": { duration: 0.7, label: "Soft forward bounce" },
  "peek-in": { duration: 0.45, label: "Peek entrance" },
  "shake-it-off": { duration: 0.7, label: "Shake it off" },
  bow: { duration: 0.75, label: "Gentle bow" },
} as const;
export type MascotMovement = keyof typeof mascotMovements;
export type MascotMovementPose = MascotMovement | "rest";

export function nextTapMovement(previous?: MascotMovement): MascotMovement {
  const options = (["wave", "curious", "hop", "cheer", "dance"] as MascotMovement[]).filter(item => item !== previous);
  return options[Math.floor(Math.random() * options.length)];
}
