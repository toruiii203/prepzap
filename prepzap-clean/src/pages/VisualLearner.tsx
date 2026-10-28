import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { SharedSidebar } from "@/components/SharedSidebar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { usePlan } from "@/hooks/usePlan";
import { useStudySession } from "@/hooks/useStudySession";
import { buildAIContext, getActiveSource, onSourceChange } from "@/lib/sourceContext";
import { loadHistory, addHistoryEntry, saveHistory } from "@/lib/historyStore";
import type { HistoryEntry } from "@/components/ToolShell";
import { useTutorialModal } from "@/hooks/useTutorialModal";
import { TutorialModal } from "@/components/TutorialModal";
import { TUTORIAL_CONTENT } from "@/lib/tutorialContent";
import UpgradePrompt from "@/components/UpgradePrompt";
import { fireConfetti } from "@/lib/confetti";
import { toPng } from "html-to-image";
import { AnimatedRex } from "@/components/AnimatedRex";
import { shareToStudyVault } from "@/lib/shareToVault";
import {
  generateVisualLesson,
  VisualLesson,
  VisualLessonCard,
  ConceptCard,
  TableCard,
  ChartCard,
  RecallCard,
  TakeawayCard,
  VisualCallout,
  CATEGORY_COLORS,
} from "@/lib/visualLessonGeneration";

// ── Preset Concepts ──────────────────────────────────────────────────────────
const PRESET_CONCEPTS = [
  { label: "Mitosis vs Meiosis", tag: "Bio" },
  { label: "The Krebs Cycle", tag: "Chem" },
  { label: "Action Potential", tag: "Bio" },
  { label: "Supply & Demand Shift", tag: "Econ" },
  { label: "Neural Network Layers", tag: "CS" },
  { label: "Plate Tectonics", tag: "Earth" },
  { label: "Keynesian Multiplier", tag: "Econ" },
  { label: "DNA Replication Fork", tag: "Bio" },
];

export function sanitizeTopic(raw: string): { cleanTitle: string; sourceTag?: string } {
  let str = (raw || "").trim();
  str = str.replace(/\.(pdf|docx?|pptx?|txt|md|epub|png|jpe?g)$/i, "");

  const tokens = str.split(/[-_]+/);
  if (tokens.length >= 2 && /^[A-Za-z0-9]{3,12}$/.test(tokens[0])) {
    if (tokens.length >= 3 && /^[A-Za-z0-9]{1,6}$/.test(tokens[1])) {
      const tag = `${tokens[0]}-${tokens[1]}`;
      const title = tokens.slice(2).join(" ");
      return {
        cleanTitle: title.replace(/([a-z])([A-Z])/g, "$1 $2").trim() || str,
        sourceTag: tag,
      };
    } else {
      const tag = tokens[0];
      const title = tokens.slice(1).join(" ");
      return {
        cleanTitle: title.replace(/([a-z])([A-Z])/g, "$1 $2").trim() || str,
        sourceTag: tag,
      };
    }
  }

  const clean = str.replace(/[-_]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").trim();
  return { cleanTitle: clean || raw };
}

// ── SVG Chart Renderer ────────────────────────────────────────────────────────
function ClientSvgChart({ card }: { card: ChartCard }) {
  const { chart_type, labels, values, unit, caption } = card;
  const maxVal = Math.max(...values, 1);
  const minVal = Math.min(...values, 0);
  const range = maxVal - minVal || 1;

  const width = 360;
  const height = 180;
  const padLeft = 40;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 35;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  return (
    <div className="w-full bg-white border-2 border-black p-3 shadow-[2px_2px_0px_#000]">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto max-h-[220px]"
        aria-label={caption}
      >
        {/* Horizontal grid lines */}
        {[0, 0.5, 1].map((pct) => {
          const y = padTop + chartH * (1 - pct);
          const valLabel = Math.round(minVal + range * pct);
          return (
            <g key={pct}>
              <line
                x1={padLeft}
                y1={y}
                x2={width - padRight}
                y2={y}
                stroke="#e5e5e5"
                strokeDasharray="3 3"
              />
              <text
                x={padLeft - 6}
                y={y + 3}
                textAnchor="end"
                fontSize="9"
                fontWeight="700"
                fill="#666"
              >
                {valLabel}
              </text>
            </g>
          );
        })}

        {chart_type === "bar" ? (
          labels.map((lbl, idx) => {
            const barCount = labels.length;
            const slotW = chartW / barCount;
            const barW = Math.max(16, slotW * 0.6);
            const x = padLeft + idx * slotW + (slotW - barW) / 2;
            const barH = ((values[idx] - minVal) / range) * chartH;
            const y = padTop + chartH - barH;

            return (
              <g key={idx}>
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={barH}
                  fill="#f0a040"
                  stroke="#000"
                  strokeWidth="1.5"
                  rx="2"
                />
                <text
                  x={x + barW / 2}
                  y={y - 4}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="900"
                  fill="#000"
                >
                  {values[idx]}
                </text>
                <text
                  x={x + barW / 2}
                  y={height - padBottom + 14}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="700"
                  fill="#333"
                >
                  {lbl.slice(0, 10)}
                </text>
              </g>
            );
          })
        ) : (
          <g>
            {/* Line Chart path */}
            {(() => {
              const pts = labels.map((_, idx) => {
                const x = padLeft + (idx / Math.max(labels.length - 1, 1)) * chartW;
                const y = padTop + chartH - ((values[idx] - minVal) / range) * chartH;
                return `${x},${y}`;
              });
              const polyPoints = pts.join(" ");

              return (
                <>
                  <polyline
                    fill="none"
                    stroke="#000"
                    strokeWidth="2.5"
                    points={polyPoints}
                  />
                  {labels.map((lbl, idx) => {
                    const x = padLeft + (idx / Math.max(labels.length - 1, 1)) * chartW;
                    const y = padTop + chartH - ((values[idx] - minVal) / range) * chartH;
                    return (
                      <g key={idx}>
                        <circle cx={x} cy={y} r="4" fill="#38bdf8" stroke="#000" strokeWidth="1.5" />
                        <text
                          x={x}
                          y={y - 7}
                          textAnchor="middle"
                          fontSize="9"
                          fontWeight="900"
                          fill="#000"
                        >
                          {values[idx]}
                        </text>
                        <text
                          x={x}
                          y={height - padBottom + 14}
                          textAnchor="middle"
                          fontSize="9"
                          fontWeight="700"
                          fill="#333"
                        >
                          {lbl.slice(0, 10)}
                        </text>
                      </g>
                    );
                  })}
                </>
              );
            })()}
          </g>
        )}
      </svg>
      {caption && (
        <p className="text-[11px] font-bold text-black/60 text-center mt-2 border-t border-black/10 pt-1.5">
          {caption} {unit ? `(${unit})` : ""}
        </p>
      )}
    </div>
  );
}

// ── Process Flowchart Diagram Renderer (diagram-design skill) ────────────────
function ClientSvgProcessDiagram({
  cards,
  currentStep,
  onSelectStep,
}: {
  cards: VisualLessonCard[];
  currentStep: number;
  onSelectStep: (idx: number) => void;
}) {
  const stepCards = cards.filter(c => c.type === "concept" || c.type === "table" || c.type === "chart");
  if (stepCards.length === 0) return null;

  return (
    <div className="w-full bg-white border-2 border-black p-4 shadow-[3px_3px_0px_#000] flex flex-col gap-3">
      <div className="flex items-center justify-between border-b-2 border-black pb-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">account_tree</span>
          <span className="font-black text-[13px] uppercase tracking-wider">Concept Process Flowchart</span>
        </div>
        <span className="text-[11px] font-bold text-black/40">
          Click step to jump
        </span>
      </div>

      <div className="flex items-stretch gap-2 overflow-x-auto py-2 no-scrollbar">
        {stepCards.map((c, i) => {
          const isSelected = currentStep === i;
          return (
            <React.Fragment key={c.id || i}>
              <button
                type="button"
                onClick={() => onSelectStep(i)}
                className={`min-w-[140px] max-w-[170px] p-3 border-2 border-black rounded-lg text-left transition-all cursor-pointer flex flex-col justify-between shrink-0 ${
                  isSelected
                    ? "bg-[#FFE566] shadow-[3px_3px_0px_#000] scale-102"
                    : "bg-[#FAF7F2] hover:bg-white shadow-[2px_2px_0px_#000]"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-black text-white">
                      Step {i + 1}
                    </span>
                    <span className="w-2.5 h-2.5 rounded-full border border-black" style={{ backgroundColor: CATEGORY_COLORS[c.color_category] || "#10B981" }} />
                  </div>
                  <p className="font-black text-[12px] text-black leading-tight line-clamp-2">
                    {c.title}
                  </p>
                </div>
                <div className="mt-2 pt-1.5 border-t border-black/15 flex items-center justify-between text-[10px] font-bold text-black/50">
                  <span className="capitalize">{c.color_category || "concept"}</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </div>
              </button>

              {i < stepCards.length - 1 && (
                <div className="flex items-center justify-center shrink-0 text-black/30">
                  <span className="material-symbols-outlined text-[20px]">trending_flat</span>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ── Card Helper: "Was this helpful?" Feedback ────────────────────────────────
function HelpfulFeedback({ cardIndex }: { cardIndex: number }) {
  const [voted, setVoted] = useState<"up" | "down" | null>(null);

  return (
    <div className="flex items-center justify-between pt-3 mt-3 border-t border-black/10">
      <span className="text-[11px] font-bold text-black/50">Was this card helpful?</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setVoted("up")}
          aria-label="Thumbs up"
          className={`flex items-center justify-center w-8 h-8 border-2 border-black shadow-[1px_1px_0px_#000] active:translate-y-0.5 transition-all cursor-pointer ${
            voted === "up" ? "bg-emerald-400 text-black font-black" : "bg-white text-black hover:bg-[#FAF7F2]"
          }`}
        >
          <span className="material-symbols-outlined text-[16px] normal-case">thumb_up</span>
        </button>
        <button
          type="button"
          onClick={() => setVoted("down")}
          aria-label="Thumbs down"
          className={`flex items-center justify-center w-8 h-8 border-2 border-black shadow-[1px_1px_0px_#000] active:translate-y-0.5 transition-all cursor-pointer ${
            voted === "down" ? "bg-rose-400 text-black font-black" : "bg-white text-black hover:bg-[#FAF7F2]"
          }`}
        >
          <span className="material-symbols-outlined text-[16px] normal-case">thumb_down</span>
        </button>
        {voted && (
          <span className="text-[11px] font-black text-black ml-1">Thanks!</span>
        )}
      </div>
    </div>
  );
}

export default function VisualLearner() {
  const navigate = useNavigate();
  const tutorial = useTutorialModal("/visual-learner");
  const { isPro, canUse, remaining, logUsage } = usePlan();
  const { logSession } = useStudySession();

  // State
  const [conceptInput, setConceptInput] = useState("");
  const [activeConcept, setActiveConcept] = useState("");
  const [sourceTag, setSourceTag] = useState<string | undefined>(undefined);
  const [activeSource, setActiveSource] = useState<string | null>(() => getActiveSource()?.name ?? null);
  const [phase, setPhase] = useState<"setup" | "loading" | "lesson">("setup");
  const [lesson, setLesson] = useState<VisualLesson | null>(null);
  const [currentStep, setCurrentStep] = useState(0); // 0 = Big Idea, 1..N = Lesson cards

  // Card Interactive States
  const [activeCalloutIdx, setActiveCalloutIdx] = useState<number | null>(null);
  const [revealedPredictions, setRevealedPredictions] = useState<Record<number, boolean>>({});
  const [selectedRecallOption, setSelectedRecallOption] = useState<Record<number, string>>({});
  const [savedToVaultSuccess, setSavedToVaultSuccess] = useState(false);
  const [savedToFlashcardsSuccess, setSavedToFlashcardsSuccess] = useState(false);

  // Upgrade & Limits
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [remainingUses, setRemainingUses] = useState<number>(3);

  // Export Cheat Sheet
  const [isExporting, setIsExporting] = useState(false);
  const lessonRef = useRef<HTMLDivElement>(null);

  // History
  const [toolHistory, setToolHistory] = useState<HistoryEntry[]>(() => loadHistory("visual"));
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Sync active source
  useEffect(() => {
    const sync = () => setActiveSource(getActiveSource()?.name ?? null);
    sync();
    const unsub = onSourceChange(sync);
    return unsub;
  }, []);

  // QuickLaunch prefill
  useEffect(() => {
    const prefill = sessionStorage.getItem("quicklaunch_prompt");
    if (prefill && prefill.trim()) {
      const sanitized = sanitizeTopic(prefill.trim());
      setConceptInput(sanitized.cleanTitle);
      sessionStorage.removeItem("quicklaunch_prompt");
      sessionStorage.removeItem("quicklaunch_tool");
    }
  }, []);

  // Total steps in the lesson = 1 (Big Idea) + number of cards
  const totalSteps = lesson ? 1 + lesson.cards.length : 1;

  // Generate Lesson
  const handleGenerate = async (targetOverride?: string) => {
    const rawTarget = (targetOverride ?? conceptInput).trim();
    if (!rawTarget) return;

    const sanitized = sanitizeTopic(rawTarget);
    const target = sanitized.cleanTitle;

    // Freemium Limit Check
    if (!isPro) {
      try {
        const allowed = await canUse("visual");
        if (!allowed) {
          const rem = await remaining("visual");
          setRemainingUses(rem);
          setShowUpgradeModal(true);
          return;
        }
      } catch {}
    }

    setActiveConcept(target);
    setSourceTag(sanitized.sourceTag);
    setPhase("loading");
    setCurrentStep(0);
    setActiveCalloutIdx(null);
    setRevealedPredictions({});
    setSelectedRecallOption({});
    setSavedToVaultSuccess(false);
    setSavedToFlashcardsSuccess(false);

    const sourceContext = buildAIContext();

    try {
      const generated = await generateVisualLesson({
        topic: target,
        sourceText: sourceContext,
      });

      setLesson(generated);
      setPhase("lesson");

      // Save to history store
      const entry: HistoryEntry = {
        id: Date.now().toString(),
        title: target,
        subtitle: generated.big_idea.sentence,
        timestamp: new Date(),
        data: generated,
      };
      const nextHist = addHistoryEntry("visual", entry, toolHistory);
      setToolHistory(nextHist);

      // Log study session & usage
      await logSession({ title: `Visual Lesson: ${target}`, durationMinutes: 6 });
      try {
        await logUsage("visual");
      } catch {}
    } catch (err) {
      console.error("[VisualLearner] Lesson generation error:", err);
      setPhase("setup");
    }
  };

  // Restore history
  const handleHistorySelect = (entry: HistoryEntry) => {
    try {
      const parsed: VisualLesson =
        typeof entry.data === "string" ? JSON.parse(entry.data) : (entry.data as VisualLesson);
      if (!parsed || !parsed.topic) return;
      setActiveConcept(parsed.topic);
      setLesson(parsed);
      setPhase("lesson");
      setCurrentStep(0);
      setSidebarOpen(false);
    } catch {}
  };

  // Export Cheat Sheet
  const handleExportCheatSheet = async () => {
    if (!lessonRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(lessonRef.current, { cacheBust: true, pixelRatio: 2 });
      const link = document.createElement("a");
      const safeTitle = (activeConcept || "Visual_Lesson").replace(/[^a-zA-Z0-9_-]/g, "_");
      link.download = `${safeTitle}_Visual_Lesson.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("[VisualLearner] Export cheat sheet error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  // Save to Flashcards
  const handleSaveToFlashcards = () => {
    if (!lesson) return;
    try {
      // Find takeaway or concept cards to build flashcards
      const cardsToExport = lesson.cards.map((c, idx) => {
        if (c.type === "concept") {
          return {
            front: `Visual Concept: ${c.title}`,
            back: `${c.explanation}\n\nMemory Hook: ${c.memory_hook}\nExam Trap: ${c.exam_trap}`,
          };
        }
        if (c.type === "table") {
          return {
            front: `Comparison: ${c.caption}`,
            back: `${c.rows.map(r => r.join(" vs ")).join("\n")}\n\nDistinction: ${c.distinction_rule}`,
          };
        }
        if (c.type === "recall") {
          return {
            front: `Active Recall: ${c.prompt}`,
            back: `Answer: ${c.answer}\n\nWhy: ${c.why}`,
          };
        }
        if (c.type === "takeaway") {
          return {
            front: `Key Takeaways: ${lesson.topic}`,
            back: `${c.points.join("\n")}\n\nExam Trap: ${c.exam_trap}`,
          };
        }
        return {
          front: `Concept: ${lesson.topic}`,
          back: lesson.big_idea.sentence,
        };
      });

      localStorage.setItem("qs_flashcards_export", JSON.stringify(cardsToExport));
      setSavedToFlashcardsSuccess(true);
      fireConfetti();
      setTimeout(() => {
        navigate("/flashcards");
      }, 1200);
    } catch (err) {
      console.error("[VisualLearner] Failed to export flashcards:", err);
    }
  };

  // Save to Study Vault
  const handleSaveToStudyVault = () => {
    if (!lesson) return;
    try {
      const takeawayCard = lesson.cards.find(c => c.type === "takeaway") as TakeawayCard | undefined;
      const keyPoints = takeawayCard ? takeawayCard.points : [lesson.big_idea.sentence];
      const examTrap = takeawayCard ? takeawayCard.exam_trap : "";

      const markdownContent = `# Visual Mastery: ${lesson.topic}

> **Core Concept**: ${lesson.big_idea.sentence}

## Key Takeaways
${keyPoints.map((p) => `- ${p}`).join("\n")}

${examTrap ? `> **Universal Exam Trap**: ${examTrap}` : ""}`.trim();

      shareToStudyVault({
        title: `Visual Mastery: ${lesson.topic}`,
        topic: lesson.topic,
        subject: lesson.subject || "General",
        summary: lesson.big_idea.sentence,
        content: markdownContent,
        key_points: keyPoints,
        exam_trap: examTrap,
        tags: [lesson.topic.toLowerCase().replace(/[^a-z0-9]/g, "-"), "visual-lesson"],
        author: "Visual Learner",
        isAiGenerated: true,
      });

      setSavedToVaultSuccess(true);
      fireConfetti();
      setTimeout(() => {
        navigate("/campus-vault");
      }, 1200);
    } catch (err) {
      console.error("[VisualLearner] Failed to save to Study Vault:", err);
    }
  };

  return (
    <div className="flex h-screen bg-[#FAF7F2] font-sans antialiased overflow-hidden">
      <TutorialModal
        isOpen={tutorial.isOpen}
        onDismiss={tutorial.dismiss}
        features={TUTORIAL_CONTENT["/visual-learner"] || []}
        title="Visual Learner"
      />

      {showUpgradeModal && (
        <UpgradePrompt
          feature="visual"
          remaining={remainingUses}
          onClose={() => setShowUpgradeModal(false)}
        />
      )}

      {/* Desktop Navigation */}
      <SharedSidebar active="/visual-learner" />

      {/* Main Container */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto md:ml-64 pb-20 md:pb-6">
        {/* Top Header */}
        <header className="h-16 border-b-2 border-black bg-white px-4 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 border-2 border-black bg-[#f0a040] flex items-center justify-center shadow-[2px_2px_0px_#000]">
              <span className="material-symbols-outlined text-[20px] text-black">schema</span>
            </div>
            <div>
              <h1 className="text-[17px] font-black tracking-tight leading-none text-black">Visual Learner</h1>
              <span className="text-[11px] font-bold text-black/50">Interactive 5-Step Visual Lesson</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeSource && (
              <div className="hidden sm:flex items-center gap-1.5 border-2 border-black rounded-full px-3 py-0.5 bg-[#FAF7F2] text-[11px] font-bold">
                <span className="material-symbols-outlined text-[14px]">description</span>
                <span className="truncate max-w-[150px]">{activeSource}</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 border-2 border-black bg-white hover:bg-[#FAF7F2] text-[11px] font-black uppercase tracking-wider shadow-[2px_2px_0px_#000]"
            >
              <span className="material-symbols-outlined text-[15px]">history</span>
              <span className="hidden sm:inline">History</span>
            </button>
            <button
              type="button"
              onClick={() => tutorial.show()}
              className="w-9 h-9 border-2 border-black bg-white hover:bg-[#FAF7F2] flex items-center justify-center rounded-full shadow-[2px_2px_0px_#000]"
              title="How Visual Learner Works"
            >
              <span className="material-symbols-outlined text-[18px]">help</span>
            </button>
          </div>
        </header>

        {/* ── PHASE 1: SETUP ──────────────────────────────────────────────── */}
        {phase === "setup" && (
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-2xl mx-auto w-full">
            <div className="w-full bg-white border-3 border-black p-6 sm:p-8 shadow-[5px_5px_0px_#000] flex flex-col gap-6">
              <div className="flex flex-col items-center text-center gap-3">
                <AnimatedRex state="explaining" size="lg" preferAnimatedWebP={true} />
                <h2 className="text-2xl sm:text-3xl font-black text-black">Turn any topic into an active visual lesson</h2>
                <p className="text-xs sm:text-sm font-bold text-black/60 max-w-md">
                  No generic stock photos. Get interactive diagrams, numbered callout tests, comparison tables, and active recall.
                </p>
              </div>

              {/* Input Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleGenerate();
                }}
                className="flex flex-col gap-3"
              >
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={conceptInput}
                      onChange={(e) => setConceptInput(e.target.value)}
                      placeholder="e.g. Mitosis, Keynesian Multiplier, Black Holes..."
                      className="w-full border-2 border-black px-4 py-3 text-sm font-bold focus:outline-none focus:ring-0 shadow-[2px_2px_0px_#000] bg-[#FAF7F2]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!conceptInput.trim()}
                    className="px-6 py-3 border-2 border-black bg-[#f0a040] hover:bg-[#e09030] disabled:opacity-40 font-black text-xs uppercase tracking-wider shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all text-black flex items-center justify-center gap-2"
                  >
                    <span>Start Lesson</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>

                {/* Preset Chips */}
                <div className="flex flex-col gap-2 pt-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-black/40">Try a curriculum concept:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_CONCEPTS.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => {
                          setConceptInput(p.label);
                          handleGenerate(p.label);
                        }}
                        className="px-2.5 py-1 bg-white border border-black text-[11px] font-bold text-black hover:bg-[#FAF7F2] shadow-[1px_1px_0px_#000] transition-all"
                      >
                        <span className="font-black text-black/40 mr-1">[{p.tag}]</span>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── PHASE 2: LOADING ────────────────────────────────────────────── */}
        {phase === "loading" && (
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
            <div className="bg-white border-3 border-black p-8 shadow-[5px_5px_0px_#000] max-w-md w-full flex flex-col items-center text-center gap-4">
              <AnimatedRex state="processing" size="lg" preferAnimatedWebP={true} />
              <div>
                <h3 className="text-xl font-black text-black">Synthesizing Visual Lesson</h3>
                <p className="text-xs font-bold text-black/60 mt-1">
                  Drafting big idea, callouts, comparison cards, and recall tests for "{activeConcept}"...
                </p>
              </div>
              <div className="w-full bg-[#FAF7F2] border-2 border-black h-3 overflow-hidden p-0.5 mt-2">
                <div className="h-full bg-[#f0a040] animate-pulse w-3/4" />
              </div>
            </div>
          </div>
        )}

        {/* ── PHASE 3: INTERACTIVE LESSON ─────────────────────────────────── */}
        {phase === "lesson" && lesson && (
          <div className="flex-1 px-4 sm:px-8 py-6 max-w-4xl mx-auto w-full flex flex-col gap-6" ref={lessonRef}>
            {/* Lesson Top Bar & Stepper */}
            <div className="bg-white border-2 sm:border-3 border-black p-4 shadow-[3px_3px_0px_#000] flex flex-col gap-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#ae2925]">
                    {lesson.subject || "Academic Lesson"}
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-black tracking-tight leading-tight">
                    {lesson.topic}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportCheatSheet}
                    disabled={isExporting}
                    className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-black bg-white hover:bg-[#FAF7F2] text-[11px] font-black shadow-[2px_2px_0px_#000]"
                  >
                    <span className="material-symbols-outlined text-[15px]">download</span>
                    <span>{isExporting ? "Saving..." : "Cheat Sheet"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPhase("setup");
                      setConceptInput("");
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 border-2 border-black bg-[#FAF7F2] hover:bg-black hover:text-white text-[11px] font-black shadow-[2px_2px_0px_#000]"
                  >
                    <span className="material-symbols-outlined text-[15px]">refresh</span>
                    <span>New</span>
                  </button>
                </div>
              </div>

              {/* Segmented Progress Tracker ("Step X of Y") */}
              <div className="flex flex-col gap-1.5 pt-2 border-t border-black/10">
                <div className="flex items-center justify-between text-[11px] font-black">
                  <span>
                    Step {currentStep + 1} of {totalSteps}:{" "}
                    <span className="text-black/60 font-bold">
                      {currentStep === 0
                        ? "Big Idea"
                        : lesson.cards[currentStep - 1]?.type.toUpperCase()}
                    </span>
                  </span>
                  <span className="text-black/40 font-bold">
                    {Math.round(((currentStep + 1) / totalSteps) * 100)}% Complete
                  </span>
                </div>

                {/* Progress bar dots */}
                <div className="grid grid-cols-5 gap-1.5">
                  {Array.from({ length: totalSteps }).map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCurrentStep(idx)}
                      className={`h-2 border border-black transition-all ${
                        idx === currentStep
                          ? "bg-[#f0a040] shadow-[1px_1px_0px_#000]"
                          : idx < currentStep
                          ? "bg-black"
                          : "bg-black/10"
                      }`}
                      title={`Jump to Step ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Process Architecture Flowchart (diagram-design) */}
            <ClientSvgProcessDiagram
              cards={lesson.cards}
              currentStep={currentStep - 1}
              onSelectStep={(idx) => setCurrentStep(idx + 1)}
            />

            {/* ── STEP 0: BIG IDEA ────────────────────────────────────────── */}
            {currentStep === 0 && (
              <div className="bg-white border-3 border-black p-5 sm:p-7 shadow-[4px_4px_0px_#000] flex flex-col gap-5">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-[#f0a040] border border-black text-[10px] font-black uppercase shadow-[1px_1px_0px_#000]">
                    Step 1 • The Big Idea
                  </span>
                  <span className="text-[11px] font-bold text-black/50">Core Concept Anchor</span>
                </div>

                <div className="bg-[#FFFDF5] border-2 border-black p-4 border-l-4 border-l-[#f0a040]">
                  <p className="text-base sm:text-lg font-black text-black leading-snug">
                    "{lesson.big_idea.sentence}"
                  </p>
                </div>

                {/* Hero Image if available */}
                {lesson.big_idea.imageUrl && (
                  <div className="border-2 border-black overflow-hidden bg-black/5 shadow-[2px_2px_0px_#000] max-h-[360px] flex items-center justify-center">
                    <img
                      src={lesson.big_idea.imageUrl}
                      alt={lesson.topic}
                      className="w-full h-full object-cover max-h-[360px]"
                    />
                  </div>
                )}

                <HelpfulFeedback cardIndex={0} />

                {/* Next Step Button */}
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="flex items-center gap-2 px-6 py-2.5 border-2 border-black bg-[#f0a040] hover:bg-[#e09030] font-black text-xs uppercase tracking-wider shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5"
                  >
                    <span>Begin Concept Breakdown</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 1..N: LESSON CARDS ─────────────────────────────────── */}
            {currentStep > 0 && (() => {
              const card = lesson.cards[currentStep - 1];
              if (!card) return null;
              const catColor = CATEGORY_COLORS[card.color_category] || "#f0a040";

              return (
                <div className="bg-white border-3 border-black p-5 sm:p-7 shadow-[4px_4px_0px_#000] flex flex-col gap-5">
                  {/* Card Header & Badge */}
                  <div className="flex items-center justify-between flex-wrap gap-2 border-b border-black/10 pb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="px-2.5 py-0.5 border border-black text-[10px] font-black uppercase text-black shadow-[1px_1px_0px_#000]"
                        style={{ backgroundColor: catColor }}
                      >
                        {card.color_category.toUpperCase()}
                      </span>
                      <span className="text-[11px] font-black uppercase tracking-wider text-black/50">
                        Card {currentStep} of {lesson.cards.length}
                      </span>
                    </div>

                    <span className="text-[11px] font-bold text-black/40">
                      Type: {card.type.toUpperCase()}
                    </span>
                  </div>

                  {/* ─────────────────────────────────────────────────────────────
                      CARD TYPE: CONCEPT
                  ────────────────────────────────────────────────────────────── */}
                  {card.type === "concept" && (
                    <div className="flex flex-col gap-4">
                      <div>
                        <h3 className="text-lg sm:text-xl font-black text-black">{card.title}</h3>
                        <p className="text-xs font-bold text-black/70 mt-1">
                          <span className="font-black text-black">What to notice:</span> {card.what_to_notice}
                        </p>
                      </div>

                      {/* Photo with Numbered Callouts */}
                      {card.imageUrl ? (
                        <div className="relative border-2 border-black bg-black/5 overflow-hidden shadow-[2px_2px_0px_#000] max-h-[380px] flex items-center justify-center">
                          <img
                            src={card.imageUrl}
                            alt={card.title}
                            className="w-full h-full object-cover max-h-[380px]"
                          />
                          {/* Callout markers over image */}
                          {card.callouts.map((callout, cIdx) => (
                            <button
                              key={cIdx}
                              type="button"
                              onClick={() => setActiveCalloutIdx(activeCalloutIdx === cIdx ? null : cIdx)}
                              style={{ left: `${callout.x}%`, top: `${callout.y}%` }}
                              className={`absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full border-2 border-black font-black text-xs flex items-center justify-center transition-all shadow-[1px_1px_0px_#000] ${
                                activeCalloutIdx === cIdx
                                  ? "bg-[#ae2925] text-white scale-110 z-10"
                                  : "bg-[#f0a040] text-black hover:scale-105"
                              }`}
                              title={callout.label}
                            >
                              {cIdx + 1}
                            </button>
                          ))}
                        </div>
                      ) : null}

                      {/* Interactive Callouts Strip */}
                      {card.callouts.length > 0 && (
                        <div className="flex flex-col gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-black/50">
                            Tap callout marker to inspect:
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {card.callouts.map((c, cIdx) => (
                              <button
                                key={cIdx}
                                type="button"
                                onClick={() => setActiveCalloutIdx(activeCalloutIdx === cIdx ? null : cIdx)}
                                className={`p-2.5 border-2 border-black text-left transition-all ${
                                  activeCalloutIdx === cIdx
                                    ? "bg-[#FFF9E6] shadow-[2px_2px_0px_#000] border-black"
                                    : "bg-[#FAF7F2] hover:bg-white shadow-[1px_1px_0px_#000]"
                                }`}
                              >
                                <div className="flex items-center gap-1.5 mb-1">
                                  <span className="w-5 h-5 rounded-full border border-black bg-[#f0a040] text-[10px] font-black flex items-center justify-center text-black">
                                    {cIdx + 1}
                                  </span>
                                  <span className="text-xs font-black truncate">{c.label}</span>
                                </div>
                                <p className="text-[11px] font-bold text-black/70 leading-snug">
                                  {c.description}
                                </p>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Predict Before Reveal Interaction */}
                      <div className="bg-[#FAF7F2] border-2 border-black p-3.5 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black uppercase text-black flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px]">psychology</span>
                            <span>Predict the Mechanism</span>
                          </span>
                          {!revealedPredictions[currentStep] && (
                            <button
                              type="button"
                              onClick={() =>
                                setRevealedPredictions(prev => ({ ...prev, [currentStep]: true }))
                              }
                              className="px-2.5 py-1 bg-black text-white text-[10px] font-black uppercase hover:bg-[#ae2925] transition-colors"
                            >
                              Reveal Explanation
                            </button>
                          )}
                        </div>

                        {revealedPredictions[currentStep] ? (
                          <p className="text-xs sm:text-sm font-bold text-black/90 leading-relaxed border-t border-black/10 pt-2 animate-in fade-in duration-200">
                            {card.explanation}
                          </p>
                        ) : (
                          <p className="text-xs font-bold text-black/40 italic">
                            Before revealing: What is the main job or transformation happening here?
                          </p>
                        )}
                      </div>

                      {/* Memory Hook & Exam Trap */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div className="bg-[#15803d] text-white border-2 border-black p-4 shadow-[3px_3px_0px_#000] flex flex-col gap-1.5">
                          <span className="text-[11px] font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px] normal-case">lightbulb</span>
                            <span>Memory Hook (Everyday Analogy)</span>
                          </span>
                          <p className="text-xs sm:text-sm font-bold text-white leading-relaxed">
                            {card.memory_hook}
                          </p>
                        </div>

                        <div className="bg-[#b91c1c] text-white border-2 border-black p-4 shadow-[3px_3px_0px_#000] flex flex-col gap-1.5">
                          <span className="text-[11px] font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px] normal-case">warning</span>
                            <span>Exam Trap Watchout</span>
                          </span>
                          <p className="text-xs sm:text-sm font-bold text-white leading-relaxed">
                            {card.exam_trap}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ─────────────────────────────────────────────────────────────
                      CARD TYPE: TABLE / COMPARE
                  ────────────────────────────────────────────────────────────── */}
                  {card.type === "table" && (
                    <div className="flex flex-col gap-4">
                      <div>
                        <h3 className="text-lg sm:text-xl font-black text-black">{card.caption}</h3>
                        <p className="text-xs font-bold text-black/60 mt-0.5">
                          Side-by-side contrast of commonly confused exam pairs.
                        </p>
                      </div>

                      {/* Responsive Scrollable Table */}
                      <div className="w-full border-2 border-black overflow-x-auto shadow-[2px_2px_0px_#000]">
                        <table className="w-full text-left border-collapse min-w-[340px]">
                          <thead>
                            <tr className="bg-[#FAF7F2] border-b-2 border-black">
                              {card.columns.map((col, idx) => (
                                <th
                                  key={idx}
                                  className="px-3.5 py-2.5 text-xs font-black uppercase tracking-wider text-black border-r border-black last:border-r-0"
                                >
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {card.rows.map((row, rIdx) => (
                              <tr
                                key={rIdx}
                                className={`border-b border-black/10 last:border-b-0 ${
                                  rIdx % 2 === 0 ? "bg-white" : "bg-black/[0.02]"
                                }`}
                              >
                                {row.map((cell, cIdx) => (
                                  <td
                                    key={cIdx}
                                    className="px-3.5 py-2 text-xs font-bold text-black/85 border-r border-black/10 last:border-r-0"
                                  >
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* "How to tell them apart" Rule */}
                      <div className="bg-[#FFF9E6] border-2 border-black p-3.5 flex flex-col gap-1 border-l-4 border-l-[#f0a040]">
                        <span className="text-[10px] font-black uppercase text-[#8b1a2a] flex items-center gap-1">
                          <span className="material-symbols-outlined text-[15px]">rule</span>
                          <span>How to Tell Them Apart (Exam Rule)</span>
                        </span>
                        <p className="text-xs sm:text-sm font-extrabold text-black leading-relaxed">
                          {card.caption}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* ─────────────────────────────────────────────────────────────
                      CARD TYPE: CHART
                  ────────────────────────────────────────────────────────────── */}
                  {card.type === "chart" && (
                    <div className="flex flex-col gap-4">
                      <div>
                        <h3 className="text-lg sm:text-xl font-black text-black">{card.caption}</h3>
                        <p className="text-xs font-bold text-black/60 mt-0.5">
                          Visual trend & numerical distribution.
                        </p>
                      </div>

                      <ClientSvgChart card={card} />
                    </div>
                  )}

                  {/* ─────────────────────────────────────────────────────────────
                      CARD TYPE: RECALL
                  ────────────────────────────────────────────────────────────── */}
                  {card.type === "recall" && (() => {
                    const selected = selectedRecallOption[currentStep];
                    const isAnswered = Boolean(selected);
                    const isCorrect = selected === card.correct_answer;

                    return (
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-black text-white text-[10px] font-black uppercase">
                            Active Recall Round • {card.recall_type.toUpperCase()}
                          </span>
                        </div>

                        <div className="bg-[#FFFDF5] border-2 border-black p-4">
                          <p className="text-sm sm:text-base font-black text-black leading-snug">
                            {card.prompt}
                          </p>
                        </div>

                        {/* Predict-First Multiple Option Buttons */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {card.options.map((opt, oIdx) => {
                            const isChosen = selected === opt;
                            let btnStyle = "bg-[#FAF7F2] hover:bg-white text-black";

                            if (isAnswered) {
                              if (opt === card.correct_answer) {
                                btnStyle = "bg-emerald-300 text-black border-emerald-700 font-black";
                              } else if (isChosen) {
                                btnStyle = "bg-rose-300 text-black border-rose-700 font-black";
                              } else {
                                btnStyle = "opacity-40 bg-gray-100 text-black";
                              }
                            }

                            return (
                              <button
                                key={oIdx}
                                type="button"
                                disabled={isAnswered}
                                onClick={() => {
                                  setSelectedRecallOption(prev => ({ ...prev, [currentStep]: opt }));
                                  if (opt === card.correct_answer) {
                                    fireConfetti();
                                  }
                                }}
                                className={`p-3 border-2 border-black shadow-[2px_2px_0px_#000] text-left text-xs font-bold transition-all ${btnStyle}`}
                              >
                                <span className="block text-[10px] opacity-60 mb-0.5">Option {oIdx + 1}</span>
                                <span>{opt}</span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Reveal "Why" Explanation */}
                        {isAnswered && (
                          <div
                            className={`p-3.5 border-2 border-black flex flex-col gap-1 animate-in fade-in duration-200 ${
                              isCorrect ? "bg-emerald-50" : "bg-rose-50"
                            }`}
                          >
                            <span className="text-xs font-black flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[16px]">
                                {isCorrect ? "check_circle" : "cancel"}
                              </span>
                              <span>{isCorrect ? "Correct!" : `Correct Answer: ${card.correct_answer}`}</span>
                            </span>
                            <p className="text-xs font-bold text-black/80 leading-relaxed mt-0.5">
                              {card.why}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* ─────────────────────────────────────────────────────────────
                      CARD TYPE: TAKEAWAY
                  ────────────────────────────────────────────────────────────── */}
                  {card.type === "takeaway" && (
                    <div className="flex flex-col gap-4">
                      <div>
                        <h3 className="text-lg sm:text-xl font-black text-black">Lesson Takeaways</h3>
                        <p className="text-xs font-bold text-black/60 mt-0.5">
                          3 high-yield anchor points to cement before exam day.
                        </p>
                      </div>

                      {/* 3 Key Points */}
                      <div className="flex flex-col gap-2">
                        {card.points.map((pt, pIdx) => (
                          <div
                            key={pIdx}
                            className="p-3 bg-[#FAF7F2] border-2 border-black flex items-start gap-2.5 shadow-[1px_1px_0px_#000]"
                          >
                            <span className="w-5 h-5 rounded-full border border-black bg-[#f0a040] text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                              {pIdx + 1}
                            </span>
                            <p className="text-xs sm:text-sm font-bold text-black leading-snug">
                              {pt}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Exam Trap */}
                      <div className="bg-[#b91c1c] text-white border-2 border-black p-4 shadow-[3px_3px_0px_#000] flex flex-col gap-1.5">
                        <span className="text-[11px] font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px] normal-case">report_problem</span>
                          <span>Universal Exam Trap</span>
                        </span>
                        <p className="text-xs sm:text-sm font-extrabold text-white leading-relaxed">
                          {card.exam_trap}
                        </p>
                      </div>

                      {/* Action Buttons: Save to Flashcards / Study Vault */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <button
                          type="button"
                          onClick={handleSaveToFlashcards}
                          className="flex items-center justify-center gap-2 py-3 px-4 border-2 border-black bg-[#f0a040] hover:bg-[#e09030] text-black font-black text-xs uppercase tracking-wider shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5"
                        >
                          <span className="material-symbols-outlined text-[17px]">style</span>
                          <span>{savedToFlashcardsSuccess ? "Exported to Flashcards!" : "Save to Flashcards"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleSaveToStudyVault}
                          className="flex items-center justify-center gap-2 py-3 px-4 border-2 border-black bg-white hover:bg-[#FAF7F2] text-black font-black text-xs uppercase tracking-wider shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5"
                        >
                          <span className="material-symbols-outlined text-[17px]">bookmark</span>
                          <span>{savedToVaultSuccess ? "Saved in Study Vault!" : "Add to Study Vault"}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <HelpfulFeedback cardIndex={currentStep} />

                  {/* Stepper Footer: Back & Next Buttons */}
                  <div className="flex items-center justify-between pt-3 border-t border-black/10">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(c => Math.max(0, c - 1))}
                      className="flex items-center gap-1.5 px-4 py-2 border-2 border-black bg-white hover:bg-[#FAF7F2] font-black text-xs uppercase tracking-wider shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                      <span>Back</span>
                    </button>

                    {currentStep < totalSteps - 1 ? (
                      <button
                        type="button"
                        onClick={() => setCurrentStep(c => Math.min(totalSteps - 1, c + 1))}
                        className="flex items-center gap-1.5 px-5 py-2 border-2 border-black bg-[#f0a040] hover:bg-[#e09030] font-black text-xs uppercase tracking-wider shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5"
                      >
                        <span>Next Step</span>
                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          fireConfetti();
                          setPhase("setup");
                          setConceptInput("");
                        }}
                        className="flex items-center gap-1.5 px-5 py-2 border-2 border-black bg-emerald-300 hover:bg-emerald-400 font-black text-xs uppercase tracking-wider shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 text-black"
                      >
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        <span>Finish Lesson</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* History Slide-over Drawer */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 flex">
            <div className="flex-1 bg-black/40" onClick={() => setSidebarOpen(false)} />
            <div className="w-[85%] max-w-sm bg-white border-l-3 border-black flex flex-col h-full shadow-[-4px_0px_0px_#000]">
              <div className="flex items-center justify-between p-4 border-b-2 border-black">
                <span className="font-black text-sm uppercase">Lesson History</span>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="w-8 h-8 border-2 border-black flex items-center justify-center hover:bg-[#FAF7F2]"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {toolHistory.length === 0 ? (
                  <p className="text-xs text-black/50 text-center py-8">No saved lessons yet.</p>
                ) : (
                  toolHistory.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => handleHistorySelect(entry)}
                      className="w-full p-3 border-2 border-black text-left hover:bg-[#FAF7F2] shadow-[2px_2px_0px_#000] flex flex-col gap-1"
                    >
                      <span className="text-xs font-black">{entry.title}</span>
                      <span className="text-[11px] font-bold text-black/60 truncate">{entry.subtitle}</span>
                      <span className="text-[10px] text-black/40">
                        {new Date(entry.timestamp).toLocaleDateString()}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
