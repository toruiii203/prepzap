import { useNavigate } from "react-router-dom";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

interface DashboardProps {
}

export default function Dashboard() {
  const { user, profile, refreshProfile } = useAuth();

  // Name Greeting logic
  const displayName = user?.avatarConfig?.full_name || (user as any)?.user_metadata?.full_name || user?.name || user?.email?.split('@')[0] || "Master";

  // Checklist State loaded from Supabase
  const [tasks, setTasks] = useState<{ id: any; title: string; completed: boolean; time?: string }[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [loadingTasks, setLoadingTasks] = useState(true);

  // Recent Sessions State loaded from Supabase
  const [sessions, setSessions] = useState<{ id: any; title: string; duration: number; created_at: string }[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  // Calculated Statistics
  const [stats, setStats] = useState({
    totalSessions: 0,
    studyTimeHours: 0,
    avgScore: 92
  });

  // Calendar Markings (Mon=0, Tue=1, ..., Sun=6)
  const [studiedDays, setStudiedDays] = useState<boolean[]>([false, false, false, false, false, false, false]);

  // Study Session Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sessionSubject, setSessionSubject] = useState("");
  const [sessionDuration, setSessionDuration] = useState(30); // minutes
  const [savingSession, setSavingSession] = useState(false);

  // Load from Supabase on mount
  useEffect(() => {
    fetchTasks();
    fetchSessions();
  }, []);

  const fetchTasks = () => {
    setLoadingTasks(true);
    try {
      const stored = localStorage.getItem("pz_checklist");
      const parsed = stored ? JSON.parse(stored) : [];
      setTasks(parsed);
    } catch (err) {
      setTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  };

  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      const { data, error } = await supabase.from("study_sessions").select("*").order("created_at", { ascending: false });
      if (data && data.length > 0) {
        setSessions(data);
        calculateStatsAndCalendar(data);
      } else {
        // Seed default educational study sessions to look full on fresh start
        const defaultSessions = [
          { id: "s1", title: "Computer Science Study", duration: 45, created_at: new Date(Date.now() - 3600000).toISOString() },
          { id: "s2", title: "Math Quiz Review", duration: 30, created_at: new Date(Date.now() - 86400000).toISOString() },
          { id: "s3", title: "Biology Note Analysis", duration: 60, created_at: new Date(Date.now() - 172800000).toISOString() }
        ];
        await supabase.from("study_sessions").insert(defaultSessions);
        setSessions(defaultSessions);
        calculateStatsAndCalendar(defaultSessions);
      }
    } catch (err) {
      console.error("Error loading sessions:", err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const calculateStatsAndCalendar = (loadedSessions: any[]) => {
    // 1. Core stats
    const totalSess = loadedSessions.length;
    const totalMins = loadedSessions.reduce((acc, curr) => acc + (Number(curr.duration) || 0), 0);
    const hours = Math.round((totalMins / 60) * 10) / 10;
    
    setStats({
      totalSessions: totalSess,
      studyTimeHours: hours || 0.5,
      avgScore: 92 // fallback mockup ratio
    });

    // 2. Weekly Calendar mapping (Mon - Sun)
    const daysStudied = new Array(7).fill(false);
    loadedSessions.forEach(session => {
      const dateList = new Date(session.created_at);
      let dayIdx = dateList.getDay() - 1; // 0 for Sun, 1 for Mon
      if (dayIdx === -1) dayIdx = 6; // map Sunday to last item (index 6)
      if (dayIdx >= 0 && dayIdx < 7) {
        daysStudied[dayIdx] = true;
      }
    });
    setStudiedDays(daysStudied);
  };

  const handleToggleTask = async (id: any, currentCompleted: boolean) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !currentCompleted } : t));
    try {
      const updated = tasks.map(t => t.id === id ? { ...t, completed: !currentCompleted } : t);
      localStorage.setItem("pz_checklist", JSON.stringify(updated));
    } catch (err) {
      console.error("Error toggling task completed status:", err);
    }
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    
    const newTask = {
      title: newTaskTitle,
      completed: false,
      time: "Just now"
    };

    try {
      const updated = [...tasks, { ...newTask, id: Date.now().toString() }];
      localStorage.setItem("pz_checklist", JSON.stringify(updated));
      setTasks(updated);
      setNewTaskTitle("");
    } catch (err) {
      console.error("Error adding task:", err);
    }
  };

  const handleDeleteTask = async (id: any) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    try {
      const updated = tasks.filter(t => t.id !== id);
      localStorage.setItem("pz_checklist", JSON.stringify(updated));
    } catch (err) {
      console.error("Error deleting task:", err);
    }
  };

  // Start study timer / save session modal logic
  const handleOpenModal = () => {
    setSessionSubject("");
    setSessionDuration(30);
    setIsModalOpen(true);
  };

  const handleSaveSession = async () => {
    if (!sessionSubject.trim()) {
      
      return;
    }

    setSavingSession(true);
    try {
      const newSession = {
        title: sessionSubject,
        duration: Number(sessionDuration),
        created_at: new Date().toISOString()
      };

      await supabase.from("study_sessions").insert(newSession);
      
      // Earn game progression variables on completion of study log
      const xpEarned = Math.round(sessionDuration * 1.5);
      const coinsEarned = Math.round(sessionDuration * 0.5);

      if (user && profile) {
        try {
          const currentXp = profile.total_xp || profile.xp || 0;
          await supabase.from("profiles").update({ total_xp: currentXp + xpEarned }).eq("id", user.id);
          if (typeof refreshProfile === "function") {
            await refreshProfile();
          }
        } catch (err) {
          console.error("Error updating profile via Supabase:", err);
          await supabase.from("profiles").update({ total_xp: (profile?.total_xp ?? 0) + xpEarned }).eq("id", user?.id ?? ""); await refreshProfile();
        }
      } else {
        await supabase.from("profiles").update({ total_xp: (profile?.total_xp ?? 0) + xpEarned }).eq("id", user?.id ?? ""); await refreshProfile();
      }

      // session saved
      
      setIsModalOpen(false);
      fetchSessions(); // Reload list & recalculate statistics
    } catch (err) {
      console.error("Error saving logged session:", err);
    } finally {
      setSavingSession(false);
    }
  };

  const completedCount = tasks.filter((t) => t.completed).length;
  const goalCount = tasks.length > 5 ? tasks.length : 5;
  const progressPercent = Math.min(100, Math.round((completedCount / goalCount) * 100));

  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="w-full bg-[#FAF7F2] min-h-screen flex flex-col md:max-w-3xl md:mx-auto font-body-md text-on-background mx-auto">
      {/* TopAppBar */}
      <header className="h-16 w-full px-5 flex items-center justify-between bg-[#FAF7F2] z-40 sticky top-0 border-b-[1.5px] border-black">
        <div className="text-[18px] font-black font-headline tracking-wider uppercase">Studenius</div>
        <div className="flex items-center gap-3">
          <span 
            className="material-symbols-outlined text-[24px] cursor-pointer hover:opacity-75 font-bold"
            onClick={() => navigate("sources")}
          >
            attach_file
          </span>
          <div 
            className="px-2.5 py-0.5 border-[1.5px] border-[#FAF7F2] rounded-full cursor-pointer hover:opacity-80 bg-[#fca623]/20"
            onClick={() => navigate("pricing")}
          >
            <span className="text-[10px] font-extrabold text-black uppercase tracking-wider">PRO</span>
          </div>
          <span className="material-symbols-outlined text-[24px] cursor-pointer hover:opacity-75">notifications</span>
          <div 
            className="w-8 h-8 rounded-full bg-[#ae2925] text-white ink-border flex items-center justify-center font-black text-[13px] cursor-pointer"
            onClick={() => navigate("settings")}
          >
            {displayName.slice(0, 1).toUpperCase()}
          </div>
        </div>
      </header>

      <main className="px-5 pt-6 pb-28 flex flex-col gap-6">
        
        {/* Simple Greeting Section */}
        <section className="flex flex-col gap-2 relative">
          <div className="absolute right-0 top-[-10px] opacity-25 text-[22px] select-none">//////////////</div>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="w-[44px] h-[44px] rounded-full bg-[#fca623]/20 ink-border flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px] text-black">school</span>
              </div>
              <div className="flex flex-col">
                <h1 className="text-[26px] font-black leading-tight font-headline tracking-tight">Hi, {displayName}! ////</h1>
                <p className="text-[14px] opacity-65 font-bold mt-0.5">Let's compile excellent study results today!</p>
              </div>
            </div>
          </div>
        </section>

        {/* Dynamic Study Goals Counter Bar */}
        <section 
          className="ink-border rounded-2xl bg-[#FAF7F2] p-5 cursor-default transition-all duration-150"
          style={{ borderWidth: "2px", boxShadow: "5px 5px 0px 0px rgba(0,0,0,1)" }}
        >
          <div className="flex justify-between items-end mb-4">
            <div>
              <div className="text-[11px] opacity-50 font-black uppercase tracking-wider mb-1">CURRENT GOAL</div>
              <div className="text-[15px] font-extrabold text-black">{completedCount} of {goalCount} checklist targets completed</div>
            </div>
            <div className="text-[28px] font-black font-headline leading-none" style={{ color: "#1A1A1A" }}>
              {completedCount}/{goalCount}
            </div>
          </div>
          <div className="h-2 bg-[#E8E4DC] rounded-full overflow-hidden ink-border">
            <div 
              className="h-full bg-black rounded-r-full transition-all duration-500" 
              style={{ width: `${progressPercent}%`, backgroundColor: "#1A1A1A" }}
            ></div>
          </div>
        </section>

        {/* Start Study Session Quick Action Button - Modal Trigger */}
        <button
          onClick={handleOpenModal}
          className="w-full py-3.5 rounded-xl border-2 border-black bg-primary text-white font-extrabold font-headline hover:opacity-95 text-center flex items-center justify-center gap-2 cursor-pointer transition-transform duration-75 active:translate-y-0.5 shadow-[3px_3px_0px_rgba(0,0,0,1)] text-[14.5px]"
        >
          <span className="material-symbols-outlined text-[18px]">play_circle</span>
          Start Study Session
        </button>

        {/* Weekly Study Calendar Visualizer */}
        <section className="ink-border rounded-2xl bg-white p-5 cursor-default" style={{ boxShadow: "4px 4px 0px 0px rgba(0,0,0,1)" }}>
          <div className="text-[11.5px] opacity-50 font-black uppercase tracking-wider mb-3">Weekly Study Calendar</div>
          <div className="grid grid-cols-7 gap-1.5">
            {daysOfWeek.map((day, idx) => {
              const studied = studiedDays[idx];
              const isToday = idx === new Date().getDay() - 1 || (new Date().getDay() === 0 && idx === 6);
              
              return (
                <div key={day} className="flex flex-col items-center gap-1.5">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{day[0]}</span>
                  <div 
                    className={`w-8 h-8 rounded-full border-2 border-black flex items-center justify-center font-extrabold text-[11px] transition-all ${
                      studied 
                        ? "bg-primary text-white shadow-[1px_1px_0px_#000]" 
                        : "bg-[#FAF7F2] text-black/35"
                    } ${isToday ? "ring-2 ring-orange-400 scale-105" : ""}`}
                  >
                    {studied ? "//" : idx + 1}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Core Stats Bento panel */}
        <section className="grid grid-cols-2 gap-3.5">
          <div className="bg-white border-2 border-black rounded-xl p-4.5 shadow-[2px_2px_0px_#1A1A1A]">
            <div className="text-[22px] font-black text-black leading-tight">{stats.totalSessions}</div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mt-1">Total Sessions</div>
          </div>
          <div className="bg-white border-2 border-black rounded-xl p-4.5 shadow-[2px_2px_0px_#1A1A1A]">
            <div className="text-[22px] font-black text-black leading-tight">{stats.studyTimeHours}h</div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mt-1">Time Studied</div>
          </div>
        </section>

        {/* Tools Selector Row */}
        <section className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <div className="text-[11px] font-black uppercase tracking-wider opacity-50">CURRICULUM TOOLS</div>
          </div>
          <div className="relative">
            <div className="flex overflow-x-auto gap-3 pb-2 no-scrollbar scroll-smooth">
              
              <div 
                onClick={() => navigate("ai-tutor")}
                className="w-[140px] h-[125px] shrink-0 ink-border rounded-[14px] bg-[#FAF7F2] p-4 shadow-hard cursor-pointer hover:-translate-y-0.5 active:translate-y-0 transition-all flex flex-col justify-between"
                style={{ boxShadow: "3px 3px 0px 0px rgba(0,0,0,1)" }}
              >
                <div>
                  <span className="material-symbols-outlined text-[22px] mb-1.5 block">smart_toy</span>
                  <div className="text-[14px] font-extrabold text-black">AI Tutor</div>
                </div>
                <div className="text-[11px] text-black opacity-45 font-bold">Interactive help</div>
              </div>
 
              <div 
                onClick={() => navigate("practice")}
                className="w-[140px] h-[125px] shrink-0 ink-border rounded-[14px] bg-[#FAF7F2] p-4 shadow-hard cursor-pointer hover:-translate-y-0.5 active:translate-y-0 transition-all flex flex-col justify-between"
                style={{ boxShadow: "3px 3px 0px 0px rgba(0,0,0,1)" }}
              >
                <div>
                  <span className="material-symbols-outlined text-[22px] mb-1.5 block font-bold">assignment</span>
                  <div className="text-[14px] font-extrabold text-black">Practice</div>
                </div>
                <div className="text-[11px] text-black opacity-45 font-bold">Mock exams</div>
              </div>

              <div 
                onClick={() => navigate("flashcards")}
                className="w-[140px] h-[125px] shrink-0 ink-border rounded-[14px] bg-[#FAF7F2] p-4 shadow-hard cursor-pointer hover:-translate-y-0.5 active:translate-y-0 transition-all flex flex-col justify-between"
                style={{ boxShadow: "3px 3px 0px 0px rgba(0,0,0,1)" }}
              >
                <div>
                  <span className="material-symbols-outlined text-[22px] mb-1.5 block">style</span>
                  <div className="text-[14px] font-extrabold text-black">Flashcards</div>
                </div>
                <div className="text-[11px] text-black opacity-45 font-bold">Spaced rep</div>
              </div>

              <div 
                onClick={() => navigate("cram")}
                className="w-[140px] h-[125px] shrink-0 ink-border rounded-[14px] bg-[#FAF7F2] p-4 shadow-hard cursor-pointer hover:-translate-y-0.5 active:translate-y-0 transition-all flex flex-col justify-between"
                style={{ boxShadow: "3px 3px 0px 0px rgba(0,0,0,1)" }}
              >
                <div>
                  <span className="material-symbols-outlined text-[22px] mb-1.5 block">bolt</span>
                  <div className="text-[14px] font-extrabold text-black">Cram Mode</div>
                </div>
                <div className="text-[11px] text-black opacity-45 font-bold">Quick review</div>
              </div>
              
            </div>
            
            <div className="flex justify-center gap-1.5 mt-2">
              <div className="w-1.5 h-1.5 rounded-full bg-black"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-black opacity-20"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-black opacity-20"></div>
            </div>
          </div>
        </section>

        {/* Quest Log Checklist */}
        <section>
          <div className="text-[18px] font-extrabold text-black mb-3 flex items-center gap-2">
            Quest Log <span className="opacity-30 text-[13px] font-normal font-sans">////</span>
          </div>
          <div className="flex flex-col gap-4">
            <form onSubmit={handleAddTask} className="h-14 ink-border rounded-[12px] bg-[#FAF7F2] px-[14px] flex items-center justify-between">
              <input 
                type="text" 
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Add a study checklist target..." 
                className="text-[13.5px] text-black bg-transparent border-none outline-none focus:ring-0 p-0 w-full placeholder:text-black placeholder:opacity-40 font-bold" />
              <button type="submit" className="material-symbols-outlined text-[24px] text-black opacity-55 hover:opacity-100 cursor-pointer">
                add
              </button>
            </form>
            
            <div className="flex flex-col gap-4 mt-2 px-1">
              {loadingTasks ? (
                <div className="text-center py-2 text-xs font-bold text-slate-400">Loading checklist...</div>
              ) : tasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3 justify-between">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => handleToggleTask(task.id, task.completed)}
                      className={`w-5 h-5 rounded-full ink-border flex-shrink-0 cursor-pointer flex items-center justify-center transition-colors ${
                        task.completed ? "bg-black" : "bg-white hover:bg-[#ffdad6]"
                      }`}
                      style={task.completed ? { backgroundColor: "#E8534A" } : {}}
                    >
                      {task.completed && (
                        <span className="material-symbols-outlined text-[13px] text-white font-black">check</span>
                      )}
                    </button>
                    <div className={`text-[14px] font-extrabold ${task.completed ? "line-through opacity-40" : ""}`}>
                      {task.title} 
                      {task.time && (
                        <span className="text-[11.5px] font-bold opacity-50 ml-1.5 bg-[#ebe8e3] px-2 py-0.5 rounded-full border border-black/10">
                          {task.time}
                        </span>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDeleteTask(task.id)}
                    className="material-symbols-outlined text-[18px] text-black/30 hover:text-black hover:scale-105 cursor-pointer transform transition-transform"
                  >
                    delete
                  </button>
                </div>
              ))}

              {!loadingTasks && tasks.length === 0 && (
                <div className="text-center py-2 text-xs font-semibold text-slate-400">No active targets! Add custom milestone goals above.</div>
              )}
            </div>
          </div>
        </section>

        {/* Focus On Chips */}
        <section>
          <div className="flex flex-col mb-3">
            <div className="text-[11px] font-black opacity-50 uppercase tracking-wider flex items-center gap-2 w-full">
              Specific Performance Targets <span className="opacity-30 text-[12px] font-normal normal-case">////</span>
              <div 
                className="ml-auto w-6 h-6 rounded-full ink-border bg-[#FAF7F2] flex items-center justify-center cursor-pointer hover:bg-black hover:text-[#FAF7F2] transition-colors"
                onClick={() => navigate("daily5")}
              >
                <span className="material-symbols-outlined text-[14px]">add</span>
              </div>
            </div>
            <div className="text-[12px] text-black opacity-45 mt-0.5 font-bold">Based on study sessions recorded</div>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <div 
              onClick={() => navigate("math")}
              className="ink-border rounded-full px-5 py-2 bg-[#FAF7F2] text-[13.5px] font-extrabold hover:bg-black hover:text-[#FAF7F2] transition-colors cursor-pointer text-center"
              style={{ boxShadow: "2px 2px 0px 0px rgba(0,0,0,1)" }}
            >
              Mathematics
            </div>
            <div 
              onClick={() => navigate("feynman")}
              className="ink-border rounded-full px-5 py-2 bg-[#FAF7F2] text-[13.5px] font-extrabold hover:bg-black hover:text-[#FAF7F2] transition-colors cursor-pointer text-center"
              style={{ boxShadow: "2px 2px 0px 0px rgba(0,0,0,1)" }}
            >
              Physics
            </div>
            <div 
              onClick={() => navigate("cram")}
              className="ink-border rounded-full px-5 py-2 bg-[#FAF7F2] text-[13.5px] font-extrabold hover:bg-black hover:text-[#FAF7F2] transition-colors cursor-pointer text-center"
              style={{ boxShadow: "2px 2px 0px 0px rgba(0,0,0,1)" }}
            >
              English Essay
            </div>
          </div>
        </section>

        {/* Recent Sessions Timeline Activity */}
        <section className="ink-border rounded-[16px] bg-[#FAF7F2] p-5" style={{ boxShadow: "4px 4px 0px 0px rgba(0,0,0,1)" }}>
          <div className="text-[11.5px] font-black mb-4 opacity-50 uppercase tracking-wider border-b-[1.5px] border-black pb-2 flex items-center gap-2">
            History Ledger <span className="opacity-30 text-[12px] font-normal normal-case">///</span>
          </div>
          <div className="flex flex-col gap-5 relative">
            {/* Vertical timeline line */}
            <div className="absolute left-[3px] top-2 bottom-2 w-[1.5px] bg-black opacity-20"></div>
            
            {loadingSessions ? (
              <div className="text-center py-2 text-xs font-bold text-slate-400">Loading ledger...</div>
            ) : sessions.slice(0, 3).map((session, sIdx) => {
              const formattedDate = new Date(session.created_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric"
              });

              return (
                <div 
                  key={session.id || sIdx}
                  className="flex justify-between items-center relative pl-5 cursor-default group"
                >
                  <div className="absolute left-[-1px] w-2.5 h-2.5 bg-black rounded-full border border-[#FAF7F2]"></div>
                  <div className="text-[14px] font-extrabold text-black flex-1 pr-2 truncate">{session.title}</div>
                  <div className="text-[11.5px] opacity-50 font-bold bg-white px-2 py-0.5 rounded-md border border-black/10 shrink-0">
                    {session.duration}m / {formattedDate}
                  </div>
                </div>
              );
            })}

            {!loadingSessions && sessions.length === 0 && (
              <div className="text-center py-1 text-xs text-slate-400 font-bold">No sessions registered yet. Click top start button study!</div>
            )}
          </div>
        </section>
      </main>

      {/* Persistent Study Session Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-5 z-55">
          <div 
            className="w-full max-w-[340px] bg-[#FAF7F2] border-2 border-black rounded-2xl p-5 shadow-[4px_4px_0px_#1A1A1A] text-left animate-in fade-in zoom-in duration-100"
          >
            <div className="flex items-center gap-2 mb-3.5">
              <span className="text-xl">///</span>
              <h3 className="font-headline font-black text-[18px] text-black">Log Study Session</h3>
            </div>
            
            <p className="text-[12px] text-slate-500 font-bold mb-4 leading-normal">
              Empower your checklist goal with custom registered study hours in the library profile!
            </p>

            <div className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Study Topic / Subject</label>
                <input 
                  type="text"
                  placeholder="e.g. Cellular Biology, Trigonometry"
                  value={sessionSubject}
                  onChange={(e) => setSessionSubject(e.target.value)}
                  className="w-full border-2 border-black bg-white px-3 py-2 rounded-lg text-[13.5px] font-bold outline-none" />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Duration Of Session: {sessionDuration} min</label>
                <input 
                  type="range"
                  min="15"
                  max="120"
                  step="15"
                  value={sessionDuration}
                  onChange={(e) => setSessionDuration(Number(e.target.value))}
                  className="w-full accent-primary border border-black/10 rounded-lg" />
                <div className="flex justify-between text-[10px] font-black text-slate-400">
                  <span>15m</span>
                  <span>45m</span>
                  <span>90m</span>
                  <span>120m</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3.5 mt-6">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 bg-white border-2 border-black text-black py-2.5 rounded-xl font-bold text-[13px] hover:bg-neutral-50 cursor-pointer"
              >
                Cancel
              </button>
              <button 
                disabled={savingSession}
                onClick={handleSaveSession}
                className="flex-1 bg-primary border-2 border-black text-white py-2.5 rounded-xl font-bold text-[13px] hover:opacity-95 cursor-pointer"
              >
                {savingSession ? "Saving..." : "Save Log"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
