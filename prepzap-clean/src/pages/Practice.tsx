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
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes default
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeSource, setActiveSource] = useState<any>(null);
  const [activeSourcesCount, setActiveSourcesCount] = useState(0);

  // Fallback / standard core educational quiz questions
  const [questions, setQuestions] = useState<Question[]>([]);

  // Synchronize active source contexts on mount
  useEffect(() => {
    const ctx = loadContext();
    const activeIds = Array.isArray(ctx) ? ctx : (ctx as any)?.selectedIds || [];
    setActiveSourcesCount(ctx.selectedIds?.length ?? 0);
    setActiveSource(getActiveSource());
  }, []);

  // Timer tick simulation
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
  "correct": 0, // index of correct option (0 to 3)
  "subject": "Name of Subject (e.g. History)",
  "difficulty": "Easy, Medium or Hard"
}`;

      // Safe callGroq signature resolver mapping to local or remote environments
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
      
      // Sanitisation to extract JSON if anything like markdown wraps it
      let sanitized = aiResponse.trim();
      if (sanitized.startsWith("```json")) {
        sanitized = sanitized.substring(7);
      }
      if (sanitized.endsWith("```")) {
        sanitized = sanitized.substring(0, sanitized.length - 3);
      }
      sanitized = sanitized.trim();

      const parsed = JSON.parse(sanitized);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setQuestions(parsed);
        setCurrentQIndex(0);
        setSelectedOption(null);
        setAnswers([]);
        setScore(0);
        setTimeLeft(450); // reset clock to 7.5 mins
        
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

  const handleSelectOption = (index: number) => {
    setSelectedOption(index);
  };

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
      setSelectedOption(null); // Reset option selected
    } else {
      // Award real game-like progression dynamics: XP and Coins
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
            if (typeof refreshProfile === "function") {
              await refreshProfile();
            }
          } catch (err) {
            console.error("Error updating profile via Supabase:", err);
            await supabase.from("profiles").update({ total_xp: (profile?.total_xp ?? 0) + xpAwarded }).eq("id", user?.id ?? ""); await refreshProfile();
          }
        } else {
          await supabase.from("profiles").update({ total_xp: (profile?.total_xp ?? 0) + xpAwarded }).eq("id", user?.id ?? ""); await refreshProfile();
        }
      };

      triggerRewards();
      saveHistory({ prompt: questions.map(q => q.q).join(" | ").slice(0, 120), preview: `Score: ${nextScore}/${questions.length}`, output: JSON.stringify(answers), model: "rex-ai", meta: `${nextScore}/${questions.length} correct` });
      setView("results");
    }
  };

  return (
    <div className="w-full min-h-full bg-[#FAF7F2] flex flex-col flex-1 overflow-hidden">
      {/* TopAppBar */}
      <header className="w-full top-0 sticky z-45 bg-[#FAF7F2] border-b-2 border-[#1A1A1A] flex items-center justify-between px-5 h-16">
        <button 
          onClick={() => navigate("/dashboard")}
          className="text-primary hover:bg-[#ebe8e3] transition-colors p-2 -ml-2 rounded-full flex items-center justify-center border-2 border-[#1A1A1A] bg-white h-10 w-10 active:translate-y-0.5 shadow-[2px_2px_0px_rgba(0,0,0,1)]"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="font-headline text-headline-md text-[#1A1A1A] flex-1 text-center font-extrabold tracking-tight text-[21px]">Practice Exam</h1>
        <button 
          onClick={() => navigate("/analytics")}
          className="text-[#1A1A1A] hover:bg-neutral-50 transition-colors p-2 -mr-2 rounded-full flex items-center justify-center"
        >
          <span className="material-symbols-outlined">history</span>
        </button>
      </header>

      {view === "quiz" && (
        <>
          {/* Main Content Area */}
          <main className="flex-1 w-full px-5 py-6 flex flex-col gap-5 pb-[130px] overflow-y-auto">
            
            {/* AI Generator Banner */}

            <div className="bg-[#e9f2ff] rounded-2xl border-2 border-[#1A1A1A] p-4.5 shadow-[3px_3px_0px_rgba(0,0,0,1)] flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xl">////</span>
                <span className="text-xs font-black text-primary uppercase tracking-wider">Rex AI Quiz Builder</span>
              </div>
              <p className="text-[12.5px] leading-snug font-bold text-black/80">
                {activeSource 
                  ? `Detected active file "${activeSource.name}"! You can compile a custom mock-quiz immediately.`
                  : activeSourcesCount > 0
                    ? `Detected ${activeSourcesCount} active source notes! Let's build a custom exam.`
                    : "Let the Rex study tutor compile 3 custom multi-choice questions covering any subject!"}
              </p>
              <button
                onClick={handleGenerateQuiz}
                disabled={isGenerating}
                className="bg-white hover:bg-black hover:text-white border-2 border-black text-xs font-extrabold py-2 px-3 rounded-lg shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all active:translate-y-0.5 active:shadow-none flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <span className="animate-spin text-sm">///</span> Reading materials...
                  </>
                ) : (
                  <>
                    <span className="text-sm">///</span> Generate Quiz via AI
                  </>
                )}
              </button>
            </div>

            {/* Empty state — no questions yet */}
            {questions.length === 0 && !isGenerating && (
              <div className="flex flex-col items-center justify-center flex-1 py-16 gap-4 text-center">
                <div className="w-20 h-20 bg-white border-2 border-[#1A1A1A] rounded-full flex items-center justify-center shadow-[3px_3px_0px_rgba(0,0,0,1)]">
                  <span className="material-symbols-outlined text-4xl text-primary">quiz</span>
                </div>
                <h2 className="font-extrabold text-[18px] text-[#1A1A1A]">No quiz yet</h2>
                <p className="text-slate-500 font-bold text-[13.5px] max-w-[260px]">
                  Hit "Generate Quiz via AI" above to create your personalized practice exam.
                </p>
              </div>
            )}

            {/* Loading state */}
            {isGenerating && (
              <div className="flex flex-col items-center justify-center flex-1 py-16 gap-4">
                <div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                <p className="font-bold text-[14px] text-slate-500">Rex AI is building your quiz...</p>
              </div>
            )}

            {/* Quiz content — only when questions exist */}
            {questions.length > 0 && !isGenerating && (() => {
              const currentQuestion = questions[currentQIndex];
              const progressPercent = Math.round(((currentQIndex + 1) / questions.length) * 100);
              return (
                <>
                  {/* Progress / Meta Info */}
                  <div className="flex items-center justify-between w-full mt-1">
                    <div className="text-black bg-white px-3.5 py-1.5 rounded-full border-2 border-[#1A1A1A] shadow-[2px_2px_0px_rgba(0,0,0,1)] flex items-center gap-1.5 text-[13px] font-bold">
                      <span className="material-symbols-outlined text-[15px] text-primary font-bold">timer</span>
                      {formatTime(timeLeft)}
                    </div>
                    <div className="text-[#1A1A1A] font-extrabold text-[16px]">
                      Question {currentQIndex + 1} <span className="text-slate-500 font-bold text-[13px]">/ {questions.length}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-3 bg-white border-2 border-[#1A1A1A] rounded-full overflow-hidden relative">
                    <div 
                      className="h-full bg-primary absolute left-0 top-0 transition-all duration-300" 
                      style={{ width: `${progressPercent}%`, borderRight: "2px solid #1A1A1A" }}
                    ></div>
                  </div>

                  {/* Question Card */}
                  <div className="bg-white rounded-2xl border-2 border-[#1A1A1A] shadow-[3px_3px_0px_rgba(0,0,0,1)] p-5 relative overflow-visible">
                    <div className="absolute -top-3 -right-3 w-8 h-8 bg-[#85f5eb] rounded-full border-2 border-[#1A1A1A] flex items-center justify-center transform rotate-12 z-10">
                      <span className="material-symbols-outlined text-[16px] text-[#1A1A1A] font-bold">psychology_alt</span>
                    </div>
                    <h2 className="text-black font-extrabold leading-snug text-[16.5px]">
                      {currentQuestion.q}
                    </h2>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="inline-flex items-center px-3 py-1 bg-[#FAF7F2] border-2 border-[#1A1A1A] rounded-full text-slate-800 text-[11.5px] font-bold uppercase tracking-wider">
                        <span className="material-symbols-outlined text-[13px] mr-1 font-bold">folder</span>
                        {currentQuestion.subject}
                      </span>
                      <span className="inline-flex items-center px-3 py-1 bg-[#FAF7F2] border-2 border-[#1A1A1A] rounded-full text-slate-800 text-[11.5px] font-bold uppercase tracking-wider">
                        <span className="material-symbols-outlined text-[13px] mr-1 font-bold">leaderboard</span>
                        {currentQuestion.difficulty}
                      </span>
                    </div>
                  </div>

                  {/* Answers List */}
                  <div className="flex flex-col gap-3.5 mt-1">
                    {currentQuestion.options.map((option, idx) => {
                      const label = ["A", "B", "C", "D"][idx];
                      const isSelected = selectedOption === idx;
                      return (
                        <button
                          key={idx}
                          onClick={() => handleSelectOption(idx)}
                          className={`w-full text-left rounded-2xl border-2 border-[#1A1A1A] p-4 flex items-center gap-4 transition-all duration-100 cursor-pointer ${
                            isSelected 
                              ? "bg-[#ffdad6] shadow-[3px_3px_0px_rgba(0,0,0,1)] -translate-y-0.5" 
                              : "bg-white hover:bg-neutral-50 shadow-[1px_1px_0px_rgba(0,0,0,0.1)] hover:shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5"
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full border-2 border-[#1A1A1A] flex items-center justify-center flex-shrink-0 font-extrabold text-[13px] transition-colors ${
                            isSelected ? "bg-primary text-white" : "bg-neutral-100 text-[#1A1A1A]"
                          }`}>
                            {label}
                          </div>
                          <span className={`text-[#1A1A1A] leading-tight text-[14.5px] ${isSelected ? "font-extrabold" : "font-bold"}`}>
                            {option}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </main>

          {/* Bottom Action Area — only show when quiz is active */}
          {questions.length > 0 && !isGenerating && (
            <div className="sticky bottom-0 w-full bg-[#FAF7F2] border-t-2 border-[#1A1A1A] px-5 py-4 pb-6 z-30">
              <button 
                disabled={selectedOption === null}
                onClick={handleNext}
                className={`w-full text-white py-3.5 rounded-xl border-2 border-[#1A1A1A] shadow-[3px_3px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-1.5 active:translate-y-0.5 active:shadow-none transition-all text-[15px] font-extrabold ${
                  selectedOption !== null ? "bg-primary opacity-100 cursor-pointer" : "bg-neutral-300 pointer-events-none opacity-50"
                }`}
              >
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
            <span className="material-symbols-outlined text-4xl text-[#1A1A1A] font-bold">emoji_events</span>
          </div>

          <h2 className="text-[#1A1A1A] font-black mb-1.5 text-[24px]">Exam Compiled!</h2>
          <p className="text-slate-500 font-bold max-w-[280px] mb-6 text-[14px]">
            Practice test recorded in historic journals. Review detailed scores below.
          </p>

          <div className="w-full bg-white border-2 border-[#1A1A1A] rounded-2xl p-5.5 shadow-[4px_4px_0px_rgba(0,0,0,1)] flex flex-col gap-4 text-left mb-8">
            <div className="flex justify-between items-center border-b pb-2.5">
              <span className="font-extrabold text-slate-500 text-[13.5px]">SUCCESS METRIC</span>
              <span className="text-primary text-[22px] font-black">
                {Math.round((score / questions.length) * 100)}%
              </span>
            </div>
            <div className="flex justify-between items-center border-b pb-2.5">
              <span className="font-extrabold text-slate-500 text-[13.5px]">CORRECT HITS</span>
              <span className="text-black text-[15.5px] font-bold">{score} / {questions.length} items</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-extrabold text-slate-500 text-[13.5px]">REWARDS UNLOCKED</span>
              <span className="text-[#F5A623] font-bold text-[14.5px]">+{score * 30 + 10} XP �/ +{score * 15 + 5} Coins</span>
            </div>
          </div>

          <div className="flex gap-4.5 w-full">
            <button 
              onClick={() => {
                setView("quiz");
                setCurrentQIndex(0);
                setSelectedOption(null);
                setScore(0);
                setAnswers([]);
                setTimeLeft(600);
              }}
              className="flex-1 bg-white border-2 border-[#1A1A1A] text-[#1A1A1A] py-3.5 rounded-xl font-bold hover:bg-neutral-50 active:translate-y-0.5 shadow-[2px_2px_0px_rgba(0,0,0,1)] text-[13.5px] cursor-pointer"
            >
              Retry Exam
            </button>
            <button 
              onClick={() => navigate("/dashboard")}
              className="flex-1 bg-primary border-2 border-[#1A1A1A] text-white py-3.5 rounded-xl font-bold hover:opacity-95 active:translate-y-0.5 shadow-[2px_2px_0px_rgba(0,0,0,1)] text-[13.5px] cursor-pointer"
            >
              Dashboard
            </button>
          </div>
        </main>
      )}
    </div>
  );
}
