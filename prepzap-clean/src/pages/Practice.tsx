import { useNavigate, useSearchParams } from "react-router-dom";
import { SharedSidebar } from "@/components/SharedSidebar";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { loadLibrary, onSourceChange } from "@/lib/sourceContext";
import { usePlan } from "@/hooks/usePlan";
import { useStudySession } from "@/hooks/useStudySession";
import UpgradePrompt from "@/components/UpgradePrompt";
import { callGroq, safeParseJSON } from "@/lib/groq";
import { supabase } from "@/lib/supabase";
import { useToolHistory } from "@/pages/ToolHistory";
import { useTutorialModal } from "@/hooks/useTutorialModal";
import { TutorialModal } from "@/components/TutorialModal";
import { TUTORIAL_CONTENT } from "@/lib/tutorialContent";
import { 
  playPop, 
  playTap, 
  playSuccess, 
  playCelebration, 
  playIncorrect, 
  playComboStreak, 
  playMastery 
} from "@/lib/soundFX";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { EmptyStudyState } from "@/components/EmptyStudyState";
import { QuizAnswer } from "@/components/QuizAnswer";
import { QuizFeedback } from "@/components/QuizFeedback";
import { QuizSkeleton } from "@/components/QuizSkeleton";
import { Progress } from "@/components/ui/progress";
import { fireConfetti } from "@/lib/confetti";
import { AnimatedRex } from "@/components/AnimatedRex";
import { VictoryScreen } from "@/components/VictoryScreen";
import { getQuestionsForLesson, sanitizeQuestion } from "@/lib/lessonLauncher";
import { getComboTier } from "@/lib/streakRisk";
import { SpringButton } from "@/components/ui/SpringButton";
import { markNodeCompleted, getCurrentLessonNodeId, clearCurrentLessonNodeId } from "@/lib/studyPathStorage";

// ─── Interfaces ───────────────────────────────────────────────────────────────
export interface Question {
  type?: "multiple-choice" | "identification" | "fill-in-the-blank";
  q: string;
  options?: string[];
  correct?: number;
  answerText?: string;
  subject: string;
  difficulty: string;
  hint?: string;
  explanation?: string;
}

export interface AdaptiveItem {
  id: string;
  question: Question;
  originalIndex: number;
  mastery: number; // 0 to 100
  attempts: number;
  isReTest: boolean;
  scaffoldHint?: string;
}

interface HistoryEntry {
  prompt?: string;
  preview?: string;
  meta?: string;
  output?: string;
  createdAt?: string;
  created_at?: string;
}

interface ReviewData {
  questions: Question[];
  answers: (number | string)[];
}

function parseReviewData(entry: HistoryEntry): ReviewData | null {
  if (!entry.output) return null;
  try {
    const parsed = JSON.parse(entry.output);
    if (parsed && Array.isArray(parsed.questions) && Array.isArray(parsed.answers)) {
      return parsed as ReviewData;
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseHistoryEntry(entry: HistoryEntry) {
  const meta = entry.meta || "";
  const parts = meta.split("/");
  const correct = parseInt(parts[0]) || 0;
  const total = parseInt(parts[1]) || 3;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const ringColor = pct >= 80 ? "#16a34a" : pct >= 50 ? "#ca8a04" : "#dc2626";
  const ringBg   = pct >= 80 ? "#dcfce7"  : pct >= 50 ? "#fef9c3" : "#fee2e2";
  const ts = entry.createdAt || entry.created_at;
  let timeAgo = "";
  if (ts) {
    const diff = Date.now() - new Date(ts).getTime();
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(h / 24);
    timeAgo = d > 0 ? `${d}d ago` : h > 0 ? `${h}h ago` : "Just now";
  }
  const title = entry.preview || entry.prompt || "Practice Quiz";
  return { pct, ringColor, ringBg, timeAgo, title, correct, total };
}

function cleanStr(s: string): string {
  return (s || "").toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getLevenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Gizmo Recall Scaffolding Generator:
 * Generates first-letter blanks clues or hint cues when an item is missed.
 */
function generateScaffold(question: Question): string {
  if (question.type === "identification" || question.type === "fill-in-the-blank") {
    const raw = (question.answerText || "").trim();
    if (!raw) return question.hint || "Recall the core keyword from your study source.";
    
    const words = raw.split(" ");
    const maskedWords = words.map(w => {
      if (w.length <= 2) return w;
      const first = w[0].toUpperCase();
      const blanks = Array(w.length - 1).fill("_").join(" ");
      return `${first} ${blanks}`;
    });
    return `First-letter clue: ${maskedWords.join("   ")} (${raw.length} chars)`;
  } else {
    if (question.hint) {
      return `Rex Hint: ${question.hint}`;
    }
    if (question.explanation) {
      const firstSentence = question.explanation.split(". ")[0];
      return `Key concept: ${firstSentence}.`;
    }
    return "Think back to the key definition in your study source.";
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────
interface BannerProps {
  isGenerating: boolean;
  topicInput: string;
  setTopicInput: (v: string) => void;
  onGenerate: () => void;
  onNavigate: (r: string) => void;
  libraryFiles: any[];
  questionCount: number;
  setQuestionCount: (v: number) => void;
  activeSourceObj: any;
  setActiveSourceObj: (v: any) => void;
  quizType: string;
  setQuizType: (v: string) => void;
  difficulty: string;
  setDifficulty: (v: string) => void;
}

const QUESTION_COUNT_OPTIONS = [3, 5, 10, 15];

function DesktopBanner({
  isGenerating,
  topicInput,
  setTopicInput,
  onGenerate,
  onNavigate,
  libraryFiles,
  questionCount,
  setQuestionCount,
  activeSourceObj,
  setActiveSourceObj,
  quizType,
  setQuizType,
  difficulty,
  setDifficulty,
}: BannerProps) {
  return (
    <div className="max-w-4xl mx-auto w-full mb-8 bg-white border-2 border-black shadow-[4px_4px_0px_#000] rounded-2xl p-5 sm:p-6 flex flex-col gap-4 font-['Nunito',sans-serif]">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#FF4D2E] text-[24px]">school</span>
            <h2 className="font-black text-[20px] sm:text-[22px] text-black tracking-tight">Quiz Generator</h2>
          </div>
          <p className="text-[12.5px] text-black/60 font-bold mt-0.5">
            Create targeted active recall sessions from your study sources.
          </p>
        </div>

        {/* Source selector & Add Source button */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={activeSourceObj ? activeSourceObj.id : "all"}
            onChange={(e) => {
              if (e.target.value === "all") {
                setActiveSourceObj(null);
              } else {
                const source = (libraryFiles || []).find((f: any) => f.id === e.target.value);
                setActiveSourceObj(source);
              }
            }}
            className="w-full sm:w-auto h-10 px-3.5 border-2 border-black rounded-xl bg-[#FAF7F2] text-[12px] font-black text-black cursor-pointer focus:outline-none shadow-[2px_2px_0px_#000]"
          >
            <option value="all">General Study (All Sources)</option>
            {(libraryFiles || []).map((file: any) => (
              <option key={file.id} value={file.id}>{file.name}</option>
            ))}
          </select>

          <button 
            type="button"
            onClick={() => onNavigate("/sources")}
            className="h-10 px-3.5 bg-white hover:bg-neutral-50 text-black border-2 border-black rounded-xl font-black text-[12px] flex items-center gap-1.5 shadow-[2px_2px_0px_#000] active:translate-y-0.5 transition-all cursor-pointer whitespace-nowrap"
            title="Open Source Library"
          >
            <span className="material-symbols-outlined text-[16px] text-[#FF4D2E]">add</span>
            <span>Add Source</span>
          </button>
        </div>
      </div>

      {/* Topic / Source notes textarea */}
      <div className="relative">
        <textarea
          value={topicInput}
          onChange={e => setTopicInput(e.target.value)}
          className="w-full h-[76px] p-3.5 bg-[#FAF7F2] border-2 border-black rounded-xl text-[13.5px] font-bold text-black focus:outline-none focus:bg-white resize-none shadow-[2px_2px_0px_#000] placeholder:text-black/40 transition-colors"
          placeholder="Topic, chapter or paste notes (e.g. Cellular Respiration, WWI Allies, Linear Equations)..."
        />
      </div>

      {/* Bottom Controls & Generate CTA */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-1">
        {/* Controls group */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          {/* Question Count */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10.5px] font-black uppercase tracking-wider text-black/50">Count</span>
            <div className="flex border-2 border-black rounded-xl overflow-hidden shadow-[2px_2px_0px_#000]">
              {QUESTION_COUNT_OPTIONS.map((n, i) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setQuestionCount(n)}
                  className={`px-3 py-1 text-[12px] font-black transition-colors ${i > 0 ? "border-l-2 border-black" : ""} ${
                    questionCount === n ? "bg-black text-white" : "bg-white text-black hover:bg-neutral-100"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Quiz Type */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10.5px] font-black uppercase tracking-wider text-black/50">Type</span>
            <select
              value={quizType}
              onChange={(e) => setQuizType(e.target.value)}
              className="border-2 border-black rounded-xl px-2.5 py-1 bg-white text-[12px] font-black text-black focus:outline-none cursor-pointer shadow-[2px_2px_0px_#000]"
            >
              <option value="mixed">Mixed Types</option>
              <option value="multiple-choice">Multiple Choice</option>
              <option value="identification">Identification</option>
              <option value="fill-in-the-blank">Fill-in-the-Blank</option>
            </select>
          </div>

          {/* Difficulty */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10.5px] font-black uppercase tracking-wider text-black/50">Level</span>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="border-2 border-black rounded-xl px-2.5 py-1 bg-white text-[12px] font-black text-black focus:outline-none cursor-pointer shadow-[2px_2px_0px_#000]"
            >
              <option value="mixed">Mixed</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>

        {/* Generate Button */}
        <button 
          type="button"
          onClick={onGenerate} 
          disabled={isGenerating}
          className="flex items-center justify-center gap-2 bg-[#FF4D2E] hover:bg-[#E03C1F] text-white font-black text-[13px] px-6 py-2.5 border-2 border-black shadow-[3px_3px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer rounded-xl uppercase tracking-wider disabled:opacity-60 whitespace-nowrap"
        >
          <span className="material-symbols-outlined text-[18px]">bolt</span>
          <span>{isGenerating ? "Generating..." : "Generate Quiz"}</span>
        </button>
      </div>
    </div>
  );
}

function HistoryCard({ entry, onOpenReview }: { entry: HistoryEntry; onOpenReview: (entry: HistoryEntry) => void }) {
  const { pct, ringColor, ringBg, timeAgo, title, correct, total } = parseHistoryEntry(entry);
  return (
    <button
      onClick={() => onOpenReview(entry)}
      className="w-full bg-white border-[1.5px] border-black p-4 rounded-xl flex items-start gap-3 hover:bg-[#F0EDE0] transition-colors cursor-pointer active:translate-y-0.5 text-left shadow-[2px_2px_0px_#000]"
    >
      <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 border-2 font-extrabold text-[12px]"
        style={{ background: ringBg, borderColor: ringColor, color: ringColor }}>
        {pct}%
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-extrabold text-[13px] leading-snug line-clamp-2 mb-1">{title}</p>
        <p className="text-[11px] text-black/50 font-bold">{correct}/{total} correct{timeAgo ? ` · ${timeAgo}` : ""}</p>
      </div>
      <span className="material-symbols-outlined text-[18px] text-black/30 self-center shrink-0">chevron_right</span>
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Practice() {
  const tutorial = useTutorialModal("/practice");
  const { isPro, canUse, logUsage } = usePlan();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, refreshProfile } = useAuth();
  const { logSession } = useStudySession();
  const { save: saveHistory, entries: historyEntries = [] } = useToolHistory("practice") as any;

  // Duolingo 1-Tap Lesson Shell & Overlay States
  const [isLessonMode, setIsLessonMode] = useState<boolean>(() => {
    return searchParams.get("autostart") === "true" || localStorage.getItem("pz_practice_mode") === "lesson";
  });
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  const [lessonXpEarned, setLessonXpEarned] = useState(0);
  const [previousLessonXp, setPreviousLessonXp] = useState<number | undefined>();
  const [lessonAccuracy, setLessonAccuracy] = useState(100);
  const [screenFlashColor, setScreenFlashColor] = useState<string | null>(null);

  // Global Quiz View
  const [view, setView] = useState<"quiz" | "results">(() => 
    (localStorage.getItem('pz_practice_view') as any) || "quiz"
  );

  // Gizmo Adaptive Queue & Recall State
  const [adaptiveQueue, setAdaptiveQueue] = useState<AdaptiveItem[]>(() => {
    try {
      const saved = localStorage.getItem('pz_practice_queue');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [totalInitialCount, setTotalInitialCount] = useState<number>(() => 
    parseInt(localStorage.getItem('pz_practice_total_count') || '0', 10)
  );
  const [masteredCount, setMasteredCount] = useState<number>(() => 
    parseInt(localStorage.getItem('pz_practice_mastered_count') || '0', 10)
  );

  // Duolingo Dopamine Streak State
  const [comboStreak, setComboStreak] = useState<number>(() => 
    parseInt(localStorage.getItem('pz_practice_combo') || '0', 10)
  );
  const [highestStreak, setHighestStreak] = useState<number>(() => 
    parseInt(localStorage.getItem('pz_practice_highest_combo') || '0', 10)
  );

  // Interaction State for Active Question
  const [hasAnsweredCurrent, setHasAnsweredCurrent] = useState(false);
  const [isCurrentCorrect, setIsCurrentCorrect] = useState<boolean | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [semanticFeedback, setSemanticFeedback] = useState<string>("");
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [textInput, setTextInput] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  // Overall Quiz Metadata & Archive State
  const [timeLeft, setTimeLeft] = useState(() => 
    parseInt(localStorage.getItem('pz_practice_time') || '600', 10)
  );
  const [score, setScore] = useState(() => 
    parseInt(localStorage.getItem('pz_practice_score') || '0', 10)
  );
  const [answers, setAnswers] = useState<(number | string)[]>(() => {
    try { return JSON.parse(localStorage.getItem('pz_practice_answers') || '[]'); } catch { return []; }
  });
  const [questions, setQuestions] = useState<Question[]>(() => {
    try { return JSON.parse(localStorage.getItem('pz_practice_questions') || '[]'); } catch { return []; }
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [topicInput, setTopicInput] = useState(() => 
    localStorage.getItem('pz_practice_topic') || ""
  );
  const [questionCount, setQuestionCount] = useState(() => 
    parseInt(localStorage.getItem('pz_practice_count') || '5', 10)
  );
  const [libraryFiles, setLibraryFiles] = useState<any[]>([]);
  const [activeSourceObj, setActiveSourceObj] = useState<any>(null);
  const [quizType, setQuizType] = useState<string>("mixed");
  const [difficulty, setDifficulty] = useState<string>("mixed");

  const [duelOpponent, setDuelOpponent] = useState<{ id: string; name: string; avatar: string; code: string; subject: string } | null>(() => {
    try {
      const raw = localStorage.getItem("pz_duel_opponent");
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  });

  useEffect(() => {
    if (duelOpponent && duelOpponent.subject && !topicInput) {
      setTopicInput(duelOpponent.subject);
      setQuestionCount(5);
    }
  }, [duelOpponent]);

  const [showHistory, setShowHistory] = useState(false);
  const [reviewEntry, setReviewEntry] = useState<HistoryEntry | null>(null);

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem('pz_practice_view', view);
    localStorage.setItem('pz_practice_queue', JSON.stringify(adaptiveQueue));
    localStorage.setItem('pz_practice_total_count', totalInitialCount.toString());
    localStorage.setItem('pz_practice_mastered_count', masteredCount.toString());
    localStorage.setItem('pz_practice_combo', comboStreak.toString());
    localStorage.setItem('pz_practice_highest_combo', highestStreak.toString());
    localStorage.setItem('pz_practice_time', timeLeft.toString());
    localStorage.setItem('pz_practice_score', score.toString());
    localStorage.setItem('pz_practice_answers', JSON.stringify(answers));
    localStorage.setItem('pz_practice_questions', JSON.stringify(questions));
    localStorage.setItem('pz_practice_topic', topicInput);
    localStorage.setItem('pz_practice_count', questionCount.toString());
  }, [view, adaptiveQueue, totalInitialCount, masteredCount, comboStreak, highestStreak, timeLeft, score, answers, questions, topicInput, questionCount]);

  // Handle export from Quick Study
  useEffect(() => {
    const exportedData = localStorage.getItem("qs_practice_export");
    if (exportedData) {
      try {
        const material = JSON.parse(exportedData);
        setTopicInput(typeof material === "string" ? material : JSON.stringify(material));
        setQuestionCount(5);
        localStorage.removeItem("qs_practice_export");
      } catch (err) {
        console.error("Failed to parse QS practice export", err);
      }
    }
  }, []);

  // Handle autostart query parameter (Duolingo 1-tap entry)
  useEffect(() => {
    if (searchParams.get("autostart") === "true") {
      setIsLessonMode(true);
      localStorage.setItem("pz_practice_mode", "lesson");
      const subjectParam = searchParams.get("subject") || "General";
      const nodeParam = searchParams.get("node") || "node-1";
      if (adaptiveQueue.length === 0) {
        const fallbackQs = getQuestionsForLesson(subjectParam);
        const queueItems: AdaptiveItem[] = fallbackQs.map((q, idx) => ({
          id: `node-${nodeParam}-q-${Date.now()}-${idx}`,
          question: q,
          originalIndex: idx,
          mastery: 0,
          attempts: 0,
          isReTest: false,
        }));
        setQuestions(fallbackQs);
        setAdaptiveQueue(queueItems);
        setTotalInitialCount(fallbackQs.length);
        setMasteredCount(0);
        setComboStreak(0);
        setScore(0);
        setAnswers([]);
        setView("quiz");
      }
    }
  }, [searchParams]);

  // Library sync
  useEffect(() => {
    const sync = () => setLibraryFiles(loadLibrary());
    sync();
    const unsub = onSourceChange(sync);
    window.addEventListener("focus", sync);
    return () => { unsub(); window.removeEventListener("focus", sync); };
  }, []);

  // Countdown timer
  useEffect(() => {
    if (view !== "quiz" || adaptiveQueue.length === 0) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [view, adaptiveQueue.length]);

  // Record duel match to duel history upon completion
  const duelRecordedRef = useRef(false);
  useEffect(() => {
    if (view === "complete" && duelOpponent && !duelRecordedRef.current) {
      duelRecordedRef.current = true;
      try {
        const raw = localStorage.getItem("pz_duel_history");
        const list = raw ? JSON.parse(raw) : [];
        const record = {
          id: "duel_" + Date.now(),
          opponentName: duelOpponent.name,
          opponentAvatar: duelOpponent.avatar,
          opponentCode: duelOpponent.code,
          subject: duelOpponent.subject || "General",
          userScore: score,
          totalQuestions: totalInitialCount,
          won: score >= Math.round(totalInitialCount * 0.75),
          date: new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" })
        };
        list.unshift(record);
        localStorage.setItem("pz_duel_history", JSON.stringify(list.slice(0, 30)));
      } catch {}
    }
  }, [view, duelOpponent, score, totalInitialCount]);

  // Active question derived from queue head
  const currentItem: AdaptiveItem | undefined = adaptiveQueue[0];
  const currentQuestion: Question | undefined = currentItem?.question;

  // Phase 3A: Session / Question Timer Ring
  const [questionElapsedSeconds, setQuestionElapsedSeconds] = useState(0);

  useEffect(() => {
    setQuestionElapsedSeconds(0);
  }, [currentItem?.id, currentItem?.question?.q]);

  useEffect(() => {
    if (!isLessonMode || hasAnsweredCurrent || showVictory) return;
    const interval = setInterval(() => {
      setQuestionElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isLessonMode, hasAnsweredCurrent, showVictory, currentItem?.id]);

  // Rex AI Semantic Grading via Groq with typo allowance
  const evaluateAnswer = async (
    userText: string, 
    expectedText: string, 
    questionText: string
  ): Promise<{ isCorrect: boolean; feedback?: string }> => {
    const cUser = cleanStr(userText);
    const cExp = cleanStr(expectedText);

    // Exact match
    if (cUser === cExp) {
      return { isCorrect: true, feedback: "Spot on! Perfect match." };
    }

    if (cUser.length < 2) {
      return { isCorrect: false, feedback: "" };
    }

    // Levenshtein typo check (1 character error on terms >= 4 chars)
    const dist = getLevenshteinDistance(cUser, cExp);
    if (dist <= 1 && cExp.length >= 4) {
      return { isCorrect: true, feedback: "Accepted! (Minor typo auto-corrected)" };
    }

    // Groq AI Semantic Check
    try {
      const prompt = `Grade this student answer for an academic quiz question.
Question: "${questionText}"
Expected Answer: "${expectedText}"
Student Answer: "${userText}"

Rules:
- Accept conceptual matches, synonyms, or slight phrasing variations (e.g. "cell powerhouse" for "mitochondria", "Newton's 1st law" for "law of inertia").
- Accept spelling typos if phonetically clear.
- Reject factual errors or guessing.

Output strict JSON only:
{"isCorrect": true|false, "feedback": "Short 1-sentence note"}`;

      const res = await callGroq(
        [{ role: "user", content: prompt }],
        "You are an encouraging academic grading assistant. Output valid JSON only.",
        "openai/gpt-oss-20b",
        140,
        "practice"
      );

      const parsed = safeParseJSON<{ isCorrect: boolean; feedback: string }>(res);
      if (parsed && typeof parsed.isCorrect === "boolean") {
        return { 
          isCorrect: parsed.isCorrect, 
          feedback: parsed.feedback || (parsed.isCorrect ? "Accepted conceptually!" : "") 
        };
      }
    } catch (e) {
      console.warn("Groq semantic grading error:", e);
    }

    return { isCorrect: false, feedback: "" };
  };

  // Generate Quiz handler
  const handleGenerateQuiz = async () => {
    setIsGenerating(true);
    try {
      if (!isPro) {
        try {
          const allowed = await canUse("practice");
          if (!allowed) {
            setShowUpgrade(true);
            setIsGenerating(false);
            return;
          }
        } catch (planErr) {
          console.warn("Failed to check plan limits:", planErr);
        }
      }

      const sourceText = activeSourceObj 
        ? `=== SOURCE: ${activeSourceObj.name} ===\n${activeSourceObj.fullText || activeSourceObj.preview || "[No text available]"}`
        : "";
      const topicHint = topicInput.trim();
      
      const typeInstruct = quizType === "mixed" 
        ? 'any combination of "multiple-choice", "identification", and "fill-in-the-blank" questions'
        : `only "${quizType}" questions`;

      const diffInstruct = difficulty === "mixed"
        ? "with mixed difficulties (Easy, Medium, Hard)"
        : `with "${difficulty}" difficulty`;
      
      const promptText = sourceText
        ? `Generate a set of ${questionCount || 5} interesting, high-quality quiz questions (${typeInstruct}, ${diffInstruct}) based on this student material:\n\n---\n${sourceText}\n---\n${topicHint ? `\nFocus especially on: ${topicHint}` : ""}`
        : topicHint
          ? `Generate ${questionCount || 5} high-quality educational quiz questions (${typeInstruct}, ${diffInstruct}) about: ${topicHint}`
          : `Generate ${questionCount || 5} high-quality educational quiz questions (${typeInstruct}, ${diffInstruct}) across core academic curriculum subjects.`;

      const systemPrompt = `You are a strict JSON api generator. You MUST respond with a valid JSON array of exactly ${questionCount || 5} questions. Do NOT write any introduction or explanation outside the JSON array.
We support three question types: "multiple-choice", "identification", and "fill-in-the-blank".
For this request, generate ${typeInstruct} ${diffInstruct}.
Each object MUST match this schema exactly:
{
  "type": "multiple-choice" | "identification" | "fill-in-the-blank",
  "q": "Question text or sentence with a ______ for blanks.",
  "options": ["A","B","C","D"], // ONLY for multiple-choice, otherwise null
  "correct": 0, // For multiple-choice, index 0-3 of correct option.
  "answerText": "Exact word", // For identification or fill-in-the-blank
  "subject": "Subject name",
  "difficulty": "Easy, Medium or Hard",
  "hint": "A short helpful hint.",
  "explanation": "Why this answer is correct."
}`;

      const aiResponse = await callGroq(
        [{ role: "user", content: promptText }],
        systemPrompt,
        "openai/gpt-oss-20b",
        Math.min(4096, 400 + (questionCount || 5) * 320),
        "practice"
      );

      const parsed = safeParseJSON<Question[]>(aiResponse);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const queueItems: AdaptiveItem[] = parsed.map((q, idx) => ({
          id: `q-${Date.now()}-${idx}`,
          question: q,
          originalIndex: idx,
          mastery: 0,
          attempts: 0,
          isReTest: false,
        }));

        setQuestions(parsed);
        setAdaptiveQueue(queueItems);
        setTotalInitialCount(parsed.length);
        setMasteredCount(0);
        setComboStreak(0);
        setHighestStreak(0);
        setScore(0);
        setAnswers([]);
        setSelectedOption(null);
        setTextInput("");
        setHasAnsweredCurrent(false);
        setIsCurrentCorrect(null);
        setSemanticFeedback("");
        setTimeLeft(Math.max(300, parsed.length * 90));

        logSession({ 
          title: `Practice: ${topicHint || "Adaptive Mastery Quiz"}`, 
          durationMinutes: Math.ceil((questionCount || 5) * 1.5) 
        }); 
        try { await logUsage("practice"); } catch {};
        
        playSuccess();
        setView("quiz");
      } else {
        throw new Error("Invalid structure from AI. Please try again.");
      }
    } catch (err) {
      console.error("Quiz generation error:", err);
      alert("Failed to generate quiz. " + (err instanceof Error ? err.message : "Please try again."));
    } finally {
      setIsGenerating(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Check Answer Handler (Duolingo dopamine triggers + Groq semantic eval)
  const handleCheck = useCallback(async () => {
    if (hasAnsweredCurrent || isEvaluating || !currentItem) return;

    const q = currentItem.question;
    const isMc = q.type === "multiple-choice" || (!q.type && q.options && q.options.length > 0);

    if (isMc) {
      if (selectedOption === null) return;
      const isCorrect = selectedOption === q.correct;
      setIsCurrentCorrect(isCorrect);
      setHasAnsweredCurrent(true);

      if (isCorrect) {
        const newStreak = comboStreak + 1;
        setComboStreak(newStreak);
        setHighestStreak(prev => Math.max(prev, newStreak));
        if (newStreak >= 3) {
          const tier = getComboTier(newStreak);
          setScreenFlashColor(tier.flashColor);
          setTimeout(() => setScreenFlashColor(null), 350);
        }
        if (currentItem.isReTest) {
          playMastery();
        } else {
          playComboStreak(newStreak);
          setScore(prev => prev + 1);
        }
        if (!currentItem.isReTest) {
          setAnswers(prev => [...prev, selectedOption]);
        }
      } else {
        setComboStreak(0);
        playIncorrect();
        if (!currentItem.isReTest) {
          setAnswers(prev => [...prev, selectedOption]);
        }
      }
    } else {
      if (!textInput.trim()) return;
      setIsEvaluating(true);

      const target = (q.answerText || "").trim();
      const evaluation = await evaluateAnswer(textInput, target, q.q);

      setIsEvaluating(false);
      setIsCurrentCorrect(evaluation.isCorrect);
      setSemanticFeedback(evaluation.feedback || "");
      setHasAnsweredCurrent(true);

      if (evaluation.isCorrect) {
        const newStreak = comboStreak + 1;
        setComboStreak(newStreak);
        setHighestStreak(prev => Math.max(prev, newStreak));
        if (newStreak >= 3) {
          const tier = getComboTier(newStreak);
          setScreenFlashColor(tier.flashColor);
          setTimeout(() => setScreenFlashColor(null), 350);
        }
        if (currentItem.isReTest) {
          playMastery();
        } else {
          playComboStreak(newStreak);
          setScore(prev => prev + 1);
        }
        if (!currentItem.isReTest) {
          setAnswers(prev => [...prev, textInput.trim()]);
        }
      } else {
        setComboStreak(0);
        playIncorrect();
        if (!currentItem.isReTest) {
          setAnswers(prev => [...prev, textInput.trim()]);
        }
      }
    }
  }, [hasAnsweredCurrent, isEvaluating, currentItem, selectedOption, textInput, comboStreak]);

  // Continue Handler (Gizmo adaptive recall re-queueing)
  const handleContinue = useCallback(() => {
    if (!currentItem) return;

    playPop(1.1);
    setShowHint(false);
    setShowExplanation(false);
    setHasAnsweredCurrent(false);
    setIsCurrentCorrect(null);
    setSelectedOption(null);
    setTextInput("");
    setSemanticFeedback("");

    const remaining = adaptiveQueue.slice(1);

    if (isCurrentCorrect) {
      setMasteredCount(prev => prev + 1);

      if (remaining.length === 0) {
        finalizeQuiz(score + (currentItem.isReTest ? 0 : 1));
        return;
      }
      setAdaptiveQueue(remaining);
    } else {
      // Missed: Spaced recall re-test 2 questions later with scaffolding
      const retestItem: AdaptiveItem = {
        ...currentItem,
        id: `retest-${Date.now()}-${currentItem.originalIndex}`,
        attempts: currentItem.attempts + 1,
        isReTest: true,
        scaffoldHint: generateScaffold(currentItem.question),
      };

      const insertIdx = Math.min(remaining.length, 2);
      remaining.splice(insertIdx, 0, retestItem);
      setAdaptiveQueue(remaining);
    }
  }, [currentItem, isCurrentCorrect, adaptiveQueue, score]);

  // Keyboard shortcut listener (Enter to check / continue)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (view !== "quiz" || isGenerating || !currentItem) return;

      if (e.key === "Enter") {
        if (!hasAnsweredCurrent) {
          const isMc = currentItem.question.type === "multiple-choice" || (!currentItem.question.type && currentItem.question.options && currentItem.question.options.length > 0);
          const canCheck = isMc ? selectedOption !== null : textInput.trim().length > 0;
          if (canCheck && !isEvaluating) {
            e.preventDefault();
            handleCheck();
          }
        } else {
          e.preventDefault();
          handleContinue();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [view, isGenerating, currentItem, hasAnsweredCurrent, selectedOption, textInput, isEvaluating, handleCheck, handleContinue]);

  const finalizeQuiz = (finalScore: number) => {
    playCelebration();
    if (!isLessonMode) fireConfetti();

    const xpAwarded    = totalInitialCount * 30 + 20;
    const coinsAwarded = totalInitialCount * 15 + 10;
    if (user && profile) {
      supabase.from("profiles").update({
        total_xp: (profile.total_xp || profile.xp || 0) + xpAwarded,
        coins:    (profile.coins || 0) + coinsAwarded,
      }).eq("id", user.id).then(({ error }: { error: unknown }) => {
        if (error) console.error(error);
        if (typeof refreshProfile === "function") refreshProfile();
      });
    }

    const quizSubjects = Array.from(new Set(questions.map(q => q.subject).filter(Boolean)));
    const historyTitle = topicInput.trim() || quizSubjects.join(", ") || "Practice Quiz";
    saveHistory({
      prompt:  questions.map(q => q.q).join(" | ").slice(0, 120),
      preview: historyTitle,
      output:  JSON.stringify({ questions, answers } as ReviewData),
      model:   "rex-ai-mastery",
      meta:    `${totalInitialCount}/${totalInitialCount} Mastered (Streak: ${highestStreak})`,
    });
    const accuracyPct = totalInitialCount > 0 
      ? Math.min(100, Math.round((finalScore / totalInitialCount) * 100))
      : 100;
    setPreviousLessonXp(profile?.total_xp ?? undefined);
    setLessonXpEarned(xpAwarded);
    setLessonAccuracy(accuracyPct);

    const currentLessonNode = getCurrentLessonNodeId();
    if (currentLessonNode) {
      markNodeCompleted(currentLessonNode);
    }

    if (isLessonMode) {
      setShowVictory(true);
    } else {
      setView("results");
    }
  };

  // Progress metrics
  const progressPercent = totalInitialCount > 0 
    ? Math.min(100, Math.round((masteredCount / totalInitialCount) * 100)) 
    : 0;

  // History Drawer Component
  const HistoryDrawerContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b-2 border-black shrink-0">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px]">history</span>
          <h3 className="text-[16px] font-extrabold">Quiz History</h3>
        </div>
        <button 
          onClick={() => setShowHistory(false)} 
          className="md:hidden w-8 h-8 flex items-center justify-center border-2 border-black bg-white shadow-[2px_2px_0px_#000] active:translate-y-0.5"
        >
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {historyEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-center opacity-40">
            <span className="material-symbols-outlined text-[32px]">quiz</span>
            <p className="text-[12px] font-bold">No quizzes yet.<br/>Generate your first one!</p>
          </div>
        ) : (historyEntries as HistoryEntry[]).slice(0, 20).map((entry, i) => (
          <HistoryCard key={i} entry={entry} onOpenReview={setReviewEntry} />
        ))}
      </div>
      {historyEntries.length > 0 && (
        <div className="px-4 py-3 border-t-2 border-black shrink-0">
          <button 
            onClick={() => navigate("/analytics")} 
            className="w-full py-2 border-2 border-black bg-[#F0EDE0] text-[12px] font-extrabold hover:bg-black hover:text-white transition-colors"
          >
            View All in Analytics →
          </button>
        </div>
      )}
    </div>
  );

  // Past Attempt Review Modal
  const ReviewModal = () => {
    if (!reviewEntry) return null;
    const { pct, title, correct, total, timeAgo } = parseHistoryEntry(reviewEntry);
    const review = parseReviewData(reviewEntry);
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50" onClick={() => setReviewEntry(null)} />
        <div className="relative bg-[#FAF7F2] border-[3px] border-black shadow-[6px_6px_0px_#000] w-full max-w-2xl max-h-[85vh] flex flex-col">
          <div className="flex items-start justify-between gap-4 px-6 py-4 border-b-2 border-black bg-white shrink-0">
            <div>
              <p className="font-extrabold text-[16px] leading-snug">{title}</p>
              <p className="text-[12px] font-bold text-black/50">{correct}/{total} correct ({pct}%){timeAgo ? ` · ${timeAgo}` : ""}</p>
            </div>
            <button onClick={() => setReviewEntry(null)} className="material-symbols-outlined text-[22px] shrink-0 hover:text-[#FF4D2E] transition-colors">close</button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
            {!review ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-center opacity-50">
                <span className="material-symbols-outlined text-[32px]">quiz</span>
                <p className="text-[12px] font-bold max-w-[280px]">
                  Detailed answers aren't available for this attempt.
                </p>
              </div>
            ) : (
              review.questions.map((q, i) => {
                const userAnswer = review.answers[i];
                const isMc = q.type === "multiple-choice" || (!q.type && q.options && q.options.length > 0);
                const isCorrect = isMc ? userAnswer === q.correct : cleanStr(String(userAnswer || "")) === cleanStr(q.answerText || "");
                return (
                  <div key={i} className="flex flex-col gap-2 bg-white border-2 border-black p-4 rounded-xl">
                    <div className="flex items-start gap-2">
                      <span className={`material-symbols-outlined text-[20px] shrink-0 mt-0.5 ${isCorrect ? "text-green-600" : "text-[#dc2626]"}`}>
                        {isCorrect ? "check_circle" : "cancel"}
                      </span>
                      <p className="font-extrabold text-[14px] leading-snug">{i + 1}. {q.q}</p>
                    </div>

                    {isMc && q.options && (
                      <div className="flex flex-col gap-1.5 pl-7 mt-1">
                        {q.options.map((opt, oi) => {
                          const isTheCorrectOne = oi === q.correct;
                          const isUserPick = oi === userAnswer;
                          const style = isTheCorrectOne
                            ? "border-green-600 bg-green-50 text-green-800 font-bold"
                            : isUserPick
                              ? "border-[#dc2626] bg-[#fee2e2] text-[#dc2626] font-bold"
                              : "border-black/10 bg-white text-black/60";
                          return (
                            <div key={oi} className={`flex items-center gap-2 px-3 py-1.5 border-[1.5px] rounded-lg text-[12px] ${style}`}>
                              <span className="font-extrabold">{["A", "B", "C", "D"][oi]}</span>
                              <span className="flex-1">{opt}</span>
                              {isTheCorrectOne && <span className="text-[10px] font-black uppercase tracking-wider">Correct</span>}
                              {isUserPick && !isTheCorrectOne && <span className="text-[10px] font-black uppercase tracking-wider">Your pick</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {!isMc && (
                      <div className="pl-7 flex flex-col gap-1 text-[13px] mt-1">
                        <p className="text-black/70 font-semibold">Your answer: <span className="font-bold text-black">{String(userAnswer || "—")}</span></p>
                        <p className="text-green-700 font-bold">Correct answer: {q.answerText || "—"}</p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  };

  // Feedback Bottom Drawer (Duolingo style for Desktop & Mobile)
  const isMc = currentQuestion?.type === "multiple-choice" || (!currentQuestion?.type && currentQuestion?.options && currentQuestion.options.length > 0);
  const canCheck = isMc ? selectedOption !== null : textInput.trim().length > 0;
  const expectedAnswerText = isMc
    ? (currentQuestion?.options && currentQuestion.correct !== undefined ? currentQuestion.options[currentQuestion.correct] : "")
    : (currentQuestion?.answerText || "");

  const renderFeedback = () => (
    <QuizFeedback
      answered={hasAnsweredCurrent}
      correct={isCurrentCorrect}
      canCheck={canCheck}
      evaluating={isEvaluating}
      explanation={semanticFeedback || currentQuestion?.explanation || ""}
      expectedAnswer={expectedAnswerText}
      combo={comboStreak}
      onCheck={handleCheck}
      onContinue={handleContinue}
    />
  );

  return (
    <>
      <TutorialModal isOpen={tutorial.isOpen} onDismiss={tutorial.dismiss} features={TUTORIAL_CONTENT["/practice"] || []} title="Practice" />
      {showUpgrade && <UpgradePrompt feature="practice" remaining={0} onClose={() => setShowUpgrade(false)} />}
      <ReviewModal />

      {/* Screen edge color flash for combo bursts */}
      {screenFlashColor && (
        <div
          className="fixed inset-0 pointer-events-none z-[65] transition-opacity duration-300"
          style={{
            boxShadow: `inset 0 0 70px 20px ${screenFlashColor}`,
          }}
        />
      )}

      {/* ── Victory Celebration Overlay (Duolingo Style) ── */}
      {showVictory && (
        <VictoryScreen
          xpEarned={lessonXpEarned}
          previousXp={previousLessonXp}
          accuracy={lessonAccuracy}
          streakDays={profile?.streak_days || 0}
          onContinue={() => {
            const currentLessonNode = getCurrentLessonNodeId();
            if (currentLessonNode) {
              markNodeCompleted(currentLessonNode);
              clearCurrentLessonNodeId();
            }
            localStorage.removeItem("pz_practice_queue");
            localStorage.removeItem("pz_practice_questions");
            localStorage.removeItem("pz_practice_mode");
            setShowVictory(false);
            setIsLessonMode(false);
            navigate("/dashboard");
          }}
          onShare={() => {}}
        />
      )}

      {/* ── Leave Lesson Confirmation Modal ── */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs select-none">
          <div className="bg-[#FAF7F2] border-3 border-black p-6 rounded-2xl shadow-[6px_6px_0px_#000] max-w-sm w-full flex flex-col gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-[#FFE566] border-2 border-black mx-auto flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px] text-black">help</span>
            </div>
            <div>
              <h3 className="font-black text-[18px] text-black">Leave lesson?</h3>
              <p className="text-[13px] font-bold text-black/60 mt-1">
                Your progress for this lesson session will not be saved.
              </p>
            </div>
            <div className="flex flex-col gap-2 mt-2">
              <button
                type="button"
                onClick={() => setShowLeaveModal(false)}
                className="w-full py-3 bg-[#FF4D2E] text-white font-black text-[14px] border-2 border-black rounded-xl shadow-[3px_3px_0px_#000] active:translate-y-0.5 active:shadow-none hover:bg-black cursor-pointer uppercase tracking-wider"
              >
                Keep Learning
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLeaveModal(false);
                  setIsLessonMode(false);
                  localStorage.removeItem("pz_practice_queue");
                  localStorage.removeItem("pz_practice_questions");
                  localStorage.removeItem("pz_practice_mode");
                  navigate("/dashboard");
                }}
                className="w-full py-2.5 bg-white text-black font-black text-[13px] border-2 border-black rounded-xl shadow-[2px_2px_0px_#000] active:translate-y-0.5 active:shadow-none hover:bg-gray-100 cursor-pointer uppercase tracking-wider"
              >
                Leave Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ FULL-SCREEN LESSON SHELL (Duolingo 1-Tap Experience) ══ */}
      {isLessonMode && adaptiveQueue.length > 0 && !isGenerating && !showVictory && currentQuestion && (
        <div className="quiz-shell fixed inset-0 z-50 bg-[#FAF7F2] flex flex-col justify-between overflow-y-auto select-none font-['Nunito',sans-serif]">
          {/* Top Bar */}
          <div className="sticky top-0 z-50 bg-[#FAF7F2] border-b-2 border-black px-4 sm:px-8 py-3.5 flex items-center justify-between gap-2 sm:gap-4 shrink-0">
            <button
              type="button"
              onClick={() => setShowLeaveModal(true)}
              className="w-11 h-11 rounded-full border-2 border-black bg-white hover:bg-black hover:text-white flex items-center justify-center font-black shadow-[2px_2px_0px_#000] active:translate-y-0.5 transition-all cursor-pointer shrink-0"
              aria-label="Exit Lesson"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">close</span>
            </button>

            <div className="flex-1 max-w-xl flex flex-col gap-1">
              <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-wider text-black/60">
                <span>Question {Math.min(totalInitialCount, masteredCount + 1)} of {totalInitialCount}</span>
                <span className="text-[#10B981] font-black">{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} aria-label="Lesson mastery" className="h-3.5 border-2 border-black bg-[#E8E4DC] [&>div]:bg-[#10B981]" />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Phase 3A: Question Timer Ring */}
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border-2 border-black bg-white shadow-[2px_2px_0px_#000] ${
                  comboStreak >= 3 ? "animate-pulse" : ""
                }`}
                title={`Time on question: ${questionElapsedSeconds}s (turns amber after 45s)`}
              >
                <svg className="w-4 h-4 -rotate-90 transform" viewBox="0 0 28 28">
                  <circle cx="14" cy="14" r="11" stroke="#E5E7EB" strokeWidth="3" fill="none" />
                  <circle
                    cx="14"
                    cy="14"
                    r="11"
                    stroke={questionElapsedSeconds >= 45 ? "#F59E0B" : "#10B981"}
                    strokeWidth="3"
                    fill="none"
                    strokeDasharray={69.115}
                    strokeDashoffset={69.115 - (Math.min(questionElapsedSeconds, 60) / 60) * 69.115}
                    strokeLinecap="round"
                    className="transition-all duration-300"
                  />
                </svg>
                <span
                  className={`text-[11px] font-black tabular-nums ${
                    questionElapsedSeconds >= 45 ? "text-[#D97706]" : "text-black"
                  }`}
                >
                  {questionElapsedSeconds}s
                </span>
              </div>

              {comboStreak > 1 && (
                <div className="hidden sm:flex items-center gap-1.5 bg-[#FFF275] border-2 border-black px-3 py-1 rounded-full text-[12px] font-black shadow-[2px_2px_0px_#000]">
                  <span className="material-symbols-outlined text-[15px] text-[#FF4D2E]" aria-hidden="true">
                    local_fire_department
                  </span>
                  <span>{comboStreak}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  playTap();
                  setIsLessonMode(false);
                  localStorage.removeItem("pz_practice_mode");
                }}
                className="text-[11px] font-extrabold text-black/50 hover:text-black hover:underline cursor-pointer min-h-11 min-w-11 px-2 py-1 flex items-center gap-1"
                title="Open Advanced Quiz Generator"
              >
                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">tune</span>
                <span className="hidden sm:inline">Advanced</span>
              </button>
            </div>
          </div>

          {/* Centered Question Content */}
          <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 sm:py-8 flex flex-col justify-center">
            {currentItem && currentItem.isReTest && (
              <div className="mb-4 bg-[#FFD13B] border-2 border-black px-4 py-2 rounded-xl flex items-center justify-between shadow-[2px_2px_0px_#000]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-black" aria-hidden="true">refresh</span>
                  <span className="text-[11.5px] font-black uppercase tracking-wider text-black">
                    Adaptive Recall · Re-Test
                  </span>
                </div>
                <span className="text-[11px] font-bold text-black/70">Attempt {currentItem.attempts + 1}</span>
              </div>
            )}

            <div className="bg-white border-2 border-black p-6 sm:p-8 shadow-[4px_4px_0px_#000] rounded-2xl mb-6 relative">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2.5 py-1 bg-[#FAF7F2] border-2 border-black rounded-lg text-[10.5px] font-black uppercase tracking-wider text-black shadow-[1.5px_1.5px_0px_#000]">
                    {currentQuestion.subject || "Subject"}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 bg-[#FFD13B] border-2 border-black rounded-lg text-[10.5px] font-black uppercase tracking-wider text-black shadow-[1.5px_1.5px_0px_#000]">
                    {currentQuestion.difficulty || "Medium"}
                  </span>
                </div>
              </div>

              <h2 key={currentItem.id} className="motion-safe:animate-fade-up text-[20px] sm:text-[24px] font-black leading-snug mb-3 text-black">
                {currentQuestion.q}
              </h2>

              {currentItem && currentItem.isReTest && currentItem.scaffoldHint && (
                <div className="mt-3 bg-[#FFF9E6] border-2 border-black p-3 rounded-xl text-[12.5px] font-bold text-black/80 flex items-start gap-2">
                  <span className="material-symbols-outlined text-[#F5A623] text-[18px] shrink-0" aria-hidden="true">psychology</span>
                  <div>
                    <span className="text-[#B45309] text-[10px] font-black uppercase tracking-wider block mb-0.5">Recall Clue</span>
                    <p className="text-black font-extrabold">{currentItem.scaffoldHint}</p>
                  </div>
                </div>
              )}
            </div>

            {isMc ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                {(currentQuestion.options || []).map((option, idx) => (
                    <QuizAnswer
                      key={`${currentItem.id}-${idx}`}
                      index={idx}
                      selected={selectedOption === idx}
                      answered={hasAnsweredCurrent}
                      correct={currentQuestion.correct === idx}
                      onSelect={() => setSelectedOption(idx)}
                    >{option}</QuizAnswer>
                  ))}
              </div>
            ) : (
              <div className="mb-4">
                <input
                  type="text"
                  value={textInput}
                  disabled={hasAnsweredCurrent}
                  onChange={e => setTextInput(e.target.value)}
                  aria-label="Your answer"
                  placeholder="Type your answer here..."
                  autoFocus
                  className="w-full bg-white border-2 border-black rounded-xl p-4 text-[16px] font-extrabold shadow-[4px_4px_0px_#000] focus:outline-none"
                />
              </div>
            )}
          </main>

          {renderFeedback()}
        </div>
      )}

      {/* ── Mobile History Drawer Overlay ─────────────────────────────────── */}
      {showHistory && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="flex-1 bg-black/40" onClick={() => setShowHistory(false)} />
          <div className="w-[85vw] max-w-[340px] bg-white border-l-2 border-black flex flex-col h-full shadow-[-4px_0_0_#000]">
            <HistoryDrawerContent />
          </div>
        </div>
      )}

      {/* ══ DESKTOP VIEW ══════════════════════════════════════════════════════ */}
      <SharedSidebar active="/practice" />

      <div className="hidden md:flex md:ml-64 bg-[#FAF7F2] flex-col" style={{ minHeight: "100vh" }}>
        <div className="flex flex-1 overflow-hidden">
          {/* Main Workspace */}
          <div className="flex-1 flex flex-col overflow-y-auto">
            
            {/* View: Active Quiz or Generator */}
            {view === "quiz" && (
              <main className="flex-1 flex flex-col p-8 max-w-4xl mx-auto w-full">
                
                {/* 1v1 Quiz Duel Opponent Banner */}
                {duelOpponent && (
                  <div className="bg-[#FFD13B] border-3 border-black rounded-2xl p-4 shadow-[4px_4px_0px_#1A1A1A] flex items-center justify-between gap-3 mb-5 animate-in fade-in">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-xl bg-white border-2 border-black flex items-center justify-center text-[24px] overflow-hidden shadow-xs shrink-0">
                        {duelOpponent.avatar?.startsWith("/") || duelOpponent.avatar?.startsWith("http") ? (
                          <img src={duelOpponent.avatar} alt={duelOpponent.name} className="w-full h-full object-cover" />
                        ) : (
                          <img src="/buddies/fox_scholar.png" alt={duelOpponent.name} className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div>
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-black text-white text-[10px] font-black uppercase rounded tracking-wider">
                          <span className="material-symbols-outlined text-[13px]">sports_kabaddi</span>
                          <span>1v1 Rapid Recall Duel</span>
                        </div>
                        <h4 className="text-[15px] font-black text-black leading-tight mt-0.5">
                          Challenging {duelOpponent.name} ({duelOpponent.code})
                        </h4>
                        <p className="text-[11.5px] font-bold text-black/65">
                          5 quick questions on <strong>{duelOpponent.subject || "General"}</strong>. Score higher accuracy to win!
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.removeItem("pz_duel_opponent");
                        setDuelOpponent(null);
                      }}
                      className="text-[11px] font-bold text-black/55 hover:text-red-600 underline cursor-pointer"
                    >
                      Cancel Duel
                    </button>
                  </div>
                )}

                {/* Desktop Top Generator Banner: only shown when no active quiz */}
                {(adaptiveQueue.length === 0 || isGenerating) && (
                  <DesktopBanner
                    isGenerating={isGenerating}
                    topicInput={topicInput}
                    setTopicInput={setTopicInput}
                    onGenerate={handleGenerateQuiz}
                    onNavigate={navigate}
                    libraryFiles={libraryFiles}
                    questionCount={questionCount}
                    setQuestionCount={setQuestionCount}
                    activeSourceObj={activeSourceObj}
                    setActiveSourceObj={setActiveSourceObj}
                    quizType={quizType}
                    setQuizType={setQuizType}
                    difficulty={difficulty}
                    setDifficulty={setDifficulty}
                  />
                )}

                {/* Loading state */}
                {isGenerating && (
                  <div className="flex flex-col items-center justify-center flex-1 py-24 gap-4">
                    <QuizSkeleton />
                    <p className="font-extrabold text-[15px] text-black/60">Crafting your adaptive mastery quiz...</p>
                  </div>
                )}

                {/* Empty State */}
                {adaptiveQueue.length === 0 && !isGenerating && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-12 gap-5">
                    <div className="w-20 h-20 bg-[#FFE566] border-2 border-black shadow-[4px_4px_0px_#000] rounded-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-[40px] text-black" aria-hidden="true">school</span>
                    </div>
                    <div>
                      <h2 className="font-black text-[22px] text-black">Ready to test your recall?</h2>
                      <p className="text-black/60 font-bold text-[14px] max-w-[360px] mt-1">
                        Use the generator above to build a custom quiz, or jump directly into your daily learning path!
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate("/dashboard")}
                      className="px-6 py-3 bg-[#FF4D2E] hover:bg-black text-white font-black text-[14px] rounded-xl border-2 border-black shadow-[3px_3px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-2 cursor-pointer uppercase tracking-wider"
                    >
                      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">route</span>
                      <span>Go to Learning Path</span>
                    </button>
                  </div>
                )}

                {/* Active Question Content */}
                {adaptiveQueue.length > 0 && !isGenerating && currentQuestion && (
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      {/* Top Bar: Exit + Progress + Flame Combo Badge + Timer */}
                      <div className="flex items-center justify-between mb-6 gap-4">
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm("Leave this lesson? Your progress for this session will be lost.")) {
                              localStorage.removeItem('pz_practice_queue');
                              localStorage.removeItem('pz_practice_questions');
                              navigate("/dashboard");
                            }
                          }}
                          className="w-11 h-11 rounded-full border-2 border-black bg-white hover:bg-black hover:text-white flex items-center justify-center font-black shadow-[2px_2px_0px_#000] active:translate-y-0.5 transition-all cursor-pointer shrink-0"
                          title="Exit Lesson to Learning Path"
                          aria-label="Exit Lesson"
                        >
                          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">close</span>
                        </button>

                        <div className="flex-1 flex flex-col gap-1.5">
                          <div className="flex justify-between items-center text-[12px] font-extrabold">
                            <span className="uppercase tracking-wider text-black/60 font-black">
                              Mastery Progress ({masteredCount} of {totalInitialCount})
                            </span>
                            <span className="text-[#10B981] font-black">{progressPercent}%</span>
                          </div>
                          <Progress value={progressPercent} aria-label="Lesson mastery" className="h-3.5 border-2 border-black bg-[#E8E4DC] [&>div]:bg-[#10B981]" />
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Flame Combo Streak Badge */}
                          {comboStreak > 1 && (
                            <div className="flex items-center gap-1.5 bg-[#FFF275] border-[2px] border-black px-3.5 py-1.5 rounded-full text-[13px] font-black shadow-[2px_2px_0px_#000] animate-bounce-short">
                              <span className="material-symbols-outlined text-[16px] text-[#FF4D2E]" aria-hidden="true">
                                local_fire_department
                              </span>
                              <span>{comboStreak} STREAK</span>
                            </div>
                          )}

                          {/* Countdown Timer */}
                          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-[#F0EDE0] border-[2px] border-black shadow-[2px_2px_0px_#000] rounded-full text-[13px] font-bold">
                            <span className="material-symbols-outlined text-[16px] text-[#FF4D2E]" aria-hidden="true">timer</span>
                            <span>{formatTime(timeLeft)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Adaptive Re-Test Banner */}
                      {currentItem.isReTest && (
                        <div className="mb-4 bg-[#FFD13B] border-[2px] border-black px-4 py-2 rounded-xl flex items-center justify-between shadow-[3px_3px_0px_#000]">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[20px] text-black">refresh</span>
                            <span className="text-[12px] font-black uppercase tracking-wider text-black">
                              Adaptive Recall · Re-Testing Question #{currentItem.originalIndex + 1}
                            </span>
                          </div>
                          <span className="text-[11px] font-bold text-black/70">Attempt {currentItem.attempts + 1}</span>
                        </div>
                      )}

                      {/* Question Card */}
                      <div className="bg-white border-[3px] border-black p-8 shadow-[5px_5px_0px_#000] rounded-2xl mb-6 relative">
                        <div className="absolute -top-3.5 left-6 bg-black text-white px-3.5 py-0.5 text-[10px] font-black tracking-widest uppercase rounded">
                          {currentQuestion.type ? currentQuestion.type.replace(/-/g, " ") : "MULTIPLE CHOICE"}
                        </div>

                        <div className="flex items-center justify-between gap-2 mb-4 mt-2">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-3 py-1 bg-[#FAF7F2] border-2 border-black rounded-lg text-[10.5px] font-black uppercase tracking-wider shadow-[1.5px_1.5px_0px_#000]">
                              <span className="material-symbols-outlined text-[13px] mr-1">folder</span>{currentQuestion.subject}
                            </span>
                            <span className="inline-flex items-center px-3 py-1 bg-[#FFD13B] border-2 border-black rounded-lg text-[10.5px] font-black uppercase tracking-wider text-black shadow-[1.5px_1.5px_0px_#000]">
                              <span className="material-symbols-outlined text-[13px] mr-1">leaderboard</span>{currentQuestion.difficulty}
                            </span>
                          </div>
                        </div>

                        <h2 key={currentItem.id} className="motion-safe:animate-fade-up text-[24px] font-extrabold leading-snug mb-4">{currentQuestion.q}</h2>

                        {/* Scaffolding clue for re-tests */}
                        {currentItem.isReTest && currentItem.scaffoldHint && (
                          <div className="mb-4 bg-[#FFF9E6] border-[2px] border-black p-3.5 rounded-xl text-[13px] font-bold shadow-[2px_2px_0px_#000] flex items-start gap-2.5">
                            <span className="material-symbols-outlined text-[#F5A623] text-[20px] shrink-0">psychology</span>
                            <div>
                              <span className="text-[#B45309] text-[10px] font-black uppercase tracking-wider block mb-0.5">Rex Recall Scaffolding</span>
                              <p className="text-black font-extrabold tracking-wide">{currentItem.scaffoldHint}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Options / Input Field */}
                      {isMc ? (
                        <div className="grid grid-cols-2 gap-4 mb-6">
                          {(currentQuestion.options || []).map((option, idx) => (
                    <QuizAnswer
                      key={`${currentItem.id}-${idx}`}
                      index={idx}
                      selected={selectedOption === idx}
                      answered={hasAnsweredCurrent}
                      correct={currentQuestion.correct === idx}
                      onSelect={() => setSelectedOption(idx)}
                    >{option}</QuizAnswer>
                  ))}
                        </div>
                      ) : (
                        <div className="mb-6">
                          <input 
                            type="text" 
                            value={textInput} 
                            disabled={hasAnsweredCurrent}
                            onChange={e => setTextInput(e.target.value)} 
                            aria-label="Your answer"
                  placeholder="Type your answer here..."
                            autoFocus
                            className="w-full bg-white border-[2px] border-black rounded-xl p-4.5 text-[16px] font-extrabold shadow-[4px_4px_0px_#000] focus:outline-none focus:shadow-[2px_2px_0px_#000] focus:translate-y-[2px] transition-all"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </main>
            )}

            {/* View: Results Screen */}
            {view === "results" && (
              <div className="flex flex-col bg-[#FAF7F2] items-center justify-center p-12 overflow-y-auto flex-1">
                <div className="max-w-xl w-full flex flex-col items-center text-center">
                  <div className="relative mb-6">
                    <AnimatedRex
                      state="excited"
                      size="lg"
                      interactive={true}
                      preferAnimatedWebP={true}
                    />
                  </div>
                  <h2 className="text-[36px] font-black mb-2">100% Concept Mastery!</h2>
                  <p className="text-black/60 font-bold max-w-[340px] mb-8 text-[15px]">
                    Every concept in this set was tested and retrieved until full cognitive consolidation.
                  </p>

                  {duelOpponent && (
                    <div className="w-full bg-[#FFFDF5] border-[3px] border-black shadow-[4px_4px_0px_#000] rounded-2xl p-5 mb-6 text-left">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <span className="text-[11px] font-black uppercase tracking-wider bg-[#FFD13B] border border-black px-2.5 py-0.5 rounded-md">
                          1v1 Quiz Duel Result
                        </span>
                        <span className="text-[12px] font-black text-black/60">
                          Opponent: {duelOpponent.name} ({duelOpponent.code})
                        </span>
                      </div>

                      <div className="flex items-center justify-around gap-4 py-3 border-y-2 border-black/10">
                        <div className="flex flex-col items-center">
                          <span className="text-[11px] font-black uppercase text-black/50">You</span>
                          <span className="text-[24px] font-black text-[#16a34a]">{score} / {totalInitialCount}</span>
                          <span className="text-[11px] font-bold text-black/60">{totalInitialCount > 0 ? Math.round((score / totalInitialCount) * 100) : 100}%</span>
                        </div>

                        <div className="text-[22px] font-black text-[#FF4D2E]">VS</div>

                        <div className="flex flex-col items-center">
                          <span className="text-[11px] font-black uppercase text-black/50">{duelOpponent.name}</span>
                          <span className="text-[24px] font-black text-black/70">
                            {Math.min(totalInitialCount, Math.max(1, Math.round(totalInitialCount * 0.75)))} / {totalInitialCount}
                          </span>
                          <span className="text-[11px] font-bold text-black/60">Target Benchmark</span>
                        </div>
                      </div>

                      <div className="mt-3 text-center">
                        <span className="inline-block px-3.5 py-1 bg-black text-white rounded-xl text-[12px] font-black tracking-wide">
                          {score >= Math.round(totalInitialCount * 0.75) ? "Duel Victory! You outperformed the benchmark!" : "Duel Completed! Keep sharpening your recall!"}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="w-full bg-white border-[3px] border-black shadow-[5px_5px_0px_#000] rounded-2xl p-6 flex flex-col gap-4 text-left mb-8">
                    <div className="flex justify-between items-center border-b border-black/10 pb-4">
                      <span className="font-extrabold text-black/50 text-[13px] uppercase tracking-widest">Mastery Level</span>
                      <span className="text-[#16a34a] text-[28px] font-black">100% Mastered</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-black/10 pb-4">
                      <span className="font-extrabold text-black/50 text-[13px] uppercase tracking-widest">Best Combo Streak</span>
                      <span className="text-[#FF4D2E] text-[20px] font-black flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[18px] text-[#FF4D2E]" aria-hidden="true">
                          local_fire_department
                        </span>
                        <span>{highestStreak} in a row</span>
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b border-black/10 pb-4">
                      <span className="font-extrabold text-black/50 text-[13px] uppercase tracking-widest">First-Pass Accuracy</span>
                      <span className="text-[18px] font-extrabold">
                        {totalInitialCount > 0 ? Math.round((score / totalInitialCount) * 100) : 0}% ({score}/{totalInitialCount})
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-black/50 text-[13px] uppercase tracking-widest">Rewards Unlocked</span>
                      <span className="text-[#F5A623] font-black text-[16px]">
                        +<AnimatedNumber value={totalInitialCount * 30 + 20} /> XP / +{totalInitialCount * 15 + 10} Coins
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-4 w-full">
                    <button 
                      onClick={() => {
                        playPop();
                        localStorage.removeItem("pz_duel_opponent");
                        setDuelOpponent(null);
                        setView("quiz");
                        setAdaptiveQueue([]);
                        setTotalInitialCount(0);
                        setMasteredCount(0);
                        setScore(0);
                        setComboStreak(0);
                        setQuestions([]);
                        setAnswers([]);
                      }}
                      className="flex-1 bg-white border-[3px] border-black text-black py-4 font-extrabold hover:bg-[#E2E2E2] active:translate-y-0.5 shadow-[3px_3px_0px_#000] text-[15px] cursor-pointer rounded-xl"
                    >
                      New Quiz
                    </button>
                    <button 
                      onClick={() => navigate("/dashboard")}
                      className="flex-1 bg-[#10B981] hover:bg-[#059669] border-[3px] border-black text-white py-4 font-black hover:opacity-95 active:translate-y-0.5 shadow-[3px_3px_0px_#000] text-[15px] cursor-pointer rounded-xl flex items-center justify-center gap-2 uppercase tracking-wider"
                    >
                      <span>Continue to Learning Path</span>
                      <span className="material-symbols-outlined text-[20px]" aria-hidden="true">arrow_forward</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Desktop Feedback Drawer */}
            {view === "quiz" && adaptiveQueue.length > 0 && !isGenerating && (
              renderFeedback()
            )}
          </div>

          {/* Desktop Quiz History Sidebar: only shown when not in an active quiz */}
          {(adaptiveQueue.length === 0 || isGenerating) && (
            <aside className="w-[280px] border-l-2 border-black bg-white flex flex-col shrink-0" style={{ minHeight: "100vh" }}>
              <HistoryDrawerContent />
            </aside>
          )}
        </div>
      </div>

      {/* ══ MOBILE VIEW ══════════════════════════════════════════════════════ */}
      <div className="md:hidden w-full min-h-screen bg-[#FAF7F2] flex flex-col pb-24">
        {/* Header */}
        <header className="w-full sticky top-0 z-40 bg-[#FAF7F2] border-b-[2px] border-black flex items-center justify-between px-4 h-16 shrink-0">
          <button 
            onClick={() => {
              if (adaptiveQueue.length > 0 && masteredCount < totalInitialCount) {
                if (window.confirm("Leave this lesson? Your progress for this session will be lost.")) {
                  localStorage.removeItem('pz_practice_queue');
                  localStorage.removeItem('pz_practice_questions');
                  navigate("/dashboard");
                }
              } else {
                navigate("/dashboard");
              }
            }}
            aria-label="Exit Lesson"
            className="w-11 h-11 rounded-full border-[1.5px] border-black bg-white flex items-center justify-center shadow-[2px_2px_0px_#000] active:translate-y-0.5 cursor-pointer font-black text-[16px]"
          >
            {adaptiveQueue.length > 0 ? (
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">close</span>
            ) : (
              <span className="material-symbols-outlined text-[22px]" aria-hidden="true">arrow_back</span>
            )}
          </button>
          
          <div className="flex items-center gap-1.5 font-black text-[16px] truncate max-w-[200px]">
            <span className="truncate">{adaptiveQueue.length > 0 && currentQuestion ? currentQuestion.subject : "Practice"}</span>
            {comboStreak > 1 && (
              <span className="bg-[#FFF275] border border-black rounded-full px-2 py-0.5 text-[11px] font-black shrink-0 inline-flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px] text-[#FF4D2E]" aria-hidden="true">
                  local_fire_department
                </span>
                <span>{comboStreak}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowHistory(true)}
              aria-label="Attempt History"
              className="w-11 h-11 rounded-full border-[1.5px] border-black bg-white flex items-center justify-center shadow-[2px_2px_0px_#000] active:translate-y-0.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">history</span>
            </button>
            <button 
              onClick={() => tutorial.show()} 
              aria-label="Practice Tutorial"
              className="w-11 h-11 rounded-full border-[1.5px] border-black bg-white flex items-center justify-center shadow-[2px_2px_0px_#000] active:translate-y-0.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">help</span>
            </button>
          </div>
        </header>

        {/* Mobile View: Quiz or Results */}
        {view === "quiz" && (
          <>
            <main className="w-full px-4 py-5 flex flex-col gap-4 flex-1">
              
              {/* Mobile 1v1 Quiz Duel Banner */}
              {duelOpponent && (
                <div className="bg-[#FFD13B] border-2 border-black rounded-xl p-3 shadow-[2px_2px_0px_#1A1A1A] flex items-center justify-between gap-2.5 animate-in fade-in">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-white border border-black flex items-center justify-center text-[20px] overflow-hidden shrink-0">
                      {duelOpponent.avatar?.startsWith("/") || duelOpponent.avatar?.startsWith("http") ? (
                        <img src={duelOpponent.avatar} alt={duelOpponent.name} className="w-full h-full object-cover" />
                      ) : (
                        <img src="/buddies/fox_scholar.png" alt={duelOpponent.name} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[9.5px] font-black uppercase text-black/70 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">sports_kabaddi</span>
                        <span>1v1 Quiz Duel</span>
                      </div>
                      <div className="text-[13px] font-black text-black truncate leading-tight">
                        vs {duelOpponent.name}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.removeItem("pz_duel_opponent");
                      setDuelOpponent(null);
                    }}
                    className="text-[10.5px] font-bold text-black/55 hover:text-red-600 underline cursor-pointer shrink-0"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Mobile Generator Banner: only when no active quiz */}
              {(adaptiveQueue.length === 0 || isGenerating) && (
                <section className="w-full bg-white rounded-xl border-2 border-black p-4 flex flex-col gap-3 shrink-0 shadow-[2px_2px_0px_#000]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#FF4D2E] text-[22px]" aria-hidden="true">school</span>
                      <span className="font-extrabold text-[14px] uppercase tracking-wider text-[#FF4D2E]">Quiz Generator</span>
                    </div>
                    <span className="px-2 py-0.5 bg-[#FFF275] border border-black rounded text-[9px] font-black uppercase">
                      Adaptive
                    </span>
                  </div>

                  <textarea
                    value={topicInput}
                    onChange={e => setTopicInput(e.target.value)}
                    className="w-full h-20 bg-[#FAF7F2] border-2 border-black rounded-lg p-3 text-[13px] font-medium resize-none focus:outline-none"
                    placeholder="Paste notes or type a topic..."
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-black/40 shrink-0">Questions</span>
                    <div className="flex border-2 border-black rounded-lg overflow-hidden">
                      {QUESTION_COUNT_OPTIONS.map((n, i) => (
                        <button
                          key={n}
                          onClick={() => setQuestionCount(n)}
                          className={`px-3 py-1 text-[12px] font-extrabold transition-colors ${i > 0 ? "border-l-2 border-black" : ""} ${
                            questionCount === n ? "bg-black text-white" : "bg-white text-black"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>

                    <span className="text-[10px] font-black uppercase tracking-widest text-black/40 shrink-0 ml-1">Type</span>
                    <select
                      value={quizType}
                      onChange={(e) => setQuizType(e.target.value)}
                      className="border-2 border-black rounded-lg px-2 py-1 bg-white text-[12px] font-extrabold focus:outline-none cursor-pointer"
                    >
                      <option value="mixed">Mixed</option>
                      <option value="multiple-choice">MC</option>
                      <option value="identification">Ident</option>
                      <option value="fill-in-the-blank">Blank</option>
                    </select>

                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      className="border-2 border-black rounded-lg px-2 py-1 bg-white text-[12px] font-extrabold focus:outline-none cursor-pointer"
                    >
                      <option value="mixed">All Diff</option>
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center px-1">
                      <span className="text-[11px] font-black uppercase tracking-widest text-black/40">Source Context</span>
                      <button 
                        onClick={() => navigate("/library")}
                        className="text-[10px] font-bold text-[#FF4D2E] hover:underline flex items-center"
                      >
                        <span className="material-symbols-outlined text-[12px] mr-1" aria-hidden="true">add_circle</span>
                        Add Source
                      </button>
                    </div>
                    <select
                      value={activeSourceObj ? activeSourceObj.id : "all"}
                      onChange={(e) => {
                        if (e.target.value === "all") {
                          setActiveSourceObj(null);
                        } else {
                          const source = (libraryFiles || []).find((f: any) => f.id === e.target.value);
                          setActiveSourceObj(source);
                        }
                      }}
                      className="w-full border-2 border-black rounded-lg px-3 py-2 bg-[#F0EDE0] text-[12px] font-bold focus:outline-none cursor-pointer"
                    >
                      <option value="all">General Study (No Source)</option>
                      {(libraryFiles || []).map((file: any) => (
                        <option key={file.id} value={file.id}>{file.name}</option>
                      ))}
                    </select>

                    <button 
                      onClick={handleGenerateQuiz} 
                      disabled={isGenerating}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-[#FF4D2E] text-white rounded-lg border-2 border-black shadow-[2px_2px_0px_#000] text-[13px] font-extrabold active:translate-y-0.5 active:shadow-none transition-all"
                    >
                      <span className="material-symbols-outlined text-[16px]" aria-hidden="true">bolt</span>
                      {isGenerating ? "Building Quiz..." : "Generate Mastery Quiz"}
                    </button>
                  </div>
                </section>
              )}

              {/* Mobile Loading */}
              {isGenerating && (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <QuizSkeleton />
                  <p className="font-extrabold text-[13px] text-black/50">Building adaptive quiz...</p>
                </div>
              )}

              {adaptiveQueue.length === 0 && !isGenerating && (
                <EmptyStudyState onStart={() => navigate("/dashboard")} />
              )}

              {/* Mobile Active Question Card */}
              {adaptiveQueue.length > 0 && !isGenerating && currentQuestion && (
                <>
                  {/* Top Mobile Bar */}
                  <div className="flex items-center justify-between w-full">
                    <div className="bg-white px-3 py-1 rounded-full border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-1.5 text-[12px] font-bold">
                      <span className="material-symbols-outlined text-[14px] text-[#FF4D2E]">timer</span>
                      {formatTime(timeLeft)}
                    </div>

                    <div className="font-extrabold text-[13px]">
                      Mastered: <span className="text-[#16a34a] font-black">{masteredCount}</span> / {totalInitialCount}
                    </div>
                  </div>

                  <Progress value={progressPercent} aria-label="Lesson mastery" className="h-3.5 border-2 border-black bg-[#E8E4DC] [&>div]:bg-[#10B981]" />

                  {/* Re-test notice */}
                  {currentItem.isReTest && (
                    <div className="bg-[#FFD13B] border-2 border-black px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]" aria-hidden="true">refresh</span>
                        <span>Recall Retry · Q#{currentItem.originalIndex + 1}</span>
                      </span>
                      <span>Attempt #{currentItem.attempts + 1}</span>
                    </div>
                  )}

                  {/* Card */}
                  <div className="bg-white rounded-2xl border-2 border-black shadow-[3px_3px_0px_#000] p-5 relative">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2.5 py-0.5 bg-[#FAF7F2] border border-black rounded-full text-[10px] font-bold uppercase">
                          {currentQuestion.subject}
                        </span>
                        <span className="px-2.5 py-0.5 bg-[#FFD13B] border-2 border-black rounded-lg text-[10px] font-black uppercase shadow-[1px_1px_0px_#000]">
                          {currentQuestion.difficulty}
                        </span>
                      </div>
                    </div>

                    <h2 key={currentItem.id} className="motion-safe:animate-fade-up font-extrabold leading-snug text-[16px] mb-3">{currentQuestion.q}</h2>

                    {currentItem.isReTest && currentItem.scaffoldHint && (
                      <div className="mb-3 bg-[#FFF9E6] border border-black p-2.5 rounded-lg text-[12px] font-bold">
                        <span className="text-[#B45309] text-[10px] font-black uppercase block">Rex Recall Scaffolding</span>
                        {currentItem.scaffoldHint}
                      </div>
                    )}
                  </div>

                  {/* Options */}
                  <div className="flex flex-col gap-2.5">
                    {isMc ? (
                      (currentQuestion.options || []).map((option, idx) => (
                    <QuizAnswer
                      key={`${currentItem.id}-${idx}`}
                      index={idx}
                      selected={selectedOption === idx}
                      answered={hasAnsweredCurrent}
                      correct={currentQuestion.correct === idx}
                      onSelect={() => setSelectedOption(idx)}
                    >{option}</QuizAnswer>
                  ))
                    ) : (
                      <input 
                        type="text" 
                        value={textInput} 
                        disabled={hasAnsweredCurrent}
                        onChange={e => setTextInput(e.target.value)} 
                        aria-label="Your answer"
                  placeholder="Type your answer here..."
                        className="w-full bg-white border-2 border-black rounded-xl p-4 text-[14px] font-bold shadow-[2px_2px_0px_#000] focus:outline-none"
                      />
                    )}
                  </div>
                </>
              )}
            </main>

            {/* Mobile Feedback Drawer */}
            {adaptiveQueue.length > 0 && !isGenerating && (
              renderFeedback()
            )}
          </>
        )}

        {/* Mobile View: Results */}
        {view === "results" && (
          <main className="flex-1 w-full px-5 py-8 flex flex-col items-center justify-center text-center overflow-y-auto">
            <div className="mb-4">
              <AnimatedRex
                state="excited"
                size="md"
                interactive={true}
                preferAnimatedWebP={true}
              />
            </div>
            <h2 className="font-black mb-1.5 text-[24px]">100% Mastery!</h2>
            <p className="text-black/50 font-bold max-w-[280px] mb-6 text-[13px]">
              Quiz completed through the adaptive recall engine.
            </p>

            {duelOpponent && (
              <div className="w-full bg-[#FFFDF5] border-2 border-black shadow-[3px_3px_0px_#000] rounded-xl p-4 mb-4 text-left">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-[#FFD13B] border border-black px-2 py-0.5 rounded">
                    1v1 Duel Result
                  </span>
                  <span className="text-[11px] font-black text-black/60 truncate max-w-[130px]">
                    vs {duelOpponent.name}
                  </span>
                </div>

                <div className="flex items-center justify-around gap-2 py-2 border-y border-black/10">
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-black uppercase text-black/50">You</span>
                    <span className="text-[20px] font-black text-[#16a34a]">{score}/{totalInitialCount}</span>
                  </div>
                  <div className="text-[16px] font-black text-[#FF4D2E]">VS</div>
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-black uppercase text-black/50">{duelOpponent.name}</span>
                    <span className="text-[20px] font-black text-black/70">
                      {Math.min(totalInitialCount, Math.max(1, Math.round(totalInitialCount * 0.75)))}/{totalInitialCount}
                    </span>
                  </div>
                </div>

                <div className="mt-2 text-center">
                  <span className="inline-block px-2.5 py-0.5 bg-black text-white rounded text-[11px] font-black">
                    {score >= Math.round(totalInitialCount * 0.75) ? "Duel Victory!" : "Duel Completed!"}
                  </span>
                </div>
              </div>
            )}

            <div className="w-full bg-white border-2 border-black rounded-2xl p-5 shadow-[4px_4px_0px_#000] flex flex-col gap-4 text-left mb-8">
              <div className="flex justify-between items-center border-b pb-2.5">
                <span className="font-extrabold text-black/50 text-[12px] uppercase tracking-widest">Mastery</span>
                <span className="text-[#16a34a] text-[20px] font-black">100% Mastered</span>
              </div>
              <div className="flex justify-between items-center border-b pb-2.5">
                <span className="font-extrabold text-black/50 text-[12px] uppercase tracking-widest">Best Streak</span>
                <span className="text-[#FF4D2E] text-[16px] font-black flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-[#FF4D2E]" aria-hidden="true">
                    local_fire_department
                  </span>
                  <span>{highestStreak} in a row</span>
                </span>
              </div>
              <div className="flex justify-between items-center border-b pb-2.5">
                <span className="font-extrabold text-black/50 text-[12px] uppercase tracking-widest">First Pass</span>
                <span className="text-[14px] font-bold">{score} / {totalInitialCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-black/50 text-[12px] uppercase tracking-widest">Rewards</span>
                <span className="text-[#F5A623] font-bold text-[14px]">+<AnimatedNumber value={totalInitialCount * 30 + 20} /> XP / +{totalInitialCount * 15 + 10} Coins</span>
              </div>
            </div>

            <div className="flex gap-3 w-full">
              <button 
                onClick={() => {
                  playPop();
                  localStorage.removeItem("pz_duel_opponent");
                  setDuelOpponent(null);
                  setView("quiz");
                  setAdaptiveQueue([]);
                  setTotalInitialCount(0);
                  setMasteredCount(0);
                  setScore(0);
                  setComboStreak(0);
                  setQuestions([]);
                  setAnswers([]);
                }}
                className="flex-1 bg-white border-2 border-black py-3.5 rounded-xl font-bold active:translate-y-0.5 shadow-[2px_2px_0px_#000] text-[13px] cursor-pointer"
              >
                New Quiz
              </button>
              <button 
                onClick={() => navigate("/dashboard")}
                className="flex-1 bg-[#10B981] hover:bg-[#059669] border-2 border-black text-white py-3.5 rounded-xl font-black active:translate-y-0.5 shadow-[2px_2px_0px_#000] text-[13px] cursor-pointer uppercase tracking-wider flex items-center justify-center gap-1.5"
              >
                <span>Continue</span>
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_forward</span>
              </button>
            </div>
          </main>
        )}
      </div>
    </>
  );
}
