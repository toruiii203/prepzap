import { useNavigate } from "react-router-dom";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { SharedSidebar } from "@/components/SharedSidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { usePlan } from "@/hooks/usePlan";

// All 12 tools flat
const ALL_TOOLS = [
  { route: "/ai-tutor",   icon: "forum",       title: "Rex Tutor",        desc: "Personal mentor",   color: "text-[#FF4D2E]" },
  { route: "/practice",   icon: "assignment",       title: "Practice",        desc: "Mock exams",        color: "text-[#F5A623]" },
  { route: "/flashcards", icon: "style",            title: "Flashcards",      desc: "Spaced recall",     color: "text-[#8B5CF6]" },
  { route: "/quick-study",icon: "edit_note",             title: "Cram Mode",       desc: "Last minute prep",  color: "text-[#b61b00]" },
  { route: "/planner",    icon: "calendar_month",   title: "Study Planner",   desc: "Stay organized",    color: "text-[#0EA5E9]" },
  { route: "/math",       icon: "calculate",        title: "Math Solver",     desc: "Step-by-step",      color: "text-[#10B981]" },
  { route: "/teach-it",   icon: "psychology",       title: "Teach It",        desc: "Active learning",   color: "text-[#EC4899]" },
  { route: "/quick-study",icon: "menu_book",        title: "Quick Study",     desc: "5 min bursts",      color: "text-[#6366F1]" },
  { route: "/sources",    icon: "folder_open",      title: "Source Library",  desc: "Your materials",    color: "text-[#78716C]" },
  { route: "/mistakes",   icon: "auto_stories",     title: "Mistake Journal", desc: "Learn from errors", color: "text-[#ba1a1a]" },
  { route: "/analytics",  icon: "bar_chart",        title: "Analytics",       desc: "Track progress",    color: "text-[#14B8A6]" },
  { route: "/challenges", icon: "emoji_events",     title: "Challenges",      desc: "Compete & win",     color: "text-[#F5A623]" },
] as const;

// Mobile carousel: chunk into slides of 4
const TOOL_SLIDES = [
  ALL_TOOLS.slice(0, 4),
  ALL_TOOLS.slice(4, 8),
  ALL_TOOLS.slice(8, 12),
];

// ─── Sub-components defined OUTSIDE Dashboard to prevent remount on every render ───

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
              <div key={task.id} className="flex items-center gap-3 justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggleTask(task.id, task.completed)}
                    className={`w-5 h-5 rounded-full border-2 border-black flex-shrink-0 cursor-pointer flex items-center justify-center transition-colors ${
                      task.completed ? "bg-[#E8534A]" : "bg-white hover:bg-[#ffdad6]"
                    }`}
                  >
                    {task.completed && <span className="material-symbols-outlined text-[13px] text-white font-black">check</span>}
                  </button>
                  <div className={`text-[14px] font-extrabold ${task.completed ? "line-through opacity-40" : ""}`}>
                    {task.title}
                    {task.time && (
                      <span className="text-[11px] font-bold opacity-50 ml-1.5 bg-[#ebe8e3] px-2 py-0.5 rounded-full border border-black/10">
                        {task.time}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteTask(task.id)}
                  className="material-symbols-outlined text-[18px] text-black/30 hover:text-black cursor-pointer transition-colors"
                >
                  delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="border-t-2 border-black p-3">
        <form onSubmit={handleAddTask} className="flex gap-2">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Add a quest..."
            className="flex-1 bg-transparent border-2 border-black px-3 py-2 text-[13px] font-bold outline-none focus:ring-0 placeholder:opacity-40"
          />
          <button
            type="submit"
            className="border-2 border-black bg-black text-white px-3 flex items-center justify-center hover:bg-[#333] transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
          </button>
        </form>
      </div>
    </>
  );
}

interface RecentSessionsRowsProps {
  // FIX: DB column is `duration_minutes`, not `duration` — this mismatch was
  // why every duration/XP calculation silently rendered as 0.
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
                  <div className="text-[11px] font-bold text-black/50">{Number(session.duration_minutes) > 0 && Number(session.duration_minutes) < 1 ? "<1" : Math.round(Number(session.duration_minutes) || 0)}m &bull; {formattedDate}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] font-bold text-black/40">{Number(session.duration_minutes) > 0 && Number(session.duration_minutes) < 1 ? "<1" : Math.round(Number(session.duration_minutes) || 0)}m studied</div>
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
  // 10 hours = 600 minutes
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

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { isPro } = usePlan();
  const [toolsPage, setToolsPage] = useState(0);
  const toolsScrollRef = useRef<HTMLDivElement>(null);

  const handleToolsScroll = () => {
    const el = toolsScrollRef.current;
    if (!el) return;
    const page = Math.round(el.scrollLeft / el.clientWidth);
    setToolsPage(Math.min(TOOL_SLIDES.length - 1, Math.max(0, page)));
  };

  const getSessionRoute = (title: string) => {
    const t = (title || "").toLowerCase();
    if (t.includes('flashcard')) return '/flashcards';
    if (t.includes('practice')) return '/practice';
    if (t.includes('arena') || t.includes('challenge')) return '/arena';
    if (t.includes('tutor')) return '/ai-tutor';
    if (t.includes('planner')) return '/planner';
    if (t.includes('math')) return '/math';
    if (t.includes('teach')) return '/teach-it';
    if (t.includes('source')) return '/sources';
    return '/tools';
  };

  const scrollToolsToPage = (page: number) => {
    const el = toolsScrollRef.current;
    if (!el) return;
    el.scrollTo({ left: page * el.clientWidth, behavior: "smooth" });
    setToolsPage(page);
  };

  const toTitleCase = (s: string) =>
    s.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
  const rawName =
    user?.avatarConfig?.full_name ||
    (user as any)?.user_metadata?.full_name ||
    user?.name ||
    user?.email?.split("@")[0] ||
    "Master";
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
  }, [user?.id]); // wait for auth to resolve before fetching

  // Time tracking itself lives centrally in SharedSidebar (mounted on every
  // route), so Dashboard doesn't call useStudyTimeTracker directly — doing so
  // here too would double-count time. Instead, just listen for the event it
  // fires after each successful flush so Recent Sessions/stats update live.
  useEffect(() => {
    const handleSessionLogged = () => fetchSessions();
    window.addEventListener("studenius:session-logged", handleSessionLogged);
    return () => window.removeEventListener("studenius:session-logged", handleSessionLogged);
  }, [user?.id]);

  const fetchTasks = () => {
    setLoadingTasks(true);
    try {
      const stored = localStorage.getItem("pz_checklist");
      const parsed = stored ? JSON.parse(stored) : [];
      setTasks(parsed);
    } catch {
      setTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  };

  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      let combinedData: any[] = [];
      try {
        const local = localStorage.getItem("pz_study_sessions");
        if (local) {
          combinedData = JSON.parse(local);
        }
      } catch (err) {}
      
      const { data } = await supabase
        .from("study_sessions")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });
        
      if (data && data.length > 0) {
        // Merge without duplicates (using titles and dates)
        data.forEach(dbSess => {
          if (!combinedData.find(s => s.id === dbSess.id)) {
            combinedData.push(dbSess);
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
      const totalMins = loadedSessions.reduce((acc, curr) => acc + (Number(curr.duration_minutes) || 0), 0);
      const hours = Math.round((totalMins / 60) * 10) / 10;
      setStats({ totalSessions: totalSess, studyTimeHours: hours, avgScore: 0 });

      // Rolling 7-day window
      const today = new Date();
      const windowDays: string[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
        windowDays.push(d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0') + "-" + String(d.getDate()).padStart(2, '0'));
      }

      const dayMins = new Array(7).fill(0);
      const daysStudied = new Array(7).fill(false);

      loadedSessions.forEach((session) => {
        // Parse date reliably without timezone shifting
        const dStr = session.created_at.split("T")[0]; 
        const idx = windowDays.indexOf(dStr);
        if (idx !== -1) {
          daysStudied[idx] = true;
          dayMins[idx] += Number(session.duration_minutes) || 0;
        }
      });
      setStudiedDays(daysStudied);
      setDayMinutes(dayMins);
    };

  const handleToggleTask = (id: any, currentCompleted: boolean) => {
    const updated = tasks.map((t) => (t.id === id ? { ...t, completed: !currentCompleted } : t));
    setTasks(updated);
    try { localStorage.setItem("pz_checklist", JSON.stringify(updated)); } catch {}
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const updated = [...tasks, { id: Date.now().toString(), title: newTaskTitle, completed: false, time: "Just now" }];
    try { localStorage.setItem("pz_checklist", JSON.stringify(updated)); } catch {}
    setTasks(updated);
    setNewTaskTitle("");
  };

  const handleDeleteTask = (id: any) => {
    const updated = tasks.filter((t) => t.id !== id);
    setTasks(updated);
    try { localStorage.setItem("pz_checklist", JSON.stringify(updated)); } catch {}
  };

  const completedCount = tasks.filter((t) => t.completed).length;
  const goalCount = tasks.length > 5 ? tasks.length : 5;
  const progressPercent = Math.min(100, Math.round((completedCount / goalCount) * 100));
  const circumference = 2 * Math.PI * 42; // r=42
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

      <SharedSidebar active="/dashboard" />

      {/* ═══════════════════════════════════════════════════
          MOBILE TOP BAR — hidden on desktop (md:hidden)
          ═══════════════════════════════════════════════════ */}
      <header className="md:hidden h-16 w-full px-5 flex items-center justify-between bg-[#FAF7F2] z-40 sticky top-0 border-b-[1.5px] border-black">
        <div className="text-[18px] font-black tracking-wider uppercase">Studenius</div>
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[24px] cursor-pointer hover:opacity-75" onClick={() => navigate("/sources")}>attach_file</span>
          <div className="px-2.5 py-0.5 border-[1.5px] border-black rounded-full cursor-pointer bg-[#fca623]/20" onClick={() => navigate("/pro")}>
            {isPro ? (
              <span className="text-[10px] font-extrabold text-black uppercase tracking-wider">PRO ✦</span>
            ) : (
              <span className="text-[10px] font-extrabold text-black uppercase tracking-wider">Go Pro</span>
            )}
          </div>
          <div className="w-8 h-8 rounded-full bg-[#ae2925] text-white border-2 border-black flex items-center justify-center font-black text-[13px] cursor-pointer" onClick={() => navigate("/profile")}>
            {displayName.slice(0, 1).toUpperCase()}
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════
          DESKTOP LAYOUT — md:block, offset by sidebar
          ═══════════════════════════════════════════════════ */}
      <div className="hidden md:block md:ml-64 h-full overflow-y-auto p-12">

        {/* Desktop Header */}
        <header className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-[32px] font-black leading-tight text-black">Good morning, {displayName}.</h2>
            <p className="text-[16px] font-bold text-black/60 mt-1">
              {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} • Keep the streak alive
            </p>
          </div>
          <div className="flex gap-3">
          </div>
        </header>

        {/* Desktop Bento Grid */}
        <div className="grid grid-cols-12 gap-6">

          {/* Stats Row: Today's Goal + Total Sessions + Time Studied */}
          <div className="col-span-8 grid grid-cols-3 gap-6">

            {/* Today's Goal */}
            <section className="border-2 border-black bg-white p-4 flex flex-col items-center text-center relative overflow-hidden" style={{ boxShadow: "4px 4px 0px #000" }}>
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
            <section className="border-2 border-black bg-white p-4 flex flex-col justify-between relative" style={{ boxShadow: "4px 4px 0px #000" }}>
              <div className="text-[10px] font-black uppercase tracking-wider text-black/50">Total Sessions</div>
              <div>
                <div className="text-[48px] font-black leading-none text-black">{stats.totalSessions}</div>
                <div className="text-[10px] font-black uppercase tracking-wider text-black/40 mt-1">Lifetime</div>
              </div>
            </section>

            {/* Time Studied */}
            <section className="border-2 border-black bg-white p-4 flex flex-col justify-between relative" style={{ boxShadow: "4px 4px 0px #000" }}>
              <div className="text-[10px] font-black uppercase tracking-wider text-black/50">Time Studied</div>
              <div>
                <div className="text-[48px] font-black leading-none text-[#FF4D2E]">{stats.studyTimeHours}h</div>
                <div className="text-[10px] font-black uppercase tracking-wider text-black/40 mt-1">Total Hours</div>
              </div>
            </section>
          </div>

          {/* Quest Log — tall right column spanning 2 rows */}
          <section className="col-span-4 row-span-2 border-2 border-black bg-white flex flex-col" style={{ boxShadow: "4px 4px 0px #000" }}>
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

          {/* Quick Tools — 4x3 grid */}
          <section className="col-span-8 border-2 border-black bg-[#F0EDE0] p-4" style={{ boxShadow: "4px 4px 0px #000" }}>
            <h3 className="text-[13px] font-black uppercase tracking-wider mb-4">Quick Tools</h3>
            <div className="grid grid-cols-4 gap-3">
              {ALL_TOOLS.map((tool) => (
                <button
                  key={tool.route + tool.title}
                  onClick={() => navigate(tool.route)}
                  className="border-2 border-black bg-white p-3 flex flex-col items-center justify-center text-center gap-1 h-28 hover:bg-black hover:text-white group transition-colors"
                  style={{ boxShadow: "3px 3px 0px #000" }}
                >
                  <span className={`material-symbols-outlined text-[22px] group-hover:text-white ${tool.color}`}>{tool.icon}</span>
                  <span className="text-[13px] font-extrabold group-hover:text-white">{tool.title}</span>
                  <span className="text-[11px] font-bold text-black/50 group-hover:text-white/70">{tool.desc}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Weekly Momentum */}
          <section className="col-span-8 border-2 border-black bg-white p-4" style={{ boxShadow: "4px 4px 0px #000" }}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[13px] font-black uppercase tracking-wider">Weekly Momentum</h3>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-black text-white text-[11px] font-black uppercase tracking-wider">Study Hours</span>
                <span className="px-3 py-1 border-[1.5px] border-black text-[11px] font-black uppercase tracking-wider">Goals Met</span>
              </div>
            </div>
            <WeeklyBars daysOfWeek={daysOfWeek} dayMinutes={dayMinutes} studiedDays={studiedDays} />
          </section>

          {/* Academic Streak */}
          <section className="col-span-4 border-2 border-black bg-[#FF4D2E] text-white p-4 flex flex-col justify-between min-h-[200px]" style={{ boxShadow: "4px 4px 0px #000" }}>
            <div className="flex justify-between items-start">
              <h3 className="text-[13px] font-black uppercase tracking-wider">Academic Streak</h3>
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
            </div>
            <div className="flex items-baseline gap-2 my-2">
              <span className="text-[64px] font-black leading-none">{profile?.streak_days ?? 0}</span>
              <span className="text-[24px] font-black uppercase">Days</span>
            </div>
            <p className="text-[12px] font-bold opacity-90">{(profile?.streak_days ?? 0) > 0 ? `${profile?.streak_days} day streak — keep it going!` : "Start your first session to build your streak."}</p>

          </section>

          {/* Recent Sessions — full width */}
          <section className="col-span-12 border-2 border-black bg-[#FAF7F2] overflow-hidden" style={{ boxShadow: "4px 4px 0px #000" }}>
            <div className="p-4 border-b-2 border-black flex justify-between items-center bg-white">
              <h3 className="text-[13px] font-black uppercase tracking-wider">Recent Sessions</h3>
              <button className="text-[13px] font-extrabold text-[#FF4D2E] hover:underline">View All</button>
            </div>
            <RecentSessionsRows sessions={sessions} loadingSessions={loadingSessions} />
          </section>

        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          MOBILE LAYOUT — block on mobile, hidden on desktop
          ═══════════════════════════════════════════════════ */}
      <main className="md:hidden px-5 pt-6 pb-32 flex flex-col gap-6 overflow-y-auto h-full">

        {/* Greeting */}
        <section className="flex items-center gap-3">
          <div className="w-[44px] h-[44px] rounded-full bg-[#fca623]/20 border-2 border-black flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[20px]">school</span>
          </div>
          <div>
            <h1 className="text-[26px] font-black leading-tight tracking-tight">Good morning, {displayName}.</h1>
            <p className="text-[14px] text-black/65 font-bold mt-0.5">
              {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>
        </section>

        {/* Goal Progress Bar */}
        <section className="border-2 border-black rounded-2xl bg-[#FAF7F2] p-5" style={{ boxShadow: "5px 5px 0px rgba(0,0,0,1)" }}>
          <div className="flex justify-between items-end mb-4">
            <div>
              <div className="text-[11px] opacity-50 font-black uppercase tracking-wider mb-1">Current Goal</div>
              <div className="text-[15px] font-extrabold">{completedCount} of {goalCount} checklist targets completed</div>
            </div>
            <div className="text-[28px] font-black leading-none">{completedCount}/{goalCount}</div>
          </div>
          <div className="h-2 bg-[#E8E4DC] rounded-full overflow-hidden border-2 border-black">
            <div className="h-full bg-black rounded-r-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
          </div>
        </section>

        

        {/* Weekly Calendar (mobile only) */}
        <section className="border-2 border-black rounded-2xl bg-white p-5" style={{ boxShadow: "4px 4px 0px rgba(0,0,0,1)" }}>
          <div className="text-[11.5px] opacity-50 font-black uppercase tracking-wider mb-3">Weekly Study Calendar</div>
          <div className="grid grid-cols-7 gap-1.5">
            {daysOfWeek.map((day, idx) => {
              const studied = studiedDays[idx];
              const isToday = idx === 6;
              return (
                <div key={day} className="flex flex-col items-center gap-1.5">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{day[0]}</span>
                  <div className={`w-8 h-8 rounded-full border-2 border-black flex items-center justify-center font-extrabold text-[11px] transition-all ${
                    studied ? "bg-black text-white shadow-[1px_1px_0px_#000]" : "bg-[#FAF7F2] text-black/35"
                  } ${isToday ? "ring-2 ring-orange-400 scale-105" : ""}`}>
                    {studied ? "✓" : idx + 1}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-2 gap-3.5">
          <div className="bg-white border-2 border-black rounded-xl p-4 shadow-[2px_2px_0px_#1A1A1A] flex flex-col items-center justify-center text-center min-h-[80px]">
            <div className="text-[22px] font-black leading-tight">{stats.totalSessions}</div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mt-1">Total Sessions</div>
          </div>
          <div className="bg-white border-2 border-black rounded-xl p-4 shadow-[2px_2px_0px_#1A1A1A] flex flex-col items-center justify-center text-center min-h-[80px]">
            <div className="text-[22px] font-black leading-tight">{stats.studyTimeHours}h</div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mt-1">Time Studied</div>
          </div>
        </section>

        {/* Tools — swipeable carousel (mobile only) */}
        <section className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <div className="text-[11px] font-black uppercase tracking-wider opacity-50">Tools</div>
            <button type="button" onClick={() => navigate("/tools")} className="text-[11px] font-bold text-black/50 underline">See all</button>
          </div>
          <div className="relative">
            <div
              ref={toolsScrollRef}
              onScroll={handleToolsScroll}
              className="flex overflow-x-auto snap-x snap-mandatory gap-0 pb-2 scroll-smooth"
              style={{ scrollbarWidth: "none" }}
            >
              {TOOL_SLIDES.map((slide, slideIdx) => (
                <div key={slideIdx} className="min-w-full snap-start grid grid-cols-2 gap-3 px-0.5">
                  {slide.map((tool) => (
                    <button
                      key={tool.title}
                      type="button"
                      onClick={() => navigate(tool.route)}
                      className="h-[110px] border-2 border-black rounded-[14px] bg-[#FAF7F2] p-3 text-left shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 transition-all flex flex-col justify-between"
                    >
                      <span className={`material-symbols-outlined text-[20px] mb-2 block ${tool.color}`}>{tool.icon}</span>
                      <div>
                        <div className="text-[13px] font-bold">{tool.title}</div>
                        <div className="text-[11px] text-black/40 font-semibold">{tool.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              ))}
            </div>
            <div className="absolute right-0 top-0 bottom-2 w-12 pointer-events-none bg-gradient-to-l from-[#FAF7F2] to-transparent" />
            <div className="flex justify-center gap-1.5 mt-2">
              {TOOL_SLIDES.map((_, idx) => (
                <button key={idx} type="button" onClick={() => scrollToolsToPage(idx)}
                  className={`w-1.5 h-1.5 rounded-full transition-opacity ${toolsPage === idx ? "bg-black" : "bg-black/20"}`} />
              ))}
            </div>
          </div>
        </section>

        {/* Quest Log — mobile */}
        <section>
          <div className="text-[18px] font-extrabold mb-3 flex items-center gap-2">
            Quest Log
          </div>
          <div className="border-2 border-black rounded-xl bg-white overflow-hidden" style={{ boxShadow: "4px 4px 0px rgba(0,0,0,1)" }}>
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

        {/* Performance Target Chips */}
        <section>
          <div className="text-[11px] font-black opacity-50 uppercase tracking-wider flex items-center gap-2 mb-1">
            Specific Performance Targets
            <div className="ml-auto w-6 h-6 rounded-full border-2 border-black bg-[#FAF7F2] flex items-center justify-center cursor-pointer hover:bg-black hover:text-white transition-colors" onClick={() => navigate("/planner")}>
              <span className="material-symbols-outlined text-[14px]">add</span>
            </div>
          </div>
          <div className="text-[12px] text-black/45 font-bold mb-2">Based on study sessions recorded</div>
          <div className="flex flex-wrap gap-2.5">
            {Array.from(new Set(sessions.map((s) => s.title))).slice(0, 4).map((title, i) => (
              <button
                key={title || i}
                type="button"
                onClick={() => navigate(getSessionRoute(title))}
                className="border-2 border-black px-4 py-2 bg-[#FAF7F2] text-[13px] font-extrabold hover:bg-black hover:text-white transition-colors cursor-pointer shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
              >
                {title}
              </button>
            ))}
            {sessions.length === 0 && (
              <p className="text-[12px] text-black/40 font-bold">Complete study sessions to see your targets here.</p>
            )}
          </div>
        </section>

        {/* History Ledger (mobile recent sessions) */}
        <section className="border-2 border-black rounded-[16px] bg-[#FAF7F2] overflow-hidden" style={{ boxShadow: "4px 4px 0px rgba(0,0,0,1)" }}>
          <div className="text-[11.5px] font-black opacity-50 uppercase tracking-wider border-b-[1.5px] border-black p-4 pb-3">
            History Ledger
          </div>
          <div className="p-4 flex flex-col gap-5 relative">
            <div className="absolute left-[19px] top-6 bottom-4 w-[1.5px] bg-black opacity-20" />
            {loadingSessions ? (
              <div className="text-center py-2 text-xs font-bold text-slate-400">Loading ledger...</div>
            ) : sessions.slice(0, 3).map((session, sIdx) => {
              const formattedDate = new Date(session.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
              return (
                <div key={session.id || sIdx} className="flex justify-between items-center relative pl-5">
                  <div className="absolute left-[-1px] w-2.5 h-2.5 bg-black rounded-full border border-[#FAF7F2]" />
                  <div className="text-[14px] font-extrabold flex-1 pr-2 truncate">{session.title}</div>
                  <div className="text-[11.5px] opacity-50 font-bold bg-white px-2 py-0.5 rounded-md border border-black/10 shrink-0">
                    {Number(session.duration_minutes) > 0 && Number(session.duration_minutes) < 1 ? "<1" : Math.round(Number(session.duration_minutes) || 0)}m / {formattedDate}
                  </div>
                </div>
              );
            })}
            {!loadingSessions && sessions.length === 0 && (
              <div className="text-center py-1 text-xs text-slate-400 font-bold">No sessions yet. Start studying!</div>
            )}
          </div>
        </section>
      </main>

    </div>
  );
}


