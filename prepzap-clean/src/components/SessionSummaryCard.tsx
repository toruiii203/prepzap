import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { playPop } from "@/lib/soundFX";

export interface SessionSummaryData {
  minutes: number;
  xpEarned: number;
  streakDays: number;
  toolName?: string;
  message?: string;
}

/**
 * Trigger a gentle session summary card anywhere in the app
 */
export function triggerSessionSummary(data: SessionSummaryData) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("studenius:session-summary", { detail: data }));
}

export const SessionSummaryCard: React.FC = () => {
  const [data, setData] = useState<SessionSummaryData | null>(null);

  useEffect(() => {
    const handleEvent = (e: CustomEvent<SessionSummaryData>) => {
      // If a victory screen is active, do not stack
      const isVictoryActive = document.querySelector("[data-victory-screen='true']");
      if (isVictoryActive) return;

      setData(e.detail);
    };

    window.addEventListener("studenius:session-summary" as any, handleEvent);
    return () => window.removeEventListener("studenius:session-summary" as any, handleEvent);
  }, []);

  // Auto-dismiss after 4 seconds
  useEffect(() => {
    if (!data) return;
    const timer = setTimeout(() => {
      setData(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [data]);

  const handleDismiss = () => {
    playPop();
    setData(null);
  };

  return (
    <AnimatePresence>
      {data && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 380, damping: 26 }}
          onClick={handleDismiss}
          className="fixed bottom-6 right-4 sm:right-6 z-50 max-w-sm w-[calc(100%-2rem)] sm:w-auto bg-white border-2 border-black rounded-2xl p-4 shadow-[4px_4px_0px_#000] cursor-pointer select-none font-['Quicksand',sans-serif]"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl border-2 border-black bg-[#FFD13B] flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#000]">
              <span className="material-symbols-outlined text-[20px] text-black" aria-hidden="true">
                spa
              </span>
            </div>

            <div className="flex-1 pr-4">
              {/* Soft Copy First */}
              <p className="text-[13.5px] font-black text-black leading-snug">
                You studied for {data.minutes || 5} minutes.
              </p>
              <p className="text-[12px] font-bold text-black/60 mt-0.5 leading-snug">
                {data.message || "That is a habit forming."}
              </p>

              {/* Numbers Second */}
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-black/10 text-[11px] font-black">
                <span className="text-[#FF9600]">+{data.xpEarned || 20} XP</span>
                <span className="text-black/30">&bull;</span>
                <span className="text-black/80 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-[#10B981]" aria-hidden="true">
                    local_fire_department
                  </span>
                  <span>{data.streakDays || 1}d Streak Kept</span>
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              className="w-6 h-6 rounded-md bg-white border border-black/30 hover:border-black flex items-center justify-center text-black/60 hover:text-black font-black text-[13px] -mt-1 -mr-1 transition-colors"
              aria-label="Dismiss summary"
            >
              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">close</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
