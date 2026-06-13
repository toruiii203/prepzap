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
  const daysOfWeekFull = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weeklyHours = [0, 0, 0, 0, 0, 0, 0];

  sessions.forEach(s => {
    try {
      const date = new Date(s.created_at);
      const day = date.getDay(); // 0 is Sun, 1 is Mon...
      const idx = day === 0 ? 6 : day - 1; // map so Mon starts index 0, Sun is 6
      const diffTime = Math.abs(new Date().getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays <= 7) {
        weeklyHours[idx] += (s.duration || 0) / 60;
      }
    } catch {}
  });

  const maxHours = Math.max(...weeklyHours, 1);
  const weeklyData = daysOfWeek.map((day, idx) => {
    const hoursVal = weeklyHours[idx];
    const pct = Math.round((hoursVal / maxHours) * 80);
    const currentDayOfWeekIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
    return {
      day,
      dayFull: daysOfWeekFull[idx],
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
    <div className="w-full bg-[#FAF7F2] flex flex-col" style={{ minHeight: "100dvh" }}>

      <SharedSidebar active="/analytics" />

      {/* ── DESKTOP LAYOUT ── */}
      <div className="hidden md:flex md:ml-64 flex-col overflow-y-auto" style={{ height: "100vh" }}>
        <div className="flex-1 p-12 flex flex-col gap-6">

          {/* Desktop Header */}
          <header className="flex items-center justify-between">
            <div>
              <h2 className="text-[28px] font-black text-black tracking-tight">Performance Analytics</h2>
              <p className="text-[14px] font-bold text-black/50 mt-0.5">Real-time breakdown of your academic progress.</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 bg-[#F0EDE0] px-3 py-2 border-2 border-black rounded-lg shadow-[2px_2px_0px_#000]">
                <span className="material-symbols-outlined text-[#FF4D2E] text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
                <span className="text-[13px] font-extrabold">Streak: 12 Days</span>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(window.location.origin);
                }}
                className="w-10 h-10 flex items-center justify-center border-2 border-black rounded-full hover:bg-[#E2E2E2] transition-colors shadow-[2px_2px_0px_#000] bg-white cursor-pointer"
                aria-label="Share"
              >
                <span className="material-symbols-outlined text-[20px]">share</span>
              </button>
            </div>
          </header>

          {/* Bento Grid */}
          <div className="grid grid-cols-12 gap-6">

            {/* Weekly Activity Chart — full width */}
            <section className="col-span-12 bg-white border-2 border-black shadow-[5px_5px_0px_#000] p-5 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between mb-4 border-b-2 border-black pb-3">
                <h3 className="text-[16px] font-extrabold flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px]">query_stats</span>
                  Weekly Activity (Last 7 Days)
                </h3>
                <div className="flex gap-2">
                  <button className="bg-black text-white px-3 py-1 rounded-full text-[12px] font-extrabold">Studying</button>
                  <button className="bg-[#F0EDE0] border-2 border-black px-3 py-1 rounded-full text-[12px] font-extrabold hover:bg-black hover:text-white transition-colors">Revision</button>
                </div>
              </div>

              {/* Chart */}
              <div className="h-56 w-full flex items-end justify-between px-6 relative">
                {/* Grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between opacity-5 pointer-events-none px-6 py-4">
                  {[0,1,2,3].map(i => (
                    <div key={i} className="border-b border-black w-full" />
                  ))}
                </div>

                {/* Bars */}
                <div className="flex-1 flex items-end justify-around h-44 relative z-10">
                  {weeklyData.map((bar, idx) => (
                    <div
                      key={idx}
                      onMouseEnter={() => setHoveredBar(idx)}
                      onMouseLeave={() => setHoveredBar(null)}
                      className="flex flex-col items-center gap-2 w-12 group cursor-pointer relative"
                    >
                      {hoveredBar === idx && (
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-black text-white text-[12px] px-2 py-0.5 rounded font-bold whitespace-nowrap z-25 pointer-events-none">
                          {bar.hours}
                        </div>
                      )}
                      <div
                        className="w-8 border-2 border-black rounded-t transition-all duration-300"
                        style={{
                          height: bar.height,
                          backgroundColor: bar.highlighted ? "#FF4D2E" : hoveredBar === idx ? "#FF4D2E" : "#E2E2E2",
                          minHeight: "8px"
                        }}
                      />
                      <span className={`text-[12px] font-extrabold ${bar.highlighted ? "text-[#FF4D2E]" : "text-black/60"}`}>
                        {bar.dayFull}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Quick Stats Row */}
            <section className="col-span-12 grid grid-cols-3 gap-6">
              {/* Active Time */}
              <div className="bg-white border-2 border-black shadow-[3px_3px_0px_#000] p-5 rounded-xl flex flex-col gap-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-black text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>timer</span>
                  <span className="text-[12px] font-extrabold uppercase tracking-wider text-black/50">Active Time</span>
                </div>
                <span className="text-[36px] font-black leading-none">{activeHoursStr}</span>
                <span className="text-[12px] font-bold text-black/40">Total study time logged</span>
              </div>

              {/* Sessions — highlighted */}
              <div className="bg-black text-white border-2 border-black shadow-[3px_3px_0px_#000] p-5 rounded-xl flex flex-col gap-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-[#FF4D2E] text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                  <span className="text-[12px] font-extrabold uppercase tracking-wider text-white/50">Sessions</span>
                </div>
                <span className="text-[36px] font-black leading-none">{totalSessionsCount}</span>
                <span className="text-[12px] font-bold text-white/40">Study sessions recorded</span>
              </div>

              {/* Task Rate */}
              <div className="bg-white border-2 border-black shadow-[3px_3px_0px_#000] p-5 rounded-xl flex flex-col gap-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-black text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>target</span>
                  <span className="text-[12px] font-extrabold uppercase tracking-wider text-black/50">Task Rate</span>
                </div>
                <span className="text-[36px] font-black leading-none">{tasksCompletedPct}%</span>
                <span className="text-[12px] font-bold text-black/40">Tasks completed this week</span>
              </div>
            </section>

            {/* Knowledge Distribution */}
            <section className="col-span-5 bg-white border-2 border-black shadow-[5px_5px_0px_#000] p-5 rounded-xl">
              <div className="mb-4 border-b-2 border-black pb-3">
                <h3 className="text-[16px] font-extrabold flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px]">hexagon</span>
                  Knowledge Distribution
                </h3>
              </div>
              <div className="flex flex-col items-center">
                <div className="relative w-56 h-56 flex items-center justify-center">
                  <div className="absolute inset-0 border-2 border-black rotate-45 opacity-10 rounded" />
                  <div className="absolute inset-4 border-2 border-black rotate-45 opacity-20 rounded" />
                  <div className="absolute inset-8 border-2 border-black rotate-45 opacity-30 rounded" />
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
                    <span className="text-[10px] font-extrabold uppercase">Quantum</span>
                    <div className="w-2 h-2 bg-[#FF4D2E] rounded-full border border-black" />
                  </div>
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
                    <div className="w-2 h-2 bg-[#FF4D2E] rounded-full border border-black" />
                    <span className="text-[10px] font-extrabold uppercase">Logic</span>
                  </div>
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <span className="text-[10px] font-extrabold uppercase">Bio</span>
                    <div className="w-2 h-2 bg-[#FF4D2E] rounded-full border border-black" />
                  </div>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <div className="w-2 h-2 bg-[#FF4D2E] rounded-full border border-black" />
                    <span className="text-[10px] font-extrabold uppercase">Hist</span>
                  </div>
                  <div className="w-28 h-28 bg-[#FF4D2E]/20 border-2 border-[#FF4D2E] rounded-full" />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 w-full">
                  <div className="p-3 border-2 border-black bg-[#F0EDE0] rounded-lg shadow-[2px_2px_0px_#000]">
                    <p className="text-[11px] font-bold text-black/50 uppercase">Mastery</p>
                    <p className="text-[22px] font-black">84%</p>
                  </div>
                  <div className="p-3 border-2 border-black bg-[#F0EDE0] rounded-lg shadow-[2px_2px_0px_#000]">
                    <p className="text-[11px] font-bold text-black/50 uppercase">Retention</p>
                    <p className="text-[22px] font-black">92%</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Recent Sessions / Assessments */}
            <section className="col-span-7 bg-white border-2 border-black shadow-[5px_5px_0px_#000] p-5 rounded-xl flex flex-col">
              <div className="mb-4 border-b-2 border-black pb-3 flex items-center justify-between">
                <h3 className="text-[16px] font-extrabold flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px]">assignment_turned_in</span>
                  Recent Sessions
                </h3>
                <button
                  onClick={() => navigate("/mistakes")}
                  className="text-[13px] font-extrabold underline hover:text-[#FF4D2E] transition-colors"
                >
                  View Journal
                </button>
              </div>

              {loading ? (
                <div className="flex-1 flex items-center justify-center text-[13px] font-bold text-black/40">
                  Loading session logs...
                </div>
              ) : sessions.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 py-10 border-2 border-dashed border-black/20 rounded-xl">
                  <span className="material-symbols-outlined text-[36px] text-black/20">history</span>
                  <p className="text-[13px] font-bold text-black/40">No sessions recorded yet</p>
                  <button
                    onClick={() => navigate("/dashboard")}
                    className="text-[12px] bg-black text-white border-2 border-black rounded-full px-4 py-1.5 font-extrabold shadow-[2px_2px_0px_#000] hover:opacity-80 transition-opacity"
                  >
                    Start Studying
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b-2 border-black">
                        <th className="pb-3 text-[12px] font-extrabold uppercase tracking-wider text-black/50">Subject</th>
                        <th className="pb-3 text-[12px] font-extrabold uppercase tracking-wider text-black/50">Date</th>
                        <th className="pb-3 text-[12px] font-extrabold uppercase tracking-wider text-black/50">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/10">
                      {sessions.slice(0, 5).map((ses, sIdx) => (
                        <tr key={ses.id || sIdx} className="hover:bg-[#F0EDE0] transition-colors">
                          <td className="py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg border-2 border-black bg-[#E2E2E2] flex items-center justify-center flex-shrink-0">
                                <span className="material-symbols-outlined text-black text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>menu_book</span>
                              </div>
                              <span className="text-[14px] font-extrabold truncate max-w-[180px]">{ses.subject}</span>
                            </div>
                          </td>
                          <td className="py-3 text-[13px] font-bold text-black/50">{formatDateHelper(ses.created_at)}</td>
                          <td className="py-3">
                            <span className="text-[12px] font-extrabold bg-black text-white px-2 py-0.5 rounded-full border border-black">
                              {ses.duration} mins
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* AI Learning Insight Banner */}
            <section className="col-span-12 bg-black text-white p-6 rounded-xl shadow-[5px_5px_0px_#FF4D2E] flex flex-col md:flex-row items-center gap-6">
              <div className="flex-1">
                <h4 className="text-[15px] font-extrabold text-[#FF4D2E] mb-2">AI Learning Insight</h4>
                <p className="text-[14px] font-bold text-white/80 leading-relaxed">
                  Your peak retention occurs between 8:00 AM and 10:30 AM. You are 24% more likely to master complex STEM concepts during this window. Consider shifting high-difficulty sessions to your morning block.
                </p>
              </div>
              <div className="flex-shrink-0">
                <button
                  onClick={() => navigate("/planner")}
                  className="bg-[#FF4D2E] text-white border-2 border-white shadow-[3px_3px_0px_#FF4D2E] font-extrabold text-[13px] px-6 py-2.5 rounded-lg hover:bg-white hover:text-black transition-all active:translate-x-0.5 active:translate-y-0.5"
                >
                  Optimise Schedule
                </button>
              </div>
            </section>

          </div>
        </div>
      </div>

      {/* ── MOBILE LAYOUT — DO NOT TOUCH ── */}
      <div className="lg:hidden w-full flex flex-col bg-[#FAF7F2]" style={{ height: "100dvh", overflow: "hidden" }}>
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
      </div>

    </div>
  );
}
