import { useNavigate } from "react-router-dom";
import { SharedSidebar } from "@/components/SharedSidebar";
import React, { useState } from "react";
import { callGroq } from "@/lib/groq";

interface MistakeItem {
  id: number | string;
  subject: string;
  date: string;
  overdue: boolean;
  title: string;
  desc: string;
  resolved?: boolean;
  note?: string;
  tags?: string[];
  quiz?: {
    q: string;
    options: string[];
    correct: number;
    explanation: string;
  };
}

const INITIAL_MISTAKES: MistakeItem[] = [
  {
    id: 1,
    subject: "Biology",
    date: "Oct 24",
    overdue: true,
    resolved: false,
    title: "Confused Mitosis with Meiosis",
    desc: "I thought crossing over happened in Mitosis prophase, but it actually happens in Meiosis Prophase I.",
    note: '"Remember: Crossing over strictly occurs in Meiosis Prophase I to enhance genetic diversity."',
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
    resolved: false,
    title: "Forgot the square in Kinetic Energy formula",
    desc: "Used KE = 1/2 mv instead of 1/2 mv². Need to double check equations before final calculations.",
    tags: ["Formula", "Mechanics"],
    quiz: {
      q: "What is the correct kinetic energy formula?",
      options: ["KE = mv", "KE = 1/2 mv", "KE = 1/2 mv²", "KE = mgh"],
      correct: 2,
      explanation: "Kinetic Energy is 1/2 mv², while mgh represents gravitational potential energy."
    }
  },
  {
    id: 3,
    subject: "Mathematics",
    date: "Today",
    overdue: false,
    resolved: true,
    title: "Sign error in quadratic formula",
    desc: "Dropped the negative sign on the 'b' term when plugging into x = (-b ± √(b²-4ac)) / 2a.",
    tags: ["Algebra", "Signs"],
    quiz: {
      q: "If b = 5, what is the (-b) term in the quadratic formula?",
      options: ["5", "-5", "√5", "1/5"],
      correct: 1,
      explanation: "Since b is positive 5, the term (-b) becomes negative 5."
    }
  },
  {
    id: 4,
    subject: "Chemistry",
    date: "Oct 05",
    overdue: true,
    resolved: false,
    title: "Stoichiometry Ratios",
    desc: "Forgot to balance the equation before calculating the limiting reagent. Yield was 40% off.",
    quiz: undefined,
  },
  {
    id: 5,
    subject: "History",
    date: "Oct 08",
    overdue: false,
    resolved: true,
    title: "Treaty of Versailles Dates",
    desc: "Swapped the dates for the armistice and the actual signing. Forgot the territorial clauses regarding the Danzig Corridor.",
    tags: ["Dates", "Geography"],
    quiz: undefined,
  },
];

export default function MistakeJournal() {
  const navigate = useNavigate();
  const [activeSubject, setActiveSubject] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeQuizId, setActiveQuizId] = useState<number | string | null>(null);
  const [selectedQuizOption, setSelectedOption] = useState<number | null>(null);
  const [quizFeedback, setQuizFeedback] = useState<string | null>(null);
  const [loadingQuizId, setLoadingQuizId] = useState<number | string | null>(null);
  const [mistakes, setMistakes] = useState<MistakeItem[]>(INITIAL_MISTAKES);
  const [newEntryOpen, setNewEntryOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSubject, setNewSubject] = useState("Biology");
  const [newDesc, setNewDesc] = useState("");

  const subjects = ["All", "Biology", "Physics", "Mathematics", "Chemistry", "History"];

  const filteredMistakes = mistakes.filter(m => {
    const matchSubject = activeSubject === "All" || m.subject.toLowerCase() === activeSubject.toLowerCase();
    const matchSearch = !searchQuery || m.title.toLowerCase().includes(searchQuery.toLowerCase()) || m.desc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchSubject && matchSearch;
  });

  const toReview = mistakes.filter(m => !m.resolved).length;
  const resolved = mistakes.filter(m => m.resolved).length;

  const handleStartQuiz = async (item: MistakeItem) => {
    if (item.quiz) {
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
      const promptText = `Generate a high-quality educational multiple-choice quiz question to test correction of this misconception:
Title: "${item.title}"
Mistake: "${item.desc}"
Return strictly a valid raw JSON object (no markdown):
{"q":"...","options":["A","B","C","D"],"correct":1,"explanation":"..."}`;
      const systemPrompt = "You are a master scientific tutor generating study practice questions as raw JSON only.";
      const fn = callGroq as any;
      const fnStr = fn.toString();
      let aiResponse: string;
      if (fnStr.includes("messages") || fnStr.includes("llama")) {
        aiResponse = await fn([{ role: "user", content: promptText }], systemPrompt, "llama-3.3-70b-versatile", 1000);
      } else {
        aiResponse = await fn(promptText, systemPrompt, "application/json");
      }
      let sanitized = aiResponse.trim().replace(/^```(json)?/, "").replace(/```$/, "").trim();
      const generated = JSON.parse(sanitized);
      if (generated.q && Array.isArray(generated.options)) {
        setMistakes(prev => prev.map(m => m.id === item.id ? { ...m, quiz: generated } : m));
        setActiveQuizId(item.id);
      } else throw new Error("Invalid structure");
    } catch {
      setActiveQuizId(item.id);
    } finally {
      setLoadingQuizId(null);
    }
  };

  const handleSubmitQuiz = (item: MistakeItem) => {
    if (selectedQuizOption === null || !item.quiz) return;
    if (selectedQuizOption === item.quiz.correct) {
      setQuizFeedback("//// Correct! You've mastered this item.");
      setTimeout(() => {
        setMistakes(prev => prev.map(m => m.id === item.id ? { ...m, resolved: true } : m));
        setActiveQuizId(null);
        setSelectedOption(null);
        setQuizFeedback(null);
      }, 2000);
    } else {
      setQuizFeedback("/// Not quite. Hint: " + item.quiz.explanation);
    }
  };

  const handleAddNewMistake = () => {
    if (!newTitle.trim()) return;
    const newItem: MistakeItem = {
      id: "mistake_" + Date.now(),
      subject: newSubject,
      date: "Today",
      overdue: false,
      resolved: false,
      title: newTitle,
      desc: newDesc || "Review this concept.",
    };
    setMistakes([newItem, ...mistakes]);
    setNewTitle("");
    setNewDesc("");
    setNewEntryOpen(false);
  };

  // ─── Shared: mistake card ─────────────────────────────────────────────────
  const MistakeCard = ({ item }: { item: MistakeItem }) => (
    <article className={`bg-white border-2 border-black flex flex-col overflow-hidden transition-all hover:-translate-y-0.5 ${
      item.resolved ? "opacity-80" : ""
    }`} style={{ boxShadow: "5px 5px 0px #000" }}>
      {/* Card header */}
      <div className="px-5 py-4 border-b-2 border-black bg-[#F0EDE0]">
        <div className="flex items-center gap-2 mb-2">
          <span className="bg-black text-white px-3 py-0.5 text-[10px] font-black uppercase rounded-full tracking-widest">
            {item.subject}
          </span>
          {item.resolved ? (
            <span className="text-black font-black text-[10px] uppercase tracking-widest flex items-center gap-1">
              <span>✓</span> Resolved
            </span>
          ) : (
            <span className="text-[#FF4D2E] font-black text-[10px] uppercase tracking-widest flex items-center gap-1">
              <span className="text-[8px]">●</span> To Review
            </span>
          )}
          {item.overdue && !item.resolved && (
            <span className="bg-[#FF4D2E] text-white text-[10px] font-black px-2 py-0.5 border border-black">
              OVERDUE
            </span>
          )}
        </div>
        <div className="flex justify-between items-start">
          <h3 className="font-black text-[18px] leading-tight pr-4">{item.title}</h3>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-[12px] font-bold text-black/50">{item.date}</span>
            <button className="text-black hover:text-[#FF4D2E] transition-colors">
              <span className="material-symbols-outlined text-[18px]">edit</span>
            </button>
          </div>
        </div>
      </div>

      {/* Card body */}
      <div className="p-5 flex-1 flex flex-col gap-3">
        <p className="text-[14px] text-black/70 font-medium leading-relaxed flex-1">{item.desc}</p>

        {item.note && (
          <div className="bg-[#FAF7F2] border-2 border-black p-3 italic text-[12px] font-medium text-black/70">
            {item.note}
          </div>
        )}

        {item.tags && item.tags.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {item.tags.map(tag => (
              <span key={tag} className="bg-[#E2E2E2] border border-black/20 px-2 py-0.5 text-[11px] font-bold">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Quiz section */}
      {activeQuizId === item.id && item.quiz ? (
        <div className="px-5 pb-5 flex flex-col gap-3">
          <div className="bg-[#FAF7F2] border-2 border-black p-4 flex flex-col gap-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#FF4D2E]">AI Diagnostic Quiz</span>
            <p className="font-black text-[14px] leading-snug">{item.quiz.q}</p>
            <div className="flex flex-col gap-2">
              {item.quiz.options.map((opt, oIdx) => (
                <button key={oIdx} onClick={() => setSelectedOption(oIdx)}
                  className={`text-left p-3 border-2 text-[13px] font-bold transition-all cursor-pointer ${
                    selectedQuizOption === oIdx ? "bg-black text-white border-black" : "bg-white text-black border-black/20 hover:border-black"
                  }`}>
                  {["A","B","C","D"][oIdx]}. {opt}
                </button>
              ))}
            </div>
            {quizFeedback && (
              <p className={`p-3 border-2 text-[12px] font-bold ${
                quizFeedback.startsWith("////") ? "bg-green-50 border-green-400 text-green-800" : "bg-red-50 border-red-300 text-red-800"
              }`}>{quizFeedback}</p>
            )}
            <div className="flex justify-between items-center">
              <button onClick={() => { setActiveQuizId(null); setSelectedOption(null); setQuizFeedback(null); }}
                className="text-black/40 font-bold text-[12px] underline cursor-pointer hover:text-black">
                Close
              </button>
              <button disabled={selectedQuizOption === null} onClick={() => handleSubmitQuiz(item)}
                className={`px-5 py-2 border-2 border-black text-[12px] font-black cursor-pointer ${
                  selectedQuizOption !== null ? "bg-black text-white hover:bg-[#FF4D2E]" : "bg-neutral-200 opacity-50"
                }`}>
                Submit Answer
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* CTA footer */
        <div className="border-t-2 border-black">
          <button onClick={() => handleStartQuiz(item)} disabled={loadingQuizId === item.id || item.resolved}
            className={`w-full py-3 flex items-center justify-center gap-2 text-[13px] font-black transition-colors ${
              item.resolved
                ? "bg-[#E2E2E2] text-black/40 cursor-not-allowed"
                : "bg-[#FF4D2E] text-white hover:bg-black cursor-pointer"
            }`}
            style={!item.resolved ? { boxShadow: "none" } : undefined}>
            {loadingQuizId === item.id ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                {item.resolved ? "Already Resolved" : "Generate Quiz"}
              </>
            )}
          </button>
        </div>
      )}
    </article>
  );

  // ─── New Entry Modal (shared) ─────────────────────────────────────────────
  const NewEntryModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-[#FAF7F2] border-2 border-black w-full max-w-md" style={{ boxShadow: "6px 6px 0px #000" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b-2 border-black">
          <h3 className="font-black text-[18px]">New Mistake Entry</h3>
          <button onClick={() => setNewEntryOpen(false)} className="material-symbols-outlined text-black hover:text-[#FF4D2E]">close</button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-black uppercase tracking-widest text-black/50">Title / Misconception</label>
            <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
              className="border-2 border-black bg-white px-3 py-2 text-[14px] font-medium focus:outline-none shadow-[2px_2px_0px_#000]"
              placeholder="e.g. Confused Mitosis with Meiosis" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-black uppercase tracking-widest text-black/50">Subject</label>
            <select value={newSubject} onChange={e => setNewSubject(e.target.value)}
              className="border-2 border-black bg-white px-3 py-2 text-[14px] font-medium focus:outline-none shadow-[2px_2px_0px_#000]">
              {["Biology","Physics","Mathematics","Chemistry","History","General"].map(s => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-black uppercase tracking-widest text-black/50">Description</label>
            <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={3}
              className="border-2 border-black bg-white px-3 py-2 text-[14px] font-medium focus:outline-none resize-none shadow-[2px_2px_0px_#000]"
              placeholder="What was the correct fact or formula you forgot?" />
          </div>
          <button onClick={handleAddNewMistake}
            className="w-full bg-[#FF4D2E] text-white border-2 border-black py-3 font-black text-[14px] hover:bg-black transition-colors"
            style={{ boxShadow: "3px 3px 0px #000" }}>
            + Add Entry
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full bg-[#FAF7F2] flex flex-col" style={{ minHeight: "100dvh" }}>

      <SharedSidebar active="/mistakes" />

      {newEntryOpen && <NewEntryModal />}

      {/* ═══════════════════════════════════════════════════
          DESKTOP LAYOUT
          ═══════════════════════════════════════════════════ */}
      <div className="hidden md:flex md:ml-64 flex-col min-h-screen">

        {/* Desktop Header */}
        <header className="h-16 flex items-center justify-between px-8 border-b-2 border-black bg-[#FAF7F2] shrink-0 z-30">
          <div className="flex items-center gap-4">
            <span className="text-[22px] font-black tracking-tight">MISTAKE JOURNAL</span>
            <div className="w-px h-6 bg-black/20" />
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 border-2 border-black bg-[#F0EDE0] px-3 py-1">
                <span className="text-[#FF4D2E] font-black text-[20px] leading-none">{toReview}</span>
                <span className="text-[11px] font-black uppercase tracking-widest text-black/50">To Review</span>
              </div>
              <div className="flex items-center gap-1.5 border-2 border-black bg-[#F0EDE0] px-3 py-1">
                <span className="font-black text-[20px] leading-none">{resolved}</span>
                <span className="text-[11px] font-black uppercase tracking-widest text-black/50">Resolved</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="material-symbols-outlined text-black hover:text-[#FF4D2E] transition-colors">notifications</button>
            <button onClick={() => navigate("/go-pro")} className="material-symbols-outlined text-black hover:text-[#F5A623] transition-colors">workspace_premium</button>
            <div onClick={() => navigate("/profile")}
              className="w-10 h-10 border-2 border-black bg-[#ae2925] text-white flex items-center justify-center font-black text-[14px] cursor-pointer hover:opacity-90">
              R
            </div>
          </div>
        </header>

        {/* Desktop Dual Pane */}
        <div className="flex flex-1 overflow-hidden">

          {/* Left Pane — 65% — cards grid */}
          <div className="w-[65%] flex flex-col border-r-2 border-black overflow-y-auto">

            {/* Filters row */}
            <div className="px-8 pt-6 pb-4 border-b-2 border-black/10 shrink-0 flex items-center justify-between gap-4">
              {/* Subject chips */}
              <div className="flex flex-wrap gap-2">
                {subjects.map(sub => (
                  <button key={sub} onClick={() => { setActiveSubject(sub); setActiveQuizId(null); }}
                    className={`px-4 py-1.5 border-2 border-black text-[12px] font-black rounded-full transition-all cursor-pointer ${
                      activeSubject === sub ? "bg-black text-white shadow-[2px_2px_0px_#000]" : "bg-white text-black hover:bg-[#E2E2E2]"
                    }`}>
                    {sub === "All" ? "All Subjects" : sub}
                  </button>
                ))}
              </div>
              {/* Search + New Entry */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-black/30 text-[18px]">search</span>
                  <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    className="border-2 border-black bg-white pl-9 pr-4 py-2 text-[13px] font-medium w-52 focus:outline-none shadow-[2px_2px_0px_#000] focus:translate-x-0.5 focus:translate-y-0.5 focus:shadow-none transition-all"
                    placeholder="Search mistakes..." />
                </div>
                <button onClick={() => setNewEntryOpen(true)}
                  className="flex items-center gap-2 bg-[#FF4D2E] text-white border-2 border-black px-4 py-2 text-[13px] font-black hover:bg-black transition-colors whitespace-nowrap"
                  style={{ boxShadow: "3px 3px 0px #000" }}>
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  New Entry
                </button>
              </div>
            </div>

            {/* Count label */}
            <div className="px-8 pt-4 pb-2 shrink-0 flex items-center justify-between">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-black/50">
                Slips &amp; Misconceptions
              </h3>
              <span className="text-[11px] font-black text-black/40">{filteredMistakes.length} items</span>
            </div>

            {/* Cards grid */}
            <div className="px-8 pb-8">
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredMistakes.map(item => <MistakeCard key={item.id} item={item} />)}

                {/* AI Insight card */}
                <article className="bg-black text-white border-2 border-black flex flex-col justify-between relative overflow-hidden min-h-[300px]"
                  style={{ boxShadow: "5px 5px 0px #000" }}>
                  <div className="absolute -top-6 -right-6 w-24 h-24 bg-[#F5A623] rotate-45 border-2 border-black" />
                  <div className="p-6 flex flex-col gap-3 flex-1 justify-center items-center text-center">
                    <span className="material-symbols-outlined text-[#F5A623] text-[48px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                    <h3 className="font-black text-[20px]">AI Insight: Patterns Found</h3>
                    <p className="text-[13px] text-white/70 font-medium leading-relaxed">
                      You consistently struggle with formula recall across Physics and Mathematics. A bridge-session has been prepared.
                    </p>
                  </div>
                  <button className="w-full py-3 bg-[#F5A623] text-black border-t-2 border-black font-black text-[13px] hover:bg-white transition-colors">
                    Review Pattern
                  </button>
                </article>

                {filteredMistakes.length === 0 && (
                  <div className="col-span-full text-center py-12 border-2 border-dashed border-black/20 bg-white">
                    <span className="material-symbols-outlined text-[40px] text-black/20 mb-2 block">done_all</span>
                    <p className="font-black text-[16px] text-black/40">All settled! No active mistakes here.</p>
                  </div>
                )}
              </div>

              {/* Load more */}
              <div className="flex justify-center mt-10">
                <button className="border-2 border-black bg-[#FAF7F2] px-10 py-3 font-black text-[15px] hover:bg-black hover:text-white transition-colors"
                  style={{ boxShadow: "4px 4px 0px #000" }}>
                  Load Past Errors
                </button>
              </div>
            </div>
          </div>

          {/* Right Pane — 35% — summary + AI insight */}
          <div className="w-[35%] flex flex-col overflow-y-auto bg-[#FAF7F2]">

            {/* Stats */}
            <div className="px-6 pt-6 pb-4 border-b-2 border-black/10 shrink-0">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-black/50 mb-3">Overview</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="border-2 border-black bg-white p-4 flex flex-col items-center" style={{ boxShadow: "3px 3px 0px #000" }}>
                  <span className="text-[36px] font-black text-[#FF4D2E] leading-none">{toReview}</span>
                  <span className="text-[11px] font-black uppercase tracking-widest text-black/50 mt-1">To Review</span>
                </div>
                <div className="border-2 border-black bg-white p-4 flex flex-col items-center" style={{ boxShadow: "3px 3px 0px #000" }}>
                  <span className="text-[36px] font-black leading-none">{resolved}</span>
                  <span className="text-[11px] font-black uppercase tracking-widest text-black/50 mt-1">Resolved</span>
                </div>
              </div>
            </div>

            {/* Subject breakdown */}
            <div className="px-6 py-4 border-b-2 border-black/10 shrink-0">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-black/50 mb-3">By Subject</h3>
              <div className="flex flex-col gap-2">
                {["Biology","Physics","Mathematics","Chemistry","History"].map(sub => {
                  const count = mistakes.filter(m => m.subject === sub && !m.resolved).length;
                  if (count === 0) return null;
                  return (
                    <button key={sub} onClick={() => { setActiveSubject(sub); setActiveQuizId(null); }}
                      className="flex items-center justify-between px-3 py-2 border-2 border-black bg-white hover:bg-[#F0EDE0] transition-colors text-left">
                      <span className="text-[13px] font-black">{sub}</span>
                      <span className="bg-[#FF4D2E] text-white text-[11px] font-black px-2 py-0.5">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Accuracy trend */}
            <div className="px-6 py-4 border-b-2 border-black/10 shrink-0">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-black/50 mb-3">Resolution Rate</h3>
              <div className="flex items-end gap-1 mb-2">
                <span className="text-[36px] font-black text-[#FF4D2E] leading-none">
                  {mistakes.length > 0 ? Math.round((resolved / (toReview + resolved)) * 100) : 0}%
                </span>
                <span className="text-[13px] font-black text-black/50 mb-1">resolved</span>
              </div>
              <div className="h-3 w-full bg-[#E8E4DC] border-2 border-black overflow-hidden">
                <div className="h-full bg-black transition-all"
                  style={{ width: `${mistakes.length > 0 ? (resolved / (toReview + resolved)) * 100 : 0}%` }} />
              </div>
              <p className="text-[11px] font-bold text-black/40 mt-1">Keep reviewing to push this higher</p>
            </div>

            {/* AI Insight panel */}
            <div className="px-6 py-4 flex-1">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-black/50 mb-3">AI Insight</h3>
              <div className="bg-black text-white border-2 border-black p-5 relative overflow-hidden" style={{ boxShadow: "3px 3px 0px #000" }}>
                <div className="absolute -top-4 -right-4 w-16 h-16 bg-[#F5A623] rotate-45" />
                <span className="material-symbols-outlined text-[#F5A623] text-[32px] mb-3 block" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                <p className="text-[13px] text-white/80 font-medium leading-relaxed mb-4">
                  You consistently struggle with formula recall. A targeted bridge-session connecting Physics and Math has been prepared for you.
                </p>
                <button className="w-full py-2.5 bg-[#F5A623] text-black border-2 border-white font-black text-[12px] hover:bg-white transition-colors">
                  Review Pattern
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          MOBILE LAYOUT
          ═══════════════════════════════════════════════════ */}
      <div className="lg:hidden w-full flex flex-col bg-[#FAF7F2]">

        {/* Mobile TopAppBar */}
        <header className="w-full sticky top-0 bg-[#FAF7F2] border-b-2 border-black z-50">
          <div className="flex items-center justify-between px-5 h-14">
            <button onClick={() => navigate(-1)}
              className="flex items-center justify-center border-2 border-black bg-white w-9 h-9 shadow-[2px_2px_0px_#000] hover:bg-[#ebe8e3]">
              <span className="material-symbols-outlined text-black text-[18px]">arrow_back</span>
            </button>
            <span className="font-black text-[18px]">Mistake Journal</span>
            <button onClick={() => setNewEntryOpen(true)}
              className="flex items-center justify-center p-1 rounded-full hover:bg-[#ebe8e3] text-[#FF4D2E]">
              <span className="material-symbols-outlined">add_circle</span>
            </button>
          </div>
        </header>

        <main className="flex-1 flex flex-col px-5 pb-28 pt-5 gap-5">

          {/* Stats row */}
          <div className="flex gap-3">
            <div className="flex-1 bg-white border-2 border-black p-4 flex flex-col items-center shadow-[3px_3px_rgba(0,0,0,1)]">
              <span className="text-[28px] font-black text-[#FF4D2E] leading-none">{toReview}</span>
              <span className="text-[11px] font-black uppercase tracking-widest text-black/50 mt-1">To Review</span>
            </div>
            <div className="flex-1 bg-white border-2 border-black p-4 flex flex-col items-center shadow-[3px_3px_rgba(0,0,0,1)]">
              <span className="text-[28px] font-black leading-none">{resolved}</span>
              <span className="text-[11px] font-black uppercase tracking-widest text-black/50 mt-1">Resolved</span>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-black/30 text-[18px]">search</span>
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full border-2 border-black bg-white pl-9 pr-4 py-2.5 text-[14px] font-medium focus:outline-none shadow-[2px_2px_0px_#000]"
              placeholder="Search mistakes..." />
          </div>

          {/* Subject chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar shrink-0">
            {subjects.map(sub => (
              <button key={sub} onClick={() => { setActiveSubject(sub); setActiveQuizId(null); }}
                className={`shrink-0 px-4 py-2 rounded-full border-2 border-black text-[13px] font-black transition-all cursor-pointer ${
                  activeSubject === sub ? "bg-black text-white shadow-[2px_2px_rgba(0,0,0,1)]" : "bg-white text-black hover:bg-[#ebe8e3]"
                }`}>
                {sub === "All" ? "All Subjects" : sub}
              </button>
            ))}
          </div>

          {/* Count */}
          <div className="flex items-center justify-between">
            <h2 className="font-black text-[16px]">Slips &amp; Misconceptions</h2>
            <span className="text-[12px] font-black text-black/40">{filteredMistakes.length} items</span>
          </div>

          {/* Cards list */}
          <div className="flex flex-col gap-5">
            {filteredMistakes.map(item => <MistakeCard key={item.id} item={item} />)}

            {filteredMistakes.length === 0 && (
              <div className="text-center py-10 border-2 border-dashed border-black/20 bg-white rounded-2xl">
                <span className="material-symbols-outlined text-[36px] text-black/20 mb-2 block">done_all</span>
                <p className="font-black text-[15px] text-black/40">All settled!</p>
                <p className="text-[12px] text-black/30 mt-1 font-medium">No active mistakes in this category.</p>
              </div>
            )}
          </div>

          {/* Resolution rate widget */}
          <div className="border-2 border-black bg-[#F0EDE0] p-5 relative overflow-hidden" style={{ boxShadow: "3px 3px 0px #000" }}>
            <div className="absolute top-3 right-3">
              <span className="material-symbols-outlined text-black/10 text-[40px]">history_edu</span>
            </div>
            <h4 className="font-black text-[16px] mb-2">Resolution Rate</h4>
            <div className="flex items-end gap-1 mb-3">
              <span className="text-[36px] font-black text-[#FF4D2E] leading-none">
                {mistakes.length > 0 ? Math.round((resolved / (toReview + resolved)) * 100) : 0}%
              </span>
              <span className="text-[13px] font-black text-black/50 mb-1">resolved</span>
            </div>
            <div className="h-3 w-full bg-[#E8E4DC] border-2 border-black overflow-hidden rounded-full">
              <div className="h-full bg-black transition-all rounded-full"
                style={{ width: `${mistakes.length > 0 ? (resolved / (toReview + resolved)) * 100 : 0}%` }} />
            </div>
            <p className="mt-2 text-[11px] font-bold text-black/40">Keep reviewing to push this higher</p>
          </div>

          {/* AI Insight mobile */}
          <div className="bg-black text-white border-2 border-black p-5 relative overflow-hidden" style={{ boxShadow: "4px 4px 0px #000" }}>
            <div className="absolute -top-4 -right-4 w-16 h-16 bg-[#F5A623] rotate-45" />
            <span className="material-symbols-outlined text-[#F5A623] text-[36px] mb-2 block" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            <h3 className="font-black text-[18px] mb-2">AI Insight: Patterns Found</h3>
            <p className="text-[13px] text-white/70 font-medium leading-relaxed mb-4">
              You consistently struggle with formula recall across Physics and Mathematics. A bridge-session has been prepared.
            </p>
            <button className="w-full py-3 bg-[#F5A623] text-black border-2 border-white font-black text-[13px]">
              Review Pattern
            </button>
          </div>

          {/* Load more */}
          <button className="w-full border-2 border-black bg-white py-4 font-black text-[14px] hover:bg-black hover:text-white transition-colors"
            style={{ boxShadow: "4px 4px 0px #000" }}>
            Load Past Errors
          </button>

        </main>

        {/* FAB */}
        <button onClick={() => setNewEntryOpen(true)}
          className="fixed bottom-24 right-5 w-14 h-14 bg-[#FF4D2E] text-white rounded-full border-2 border-black flex items-center justify-center shadow-[3px_3px_rgba(0,0,0,1)] active:translate-y-0.5 cursor-pointer z-40">
          <span className="material-symbols-outlined text-[26px]">add</span>
        </button>

      </div>

    </div>
  );
}
