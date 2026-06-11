import { useNavigate } from "react-router-dom";
import React, { useState } from "react";
import { callGroq } from "@/lib/groq";

interface MistakeProps {
}

interface MistakeItem {
  id: number | string;
  subject: string;
  date: string;
  overdue: boolean;
  title: string;
  desc: string;
  quiz?: {
    q: string;
    options: string[];
    correct: number;
    explanation: string;
  };
}

export default function MistakeJournal() {
  const navigate = useNavigate();
  const [activeSubject, setActiveSubject] = useState("All");
  const [activeQuizId, setActiveQuizId] = useState<number | string | null>(null);
  const [selectedQuizOption, setSelectedOption] = useState<number | null>(null);
  const [quizFeedback, setQuizFeedback] = useState<string | null>(null);
  const [loadingQuizId, setLoadingQuizId] = useState<number | string | null>(null);

  const [mistakes, setMistakes] = useState<MistakeItem[]>([
    {
      id: 1,
      subject: "Biology",
      date: "Oct 24",
      overdue: true,
      title: "Confused Mitosis with Meiosis",
      desc: "I thought crossing over happened in Mitosis prophase, but it actually happens in Meiosis Prophase I.",
      quiz: {
        q: "During which phase does crossing over of homologous chromosomes occur?",
        options: ["Mitosis Prophase", "Meiosis Prophase I", "Mitosis Metaphase", "Meiosis Anaphase II"],
        correct: 1,
        explanation: "Crossing over strictly happens in Prophase I of Meiosis to enhance genetic variations!"
      }
    },
    {
      id: 2,
      subject: "Physics",
      date: "Yesterday",
      overdue: false,
      title: "Forgot the square in Kinetic Energy formula",
      desc: "Used KE = 1/2 mv instead of 1/2 mvÂ/. Need to double check equations before final calculations.",
      quiz: {
        q: "What is the correct kinetic energy formula?",
        options: ["KE = mv", "KE = 1/2 mv", "KE = 1/2 mvÂ/", "KE = mgh"],
        correct: 2,
        explanation: "Kinetic Energy matches 1/2 mvÂ/, while mgh represents gravitational potential energy."
      }
    },
    {
      id: 3,
      subject: "Mathematics",
      date: "Today",
      overdue: false,
      title: "Sign error in quadratic formula",
      desc: "Dropped the negative sign on the 'b' term when plugging into x = (-b Â/ ///(bÂ/ - 4ac)) / 2a.",
      quiz: {
        q: "If the equation has b = 5, what is the starting term of (-b) in the quadratic formula?",
        options: ["5", "-5", "Â/5", "1/5"],
        correct: 1,
        explanation: "Since b is positive 5, the term (-b) becomes negative 5."
      }
    }
  ]);

  const filteredMistakes = activeSubject === "All" 
    ? mistakes 
    : mistakes.filter(m => m.subject.toLowerCase() === activeSubject.toLowerCase());

  // Generate / Fetch dynamic practice questions corresponding to mistakes
  const handleStartQuiz = async (item: MistakeItem) => {
    if (item.quiz && item.id !== 1 && item.id !== 2 && item.id !== 3) {
      // already generated manual ones
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
      const promptText = `Generate a high-quality educational multiple-choice quiz question specifically designed to test a student's correction of this misconception:
Title: "${item.title}"
Misconception / Mistake: "${item.desc}"

Return strictly a valid raw JSON object. Do not include markdown wraps or ticks.
JSON object structure:
{
  "q": "The multiple choice question to solve...",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correct": 1, // index (0 to 3) of the correct option
  "explanation": "Clear analytical explanation for why this choice corrects the mistake"
}`;

      const systemPrompt = "You are a master scientific tutor generating study practice questions as raw JSON only.";

      // Safe callGroq signature resolver
      const callGroqWithModel = async (pText: string, sysPrompt: string) => {
        const fn = callGroq as any;
        const fnStr = fn.toString();
        if (fnStr.includes("messages") || fnStr.includes("llama")) {
          return await fn([{ role: "user", content: pText }], sysPrompt, "llama-3.3-70b-versatile", 1000);
        } else {
          return await fn(pText, sysPrompt, "application/json");
        }
      };

      const aiResponse = await callGroqWithModel(promptText, systemPrompt);
      let sanitized = aiResponse.trim();
      if (sanitized.startsWith("```")) {
        sanitized = sanitized.replace(/^```(json)?/, "").replace(/```$/, "").trim();
      }

      const generated = JSON.parse(sanitized);
      if (generated.q && Array.isArray(generated.options)) {
        // save generated quiz to the mistake item
        setMistakes(prev => prev.map(m => m.id === item.id ? { ...m, quiz: generated } : m));
        setActiveQuizId(item.id);
      } else {
        throw new Error("Invalid structure");
      }
    } catch {
      // serving fallback
      setActiveQuizId(item.id);
    } finally {
      setLoadingQuizId(null);
    }
  };

  const handleSubmitQuiz = (item: any) => {
    if (selectedQuizOption === null || !item.quiz) return;
    if (selectedQuizOption === item.quiz.correct) {
      setQuizFeedback("//// Correct! You've mastered this item and corrected your slip.");
      setTimeout(() => {
        setMistakes(prev => prev.filter(m => m.id !== item.id));
        setActiveQuizId(null);
        setSelectedOption(null);
        setQuizFeedback(null);
      }, 2000);
    } else {
      setQuizFeedback("/// Correct. Hint: " + item.quiz.explanation);
    }
  };

  const handleAddNewMistake = () => {
    const title = prompt("Describe the mistake / misconception key concept:");
    if (!title) return;
    const sub = prompt("Subject category (e.g. Biology, Physics, Mathematics, chemistry):") || "General";
    const desc = prompt("What was the correct fact or the formula you forgot?") || "Double check before answering.";

    const newItem: MistakeItem = {
      id: "mistake_" + Date.now(),
      subject: sub,
      date: "Today",
      overdue: false,
      title: title,
      desc: desc,
      quiz: {
        q: `Regarding ${title}: identify the corrective action or approach:`,
        options: [
          desc,
          "Re-read original syllabus draft",
          "Postpone practice to final reviews",
          "Rely on simple guessing steps"
        ],
        correct: 0,
        explanation: "The initial answer explicitly represents the dynamic correct fact or equation forgotten."
      }
    };

    setMistakes([newItem, ...mistakes]);
  };

  return (
    <div className="bg-[#FAF7F2] min-h-full relative overflow-y-auto w-full flex-1 flex flex-col font-body-md text-on-background pb-24">
      
      {/* TopAppBar */}
      <header className="flex items-center justify-between px-5 h-16 w-full bg-[#FAF7F2] sticky top-0 border-b-2 border-on-background z-50">
        <button 
          onClick={() => navigate("/dashboard")}
          className="text-primary hover:bg-surface-container-high transition-colors p-2 rounded-full cursor-pointer border-2 border-black bg-white shadow-[2px_2px_rgba(0,0,0,1)] w-9 h-9 flex items-center justify-center"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        </button>
        <span className="font-headline text-[18px] text-[#1c1c19] font-extrabold pr-4 flex-1 text-center">Mistake Journal</span>
        <button 
          onClick={handleAddNewMistake}
          className="text-[#E8534A] hover:bg-surface-container-high transition-colors p-1 rounded-full cursor-pointer flex items-center justify-center font-bold"
          title="Add mistake log entry"
        >
          <span className="material-symbols-outlined">add_circle</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="px-5 py-6 flex flex-col gap-6 flex-1">
        
        {/* Dynamic Summary Cards */}
        <div className="flex gap-4">
          <div className="flex-1 bg-white rounded-2xl border-2 border-black p-4 flex flex-col items-center justify-center shadow-ink-sm">
            <span className="font-headline text-headline-lg text-primary font-extrabold text-[24px]">{mistakes.length}</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant font-bold text-[12.5px] mt-1">To Review</span>
          </div>
          <div className="flex-1 bg-[#E8534A] text-white rounded-2xl border-2 border-black p-4 flex flex-col items-center justify-center shadow-ink-sm">
            <span className="font-headline text-headline-lg font-extrabold text-[24px]">27</span>
            <span className="font-label-sm text-label-sm text-white opacity-85 font-bold text-[12.5px] mt-1">Resolved</span>
          </div>
        </div>

        {/* Filter Chips Bar */}
        <div className="flex gap-2.5 overflow-x-auto pb-2.5 no-scrollbar shrink-0">
          {["All", "Biology", "Physics", "Mathematics"].map((sub) => (
            <button
              key={sub}
              onClick={() => {
                setActiveSubject(sub);
                setActiveQuizId(null);
              }}
              className={`shrink-0 px-4 py-2.5 rounded-full border-2 border-black font-label-md transition-all text-[13.5px] cursor-pointer ${
                (sub === "All" && activeSubject === "All") || activeSubject.toLowerCase() === sub.toLowerCase()
                  ? "bg-[#1C1C19] text-white font-extrabold"
                  : "bg-white text-black hover:bg-neutral-100"
              }`}
            >
              {sub === "All" ? "All Subjects" : sub}
            </button>
          ))}
        </div>

        {/* Review list header */}
        <div className="flex items-center justify-between">
          <h2 className="font-headline text-headline-md text-black font-extrabold text-[17px]">Slips & Misconceptions</h2>
          <span className="bg-primary/10 text-primary font-bold px-3 py-1 rounded-full text-[13px]">
            {filteredMistakes.length} items
          </span>
        </div>

        {/* Mistake list container */}
        <div className="flex flex-col gap-5">
          {filteredMistakes.map((item) => (
            <article 
              key={item.id}
              className="bg-white rounded-2xl border-2 border-[#1A1A1A] shadow-[4px_4px_rgba(0,0,0,1)] p-5 flex flex-col gap-4 relative"
            >
              <div className="flex justify-between items-start">
                <div className="flex gap-2 items-center">
                  <span className="bg-slate-100 text-black border border-black/30 px-3.5 py-1 rounded-full font-label-sm text-[11px] font-bold">
                    {item.subject}
                  </span>
                  <span className="font-label-sm text-on-surface-variant font-bold/60 text-[12px]">
                    {item.date}
                  </span>
                </div>
                
                {item.overdue && (
                  <span className="bg-[#E8534A] text-white border border-[#1A1A1A] px-2 rounded font-label-sm flex items-center gap-1 font-bold text-[11px]">
                    ////// Overdue
                  </span>
                )}
              </div>

              <h3 className="font-headline text-[17px] text-on-background font-extrabold leading-tight">
                {item.title}
              </h3>
              <p className="font-body-md text-slate-700 text-[14px] leading-relaxed">
                {item.desc}
              </p>

              {/* Quiz Trigger button */}
              <button 
                onClick={() => handleStartQuiz(item)}
                disabled={loadingQuizId === item.id}
                className="self-start mt-2 bg-[#FAF7F2] text-black border-2 border-black px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 hover:bg-neutral-100 transition-all cursor-pointer"
              >
                {loadingQuizId === item.id ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">smart_toy</span>
                    AI Challenge Practice
                  </>
                )}
              </button>

              {/* Quiz Overlay */}
              {activeQuizId === item.id && item.quiz && (
                <div className="mt-4 p-5 bg-slate-50 rounded-xl border-2 border-black flex flex-col gap-3.5 relative">
                  <h4 className="font-headline text-[12px] uppercase tracking-wider text-[#E8534A] font-extrabold">
                    AI Diagnostic Quiz
                  </h4>
                  <p className="font-headline text-[14.5px] text-black font-extrabold leading-snug">
                    {item.quiz.q}
                  </p>

                  <div className="flex flex-col gap-2.5 mt-1.5">
                    {item.quiz.options.map((opt, oIdx) => (
                      <button
                        key={oIdx}
                        onClick={() => setSelectedOption(oIdx)}
                        className={`text-left p-3 rounded-lg border text-[13px] font-bold transition-all cursor-pointer ${
                          selectedQuizOption === oIdx 
                            ? "bg-primary text-white border-black" 
                            : "bg-white text-black hover:bg-neutral-50 border-black/25"
                        }`}
                      >
                        {["A", "B", "C", "D"][oIdx]}. {opt}
                      </button>
                    ))}
                  </div>

                  {quizFeedback && (
                    <p className={`p-3 rounded text-[12.5px] font-bold ${
                      quizFeedback.startsWith("////") ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}>
                      {quizFeedback}
                    </p>
                  )}

                  <div className="flex justify-between items-center gap-2 mt-2.5">
                    <button 
                      onClick={() => setActiveQuizId(null)}
                      className="text-slate-500 font-bold text-[12.5px] underline cursor-pointer"
                    >
                      Close
                    </button>
                    <button 
                      disabled={selectedQuizOption === null}
                      onClick={() => handleSubmitQuiz(item)}
                      className={`px-4.5 py-2 rounded border border-black text-[12.5px] font-bold cursor-pointer ${
                        selectedQuizOption !== null ? "bg-[#1C1C19] text-white hover:opacity-90" : "bg-neutral-300 opacity-60"
                      }`}
                    >
                      Submit Answer
                    </button>
                  </div>
                </div>
              )}
            </article>
          ))}

          {filteredMistakes.length === 0 && (
            <div className="text-center p-8 bg-white border-2 border-dashed border-[#1A1A1A]/30 rounded-2xl opacity-60">
              <span className="material-symbols-outlined text-teal-600 text-3xl mb-1">done_all</span>
              <p className="font-headline font-bold text-black text-[15px]">All Settled!</p>
              <p className="text-[12px] mt-1 font-semibold">No active mistakes to review under this subject filter.</p>
            </div>
          )}
        </div>

      </main>

      {/* FAB Floating Action Button */}
      <button 
        onClick={handleAddNewMistake}
        className="fixed bottom-24 right-5 w-14 h-14 bg-[#E8534A] text-white rounded-full border-2 border-black flex items-center justify-center shadow-[3px_3px_rgba(0,0,0,1)] active:translate-y-0.5 select-none hover:bg-opacity-95 cursor-pointer"
      >
        <span className="material-symbols-outlined text-[26px] font-bold">add</span>
      </button>
    </div>
  );
}
