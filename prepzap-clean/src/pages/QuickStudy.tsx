import { useNavigate } from "react-router-dom";
import { SharedSidebar } from "@/components/SharedSidebar";
import { shareToStudyVault } from "@/lib/shareToVault";
import { fireConfetti } from "@/lib/confetti";
import React, { useState, useEffect, useRef } from "react";
import { callGroq } from "@/lib/groq";
import { onSourceChange, loadLibrary } from "@/lib/sourceContext";
import { useToolHistory } from "@/pages/ToolHistory";
import { usePlan } from "@/hooks/usePlan";
import { useStudySession } from "@/hooks/useStudySession";
import { useAuth } from "@/contexts/AuthContext";
import UpgradePrompt from "@/components/UpgradePrompt";
import { useTutorialModal } from "@/hooks/useTutorialModal";
import { TutorialModal } from "@/components/TutorialModal";
import { TUTORIAL_CONTENT } from "@/lib/tutorialContent";
import { useXp } from "@/lib/useXp";
import { playSuccess, playTap, playCelebration, playIncorrect } from "@/lib/soundFX";
import { AnimatedRex } from "@/components/AnimatedRex";

interface StudyPoint {
  label: string;
  value: string;
  question?: string;
  commonMistake?: string;
}

interface ExamTrap {
  trap: string;
  fix: string;
}

interface MnemonicItem {
  phrase: string;
  meaning: string;
}

interface SprintQuestion {
  statement: string;
  isTrue: boolean;
  explanation: string;
}

interface StudySheet {
  title: string;
  isNew: boolean;
  isFailure?: boolean;
  tags: string[];
  coverageScore: number;
  goals: string[];
  points: StudyPoint[];
  examTraps: ExamTrap[];
  mnemonics: MnemonicItem[];
  sprintQuestions: SprintQuestion[];
}

const SOFT_TRIM_LENGTH = 280;
const MAX_POINT_VALUE_LENGTH = 900;
const RAW_PASTE_THRESHOLD = 220;
const MAX_CHARS_PER_SOURCE = 5000;
const MAX_SOURCES = 5;

type CramViewMode = "cheat-sheet" | "rapid-sprint" | "pip-briefing";

export default function QuickStudy() {
  const tutorial = useTutorialModal("/quick-study");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { awardXp } = useXp();
  const { logSession } = useStudySession();
  const [libraryFiles, setLibraryFiles] = useState<any[]>(() => loadLibrary());
  const { save: saveHistory, history: deckHistory } = useToolHistory("quick-study");
  const { isPro, canUse, remaining, logUsage } = usePlan();

  // Mode toggles
  const [activeTab, setActiveTab] = useState<"Cram" | "HighYield">("Cram");
  const [viewMode, setViewMode] = useState<CramViewMode>("cheat-sheet");
  const [topic, setTopic] = useState("");
  const [generatedSheet, setGeneratedSheet] = useState<StudySheet | null>(null);
  const [loading, setLoading] = useState(false);
  const [remainingUses, setRemainingUses] = useState<number | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [copyFlash, setCopyFlash] = useState<"copy" | "share" | null>(null);
  const [vaultShared, setVaultShared] = useState(false);

  // Rapid Sprint Interactive State
  const [sprintIndex, setSprintIndex] = useState(0);
  const [sprintScore, setSprintScore] = useState(0);
  const [sprintStreak, setSprintStreak] = useState(0);
  const [sprintTimer, setSprintTimer] = useState(60);
  const [sprintActive, setSprintActive] = useState(false);
  const [sprintFinished, setSprintFinished] = useState(false);
  const [sprintLastFeedback, setSprintLastFeedback] = useState<{ isCorrect: boolean; text: string } | null>(null);
  const sprintIntervalRef = useRef<any>(null);

  // Pip Voice Briefing State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Sync source library
  useEffect(() => {
    const sync = () => setLibraryFiles(loadLibrary());
    sync();
    const unsub = onSourceChange(sync);
    window.addEventListener("focus", sync);
    return () => {
      unsub();
      window.removeEventListener("focus", sync);
    };
  }, []);

  useEffect(() => {
    remaining("quick_study").then(setRemainingUses).catch((err) => {
      console.error("[QuickStudy] failed to load remaining uses:", err);
    });
  }, [remaining]);

  // Clean up speech on unmount
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (sprintIntervalRef.current) {
        clearInterval(sprintIntervalRef.current);
      }
    };
  }, []);

  const chips = [
    "Key Terms & Definitions",
    "Compare & Contrast",
    "Cause & Effect",
    "Step-by-Step Process",
    "Formulas & Rules to Memorize",
    "Sneaky Exam Pitfalls",
  ];

  const buildAllSourcesContext = (files: any[]): string => {
    const usable = files.filter((f) => f.fullText || f.preview);
    if (usable.length === 0) return "";
    const parts = usable.slice(0, MAX_SOURCES).map((f) => {
      if (f.type === "image/jpeg" || f.type === "image/png") {
        return `=== SOURCE: ${f.name} ===\n[Camera capture image — text not available]`;
      }
      const raw = f.fullText || f.preview || "";
      const text = raw.length > MAX_CHARS_PER_SOURCE ? raw.slice(0, MAX_CHARS_PER_SOURCE) + "\n[…truncated]" : raw;
      return `=== SOURCE: ${f.name} ===\n${text}`;
    });
    if (parts.length === 0) return "";
    return `\n\n--- STUDY SOURCES (base your answer on this material) ---\n${parts.join("\n\n")}\n--- END SOURCES ---`;
  };

  const trimPointValue = (value: string): string => {
    if (value.length <= SOFT_TRIM_LENGTH) return value;
    const cut = value.slice(0, SOFT_TRIM_LENGTH);
    const lastStop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf(", "), cut.lastIndexOf(" "));
    return (lastStop > SOFT_TRIM_LENGTH * 0.5 ? cut.slice(0, lastStop) : cut).trim().replace(/[,.]?$/, "") + "…";
  };

  const handleGenerate = async () => {
    setGenError(null);
    const sourceContext = buildAllSourcesContext(libraryFiles);
    const trimmedTopic = topic.trim();
    const isRawPaste = trimmedTopic.length > RAW_PASTE_THRESHOLD;
    const shortTopic = isRawPaste ? "" : trimmedTopic;
    const rawPastedMaterial = isRawPaste ? trimmedTopic.slice(0, 6000) : "";

    if (!shortTopic && !sourceContext && !rawPastedMaterial) {
      setGenError("Enter a topic, paste your notes, or add a readable file to your Source Library first.");
      return;
    }

    const libraryNames = libraryFiles
      .map((f) => f.name?.replace(/\.[^.]+$/, "").replace(/-/g, " "))
      .filter(Boolean);
    const effectiveTopic =
      shortTopic ||
      (libraryNames.length > 0 ? libraryNames.join(" + ") : "") ||
      (isRawPaste ? "Pasted Study Notes" : "Study Material");

    if (!isPro) {
      try {
        const allowed = await canUse("quick_study");
        if (!allowed) {
          setShowUpgrade(true);
          return;
        }
      } catch (err) {
        console.error("[QuickStudy] canUse check failed:", err);
        setGenError("Couldn't verify your plan status just now — please try again in a moment.");
        return;
      }
    }

    setLoading(true);
    setGeneratedSheet(null);
    // Reset sprint & voice
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    setSprintActive(false);
    setSprintFinished(false);

    let result: StudySheet | null = null;
    let generationFailed = false;

    const buildPrompt = (retry: boolean) => `Generate an elite, high-yield academic study & cram cheat sheet for the topic: "${effectiveTopic}".
Mode: "${activeTab === "Cram" ? "Cram Session (Fast Core Cheat Sheet Facts, Traps, & Mnemonics)" : "High Yield Summary (Clinical context / Advanced correlation)"}"
${sourceContext ? `Incorporate source material detail (reference material to condense — never copy verbatim):\n${sourceContext}` : ""}
${rawPastedMaterial ? `Student notes to condense:\n${rawPastedMaterial}` : ""}

Return strictly a valid raw JSON object. Do not wrap in markdown tags or code blocks.
Required JSON schema:
{
  "title": "${effectiveTopic} (${activeTab === "Cram" ? "Cheat Sheet" : "High-Yield Guide"})",
  "tags": ["Subject", "Exam Key", "Cram"],
  "coverageScore": 85,
  "goals": [
    "Master the 4 core high-yield principles",
    "Identify 3 sneaky professor exam traps",
    "Lock in mnemonics for rapid recall"
  ],
  "points": [
    {
      "label": "Key Concept 1:",
      "value": "Concise fact with **bolded key terms** under 45 words.",
      "question": "Quick check test question?",
      "commonMistake": "What students mix up"
    },
    { "label": "Key Concept 2:", "value": "...", "question": "...", "commonMistake": "..." },
    { "label": "Key Concept 3:", "value": "...", "question": "...", "commonMistake": "..." },
    { "label": "Key Concept 4:", "value": "...", "question": "...", "commonMistake": "..." }
  ],
  "examTraps": [
    {
      "trap": "Common pitfall or distractor professors put on exams",
      "fix": "Clear 1-sentence distinction to avoid losing points"
    },
    { "trap": "...", "fix": "..." }
  ],
  "mnemonics": [
    {
      "phrase": "MEMORY ACRONYM OR PHRASE",
      "meaning": "What each letter or word represents for instant recall"
    }
  ],
  "sprintQuestions": [
    {
      "statement": "Direct testable statement.",
      "isTrue": true,
      "explanation": "Why this statement is factually true."
    },
    {
      "statement": "Plausible but false statement representing a common misconception.",
      "isTrue": false,
      "explanation": "Why this is false and what is actually correct."
    },
    { "statement": "...", "isTrue": true, "explanation": "..." },
    { "statement": "...", "isTrue": false, "explanation": "..." }
  ]
}

Rules:
- points: exactly 4 concrete, exam-tested high-yield points with **asterisk bolding** around key terminology.
- examTraps: 2-3 genuine traps or confusing nuances that cost students points on tests.
- mnemonics: 1-2 practical memory hooks or acronyms.
- sprintQuestions: 4-6 crisp True/False statements for a 60-second speed recall drill.
${retry ? "Previous response was malformed JSON. Return ONLY raw JSON." : ""}`;

    const systemPrompt =
      "You are an elite academic tutor producing concise, high-yield cram sheets with sneaky exam traps, memory mnemonics, and rapid-recall drills strictly in raw JSON format.";

    const attemptGenerate = async (retry: boolean): Promise<StudySheet> => {
      const aiResponse = await callGroq(
        [{ role: "user", content: buildPrompt(retry) }],
        systemPrompt,
        undefined,
        1800,
        "quick_study"
      );

      let sanitized = aiResponse.trim();
      if (sanitized.startsWith("```")) {
        sanitized = sanitized.replace(/^```(json)?/, "").replace(/```$/, "").trim();
      }

      let generated: any;
      try {
        generated = JSON.parse(sanitized);
      } catch {
        const match = sanitized.match(/\{[\s\S]*\}/);
        if (!match) throw new Error("No JSON object found in AI response");
        generated = JSON.parse(match[0]);
      }

      if (!generated?.title || !Array.isArray(generated.points) || generated.points.length < 3) {
        throw new Error("Invalid structure");
      }

      const cleanedPoints: StudyPoint[] = [];
      for (const p of generated.points) {
        if (typeof p?.label !== "string" || !p.label.trim() || typeof p?.value !== "string" || !p.value.trim()) {
          throw new Error("Malformed point");
        }
        if (p.value.length > MAX_POINT_VALUE_LENGTH) {
          throw new Error("Point far exceeds max length");
        }
        cleanedPoints.push({
          label: p.label.trim(),
          value: trimPointValue(p.value.trim()),
          question: typeof p?.question === "string" ? p.question.trim() : `What is the core principle of ${p.label}?`,
          commonMistake: typeof p?.commonMistake === "string" ? p.commonMistake.trim() : undefined,
        });
      }

      // Robust fallback generation for examTraps
      const cleanedTraps: ExamTrap[] = Array.isArray(generated.examTraps) && generated.examTraps.length > 0
        ? generated.examTraps.slice(0, 3).map((t: any) => ({
            trap: String(t.trap || "Confusing similar terms or mechanisms"),
            fix: String(t.fix || "Double-check definitions and directional signs on test questions"),
          }))
        : cleanedPoints.filter((p) => p.commonMistake).map((p) => ({
            trap: p.commonMistake || "Conflating key properties",
            fix: `Remember: ${p.value.replace(/\*\*/g, "").slice(0, 80)}`,
          }));

      // Robust fallback generation for mnemonics
      const cleanedMnemonics: MnemonicItem[] = Array.isArray(generated.mnemonics) && generated.mnemonics.length > 0
        ? generated.mnemonics.slice(0, 2).map((m: any) => ({
            phrase: String(m.phrase || "CORE-RECALL"),
            meaning: String(m.meaning || "Key sequence of operations to memorize"),
          }))
        : [
            {
              phrase: cleanedPoints[0]?.label.replace(/[^A-Za-z]/g, "").slice(0, 4).toUpperCase() || "KEY",
              meaning: "Anchor concept for this topic",
            },
          ];

      // Robust fallback generation for sprint questions
      const cleanedSprint: SprintQuestion[] = Array.isArray(generated.sprintQuestions) && generated.sprintQuestions.length >= 2
        ? generated.sprintQuestions.slice(0, 6).map((sq: any) => ({
            statement: String(sq.statement || ""),
            isTrue: Boolean(sq.isTrue),
            explanation: String(sq.explanation || "Review the key study points."),
          }))
        : cleanedPoints.map((p, idx) => ({
            statement: `${p.label} ${p.value.replace(/\*\*/g, "")}`,
            isTrue: idx % 2 === 0,
            explanation: p.value.replace(/\*\*/g, ""),
          }));

      return {
        title: generated.title,
        isNew: true,
        tags: Array.isArray(generated.tags) && generated.tags.length > 0 ? generated.tags : [activeTab === "Cram" ? "Cram Sheet" : "High-Yield"],
        coverageScore: typeof generated.coverageScore === "number" ? generated.coverageScore : 78,
        goals: Array.isArray(generated.goals) && generated.goals.length > 0
          ? generated.goals
          : ["Review core concepts", "Spot exam traps", "Lock in rapid recall"],
        points: cleanedPoints,
        examTraps: cleanedTraps.length > 0 ? cleanedTraps : [
          {
            trap: "Students frequently mix up the primary mechanism with its downstream outcome.",
            fix: "Keep the trigger step strictly separate from the final product.",
          },
        ],
        mnemonics: cleanedMnemonics,
        sprintQuestions: cleanedSprint,
      };
    };

    try {
      result = await attemptGenerate(false);
    } catch (firstErr: any) {
      console.warn("[QuickStudy] first generation attempt failed, retrying once:", firstErr);
      try {
        result = await attemptGenerate(true);
      } catch (secondErr) {
        console.error("[QuickStudy] generation failed twice:", secondErr);
        generationFailed = true;
        result = {
          title: `${effectiveTopic} — Generation Failed`,
          isNew: false,
          isFailure: true,
          tags: ["Retry Needed"],
          coverageScore: 0,
          goals: ["Tap Generate again to retry", "Try a shorter topic or clearer notes"],
          points: [
            {
              label: "Unable to generate study sheet:",
              value: `The AI wasn't able to produce notes for "${effectiveTopic}" just now. Please try again with a slightly narrower prompt.`,
            },
          ],
          examTraps: [],
          mnemonics: [],
          sprintQuestions: [],
        };
      }
    }

    if (result) {
      setGeneratedSheet(result);
      if (!generationFailed) {
        saveHistory({
          prompt: effectiveTopic,
          preview: result.points[0]?.value?.slice(0, 120) || "",
          output: JSON.stringify(result),
          model: "rex-ai",
          meta: `${activeTab} · ${result.tags.join(", ")}`,
        });

        if (user?.id) {
          await logSession({
            title: result.title || effectiveTopic,
            durationMinutes: 8,
          });
        }
      }
    }

    if (!isPro && !generationFailed) {
      try {
        await logUsage("quick_study");
      } catch {}
      remaining("quick_study").then(setRemainingUses).catch(() => {});
    }
    setLoading(false);
  };

  const handleSelectChip = (title: string) => {
    setTopic(title);
    setGeneratedSheet(null);
  };

  const handleRestoreHistory = (entry: any) => {
    setGenError(null);
    try {
      const restored = JSON.parse(entry.output);
      if (restored?.title && Array.isArray(restored.points)) {
        setGeneratedSheet({
          ...restored,
          isNew: false,
          isFailure: false,
          examTraps: restored.examTraps || [],
          mnemonics: restored.mnemonics || [],
          sprintQuestions: restored.sprintQuestions || [],
        });
        setTopic(entry.prompt || "");
        return;
      }
    } catch (err) {
      console.warn("[QuickStudy] couldn't restore history output:", err);
    }
    setTopic(entry.prompt || "");
    setGeneratedSheet(null);
  };

  // 1-Click Exports
  const handleExportFlashcards = () => {
    if (!generatedSheet) return;
    const deck = {
      title: generatedSheet.title,
      cards: generatedSheet.points.map((p) => ({
        front: p.question || p.label,
        back: p.label.replace(":", ""),
        explanation: p.commonMistake ? `${p.value}\n\nCommon mistake: ${p.commonMistake}` : p.value,
      })),
    };
    localStorage.setItem("qs_flashcards_export", JSON.stringify(deck));
    playSuccess();
    navigate("/flashcards");
  };

  const handleTestRecall = () => {
    if (!generatedSheet) return;
    const material =
      generatedSheet.title + "\n\n" + generatedSheet.points.map((p) => p.label + " " + p.value).join("\n\n");
    localStorage.setItem("qs_practice_export", JSON.stringify(material));
    playSuccess();
    navigate("/practice");
  };

  const handleShareToVault = () => {
    if (!generatedSheet) return;
    const sheetContent = `# ${generatedSheet.title}

> **Quick Study Guide** (${activeTab === "Cram" ? "Cram Review" : "High Yield"})

## Key Study Points
${generatedSheet.points
  .map(
    (pt) =>
      `### ${pt.label}\n${pt.value}${pt.question ? `\n\n*Quick Check*: ${pt.question}` : ""}${
        pt.commonMistake ? `\n\n*Common Mistake*: ${pt.commonMistake}` : ""
      }`
  )
  .join("\n\n")}

${
  generatedSheet.examTraps?.length
    ? `## Sneaky Exam Traps\n${generatedSheet.examTraps.map((t) => `- **Trap**: ${t.trap}\n  **Fix**: ${t.fix}`).join("\n")}`
    : ""
}

${
  generatedSheet.mnemonics?.length
    ? `## Mnemonics\n${generatedSheet.mnemonics.map((m) => `- **${m.phrase}**: ${m.meaning}`).join("\n")}`
    : ""
}
`.trim();

    shareToStudyVault({
      title: generatedSheet.title,
      topic: topic.trim() || generatedSheet.title,
      subject: "Quick Study",
      summary: generatedSheet.points[0]?.value?.slice(0, 160) || generatedSheet.title,
      content: sheetContent,
      key_points: generatedSheet.points.map((p) => p.label.replace(/:$/, "")),
      tags: ["quick-study", activeTab.toLowerCase()],
      author: "Quick Study Student",
      isAiGenerated: true,
    });

    setVaultShared(true);
    fireConfetti();
    playCelebration();
    setTimeout(() => setVaultShared(false), 3000);
  };

  const handleCopySheet = async () => {
    if (!generatedSheet) return;
    const text = `${generatedSheet.title}\n\n${generatedSheet.points
      .map((p) => `${p.label} ${p.value.replace(/\*\*/g, "")}${p.question ? `\nQ: ${p.question}` : ""}`)
      .join("\n\n")}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopyFlash("copy");
      playTap();
      setTimeout(() => setCopyFlash(null), 1500);
    } catch {
      setGenError("Couldn't copy to clipboard.");
    }
  };

  // ─── Rapid Sprint Functions ────────────────────────────────────────────────
  const startRapidSprint = () => {
    if (!generatedSheet || generatedSheet.sprintQuestions.length === 0) return;
    setSprintIndex(0);
    setSprintScore(0);
    setSprintStreak(0);
    setSprintTimer(60);
    setSprintActive(true);
    setSprintFinished(false);
    setSprintLastFeedback(null);
    playTap();

    if (sprintIntervalRef.current) clearInterval(sprintIntervalRef.current);
    sprintIntervalRef.current = setInterval(() => {
      setSprintTimer((prev) => {
        if (prev <= 1) {
          clearInterval(sprintIntervalRef.current);
          setSprintActive(false);
          setSprintFinished(true);
          playCelebration();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSprintAnswer = (userSaidTrue: boolean) => {
    if (!generatedSheet || !sprintActive) return;
    const currentQ = generatedSheet.sprintQuestions[sprintIndex];
    const isCorrect = userSaidTrue === currentQ.isTrue;

    if (isCorrect) {
      setSprintScore((s) => s + 1);
      const newStreak = sprintStreak + 1;
      setSprintStreak(newStreak);
      playSuccess();
      setSprintLastFeedback({ isCorrect: true, text: `Correct! ${currentQ.explanation}` });
    } else {
      setSprintStreak(0);
      playIncorrect();
      setSprintLastFeedback({ isCorrect: false, text: `Not quite. ${currentQ.explanation}` });
    }

    if (sprintIndex + 1 < generatedSheet.sprintQuestions.length) {
      setTimeout(() => {
        setSprintIndex((i) => i + 1);
        setSprintLastFeedback(null);
      }, 750);
    } else {
      clearInterval(sprintIntervalRef.current);
      setSprintActive(false);
      setSprintFinished(true);
      playCelebration();
      fireConfetti();
      awardXp(30, "practice_answer");
    }
  };

  // ─── Pip Voice Briefing ───────────────────────────────────────────────────
  const startPipBriefing = () => {
    if (!window.speechSynthesis || !generatedSheet) return;
    window.speechSynthesis.cancel();

    const scriptParts: string[] = [
      `Welcome to your rapid briefing for ${generatedSheet.title.replace(/\([^)]*\)/, "")}. Here are your core exam concepts.`,
      ...generatedSheet.points.map((p, idx) => `Point ${idx + 1}. ${p.label}. ${p.value.replace(/\*\*/g, "")}.`),
      ...(generatedSheet.examTraps?.length
        ? [`Now, watch out for these exam traps. ${generatedSheet.examTraps[0].trap}. Remember: ${generatedSheet.examTraps[0].fix}`]
        : []),
      "You are ready to crush this topic. Good luck!",
    ];

    const fullText = scriptParts.join(" ");
    const utterance = new SpeechSynthesisUtterance(fullText);
    utterance.rate = speechRate;
    utterance.pitch = 1.05;

    // Pick a natural voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find((v) => v.lang.startsWith("en") && (v.name.includes("Natural") || v.name.includes("Google")));
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      playCelebration();
    };

    speechRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const togglePauseSpeech = () => {
    if (!window.speechSynthesis) return;
    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    } else {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  };

  const stopPipBriefing = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  };

  return (
    <div className="w-full bg-[#FAF7F2] flex flex-col" style={{ minHeight: "100dvh" }}>
      <TutorialModal
        isOpen={tutorial.isOpen}
        onDismiss={tutorial.dismiss}
        features={TUTORIAL_CONTENT["/quick-study"] || []}
        title="Quick Study"
      />

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .qs-print-area, .qs-print-area * { visibility: visible !important; }
          .qs-print-area {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            box-shadow: none !important;
          }
          .qs-no-print { display: none !important; }
        }
      `}</style>

      {showUpgrade && (
        <UpgradePrompt feature="quick_study" remaining={remainingUses ?? 0} onClose={() => setShowUpgrade(false)} />
      )}

      <SharedSidebar active="/quick-study" />

      {/* Main Content Area */}
      <div className="md:ml-64 flex flex-col flex-1 pb-24 md:pb-8">
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-6 md:px-8 border-b-2 border-black bg-[#FAF7F2] shrink-0 z-30">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[24px]" style={{ textTransform: "none" }}>
              bolt
            </span>
            <span className="text-[20px] md:text-[22px] font-black tracking-tight uppercase">Quick Study Cram</span>
            <span className="hidden sm:inline-block px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-[#FFD13B] border-2 border-black shadow-[1px_1px_0px_#000]">
              Fast Cram Suite
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => tutorial.show()}
              className="flex items-center justify-center border-2 border-black bg-white hover:bg-black hover:text-white transition-colors shadow-[2px_2px_0px_#000] w-9 h-9 shrink-0 cursor-pointer"
              title="Help"
            >
              <span className="material-symbols-outlined text-[18px]" style={{ textTransform: "none" }}>
                help
              </span>
            </button>
            <div
              onClick={() => navigate("/profile")}
              className="w-9 h-9 border-2 border-black bg-[#ae2925] text-white flex items-center justify-center font-black text-[13px] cursor-pointer hover:opacity-90 shadow-[2px_2px_0px_#000]"
            >
              {user?.email?.charAt(0).toUpperCase() || "S"}
            </div>
          </div>
        </header>

        {/* Scrollable Container */}
        <div className="flex-1 px-4 md:px-8 py-6 max-w-6xl w-full mx-auto space-y-6">
          {/* Top Generator Card */}
          <div className="border-3 border-black bg-white shadow-[5px_5px_0px_#000] p-5 md:p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <div>
                <h3 className="text-[18px] md:text-[20px] font-black uppercase tracking-tight">Instant Cram Engine</h3>
                <p className="text-[12px] font-bold text-black/50">
                  Condenses complex textbooks, slides, and notes into high-yield cheat sheets, traps, and speed drills.
                </p>
              </div>
              <div className="flex border-2 border-black bg-[#F0EDE0]">
                {(["Cram", "HighYield"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveTab(tab);
                      setGeneratedSheet(null);
                    }}
                    className={`px-3 py-1.5 text-[11px] font-black uppercase tracking-wider transition-colors border-r-2 last:border-r-0 border-black cursor-pointer ${
                      activeTab === tab ? "bg-black text-white" : "bg-white text-black hover:bg-[#E2E2E2]"
                    }`}
                  >
                    {tab === "Cram" ? "Cram Facts" : "Deep Yield"}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Field */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-widest text-black/50 mb-2">
                Topic or Raw Lecture Notes
              </label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate();
                }}
                rows={3}
                className="w-full bg-[#F0EDE0] border-2 border-black px-4 py-3 text-[14px] md:text-[15px] font-medium placeholder:text-black/30 resize-none focus:outline-none shadow-[2px_2px_0px_#000]"
                placeholder="Enter a topic (e.g. 'Krebs Cycle & Cellular Respiration') or paste messy lecture notes..."
              />
            </div>

            {/* Focus Chips */}
            <div className="flex flex-wrap gap-2">
              {chips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectChip(chip)}
                  className={`px-3 py-1 border-2 border-black text-[11px] md:text-[12px] font-black transition-all cursor-pointer ${
                    topic === chip
                      ? "bg-black text-white shadow-[2px_2px_0px_#000] scale-95"
                      : "bg-white text-black hover:bg-[#F0EDE0]"
                  }`}
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Source Library Pill & Generate Action */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t-2 border-black/10">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-black/60" style={{ textTransform: "none" }}>
                  folder_open
                </span>
                <span className="text-[12px] font-bold text-black/60">
                  {libraryFiles.length > 0 ? `${libraryFiles.length} Source file(s) connected` : "No files connected"}
                </span>
                <button
                  onClick={() => navigate("/sources")}
                  className="text-[11px] font-black text-black underline hover:text-[#ae2925] cursor-pointer ml-1"
                >
                  Manage Sources
                </button>
              </div>

              <button
                onClick={handleGenerate}
                disabled={(!topic.trim() && libraryFiles.length === 0) || loading}
                className="px-6 py-3 bg-[#FFD13B] hover:bg-[#FFE566] text-black border-2 border-black font-black text-[13px] uppercase tracking-wider shadow-[3px_3px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]" style={{ textTransform: "none" }}>
                  {loading ? "autorenew" : "offline_bolt"}
                </span>
                <span>{loading ? "Synthesizing Cheat Sheet..." : "Generate High-Yield Sheet"}</span>
              </button>
            </div>

            {genError && <p className="text-[12px] font-black text-[#ae2925]">{genError}</p>}
          </div>

          {/* 3-Mode Cram View Switcher Bar (Only visible when sheet is generated) */}
          {generatedSheet && !generatedSheet.isFailure && (
            <div className="border-3 border-black bg-white shadow-[4px_4px_0px_#000] p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-black uppercase tracking-wider text-black/50 mr-1">Study Mode:</span>
                <div className="flex border-2 border-black overflow-hidden">
                  <button
                    onClick={() => {
                      setViewMode("cheat-sheet");
                      playTap();
                    }}
                    className={`px-3 md:px-4 py-1.5 text-[12px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer ${
                      viewMode === "cheat-sheet" ? "bg-black text-white" : "bg-white text-black hover:bg-[#F0EDE0]"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]" style={{ textTransform: "none" }}>
                      description
                    </span>
                    <span>Cheat Sheet</span>
                  </button>

                  <button
                    onClick={() => {
                      setViewMode("rapid-sprint");
                      playTap();
                      if (!sprintActive && !sprintFinished) startRapidSprint();
                    }}
                    className={`px-3 md:px-4 py-1.5 text-[12px] font-black uppercase tracking-wider flex items-center gap-1.5 border-l-2 border-black transition-colors cursor-pointer ${
                      viewMode === "rapid-sprint" ? "bg-[#FFD13B] text-black" : "bg-white text-black hover:bg-[#F0EDE0]"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]" style={{ textTransform: "none" }}>
                      timer
                    </span>
                    <span>60s Sprint</span>
                  </button>

                  <button
                    onClick={() => {
                      setViewMode("pip-briefing");
                      playTap();
                    }}
                    className={`px-3 md:px-4 py-1.5 text-[12px] font-black uppercase tracking-wider flex items-center gap-1.5 border-l-2 border-black transition-colors cursor-pointer ${
                      viewMode === "pip-briefing" ? "bg-[#80C4E9] text-black" : "bg-white text-black hover:bg-[#F0EDE0]"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]" style={{ textTransform: "none" }}>
                      volume_up
                    </span>
                    <span>Pip Audio</span>
                  </button>
                </div>
              </div>

              {/* 1-Click Action Export Bar */}
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <button
                  onClick={handleExportFlashcards}
                  className="px-3 py-1.5 bg-white hover:bg-[#F0EDE0] text-black border-2 border-black text-[11px] font-black uppercase tracking-wider shadow-[2px_2px_0px_#000] flex items-center gap-1.5 cursor-pointer"
                  title="Turn these points into flashcards"
                >
                  <span className="material-symbols-outlined text-[15px]" style={{ textTransform: "none" }}>
                    style
                  </span>
                  <span>Flashcards</span>
                </button>

                <button
                  onClick={handleTestRecall}
                  className="px-3 py-1.5 bg-white hover:bg-[#F0EDE0] text-black border-2 border-black text-[11px] font-black uppercase tracking-wider shadow-[2px_2px_0px_#000] flex items-center gap-1.5 cursor-pointer"
                  title="Test knowledge in Practice mode"
                >
                  <span className="material-symbols-outlined text-[15px]" style={{ textTransform: "none" }}>
                    quiz
                  </span>
                  <span>Take Quiz</span>
                </button>

                <button
                  onClick={handleShareToVault}
                  className="px-3 py-1.5 bg-[#4ADE80] hover:bg-[#22c55e] text-black border-2 border-black text-[11px] font-black uppercase tracking-wider shadow-[2px_2px_0px_#000] flex items-center gap-1.5 cursor-pointer"
                  title="Publish to Campus Vault"
                >
                  <span className="material-symbols-outlined text-[15px]" style={{ textTransform: "none" }}>
                    share
                  </span>
                  <span>{vaultShared ? "Saved!" : "Vault"}</span>
                </button>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="border-3 border-black bg-white flex flex-col items-center justify-center py-16 gap-4 shadow-[5px_5px_0px_#000]">
              <span className="material-symbols-outlined animate-spin text-[#E8534A] text-[40px]" style={{ textTransform: "none" }}>
                autorenew
              </span>
              <p className="text-[15px] font-black uppercase tracking-wider text-black">Synthesizing High-Yield Cram Notes...</p>
              <p className="text-[12px] font-bold text-black/40">Extracting must-know facts, sneaky exam traps, and recall drills.</p>
            </div>
          )}

          {/* Active Mode 1: High-Yield Cheat Sheet */}
          {generatedSheet && !loading && viewMode === "cheat-sheet" && (
            <div className="qs-print-area space-y-6">
              {/* Main Card */}
              <div className="border-3 border-black bg-white shadow-[5px_5px_0px_#000] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b-2 border-black bg-[#F0EDE0] flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-3 py-1 bg-black text-white text-[11px] font-black uppercase tracking-wider border-2 border-black">
                      High-Yield Cheat Sheet
                    </span>
                    {generatedSheet.tags.map((t, idx) => (
                      <span key={idx} className="px-2.5 py-0.5 bg-white text-black text-[11px] font-bold border-2 border-black">
                        {t}
                      </span>
                    ))}
                  </div>

                  <div className="qs-no-print flex items-center gap-2">
                    <button
                      onClick={handleCopySheet}
                      className="px-2.5 py-1 border-2 border-black bg-white hover:bg-[#E2E2E2] text-[11px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]" style={{ textTransform: "none" }}>
                        {copyFlash === "copy" ? "check" : "content_copy"}
                      </span>
                      <span>{copyFlash === "copy" ? "Copied" : "Copy"}</span>
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="px-2.5 py-1 border-2 border-black bg-white hover:bg-[#E2E2E2] text-[11px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]" style={{ textTransform: "none" }}>
                        print
                      </span>
                      <span>Print</span>
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                  <div>
                    <h2 className="text-[22px] md:text-[24px] font-black uppercase tracking-tight leading-tight">
                      {generatedSheet.title}
                    </h2>
                    <div className="flex items-center gap-3 mt-2 text-[12px] font-bold text-black/60">
                      <span>Coverage Rating: {generatedSheet.coverageScore}%</span>
                      <span>•</span>
                      <span>{generatedSheet.points.length} High-Yield Facts</span>
                    </div>
                  </div>

                  {/* 4 Core Points */}
                  <div className="space-y-4">
                    <h4 className="text-[12px] font-black uppercase tracking-widest text-black/50 border-b-2 border-black/10 pb-1">
                      Must-Know Core Concepts
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {generatedSheet.points.map((pt, idx) => (
                        <div
                          key={idx}
                          className="border-2 border-black bg-[#FAF7F2] p-4 flex flex-col justify-between shadow-[2px_2px_0px_#000]"
                        >
                          <div>
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="w-5 h-5 rounded-full bg-black text-white text-[11px] font-black flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <h5 className="font-black text-[14px] text-black">{pt.label.replace(/:$/, "")}</h5>
                            </div>
                            <p
                              className="text-[13.5px] leading-relaxed text-black/80 font-medium"
                              dangerouslySetInnerHTML={{
                                __html: pt.value.replace(/\*\*(.*?)\*\*/g, "<strong class='text-black font-extrabold'>$1</strong>"),
                              }}
                            />
                          </div>

                          {pt.commonMistake && (
                            <div className="mt-3 pt-2 border-t-2 border-black/10 flex items-start gap-1.5 text-[12px] text-[#ae2925] font-bold">
                              <span className="material-symbols-outlined text-[15px] shrink-0 mt-0.5" style={{ textTransform: "none" }}>
                                warning
                              </span>
                              <span>
                                <strong>Watch out: </strong>
                                {pt.commonMistake}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sneaky Exam Traps & Mnemonics Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    {/* Traps */}
                    <div className="border-2 border-black bg-[#FFEFEF] p-4 shadow-[3px_3px_0px_#000]">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="material-symbols-outlined text-[#ae2925] text-[20px]" style={{ textTransform: "none" }}>
                          gpp_bad
                        </span>
                        <h4 className="text-[13px] font-black uppercase tracking-wider text-[#ae2925]">
                          Sneaky Exam Traps (Professors Love These)
                        </h4>
                      </div>
                      <div className="space-y-3">
                        {generatedSheet.examTraps.map((trap, idx) => (
                          <div key={idx} className="border-2 border-black/30 bg-white p-3 text-[13px]">
                            <p className="font-extrabold text-black mb-1">⚠️ Trap: {trap.trap}</p>
                            <p className="font-semibold text-green-800">✓ Fix: {trap.fix}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Mnemonics */}
                    <div className="border-2 border-black bg-[#F0F7FF] p-4 shadow-[3px_3px_0px_#000]">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="material-symbols-outlined text-[#0284c7] text-[20px]" style={{ textTransform: "none" }}>
                          psychology
                        </span>
                        <h4 className="text-[13px] font-black uppercase tracking-wider text-[#0284c7]">
                          Memory Pegs &amp; Mnemonics
                        </h4>
                      </div>
                      <div className="space-y-3">
                        {generatedSheet.mnemonics.map((mn, idx) => (
                          <div key={idx} className="border-2 border-black/30 bg-white p-3 text-[13px]">
                            <p className="font-black text-[#0284c7] text-[14px] mb-1">🔑 {mn.phrase}</p>
                            <p className="font-medium text-black/80">{mn.meaning}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Active Mode 2: 60-Second Rapid Recall Sprint */}
          {generatedSheet && !loading && viewMode === "rapid-sprint" && (
            <div className="border-3 border-black bg-white shadow-[5px_5px_0px_#000] p-6 space-y-6">
              {/* Sprint Header */}
              <div className="flex items-center justify-between border-b-2 border-black pb-4 flex-wrap gap-2">
                <div>
                  <h3 className="text-[18px] md:text-[20px] font-black uppercase tracking-tight flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#FFD13B] text-[24px]" style={{ textTransform: "none" }}>
                      timer
                    </span>
                    60-Second Rapid Recall Drill
                  </h3>
                  <p className="text-[12px] font-bold text-black/50">
                    Fast True/False recognition under time pressure. Train speed and confidence.
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-black bg-[#F0EDE0] font-black text-[14px]">
                    <span className="material-symbols-outlined text-[18px]" style={{ textTransform: "none" }}>
                      hourglass_bottom
                    </span>
                    <span className={sprintTimer <= 10 ? "text-[#ae2925] animate-pulse" : "text-black"}>
                      {sprintTimer}s
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-black bg-[#FFD13B] font-black text-[14px]">
                    <span>Score: {sprintScore}</span>
                    {sprintStreak >= 2 && <span className="text-[11px] font-black text-black">🔥 {sprintStreak}x</span>}
                  </div>
                </div>
              </div>

              {/* Sprint Body */}
              {!sprintActive && !sprintFinished && (
                <div className="py-12 flex flex-col items-center justify-center text-center gap-4">
                  <span className="material-symbols-outlined text-[52px] text-[#FFD13B]" style={{ textTransform: "none" }}>
                    speed
                  </span>
                  <h4 className="text-[20px] font-black">Ready for the 60-Second Sprint?</h4>
                  <p className="text-[13px] font-bold text-black/60 max-w-md">
                    You'll see high-yield statements one by one. Tap TRUE or FALSE as fast as you can.
                  </p>
                  <button
                    onClick={startRapidSprint}
                    className="px-8 py-3 bg-[#FFD13B] hover:bg-[#FFE566] text-black border-2 border-black font-black text-[14px] uppercase tracking-wider shadow-[3px_3px_0px_#000] cursor-pointer"
                  >
                    Start 60s Sprint
                  </button>
                </div>
              )}

              {sprintActive && (
                <div className="space-y-6 py-4">
                  <div className="flex items-center justify-between text-[12px] font-black uppercase tracking-wider text-black/50">
                    <span>
                      Question {sprintIndex + 1} of {generatedSheet.sprintQuestions.length}
                    </span>
                    <span>Streak: {sprintStreak}</span>
                  </div>

                  {/* Question Box */}
                  <div className="border-3 border-black bg-[#FAF7F2] p-6 shadow-[4px_4px_0px_#000] min-h-[140px] flex items-center justify-center text-center">
                    <p className="text-[18px] md:text-[20px] font-black leading-snug text-black">
                      "{generatedSheet.sprintQuestions[sprintIndex]?.statement}"
                    </p>
                  </div>

                  {/* Feedback Message */}
                  {sprintLastFeedback && (
                    <div
                      className={`p-3 border-2 border-black text-center font-black text-[13px] ${
                        sprintLastFeedback.isCorrect ? "bg-[#4ADE80] text-black" : "bg-[#FCA5A5] text-[#7f1d1d]"
                      }`}
                    >
                      {sprintLastFeedback.text}
                    </div>
                  )}

                  {/* True / False Choice Buttons */}
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => handleSprintAnswer(true)}
                      className="py-4 bg-[#4ADE80] hover:bg-[#22c55e] text-black border-3 border-black font-black text-[16px] uppercase tracking-wider shadow-[3px_3px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[20px]" style={{ textTransform: "none" }}>
                        check
                      </span>
                      <span>TRUE</span>
                    </button>

                    <button
                      onClick={() => handleSprintAnswer(false)}
                      className="py-4 bg-[#F87171] hover:bg-[#ef4444] text-white border-3 border-black font-black text-[16px] uppercase tracking-wider shadow-[3px_3px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[20px]" style={{ textTransform: "none" }}>
                        close
                      </span>
                      <span>FALSE</span>
                    </button>
                  </div>
                </div>
              )}

              {sprintFinished && (
                <div className="py-8 flex flex-col items-center justify-center text-center gap-4">
                  <span className="material-symbols-outlined text-[56px] text-[#4ADE80]" style={{ textTransform: "none" }}>
                    military_tech
                  </span>
                  <h4 className="text-[22px] font-black uppercase">Sprint Complete!</h4>
                  <div className="border-2 border-black bg-[#FAF7F2] p-4 flex items-center gap-6 shadow-[3px_3px_0px_#000]">
                    <div>
                      <p className="text-[11px] font-black uppercase text-black/50">Score</p>
                      <p className="text-[24px] font-black text-black">
                        {sprintScore} / {generatedSheet.sprintQuestions.length}
                      </p>
                    </div>
                    <div className="w-px h-8 bg-black/20" />
                    <div>
                      <p className="text-[11px] font-black uppercase text-black/50">Accuracy</p>
                      <p className="text-[24px] font-black text-green-700">
                        {Math.round((sprintScore / (generatedSheet.sprintQuestions.length || 1)) * 100)}%
                      </p>
                    </div>
                    <div className="w-px h-8 bg-black/20" />
                    <div>
                      <p className="text-[11px] font-black uppercase text-black/50">XP Earned</p>
                      <p className="text-[24px] font-black text-[#FFD13B]">+30 XP</p>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-2">
                    <button
                      onClick={startRapidSprint}
                      className="px-5 py-2.5 bg-[#FFD13B] hover:bg-[#FFE566] text-black border-2 border-black font-black text-[13px] uppercase tracking-wider shadow-[2px_2px_0px_#000] cursor-pointer"
                    >
                      Retry Sprint
                    </button>
                    <button
                      onClick={() => setViewMode("cheat-sheet")}
                      className="px-5 py-2.5 bg-white hover:bg-[#F0EDE0] text-black border-2 border-black font-black text-[13px] uppercase tracking-wider shadow-[2px_2px_0px_#000] cursor-pointer"
                    >
                      Back to Cheat Sheet
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Active Mode 3: Pip Voice Briefing */}
          {generatedSheet && !loading && viewMode === "pip-briefing" && (
            <div className="border-3 border-black bg-white shadow-[5px_5px_0px_#000] p-6 space-y-6">
              <div className="flex items-center justify-between border-b-2 border-black pb-4 flex-wrap gap-2">
                <div>
                  <h3 className="text-[18px] md:text-[20px] font-black uppercase tracking-tight flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#80C4E9] text-[24px]" style={{ textTransform: "none" }}>
                      record_voice_over
                    </span>
                    Pip Audio Briefing
                  </h3>
                  <p className="text-[12px] font-bold text-black/50">
                    Listen to Pip narrate high-yield points while commuting or relaxing.
                  </p>
                </div>

                {/* Speed Controls */}
                <div className="flex items-center gap-2 border-2 border-black bg-[#F0EDE0] px-2 py-1">
                  <span className="text-[11px] font-black uppercase text-black/50">Speed:</span>
                  {[1.0, 1.25, 1.5].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => setSpeechRate(rate)}
                      className={`px-2 py-0.5 text-[11px] font-black border border-black cursor-pointer ${
                        speechRate === rate ? "bg-black text-white" : "bg-white text-black hover:bg-[#E2E2E2]"
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Player Canvas */}
              <div className="border-3 border-black bg-[#FAF7F2] p-8 flex flex-col items-center justify-center text-center gap-5 shadow-[4px_4px_0px_#000]">
                {/* Mascot / Pip Animation */}
                <div className="relative">
                  <div
                    className={`w-28 h-28 border-3 border-black rounded-full bg-[#80C4E9] flex items-center justify-center shadow-[3px_3px_0px_#000] ${
                      isSpeaking && !isPaused ? "animate-bounce" : ""
                    }`}
                  >
                    <AnimatedRex mood={isSpeaking && !isPaused ? "explaining" : "idle"} size="sm" />
                  </div>
                  {isSpeaking && !isPaused && (
                    <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-[#FFD13B] text-black font-black text-[10px] uppercase border border-black animate-pulse">
                      Playing
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="text-[18px] font-black uppercase">{generatedSheet.title}</h4>
                  <p className="text-[12px] font-bold text-black/50 mt-1">
                    {isSpeaking
                      ? isPaused
                        ? "Audio Paused"
                        : "Pip is narrating core facts..."
                      : "Tap Play to begin your audio review"}
                  </p>
                </div>

                {/* Play Controls */}
                <div className="flex items-center gap-3">
                  {!isSpeaking ? (
                    <button
                      onClick={startPipBriefing}
                      className="px-6 py-3 bg-[#80C4E9] hover:bg-[#60b3df] text-black border-2 border-black font-black text-[14px] uppercase tracking-wider shadow-[3px_3px_0px_#000] flex items-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[20px]" style={{ textTransform: "none" }}>
                        play_arrow
                      </span>
                      <span>Play Briefing</span>
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={togglePauseSpeech}
                        className="px-5 py-2.5 bg-white hover:bg-[#E2E2E2] text-black border-2 border-black font-black text-[13px] uppercase tracking-wider shadow-[2px_2px_0px_#000] flex items-center gap-1.5 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]" style={{ textTransform: "none" }}>
                          {isPaused ? "play_arrow" : "pause"}
                        </span>
                        <span>{isPaused ? "Resume" : "Pause"}</span>
                      </button>

                      <button
                        onClick={stopPipBriefing}
                        className="px-5 py-2.5 bg-[#F87171] hover:bg-[#ef4444] text-white border-2 border-black font-black text-[13px] uppercase tracking-wider shadow-[2px_2px_0px_#000] flex items-center gap-1.5 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]" style={{ textTransform: "none" }}>
                          stop
                        </span>
                        <span>Stop</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Empty Prompt State when no sheet is active */}
          {!generatedSheet && !loading && (
            <div className="border-3 border-dashed border-black/30 bg-white p-12 text-center flex flex-col items-center justify-center gap-3">
              <span className="material-symbols-outlined text-[48px] text-black/30" style={{ textTransform: "none" }}>
                auto_awesome
              </span>
              <h4 className="text-[18px] font-black uppercase text-black/50">Ready to Cram</h4>
              <p className="text-[13px] font-bold text-black/40 max-w-md">
                Enter your topic above and hit <strong>Generate High-Yield Sheet</strong> to unlock the 3-mode cram suite:
                Cheat Sheet, 60s Speed Sprint, and Pip Audio Briefing.
              </p>
            </div>
          )}

          {/* Study History Panel */}
          {deckHistory && deckHistory.length > 0 && (
            <div className="border-3 border-black bg-white shadow-[4px_4px_0px_#000] p-5">
              <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
                <h4 className="text-[12px] font-black uppercase tracking-widest text-black/50">Recent Cram Sessions</h4>
                <button
                  onClick={() => navigate("/analytics")}
                  className="text-[11px] font-extrabold text-black underline hover:text-[#ae2925] cursor-pointer"
                >
                  View All History
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {(deckHistory as any[]).slice(0, 4).map((entry, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleRestoreHistory(entry)}
                    className="border-2 border-black bg-[#FAF7F2] hover:bg-[#F0EDE0] p-3 text-left transition-colors cursor-pointer shadow-[2px_2px_0px_#000] flex flex-col justify-between"
                  >
                    <div>
                      <p className="font-black text-[13px] truncate text-black">{entry.prompt || "Study Session"}</p>
                      <p className="text-[10px] font-bold text-black/40 uppercase mt-0.5 truncate">{entry.meta || "Cram"}</p>
                    </div>
                    <span className="text-[10px] font-black text-black/60 mt-2 flex items-center gap-1">
                      <span>Restore</span>
                      <span className="material-symbols-outlined text-[12px]" style={{ textTransform: "none" }}>
                        arrow_forward
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
