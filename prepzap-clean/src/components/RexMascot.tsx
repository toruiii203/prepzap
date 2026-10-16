import React, { useState, useEffect } from "react";
import { playPop, playTap } from "@/lib/soundFX";

export type RexEmotion = "happy" | "excited" | "thinking" | "neutral" | "peeking" | "surprised" | "laughing";

interface RexMascotProps {
  emotion?: RexEmotion;
  size?: "sm" | "md" | "lg" | "xl";
  speech?: string;
  subSpeech?: string;
  animate?: boolean;
  interactive?: boolean;
  className?: string;
  onClick?: () => void;
}

const EMOTION_IMAGES: Record<RexEmotion, string> = {
  happy: "/fox/fox-happy.png",
  excited: "/fox/fox-excited.png",
  thinking: "/fox/fox-thinking.png",
  neutral: "/fox/fox-neutral.png",
  peeking: "/fox/fox-peeking.png",
  surprised: "/fox/fox-surprised.png",
  laughing: "/fox/fox-laughing.png",
};

const SIZE_CLASSES = {
  sm: "w-14 h-14",
  md: "w-20 h-20 md:w-24 md:h-24",
  lg: "w-28 h-28 md:w-36 md:h-36",
  xl: "w-36 h-36 md:w-44 md:h-44",
};

const FUN_QUOTES = [
  "Study 10 mins today and your brain will consolidate it while you sleep! 🧠",
  "High five! Let's keep the streak burning! 🔥",
  "Mistakes don't hurt your score here—they make your recall stronger! ✨",
  "Rex is proud of you! Ready for a quick 3-minute quiz? 🦊",
  "Spaced repetition is science. Trust the process! 🚀",
];

export function RexMascot({
  emotion = "happy",
  size = "lg",
  speech,
  subSpeech,
  animate = true,
  interactive = true,
  className = "",
  onClick,
}: RexMascotProps) {
  const [currentEmotion, setCurrentEmotion] = useState<RexEmotion>(emotion);
  const [isJumping, setIsJumping] = useState(false);
  const [customQuote, setCustomQuote] = useState<string | null>(null);
  const [isTabVisible, setIsTabVisible] = useState(true);

  // Sync prop changes
  useEffect(() => {
    setCurrentEmotion(emotion);
  }, [emotion]);

  // Pause animation when tab is hidden to save battery & CPU
  useEffect(() => {
    const handleVisibility = () => {
      setIsTabVisible(document.visibilityState === "visible");
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const handleClick = () => {
    if (!interactive) return;
    playPop(1.2);
    setIsJumping(true);
    setCurrentEmotion("excited");

    // Random quote if no static speech provided
    const random = FUN_QUOTES[Math.floor(Math.random() * FUN_QUOTES.length)];
    setCustomQuote(random);

    setTimeout(() => {
      setIsJumping(false);
      setCurrentEmotion(emotion);
    }, 700);

    if (onClick) onClick();
  };

  const activeSpeech = customQuote || speech;

  return (
    <div className={`relative flex items-center gap-3.5 select-none ${className}`}>
      <style>{`
        @keyframes rex-float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-8px) rotate(1.5deg);
          }
        }
        @keyframes rex-shadow {
          0%, 100% {
            transform: scaleX(1);
            opacity: 0.35;
          }
          50% {
            transform: scaleX(0.85);
            opacity: 0.18;
          }
        }
        @keyframes rex-jump {
          0% { transform: translateY(0px) scale(1); }
          40% { transform: translateY(-18px) scale(1.08) rotate(-3deg); }
          75% { transform: translateY(-4px) scale(0.98) rotate(1deg); }
          100% { transform: translateY(0px) scale(1) rotate(0deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .rex-anim-float { animation: none !important; }
          .rex-anim-shadow { animation: none !important; }
          .rex-anim-jump { animation: none !important; }
        }
      `}</style>

      {/* Mascot Avatar Container */}
      <div 
        onClick={handleClick}
        className={`relative shrink-0 flex flex-col items-center justify-center ${interactive ? "cursor-pointer group" : ""}`}
      >
        {/* Floating Mascot */}
        <div
          className={`${SIZE_CLASSES[size]} relative z-10 transition-transform ${
            isJumping
              ? "rex-anim-jump"
              : animate && isTabVisible
              ? "rex-anim-float"
              : ""
          } ${interactive ? "group-hover:scale-105 active:scale-95" : ""}`}
          style={{
            animation: isJumping 
              ? "rex-jump 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)" 
              : animate && isTabVisible 
              ? "rex-float 3.5s ease-in-out infinite" 
              : "none",
          }}
        >
          <img
            src={EMOTION_IMAGES[currentEmotion] || EMOTION_IMAGES.happy}
            alt="Rex Mascot"
            className="w-full h-full object-contain drop-shadow-[0px_4px_8px_rgba(0,0,0,0.18)]"
            draggable={false}
          />
        </div>

        {/* Soft Organic Reactive Shadow underneath */}
        {animate && (
          <div
            className="w-16 h-3 bg-black/40 rounded-full mt-[-6px] blur-[1px] rex-anim-shadow transition-all"
            style={{
              animation: isTabVisible ? "rex-shadow 3.5s ease-in-out infinite" : "none",
            }}
          />
        )}
      </div>

      {/* Dynamic Speech Bubble */}
      {activeSpeech && (
        <div className="relative bg-white border-2 border-black rounded-2xl p-3 md:p-3.5 shadow-[3px_3px_0px_#000] max-w-xs md:max-w-sm transition-all animate-in fade-in zoom-in-95 duration-200">
          {/* Bubble Pointer triangle */}
          <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-0 h-0 border-y-[6px] border-y-transparent border-r-[8px] border-r-black" />
          <div className="absolute -left-[6px] top-1/2 -translate-y-1/2 w-0 h-0 border-y-[5px] border-y-transparent border-r-[7px] border-r-white" />

          <p className="text-[13px] md:text-[14px] font-extrabold text-black leading-snug">
            {activeSpeech}
          </p>
          {subSpeech && (
            <p className="text-[11px] font-bold text-black/55 mt-1 leading-tight">
              {subSpeech}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
