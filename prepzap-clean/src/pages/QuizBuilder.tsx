import { loadHistory, addHistoryEntry, deleteHistoryEntry } from "@/lib/historyStore";
import { buildAIContext, getActiveSource } from "@/lib/sourceContext";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronLeft, PenLine, Sparkles, RotateCcw, CheckCircle2, XCircle, Trophy
} from "lucide-react";
import { cn } from "@/lib/utils";
import { callGroq } from "@/lib/groq";
import { useFileAttach, FileBadge, HistorySidebar, ModelSelector, type HistoryEntry } from "@/components/ToolShell";
import { MathRenderer } from "@/components/MathRenderer";
import { toast } from "sonner";

type QuizType = "mc" | "short" | "mixed";
interface MCQuestion { type: "mc"; question: string; options: string[]; correct: number; explanation: string; }
interface ShortQuestion { type: "short"; question: string; answer: string; explanation: string; }
type Question = MCQuestion | ShortQuestion;

export default function QuizBuilder() {

  const [phase, setPhase] = useState<"setup" | "quiz" | "done">("setup");
  const [topicInput, setTopicInput] = useState("");
  const [quizType, setQuizType] = useState<QuizType>("mc");
  const [numQ, setNumQ] = useState(10);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [shortAnswer, setShortAnswer] = useState("");
  const [answered, setAnswered] = useState(false);
  const [results, setResults] = useState<{ correct: boolean }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiFeedback, setAiFeedback] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory("quizbuilder"));
  const { pendingFile, setPendingFile, FileAttachButton } = useFileAttach();

  const generate = async () => {
    const aiCtx = buildAIContext();
    if (!topicInput.trim() && !pendingFile && aiCtx.length === 0) return;
    setIsLoading(true);
    setError(null);
    const fileContext = pendingFile?.content
      ? `\n\nBase the quiz on this material:\n${pendingFile.content.slice(0, 4000)}`
      : aiCtx;
    const topic = topicInput.trim() || pendingFile?.name || getActiveSource()?.name?.replace(/\.\w+$/, "") || "General";
    setPendingFile(null);
    const typeInstruction =
      quizType === "mc"
        ? `All questions must be multiple choice with 4 options.`
        : quizType === "short"
        ? `All questions must be short answer.`
        : `Mix of multiple choice (60%) and short answer (40%).`;

    try {
      const raw = await callGroq(
        [{
          role: "user",
          content: `Generate exactly ${numQ} quiz questions about "${topic}".${fileContext}\n${typeInstruction}\nReturn ONLY raw JSON, no markdown:\n{"questions":[{"type":"mc","question":"...","options":["A","B","C","D"],"correct":0,"explanation":"..."},{"type":"short","question":"...","answer":"...","explanation":"..."}]}`
        }],
        "You are a quiz generator. Return ONLY a raw JSON object with no markdown, no code fences, no preamble.",
        "llama-3.3-70b-versatile",
        2500
      );
      let clean = raw;
      clean = clean.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      const objMatch = clean.match(/\{[\s\S]*\}/);
      const arrMatch = clean.match(/\[[\s\S]*\]/);
      const jsonStr = objMatch ? objMatch[0] : arrMatch ? arrMatch[0] : clean;
      const parsed = JSON.parse(jsonStr);
      const qs: Question[] = (parsed.questions || parsed).slice(0, numQ);
      setQuestions(qs);
      setCurrent(0);
      setSelected(null);
      setShortAnswer("");
      setAnswered(false);
      setResults([]);
      setAiFeedback("");
      setPhase("quiz");
      toast.success(`${qs.length} questions generated!`);
      setHistory(prev => addHistoryEntry("quizbuilder", { id: Date.now().toString(), title: topic, subtitle: `${qs.length} Qs · ${quizType}`, timestamp: new Date(), data: { questions: qs, topic } }, prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error generating quiz");
    } finally {
      setIsLoading(false);
    }
  };

  const q = questions[current];

  const checkMC = (i: number) => {
    if (answered || !q || q.type !== "mc") return;
    setSelected(i);
    setAnswered(true);
  };

  const checkShort = async () => {
    if (answered || !q || q.type !== "short" || !shortAnswer.trim()) return;
    setAnswered(true);
    // Simple check: use AI to compare
    try {
      const raw = await callGroq(
        [{ role: "user", content: `Question: "${q.question}"\nCorrect answer: "${q.answer}"\nStudent answer: "${shortAnswer}"\nIs the student's answer correct or mostly correct? Reply with ONLY "correct" or "incorrect" and a one-sentence explanation.` }],
        "Be fair but accurate. Accept answers that capture the key idea even if wording differs.",
        "llama-3.3-70b-versatile",
        100
      );
      const isCorrect = raw.toLowerCase().includes("correct") && !raw.toLowerCase().startsWith("incorrect");
      setAiFeedback(raw);
      if (isCorrect) setResults((prev) => [...prev, { correct: true }]);
      else setResults((prev) => [...prev, { correct: false }]);
    } catch {
      setAiFeedback("Could not check — marking as reviewed.");
      setResults((prev) => [...prev, { correct: false }]);
    }
  };

  const next = () => {
    if (q?.type === "mc") {
      setResults((prev) => [...prev, { correct: selected === (q as MCQuestion).correct }]);
    }
    if (current + 1 >= questions.length) {
      setPhase("done");
    } else {
      setCurrent((c) => c + 1);
      setSelected(null);
      setShortAnswer("");
      setAnswered(false);
      setAiFeedback("");
    }
  };

  const score = results.filter((r) => r.correct).length;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar isLoggedIn user={{ name: "Learner", xp: 2450, streak: 12, plan: "free" }} />
      <main className="flex-1 max-w-2xl mx-auto w-full p-4 py-6">
        <HistorySidebar
          entries={history}
          activeId={null}
          onSelect={(e) => {
            const d = e.data as { questions: Question[]; topic: string };
            setQuestions(d.questions);
            setPhase("quiz");
            setCurrent(0);
            setSelected(null);
            setAnswered(false);
            setResults([]);
            setSidebarOpen(false);
          }}
          onNew={() => {
            setPhase("setup");
            setSidebarOpen(false);
          }}
          onDelete={(id) => setHistory(prev => deleteHistoryEntry("quizbuilder", id, prev))}
          open={sidebarOpen}
          onToggle={() => setSidebarOpen((v) => !v)}
          newLabel="New Quiz"
        />
        <div className="flex items-center gap-3 mb-6">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm" className="gap-1">
              <ChevronLeft className="h-4 w-4" />
              Dashboard
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <div className="w-7 h-7 rounded-none bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <PenLine className="h-4 w-4 text-white" />
              </div>
              Quiz Builder
            </h1>
            <p className="text-xs text-muted-foreground">Build your own quiz — AI generates, you take it</p>
          </div>
          <FileAttachButton />
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="relative flex items-center justify-center w-8 h-8 rounded-none border border-border bg-card hover:border-primary/50 transition-colors text-muted-foreground hover:text-primary"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
          <ModelSelector />
        </div>
        {pendingFile && (
          <div className="mb-3">
            <FileBadge file={pendingFile} onRemove={() => setPendingFile(null)} />
          </div>
        )}

        {phase === "setup" && (
          <div className="space-y-6 pt-4">
            <div className="text-center space-y-3">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/20">
                <PenLine className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold">Quiz Builder</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Type a topic or paste notes, choose quiz type, and AI generates a custom quiz for you.
              </p>
            </div>
            <div className="bg-card border border-border rounded-none p-5 space-y-4">
              <div>
                <label className="font-semibold text-sm">Topic or Notes</label>
                <Textarea
                  className="mt-2 min-h-[80px]"
                  placeholder="e.g. Cell Biology, World War 2, or paste your notes..."
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                />
              </div>
              <div>
                <label className="font-semibold text-sm">Quiz Type</label>
                <div className="flex gap-2 mt-2">
                  {([
                    { id: "mc" as QuizType, label: "Multiple Choice" },
                    { id: "short" as QuizType, label: "Short Answer" },
                    { id: "mixed" as QuizType, label: "Mixed" },
                  ]).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setQuizType(t.id)}
                      className={cn(
                        "px-3 py-1.5 rounded-none text-xs border transition-all",
                        quizType === t.id
                          ? "bg-cyan-500 text-white border-cyan-500"
                          : "border-border hover:border-cyan-400"
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="font-semibold text-sm">Questions</label>
                <div className="flex gap-2 mt-2">
                  {[5, 10, 15].map((n) => (
                    <button
                      key={n}
                      onClick={() => setNumQ(n)}
                      className={cn(
                        "px-3 py-1.5 rounded-none text-xs border transition-all",
                        numQ === n
                          ? "bg-cyan-500 text-white border-cyan-500"
                          : "border-border hover:border-cyan-400"
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              {buildAIContext().length > 0 && !topicInput.trim() && !pendingFile && (
                <div className="relative p-[2px] rounded-none overflow-hidden" style={{background:"linear-gradient(270deg,#a855f7,#06b6d4,#d4af5a,#a855f7)",backgroundSize:"400% 400%",animation:"gradientShift 3s ease infinite"}}>
                  <style>{`@keyframes gradientShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}`}</style>
                  <button onClick={generate} disabled={isLoading}
                    className="w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90 bg-background"
                    style={{ color: "var(--pz-gold, #d4af5a)" }}>
                    Generate Quiz from "{getActiveSource()?.name?.replace(/\.\w+$/, "") ?? "Active Source"}"
                  </button>
                </div>
              )}
              {error && <p className="text-sm text-red-500 bg-red-500/10 rounded-none p-3">{error}</p>}
              <Button
                onClick={generate}
                disabled={(!topicInput.trim() && !pendingFile && buildAIContext().length === 0) || isLoading}
                className="w-full h-12 bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:opacity-90 text-base font-bold"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-none animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-2" />
                    Generate Quiz
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {phase === "quiz" && q && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="font-mono">
                {current + 1} / {questions.length}
              </Badge>
              <Badge variant="outline" className="text-xs">{q.type === "mc" ? "Multiple Choice" : "Short Answer"}</Badge>
            </div>
            <div className="h-1.5 rounded-none bg-muted overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all"
                style={{ width: `${(current / questions.length) * 100}%` }}
              />
            </div>
            <div className="bg-card border border-border rounded-none p-6">
              <MathRenderer content={q.question} className="text-base font-medium mb-5" />
              {q.type === "mc" && (
                <div className="space-y-2">
                  {(q as MCQuestion).options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => checkMC(i)}
                      disabled={answered}
                      className={cn(
                        "w-full text-left px-4 py-3 rounded-none border text-sm transition-all",
                        !answered && "hover:border-cyan-400 hover:bg-cyan-500/5",
                        answered && i === (q as MCQuestion).correct && "border-emerald-500 bg-white/10 font-medium",
                        answered && selected === i && i !== (q as MCQuestion).correct && "border-red-500 bg-red-500/10",
                        (!answered || (answered && i !== (q as MCQuestion).correct && i !== selected)) && "border-border"
                      )}
                    >
                      <span className="font-mono text-xs mr-2 opacity-60">{String.fromCharCode(65 + i)}.</span>
                      {opt}
                    </button>
                  ))}
                </div>
              )}
              {q.type === "short" && (
                <div className="space-y-3">
                  <Textarea
                    className="min-h-[80px]"
                    placeholder="Type your answer..."
                    value={shortAnswer}
                    onChange={(e) => setShortAnswer(e.target.value)}
                    disabled={answered}
                  />
                  {!answered && (
                    <Button onClick={checkShort} disabled={!shortAnswer.trim()} className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white">
                      Check Answer
                    </Button>
                  )}
                  {answered && aiFeedback && (
                    <div className="bg-muted/30 rounded-none p-3 text-sm">
                      <MathRenderer content={aiFeedback} />
                    </div>
                  )}
                  {answered && (
                    <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-none p-3">
                      <p className="text-xs font-bold text-indigo-500 mb-1">Correct Answer</p>
                      <p className="text-sm">{(q as ShortQuestion).answer}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            {answered && (
              <div className="bg-card border border-border rounded-none p-4 space-y-2">
                {q.type === "mc" && (
                  <div className="flex items-center gap-2">
                    {selected === (q as MCQuestion).correct ? (
                      <CheckCircle2 className="h-4 w-4 text-white/60" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="font-semibold text-sm">
                      {selected === (q as MCQuestion).correct ? "Correct!" : "Wrong"}
                    </span>
                  </div>
                )}
                <MathRenderer content={q.explanation} className="text-xs text-muted-foreground" />
                <Button
                  onClick={next}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:opacity-90"
                >
                  {current + 1 < questions.length ? "Next →" : "See Final Score →"}
                </Button>
              </div>
            )}
          </div>
        )}

        {phase === "done" && (
          <div className="text-center space-y-6 pt-8">
            <Trophy
              className={cn(
                "h-16 w-16 mx-auto",
                score >= questions.length * 0.8 ? "text-white/60" : score >= questions.length * 0.5 ? "text-amber-500" : "text-red-500"
              )}
            />
            <div>
              <h2 className="text-3xl font-bold">
                {score}/{questions.length}
              </h2>
              <p className="text-muted-foreground">
                {score >= questions.length * 0.9
                  ? "Perfect! 🏆"
                  : score >= questions.length * 0.7
                  ? "Strong work! 💪"
                  : score >= questions.length * 0.5
                  ? "Keep studying! 📚"
                  : "Review and retry 🔄"}
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => {
                  setPhase("setup");
                }}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                New Quiz
              </Button>
              <Link to="/dashboard">
                <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:opacity-90">Dashboard</Button>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
