import { useNavigate } from "react-router-dom";
import { SharedSidebar } from "@/components/SharedSidebar";
import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface PlannerSession {
  id: string | number;
  subject: string;
  time: string;           // display string e.g. "10:00 AM - 11:30 AM"
  timeHour?: number;      // 0-23 for timeline sort
  topic?: string;
  color?: string;
  completed: boolean;
  dayNum?: number;        // day of month this session belongs to
  dueDate?: string;       // ISO date string for deadline entries
  isDue?: boolean;        // marks this as a deadline/due event
  estimatedHours?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STORAGE_KEY = "studenius_planner_slots";
const STREAK_KEY  = "studenius_streak";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

/** Build a full calendar grid for a given year/month (0-indexed month). */
function buildCalendarGrid(year: number, month: number): (number | null)[] {
  const firstDow = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev  = new Date(year, month, 0).getDate();
  const grid: (number | null)[] = [];

  // Leading prev-month days
  for (let i = firstDow - 1; i >= 0; i--) grid.push(-(daysInPrev - i));
  // Current month
  for (let d = 1; d <= daysInMonth; d++) grid.push(d);
  // Trailing next-month days
  const trailing = 42 - grid.length;
  for (let i = 1; i <= trailing; i++) grid.push(-(i + 100)); // encode as negative

  return grid;
}

/** Relative deadline label from ISO date string. */
function relativeDeadline(iso: string): { label: string; urgent: boolean } {
  const today = new Date(); today.setHours(0,0,0,0);
  const target = new Date(iso); target.setHours(0,0,0,0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff < 0)  return { label: "PAST DUE", urgent: true };
  if (diff === 0) return { label: "TODAY",    urgent: true };
  if (diff === 1) return { label: "TOMORROW", urgent: true };
  if (diff < 7)  return { label: `IN ${diff} DAYS`, urgent: false };
  if (diff === 7) return { label: "IN 1 WEEK",  urgent: false };
  return { label: `IN ${Math.floor(diff / 7)} WEEKS`, urgent: false };
}

/** Parse hour from time string like "10:00 AM - 11:30 AM" */
function parseTimeHour(time: string): number {
  const match = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 0;
  let h = parseInt(match[1]);
  const pm = match[3].toUpperCase() === "PM";
  if (pm && h !== 12) h += 12;
  if (!pm && h === 12) h = 0;
  return h;
}

function getDefaultSessions(): PlannerSession[] {
  const today = new Date();
  const d = today.getDate();
  const m = today.getMonth();
  const y = today.getFullYear();

  const isoOffset = (days: number) =>
    new Date(y, m, d + days).toISOString().split("T")[0];

  return [
    {
      id: "s1", subject: "Calculus III",
      time: "10:00 AM - 11:30 AM", timeHour: 10,
      topic: "Chapter 4 Review", color: "bg-blue-500",
      completed: false, dayNum: d, estimatedHours: 1.5,
    },
    {
      id: "s2", subject: "World History",
      time: "02:00 PM - 03:30 PM", timeHour: 14,
      topic: "Essay Draft Check", color: "bg-green-500",
      completed: false, dayNum: d, estimatedHours: 1.5,
    },
    {
      id: "s3", subject: "Chemistry Lab",
      time: "08:00 AM - 09:00 AM", timeHour: 8,
      topic: "Qualitative Assay", color: "bg-emerald-700",
      completed: true, dayNum: d, estimatedHours: 1,
    },
    {
      id: "dl1", subject: "Physics Lab Report",
      time: "11:59 PM", timeHour: 23,
      topic: "Submit by 23:59", color: "bg-red-500",
      completed: false, dayNum: d + 1,
      dueDate: isoOffset(1), isDue: true, estimatedHours: 0,
    },
    {
      id: "dl2", subject: "Macroeconomics Essay",
      time: "11:59 PM", timeHour: 23,
      topic: "Draft completion goal", color: "bg-orange-500",
      completed: false, dayNum: d + 3,
      dueDate: isoOffset(3), isDue: true, estimatedHours: 0,
    },
    {
      id: "dl3", subject: "Ethics Mid-Term Exam",
      time: "09:00 AM", timeHour: 9,
      topic: "Exam day", color: "bg-purple-500",
      completed: false, dayNum: d + 7,
      dueDate: isoOffset(7), isDue: true, estimatedHours: 0,
    },
  ];
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface AddEventFormProps {
  onClose: () => void;
  handleAddSubmit: (e: React.FormEvent) => void;
  newIsDue: boolean;
  setNewIsDue: (v: boolean) => void;
  newSubj: string;
  setNewSubj: (v: string) => void;
  newTime: string;
  setNewTime: (v: string) => void;
  newTopic: string;
  setNewTopic: (v: string) => void;
  newDueDate: string;
  setNewDueDate: (v: string) => void;
  newHours: string;
  setNewHours: (v: string) => void;
}

function AddEventForm({ onClose, handleAddSubmit, newIsDue, setNewIsDue, newSubj, setNewSubj, newTime, setNewTime, newTopic, setNewTopic, newDueDate, setNewDueDate, newHours, setNewHours }: AddEventFormProps) {
  return (
    <form
      onSubmit={handleAddSubmit}
      className="bg-white border-2 border-black shadow-[5px_5px_0px_#000] p-6 flex flex-col gap-4"
    >
      <div className="flex items-center justify-between border-b-2 border-black pb-3">
        <h4 className="text-[13px] font-black uppercase tracking-widest text-[#E8534A]">
          Add New {newIsDue ? "Deadline" : "Study Slot"}
        </h4>
        <button type="button" onClick={onClose}>
          <span className="material-symbols-outlined text-[20px] hover:text-[#E8534A]">close</span>
        </button>
      </div>

      {/* Slot / Deadline toggle */}
      <div className="flex border-2 border-black overflow-hidden">
        {([false, true] as const).map((isDue) => (
          <button
            key={String(isDue)}
            type="button"
            onClick={() => setNewIsDue(isDue)}
            className={`flex-1 py-2 text-[12px] font-black uppercase tracking-wider border-r-2 last:border-r-0 border-black transition-colors ${
              newIsDue === isDue ? "bg-black text-white" : "bg-white text-black hover:bg-[#E2E2E2]"
            }`}
          >
            {isDue ? "Deadline" : "Study Slot"}
          </button>
        ))}
      </div>

      <input
        type="text"
        placeholder={newIsDue ? "Assignment / Exam name" : "Subject (e.g. Calculus III)"}
        value={newSubj}
        onChange={e => setNewSubj(e.target.value)}
        className="border-2 border-black px-3 py-2.5 text-[13px] font-bold focus:outline-none"
        required
      />
      <input
        type="text"
        placeholder="Time (e.g. 10:00 AM - 11:30 AM)"
        value={newTime}
        onChange={e => setNewTime(e.target.value)}
        className="border-2 border-black px-3 py-2.5 text-[13px] font-bold focus:outline-none"
        required
      />
      <input
        type="text"
        placeholder="Topic / Notes (optional)"
        value={newTopic}
        onChange={e => setNewTopic(e.target.value)}
        className="border-2 border-black px-3 py-2.5 text-[13px] font-bold focus:outline-none"
      />
      {newIsDue && (
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-black uppercase tracking-widest text-black/50">Due Date</label>
          <input
            type="date"
            value={newDueDate}
            onChange={e => setNewDueDate(e.target.value)}
            className="border-2 border-black px-3 py-2.5 text-[13px] font-bold focus:outline-none"
          />
        </div>
      )}
      {!newIsDue && (
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-black uppercase tracking-widest text-black/50">Estimated Hours</label>
          <input
            type="number"
            min="0.5" max="12" step="0.5"
            value={newHours}
            onChange={e => setNewHours(e.target.value)}
            className="border-2 border-black px-3 py-2.5 text-[13px] font-bold focus:outline-none"
          />
        </div>
      )}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2.5 border-2 border-black text-[13px] font-black hover:bg-[#E2E2E2] transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 relative group cursor-pointer"
        >
          <div className="w-full py-2.5 bg-black text-white border-2 border-black text-[13px] font-black z-10 relative group-active:translate-y-0.5 group-active:translate-x-0.5 transition-transform">
            Save
          </div>
          <div className="absolute inset-0 bg-[#E8534A] translate-y-1 translate-x-1 group-active:translate-y-0 group-active:translate-x-0 transition-transform" />
        </button>
      </div>
    </form>
  );
}

export default function StudyPlanner() {
  const navigate = useNavigate();

  // ── Date state ──
  const todayDate  = new Date();
  const [viewYear,  setViewYear]  = useState(todayDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(todayDate.getMonth());
  const [selectedDayNum, setSelectedDayNum] = useState(todayDate.getDate());

  // ── Data state ──
  const [sessions, setSessions] = useState<PlannerSession[]>([]);
  const [streak,   setStreak]   = useState(0);

  // ── Form state ──
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSubj,     setNewSubj]     = useState("");
  const [newTime,     setNewTime]     = useState("");
  const [newTopic,    setNewTopic]    = useState("");
  const [newDueDate,  setNewDueDate]  = useState("");
  const [newIsDue,    setNewIsDue]    = useState(false);
  const [newHours,    setNewHours]    = useState("1.5");

  // ── Load from localStorage ──
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try { setSessions(JSON.parse(raw)); } catch { setSessions(getDefaultSessions()); }
    } else {
      const def = getDefaultSessions();
      setSessions(def);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(def));
    }

    const streakRaw = localStorage.getItem(STREAK_KEY);
    setStreak(streakRaw ? parseInt(streakRaw) || 14 : 14);
  }, []);

  const save = (updated: PlannerSession[]) => {
    setSessions(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  // ── Calendar grid ──
  const calendarGrid = useMemo(
    () => buildCalendarGrid(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const isCurrentMonth =
    viewYear === todayDate.getFullYear() && viewMonth === todayDate.getMonth();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  // ── Derived data ──
  const sessionsThisMonth = sessions.filter(s =>
    s.dayNum !== undefined &&
    s.dayNum >= 1 &&
    s.dayNum <= new Date(viewYear, viewMonth + 1, 0).getDate() &&
    !s.isDue
  );

  const daysWithSessions = new Set(sessionsThisMonth.map(s => s.dayNum));

  const selectedDaySessions = sessions
    .filter(s => s.dayNum === selectedDayNum && !s.isDue)
    .sort((a, b) => (a.timeHour ?? 0) - (b.timeHour ?? 0));

  const deadlines = sessions
    .filter(s => s.isDue && s.dueDate)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 3);

  // Productivity: completed non-deadline sessions / total non-deadline
  const nonDue = sessions.filter(s => !s.isDue);
  const productivityScore = nonDue.length > 0
    ? Math.round((nonDue.filter(s => s.completed).length / nonDue.length) * 100)
    : 0;

  // Weekly goals: study hours = sum of estimatedHours for completed sessions
  const completedHours = nonDue
    .filter(s => s.completed)
    .reduce((acc, s) => acc + (s.estimatedHours ?? 1.5), 0);
  const targetHours = Math.max(nonDue.reduce((acc, s) => acc + (s.estimatedHours ?? 1.5), 0), 40);

  const quizSessions  = nonDue.filter(s => s.topic?.toLowerCase().includes("quiz") || s.subject.toLowerCase().includes("quiz"));
  const doneQuizzes   = quizSessions.filter(s => s.completed).length;
  const totalQuizzes  = Math.max(quizSessions.length, 6);

  const libCitations  = sessions.filter(s => s.topic?.toLowerCase().includes("library") || s.topic?.toLowerCase().includes("source")).length;

  // ── CRUD ──
  const handleToggle = (id: string | number) => {
    save(sessions.map(s => s.id === id ? { ...s, completed: !s.completed } : s));
  };

  const handleDelete = (id: string | number) => {
    save(sessions.filter(s => s.id !== id));
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubj || !newTime) return;
    const colors = ["bg-blue-500","bg-green-500","bg-purple-500","bg-amber-600","bg-rose-500","bg-yellow-500"];
    const color  = colors[Math.floor(Math.random() * colors.length)];
    const hour   = parseTimeHour(newTime);

    // Resolve dayNum from dueDate if deadline, else use selectedDayNum
    let dayNum = selectedDayNum;
    if (newIsDue && newDueDate) {
      dayNum = new Date(newDueDate).getDate();
    }

    const newS: PlannerSession = {
      id: "slot_" + Date.now(),
      subject:        newSubj,
      time:           newTime,
      timeHour:       hour,
      topic:          newTopic || "General study session",
      color,
      completed:      false,
      dayNum,
      isDue:          newIsDue,
      dueDate:        newIsDue && newDueDate ? newDueDate : undefined,
      estimatedHours: parseFloat(newHours) || 1.5,
    };
    save([...sessions, newS]);
    setNewSubj(""); setNewTime(""); setNewTopic(""); setNewDueDate("");
    setNewIsDue(false); setNewHours("1.5");
    setShowAddForm(false);
  };

  // ─── Shared: Calendar ────────────────────────────────────────────────────────
  const CalendarGrid = ({ compact = false }: { compact?: boolean }) => (
    <div className={`border-2 border-black bg-white shadow-[3px_3px_0px_#000] ${compact ? "p-4" : "p-5"}`}>
      {/* Month header */}
      <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-3">
        <h3 className={`font-black uppercase tracking-tight ${compact ? "text-[14px]" : "text-[16px]"}`}>
          {MONTH_NAMES[viewMonth]} {viewYear}
        </h3>
        <div className="flex gap-1">
          <button
            onClick={prevMonth}
            className="w-7 h-7 border-2 border-black flex items-center justify-center hover:bg-[#E2E2E2] transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">chevron_left</span>
          </button>
          <button
            onClick={nextMonth}
            className="w-7 h-7 border-2 border-black flex items-center justify-center hover:bg-[#E2E2E2] transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>
        </div>
      </div>
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 text-center mb-2">
        {["S","M","T","W","T","F","S"].map((d, i) => (
          <div key={i} className="text-[11px] font-black text-black/40">{d}</div>
        ))}
      </div>
      {/* Date cells */}
      <div className="grid grid-cols-7 gap-y-1">
        {calendarGrid.map((cell, idx) => {
          const isOtherMonth = cell !== null && cell <= 0;
          const day = isOtherMonth ? Math.abs(cell ?? 0) % 100 : cell;
          const isToday = isCurrentMonth && day === todayDate.getDate() && !isOtherMonth;
          const isSelected = !isOtherMonth && day === selectedDayNum && isCurrentMonth;
          const hasSession = !isOtherMonth && day !== null && daysWithSessions.has(day as number);

          return (
            <div
              key={idx}
              onClick={() => { if (!isOtherMonth && day) setSelectedDayNum(day as number); }}
              className={`relative flex flex-col items-center justify-center cursor-pointer ${compact ? "h-7" : "h-8"}`}
            >
              <span
                className={`${compact ? "w-6 h-6 text-[11px]" : "w-7 h-7 text-[13px]"} flex items-center justify-center font-bold transition-all
                  ${isOtherMonth ? "text-black/20 cursor-default" : "hover:bg-[#E2E2E2]"}
                  ${isSelected ? "bg-[#E8534A] text-white border-2 border-black shadow-[1px_1px_0px_#000]" : ""}
                  ${isToday && !isSelected ? "bg-black text-white" : ""}
                `}
              >
                {day ?? ""}
              </span>
              {hasSession && !isOtherMonth && (
                <div className="w-1.5 h-1.5 rounded-full bg-[#E8534A] absolute bottom-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  // ─── Shared: Timeline ────────────────────────────────────────────────────────
  const TimelinePanel = () => {
    const today = new Date();
    const label = isCurrentMonth && selectedDayNum === today.getDate()
      ? "TODAY"
      : `${MONTH_NAMES[viewMonth].slice(0,3).toUpperCase()} ${selectedDayNum}`;

    return (
      <div className="border-2 border-black bg-white shadow-[3px_3px_0px_#000] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b-2 border-black bg-white shrink-0">
          <h3 className="text-[13px] font-black uppercase tracking-widest">Today's Timeline</h3>
          <span className="bg-black text-white text-[11px] font-black px-3 py-1">{label}</span>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
          {selectedDaySessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
              <span className="material-symbols-outlined text-[36px] text-black/20">calendar_today</span>
              <p className="text-[13px] font-black text-black/40">No sessions for this day</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 border-2 border-black text-[12px] font-black hover:bg-[#E2E2E2] transition-colors"
              >
                + Add Session
              </button>
            </div>
          ) : (
            selectedDaySessions.map((s) => {
              const isNow = isCurrentMonth &&
                selectedDayNum === today.getDate() &&
                (s.timeHour ?? 0) <= today.getHours() &&
                (s.timeHour ?? 0) + 2 >= today.getHours();
              return (
                <div key={s.id} className="flex gap-3">
                  <div className={`w-12 shrink-0 text-right text-[11px] font-black pt-1 ${isNow ? "text-[#E8534A]" : "text-black/40"}`}>
                    {s.time.split(" - ")[0]}
                  </div>
                  <div className={`flex-1 border-2 border-black px-4 py-3 relative overflow-hidden transition-all ${
                    isNow
                      ? "bg-white shadow-[3px_3px_0px_#000]"
                      : s.completed
                      ? "bg-[#F0EDE0] opacity-60"
                      : "bg-[#FAF7F2]"
                  }`}>
                    {/* Color ribbon */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${s.color || "bg-blue-500"}`} />
                    <div className="pl-3">
                      <div className={`text-[13px] font-black ${s.completed ? "line-through text-black/40" : ""}`}>
                        {s.subject}
                      </div>
                      {s.topic && (
                        <div className="text-[11px] font-semibold text-black/50 mt-0.5">{s.topic}</div>
                      )}
                      {isNow && (
                        <div className="mt-2">
                          <div className="text-[10px] font-black uppercase tracking-widest text-[#E8534A] mb-1">In Progress</div>
                          <div className="h-1.5 w-full bg-[#E8E4DC] border border-black overflow-hidden">
                            <div className="h-full bg-black" style={{ width: `${Math.min(((today.getHours() - (s.timeHour ?? 0)) / 1.5) * 100, 100)}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="absolute top-2 right-2 opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity"
                    >
                      <span className="material-symbols-outlined text-[14px] text-black/30 hover:text-[#E8534A]">close</span>
                    </button>
                  </div>
                  <input
                    type="checkbox"
                    checked={s.completed}
                    onChange={() => handleToggle(s.id)}
                    className="mt-1.5 w-4 h-4 border-2 border-black cursor-pointer accent-[#ae2925] shrink-0"
                  />
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  // ─── Shared: Deadlines panel ─────────────────────────────────────────────
  const DeadlinesPanel = () => (
    <div className="border-2 border-black bg-black text-white shadow-[3px_3px_0px_#000] p-5 flex flex-col gap-4">
      <h3 className="text-[11px] font-black uppercase tracking-widest border-b-2 border-white/20 pb-3">
        Deadlines
      </h3>
      {deadlines.length === 0 ? (
        <p className="text-[12px] font-bold text-white/40 py-4 text-center">No upcoming deadlines</p>
      ) : (
        <div className="flex flex-col gap-3">
          {deadlines.map((dl, i) => {
            const { label, urgent } = relativeDeadline(dl.dueDate!);
            return (
              <div
                key={dl.id}
                className={`px-3 py-3 border border-white/20 ${i === 0 ? "bg-white/10" : ""}`}
              >
                <div className="flex items-start justify-between mb-1">
                  <span className={`text-[11px] font-black uppercase tracking-widest ${urgent ? "text-[#E8534A]" : "text-white/50"}`}>
                    {label}
                  </span>
                  {urgent && <span className="material-symbols-outlined text-[14px] text-[#E8534A]">priority_high</span>}
                </div>
                <div className="text-[13px] font-black">{dl.subject}</div>
                {dl.topic && <div className="text-[11px] text-white/50 mt-0.5">{dl.topic}</div>}
              </div>
            );
          })}
        </div>
      )}
      <button
        onClick={() => setShowAddForm(true)}
        className="w-full py-2 border-2 border-white text-[12px] font-black uppercase tracking-wider hover:bg-white hover:text-black transition-colors mt-1"
      >
        + Add New Event
      </button>
    </div>
  );

  // ─── Shared: Weekly Goals ─────────────────────────────────────────────────
  const WeeklyGoalsPanel = () => {
    const goals = [
      { label: "Study Hours",    current: Math.round(completedHours * 10) / 10, target: 40,            unit: "h",  pct: Math.min((completedHours / 40) * 100, 100), color: "bg-[#F5A623]" },
      { label: "AI Quizzes",     current: doneQuizzes,   target: totalQuizzes,  unit: "",  pct: Math.min((doneQuizzes / totalQuizzes) * 100, 100), color: "bg-black" },
      { label: "Library Sources",current: libCitations,  target: 50,            unit: "",  pct: Math.min((libCitations / 50) * 100, 100), color: "bg-black" },
    ];
    return (
      <div className="border-2 border-black bg-white shadow-[3px_3px_0px_#000] p-5">
        <h3 className="text-[11px] font-black uppercase tracking-widest border-b-2 border-black pb-3 mb-4">
          Weekly Goals
        </h3>
        <div className="flex flex-col gap-4">
          {goals.map((g) => (
            <div key={g.label}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] font-black">{g.label}</span>
                <span className="text-[11px] font-bold text-black/50">
                  {g.current}{g.unit}/{g.target}{g.unit}
                </span>
              </div>
              <div className="h-2.5 w-full bg-[#E8E4DC] border-2 border-black overflow-hidden">
                <div
                  className={`h-full ${g.color} transition-all duration-500`}
                  style={{ width: `${g.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ─── Shared: Productivity Score ───────────────────────────────────────────
  const ProductivityCard = () => (
    <div className="border-2 border-black bg-[#F0EDE0] shadow-[3px_3px_0px_#000] p-5">
      <div className="flex items-center gap-2 mb-2">
        <span className="material-symbols-outlined text-[#F5A623] text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
        <h4 className="text-[11px] font-black uppercase tracking-widest">Productivity Score</h4>
      </div>
      <div className="text-[48px] font-black leading-none mb-1">{productivityScore}%</div>
      <p className="text-[11px] font-bold text-black/50">
        {productivityScore >= 80
          ? "You're in the top 5% of Studenius users this week!"
          : productivityScore >= 50
          ? "Good progress — keep completing your sessions!"
          : "Start completing sessions to boost your score."}
      </p>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="w-full bg-[#FAF7F2] flex flex-col" style={{ minHeight: "100dvh" }}>

      <SharedSidebar active="/planner" />

      {/* ═══════════════════════════════════════════════════
          DESKTOP LAYOUT
          ═══════════════════════════════════════════════════ */}
      <div className="hidden md:flex md:ml-64 flex-col" style={{ height: "100vh" }}>

        {/* Desktop Header */}
        <header className="h-16 flex items-center justify-between px-8 border-b-2 border-black bg-[#FAF7F2] shrink-0 z-30">
          <div>
            <h2 className="text-[22px] font-black tracking-tight uppercase">Academic Planner</h2>
            <p className="text-[12px] font-bold text-black/40 italic">
              {MONTH_NAMES[viewMonth]} {viewYear} · Week {Math.ceil(selectedDayNum / 7)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 border-2 border-black px-3 py-1.5 bg-white shadow-[2px_2px_0px_#000]">
              <span className="material-symbols-outlined text-[#E8534A] text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
              <span className="text-[12px] font-black uppercase tracking-widest">{streak} Day Streak</span>
            </div>
            <button className="material-symbols-outlined text-black hover:text-[#FF4D2E] transition-colors">notifications</button>
            <button onClick={() => navigate("/go-pro")} className="material-symbols-outlined text-black hover:text-[#F5A623] transition-colors">workspace_premium</button>
            <div onClick={() => navigate("/profile")} className="w-10 h-10 border-2 border-black bg-[#ae2925] text-white flex items-center justify-center font-black text-[14px] cursor-pointer">
              S
            </div>
          </div>
        </header>

        {/* Desktop 3-col bento */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-8 h-full">
            <div className="grid grid-cols-12 gap-6 h-full">

              {/* Col 1 — Calendar + Productivity (4 cols) */}
              <div className="col-span-4 flex flex-col gap-5">
                <CalendarGrid />
                <ProductivityCard />
                {/* Quick actions */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="border-2 border-black bg-white p-4 flex flex-col items-center gap-1 hover:bg-[#E2E2E2] transition-colors shadow-[2px_2px_0px_#000]"
                  >
                    <span className="material-symbols-outlined text-[22px]">add_task</span>
                    <span className="text-[11px] font-black uppercase tracking-widest">New Task</span>
                  </button>
                  <button
                    onClick={() => navigate("/sources")}
                    className="border-2 border-black bg-white p-4 flex flex-col items-center gap-1 hover:bg-[#E2E2E2] transition-colors shadow-[2px_2px_0px_#000]"
                  >
                    <span className="material-symbols-outlined text-[22px]">auto_stories</span>
                    <span className="text-[11px] font-black uppercase tracking-widest">Resources</span>
                  </button>
                </div>
              </div>

              {/* Col 2 — Timeline (5 cols) */}
              <div className="col-span-5 flex flex-col">
                <TimelinePanel />
              </div>

              {/* Col 3 — Goals + Deadlines (3 cols) */}
              <div className="col-span-3 flex flex-col gap-5">
                <WeeklyGoalsPanel />
                <DeadlinesPanel />
              </div>

            </div>
          </div>
        </div>

        {/* Desktop Add Form overlay */}
        {showAddForm && (
          <div
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center"
            onClick={e => { if (e.target === e.currentTarget) setShowAddForm(false); }}
          >
            <div className="w-[480px] max-w-[90vw]">
              <AddEventForm onClose={() => setShowAddForm(false)} handleAddSubmit={handleAddSubmit} newIsDue={newIsDue} setNewIsDue={setNewIsDue} newSubj={newSubj} setNewSubj={setNewSubj} newTime={newTime} setNewTime={setNewTime} newTopic={newTopic} setNewTopic={setNewTopic} newDueDate={newDueDate} setNewDueDate={setNewDueDate} newHours={newHours} setNewHours={setNewHours} />
            </div>
          </div>
        )}

      </div>

      {/* ═══════════════════════════════════════════════════
          MOBILE LAYOUT — preserved + enhanced
          ═══════════════════════════════════════════════════ */}
      <div className="lg:hidden w-full flex flex-col bg-[#FAF7F2]" style={{ height: "100dvh", overflow: "hidden" }}>

        {/* Mobile TopAppBar */}
        <header className="flex items-center justify-between px-4 h-14 bg-[#FAF7F2] shrink-0 border-b-2 border-black z-10">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center border-2 border-black bg-white w-9 h-9 shadow-[2px_2px_0px_#000] active:translate-y-0.5"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          </button>
          <h1 className="text-[18px] font-black">Studenius Planner</h1>
          <div className="flex items-center gap-1 border-2 border-black bg-white px-2 py-1 shadow-[2px_2px_0px_#000]">
            <span className="material-symbols-outlined text-[#E8534A] text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
            <span className="text-[11px] font-black">{streak}</span>
          </div>
        </header>

        {/* Mobile scrollable body */}
        <main className="flex-1 overflow-y-auto px-4 py-5 pb-24 flex flex-col gap-5">

          {/* Calendar */}
          <CalendarGrid compact />

          {/* Sessions for selected day */}
          <div>
            <h3 className="text-[15px] font-black mb-3">
              Sessions for {MONTH_NAMES[viewMonth]} {selectedDayNum}
            </h3>
            {selectedDaySessions.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-black/20 bg-white">
                <p className="text-[13px] font-bold text-black/40">No sessions for this day</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {selectedDaySessions.map((s) => (
                  <div
                    key={s.id}
                    className={`w-full bg-white border-2 border-black p-4 flex items-center gap-3 relative overflow-hidden shadow-[2px_2px_0px_#000] ${s.completed ? "opacity-60" : ""}`}
                  >
                    <div className={`absolute left-0 top-0 bottom-0 w-2.5 border-r-2 border-black ${s.color || "bg-blue-500"}`} />
                    <div className={`pl-3 flex-1 flex flex-col gap-1 ${s.completed ? "line-through" : ""}`}>
                      <span className="text-[11px] font-bold text-black/40 uppercase">{s.time}</span>
                      <span className="text-[15px] font-black">{s.subject}</span>
                      {s.topic && <span className="text-[12px] font-semibold text-black/50">{s.topic}</span>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => handleDelete(s.id)} className="hover:text-[#E8534A] transition-colors">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                      <input
                        type="checkbox"
                        checked={s.completed}
                        onChange={() => handleToggle(s.id)}
                        className="w-5 h-5 border-2 border-black cursor-pointer accent-[#ae2925]"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Productivity + Deadlines — mobile */}
          <ProductivityCard />
          <DeadlinesPanel />
          <WeeklyGoalsPanel />

          {/* Mobile add form inline */}
          {showAddForm && (
            <AddEventForm onClose={() => setShowAddForm(false)} handleAddSubmit={handleAddSubmit} newIsDue={newIsDue} setNewIsDue={setNewIsDue} newSubj={newSubj} setNewSubj={setNewSubj} newTime={newTime} setNewTime={setNewTime} newTopic={newTopic} setNewTopic={setNewTopic} newDueDate={newDueDate} setNewDueDate={setNewDueDate} newHours={newHours} setNewHours={setNewHours} />
          )}

        </main>

        {/* Mobile FAB */}
        <button
          onClick={() => setShowAddForm(true)}
          className="fixed bottom-24 right-5 w-14 h-14 bg-[#E8534A] text-white border-2 border-black flex items-center justify-center shadow-[3px_3px_0px_#000] active:translate-y-0.5 z-40 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
        </button>

      </div>

    </div>
  );
}
