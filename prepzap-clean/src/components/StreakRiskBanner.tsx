import { Mascot } from "@/components/Mascot";
import React, { useState } from "react";
import { isStreakAtRisk, getHoursUntilMidnight } from "@/lib/streakRisk";
import { playPop, playTap } from "@/lib/soundFX";

interface StreakRiskBannerProps {
  streakDays: number;
  studiedToday: boolean;
  onSaveStreak: () => void;
}

export function StreakRiskBanner({
  streakDays,
  studiedToday,
  onSaveStreak,
}: StreakRiskBannerProps) {
  const todayKey = new Date().toISOString().split("T")[0];
  const storageKey = `pz_dismissed_streak_risk_${todayKey}`;

  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(storageKey) === "true";
    } catch {
      return false;
    }
  });

  const atRisk = isStreakAtRisk(streakDays, studiedToday);

  if (!atRisk || isDismissed) return null;

  const hoursLeft = getHoursUntilMidnight();

  const handleDismiss = () => {
    playTap();
    setIsDismissed(true);
    try {
      sessionStorage.setItem(storageKey, "true");
    } catch { /* Dismissal still works for this mounted banner. */ }
  };

  return (
    <div
      role="alert"
      aria-label="Streak at risk notification"
      className="border-2 border-black bg-gradient-to-r from-[#10B981] via-[#FF6B4E] to-[#FF8C42] text-white p-4 sm:p-5 rounded-2xl shadow-[4px_4px_0px_#000] flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-300 font-['Quicksand',sans-serif] select-none"
    >
      <div className="flex items-center gap-3.5 w-full sm:w-auto">
        {/* Mascot / Flame Badge */}
        <div className="relative w-12 h-12 rounded-xl bg-white border-2 border-black flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#000]">
          <Mascot mood="thinking" size="xs" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-black text-[#FFD13B] text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded">
              Urgent
            </span>
            <h4 className="text-[15px] sm:text-[16px] font-black leading-tight text-white">
              {streakDays} Day Streak at Risk!
            </h4>
          </div>
          <p className="text-[12px] sm:text-[12.5px] font-bold text-white/90 mt-0.5 leading-snug">
            You haven't completed a session today. Only <strong>{hoursLeft}h</strong> left before midnight to keep your fire alive!
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end shrink-0">
        <button
          type="button"
          onClick={() => {
            playPop();
            onSaveStreak();
          }}
          className="flex-1 sm:flex-none px-5 py-2.5 bg-[#FFD13B] text-black font-black text-[13px] uppercase tracking-wider border-2 border-black rounded-xl shadow-[3px_3px_0px_#000] active:translate-y-0.5 active:shadow-none hover:bg-white transition-all cursor-pointer flex items-center justify-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[16px] text-[#10B981]" aria-hidden="true">
            local_fire_department
          </span>
          <span>Save Streak</span>
        </button>

        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss banner"
          className="w-8 h-8 rounded-lg bg-white hover:bg-neutral-100 border-2 border-black text-black flex items-center justify-center font-black shadow-[1.5px_1.5px_0px_#000] active:translate-y-0.5 transition-all cursor-pointer shrink-0"
        >
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">close</span>
        </button>
      </div>
    </div>
  );
}
