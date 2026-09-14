import { useNavigate } from "react-router-dom";
import { SharedSidebar } from "@/components/SharedSidebar";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { loadLibrary, onSourceChange } from "@/lib/sourceContext";
import { usePlan } from "@/hooks/usePlan";
import { useStudySession } from "@/hooks/useStudySession";
import UpgradePrompt from "@/components/UpgradePrompt";
import { callGroq, safeParseJSON } from "@/lib/groq";
import { supabase } from "@/lib/supabase";
import { useToolHistory } from "@/pages/ToolHistory";
import { logQuestCompletion } from "@/lib/quests";

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface Question {
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

interface HistoryEntry {
  prompt?: string;
  preview?: string;
  meta?: string;
  output?: string;
  createdAt?: string;
  created_at?: string;
}

// FIX: history entries previously only stored the raw selected-answer
// indices in `output` (e.g. "[1,0,2]") with no question text, options, or
// correct answers alongside them — there was no way to reconstruct a
// review even if a detail view existed. `output` now stores the full
// question set together with the student's answers so history can show
// a real question-by-question breakdown.
interface ReviewData {
  questions: Question[];
  answers: number[];
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

// ─── Helpers (outside component — stable, never recreated) ───────────────────
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

// ─── Sub-components (outside — React never remounts them on re-render) ────────

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
}
const QUESTION_COUNT_OPTIONS = [3, 5, 10, 15];
function DesktopBanner({ isGenerating, topicInput, setTopicInput, onGenerate, onNavigate, libraryFiles, questionCount, setQuestionCount, activeSourceObj, setActiveSourceObj, quizType, setQuizType, difficulty, setDifficulty }: BannerProps) {
  return (
    <div className="max-w-4xl mx-auto w-full mb-8 bg-white border-[1.5px] border-black p-6 flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-[#FF4D2E] text-[22px]">school</span>
            <h2 className="font-extrabold text-[20px]">Quiz Generator</h2>
          </div>
          <p className="text-[13px] text-black/60 font-bold">Create custom quizzes instantly.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex flex-col items-end gap-1">
            <button 
              onClick={() => onNavigate("/library")}
              className="text-[10px] font-bold text-[#FF4D2E] hover:underline flex items-center"
            >
              <span className="material-symbols-outlined text-[12px] mr-1">add_circle</span>
              Add Source
            </button>
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
              className="border-[1.5px] border-black px-3 py-1.5 bg-[#F0EDE0] text-[12px] font-bold hover:bg-black hover:text-white transition-colors cursor-pointer focus:outline-none"
            >
              <option value="all">General Study (No Source)</option>
              {(libraryFiles || []).map((file: any) => (
                <option key={file.id} value={file.id}>{file.name}</option>
              ))}
            </select>
          </div>
          <button onClick={onGenerate} disabled={isGenerating}
            className="flex items-center gap-2 bg-[#FF4D2E] text-white font-extrabold text-[13px] px-6 py-2.5 border-[1.5px] border-black shadow-[3px_3px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer hover:opacity-90 rounded-lg disabled:opacity-60">
            <span className="material-symbols-outlined text-[18px]">edit_document</span>
            {isGenerating ? "Generating..." : "Generate Quiz via AI"}
          </button>
        </div>
      </div>
      <textarea
        value={topicInput}
        onChange={e => setTopicInput(e.target.value)}
        className="w-full h-[100px] p-4 bg-[#FAF7F2] border-[1.5px] border-black rounded-xl text-[14px] font-medium focus:outline-none focus:ring-2 focus:ring-[#FF4D2E]/20 resize-none transition-all"
        placeholder="Paste your notes or type a topic to generate a custom quiz..."
      />
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[11px] font-black uppercase tracking-widest text-black/40">Questions</span>
        <div className="flex border-[1.5px] border-black rounded-lg overflow-hidden">
          {QUESTION_COUNT_OPTIONS.map((n, i) => (
            <button
              key={n}
              onClick={() => setQuestionCount(n)}
              className={`px-4 py-1.5 text-[13px] font-extrabold transition-colors ${i > 0 ? "border-l-[1.5px] border-black" : ""} ${
                questionCount === n ? "bg-black text-white" : "bg-white text-black hover:bg-[#F0EDE0]"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <span className="text-[11px] font-black uppercase tracking-widest text-black/40 ml-4">Type</span>
        <select
          value={quizType}
          onChange={(e) => setQuizType(e.target.value)}
          className="border-[1.5px] border-black rounded-lg px-3 py-1.5 bg-white text-[13px] font-extrabold focus:outline-none cursor-pointer"
        >
          <option value="mixed">Mixed</option>
          <option value="multiple-choice">Multiple Choice</option>
          <option value="identification">Identification</option>
          <option value="fill-in-the-blank">Fill-in-the-Blank</option>
        </select>
          <span className="text-[11px] font-black uppercase tracking-widest text-black/40 ml-4">Difficulty</span>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="border-[1.5px] border-black rounded-lg px-3 py-1.5 bg-white text-[13px] font-extrabold focus:outline-none cursor-pointer"
          >
            <option value="mixed">Mixed</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
      </div>
    </div>
  );
}

function HistoryCard({ entry, onOpenReview }: { entry: HistoryEntry; onOpenReview: (entry: HistoryEntry) => void }) {
  const { pct, ringColor, ringBg, timeAgo, title, correct, total } = parseHistoryEntry(entry);
  return (
    <button
      onClick={() => onOpenReview(entry)}
      className="w-full bg-white border-[1.5px] border-black p-4 rounded-xl flex items-start gap-3 hover:bg-[#F0EDE0] transition-colors cursor-pointer active:translate-y-0.5 text-left"
    >
      <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 border-2 font-extrabold text-[13px]"
        style={{ background: ringBg, borderColor: ringColor, color: ringColor }}>
        {pct}%
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-extrabold text-[13px] leading-snug line-clamp-2 mb-1">{title}</p>
        <p className="text-[11px] text-black/40 font-bold">{correct}/{total} correct{timeAgo ? ` · ${timeAgo}` : ""}</p>
      </div>
      <span className="material-symbols-outlined text-[18px] text-black/20 self-center shrink-0">chevron_right</span>
    </button>
  );
}


// ─── Main Component ───────────────────────────────────────────────────────────
export default function Practice() {
  const { isPro, canUse, logUsage } = usePlan();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const navigate = useNavigate();
  const { user, profile, refreshProfile, addXP } = useAuth();
  const { logSession } = useStudySession();
  const { save: saveHistory, entries: historyEntries = [] } = useToolHistory("practice") as any;

  const [view, setView]                     = useState<"quiz" | "results">(() => localStorage.getItem('pz_practice_view') as any || "quiz");
  const [currentQIndex, setCurrentQIndex]   = useState(() => parseInt(localStorage.getItem('pz_practice_index') || '0', 10));
  const [selectedOption, setSelectedOption] = useState<number | null>(() => {
    const s = localStorage.getItem('pz_practice_selected');
    return s ? parseInt(s, 10) : null;
  });
  const [timeLeft, setTimeLeft]             = useState(() => parseInt(localStorage.getItem('pz_practice_time') || '600', 10));
  const [score, setScore]                   = useState(() => parseInt(localStorage.getItem('pz_practice_score') || '0', 10));
  const [answers, setAnswers]               = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem('pz_practice_answers') || '[]'); } catch { return []; }
  });
  const [isGenerating, setIsGenerating]     = useState(false);
  const [questions, setQuestions]           = useState<Question[]>(() => {
    try { return JSON.parse(localStorage.getItem('pz_practice_questions') || '[]'); } catch { return []; }
  });
  const [topicInput, setTopicInput]         = useState(() => localStorage.getItem('pz_practice_topic') || "");
  const [questionCount, setQuestionCount]   = useState(() => parseInt(localStorage.getItem('pz_practice_count') || '3', 10));
  const [libraryFiles, setLibraryFiles]     = useState<any[]>([]);
  const [activeSourceObj, setActiveSourceObj] = useState<any>(null);
  const [quizType, setQuizType]             = useState<string>("mixed");
  const [difficulty, setDifficulty] = useState<string>("mixed");

  useEffect(() => {
    localStorage.setItem('pz_practice_view', view);
    localStorage.setItem('pz_practice_index', currentQIndex.toString());
    localStorage.setItem('pz_practice_selected', selectedOption !== null ? selectedOption.toString() : '');
    localStorage.setItem('pz_practice_time', timeLeft.toString());
    localStorage.setItem('pz_practice_score', score.toString());
    localStorage.setItem('pz_practice_answers', JSON.stringify(answers));
    localStorage.setItem('pz_practice_questions', JSON.stringify(questions));
    localStorage.setItem('pz_practice_topic', topicInput);
    localStorage.setItem('pz_practice_count', questionCount.toString());
  }, [view, currentQIndex, selectedOption, timeLeft, score, answers, questions, topicInput, questionCount]);
  const [isReviewLoop, setIsReviewLoop] = useState(false);
  const [missedQuestions, setMissedQuestions] = useState<number[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [hasAnsweredCurrent, setHasAnsweredCurrent] = useState(false);
  const [isCurrentCorrect, setIsCurrentCorrect] = useState<boolean | null>(null);
  const [showReviewTransition, setShowReviewTransition] = useState(false);
  const [showProUpsell, setShowProUpsell] = useState(false);
  const [textAnswers, setTextAnswers] = useState<string[]>([]);
  const [textInput, setTextInput] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [reviewEntry, setReviewEntry] = useState<HistoryEntry | null>(null);

  // Handle export from Quick Study
  useEffect(() => {
    const exportedData = localStorage.getItem("qs_practice_export");
    if (exportedData) {
      try {
        const material = JSON.parse(exportedData);
        setTopicInput(material);
        setQuestionCount(5);
        localStorage.removeItem("qs_practice_export");
      } catch (err) {
        console.error("Failed to parse QS practice export", err);
      }
    }
  }, []);


  useEffect(() => {
    const sync = () => setLibraryFiles(loadLibrary());
    sync();
    const unsub = onSourceChange(sync);
    window.addEventListener("focus", sync);
    return () => { unsub(); window.removeEventListener("focus", sync); };
  }, []);

  useEffect(() => {
    if (view !== "quiz" || questions.length === 0) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [view, questions.length]);

  // FIX: Practice used to rely on a single manually-picked "active source"
  // file via getActiveSource()/buildAIContext() — the student had to open a
  // dropdown and choose one file from the Source Library before every quiz.
  // This now reads every file currently in the Source Library automatically,
  // same as Quick Study, so there's nothing to pick.
  const MAX_CHARS_PER_SOURCE = 5000;
  const MAX_SOURCES = 5;
  const buildAllSourcesContext = (files: any[]): string => {
    const usable = files.filter((f) => f.fullText || f.preview);
    if (usable.length === 0) return "";
    const parts = usable.slice(0, MAX_SOURCES).map((f) => {
      if (f.type === "image/jpeg" || f.type === "image/png") {
        return `=== SOURCE: ${f.name} ===\n[Camera capture image — text not available]`;
      }
      const raw = f.fullText || f.preview || "";
      const text =
        raw.length > MAX_CHARS_PER_SOURCE ? raw.slice(0, MAX_CHARS_PER_SOURCE) + "\n[…truncated]" : raw;
      return `=== SOURCE: ${f.name} ===\n${text}`;
    });
    if (parts.length === 0) return "";
    return `\n\n--- STUDY SOURCES (base your questions on this material) ---\n${parts.join("\n\n")}\n--- END SOURCES ---`;
  };

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
          console.warn("Failed to check plan limits, allowing fallback:", planErr);
        }
      }

      const sourceText = activeSourceObj 
        ? `=== SOURCE: ${activeSourceObj.name} ===\n${activeSourceObj.fullText || activeSourceObj.preview || "[No text available]"}`
        : "";
      const topicHint  = topicInput.trim();
      
      const typeInstruct = quizType === "mixed" 
        ? 'any combination of "multiple-choice", "identification", and "fill-in-the-blank" questions'
        : `only "${quizType}" questions`;
      
      const promptText = sourceText
        ? `Generate a set of ${questionCount || 3} interesting, high-quality quiz questions (${typeInstruct}, ${diffInstruct}) based on the following student resource:\n\n---\n${sourceText}\n---\n${topicHint ? `\nFocus especially on: ${topicHint}` : ""}`
        : topicHint
          ? `Generate ${questionCount || 3} high-quality educational quiz questions (${typeInstruct}, ${diffInstruct}) about: ${topicHint}`
          : `Generate ${questionCount || 3} high-quality educational quiz questions (${typeInstruct}, ${diffInstruct}) across academic curriculum subjects like Math, Chemistry, and History.`;

      const systemPrompt = `You are a strict JSON api generator. You MUST respond with a valid JSON array of exactly ${questionCount || 3} questions. Do NOT write any introduction or explanation markdown blocks outside the JSON array of objects.
We support three question types: "multiple-choice", "identification", and "fill-in-the-blank".
For this request, you must generate ${typeInstruct} with ${diffInstruct}.
Each object MUST match this schema exactly:
{
  "type": "multiple-choice" | "identification" | "fill-in-the-blank",
  "q": "Question text or sentence with a ______ for blanks.",
  "options": ["A","B","C","D"], // ONLY for multiple-choice, otherwise null
  "correct": 0, // For multiple-choice, index of correct option.
  "answerText": "Exact word", // For identification or fill-in-the-blank
  "subject": "Subject",
  "difficulty": "Easy, Medium or Hard",
  "hint": "A short helpful hint.",
  "explanation": "Why the answer is correct."
}`;

      const aiResponse = await callGroq(
        [{ role: "user", content: promptText }],
        systemPrompt,
        "openai/gpt-oss-20b",
        Math.min(4096, 300 + (questionCount || 3) * 300),
        "practice"
      );

      const parsed = safeParseJSON<any[]>(aiResponse);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setQuestions(parsed);
        logSession({ title: `Practice: ${topicHint || "General Quiz"}`, durationMinutes: Math.ceil((questionCount || 3) * 1.5) }); 
        try { await logUsage("practice"); } catch {};
        setCurrentQIndex(0);
        setSelectedOption(null);
        setAnswers([]);
        setTextAnswers([]);
        setScore(0);
        setMissedQuestions([]);
        setIsReviewLoop(false);
        setReviewIndex(0);
        setTextInput("");
        setHasAnsweredCurrent(false);
        setIsCurrentCorrect(null);
        setTimeLeft(Math.max(300, parsed.length * 90));
        setView("quiz");
      } else throw new Error("Invalid structure from AI. Please try again.");
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

  const validateText = (input: string, expected: string) => {
    if (!input || !expected) return false;
    const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    return clean(input) === clean(expected);
  };

  const handleNext = () => {
    const actualQIndex = isReviewLoop ? missedQuestions[reviewIndex] : currentQIndex;
    const question = questions[actualQIndex];
    
    let isCorrect = false;
    let savedAnswer: any = null;

    if (question.type === "identification" || question.type === "fill-in-the-blank") {
      if (!textInput.trim()) return;
      isCorrect = validateText(textInput, question.answerText || (question as any).answer || "");
      savedAnswer = textInput;
    } else {
      if (selectedOption === null) return;
      isCorrect = selectedOption === question.correct;
      savedAnswer = selectedOption;
    }

    if (!isReviewLoop) {
      setAnswers(prev => [...prev, typeof savedAnswer === "number" ? savedAnswer : -1]);
      setTextAnswers(prev => [...prev, typeof savedAnswer === "string" ? savedAnswer : ""]);
      if (isCorrect) {
        setScore(prev => prev + 1);
      }
    }

    let newMissed = [...missedQuestions];
    if (isCorrect) {
      if (isReviewLoop) {
        newMissed = newMissed.filter(idx => idx !== actualQIndex);
      }
    } else {
      if (!isReviewLoop) {
        newMissed.push(actualQIndex);
      }
    }
    setMissedQuestions(newMissed);

    if (!isReviewLoop) {
      if (currentQIndex + 1 < questions.length) {
        setCurrentQIndex(prev => prev + 1);
        setSelectedOption(null);
        setTextInput("");
      } else {
        if (newMissed.length > 0) {
          setShowReviewTransition(true);
        } else {
          setIsReviewLoop(false);
          finalizeQuiz(score + (isCorrect ? 1 : 0));
        }
      }
    } else {
      if (newMissed.length === 0) {
        setIsReviewLoop(false);
        finalizeQuiz(score);
      } else {
        const nextIdx = reviewIndex + 1;
        if (nextIdx < newMissed.length) {
          setReviewIndex(nextIdx);
        } else {
          setReviewIndex(0);
        }
        setSelectedOption(null);
        setTextInput("");
      }
    }
  };

  const handleCheck = () => {
    if (hasAnsweredCurrent) return; // Prevent double check

    const actualQIndex = isReviewLoop ? missedQuestions[reviewIndex] : currentQIndex;
    const question = questions[actualQIndex];
    
    let isCorrect = false;
    let savedAnswer: any = null;

    if (question.type === "identification" || question.type === "fill-in-the-blank") {
      if (!textInput.trim()) return;
      isCorrect = validateText(textInput, question.answerText || "");
      savedAnswer = textInput;
    } else {
      if (selectedOption === null) return;
      isCorrect = selectedOption === question.correct;
      savedAnswer = selectedOption;
    }

    setIsCurrentCorrect(isCorrect);
    setHasAnsweredCurrent(true);

    if (!isReviewLoop) {
      setAnswers(prev => [...prev, typeof savedAnswer === "number" ? savedAnswer : -1]);
      setTextAnswers(prev => [...prev, typeof savedAnswer === "string" ? savedAnswer : ""]);
      if (isCorrect) {
        setScore(prev => prev + 1);
      }
    }

    if (isCorrect) {
      // Correct answer
    } else {
      // Wrong answer
    }
  };

  const handleContinue = () => {
    const actualQIndex = isReviewLoop ? missedQuestions[reviewIndex] : currentQIndex;
    let newMissed = [...missedQuestions];
    
    if (isCurrentCorrect) {
      if (isReviewLoop) {
        newMissed = newMissed.filter(idx => idx !== actualQIndex);
      }
    } else {
      if (!isReviewLoop) {
        newMissed.push(actualQIndex);
      }
    }
    setMissedQuestions(newMissed);

    setShowHint(false);
    setShowExplanation(false);
    setHasAnsweredCurrent(false);
    setIsCurrentCorrect(null);
    
    if (!isReviewLoop) {
      if (currentQIndex + 1 < questions.length) {
        setCurrentQIndex(prev => prev + 1);
        setSelectedOption(null);
        setTextInput("");
      } else {
        if (newMissed.length > 0) {
          setShowReviewTransition(true);
        } else {
          setIsReviewLoop(false);
          finalizeQuiz(score + (isCurrentCorrect ? 1 : 0));
        }
      }
    } else {
      if (newMissed.length > 0) {
        setReviewIndex(prev => prev % newMissed.length);
        setSelectedOption(null);
        setTextInput("");
      } else {
        setIsReviewLoop(false);
        finalizeQuiz(score);
      }
    }
  };

  const finalizeQuiz = (finalScore: number) => {
    const xpAwarded    = finalScore * 30 + 10;
    const coinsAwarded = finalScore * 15 + 5;
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
      model:   "rex-ai",
      meta:    `${finalScore}/${questions.length}`,
    });
    setView("results");
  };

  const progressPercent  = questions.length > 0 ? Math.round(((currentQIndex + 1) / questions.length) * 100) : 0;
  const actualRenderIndex = isReviewLoop ? missedQuestions[reviewIndex] : currentQIndex;
  const currentQuestion  = questions.length > 0 && actualRenderIndex < questions.length ? questions[actualRenderIndex] : null;

  // ── RENDER ────────────────────────────────────────────────────────────────
  // HistoryDrawer — slides in from right on mobile; always visible on desktop
  const HistoryDrawerContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b-2 border-black shrink-0">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px]">history</span>
          <h3 className="text-[16px] font-extrabold">Quiz History</h3>
        </div>
        <button onClick={() => setShowHistory(false)} className="md:hidden w-8 h-8 flex items-center justify-center border-2 border-black bg-white shadow-[2px_2px_0px_#000]">
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
          <button onClick={() => navigate("/analytics")} className="w-full py-2 border-2 border-black bg-[#F0EDE0] text-[12px] font-extrabold hover:bg-black hover:text-white transition-colors">
            View All in Analytics →
          </button>
        </div>
      )}
    </div>
  );


  // FIX: history cards previously had no way to view the actual questions
  // and answers from a past attempt. This renders each question with the
  // student's chosen answer and the correct one, back-to-back.
  const ReviewModal = () => {
    if (!reviewEntry) return null;
    const { pct, title, correct, total, timeAgo } = parseHistoryEntry(reviewEntry);
    const review = parseReviewData(reviewEntry);
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50" onClick={() => setReviewEntry(null)} />
        <div className="relative bg-[#FAF7F2] border-2 border-black shadow-[6px_6px_0px_#000] w-full max-w-2xl max-h-[85vh] flex flex-col">
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
                  Detailed answers aren't available for this attempt — it was saved before question-by-question review existed. New quizzes will show the full breakdown here.
                </p>
              </div>
            ) : (
              review.questions.map((q, i) => {
                const userAnswer = review.answers[i];
                const isCorrect  = userAnswer === q.correct;
                return (
                  <div key={i} className="flex flex-col gap-2">
                    <div className="flex items-start gap-2">
                      <span className={`material-symbols-outlined text-[18px] shrink-0 mt-0.5 ${isCorrect ? "text-green-600" : "text-[#ae2925]"}`}>
                        {isCorrect ? "check_circle" : "cancel"}
                      </span>
                      <p className="font-extrabold text-[14px] leading-snug">{i + 1}. {q.q}</p>
                    </div>
                    <div className="flex flex-col gap-1.5 pl-7">
                      {q.options.map((opt, oi) => {
                        const isTheCorrectOne = oi === q.correct;
                        const isUserPick      = oi === userAnswer;
                        const style = isTheCorrectOne
                          ? "border-green-600 bg-green-50 text-green-800"
                          : isUserPick
                            ? "border-[#ae2925] bg-[#fee2e2] text-[#ae2925]"
                            : "border-black/10 bg-white text-black/60";
                        return (
                          <div key={oi} className={`flex items-center gap-2 px-3 py-1.5 border-[1.5px] rounded-lg text-[12px] font-semibold ${style}`}>
                            <span className="font-extrabold">{["A", "B", "C", "D"][oi]}</span>
                            <span className="flex-1">{opt}</span>
                            {isTheCorrectOne && <span className="text-[10px] font-black uppercase tracking-wider">Correct</span>}
                            {isUserPick && !isTheCorrectOne && <span className="text-[10px] font-black uppercase tracking-wider">Your pick</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  };


  return (
    <>
      {showProUpsell && <ProUpsellModal onClose={() => setShowProUpsell(false)} />}
      <div className="w-full bg-[#FAF7F2] flex flex-col" style={{ minHeight: "100dvh" }}>

      <ReviewModal />

      {/* ── Mobile History Drawer overlay ──────────────────────────────── */}
      {showHistory && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="flex-1 bg-black/40" onClick={() => setShowHistory(false)} />
          <div className="w-[85vw] max-w-[340px] bg-white border-l-2 border-black flex flex-col h-full shadow-[-4px_0_0_#000]">
            <HistoryDrawerContent />
          </div>
        </div>
      )}

      {/* ══ DESKTOP ══════════════════════════════════════════════════════════ */}
      <SharedSidebar active="/practice" />
      {showUpgrade && <UpgradePrompt feature="practice" remaining={0} onClose={() => setShowUpgrade(false)} />}

      <div className="hidden md:flex md:ml-64 bg-[#FAF7F2]" style={{ minHeight: "100vh" }}>
        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-y-auto">
        
        {view === "quiz" && showReviewTransition && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center z-50 bg-[#FAF7F2]">
            <div className="w-20 h-20 mb-6 bg-white border-2 border-black rounded-full shadow-[3px_3px_0px_#000] flex items-center justify-center">
              <span className="material-symbols-outlined text-[40px] text-[#FF4D2E]">refresh</span>
            </div>
            <h2 className="text-2xl font-black mb-2">Let's correct what you missed!</h2>
            <p className="text-black/60 font-bold mb-8">You missed {missedQuestions.length} question(s). Let's review them until you master them.</p>
            <button 
              onClick={() => { setShowReviewTransition(false); setIsReviewLoop(true); setReviewIndex(0); }}
              className="bg-[#FF4D2E] text-white font-extrabold px-8 py-3 rounded-xl border-2 border-black shadow-[4px_4px_0px_#000] active:translate-y-1 active:shadow-none"
            >
              Start Review →
            </button>
          </div>
        )}

        {view === "quiz" && !showReviewTransition && (
          <main className="flex-1 flex flex-col p-10 max-w-4xl mx-auto w-full">

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
            />

            {/* Loading */}
            {isGenerating && (
              <div className="flex flex-col items-center justify-center flex-1 py-24 gap-4">
                <div className="w-16 h-16 border-4 border-[#FF4D2E] border-t-transparent rounded-full animate-spin" />
                <p className="font-bold text-[14px] text-black/50">Building your quiz...</p>
              </div>
            )}

            {/* Empty + History side by side */}
            {questions.length === 0 && !isGenerating && (
              <div className="flex gap-8 flex-1">
                {/* Left: empty state */}
                <div className="flex-1 flex flex-col items-center justify-center text-center py-20 gap-4">
                  <div className="w-28 h-28 bg-[#E2E2E2] border-[1.5px] border-black shadow-[5px_5px_0px_#000] rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-[56px] text-black opacity-40" style={{ fontVariationSettings: "'FILL' 1" }}>extension_off</span>
                  </div>
                  <h2 className="font-extrabold text-[24px]">No quiz yet</h2>
                  <p className="text-black/50 font-bold text-[14px] max-w-[280px] leading-relaxed">
                    {(libraryFiles || []).length > 0
                      ? `${(libraryFiles || []).length} source${(libraryFiles || []).length > 1 ? "s" : ""} in your library — hit Generate!`
                      : "Paste your notes, type a topic, or just hit Generate for a random quiz."}
                  </p>
                </div>

                {/* History moved to persistent right panel */}
              </div>
            )}

            {/* Active Quiz */}
            {questions.length > 0 && !isGenerating && currentQuestion && (
              <>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                  <div className="flex-grow w-full md:max-w-md flex flex-col gap-2">
                    <div className="flex justify-between">
                      <span className="text-[13px] font-extrabold tracking-widest uppercase">Question {currentQIndex + 1}/{questions.length}</span>
                      <span className="text-[13px] font-extrabold">{progressPercent}%</span>
                    </div>
                    <div className="h-3 w-full bg-[#E8E4DC] border-[1.5px] border-black overflow-hidden">
                      <div className="h-full bg-black transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {(libraryFiles || []).length > 0 && (
                      <div className="flex items-center gap-2 border-[1.5px] border-black rounded-full px-3 py-1 bg-[#F0EDE0] text-[12px] font-bold">
                        <span className="material-symbols-outlined text-[16px]">description</span>
                        <span>{(libraryFiles || []).length} source{(libraryFiles || []).length > 1 ? "s" : ""} used</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 px-5 py-2 bg-[#F0EDE0] border-[1.5px] border-black shadow-[3px_3px_0px_#000]">
                      <span className="material-symbols-outlined">timer</span>
                      <span className="text-[22px] font-bold tracking-tighter">{formatTime(timeLeft)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#FAF7F2] border-[3px] border-black p-8 shadow-[5px_5px_0px_#000] mb-8 relative mt-4">
                  <div className="absolute -top-4 -left-4 bg-black text-white px-4 py-1 text-[11px] font-extrabold tracking-widest uppercase">{currentQuestion.type ? currentQuestion.type.replace(/-/g, " ") : "MULTIPLE CHOICE"}</div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="inline-flex items-center px-3 py-1 bg-[#FAF7F2] border-[1.5px] border-black rounded-full text-[11px] font-bold uppercase tracking-wider">
                      <span className="material-symbols-outlined text-[13px] mr-1">folder</span>{currentQuestion.subject}
                    </span>
                    <span className="inline-flex items-center px-3 py-1 bg-[#FAF7F2] border-[1.5px] border-black rounded-full text-[11px] font-bold uppercase tracking-wider">
                      <span className="material-symbols-outlined text-[13px] mr-1">leaderboard</span>{currentQuestion.difficulty}
                    </span>
                  </div>
                  <h2 className="text-[26px] font-extrabold leading-snug mb-4">{currentQuestion.q}</h2>
                  <div className="h-[1px] bg-black w-full opacity-10 my-4" />
                  <p className="text-[14px] opacity-60 italic">Select the most accurate response from the grid below.</p>
                </div>

                  {currentQuestion.type === "identification" || currentQuestion.type === "fill-in-the-blank" ? (
                    <div className="mb-8">
                      <input 
                        type="text" 
                        value={textInput} 
                        onChange={e => setTextInput(e.target.value)} 
                        placeholder="Type your answer here..."
                        className="w-full bg-[#FAF7F2] border-[1.5px] border-black rounded-xl p-4 text-[15px] font-bold shadow-[3px_3px_0px_#000] focus:outline-none focus:shadow-[1px_1px_0px_#000] focus:translate-y-[2px]"
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 mb-8">
                      {(currentQuestion.options || []).map((option, idx) => {
                        const label      = ["A", "B", "C", "D"][idx];
                        const isSelected = selectedOption === idx;
                        return (
                          <button key={idx} onClick={() => setSelectedOption(idx)}
                            className={`text-left border-[1.5px] border-black p-4 shadow-[3px_3px_0px_#000] active:translate-y-0.5 active:shadow-[1px_1px_0px_#000] transition-all ${isSelected ? "bg-[#FF4D2E] text-white" : "bg-[#FAF7F2] hover:bg-black hover:text-white"}`}>
                            <div className="flex items-start gap-3">
                              <span className={`text-[12px] font-extrabold px-2 py-0.5 border-[1.5px] border-black flex-shrink-0 ${isSelected ? "bg-white text-black" : "bg-black text-white"}`}>{label}</span>
                              <span className="text-[14px] font-medium leading-snug">{option}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                <div className="flex flex-col gap-3">
                  <div className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-1">Question Navigator</div>
                  <div className="flex gap-2 mb-4">
                    {questions.map((_, i) => (
                      <button key={i} className={`w-7 h-7 flex items-center justify-center text-xs font-extrabold border transition-all ${
                        i === currentQIndex         ? "bg-black text-white border-black"
                        : answers[i] !== undefined  ? "bg-[#2d6a2d] text-white border-[#2d6a2d]"
                        :                             "bg-[#E8E4DC] text-black/40 border-black/20"
                      }`}>{i + 1}</button>
                    ))}
                  </div>
                  <div className="flex justify-end">
                    <button disabled={(currentQuestion.type === 'multiple-choice' || !currentQuestion.type) ? selectedOption === null : !textInput.trim()} onClick={handleNext}
                      className={`bg-[#FF4D2E] text-white text-[18px] font-bold px-12 py-4 border-[3px] border-black shadow-[5px_5px_0px_#000] active:translate-y-0.5 active:shadow-[2px_2px_0px_#000] flex items-center gap-4 transition-all ${((currentQuestion.type === 'multiple-choice' || !currentQuestion.type) ? selectedOption === null : !textInput.trim()) ? "opacity-40 pointer-events-none" : "hover:opacity-90"}`}>
                      Next Question <span className="material-symbols-outlined text-2xl">arrow_forward</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </main>
        )}

        {view === "results" && (
          <div className="flex flex-col bg-[#FAF7F2] items-center justify-center p-12 overflow-y-auto flex-1">
          <div className="max-w-xl w-full flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-[#fca623]/20 border-[3px] border-black shadow-[5px_5px_0px_#000] flex items-center justify-center mb-8">
              <span className="material-symbols-outlined text-5xl">emoji_events</span>
            </div>
            <h2 className="text-[36px] font-black mb-2">Exam Complete!</h2>
            <p className="text-black/50 font-bold max-w-[320px] mb-8 text-[15px]">Practice test recorded. Review your detailed scores below.</p>
            <div className="w-full bg-white border-[3px] border-black shadow-[5px_5px_0px_#000] p-6 flex flex-col gap-4 text-left mb-8">
              <div className="flex justify-between items-center border-b border-black/10 pb-4">
                <span className="font-extrabold text-black/50 text-[13px] uppercase tracking-widest">SUCCESS METRIC</span>
                <span className="text-[#FF4D2E] text-[28px] font-black">{Math.round((score / questions.length) * 100)}%</span>
              </div>
              <div className="flex justify-between items-center border-b border-black/10 pb-4">
                <span className="font-extrabold text-black/50 text-[13px] uppercase tracking-widest">CORRECT HITS</span>
                <span className="text-[18px] font-bold">{score} / {questions.length} items</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-black/50 text-[13px] uppercase tracking-widest">REWARDS UNLOCKED</span>
                <span className="text-[#F5A623] font-bold text-[15px]">+{score * 30 + 10} XP / +{score * 15 + 5} Coins</span>
              </div>
            </div>
            <div className="flex gap-4 w-full">
              <button onClick={() => { setView("quiz"); setCurrentQIndex(0); setSelectedOption(null); setScore(0); setAnswers([]); setTimeLeft(600); setQuestions([]); }}
                className="flex-1 bg-white border-[3px] border-black text-black py-4 font-extrabold hover:bg-[#E2E2E2] active:translate-y-0.5 shadow-[3px_3px_0px_#000] text-[15px] cursor-pointer">
                New Quiz
              </button>
              <button onClick={() => navigate("/dashboard")}
                className="flex-1 bg-[#FF4D2E] border-[3px] border-black text-white py-4 font-extrabold hover:opacity-95 active:translate-y-0.5 shadow-[3px_3px_0px_#000] text-[15px] cursor-pointer">
                Dashboard
              </button>
            </div>
          </div>
          </div>
        )}
        </div>{/* end desktop main */}

        {/* Persistent desktop history right panel */}
        <aside className="w-[280px] border-l-2 border-black bg-white flex flex-col shrink-0" style={{ minHeight: "100vh" }}>
          <HistoryDrawerContent />
        </aside>
      </div>{/* end desktop wrapper */}

      {/* ══ MOBILE ═══════════════════════════════════════════════════════════ */}
      <div className="md:hidden w-full min-h-screen bg-[#FAF7F2] flex flex-col pb-28">

        <header className="w-full sticky top-0 z-40 bg-[#FAF7F2] border-b-[3px] border-black flex items-center justify-between px-4 h-16 shrink-0">
          <button onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full border-[1.5px] border-black bg-white flex items-center justify-center shadow-[2px_2px_0px_#000] active:translate-y-0.5">
            <span className="material-symbols-outlined text-[22px]">arrow_back</span>
          </button>
          <h1 className="font-extrabold text-[20px]">Practice</h1>
          <button onClick={() => navigate("/sources")}
            className="w-10 h-10 rounded-full border-[1.5px] border-black bg-white flex items-center justify-center shadow-[2px_2px_0px_#000] active:translate-y-0.5">
            <span className="material-symbols-outlined text-[20px]">library_books</span>
          </button>
        </header>

        
        {view === "quiz" && showReviewTransition && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center z-50 bg-[#FAF7F2]">
            <div className="w-20 h-20 mb-6 bg-white border-2 border-black rounded-full shadow-[3px_3px_0px_#000] flex items-center justify-center">
              <span className="material-symbols-outlined text-[40px] text-[#FF4D2E]">refresh</span>
            </div>
            <h2 className="text-2xl font-black mb-2">Let's correct what you missed!</h2>
            <p className="text-black/60 font-bold mb-8">You missed {missedQuestions.length} question(s). Let's review them until you master them.</p>
            <button 
              onClick={() => { setShowReviewTransition(false); setIsReviewLoop(true); setReviewIndex(0); }}
              className="bg-[#FF4D2E] text-white font-extrabold px-8 py-3 rounded-xl border-2 border-black shadow-[4px_4px_0px_#000] active:translate-y-1 active:shadow-none"
            >
              Start Review →
            </button>
          </div>
        )}

        {view === "quiz" && !showReviewTransition && (
          <>
            <main className="w-full px-4 py-5 flex flex-col gap-5">

              {/* Mobile Banner */}
              <section className="w-full bg-white rounded-xl border-2 border-black p-4 flex flex-col gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#FF4D2E] text-[22px]">school</span>
                  <span className="font-extrabold text-[14px] uppercase tracking-wider text-[#FF4D2E]">Quiz Generator</span>
                </div>
                <textarea
                  value={topicInput}
                  onChange={e => setTopicInput(e.target.value)}
                  className="w-full h-24 bg-[#FAF7F2] border-2 border-black rounded-lg p-3 text-[13px] font-medium resize-none focus:outline-none"
                  placeholder="Paste notes or type a topic..."
                />
                {/* Question count options */}
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
                  <span className="text-[10px] font-black uppercase tracking-widest text-black/40 shrink-0 ml-2">Type</span>
                  <select
                    value={quizType}
                    onChange={(e) => setQuizType(e.target.value)}
                    className="border-2 border-black rounded-lg px-2 py-1 bg-white text-[12px] font-extrabold focus:outline-none cursor-pointer"
                  >
                    <option value="mixed">Mixed</option>
                    <option value="multiple-choice">Multiple Choice</option>
                    <option value="identification">Identification</option>
                    <option value="fill-in-the-blank">Fill-in-the-Blank</option>
                  </select>
          <span className="text-[11px] font-black uppercase tracking-widest text-black/40 ml-4">Difficulty</span>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="border-[1.5px] border-black rounded-lg px-3 py-1.5 bg-white text-[13px] font-extrabold focus:outline-none cursor-pointer"
          >
            <option value="mixed">Mixed</option>
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
                      <span className="material-symbols-outlined text-[12px] mr-1">add_circle</span>
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
                    className="w-full flex-1 border-2 border-black rounded-lg px-3 py-2.5 bg-[#F0EDE0] text-[12px] font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="all">General Study (No Source)</option>
                    {(libraryFiles || []).map((file: any) => (
                      <option key={file.id} value={file.id}>{file.name}</option>
                    ))}
                  </select>
                  <button onClick={handleGenerateQuiz} disabled={isGenerating}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-[#FF4D2E] text-white rounded-lg border-2 border-black shadow-[2px_2px_0px_#000] text-[12px] font-extrabold active:translate-y-0.5 active:shadow-none transition-all">
                    <span className="material-symbols-outlined text-[16px]">edit_document</span>
                    {isGenerating ? "Loading..." : "Generate"}
                  </button>
                </div>
              </section>

              {isGenerating && (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="w-14 h-14 rounded-full border-4 border-[#FF4D2E] border-t-transparent animate-spin" />
                  <p className="font-bold text-[13px] text-black/50">Building your quiz...</p>
                </div>
              )}

              {questions.length === 0 && !isGenerating && (
                <>
                  <div className="flex flex-col items-center text-center gap-3 py-8">
                    <div className="w-24 h-24 bg-[#E2E2E2] border-[1.5px] border-black rounded-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-[48px] text-black opacity-40" style={{ fontVariationSettings: "'FILL' 1" }}>extension_off</span>
                    </div>
                    <h2 className="font-extrabold text-[20px]">No quiz yet</h2>
                    <p className="font-bold text-[13px] text-black/50 max-w-[260px]">
                      {(libraryFiles || []).length > 0 ? `${(libraryFiles || []).length} source${(libraryFiles || []).length > 1 ? "s" : ""} in your library — hit Generate!` : "Paste notes, type a topic, or just hit Generate."}
                    </p>
                  </div>
                  {historyEntries.length > 0 && (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-black/40">Recent Quizzes</span>
                        <button onClick={() => navigate("/analytics")} className="text-[11px] font-extrabold text-[#FF4D2E] hover:underline">View all</button>
                      </div>
                      {(historyEntries as HistoryEntry[]).slice(0, 5).map((entry, i) => (
                        <HistoryCard key={i} entry={entry} onOpenReview={setReviewEntry} />
                      ))}
                    </div>
                  )}
                </>
              )}

              {questions.length > 0 && !isGenerating && currentQuestion && (
                <>
                  <div className="flex items-center justify-between w-full">
                    <div className="bg-white px-3 py-1.5 rounded-full border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-1.5 text-[13px] font-bold">
                      <span className="material-symbols-outlined text-[15px] text-[#FF4D2E]">timer</span>
                      {formatTime(timeLeft)}
                    </div>
                    <div className="font-extrabold text-[15px]">
                      {isReviewLoop ? "Review Mode" : `Question ${currentQIndex + 1}`} <span className="text-black/40 font-bold text-[13px]">/ {questions.length}</span>
                    </div>
                  </div>
                  <div className="w-full h-3 bg-white border-2 border-black rounded-full overflow-hidden">
                    <div className="h-full bg-[#FF4D2E] transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                  </div>
                  <div className="bg-white rounded-2xl border-2 border-black shadow-[3px_3px_0px_#000] p-5 relative">
                    <div className="absolute -top-3 -right-3 w-8 h-8 bg-[#85f5eb] rounded-full border-2 border-black flex items-center justify-center rotate-12 z-10">
                      <span className="material-symbols-outlined text-[16px]">psychology_alt</span>
                    </div>

                    <h2 className="font-extrabold leading-snug text-[16px] mb-3">{currentQuestion.q}</h2>
                    {showHint && currentQuestion.hint && (
                      <div className="mb-4 bg-amber-50 border-[1.5px] border-black p-3 rounded-xl text-[13px] font-bold shadow-[2px_2px_0px_#000]">
                        <span className="text-[#FF4D2E] uppercase tracking-widest text-[10px] font-black block mb-1">Study Hint</span>
                        {currentQuestion.hint}
                      </div>
                    )}
                    {(showExplanation || hasAnsweredCurrent) && currentQuestion.explanation && (
                      <div className="mb-4 bg-blue-50 border-[1.5px] border-black p-3 rounded-xl text-[13px] font-bold shadow-[2px_2px_0px_#000]">
                        <span className="text-blue-600 uppercase tracking-widest text-[10px] font-black block mb-1">Explanation</span>
                        {currentQuestion.explanation}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center px-3 py-1 bg-[#FAF7F2] border-[1.5px] border-black rounded-full text-[11px] font-bold uppercase tracking-wider">
                        <span className="material-symbols-outlined text-[12px] mr-1">folder</span>{currentQuestion.subject}
                      </span>
                      <span className="inline-flex items-center px-3 py-1 bg-[#FAF7F2] border-[1.5px] border-black rounded-full text-[11px] font-bold uppercase tracking-wider">
                        <span className="material-symbols-outlined text-[12px] mr-1">leaderboard</span>{currentQuestion.difficulty}
                      </span>
                      {currentQuestion.hint && (
                        <button
                          type="button"
                          onClick={() => setShowHint(prev => !prev)}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 border-[1.5px] border-black rounded-full text-[11px] font-bold text-yellow-900 shadow-[1px_1px_0px_#000] hover:bg-yellow-200 active:scale-95 transition-all"
                        >
                          <span className="material-symbols-outlined text-[13px]">lightbulb</span>
                          {showHint ? "Hide Hint" : "Hint"}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-3">
                    {currentQuestion.type === "identification" || currentQuestion.type === "fill-in-the-blank" ? (
                      <input 
                        type="text" 
                        value={textInput} 
                        onChange={e => setTextInput(e.target.value)} 
                        placeholder="Type your answer here..."
                        className="w-full bg-white border-2 border-black rounded-xl p-4 text-[15px] font-bold shadow-[3px_3px_0px_#000] focus:outline-none focus:shadow-[1px_1px_0px_#000] focus:translate-y-[2px]"
                      />
                    ) : (
                      currentQuestion.options && (currentQuestion.options || []).map((option, idx) => {
                      const label      = ["A", "B", "C", "D"][idx];
                      const isSelected = selectedOption === idx;
                      return (
                        <button key={idx} onClick={() => setSelectedOption(idx)}
                          className={`w-full text-left rounded-2xl border-2 border-black p-4 flex items-center gap-3 transition-all ${isSelected ? "bg-[#ffdad6] shadow-[3px_3px_0px_#000] -translate-y-0.5" : "bg-white shadow-[1px_1px_0px_rgba(0,0,0,0.1)] hover:shadow-[3px_3px_0px_#000] hover:-translate-y-0.5"}`}>
                          <div className={`w-8 h-8 rounded-full border-2 border-black flex items-center justify-center flex-shrink-0 font-extrabold text-[13px] ${isSelected ? "bg-[#FF4D2E] text-white" : "bg-neutral-100"}`}>{label}</div>
                          <span className={`text-[14px] leading-tight ${isSelected ? "font-extrabold" : "font-bold"}`}>{option}</span>
                        </button>
                      );
                    })
                    )}
                  </div>
                </>
              )}
            </main>

            {questions.length > 0 && !isGenerating && !showReviewTransition && (
              <div className={`sticky bottom-0 w-full border-t-2 border-black px-4 py-4 pb-6 z-30 transition-colors ${hasAnsweredCurrent ? (isCurrentCorrect ? "bg-[#dcfce7]" : "bg-[#ffdad6]") : "bg-[#FAF7F2]"}`}>
                
                {hasAnsweredCurrent ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className={`font-black text-[18px] flex items-center gap-2 ${isCurrentCorrect ? "text-[#16a34a]" : "text-[#dc2626]"}`}>
                        <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                          {isCurrentCorrect ? "check_circle" : "cancel"}
                        </span>
                        {isCurrentCorrect ? "Excellent!" : "Incorrect"}
                      </div>
                      {!isCurrentCorrect && (
                        <button onClick={() => setShowProUpsell(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border-2 border-[#dc2626] rounded-xl text-[#dc2626] font-bold text-[12px] shadow-[2px_2px_0px_#dc2626] active:translate-y-[2px] active:shadow-none">
                          <span className="material-symbols-outlined text-[14px]">help</span> Why?
                        </button>
                      )}
                    </div>
                    <button onClick={handleContinue} className={`w-full text-white py-3.5 rounded-xl border-2 border-black shadow-[3px_3px_0px_#000] flex items-center justify-center gap-2 active:translate-y-0.5 active:shadow-none transition-all text-[15px] font-extrabold ${isCurrentCorrect ? "bg-[#16a34a]" : "bg-[#dc2626]"}`}>
                      Continue
                    </button>
                  </div>
                ) : (
                  <button disabled={(currentQuestion?.type === 'multiple-choice' || !currentQuestion?.type) ? selectedOption === null : !textInput.trim()} onClick={handleCheck}
                    className={`w-full text-white py-3.5 rounded-xl border-2 border-black shadow-[3px_3px_0px_#000] flex items-center justify-center gap-2 active:translate-y-0.5 active:shadow-none transition-all text-[15px] font-extrabold ${((currentQuestion?.type === 'multiple-choice' || !currentQuestion?.type) ? selectedOption !== null : textInput.trim()) ? "bg-[#FF4D2E] cursor-pointer" : "bg-neutral-300 pointer-events-none opacity-50"}`}>
                    Check Answer
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {view === "results" && (
          <main className="flex-1 w-full px-5 py-8 flex flex-col items-center justify-center text-center overflow-y-auto">
            <div className="w-20 h-20 bg-[#fca623]/20 border-2 border-black shadow-[4px_4px_0px_#000] rounded-full flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-4xl">emoji_events</span>
            </div>
            <h2 className="font-black mb-1.5 text-[24px]">Exam Complete!</h2>
            <p className="text-black/50 font-bold max-w-[280px] mb-6 text-[14px]">Practice test recorded. Review your scores below.</p>
            <div className="w-full bg-white border-2 border-black rounded-2xl p-5 shadow-[4px_4px_0px_#000] flex flex-col gap-4 text-left mb-8">
              <div className="flex justify-between items-center border-b pb-2.5">
                <span className="font-extrabold text-black/50 text-[12px] uppercase tracking-widest">Success Metric</span>
                <span className="text-[#FF4D2E] text-[22px] font-black">{Math.round((score / questions.length) * 100)}%</span>
              </div>
              <div className="flex justify-between items-center border-b pb-2.5">
                <span className="font-extrabold text-black/50 text-[12px] uppercase tracking-widest">Correct Hits</span>
                <span className="text-[15px] font-bold">{score} / {questions.length} items</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-black/50 text-[12px] uppercase tracking-widest">Rewards</span>
                <span className="text-[#F5A623] font-bold text-[14px]">+{score * 30 + 10} XP / +{score * 15 + 5} Coins</span>
              </div>
            </div>
            <div className="flex gap-3 w-full">
              <button onClick={() => { setView("quiz"); setCurrentQIndex(0); setSelectedOption(null); setScore(0); setAnswers([]); setTimeLeft(600); setQuestions([]); }}
                className="flex-1 bg-white border-2 border-black py-3.5 rounded-xl font-bold active:translate-y-0.5 shadow-[2px_2px_0px_#000] text-[13px] cursor-pointer">
                New Quiz
              </button>
              <button onClick={() => navigate("/dashboard")}
                className="flex-1 bg-[#FF4D2E] border-2 border-black text-white py-3.5 rounded-xl font-bold active:translate-y-0.5 shadow-[2px_2px_0px_#000] text-[13px] cursor-pointer">
                Dashboard
              </button>
            </div>
          </main>
        )}
      </div>
    </div>
    </>
  );
}
