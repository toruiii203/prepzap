import { Mascot, type MascotMood, type MascotSize } from "@/components/Mascot";
export type RexEmotion = "happy" | "excited" | "thinking" | "neutral" | "peeking" | "surprised" | "laughing";
interface RexMascotProps {
  emotion?: RexEmotion;
  size?: Exclude<MascotSize, "xs" | "hero">;
  speech?: string;
  subSpeech?: string;
  animate?: boolean;
  interactive?: boolean;
  className?: string;
  onClick?: () => void;
}
const moods: Record<RexEmotion, MascotMood> = { happy: "happy", excited: "celebrate", thinking: "thinking", neutral: "idle", peeking: "encouraging", surprised: "cheering", laughing: "happy" };
export function RexMascot({ emotion = "happy", size = "lg", speech, subSpeech, animate = true, interactive = true, className, onClick }: RexMascotProps) {
  return (
    <div className={`flex items-center gap-3 ${className || ""}`}>
      <Mascot mood={moods[emotion]} size={size} animate={animate} interactive={interactive} onClick={onClick} />
      {speech && <div className="mascot-speech"><p>{speech}</p>{subSpeech && <p className="text-sm opacity-75">{subSpeech}</p>}</div>}
    </div>
  );
}
