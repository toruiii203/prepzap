import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { SpringButton } from "@/components/ui/SpringButton";

export interface VictoryScreenProps {
  xpEarned: number;
  accuracy: number; // 0–100
  streakDays: number;
  onContinue: () => void;
  onShare?: () => void;
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return reduced;
}

/** SVG circular accuracy ring */
function AccuracyRing({ accuracy }: { accuracy: number }) {
  const r = 40;
  const circumference = 2 * Math.PI * r;
  const strokeDashoffset = circumference - (accuracy / 100) * circumference;
  const color =
    accuracy >= 80 ? "#10B981" : accuracy >= 50 ? "#FFD13B" : "#FF4D2E";

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="100" height="100" viewBox="0 0 100 100" aria-label={`Accuracy: ${accuracy}%`}>
        {/* Track */}
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth="10"
        />
        {/* Fill */}
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
        <text
          x="50"
          y="55"
          textAnchor="middle"
          fontSize="18"
          fontWeight="900"
          fill="#000"
        >
          {accuracy}%
        </text>
      </svg>
      <span className="text-[11px] font-black uppercase tracking-widest text-black/50">
        Accuracy
      </span>
    </div>
  );
}

export function VictoryScreen({
  xpEarned,
  accuracy,
  streakDays,
  onContinue,
  onShare,
}: VictoryScreenProps) {
  const reducedMotion = useReducedMotion();
  const [displayXP, setDisplayXP] = useState(reducedMotion ? xpEarned : 0);
  const confettiFired = useRef(false);

  // Confetti burst on mount
  useEffect(() => {
    if (confettiFired.current) return;
    confettiFired.current = true;
    if (!reducedMotion) {
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          colors: ["#FF4D2E", "#FFD13B", "#10B981"],
          origin: { y: 0.5 },
          zIndex: 9999,
        });
      } catch {}
    }
  }, [reducedMotion]);

  // XP tick animation
  useEffect(() => {
    if (reducedMotion) {
      setDisplayXP(xpEarned);
      return;
    }
    let current = 0;
    const step = Math.max(1, Math.ceil(xpEarned / 30));
    const interval = setInterval(() => {
      current = Math.min(current + step, xpEarned);
      setDisplayXP(current);
      if (current >= xpEarned) clearInterval(interval);
    }, 50);
    return () => clearInterval(interval);
  }, [xpEarned, reducedMotion]);

  const handleShare = async () => {
    const text = `I just scored ${accuracy}% accuracy and earned +${xpEarned} XP on Studenius!`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text });
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(text);
        alert("Result copied to clipboard!");
      } catch {}
    }
    if (onShare) onShare();
  };

  const rexVariants = reducedMotion
    ? {}
    : {
        initial: { y: 80, opacity: 0 },
        animate: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 24, delay: 0.1 } },
      };

  const cardVariants = reducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 30 },
        animate: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 28, delay: 0.25 } },
      };

  return (
    <div
      data-victory-screen="true"
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-[#FAF7F2] overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Session Complete"
    >
      <div className="w-full max-w-md mx-auto px-5 py-10 flex flex-col items-center gap-6 text-center">
        {/* Rex Celebrating */}
        <motion.div
          {...(reducedMotion ? {} : rexVariants)}
          className="flex items-center justify-center"
        >
          <img
            src="/animations/rex_celebrating.webp"
            alt="Rex celebrating"
            className="h-40 w-auto object-contain select-none"
            style={{ imageRendering: "auto" }}
          />
        </motion.div>

        {/* Heading */}
        <motion.div
          {...(reducedMotion ? {} : cardVariants)}
          className="flex flex-col items-center gap-2"
        >
          <h2 className="font-black text-3xl text-black leading-tight">
            Session Complete!
          </h2>

          {/* XP Counter */}
          <div className="flex items-center gap-1.5 text-[22px] font-black text-[#FF4D2E] border-2 border-black bg-[#FFD13B] px-5 py-2 shadow-[3px_3px_0px_#000] rounded-2xl">
            <span>+{displayXP} XP</span>
            <span className="material-symbols-outlined text-[24px] text-[#FF4D2E]" aria-hidden="true">
              bolt
            </span>
          </div>
        </motion.div>

        {/* Stats Card */}
        <motion.div
          {...(reducedMotion ? {} : { ...cardVariants, animate: { ...((cardVariants as any).animate || {}), transition: { ...(((cardVariants as any).animate || {}) as any).transition, delay: 0.35 } } })}
          className="w-full bg-white border-2 border-black shadow-[4px_4px_0px_#000] rounded-2xl p-6 flex flex-col gap-5 items-center"
        >
          {/* Accuracy Ring */}
          <AccuracyRing accuracy={Math.round(accuracy)} />

          {/* Streak Chip */}
          <div className="flex items-center gap-2 bg-[#FFD13B] border-2 border-black px-4 py-2 rounded-full shadow-[2px_2px_0px_#000]">
            <span className="material-symbols-outlined text-[18px] text-[#FF4D2E]" aria-hidden="true">
              local_fire_department
            </span>
            <span className="font-black text-[14px] text-black">
              {streakDays} Day Streak
            </span>
          </div>
        </motion.div>

        {/* Action Buttons with tactile spring physics */}
        <motion.div
          {...(reducedMotion ? {} : { ...cardVariants, animate: { ...((cardVariants as any).animate || {}), transition: { ...(((cardVariants as any).animate || {}) as any).transition, delay: 0.45 } } })}
          className="w-full flex flex-col gap-3"
        >
          <SpringButton
            onClick={onContinue}
            className="w-full py-4 bg-[#FF4D2E] text-white font-black text-[16px] border-2 border-black rounded-xl shadow-[4px_4px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer hover:bg-black"
          >
            <span>Continue Learning</span>
            <span className="text-[18px]">→</span>
          </SpringButton>

          <SpringButton
            onClick={handleShare}
            className="w-full py-3.5 bg-white text-black font-black text-[15px] border-2 border-black rounded-xl shadow-[3px_3px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer hover:bg-[#FAF7F2]"
          >
            <span>Share Result</span>
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">share</span>
          </SpringButton>
        </motion.div>
      </div>
    </div>
  );
}
