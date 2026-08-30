import React, { useState } from "react";

// Asset paths
import rexIdle from "@/assets/mascot/rex_idle.mp4";
import rexAttention from "@/assets/mascot/rex_attention.mp4";
import rexWrong from "@/assets/mascot/rex_wrong.mp4";

export type MascotState = "idle" | "attention" | "wrong" | "success" | "happy" | "thinking" | "peeking" | "excited";

interface MascotProps {
  state?: MascotState;
  dialogue?: string;
  subtitle?: string;
  hintVisible?: boolean;
  onHintClick?: () => void;
  variant?: "floating" | "banner" | "circle" | "inline";
  size?: "sm" | "md" | "lg";
  className?: string;
  onClick?: () => void;
}

const FOX_IMAGES: Record<string, string> = {
  idle: "/fox/fox-neutral.png",
  neutral: "/fox/fox-neutral.png",
  happy: "/fox/fox-happy.png",
  success: "/fox/fox-happy.png",
  excited: "/fox/fox-excited.png",
  thinking: "/fox/fox-thinking.png",
  attention: "/fox/fox-surprised.png",
  wrong: "/fox/fox-neutral.png",
  peeking: "/fox/fox-peeking.png",
  laughing: "/fox/fox-laughing.png",
};

export const Mascot: React.FC<MascotProps> = ({
  state = "idle",
  dialogue,
  subtitle,
  hintVisible,
  onHintClick,
  variant = "floating",
  size = "md",
  className = "",
  onClick,
}) => {
  const [videoError, setVideoError] = useState(false);
  const [tapDialogue, setTapDialogue] = useState<string | null>(null);

  // Determine video or image source based on state
  let videoSrc = rexIdle;
  if (state === "attention") videoSrc = rexAttention;
  if (state === "wrong") videoSrc = rexWrong;

  const imageSrc = FOX_IMAGES[state] || "/fox/fox-neutral.png";

  const handleMascotTap = () => {
    if (onClick) {
      onClick();
      return;
    }
    const encouragements = [
      "You've got this! ??",
      "Keep pushing! ??",
      "Mastery takes reps! ??",
      "Rex is cheering for you! ??",
      "One question at a time! ??"
    ];
    const random = encouragements[Math.floor(Math.random() * encouragements.length)];
    setTapDialogue(random);
    setTimeout(() => setTapDialogue(null), 3000);
  };

  const displayDialogue = tapDialogue || dialogue;

  // Variant: Floating (e.g. used in Practice bottom/top corner)
  if (variant === "floating") {
    return (
      <div className={`fixed bottom-24 right-4 z-40 flex flex-col items-end pointer-events-auto ${className}`}>
        {/* Speech Bubble */}
        {(displayDialogue || hintVisible) && (
          <div className="mb-2 max-w-[200px] bg-white border-2 border-black rounded-xl p-2.5 shadow-[3px_3px_0px_0px_#000] text-[13px] font-bold text-black animate-in fade-in slide-in-from-bottom-2 duration-200">
            <p className="m-0 leading-tight">{displayDialogue || "Need a hint? Tap me!"}</p>
            {subtitle && <p className="text-[10px] text-black/50 mt-1 font-semibold">{subtitle}</p>}
          </div>
        )}

        {/* Mascot Avatar */}
        <button
          type="button"
          onClick={onHintClick || handleMascotTap}
          className="w-16 h-16 sm:w-20 sm:h-20 bg-[#FF9F1C] border-2 border-black rounded-full overflow-hidden shadow-[3px_3px_0px_0px_#000] active:scale-95 transition-transform flex items-center justify-center cursor-pointer p-0 relative"
          title="Rex your study buddy"
        >
          {!videoError ? (
            <video
              src={videoSrc}
              autoPlay
              loop
              muted
              playsInline
              onError={() => setVideoError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={imageSrc}
              alt="Rex the Fox"
              className="w-full h-full object-contain p-1"
            />
          )}
        </button>
      </div>
    );
  }

  // Variant: Banner (e.g. Dashboard / Header card)
  if (variant === "banner") {
    return (
      <div className={`flex items-center gap-3.5 bg-white border-2 border-black p-4 rounded-xl shadow-[3px_3px_0px_0px_#000] ${className}`}>
        <div
          onClick={handleMascotTap}
          className="w-14 h-14 sm:w-16 sm:h-16 bg-[#FF9F1C] border-2 border-black rounded-full overflow-hidden flex-shrink-0 cursor-pointer active:scale-95 transition-transform"
        >
          {!videoError ? (
            <video
              src={videoSrc}
              autoPlay
              loop
              muted
              playsInline
              onError={() => setVideoError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <img src={imageSrc} alt="Rex" className="w-full h-full object-contain p-1" />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider bg-[#FF4D2E] text-white px-2 py-0.5 rounded border border-black">
              Rex • Study Coach
            </span>
          </div>
          <p className="text-[14px] font-bold text-black mt-1 leading-snug">
            {displayDialogue || "Ready to crush your daily goals today?"}
          </p>
          {subtitle && (
            <p className="text-[12px] font-medium text-black/60 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
    );
  }

  // Variant: Circle (compact avatar)
  return (
    <div
      onClick={handleMascotTap}
      className={`inline-flex items-center justify-center rounded-full border-2 border-black bg-[#FF9F1C] overflow-hidden cursor-pointer shadow-[2px_2px_0px_0px_#000] active:scale-95 transition-transform ${
        size === "sm" ? "w-10 h-10" : size === "lg" ? "w-20 h-20" : "w-14 h-14"
      } ${className}`}
    >
      {!videoError ? (
        <video
          src={videoSrc}
          autoPlay
          loop
          muted
          playsInline
          onError={() => setVideoError(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <img src={imageSrc} alt="Rex" className="w-full h-full object-contain p-1" />
      )}
    </div>
  );
};

export default Mascot;
