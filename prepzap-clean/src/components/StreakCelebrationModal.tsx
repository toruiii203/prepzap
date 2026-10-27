import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import * as Dialog from "@radix-ui/react-dialog";
import React, { useEffect, useMemo, useState } from "react";
import confetti from "canvas-confetti";

import { AnimatedNumber } from "@/components/AnimatedNumber";
import { playCelebration, playPop, triggerHaptic, isSoundEnabled } from "@/lib/soundFX";
import { useAuth } from "@/contexts/AuthContext";
import { localDayKey, verifiedStudyDays } from "@/lib/progressPopupPolicy";
import { Mascot } from "@/components/Mascot";

interface StreakCelebrationModalProps {
  isOpen?: boolean;
  streakCount: number;
  onContinue: () => void;
  onClose?: () => void;
  title?: string;
  isEmbedded?: boolean; // When true, renders directly in the flow instead of fixed backdrop
  showRex?: boolean;
}

export function StreakCelebrationModal({
  isOpen = true,
  streakCount = 1,
  onContinue,
  onClose,
  title,
  isEmbedded = false,
  showRex = true,
}: StreakCelebrationModalProps) {
  const reduced = usePrefersReducedMotion();
  const { user } = useAuth();
  const confirmedDays = useMemo(() => {
    if (!isOpen || !user?.id) return new Set<string>();
    try { return new Set(verifiedStudyDays(localStorage.getItem("pz_study_sessions"), user.id, new Date())); }
    catch { return new Set<string>(); }
  }, [user?.id, isOpen]);
  const [animatedNumber, setAnimatedNumber] = useState<number>(reduced ? streakCount : 0);
  const [showCheckmark, setShowCheckmark] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    if (reduced) { confetti.reset(); setAnimatedNumber(streakCount); setShowCheckmark(true); }

    // Trigger audio & haptics if sound is on
    if (isSoundEnabled()) {
      playCelebration();
    }
    triggerHaptic("celebrate");

    // Confetti burst
    try {
      if (!reduced) confetti({
        disableForReducedMotion: true,
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ["#FF9600", "#FFD13B", "#FF4D2E", "#10B981", "#000000"],
      });
    } catch { /* Celebration is optional; the streak remains visible. */ }

    if (reduced) return;

    // Number roll-up animation
    const numTimer = setTimeout(() => {
      setAnimatedNumber(streakCount);
    }, 200);

    // Checkmark pop animation for today
    const checkTimer = setTimeout(() => {
      setShowCheckmark(true);
    }, 450);

    return () => {
      clearTimeout(numTimer);
      clearTimeout(checkTimer);
    };
  }, [isOpen, streakCount, reduced]);

  if (!isOpen) return null;

  // Generate rolling 7 days centered on today
  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const now = new Date();

  // 7-day window ending with today at position 4 or 5
  const windowOffset = -4; // 4 days prior, today, 2 days after
  const daysList = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(now.getDate() + (windowOffset + i));
    const isToday = windowOffset + i === 0;
    const isPast = windowOffset + i < 0;
    const isFuture = windowOffset + i > 0;
    
    const dateKey = localDayKey(d);
    const wasCheckedInStreak = confirmedDays.has(dateKey);

    return {
      dateKey,
      label: dayNames[d.getDay()],
      isToday,
      isPast,
      isFuture,
      wasCheckedInStreak,
    };
  });

  const content = (
    <div className="w-full max-w-[380px] mx-auto flex flex-col items-center gap-4 py-2 font-['Nunito',sans-serif] select-none">
      {/* Top Bar with optional Close */}
      {!isEmbedded && (
        <div className="w-full flex items-center justify-between mb-1">
          {onClose ? (
            <button
              type="button"
              onClick={() => {
                playPop();
                onClose();
              }}
              className="w-11 h-11 rounded-full border-2 border-black bg-white flex items-center justify-center font-black text-[14px] hover:bg-black hover:text-white transition-colors cursor-pointer shadow-[1px_1px_0px_#000]"
              aria-label="Close"
            >
              ✕
            </button>
          ) : (
            <div className="w-8 h-8" />
          )}
          <span className="text-[11px] font-black uppercase tracking-wider text-black/50">
            Daily Commitment
          </span>
          <div className="w-8 h-8" />
        </div>
      )}

      {/* Main Victory Stage: Rex + Flame Hero */}
      <div className="w-full flex flex-col items-center justify-center relative">
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

        {/* Unified Duolingo-style Victory Stage: Grounded Solid Rex + Hero Flame on 3D Concrete Platform */}
        <div className="w-full flex flex-col items-center justify-center my-1 select-none">
          {/* Characters Container anchored right on top of the platform deck */}
          <div className="relative z-10 w-full flex items-end justify-center gap-3 sm:gap-6 pb-0">
            {/* Solid Rex Mascot standing large & grounded (No floating, zero ghost marks, clean animated GIF) */}
            {showRex && (
              <div className="shrink-0 flex flex-col items-center relative">
                <Mascot mood="cheering" size="lg" interactive />
              </div>
            )}

            {/* Hero Flame Graphic & Streak Counter */}
            <div className="flex flex-col items-start justify-end pb-3">
              <div className="flex items-center gap-2.5">
                <div className="relative animate-flame select-none">
                  <svg
                    className="w-14 h-14 sm:w-18 sm:h-18 drop-shadow-[0_4px_12px_rgba(255,150,0,0.35)]"
                    viewBox="0 0 100 120"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M50 5C50 5 66 28 66 48C66 52 74 52 78 44C84 56 86 68 86 80C86 102 70 115 50 115C30 115 14 102 14 80C14 58 28 42 36 28C40 21 44 14 50 5Z"
                      fill="#000000"
                    />
                    <path
                      d="M50 8C50 8 64 30 64 49C64 54 72 54 76 46C81 57 83 68 83 79C83 99 68 112 50 112C32 112 17 99 17 79C17 59 30 44 38 31C41 24 45 17 50 8Z"
                      fill="#FF9600"
                    />
                    <path
                      d="M50 48C50 48 58 62 58 72C58 76 62 76 64 71C67 78 68 84 68 90C68 102 59 108 50 108C41 108 32 102 32 90C32 78 40 70 44 62C46 58 48 53 50 48Z"
                      fill="#FFD13B"
                    />
                  </svg>
                </div>

                <div
                  className={`font-black text-[54px] sm:text-[66px] text-[#FF9600] leading-none tracking-tight transition-transform duration-500 ${
                    animatedNumber > 0 ? "scale-100" : "scale-50 opacity-0"
                  }`}
                  style={{
                    textShadow:
                      "2.5px 2.5px 0px #000000, -1px -1px 0px #000000, 1px -1px 0px #000000, -1px 1px 0px #000000",
                  }}
                >
                  {<AnimatedNumber value={streakCount} />}
                </div>
              </div>

              <h2
                className="text-[19px] sm:text-[23px] font-black text-[#FF9600] tracking-tight mt-0.5"
                style={{
                  textShadow: "1.5px 1.5px 0px #000000",
                }}
              >
                {title || `${animatedNumber === 1 ? "day streak!" : "days streak!"}`}
              </h2>
            </div>
          </div>

          {/* Solid 3D Duolingo Victory Pedestal / Stage Podium */}
          <div className="w-full max-w-[330px] relative z-0 -mt-2">
            {/* Top platform deck */}
            <div className="w-full h-4 bg-[#F3F4F6] border-2 border-black rounded-t-2xl relative shadow-[inset_0_2px_0px_rgba(255,255,255,0.9)]" />
            {/* 3D extruded front bevel */}
            <div className="w-full h-3.5 bg-[#CBD5E1] border-2 border-t-0 border-black rounded-b-2xl shadow-[0_4px_0_#000000] flex items-center justify-center">
              <div className="w-14 h-1 bg-black/20 rounded-full" />
            </div>
          </div>
        </div>

        {/* Verified activity only; a streak total cannot reconstruct dates. */}
        <div className="w-full mt-4 bg-white border-2 border-black rounded-2xl p-3.5 shadow-[3px_3px_0px_#000000] text-center">
          <div className="flex items-center justify-between px-1 mb-2.5" role="list" aria-label="Confirmed study days">
            {daysList.map((day, idx) => (
              <div key={idx} role="listitem" data-confirmed-study={day.wasCheckedInStreak} aria-label={`${day.dateKey}: ${day.wasCheckedInStreak ? "studied" : "not confirmed"}`} className="flex flex-col items-center gap-1">
                <span
                  className={`text-[11px] font-black ${
                    day.isToday ? "text-[#FF9600]" : "text-black/50"
                  }`}
                >
                  {day.label}
                </span>

                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-black flex items-center justify-center font-black transition-all duration-300 ${
                    day.isToday
                      ? showCheckmark && day.wasCheckedInStreak
                        ? "bg-[#FF9600] text-white scale-110 shadow-[1px_1px_0px_#000000]"
                        : "bg-white text-black"
                      : day.wasCheckedInStreak
                      ? "bg-[#FF9600] text-white"
                      : "bg-[#FAF7F2] text-black/20 border-black/25"
                  }`}
                >
                  {day.isToday && showCheckmark && day.wasCheckedInStreak ? (
                    <span className="material-symbols-outlined text-[16px] font-black">check</span>
                  ) : day.wasCheckedInStreak ? (
                    <span className="material-symbols-outlined text-[15px] font-black">check</span>
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-black/15" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Authentic Warning Rule */}
          <div className="pt-2 border-t border-black/10">
            <p className="text-[12px] font-bold text-black/75">
              Only confirmed study days are marked.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom CTA Button */}
      <div className="w-full pt-2">
        <button
          type="button"
          onClick={() => {
            playPop();
            onContinue();
          }}
          className="w-full py-3.5 bg-[#FF4D2E] hover:bg-black text-white font-black text-[14px] uppercase tracking-wider border-2 border-black rounded-xl shadow-[3px_3px_0px_#000000] active:translate-y-0.5 cursor-pointer transition-colors"
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
        .animate-flame {
          animation: flamePulse 2.4s ease-in-out infinite;
        }
        .animate-floatSpark1 {
          animation: floatSpark1 1.8s ease-out infinite;
        }
        .animate-floatSpark2 {
          animation: floatSpark2 2.2s ease-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-flame,
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
    <Dialog.Root open={isOpen} onOpenChange={open => { if (!open) (onClose || onContinue)(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/40" />
        <Dialog.Content aria-describedby={undefined} className="fixed inset-0 z-[61] bg-background text-foreground flex items-center justify-center p-4 overflow-y-auto quiz-shell quiz-feedback">
          <Dialog.Title className="sr-only">Study streak: {streakCount} days</Dialog.Title>
          {content}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
