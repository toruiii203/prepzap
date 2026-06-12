import { useNavigate } from "react-router-dom";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface AnalyticsProps {
}

export default function Analytics() {
  const navigate = useNavigate();
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [tasksCompletedPct, setTasksCompletedPct] = useState(88);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const { data: sessionData, error: sessionErr } = await supabase
          .from("study_sessions")
          .select("*")
          .order("created_at", { ascending: false });

        if (!sessionErr && sessionData) {
          setSessions(sessionData);
        }

        const { data: taskData, error: taskErr } = await supabase
          .from("activity_log")
          .select("completed");

        if (!taskErr && taskData && taskData.length > 0) {
          const completedCount = taskData.filter(t => t.completed).length;
          setTasksCompletedPct(Math.round((completedCount / taskData.length) * 100));
        }
      } catch (err) {
        console.error("Error loading analytics data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  // Compute Weekly Hours breakdown dynamically (Mon - Sun)
  const daysOfWeek = ["M", "T", "W", "T", "F", "S", "S"];
  const weeklyHours = [0, 0, 0, 0, 0, 0, 0];

  sessions.forEach(s => {
    try {
      const date = new Date(s.created_at);
      const day = date.getDay(); // 0 is Sun, 1 is Mon...
      const idx = day === 0 ? 6 : day - 1; // map so Mon starts index 0, Sun is 6
      // simple guard to check if date was in past 7 days
      const diffTime = Math.abs(new Date().getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays <= 7) {
        weeklyHours[idx] += (s.duration || 0) / 60; // duration in minutes, convert to hours
      }
    } catch {}
  });

  const maxHours = Math.max(...weeklyHours, 1);
  const weeklyData = daysOfWeek.map((day, idx) => {
    const hoursVal = weeklyHours[idx];
    const pct = Math.round((hoursVal / maxHours) * 80); // scale max bar to 80%
    const currentDayOfWeekIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
    return {
      day,
      hours: `${hoursVal.toFixed(1)}h`,
      height: `${Math.max(5, pct)}%`,
      highlighted: idx === currentDayOfWeekIdx
    };
  });

  // Calculate dynamic stats
  const totalMins = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
  const activeHoursStr = (totalMins / 60).toFixed(1) + "h";
  const totalSessionsCount = sessions.length;

  const formatDateHelper = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const diffMs = new Date().getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
      return "just now";
    }
  };

  return (
    <div className="bg-[#fcf9f4] text-[#1c1c19] min-h-full flex flex-col font-body-md antialiased overflow-y-auto w-full flex-1 pb-20">
      
      {/* TopAppBar */}
      <header className="bg-background w-full top-0 sticky border-b-2 border-on-background z-40 navbar-custom">
        <div className="flex items-center justify-between px-5 h-16 w-full bg-[#FAF7F2]">
          <button 
            onClick={() => navigate(-1)}
            aria-label="Go back" 
            className="w-10 h-10 flex items-center justify-center border-2 border-[#1c1c19] rounded-full hover:bg-surface-container-high transition-colors active:translate-y-0.5 shadow-[2px_2px_0px_#1a1a1a] bg-white cursor-pointer"
          >
            <span className="material-symbols-outlined text-primary">arrow_back</span>
          </button>
          <h1 className="font-headline text-headline-lg text-on-background font-extrabold pr-4 flex-1 text-center text-[22px]">
            Analytics
          </h1>
          <button 
            onClick={() => {
              navigator.clipboard?.writeText(window.location.origin);
              
            }}
            aria-label="Share" 
            className="w-10 h-10 flex items-center justify-center border-2 border-[#1c1c19] rounded-full hover:bg-surface-container-high transition-colors active:translate-y-0.5 shadow-[2px_2px_0px_#1a1a1a] bg-white cursor-pointer"
          >
            <span className="material-symbols-outlined text-primary">share</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 px-5 pt-6 flex flex-col gap-6">
        
        {/* Weekly Activity Chart Section */}
        <section className="flex flex-col gap-3">
          <h2 className="font-headline text-headline-md font-extrabold text-[16px]">Weekly Activity (Last 7 Days)</h2>
          
          <div className="bg-white rounded-[18px] border-2 border-[#1a1a1a] shadow-[4px_4px_0px_0px_#1a1a1a] p-5 h-72 flex flex-col relative overflow-visible">
            {/* Y-axis helper lines */}
            <div className="absolute inset-0 p-5 flex flex-col justify-between pointer-events-none z-0">
              <div className="border-b border-[#1a1a1a] opacity-5 w-full h-0"></div>
              <div className="border-b border-[#1a1a1a] opacity-5 w-full h-0"></div>
              <div className="border-b border-[#1a1a1a] opacity-5 w-full h-0"></div>
              <div className="border-b border-[#1a1a1a] opacity-5 w-full h-0"></div>
              <div className="border-b border-[#1a1a1a] opacity-5 w-full h-0"></div>
            </div>

            {/* Bars Column layout */}
            <div className="flex-1 flex items-end justify-between gap-2.5 z-10 pt-4 relative overflow-visible">
              {weeklyData.map((bar, idx) => (
                <div 
                  key={idx}
                  onMouseEnter={() => setHoveredBar(idx)}
                  onMouseLeave={() => setHoveredBar(null)}
                  className="flex flex-col items-center gap-2.5 flex-1 h-full justify-end group cursor-pointer relative overflow-visible"
                >
                  {/* Dynamic Tooltip */}
                  {(hoveredBar === idx || bar.highlighted) && (
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#1c1c19] text-[#FAF7F2] font-label-sm text-[13px] px-2 py-0.5 rounded shadow-sm transition-opacity whitespace-nowrap z-25 pointer-events-none font-bold">
                      {bar.hours}
                    </div>
                  )}
                  
                  {/* Actual Visual Bar block */}
                  <div 
                    className={`w-full border-2 border-[#1a1a1a] rounded-t-[4px] relative transition-all duration-500 origin-bottom`}
                    style={{ 
                      height: bar.height, 
                      backgroundColor: bar.highlighted ? "#E8534A" : "#ffb4ab",
                      transform: hoveredBar === idx ? "scaleX(1.1)" : "scaleX(1)"
                    }}
                  >
                  </div>
                  
                  <span className={`font-headline text-[14px] ${
                    bar.highlighted ? "text-primary font-extrabold" : "text-on-surface-variant font-bold/80"
                  }`}>
                    {bar.day}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bento Stats row */}
        <section className="grid grid-cols-3 gap-3.5">
          
          {/* Stat 1: Time */}
          <div className="bg-white rounded-[18px] border-2 border-[#1a1a1a] shadow-[2px_2px_0px_0px_#1a1a1a] p-4 flex flex-col items-center justify-center gap-1.5 text-center min-h-[100px]">
            <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>timer</span>
            <span className="font-headline text-headline-md font-bold leading-tight text-[18px]">{activeHoursStr}</span>
            <span className="text-[12px] font-bold text-on-surface-variant uppercase tracking-wider">Active Time</span>
          </div>

          {/* Stat 2: Active Sessions (Highlighted Red) */}
          <div className="bg-primary rounded-[18px] border-2 border-[#1a1a1a] shadow-[2px_2px_0px_0px_#1a1a1a] p-4 flex flex-col items-center justify-center gap-1.5 text-center text-white min-h-[100px]">
            <span className="material-symbols-outlined text-white text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
            <span className="font-headline text-headline-md font-bold leading-tight text-[18px]">{totalSessionsCount}</span>
            <span className="text-[12px] font-bold text-white opacity-85 uppercase tracking-wider">Sessions</span>
          </div>

          {/* Stat 3: Avg Score */}
          <div className="bg-white rounded-[18px] border-2 border-[#1a1a1a] shadow-[2px_2px_0px_0px_#1a1a1a] p-4 flex flex-col items-center justify-center gap-1.5 text-center min-h-[100px]">
            <span className="material-symbols-outlined text-tertiary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>target</span>
            <span className="font-headline text-headline-md font-bold leading-tight text-[18px]">{tasksCompletedPct}%</span>
            <span className="text-[12px] font-bold text-on-surface-variant uppercase tracking-wider border-none">Task Rate</span>
          </div>

        </section>

        {/* Recent Activity List */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-headline text-headline-md font-extrabold text-[#1c1c19] text-[16px]">Recent Sessions</h2>
            <span 
              onClick={() => navigate("/mistakes")}
              className="text-[14.5px] font-bold text-primary cursor-pointer hover:underline"
            >
              View Journal
            </span>
          </div>

          <div className="flex flex-col gap-4">
            {loading ? (
              <div className="text-center py-6 text-on-surface-variant text-sm font-bold opacity-60">Loading session logs...</div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-[#1a1a1a]/20 rounded-2xl bg-white">
                <span className="material-symbols-outlined text-3xl opacity-30 text-primary">history</span>
                <p className="text-sm font-bold opacity-60 mt-1">No sessions recorded yet</p>
                <button 
                  onClick={() => navigate("/dashboard")}
                  className="mt-3 text-xs bg-primary text-white border-2 border-black rounded-full px-3.5 py-1.5"
                >
                  Start Studying
                </button>
              </div>
            ) : (
              sessions.slice(0, 3).map((ses, sIdx) => (
                <div 
                  key={ses.id || sIdx}
                  className="bg-white rounded-[18px] border-2 border-[#1a1a1a] p-5 flex items-center gap-5 hover:translate-x-0.5 hover:-translate-y-0.5 transition-all shadow-ink-sm"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary-fixed border-2 border-black flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>menu_book</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-headline text-body-lg text-black font-extrabold truncate text-[15.5px]">{ses.subject}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[12px] font-bold text-[#faf7f2] bg-primary px-2 py-0.5 rounded-full border border-black shadow-[1px_1px_rgba(0,0,0,1)]">
                        {ses.duration} mins
                      </span>
                      <span className="text-[12px] text-on-surface-variant font-bold opacity-60">/// {formatDateHelper(ses.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Call To Action */}
        <button 
          onClick={() => navigate("/dashboard")}
          className="bg-primary text-white font-headline text-headline-md w-full py-4.5 rounded-xl border-2 border-black shadow-[4px_4px_0px_#1A1A1A] hover:bg-opacity-95 transition-all active:translate-y-1 active:shadow-none cursor-pointer mt-4 text-[16px] font-extrabold h-14 flex items-center justify-center"
        >
          Back to Dashboard
        </button>

      </main>
    </div>
  );
}
