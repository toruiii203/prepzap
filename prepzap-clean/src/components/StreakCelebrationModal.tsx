import React, { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { playCelebration, playPop, triggerHaptic, isSoundEnabled } from "@/lib/soundFX";

interface StreakCelebrationModalProps {
  isOpen?: boolean;
  streakCount: number;
  onContinue: () => void;
  onClose?: () => void;
  title?: string;
  isEmbedded?: boolean; // When true, renders directly in the flow instead of fixed backdrop
}

export function StreakCelebrationModal({
  isOpen = true,
  streakCount = 1,
  onContinue,
  onClose,
  title,
  isEmbedded = false,
}: StreakCelebrationModalProps) {
  const [animatedNumber, setAnimatedNumber] = useState<number>(0);
  const [showCheckmark, setShowCheckmark] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    // Trigger audio & haptics if sound is on
    if (isSoundEnabled()) {
      playCelebration();
    }
    triggerHaptic("celebrate");

    // Confetti burst
    try {
      confetti({
        particleCount: 65,
        spread: 65,
        origin: { y: 0.55 },
        colors: ["#FF9600", "#FFD13B", "#FF4D2E", "#10B981", "#000000"],
      });
    } catch {}

    // Number roll-up animation
    const numTimer = setTimeout(() => {
      setAnimatedNumber(streakCount);
    }, 250);

    // Checkmark pop animation for today
    const checkTimer = setTimeout(() => {
      setShowCheckmark(true);
    }, 550);

    return () => {
      clearTimeout(numTimer);
      clearTimeout(checkTimer);
    };
  }, [isOpen, streakCount]);

  if (!isOpen) return null;

  // Generate rolling 7 days ending with upcoming days, centered on today
  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const now = new Date();
  const todayIdx = now.getDay(); // 0 = Su, 1 = Mo, etc.

  // 7-day window with today at position 4 or 5 (like Duolingo Th, Fr, Sa, Su, Mo, Tu, We)
  const windowOffset = -4; // 4 days prior, today, 2 days after
  const daysList = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(now.getDate() + (windowOffset + i));
    const isToday = windowOffset + i === 0;
    const isPast = windowOffset + i < 0;
    const isFuture = windowOffset + i > 0;
    return {
      label: dayNames[d.getDay()],
      isToday,
      isPast,
      isFuture,
    };
  });

  const content = (
    <div className="w-full max-w-[390px] flex flex-col items-center justify-between min-h-[540px] px-5 py-6 font-['Quicksand',sans-serif] select-none">
      {/* Top Bar with optional Close */}
      <div className="w-full flex items-center justify-between mb-2">
        {onClose ? (
          <button
            type="button"
            onClick={() => {
              playPop();
              onClose();
            }}
            className="w-8 h-8 rounded-full border-2 border-black bg-white flex items-center justify-center font-black text-[14px] hover:bg-black hover:text-white transition-colors cursor-pointer shadow-[1px_1px_0px_#000]"
            aria-label="Close"
          >
            ✕
          </button>
        ) : (
          <div className="w-8 h-8" />
        )}
        <span className="text-[11px] font-black uppercase tracking-wider text-black/40">
          Daily Commitment
        </span>
        <div className="w-8 h-8" />
      </div>

      {/* Main Flame Hero */}
      <div className="flex flex-col items-center justify-center my-auto relative">
        {/* Floating Sparks Animation */}
        <div className="absolute inset-0 pointer-events-none overflow-visible">
          <span
            className="absolute top-2 left-6 w-2 h-2 rounded-full bg-[#FFD13B] border border-black animate-floatSpark1"
            style={{ animationDuration: "1.8s", animationIterationCount: "infinite" }}
          />
          <span
            className="absolute top-6 right-8 w-2.5 h-2.5 rounded-full bg-[#FF4D2E] border border-black animate-floatSpark2"
            style={{ animationDuration: "2.1s", animationIterationCount: "infinite", animationDelay: "0.4s" }}
          />
          <span
            className="absolute -top-3 right-14 w-1.5 h-1.5 rounded-full bg-[#FF9600] border border-black animate-floatSpark1"
            style={{ animationDuration: "1.5s", animationIterationCount: "infinite", animationDelay: "0.8s" }}
          />
        </div>

        {/* Animated Dual-Core Flame Graphic */}
        <div className="relative mb-2 animate-flamePulse">
          <svg
            className="w-28 h-28 sm:w-32 sm:h-32 drop-shadow-[0_4px_12px_rgba(255,150,0,0.35)]"
            viewBox="0 0 100 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Outer Flame Shadow / Border */}
            <path
              d="M50 5C50 5 66 28 66 48C66 52 74 52 78 44C84 56 86 68 86 80C86 102 70 115 50 115C30 115 14 102 14 80C14 58 28 42 36 28C40 21 44 14 50 5Z"
              fill="#000000"
            />
            {/* Outer Vibrant Orange Flame */}
            <path
              d="M50 8C50 8 64 30 64 49C64 54 72 54 76 46C81 57 83 68 83 79C83 99 68 112 50 112C32 112 17 99 17 79C17 59 30 44 38 31C41 24 45 17 50 8Z"
              fill="#FF9600"
            />
            {/* Inner Golden-Yellow Core Flame */}
            <path
              d="M50 48C50 48 58 62 58 72C58 76 62 76 64 71C67 78 68 84 68 90C68 102 59 108 50 108C41 108 32 102 32 90C32 78 40 70 44 62C46 58 48 53 50 48Z"
              fill="#FFD13B"
            />
          </svg>
        </div>

        {/* Big Chunky Number & "day streak!" Headline */}
        <div className="text-center">
          <div
            className={`font-black text-[76px] sm:text-[90px] text-[#FF9600] leading-none tracking-tight transition-transform duration-500 ${
              animatedNumber > 0 ? "scale-100" : "scale-50 opacity-0"
            }`}
            style={{
              textShadow: "3px 3px 0px #000000, -1px -1px 0px #000000, 1px -1px 0px #000000, -1px 1px 0px #000000",
            }}
          >
            {animatedNumber}
          </div>
          <h2
            className="text-[26px] sm:text-[30px] font-black text-[#FF9600] tracking-tight mt-1"
            style={{
              textShadow: "1.5px 1.5px 0px #000000",
            }}
          >
            {title || `${animatedNumber === 1 ? "day streak!" : "days streak!"}`}
          </h2>
        </div>

        {/* 7-Day Calendar Card */}
        <div className="w-full mt-6 bg-white border-2 border-black rounded-2xl p-4 shadow-[3px_3px_0px_#000000] text-center">
          <div className="flex items-center justify-between px-1 mb-3">
            {daysList.map((day, idx) => (
              <div key={idx} className="flex flex-col items-center gap-1.5">
                <span
                  className={`text-[11px] font-black ${
                    day.isToday ? "text-[#FF9600]" : "text-black/50"
                  }`}
                >
                  {day.label}
                </span>

                <div
                  className={`w-8 h-8 rounded-full border-2 border-black flex items-center justify-center font-black transition-all duration-300 ${
                    day.isToday
                      ? showCheckmark
                        ? "bg-[#FF9600] text-white scale-110 shadow-[1px_1px_0px_#000000]"
                        : "bg-white text-black"
                      : day.isPast
                      ? "bg-[#FF9600] text-white"
                      : "bg-[#FAF7F2] text-black/20 border-black/30"
                  }`}
                >
                  {day.isToday && showCheckmark ? (
                    <span className="material-symbols-outlined text-[18px] font-black">check</span>
                  ) : day.isPast ? (
                    <span className="material-symbols-outlined text-[16px] font-black">check</span>
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-black/15" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Authentic Warning Rule */}
          <div className="pt-2 border-t-2 border-black/10">
            <p className="text-[12.5px] font-bold text-black/70">
              Miss a day, and it resets to 0.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom CTA Button */}
      <div className="w-full pt-6">
        <button
          type="button"
          onClick={() => {
            playPop();
            onContinue();
          }}
          className="w-full py-4 bg-[#FF4D2E] hover:bg-black text-white font-black text-[15px] uppercase tracking-wider border-2 border-black rounded-xl shadow-[3px_3px_0px_#000000] active:translate-y-0.5 cursor-pointer transition-colors"
        >
          Continue
        </button>
      </div>

      {/* In-component Keyframe Styles */}
      <style>{`
        @keyframes flamePulse {
          0%, 100% {
            transform: scale(1) rotate(0deg);
          }
          30% {
            transform: scale(1.06) rotate(-2deg);
          }
          70% {
            transform: scale(1.04) rotate(2deg);
          }
        }
        @keyframes floatSpark1 {
          0% {
            transform: translateY(0px) scale(0.8);
            opacity: 0;
          }
          40% {
            opacity: 1;
          }
          100% {
            transform: translateY(-35px) scale(1.2);
            opacity: 0;
          }
        }
        @keyframes floatSpark2 {
          0% {
            transform: translateY(0px) scale(0.7);
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translateY(-40px) scale(1.1);
            opacity: 0;
          }
        }
        .animate-flamePulse {
          animation: flamePulse 2.4s ease-in-out infinite;
        }
        .animate-floatSpark1 {
          animation: floatSpark1 1.8s ease-out infinite;
        }
        .animate-floatSpark2 {
          animation: floatSpark2 2.2s ease-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-flamePulse,
          .animate-floatSpark1,
          .animate-floatSpark2 {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );

  if (isEmbedded) {
    return <div className="w-full flex justify-center animate-fadeIn">{content}</div>;
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#FFFBEA] flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      {content}
    </div>
  );
}
