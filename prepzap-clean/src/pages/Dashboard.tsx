import { useNavigate } from "react-router-dom";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { SharedSidebar } from "@/components/SharedSidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useTutorialModal } from "@/hooks/useTutorialModal";
import { TutorialModal } from "@/components/TutorialModal";
import { TUTORIAL_CONTENT } from "@/lib/tutorialContent";
import { useAuth } from "@/contexts/AuthContext";
import { useStudyStats } from "@/hooks/useStudyStats";
import { supabase } from "@/lib/supabase";
import { usePlan } from "@/hooks/usePlan";
import { motion, animate, useAnimation } from "framer-motion";
import { playPop, playTap, playSuccess, playCelebration } from "@/lib/soundFX";
import { ExamCountdownBanner, calculateExamReadiness } from "@/components/ExamCountdownBanner";
import { AnimatedRex } from "@/components/AnimatedRex";
import {
  getStoredPreferences,
  saveExamTarget,
  SUBJECT_METADATA,
  GOAL_METADATA,
  STYLE_METADATA,
  generateSmartQuests,
  type UserStudyPreferences,
  type ExamTarget,
} from "@/lib/userPreferences";
import { levelFromXp, xpProgressPercent, xpToNextLevel, tierFromLevel } from "@/lib/xp";

function AnimatedCounter({ value, duration = 1.5 }: { value: number; duration?: number }) {
  const nodeRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const controls = animate(0, value, {
      duration: duration,
      ease: "easeOut",
      onUpdate(v) {
        if (nodeRef.current) {
          nodeRef.current.textContent = Math.round(v).toString();
        }
      },
    });
    return () => controls.stop();
  }, [value, duration]);
  return <span ref={nodeRef}>{value}</span>;
}

// 4 Primary Core Study Tools (Tactile action shelf - Knowunity inspired)
const CORE_TOOLS = [
  {
    route: "/practice",
    icon: "assignment",
    title: "Practice Tests",
    desc: "Active recall quizzes & exam simulations",
    color: "text-[#FF4D2E]",
    badge: "High Yield",
  },
  {
    route: "/flashcards",
    icon: "style",
    title: "Flashcards",
    desc: "Spaced repetition & memory reinforcement",
    color: "text-[#8B5CF6]",
    badge: "Spaced Recall",
  },
  {
    route: "/notes",
    icon: "edit_document",
    title: "My Notes",
    desc: "Rich text summaries & lecture syntheses",
    color: "text-[#10B981]",
    badge: "Synthesis",
  },
  {
    route: "/community",
    icon: "menu_book",
    title: "Campus Vault",
    desc: "Curated peer study guides & notes",
    color: "text-[#0EA5E9]",
    badge: "Community",
  },
] as const;

// 12 Secondary Specialized Tools (expandable drawer)
const SECONDARY_TOOLS = [
  { route: "/ai-tutor",       icon: "forum",          title: "Rex Tutor",        desc: "Interactive AI study coach",     color: "text-[#FF4D2E]" },
  { route: "/quick-study",    icon: "edit_note",      title: "Cram Mode",        desc: "High-yield last-minute sheets",  color: "text-[#b61b00]" },
  { route: "/visual-learner", icon: "visibility",     title: "Visual Learner",   desc: "Mind maps & concept diagrams",   color: "text-[#8B5CF6]" },
  { route: "/planner",        icon: "calendar_month", title: "Study Planner",    desc: "Schedules & revision deadlines", color: "text-[#0EA5E9]" },
  { route: "/math",           icon: "calculate",      title: "Math Solver",      desc: "Step-by-step problem solver",    color: "text-[#10B981]" },
  { route: "/teach-it",       icon: "psychology",     title: "Teach It",         desc: "Feynman technique practice",     color: "text-[#EC4899]" },
  { route: "/timer",          icon: "timer",          title: "Focus Timer",      desc: "Tactile Pomodoro intervals",     color: "text-[#6366F1]" },
  { route: "/arcade",         icon: "sports_esports", title: "Arcade",           desc: "Gamified academic challenges",   color: "text-[#F43F5E]" },
  { route: "/mistakes",       icon: "playlist_remove",title: "Mistake Journal",  desc: "Targeted error review",          color: "text-[#ba1a1a]" },
  { route: "/arena",          icon: "military_tech",  title: "Arena",            desc: "Compete in live study challenges",color: "text-[#8B5CF6]" },
  { route: "/sources",        icon: "attach_file",    title: "Source Library",   desc: "Upload syllabus & PDFs",         color: "text-[#78716C]" },
  { route: "/analytics",      icon: "bar_chart",      title: "Analytics",        desc: "Comprehensive progress charts",  color: "text-[#14B8A6]" },
] as const;


// Sub-components defined OUTSIDE Dashboard to prevent remount on every render

interface QuestLogBodyProps {
  tasks: { id: any; title: string; completed: boolean; time?: string }[];
  loadingTasks: boolean;
  newTaskTitle: string;
  setNewTaskTitle: (v: string) => void;
  handleAddTask: (e: React.FormEvent) => void;
  handleToggleTask: (id: any, completed: boolean) => void;
  handleDeleteTask: (id: any) => void;
}

function QuestLogBody({ tasks, loadingTasks, newTaskTitle, setNewTaskTitle, handleAddTask, handleToggleTask, handleDeleteTask }: QuestLogBodyProps) {
  return (
    <>
      <div className="flex-1 p-4 overflow-y-auto">
        {loadingTasks ? (
          <div className="text-center py-4 text-xs font-bold text-slate-400">Loading checklist...</div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-10 opacity-40">
            <span className="material-symbols-outlined text-[48px] mb-2">task_alt</span>
            <p className="text-sm font-bold">No quests yet.<br />Add your first target below.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center gap-3 justify-between group">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleToggleTask(task.id, task.completed)}
                    className={`w-5 h-5 rounded-full border-2 border-black flex-shrink-0 cursor-pointer flex items-center justify-center transition-all active:scale-90 ${
                      task.completed ? "bg-[#10B981] shadow-none" : "bg-white hover:bg-[#FFFBEA] shadow-[1px_1px_0px_#000]"
                    }`}
                  >
                    {task.completed && <span className="material-symbols-outlined text-[13px] text-white font-black">check</span>}
                  </button>
                  <div className={`text-[14px] font-extrabold truncate transition-opacity ${task.completed ? "line-through opacity-40 text-black" : "text-black"}`}>
                    {task.title}
                    {task.time && (
                      <span className="text-[11px] font-bold opacity-60 ml-1.5 bg-[#FFFBEA] px-2 py-0.5 rounded-full border border-black/15">
                        {task.time}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteTask(task.id)}
                  className="material-symbols-outlined text-[18px] text-black/30 hover:text-[#FF4D2E] cursor-pointer transition-colors p-1"
                >
                  delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="border-t-2 border-black p-3 bg-[#FFFDF5]">
        <form onSubmit={handleAddTask} className="flex gap-2">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Add a quest..."
            className="flex-1 bg-white border-2 border-black px-3 py-2 text-[13px] font-bold outline-none focus:ring-0 placeholder:opacity-40 rounded-lg"
          />
          <button
            type="submit"
            className="border-2 border-black bg-black text-white px-3.5 flex items-center justify-center hover:bg-[#FF4D2E] transition-colors rounded-lg shadow-[2px_2px_0px_#1A1A1A] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
          </button>
        </form>
      </div>
    </>
  );
}

interface RecentSessionsRowsProps {
  sessions: { id: any; title: string; duration_minutes: number; created_at: string }[];
  loadingSessions: boolean;
}

function RecentSessionsRows({ sessions, loadingSessions }: RecentSessionsRowsProps) {
  return (
    <div className="divide-y-2 divide-black">
      {loadingSessions ? (
        <div className="p-4 text-center text-xs font-bold text-slate-400">Loading sessions...</div>
      ) : sessions.length === 0 ? (
        <div className="p-4 text-center text-xs font-bold text-slate-400">No sessions yet. Start studying!</div>
      ) : (
        sessions.slice(0, 3).map((session, sIdx) => {
          const formattedDate = new Date(session.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
          const icons = ["science", "calculate", "history_edu"];
          const bgs = ["bg-black", "bg-[#b61b00]", "bg-[#858480]"];
          return (
            <div key={session.id || sIdx} className="p-4 flex justify-between items-center bg-white hover:bg-[#f3f3f3] transition-colors">
              <div className="flex items-center gap-4">
                <div className={`w-11 h-11 border-2 border-black flex items-center justify-center text-white flex-shrink-0 ${bgs[sIdx % 3]}`}
                  style={{ boxShadow: "2px 2px 0px #000" }}>
                  <span className="material-symbols-outlined text-[20px]">{icons[sIdx % 3]}</span>
                </div>
                <div>
                  <div className="text-[14px] font-extrabold text-black">{session.title}</div>
                  <div className="text-[11px] font-bold text-black/50">{formatDuration(Number(session.duration_minutes || 0))} &bull; {formattedDate}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] font-bold text-black/40">{formatDuration(Number(session.duration_minutes || 0))} studied</div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

interface WeeklyBarsProps {
  daysOfWeek: string[];
  dayMinutes: number[];
  studiedDays: boolean[];
}

function WeeklyBars({ daysOfWeek, dayMinutes, studiedDays }: WeeklyBarsProps) {
  return (
    <div className="h-48 flex items-end justify-between px-4 pb-2">
      {daysOfWeek.map((day, idx) => {
        const heightPct = dayMinutes[idx] === 0 ? 8 : Math.min(100, Math.max(8, Math.round((dayMinutes[idx] / 600) * 100)));
        return (
          <div key={day} className="flex flex-col items-center justify-end gap-2 group h-full">
            <span className="text-[9px] font-black text-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
              {dayMinutes[idx] > 0 ? (dayMinutes[idx] < 1 ? "<1m" : `${Math.round(dayMinutes[idx])}m`) : ""}
            </span>
            <div
              className={`w-8 border-2 border-black transition-colors group-hover:bg-[#FF4D2E] ${
                studiedDays[idx] ? "bg-black" : "bg-[#F0EDE0]"
              }`}
              style={{ height: `${heightPct}%` }}
            />
            <span className="text-[10px] font-black uppercase text-black/40 mt-1">{day}</span>
          </div>
        );
      })}
    </div>
  );
}

const formatDuration = (mins: number) => {
  if (!mins || mins <= 0) return "0m";
  if (mins < 1) return "<1m";
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

// ── Grounded Rex Hero Stage (Grounded Mascot Pedestal & Speech Bubble, Knowunity + Airlearn inspired)
function RexHeroStage({
  displayName,
  primarySubjectMeta,
  activeGoalMeta,
  examTarget,
  quizAccuracy,
  sessionsCount,
  tasksCompleted,
  navigate,
}: {
  displayName: string;
  primarySubjectMeta: any;
  activeGoalMeta: any;
  examTarget?: ExamTarget | null;
  quizAccuracy: number;
  sessionsCount: number;
  tasksCompleted: number;
  navigate: any;
}) {
  const readiness = useMemo(() => {
    return calculateExamReadiness(examTarget?.examDate, quizAccuracy, sessionsCount, tasksCompleted);
  }, [examTarget, quizAccuracy, sessionsCount, tasksCompleted]);

  const [dialogueIndex, setDialogueIndex] = useState(0);

  const dialogues = useMemo(() => {
    const list: string[] = [];
    if (examTarget?.examDate && readiness.daysLeft >= 0) {
      list.push(
        `Your ${examTarget.subject || primarySubjectMeta.name} exam is in ${readiness.daysLeft} days! Let's lock in 5 minutes of practice.`
      );
    }
    list.push(`Good day, ${displayName}! Ready to master ${primarySubjectMeta.name} today?`);
    list.push(`"${activeGoalMeta.rexQuote}"`);
    list.push(`Speak out loud with me or launch a high-yield practice set!`);
    return list;
  }, [displayName, examTarget, readiness.daysLeft, primarySubjectMeta.name, activeGoalMeta.rexQuote]);

  const currentSpeech = dialogues[dialogueIndex % dialogues.length];

  const handleRexClick = () => {
    playPop(1.2);
    setDialogueIndex((prev) => prev + 1);
  };

  const handleCall = () => {
    playSuccess();
    localStorage.setItem("pz_has_called_rex", "true");
    navigate("/call");
  };

  const handleLaunchPractice = () => {
    playSuccess();
    navigate(primarySubjectMeta.recommendedTool || "/practice");
  };

  return (
    <div className="border-2 md:border-[2.5px] border-black rounded-2xl md:rounded-3xl bg-[#FFFDF5] p-3.5 md:p-6 shadow-[3px_3px_0px_#1A1A1A] md:shadow-[4px_4px_0px_#1A1A1A] relative overflow-hidden transition-all">
      {/* Background soft ambient accents */}
      <div className="absolute -top-16 -right-16 w-60 h-60 rounded-full bg-[#FFE566]/20 pointer-events-none blur-2xl" />
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-48 h-48 rounded-full border border-black/5 pointer-events-none" />

      <div className="relative z-10 flex flex-row items-center gap-3 md:gap-7">
        {/* Grounded Character Pedestal (Rex stands physically on a stage) */}
        <div className="flex flex-col items-center justify-center shrink-0">
          <div className="relative flex flex-col items-center justify-center">
            {/* Spotlight halo behind Rex - compact on mobile, large on desktop */}
            <div
              onClick={handleRexClick}
              className="w-20 h-20 md:w-40 md:h-40 rounded-full bg-gradient-to-b from-[#FFE566]/35 to-[#F0EDE0] border-2 border-black/15 flex items-center justify-center p-1 md:p-2 shadow-inner cursor-pointer hover:scale-105 active:scale-95 transition-transform"
            >
              <div className="md:hidden">
                <AnimatedRex
                  state="idle"
                  size="sm"
                  interactive={true}
                  onClick={handleRexClick}
                />
              </div>
              <div className="hidden md:block">
                <AnimatedRex
                  state="idle"
                  size="lg"
                  interactive={true}
                  onClick={handleRexClick}
                />
              </div>
            </div>

            {/* Physical Grounded Pedestal Stand */}
            <div className="w-16 md:w-36 h-3 md:h-4.5 bg-[#E8E4DC] border-[1.5px] md:border-2 border-black rounded-full shadow-[1px_1px_0px_#1A1A1A] md:shadow-[2px_2px_0px_#1A1A1A] mt-[-6px] md:mt-[-9px] flex items-center justify-center">
              <span className="w-8 md:w-14 h-0.5 md:h-1 bg-black/20 rounded-full" />
            </div>

            {/* Compact interact hint */}
            <span
              onClick={handleRexClick}
              className="text-[9px] md:text-[9.5px] font-black uppercase tracking-wider text-black/45 mt-1 flex items-center gap-1 cursor-pointer select-none"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
              <span className="hidden md:inline">Tap Rex to interact</span>
              <span className="md:hidden">Rex</span>
            </span>
          </div>
        </div>

        {/* Content Column: Speech Bubble + Dynamic Prompt + Primary Actions */}
        <div className="flex-1 min-w-0 flex flex-col justify-between text-left">
          {/* Top badges */}
          <div className="flex items-center gap-1.5 md:gap-2 mb-1.5 md:mb-2.5 flex-wrap">
            <span className="inline-flex items-center gap-1 md:gap-1.5 px-2 md:px-2.5 py-0.5 md:py-1 bg-black text-white font-black uppercase text-[9px] md:text-[10px] tracking-wider rounded-md md:rounded-lg border border-white/20 shadow-xs">
              <span className="material-symbols-outlined text-[11px] md:text-[13px] text-[#FFE566]" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
              <span className="hidden sm:inline">Rex AI Study Coach</span>
              <span className="sm:hidden">Rex AI</span>
            </span>
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-wider px-2 md:px-2.5 py-0.5 md:py-1 rounded-md md:rounded-lg border-2 border-black bg-[#FFE566] text-black shadow-[1px_1px_0px_#1A1A1A]">
              {primarySubjectMeta.name} Track
            </span>
            {examTarget?.examDate && readiness.daysLeft >= 0 && (
              <span className="text-[9px] md:text-[10px] font-black uppercase tracking-wider px-1.5 md:px-2 py-0.5 rounded-md md:rounded-full border border-black/20 bg-white text-black/70">
                ⏳ {readiness.daysLeft}d &bull; {readiness.percent}%
              </span>
            )}
          </div>

          {/* Neobrutalist Speech Bubble */}
          <div className="relative bg-white border-2 border-black rounded-xl md:rounded-2xl p-2.5 md:p-4 shadow-[2px_2px_0px_#1A1A1A] md:shadow-[3px_3px_0px_#1A1A1A] mb-2 md:mb-3.5 text-left">
            {/* Speech bubble pointer pointing toward Rex on the left */}
            <div className="absolute top-1/2 -left-2 md:-left-2.5 -translate-y-1/2 w-0 h-0 border-y-[6px] md:border-y-[8px] border-y-transparent border-r-[8px] md:border-r-[10px] border-r-black" />
            <div className="absolute top-1/2 -left-[5px] md:-left-[7px] -translate-y-1/2 w-0 h-0 border-y-[5px] md:border-y-[6px] border-y-transparent border-r-[6px] md:border-r-[8px] border-r-white" />

            <p className="text-[12px] md:text-[15px] font-extrabold text-black leading-snug line-clamp-2 md:line-clamp-none">
              {currentSpeech}
            </p>
          </div>

          {/* 2 Primary Action CTAs */}
          <div className="grid grid-cols-2 gap-2 md:gap-2.5 pt-0.5">
            {/* Action 1: Call Rex (Voice Mentor) */}
            <button
              type="button"
              onClick={handleCall}
              className="h-8.5 md:min-h-[46px] bg-[#FFE566] hover:bg-black hover:text-white text-black border-2 border-black font-black uppercase text-[10.5px] md:text-[12px] tracking-wider px-2 md:px-4 py-1 md:py-2.5 rounded-lg md:rounded-xl shadow-[2px_2px_0px_#1A1A1A] md:shadow-[3px_3px_0px_#1A1A1A] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center gap-1.5 cursor-pointer group"
            >
              <span className="material-symbols-outlined text-[15px] md:text-[18px] group-hover:rotate-12 transition-transform">phone_in_talk</span>
              <span className="truncate">Talk</span>
            </button>

            {/* Action 2: Launch Daily Focus */}
            <button
              type="button"
              onClick={handleLaunchPractice}
              className="h-8.5 md:min-h-[46px] bg-[#FF4D2E] hover:bg-black text-white border-2 border-black font-black uppercase text-[10.5px] md:text-[12px] tracking-wider px-2 md:px-4 py-1 md:py-2.5 rounded-lg md:rounded-xl shadow-[2px_2px_0px_#1A1A1A] md:shadow-[3px_3px_0px_#1A1A1A] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px] md:text-[18px]">bolt</span>
              <span className="truncate">Daily Focus</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Persistent "Ask Rex" AI Composer Bar (Knowunity Frame 18/21 inspired)
function AskRexBottomBar({ navigate }: { navigate: any }) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    playPop();
    navigate(`/ai-tutor?prompt=${encodeURIComponent(query.trim())}`);
  };

  const handleMic = () => {
    playSuccess();
    navigate("/call");
  };

  return (
    <div className="w-full">
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 bg-white border-2 border-black rounded-2xl md:rounded-full px-3 py-1.5 md:px-3.5 md:py-2 shadow-[2px_2px_0px_#1A1A1A] md:shadow-[3px_3px_0px_#1A1A1A] hover:shadow-[4px_4px_0px_#1A1A1A] transition-all"
      >
        <button
          type="button"
          onClick={() => { playTap(); navigate("/ai-tutor"); }}
          className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-[#FFE566] border-2 border-black flex items-center justify-center text-black shrink-0 cursor-pointer shadow-xs hover:bg-[#FFD13B] transition-colors"
          title="Open AI Tutor"
        >
          <span className="material-symbols-outlined text-[15px] md:text-[17px]">forum</span>
        </button>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask Rex anything or type a topic to practice..."
          className="flex-1 bg-transparent border-none text-[12.5px] md:text-[14px] font-bold text-black outline-none placeholder:text-black/40"
        />

        <button
          type="button"
          onClick={handleMic}
          className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-[#FAF7F2] hover:bg-[#FF4D2E] hover:text-white border-2 border-black flex items-center justify-center text-black shrink-0 transition-colors cursor-pointer"
          title="Voice Talk with Rex"
        >
          <span className="material-symbols-outlined text-[15px] md:text-[17px]">mic</span>
        </button>

        <button
          type="submit"
          className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-black text-white hover:bg-[#FF4D2E] flex items-center justify-center shrink-0 transition-colors cursor-pointer"
          title="Send"
        >
          <span className="material-symbols-outlined text-[15px] md:text-[17px]">arrow_forward</span>
        </button>
      </form>
    </div>
  );
}

// ── Top Status Header with Gamification Pills (Knowunity / Duolingo style)
function DashboardHeader({
  displayName,
  streakDays,
  totalXp,
  isPro,
  onOpenHelp,
  navigate,
}: {
  displayName: string;
  streakDays: number;
  totalXp: number;
  isPro: boolean;
  onOpenHelp?: () => void;
  navigate: any;
}) {
  const level = levelFromXp(totalXp);

  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 mb-6 md:mb-8">
      <div>
        <h2 className="text-[26px] md:text-[32px] font-black leading-tight text-black">
          Good morning, {displayName}.
        </h2>
        <p className="text-[13px] md:text-[15px] font-bold text-black/60 mt-0.5">
          {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} &bull; Keep your streak alive!
        </p>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Streak Flame Badge */}
        <div
          onClick={() => { playPop(); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 border-black bg-white shadow-[2px_2px_0px_#1A1A1A] cursor-pointer hover:bg-[#FFFDF5] transition-all"
          title={`${streakDays} Day Streak`}
        >
          <span className="text-[15px]">🔥</span>
          <span className="text-[12px] font-black text-black">{streakDays}d Streak</span>
        </div>

        {/* Level / XP Pill */}
        <div
          onClick={() => { playPop(); navigate("/analytics"); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 border-black bg-[#FFE566] shadow-[2px_2px_0px_#1A1A1A] cursor-pointer hover:bg-[#FFD13B] transition-all"
          title={`Level ${level} (${totalXp} XP)`}
        >
          <span className="text-[13px]">⚡</span>
          <span className="text-[12px] font-black text-black">LVL {level}</span>
        </div>

        {/* Pro Pill */}
        <button
          type="button"
          onClick={() => { playPop(); navigate("/pro"); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 border-black shadow-[2px_2px_0px_#1A1A1A] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer font-black text-[11px] uppercase tracking-wider ${
            isPro ? "bg-[#10B981] text-white" : "bg-[#FF4D2E] text-white hover:bg-black"
          }`}
        >
          <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            {isPro ? "verified" : "workspace_premium"}
          </span>
          <span>{isPro ? "PRO" : "GET PRO"}</span>
        </button>

        {/* Help button */}
        {onOpenHelp && (
          <button
            type="button"
            onClick={onOpenHelp}
            className="w-9 h-9 flex items-center justify-center border-2 border-black bg-white hover:bg-black hover:text-white transition-colors rounded-xl shadow-[2px_2px_0px_#1A1A1A] cursor-pointer"
            title="Help"
          >
            <span className="material-symbols-outlined text-[18px]">help</span>
          </button>
        )}
      </div>
    </header>
  );
}


export default function Dashboard() {
  const tutorial = useTutorialModal("/dashboard");
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { isPro } = usePlan();

  const toTitleCase = (s: string) =>
    s.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
  const rawName =
    user?.avatarConfig?.full_name ||
    (user as any)?.user_metadata?.full_name ||
    (profile as any)?.full_name ||
    (profile as any)?.username ||
    user?.name ||
    user?.email?.split("@")[0] ||
    "Scholar";
  const displayName = toTitleCase(rawName);

  const [tasks, setTasks] = useState<{ id: any; title: string; completed: boolean; time?: string }[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [loadingTasks, setLoadingTasks] = useState(true);

  const [sessions, setSessions] = useState<{ id: any; title: string; duration_minutes: number; created_at: string }[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  const [stats, setStats] = useState({ totalSessions: 0, studyTimeHours: 0, avgScore: 0 });
  const [studiedDays, setStudiedDays] = useState<boolean[]>([false, false, false, false, false, false, false]);
  const [dayMinutes, setDayMinutes] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);

  useEffect(() => {
    fetchTasks();
    if (user?.id) fetchSessions();
  }, [user?.id]);

  useEffect(() => {
    const handleSessionLogged = () => fetchSessions();
    window.addEventListener("studenius:session-logged", handleSessionLogged);
    return () => window.removeEventListener("studenius:session-logged", handleSessionLogged);
  }, [user?.id]);

  const fetchSessions = async () => {
    if (!user?.id) {
      setLoadingSessions(false);
      return;
    }
    setLoadingSessions(true);
    try {
      let combinedData: any[] = [];
      try {
        const local = localStorage.getItem("pz_study_sessions");
        if (local) {
          combinedData = JSON.parse(local);
        }
      } catch (err) {}
      
      const [sessRes, actRes] = await Promise.all([
        Promise.resolve(supabase.from("study_sessions").select("*").eq("user_id", user.id).order("created_at", { ascending: false })).catch(() => ({ data: [] })),
        Promise.resolve(supabase.from("study_activity").select("*").eq("user_id", user.id).order("created_at", { ascending: false })).catch(() => ({ data: [] }))
      ]);
      
      if (sessRes.data && sessRes.data.length > 0) {
        sessRes.data.forEach((dbSess: any) => {
          if (!combinedData.find(s => s.id === dbSess.id)) {
            combinedData.push(dbSess);
          }
        });
      }
      
      if (actRes.data && actRes.data.length > 0) {
        actRes.data.forEach((act: any) => {
          if (!combinedData.find(s => s.id === act.id)) {
            const time_seconds = act.metadata?.time_seconds || 0;
            combinedData.push({
              id: act.id,
              title: act.tool || act.activity_type || "Arcade Activity",
              duration_minutes: Math.round(time_seconds / 60),
              created_at: act.created_at
            });
          }
        });
      }
      
      combinedData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setSessions(combinedData);
      calculateStatsAndCalendar(combinedData);
    } catch (err) {
      console.error("Error loading sessions:", err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const calculateStatsAndCalendar = (loadedSessions: any[]) => {
    const totalSess = loadedSessions.length;
    const totalMins = loadedSessions.reduce((acc, curr) => acc + (Number(curr.duration_minutes || curr.duration) || 0), 0);
    const hours = Math.round((totalMins / 60) * 10) / 10;
    setStats({ totalSessions: totalSess, studyTimeHours: hours, avgScore: 0 });

    const today = new Date();
    const windowDays: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      windowDays.push(d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0') + "-" + String(d.getDate()).padStart(2, '0'));
    }

    const dayMins = new Array(7).fill(0);
    const daysStudied = new Array(7).fill(false);

    loadedSessions.forEach((session) => {
      const dateObj = new Date(session.created_at);
      const dStr = dateObj.getFullYear() + "-" + String(dateObj.getMonth() + 1).padStart(2, '0') + "-" + String(dateObj.getDate()).padStart(2, '0'); 
      const idx = windowDays.indexOf(dStr);
      if (idx !== -1) {
        daysStudied[idx] = true;
        dayMins[idx] += Number(session.duration_minutes || session.duration) || 0;
      }
    });
    setStudiedDays(daysStudied);
    setDayMinutes(dayMins);
  };

  const [userPrefs, setUserPrefs] = useState<UserStudyPreferences | null>(() => getStoredPreferences(user?.id));

  useEffect(() => {
    const loaded = getStoredPreferences(user?.id);
    if (loaded) setUserPrefs(loaded);

    const onUpdate = (e: any) => {
      if (e.detail) setUserPrefs(e.detail);
    };
    window.addEventListener("studenius:preferences-updated", onUpdate);
    return () => window.removeEventListener("studenius:preferences-updated", onUpdate);
  }, [user?.id]);

  const primarySubjectId = userPrefs?.subjects?.[0] || "biology";
  const primarySubjectMeta = SUBJECT_METADATA[primarySubjectId] || SUBJECT_METADATA.other;
  const activeGoalId = userPrefs?.goal || "grades";
  const activeGoalMeta = GOAL_METADATA[activeGoalId] || GOAL_METADATA.grades;
  const primaryStyleId = userPrefs?.learningStyles?.[0] || "mixed";
  const primaryStyleMeta = STYLE_METADATA[primaryStyleId] || STYLE_METADATA.mixed;

  const [showAllTools, setShowAllTools] = useState(false);

  const quizAccuracy = useMemo(() => {
    try {
      const total = parseInt(localStorage.getItem("pz_practice_total_count") || "0", 10);
      const mastered = parseInt(localStorage.getItem("pz_practice_mastered_count") || "0", 10);
      if (total > 0) return Math.min(100, Math.round((mastered / total) * 100));
    } catch {}
    return stats.avgScore || 0;
  }, [sessions, stats.avgScore]);

  const handleUpdateExamTarget = (target: ExamTarget | null) => {
    saveExamTarget(target, user?.id);
    setUserPrefs((prev) => (prev ? { ...prev, examTarget: target } : null));
  };

  const fetchTasks = () => {
    setLoadingTasks(true);
    try {
      const userKey = user?.id ? `pz_${user.id}_checklist` : "pz_checklist";
      const stored = localStorage.getItem(userKey) || localStorage.getItem("pz_checklist");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTasks(parsed);
          setLoadingTasks(false);
          return;
        }
      }
      const prefs = getStoredPreferences(user?.id) || {
        name: displayName || "Scholar",
        subjects: ["biology"],
        goal: "grades",
        learningStyles: ["flashcards"],
        dailyGoalMinutes: 30,
        completedAt: new Date().toISOString()
      };
      const smart = generateSmartQuests(prefs);
      setTasks(smart);
      try {
        localStorage.setItem("pz_checklist", JSON.stringify(smart));
        if (user?.id) localStorage.setItem(`pz_${user.id}_checklist`, JSON.stringify(smart));
      } catch {}
    } catch {
      setTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleToggleTask = (id: any, currentCompleted: boolean) => {
    const nextCompleted = !currentCompleted;
    if (nextCompleted) {
      playSuccess();
    } else {
      playTap();
    }
    const updated = tasks.map((t) => (t.id === id ? { ...t, completed: nextCompleted } : t));
    setTasks(updated);
    try {
      localStorage.setItem("pz_checklist", JSON.stringify(updated));
      if (user?.id) localStorage.setItem(`pz_${user.id}_checklist`, JSON.stringify(updated));
    } catch {}
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    playPop();
    const updated = [...tasks, { id: Date.now().toString(), title: newTaskTitle.trim(), completed: false, time: "Just now" }];
    try {
      localStorage.setItem("pz_checklist", JSON.stringify(updated));
      if (user?.id) localStorage.setItem(`pz_${user.id}_checklist`, JSON.stringify(updated));
    } catch {}
    setTasks(updated);
    setNewTaskTitle("");
  };

  const handleDeleteTask = (id: any) => {
    playTap();
    const updated = tasks.filter((t) => t.id !== id);
    setTasks(updated);
    try {
      localStorage.setItem("pz_checklist", JSON.stringify(updated));
      if (user?.id) localStorage.setItem(`pz_${user.id}_checklist`, JSON.stringify(updated));
    } catch {}
  };

  const completedCount = tasks.filter((t) => t.completed).length;
  const goalCount = tasks.length > 5 ? tasks.length : 5;
  const progressPercent = Math.min(100, Math.round((completedCount / goalCount) * 100));
  const circumference = 2 * Math.PI * 42;
  const dashOffset = circumference - (progressPercent / 100) * circumference;

  const daysOfWeek = useMemo(() => {
    const today = new Date();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      days.push(d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase());
    }
    return days;
  }, []);

  return (
    <div className="w-full bg-[#FAF7F2] min-h-full flex flex-col font-body-md text-black flex-1">
      <TutorialModal isOpen={tutorial.isOpen} onDismiss={tutorial.dismiss} features={TUTORIAL_CONTENT["/dashboard"] || []} title="Dashboard" />

      <SharedSidebar active="/dashboard" />

      {/* ── MOBILE TOP BAR (Knowunity / Duolingo style) ───────────────────────────────────────────────────────── */}
      {/* ── MOBILE TOP BAR (Knowunity / Duolingo style) ───────────────────────────────────────────────────────── */}
      <header className="md:hidden h-14 w-full px-3.5 flex items-center justify-between bg-[#FFFDF5] z-40 sticky top-0 border-b-2 border-black">
        <div className="text-[19px] font-black tracking-tight text-black flex items-center gap-1.5 cursor-pointer" onClick={() => navigate("/dashboard")}>
          <span>STUDENIUS</span>
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF4D2E]" />
        </div>
        <div className="flex items-center gap-2">
          {/* Flame streak */}
          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full border-2 border-black bg-white shadow-xs">
            <span className="text-[13px]">🔥</span>
            <span className="text-[11px] font-black text-black">{profile?.streak_days ?? 1}d</span>
          </div>

          {/* Level */}
          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full border-2 border-black bg-[#FFE566] shadow-xs">
            <span className="text-[11px]">⚡</span>
            <span className="text-[11px] font-black text-black">L{levelFromXp(profile?.total_xp ?? 0)}</span>
          </div>

          {/* Pro Pill */}
          <button
            type="button"
            onClick={() => { playPop(); navigate("/pro"); }}
            className={`px-2.5 py-0.5 rounded-full border-2 border-black shadow-xs flex items-center gap-1 transition-all cursor-pointer font-black text-[10px] uppercase tracking-wider ${
              isPro ? "bg-[#10B981] text-white" : "bg-[#FFD13B] text-black"
            }`}
          >
            <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              {isPro ? "verified" : "workspace_premium"}
            </span>
            <span>{isPro ? "PRO" : "PRO"}</span>
          </button>

          {/* Avatar */}
          <button
            type="button"
            onClick={() => { playPop(); navigate("/profile"); }}
            className="w-7 h-7 rounded-full bg-[#FF4D2E] text-white border-2 border-black shadow-xs flex items-center justify-center font-black text-[11px] cursor-pointer transition-all shrink-0"
          >
            {displayName.slice(0, 1).toUpperCase()}
          </button>
        </div>
      </header>

      {/* ── DESKTOP LAYOUT (Perfect Centering between 256px sidebar and right window edge) ─────── */}
      <div className="hidden md:block md:ml-64 min-h-screen overflow-y-auto">
        <div className="p-6 lg:p-8 max-w-6xl xl:max-w-7xl w-full mx-auto space-y-6 box-border">

        {/* Top Header with greeting & gamification pills */}
        <DashboardHeader
          displayName={displayName}
          streakDays={profile?.streak_days ?? 1}
          totalXp={profile?.total_xp ?? 0}
          isPro={isPro}
          onOpenHelp={() => tutorial.show()}
          navigate={navigate}
        />

        {/* Main 2-Column Grid (8 cols + 4 cols) */}
        <div className="grid grid-cols-12 gap-7">

          {/* Left Column (8 cols): Companion Hero + Ask Bar + Study Shelf + Exam Countdown + Momentum */}
          <div className="col-span-8 flex flex-col gap-6">

            {/* Rex Grounded Companion Hero Stage */}
            <RexHeroStage
              displayName={displayName}
              primarySubjectMeta={primarySubjectMeta}
              activeGoalMeta={activeGoalMeta}
              examTarget={userPrefs?.examTarget}
              quizAccuracy={quizAccuracy}
              sessionsCount={sessions.length}
              tasksCompleted={tasks.filter((t) => t.completed).length}
              navigate={navigate}
            />

            {/* Knowunity-style Persistent AI Composer Bar */}
            <AskRexBottomBar navigate={navigate} />

            {/* Core Study Actions Shelf (Knowunity Frame 18 style) */}
            <section className="border-2 border-black bg-white rounded-3xl p-5 md:p-6 shadow-[3px_3px_0px_#1A1A1A]">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-[14px] font-black uppercase tracking-wider text-black">Core Study Shelf</h3>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-black/15 bg-[#FAF7F2] text-black/60">
                    4 Primary Tools
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playTap();
                    setShowAllTools(!showAllTools);
                  }}
                  className="text-[12px] font-black text-black hover:text-[#FF4D2E] transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>{showAllTools ? "Collapse Tools" : "+ More Academic Tools (12)"}</span>
                  <span className="material-symbols-outlined text-[16px] transition-transform">
                    {showAllTools ? "expand_less" : "expand_more"}
                  </span>
                </button>
              </div>

              {/* 4 Primary Tools with generous tactile padding */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                {CORE_TOOLS.map((tool) => (
                  <button
                    key={"core-" + tool.route}
                    onClick={() => {
                      playPop();
                      navigate(tool.route);
                    }}
                    className="border-2 border-black bg-[#FAF7F2] hover:bg-white p-4 flex flex-col justify-between min-h-[136px] rounded-2xl text-left shadow-[2px_2px_0px_#1A1A1A] hover:-translate-y-1 hover:shadow-[4px_4px_0px_#1A1A1A] active:translate-y-[1px] active:shadow-none transition-all group cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-10 h-10 rounded-xl bg-white border-2 border-black/15 group-hover:border-black flex items-center justify-center shadow-xs transition-colors">
                        <span className={`material-symbols-outlined text-[22px] ${tool.color}`}>{tool.icon}</span>
                      </div>
                      <span className="text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border border-black/10 bg-white text-black/50 group-hover:border-black/30 transition-colors">
                        {tool.badge}
                      </span>
                    </div>
                    <div>
                      <div className="text-[14px] font-black text-black leading-tight group-hover:text-[#FF4D2E] transition-colors">
                        {tool.title}
                      </div>
                      <p className="text-[11px] font-bold text-black/60 mt-1 leading-snug">
                        {tool.desc}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Expandable 12-Tool Drawer */}
              {showAllTools && (
                <div className="pt-5 mt-5 border-t-2 border-black/10 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-black uppercase tracking-wider text-black/50">
                      All Specialized Academic Tools
                    </span>
                    <span className="text-[10px] font-extrabold text-black/40">1-Tap Direct Launch</span>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {SECONDARY_TOOLS.map((tool) => (
                      <button
                        key={"sec-" + tool.route}
                        onClick={() => {
                          playPop();
                          navigate(tool.route);
                        }}
                        className="border-2 border-black bg-white hover:bg-[#FAF7F2] p-2.5 flex items-center gap-2.5 rounded-xl shadow-[2px_2px_0px_#1A1A1A] hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#1A1A1A] active:translate-y-[1px] active:shadow-none transition-all group text-left cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-lg bg-[#FAF7F2] group-hover:bg-white border border-black/10 flex items-center justify-center shrink-0 transition-colors">
                          <span className={`material-symbols-outlined text-[18px] ${tool.color}`}>{tool.icon}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[12px] font-black text-black truncate group-hover:text-[#FF4D2E] transition-colors">
                            {tool.title}
                          </div>
                          <div className="text-[10px] font-bold text-black/45 truncate">{tool.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Exam Countdown Banner (Permanent: Active Countdown or 'No exam yet' empty state) */}
            <ExamCountdownBanner
              examTarget={userPrefs?.examTarget}
              onUpdate={handleUpdateExamTarget}
              quizAccuracy={quizAccuracy}
              sessionsCount={sessions.length}
              tasksCompleted={tasks.filter((t) => t.completed).length}
            />

            {/* Weekly Momentum */}
            <section className="border-2 border-black bg-white p-5 rounded-3xl shadow-[3px_3px_0px_#1A1A1A]">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-[13px] font-black uppercase tracking-wider text-black">Weekly Momentum</h3>
                  <p className="text-[11px] font-bold text-black/50 mt-0.5">{stats.studyTimeHours}h total study time logged</p>
                </div>
                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-black text-white text-[11px] font-black uppercase tracking-wider rounded-lg">Study Hours</span>
                </div>
              </div>
              <WeeklyBars daysOfWeek={daysOfWeek} dayMinutes={dayMinutes} studiedDays={studiedDays} />
            </section>

          </div>

          {/* Right Column (4 cols): Quest Log + Academic Streak + Recent Sessions */}
          <div className="col-span-4 flex flex-col gap-6">

            {/* Today's Quest Checklist */}
            <section className="border-2 border-black bg-white flex flex-col rounded-3xl shadow-[3px_3px_0px_#1A1A1A] overflow-hidden">
              <div className="p-4 border-b-2 border-black flex items-center justify-between bg-[#FFFDF5]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-[#FF4D2E]">checklist</span>
                  <h3 className="text-[13px] font-black uppercase tracking-wider">Today's Quests</h3>
                </div>
                <span className="text-[11px] font-black text-black/60 bg-white px-2 py-0.5 rounded-full border border-black/15">
                  {completedCount}/{goalCount}
                </span>
              </div>

              {/* Progress bar */}
              <div className="px-4 pt-3 pb-1">
                <div className="h-2 bg-[#F0EDE0] rounded-full overflow-hidden border border-black/20">
                  <div
                    className="h-full bg-[#10B981] rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.round((completedCount / goalCount) * 100))}%` }}
                  />
                </div>
              </div>

              <QuestLogBody
                tasks={tasks}
                loadingTasks={loadingTasks}
                newTaskTitle={newTaskTitle}
                setNewTaskTitle={setNewTaskTitle}
                handleAddTask={handleAddTask}
                handleToggleTask={handleToggleTask}
                handleDeleteTask={handleDeleteTask}
              />
            </section>

            {/* Academic Streak Card */}
            <section className="border-2 border-black bg-[#FF4D2E] text-white p-5 flex flex-col justify-between rounded-3xl shadow-[3px_3px_0px_#1A1A1A]">
              <div className="flex justify-between items-start">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-black text-white font-black uppercase text-[10px] tracking-wider rounded-lg border border-white/20">
                  <span>🔥 Academic Streak</span>
                </div>
                <span className="text-[11px] font-black uppercase tracking-wider text-white/80">Daily Habit</span>
              </div>
              <div className="flex items-baseline gap-2 my-3">
                <span className="text-[52px] font-black leading-none"><AnimatedCounter value={profile?.streak_days ?? 1} /></span>
                <span className="text-[20px] font-black uppercase">Days</span>
              </div>
              <p className="text-[12px] font-bold text-white/90 leading-snug">
                {(profile?.streak_days ?? 1) > 1
                  ? `${profile?.streak_days} days strong! Study today to keep the flame burning.`
                  : "Complete 1 study session today to protect your streak."}
              </p>
            </section>

            {/* Recent Sessions */}
            <section className="border-2 border-black bg-[#FAF7F2] overflow-hidden rounded-3xl shadow-[3px_3px_0px_#1A1A1A]">
              <div className="p-4 border-b-2 border-black flex justify-between items-center bg-white">
                <h3 className="text-[12px] font-black uppercase tracking-wider">Recent Sessions</h3>
                <button onClick={() => navigate("/analytics")} className="text-[11px] font-black text-[#FF4D2E] hover:underline cursor-pointer">
                  View All
                </button>
              </div>
              <RecentSessionsRows sessions={sessions} loadingSessions={loadingSessions} />
            </section>

          </div>

        </div>
        </div>

      </div>

      {/* ── MOBILE LAYOUT (Knowunity Frame 18/21 inspired) ───────────────────────── */}
      <main className="md:hidden px-3.5 pt-3 pb-24 flex flex-col gap-3.5 overflow-y-auto h-full">

        {/* Rex Grounded Companion Hero Stage */}
        <RexHeroStage
          displayName={displayName}
          primarySubjectMeta={primarySubjectMeta}
          activeGoalMeta={activeGoalMeta}
          examTarget={userPrefs?.examTarget}
          quizAccuracy={quizAccuracy}
          sessionsCount={sessions.length}
          tasksCompleted={tasks.filter((t) => t.completed).length}
          navigate={navigate}
        />

        {/* Persistent Ask Rex Composer Bar */}
        <AskRexBottomBar navigate={navigate} />

        {/* 4-Tool Core Study Shelf — 4 Primary Actions (Visible Above the Fold) */}
        <section className="flex flex-col gap-2">
          <div className="flex justify-between items-center px-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-black/60">Core Study Shelf</span>
              <span className="text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-black/15 bg-white text-black/60">
                4 Primary Tools
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                playTap();
                setShowAllTools(!showAllTools);
              }}
              className="text-[11px] font-black text-black underline hover:text-[#FF4D2E] transition-colors cursor-pointer"
            >
              {showAllTools ? "Collapse" : "+ More (12)"}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {CORE_TOOLS.map((tool) => (
              <button
                key={"core-mob-" + tool.title}
                type="button"
                onClick={() => {
                  playPop();
                  navigate(tool.route);
                }}
                className="min-h-[104px] border-2 border-black rounded-2xl bg-white p-3 text-left shadow-[2px_2px_0px_#1A1A1A] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none hover:bg-[#FFFDF5] flex flex-col justify-between transition-all group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-[#FAF7F2] border border-black/15 flex items-center justify-center">
                    <span className={`material-symbols-outlined text-[20px] ${tool.color}`}>{tool.icon}</span>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border border-black/15 bg-[#FAF7F2] text-black/60">
                    {tool.badge}
                  </span>
                </div>
                <div>
                  <div className="text-[13px] font-black text-black leading-tight">{tool.title}</div>
                  <p className="text-[10.5px] text-black/60 font-bold mt-1 leading-snug">{tool.desc}</p>
                </div>
              </button>
            ))}
          </div>

          {showAllTools && (
            <div className="p-3 border-2 border-black rounded-2xl bg-white flex flex-col gap-2 mt-1 shadow-[2px_2px_0px_#1A1A1A] animate-in fade-in duration-150">
              <span className="text-[10px] font-black uppercase tracking-wider text-black/50">Specialized Academic Tools</span>
              <div className="grid grid-cols-2 gap-2">
                {SECONDARY_TOOLS.map((tool) => (
                  <button
                    key={"sec-mob-" + tool.route}
                    type="button"
                    onClick={() => {
                      playPop();
                      navigate(tool.route);
                    }}
                    className="border-2 border-black bg-[#FAF7F2] hover:bg-white p-2.5 flex items-center gap-2 rounded-xl text-left transition-colors"
                  >
                    <span className={`material-symbols-outlined text-[18px] ${tool.color}`}>{tool.icon}</span>
                    <span className="text-[11.5px] font-black text-black truncate">{tool.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Exam Countdown Banner (Permanent: Active Countdown or 'No exam yet' empty state) */}
        <ExamCountdownBanner
          examTarget={userPrefs?.examTarget}
          onUpdate={handleUpdateExamTarget}
          quizAccuracy={quizAccuracy}
          sessionsCount={sessions.length}
          tasksCompleted={tasks.filter((t) => t.completed).length}
        />

        {/* Daily Quests & Progress */}
        <section className="flex flex-col gap-2.5">
          <div className="border-2 border-black rounded-2xl bg-white p-3.5 shadow-[2px_2px_0px_#1A1A1A]">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[11px] opacity-60 font-black uppercase tracking-wider">Today's Quest Target</span>
              <span className="text-[13px] font-black">{completedCount} of {goalCount} completed</span>
            </div>
            <div className="h-2.5 bg-[#E8E4DC] rounded-full overflow-hidden border-2 border-black">
              <div
                className="h-full bg-[#10B981] rounded-r-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.round((completedCount / goalCount) * 100))}%` }}
              />
            </div>
          </div>

          <div className="border-2 border-black rounded-2xl bg-white overflow-hidden shadow-[3px_3px_0px_#1A1A1A]">
            <div className="p-3 border-b-2 border-black flex items-center justify-between bg-[#FFFDF5]">
              <span className="text-[12px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#FF4D2E]">checklist</span>
                Daily Quests
              </span>
              <span className="text-[10.5px] font-bold text-black/50">Keep your streak</span>
            </div>
            <QuestLogBody
              tasks={tasks}
              loadingTasks={loadingTasks}
              newTaskTitle={newTaskTitle}
              setNewTaskTitle={setNewTaskTitle}
              handleAddTask={handleAddTask}
              handleToggleTask={handleToggleTask}
              handleDeleteTask={handleDeleteTask}
            />
          </div>
        </section>

        {/* Recent Sessions */}
        <section className="border-2 border-black bg-[#FAF7F2] overflow-hidden rounded-2xl shadow-[2px_2px_0px_#1A1A1A]">
          <div className="p-3.5 border-b-2 border-black flex justify-between items-center bg-white">
            <h3 className="text-[12px] font-black uppercase tracking-wider">Recent Sessions</h3>
            <button onClick={() => navigate("/analytics")} className="text-[11px] font-black text-[#FF4D2E] hover:underline cursor-pointer">
              View All
            </button>
          </div>
          <RecentSessionsRows sessions={sessions} loadingSessions={loadingSessions} />
        </section>
      </main>

    </div>
  );
}
