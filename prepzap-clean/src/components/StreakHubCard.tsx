import React from "react";
import { playPop, playTap } from "@/lib/soundFX";
import { triggerXPBurst } from "@/components/FloatingXPBurst";

interface StreakHubCardProps {
  streakDays: number;
  studiedToday: boolean;
  streakFreezes?: number;
  onOpenModal: () => void;
  onLaunchPractice: () => void;
  primarySubject?: string;
}

export function StreakHubCard({
  streakDays = 1,
  studiedToday = false,
  streakFreezes = 1,
  onOpenModal,
  onLaunchPractice,
  primarySubject = "General Studies",
}: StreakHubCardProps) {
  // 7-day rolling window
  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const now = new Date();
  const windowOffset = -4;
  const daysList = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(now.getDate() + (windowOffset + i));
    const isToday = windowOffset + i === 0;
    const isPast = windowOffset + i < 0;
    const daysBeforeToday = -(windowOffset + i);
    const wasChecked = (isToday && studiedToday) || (isPast && daysBeforeToday < streakDays);

    return {
      label: dayNames[d.getDay()],
      isToday,
      wasChecked,
    };
  });

  return (
    <div className="border-2 border-black rounded-3xl bg-white p-4 sm:p-5 shadow-[3px_3px_0px_#1A1A1A] relative overflow-hidden transition-all select-none font-['Quicksand',sans-serif]">
      {/* Top Header Row */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <div
            onClick={() => {
              playPop();
              onOpenModal();
            }}
            className="w-9 h-9 rounded-xl bg-[#FFE566] border-2 border-black flex items-center justify-center text-[18px] shadow-[1.5px_1.5px_0px_#000] hover:scale-110 active:scale-95 transition-transform cursor-pointer"
            title="View full streak calendar"
          >
            <span className="inline-block animate-flame">🔥</span>
          </div>
          <div>
            <h3 className="text-[14px] sm:text-[15px] font-black text-black leading-tight flex items-center gap-1.5">
              <span>{streakDays} Day Study Streak</span>
              {!studiedToday && (
                <span className="w-2 h-2 rounded-full bg-[#FF4D2E] animate-ping" />
              )}
            </h3>
            <p className="text-[11px] font-bold text-black/55">
              {studiedToday
                ? "Streak extended for today! Well done."
                : "Practice for 5 minutes today to keep it alive."}
            </p>
          </div>
        </div>

        {/* View Details / Modal Button */}
        <button
          type="button"
          onClick={() => {
            playPop();
            onOpenModal();
          }}
          className="px-2.5 py-1 text-[11px] font-black uppercase tracking-wider border-2 border-black rounded-lg bg-[#FAF7F2] hover:bg-black hover:text-white transition-colors cursor-pointer shadow-[1px_1px_0px_#000] active:translate-y-0.5"
        >
          View Calendar
        </button>
      </div>

      {/* 7-Day Mini Calendar Strip */}
      <div className="bg-[#FFFDF5] border-2 border-black rounded-2xl p-3 mb-3.5 shadow-[2px_2px_0px_#1A1A1A]">
        <div className="flex items-center justify-between px-1">
          {daysList.map((day, idx) => (
            <div key={idx} className="flex flex-col items-center gap-1">
              <span
                className={`text-[10px] font-black ${
                  day.isToday ? "text-[#FF9600]" : "text-black/45"
                }`}
              >
                {day.label}
              </span>
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-black flex items-center justify-center font-black transition-all ${
                  day.wasChecked
                    ? "bg-[#FF9600] text-white shadow-[1px_1px_0px_#000] scale-105"
                    : day.isToday
                    ? "bg-white text-black border-dashed border-[#FF9600] ring-2 ring-[#FF9600]/40 animate-pulse"
                    : "bg-white text-black/20 border-black/20"
                }`}
              >
                {day.wasChecked ? (
                  <span className="material-symbols-outlined text-[15px] font-black">check</span>
                ) : day.isToday ? (
                  <span className="text-[12px] animate-flame inline-block">🔥</span>
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-black/15" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Status / Protection Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
        {/* Streak Freeze Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#FAF7F2] border-2 border-black rounded-xl text-[11.5px] font-bold text-black shadow-[1px_1px_0px_#000]">
          <span className="text-[14px]">❄️</span>
          <span>
            Streak Freeze: <strong className="font-black text-[#0284C7]">{streakFreezes} Equipped</strong>
          </span>
        </div>

        {/* Action Button: Keep Streak Alive or Practice (Secondary Style to keep Path as hero) */}
        <button
          type="button"
          onClick={(e) => {
            playTap();
            triggerXPBurst(e.clientX, e.clientY - 20, "+30 Streak XP", "🔥");
            onLaunchPractice();
          }}
          className="px-4 py-2 text-[12px] font-black uppercase tracking-wider border border-black/40 bg-white hover:bg-neutral-100 text-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[1px_1px_0px_rgba(0,0,0,0.2)] active:translate-y-0.5 active:shadow-none"
        >
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
            {studiedToday ? "replay" : "bolt"}
          </span>
          <span>{studiedToday ? "Practice More" : "Extend Streak (+5m)"}</span>
        </button>
      </div>
    </div>
  );
}
