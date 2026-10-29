import { useNavigate } from "react-router-dom";
import { SharedSidebar } from "@/components/SharedSidebar";
import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { callGroq, safeParseJSON } from "@/lib/groq";
import { usePlan } from "@/hooks/usePlan";
import UpgradePrompt, { SoftWarning } from "@/components/UpgradePrompt";
import { useTutorialModal } from "@/hooks/useTutorialModal";
import { TutorialModal } from "@/components/TutorialModal";
import { TUTORIAL_CONTENT } from "@/lib/tutorialContent";
import {
  type MistakeItem,
  getMistakesKey,
  loadMistakes,
  saveMistakes,
  recordMistake,
  markMistakeMastered,
  deleteMistake,
  getMistakeStats,
} from "@/lib/mistakes";
import { useXp } from "@/lib/useXp";
import { playSuccess, playTap, playCelebration, playIncorrect, playPop } from "@/lib/soundFX";
import { fireConfetti } from "@/lib/confetti";
import { Mascot } from "@/components/Mascot";

function getConceptKey(title: string): string {
  const colonIndex = title.indexOf(":");
  if (colonIndex > 3 && colonIndex < 35) {
    return title.slice(0, colonIndex).trim();
  }
  const dashIndex = title.indexOf(" - ");
  if (dashIndex > 3 && dashIndex < 35) {
    return title.slice(0, dashIndex).trim();
  }
  const words = title.split(/\s+/);
  if (words.length <= 4) {
    return title.trim();
  }
  return words.slice(0, 3).join(" ");
}

interface MistakeCardProps {
  item: MistakeItem;
  activeQuizId: number | string | null;
  selectedQuizOption: number | null;
  quizFeedback: string | null;
  loadingQuizId: number | string | null;
  onDelete: (id: number | string) => void;
  onMarkMastered: (id: number | string) => void;
  onStartQuiz: (item: MistakeItem) => void;
  onSubmitQuiz: (item: MistakeItem) => void;
  onSelectOption: (idx: number) => void;
  onCloseQuiz: () => void;
}

function MistakeCard({
  item,
  activeQuizId,
  selectedQuizOption,
  quizFeedback,
  loadingQuizId,
  onDelete,
  onMarkMastered,
  onStartQuiz,
  onSubmitQuiz,
  onSelectOption,
  onCloseQuiz,
}: MistakeCardProps) {
  const isCardQuizActive = activeQuizId === item.id;

  return (
    <article
      className={`bg-white border-3 border-black flex flex-col justify-between overflow-hidden transition-all shadow-[4px_4px_0px_#000] ${
        item.resolved ? "opacity-75 bg-[#FAF7F2]" : ""
      }`}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b-2 border-black bg-[#F0EDE0]">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="bg-black text-white px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest border border-black">
            {item.subject}
          </span>

          {item.errorType && (
            <span className="bg-white text-black px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border border-black">
              {item.errorType}
            </span>
          )}

          {item.source && (
            <span className="text-[10px] font-extrabold uppercase text-black/50 tracking-wider">
              via {item.source}
            </span>
          )}

          {item.resolved ? (
            <span className="ml-auto text-green-700 font-black text-[11px] uppercase tracking-wider flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]" style={{ textTransform: "none" }}>
                check_circle
              </span>
              Mastered
            </span>
          ) : (
            <span className="ml-auto text-[#ae2925] font-black text-[11px] uppercase tracking-wider flex items-center gap-1">
              <span className="text-[10px]">●</span> Needs Review
            </span>
          )}
        </div>

        <div className="flex justify-between items-start gap-3">
          <h3 className="font-black text-[15px] md:text-[16px] leading-tight text-black">{item.title}</h3>
          <button
            onClick={() => onDelete(item.id)}
            title="Delete entry"
            className="text-black/30 hover:text-[#ae2925] transition-colors p-1 cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]" style={{ textTransform: "none" }}>
              delete
            </span>
          </button>
        </div>
      </div>

      {/* Body */}
      {isCardQuizActive ? (
        <div className="p-5 flex-1 flex flex-col gap-3 bg-[#FAF7F2]">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#0284c7]">
            Diagnostic Quick Check
          </span>
          <p className="font-black text-[14px] leading-snug">{item.quiz?.q || item.title}</p>

          {item.quiz?.options && (
            <div className="flex flex-col gap-2 my-2">
              {item.quiz.options.map((opt, oIdx) => (
                <button
                  key={oIdx}
                  onClick={() => onSelectOption(oIdx)}
                  className={`text-left p-2.5 border-2 text-[12.5px] font-bold transition-all cursor-pointer ${
                    selectedQuizOption === oIdx
                      ? "bg-black text-white border-black"
                      : "bg-white text-black border-black/30 hover:border-black"
                  }`}
                >
                  <span className="font-black mr-1.5">{["A", "B", "C", "D"][oIdx]}.</span>
                  {opt}
                </button>
              ))}
            </div>
          )}

          {quizFeedback && (
            <div
              className={`p-2.5 border-2 text-[12px] font-bold ${
                quizFeedback.startsWith("✓")
                  ? "bg-green-50 border-green-500 text-green-900"
                  : "bg-red-50 border-red-400 text-red-900"
              }`}
            >
              {quizFeedback}
            </div>
          )}

          <div className="flex items-center justify-between mt-2 pt-2 border-t-2 border-black/10">
            <button
              onClick={onCloseQuiz}
              className="text-black/50 hover:text-black text-[11px] font-bold underline cursor-pointer"
            >
              Cancel
            </button>
            <button
              disabled={selectedQuizOption === null}
              onClick={() => onSubmitQuiz(item)}
              className="px-4 py-1.5 bg-black hover:bg-black/80 text-white border-2 border-black text-[11px] font-black uppercase tracking-wider cursor-pointer disabled:opacity-40"
            >
              Check Answer
            </button>
          </div>
        </div>
      ) : (
        <div className="p-5 flex-1 flex flex-col justify-between gap-3">
          <div>
            <p className="text-[13.5px] text-black/80 font-medium leading-relaxed">{item.desc}</p>
            {item.note && (
              <div className="mt-3 bg-[#FAF7F2] border-2 border-black/20 p-2.5 text-[12px] font-medium text-black/70 italic">
                {item.note}
              </div>
            )}
          </div>

          <div className="text-[11px] font-bold text-black/40 flex items-center justify-between pt-2 border-t border-black/10">
            <span>Logged: {item.date}</span>
            {item.masteredAt && <span className="text-green-700">✓ Mastered</span>}
          </div>
        </div>
      )}

      {/* Footer CTA */}
      {!isCardQuizActive && (
        <div className="border-t-2 border-black flex bg-white">
          {!item.resolved ? (
            <>
              <button
                onClick={() => onMarkMastered(item.id)}
                className="px-3.5 py-2.5 border-r-2 border-black text-black/60 hover:text-green-700 hover:bg-green-50 font-black text-[12px] flex items-center gap-1 cursor-pointer transition-colors"
                title="Mark as Mastered (+25 XP)"
              >
                <span className="material-symbols-outlined text-[16px]" style={{ textTransform: "none" }}>
                  check_circle
                </span>
                <span className="hidden sm:inline">Mastered</span>
              </button>

              <button
                onClick={() => onStartQuiz(item)}
                disabled={loadingQuizId === item.id}
                className="flex-1 py-2.5 bg-[#FFD13B] hover:bg-[#FFE566] text-black font-black text-[12px] uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                {loadingQuizId === item.id ? (
                  <span className="material-symbols-outlined text-[16px] animate-spin" style={{ textTransform: "none" }}>
                    autorenew
                  </span>
                ) : (
                  <span className="material-symbols-outlined text-[16px]" style={{ textTransform: "none" }}>
                    quiz
                  </span>
                )}
                <span>{loadingQuizId === item.id ? "Preparing..." : "Quick Retest"}</span>
              </button>
            </>
          ) : (
            <div className="w-full py-2.5 bg-[#F0EDE0] text-center text-green-800 font-black text-[12px] uppercase tracking-wider flex items-center justify-center gap-1">
              <span className="material-symbols-outlined text-[16px]" style={{ textTransform: "none" }}>
                verified
              </span>
              <span>Concept Mastered (+25 XP)</span>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export default function MistakeJournal() {
  const tutorial = useTutorialModal("/mistakes");
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const { awardXp } = useXp();
  const { isPro, canUse, remaining, logUsage } = usePlan();

  const [activeSubject, setActiveSubject] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeQuizId, setActiveQuizId] = useState<number | string | null>(null);
  const [selectedQuizOption, setSelectedOption] = useState<number | null>(null);
  const [quizFeedback, setQuizFeedback] = useState<string | null>(null);
  const [loadingQuizId, setLoadingQuizId] = useState<number | string | null>(null);
  const [mistakes, setMistakes] = useState<MistakeItem[]>([]);
  const [newEntryOpen, setNewEntryOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSubject, setNewSubject] = useState("Biology");
  const [newErrorType, setNewErrorType] = useState<"Conceptual Gap" | "Calculation Slip" | "Terminology Mix-up" | "Exam Trap">("Conceptual Gap");
  const [newDesc, setNewDesc] = useState("");

  // Adaptive Clinic / Retest Session Modal
  const [retestModalOpen, setRetestModalOpen] = useState(false);
  const [retestQueue, setRetestQueue] = useState<MistakeItem[]>([]);
  const [retestCurrentIndex, setRetestCurrentIndex] = useState(0);
  const [retestSelectedOption, setRetestSelectedOption] = useState<number | null>(null);
  const [retestFeedback, setRetestFeedback] = useState<string | null>(null);
  const [retestXpEarned, setRetestXpEarned] = useState(0);
  const [retestComplete, setRetestComplete] = useState(false);
  const [isGeneratingRetest, setIsGeneratingRetest] = useState(false);

  const [remainingUses, setRemainingUses] = useState<number | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const loadData = () => {
    const list = loadMistakes(user?.id);
    setMistakes(list);
  };

  useEffect(() => {
    remaining("mistake_journal").then(setRemainingUses).catch(() => {});
  }, [remaining]);

  useEffect(() => {
    loadData();
    const handleStorage = () => loadData();
    window.addEventListener("studenius_mistakes_updated", handleStorage);
    window.addEventListener("focus", handleStorage);
    return () => {
      window.removeEventListener("studenius_mistakes_updated", handleStorage);
      window.removeEventListener("focus", handleStorage);
    };
  }, [user?.id]);

  const stats = getMistakeStats(mistakes);
  const subjects = ["All", "Biology", "Physics", "Mathematics", "Chemistry", "History", "General"];

  const [viewTab, setViewTab] = useState<"active" | "mastered">("active");
  const [groupByConcept, setGroupByConcept] = useState(true);

  const filteredMistakes = useMemo(() => {
    return mistakes.filter((m) => {
      const matchTab = viewTab === "active" ? !m.resolved : m.resolved;
      const matchSubject = activeSubject === "All" || m.subject.toLowerCase() === activeSubject.toLowerCase();
      const matchSearch =
        !searchQuery ||
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.desc.toLowerCase().includes(searchQuery.toLowerCase());
      return matchTab && matchSubject && matchSearch;
    });
  }, [mistakes, viewTab, activeSubject, searchQuery]);

  // Concept-level clustering
  const conceptClusters = useMemo(() => {
    const map: Record<string, { concept: string; subject: string; items: MistakeItem[]; errorTypes: Set<string> }> = {};
    filteredMistakes.forEach((item) => {
      const concept = getConceptKey(item.title);
      const key = `${item.subject}::${concept.toLowerCase()}`;
      if (!map[key]) {
        map[key] = { concept, subject: item.subject, items: [], errorTypes: new Set() };
      }
      map[key].items.push(item);
      if (item.errorType) map[key].errorTypes.add(item.errorType);
    });
    return Object.values(map).sort((a, b) => b.items.length - a.items.length);
  }, [filteredMistakes]);

  const handleStartQuiz = async (item: MistakeItem) => {
    if (item.quiz && item.quiz.options?.length) {
      setActiveQuizId(item.id);
      setSelectedOption(null);
      setQuizFeedback(null);
      return;
    }

    setLoadingQuizId(item.id);
    setActiveQuizId(null);
    setSelectedOption(null);
    setQuizFeedback(null);

    try {
      const promptText = `Generate a high-yield 4-choice multiple-choice test question to check mastery of this misconception:
Title: "${item.title}"
Context / Detail: "${item.desc}"
Subject: "${item.subject}"

Return strictly raw JSON format without markdown fences:
{
  "q": "Clear retrieval question...",
  "options": ["Plausible distractor", "Correct concept", "Another distractor", "Third distractor"],
  "correct": 1,
  "explanation": "Brief explanation of why this answer is correct."
}`;

      const aiResponse = await callGroq(
        [{ role: "user", content: promptText }],
        "You are an academic exam tutor returning raw JSON practice questions.",
        undefined,
        800,
        "practice"
      );

      const parsed = safeParseJSON<any>(aiResponse);
      if (parsed && parsed.q && Array.isArray(parsed.options) && typeof parsed.correct === "number") {
        const updated = mistakes.map((m) => (m.id === item.id ? { ...m, quiz: parsed } : m));
        setMistakes(updated);
        saveMistakes(user?.id, updated);
        setActiveQuizId(item.id);
      } else {
        throw new Error("Invalid question structure");
      }
    } catch {
      // Clean fallback quiz
      const fallback = {
        q: `What is the key takeaway to remember regarding: "${item.title}"?`,
        options: [
          item.desc.slice(0, 50) + "...",
          "Review the foundational rule in your study materials",
          "This misconception applies only to edge cases",
          "The question statement is already fully correct",
        ],
        correct: 1,
        explanation: "Always review core definitions to eliminate repeat slips.",
      };
      const updated = mistakes.map((m) => (m.id === item.id ? { ...m, quiz: fallback } : m));
      setMistakes(updated);
      saveMistakes(user?.id, updated);
      setActiveQuizId(item.id);
    } finally {
      setLoadingQuizId(null);
    }
  };

  const handleSubmitQuiz = (item: MistakeItem) => {
    if (selectedQuizOption === null || !item.quiz) return;
    if (selectedQuizOption === item.quiz.correct) {
      setQuizFeedback("✓ Correct! Concept mastered (+25 XP)");
      playSuccess();
      fireConfetti();
      awardXp(25, "practice_answer");

      setTimeout(() => {
        const updated = markMistakeMastered(user?.id, item.id);
        setMistakes(updated);
        setActiveQuizId(null);
        setSelectedOption(null);
        setQuizFeedback(null);
      }, 1500);
    } else {
      setQuizFeedback("✗ Not quite. Explanation: " + (item.quiz.explanation || "Review the key distinction."));
      playIncorrect();
    }
  };

  const handleMarkMasteredDirect = (id: string | number) => {
    const updated = markMistakeMastered(user?.id, id);
    setMistakes(updated);
    playSuccess();
    fireConfetti();
    awardXp(25, "practice_answer");
  };

  const handleDelete = (id: string | number) => {
    const updated = deleteMistake(user?.id, id);
    setMistakes(updated);
    playTap();
  };

  const handleAddNewMistake = async () => {
    if (!newTitle.trim()) return;

    if (!isPro) {
      const allowed = await canUse("mistake_journal");
      if (!allowed) {
        setNewEntryOpen(false);
        setShowUpgrade(true);
        return;
      }
    }

    recordMistake({
      userId: user?.id,
      title: newTitle.trim(),
      subject: newSubject,
      errorType: newErrorType,
      desc: newDesc.trim() || "Review this concept.",
      source: "manual",
    });

    loadData();
    setNewTitle("");
    setNewDesc("");
    setNewEntryOpen(false);
    playSuccess();

    if (!isPro) {
      try {
        await logUsage("mistake_journal");
      } catch {}
      remaining("mistake_journal").then(setRemainingUses).catch(() => {});
    }
  };

  // Launch Targeted Drill (from global button or concept cluster)
  const launchDrillWithItems = async (items: MistakeItem[]) => {
    const unmastered = items.filter((m) => !m.resolved);
    const targetList = unmastered.length > 0 ? unmastered : items;
    if (targetList.length === 0) return;

    setIsGeneratingRetest(true);
    playTap();

    // Pick up to 5 items
    const batch = targetList.slice(0, 5);

    // Ensure all items in the batch have a valid quiz
    const preparedBatch = await Promise.all(
      batch.map(async (item) => {
        if (item.quiz && item.quiz.options?.length) return item;
        try {
          const promptText = `Generate a high-yield 4-choice question testing: "${item.title}". Context: "${item.desc}". Return raw JSON: {"q":"...","options":["A","B","C","D"],"correct":1,"explanation":"..."}`;
          const aiResponse = await callGroq(
            [{ role: "user", content: promptText }],
            "Return raw JSON quiz questions only.",
            undefined,
            600,
            "practice"
          );
          const parsed = safeParseJSON<any>(aiResponse);
          if (parsed && parsed.q && Array.isArray(parsed.options)) {
            return { ...item, quiz: parsed };
          }
        } catch {}
        return {
          ...item,
          quiz: {
            q: `How do you resolve this common slip: "${item.title}"?`,
            options: [
              item.desc.slice(0, 45) + "...",
              "Apply the standard formula and verify the definition",
              "Disregard standard terminology conventions",
              "This concept cannot be verified",
            ],
            correct: 1,
            explanation: "Reviewing fundamental principles prevents recurring errors.",
          },
        };
      })
    );

    setRetestQueue(preparedBatch);
    setRetestCurrentIndex(0);
    setRetestSelectedOption(null);
    setRetestFeedback(null);
    setRetestXpEarned(0);
    setRetestComplete(false);
    setIsGeneratingRetest(false);
    setRetestModalOpen(true);
  };

  const startRetestClinic = async () => {
    const unmastered = mistakes.filter((m) => !m.resolved);
    await launchDrillWithItems(unmastered);
  };

  const handleRetestSubmit = () => {
    if (retestSelectedOption === null) return;
    const currentItem = retestQueue[retestCurrentIndex];
    if (!currentItem.quiz) return;

    if (retestSelectedOption === currentItem.quiz.correct) {
      setRetestFeedback("✓ Correct! Weak spot resolved.");
      playSuccess();
      fireConfetti();
      awardXp(25, "practice_answer");
      setRetestXpEarned((prev) => prev + 25);
      markMistakeMastered(user?.id, currentItem.id);

      setTimeout(() => {
        if (retestCurrentIndex + 1 < retestQueue.length) {
          setRetestCurrentIndex((i) => i + 1);
          setRetestSelectedOption(null);
          setRetestFeedback(null);
        } else {
          setRetestComplete(true);
          playCelebration();
          loadData();
        }
      }, 1200);
    } else {
      setRetestFeedback("✗ Incorrect. " + (currentItem.quiz.explanation || "Review the key concept."));
      playIncorrect();
    }
  };

  return (
    <div className="w-full bg-[#FAF7F2] flex flex-col" style={{ minHeight: "100dvh" }}>
      <TutorialModal
        isOpen={tutorial.isOpen}
        onDismiss={tutorial.dismiss}
        features={TUTORIAL_CONTENT["/mistakes"] || []}
        title="Mistake Journal"
      />

      <SharedSidebar active="/mistakes" />

      {showUpgrade && (
        <UpgradePrompt feature="mistake_journal" remaining={remainingUses ?? 0} onClose={() => setShowUpgrade(false)} />
      )}

      {/* Main Layout Area */}
      <div className="md:ml-64 flex flex-col flex-1 pb-24 md:pb-8">
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-6 md:px-8 border-b-2 border-black bg-[#FAF7F2] shrink-0 z-30">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[24px]" style={{ textTransform: "none" }}>
              menu_book
            </span>
            <span className="text-[20px] md:text-[22px] font-black tracking-tight uppercase">Mistake Journal</span>
            <span className="hidden sm:inline-block px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-[#FFD13B] border-2 border-black shadow-[1px_1px_0px_#000]">
              Weak Spot Clinic
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
              {profile?.display_name?.charAt(0)?.toUpperCase() ?? "S"}
            </div>
          </div>
        </header>

        {/* Scrollable Container */}
        <div className="flex-1 px-4 md:px-8 py-6 max-w-6xl w-full mx-auto space-y-6">
          {/* Diagnostic Hub Hero Banner */}
          <div className="border-3 border-black bg-white shadow-[5px_5px_0px_#000] p-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-black text-white text-[11px] font-black uppercase tracking-wider">
                  Diagnostic Overview
                </span>
                <span className="text-[12px] font-bold text-black/50">
                  {stats.toReview} active weak spots to review
                </span>
              </div>
              <h2 className="text-[22px] md:text-[26px] font-black uppercase tracking-tight leading-tight">
                Master Your Weak Areas
              </h2>
              <p className="text-[13px] font-bold text-black/60 max-w-xl">
                Every question missed in Practice or Arena battles automatically lands here. Test your understanding
                with targeted practice to master each concept.
              </p>

              {/* Error Pattern Pills */}
              <div className="flex items-center gap-2 flex-wrap pt-2">
                {Object.entries(stats.errorTypeCounts).map(([type, count]) => (
                  <span
                    key={type}
                    className="px-2.5 py-1 bg-[#FAF7F2] border-2 border-black text-[11px] font-extrabold text-black"
                  >
                    {type}: <strong>{count}</strong>
                  </span>
                ))}
              </div>
            </div>

            {/* Actions & Mastery Stats */}
            <div className="flex flex-col sm:flex-row md:flex-col items-stretch md:items-end justify-between gap-3 shrink-0">
              <div className="border-2 border-black bg-[#F0EDE0] p-3 text-center min-w-[180px] shadow-[2px_2px_0px_#000]">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-[28px] font-black text-green-700 leading-none">{stats.masteryRate}%</span>
                  <span className="text-[12px] font-bold text-black/50">Mastery Rate</span>
                </div>
                <div className="h-2 w-full bg-white border border-black overflow-hidden mt-1.5">
                  <div className="h-full bg-green-600 transition-all" style={{ width: `${stats.masteryRate}%` }} />
                </div>
              </div>

              {/* Main Primary Action Button (No hospital emoji, strictly clean student wording) */}
              <button
                onClick={startRetestClinic}
                disabled={stats.toReview === 0 || isGeneratingRetest}
                className="px-6 py-3.5 bg-[#FFD13B] hover:bg-[#FFE566] text-black border-2 border-black font-black text-[13px] uppercase tracking-wider shadow-[3px_3px_0px_#000] active:scale-[0.98] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]" style={{ textTransform: "none" }}>
                  {isGeneratingRetest ? "autorenew" : "bolt"}
                </span>
                <span>
                  {isGeneratingRetest
                    ? "Building Error Drill..."
                    : `Start Error Drill (${Math.min(stats.toReview, 5)} Qs)`}
                </span>
              </button>

              <button
                onClick={() => setNewEntryOpen(true)}
                className="px-4 py-2 bg-white hover:bg-[#F0EDE0] text-black border-2 border-black font-black text-[12px] uppercase tracking-wider shadow-[2px_2px_0px_#000] flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]" style={{ textTransform: "none" }}>
                  add
                </span>
                <span>Add Note</span>
              </button>
            </div>
          </div>

          {/* ── Rex Study Coach Commentary ── */}
          <div className="bg-[#FFFDF9] border-3 border-black rounded-3xl p-4 md:p-5 shadow-[4px_4px_0px_#000] flex items-center gap-4">
            <div className="w-14 h-14 md:w-16 md:h-16 shrink-0 flex items-center justify-center">
              <Mascot mood={stats.toReview === 0 ? "celebrate" : "encouraging"} size="xs" animate />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 bg-[#FFD13B] border border-black rounded text-[10px] font-black uppercase tracking-wider text-black">
                  Rex's Growth Coach
                </span>
                <span className="text-[11px] font-bold text-black/50">Error Reframing</span>
              </div>
              <p className="text-[13px] md:text-[14px] font-extrabold text-black leading-snug">
                {stats.toReview === 0
                  ? "Flawless record! All tracked weak spots have graduated to your Mastered Vault. Keep challenging yourself in Arena battles!"
                  : `You have ${stats.toReview} active weak spot${stats.toReview === 1 ? "" : "s"} ready for review. Top students treat errors as clues: drill them once, understand the mechanism, and lock in the points.`}
              </p>
            </div>
          </div>

          {/* ── Tabs Bar: Active Weak Spots vs Mastered Vault + View Mode ── */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  playTap();
                  setViewTab("active");
                }}
                className={`px-4 py-2 border-2 border-black rounded-xl font-black text-[12px] md:text-[13px] uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                  viewTab === "active"
                    ? "bg-black text-white shadow-[3px_3px_0px_#000]"
                    : "bg-white text-black hover:bg-[#FAF7F2] shadow-[2px_2px_0px_#000]"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">pending_actions</span>
                <span>Active Weak Spots ({stats.toReview})</span>
              </button>

              <button
                onClick={() => {
                  playTap();
                  setViewTab("mastered");
                }}
                className={`px-4 py-2 border-2 border-black rounded-xl font-black text-[12px] md:text-[13px] uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                  viewTab === "mastered"
                    ? "bg-[#10B981] text-white shadow-[3px_3px_0px_#000]"
                    : "bg-white text-black hover:bg-[#FAF7F2] shadow-[2px_2px_0px_#000]"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">verified</span>
                <span>Mastered Vault ({stats.total - stats.toReview})</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase text-black/50">Grouping:</span>
              <button
                onClick={() => {
                  playTap();
                  setGroupByConcept((prev) => !prev);
                }}
                className={`px-3 py-1.5 border-2 border-black rounded-lg text-[11px] font-black uppercase tracking-wider shadow-[1.5px_1.5px_0px_#000] active:scale-[0.96] transition-all flex items-center gap-1.5 cursor-pointer ${
                  groupByConcept ? "bg-[#FFE566] text-black" : "bg-white text-black hover:bg-[#FAF7F2]"
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">
                  {groupByConcept ? "folder_open" : "grid_view"}
                </span>
                <span>{groupByConcept ? "By Concept" : "All Cards"}</span>
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-2 border-black bg-white p-3 shadow-[3px_3px_0px_#000]">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
              {subjects.map((sub) => (
                <button
                  key={sub}
                  onClick={() => {
                    setActiveSubject(sub);
                    setActiveQuizId(null);
                    playTap();
                  }}
                  className={`px-3 py-1 text-[11px] font-black uppercase tracking-wider border-2 border-black cursor-pointer whitespace-nowrap transition-colors ${
                    activeSubject === sub ? "bg-black text-white" : "bg-white text-black hover:bg-[#F0EDE0]"
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>

            <div className="relative shrink-0">
              <span
                className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-black/40 text-[16px]"
                style={{ textTransform: "none" }}
              >
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search weak spots..."
                className="border-2 border-black bg-[#FAF7F2] pl-8 pr-3 py-1.5 text-[12.5px] font-bold focus:outline-none w-full sm:w-56 shadow-[1px_1px_0px_#000]"
              />
            </div>
          </div>

          {/* Cards & Concept Clusters Grid */}
          {filteredMistakes.length === 0 ? (
            <div className="border-3 border-dashed border-black/30 bg-white p-12 text-center flex flex-col items-center justify-center gap-3 rounded-2xl">
              <span className="material-symbols-outlined text-[48px] text-black/30" style={{ textTransform: "none" }}>
                {viewTab === "mastered" ? "verified" : "task_alt"}
              </span>
              <h4 className="text-[18px] font-black uppercase text-black/60">
                {viewTab === "mastered"
                  ? "Mastered Vault is Empty"
                  : mistakes.length === 0
                  ? "Clean Slate! No Active Weak Spots"
                  : "No Matches for this Filter"}
              </h4>
              <p className="text-[13px] font-bold text-black/40 max-w-md">
                {viewTab === "mastered"
                  ? "When you answer missed questions correctly during drills, they will graduate here into your permanent trophy vault."
                  : mistakes.length === 0
                  ? "Questions you miss during Practice sessions or Arena battles automatically show up here so you can review and master them."
                  : "Try clearing your search query or selecting 'All' subjects to see your entries."}
              </p>
              {viewTab === "active" && mistakes.length === 0 && (
                <button
                  onClick={() => setNewEntryOpen(true)}
                  className="mt-2 px-5 py-2.5 bg-[#FFD13B] hover:bg-[#FFE566] text-black border-2 border-black font-black text-[13px] uppercase tracking-wider shadow-[2px_2px_0px_#000] cursor-pointer"
                >
                  + Add Manual Note
                </button>
              )}
            </div>
          ) : groupByConcept ? (
            /* Concept Clusters View */
            <div className="flex flex-col gap-6">
              {conceptClusters.map((cluster) => (
                <div
                  key={`${cluster.subject}-${cluster.concept}`}
                  className="border-3 border-black bg-white shadow-[4px_4px_0px_#000] rounded-2xl overflow-hidden"
                >
                  {/* Cluster Header */}
                  <div className="p-4 md:p-5 border-b-2 border-black bg-[#FAF7F2] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="px-2.5 py-0.5 bg-black text-white text-[10px] font-black uppercase tracking-wider rounded">
                          {cluster.subject}
                        </span>
                        {Array.from(cluster.errorTypes).map((t) => (
                          <span
                            key={t}
                            className="px-2 py-0.5 bg-white border border-black text-[10px] font-black uppercase tracking-wider text-black rounded"
                          >
                            {t}
                          </span>
                        ))}
                        <span className="text-[11px] font-extrabold text-black/60">
                          {cluster.items.length} {cluster.items.length === 1 ? "question" : "questions"}
                        </span>
                      </div>
                      <h3 className="text-[17px] md:text-[19px] font-black text-black">
                        {cluster.concept}
                      </h3>
                    </div>

                    <button
                      onClick={() => launchDrillWithItems(cluster.items)}
                      disabled={isGeneratingRetest}
                      className="px-4 py-2 bg-[#FFE566] hover:bg-[#FFD13B] text-black border-2 border-black rounded-xl font-black text-[12px] uppercase tracking-wider shadow-[2px_2px_0px_#000] active:scale-[0.96] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[16px]">bolt</span>
                      <span>Drill This Concept</span>
                    </button>
                  </div>

                  {/* Cards inside cluster */}
                  <div className="p-4 md:p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {cluster.items.map((item) => (
                      <MistakeCard
                        key={item.id}
                        item={item}
                        activeQuizId={activeQuizId}
                        selectedQuizOption={selectedQuizOption}
                        quizFeedback={quizFeedback}
                        loadingQuizId={loadingQuizId}
                        onDelete={handleDelete}
                        onMarkMastered={handleMarkMasteredDirect}
                        onStartQuiz={handleStartQuiz}
                        onSubmitQuiz={handleSubmitQuiz}
                        onSelectOption={setSelectedOption}
                        onCloseQuiz={() => {
                          setActiveQuizId(null);
                          setSelectedOption(null);
                          setQuizFeedback(null);
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Flat Cards Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredMistakes.map((item) => (
                <MistakeCard
                  key={item.id}
                  item={item}
                  activeQuizId={activeQuizId}
                  selectedQuizOption={selectedQuizOption}
                  quizFeedback={quizFeedback}
                  loadingQuizId={loadingQuizId}
                  onDelete={handleDelete}
                  onMarkMastered={handleMarkMasteredDirect}
                  onStartQuiz={handleStartQuiz}
                  onSubmitQuiz={handleSubmitQuiz}
                  onSelectOption={setSelectedOption}
                  onCloseQuiz={() => {
                    setActiveQuizId(null);
                    setSelectedOption(null);
                    setQuizFeedback(null);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* New Manual Entry Modal */}
      {newEntryOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setNewEntryOpen(false);
          }}
        >
          <div className="bg-[#FAF7F2] border-3 border-black w-full max-w-md shadow-[6px_6px_0px_#000]">
            <div className="flex items-center justify-between px-5 py-4 border-b-2 border-black bg-[#F0EDE0]">
              <h3 className="font-black text-[17px] uppercase tracking-tight">Log a Weak Spot</h3>
              <button
                onClick={() => setNewEntryOpen(false)}
                className="material-symbols-outlined text-black hover:text-[#ae2925] cursor-pointer"
                style={{ textTransform: "none" }}
              >
                close
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              <div>
                <label className="text-[11px] font-black uppercase tracking-widest text-black/50 block mb-1">
                  Concept / Misconception
                </label>
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full border-2 border-black bg-white px-3 py-2 text-[13.5px] font-bold focus:outline-none shadow-[2px_2px_0px_#000]"
                  placeholder="e.g. Confused Mitosis Anaphase with Telophase"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-widest text-black/50 block mb-1">
                    Subject
                  </label>
                  <select
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    className="w-full border-2 border-black bg-white px-3 py-2 text-[13px] font-bold focus:outline-none shadow-[2px_2px_0px_#000]"
                  >
                    {["Biology", "Physics", "Mathematics", "Chemistry", "History", "General"].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-black uppercase tracking-widest text-black/50 block mb-1">
                    Error Type
                  </label>
                  <select
                    value={newErrorType}
                    onChange={(e) => setNewErrorType(e.target.value as any)}
                    className="w-full border-2 border-black bg-white px-3 py-2 text-[13px] font-bold focus:outline-none shadow-[2px_2px_0px_#000]"
                  >
                    <option value="Conceptual Gap">Conceptual Gap</option>
                    <option value="Calculation Slip">Calculation Slip</option>
                    <option value="Terminology Mix-up">Terminology Mix-up</option>
                    <option value="Exam Trap">Exam Trap</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black uppercase tracking-widest text-black/50 block mb-1">
                  What was the correct fact or distinction?
                </label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={3}
                  className="w-full border-2 border-black bg-white px-3 py-2 text-[13px] font-medium focus:outline-none resize-none shadow-[2px_2px_0px_#000]"
                  placeholder="In Anaphase sister chromatids separate; in Telophase the nuclear envelope reforms..."
                />
              </div>

              <button
                onClick={handleAddNewMistake}
                disabled={!newTitle.trim()}
                className="w-full py-3 bg-[#FFD13B] hover:bg-[#FFE566] text-black border-2 border-black font-black text-[13px] uppercase tracking-wider shadow-[3px_3px_0px_#000] cursor-pointer disabled:opacity-40"
              >
                Save Weak Spot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Practice Missed Questions Adaptive Modal */}
      {retestModalOpen && retestQueue.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-[#FAF7F2] border-3 border-black w-full max-w-lg shadow-[8px_8px_0px_#000] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b-2 border-black bg-[#F0EDE0] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-black/50">
                  Targeted Review Session
                </span>
                <h3 className="font-black text-[18px] uppercase tracking-tight">Review Missed Questions</h3>
              </div>

              <button
                onClick={() => setRetestModalOpen(false)}
                className="material-symbols-outlined text-black hover:text-[#ae2925] cursor-pointer"
                style={{ textTransform: "none" }}
              >
                close
              </button>
            </div>

            {/* Modal Body */}
            {!retestComplete ? (
              <div className="p-6 space-y-5">
                <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-black/50">
                  <span>
                    Question {retestCurrentIndex + 1} of {retestQueue.length}
                  </span>
                  <span>+25 XP per mastered question</span>
                </div>

                {/* Question */}
                <div className="border-2 border-black bg-white p-5 shadow-[3px_3px_0px_#000]">
                  <span className="px-2 py-0.5 bg-black text-white text-[10px] font-black uppercase tracking-wider mb-2 inline-block">
                    {retestQueue[retestCurrentIndex]?.subject}
                  </span>
                  <p className="font-black text-[16px] text-black leading-snug">
                    {retestQueue[retestCurrentIndex]?.quiz?.q}
                  </p>
                </div>

                {/* Options */}
                <div className="space-y-2.5">
                  {retestQueue[retestCurrentIndex]?.quiz?.options.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => setRetestSelectedOption(idx)}
                      className={`w-full text-left p-3 border-2 border-black font-bold text-[13px] transition-all cursor-pointer flex items-center gap-2.5 shadow-[2px_2px_0px_#000] ${
                        retestSelectedOption === idx ? "bg-black text-white" : "bg-white text-black hover:bg-[#F0EDE0]"
                      }`}
                    >
                      <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[11px] font-black shrink-0">
                        {["A", "B", "C", "D"][idx]}
                      </span>
                      <span>{opt}</span>
                    </button>
                  ))}
                </div>

                {retestFeedback && (
                  <div
                    className={`p-3 border-2 border-black text-center font-black text-[13px] ${
                      retestFeedback.startsWith("✓") ? "bg-[#4ADE80] text-black" : "bg-[#FCA5A5] text-[#7f1d1d]"
                    }`}
                  >
                    {retestFeedback}
                  </div>
                )}

                <div className="pt-2">
                  <button
                    disabled={retestSelectedOption === null}
                    onClick={handleRetestSubmit}
                    className="w-full py-3.5 bg-[#FFD13B] hover:bg-[#FFE566] text-black border-2 border-black font-black text-[14px] uppercase tracking-wider shadow-[3px_3px_0px_#000] cursor-pointer disabled:opacity-40"
                  >
                    Check &amp; Master
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center space-y-4">
                <span className="material-symbols-outlined text-[64px] text-green-600" style={{ textTransform: "none" }}>
                  verified
                </span>
                <h4 className="text-[22px] font-black uppercase">Review Session Complete!</h4>
                <p className="text-[13px] font-bold text-black/60">
                  You tackled your weak spots and earned <strong>+{retestXpEarned} XP</strong>.
                </p>

                <div className="pt-3">
                  <button
                    onClick={() => setRetestModalOpen(false)}
                    className="px-8 py-3 bg-black text-white border-2 border-black font-black text-[13px] uppercase tracking-wider shadow-[3px_3px_0px_#000] cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
