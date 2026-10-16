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
import { ExamCountdownBanner } from "@/components/ExamCountdownBanner";
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

// 4 Primary Core Study Tools (The essential daily academic workflow)
const CORE_TOOLS = [
  {
    route: "/ai-tutor",
    icon: "forum",
    title: "Rex Tutor",
    desc: "Interactive AI study coach & voice mentor",
    color: "text-[#FF4D2E]",
    badge: "AI Mentor",
  },
  {
    route: "/practice",
    icon: "assignment",
    title: "Practice Tests",
    desc: "Active recall quizzes & mock exams",
    color: "text-[#F5A623]",
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
] as const;

// 12 Secondary Specialized Tools (expandable drawer)
const SECONDARY_TOOLS = [
  { route: "/community",      icon: "menu_book",      title: "Campus Vault",     desc: "Curated peer study guides",      color: "text-[#10B981]" },
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

// Call Rex Hero Banner Component
function CallRexBanner({ navigate }: { navigate: any }) {
  const [hasCalled, setHasCalled] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("pz_has_called_rex")) {
      setHasCalled(true);
    }
  }, []);

  const handleCall = () => {
    localStorage.setItem("pz_has_called_rex", "true");
    setHasCalled(true);
    navigate("/call");
  };

  if (hasCalled) {
    // Collapsed version for returning users
    return (
      <div className="border-2 border-black rounded-2xl bg-white p-3.5 md:p-4 flex items-center justify-between shadow-[3px_3px_0px_#1A1A1A] w-full max-w-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-black bg-[#FFD13B] p-1 shrink-0 flex items-center justify-center shadow-[1px_1px_0px_#1A1A1A]">
            <img src="/fox/fox-happy.png" alt="Rex Head" className="w-full h-full object-contain" />
          </div>
          <div>
            <h3 className="text-[14px] font-black tracking-tight leading-none text-black">Talk to Rex</h3>
            <p className="text-[11.5px] font-bold text-black/55 mt-0.5">Voice chat tutor</p>
          </div>
        </div>
        <button onClick={handleCall} className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center border-2 border-black hover:bg-[#FF4D2E] transition-all shadow-[2px_2px_0px_#1A1A1A] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer">
          <span className="material-symbols-outlined text-[19px]">phone_in_talk</span>
        </button>
      </div>
    );
  }

  // Hero version for first-time users
  return (
    <div className="border-2 border-black rounded-2xl bg-[#ae2925] overflow-hidden relative shadow-[4px_4px_0px_#1A1A1A] max-w-2xl">
      <div className="absolute right-0 top-0 bottom-0 w-[40%] bg-cover bg-left opacity-30 mix-blend-luminosity" style={{ backgroundImage: "url('/fox/call_bg.jpg')" }} />
      <div className="absolute right-[-10px] bottom-[-10px] w-36 h-36 pointer-events-none">
        <img src="/fox/fox-happy.png" alt="Rex Mascot" className="w-full h-full object-contain drop-shadow-xl" />
      </div>

      <div className="relative z-10 p-5 md:p-7 w-[72%]">
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white text-black font-black uppercase text-[10px] tracking-wider rounded border-2 border-black mb-2.5 shadow-[1px_1px_0px_#000]">
          <span className="material-symbols-outlined text-[12px] text-orange-500">campaign</span>
          Voice Tutor
        </div>
        <h2 className="text-[20px] md:text-[24px] font-black text-white leading-tight mb-1.5">Practice speaking out loud.</h2>
        <p className="text-white/85 font-bold text-[12.5px] md:text-[14px] mb-4 max-w-[280px] leading-snug">
          Talk through concepts with Rex in a live voice call.
        </p>
        <button onClick={handleCall} className="bg-white text-black border-2 border-black font-black uppercase tracking-wider text-[12px] px-5 py-2.5 rounded-full shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none active:bg-gray-100 transition-all flex items-center gap-2 cursor-pointer">
          <span className="material-symbols-outlined text-[17px]">phone_in_talk</span>
          Call Rex
        </button>
      </div>
    </div>
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

      {/* ── MOBILE TOP BAR ───────────────────────────────────────────────────────── */}
      <header className="md:hidden h-16 w-full px-5 flex items-center justify-between bg-[#FFFDF5] z-40 sticky top-0 border-b-2 border-black">
        <div className="text-[20px] font-black tracking-tight text-black flex items-center gap-1.5">
          <span>STUDENIUS</span>
          <span className="w-2 h-2 rounded-full bg-[#FF4D2E]" />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => { playPop(); navigate("/sources"); }}
            className="w-9 h-9 border-2 border-black rounded-lg bg-white shadow-[2px_2px_0px_#1A1A1A] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center justify-center transition-all cursor-pointer"
            title="Source Library"
          >
            <span className="material-symbols-outlined text-[20px] text-black">attach_file</span>
          </button>
          <button
            type="button"
            onClick={() => { playPop(); navigate("/pro"); }}
            className="px-3 py-1.5 rounded-full border-2 border-black bg-[#FFD13B] shadow-[2px_2px_0px_#1A1A1A] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[15px] text-black" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
            <span className="text-[11px] font-black text-black uppercase tracking-wider">{isPro ? "PRO" : "GO PRO"}</span>
          </button>
          <button
            type="button"
            onClick={() => { playPop(); navigate("/profile"); }}
            className="w-9 h-9 rounded-full bg-[#FF4D2E] text-white border-2 border-black shadow-[2px_2px_0px_#1A1A1A] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center justify-center font-black text-[13px] cursor-pointer transition-all"
          >
            {displayName.slice(0, 1).toUpperCase()}
          </button>
        </div>
      </header>

      {/* ── DESKTOP LAYOUT ──────────────────────────────────────────────────────── */}
      <div className="hidden md:block md:ml-64 h-full overflow-y-auto p-12">

        {/* Desktop Header */}
        <header className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-[32px] font-black leading-tight text-black">Good morning, {displayName}.</h2>
            <p className="text-[16px] font-bold text-black/60 mt-1">
              {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} &bull; Keep the streak alive
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => tutorial.show()} className="w-10 h-10 flex items-center justify-center border-2 border-black bg-white hover:bg-black hover:text-white transition-colors shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer">
              <span className="material-symbols-outlined text-[20px]">help</span>
            </button>
          </div>
        </header>

        {/* Exam Countdown Banner (Permanent: Active Countdown or 'No exam yet' empty state) */}
        <div className="mb-8">
          <ExamCountdownBanner
            examTarget={userPrefs?.examTarget}
            onUpdate={handleUpdateExamTarget}
            quizAccuracy={quizAccuracy}
            sessionsCount={sessions.length}
            tasksCompleted={tasks.filter((t) => t.completed).length}
          />
        </div>

        {/* Desktop Top Command Deck */}
        <div className="grid grid-cols-12 gap-6 mb-8">
          
          {/* Card 1 (Col 7): 1-Tap Daily Focus Mission */}
          <section className="col-span-7 border-2 border-black rounded-2xl bg-[#FF4D2E] text-white p-5 relative overflow-hidden shadow-[0px_4px_0px_#1A1A1A] flex flex-col justify-between">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-black text-white font-black uppercase text-[10px] tracking-wider rounded-lg border border-white/20">
                  <span className="material-symbols-outlined text-[13px] text-[#FFD13B]">bolt</span>
                  Daily Focus &bull; {primarySubjectMeta.name}
                </div>
                <span className="text-[11px] font-black uppercase tracking-wider text-white/80">
                  Estimated 5 mins
                </span>
              </div>
              <h3 className="text-[22px] font-black leading-tight mb-1">Boost retention in 5 minutes</h3>
              <p className="text-[13px] font-semibold text-white/90 max-w-md leading-relaxed mb-4">
                Rex prepared an active recall set for {primarySubjectMeta.name} tailored to your {activeGoalMeta.label.toLowerCase()} goal.
              </p>
            </div>

            <div className="relative z-10 flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => { playSuccess(); navigate(primarySubjectMeta.recommendedTool); }}
                className="bg-white text-black border-2 border-black font-black uppercase text-[12px] tracking-wider px-5 py-2.5 rounded-full shadow-[0px_3px_0px_#1A1A1A] hover:-translate-y-0.5 hover:shadow-[0px_5px_0px_#1A1A1A] active:translate-y-[2px] active:shadow-[0px_1px_0px_#1A1A1A] hover:bg-[#FFD13B] transition-all flex items-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                Launch Practice
              </button>

              <div className="flex items-center gap-2 text-[12px] font-extrabold text-white/80 bg-black/20 px-3 py-1.5 rounded-xl border border-white/10">
                <span className="material-symbols-outlined text-[16px] text-[#FFD13B]">auto_awesome</span>
                <span>Active Recall &bull; Spaced Repetition</span>
              </div>
            </div>

            {/* Rex Mascot in Top Right — Fully visible, vivid, friendly character */}
            <div className="absolute right-3 -bottom-2 w-32 h-32 pointer-events-none transition-transform hover:scale-105">
              <img src="/fox/fox-happy.png" alt="Rex Mascot" className="w-full h-full object-contain drop-shadow-md" />
            </div>
          </section>

          {/* Card 2 (Col 5): Talk to Rex & Daily Coach Tip */}
          <section className="col-span-5 flex flex-col gap-3.5 justify-between">
            <CallRexBanner navigate={navigate} />

            <div className="border-2 border-black rounded-2xl bg-white p-4 shadow-[0px_3px_0px_#1A1A1A] flex items-start gap-3 flex-1">
              <div className="w-10 h-10 rounded-xl border-2 border-black bg-[#FFD13B] p-0.5 shrink-0 flex items-center justify-center shadow-[0px_2px_0px_#1A1A1A]">
                <img src="/fox/fox-happy.png" alt="Rex" className="w-full h-full object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-black/40">Rex Coaching Tip</span>
                  <span className="text-[9.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border border-black/15 bg-[#FAF7F2] text-black/60">
                    {activeGoalMeta.badge}
                  </span>
                </div>
                <p className="text-[12.5px] font-extrabold text-black leading-snug">
                  "{activeGoalMeta.rexQuote}"
                </p>
              </div>
            </div>
          </section>

        </div>

        {/* Desktop Bento Grid */}
        <div className="grid grid-cols-12 gap-6">

          {/* Stats Row: Today's Goal + Total Sessions + Time Studied */}
          <div className="col-span-8 grid grid-cols-3 gap-6">

            {/* Today's Goal */}
            <section className="border-2 border-black bg-white p-4 flex flex-col items-center text-center relative overflow-hidden rounded-2xl shadow-[0px_4px_0px_#000]">
              <div className="absolute top-0 left-0 w-full h-1 bg-[#FF4D2E]" />
              <div className="text-[10px] font-black uppercase tracking-wider text-black/50 self-start mb-3">Today's Goal</div>
              <div className="relative w-24 h-24 flex items-center justify-center mb-2">
                <svg className="w-full h-full -rotate-90">
                  <circle className="text-[#E8E4DC]" cx="48" cy="48" fill="transparent" r="42" stroke="currentColor" strokeWidth="6" />
                  <circle
                    className="text-black"
                    cx="48" cy="48" fill="transparent" r="42"
                    stroke="currentColor" strokeWidth="6"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    style={{ transition: "stroke-dashoffset 0.5s ease" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[22px] font-black leading-tight">{completedCount}/{goalCount}</span>
                </div>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-black/50">Sessions</span>
            </section>

            {/* Total Sessions */}
            <section className="border-2 border-black bg-white p-4 flex flex-col justify-between relative rounded-2xl shadow-[0px_4px_0px_#000]">
              <div className="text-[10px] font-black uppercase tracking-wider text-black/50">Total Sessions</div>
              <div>
                <div className="text-[48px] font-black leading-none text-black">{stats.totalSessions}</div>
                <div className="text-[10px] font-black uppercase tracking-wider text-black/40 mt-1">Lifetime</div>
              </div>
            </section>

            {/* Time Studied */}
            <section className="border-2 border-black bg-white p-4 flex flex-col justify-between relative rounded-2xl shadow-[0px_4px_0px_#000]">
              <div className="text-[10px] font-black uppercase tracking-wider text-black/50">Time Studied</div>
              <div>
                <div className="text-[48px] font-black leading-none text-[#FF4D2E]">{stats.studyTimeHours}h</div>
                <div className="text-[10px] font-black uppercase tracking-wider text-black/40 mt-1">Total Hours</div>
              </div>
            </section>
          </div>

          {/* Quest Log — tall right column spanning 2 rows */}
          <section className="col-span-4 row-span-2 border-2 border-black bg-white flex flex-col rounded-2xl shadow-[0px_4px_0px_#000] overflow-hidden">
            <div className="p-4 border-b-2 border-black flex items-center justify-between bg-[#FAF7F2]/50">
              <h3 className="text-[13px] font-black uppercase tracking-wider">Quest Log</h3>
              <span className="material-symbols-outlined text-[20px]">history_edu</span>
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

          {/* 4-Tool Core Study Dock + Expandable 12-Tool Drawer */}
          <section className="col-span-8 border-2 border-black bg-white rounded-2xl p-6 shadow-[0px_4px_0px_#1A1A1A]">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2.5">
                <h3 className="text-[14px] font-black uppercase tracking-wider text-black">Core Study Dock</h3>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-black/15 bg-[#FAF7F2] text-black/60">
                  4 Primary Actions
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
                <span>{showAllTools ? "Collapse Tools" : "+ More Tools (12)"}</span>
                <span className="material-symbols-outlined text-[16px] transition-transform">
                  {showAllTools ? "expand_less" : "expand_more"}
                </span>
              </button>
            </div>

            {/* 4 Primary Tools with generous padding and ZERO text truncation */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              {CORE_TOOLS.map((tool) => (
                <button
                  key={"core-" + tool.route}
                  onClick={() => {
                    playPop();
                    navigate(tool.route);
                  }}
                  className="border-2 border-black bg-[#FAF7F2] hover:bg-white p-4 flex flex-col justify-between min-h-[136px] rounded-2xl text-left shadow-[0px_3px_0px_#1A1A1A] hover:-translate-y-1 hover:shadow-[0px_5px_0px_#1A1A1A] active:translate-y-[2px] active:shadow-[0px_1px_0px_#1A1A1A] transition-all group cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-11 h-11 rounded-xl bg-white border-2 border-black/15 group-hover:border-black flex items-center justify-center shadow-xs transition-colors">
                      <span className={`material-symbols-outlined text-[24px] ${tool.color}`}>{tool.icon}</span>
                    </div>
                    <span className="text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border border-black/10 bg-white text-black/50 group-hover:border-black/30 transition-colors">
                      {tool.badge}
                    </span>
                  </div>
                  <div>
                    <div className="text-[15px] font-black text-black leading-tight group-hover:text-[#FF4D2E] transition-colors">
                      {tool.title}
                    </div>
                    <p className="text-[11.5px] font-bold text-black/60 mt-1 leading-snug">
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
                      className="border-2 border-black bg-white hover:bg-[#FAF7F2] p-2.5 flex items-center gap-2.5 rounded-xl shadow-[0px_2px_0px_#1A1A1A] hover:-translate-y-0.5 hover:shadow-[0px_3px_0px_#1A1A1A] active:translate-y-[1px] active:shadow-none transition-all group text-left cursor-pointer"
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

          {/* Weekly Momentum */}
          <section className="col-span-8 border-2 border-black bg-white p-4 rounded-2xl shadow-[0px_4px_0px_#000]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[13px] font-black uppercase tracking-wider">Weekly Momentum</h3>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-black text-white text-[11px] font-black uppercase tracking-wider rounded-lg">Study Hours</span>
                <span className="px-3 py-1 border-[1.5px] border-black text-[11px] font-black uppercase tracking-wider rounded-lg">Goals Met</span>
              </div>
            </div>
            <WeeklyBars daysOfWeek={daysOfWeek} dayMinutes={dayMinutes} studiedDays={studiedDays} />
          </section>

          {/* Academic Streak */}
          <section className="col-span-4 border-2 border-black bg-[#FF4D2E] text-white p-4 flex flex-col justify-between min-h-[200px] rounded-2xl shadow-[0px_4px_0px_#000]">
            <div className="flex justify-between items-start">
              <h3 className="text-[13px] font-black uppercase tracking-wider">Academic Streak</h3>
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
            </div>
            <div className="flex items-baseline gap-2 my-2">
              <span className="text-[64px] font-black leading-none"><AnimatedCounter value={profile?.streak_days ?? 0} /></span>
              <span className="text-[24px] font-black uppercase">Days</span>
            </div>
            <p className="text-[12px] font-bold opacity-90">
              {(profile?.streak_days ?? 0) > 0 ? `${profile?.streak_days} day streak — keep it going!` : "Start your first session to build your streak."}
            </p>
          </section>

          {/* Recent Sessions — full width */}
          <section className="col-span-12 border-2 border-black bg-[#FAF7F2] overflow-hidden rounded-2xl shadow-[0px_4px_0px_#000]">
            <div className="p-4 border-b-2 border-black flex justify-between items-center bg-white">
              <h3 className="text-[13px] font-black uppercase tracking-wider">Recent Sessions</h3>
              <button onClick={() => navigate("/analytics")} className="text-[13px] font-extrabold text-[#FF4D2E] hover:underline cursor-pointer">
                View All
              </button>
            </div>
            <RecentSessionsRows sessions={sessions} loadingSessions={loadingSessions} />
          </section>

        </div>
      </div>

      {/* ── MOBILE LAYOUT ───────────────────────────────────────────────────────── */}
      <main className="md:hidden px-4 pt-4 pb-28 flex flex-col gap-3.5 overflow-y-auto h-full">

        {/* Greeting Header */}
        <section className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-[19px] sm:text-[21px] font-black leading-tight tracking-tight text-black">
                Good morning, {displayName}.
              </h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-[12px] text-black/55 font-bold">
                  {new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                </span>
                <span className="w-1 h-1 rounded-full bg-black/30" />
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-black bg-[#FFD13B] text-black shadow-[1px_1px_0px_#1A1A1A]">
                  {activeGoalMeta.badge}
                </span>
              </div>
            </div>

            {/* Rex Head Mascot Icon */}
            <div className="w-11 h-11 rounded-2xl bg-[#FFD13B] border-2 border-black flex items-center justify-center p-1 flex-shrink-0 shadow-[2px_2px_0px_#1A1A1A]">
              <img src="/fox/fox-happy.png" alt="Rex Head" className="w-full h-full object-contain" />
            </div>
          </div>

          {/* Rex Personalized Motivational Coach Bubble */}
          <div className="border-2 border-black rounded-xl bg-white p-3 flex items-start gap-2.5 shadow-[2px_2px_0px_#1A1A1A]">
            <span className="material-symbols-outlined text-[18px] text-[#AE2925] shrink-0 mt-0.5">format_quote</span>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-extrabold text-black leading-snug">
                "{activeGoalMeta.rexQuote}"
              </p>
              {primarySubjectMeta && (
                <span className="text-[9.5px] font-black uppercase tracking-wider text-black/45 mt-1 block">
                  Rex Tutor &bull; {primarySubjectMeta.name} Track
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Exam Countdown Banner (Permanent: Active Countdown or 'No exam yet' empty state) */}
        <ExamCountdownBanner
          examTarget={userPrefs?.examTarget}
          onUpdate={handleUpdateExamTarget}
          quizAccuracy={quizAccuracy}
          sessionsCount={sessions.length}
          tasksCompleted={tasks.filter((t) => t.completed).length}
        />

        {/* 1-Tap Daily Focus Launcher */}
        <section className="border-2 border-black rounded-2xl bg-[#FF4D2E] text-white p-4 relative overflow-hidden shadow-[3px_3px_0px_#1A1A1A]">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-black text-white font-black uppercase text-[9.5px] tracking-wider rounded border border-white/20">
              <span className="material-symbols-outlined text-[12px] text-[#FFD13B]">bolt</span>
              Daily Focus &bull; {primarySubjectMeta.name}
            </div>

            <div className="w-9 h-9 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center p-0.5 shrink-0 shadow-xs">
              <img src="/fox/fox-happy.png" alt="Rex Head" className="w-full h-full object-contain" />
            </div>
          </div>

          <h3 className="text-[17px] font-black leading-tight mb-1">Boost retention in 5 minutes</h3>
          <p className="text-[12px] font-semibold text-white/90 mb-3 leading-snug max-w-xs">
            Rex prepared your active recall set for {primarySubjectMeta.name}.
          </p>

          <button
            type="button"
            onClick={() => { playSuccess(); navigate(primarySubjectMeta.recommendedTool); }}
            className="bg-white text-black border-2 border-black font-black uppercase text-[11.5px] tracking-wider px-4 py-2 rounded-full shadow-[2px_2px_0px_#1A1A1A] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none hover:bg-[#FFD13B] transition-all flex items-center gap-1.5 w-fit cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">play_arrow</span>
            Launch Practice
          </button>
        </section>

        {/* 4-Tool Core Study Dock — 4 Primary Actions */}
        <section className="flex flex-col gap-2">
          <div className="flex justify-between items-center px-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-black/60">Core Study Dock</span>
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
                className="min-h-[116px] border-2 border-black rounded-xl bg-white p-3 text-left shadow-[2px_2px_0px_#1A1A1A] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none hover:bg-[#FFFDF5] flex flex-col justify-between transition-all group cursor-pointer"
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
            <div className="p-3 border-2 border-black rounded-xl bg-white flex flex-col gap-2 mt-1 shadow-[2px_2px_0px_#1A1A1A] animate-in fade-in duration-150">
              <span className="text-[10px] font-black uppercase tracking-wider text-black/50">Specialized Tools</span>
              <div className="grid grid-cols-2 gap-2">
                {SECONDARY_TOOLS.map((tool) => (
                  <button
                    key={"sec-mob-" + tool.route}
                    type="button"
                    onClick={() => {
                      playPop();
                      navigate(tool.route);
                    }}
                    className="border-2 border-black bg-[#FAF7F2] hover:bg-white p-2.5 flex items-center gap-2 rounded-lg text-left transition-colors"
                  >
                    <span className={`material-symbols-outlined text-[18px] ${tool.color}`}>{tool.icon}</span>
                    <span className="text-[11.5px] font-black text-black truncate">{tool.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>


        {/* Talk to Rex Banner */}
        <div><CallRexBanner navigate={navigate} /></div>

        {/* Daily Quests & Progress */}
        <section className="flex flex-col gap-2.5">
          <div className="border-2 border-black rounded-xl bg-white p-3.5 shadow-[2px_2px_0px_#1A1A1A]">
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

          <div className="border-2 border-black rounded-xl bg-white overflow-hidden shadow-[3px_3px_0px_#1A1A1A]">
            <div className="p-3 border-b-2 border-black flex items-center justify-between bg-[#FFFDF5]">
              <span className="text-[12px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#AE2925]">checklist</span>
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
      </main>

    </div>
  );
}
