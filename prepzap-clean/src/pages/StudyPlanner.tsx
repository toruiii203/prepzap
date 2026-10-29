import { useNavigate } from "react-router-dom";
import { SharedSidebar } from "@/components/SharedSidebar";
import { SkillGoals } from "@/components/SkillGoals";
import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToolHistory } from "@/pages/ToolHistory";
import { loadLibrary } from "@/lib/sourceContext";
import { useTutorialModal } from "@/hooks/useTutorialModal";
import { TutorialModal } from "@/components/TutorialModal";
import { TUTORIAL_CONTENT } from "@/lib/tutorialContent";
import { callGroq } from "@/lib/groq";
import { supabase } from "@/lib/supabase";
import { fireConfetti } from "@/lib/confetti";
import { playSuccess, playPop, playTap } from "@/lib/soundFX";
import { Mascot } from "@/components/Mascot";

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface PlannerSession {
  id: string | number;
  subject: string;
  time: string;
  timeHour?: number;
  topic?: string;
  color?: string;
  completed: boolean;
  dayNum?: number;
  month?: number;
  year?: number;
  dueDate?: string;
  isDue?: boolean;
  estimatedHours?: number;
  tool?: "flashcards" | "teach-it" | "practice" | "timer";
}

interface ActiveExamGoal {
  examName: string;
  examDate: string; // YYYY-MM-DD
  topics: string;
  dailyMinutes: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STORAGE_KEY = "studenius_planner_slots";
const EXAM_KEY = "studenius_active_exam";

const getPlannerKey = (userId?: string | null) =>
  userId ? `${STORAGE_KEY}_${userId}` : STORAGE_KEY;
const getExamKey = (userId?: string | null) =>
  userId ? `${EXAM_KEY}_${userId}` : EXAM_KEY;

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function buildCalendarGrid(year: number, month: number): (number | null)[] {
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  const grid: (number | null)[] = [];
  for (let i = firstDow - 1; i >= 0; i--) grid.push(-(daysInPrev - i));
  for (let d = 1; d <= daysInMonth; d++) grid.push(d);
  const trailing = 42 - grid.length;
  for (let i = 1; i <= trailing; i++) grid.push(-(i + 100));
  return grid;
}

function relativeDeadline(iso: string): { label: string; urgent: boolean; diffDays: number } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(iso);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return { label: "PAST DUE", urgent: true, diffDays: diff };
  if (diff === 0) return { label: "TODAY", urgent: true, diffDays: diff };
  if (diff === 1) return { label: "TOMORROW", urgent: true, diffDays: diff };
  if (diff < 7) return { label: `IN ${diff} DAYS`, urgent: false, diffDays: diff };
  if (diff === 7) return { label: "IN 1 WEEK", urgent: false, diffDays: diff };
  return { label: `IN ${Math.floor(diff / 7)} WEEKS`, urgent: false, diffDays: diff };
}

// ─── StudySlotCard Component ──────────────────────────────────────────────────
function StudySlotCard({
  session,
  onToggle,
  onDelete,
  onLaunch,
}: {
  session: PlannerSession;
  onToggle: (id: string | number) => void;
  onDelete: (id: string | number) => void;
  onLaunch: (path: string) => void;
}) {
  const isFlashcards =
    session.tool === "flashcards" ||
    session.subject.toLowerCase().includes("flashcard") ||
    (session.topic && session.topic.toLowerCase().includes("flashcard"));
  const isTeachIt =
    session.tool === "teach-it" ||
    session.subject.toLowerCase().includes("feynman") ||
    session.subject.toLowerCase().includes("teach");
  const isQuiz =
    session.tool === "practice" ||
    session.subject.toLowerCase().includes("quiz") ||
    session.subject.toLowerCase().includes("test");

  return (
    <div
      className={`border-3 border-black rounded-2xl p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
        session.completed
          ? "bg-[#ECFDF5] shadow-[2px_2px_0px_#000] opacity-90"
          : "bg-white shadow-[4px_4px_0px_#000]"
      }`}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <button
          type="button"
          onClick={() => onToggle(session.id)}
          className={`w-7 h-7 rounded-lg border-2 border-black flex items-center justify-center shrink-0 cursor-pointer shadow-[1px_1px_0px_#000] active:scale-[0.88] active:translate-x-0.5 active:translate-y-0.5 transition-transform ${
            session.completed ? "bg-[#10B981] text-white" : "bg-white hover:bg-[#FAF7F2]"
          }`}
          title="Mark completed (+50 XP)"
        >
          {session.completed && (
            <span className="material-symbols-outlined text-[18px]">check</span>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-black text-[15px] text-black truncate">
              {session.subject}
            </span>
            <span className="text-[11px] font-bold text-black/50">
              • {session.time}
            </span>
            {session.estimatedHours && (
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-[#FAF7F2] border border-black/30 rounded">
                {Math.round(session.estimatedHours * 60)}m
              </span>
            )}
          </div>

          {session.topic && (
            <p className="text-[12.5px] font-semibold text-black/70 mt-0.5 line-clamp-2">
              {session.topic}
            </p>
          )}

          {session.completed && (
            <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-black uppercase text-[#065F46] bg-green-100 px-2 py-0.5 rounded border border-green-300">
              <span className="material-symbols-outlined text-[12px]">verified</span>
              Completed (+50 XP Earned)
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
        {!session.completed && (
          <>
            {isFlashcards ? (
              <button
                onClick={() => onLaunch(`/flashcards?topic=${encodeURIComponent(session.topic || session.subject)}`)}
                className="flex-1 sm:flex-initial px-4 py-2 bg-[#FFE566] hover:bg-[#FFD13B] text-black border-2 border-black rounded-xl font-black text-[12px] shadow-[2px_2px_0px_#000] active:scale-[0.96] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">bolt</span>
                <span>Launch Cards</span>
              </button>
            ) : isTeachIt ? (
              <button
                onClick={() => onLaunch(`/teach-it?topic=${encodeURIComponent(session.topic || session.subject)}`)}
                className="flex-1 sm:flex-initial px-4 py-2 bg-[#10B981] hover:bg-black text-white border-2 border-black rounded-xl font-black text-[12px] shadow-[2px_2px_0px_#000] active:scale-[0.96] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">school</span>
                <span>Teach Pip</span>
              </button>
            ) : isQuiz ? (
              <button
                onClick={() => onLaunch(`/practice?topic=${encodeURIComponent(session.topic || session.subject)}`)}
                className="flex-1 sm:flex-initial px-4 py-2 bg-[#3B82F6] hover:bg-black text-white border-2 border-black rounded-xl font-black text-[12px] shadow-[2px_2px_0px_#000] active:scale-[0.96] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">quiz</span>
                <span>Practice Quiz</span>
              </button>
            ) : (
              <button
                onClick={() => onLaunch("/timer")}
                className="flex-1 sm:flex-initial px-4 py-2 bg-white hover:bg-black hover:text-white text-black border-2 border-black rounded-xl font-black text-[12px] shadow-[2px_2px_0px_#000] active:scale-[0.96] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">timer</span>
                <span>Focus Timer</span>
              </button>
            )}
          </>
        )}

        <button
          onClick={() => onDelete(session.id)}
          className="w-8 h-8 rounded-lg border border-black/20 hover:border-black hover:bg-red-50 text-black/30 hover:text-red-600 flex items-center justify-center cursor-pointer transition-colors active:scale-95"
          title="Remove slot"
        >
          <span className="material-symbols-outlined text-[16px]">delete</span>
        </button>
      </div>
    </div>
  );
}

// ─── StudyPlanner Component ───────────────────────────────────────────────────
export default function StudyPlanner() {
  const tutorial = useTutorialModal("/planner");
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();

  const [sessions, setSessions] = useState<PlannerSession[]>(() => {
    try {
      const raw = localStorage.getItem(getPlannerKey(user?.id));
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [activeExam, setActiveExam] = useState<ActiveExamGoal | null>(() => {
    try {
      const raw = localStorage.getItem(getExamKey(user?.id));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  // Save sessions & exam
  useEffect(() => {
    try {
      localStorage.setItem(getPlannerKey(user?.id), JSON.stringify(sessions));
    } catch {}
  }, [sessions, user?.id]);

  useEffect(() => {
    try {
      if (activeExam) localStorage.setItem(getExamKey(user?.id), JSON.stringify(activeExam));
      else localStorage.removeItem(getExamKey(user?.id));
    } catch {}
  }, [activeExam, user?.id]);

  // Calendar State
  const todayDate = useMemo(() => new Date(), []);
  const [viewMonth, setViewMonth] = useState(() => todayDate.getMonth());
  const [viewYear, setViewYear] = useState(() => todayDate.getFullYear());
  const [selectedDayNum, setSelectedDayNum] = useState(() => todayDate.getDate());

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAiPlanModal, setShowAiPlanModal] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);

  // Manual Add Form State
  const [newIsDue, setNewIsDue] = useState(false);
  const [newSubj, setNewSubj] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newTopic, setNewTopic] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newHours, setNewHours] = useState("1");

  // AI Plan Generator Form State
  const [aiExamName, setAiExamName] = useState("");
  const [aiExamDate, setAiExamDate] = useState("");
  const [aiTopics, setAiTopics] = useState("");
  const [aiMinutes, setAiMinutes] = useState(45);

  const isCurrentMonth = viewMonth === todayDate.getMonth() && viewYear === todayDate.getFullYear();
  const calendarGrid = useMemo(() => buildCalendarGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const prevMonth = () => {
    playTap();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    playTap();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Days with sessions
  const daysWithSessions = useMemo(() => {
    const set = new Set<number>();
    sessions.forEach((s) => {
      if (s.year === viewYear && s.month === viewMonth && s.dayNum) {
        set.add(s.dayNum);
      }
    });
    return set;
  }, [sessions, viewYear, viewMonth]);

  // Selected Day Sessions
  const selectedDaySessions = useMemo(() => {
    return sessions.filter(
      (s) => s.year === viewYear && s.month === viewMonth && s.dayNum === selectedDayNum
    );
  }, [sessions, viewYear, viewMonth, selectedDayNum]);

  // Deadlines
  const deadlines = useMemo(() => {
    return sessions.filter((s) => s.isDue && s.dueDate);
  }, [sessions]);

  // Toggle session complete
  const handleToggleComplete = async (id: string | number) => {
    playPop();
    const updated = sessions.map((s) => {
      if (s.id === id) {
        const nextState = !s.completed;
        if (nextState) {
          playSuccess();
          fireConfetti();
        }
        return { ...s, completed: nextState };
      }
      return s;
    });
    setSessions(updated);

    // Award +50 XP if completed
    if (user && profile) {
      const nextXp = (profile.total_xp || 0) + 50;
      await supabase.from("profiles").update({ total_xp: nextXp }).eq("id", user.id);
      await refreshProfile();
    }
  };

  const handleDeleteSession = (id: string | number) => {
    playTap();
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  const handleManualAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubj.trim()) return;

    const newSession: PlannerSession = {
      id: `slot_${Date.now()}`,
      subject: newSubj.trim(),
      time: newTime.trim() || "All Day",
      topic: newTopic.trim(),
      completed: false,
      dayNum: selectedDayNum,
      month: viewMonth,
      year: viewYear,
      isDue: newIsDue,
      dueDate: newIsDue ? newDueDate : undefined,
      estimatedHours: parseFloat(newHours) || 1,
    };

    setSessions((prev) => [...prev, newSession]);
    setShowAddModal(false);
    setNewSubj("");
    setNewTime("");
    setNewTopic("");
    setNewDueDate("");
    playSuccess();
  };

  // ── AI Spaced Repetition Plan Generator ───────────────────────────────────────
  const handleGenerateAiPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiExamName.trim() || !aiExamDate) return;

    setAiGenerating(true);
    const targetDate = new Date(aiExamDate);
    const today = new Date();
    const daysUntil = Math.max(1, Math.round((targetDate.getTime() - today.getTime()) / 86400000));

    try {
      const prompt = `You are an expert cognitive learning scientist. Create a high-yield spaced repetition study schedule for a student.
Target Exam: "${aiExamName}"
Exam Date: ${aiExamDate} (in ${daysUntil} days from today)
Topics: "${aiTopics || "Comprehensive course topics"}"
Daily Budget: ${aiMinutes} minutes/day

Create 5 to 7 spaced study milestones leading up to the exam using the Ebbinghaus forgetting curve.
Tools available: "flashcards" (active recall), "teach-it" (Feynman technique), "practice" (mock quiz), "timer" (deep focus).

Return ONLY raw JSON with NO markdown:
[
  {
    "dayOffset": 0,
    "subject": "${aiExamName}",
    "topic": "Core concepts and definitions",
    "tool": "teach-it",
    "time": "10:00 AM - 10:45 AM",
    "estimatedHours": 0.75
  }
]`;

      const response = await callGroq(
        [{ role: "user", content: prompt }],
        "You generate structured study plans. Return raw JSON array only.",
        "openai/gpt-oss-20b",
        1024,
        "planner"
      );

      const sanitized = response.trim().replace(/^```(json)?/, "").replace(/```$/, "").trim();
      const generatedList: Array<{
        dayOffset: number;
        subject: string;
        topic: string;
        tool: "flashcards" | "teach-it" | "practice" | "timer";
        time: string;
        estimatedHours: number;
      }> = JSON.parse(sanitized);

      const newSlots: PlannerSession[] = generatedList.map((g, idx) => {
        const slotDate = new Date();
        slotDate.setDate(slotDate.getDate() + (g.dayOffset || idx));

        return {
          id: `ai_slot_${Date.now()}_${idx}`,
          subject: g.subject || aiExamName,
          time: g.time || "Scheduled Study",
          topic: g.topic,
          tool: g.tool || "flashcards",
          completed: false,
          dayNum: slotDate.getDate(),
          month: slotDate.getMonth(),
          year: slotDate.getFullYear(),
          estimatedHours: g.estimatedHours || 1,
        };
      });

      // Add the exam deadline itself
      const examDeadline: PlannerSession = {
        id: `exam_due_${Date.now()}`,
        subject: aiExamName,
        time: "9:00 AM",
        topic: "EXAM DAY",
        isDue: true,
        dueDate: aiExamDate,
        completed: false,
        dayNum: targetDate.getDate(),
        month: targetDate.getMonth(),
        year: targetDate.getFullYear(),
      };

      setSessions((prev) => [...prev, ...newSlots, examDeadline]);
      setActiveExam({
        examName: aiExamName,
        examDate: aiExamDate,
        topics: aiTopics,
        dailyMinutes: aiMinutes,
      });

      setShowAiPlanModal(false);
      fireConfetti();
      playSuccess();
    } catch (err) {
      console.error("[StudyPlanner] AI generation failed:", err);
      alert("Could not generate plan right now. Please try again or create manual study slots.");
    } finally {
      setAiGenerating(false);
    }
  };

  // ── Google Calendar / iCal (.ics) Export ─────────────────────────────────────
  const handleExportICS = () => {
    playPop();
    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Studenius//Study Planner//EN\n";

    sessions.forEach((s) => {
      if (!s.year || s.month === undefined || !s.dayNum) return;
      const m = String(s.month + 1).padStart(2, "0");
      const d = String(s.dayNum).padStart(2, "0");
      const dt = `${s.year}${m}${d}`;
      icsContent += `BEGIN:VEVENT\nSUMMARY:[Studenius] ${s.subject}: ${s.topic || "Study Session"}\nDTSTART;VALUE=DATE:${dt}\nDTEND;VALUE=DATE:${dt}\nDESCRIPTION:Studenius active study block\nEND:VEVENT\n`;
    });

    icsContent += "END:VCALENDAR";

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `studenius_study_plan.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Progress stats for active exam
  const examStats = useMemo(() => {
    if (!activeExam) return null;
    const examSessions = sessions.filter((s) => s.subject.toLowerCase() === activeExam.examName.toLowerCase() && !s.isDue);
    const done = examSessions.filter((s) => s.completed).length;
    const total = examSessions.length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const deadlineInfo = relativeDeadline(activeExam.examDate);
    return { done, total, pct, deadlineInfo };
  }, [activeExam, sessions]);

  // Today's Missions
  const todaySessions = useMemo(() => {
    return sessions.filter(
      (s) =>
        s.year === todayDate.getFullYear() &&
        s.month === todayDate.getMonth() &&
        s.dayNum === todayDate.getDate() &&
        !s.isDue
    );
  }, [sessions, todayDate]);

  // Mascot Coaching Commentary
  const coaching = useMemo(() => {
    if (!activeExam) {
      return {
        mood: "encouraging" as const,
        badge: "Rex's Daily Briefing",
        text: "Ready to conquer your next exam? Generate an AI Spaced Repetition plan above to pace your retention automatically!",
      };
    }
    const diffDays = examStats?.deadlineInfo.diffDays ?? 30;
    const uncompletedToday = todaySessions.filter((s) => !s.completed).length;

    if (todaySessions.length > 0 && uncompletedToday === 0) {
      return {
        mood: "celebrate" as const,
        badge: "Daily Missions Cleared!",
        text: `Outstanding focus! You finished all of today's study sessions for ${activeExam.examName}. Your memory consolidation is on track!`,
      };
    }

    if (diffDays <= 2) {
      return {
        mood: "thinking" as const,
        badge: "Exam Sprint Window",
        text: `${diffDays === 0 ? "Today is exam day! Trust your preparation and stay calm." : diffDays === 1 ? "Exam is tomorrow! Stick to rapid active recall; no heavy cramming." : "Only 2 days to go! High-yield review and sleep will maximize your score."}`,
      };
    }

    if (diffDays <= 7) {
      return {
        mood: "encouraging" as const,
        badge: "Peak Retention Window",
        text: `${diffDays} days left until ${activeExam.examName}. Test yourself with practice quizzes and teach tricky concepts to solidify your recall.`,
      };
    }

    if (todaySessions.length > 0) {
      return {
        mood: "happy" as const,
        badge: "Today's Study Rhythm",
        text: `You have ${uncompletedToday} study mission${uncompletedToday === 1 ? "" : "s"} waiting for today. Tap launch below to earn +50 XP per block!`,
      };
    }

    return {
      mood: "idle" as const,
      badge: "Pacing Steadily",
      text: `Pacing steadily for ${activeExam.examName}. Consistency on your spaced schedule keeps retention above 90%.`,
    };
  }, [activeExam, examStats, todaySessions]);

  const handleAddQuickToday = (tool: "flashcards" | "teach-it" | "practice" | "timer", topicName?: string) => {
    playPop();
    const toolTitles: Record<string, string> = {
      flashcards: "Active Flashcard Review",
      "teach-it": "Feynman Concept Breakdown",
      practice: "Diagnostic Practice Quiz",
      timer: "Deep Work Focus Block",
    };

    const newSession: PlannerSession = {
      id: `slot_quick_${Date.now()}`,
      subject: activeExam ? activeExam.examName : "High-Yield Study",
      time: "Today",
      topic: topicName || toolTitles[tool],
      tool,
      completed: false,
      dayNum: todayDate.getDate(),
      month: todayDate.getMonth(),
      year: todayDate.getFullYear(),
      estimatedHours: 0.5,
    };

    setSessions((prev) => [...prev, newSession]);
    playSuccess();
  };

  return (
    <div className="w-full bg-[#FAF7F2] min-h-[100dvh] flex flex-col font-body-md select-none">
      <TutorialModal isOpen={tutorial.isOpen} onDismiss={tutorial.dismiss} features={TUTORIAL_CONTENT["/planner"] || []} title="Study Planner" />
      <SharedSidebar active="/planner" />

      <div className="flex-1 md:ml-64 flex flex-col pb-24">

        {/* ── Top Header Bar ── */}
        <header className="h-16 px-4 md:px-8 border-b-2 border-black bg-[#FAF7F2] flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[24px] text-black">
              event_upcoming
            </span>
            <div>
              <div className="flex items-center gap-1.5 text-[10px] md:text-[11px] font-black uppercase tracking-widest text-black/40 leading-none mb-0.5">
                <span>Studenius</span>
                <span>/</span>
                <span className="text-black">Exam Engine</span>
              </div>
              <h1 className="text-[18px] md:text-[22px] font-black tracking-tight leading-none">
                Study Planner & Roadmap
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportICS}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#F0EDE0] border-2 border-black rounded-lg text-[12px] font-black shadow-[2px_2px_0px_#000] active:translate-y-0.5 transition-all cursor-pointer"
              title="Download calendar (.ics) file for Google Calendar or Outlook"
            >
              <span className="material-symbols-outlined text-[16px]">calendar_add_on</span>
              <span>Export .ICS</span>
            </button>

            <button
              onClick={() => tutorial.show()}
              className="w-9 h-9 border-2 border-black bg-white hover:bg-black hover:text-white rounded-lg flex items-center justify-center shadow-[2px_2px_0px_#000] active:translate-y-0.5 transition-all cursor-pointer"
              title="Guidance"
            >
              <span className="material-symbols-outlined text-[18px]">help</span>
            </button>
          </div>
        </header>

        {/* ── Main Content Area ── */}
        <main className="p-4 md:p-8 max-w-6xl w-full mx-auto flex flex-col gap-6">

          {/* ── Hero: Active Exam Countdown & Roadmap ── */}
          <section className="bg-white border-3 border-black rounded-3xl p-5 md:p-6 shadow-[5px_5px_0px_#000] flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative overflow-hidden">
            {activeExam && examStats ? (
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2.5 py-0.5 bg-[#FF5757] text-white border border-black rounded-md text-[10px] font-black uppercase tracking-wider">
                    Target Exam Roadmap
                  </span>
                  <span className="text-[12px] font-black text-[#E8534A]">
                    {examStats.deadlineInfo.label}
                  </span>
                </div>

                <h2 className="text-[22px] md:text-[26px] font-black text-black leading-tight">
                  {activeExam.examName}
                </h2>
                <p className="text-[12px] md:text-[13px] font-bold text-black/60 mt-1">
                  Exam Date: <strong>{activeExam.examDate}</strong> • Spaced Repetition Active
                </p>

                {/* Progress bar */}
                <div className="mt-3 flex items-center gap-3">
                  <div className="w-56 md:w-72 h-3.5 bg-[#FAF7F2] border-2 border-black rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#10B981] transition-all duration-500"
                      style={{ width: `${examStats.pct}%` }}
                    />
                  </div>
                  <span className="text-[12px] font-black text-black">
                    {examStats.done} of {examStats.total} milestones ({examStats.pct}%)
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 bg-[#FFD13B] text-black border border-black rounded-md text-[10px] font-black uppercase tracking-wider">
                    AI Spaced Repetition
                  </span>
                </div>
                <h2 className="text-[20px] md:text-[24px] font-black text-black">
                  No Exam Roadmap Active Yet
                </h2>
                <p className="text-[12px] md:text-[13px] font-bold text-black/60 mt-1 max-w-lg">
                  Tell AI your upcoming exam and date. It will automatically space out flashcards, mock quizzes, and Feynman sessions following the Ebbinghaus curve.
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0">
              <button
                onClick={() => {
                  playPop();
                  setShowAiPlanModal(true);
                }}
                className="flex-1 md:flex-initial px-5 py-3 bg-[#10B981] hover:bg-black text-white border-2 border-black rounded-xl font-black text-[13px] shadow-[3px_3px_0px_#000] active:translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                <span>{activeExam ? "Regenerate AI Plan" : "Generate AI Exam Plan"}</span>
              </button>

              <button
                onClick={() => {
                  playPop();
                  setShowAddModal(true);
                }}
                className="px-4 py-3 bg-white hover:bg-[#FAF7F2] text-black border-2 border-black rounded-xl font-black text-[13px] shadow-[2px_2px_0px_#000] active:translate-y-0.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                <span className="hidden sm:inline">Add Slot</span>
              </button>
            </div>
          </section>

          {/* ── Rex Daily Coaching Banner ── */}
          <div className="bg-[#FFFDF9] border-3 border-black rounded-3xl p-4 md:p-5 shadow-[4px_4px_0px_#000] flex items-center gap-4">
            <div className="w-14 h-14 md:w-16 md:h-16 shrink-0 flex items-center justify-center">
              <Mascot mood={coaching.mood} size="xs" animate />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 bg-[#FFD13B] border border-black rounded text-[10px] font-black uppercase tracking-wider text-black">
                  {coaching.badge}
                </span>
                <span className="text-[11px] font-bold text-black/50">Personalized Study Coach</span>
              </div>
              <p className="text-[13px] md:text-[14px] font-extrabold text-black leading-snug">
                {coaching.text}
              </p>
            </div>
          </div>

          {/* ── Today's Mission: Actionable Agenda ── */}
          <section className="bg-white border-3 border-black rounded-3xl p-5 md:p-6 shadow-[5px_5px_0px_#000] flex flex-col gap-4">
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#FFE566] border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#000]">
                  <span className="material-symbols-outlined text-[22px] text-black">checklist</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-[18px] md:text-[20px] font-black uppercase tracking-tight text-black">
                      Today's Mission
                    </h2>
                    <span className="px-2 py-0.5 bg-black text-white text-[10px] font-black uppercase tracking-wider rounded">
                      {todayDate.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <p className="text-[12px] font-bold text-black/50">
                    {todaySessions.filter((s) => s.completed).length} of {todaySessions.length} completed
                    {todaySessions.length > 0 && todaySessions.every((s) => s.completed) && " • All goals accomplished today!"}
                  </p>
                </div>
              </div>

              {/* Quick Launch Buttons */}
              <div className="hidden sm:flex items-center gap-1.5">
                <button
                  onClick={() => handleAddQuickToday("flashcards")}
                  className="px-2.5 py-1.5 bg-[#FAF7F2] hover:bg-[#FFE566] border-2 border-black rounded-lg text-[11px] font-black shadow-[1.5px_1.5px_0px_#000] active:scale-[0.96] transition-all flex items-center gap-1 cursor-pointer"
                  title="Add Flashcard Review for today"
                >
                  <span className="material-symbols-outlined text-[14px]">bolt</span>
                  <span>+ Cards</span>
                </button>
                <button
                  onClick={() => handleAddQuickToday("teach-it")}
                  className="px-2.5 py-1.5 bg-[#FAF7F2] hover:bg-[#10B981] hover:text-white border-2 border-black rounded-lg text-[11px] font-black shadow-[1.5px_1.5px_0px_#000] active:scale-[0.96] transition-all flex items-center gap-1 cursor-pointer"
                  title="Add Feynman Teach session for today"
                >
                  <span className="material-symbols-outlined text-[14px]">school</span>
                  <span>+ Teach</span>
                </button>
                <button
                  onClick={() => handleAddQuickToday("practice")}
                  className="px-2.5 py-1.5 bg-[#FAF7F2] hover:bg-[#3B82F6] hover:text-white border-2 border-black rounded-lg text-[11px] font-black shadow-[1.5px_1.5px_0px_#000] active:scale-[0.96] transition-all flex items-center gap-1 cursor-pointer"
                  title="Add Practice Quiz for today"
                >
                  <span className="material-symbols-outlined text-[14px]">quiz</span>
                  <span>+ Quiz</span>
                </button>
              </div>
            </div>

            {todaySessions.length === 0 ? (
              <div className="border-2 border-dashed border-black/30 rounded-2xl p-6 bg-[#FAF7F2] text-center flex flex-col items-center justify-center gap-2.5">
                <div className="w-12 h-12 rounded-xl bg-white border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#000]">
                  <span className="material-symbols-outlined text-[24px] text-black/50">event_available</span>
                </div>
                <div>
                  <h4 className="font-black text-[15px] text-black">No study missions scheduled for today</h4>
                  <p className="text-[12px] font-bold text-black/50 max-w-sm">
                    Keep your retention sharp with a quick 15-minute active recall session.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
                  <button
                    onClick={() => handleAddQuickToday("flashcards")}
                    className="px-3.5 py-2 bg-[#FFE566] hover:bg-[#FFD13B] text-black border-2 border-black rounded-xl font-black text-[12px] shadow-[2px_2px_0px_#000] active:scale-[0.96] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px]">bolt</span>
                    <span>+ Quick Flashcards</span>
                  </button>
                  <button
                    onClick={() => handleAddQuickToday("teach-it")}
                    className="px-3.5 py-2 bg-[#10B981] hover:bg-black text-white border-2 border-black rounded-xl font-black text-[12px] shadow-[2px_2px_0px_#000] active:scale-[0.96] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px]">school</span>
                    <span>+ Teach Pip</span>
                  </button>
                  <button
                    onClick={() => handleAddQuickToday("practice")}
                    className="px-3.5 py-2 bg-[#3B82F6] hover:bg-black text-white border-2 border-black rounded-xl font-black text-[12px] shadow-[2px_2px_0px_#000] active:scale-[0.96] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px]">quiz</span>
                    <span>+ Practice Quiz</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {todaySessions.map((session) => (
                  <StudySlotCard
                    key={session.id}
                    session={session}
                    onToggle={handleToggleComplete}
                    onDelete={handleDeleteSession}
                    onLaunch={(path) => navigate(path)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ── 2-Column Calendar & Playable Slots Studio ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Left Column: Calendar & Deadlines (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-5">

              {/* Calendar Grid */}
              <div className="border-3 border-black bg-white rounded-2xl p-5 shadow-[4px_4px_0px_#000]">
                <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-3">
                  <h3 className="font-black text-[16px] uppercase tracking-tight text-black">
                    {MONTH_NAMES[viewMonth]} {viewYear}
                  </h3>
                  <div className="flex gap-1.5">
                    <button
                      onClick={prevMonth}
                      className="w-8 h-8 border-2 border-black rounded-lg flex items-center justify-center hover:bg-[#FAF7F2] transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                    </button>
                    <button
                      onClick={nextMonth}
                      className="w-8 h-8 border-2 border-black rounded-lg flex items-center justify-center hover:bg-[#FAF7F2] transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 text-center mb-2 font-black text-[11px] text-black/40">
                  {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                    <div key={i}>{d}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-y-1">
                  {calendarGrid.map((cell, idx) => {
                    const isOtherMonth = cell !== null && cell <= 0;
                    const day = isOtherMonth ? Math.abs(cell ?? 0) % 100 : cell;
                    const isToday = isCurrentMonth && day === todayDate.getDate() && !isOtherMonth;
                    const isSelected = !isOtherMonth && day === selectedDayNum;
                    const hasSession = !isOtherMonth && day !== null && daysWithSessions.has(day as number);

                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          if (!isOtherMonth && day) {
                            playTap();
                            setSelectedDayNum(day as number);
                          }
                        }}
                        className="relative flex flex-col items-center justify-center cursor-pointer h-9"
                      >
                        <span
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[12.5px] transition-all ${
                            isOtherMonth ? "text-black/20 cursor-default" : "hover:bg-[#FAF7F2]"
                          } ${
                            isSelected
                              ? "bg-[#FFE566] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000]"
                              : ""
                          } ${isToday && !isSelected ? "bg-black text-white" : ""}`}
                        >
                          {day ?? ""}
                        </span>
                        {hasSession && !isOtherMonth && (
                          <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] absolute bottom-0.5" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Deadlines Card */}
              <div className="border-3 border-black bg-white rounded-2xl p-5 shadow-[4px_4px_0px_#000] flex flex-col gap-3">
                <div className="flex items-center justify-between border-b-2 border-black pb-2.5">
                  <h3 className="font-black text-[14px] uppercase tracking-wider text-black flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px] text-[#FF5757]">flag</span>
                    <span>Upcoming Deadlines</span>
                  </h3>
                  <span className="text-[11px] font-bold text-black/50">{deadlines.length} recorded</span>
                </div>

                {deadlines.length === 0 ? (
                  <p className="text-[12px] font-bold text-black/40 py-3 text-center">
                    No major exam or assignment deadlines yet.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {deadlines.map((dl) => {
                      const rel = relativeDeadline(dl.dueDate || "");
                      return (
                        <div
                          key={dl.id}
                          className="p-3 bg-[#FAF7F2] border-2 border-black rounded-xl flex items-center justify-between"
                        >
                          <div>
                            <p className="font-black text-[13px] text-black">{dl.subject}</p>
                            <p className="text-[11px] font-bold text-black/50">{dl.dueDate}</p>
                          </div>
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 border border-black rounded ${
                              rel.urgent ? "bg-[#FF5757] text-white" : "bg-[#FFE566] text-black"
                            }`}
                          >
                            {rel.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

            {/* Right Column: Playable Study Slots (7 cols) */}
            <div className="lg:col-span-7 flex flex-col gap-4">

              {/* Slots Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[18px] md:text-[20px] font-black text-black">
                    Scheduled Study Slots
                  </h3>
                  <p className="text-[12px] font-bold text-black/50">
                    {MONTH_NAMES[viewMonth]} {selectedDayNum}, {viewYear} • Click an action to launch your study session
                  </p>
                </div>

                <span className="px-3 py-1 bg-white border-2 border-black rounded-full font-black text-[12px] shadow-[2px_2px_0px_#000]">
                  {selectedDaySessions.length} slots
                </span>
              </div>

              {/* Slots List */}
              {selectedDaySessions.length === 0 ? (
                <div className="border-3 border-dashed border-black/30 rounded-3xl p-10 bg-white text-center flex flex-col items-center justify-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-[#FAF7F2] border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#000]">
                    <span className="material-symbols-outlined text-[28px] text-black/40">event_available</span>
                  </div>
                  <div>
                    <h4 className="font-black text-[16px] text-black">No Study Slots on This Day</h4>
                    <p className="text-[12px] font-bold text-black/50 mt-0.5 max-w-sm">
                      Enjoy your break or add a custom revision task or generate an AI spaced repetition schedule.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="px-4 py-2 bg-black text-white border-2 border-black rounded-xl font-black text-[12px] shadow-[2px_2px_0px_#000] cursor-pointer"
                  >
                    + Add Study Slot
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {selectedDaySessions.map((session) => (
                    <StudySlotCard
                      key={session.id}
                      session={session}
                      onToggle={handleToggleComplete}
                      onDelete={handleDeleteSession}
                      onLaunch={(path) => navigate(path)}
                    />
                  ))}
                </div>
              )}

            </div>

          </div>

        </main>
      </div>

      {/* ── AI Plan Generator Modal ── */}
      {showAiPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border-3 border-black rounded-3xl max-w-lg w-full p-6 shadow-[8px_8px_0px_#000] flex flex-col gap-4">
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#10B981] text-[24px]">auto_awesome</span>
                <h3 className="font-black text-[18px] text-black">Generate AI Spaced Plan</h3>
              </div>
              <button
                onClick={() => setShowAiPlanModal(false)}
                className="w-8 h-8 rounded-full border-2 border-black flex items-center justify-center font-black cursor-pointer hover:bg-black hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGenerateAiPlan} className="flex flex-col gap-3.5">
              <div>
                <label className="text-[11px] font-black uppercase text-black/60">Target Exam / Goal Name</label>
                <input
                  type="text"
                  required
                  value={aiExamName}
                  onChange={(e) => setAiExamName(e.target.value)}
                  placeholder="e.g. Biology Midterm Exam, Calculus Final..."
                  className="w-full mt-1 bg-[#FAF7F2] border-2 border-black rounded-xl p-2.5 font-bold text-[13px] focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-black uppercase text-black/60">Target Exam Date</label>
                <input
                  type="date"
                  required
                  value={aiExamDate}
                  onChange={(e) => setAiExamDate(e.target.value)}
                  className="w-full mt-1 bg-[#FAF7F2] border-2 border-black rounded-xl p-2.5 font-bold text-[13px] focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-black uppercase text-black/60">Chapters / Topics (Comma separated)</label>
                <textarea
                  rows={2}
                  value={aiTopics}
                  onChange={(e) => setAiTopics(e.target.value)}
                  placeholder="e.g. Mitosis, Photosynthesis, Cellular respiration, Genetics..."
                  className="w-full mt-1 bg-[#FAF7F2] border-2 border-black rounded-xl p-2.5 font-bold text-[13px] focus:outline-none focus:bg-white resize-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-black uppercase text-black/60">Daily Study Budget</label>
                <div className="flex gap-2 mt-1">
                  {[30, 45, 60, 90].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setAiMinutes(mins)}
                      className={`flex-1 py-1.5 rounded-lg border-2 border-black font-black text-[12px] transition-all cursor-pointer ${
                        aiMinutes === mins ? "bg-black text-white" : "bg-[#FAF7F2] text-black"
                      }`}
                    >
                      {mins}m/day
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAiPlanModal(false)}
                  className="flex-1 py-3 bg-[#FAF7F2] border-2 border-black rounded-xl font-black text-[13px] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={aiGenerating}
                  className="flex-1 py-3 bg-[#10B981] hover:bg-black text-white border-2 border-black rounded-xl font-black text-[13px] shadow-[3px_3px_0px_#000] active:translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                  <span>{aiGenerating ? "Generating..." : "Create Schedule"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Manual Add Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border-3 border-black rounded-3xl max-w-md w-full p-6 shadow-[8px_8px_0px_#000] flex flex-col gap-4">
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <h3 className="font-black text-[16px] text-black">
                Add Study Slot or Deadline
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full border-2 border-black flex items-center justify-center font-black cursor-pointer hover:bg-black hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleManualAddSubmit} className="flex flex-col gap-3">
              <div className="flex border-2 border-black rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setNewIsDue(false)}
                  className={`flex-1 py-2 font-black text-[12px] uppercase ${
                    !newIsDue ? "bg-black text-white" : "bg-white text-black"
                  }`}
                >
                  Study Slot
                </button>
                <button
                  type="button"
                  onClick={() => setNewIsDue(true)}
                  className={`flex-1 py-2 font-black text-[12px] uppercase ${
                    newIsDue ? "bg-black text-white" : "bg-white text-black"
                  }`}
                >
                  Exam Deadline
                </button>
              </div>

              <input
                type="text"
                required
                placeholder={newIsDue ? "Exam or Assignment Title" : "Subject (e.g. Physics)"}
                value={newSubj}
                onChange={(e) => setNewSubj(e.target.value)}
                className="bg-[#FAF7F2] border-2 border-black rounded-xl p-2.5 font-bold text-[13px] focus:outline-none focus:bg-white"
              />

              <input
                type="text"
                placeholder="Time (e.g. 10:00 AM - 11:00 AM)"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="bg-[#FAF7F2] border-2 border-black rounded-xl p-2.5 font-bold text-[13px] focus:outline-none focus:bg-white"
              />

              <input
                type="text"
                placeholder="Topic / Chapters"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                className="bg-[#FAF7F2] border-2 border-black rounded-xl p-2.5 font-bold text-[13px] focus:outline-none focus:bg-white"
              />

              {newIsDue && (
                <input
                  type="date"
                  required
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="bg-[#FAF7F2] border-2 border-black rounded-xl p-2.5 font-bold text-[13px] focus:outline-none focus:bg-white"
                />
              )}

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-[#FAF7F2] border-2 border-black rounded-xl font-black text-[12px] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-black text-white border-2 border-black rounded-xl font-black text-[12px] cursor-pointer shadow-[2px_2px_0px_#000]"
                >
                  Save Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
