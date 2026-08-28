import { useNavigate } from "react-router-dom";
import { SharedSidebar } from "@/components/SharedSidebar";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { callGroq } from "@/lib/groq";
import { usePlan } from "@/hooks/usePlan";
import UpgradePrompt, { SoftWarning } from "@/components/UpgradePrompt";

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

// FIX BUG 1: scope localStorage keys to user ID to prevent data leakage across accounts
const getMistakesKey = (userId?: string | null) =>
  userId ? `studenius_mistakes_${userId}` : "studenius_mistakes_anon";

// FIX: INITIAL_MISTAKES removed — page was showing hardcoded fake data
// even before the user added anything. Start with empty array.
const INITIAL_MISTAKES: MistakeItem[] = [];

// ─── MistakeCard lifted OUT of MistakeJournal to prevent remount-on-every-render ───
// (defining components inside another component causes React to treat them as
// new component types on each render, which unmounts/remounts and breaks inputs)
interface MistakeCardProps {
  item: MistakeItem;
  activeQuizId: number | string | null;
  selectedQuizOption: number | null;
  quizFeedback: string | null;
  loadingQuizId: number | string | null;
  onDelete: (id: number | string) => void;
  onMarkResolved: (id: number | string) => void;
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
  onMarkResolved,
  onStartQuiz,
  onSubmitQuiz,
  onSelectOption,
  onCloseQuiz,
}: MistakeCardProps) {
  return (
    <article className={`bg-white border-2 border-black flex flex-col overflow-hidden transition-all hover:-translate-y-0.5 ${
      item.resolved ? "opacity-70" : ""
    }`} style={{ boxShadow: "5px 5px 0px #000" }}>
      {/* Card header */}
      <div className="px-5 py-4 border-b-2 border-black bg-[#F0EDE0]">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="bg-black text-white px-3 py-0.5 text-[10px] font-black uppercase rounded-full tracking-widest">
            {item.subject}
          </span>
          {item.resolved ? (
            <span className="text-green-700 font-black text-[10px] uppercase tracking-widest flex items-center gap-1">
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
          <h3 className="font-black text-[17px] leading-tight pr-4">{item.title}</h3>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-[12px] font-bold text-black/50">{item.date}</span>
            <button
              onClick={() => onDelete(item.id)}
              title="Delete entry"
              className="text-black/30 hover:text-[#FF4D2E] transition-colors">
              <span className="material-symbols-outlined text-[18px]">delete</span>
            </button>
          </div>
        </div>
      </div>

      {/* Card body — hidden during quiz to prevent cheating */}
      {activeQuizId === item.id ? (
        <div className="px-5 py-4 flex items-center gap-2 text-black/30 border-b-2 border-black/10 bg-[#FAF7F2]">
          <span className="material-symbols-outlined text-[16px]">lock</span>
          <span className="text-[11px] font-black uppercase tracking-widest">Answer hidden during quiz</span>
        </div>
      ) : (
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
      )}

      {/* Quiz section */}
      {activeQuizId === item.id && item.quiz ? (
        <div className="px-5 pb-5 flex flex-col gap-3">
          <div className="bg-[#FAF7F2] border-2 border-black p-4 flex flex-col gap-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#FF4D2E]">AI Diagnostic Quiz</span>
            <p className="font-black text-[14px] leading-snug">{item.quiz.q}</p>
            <div className="flex flex-col gap-2">
              {item.quiz.options.map((opt, oIdx) => (
                <button key={oIdx} onClick={() => onSelectOption(oIdx)}
                  className={`text-left p-3 border-2 text-[13px] font-bold transition-all cursor-pointer ${
                    selectedQuizOption === oIdx ? "bg-black text-white border-black" : "bg-white text-black border-black/20 hover:border-black"
                  }`}>
                  {["A","B","C","D"][oIdx]}. {opt}
                </button>
              ))}
            </div>
            {quizFeedback && (
              <p className={`p-3 border-2 text-[12px] font-bold ${
                quizFeedback.startsWith("✓") ? "bg-green-50 border-green-400 text-green-800" : "bg-red-50 border-red-300 text-red-800"
              }`}>{quizFeedback}</p>
            )}
            <div className="flex justify-between items-center">
              <button onClick={onCloseQuiz}
                className="text-black/40 font-bold text-[12px] underline cursor-pointer hover:text-black">
                Close
              </button>
              <button disabled={selectedQuizOption === null} onClick={() => onSubmitQuiz(item)}
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
        <div className="border-t-2 border-black flex">
          {!item.resolved && (
            <button
              onClick={() => onMarkResolved(item.id)}
              className="px-4 py-3 bg-white border-r-2 border-black text-black/40 hover:text-green-700 hover:bg-green-50 transition-colors text-[12px] font-black flex items-center gap-1 shrink-0"
              title="Mark as resolved">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
            </button>
          )}
          <button
            onClick={() => onStartQuiz(item)}
            disabled={loadingQuizId === item.id || item.resolved}
            className={`flex-1 py-3 flex items-center justify-center gap-2 text-[13px] font-black transition-colors ${
              item.resolved
                ? "bg-[#E2E2E2] text-black/40 cursor-not-allowed"
                : "bg-[#FF4D2E] text-white hover:bg-black cursor-pointer"
            }`}>
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
}

// ─── EmptyState lifted OUT of MistakeJournal (same remount-fix reason) ───
function EmptyState({ colSpan = false }: { colSpan?: boolean }) {
  return (
    <div className={`text-center py-16 border-2 border-dashed border-black/20 bg-white flex flex-col items-center gap-3 ${colSpan ? "col-span-full" : ""}`}>
      <span className="material-symbols-outlined text-[48px] text-black/20">menu_book</span>
      <p className="font-black text-[16px] text-black/40">No mistakes logged yet</p>
      <p className="text-[13px] text-black/30 font-medium">Tap <strong>+ New Entry</strong> to log your first misconception</p>
    </div>
  );
}

export default function MistakeJournal() {
  const navigate = useNavigate();
  // FIX: pull profile from auth so avatar initial is dynamic, not hardcoded "R"
  const { profile, user } = useAuth();
  const { isPro, canUse, remaining, logUsage } = usePlan();
  const [activeSubject, setActiveSubject] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeQuizId, setActiveQuizId] = useState<number | string | null>(null);
  const [selectedQuizOption, setSelectedOption] = useState<number | null>(null);
  const [quizFeedback, setQuizFeedback] = useState<string | null>(null);
  const [loadingQuizId, setLoadingQuizId] = useState<number | string | null>(null);
  // FIX BUG 1: load mistakes from user-scoped storage key
  const [mistakes, setMistakes] = useState<MistakeItem[]>([]);
  const [newEntryOpen, setNewEntryOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSubject, setNewSubject] = useState("Biology");
  const [newDesc, setNewDesc] = useState("");

  // Freemium state
  // FIX BUG 4: initialize as null to avoid flicker
  const [remainingUses, setRemainingUses] = useState<number | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    remaining("mistake_journal").then(setRemainingUses);
  }, [remaining]);

  // FIX BUG 1: load mistakes from user-scoped key; reload when user changes
  useEffect(() => {
    try {
      const key = getMistakesKey(user?.id);
      const saved = localStorage.getItem(key);
      setMistakes(saved ? JSON.parse(saved) : []);
    } catch {
      setMistakes([]);
    }
  }, [user?.id]);

  const subjects = ["All", "Biology", "Physics", "Mathematics", "Chemistry", "History"];

  const filteredMistakes = mistakes.filter(m => {
    const matchSubject = activeSubject === "All" || m.subject.toLowerCase() === activeSubject.toLowerCase();
    const matchSearch = !searchQuery || m.title.toLowerCase().includes(searchQuery.toLowerCase()) || m.desc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchSubject && matchSearch;
  });

  const toReview = mistakes.filter(m => !m.resolved).length;
  const resolved = mistakes.filter(m => m.resolved).length;

  // FIX: removed fragile fn.toString() heuristic — call callGroq directly
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
      const aiResponse = await callGroq(
        [{ role: "user", content: promptText }],
        systemPrompt,
        "openai/gpt-oss-20b",
        1000
      );
      const sanitized = aiResponse.trim().replace(/^```(json)?/, "").replace(/```$/, "").trim();
      const generated = JSON.parse(sanitized);
      if (generated.q && Array.isArray(generated.options)) {
        const quizAssignedMistakes = mistakes.map(m => m.id === item.id ? { ...m, quiz: generated } : m);
        setMistakes(quizAssignedMistakes);
        try { localStorage.setItem(getMistakesKey(user?.id), JSON.stringify(quizAssignedMistakes)); } catch {}
        setActiveQuizId(item.id);
      } else throw new Error("Invalid structure");
    } catch {
      // FIX: on AI failure, show a generic fallback quiz rather than silently
      // opening an empty quiz panel
      const fallbackQuiz = {
        q: `Which of the following best corrects the misconception: "${item.title}"?`,
        options: [
          item.desc.slice(0, 60) + "...",
          "Review the correct definition in your notes",
          "The original understanding was correct",
          "This concept requires no correction",
        ],
        correct: 1,
        explanation: "Always verify against your study materials for the accurate definition.",
      };
      setMistakes(prev => prev.map(m => m.id === item.id ? { ...m, quiz: fallbackQuiz } : m));
      setActiveQuizId(item.id);
    } finally {
      setLoadingQuizId(null);
    }
  };

  const handleSubmitQuiz = (item: MistakeItem) => {
    if (selectedQuizOption === null || !item.quiz) return;
    if (selectedQuizOption === item.quiz.correct) {
      setQuizFeedback("✓ Correct! You've mastered this item.");
      setTimeout(() => {
        const quizResolvedMistakes = mistakes.map(m => m.id === item.id ? { ...m, resolved: true } : m);
        setMistakes(quizResolvedMistakes);
        try { localStorage.setItem(getMistakesKey(user?.id), JSON.stringify(quizResolvedMistakes)); } catch {}
        setActiveQuizId(null);
        setSelectedOption(null);
        setQuizFeedback(null);
      }, 2000);
    } else {
      setQuizFeedback("✗ Not quite. Hint: " + item.quiz.explanation);
    }
  };

  const handleAddNewMistake = async () => {
    if (!newTitle.trim()) return;

    // Freemium gate
    if (!isPro) {
      const allowed = await canUse("mistake_journal");
      if (!allowed) {
        setNewEntryOpen(false);
        setShowUpgrade(true);
        return;
      }
    }

    const newItem: MistakeItem = {
      id: "mistake_" + Date.now(),
      subject: newSubject,
      date: "Today",
      overdue: false,
      resolved: false,
      title: newTitle,
      desc: newDesc || "Review this concept.",
    };
    const updatedMistakes = [newItem, ...mistakes];
    setMistakes(updatedMistakes);
    try { localStorage.setItem(getMistakesKey(user?.id), JSON.stringify(updatedMistakes)); } catch {}
    setNewTitle("");
    setNewDesc("");
    setNewSubject("Biology");
    setNewEntryOpen(false);

    if (!isPro) {
      await logUsage("mistake_journal");
      remaining("mistake_journal").then(setRemainingUses);
    }
  };

  // FIX: mark a mistake resolved manually without needing quiz
  const handleMarkResolved = (id: number | string) => {
    const resolvedMistakes = mistakes.map(m => m.id === id ? { ...m, resolved: true } : m);
    setMistakes(resolvedMistakes);
    try { localStorage.setItem(getMistakesKey(user?.id), JSON.stringify(resolvedMistakes)); } catch {}
    if (activeQuizId === id) {
      setActiveQuizId(null);
      setSelectedOption(null);
      setQuizFeedback(null);
    }
  };

  // FIX: delete a mistake entry
  const handleDelete = (id: number | string) => {
    const filteredMistakes = mistakes.filter(m => m.id !== id);
    setMistakes(filteredMistakes);
    try { localStorage.setItem(getMistakesKey(user?.id), JSON.stringify(filteredMistakes)); } catch {}
    if (activeQuizId === id) setActiveQuizId(null);
  };

  // ─── AI Insight: only shown when there are enough mistakes to detect a pattern ───
  const showAiInsight = mistakes.length >= 3;
  // Find dominant unresolved subject for dynamic insight
  const subjectCounts = subjects.slice(1).map(sub => ({
    sub,
    count: mistakes.filter(m => m.subject === sub && !m.resolved).length,
  })).filter(x => x.count > 0).sort((a, b) => b.count - a.count);
  const topSubjects = subjectCounts.slice(0, 2).map(x => x.sub);
  const aiInsightText = topSubjects.length >= 2
    ? `You consistently struggle with ${topSubjects[0]} and ${topSubjects[1]}. A targeted bridge-session connecting these subjects has been prepared.`
    : topSubjects.length === 1
    ? `You have multiple unresolved entries in ${topSubjects[0]}. Focus your next review session there.`
    : "Keep logging mistakes — patterns will appear here once you have 3 or more entries.";

  // ─── New Entry Modal (inline JSX — NOT a nested component to avoid remount bug) ───
  const newEntryModal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={e => { if (e.target === e.currentTarget) setNewEntryOpen(false); }}>
      <div className="bg-[#FAF7F2] border-2 border-black w-full max-w-md" style={{ boxShadow: "6px 6px 0px #000" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b-2 border-black">
          <h3 className="font-black text-[18px]">New Mistake Entry</h3>
          <button onClick={() => setNewEntryOpen(false)} className="material-symbols-outlined text-black hover:text-[#FF4D2E]">close</button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-black uppercase tracking-widest text-black/50">Title / Misconception</label>
            <input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              className="border-2 border-black bg-white px-3 py-2 text-[14px] font-medium focus:outline-none shadow-[2px_2px_0px_#000]"
              placeholder="e.g. Confused Mitosis with Meiosis"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-black uppercase tracking-widest text-black/50">Subject</label>
            <select
              value={newSubject}
              onChange={e => setNewSubject(e.target.value)}
              className="border-2 border-black bg-white px-3 py-2 text-[14px] font-medium focus:outline-none shadow-[2px_2px_0px_#000]">
              {["Biology","Physics","Mathematics","Chemistry","History","General"].map(s => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-black uppercase tracking-widest text-black/50">Description</label>
            <textarea
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              rows={3}
              className="border-2 border-black bg-white px-3 py-2 text-[14px] font-medium focus:outline-none resize-none shadow-[2px_2px_0px_#000]"
              placeholder="What was the correct fact or formula you forgot?"
            />
          </div>
          {/* FIX: disable button when title is empty to prevent blank entries */}
          <button
            onClick={handleAddNewMistake}
            disabled={!newTitle.trim()}
            className={`w-full text-white border-2 border-black py-3 font-black text-[14px] transition-colors ${
              newTitle.trim() ? "bg-[#FF4D2E] hover:bg-black cursor-pointer" : "bg-[#FF4D2E] opacity-40 cursor-not-allowed"
            }`}
            style={{ boxShadow: newTitle.trim() ? "3px 3px 0px #000" : "none" }}>
            + Add Entry
          </button>
        </div>
      </div>
    </div>
  );

  return (
    // FIX: same root layout fix as TeachIt — height:100dvh + overflow:hidden
    <div className="w-full bg-[#FAF7F2] flex flex-col" style={{ height: "100dvh", overflow: "hidden" }}>

      <SharedSidebar active="/mistakes" />

      {showUpgrade && (
        <UpgradePrompt
          feature="mistake_journal"
          remaining={remainingUses}
          onClose={() => setShowUpgrade(false)}
        />
      )}

      {newEntryOpen && newEntryModal}

      {/* ═══════════════════════════════════════════════════
          DESKTOP LAYOUT
          ═══════════════════════════════════════════════════ */}
      <div className="hidden md:flex md:ml-64 flex-col flex-1 overflow-hidden">

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
            
            
            {/* FIX: avatar was hardcoded "R" — now uses profile initial */}
            <div
              onClick={() => navigate("/profile")}
              className="w-10 h-10 border-2 border-black bg-[#ae2925] text-white flex items-center justify-center font-black text-[14px] cursor-pointer hover:opacity-90">
              {profile?.display_name?.charAt(0)?.toUpperCase() ?? "S"}
            </div>
          </div>
        </header>

        {/* Desktop Dual Pane */}
        <div className="flex flex-1 overflow-hidden">

          {/* Left Pane — cards grid */}
          <div className="flex-1 flex flex-col border-r-2 border-black overflow-y-auto">

            {/* Filters row */}
            <div className="px-8 pt-6 pb-4 border-b-2 border-black/10 shrink-0 flex items-center justify-between gap-4">
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
              <div className="flex items-center gap-3 shrink-0">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-black/30 text-[18px]">search</span>
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="border-2 border-black bg-white pl-9 pr-4 py-2 text-[13px] font-medium w-52 focus:outline-none shadow-[2px_2px_0px_#000] focus:translate-x-0.5 focus:translate-y-0.5 focus:shadow-none transition-all"
                    placeholder="Search mistakes..."
                  />
                </div>
                <button
                  onClick={() => setNewEntryOpen(true)}
                  className="flex items-center gap-2 bg-[#FF4D2E] text-white border-2 border-black px-4 py-2 text-[13px] font-black hover:bg-black transition-colors whitespace-nowrap"
                  style={{ boxShadow: "3px 3px 0px #000" }}>
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  New Entry
                </button>
              </div>
              {!isPro && remainingUses !== null && remainingUses <= 4 && remainingUses > 0 && (
                <div className="flex items-center justify-end gap-2 px-8 pt-1">
                  <span className="text-[12px] text-black/50 font-bold">
                    {remainingUses} entr{remainingUses !== 1 ? "ies" : "y"} left today
                  </span>
                  {remainingUses <= 2 && <SoftWarning feature="mistake_journal" remaining={remainingUses} />}
                </div>
              )}
            </div>

            {/* Count label */}
            <div className="px-8 pt-4 pb-2 shrink-0 flex items-center justify-between">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-black/50">
                Slips &amp; Misconceptions
              </h3>
              <span className="text-[11px] font-black text-black/40">{filteredMistakes.length} items</span>
            </div>

            {/* Cards grid */}
            <div className="px-8 pb-8 pt-2">
              {filteredMistakes.length === 0 && mistakes.length === 0 ? (
                <EmptyState colSpan />
              ) : (
                <div className="grid grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredMistakes.map(item => (
                    <MistakeCard
                      key={item.id}
                      item={item}
                      activeQuizId={activeQuizId}
                      selectedQuizOption={selectedQuizOption}
                      quizFeedback={quizFeedback}
                      loadingQuizId={loadingQuizId}
                      onDelete={handleDelete}
                      onMarkResolved={handleMarkResolved}
                      onStartQuiz={handleStartQuiz}
                      onSubmitQuiz={handleSubmitQuiz}
                      onSelectOption={setSelectedOption}
                      onCloseQuiz={() => { setActiveQuizId(null); setSelectedOption(null); setQuizFeedback(null); }}
                    />
                  ))}

                  {/* FIX: AI Insight card in grid only shown when there's
                      real pattern data — not as hardcoded static content */}
                  {showAiInsight && (
                    <article className="bg-black text-white border-2 border-black flex flex-col justify-between relative overflow-hidden min-h-[280px]"
                      style={{ boxShadow: "5px 5px 0px #000" }}>
                      <div className="absolute -top-6 -right-6 w-24 h-24 bg-[#F5A623] rotate-45 border-2 border-black" />
                      <div className="p-6 flex flex-col gap-3 flex-1 justify-center items-center text-center">
                        <span className="material-symbols-outlined text-[#F5A623] text-[48px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                        <h3 className="font-black text-[18px]">AI Insight: Patterns Found</h3>
                        <p className="text-[13px] text-white/70 font-medium leading-relaxed">{aiInsightText}</p>
                      </div>
                      <button className="w-full py-3 bg-[#F5A623] text-black border-t-2 border-black font-black text-[13px] hover:bg-white transition-colors">
                        Review Pattern
                      </button>
                    </article>
                  )}

                  {filteredMistakes.length === 0 && mistakes.length > 0 && (
                    <div className="col-span-full text-center py-12 border-2 border-dashed border-black/20 bg-white">
                      <span className="material-symbols-outlined text-[40px] text-black/20 mb-2 block">search_off</span>
                      <p className="font-black text-[16px] text-black/40">No results for this filter.</p>
                    </div>
                  )}
                </div>
              )}

              {mistakes.length > 0 && (
                <div className="flex justify-center mt-10">
                  <button
                    className="border-2 border-black bg-[#FAF7F2] px-10 py-3 font-black text-[15px] hover:bg-black hover:text-white transition-colors"
                    style={{ boxShadow: "4px 4px 0px #000" }}>
                    Load Past Errors
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Pane — summary */}
          <div className="w-[320px] shrink-0 flex flex-col overflow-y-auto bg-[#FAF7F2]">

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

            {/* Subject breakdown — only shown when there's data */}
            {subjectCounts.length > 0 && (
              <div className="px-6 py-4 border-b-2 border-black/10 shrink-0">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-black/50 mb-3">By Subject</h3>
                <div className="flex flex-col gap-2">
                  {subjectCounts.map(({ sub, count }) => (
                    <button key={sub} onClick={() => { setActiveSubject(sub); setActiveQuizId(null); }}
                      className="flex items-center justify-between px-3 py-2 border-2 border-black bg-white hover:bg-[#F0EDE0] transition-colors text-left">
                      <span className="text-[13px] font-black">{sub}</span>
                      <span className="bg-[#FF4D2E] text-white text-[11px] font-black px-2 py-0.5">{count}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Resolution Rate */}
            <div className="px-6 py-4 border-b-2 border-black/10 shrink-0">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-black/50 mb-3">Resolution Rate</h3>
              {mistakes.length === 0 ? (
                <p className="text-[12px] font-bold text-black/30">Log mistakes to track your progress</p>
              ) : (
                <>
                  <div className="flex items-end gap-1 mb-2">
                    <span className="text-[36px] font-black text-[#FF4D2E] leading-none">
                      {Math.round((resolved / (toReview + resolved)) * 100)}%
                    </span>
                    <span className="text-[13px] font-black text-black/50 mb-1">resolved</span>
                  </div>
                  <div className="h-3 w-full bg-[#E8E4DC] border-2 border-black overflow-hidden">
                    <div className="h-full bg-black transition-all"
                      style={{ width: `${(resolved / (toReview + resolved)) * 100}%` }} />
                  </div>
                  <p className="text-[11px] font-bold text-black/40 mt-1">Keep reviewing to push this higher</p>
                </>
              )}
            </div>

            {/* AI Insight panel — only shown when real pattern exists */}
            {showAiInsight && (
              <div className="px-6 py-4 flex-1">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-black/50 mb-3">AI Insight</h3>
                <div className="bg-black text-white border-2 border-black p-5 relative overflow-hidden" style={{ boxShadow: "3px 3px 0px #000" }}>
                  <div className="absolute -top-4 -right-4 w-16 h-16 bg-[#F5A623] rotate-45" />
                  <span className="material-symbols-outlined text-[#F5A623] text-[32px] mb-3 block" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                  <p className="text-[13px] text-white/80 font-medium leading-relaxed mb-4">{aiInsightText}</p>
                  <button className="w-full py-2.5 bg-[#F5A623] text-black border-2 border-white font-black text-[12px] hover:bg-white transition-colors">
                    Review Pattern
                  </button>
                </div>
              </div>
            )}

            {/* Placeholder when no data */}
            {!showAiInsight && (
              <div className="px-6 py-4 flex-1 flex flex-col items-center justify-center text-center opacity-30 gap-2">
                <span className="material-symbols-outlined text-[40px]">insights</span>
                <p className="text-[12px] font-bold">Log {3 - mistakes.length} more mistake{3 - mistakes.length !== 1 ? "s" : ""} to unlock AI insights</p>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          MOBILE LAYOUT
          ═══════════════════════════════════════════════════ */}
      <div className="md:hidden w-full flex flex-col flex-1 overflow-hidden bg-[#FAF7F2]">

        {/* Mobile TopAppBar */}
        <header className="w-full bg-[#FAF7F2] border-b-2 border-black z-50 shrink-0">
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

        <main className="flex-1 overflow-y-auto px-5 pb-28 pt-5 gap-5 flex flex-col">

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
            {mistakes.length === 0 ? (
              <EmptyState />
            ) : filteredMistakes.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-black/20 bg-white rounded-2xl">
                <span className="material-symbols-outlined text-[36px] text-black/20 mb-2 block">search_off</span>
                <p className="font-black text-[15px] text-black/40">No results for this filter.</p>
              </div>
            ) : (
              filteredMistakes.map(item => (
                <MistakeCard
                  key={item.id}
                  item={item}
                  activeQuizId={activeQuizId}
                  selectedQuizOption={selectedQuizOption}
                  quizFeedback={quizFeedback}
                  loadingQuizId={loadingQuizId}
                  onDelete={handleDelete}
                  onMarkResolved={handleMarkResolved}
                  onStartQuiz={handleStartQuiz}
                  onSubmitQuiz={handleSubmitQuiz}
                  onSelectOption={setSelectedOption}
                  onCloseQuiz={() => { setActiveQuizId(null); setSelectedOption(null); setQuizFeedback(null); }}
                />
              ))
            )}
          </div>

          {/* Resolution rate — only when there's data */}
          {mistakes.length > 0 && (
            <div className="border-2 border-black bg-[#F0EDE0] p-5 relative overflow-hidden" style={{ boxShadow: "3px 3px 0px #000" }}>
              <div className="absolute top-3 right-3">
                <span className="material-symbols-outlined text-black/10 text-[40px]">history_edu</span>
              </div>
              <h4 className="font-black text-[16px] mb-2">Resolution Rate</h4>
              <div className="flex items-end gap-1 mb-3">
                <span className="text-[36px] font-black text-[#FF4D2E] leading-none">
                  {Math.round((resolved / (toReview + resolved)) * 100)}%
                </span>
                <span className="text-[13px] font-black text-black/50 mb-1">resolved</span>
              </div>
              <div className="h-3 w-full bg-[#E8E4DC] border-2 border-black overflow-hidden rounded-full">
                <div className="h-full bg-black transition-all rounded-full"
                  style={{ width: `${(resolved / (toReview + resolved)) * 100}%` }} />
              </div>
              <p className="mt-2 text-[11px] font-bold text-black/40">Keep reviewing to push this higher</p>
            </div>
          )}

          {/* AI Insight — only when pattern data exists */}
          {showAiInsight && (
            <div className="bg-black text-white border-2 border-black p-5 relative overflow-hidden" style={{ boxShadow: "4px 4px 0px #000" }}>
              <div className="absolute -top-4 -right-4 w-16 h-16 bg-[#F5A623] rotate-45" />
              <span className="material-symbols-outlined text-[#F5A623] text-[36px] mb-2 block" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              <h3 className="font-black text-[18px] mb-2">AI Insight: Patterns Found</h3>
              <p className="text-[13px] text-white/70 font-medium leading-relaxed mb-4">{aiInsightText}</p>
              <button className="w-full py-3 bg-[#F5A623] text-black border-2 border-white font-black text-[13px]">
                Review Pattern
              </button>
            </div>
          )}

          {/* Load more — only when there's content */}
          {mistakes.length > 0 && (
            <button
              className="w-full border-2 border-black bg-white py-4 font-black text-[14px] hover:bg-black hover:text-white transition-colors"
              style={{ boxShadow: "4px 4px 0px #000" }}>
              Load Past Errors
            </button>
          )}

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
