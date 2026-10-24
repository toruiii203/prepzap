import React, { useState, useEffect } from "react";
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
  useGif?: boolean; // When true (default), uses clean, ghost-free animated GIFs
  grounded?: boolean; // When true (default), Rex stands solid on ground with no floating/hovering
  pedestal?: boolean; // When true, renders a solid 3D Duolingo-style stage podium directly under paws
}

export const REX_SOLID_POSES: Record<RexState, string> = {
  idle: "/fox/rex_calm_solid.png",
  waving: "/fox/rex_waving_solid.png",
  listening: "/fox/rex_neutral_solid.png",
  processing: "/fox/rex_thoughtful_solid.png",
  thinking: "/fox/rex_thoughtful_solid.png",
  responding: "/fox/rex_speech_solid.png",
  excited: "/fox/rex_celebrating_solid.png",
  dancing: "/fox/rex_celebrating_solid.png",
  nodding: "/fox/rex_calm_solid.png",
};

export const GIF_ANIMATIONS: Record<RexState, string> = {
  idle: "/animations/rex_idle.gif",
  waving: "/animations/rex_waving.gif",
  listening: "/animations/rex_listening.gif",
  processing: "/animations/rex_thinking.gif",
  thinking: "/animations/rex_thinking.gif",
  responding: "/animations/rex_speaking.gif",
  excited: "/animations/rex_celebrating.gif",
  dancing: "/animations/rex_celebrating.gif",
  nodding: "/animations/rex_nodding.gif",
};

export const WEBP_ANIMATIONS: Record<RexState, string> = {
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

// Sized generously to Rex's natural portrait aspect ratio (width:height ~ 1:1.9)
const SIZE_STYLES = {
  sm: { container: "w-16 h-28 sm:w-20 sm:h-34", shadow: "w-14 sm:w-16 h-2", pedestal: "w-24 h-4" },
  md: { container: "w-24 h-40 sm:w-28 sm:h-46", shadow: "w-20 sm:w-24 h-2.5", pedestal: "w-32 h-5" },
  lg: { container: "w-36 h-56 sm:w-44 sm:h-68", shadow: "w-32 sm:w-36 h-3", pedestal: "w-44 h-6" },
  xl: { container: "w-48 h-72 sm:w-56 sm:h-84", shadow: "w-40 sm:w-48 h-3.5", pedestal: "w-54 h-7" },
  hero: { container: "w-60 h-92 sm:w-72 sm:h-110", shadow: "w-52 sm:w-60 h-4", pedestal: "w-68 h-8" },
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
  useGif = true, // Default to clean, ghost-free animated GIFs (Duolingo style)
  grounded = true, // Default to grounded solid posture
  pedestal = false, // Optional built-in 3D stage
}: AnimatedRexProps) {
  const [sprite, setSprite] = useState<string>(SPRITES.happy);
  const [isJumping, setIsJumping] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  const [isTabVisible, setIsTabVisible] = useState(true);
  const [mouthOpen, setMouthOpen] = useState(false);

  // Active image asset: Uses ultra-crisp transparent animated GIF by default
  const activeGif = useGif && isTabVisible ? GIF_ANIMATIONS[state] : null;
  const activeWebP = isTabVisible ? WEBP_ANIMATIONS[state] : null;
  const activeSolidPose = REX_SOLID_POSES[state] || sprite;

  // Lip-sync / speaking animation cycle
  useEffect(() => {
    if (!speaking && state !== "responding") {
      setMouthOpen(false);
      return;
    }

    const interval = setInterval(() => {
      setMouthOpen((prev) => !prev);
    }, 150);

    return () => clearInterval(interval);
  }, [speaking, state]);

  // Determine active sprite fallback if needed
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
      setSprite(amplitude > 40 ? SPRITES.surprised : SPRITES.peeking);
      return;
    }

    if (state === "responding" || speaking) {
      setSprite(mouthOpen ? SPRITES.laughing : SPRITES.happy);
      return;
    }

    if (state === "excited" || state === "dancing") {
      setSprite(state === "dancing" ? SPRITES.laughing : SPRITES.excited);
      return;
    }

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
    <div className={`relative flex flex-col items-center justify-end select-none ${className}`}>
      <style>{`
        /* Grounded Duolingo-style Animations: Feet remain anchored to baseline */
        @keyframes rex-grounded-breathe {
          0%, 100% {
            transform: scale(1, 1);
          }
          50% {
            transform: scale(1.018, 1.012);
          }
        }
        @keyframes rex-solid-cheer {
          0%, 100% {
            transform: translateY(0px) scale(1, 1);
          }
          20% {
            transform: translateY(-8px) scale(1.04, 0.96) rotate(-1deg);
          }
          40% {
            transform: translateY(0px) scale(0.97, 1.03) rotate(0.8deg);
          }
          60% {
            transform: translateY(-4px) scale(1.02, 0.98) rotate(-0.5deg);
          }
          80% {
            transform: translateY(0px) scale(0.99, 1.01) rotate(0deg);
          }
        }
        @keyframes rex-grounded-talk {
          0%, 100% {
            transform: scale(1, 1);
          }
          50% {
            transform: scale(1.02, 0.985);
          }
        }
        @keyframes rex-grounded-sway {
          0%, 100% {
            transform: rotate(-2deg) scale(1, 1);
          }
          50% {
            transform: rotate(2deg) scale(1.01, 0.99);
          }
        }
        @keyframes rex-spring-pop {
          0% { transform: scale(1, 1); }
          25% { transform: scale(1.08, 0.92); }
          50% { transform: translateY(-14px) scale(0.94, 1.06) rotate(-2deg); }
          75% { transform: translateY(2px) scale(1.03, 0.97) rotate(1deg); }
          100% { transform: translateY(0px) scale(1, 1) rotate(0deg); }
        }
        @keyframes rex-confetti {
          0% { transform: translateY(0px) scale(0) rotate(0deg); opacity: 0; }
          30% { opacity: 1; transform: translateY(-22px) scale(1.2) rotate(60deg); }
          100% { transform: translateY(-50px) scale(0.8) rotate(180deg); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .rex-anim-active { animation: none !important; }
        }
      `}</style>

      {/* Audio Reactive Sound Halos (active when listening or speaking) */}
      {(state === "listening" || state === "responding" || speaking) && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
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

      {/* Mascot Container - Grounded firmly to baseline */}
      <div
        onClick={handleClick}
        className={`relative z-10 flex flex-col items-center justify-end ${
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
            transformOrigin: "bottom center",
            animation: isJumping
              ? "rex-spring-pop 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
              : !isTabVisible
              ? "none"
              : state === "excited" || state === "dancing"
              ? "rex-solid-cheer 1.4s ease-in-out infinite"
              : state === "processing" || state === "thinking"
              ? "rex-grounded-sway 2.5s ease-in-out infinite"
              : state === "responding" || speaking
              ? "rex-grounded-talk 0.35s ease-in-out infinite"
              : "rex-grounded-breathe 3.2s ease-in-out infinite",
          }}
        >
          {/* Main Fox Character: Clean, ghost-free transparent animated GIF / WebP */}
          <picture className="w-full h-full flex items-end justify-center">
            {activeWebP && (
              <source
                type="image/webp"
                srcSet={activeWebP}
                media="(prefers-reduced-motion: no-preference)"
              />
            )}
            <img
              src={activeGif || activeWebP || activeSolidPose}
              alt="Rex Mascot"
              className="w-full h-full object-contain filter drop-shadow-[0px_4px_8px_rgba(0,0,0,0.12)]"
              draggable={false}
              loading="eager"
            />
          </picture>

          {/* Smooth Eyelid Blink Overlay (when not in animated GIF) */}
          {!activeGif && isBlinking && state !== "processing" && (
            <div
              className="absolute top-[32%] left-[28%] right-[28%] h-[5px] bg-[#2D1B14] rounded-full z-20 pointer-events-none transition-all duration-75"
              style={{ opacity: 0.92 }}
            />
          )}

          {/* Celebration Confetti Shapes */}
          {(state === "dancing" || state === "excited") && (
            <div className="absolute -top-6 inset-x-0 flex justify-between pointer-events-none z-30 px-1">
              <span className="w-2.5 h-2.5 bg-[#FFD13B] border border-black rotate-12" style={{ animation: "rex-confetti 1.1s ease-out infinite" }} />
              <span className="w-3 h-3 bg-[#FF4D2E] border border-black rounded-full" style={{ animation: "rex-confetti 1.4s ease-out infinite 0.3s" }} />
              <span className="w-2.5 h-2.5 bg-[#10B981] border border-black -rotate-12" style={{ animation: "rex-confetti 1.2s ease-out infinite 0.6s" }} />
            </div>
          )}
        </div>

        {/* Solid Ground Contact Shadow directly under feet (Anchored, not floating) */}
        {grounded && !pedestal && (
          <div
            className={`${SIZE_STYLES[size].shadow} bg-black/25 rounded-full mt-[-3px] mx-auto transition-all`}
          />
        )}

        {/* Optional 3D Duolingo Stage Platform Podium */}
        {pedestal && (
          <div className="relative w-full flex flex-col items-center mt-[-4px] z-0">
            <div className={`${SIZE_STYLES[size].pedestal} bg-[#E5E7EB] border-2 border-black rounded-t-xl shadow-inner relative`} />
            <div className={`${SIZE_STYLES[size].pedestal} h-2.5 bg-[#CBD5E1] border-2 border-t-0 border-black rounded-b-xl shadow-[0_3px_0_#000]`} />
          </div>
        )}
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
