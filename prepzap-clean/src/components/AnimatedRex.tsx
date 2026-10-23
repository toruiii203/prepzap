import React, { useState, useEffect, useRef } from "react";
import { playPop } from "@/lib/soundFX";

export type RexState = "idle" | "listening" | "processing" | "responding" | "excited" | "dancing" | "waving" | "thinking" | "nodding";

interface AnimatedRexProps {
  state?: RexState;
  amplitude?: number; // 0 to 255 from microphone audio analyser
  size?: "sm" | "md" | "lg" | "xl" | "hero";
  speaking?: boolean;
  interactive?: boolean;
  showSpeechBubble?: boolean;
  speechText?: string;
  className?: string;
  onClick?: () => void;
  preferAnimatedWebP?: boolean; // When true, uses our smooth transparent WebP animations
}

const WEBP_ANIMATIONS: Record<string, string> = {
  idle: "/animations/rex_idle.webp",
  waving: "/animations/rex_waving.webp",
  listening: "/animations/rex_listening.webp",
  processing: "/animations/rex_thinking.webp",
  thinking: "/animations/rex_thinking.webp",
  responding: "/animations/rex_speaking.webp",
  excited: "/animations/rex_celebrating.webp",
  dancing: "/animations/rex_celebrating.webp",
  nodding: "/animations/rex_nodding.webp",
};

const SPRITES = {
  neutral: "/fox/fox-neutral.png",
  happy: "/fox/fox-happy.png",
  excited: "/fox/fox-excited.png",
  thinking: "/fox/fox-thinking.png",
  peeking: "/fox/fox-peeking.png",
  surprised: "/fox/fox-surprised.png",
  laughing: "/fox/fox-laughing.png",
};

const SIZE_STYLES = {
  sm: { container: "w-14 h-14", shadow: "w-10 h-2" },
  md: { container: "w-24 h-24", shadow: "w-16 h-3" },
  lg: { container: "w-36 h-36 md:w-44 md:h-44", shadow: "w-28 h-4" },
  xl: { container: "w-56 h-56 md:w-64 md:h-64", shadow: "w-44 h-6" },
  hero: { container: "w-64 h-64 md:w-80 md:h-80", shadow: "w-56 h-8" },
};

export function AnimatedRex({
  state = "idle",
  amplitude = 0,
  size = "lg",
  speaking = false,
  interactive = true,
  showSpeechBubble = false,
  speechText,
  className = "",
  onClick,
  preferAnimatedWebP = true,
}: AnimatedRexProps) {
  const [sprite, setSprite] = useState<string>(SPRITES.happy);
  const [isJumping, setIsJumping] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  const [isTabVisible, setIsTabVisible] = useState(true);
  const [mouthOpen, setMouthOpen] = useState(false);

  // Active animation asset (WebP vs sprite fallback)
  const activeWebP = preferAnimatedWebP && isTabVisible ? WEBP_ANIMATIONS[state] : null;

  // Lip-sync / speaking animation cycle
  useEffect(() => {
    if (!speaking && state !== "responding") {
      setMouthOpen(false);
      return;
    }

    // Toggle mouth every 140ms while speaking to create organic talking animation
    const interval = setInterval(() => {
      setMouthOpen((prev) => !prev);
    }, 150);

    return () => clearInterval(interval);
  }, [speaking, state]);

  // Determine active sprite based on state and mouth toggle
  useEffect(() => {
    if (isJumping) {
      setSprite(SPRITES.excited);
      return;
    }

    if (state === "processing") {
      setSprite(SPRITES.thinking);
      return;
    }

    if (state === "listening") {
      // Ears perked, attentive eyes
      setSprite(amplitude > 40 ? SPRITES.surprised : SPRITES.peeking);
      return;
    }

    if (state === "responding" || speaking) {
      // Mouth moves between open smile and laughing mouth
      setSprite(mouthOpen ? SPRITES.laughing : SPRITES.happy);
      return;
    }

    if (state === "excited" || state === "dancing") {
      setSprite(state === "dancing" ? SPRITES.laughing : SPRITES.excited);
      return;
    }

    // Default Idle
    setSprite(SPRITES.happy);
  }, [state, speaking, mouthOpen, isJumping, amplitude]);

  // Natural organic blinking cycle (every 3 to 5 seconds)
  useEffect(() => {
    let blinkTimeout: NodeJS.Timeout;
    const scheduleNextBlink = () => {
      const delay = Math.random() * 2500 + 3000;
      blinkTimeout = setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => {
          setIsBlinking(false);
          scheduleNextBlink();
        }, 160);
      }, delay);
    };

    scheduleNextBlink();
    return () => clearTimeout(blinkTimeout);
  }, []);

  // Save CPU & battery when tab is hidden
  useEffect(() => {
    const handleVisibility = () => {
      setIsTabVisible(document.visibilityState === "visible");
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const handleClick = () => {
    if (!interactive) return;
    playPop(1.25);
    setIsJumping(true);
    setTimeout(() => setIsJumping(false), 600);
    if (onClick) onClick();
  };

  // Sound wave halo scale derived from microphone amplitude (0 - 255)
  const soundScale = 1 + (amplitude / 255) * 0.45;

  return (
    <div className={`relative flex flex-col items-center justify-center select-none ${className}`}>
      <style>{`
        @keyframes rex-breathe {
          0%, 100% {
            transform: translateY(0px) scale(1) rotate(0deg);
          }
          50% {
            transform: translateY(-8px) scale(1.02) rotate(1deg);
          }
        }
        @keyframes rex-talk-bob {
          0%, 100% {
            transform: translateY(0px) scale(1);
          }
          50% {
            transform: translateY(-10px) scale(1.04, 0.98);
          }
        }
        @keyframes rex-thinking-sway {
          0%, 100% {
            transform: rotate(-3deg) translateY(0);
          }
          50% {
            transform: rotate(3deg) translateY(-6px);
          }
        }
        @keyframes rex-dance {
          0%, 100% {
            transform: translateY(0px) rotate(0deg) scale(1);
          }
          20% {
            transform: translateY(-16px) rotate(-6deg) scale(1.08, 0.94);
          }
          40% {
            transform: translateY(2px) rotate(4deg) scale(0.95, 1.05);
          }
          60% {
            transform: translateY(-12px) rotate(-4deg) scale(1.05, 0.96);
          }
          80% {
            transform: translateY(0px) rotate(2deg) scale(0.98, 1.02);
          }
        }
        @keyframes rex-confetti {
          0% { transform: translateY(0px) scale(0) rotate(0deg); opacity: 0; }
          30% { opacity: 1; transform: translateY(-22px) scale(1.2) rotate(60deg); }
          100% { transform: translateY(-50px) scale(0.8) rotate(180deg); opacity: 0; }
        }
        @keyframes rex-jump-spring {
          0% { transform: translateY(0px) scale(1); }
          30% { transform: translateY(-24px) scale(1.12, 0.9) rotate(-3deg); }
          60% { transform: translateY(4px) scale(0.94, 1.06) rotate(1deg); }
          100% { transform: translateY(0px) scale(1) rotate(0deg); }
        }
        @keyframes rex-shadow-pulse {
          0%, 100% {
            transform: scaleX(1);
            opacity: 0.35;
          }
          50% {
            transform: scaleX(0.82);
            opacity: 0.18;
          }
        }
        @keyframes pulse-ring {
          0% {
            transform: scale(0.95);
            opacity: 0.8;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.4;
          }
          100% {
            transform: scale(1.4);
            opacity: 0;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .rex-anim-active { animation: none !important; }
        }
      `}</style>

      {/* Audio Reactive Sound Halos (active when listening or speaking) */}
      {(state === "listening" || state === "responding" || speaking) && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          {/* Inner Audio Halo */}
          <div
            className={`rounded-full transition-transform duration-75 ${
              state === "listening" ? "bg-red-500/25 border border-red-500/40" : "bg-[#FFD13B]/25 border border-[#FFD13B]/40"
            }`}
            style={{
              width: "120%",
              height: "120%",
              transform: `scale(${soundScale})`,
            }}
          />
          {/* Outer Pulsing Halo */}
          <div
            className={`absolute rounded-full animate-ping opacity-30 ${
              state === "listening" ? "bg-red-500" : "bg-[#FFD13B]"
            }`}
            style={{
              width: "100%",
              height: "100%",
              animationDuration: state === "listening" ? "1.5s" : "2s",
            }}
          />
        </div>
      )}

      {/* Thinking Cloud Aura */}
      {state === "processing" && (
        <div className="absolute -top-3 right-4 flex items-center gap-1.5 z-20 animate-bounce">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FFD13B] border-2 border-black" />
          <span className="w-3.5 h-3.5 rounded-full bg-[#FFD13B] border-2 border-black" />
          <span className="material-symbols-outlined text-[20px] text-black">psychology</span>
        </div>
      )}

      {/* Mascot Container */}
      <div
        onClick={handleClick}
        className={`relative z-10 flex flex-col items-center justify-center ${
          interactive ? "cursor-pointer group" : ""
        }`}
      >
        <div
          className={`${SIZE_STYLES[size].container} relative transition-transform ${
            isJumping
              ? "rex-anim-active"
              : isTabVisible
              ? "rex-anim-active"
              : ""
          } ${interactive ? "group-hover:scale-105 active:scale-95" : ""}`}
          style={{
            animation: isJumping
              ? "rex-jump-spring 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
              : !isTabVisible
              ? "none"
              : state === "dancing"
              ? "rex-dance 0.75s ease-in-out infinite"
              : state === "processing"
              ? "rex-thinking-sway 2.5s ease-in-out infinite"
              : state === "responding" || speaking
              ? "rex-talk-bob 0.3s ease-in-out infinite"
              : "rex-breathe 3.5s ease-in-out infinite",
          }}
        >
          {/* Main Fox Character Animation (Lossless Animated WebP with PNG fallback) */}
          <picture>
            {activeWebP && (
              <source
                type="image/webp"
                srcSet={activeWebP}
                media="(prefers-reduced-motion: no-preference)"
              />
            )}
            <img
              src={activeWebP || sprite}
              alt="Rex Mascot"
              className="w-full h-full object-contain drop-shadow-[0px_6px_12px_rgba(0,0,0,0.2)]"
              draggable={false}
              loading="eager"
            />
          </picture>

          {/* Smooth Eyelid Blink Overlay */}
          {isBlinking && state !== "processing" && (
            <div
              className="absolute top-[32%] left-[28%] right-[28%] h-[6px] bg-[#2D1B14] rounded-full z-20 pointer-events-none transition-all duration-75"
              style={{ opacity: 0.95 }}
            />
          )}

          {/* Celebration Confetti Shapes */}
          {state === "dancing" && (
            <div className="absolute -top-6 inset-x-0 flex justify-between pointer-events-none z-30 px-1">
              <span className="w-2.5 h-2.5 bg-[#FFD13B] border border-black rotate-12" style={{ animation: "rex-confetti 1.1s ease-out infinite" }} />
              <span className="w-3 h-3 bg-[#FF4D2E] border border-black rounded-full" style={{ animation: "rex-confetti 1.4s ease-out infinite 0.3s" }} />
              <span className="w-2.5 h-2.5 bg-[#10B981] border border-black -rotate-12" style={{ animation: "rex-confetti 1.2s ease-out infinite 0.6s" }} />
            </div>
          )}
        </div>

        {/* Soft Organic Shadow Underneath */}
        <div
          className={`${SIZE_STYLES[size].shadow} bg-black/35 rounded-full mt-[-8px] blur-[1.5px] transition-all`}
          style={{
            animation: isTabVisible ? "rex-shadow-pulse 3.5s ease-in-out infinite" : "none",
          }}
        />
      </div>

      {/* Optional Speech Bubble for Mascot Greetings */}
      {showSpeechBubble && speechText && (
        <div className="relative mt-3 bg-white border-2 border-black rounded-2xl p-3 md:p-3.5 shadow-[3px_3px_0px_#000] max-w-xs transition-all animate-in fade-in zoom-in-95 duration-200 z-20">
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-x-[6px] border-x-transparent border-b-[8px] border-b-black" />
          <div className="absolute -top-[6px] left-1/2 -translate-x-1/2 w-0 h-0 border-x-[5px] border-x-transparent border-b-[7px] border-b-white" />
          <p className="text-[12.5px] md:text-[13px] font-extrabold text-black leading-snug text-center">
            {speechText}
          </p>
        </div>
      )}
    </div>
  );
}
