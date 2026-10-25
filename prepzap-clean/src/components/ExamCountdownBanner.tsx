import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ExamTarget, SUBJECT_METADATA } from "@/lib/userPreferences";
import { playPop, playTap, playSuccess } from "@/lib/soundFX";
import { loadLibrary, saveContext, type SourceFile } from "@/lib/sourceContext";

interface ExamCountdownBannerProps {
  examTarget?: ExamTarget | null;
  onUpdate: (target: ExamTarget | null) => void;
  allSessions?: any[];
  sessionsCount?: number;
  quizAccuracy?: number;
  tasksCompleted?: number;
  className?: string;
}

/**
 * Checks if a study session is genuinely related to the target exam by
 * matching the exam subject keywords or title keywords.
 */
export function isSessionRelatedToExam(
  session: { title?: string; tool?: string; subject?: string },
  examTarget?: ExamTarget | null
): boolean {
  if (!examTarget) return false;
  const examSub = (examTarget.subject || "").toLowerCase().trim();
  const examTitle = (examTarget.examTitle || "").toLowerCase().trim();

  const sessTitle = (session.title || "").toLowerCase();
  const sessSub = (session.subject || "").toLowerCase();

  // 1. Direct Subject Keywords Mapping
  const subjectKeywords: Record<string, string[]> = {
    math: ["math", "calculus", "algebra", "geometry", "trigonometry", "derivative", "integral"],
    science: ["science", "biology", "chemistry", "physics", "cellular", "organic", "anatomy", "dna"],
    english: ["english", "literature", "reading", "writing", "essay", "grammar", "vocab", "novel", "poetry", "prose"],
    history: ["history", "civilization", "revolution", "war", "government", "treaty", "historical"],
    programming: ["programming", "code", "coding", "python", "javascript", "react", "algorithm", "data structure"],
    arts: ["art", "design", "music", "drawing", "visual"]
  };

  if (examSub && examSub !== "other") {
    const keywords = subjectKeywords[examSub] || [examSub];
    if (keywords.some((k) => sessTitle.includes(k) || sessSub.includes(k))) {
      return true;
    }
  }

  // 2. Title keywords match (ignoring small stop words)
  const titleWords = examTitle
    .split(/[\s,._-]+/)
    .filter((w) => w.length >= 3 && !["the", "and", "for", "exam", "test", "quiz", "final", "midterm"].includes(w));

  if (titleWords.length > 0 && titleWords.some((w) => sessTitle.includes(w))) {
    return true;
  }

  return false;
}

/**
 * Calculates a transparent, real exam readiness percentage based on material
 * coverage and sessions genuinely related to the target exam.
 */
export function calculateExamReadiness(
  targetOrDate?: ExamTarget | string | null,
  allSessionsOrAcc: any = [],
  libraryOrSessions: any = [],
  quizAccOrTasks: number = 0,
  tasksOrNothing: number = 0
): { percent: number; breakdown: string; daysLeft: number; relatedCount: number } {
  // Safe backward compatibility if called with legacy (examDateStr, quizAcc, sessCount, tasks)
  let examTarget: ExamTarget | null = null;
  let allSessions: any[] = [];
  let libraryFiles: SourceFile[] = [];
  let quizAccuracy = 0;
  let tasksCompleted = 0;

  if (typeof targetOrDate === "string") {
    examTarget = { examTitle: "Exam", examDate: targetOrDate, subject: "other" };
    quizAccuracy = typeof allSessionsOrAcc === "number" ? allSessionsOrAcc : 0;
    const sessCount = typeof libraryOrSessions === "number" ? libraryOrSessions : 0;
    allSessions = Array(sessCount).fill({ title: "Study Session" });
    tasksCompleted = typeof quizAccOrTasks === "number" ? quizAccOrTasks : 0;
  } else {
    examTarget = targetOrDate || null;
    allSessions = Array.isArray(allSessionsOrAcc) ? allSessionsOrAcc : [];
    libraryFiles = Array.isArray(libraryOrSessions) ? libraryOrSessions : [];
    quizAccuracy = typeof quizAccOrTasks === "number" ? quizAccOrTasks : 0;
    tasksCompleted = typeof tasksOrNothing === "number" ? tasksOrNothing : 0;
  }

  if (!examTarget || !examTarget.examDate) {
    return { percent: 0, breakdown: "No exam set", daysLeft: 0, relatedCount: 0 };
  }

  const examDate = new Date(examTarget.examDate + "T00:00:00");
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffTime = examDate.getTime() - today.getTime();
  const daysLeft = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return { percent: 100, breakdown: "Exam concluded", daysLeft, relatedCount: 0 };
  }

  // Filter sessions that are strictly related to THIS exam
  const relatedSessions = allSessions.filter((s) => isSessionRelatedToExam(s, examTarget));
  const relatedCount = relatedSessions.length;

  // Material coverage: linked sources in library
  const attachedIds = examTarget.attachedSourceIds || [];
  const attachedSources = libraryFiles.filter(
    (f) =>
      attachedIds.includes(f.id) ||
      (examTarget?.subject && f.name.toLowerCase().includes(examTarget.subject.toLowerCase())) ||
      (examTarget && examTarget.examTitle.length >= 3 && f.name.toLowerCase().includes(examTarget.examTitle.toLowerCase()))
  );
  const materialCount = attachedSources.length;
  const subjectLabel = examTarget.subject && SUBJECT_METADATA[examTarget.subject]?.name || examTarget.examTitle;

  // If 0 related sessions AND 0 attached materials:
  if (relatedCount === 0 && materialCount === 0 && quizAccuracy === 0) {
    return {
      percent: 15, // Baseline commitment for scheduling
      breakdown: `0 study sessions logged for ${subjectLabel} · Tap Study to begin`,
      daysLeft,
      relatedCount: 0
    };
  }

  // Weightings:
  // - 40% Quiz recall accuracy
  // - 30% Session volume on this subject (target: 5 sessions)
  // - 20% Material/syllabus coverage (target: at least 1-2 docs)
  // - 10% Daily task consistency
  const accuracyScore = quizAccuracy > 0 ? quizAccuracy : Math.min(60, relatedCount * 20);
  const sessionScore = Math.min(100, (relatedCount / 5) * 100);
  const materialScore = materialCount > 0 ? Math.min(100, (materialCount / 2) * 100) : 0;
  const questScore = Math.min(100, (tasksCompleted / 3) * 100);

  let raw = 0;
  if (materialCount > 0) {
    raw = Math.round(accuracyScore * 0.4 + sessionScore * 0.3 + materialScore * 0.2 + questScore * 0.1);
  } else {
    raw = Math.round(accuracyScore * 0.5 + sessionScore * 0.3 + questScore * 0.2);
  }

  const percent = Math.min(100, Math.max(15, raw));

  let breakdown = "";
  if (quizAccuracy > 0) {
    breakdown = `${quizAccuracy}% quiz recall on ${subjectLabel} · ${relatedCount} session${relatedCount === 1 ? "" : "s"}`;
  } else if (materialCount > 0) {
    breakdown = `${materialCount} doc${materialCount === 1 ? "" : "s"} linked · ${relatedCount} session${relatedCount === 1 ? "" : "s"} logged on ${subjectLabel}`;
  } else if (relatedCount > 0) {
    breakdown = `${relatedCount} session${relatedCount === 1 ? "" : "s"} on ${subjectLabel} · Take a quiz to boost recall`;
  } else {
    breakdown = `0 sessions on ${subjectLabel} yet · Tap Study to begin`;
  }

  return { percent, breakdown, daysLeft, relatedCount };
}

export function ExamCountdownBanner({
  examTarget,
  onUpdate,
  allSessions = [],
  sessionsCount = 0,
  quizAccuracy = 0,
  tasksCompleted = 0,
  className = "",
}: ExamCountdownBannerProps) {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [titleInput, setTitleInput] = useState(examTarget?.examTitle || "");
  const [dateInput, setDateInput] = useState(examTarget?.examDate || "");
  const [subjectInput, setSubjectInput] = useState(examTarget?.subject || "other");
  const [attachedSources, setAttachedSources] = useState<string[]>(examTarget?.attachedSourceIds || []);

  const libraryFiles = useMemo(() => loadLibrary(), [isModalOpen]);

  const todayStr = new Date().toISOString().split("T")[0];

  const openModal = () => {
    playPop();
    setTitleInput(examTarget?.examTitle || "");
    setDateInput(examTarget?.examDate || "");
    setSubjectInput(examTarget?.subject || "other");
    setAttachedSources(examTarget?.attachedSourceIds || []);
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
      attachedSourceIds: attachedSources,
    };
    onUpdate(newTarget);
    setIsModalOpen(false);
  };

  const handleClear = () => {
    playTap();
    onUpdate(null);
    setIsModalOpen(false);
  };

  // ── EMPTY STATE (COMPACT, NON-INTRUSIVE) ──────────────────────────────────
  if (!examTarget || !examTarget.examDate) {
    return (
      <>
        <div
          className={`border-2 border-black rounded-2xl bg-[#FFFDF5] p-3 sm:p-3.5 flex items-center justify-between gap-3 shadow-[2px_2px_0px_#1A1A1A] transition-all hover:bg-white ${className}`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg border border-black bg-[#FFD13B] flex items-center justify-center shrink-0 shadow-[1px_1px_0px_#1A1A1A]">
              <span className="material-symbols-outlined text-[18px] text-black" aria-hidden="true">event_available</span>
            </div>
            <div className="min-w-0">
              <span className="text-[13px] font-black text-black block truncate">
                Target an upcoming exam?
              </span>
              <p className="text-[11px] font-bold text-black/50 truncate">
                Set a date for automated countdowns & readiness tracking.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openModal}
            className="border-2 border-black bg-white hover:bg-black hover:text-white px-3 py-1.5 rounded-xl font-black text-[11.5px] uppercase tracking-wider shadow-[1.5px_1.5px_0px_#1A1A1A] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">add_circle</span>
            Set Date
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
            attachedSources={attachedSources}
            setAttachedSources={setAttachedSources}
            libraryFiles={libraryFiles}
            minDate={todayStr}
            hasExisting={false}
            onClose={closeModal}
            onSave={handleSave}
            onClear={handleClear}
            navigate={navigate}
          />
        )}
      </>
    );
  }

  // ── ACTIVE COUNTDOWN STATE (SUBJECT & MATERIAL AWARE) ──────────────────────
  const effectiveSessions = allSessions.length > 0 ? allSessions : Array(sessionsCount).fill({ title: "Study Session" });
  const { percent, breakdown, daysLeft } = calculateExamReadiness(
    examTarget,
    effectiveSessions,
    libraryFiles,
    quizAccuracy,
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
    daysPillText = "Today!";
    daysPillBg = "bg-[#FF4D2E] text-white";
  } else if (daysLeft === 1) {
    daysPillText = "Tomorrow";
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
        className={`border-2 border-black rounded-2xl bg-white p-4 shadow-[2px_2px_0px_#1A1A1A] relative flex flex-col gap-3.5 ${className}`}
      >
        {/* Top Badges & Edit Button */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            <div className="w-6 h-6 rounded-md border border-black bg-[#FAF7F2] flex items-center justify-center shrink-0 shadow-xs">
              <span className="material-symbols-outlined text-[15px] text-black" aria-hidden="true">timer</span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border border-black bg-black text-white shrink-0">
              Exam Target
            </span>
            {(examTarget.subject || subjectMeta) && (
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border border-black bg-[#FFE566] text-black shadow-xs shrink-0 truncate max-w-[120px]">
                {subjectMeta?.name || examTarget.subject}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={openModal}
            title="Edit Exam Target & Linked Materials"
            aria-label="Edit Exam Target"
            className="w-7 h-7 rounded-lg border border-black bg-white hover:bg-black hover:text-white flex items-center justify-center shadow-xs active:translate-y-0.5 transition-all shrink-0 cursor-pointer text-black"
          >
            <span className="material-symbols-outlined text-[15px]" aria-hidden="true">edit</span>
          </button>
        </div>

        {/* Title & Date Info */}
        <div className="min-w-0">
          <h3 className="text-[16px] md:text-[17px] font-black text-black leading-snug truncate">
            {examTarget.examTitle}
          </h3>
          <div className="flex items-center gap-2 mt-1 text-[11px] font-extrabold text-black/60 flex-wrap">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]" aria-hidden="true">event</span>
              {formattedDate}
            </span>
            <span className={`px-2 py-0.5 rounded-md border border-black text-[10px] font-black shadow-xs ${daysPillBg}`}>
              {daysPillText}
            </span>
            {examTarget.attachedSourceIds && examTarget.attachedSourceIds.length > 0 && (
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md border border-black/15 bg-black/5 text-black/70 flex items-center gap-0.5">
                <span className="material-symbols-outlined text-[12px]" aria-hidden="true">attach_file</span>
                {examTarget.attachedSourceIds.length} doc{examTarget.attachedSourceIds.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </div>

        {/* Test Readiness Bar */}
        <div className="bg-[#FAF7F2] border border-black/15 rounded-xl p-2.5">
          <div className="flex justify-between items-center mb-1.5 text-[11px] font-black">
            <span className="text-black/60 uppercase tracking-wider text-[10px]">Test Readiness</span>
            <span className="text-black font-black">{percent}%</span>
          </div>
          <div className="h-2.5 bg-[#E8E4DC] rounded-full border border-black overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${percent >= 75 ? "bg-[#10B981]" : percent >= 45 ? "bg-[#F5A623]" : "bg-[#FF4D2E]"}`}
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="text-[10.5px] font-bold text-black/55 mt-1.5 leading-tight truncate">
            {breakdown}
          </p>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={() => {
            playPop();
            localStorage.setItem("pz_practice_topic", examTarget.examTitle);
            if (examTarget.subject) {
              localStorage.setItem("pz_practice_subject", examTarget.subject);
            }
            if (examTarget.attachedSourceIds && examTarget.attachedSourceIds.length > 0) {
              saveContext({ mode: "selected", selectedIds: examTarget.attachedSourceIds });
            }
            navigate(subjectMeta?.recommendedTool || "/practice");
          }}
          className="w-full border-2 border-black bg-[#FFD13B] text-black hover:bg-black hover:text-white py-2 px-3 rounded-xl font-black text-[12px] uppercase tracking-wider shadow-[2px_2px_0px_#1A1A1A] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">play_arrow</span>
          <span>{daysLeft < 0 ? "Review Exam Topic" : "Start Targeted Prep"}</span>
        </button>
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
          attachedSources={attachedSources}
          setAttachedSources={setAttachedSources}
          libraryFiles={libraryFiles}
          minDate={todayStr}
          hasExisting={true}
          onClose={closeModal}
          onSave={handleSave}
          onClear={handleClear}
          navigate={navigate}
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
  attachedSources: string[];
  setAttachedSources: (v: string[]) => void;
  libraryFiles: SourceFile[];
  minDate: string;
  hasExisting: boolean;
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
  onClear: () => void;
  navigate: any;
}

function ExamModal({
  title,
  titleInput,
  setTitleInput,
  dateInput,
  setDateInput,
  subjectInput,
  setSubjectInput,
  attachedSources,
  setAttachedSources,
  libraryFiles,
  minDate,
  hasExisting,
  onClose,
  onSave,
  onClear,
  navigate,
}: ExamModalProps) {
  const isKnownSubject = Object.keys(SUBJECT_METADATA).includes(subjectInput);
  const [selectedDropdown, setSelectedDropdown] = useState<string>(
    isKnownSubject ? subjectInput : "custom"
  );
  const [customText, setCustomText] = useState<string>(
    isKnownSubject ? "" : subjectInput
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-[#FAF7F2] border-4 border-black w-full max-w-lg shadow-[8px_8px_0px_0px_#000] flex flex-col rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh]">
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
        <form onSubmit={onSave} className="p-5 flex flex-col gap-4 overflow-y-auto">
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-black/60 mb-1.5">
              Exam or Test Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g. AP Chemistry Midterm, English Final"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              className="w-full bg-white border-2 border-black px-3.5 py-2.5 text-[13px] font-bold rounded-xl outline-none focus:border-[#FF4D2E] transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-black/60 mb-1.5">
                Subject Category
              </label>
              <select
                value={selectedDropdown}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedDropdown(val);
                  if (val === "custom") {
                    setSubjectInput(customText.trim() || "Custom Subject");
                  } else {
                    setSubjectInput(val);
                  }
                }}
                className="w-full bg-white border-2 border-black px-3 py-2 text-[13px] font-bold rounded-xl outline-none cursor-pointer"
              >
                {Object.entries(SUBJECT_METADATA).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.name}
                  </option>
                ))}
                <option value="custom">+ Custom Subject...</option>
              </select>
              {selectedDropdown === "custom" && (
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Type custom subject (e.g. Criminal Law, Anatomy)..."
                  value={customText}
                  onChange={(e) => {
                    const text = e.target.value;
                    setCustomText(text);
                    setSubjectInput(text);
                  }}
                  className="w-full bg-white border-2 border-black px-3 py-2 text-[12.5px] font-bold rounded-xl outline-none focus:border-[#FF4D2E] mt-2 shadow-xs"
                />
              )}
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
                className="w-full bg-white border-2 border-black px-3 py-2 text-[13px] font-bold rounded-xl outline-none cursor-pointer"
              />
            </div>
          </div>

          {/* Linked Study Materials (Source Library integration) */}
          <div className="border-t-2 border-black/10 pt-3">
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-black/70 flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px] text-[#FF4D2E]">attach_file</span>
                Link Study Materials ({attachedSources.length} selected)
              </label>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate("/sources");
                }}
                className="text-[10.5px] font-black text-black hover:text-[#FF4D2E] underline cursor-pointer"
              >
                + Upload to Library
              </button>
            </div>
            <p className="text-[11px] font-bold text-black/50 mb-2">
              Attach PDFs or notes from your Source Library so readiness tracks this exact material.
            </p>

            {libraryFiles.length === 0 ? (
              <div className="p-3 bg-white border-2 border-black/15 rounded-xl text-[11.5px] font-medium text-black/50">
                No documents in your Source Library yet. You can upload PDFs or lecture notes in the Source Library anytime to link them here.
              </div>
            ) : (
              <div className="max-h-36 overflow-y-auto flex flex-col gap-1.5 p-1.5 bg-white border-2 border-black rounded-xl">
                {libraryFiles.map((file) => {
                  const isChecked = attachedSources.includes(file.id);
                  return (
                    <label
                      key={file.id}
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-[12px] font-bold transition-colors ${
                        isChecked ? "bg-[#FFE566]/30 border border-black/30" : "hover:bg-[#FAF7F2] border border-transparent"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setAttachedSources(attachedSources.filter((id) => id !== file.id));
                          } else {
                            setAttachedSources([...attachedSources, file.id]);
                          }
                        }}
                        className="rounded border-black text-black focus:ring-0 cursor-pointer"
                      />
                      <span className="material-symbols-outlined text-[16px] text-black/70">description</span>
                      <span className="truncate flex-1 text-black">{file.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-2 border-t-2 border-black/10 flex items-center justify-between gap-3 mt-1">
            {hasExisting ? (
              <button
                type="button"
                onClick={onClear}
                className="text-[12px] font-black text-red-600 hover:underline cursor-pointer"
              >
                Clear Target
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
