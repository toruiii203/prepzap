import type { MouseEventHandler } from "react";
import { Mascot, type MascotMood, type MascotSize } from "@/components/Mascot";

export type RexState = "idle" | "listening" | "processing" | "responding" | "excited" | "dancing" | "waving" | "thinking" | "nodding";
interface AnimatedRexProps {
  state?: RexState;
  amplitude?: number;
  size?: Exclude<MascotSize, "xs">;
  speaking?: boolean;
  interactive?: boolean;
  showSpeechBubble?: boolean;
  speechText?: string;
  className?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  /** Compatibility flags: the shared mascot is now a lightweight vector. */
  useGif?: boolean;
  preferAnimatedWebP?: boolean;
  grounded?: boolean;
  pedestal?: boolean;
}
const moods: Record<RexState, MascotMood> = {
  idle: "idle", listening: "thinking", processing: "thinking", responding: "encouraging",
  excited: "celebrate", dancing: "cheering", waving: "encouraging", thinking: "thinking", nodding: "happy",
};
/** Compatibility adapter for existing screens; all character rendering lives in Mascot. */
export function AnimatedRex({ state = "idle", size = "lg", speaking, interactive = true, showSpeechBubble, speechText, className, onClick }: AnimatedRexProps) {
  return (
    <div className={`flex flex-col items-center ${className || ""}`}>
      <Mascot mood={speaking ? "encouraging" : moods[state]} size={size} interactive={interactive} onClick={onClick} />
      {showSpeechBubble && speechText && <p className="mascot-speech">{speechText}</p>}
    </div>
  );
}
