import { useNavigate } from "react-router-dom";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { SharedSidebar } from "@/components/SharedSidebar";
import { useTutorialModal } from "@/hooks/useTutorialModal";
import { TutorialModal } from "@/components/TutorialModal";
import { TUTORIAL_CONTENT } from "@/lib/tutorialContent";
import { useAuth } from "@/contexts/AuthContext";
import { useStudyStats } from "@/hooks/useStudyStats";
import { supabase } from "@/lib/supabase";
import { usePlan } from "@/hooks/usePlan";
import { motion, animate } from "framer-motion";
import { playPop, playTap, playSuccess, playCelebration } from "@/lib/soundFX";
import { RexMascot } from "@/components/RexMascot";
import { useCommunity, CampusNote } from "@/hooks/useCommunity";
import { toast } from "sonner";
import {
  getStoredPreferences,
  SUBJECT_METADATA,
  GOAL_METADATA,
  STYLE_METADATA,
  type UserStudyPreferences
} from "@/lib/userPreferences";
import { levelFromXp, xpProgressPercent, xpToNextLevel } from "@/lib/xp";

function AnimatedCounter({ value, duration = 1.2 }: { value: number, duration?: number }) {
  const nodeRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const controls = animate(0, value, {
      duration: duration,
      ease: "easeOut",
      onUpdate(v) {
        if (nodeRef.current) {
          nodeRef.current.textContent = Math.round(v).toString();
        }
      }
    });
    return () => controls.stop();
  }, [value, duration]);
  return <span ref={nodeRef}>{value}</span>;
}

// 4 Primary Core Study Tools (No truncation, generous spacing)
const PRIMARY_TOOLS = [
  { 
    route: "/ai-tutor", 
    icon: "forum", 
    title: "Rex Tutor", 
    desc: "AI Voice & Text Mentor", 
    badge: "Voice & Chat",
    color: "text-[#FF4D2E]", 
    bg: "bg-[#FF4D2E]/10",
    border: "border-[#FF4D2E]"
  },
  { 
    route: "/practice", 
    icon: "assignment", 
    title: "Practice", 
    desc: "Gizmo Adaptive Quiz", 
    badge: "Spaced Recall",
    color: "text-[#F5A623]", 
    bg: "bg-[#F5A623]/10",
    border: "border-[#F5A623]"
  },
  { 
    route: "/flashcards", 
    icon: "style", 
    title: "Flashcards", 
    desc: "Active Recall Decks", 
    badge: "Smart Mastery",
    color: "text-[#8B5CF6]", 
    bg: "bg-[#8B5CF6]/10",
    border: "border-[#8B5CF6]"
  },
  { 
    route: "/notes", 
    icon: "edit_document", 
    title: "My Notes", 
    desc: "Knowledge Workspace", 
    badge: "Rich Editor",
    color: "text-[#0EA5E9]", 
    bg: "bg-[#0EA5E9]/10",
    border: "border-[#0EA5E9]"
  },
] as const;

// Secondary Utilities & Games (Expandable drawer — zero clutter)
const SECONDARY_TOOLS = [
  { route: "/community",      icon: "groups",          title: "Community Vault",  desc: "Peer notes & study buddies", color: "text-[#10B981]" },
  { route: "/quick-study",    icon: "menu_book",       title: "Cram Mode",        desc: "Last-minute exam review",   color: "text-[#b61b00]" },
  { route: "/visual-learner", icon: "visibility",      title: "Visual Learner",   desc: "Mindmaps & flowcharts",      color: "text-[#8B5CF6]" },
  { route: "/math",           icon: "calculate",       title: "Math Solver",      desc: "Step-by-step solver",       color: "text-[#10B981]" },
  { route: "/teach-it",       icon: "psychology",      title: "Teach It",         desc: "Feynman active recall",     color: "text-[#EC4899]" },
  { route: "/timer",          icon: "timer",           title: "Focus Timer",      desc: "Pomodoro focus blocks",     color: "text-[#6366F1]" },
  { route: "/planner",        icon: "calendar_month",  title: "Study Planner",    desc: "Schedules & syllabi",       color: "text-[#0EA5E9]" },
  { route: "/arcade",         icon: "sports_esports",  title: "Arcade Games",     desc: "Quick study mini-games",    color: "text-[#F43F5E]" },
  { route: "/arena",          icon: "military_tech",   title: "Arena Duels",      desc: "Live multiplayer matches",  color: "text-[#F5A623]" },
  { route: "/sources",        icon: "folder_open",     title: "Source Library",   desc: "PDFs & notes hub",          color: "text-[#78716C]" },
  { route: "/mistakes",       icon: "auto_stories",    title: "Mistake Journal",  desc: "Weak concept review",       color: "text-[#ba1a1a]" },
  { route: "/analytics",      icon: "bar_chart",       title: "Analytics",        desc: "Mastery metrics & trends",  color: "text-[#14B8A6]" },
] as const;

const STARTER_TASKS = [
  { id: "starter-1", title: "Complete your first 3-minute study session", completed: false, xp: 50, route: "/practice" },
  { id: "starter-2", title: "Ask Rex Tutor to explain a complex topic", completed: false, xp: 30, route: "/ai-tutor" },
  { id: "starter-3", title: "Review 5 flashcards or create a deck", completed: false, xp: 20, route: "/flashcards" },
];

function formatDuration(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ─── Main Dashboard Component ────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const tutorial = useTutorialModal("/dashboard");
  const { user, profile } = useAuth();
  const { isPro } = usePlan();
  const { stats } = useStudyStats();

  const [isToolsExpanded, setIsToolsExpanded] = useState(false);
  const [tasks, setTasks] = useState<{ id: any; title: string; completed: boolean; xp?: number; route?: string }[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [sessions, setSessions] = useState<{ id: any; title: string; duration_minutes: number; created_at: string }[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [userPrefs, setUserPrefs] = useState<UserStudyPreferences | null>(null);

  // Load user preferences
  useEffect(() => {
    setUserPrefs(getStoredPreferences());
  }, []);

  const primarySubjectId = userPrefs?.subjects?.[0] || "biology";
  const primarySubjectMeta = SUBJECT_METADATA[primarySubjectId] || SUBJECT_METADATA.other;
  const activeGoalId = userPrefs?.goal || "grades";
  const activeGoalMeta = GOAL_METADATA[activeGoalId] || GOAL_METADATA.grades;

  // Display Name
  const rawName =
    (user as any)?.user_metadata?.full_name ||
    profile?.full_name ||
    (profile as any)?.username ||
    user?.email?.split("@")[0] ||
    "Scholar";
  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

  // Streak calculation (Guaranteed friendly streak with Rex so new users never see a dead zero)
  const streakDays = Math.max(1, profile?.streak_days ?? 1);
  const totalXp = profile?.total_xp ?? 45;
  const currentLevel = levelFromXp(totalXp);
  const xpPercent = xpProgressPercent(totalXp);
  const xpRemaining = xpToNextLevel(totalXp);

  // Fetch tasks
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
      // Populate starter tasks
      setTasks(STARTER_TASKS);
    } catch {
      setTasks(STARTER_TASKS);
    } finally {
      setLoadingTasks(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [user?.id]);

  const saveTasks = (newTasks: typeof tasks) => {
    setTasks(newTasks);
    const userKey = user?.id ? `pz_${user.id}_checklist` : "pz_checklist";
    localStorage.setItem(userKey, JSON.stringify(newTasks));
  };

  const handleToggleTask = (id: any) => {
    playSuccess();
    const updated = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    saveTasks(updated);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    playPop();
    const newTask = {
      id: Date.now().toString(),
      title: newTaskTitle.trim(),
      completed: false,
      xp: 25,
    };
    saveTasks([newTask, ...tasks]);
    setNewTaskTitle("");
  };

  const handleDeleteTask = (id: any) => {
    playTap();
    saveTasks(tasks.filter(t => t.id !== id));
  };

  // Fetch Recent Sessions
  const fetchSessions = async () => {
    if (!user?.id) {
      setLoadingSessions(false);
      return;
    }
    setLoadingSessions(true);
    try {
      let combinedData: any[] = [];
      const local = localStorage.getItem("pz_study_sessions");
      if (local) {
        try { combinedData = JSON.parse(local); } catch {}
      }

      const [sessRes, actRes] = await Promise.all([
        Promise.resolve(supabase.from("study_sessions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(6)).catch(() => ({ data: [] })),
        Promise.resolve(supabase.from("study_activity").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(6)).catch(() => ({ data: [] }))
      ]);

      if (sessRes.data && sessRes.data.length > 0) {
        sessRes.data.forEach(dbSess => {
          if (!combinedData.find(s => s.id === dbSess.id)) {
            combinedData.push(dbSess);
          }
        });
      }

      setSessions(combinedData.slice(0, 4));
    } catch {
      // Fallback
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [user?.id]);

  // Contextual Rex speech based on streak and time of day
  const rexSpeech = useMemo(() => {
    const hour = new Date().getHours();
    const timeGreeting = hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";
    if (streakDays >= 3) {
      return `🔥 ${streakDays}-day streak with Rex! You're on fire, ${displayName}!`;
    }
    return `Good ${timeGreeting}, ${displayName}! Let's lock in your study streak with Rex today!`;
  }, [streakDays, displayName]);

  // Community Vault & Social Hook
  const {
    notes: campusNotes,
    buddies,
    feed: socialFeed,
    sendNudge,
    sendHighFive
  } = useCommunity();

  const handleStudyNote = (note: CampusNote, mode: "practice" | "flashcards") => {
    playPop();
    if (mode === "practice") {
      localStorage.setItem("qs_practice_export", JSON.stringify(note.content));
      toast.success(`Loading "${note.title}" into Practice Quiz!`);
      navigate("/practice");
    } else {
      localStorage.setItem("qs_flashcards_export", JSON.stringify(note.content));
      localStorage.setItem("pz_practice_topic", note.title);
      toast.success(`Loading "${note.title}" into Flashcards!`);
      navigate("/flashcards");
    }
  };

  const completedTasksCount = tasks.filter(t => t.completed).length;

  return (
    <div className="w-full bg-[#FAF7F2] min-h-screen text-black flex flex-col font-sans">
      <TutorialModal isOpen={tutorial.isOpen} onDismiss={tutorial.dismiss} features={TUTORIAL_CONTENT["/dashboard"] || []} title="Dashboard" />
      <SharedSidebar active="/dashboard" />

      {/* ══ DESKTOP WRAPPER ══════════════════════════════════════════════════ */}
      <div className="hidden md:flex md:ml-64 flex-col min-h-screen">
        <main className="p-8 lg:p-10 max-w-7xl w-full mx-auto flex flex-col gap-8">
          
          {/* 1. Header Greeting & Quick Stats Banner */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-[30px] font-black tracking-tight leading-tight">
                Welcome back, {displayName}
              </h1>
              <p className="text-[14px] font-bold text-black/55 mt-0.5 flex items-center gap-2">
                <span>{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</span>
                <span>•</span>
                <span className="text-[#FF4D2E] font-black">🔥 {streakDays}-Day Active Streak</span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Level Pill */}
              <div className="bg-white border-2 border-black px-4 py-2 rounded-xl shadow-[2px_2px_0px_#000] flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[#F5A623] text-[20px]">military_tech</span>
                <div className="text-left">
                  <div className="text-[11px] font-black uppercase tracking-wider text-black/50">Level {currentLevel}</div>
                  <div className="text-[13px] font-extrabold">{totalXp} XP</div>
                </div>
              </div>

              {/* Help Tutorial */}
              <button
                onClick={() => tutorial.show()}
                className="w-10 h-10 border-2 border-black bg-white hover:bg-black hover:text-white transition-colors flex items-center justify-center rounded-xl shadow-[2px_2px_0px_#000] active:translate-y-0.5 cursor-pointer"
                title="Tutorial"
              >
                <span className="material-symbols-outlined text-[20px]">help</span>
              </button>
            </div>
          </div>

          {/* 2. High-Impact Hero: Living Moving Rex Mascot & Daily Focus Mission */}
          <section className="w-full bg-[#FF4D2E] text-white border-[3px] border-black rounded-3xl p-6 lg:p-8 shadow-[6px_6px_0px_#000] relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-6">
            
            {/* Left: Living Moving Rex Mascot with Floating Physics */}
            <div className="flex items-center gap-5 z-10 w-full lg:w-auto">
              <RexMascot 
                emotion={streakDays >= 3 ? "excited" : "happy"} 
                size="lg" 
                speech={rexSpeech}
                subSpeech="Tap Rex for study advice!"
              />
            </div>

            {/* Right: Daily Focus Mission CTA */}
            <div className="z-10 bg-white text-black border-2 border-black rounded-2xl p-5 lg:p-6 shadow-[4px_4px_0px_#000] flex flex-col gap-3.5 max-w-md w-full">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 bg-[#FFF275] border border-black rounded-full text-[10px] font-black uppercase tracking-wider">
                  Today's Mission • {primarySubjectMeta.name}
                </span>
                <span className="text-[11px] font-extrabold text-black/50">3 mins</span>
              </div>

              <div>
                <h3 className="text-[18px] font-black leading-tight">
                  Boost retention in {primarySubjectMeta.name}
                </h3>
                <p className="text-[12.5px] font-bold text-black/60 mt-1 leading-snug">
                  Rex prepared an adaptive recall session tailored to your {activeGoalMeta.label.toLowerCase()} target.
                </p>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => {
                    playSuccess();
                    navigate(primarySubjectMeta.recommendedTool || "/practice");
                  }}
                  className="bg-[#FF4D2E] text-white border-2 border-black px-6 py-2.5 rounded-xl font-extrabold text-[13px] shadow-[3px_3px_0px_#000] hover:opacity-95 active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                  Launch Practice
                </button>

                <div className="text-[12px] font-extrabold text-[#16a34a] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  <span>+50 XP Reward</span>
                </div>
              </div>
            </div>
          </section>

          {/* 3. The 4-Tool Primary App Launchpad (Clean, Generous Spacing, Zero Truncation) */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-black">grid_view</span>
                <h2 className="text-[16px] font-black uppercase tracking-wider">Core Study Tools</h2>
              </div>
              <span className="text-[12px] font-bold text-black/45">1-Tap Launch</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {PRIMARY_TOOLS.map((tool) => (
                <button
                  key={tool.route}
                  onClick={() => {
                    playPop();
                    navigate(tool.route);
                  }}
                  className="bg-white border-[2.5px] border-black rounded-2xl p-5 text-left shadow-[4px_4px_0px_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0px_#000] active:translate-y-0.5 active:shadow-[2px_2px_0px_#000] transition-all flex flex-col justify-between h-[150px] group cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className={`w-12 h-12 rounded-xl border-2 border-black flex items-center justify-center ${tool.bg} shadow-[2px_2px_0px_#000]`}>
                      <span className={`material-symbols-outlined text-[26px] ${tool.color}`}>{tool.icon}</span>
                    </div>
                    <span className="px-2 py-0.5 bg-[#FAF7F2] border border-black rounded text-[9.5px] font-black uppercase tracking-wider text-black/60">
                      {tool.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-[17px] leading-tight group-hover:text-[#FF4D2E] transition-colors">
                      {tool.title}
                    </h3>
                    <p className="text-[12px] font-bold text-black/55 mt-0.5 leading-snug">
                      {tool.desc}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* Expandable Utility Drawer Toggle */}
            <div className="flex flex-col items-center mt-2">
              <button
                onClick={() => {
                  playTap();
                  setIsToolsExpanded(!isToolsExpanded);
                }}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full border-2 border-black bg-white hover:bg-[#F0EDE0] font-extrabold text-[12px] shadow-[2px_2px_0px_#000] active:translate-y-0.5 transition-all cursor-pointer"
              >
                <span>{isToolsExpanded ? "Hide Other Tools" : "Browse All 12 Other Tools (Arcade, Solver, Notes Vault...)"}</span>
                <span className="material-symbols-outlined text-[16px] transition-transform" style={{ transform: isToolsExpanded ? "rotate(180deg)" : "none" }}>
                  expand_more
                </span>
              </button>

              {/* Expanded Utility Drawer */}
              {isToolsExpanded && (
                <div className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-4 pt-4 border-t-2 border-black/15 animate-in fade-in duration-200">
                  {SECONDARY_TOOLS.map((tool) => (
                    <button
                      key={tool.route}
                      onClick={() => {
                        playPop();
                        navigate(tool.route);
                      }}
                      className="bg-white border-2 border-black rounded-xl p-3 flex items-center gap-3 shadow-[2px_2px_0px_#000] hover:bg-[#FAF7F2] hover:-translate-y-0.5 active:translate-y-0.5 transition-all text-left cursor-pointer group"
                    >
                      <div className="w-9 h-9 rounded-lg border border-black/20 bg-[#FAF7F2] flex items-center justify-center shrink-0">
                        <span className={`material-symbols-outlined text-[20px] ${tool.color}`}>{tool.icon}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-extrabold text-black group-hover:text-[#FF4D2E] transition-colors leading-tight">
                          {tool.title}
                        </div>
                        <div className="text-[10.5px] font-bold text-black/50 leading-tight truncate">
                          {tool.desc}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* 4. Bento Section: Quest Log + Streak with Rex + Habit Momentum */}
          <div className="grid grid-cols-12 gap-6">
            
            {/* Left Col (8): Quest Log with Starter Boost */}
            <section className="col-span-12 lg:col-span-8 bg-white border-[2.5px] border-black rounded-2xl p-6 shadow-[4px_4px_0px_#000] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b-2 border-black/10 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[22px] text-[#FF4D2E]">checklist</span>
                    <h2 className="text-[16px] font-black uppercase tracking-wider">Today's Quest Missions</h2>
                  </div>
                  <span className="text-[12px] font-extrabold text-black/50">
                    {completedTasksCount} of {tasks.length} Completed
                  </span>
                </div>

                {/* Quests List */}
                <div className="flex flex-col gap-2.5">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className={`border-2 border-black rounded-xl p-3.5 flex items-center justify-between gap-3 transition-all ${
                        task.completed ? "bg-[#dcfce7] border-green-700 opacity-80" : "bg-white hover:bg-[#FAF7F2]"
                      }`}
                    >
                      <div 
                        onClick={() => handleToggleTask(task.id)}
                        className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                      >
                        <div className={`w-6 h-6 rounded border-2 border-black flex items-center justify-center ${task.completed ? "bg-black text-white" : "bg-white"}`}>
                          {task.completed && <span className="material-symbols-outlined text-[16px]">check</span>}
                        </div>
                        <span className={`text-[13.5px] font-extrabold ${task.completed ? "line-through text-black/50" : "text-black"}`}>
                          {task.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {task.xp && (
                          <span className="px-2 py-0.5 bg-[#FFF275] border border-black rounded text-[10px] font-black text-black">
                            +{task.xp} XP
                          </span>
                        )}
                        {task.route && !task.completed && (
                          <button
                            onClick={() => { playPop(); navigate(task.route!); }}
                            className="text-[11px] font-black text-[#FF4D2E] hover:underline"
                          >
                            Go →
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="text-black/30 hover:text-black transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Custom Quest Input */}
              <form onSubmit={handleAddTask} className="flex gap-2 mt-4 pt-3 border-t-2 border-black/10">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  placeholder="Add your own custom study goal..."
                  className="flex-1 bg-[#FAF7F2] border-2 border-black rounded-xl px-4 py-2 text-[13px] font-bold focus:outline-none"
                />
                <button
                  type="submit"
                  className="bg-black text-white border-2 border-black px-4 py-2 rounded-xl text-[12px] font-black uppercase hover:bg-[#FF4D2E] transition-colors cursor-pointer"
                >
                  Add
                </button>
              </form>
            </section>

            {/* Right Col (4): Streak with Rex & Level Target */}
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-5">
              
              {/* Streak with Rex Card */}
              <section className="bg-[#FFF275] border-[2.5px] border-black rounded-2xl p-5 shadow-[4px_4px_0px_#000] flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-black/60">Streak with Rex</span>
                  <span className="text-[20px]">🔥</span>
                </div>

                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-[52px] font-black leading-none text-black">
                    <AnimatedCounter value={streakDays} />
                  </span>
                  <span className="text-[20px] font-black uppercase">Days</span>
                </div>

                <p className="text-[12px] font-bold text-black/75 leading-snug">
                  {streakDays > 1 
                    ? `${streakDays} day streak with Rex — keep it burning!`
                    : "Complete today's 3-minute mission to lock in Day 1!"}
                </p>

                <div className="mt-4 pt-3 border-t-2 border-black/15 flex items-center justify-between text-[11px] font-extrabold text-black/60">
                  <span>Protected by Rex</span>
                  <span className="text-black font-black">Daily Goal: 3 mins</span>
                </div>
              </section>

              {/* Scholar Level Card */}
              <section className="bg-white border-[2.5px] border-black rounded-2xl p-5 shadow-[4px_4px_0px_#000] flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-black/60">Scholar Progression</span>
                  <span className="px-2 py-0.5 bg-[#85f5eb] border border-black rounded text-[10px] font-black uppercase">
                    Level {currentLevel}
                  </span>
                </div>

                <div>
                  <div className="flex justify-between items-center text-[12px] font-extrabold mb-1">
                    <span>XP to Level {currentLevel + 1}</span>
                    <span className="text-[#FF4D2E] font-black">{xpRemaining} XP left</span>
                  </div>
                  <div className="w-full h-3 bg-[#E8E4DC] border-2 border-black rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#FF4D2E] transition-all duration-500" 
                      style={{ width: `${xpPercent}%` }} 
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[12px] font-extrabold pt-1">
                  <span className="text-black/50">Total Sessions</span>
                  <span className="font-black">{(stats as any)?.totalSessions || sessions.length}</span>
                </div>
              </section>
            </div>
          </div>

          {/* 5. Campus Vault Spotlight (Knowunity Reverse-Engineering) */}
          <section className="bg-white border-[2.5px] border-black rounded-2xl p-6 shadow-[4px_4px_0px_#000]">
            <div className="flex items-center justify-between pb-4 border-b-2 border-black/10 mb-5 flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl border-2 border-black bg-indigo-100 flex items-center justify-center shadow-[1px_1px_0px_#000]">
                  <span className="material-symbols-outlined text-[20px] text-indigo-700">menu_book</span>
                </div>
                <div>
                  <h2 className="text-[16px] font-black uppercase tracking-wider">Campus Vault Spotlight</h2>
                  <p className="text-[11.5px] font-bold text-black/50">Peer-shared study guides ready to study with 1 tap</p>
                </div>
              </div>
              <button
                onClick={() => { playTap(); navigate("/community"); }}
                className="px-3.5 py-1.5 bg-[#FAF7F2] hover:bg-black hover:text-white border-2 border-black rounded-xl text-[12px] font-black transition-colors shadow-[2px_2px_0px_#000] cursor-pointer flex items-center gap-1.5"
              >
                <span>Browse All {campusNotes.length} Notes</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {campusNotes.slice(0, 3).map((note) => (
                <div
                  key={note.id}
                  className="bg-[#FAF7F2] border-2 border-black rounded-xl p-4 flex flex-col justify-between hover:-translate-y-0.5 transition-all shadow-[2px_2px_0px_#000]"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2 py-0.5 rounded border text-[9.5px] font-black uppercase tracking-wider ${note.subjectBadgeColor}`}>
                        {note.subject}
                      </span>
                      <span className="text-[11px] font-black text-black/60 flex items-center gap-1">
                        <span>❤️</span> {note.likes}
                      </span>
                    </div>

                    <h3 className="text-[14.5px] font-extrabold text-black leading-snug line-clamp-2 mb-1.5">
                      {note.title}
                    </h3>
                    <p className="text-[11.5px] font-bold text-black/60 line-clamp-2 leading-relaxed mb-3">
                      {note.summary}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-black/10 flex items-center gap-2">
                    <button
                      onClick={() => handleStudyNote(note, "practice")}
                      className="flex-1 py-1.5 bg-[#FF4D2E] hover:bg-[#e03d20] text-white border border-black rounded-lg text-[11px] font-black shadow-[1px_1px_0px_#000] active:translate-y-0.5 transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">quiz</span>
                      <span>Quiz</span>
                    </button>
                    <button
                      onClick={() => handleStudyNote(note, "flashcards")}
                      className="flex-1 py-1.5 bg-amber-400 hover:bg-amber-500 text-black border border-black rounded-lg text-[11px] font-black shadow-[1px_1px_0px_#000] active:translate-y-0.5 transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">style</span>
                      <span>Cards</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 6. Friend Streaks & High-Fives (Duolingo Reverse-Engineering) */}
          <div className="grid grid-cols-12 gap-6">
            {/* Left (7 cols): Friend Streaks */}
            <section className="col-span-12 lg:col-span-7 bg-white border-[2.5px] border-black rounded-2xl p-6 shadow-[4px_4px_0px_#000] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b-2 border-black/10 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[20px]">🔥</span>
                    <h2 className="text-[15px] font-black uppercase tracking-wider">Friend Streaks</h2>
                  </div>
                  <button
                    onClick={() => { playTap(); navigate("/community"); }}
                    className="text-[11px] font-black text-[#FF4D2E] hover:underline"
                  >
                    View All Buddies →
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {buddies.slice(0, 4).map((buddy) => (
                    <div
                      key={buddy.id}
                      className="border-2 border-black rounded-xl p-3 bg-[#FAF7F2] flex items-center justify-between gap-3 shadow-[2px_2px_0px_#000]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-lg border border-black bg-white flex items-center justify-center text-[18px] shrink-0">
                          {buddy.avatar}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[12.5px] font-black text-black truncate leading-tight">
                            {buddy.name}
                          </div>
                          <div className="text-[10px] font-black text-[#FF4D2E]">
                            🔥 {buddy.streakDays}d Streak
                          </div>
                        </div>
                      </div>

                      {buddy.isRexMascot ? (
                        <span className="px-2 py-0.5 bg-green-100 text-green-800 border border-green-600 rounded text-[9.5px] font-black uppercase">
                          Active
                        </span>
                      ) : buddy.hasStudiedToday ? (
                        <span className="px-2 py-0.5 bg-green-100 text-green-800 border border-green-600 rounded text-[9.5px] font-black uppercase">
                          Done ✅
                        </span>
                      ) : (
                        <button
                          onClick={() => sendNudge(buddy.id)}
                          className="px-2.5 py-1 bg-[#FF4D2E] hover:bg-[#e03d20] text-white border border-black rounded-lg text-[10px] font-black transition-all active:translate-y-0.5 cursor-pointer shrink-0 shadow-[1px_1px_0px_#000]"
                        >
                          Nudge
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Right (5 cols): Live High-Five Social Feed */}
            <section className="col-span-12 lg:col-span-5 bg-white border-[2.5px] border-black rounded-2xl p-6 shadow-[4px_4px_0px_#000]">
              <div className="flex items-center justify-between pb-3 border-b-2 border-black/10 mb-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-amber-500">celebration</span>
                  <h2 className="text-[15px] font-black uppercase tracking-wider">Campus Feed</h2>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-black/50">Live</span>
              </div>

              <div className="flex flex-col gap-2.5">
                {socialFeed.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="border border-black/20 rounded-xl p-2.5 bg-[#FAF7F2] flex items-center justify-between gap-2 text-left"
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <span className="text-[16px]">{item.userAvatar}</span>
                      <div className="min-w-0">
                        <div className="text-[11.5px] font-black text-black truncate">
                          <span className="text-[#FF4D2E]">{item.userName}</span> {item.action}
                        </div>
                        <div className="text-[9.5px] font-bold text-black/40">
                          {item.topic} • {item.timeAgo}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => sendHighFive(item.id)}
                      disabled={item.highFived}
                      className={`px-2 py-1 rounded-lg border border-black text-[10px] font-black transition-all shrink-0 cursor-pointer ${
                        item.highFived
                          ? "bg-green-100 text-green-800 border-green-600 opacity-70"
                          : "bg-white hover:bg-amber-100 text-black shadow-[1px_1px_0px_#000]"
                      }`}
                    >
                      {item.highFived ? "🙌" : "🙌 +5XP"}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* 7. Recent Sessions */}
          {sessions.length > 0 && (
            <section className="bg-white border-[2.5px] border-black rounded-2xl p-5 shadow-[4px_4px_0px_#000]">
              <div className="flex items-center justify-between pb-3 border-b-2 border-black/10 mb-3">
                <h2 className="text-[14px] font-black uppercase tracking-wider">Recent Study Sessions</h2>
                <button onClick={() => navigate("/analytics")} className="text-[11px] font-extrabold text-[#FF4D2E] hover:underline">
                  View Analytics →
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {sessions.map((sess, i) => (
                  <div key={sess.id || i} className="border-2 border-black rounded-xl p-3 bg-[#FAF7F2]">
                    <div className="text-[13px] font-extrabold text-black leading-tight truncate">{sess.title}</div>
                    <div className="text-[11px] font-bold text-black/50 mt-1">
                      {formatDuration(Number(sess.duration_minutes || 5))} studied • {new Date(sess.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

        </main>
      </div>

      {/* ══ MOBILE VIEW ══════════════════════════════════════════════════════ */}
      <div className="md:hidden flex flex-col min-h-screen pb-28">
        
        {/* Mobile Header */}
        <header className="sticky top-0 z-40 bg-[#FAF7F2] border-b-2 border-black px-4 h-16 flex items-center justify-between shrink-0">
          <div>
            <h1 className="font-black text-[18px] leading-tight">Good morning, {displayName}</h1>
            <p className="text-[11px] font-extrabold text-[#FF4D2E] flex items-center gap-1">
              <span>🔥 {streakDays}-Day Active Streak</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => tutorial.show()}
              className="w-9 h-9 border-2 border-black bg-white flex items-center justify-center rounded-xl shadow-[2px_2px_0px_#000]"
            >
              <span className="material-symbols-outlined text-[18px]">help</span>
            </button>
          </div>
        </header>

        <main className="p-4 flex flex-col gap-5 flex-1">
          
          {/* Mobile Rex Hero */}
          <section className="bg-[#FF4D2E] text-white border-2 border-black rounded-2xl p-4 shadow-[4px_4px_0px_#000] flex flex-col gap-3">
            <RexMascot 
              emotion={streakDays >= 3 ? "excited" : "happy"} 
              size="md" 
              speech={rexSpeech}
            />

            <div className="bg-white text-black border-2 border-black rounded-xl p-3.5 shadow-[2px_2px_0px_#000] flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-[11px] font-black">
                <span className="text-[#FF4D2E] uppercase">Today's Focus • {primarySubjectMeta.name}</span>
                <span className="text-black/50">3 mins</span>
              </div>
              <button
                onClick={() => {
                  playSuccess();
                  navigate(primarySubjectMeta.recommendedTool || "/practice");
                }}
                className="w-full bg-[#FF4D2E] text-white border-2 border-black py-2.5 rounded-xl font-extrabold text-[13px] shadow-[2px_2px_0px_#000] flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                Launch Practice (+50 XP)
              </button>
            </div>
          </section>

          {/* 4 Core Primary Tools */}
          <section className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-black uppercase tracking-wider text-black">Core Study Tools</span>
              <button
                onClick={() => { playTap(); setIsToolsExpanded(!isToolsExpanded); }}
                className="text-[11px] font-extrabold text-[#FF4D2E] underline"
              >
                {isToolsExpanded ? "Show Less" : "See All 12 Tools"}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {PRIMARY_TOOLS.map((tool) => (
                <button
                  key={tool.route}
                  onClick={() => { playPop(); navigate(tool.route); }}
                  className="bg-white border-2 border-black rounded-xl p-3.5 text-left shadow-[2px_2px_0px_#000] active:translate-y-0.5 flex flex-col justify-between h-[115px]"
                >
                  <div className={`w-9 h-9 rounded-lg border border-black flex items-center justify-center ${tool.bg}`}>
                    <span className={`material-symbols-outlined text-[20px] ${tool.color}`}>{tool.icon}</span>
                  </div>
                  <div>
                    <div className="text-[14px] font-black leading-tight text-black">{tool.title}</div>
                    <div className="text-[11px] font-bold text-black/50 leading-tight mt-0.5">{tool.desc}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Expanded Drawer on Mobile */}
            {isToolsExpanded && (
              <div className="grid grid-cols-2 gap-2.5 pt-2">
                {SECONDARY_TOOLS.map((tool) => (
                  <button
                    key={tool.route}
                    onClick={() => { playPop(); navigate(tool.route); }}
                    className="bg-white border-2 border-black rounded-lg p-2.5 flex items-center gap-2 shadow-[1px_1px_0px_#000] text-left"
                  >
                    <span className={`material-symbols-outlined text-[18px] ${tool.color}`}>{tool.icon}</span>
                    <span className="text-[12px] font-extrabold truncate">{tool.title}</span>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Mobile Quests */}
          <section className="bg-white border-2 border-black rounded-2xl p-4 shadow-[3px_3px_0px_#000] flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-black/10">
              <span className="text-[12px] font-black uppercase tracking-wider">Today's Quests</span>
              <span className="text-[11px] font-bold text-black/50">{completedTasksCount}/{tasks.length} Done</span>
            </div>

            <div className="flex flex-col gap-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => handleToggleTask(task.id)}
                  className={`border-2 border-black rounded-xl p-3 flex items-center gap-3 cursor-pointer ${
                    task.completed ? "bg-[#dcfce7] border-green-700 opacity-70" : "bg-white"
                  }`}
                >
                  <div className={`w-5 h-5 rounded border-2 border-black flex items-center justify-center ${task.completed ? "bg-black text-white" : "bg-white"}`}>
                    {task.completed && <span className="material-symbols-outlined text-[14px]">check</span>}
                  </div>
                  <span className={`text-[12px] font-bold flex-1 ${task.completed ? "line-through text-black/50" : "text-black"}`}>
                    {task.title}
                  </span>
                  {task.xp && (
                    <span className="text-[10px] font-black text-[#FF4D2E]">+{task.xp} XP</span>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Streak with Rex */}
          <section className="bg-[#FFF275] border-2 border-black rounded-2xl p-4 shadow-[3px_3px_0px_#000] flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-black/60 block">Streak with Rex</span>
              <div className="text-[28px] font-black leading-tight">🔥 {streakDays} Days</div>
              <p className="text-[11px] font-bold text-black/70">Complete your daily mission to protect the flame.</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black uppercase tracking-wider text-black/50 block">Level {currentLevel}</span>
              <span className="text-[13px] font-black">{totalXp} XP</span>
            </div>
          </section>

          {/* Mobile Campus Vault Spotlight */}
          <section className="bg-white border-2 border-black rounded-2xl p-4 shadow-[3px_3px_0px_#000] flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-black/10">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-indigo-700">menu_book</span>
                <span className="text-[12px] font-black uppercase tracking-wider">Campus Vault</span>
              </div>
              <button
                onClick={() => { playTap(); navigate("/community"); }}
                className="text-[11px] font-extrabold text-[#FF4D2E] underline cursor-pointer"
              >
                Browse All ({campusNotes.length})
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              {campusNotes.slice(0, 2).map((note) => (
                <div
                  key={note.id}
                  className="border border-black rounded-xl p-3 bg-[#FAF7F2] flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded border text-[9px] font-black uppercase ${note.subjectBadgeColor}`}>
                      {note.subject}
                    </span>
                    <span className="text-[10px] font-bold text-black/50">❤️ {note.likes}</span>
                  </div>
                  <div className="text-[13px] font-black leading-tight text-black line-clamp-1">
                    {note.title}
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleStudyNote(note, "practice")}
                      className="flex-1 py-1.5 bg-[#FF4D2E] text-white border border-black rounded-lg text-[10.5px] font-black flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[13px]">quiz</span>
                      <span>Quiz</span>
                    </button>
                    <button
                      onClick={() => handleStudyNote(note, "flashcards")}
                      className="flex-1 py-1.5 bg-amber-400 text-black border border-black rounded-lg text-[10.5px] font-black flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[13px]">style</span>
                      <span>Cards</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Mobile Friend Streaks */}
          <section className="bg-white border-2 border-black rounded-2xl p-4 shadow-[3px_3px_0px_#000] flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-black/10">
              <div className="flex items-center gap-1.5">
                <span className="text-[16px]">🔥</span>
                <span className="text-[12px] font-black uppercase tracking-wider">Friend Streaks</span>
              </div>
              <button
                onClick={() => { playTap(); navigate("/community"); }}
                className="text-[11px] font-extrabold text-[#FF4D2E] underline cursor-pointer"
              >
                View Buddies
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {buddies.slice(0, 3).map((buddy) => (
                <div
                  key={buddy.id}
                  className="border border-black rounded-xl p-2.5 bg-[#FAF7F2] flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[20px]">{buddy.avatar}</span>
                    <div className="min-w-0">
                      <div className="text-[12px] font-black text-black truncate">{buddy.name}</div>
                      <div className="text-[9.5px] font-black text-[#FF4D2E]">🔥 {buddy.streakDays}d Streak</div>
                    </div>
                  </div>

                  {buddy.isRexMascot || buddy.hasStudiedToday ? (
                    <span className="px-2 py-0.5 bg-green-100 text-green-800 border border-green-600 rounded text-[9px] font-black uppercase">
                      Done ✅
                    </span>
                  ) : (
                    <button
                      onClick={() => sendNudge(buddy.id)}
                      className="px-2.5 py-1 bg-[#FF4D2E] text-white border border-black rounded-lg text-[10px] font-black cursor-pointer"
                    >
                      Nudge
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

        </main>
      </div>
    </div>
  );
}
