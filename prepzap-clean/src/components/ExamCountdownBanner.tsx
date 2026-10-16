import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExamTarget, SUBJECT_METADATA } from "@/lib/userPreferences";
import { playPop, playTap, playSuccess } from "@/lib/soundFX";

interface ExamCountdownBannerProps {
  examTarget?: ExamTarget | null;
  onUpdate: (target: ExamTarget | null) => void;
  quizAccuracy?: number;
  sessionsCount?: number;
  tasksCompleted?: number;
  className?: string;
}

/**
 * Calculates a transparent, real exam readiness percentage.
 * Formula:
 * - Quiz Accuracy (50% weight if user has taken quizzes, otherwise sessions substitute)
 * - Study Sessions Completed (30% weight, baseline target 5 sessions before exam)
 * - Daily Tasks Completed (20% weight, baseline target 5 tasks completed)
 * Baseline minimum is 15% when an exam target is set.
 */
export function calculateExamReadiness(
  examDateStr?: string,
  quizAccuracy: number = 0,
  sessionsCount: number = 0,
  tasksCompleted: number = 0
): { percent: number; breakdown: string; daysLeft: number } {
  if (!examDateStr) return { percent: 0, breakdown: "No exam set", daysLeft: 0 };

  const examDate = new Date(examDateStr + "T00:00:00");
  const now = new Date();
  // Reset time to start of day for clean day calculation
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffTime = examDate.getTime() - today.getTime();
  const daysLeft = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return { percent: 100, breakdown: "Exam concluded", daysLeft };
  }

  const accuracyComponent = quizAccuracy > 0 ? quizAccuracy : Math.min(60, sessionsCount * 15);
  const sessionComponent = Math.min(100, (sessionsCount / 5) * 100);
  const questComponent = Math.min(100, (tasksCompleted / 5) * 100);

  const raw = Math.round(accuracyComponent * 0.5 + sessionComponent * 0.3 + questComponent * 0.2);
  const percent = Math.min(100, Math.max(15, raw));

  let breakdown = "";
  if (quizAccuracy > 0) {
    breakdown = `${quizAccuracy}% quiz recall & ${sessionsCount} sessions`;
  } else if (sessionsCount > 0) {
    breakdown = `${sessionsCount} sessions logged · Take a practice quiz to boost`;
  } else {
    breakdown = `Target committed · Practice mock quizzes to boost readiness`;
  }

  return { percent, breakdown, daysLeft };
}

export function ExamCountdownBanner({
  examTarget,
  onUpdate,
  quizAccuracy = 0,
  sessionsCount = 0,
  tasksCompleted = 0,
  className = "",
}: ExamCountdownBannerProps) {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [titleInput, setTitleInput] = useState(examTarget?.examTitle || "");
  const [dateInput, setDateInput] = useState(examTarget?.examDate || "");
  const [subjectInput, setSubjectInput] = useState(examTarget?.subject || "other");

  const todayStr = new Date().toISOString().split("T")[0];

  const openModal = () => {
    playPop();
    setTitleInput(examTarget?.examTitle || "");
    setDateInput(examTarget?.examDate || "");
    setSubjectInput(examTarget?.subject || "other");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    playTap();
    setIsModalOpen(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleInput.trim() || !dateInput) return;

    playSuccess();
    const newTarget: ExamTarget = {
      examTitle: titleInput.trim(),
      examDate: dateInput,
      subject: subjectInput,
    };
    onUpdate(newTarget);
    setIsModalOpen(false);
  };

  const handleClear = () => {
    playTap();
    onUpdate(null);
    setIsModalOpen(false);
  };

  // ── EMPTY STATE (BANNER NEVER DISAPPEARS) ──────────────────────────────────
  if (!examTarget || !examTarget.examDate) {
    return (
      <>
        <div
          className={`border-2 border-black rounded-2xl bg-[#FFFDF5] p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0px_4px_0px_#1A1A1A] transition-all hover:bg-white ${className}`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl border-2 border-black bg-[#FFD13B] flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#1A1A1A]">
              <span className="material-symbols-outlined text-[26px] text-black">event_available</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[14px] md:text-[15px] font-black text-black">
                  No exam yet &bull; Add your next test
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-black/20 bg-[#FAF7F2] text-black/60">
                  Target
                </span>
              </div>
              <p className="text-[12px] md:text-[12.5px] font-bold text-black/55 mt-0.5">
                Set your next midterm, final, or quiz to unlock countdowns and real readiness tracking with Rex.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openModal}
            className="border-2 border-black bg-black text-white hover:bg-[#FF4D2E] px-4 py-2 rounded-xl font-black text-[12px] uppercase tracking-wider shadow-[2px_2px_0px_#1A1A1A] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">add_circle</span>
            Set Exam Target
          </button>
        </div>

        {/* Modal */}
        {isModalOpen && (
          <ExamModal
            title="Set Upcoming Exam Target"
            titleInput={titleInput}
            setTitleInput={setTitleInput}
            dateInput={dateInput}
            setDateInput={setDateInput}
            subjectInput={subjectInput}
            setSubjectInput={setSubjectInput}
            minDate={todayStr}
            hasExisting={false}
            onClose={closeModal}
            onSave={handleSave}
            onClear={handleClear}
          />
        )}
      </>
    );
  }

  // ── ACTIVE COUNTDOWN STATE ─────────────────────────────────────────────────
  const { percent, breakdown, daysLeft } = calculateExamReadiness(
    examTarget.examDate,
    quizAccuracy,
    sessionsCount,
    tasksCompleted
  );

  const formattedDate = new Date(examTarget.examDate + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const subjectMeta = examTarget.subject ? SUBJECT_METADATA[examTarget.subject] : null;

  let daysPillText = "";
  let daysPillBg = "bg-[#FFE566] text-black";
  if (daysLeft === 0) {
    daysPillText = "Today! 🔥";
    daysPillBg = "bg-[#FF4D2E] text-white";
  } else if (daysLeft === 1) {
    daysPillText = "Tomorrow! ⚡";
    daysPillBg = "bg-[#FF4D2E] text-white";
  } else if (daysLeft > 1) {
    daysPillText = `In ${daysLeft} Days`;
  } else {
    daysPillText = `Concluded (${Math.abs(daysLeft)}d ago)`;
    daysPillBg = "bg-black/10 text-black/60";
  }

  return (
    <>
      <div
        className={`border-2 border-black rounded-2xl bg-white p-4 md:p-5 shadow-[0px_4px_0px_#1A1A1A] relative overflow-hidden ${className}`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left Column: Target Info */}
          <div className="flex items-start gap-3.5 flex-1 min-w-0">
            <div className="w-12 h-12 rounded-xl border-2 border-black bg-[#FAF7F2] flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#1A1A1A] mt-0.5">
              <span className="material-symbols-outlined text-[26px] text-[#FF4D2E]">timer</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border border-black bg-black text-white">
                  Exam Countdown
                </span>
                {subjectMeta && (
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border border-black/20 ${subjectMeta.bg} ${subjectMeta.color}`}>
                    {subjectMeta.name}
                  </span>
                )}
                <span className="text-[11px] font-extrabold text-black/50">
                  &bull; {formattedDate}
                </span>
              </div>

              <h3 className="text-[17px] md:text-[19px] font-black text-black leading-tight truncate">
                {examTarget.examTitle}
              </h3>
              <p className="text-[11.5px] font-bold text-black/55 mt-0.5">
                {breakdown}
              </p>
            </div>
          </div>

          {/* Right Column: Days Remaining & Readiness Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 shrink-0 lg:max-w-md w-full lg:w-auto">
            {/* Days Left Pill */}
            <div className={`px-3 py-1.5 rounded-xl border-2 border-black font-black text-[12px] tracking-wide flex items-center gap-1.5 shrink-0 shadow-[1px_1px_0px_#1A1A1A] ${daysPillBg}`}>
              <span className="material-symbols-outlined text-[15px]">event</span>
              {daysPillText}
            </div>

            {/* Readiness Bar */}
            <div className="flex-1 sm:w-44">
              <div className="flex justify-between items-center mb-1 text-[11px] font-black">
                <span className="text-black/60 uppercase tracking-wider">Test Readiness</span>
                <span className="text-black">{percent}%</span>
              </div>
              <div className="h-3 bg-[#E8E4DC] rounded-full border-2 border-black overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${percent >= 75 ? "bg-[#10B981]" : percent >= 45 ? "bg-[#F5A623]" : "bg-[#FF4D2E]"}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  playPop();
                  navigate(subjectMeta?.recommendedTool || "/practice");
                }}
                className="border-2 border-black bg-[#FFD13B] text-black hover:bg-black hover:text-white px-3.5 py-1.5 rounded-xl font-black text-[11px] uppercase tracking-wider shadow-[2px_2px_0px_#1A1A1A] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">play_arrow</span>
                Study
              </button>

              <button
                type="button"
                onClick={openModal}
                title="Edit Exam Target"
                className="w-8 h-8 rounded-xl border-2 border-black bg-white hover:bg-[#FAF7F2] flex items-center justify-center shadow-[1px_1px_0px_#1A1A1A] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all shrink-0 cursor-pointer text-black"
              >
                <span className="material-symbols-outlined text-[16px]">edit</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <ExamModal
          title="Edit Upcoming Exam Target"
          titleInput={titleInput}
          setTitleInput={setTitleInput}
          dateInput={dateInput}
          setDateInput={setDateInput}
          subjectInput={subjectInput}
          setSubjectInput={setSubjectInput}
          minDate={todayStr}
          hasExisting={true}
          onClose={closeModal}
          onSave={handleSave}
          onClear={handleClear}
        />
      )}
    </>
  );
}

interface ExamModalProps {
  title: string;
  titleInput: string;
  setTitleInput: (v: string) => void;
  dateInput: string;
  setDateInput: (v: string) => void;
  subjectInput: string;
  setSubjectInput: (v: string) => void;
  minDate: string;
  hasExisting: boolean;
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
  onClear: () => void;
}

function ExamModal({
  title,
  titleInput,
  setTitleInput,
  dateInput,
  setDateInput,
  subjectInput,
  setSubjectInput,
  minDate,
  hasExisting,
  onClose,
  onSave,
  onClear,
}: ExamModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-[#FAF7F2] border-4 border-black w-full max-w-md shadow-[8px_8px_0px_0px_#000] flex flex-col rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="border-b-4 border-black p-4 flex justify-between items-center bg-[#FFD13B]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[22px] text-black">event_note</span>
            <h2 className="font-black text-[18px] uppercase tracking-wide text-black">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center border-2 border-black bg-white hover:bg-black hover:text-white transition-colors rounded-lg cursor-pointer shadow-[1px_1px_0px_#000]"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={onSave} className="p-5 flex flex-col gap-4">
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-black/60 mb-1.5">
              Exam or Test Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g. AP Chemistry Midterm, SAT Math"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              className="w-full bg-white border-2 border-black px-3.5 py-2.5 text-[13px] font-bold rounded-xl outline-none focus:border-[#FF4D2E] transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-black/60 mb-1.5">
              Subject Category
            </label>
            <select
              value={subjectInput}
              onChange={(e) => setSubjectInput(e.target.value)}
              className="w-full bg-white border-2 border-black px-3.5 py-2.5 text-[13px] font-bold rounded-xl outline-none cursor-pointer"
            >
              {Object.entries(SUBJECT_METADATA).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-black/60 mb-1.5">
              Exam Date
            </label>
            <input
              type="date"
              required
              min={minDate}
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              className="w-full bg-white border-2 border-black px-3.5 py-2.5 text-[13px] font-bold rounded-xl outline-none cursor-pointer"
            />
          </div>

          <div className="pt-2 border-t-2 border-black/10 flex items-center justify-between gap-3 mt-1">
            {hasExisting ? (
              <button
                type="button"
                onClick={onClear}
                className="text-[12px] font-black text-red-600 hover:underline cursor-pointer"
              >
                Clear Exam Target
              </button>
            ) : <div />}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border-2 border-black bg-white hover:bg-black/5 font-black text-[12px] uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 border-2 border-black bg-black text-white hover:bg-[#FF4D2E] font-black text-[12px] uppercase tracking-wider rounded-xl shadow-[2px_2px_0px_#1A1A1A] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
              >
                Save Target
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
