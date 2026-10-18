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
import { loadLibrary } from "@/lib/sourceContext";
import { AnimatedRex } from "@/components/AnimatedRex";
import { formatFriendlyName, getLocalGreeting } from "@/lib/formatName";
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

// 4 Slides of 4 Tools Each (4x4 = 16 Study Tools)
const STUDY_TOOLS_PAGES = [
  {
    id: "core",
    label: "Core Revision",
    tools: [
      {
        route: "/practice",
        icon: "assignment",
        title: "Practice Tests",
        desc: "Active recall quizzes & exam simulations",
        color: "text-black",
      },
      {
        route: "/flashcards",
        icon: "style",
        title: "Flashcards",
        desc: "Spaced repetition & memory reinforcement",
        color: "text-black",
      },
      {
        route: "/ai-tutor",
        icon: "forum",
        title: "Study Tutor",
        desc: "24/7 concept breakdown & Socratic dialogue",
        color: "text-black",
      },
      {
        route: "/notes",
        icon: "edit_document",
        title: "My Notes",
        desc: "Organize lecture notes & study docs",
        color: "text-black",
      },
    ],
  },
  {
    id: "focus",
    label: "Focus & Solving",
    tools: [
      {
        route: "/quick-study",
        icon: "edit_note",
        title: "Quick Study",
        desc: "High-yield cheat sheets & summaries",
        color: "text-black",
      },
      {
        route: "/math",
        icon: "calculate",
        title: "Math Solver",
        desc: "Step-by-step problem solver",
        color: "text-black",
      },
      {
        route: "/timer",
        icon: "timer",
        title: "Focus Timer",
        desc: "Pomodoro timer & study breaks",
        color: "text-black",
      },
      {
        route: "/visual-learner",
        icon: "visibility",
        title: "Visual Learner",
        desc: "Mind maps & concept diagrams",
        color: "text-black",
      },
    ],
  },
  {
    id: "coaching",
    label: "Coaching & Strategy",
    tools: [
      {
        route: "/teach-it",
        icon: "psychology",
        title: "Teach It",
        desc: "Feynman explanation technique",
        color: "text-black",
      },
      {
        route: "/planner",
        icon: "calendar_month",
        title: "Study Planner",
        desc: "Schedules & revision deadlines",
        color: "text-black",
      },
      {
        route: "/mistakes",
        icon: "playlist_remove",
        title: "Mistake Journal",
        desc: "Targeted error review",
        color: "text-black",
      },
      {
        route: "/challenges",
        icon: "military_tech",
        title: "Challenges",
        desc: "Daily quests & milestone rewards",
        color: "text-black",
      },
    ],
  },
  {
    id: "arena-lib",
    label: "Multiplayer & Library",
    tools: [
      {
        route: "/campus-vault",
        icon: "menu_book",
        title: "Campus Vault",
        desc: "Search & clone classmate study guides",
        color: "text-black",
      },
      {
        route: "/sources",
        icon: "folder_open",
        title: "Source Library",
        desc: "Upload syllabus, notes & PDFs",
        color: "text-black",
      },
      {
        route: "/rooms",
        icon: "sensors",
        title: "Live Battle",
        desc: "Kahoot-style 6-digit PIN multiplayer",
        color: "text-black",
      },
      {
        route: "/arcade",
        icon: "stadia_controller",
        title: "Arcade",
        desc: "Speed drills & memory games",
        color: "text-black",
      },
    ],
  },
] as const;

// ── Swipeable Study Tools Carousel Component (4x4 = 16 Tools on Mobile & PC) ──
function StudyToolsShelf({
  navigate,
  isMobile = false,
}: {
  navigate: any;
  isMobile?: boolean;
}) {
  const [currentPage, setCurrentPage] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToPage = (pageIndex: number) => {
    playTap();
    setCurrentPage(pageIndex);
    if (scrollRef.current) {
      const targetLeft = pageIndex * scrollRef.current.clientWidth;
      scrollRef.current.scrollTo({ left: targetLeft, behavior: "smooth" });
    }
  };

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, clientWidth } = scrollRef.current;
    if (clientWidth > 0) {
      const page = Math.round(scrollLeft / clientWidth);
      if (page >= 0 && page < STUDY_TOOLS_PAGES.length && page !== currentPage) {
        setCurrentPage(page);
      }
    }
  };

  const content = (
    <>
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <h3 className={isMobile ? "text-[11px] font-black uppercase tracking-wider text-black/60" : "text-[14px] font-black uppercase tracking-wider text-black"}>
            Study Tools
          </h3>
          <span className="text-[10px] font-black text-black/70 bg-black/5 px-2 py-0.5 rounded-full border border-black/10">
            {currentPage + 1}/{STUDY_TOOLS_PAGES.length}
          </span>
          <span className="hidden sm:inline-block text-[11px] font-bold text-black/45">
            &bull; {STUDY_TOOLS_PAGES[currentPage].label}
          </span>
        </div>

        {/* Quick page switch arrows */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-extrabold text-black/40 hidden xs:inline">
            Swipe or use arrows
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => scrollToPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 border-black transition-all ${
                currentPage === 0
                  ? "opacity-25 cursor-not-allowed bg-black/5"
                  : "bg-white hover:bg-black hover:text-white cursor-pointer shadow-[1px_1px_0px_#000] active:translate-y-0.5"
              }`}
              title="Previous 4 Tools"
              aria-label="Previous page"
            >
              <span className="material-symbols-outlined text-[15px]">chevron_left</span>
            </button>
            <button
              type="button"
              onClick={() => scrollToPage(Math.min(STUDY_TOOLS_PAGES.length - 1, currentPage + 1))}
              disabled={currentPage === STUDY_TOOLS_PAGES.length - 1}
              className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 border-black transition-all ${
                currentPage === STUDY_TOOLS_PAGES.length - 1
                  ? "opacity-25 cursor-not-allowed bg-black/5"
                  : "bg-white hover:bg-black hover:text-white cursor-pointer shadow-[1px_1px_0px_#000] active:translate-y-0.5"
              }`}
              title="Next 4 Tools"
              aria-label="Next page"
            >
              <span className="material-symbols-outlined text-[15px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* Swipeable Carousel Viewport */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none scroll-smooth w-full -mx-0.5"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {STUDY_TOOLS_PAGES.map((page, pIdx) => (
          <div key={`page-${pIdx}`} className="w-full shrink-0 snap-center px-0.5">
            <div className={isMobile ? "grid grid-cols-2 gap-2.5" : "grid grid-cols-2 lg:grid-cols-4 gap-3.5"}>
              {page.tools.map((tool) => (
                <button
                  key={"tool-" + tool.route}
                  type="button"
                  onClick={() => {
                    playPop();
                    navigate(tool.route);
                  }}
                  className={
                    isMobile
                      ? "min-h-[96px] border-2 border-black rounded-2xl bg-white p-3 text-left shadow-[2px_2px_0px_#1A1A1A] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none hover:bg-[#FFFDF5] flex flex-col justify-between transition-all group cursor-pointer"
                      : "border-2 border-black bg-[#FAF7F2] hover:bg-white p-4 flex flex-col justify-between min-h-[124px] rounded-2xl text-left shadow-[2px_2px_0px_#1A1A1A] hover:-translate-y-1 hover:shadow-[4px_4px_0px_#1A1A1A] active:translate-y-[1px] active:shadow-none transition-all group cursor-pointer"
                  }
                >
                  <div
                    className={
                      isMobile
                        ? "w-8 h-8 rounded-lg bg-[#FAF7F2] border border-black/15 flex items-center justify-center mb-1.5"
                        : "w-10 h-10 rounded-xl bg-white border-2 border-black/15 group-hover:border-black flex items-center justify-center shadow-xs transition-colors mb-3"
                    }
                  >
                    <span className={`material-symbols-outlined ${isMobile ? "text-[20px]" : "text-[22px]"} ${tool.color}`}>
                      {tool.icon}
                    </span>
                  </div>
                  <div>
                    <div
                      className={
                        isMobile
                          ? "text-[13px] font-black text-black leading-tight"
                          : "text-[14px] font-black text-black leading-tight group-hover:text-[#FF4D2E] transition-colors"
                      }
                    >
                      {tool.title}
                    </div>
                    <p
                      className={
                        isMobile
                          ? "text-[10.5px] text-black/60 font-bold mt-0.5 leading-snug"
                          : "text-[11px] font-bold text-black/60 mt-1 leading-snug"
                      }
                    >
                      {tool.desc}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination dots below carousel (4 dots for the 4 slides) */}
      <div className="flex items-center justify-center gap-1.5 pt-3 pb-0.5">
        {STUDY_TOOLS_PAGES.map((page, idx) => (
          <button
            key={page.id}
            type="button"
            onClick={() => scrollToPage(idx)}
            className={`h-2 rounded-full transition-all cursor-pointer ${
              currentPage === idx ? "w-6 bg-black" : "w-2 bg-black/20 hover:bg-black/40"
            }`}
            aria-label={`View ${page.label} (${idx + 1}/4)`}
            title={page.label}
          />
        ))}
      </div>
    </>
  );

  if (isMobile) {
    return <section className="flex flex-col gap-2">{content}</section>;
  }

  return (
    <section className="border-2 border-black bg-white rounded-3xl p-5 md:p-6 shadow-[3px_3px_0px_#1A1A1A]">
      {content}
    </section>
  );
}


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
  const filteredSessions = sessions.filter((s) => Number(s.duration_minutes || 0) >= 0.5);

  return (
    <div className="divide-y-2 divide-black">
      {loadingSessions ? (
        <div className="p-4 text-center text-xs font-bold text-slate-400">Loading sessions...</div>
      ) : filteredSessions.length === 0 ? (
        <div className="p-4 text-center text-xs font-bold text-slate-400">No sessions yet. Start studying!</div>
      ) : (
        filteredSessions.slice(0, 3).map((session, sIdx) => {
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
  allSessions = [],
  quizAccuracy,
  sessionsCount,
  tasksCompleted,
  navigate,
}: {
  displayName: string;
  primarySubjectMeta: any;
  activeGoalMeta: any;
  examTarget?: ExamTarget | null;
  allSessions?: any[];
  quizAccuracy: number;
  sessionsCount: number;
  tasksCompleted: number;
  navigate: any;
}) {
  const libraryFiles = useMemo(() => loadLibrary(), []);
  const readiness = useMemo(() => {
    return calculateExamReadiness(examTarget, allSessions, libraryFiles, quizAccuracy, tasksCompleted);
  }, [examTarget, allSessions, libraryFiles, quizAccuracy, tasksCompleted]);

  const [dialogueIndex, setDialogueIndex] = useState(0);

  const dialogues = useMemo(() => {
    const list: string[] = [];
    if (examTarget?.examDate && readiness.daysLeft >= 0) {
      list.push(
        `Your ${examTarget.subject || primarySubjectMeta.name} exam is in ${readiness.daysLeft} days! Let's lock in 5 minutes of practice.`
      );
    } else if (libraryFiles && libraryFiles.length > 0) {
      const topDoc = libraryFiles[0].name.replace(/\.[^/.]+$/, "");
      list.push(`Pick up where you left off with "${topDoc}". Ready for a quick review?`);
    } else if (allSessions && allSessions.length > 0 && allSessions[0]?.title) {
      list.push(`Ready to continue with "${allSessions[0].title}"? Let's keep the momentum going.`);
    } else {
      list.push(`Welcome! Add your syllabus or notes in Library, or pick a study tool below to get started.`);
    }

    const subjectLabel = primarySubjectMeta.name === "General Studies" ? "your courses" : primarySubjectMeta.name;
    list.push(`${getLocalGreeting()}, ${displayName}! Ready to study ${subjectLabel} today?`);
    if (activeGoalMeta?.rexQuote) {
      list.push(`"${activeGoalMeta.rexQuote}"`);
    }
    list.push(`Tap Talk to speak out loud with me, or launch a practice set!`);
    return list;
  }, [displayName, examTarget, readiness.daysLeft, primarySubjectMeta.name, activeGoalMeta?.rexQuote, libraryFiles, allSessions]);

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

  const examLabel = examTarget?.examDate && readiness.daysLeft >= 0
    ? `${examTarget.subject || primarySubjectMeta.name} Exam in ${readiness.daysLeft}d`
    : (libraryFiles && libraryFiles.length > 0
        ? `${libraryFiles[0].name.replace(/\.[^/.]+$/, "").slice(0, 18)}`
        : `${primarySubjectMeta.name} Focus`);

  return (
    <div className="border-2 md:border-[2.5px] border-black rounded-2xl md:rounded-3xl bg-[#FFFDF5] p-4 md:p-6 shadow-[3px_3px_0px_#1A1A1A] md:shadow-[4px_4px_0px_#1A1A1A] relative overflow-hidden transition-all">
      {/* Top Header Pill Bar */}
      <div className="flex items-center justify-between gap-2 mb-3.5 pb-2.5 border-b border-black/10">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FFE566] text-black font-extrabold text-[11px] md:text-xs border border-black shadow-[1.5px_1.5px_0px_#1A1A1A]">
            <span className="material-symbols-outlined text-[14px]">event</span>
            <span>{examLabel}</span>
          </span>
          {readiness.score > 0 && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-black/60">
              <span>Readiness:</span>
              <strong className="text-black font-black">{readiness.score}%</strong>
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleRexClick}
          className="text-[10px] md:text-[11px] font-bold text-black/50 hover:text-black flex items-center gap-1 cursor-pointer transition-colors"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Tap Rex to change dialogue</span>
        </button>
      </div>

      {/* Main Row: Standing Rex + Speech & Action Column */}
      <div className="relative z-10 flex flex-col sm:flex-row items-center gap-4 md:gap-6">
        {/* Animated Rex Character (Standing naturally on soft floor shadow) */}
        <div
          onClick={handleRexClick}
          className="shrink-0 flex flex-col items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-transform"
          title="Tap Rex to interact"
        >
          <AnimatedRex
            state="idle"
            size="md"
            interactive={true}
            onClick={handleRexClick}
          />
        </div>

        {/* Content Column */}
        <div className="flex-1 min-w-0 w-full flex flex-col justify-between gap-3 text-left">
          {/* Neobrutalist Speech Bubble */}
          <div className="relative bg-white border-2 border-black rounded-xl md:rounded-2xl p-3.5 md:p-4 shadow-[2px_2px_0px_#1A1A1A]">
            <p className="text-[13px] md:text-[15px] font-extrabold text-black leading-snug">
              {currentSpeech}
            </p>
          </div>

          {/* Action Buttons Row */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleCall}
              className="min-h-[42px] md:min-h-[46px] bg-[#FFE566] hover:bg-black hover:text-white text-black border-2 border-black font-black uppercase text-[11px] md:text-[12px] tracking-wider px-3 md:px-4 py-2 rounded-xl shadow-[2px_2px_0px_#1A1A1A] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer group"
            >
              <span className="material-symbols-outlined text-[17px] group-hover:rotate-12 transition-transform">phone_in_talk</span>
              <span>Talk</span>
            </button>

            <button
              type="button"
              onClick={handleLaunchPractice}
              className="min-h-[42px] md:min-h-[46px] bg-[#FF4D2E] hover:bg-black text-white border-2 border-black font-black uppercase text-[11px] md:text-[12px] tracking-wider px-3 md:px-4 py-2 rounded-xl shadow-[2px_2px_0px_#1A1A1A] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[17px]">bolt</span>
              <span>Daily Focus</span>
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
          onClick={() => { playTap(); navigate("/sources"); }}
          className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-[#FAF7F2] hover:bg-[#FFE566] border-2 border-black flex items-center justify-center text-black shrink-0 transition-colors cursor-pointer shadow-xs"
          title="Open Source Library (Upload notes & documents)"
        >
          <span className="material-symbols-outlined text-[15px] md:text-[17px]">attach_file</span>
        </button>

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
          {getLocalGreeting()}, {displayName}.
        </h2>
        <p className="text-[13px] md:text-[15px] font-bold text-black/60 mt-0.5">
          {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} &bull; Daily Study Hub
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
          <span className="material-symbols-outlined text-[15px] font-black leading-none">bolt</span>
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

  const rawName =
    user?.avatarConfig?.full_name ||
    (user as any)?.user_metadata?.full_name ||
    (profile as any)?.full_name ||
    (profile as any)?.username ||
    user?.name ||
    user?.email?.split("@")[0] ||
    "Scholar";
  const displayName = formatFriendlyName(rawName);

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
  const goalCount = tasks.length > 0 ? tasks.length : 1;
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
          <div
            onClick={() => { playPop(); navigate("/challenges"); }}
            className="flex items-center gap-1 px-2.5 py-0.5 rounded-full border-2 border-black bg-white shadow-xs cursor-pointer hover:bg-[#FAF7F2] transition-colors"
            title={`${profile?.streak_days ?? 1} Day Streak`}
          >
            <span className="text-[13px]">🔥</span>
            <span className="text-[11px] font-black text-black">{profile?.streak_days ?? 1}d</span>
          </div>

          {/* Level */}
          <div
            onClick={() => { playPop(); navigate("/analytics"); }}
            className="flex items-center gap-1 px-2.5 py-0.5 rounded-full border-2 border-black bg-[#FFE566] shadow-xs cursor-pointer hover:bg-[#FFD13B] transition-colors"
            title={`Level ${levelFromXp(profile?.total_xp ?? 0)} (${profile?.total_xp ?? 0} XP)`}
          >
            <span className="material-symbols-outlined text-[13px] font-black leading-none">bolt</span>
            <span className="text-[11px] font-black text-black">LVL {levelFromXp(profile?.total_xp ?? 0)}</span>
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
              allSessions={sessions}
              quizAccuracy={quizAccuracy}
              sessionsCount={sessions.length}
              tasksCompleted={tasks.filter((t) => t.completed).length}
              navigate={navigate}
            />

            {/* Knowunity-style Persistent AI Composer Bar */}
            <AskRexBottomBar navigate={navigate} />

            {/* Swipeable Study Tools Carousel */}
            <StudyToolsShelf navigate={navigate} isMobile={false} />

            {/* Exam Countdown Banner (Permanent: Active Countdown or 'No exam yet' empty state) */}
            <ExamCountdownBanner
              examTarget={userPrefs?.examTarget}
              onUpdate={handleUpdateExamTarget}
              allSessions={sessions}
              quizAccuracy={quizAccuracy}
              sessionsCount={sessions.length}
              tasksCompleted={tasks.filter((t) => t.completed).length}
            />

            {/* Weekly Momentum */}
            <section className="border-2 border-black bg-white p-5 rounded-3xl shadow-[3px_3px_0px_#1A1A1A]">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-[13px] font-black uppercase tracking-wider text-black">Weekly Momentum</h3>
                  <p className="text-[11px] font-bold text-black/50 mt-0.5">
                    {dayMinutes.reduce((a, b) => a + b, 0) >= 60
                      ? `${Math.round((dayMinutes.reduce((a, b) => a + b, 0) / 60) * 10) / 10}h logged this week · ${stats.studyTimeHours}h all-time`
                      : `${dayMinutes.reduce((a, b) => a + b, 0)}m logged this week · ${stats.studyTimeHours}h all-time`}
                  </p>
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
          allSessions={sessions}
          quizAccuracy={quizAccuracy}
          sessionsCount={sessions.length}
          tasksCompleted={tasks.filter((t) => t.completed).length}
          navigate={navigate}
        />

        {/* Persistent Ask Rex Composer Bar */}
        <AskRexBottomBar navigate={navigate} />

        {/* Swipeable Study Tools Carousel */}
        <StudyToolsShelf navigate={navigate} isMobile={true} />

        {/* Exam Countdown Banner (Permanent: Active Countdown or 'No exam yet' empty state) */}
        <ExamCountdownBanner
          examTarget={userPrefs?.examTarget}
          onUpdate={handleUpdateExamTarget}
          allSessions={sessions}
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
