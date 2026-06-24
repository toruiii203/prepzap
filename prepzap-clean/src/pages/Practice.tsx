import { useNavigate } from "react-router-dom";
import { SharedSidebar } from "@/components/SharedSidebar";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { loadContext, buildAIContext, getActiveSource, loadLibrary, onSourceChange } from "@/lib/sourceContext";
import { callGroq } from "@/lib/groq";
import { supabase } from "@/lib/supabase";
import { useToolHistory } from "@/pages/ToolHistory";

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface Question {
  q: string;
  options: string[];
  correct: number;
  subject: string;
  difficulty: string;
}

interface HistoryEntry {
  prompt?: string;
  preview?: string;
  meta?: string;
  createdAt?: string;
  created_at?: string;
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
  activeSource: any;
  isGenerating: boolean;
  topicInput: string;
  setTopicInput: (v: string) => void;
  setActiveSource: (v: any) => void;
  onGenerate: () => void;
  onNavigate: (r: string) => void;
  onPickSource: () => void;
  libraryFiles: any[];
  showSourcePicker: boolean;
  setShowSourcePicker: (v: boolean) => void;
}
function DesktopBanner({ activeSource, isGenerating, topicInput, setTopicInput, setActiveSource, onGenerate, onNavigate, onPickSource, libraryFiles, showSourcePicker, setShowSourcePicker }: BannerProps) {
  return (
    <div className="max-w-4xl mx-auto w-full mb-8 bg-white border-[1.5px] border-black p-6 shadow-[5px_5px_0px_#000] flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-[#FF4D2E] text-[22px]">smart_toy</span>
            <h2 className="font-extrabold text-[20px]">Rex AI Quiz Builder</h2>
          </div>
          <p className="text-[13px] text-black/60 font-bold">Create custom quizzes instantly.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            {activeSource ? (
              <div className="flex items-center gap-2 border-[1.5px] border-black px-3 py-1.5 bg-[#F0EDE0]">
                <span className="material-symbols-outlined text-[#FF4D2E] text-[16px]">description</span>
                <span className="text-[12px] font-bold truncate max-w-[180px]">{activeSource.name}</span>
                <button onClick={() => setActiveSource(null)} className="material-symbols-outlined text-[14px] hover:text-[#FF4D2E] transition-colors">close</button>
              </div>
            ) : (
              <button onClick={() => setShowSourcePicker(!showSourcePicker)}
                className="flex items-center gap-2 border-[1.5px] border-dashed border-black px-4 py-2 text-[13px] font-bold hover:bg-[#F0EDE0] transition-colors">
                <span className="material-symbols-outlined text-[18px]">attach_file</span>
                Attach source
              </button>
            )}
            {showSourcePicker && !activeSource && (
              <div className="absolute top-full mt-1 left-0 z-50 border-2 border-black bg-white shadow-[3px_3px_0px_#000] min-w-[260px] max-h-52 overflow-y-auto">
                {libraryFiles.length === 0 ? (
                  <div className="p-4 text-[12px] font-bold text-black/40 text-center">
                    No files in Source Library yet.
                    <button onClick={() => onNavigate("/sources")} className="block mt-1 text-[#FF4D2E] underline font-extrabold">Upload one →</button>
                  </div>
                ) : libraryFiles.map((file: any) => (
                  <button key={file.id} onClick={() => { setActiveSource(file); setShowSourcePicker(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 border-b border-black/10 hover:bg-[#F0EDE0] text-left transition-colors">
                    <span className="material-symbols-outlined text-[16px] text-[#FF4D2E]">description</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold truncate">{file.name}</p>
                      <p className="text-[10px] font-bold text-black/40 uppercase">{file.type || "Document"}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={onGenerate} disabled={isGenerating}
            className="flex items-center gap-2 bg-[#FF4D2E] text-white font-extrabold text-[13px] px-6 py-2.5 border-[1.5px] border-black shadow-[3px_3px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer hover:opacity-90 rounded-lg disabled:opacity-60">
            <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
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
    </div>
  );
}

function HistoryCard({ entry, onNavigate }: { entry: HistoryEntry; onNavigate: (r: string) => void }) {
  const { pct, ringColor, ringBg, timeAgo, title, correct, total } = parseHistoryEntry(entry);
  return (
    <div className="bg-white border-[1.5px] border-black shadow-[2px_2px_0px_#000] p-4 rounded-xl flex items-start gap-3 hover:bg-[#F0EDE0] transition-colors cursor-pointer active:translate-y-0.5">
      <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 border-2 font-extrabold text-[13px]"
        style={{ background: ringBg, borderColor: ringColor, color: ringColor }}>
        {pct}%
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-extrabold text-[13px] leading-snug line-clamp-2 mb-1">{title}</p>
        <p className="text-[11px] text-black/40 font-bold">{correct}/{total} correct{timeAgo ? ` · ${timeAgo}` : ""}</p>
      </div>
      <span className="material-symbols-outlined text-[18px] text-black/20 self-center shrink-0">chevron_right</span>
    </div>
  );
}


// ─── Main Component ───────────────────────────────────────────────────────────
export default function Practice() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const { save: saveHistory, entries: historyEntries = [] } = useToolHistory("practice") as any;

  const [view, setView]                     = useState<"quiz" | "results">("quiz");
  const [currentQIndex, setCurrentQIndex]   = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [timeLeft, setTimeLeft]             = useState(600);
  const [score, setScore]                   = useState(0);
  const [answers, setAnswers]               = useState<number[]>([]);
  const [isGenerating, setIsGenerating]     = useState(false);
  const [activeSource, setActiveSource]     = useState<any>(null);
  const [questions, setQuestions]           = useState<Question[]>([]);
  const [topicInput, setTopicInput]         = useState("");
  const [libraryFiles, setLibraryFiles]     = useState<any[]>([]);
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const sync = () => {
      loadContext();
      setActiveSource(getActiveSource());
      setLibraryFiles(loadLibrary());
    };
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

  const handleGenerateQuiz = async () => {
    setIsGenerating(true);
    try {
      const sourceText = buildAIContext();
      const topicHint  = topicInput.trim();
      const promptText = sourceText
        ? `Generate a set of 3 interesting, high-quality multi-choice quiz questions based on the following student resource:\n\n---\n${sourceText}\n---\n${topicHint ? `\nFocus especially on: ${topicHint}` : ""}`
        : topicHint
          ? `Generate 3 high-quality educational quiz questions about: ${topicHint}`
          : `Generate 3 high-quality educational quiz questions across academic curriculum subjects like Math, Chemistry, and History.`;

      const systemPrompt = `You are a strict JSON api generator. You MUST respond with a valid JSON array of exactly 3 questions. Do NOT write any introduction or explanation markdown blocks outside the JSON array of objects.
Each object MUST match this schema exactly:
{"q":"question text","options":["A","B","C","D"],"correct":0,"subject":"Subject","difficulty":"Easy, Medium or Hard"}`;

      // FIX BUG 2: removed fn.toString() hack — call callGroq directly
      // Note: "practice" is not in Worker LIMITS (unlimited) but key passed for logging
      const aiResponse = await callGroq(
        [{ role: "user", content: promptText }],
        systemPrompt,
        "llama-3.3-70b-versatile",
        1024,
        "practice"
      );

      let sanitized = aiResponse.trim();
      if (sanitized.startsWith("```json")) sanitized = sanitized.substring(7);
      if (sanitized.endsWith("```"))       sanitized = sanitized.slice(0, -3);
      sanitized = sanitized.trim();

      const parsed = JSON.parse(sanitized);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setQuestions(parsed);
        setCurrentQIndex(0);
        setSelectedOption(null);
        setAnswers([]);
        setScore(0);
        setTimeLeft(450);
      } else throw new Error("Invalid structure");
    } catch (err) {
      console.error("Quiz generation error:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const handleNext = () => {
    if (selectedOption === null) return;
    const isCorrect   = selectedOption === questions[currentQIndex].correct;
    const nextAnswers = [...answers, selectedOption];
    setAnswers(nextAnswers);
    let nextScore = score;
    if (isCorrect) { nextScore = score + 1; setScore(nextScore); }

    if (currentQIndex + 1 < questions.length) {
      setCurrentQIndex(prev => prev + 1);
      setSelectedOption(null);
    } else {
      const xpAwarded    = nextScore * 30 + 10;
      const coinsAwarded = nextScore * 15 + 5;
      if (user && profile) {
        supabase.from("profiles").update({
          total_xp: (profile.total_xp || profile.xp || 0) + xpAwarded,
          coins:    (profile.coins || 0) + coinsAwarded,
        }).eq("id", user.id).then(({ error }: { error: unknown }) => {
          if (error) console.error(error);
          if (typeof refreshProfile === "function") refreshProfile();
        });
      }
      saveHistory({
        prompt:  questions.map(q => q.q).join(" | ").slice(0, 120),
        preview: `Score: ${nextScore}/${questions.length}`,
        output:  JSON.stringify(nextAnswers),
        model:   "rex-ai",
        meta:    `${nextScore}/${questions.length}`,
      });
      setView("results");
    }
  };

  const progressPercent  = questions.length > 0 ? Math.round(((currentQIndex + 1) / questions.length) * 100) : 0;
  const currentQuestion  = questions.length > 0 ? questions[currentQIndex] : null;

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
          <HistoryCard key={i} entry={entry} onNavigate={navigate} />
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


  return (
    <div className="w-full bg-[#FAF7F2] flex flex-col" style={{ minHeight: "100dvh" }}>

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

      <div className="hidden md:flex md:ml-64 bg-[#FAF7F2]" style={{ minHeight: "100vh" }}>
        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-y-auto">
        {view === "quiz" && (
          <main className="flex-1 flex flex-col p-10 max-w-4xl mx-auto w-full">

            <DesktopBanner
              activeSource={activeSource}
              isGenerating={isGenerating}
              topicInput={topicInput}
              setTopicInput={setTopicInput}
              setActiveSource={setActiveSource}
              onGenerate={handleGenerateQuiz}
              onNavigate={navigate}
              onPickSource={() => setShowSourcePicker(true)}
              libraryFiles={libraryFiles}
              showSourcePicker={showSourcePicker}
              setShowSourcePicker={setShowSourcePicker}
            />

            {/* Loading */}
            {isGenerating && (
              <div className="flex flex-col items-center justify-center flex-1 py-24 gap-4">
                <div className="w-16 h-16 border-4 border-[#FF4D2E] border-t-transparent rounded-full animate-spin" />
                <p className="font-bold text-[14px] text-black/50">Rex AI is building your quiz...</p>
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
                    {activeSource
                      ? `"${activeSource.name}" is attached — hit Generate!`
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
                    {activeSource && (
                      <div className="flex items-center gap-2 border-[1.5px] border-black rounded-full px-3 py-1 bg-[#F0EDE0] text-[12px] font-bold">
                        <span className="material-symbols-outlined text-[16px]">description</span>
                        <span className="truncate max-w-[160px]">{activeSource.name}</span>
                        <button onClick={() => setActiveSource(null)} className="material-symbols-outlined text-[16px] hover:text-[#FF4D2E]">close</button>
                      </div>
                    )}
                    <div className="flex items-center gap-3 px-5 py-2 bg-[#F0EDE0] border-[1.5px] border-black shadow-[3px_3px_0px_#000]">
                      <span className="material-symbols-outlined">timer</span>
                      <span className="text-[22px] font-bold tracking-tighter">{formatTime(timeLeft)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#FAF7F2] border-[3px] border-black p-8 shadow-[5px_5px_0px_#000] mb-8 relative mt-4">
                  <div className="absolute -top-4 -left-4 bg-black text-white px-4 py-1 text-[11px] font-extrabold tracking-widest uppercase">MULTIPLE CHOICE</div>
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

                <div className="grid grid-cols-2 gap-4 mb-8">
                  {currentQuestion.options.map((option, idx) => {
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
                    <button disabled={selectedOption === null} onClick={handleNext}
                      className={`bg-[#FF4D2E] text-white text-[18px] font-bold px-12 py-4 border-[3px] border-black shadow-[5px_5px_0px_#000] active:translate-y-0.5 active:shadow-[2px_2px_0px_#000] flex items-center gap-4 transition-all ${selectedOption === null ? "opacity-40 pointer-events-none" : "hover:opacity-90"}`}>
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
      <div className="md:hidden w-full flex flex-col bg-[#FAF7F2]" style={{ height: "100dvh", overflow: "hidden" }}>

        <header className="w-full sticky top-0 z-40 bg-[#FAF7F2] border-b-[3px] border-black flex items-center justify-between px-4 h-16">
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

        {view === "quiz" && (
          <>
            <main className="flex-1 w-full px-4 py-5 flex flex-col gap-5 overflow-y-auto pb-28">

              {/* Mobile Banner */}
              <section className="bg-white rounded-xl border-[1.5px] border-black shadow-[3px_3px_0px_#000] p-4 flex flex-col gap-3 relative overflow-hidden">
                <div className="absolute -top-4 -right-4 w-16 h-16 bg-[#FF4D2E] rounded-full opacity-10 blur-xl pointer-events-none" />
                <div className="flex items-center gap-2 z-10">
                  <span className="material-symbols-outlined text-[#FF4D2E] text-[22px]">smart_toy</span>
                  <span className="font-extrabold text-[13px] uppercase tracking-wider text-[#FF4D2E]">Rex AI Quiz Builder</span>
                </div>
                <textarea
                  value={topicInput}
                  onChange={e => setTopicInput(e.target.value)}
                  className="w-full h-24 bg-[#FAF7F2] border-[1.5px] border-black rounded-lg p-3 text-[13px] font-medium resize-none focus:outline-none z-10"
                  placeholder="Paste notes or type a topic..."
                />
                <div className="flex gap-2 z-10">
                  {activeSource ? (
                    <div className="flex-1 flex items-center gap-2 bg-[#F0EDE0] border-[1.5px] border-black rounded-full px-3 py-2">
                      <span className="material-symbols-outlined text-[#FF4D2E] text-[14px]">description</span>
                      <span className="text-[11px] font-bold truncate flex-1">{activeSource.name}</span>
                      <button onClick={() => setActiveSource(null)} className="material-symbols-outlined text-[14px]">close</button>
                    </div>
                  ) : (
                    <button onClick={() => setShowSourcePicker(!showSourcePicker)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border-[1.5px] border-dashed border-black rounded-lg text-[12px] font-bold hover:bg-[#F0EDE0] transition-colors">
                      <span className="material-symbols-outlined text-[16px]">attach_file</span>Attach source
                    </button>
                  )}
                  <button onClick={handleGenerateQuiz} disabled={isGenerating}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[#FF4D2E] text-white rounded-lg border-[1.5px] border-black shadow-[2px_2px_0px_#000] text-[12px] font-extrabold active:translate-y-0.5 active:shadow-none transition-all">
                    <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                    {isGenerating ? "Loading..." : "Generate"}
                  </button>
                </div>
              </section>

              {showSourcePicker && !activeSource && (
                <div className="border-2 border-black bg-white shadow-[3px_3px_0px_#000] max-h-44 overflow-y-auto">
                  {libraryFiles.length === 0 ? (
                    <div className="p-4 text-center text-[12px] font-bold text-black/40">
                      No files yet.
                      <button onClick={() => navigate("/sources")} className="block mt-1 text-[#FF4D2E] underline font-extrabold mx-auto">Upload to Source Library →</button>
                    </div>
                  ) : libraryFiles.map((file: any) => (
                    <button key={file.id} onClick={() => { setActiveSource(file); setShowSourcePicker(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 border-b border-black/10 hover:bg-[#F0EDE0] text-left transition-colors">
                      <span className="material-symbols-outlined text-[16px] text-[#FF4D2E]">description</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold truncate">{file.name}</p>
                        <p className="text-[10px] font-bold text-black/40 uppercase">{file.type || "Document"}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {isGenerating && (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="w-14 h-14 rounded-full border-4 border-[#FF4D2E] border-t-transparent animate-spin" />
                  <p className="font-bold text-[13px] text-black/50">Rex AI is building your quiz...</p>
                </div>
              )}

              {questions.length === 0 && !isGenerating && (
                <>
                  <div className="flex flex-col items-center text-center gap-3 py-8">
                    <div className="w-24 h-24 bg-[#E2E2E2] border-[1.5px] border-black shadow-[3px_3px_0px_#000] rounded-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-[48px] text-black opacity-40" style={{ fontVariationSettings: "'FILL' 1" }}>extension_off</span>
                    </div>
                    <h2 className="font-extrabold text-[20px]">No quiz yet</h2>
                    <p className="font-bold text-[13px] text-black/50 max-w-[260px]">
                      {activeSource ? `"${activeSource.name}" is ready — hit Generate!` : "Paste notes, type a topic, or just hit Generate."}
                    </p>
                  </div>
                  {historyEntries.length > 0 && (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-black/40">Recent Quizzes</span>
                        <button onClick={() => navigate("/analytics")} className="text-[11px] font-extrabold text-[#FF4D2E] hover:underline">View all</button>
                      </div>
                      {(historyEntries as HistoryEntry[]).slice(0, 5).map((entry, i) => (
                        <HistoryCard key={i} entry={entry} onNavigate={navigate} />
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
                      Question {currentQIndex + 1} <span className="text-black/40 font-bold text-[13px]">/ {questions.length}</span>
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
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center px-3 py-1 bg-[#FAF7F2] border-[1.5px] border-black rounded-full text-[11px] font-bold uppercase tracking-wider">
                        <span className="material-symbols-outlined text-[12px] mr-1">folder</span>{currentQuestion.subject}
                      </span>
                      <span className="inline-flex items-center px-3 py-1 bg-[#FAF7F2] border-[1.5px] border-black rounded-full text-[11px] font-bold uppercase tracking-wider">
                        <span className="material-symbols-outlined text-[12px] mr-1">leaderboard</span>{currentQuestion.difficulty}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3">
                    {currentQuestion.options.map((option, idx) => {
                      const label      = ["A", "B", "C", "D"][idx];
                      const isSelected = selectedOption === idx;
                      return (
                        <button key={idx} onClick={() => setSelectedOption(idx)}
                          className={`w-full text-left rounded-2xl border-2 border-black p-4 flex items-center gap-3 transition-all ${isSelected ? "bg-[#ffdad6] shadow-[3px_3px_0px_#000] -translate-y-0.5" : "bg-white shadow-[1px_1px_0px_rgba(0,0,0,0.1)] hover:shadow-[3px_3px_0px_#000] hover:-translate-y-0.5"}`}>
                          <div className={`w-8 h-8 rounded-full border-2 border-black flex items-center justify-center flex-shrink-0 font-extrabold text-[13px] ${isSelected ? "bg-[#FF4D2E] text-white" : "bg-neutral-100"}`}>{label}</div>
                          <span className={`text-[14px] leading-tight ${isSelected ? "font-extrabold" : "font-bold"}`}>{option}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </main>

            {questions.length > 0 && !isGenerating && (
              <div className="sticky bottom-0 w-full bg-[#FAF7F2] border-t-2 border-black px-4 py-4 pb-6 z-30">
                <button disabled={selectedOption === null} onClick={handleNext}
                  className={`w-full text-white py-3.5 rounded-xl border-2 border-black shadow-[3px_3px_0px_#000] flex items-center justify-center gap-2 active:translate-y-0.5 active:shadow-none transition-all text-[15px] font-extrabold ${selectedOption !== null ? "bg-[#FF4D2E] cursor-pointer" : "bg-neutral-300 pointer-events-none opacity-50"}`}>
                  Next Question <span className="material-symbols-outlined">arrow_forward</span>
                </button>
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
  );
}
