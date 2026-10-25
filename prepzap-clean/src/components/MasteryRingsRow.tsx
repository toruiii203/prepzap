import React, { useState, useEffect } from "react";
import { playPop } from "@/lib/soundFX";

export interface SubjectMastery {
  id: string;
  name: string;
  icon: string;
  emoji: string;
  percent: number; // 0 - 100
  color: string;
}

interface MasteryRingsRowProps {
  subjects?: SubjectMastery[];
  onSelectSubject?: (subjectId: string) => void;
}

const DEFAULT_SUBJECTS: SubjectMastery[] = [
  { id: "math", name: "Math", icon: "calculate", emoji: "📐", percent: 84, color: "#10B981" },
  { id: "science", name: "Biology", icon: "biotech", emoji: "🧬", percent: 68, color: "#FFD13B" },
  { id: "history", name: "History", icon: "history_edu", emoji: "🏛️", percent: 45, color: "#FF4D2E" },
  { id: "english", name: "Language", icon: "translate", emoji: "🌐", percent: 82, color: "#10B981" },
];

export const MasteryRingsRow: React.FC<MasteryRingsRowProps> = ({
  subjects = DEFAULT_SUBJECTS,
  onSelectSubject,
}) => {
  // Animate progress ring on mount
  const [animatedPercents, setAnimatedPercents] = useState<Record<string, number>>({});

  useEffect(() => {
    const timer = setTimeout(() => {
      const target: Record<string, number> = {};
      subjects.forEach((s) => {
        target[s.id] = s.percent;
      });
      setAnimatedPercents(target);
    }, 150);
    return () => clearTimeout(timer);
  }, [subjects]);

  const radius = 20;
  const circumference = 2 * Math.PI * radius; // ~125.66

  return (
    <section className="border-2 border-black bg-white rounded-3xl p-4 sm:p-5 shadow-[3px_3px_0px_#1A1A1A] overflow-hidden">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-[#FF4D2E]" aria-hidden="true">
            donut_large
          </span>
          <h3 className="text-[13px] font-black uppercase tracking-wider text-black">
            Subject Mastery
          </h3>
        </div>
        <span className="text-[11px] font-black text-black/50 bg-[#F0EDE0] px-2 py-0.5 rounded-full border border-black/15">
          Live Tracking
        </span>
      </div>

      {/* Horizontal row on mobile, grid or flex on desktop */}
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none items-stretch">
        {subjects.map((sub) => {
          const currentPercent = animatedPercents[sub.id] ?? 0;
          const strokeDashoffset = circumference - (currentPercent / 100) * circumference;
          const isClose = sub.percent >= 80;

          return (
            <div
              key={sub.id}
              onClick={() => {
                playPop();
                onSelectSubject?.(sub.id);
              }}
              className="flex-1 min-w-[90px] sm:min-w-[100px] bg-[#FFFDF5] border-2 border-black rounded-2xl p-2.5 flex flex-col items-center justify-between text-center shadow-[2px_2px_0px_#000] hover:-translate-y-0.5 active:translate-y-0.5 transition-all cursor-pointer select-none group"
            >
              {/* SVG Mastery Ring */}
              <div className="relative w-14 h-14 flex items-center justify-center my-1">
                <svg className="w-14 h-14 -rotate-90 transform" viewBox="0 0 52 52">
                  <circle
                    cx="26"
                    cy="26"
                    r={radius}
                    stroke="#E5E7EB"
                    strokeWidth="5"
                    fill="none"
                  />
                  <circle
                    cx="26"
                    cy="26"
                    r={radius}
                    stroke={sub.percent >= 75 ? "#10B981" : sub.percent >= 50 ? "#F59E0B" : "#FF4D2E"}
                    strokeWidth="5"
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[11px] font-black text-black tabular-nums leading-none">
                    {sub.percent}%
                  </span>
                </div>
              </div>

              {/* Subject Title */}
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[12px]">{sub.emoji}</span>
                <span className="text-[12px] font-black text-black truncate max-w-[65px]">
                  {sub.name}
                </span>
              </div>

              {/* Khan Academy style "So close!" Nudge Badge */}
              {isClose ? (
                <span className="mt-1.5 text-[9px] font-black px-1.5 py-0.2 rounded-full bg-[#10B981]/15 text-[#047857] border border-[#10B981]/40 whitespace-nowrap leading-tight">
                  So close! 🚀
                </span>
              ) : (
                <span className="mt-1.5 text-[9px] font-bold text-black/40 whitespace-nowrap leading-tight">
                  In progress
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
