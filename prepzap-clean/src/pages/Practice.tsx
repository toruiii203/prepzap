import { useNavigate } from "react-router-dom";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { loadContext, loadLibrary, buildAIContext, getActiveSource } from "@/lib/sourceContext";
import { callGroq } from "@/lib/groq";
import { supabase } from "@/lib/supabase";
import { useToolHistory } from "@/pages/ToolHistory";

interface Question {
  q: string;
  options: string[];
  correct: number;
  subject: string;
  difficulty: string;
}

interface PracticeProps {
}

export default function Practice() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const { save: saveHistory } = useToolHistory("practice");
  
  const [view, setView] = useState<"quiz" | "results">("quiz");
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(600);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeSource, setActiveSource] = useState<any>(null);
  const [activeSourcesCount, setActiveSourcesCount] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    const ctx = loadContext();
    const activeIds = Array.isArray(ctx) ? ctx : (ctx as any)?.selectedIds || [];
    setActiveSourcesCount(ctx.selectedIds?.length ?? 0);
    setActiveSource(getActiveSource());
  }, []);

  useEffect(() => {
    if (view !== "quiz") return;
    const interval = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [view]);

  const handleGenerateQuiz = async () => {
    setIsGenerating(true);
    try {
      const sourceText = buildAIContext();
      const promptText = sourceText 
        ? `Generate a set of 3 interesting, high-quality multi-choice quiz questions based on the following student resource note attachment:\n\n---\n${sourceText}\n---\n`
        : `Generate 3 high-quality educational quiz questions across academic curriculum subjects like Math, Chemistry, and History.`;

      const systemPrompt = `You are a strict JSON api generator. You MUST respond with a valid JSON array of exactly 3 questions. Do NOT write any introduction or explanation markdown blocks outside the JSON array of objects.
Each object in the JSON array MUST match this exact schema:
{
  "q": "The question title text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correct": 0,
  "subject": "Name of Subject (e.g. History)",
  "difficulty": "Easy, Medium or Hard"
}`;

      const callGroqWithModel = async (promptText: string, systemPrompt: string) => {
        const fn = callGroq as any;
        const fnStr = fn.toString();
        if (fnStr.includes("messages") || fnStr.includes("llama")) {
          return await fn([{ role: "user", content: promptText }], systemPrompt, "llama-3.3-70b-versatile", 1000);
        } else {
          return await fn(promptText, systemPrompt, "application/json");
        }
      };

      const aiResponse = await callGroqWithModel(promptText, systemPrompt);
      
      let sanitized = aiResponse.trim();
      if (sanitized.startsWith("```json")) sanitized = sanitized.substring(7);
      if (sanitized.endsWith("```")) sanitized = sanitized.substring(0, sanitized.length - 3);
      sanitized = sanitized.trim();

      const parsed = JSON.parse(sanitized);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setQuestions(parsed);
        setCurrentQIndex(0);
        setSelectedOption(null);
        setAnswers([]);
        setScore(0);
        setTimeLeft(450);
      } else {
        throw new Error("Invalid structure returned by AI model");
      }
    } catch (err: any) {
    } finally {
      setIsGenerating(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const handleSelectOption = (index: number) => setSelectedOption(index);

  const handleNext = () => {
    if (selectedOption === null) return;

    const correctAns = questions[currentQIndex].correct;
    const isCorrect = selectedOption === correctAns;
    const nextAnswers = [...answers, selectedOption];
    setAnswers(nextAnswers);

    let nextScore = score;
    if (isCorrect) {
      nextScore = score + 1;
      setScore(nextScore);
    }

    if (currentQIndex + 1 < questions.length) {
      setCurrentQIndex(prev => prev + 1);
      setSelectedOption(null);
    } else {
      const xpAwarded = nextScore * 30 + 10;
      const coinsAwarded = nextScore * 15 + 5;

      const triggerRewards = async () => {
        if (user && profile) {
          try {
            const currentXp = profile.total_xp || profile.xp || 0;
            const currentCoins = profile.coins || 0;
            await supabase
              .from("profiles")
              .update({ 
                total_xp: currentXp + xpAwarded,
                coins: currentCoins + coinsAwarded
              })
              .eq("id", user.id);
            if (typeof refreshProfile === "function") await refreshProfile();
          } catch (err) {
            console.error("Error updating profile via Supabase:", err);
            await supabase.from("profiles").update({ total_xp: (profile?.total_xp ?? 0) + xpAwarded }).eq("id", user?.id ?? "");
            await refreshProfile();
          }
        }
      };

      triggerRewards();
      saveHistory({ prompt: questions.map(q => q.q).join(" | ").slice(0, 120), preview: `Score: ${nextScore}/${questions.length}`, output: JSON.stringify(answers), model: "rex-ai", meta: `${nextScore}/${questions.length} correct` });
      setView("results");
    }
  };

  const progressPercent = questions.length > 0 ? Math.round(((currentQIndex + 1) / questions.length) * 100) : 0;
  const currentQuestion = questions.length > 0 ? questions[currentQIndex] : null;

  // ─── Desktop Sidebar ──────────────────────────────────────────────────────
  const DesktopSidebar = () => (
    <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 z-40 flex-col p-4 border-r-[1.5px] border-black bg-[#FAF7F2] w-64">
      <div className="mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-black flex-shrink-0" />
        <div>
          <h1 className="text-[22px] font-extrabold text-black leading-tight">Studenius</h1>
          <p className="text-[11px] font-bold mt-1 opacity-70">Academic Level: Pro</p>
        </div>
      </div>
      <nav className="flex-1 flex flex-col gap-1 overflow-y-auto pb-4">
        <div className="text-[11px] font-black uppercase tracking-widest text-black/50 mb-2 mt-2">MAIN</div>
        {[
          { icon: "dashboard", label: "Dashboard", route: "/dashboard" },
          { icon: "psychology", label: "AI Tutor", route: "/ai-tutor" },
          { icon: "style", label: "Flashcards", route: "/flashcards" },
          { icon: "quiz", label: "Practice", route: "/practice", active: true },
        ].map(item => (
          <button key={item.route} onClick={() => navigate(item.route)}
            className={`flex items-center gap-4 px-2 py-2.5 rounded-lg text-[14px] font-bold transition-all text-left w-full ${
              item.active ? "bg-black text-white" : "text-black hover:bg-[#E2E2E2]"
            }`}>
            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
            {item.label}
          </button>
        ))}
        <div className="text-[11px] font-black uppercase tracking-widest text-black/50 mb-2 mt-6">TOOLS</div>
        {[
          { icon: "timer", label: "Focus Timer", route: "/timer" },
          { icon: "calendar_today", label: "Study Planner", route: "/planner" },
          { icon: "military_tech", label: "Challenges", route: "/challenges" },
          { icon: "history_edu", label: "Mistake Journal", route: "/mistakes" },
        ].map(item => (
          <button key={item.route} onClick={() => navigate(item.route)}
            className="flex items-center gap-4 px-2 py-2.5 rounded-lg text-[14px] font-bold text-black hover:bg-[#E2E2E2] transition-all text-left w-full">
            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
            {item.label}
          </button>
        ))}
        <div className="text-[11px] font-black uppercase tracking-widest text-black/50 mb-2 mt-6">RESOURCES</div>
        {[
          { icon: "library_books", label: "Source Library", route: "/sources" },
          { icon: "monitoring", label: "Analytics", route: "/analytics" },
        ].map(item => (
          <button key={item.route} onClick={() => navigate(item.route)}
            className="flex items-center gap-4 px-2 py-2.5 rounded-lg text-[14px] font-bold text-black hover:bg-[#E2E2E2] transition-all text-left w-full">
            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
      <div className="mt-auto border-t-[1.5px] border-black pt-4 flex flex-col gap-2">
        <button onClick={() => navigate("/go-pro")}
          className="w-full bg-[#FF4D2E] text-white border-[1.5px] border-black py-3 text-[13px] font-extrabold shadow-[3px_3px_0px_#000] hover:opacity-90 active:translate-y-0.5">
          Upgrade to Pro
        </button>
        <button onClick={() => navigate("/settings")}
          className="flex items-center gap-4 px-2 py-2 rounded-lg text-[14px] font-bold text-black hover:bg-[#E2E2E2] w-full">
          <span className="material-symbols-outlined text-[20px]">settings</span>Settings
        </button>
        <button className="flex items-center gap-4 px-2 py-2 rounded-lg text-[14px] font-bold text-black hover:bg-[#E2E2E2] w-full">
          <span className="material-symbols-outlined text-[20px]">help_outline</span>Help
        </button>
      </div>
    </aside>
  );

  // ─── Desktop Quiz View ────────────────────────────────────────────────────
  const DesktopQuizView = () => (
    <div className="hidden lg:flex lg:ml-64 flex-col bg-[#FAF7F2] overflow-y-auto" style={{ height: "100vh" }}>
      <main className="flex-1 flex flex-col p-12 max-w-5xl mx-auto w-full">

        {/* AI Generator Banner */}
        <div className="bg-[#e9f2ff] border-[1.5px] border-black p-5 shadow-[3px_3px_0px_#000] flex flex-col gap-3 mb-8">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black">////</span>
            <span className="text-xs font-black text-[#FF4D2E] uppercase tracking-wider">Rex AI Quiz Builder</span>
          </div>
          <p className="text-[13px] font-bold text-black/80">
            {activeSource
              ? `Detected active file "${activeSource.name}"! You can compile a custom mock-quiz immediately.`
              : activeSourcesCount > 0
                ? `Detected ${activeSourcesCount} active source notes! Let's build a custom exam.`
                : "Let Rex compile 3 custom multi-choice questions covering any subject!"}
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={handleGenerateQuiz} disabled={isGenerating}
              className="self-start bg-white hover:bg-black hover:text-white border-2 border-black text-xs font-extrabold py-2 px-4 shadow-[2px_2px_0px_#000] transition-all active:translate-y-0.5 active:shadow-none flex items-center gap-2 cursor-pointer">
              {isGenerating ? <><span className="animate-spin">///</span> Reading materials...</> : <><span>///</span> Generate Quiz via AI</>}
            </button>
            {activeSource ? (
              <div className="flex items-center gap-2 border-2 border-black bg-white px-3 py-1.5 shadow-[2px_2px_0px_#000]">
                <span className="material-symbols-outlined text-[#FF4D2E] text-[15px]">attach_file</span>
                <span className="text-[12px] font-bold truncate max-w-[180px]">{activeSource.name}</span>
              </div>
            ) : (
              <button onClick={() => navigate("/sources")}
                className="flex items-center gap-2 border-2 border-dashed border-black/40 text-black/50 text-xs font-bold py-2 px-4 hover:border-black hover:text-black transition-all cursor-pointer">
                <span className="material-symbols-outlined text-[15px]">attach_file</span>
                Attach source
              </button>
            )}
          </div>
        </div>

        {/* Empty state */}
        {questions.length === 0 && !isGenerating && (
          <div className="flex flex-col items-center justify-center flex-1 py-24 gap-4 text-center">
            <div className="w-20 h-20 bg-white border-2 border-black flex items-center justify-center shadow-[3px_3px_0px_#000]">
              <span className="material-symbols-outlined text-4xl text-[#FF4D2E]">quiz</span>
            </div>
            <h2 className="font-extrabold text-[20px]">No quiz yet</h2>
            <p className="text-black/50 font-bold text-[14px] max-w-[300px]">
              {activeSource
                ? `"${activeSource.name}" is ready — generate a quiz from it!`
                : `Attach a source from your library, or generate a general-subject quiz above.`}
            </p>
            {!activeSource && (
              <button onClick={() => navigate("/sources")}
                className="mt-2 border-2 border-dashed border-black/30 px-8 py-4 flex items-center justify-center gap-2 text-[13px] font-bold text-black/40 hover:border-black hover:text-black transition-all">
                <span className="material-symbols-outlined text-[18px]">add</span>
                Attach a source from library
              </button>
            )}
          </div>
        )}

        {/* Loading state */}
        {isGenerating && (
          <div className="flex flex-col items-center justify-center flex-1 py-24 gap-4">
            <div className="w-16 h-16 border-4 border-black border-t-transparent animate-spin" />
            <p className="font-bold text-[14px] text-black/50">Rex AI is building your quiz...</p>
          </div>
        )}

        {/* Quiz active */}
        {questions.length > 0 && !isGenerating && currentQuestion && (
          <>
            {/* Top status bar */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-8 gap-4">
              <div className="flex-grow w-full lg:max-w-md flex flex-col gap-2">
                <div className="flex justify-between">
                  <span className="text-[14px] font-extrabold tracking-widest uppercase">Question {currentQIndex + 1}/{questions.length}</span>
                  <span className="text-[14px] font-extrabold">{progressPercent}%</span>
                </div>
                <div className="h-4 w-full bg-[#E8E4DC] border-[1.5px] border-black overflow-hidden">
                  <div className="h-full bg-black transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
              <div className="flex items-center gap-4">
                {/* Source pill */}
                {activeSource ? (
                  <div className="flex items-center gap-2 border-2 border-black rounded-full px-3 py-1 bg-[#F0EDE0] text-[12px] font-bold">
                    <span className="material-symbols-outlined text-[16px]">description</span>
                    <span className="truncate max-w-[160px]">{activeSource.name}</span>
                    <button onClick={() => setActiveSource(null)} className="material-symbols-outlined text-[16px] hover:text-[#FF4D2E] transition-colors">close</button>
                  </div>
                ) : (
                  <button onClick={() => navigate("/sources")}
                    className="flex items-center gap-2 border-2 border-black rounded-full px-3 py-1 bg-[#F0EDE0] hover:bg-[#E2E2E2] text-[12px] font-bold transition-colors">
                    <span className="material-symbols-outlined text-[16px]">attach_file</span>
                    Attach Source
                  </button>
                )}
                {/* Timer */}
                <div className="flex items-center gap-3 px-5 py-2 bg-[#F0EDE0] border-[1.5px] border-black shadow-[3px_3px_0px_#000]">
                  <span className="material-symbols-outlined">timer</span>
                  <span className="text-[22px] font-bold tracking-tighter">{formatTime(timeLeft)}</span>
                </div>
              </div>
            </div>

            {/* Question card */}
            <div className="bg-[#FAF7F2] border-[3px] border-black p-8 shadow-[5px_5px_0px_#000] mb-8 relative mt-8">
              <div className="absolute -top-4 -left-4 bg-black text-white px-4 py-1 text-[13px] font-extrabold tracking-widest uppercase">
                MULTIPLE CHOICE
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="inline-flex items-center px-3 py-1 bg-[#FAF7F2] border-2 border-black rounded-full text-[11px] font-bold uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[13px] mr-1">folder</span>
                  {currentQuestion.subject}
                </span>
                <span className="inline-flex items-center px-3 py-1 bg-[#FAF7F2] border-2 border-black rounded-full text-[11px] font-bold uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[13px] mr-1">leaderboard</span>
                  {currentQuestion.difficulty}
                </span>
              </div>
              <h2 className="text-[28px] font-extrabold leading-snug mb-4">{currentQuestion.q}</h2>
              <div className="h-[1.5px] bg-black w-full opacity-20 my-4" />
              <p className="text-[16px] opacity-80 italic">Select the most accurate response from the grid below.</p>
            </div>

            {/* Answer grid */}
            <div className="grid grid-cols-2 gap-4 mb-8 overflow-visible">
              {currentQuestion.options.map((option, idx) => {
                const label = ["A", "B", "C", "D"][idx];
                const isSelected = selectedOption === idx;
                return (
                  <button key={idx} onClick={() => handleSelectOption(idx)}
                    className={`group relative text-left border-[1.5px] border-black p-4 shadow-[3px_3px_0px_#000] active:translate-y-0.5 active:shadow-[2px_2px_0px_#000] transition-all w-full ${
                      isSelected
                        ? "bg-[#FF4D2E] text-white"
                        : "bg-[#FAF7F2] hover:bg-black hover:text-white"
                    }`}>
                    <div className="flex items-start gap-4 justify-between w-full">
                      <div className="flex items-start gap-4">
                        <span className={`text-[13px] font-extrabold px-2 py-1 border-[1.5px] border-black flex-shrink-0 ${
                          isSelected ? "bg-white text-black" : "bg-black text-white group-hover:bg-white group-hover:text-black"
                        }`}>{label}</span>
                        <span className="text-[15px] font-medium leading-snug">{option}</span>
                      </div>
                      {isSelected && (
                        <span className="material-symbols-outlined flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Bottom nav */}
            <div className="flex flex-col gap-3">
              <div>
                <div className="text-[11px] font-black uppercase tracking-widest text-black/50 mb-2">QUESTION NAVIGATOR</div>
                <div className="flex gap-2">
                  {questions.map((_, i) => (
                    <button key={i}
                      className={`w-[28px] h-[28px] flex items-center justify-center text-xs font-extrabold border transition-all ${
                        i === currentQIndex
                          ? "bg-black text-white border-black"
                          : answers[i] !== undefined
                            ? "bg-[#2d6a2d] text-white border-[#2d6a2d]"
                            : "bg-[#E8E4DC] text-black/40 border-black/20 hover:border-black/50"
                      }`}>
                      {i + 1}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  disabled={selectedOption === null}
                  onClick={handleNext}
                  className={`bg-[#FF4D2E] text-white text-[20px] font-bold px-12 py-5 border-[3px] border-black shadow-[5px_5px_0px_#000] active:translate-y-0.5 active:shadow-[2px_2px_0px_#000] flex items-center gap-4 transition-all ${
                    selectedOption === null ? "opacity-40 pointer-events-none" : "hover:opacity-90"
                  }`}>
                  Next Question
                  <span className="material-symbols-outlined text-3xl">arrow_forward</span>
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );

  // ─── Desktop Results View ─────────────────────────────────────────────────
  const DesktopResultsView = () => (
    <div className="hidden lg:flex lg:ml-64 flex-col bg-[#FAF7F2] items-center justify-center p-12 overflow-y-auto" style={{ height: "100vh" }}>
      <div className="max-w-xl w-full flex flex-col items-center text-center">
        <div className="w-24 h-24 bg-[#fca623]/20 border-[3px] border-black shadow-[5px_5px_0px_#000] flex items-center justify-center mb-8">
          <span className="material-symbols-outlined text-5xl font-bold">emoji_events</span>
        </div>
        <h2 className="text-[36px] font-black mb-2">Exam Complete!</h2>
        <p className="text-black/50 font-bold max-w-[320px] mb-8 text-[15px]">
          Practice test recorded. Review your detailed scores below.
        </p>
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
          <button
            onClick={() => { setView("quiz"); setCurrentQIndex(0); setSelectedOption(null); setScore(0); setAnswers([]); setTimeLeft(600); }}
            className="flex-1 bg-white border-[3px] border-black text-black py-4 font-extrabold hover:bg-[#E2E2E2] active:translate-y-0.5 shadow-[3px_3px_0px_#000] text-[15px] cursor-pointer">
            Retry Exam
          </button>
          <button onClick={() => navigate("/dashboard")}
            className="flex-1 bg-[#FF4D2E] border-[3px] border-black text-white py-4 font-extrabold hover:opacity-95 active:translate-y-0.5 shadow-[3px_3px_0px_#000] text-[15px] cursor-pointer">
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full bg-[#FAF7F2] flex flex-col" style={{ minHeight: "100dvh" }}>

      {/* ═══════════════════════════════════════════════════
          DESKTOP LAYOUT
          ═══════════════════════════════════════════════════ */}
      <DesktopSidebar />
      {view === "quiz" && <DesktopQuizView />}
      {view === "results" && <DesktopResultsView />}

      {/* ═══════════════════════════════════════════════════
          MOBILE LAYOUT
          ═══════════════════════════════════════════════════ */}
      <div className="lg:hidden w-full flex flex-col bg-[#FAF7F2]" style={{ height: "100dvh", overflow: "hidden" }}>

        {/* TopAppBar */}
        <header className="w-full top-0 sticky z-45 bg-[#FAF7F2] border-b-2 border-[#1A1A1A] flex items-center justify-between px-5 h-16">
          <button
            onClick={() => navigate(-1)}
            className="text-[#FF4D2E] hover:bg-[#ebe8e3] transition-colors p-2 -ml-2 rounded-full flex items-center justify-center border-2 border-[#1A1A1A] bg-white h-10 w-10 active:translate-y-0.5 shadow-[2px_2px_0px_rgba(0,0,0,1)]">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-extrabold tracking-tight text-[21px] flex-1 text-center">Practice Exam</h1>
          <button
            onClick={() => navigate("/sources")}
            className="text-[#1A1A1A] hover:bg-[#ebe8e3] transition-colors p-2 -mr-2 rounded-full flex items-center justify-center border-2 border-[#1A1A1A] bg-white h-10 w-10 shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-0.5">
            <span className="material-symbols-outlined text-[18px]">library_books</span>
          </button>
        </header>

        {view === "quiz" && (
          <>
            <main className="flex-1 w-full px-5 py-6 flex flex-col gap-5 pb-[130px] overflow-y-auto">

              {/* AI Generator Banner */}
              <div className="bg-[#e9f2ff] rounded-2xl border-2 border-[#1A1A1A] p-4 shadow-[3px_3px_0px_rgba(0,0,0,1)] flex flex-col gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xl">////</span>
                  <span className="text-xs font-black text-[#FF4D2E] uppercase tracking-wider">Rex AI Quiz Builder</span>
                </div>
                <p className="text-[12.5px] leading-snug font-bold text-black/80">
                  {activeSource
                    ? `Detected active file "${activeSource.name}"! You can compile a custom mock-quiz immediately.`
                    : activeSourcesCount > 0
                      ? `Detected ${activeSourcesCount} active source notes! Let's build a custom exam.`
                      : "Let the Rex study tutor compile 3 custom multi-choice questions covering any subject!"}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={handleGenerateQuiz} disabled={isGenerating}
                    className="bg-white hover:bg-black hover:text-white border-2 border-black text-xs font-extrabold py-2 px-3 rounded-lg shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all active:translate-y-0.5 active:shadow-none flex items-center justify-center gap-1.5 cursor-pointer">
                    {isGenerating ? <><span className="animate-spin text-sm">///</span> Reading materials...</> : <><span className="text-sm">///</span> Generate Quiz via AI</>}
                  </button>
                  {activeSource ? (
                    <div className="flex items-center gap-1.5 bg-white border-2 border-[#1A1A1A] rounded-lg px-2.5 py-1.5 shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                      <span className="material-symbols-outlined text-[#FF4D2E] text-[14px]">attach_file</span>
                      <span className="text-[11px] font-bold truncate max-w-[120px]">{activeSource.name}</span>
                    </div>
                  ) : (
                    <button onClick={() => navigate("/sources")}
                      className="flex items-center gap-1.5 bg-white border-2 border-dashed border-black/40 text-black/50 text-xs font-bold py-2 px-3 rounded-lg hover:border-black hover:text-black transition-all cursor-pointer">
                      <span className="material-symbols-outlined text-[14px]">attach_file</span>
                      Attach source
                    </button>
                  )}
                </div>
              </div>

              {questions.length === 0 && !isGenerating && (
                <div className="flex flex-col items-center justify-center flex-1 py-16 gap-4 text-center">
                  <div className="w-20 h-20 bg-white border-2 border-[#1A1A1A] rounded-full flex items-center justify-center shadow-[3px_3px_0px_rgba(0,0,0,1)]">
                    <span className="material-symbols-outlined text-4xl text-[#FF4D2E]">quiz</span>
                  </div>
                  <h2 className="font-extrabold text-[18px]">No quiz yet</h2>
                  <p className="text-black/50 font-bold text-[13.5px] max-w-[260px]">
                    {activeSource
                      ? `"${activeSource.name}" is ready — generate a quiz from it!`
                      : `Attach a source from your library, or generate a quiz on any subject.`}
                  </p>
                  {!activeSource && (
                    <button onClick={() => navigate("/sources")}
                      className="mt-1 w-full max-w-[260px] border-2 border-dashed border-black/30 p-4 flex items-center justify-center gap-2 text-[13px] font-bold text-black/40 hover:border-black hover:text-black transition-all rounded-xl">
                      <span className="material-symbols-outlined text-[18px]">add</span>
                      Attach a source
                    </button>
                  )}
                </div>
              )}

              {/* Loading state */}
              {isGenerating && (
                <div className="flex flex-col items-center justify-center flex-1 py-16 gap-4">
                  <div className="w-16 h-16 rounded-full border-4 border-[#FF4D2E] border-t-transparent animate-spin" />
                  <p className="font-bold text-[14px] text-black/50">Rex AI is building your quiz...</p>
                </div>
              )}

              {/* Quiz content */}
              {questions.length > 0 && !isGenerating && currentQuestion && (
                <>
                  <div className="flex items-center justify-between w-full mt-1">
                    <div className="text-black bg-white px-3.5 py-1.5 rounded-full border-2 border-[#1A1A1A] shadow-[2px_2px_0px_rgba(0,0,0,1)] flex items-center gap-1.5 text-[13px] font-bold">
                      <span className="material-symbols-outlined text-[15px] text-[#FF4D2E]">timer</span>
                      {formatTime(timeLeft)}
                    </div>
                    <div className="text-[#1A1A1A] font-extrabold text-[16px]">
                      Question {currentQIndex + 1} <span className="text-black/50 font-bold text-[13px]">/ {questions.length}</span>
                    </div>
                  </div>

                  <div className="w-full h-3 bg-white border-2 border-[#1A1A1A] rounded-full overflow-hidden relative">
                    <div className="h-full bg-[#FF4D2E] absolute left-0 top-0 transition-all duration-300"
                      style={{ width: `${progressPercent}%`, borderRight: "2px solid #1A1A1A" }} />
                  </div>

                  <div className="bg-white rounded-2xl border-2 border-[#1A1A1A] shadow-[3px_3px_0px_rgba(0,0,0,1)] p-5 relative overflow-visible">
                    <div className="absolute -top-3 -right-3 w-8 h-8 bg-[#85f5eb] rounded-full border-2 border-[#1A1A1A] flex items-center justify-center transform rotate-12 z-10">
                      <span className="material-symbols-outlined text-[16px] font-bold">psychology_alt</span>
                    </div>
                    <h2 className="text-black font-extrabold leading-snug text-[16.5px]">{currentQuestion.q}</h2>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="inline-flex items-center px-3 py-1 bg-[#FAF7F2] border-2 border-[#1A1A1A] rounded-full text-[11.5px] font-bold uppercase tracking-wider">
                        <span className="material-symbols-outlined text-[13px] mr-1">folder</span>
                        {currentQuestion.subject}
                      </span>
                      <span className="inline-flex items-center px-3 py-1 bg-[#FAF7F2] border-2 border-[#1A1A1A] rounded-full text-[11.5px] font-bold uppercase tracking-wider">
                        <span className="material-symbols-outlined text-[13px] mr-1">leaderboard</span>
                        {currentQuestion.difficulty}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3.5 mt-1">
                    {currentQuestion.options.map((option, idx) => {
                      const label = ["A", "B", "C", "D"][idx];
                      const isSelected = selectedOption === idx;
                      return (
                        <button key={idx} onClick={() => handleSelectOption(idx)}
                          className={`w-full text-left rounded-2xl border-2 border-[#1A1A1A] p-4 flex items-center gap-4 transition-all duration-100 cursor-pointer ${
                            isSelected
                              ? "bg-[#ffdad6] shadow-[3px_3px_0px_rgba(0,0,0,1)] -translate-y-0.5"
                              : "bg-white hover:bg-neutral-50 shadow-[1px_1px_0px_rgba(0,0,0,0.1)] hover:shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5"
                          }`}>
                          <div className={`w-8 h-8 rounded-full border-2 border-[#1A1A1A] flex items-center justify-center flex-shrink-0 font-extrabold text-[13px] transition-colors ${
                            isSelected ? "bg-[#FF4D2E] text-white" : "bg-neutral-100 text-[#1A1A1A]"
                          }`}>{label}</div>
                          <span className={`text-[#1A1A1A] leading-tight text-[14.5px] ${isSelected ? "font-extrabold" : "font-bold"}`}>{option}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </main>

            {questions.length > 0 && !isGenerating && (
              <div className="sticky bottom-0 w-full bg-[#FAF7F2] border-t-2 border-[#1A1A1A] px-5 py-4 pb-6 z-30">
                <button
                  disabled={selectedOption === null}
                  onClick={handleNext}
                  className={`w-full text-white py-3.5 rounded-xl border-2 border-[#1A1A1A] shadow-[3px_3px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-1.5 active:translate-y-0.5 active:shadow-none transition-all text-[15px] font-extrabold ${
                    selectedOption !== null ? "bg-[#FF4D2E] opacity-100 cursor-pointer" : "bg-neutral-300 pointer-events-none opacity-50"
                  }`}>
                  Next Question
                  <span className="material-symbols-outlined font-bold">arrow_forward</span>
                </button>
              </div>
            )}
          </>
        )}

        {view === "results" && (
          <main className="flex-1 w-full px-5 py-8 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-[#fca623]/20 border-2 border-[#1A1A1A] shadow-[4px_4px_0px_rgba(0,0,0,1)] rounded-full flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-4xl font-bold">emoji_events</span>
            </div>
            <h2 className="text-[#1A1A1A] font-black mb-1.5 text-[24px]">Exam Compiled!</h2>
            <p className="text-black/50 font-bold max-w-[280px] mb-6 text-[14px]">
              Practice test recorded in historic journals. Review detailed scores below.
            </p>
            <div className="w-full bg-white border-2 border-[#1A1A1A] rounded-2xl p-5 shadow-[4px_4px_0px_rgba(0,0,0,1)] flex flex-col gap-4 text-left mb-8">
              <div className="flex justify-between items-center border-b pb-2.5">
                <span className="font-extrabold text-black/50 text-[13.5px]">SUCCESS METRIC</span>
                <span className="text-[#FF4D2E] text-[22px] font-black">{Math.round((score / questions.length) * 100)}%</span>
              </div>
              <div className="flex justify-between items-center border-b pb-2.5">
                <span className="font-extrabold text-black/50 text-[13.5px]">CORRECT HITS</span>
                <span className="text-black text-[15.5px] font-bold">{score} / {questions.length} items</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-black/50 text-[13.5px]">REWARDS UNLOCKED</span>
                <span className="text-[#F5A623] font-bold text-[14.5px]">+{score * 30 + 10} XP / +{score * 15 + 5} Coins</span>
              </div>
            </div>
            <div className="flex gap-4 w-full">
              <button
                onClick={() => { setView("quiz"); setCurrentQIndex(0); setSelectedOption(null); setScore(0); setAnswers([]); setTimeLeft(600); }}
                className="flex-1 bg-white border-2 border-[#1A1A1A] text-[#1A1A1A] py-3.5 rounded-xl font-bold hover:bg-neutral-50 active:translate-y-0.5 shadow-[2px_2px_0px_rgba(0,0,0,1)] text-[13.5px] cursor-pointer">
                Retry Exam
              </button>
              <button onClick={() => navigate("/dashboard")}
                className="flex-1 bg-[#FF4D2E] border-2 border-[#1A1A1A] text-white py-3.5 rounded-xl font-bold hover:opacity-95 active:translate-y-0.5 shadow-[2px_2px_0px_rgba(0,0,0,1)] text-[13.5px] cursor-pointer">
                Dashboard
              </button>
            </div>
          </main>
        )}

      </div>
    </div>
  );
}
