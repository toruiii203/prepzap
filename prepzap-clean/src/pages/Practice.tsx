import { loadHistory, addHistoryEntry, deleteHistoryEntry } from "@/lib/historyStore";
import { QuestionSkeleton } from "@/components/SkeletonLoader";
import { buildAIContext, loadLibrary, getActiveSource } from "@/lib/sourceContext";
import { GlobalContextBar } from "@/components/GlobalContextBar";
import { useState, useEffect, useRef } from "react";
import {
  BookOpen, CheckCircle2, XCircle, ChevronRight, RotateCcw,
  Sparkles, Zap, Trophy, Brain, Timer, Target
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { callGroq } from "@/lib/groq";
import { ToolHeader, HistorySidebar, type HistoryEntry } from "@/components/ToolShell";
import { MathRenderer } from "@/components/MathRenderer";
import { ToolPageShell, useModel } from "@/components/ToolPageShell";
import { useToolHistory, ToolHistoryPanel, HistoryButton } from "@/components/ToolHistory";

interface Question {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  topic: string;
}

const SUBJECTS = [
  { name: "Biology", emoji: "🧬", color: "bg-white/10 text-emerald-600 border-emerald-500/20" },
  { name: "Physics", emoji: <><svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="#E8B923" strokeWidth={1.8} strokeLinecap="round" style={{flexShrink:0}}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></>, color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  { name: "Chemistry", emoji: "🧪", color: "bg-violet-500/10 text-violet-600 border-violet-500/20" },
  { name: "History", emoji: "📜", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  { name: "Economics", emoji: <><svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="#00C4B4" strokeWidth={1.8} strokeLinecap="round" style={{flexShrink:0}}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></>, color: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  { name: "Mathematics", emoji: "∑", color: "bg-pink-500/10 text-pink-600 border-pink-500/20" },
];

export default function Practice() {

  const [phase, setPhase] = useState<"setup" | "quiz" | "results">("setup");
  const [subject, setSubject] = useState("");

  const { entries: historyEntries, save: saveHistory, remove: removeHistory, clear: clearHistory } = useToolHistory("practice");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const [customTopic, setCustomTopic] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "mixed" | "hard">("mixed");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wrongAnswers, setWrongAnswers] = useState<number[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quizHistory, setQuizHistory] = useState<HistoryEntry[]>(() => loadHistory("practice"));
  const [activeSource, setActiveSource] = useState(() => getActiveSource());
  const [useSourceAsPrompt, setUseSourceAsPrompt] = useState(false);

  // Keep activeSource in sync when user activates a source via GlobalContextBar
  useEffect(() => {
    const handleStorage = () => setActiveSource(getActiveSource());
    window.addEventListener("storage", handleStorage);
    setActiveSource(getActiveSource()); // sync on mount
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const topic = customTopic.trim() || subject;

  // startQuiz accepts an optional override topic to avoid stale-closure issues
  const startQuiz = async (overrideTopic?: string) => {
    const effectiveTopic = overrideTopic ?? topic;
    const fileContext = buildAIContext();
    if (!effectiveTopic && fileContext.length === 0 && !getActiveSource()) return;
    setIsLoading(true);
    setError(null);
    const quizTopic = effectiveTopic || "the source material";
    try {
      const raw = await callGroq(
        [{ role: "user", content: `Generate 5 multiple choice questions about "${quizTopic}" at ${difficulty} difficulty.${fileContext} Return ONLY valid JSON:\n{"questions":[{"question":"...","options":["A","B","C","D"],"correct":0,"explanation":"why the correct answer is right","topic":"subtopic"}]}` }],
        "You are an expert exam question writer. Write clear, unambiguous multiple choice questions. Each question must have exactly 4 options and one clearly correct answer. The explanation should be 1-2 sentences explaining why the correct answer is right.",
        "llama-3.3-70b-versatile", 1500
      );
      const clean = raw.replace(/```json|```/g, "").trim();
      const jsonMatch = clean.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch?.[0] ?? clean);
      setQuestions(parsed.questions);
      setCurrentQ(0);
      setSelected(null);
      setAnswered(false);
      setScore(0);
      setWrongAnswers([]);
      setQuizHistory(prev => addHistoryEntry("practice", { id: Date.now().toString(), title: quizTopic.slice(0,40), subtitle: `${difficulty} · 5 questions`, timestamp: new Date(), data: { topic: quizTopic, difficulty } }, prev));
      setPhase("quiz");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg.includes("VITE_GROQ_API_KEY")
        ? "⚠️ No API key found. Add VITE_GROQ_API_KEY to your .env file."
        : `Error: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (idx: number) => {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);
    if (idx === questions[currentQ].correct) setScore(s => s + 1);
    else setWrongAnswers(prev => [...prev, currentQ]);
  };

  const next = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ(q => q + 1);
      setSelected(null);
      setAnswered(false);
    } else {
      setPhase("results");
    }
  };

  const q = questions[currentQ];
  const pct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

  const { model, setModel } = useModel();
  if (phase === "setup") return (
    <ToolPageShell showModelPicker model={model} setModel={setModel}>
      <div className="container mx-auto px-4 pt-4 max-w-4xl"><GlobalContextBar compact /></div>
      <main className="flex-1 max-w-3xl mx-auto w-full p-6 space-y-8">
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="w-9 h-9 rounded-none bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20 flex-shrink-0">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Practice</h1>
            <p className="text-xs text-muted-foreground">AI-generated quiz questions on any topic</p>
          </div>
          <button onClick={() => setSidebarOpen(v => !v)}
            className="relative flex items-center justify-center w-8 h-8 rounded-none border border-border bg-card hover:border-primary/50 transition-colors text-muted-foreground hover:text-primary">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
            {quizHistory.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-none bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">{quizHistory.length > 9 ? "9+" : quizHistory.length}</span>}
          </button>
          </div>
        <div className="bg-card border border-border rounded-none p-6 space-y-5">
          <div>
            <label className="text-sm font-semibold mb-2 block">Pick a subject or enter your own topic</label>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {SUBJECTS.map(s => (
                <button key={s.name} onClick={() => { setSubject(s.name); setCustomTopic(""); }}
                  className={cn("flex items-center gap-2 px-3 py-2.5 rounded-none border text-sm font-medium transition-all", subject === s.name && !customTopic ? s.color : "border-border hover:border-primary bg-card")}>
                  <span>{s.emoji}</span>{s.name}
                </button>
              ))}
            </div>
            <input className="w-full px-4 py-3 rounded-none border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Or type a specific topic: e.g. Krebs Cycle, WW2 Causes..."
              value={customTopic} onChange={e => { setCustomTopic(e.target.value); setSubject(""); }} />
          </div>
          <div>
            <label className="text-sm font-semibold mb-2 block">Difficulty</label>
            <div className="flex gap-2">
              {(["easy", "mixed", "hard"] as const).map(d => (
                <button key={d} onClick={() => setDifficulty(d)}
                  className={cn("flex-1 py-2.5 rounded-none border text-sm font-medium capitalize transition-all",
                    difficulty === d
                      ? d === "easy" ? "bg-white text-white border-emerald-500" : d === "hard" ? "bg-red-500 text-white border-red-500" : "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:border-primary")}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          {error && <div className="bg-red-500/10 border border-red-500/20 rounded-none p-3 text-sm text-red-600 dark:text-red-400">{error}</div>}

          {/* ── Generate from Active Source ── */}
          {activeSource ? (
            <div
              className="rounded-none border p-3 flex items-center justify-between gap-3"
              style={{ background: "rgba(212,175,90,0.06)", borderColor: "rgba(212,175,90,0.3)" }}>
              <div className="flex items-center gap-2 min-w-0">
                <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="var(--pz-gold, #E8B923)" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
                </svg>
                <span className="text-xs font-medium truncate" style={{ color: "var(--pz-gold, #E8B923)" }}>
                  Active: <span className="font-semibold">{activeSource.name ?? "Source"}</span>
                </span>
              </div>
              <button
                onClick={() => startQuiz(activeSource.name?.replace(/\.[^.]+$/, "") || "the source material")}
                disabled={isLoading}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all hover:opacity-80 disabled:opacity-40"
                style={{ background: "rgba(212,175,90,0.15)", border: "1px solid rgba(212,175,90,0.4)", color: "var(--pz-gold, #E8B923)" }}>
                <Sparkles className="h-3 w-3" />
                Generate from Source
              </button>
            </div>
          ) : (
            buildAIContext().length > 0 && !topic && (
              <button onClick={() => startQuiz("the source material")}
                disabled={isLoading}
                className="w-full py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-80"
                style={{ background: "rgba(212,175,90,0.08)", border: "1px solid rgba(212,175,90,0.3)", color: "var(--pz-gold, #E8B923)" }}>
                <Sparkles className="h-4 w-4" />
                Generate Questions from Active Source
              </button>
            )
          )}

          <Button onClick={() => startQuiz()} disabled={(!topic && buildAIContext().length === 0 && !activeSource) || isLoading} className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:opacity-90 h-12">
            {isLoading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-none animate-spin mr-2" />Generating Questions...</> : <><Sparkles className="h-4 w-4 mr-2" />Start Practice</>}
          </Button>
          {/* Skeleton while loading */}
          {isLoading && (
            <div className="pt-2">
              <QuestionSkeleton />
            </div>
          )}
        </div>
      </main>
      {showSourcePicker && (
  <div style={{position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16}}>
    <div style={{position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)"}} onClick={() => setShowSourcePicker(false)} />
    <div style={{position: "relative", width: "100%", maxWidth: 380, background: "#0E0E0E", border: "0.5px solid #252525", padding: 18, zIndex: 10, fontFamily: "'Inter', system-ui"}}>
      <div style={{fontSize: 12, fontWeight: 700, marginBottom: 12, color: "#F0F0F0"}}>Pick a source to generate from</div>
      <div style={{display: "flex", flexDirection: "column", gap: 4}}>
              {{loadLibrary().map((s:any)=>(
                <button key={{s.id}} onClick={{()=>{{setShowSourcePicker(false); startQuiz(s.name.replace(/\.\w+$/, ''));}}}}
                  style={{{{width:"100%",padding:"9px 12px",background:"rgba(0,196,180,0.04)",border:"0.5px solid #252525",color:"#C0C0C0",fontSize:11,cursor:"pointer",fontFamily:"inherit",textAlign:"left",transition:"all .15s"}}}}
                  onMouseEnter={{e=>{{e.currentTarget.style.borderColor="#00C4B4";e.currentTarget.style.color="#00C4B4"}}}}
                  onMouseLeave={{e=>{{e.currentTarget.style.borderColor="#252525";e.currentTarget.style.color="#C0C0C0"}}}}>
                  {{s.name}}
                </button>
              ))}}
            </div>
            <button onClick={{()=>setShowSourcePicker(false)}} style={{{{marginTop:10,width:"100%",padding:"7px 0",background:"transparent",border:"0.5px solid #252525",color:"#555",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}}}>Cancel</button>
          </div>
        </div>
      )}}
    </ToolPageShell>
  );

  if (phase === "quiz" && q) return (
    <ToolPageShell showModelPicker model={model} setModel={setModel}>
      <div className="container mx-auto px-4 pt-4 max-w-4xl"><GlobalContextBar compact /></div>
      <main className="flex-1 max-w-2xl mx-auto w-full p-4 space-y-6 pt-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Target className="h-3.5 w-3.5" />{q.topic}</span>
            <span>Question {currentQ + 1} / {questions.length}</span>
          </div>
          <Progress value={((currentQ) / questions.length) * 100} className="h-2" />
        </div>
        <div className="bg-card border border-border rounded-none p-6">
          <p className="text-lg font-semibold leading-relaxed">{q.question}</p>
        </div>
        <div className="space-y-3">
          {q.options.map((opt, i) => {
            const isCorrect = i === q.correct;
            const isSelected = i === selected;
            return (
              <button key={i} onClick={() => handleSelect(i)} disabled={answered}
                className={cn("w-full text-left px-5 py-4 rounded-none border-2 text-sm font-medium transition-all",
                  !answered ? "border-border hover:border-primary hover:bg-primary/5" :
                    isCorrect ? "border-emerald-500 bg-white/10 text-emerald-700 dark:text-emerald-400" :
                      isSelected ? "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400" : "border-border opacity-50")}>
                <span className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-none border-2 flex items-center justify-center text-xs font-bold flex-shrink-0">{String.fromCharCode(65 + i)}</span>
                  <span>{opt}</span>
                  {answered && isCorrect && <CheckCircle2 className="h-5 w-5 text-white/60 ml-auto flex-shrink-0" />}
                  {answered && isSelected && !isCorrect && <XCircle className="h-5 w-5 text-red-500 ml-auto flex-shrink-0" />}
                </span>
              </button>
            );
          })}
        </div>
        {answered && (
          <div className="bg-card border border-border rounded-none p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-semibold">Explanation</span>
            </div>
            <MathRenderer content={q.explanation} className="text-sm text-muted-foreground" />
            <Button onClick={next} className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:opacity-90">
              {currentQ < questions.length - 1 ? <>Next Question <ChevronRight className="h-4 w-4 ml-1" /></> : <>See Results <Trophy className="h-4 w-4 ml-1" /></>}
            </Button>
          </div>
        )}
      </main>
    </ToolPageShell>
  );

  if (phase === "results") return (
    <ToolPageShell showModelPicker model={model} setModel={setModel}>
      <div className="container mx-auto px-4 pt-4 max-w-4xl"><GlobalContextBar compact /></div>
      <main className="flex-1 max-w-lg mx-auto w-full p-6 space-y-6 flex flex-col justify-center">
        <div className="text-center">
          <Trophy className={cn("h-16 w-16 mx-auto mb-4", pct >= 80 ? "text-amber-500" : pct >= 60 ? "text-slate-400" : "text-muted-foreground")} />
          <h2 className="text-3xl font-bold">{score} / {questions.length} Correct</h2>
          <p className="text-muted-foreground mt-1">{topic} · {difficulty}</p>
          <div className={cn("text-5xl font-bold mt-4", pct >= 80 ? "text-white/60" : pct >= 60 ? "text-amber-500" : "text-red-500")}>{pct}%</div>
        </div>
        {wrongAnswers.length > 0 && (
          <div className="bg-red-500/5 border border-red-500/20 rounded-none p-4 space-y-2">
            <p className="text-sm font-semibold text-red-500">Review These Topics:</p>
            {wrongAnswers.map(i => <p key={i} className="text-sm text-muted-foreground">• {questions[i].topic}</p>)}
          </div>
        )}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => { setPhase("quiz"); setCurrentQ(0); setSelected(null); setAnswered(false); setScore(0); setWrongAnswers([]); }}>
            <RotateCcw className="h-4 w-4 mr-2" />Retry
          </Button>
          <Button className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white" onClick={() => { setPhase("setup"); setCustomTopic(""); setSubject(""); }}>
            <Timer className="h-4 w-4 mr-2" />New Quiz
          </Button>
        </div>
      </main>
    </ToolPageShell>
  );
  return null;
}
