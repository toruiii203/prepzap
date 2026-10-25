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
import { triggerXPBurst } from "@/components/FloatingXPBurst";
import confetti from "canvas-confetti";
import { ExamCountdownBanner } from "@/components/ExamCountdownBanner";
import { AnimatedRex } from "@/components/AnimatedRex";
import { StreakCelebrationModal } from "@/components/StreakCelebrationModal";
import { StreakRiskBanner } from "@/components/StreakRiskBanner";
import { StudyPathMap } from "@/components/StudyPathMap";
import { MasteryRingsRow } from "@/components/MasteryRingsRow";
import { SessionSummaryCard } from "@/components/SessionSummaryCard";
import { AmbientSoundToggle } from "@/components/AmbientSoundToggle";
import { getRexContext } from "@/lib/rexContext";
import { launchPathLesson } from "@/lib/lessonLauncher";
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

// ── Swipeable Study Tools Carousel Component (4x4 = 16 Tools on Mobile & PC, Collapsible) ──
function StudyToolsShelf({
  navigate,
  isMobile = false,
}: {
  navigate: any;
  isMobile?: boolean;
}) {
  const [currentPage, setCurrentPage] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem("pz_study_tools_collapsed") === "true";
    } catch {
      return false;
    }
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  const toggleCollapse = () => {
    playTap();
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("pz_study_tools_collapsed", String(next));
      } catch {}
      return next;
    });
  };

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

  if (isCollapsed) {
    return (
      <section className="border-2 border-black bg-white rounded-2xl md:rounded-3xl p-3.5 sm:p-4 shadow-[2px_2px_0px_#1A1A1A] md:shadow-[3px_3px_0px_#1A1A1A] transition-all">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#FFE566] border border-black flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[16px] text-black" aria-hidden="true">build</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[13px] md:text-[14px] font-black uppercase tracking-wider text-black">
                  Study Tools
                </h3>
                <span className="text-[10px] font-black text-black/70 bg-black/5 px-2 py-0.5 rounded-full border border-black/10">
                  16 tools
                </span>
              </div>
              <p className="text-[10.5px] font-bold text-black/50 hidden sm:block">
                Practice, flashcards, tutor, math solver, quick study & more
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleCollapse}
            aria-label="Show study tools"
            className="px-3 py-1.5 rounded-xl border-2 border-black bg-[#FAF7F2] hover:bg-black hover:text-white flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider shadow-[1.5px_1.5px_0px_#000] active:translate-y-0.5 transition-all cursor-pointer"
          >
            <span>Show Tools</span>
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">keyboard_arrow_down</span>
          </button>
        </div>
      </section>
    );
  }

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

        {/* Quick page switch arrows + Hide Toggle */}
        <div className="flex items-center gap-2">
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
              <span className="material-symbols-outlined text-[15px]" aria-hidden="true">chevron_left</span>
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
              <span className="material-symbols-outlined text-[15px]" aria-hidden="true">chevron_right</span>
            </button>
          </div>

          {/* Hide button with Arrow */}
          <button
            type="button"
            onClick={toggleCollapse}
            aria-label="Hide study tools"
            className="px-2.5 py-1 rounded-xl border-2 border-black bg-[#FAF7F2] hover:bg-black hover:text-white flex items-center gap-1 text-[11px] font-black uppercase tracking-wider shadow-[1.5px_1.5px_0px_#000] active:translate-y-0.5 transition-all cursor-pointer"
          >
            <span>Hide</span>
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">keyboard_arrow_up</span>
          </button>
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
                    <span className={`material-symbols-outlined ${isMobile ? "text-[20px]" : "text-[22px]"} ${tool.color}`} aria-hidden="true">
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
    <section className="border-2 border-black bg-white rounded-3xl p-5 md:p-6 shadow-[3px_3px_0px_#1A1A1A] transition-all">
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
          <div className="flex flex-col items-center justify-center h-full text-center py-8 opacity-50">
            <span className="material-symbols-outlined text-[40px] mb-2" aria-hidden="true">task_alt</span>
            <p className="text-xs font-bold">No quests yet.<br />Add your first target below.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center gap-3 justify-between group">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleToggleTask(task.id, task.completed)}
                    aria-label={task.completed ? `Mark "${task.title}" incomplete` : `Mark "${task.title}" complete`}
                    className={`w-5 h-5 rounded-full border-2 border-black flex-shrink-0 cursor-pointer flex items-center justify-center transition-all active:scale-90 ${
                      task.completed ? "bg-[#10B981] shadow-none" : "bg-white hover:bg-[#FFFBEA] shadow-[1px_1px_0px_#000]"
                    }`}
                  >
                    {task.completed && <span className="material-symbols-outlined text-[13px] text-white font-black" aria-hidden="true">check</span>}
                  </button>
                  <div className={`text-[13.5px] font-extrabold truncate transition-opacity ${task.completed ? "line-through opacity-40 text-black" : "text-black"}`}>
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
                  aria-label={`Delete quest "${task.title}"`}
                  className="text-black/30 hover:text-[#FF4D2E] cursor-pointer transition-colors p-1"
                >
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">delete</span>
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
            aria-label="Add quest"
            className="border-2 border-black bg-black text-white px-3.5 flex items-center justify-center hover:bg-[#FF4D2E] transition-colors rounded-lg shadow-[2px_2px_0px_#1A1A1A] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">add</span>
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
        <div className="p-4 flex flex-col gap-2.5 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black/10 border border-black/20 rounded-lg shrink-0" />
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="h-3.5 bg-black/10 rounded w-3/4" />
              <div className="h-2.5 bg-black/10 rounded w-1/2" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black/10 border border-black/20 rounded-lg shrink-0" />
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="h-3.5 bg-black/10 rounded w-2/3" />
              <div className="h-2.5 bg-black/10 rounded w-1/3" />
            </div>
          </div>
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="p-4 text-center text-xs font-bold text-black/60 bg-white">
          <p className="font-extrabold text-[12.5px] text-black">Ready for your first session!</p>
          <p className="text-[11px] text-black/50 mt-0.5">Tap START on Unit 1 to begin tracking.</p>
        </div>
      ) : (
        filteredSessions.slice(0, 3).map((session, sIdx) => {
          const formattedDate = new Date(session.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
          const icons = ["science", "calculate", "history_edu"];
          const bgs = ["bg-black", "bg-[#b61b00]", "bg-[#858480]"];
          return (
            <div key={session.id || sIdx} className="p-3.5 sm:p-4 flex justify-between items-center bg-white hover:bg-[#f3f3f3] transition-colors">
              <div className="flex items-center gap-3.5">
                <div className={`w-10 h-10 border-2 border-black flex items-center justify-center text-white flex-shrink-0 ${bgs[sIdx % 3]}`}
                  style={{ boxShadow: "1.5px 1.5px 0px #000" }}>
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{icons[sIdx % 3]}</span>
                </div>
                <div>
                  <div className="text-[13.5px] font-extrabold text-black leading-tight">{session.title}</div>
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

// ── Smart Query Guessing & Autocomplete Suggestions Database ──
interface SearchQuerySuggestion {
  id: string;
  query: string;
  category: "quiz" | "flashcards" | "tutor" | "math" | "tool" | "note";
  categoryLabel: string;
  categoryBg: string;
  icon: string;
  route?: string;
  topic?: string;
  actionText: string;
}

const SEARCH_SUGGESTIONS: SearchQuerySuggestion[] = [
  // High-Yield Disciplines & Subjects
  {
    id: "bio-mitosis",
    query: "Biology: Cell division, stages of mitosis vs meiosis",
    category: "quiz",
    categoryLabel: "QUIZ",
    categoryBg: "bg-[#FF4D2E] text-white",
    icon: "bolt",
    route: "/practice",
    topic: "Cell division and mitosis stages",
    actionText: "Start 5-Q Quiz",
  },
  {
    id: "bio-respiration",
    query: "Biology: Cellular respiration, glycolysis & ATP cycle",
    category: "tutor",
    categoryLabel: "TUTOR",
    categoryBg: "bg-[#FFE566] text-black",
    icon: "forum",
    route: "/ai-tutor",
    topic: "Explain cellular respiration and ATP",
    actionText: "Ask Rex",
  },
  {
    id: "bio-dna",
    query: "Biology: DNA structure, double helix & transcription",
    category: "flashcards",
    categoryLabel: "CARDS",
    categoryBg: "bg-[#3B82F6] text-white",
    icon: "style",
    route: "/flashcards",
    topic: "DNA and RNA mechanisms",
    actionText: "Practice Deck",
  },
  {
    id: "bio-photosynthesis",
    query: "Biology: Photosynthesis light reactions vs Calvin cycle",
    category: "quiz",
    categoryLabel: "QUIZ",
    categoryBg: "bg-[#FF4D2E] text-white",
    icon: "bolt",
    route: "/practice",
    topic: "Photosynthesis mechanisms",
    actionText: "Start 5-Q Quiz",
  },
  {
    id: "math-quadratic",
    query: "Math: Solve quadratic equations by factoring & formula",
    category: "math",
    categoryLabel: "SOLVER",
    categoryBg: "bg-[#10B981] text-white",
    icon: "calculate",
    route: "/math",
    topic: "Quadratic equations solving",
    actionText: "Step-by-Step",
  },
  {
    id: "math-derivative",
    query: "Calculus: Derivatives, power rule, product & chain rule",
    category: "math",
    categoryLabel: "SOLVER",
    categoryBg: "bg-[#10B981] text-white",
    icon: "calculate",
    route: "/math",
    topic: "Calculus derivatives step-by-step",
    actionText: "Step-by-Step",
  },
  {
    id: "math-trig",
    query: "Math: Trigonometric identities & unit circle values",
    category: "flashcards",
    categoryLabel: "CARDS",
    categoryBg: "bg-[#3B82F6] text-white",
    icon: "style",
    route: "/flashcards",
    topic: "Trig identities and unit circle",
    actionText: "Flashcards",
  },
  {
    id: "math-integrals",
    query: "Calculus: Integrals, substitution & integration by parts",
    category: "quiz",
    categoryLabel: "QUIZ",
    categoryBg: "bg-[#FF4D2E] text-white",
    icon: "bolt",
    route: "/practice",
    topic: "Calculus integration techniques",
    actionText: "Start 5-Q Quiz",
  },
  {
    id: "chem-periodic",
    query: "Chemistry: Periodic table trends, electronegativity & radius",
    category: "flashcards",
    categoryLabel: "CARDS",
    categoryBg: "bg-[#3B82F6] text-white",
    icon: "style",
    route: "/flashcards",
    topic: "Periodic table trends",
    actionText: "Flashcards",
  },
  {
    id: "chem-redox",
    query: "Chemistry: Balancing redox reactions in acidic solution",
    category: "tutor",
    categoryLabel: "TUTOR",
    categoryBg: "bg-[#FFE566] text-black",
    icon: "forum",
    route: "/ai-tutor",
    topic: "Step-by-step redox reaction balancing",
    actionText: "Ask Rex",
  },
  {
    id: "phys-newton",
    query: "Physics: Newton's laws of motion with real-world examples",
    category: "tutor",
    categoryLabel: "TUTOR",
    categoryBg: "bg-[#FFE566] text-black",
    icon: "forum",
    route: "/ai-tutor",
    topic: "Newton's three laws of motion",
    actionText: "Ask Rex",
  },
  {
    id: "phys-kinematics",
    query: "Physics: Kinematics equations for projectile motion",
    category: "quiz",
    categoryLabel: "QUIZ",
    categoryBg: "bg-[#FF4D2E] text-white",
    icon: "bolt",
    route: "/practice",
    topic: "Kinematics projectile motion",
    actionText: "Start 5-Q Quiz",
  },
  {
    id: "hist-ww2",
    query: "History: World War II major turning points & timeline",
    category: "quiz",
    categoryLabel: "QUIZ",
    categoryBg: "bg-[#FF4D2E] text-white",
    icon: "bolt",
    route: "/practice",
    topic: "World War II timeline and battles",
    actionText: "Start 5-Q Quiz",
  },
  {
    id: "hist-revolution",
    query: "History: American Revolution & Constitutional Convention",
    category: "tutor",
    categoryLabel: "TUTOR",
    categoryBg: "bg-[#FFE566] text-black",
    icon: "forum",
    route: "/ai-tutor",
    topic: "The American Revolution causes & outcome",
    actionText: "Ask Rex",
  },

  // Tool Direct Actions
  {
    id: "tool-practice",
    query: "Active recall practice test & exam simulation",
    category: "tool",
    categoryLabel: "TOOL",
    categoryBg: "bg-[#FAF7F2] text-black border border-black",
    icon: "quiz",
    route: "/practice",
    actionText: "Open Practice",
  },
  {
    id: "tool-flashcards",
    query: "Flashcards: spaced repetition & memory review",
    category: "tool",
    categoryLabel: "TOOL",
    categoryBg: "bg-[#FAF7F2] text-black border border-black",
    icon: "style",
    route: "/flashcards",
    actionText: "Open Decks",
  },
  {
    id: "tool-math",
    query: "Math solver: step-by-step problem solver",
    category: "tool",
    categoryLabel: "TOOL",
    categoryBg: "bg-[#FAF7F2] text-black border border-black",
    icon: "calculate",
    route: "/math",
    actionText: "Open Math",
  },
  {
    id: "tool-notes",
    query: "My Notes: lecture documents & study summaries",
    category: "tool",
    categoryLabel: "TOOL",
    categoryBg: "bg-[#FAF7F2] text-black border border-black",
    icon: "edit_document",
    route: "/notes",
    actionText: "Open Notes",
  },
  {
    id: "tool-timer",
    query: "Pomodoro focus timer & study interval timer",
    category: "tool",
    categoryLabel: "TOOL",
    categoryBg: "bg-[#FAF7F2] text-black border border-black",
    icon: "timer",
    route: "/timer",
    actionText: "Start Timer",
  },
  {
    id: "tool-quickstudy",
    query: "Quick Study: generate high-yield cheat sheets",
    category: "tool",
    categoryLabel: "TOOL",
    categoryBg: "bg-[#FAF7F2] text-black border border-black",
    icon: "menu_book",
    route: "/quick-study",
    actionText: "Open Cheats",
  },
  {
    id: "tool-arcade",
    query: "Arena battle & study arcade challenges",
    category: "tool",
    categoryLabel: "TOOL",
    categoryBg: "bg-[#FAF7F2] text-black border border-black",
    icon: "sports_esports",
    route: "/challenges",
    actionText: "Play Arena",
  },
];

// ── Persistent "Ask Rex" AI Composer Bar with Smart Query Guessing ──
function AskRexBottomBar({ navigate }: { navigate: any }) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter query guesses based on current query
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return SEARCH_SUGGESTIONS.slice(0, 5);
    }
    const startsWith: SearchQuerySuggestion[] = [];
    const wordStarts: SearchQuerySuggestion[] = [];
    const contains: SearchQuerySuggestion[] = [];

    SEARCH_SUGGESTIONS.forEach((item) => {
      const lower = item.query.toLowerCase();
      const topicLower = (item.topic || "").toLowerCase();
      const catLower = item.category.toLowerCase();
      const catLabel = item.categoryLabel.toLowerCase();

      if (lower.startsWith(q) || topicLower.startsWith(q)) {
        startsWith.push(item);
      } else if (
        lower.split(/[\s,.:;/-]+/).some((w) => w.startsWith(q)) ||
        topicLower.split(/[\s,.:;/-]+/).some((w) => w.startsWith(q))
      ) {
        wordStarts.push(item);
      } else if (
        lower.includes(q) ||
        topicLower.includes(q) ||
        catLower.includes(q) ||
        catLabel.includes(q)
      ) {
        contains.push(item);
      }
    });

    return [...startsWith, ...wordStarts, ...contains].slice(0, 5);
  }, [query]);

  // Compute inline ghost text completion
  const ghostText = useMemo(() => {
    if (!query.trim()) return "";
    const topMatch = suggestions[0];
    if (topMatch && topMatch.query.toLowerCase().startsWith(query.toLowerCase())) {
      return query + topMatch.query.slice(query.length);
    }
    return "";
  }, [query, suggestions]);

  // Dismiss dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
        setSelectedIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const executeSuggestion = (item: SearchQuerySuggestion) => {
    playSuccess();
    setIsFocused(false);
    setQuery("");

    if (item.route === "/practice" && item.topic) {
      launchPathLesson(
        item.topic,
        { id: item.id, title: item.topic, xp: 35, type: "practice" },
        navigate
      );
      return;
    }

    if (item.route === "/ai-tutor") {
      navigate(`/ai-tutor?prompt=${encodeURIComponent(item.topic || item.query)}`);
      return;
    }

    if (item.route) {
      navigate(item.route);
      return;
    }

    navigate(`/ai-tutor?prompt=${encodeURIComponent(item.query)}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIndex >= 0 && suggestions[selectedIndex]) {
      executeSuggestion(suggestions[selectedIndex]);
      return;
    }
    if (!query.trim()) return;
    playPop();
    setIsFocused(false);
    navigate(`/ai-tutor?prompt=${encodeURIComponent(query.trim())}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isFocused) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Tab" || (e.key === "ArrowRight" && inputRef.current?.selectionStart === query.length)) {
      if (ghostText && ghostText.length > query.length) {
        e.preventDefault();
        setQuery(ghostText);
      }
    } else if (e.key === "Escape") {
      setIsFocused(false);
      setSelectedIndex(-1);
    }
  };

  const handleMic = () => {
    playSuccess();
    navigate("/call");
  };

  return (
    <div ref={containerRef} className="w-full relative z-30">
      <form
        onSubmit={handleSubmit}
        className="relative flex items-center gap-2 bg-white border-2 border-black rounded-2xl md:rounded-full px-3 py-1.5 md:px-3.5 md:py-2 shadow-[2px_2px_0px_#1A1A1A] md:shadow-[3px_3px_0px_#1A1A1A] hover:shadow-[4px_4px_0px_#1A1A1A] transition-all"
      >
        <button
          type="button"
          onClick={() => { playTap(); navigate("/ai-tutor"); }}
          className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-[#FFE566] border-2 border-black flex items-center justify-center text-black shrink-0 cursor-pointer shadow-xs hover:bg-[#FFD13B] transition-colors"
          title="Open AI Tutor"
          aria-label="Open AI Tutor"
        >
          <span className="material-symbols-outlined text-[15px] md:text-[17px]" aria-hidden="true">forum</span>
        </button>

        {/* Search input with inline ghost completion container */}
        <div className="relative flex-1 flex items-center min-w-0">
          {/* Ghost Text Layer */}
          {ghostText && isFocused && (
            <div
              className="absolute left-0 top-0 bottom-0 pointer-events-none flex items-center text-[12.5px] md:text-[14px] font-bold text-black/25 overflow-hidden whitespace-nowrap"
              aria-hidden="true"
            >
              <span className="opacity-0">{query}</span>
              <span>{ghostText.slice(query.length)}</span>
              <span className="ml-2 text-[9.5px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded border border-black/20 bg-black/5 text-black/40 hidden sm:inline">
                Tab ⇥
              </span>
            </div>
          )}

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(-1);
            }}
            onFocus={() => setIsFocused(true)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Rex anything or type a topic to practice..."
            className="w-full bg-transparent border-none text-[12.5px] md:text-[14px] font-bold text-black outline-none placeholder:text-black/40 relative z-10"
          />
        </div>

        {/* Clear query button if typed */}
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setSelectedIndex(-1);
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            className="w-5 h-5 rounded-full bg-black/10 hover:bg-black/20 text-black flex items-center justify-center text-[12px] font-bold cursor-pointer"
          >
            ✕
          </button>
        )}

        <button
          type="button"
          onClick={() => { playTap(); navigate("/sources"); }}
          className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-[#FAF7F2] hover:bg-[#FFE566] border-2 border-black flex items-center justify-center text-black shrink-0 transition-colors cursor-pointer shadow-xs"
          title="Open Source Library (Upload notes & documents)"
          aria-label="Attach documents"
        >
          <span className="material-symbols-outlined text-[15px] md:text-[17px]" aria-hidden="true">attach_file</span>
        </button>

        <button
          type="button"
          onClick={handleMic}
          className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-[#FAF7F2] hover:bg-[#FF4D2E] hover:text-white border-2 border-black flex items-center justify-center text-black shrink-0 transition-colors cursor-pointer shadow-xs"
          title="Voice Talk with Rex"
          aria-label="Voice talk"
        >
          <span className="material-symbols-outlined text-[15px] md:text-[17px]" aria-hidden="true">mic</span>
        </button>

        <button
          type="submit"
          className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-black text-white hover:bg-[#FF4D2E] flex items-center justify-center shrink-0 transition-colors cursor-pointer shadow-xs"
          title="Search or Ask Rex"
          aria-label="Submit search"
        >
          <span className="material-symbols-outlined text-[15px] md:text-[17px]" aria-hidden="true">arrow_forward</span>
        </button>
      </form>

      {/* Floating Query Guessing & Autocomplete Dropdown */}
      {isFocused && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0px_#000] p-2 z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-3 py-1.5 flex items-center justify-between border-b border-black/10 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-black/50 flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]" aria-hidden="true">psychology</span>
              {query.trim() ? "Guessed Search Queries" : "Trending Study Queries & Tools"}
            </span>
            <span className="text-[10px] font-bold text-black/40 hidden sm:inline">
              Use ↑↓ to navigate &bull; Enter to select
            </span>
          </div>

          <div className="flex flex-col gap-1">
            {suggestions.map((item, idx) => {
              const isSelected = selectedIndex === idx;
              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    executeSuggestion(item);
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full text-left px-3 py-2 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? "bg-[#FFFDF5] border-black shadow-[1.5px_1.5px_0px_#000] translate-x-0.5"
                      : "bg-transparent border-transparent hover:bg-black/5"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md shrink-0 ${item.categoryBg}`}>
                      {item.categoryLabel}
                    </span>
                    <span className="text-[12.5px] font-bold text-black truncate">
                      {item.query}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10.5px] font-black text-black/70 bg-black/5 px-2 py-0.5 rounded-lg border border-black/10 hidden sm:inline-block">
                      {item.actionText}
                    </span>
                    <span className="material-symbols-outlined text-[16px] text-black/50" aria-hidden="true">
                      call_made
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
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
  onStreakClick,
  navigate,
}: {
  displayName: string;
  streakDays: number;
  totalXp: number;
  isPro: boolean;
  onOpenHelp?: () => void;
  onStreakClick?: () => void;
  navigate: any;
}) {
  const level = levelFromXp(totalXp);
  const rexContext = getRexContext({ streakDays });

  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 mb-6 md:mb-8">
      <div>
        <h2 className="text-[26px] md:text-[32px] font-black leading-tight text-black">
          {getLocalGreeting()}, {displayName}.
        </h2>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-[12.5px] md:text-[13.5px] font-extrabold text-black/70 flex items-center gap-1.5 flex-wrap">
            <span>{rexContext.badgeEmoji}</span>
            <span>{rexContext.headline}</span>
            <span className="text-black/30">&bull;</span>
            <span className="text-black/55">{rexContext.speechBubble}</span>
          </p>
        </div>
      </div>

      {/* Gamification Pills (shown on sm+, since mobile has them in the shell header) */}
      <div className="hidden sm:flex items-center gap-2.5 flex-wrap">
        {/* Streak Flame Badge */}
        <div
          onClick={() => {
            playPop();
            onStreakClick?.();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 border-black bg-white shadow-[2px_2px_0px_#000] cursor-pointer hover:bg-[#FFFDF5] active:translate-y-0.5 transition-all"
          title={`${streakDays} Day Streak`}
        >
          <span className="text-[15px] inline-block animate-flame-flicker">🔥</span>
          <span className="text-[12px] font-black text-black">{streakDays}d Streak</span>
        </div>

        {/* Level / XP Pill */}
        <div
          onClick={() => { playPop(); navigate("/analytics"); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 border-black bg-[#FFE566] shadow-[2px_2px_0px_#1A1A1A] cursor-pointer hover:bg-[#FFD13B] transition-all"
          title={`Level ${level} (${totalXp} XP)`}
          aria-label={`Level ${level}, ${totalXp} XP`}
          role="button"
        >
          <span className="material-symbols-outlined text-[15px] font-black leading-none" aria-hidden="true">bolt</span>
          <span className="text-[12px] font-black text-black">LVL {level}</span>
        </div>

        {/* Pro Pill */}
        <button
          type="button"
          onClick={() => { playPop(); navigate("/pro"); }}
          aria-label={isPro ? "Pro Account Active" : "Get Pro"}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 border-black shadow-[2px_2px_0px_#1A1A1A] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer font-black text-[11px] uppercase tracking-wider ${
            isPro ? "bg-[#10B981] text-white" : "bg-[#FF4D2E] text-white hover:bg-black"
          }`}
        >
          <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">
            {isPro ? "verified" : "workspace_premium"}
          </span>
          <span>{isPro ? "PRO" : "GET PRO"}</span>
        </button>

        {/* Phase 5B: Ambient Focus Rain Sound Toggle */}
        <AmbientSoundToggle />

        {/* Help button */}
        {onOpenHelp && (
          <button
            type="button"
            onClick={onOpenHelp}
            className="w-9 h-9 flex items-center justify-center border-2 border-black bg-white hover:bg-black hover:text-white transition-colors rounded-xl shadow-[2px_2px_0px_#1A1A1A] cursor-pointer"
            title="Help"
            aria-label="Help & Tutorial"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">help</span>
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
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [liveStreakDays, setLiveStreakDays] = useState<number>(() => profile?.streak_days ?? 1);

  useEffect(() => {
    if (profile?.streak_days !== undefined) {
      setLiveStreakDays(profile.streak_days);
    }
  }, [profile?.streak_days]);

  useEffect(() => {
    const handleStreakUpdated = (e: any) => {
      if (e.detail?.newStreak !== undefined) {
        setLiveStreakDays(e.detail.newStreak);
      }
    };
    window.addEventListener("studenius:streak-updated", handleStreakUpdated);
    return () => window.removeEventListener("studenius:streak-updated", handleStreakUpdated);
  }, []);

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
  const [loadingSessions, setLoadingSessions] = useState(false);

  const [stats, setStats] = useState({ totalSessions: 0, studyTimeHours: 0, avgScore: 0 });
  const [studiedDays, setStudiedDays] = useState<boolean[]>([false, false, false, false, false, false, false]);
  const [dayMinutes, setDayMinutes] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);

  useEffect(() => {
    fetchTasks();
    if (user?.id) {
      fetchSessions();
    } else {
      setLoadingSessions(false);
    }
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

  const studiedToday = useMemo(() => {
    const todayStr = new Date().toDateString();
    return (
      studiedDays[6] === true ||
      sessions.some((s) => new Date(s.created_at).toDateString() === todayStr) ||
      Boolean(profile?.last_active_at && new Date(profile.last_active_at).toDateString() === todayStr)
    );
  }, [studiedDays, sessions, profile?.last_active_at]);

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
            onClick={() => { playPop(); setShowStreakModal(true); }}
            className="flex items-center gap-1 px-2.5 py-0.5 rounded-full border-2 border-black bg-white shadow-xs cursor-pointer hover:bg-[#FAF7F2] transition-colors"
            title={`${liveStreakDays} Day Streak`}
          >
            <span className="text-[13px] animate-flame-flicker">🔥</span>
            <span className="text-[11px] font-black text-black">{liveStreakDays}d</span>
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

      {/* ── RESPONSIVE UNIFIED LAYOUT (Duolingo Learning Path Hero) ────────── */}
      <div className="md:ml-64 min-h-screen">
        <main className="p-4 sm:p-6 lg:p-8 max-w-6xl xl:max-w-7xl w-full mx-auto space-y-6 box-border pb-24 md:pb-8">

          {/* Top Header with greeting & gamification pills */}
          <DashboardHeader
            displayName={displayName}
            streakDays={liveStreakDays}
            totalXp={profile?.total_xp ?? 0}
            isPro={isPro}
            onOpenHelp={() => tutorial.show()}
            onStreakClick={() => setShowStreakModal(true)}
            navigate={navigate}
          />

          {/* Streak At Risk Banner (shown after 8 PM if user hasn't studied today) */}
          <StreakRiskBanner
            streakDays={liveStreakDays}
            studiedToday={studiedDays[6] || false}
            onSaveStreak={() => navigate("/practice?autostart=true&subject=math")}
          />

          {/* Main Responsive Grid: Single column on mobile, 12 cols (8 + 4) on md+ */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-7 items-start">

            {/* Main Hero Column: Search Bar + Study Tools Shelf (Top) + Learning Path Hero */}
            <div className="md:col-span-8 flex flex-col gap-5">

              {/* Persistent "Ask Rex" AI Search Bar with Predictive Query Guessing */}
              <AskRexBottomBar navigate={navigate} />

              {/* Swipeable Study Tools Carousel (with Hide/Show Arrow) */}
              <StudyToolsShelf navigate={navigate} isMobile={false} />

              {/* The Learning Path Hero (with Unit Guidebook Header) */}
              <StudyPathMap
                subjectName={primarySubjectMeta.name}
                onSelectNode={(node) => {
                  if (node.route) navigate(node.route);
                }}
                navigate={navigate}
              />
            </div>

            {/* Right Column / Secondary Rail (4 cols on desktop, flows below on mobile) */}
            <div className="md:col-span-4 flex flex-col gap-6">

              {/* Phase 4A: Subject Mastery Rings */}
              <MasteryRingsRow onSelectSubject={(subId) => navigate(`/practice?subject=${subId}`)} />

              {/* Today's Quest Checklist */}
              <section className="border-2 border-black bg-white flex flex-col rounded-3xl shadow-[3px_3px_0px_#1A1A1A] overflow-hidden">
                <div className="p-4 border-b-2 border-black flex items-center justify-between bg-[#FFFDF5]">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#FF4D2E]" aria-hidden="true">checklist</span>
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

              {/* Weekly Momentum */}
              <section className="border-2 border-black bg-white p-5 rounded-3xl shadow-[3px_3px_0px_#1A1A1A]">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-[13px] font-black uppercase tracking-wider text-black">Weekly Momentum</h3>
                    <p className="text-[11px] font-bold text-black/50 mt-0.5">
                      {dayMinutes.reduce((a, b) => a + b, 0) >= 60
                        ? `${Math.round((dayMinutes.reduce((a, b) => a + b, 0) / 60) * 10) / 10}h logged this week`
                        : dayMinutes.reduce((a, b) => a + b, 0) > 0
                        ? `${dayMinutes.reduce((a, b) => a + b, 0)}m logged this week`
                        : "Start Unit 1 to log your first minutes!"}
                    </p>
                  </div>
                  <span className="px-2.5 py-0.5 bg-black text-white text-[10px] font-black uppercase tracking-wider rounded-md">Hours</span>
                </div>
                <WeeklyBars daysOfWeek={daysOfWeek} dayMinutes={dayMinutes} studiedDays={studiedDays} />
              </section>

              {/* Compact Exam Target Countdown Banner */}
              <ExamCountdownBanner
                examTarget={userPrefs?.examTarget}
                onUpdate={handleUpdateExamTarget}
                allSessions={sessions}
                quizAccuracy={quizAccuracy}
                sessionsCount={sessions.length}
                tasksCompleted={tasks.filter((t) => t.completed).length}
              />

              {/* Recent Sessions */}
              <section className="border-2 border-black bg-[#FAF7F2] overflow-hidden rounded-3xl shadow-[3px_3px_0px_#1A1A1A]">
                <div className="p-3.5 border-b-2 border-black flex justify-between items-center bg-white">
                  <h3 className="text-[12px] font-black uppercase tracking-wider">Recent Sessions</h3>
                  <button onClick={() => navigate("/analytics")} className="text-[11px] font-black text-[#FF4D2E] hover:underline cursor-pointer">
                    View All
                  </button>
                </div>
                <RecentSessionsRows sessions={sessions} loadingSessions={loadingSessions} />
              </section>

            </div>

          </div>
        </main>
      </div>

      {/* Streak Celebration Modal with Dual-Core Flame, Floating Sparks, and Calendar */}
      <StreakCelebrationModal
        isOpen={showStreakModal}
        streakCount={liveStreakDays}
        onClose={() => setShowStreakModal(false)}
        onContinue={() => setShowStreakModal(false)}
      />

      {/* Phase 4C: Gentle Session Summary Card */}
      <SessionSummaryCard />

    </div>
  );
}
