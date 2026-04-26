import { useState, useRef, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { BottomNav } from "@/components/BottomNav";
import { ToolHeader } from "@/components/ToolShell";
import { MessageSquare, CheckCircle, XCircle, SkipForward, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { callGroq } from "@/lib/groq";
import { buildAIContext } from "@/lib/sourceContext";

interface RecallQuestion {
  id: string;
  prompt: string;
  answer: string;
  hint: string;
}

interface Result {
  question: RecallQuestion;
  typed: string;
  score: "correct" | "partial" | "wrong";
}

export default function RecallMode() {
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<RecallQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [typed, setTyped] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [phase, setPhase] = useState<"setup" | "recall" | "results">("setup");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (phase === "recall") inputRef.current?.focus(); }, [phase, current]);

  const handleGenerate = async () => {
    if (!subject.trim()) { toast.error("Enter a subject first"); return; }
    setLoading(true);
    try {
      const ctx = await buildAIContext();
      const prompt = `Create 6 recall prompts for: "${subject}". The student must type the answer from memory.
${ctx ? `Study context:\n${ctx}\n` : ""}
Return ONLY valid JSON array:
[{"id":"r1","prompt":"Complete/explain/define this: ...","answer":"expected answer (2-4 sentences max)","hint":"one-word or phrase hint"}]
Make prompts open-ended so typed recall is required. Vary difficulty.`;
      const raw = await callGroq(prompt, "llama3-8b-8192");
      const parsed: RecallQuestion[] = JSON.parse(raw.replace(/```json|```/g, "").trim());
      setQuestions(parsed);
      setCurrent(0);
      setTyped("");
      setResults([]);
      setShowHint(false);
      setShowAnswer(false);
      setPhase("recall");
    } catch {
      toast.error("Failed to generate. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const scoreAnswer = async (q: RecallQuestion, userTyped: string): Promise<Result["score"]> => {
    if (!userTyped.trim()) return "wrong";
    try {
      const prompt = `Rate this recall attempt. Question: "${q.prompt}". Expected: "${q.answer}". Student wrote: "${userTyped}".
Return ONLY one word: "correct", "partial", or "wrong".
correct = captures main idea accurately. partial = some relevant content but missing key parts. wrong = incorrect or irrelevant.`;
      const raw = await callGroq(prompt, "llama3-8b-8192");
      const s = raw.trim().toLowerCase();
      if (s.includes("correct")) return "correct";
      if (s.includes("partial")) return "partial";
      return "wrong";
    } catch {
      return "partial";
    }
  };

  const handleSubmit = async () => {
    if (!typed.trim() && !showAnswer) { setShowAnswer(true); return; }
    setLoading(true);
    const q = questions[current];
    const score = await scoreAnswer(q, typed);
    const newResult: Result = { question: q, typed, score };
    const newResults = [...results, newResult];
    setResults(newResults);
    setLoading(false);

    if (current + 1 < questions.length) {
      setTimeout(() => {
        setCurrent(c => c + 1);
        setTyped("");
        setShowHint(false);
        setShowAnswer(false);
      }, 1200);
    } else {
      setTimeout(() => setPhase("results"), 1200);
    }
  };

  const handleSkip = () => {
    const q = questions[current];
    const newResults = [...results, { question: q, typed: "", score: "wrong" as const }];
    setResults(newResults);
    if (current + 1 < questions.length) {
      setCurrent(c => c + 1);
      setTyped("");
      setShowHint(false);
      setShowAnswer(false);
    } else {
      setPhase("results");
    }
  };

  const scoreColor = (s: Result["score"]) =>
    s === "correct" ? "var(--pz-teal)" : s === "partial" ? "var(--pz-gold)" : "var(--pz-rose, #E84040)";

  const scoreLabel = (s: Result["score"]) =>
    s === "correct" ? "✓ Correct" : s === "partial" ? "~ Partial" : "✗ Wrong";

  const summary = results.reduce((acc, r) => {
    acc[r.score] = (acc[r.score] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div style={{ minHeight: "100vh", background: "var(--pz-bg, #000)", color: "var(--pz-text, #F0E8D4)" }}>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 pt-6 pb-24">
        <ToolHeader
          icon={<MessageSquare className="h-5 w-5" style={{ color: "var(--pz-gold)" }} />}
          title="Recall Mode"
          subtitle="Type answers from memory — the hardest and most effective study method"
        />

        {phase === "setup" && (
          <div className="space-y-4 mt-6">
            <p className="text-sm" style={{ color: "var(--pz-text-2)" }}>
              You'll be shown prompts and must type your answer <em>entirely from memory</em>. No peeking — your typed recall will be AI-scored.
            </p>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--pz-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Subject</label>
              <input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="e.g. Photosynthesis, The Cold War, Python Functions..."
                className="w-full px-3 py-2.5 rounded-none text-sm outline-none"
                style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)", color: "var(--pz-text)" }}
              />
            </div>
            <Button onClick={handleGenerate} disabled={loading || !subject.trim()} className="w-full py-3 rounded-none font-semibold text-sm" style={{ background: "var(--pz-gold)", color: "#000" }}>
              {loading ? "Generating..." : "Start Recall Session →"}
            </Button>
          </div>
        )}

        {phase === "recall" && questions.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="h-1.5 flex-1 rounded-none mr-4" style={{ background: "var(--pz-surface3)" }}>
                <div className="h-full rounded-none" style={{ width: `${((current) / questions.length) * 100}%`, background: "var(--pz-gold)", transition: "width 0.4s ease" }} />
              </div>
              <span className="text-xs shrink-0" style={{ color: "var(--pz-text-muted)", fontFamily: "'DM Mono',monospace" }}>{current + 1} / {questions.length}</span>
            </div>

            <div className="p-5 rounded-none mb-4" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)", borderTop: "2px solid var(--pz-gold)" }}>
              <p className="text-base font-medium" style={{ color: "var(--pz-text)" }}>{questions[current].prompt}</p>
              {showHint && (
                <p className="text-xs mt-3 px-2.5 py-1.5 rounded-none inline-block" style={{ background: "var(--pz-gold-dim)", color: "var(--pz-gold)", border: "1px solid var(--pz-gold)30" }}>
                  Hint: {questions[current].hint}
                </p>
              )}
            </div>

            <textarea
              ref={inputRef}
              value={typed}
              onChange={e => setTyped(e.target.value)}
              placeholder="Type your answer from memory..."
              rows={5}
              className="w-full px-3 py-2.5 rounded-none text-sm outline-none resize-none mb-3"
              style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)", color: "var(--pz-text)" }}
              onKeyDown={e => { if (e.key === "Enter" && e.metaKey) handleSubmit(); }}
            />

            {showAnswer && (
              <div className="p-3 rounded-none mb-3" style={{ background: "var(--pz-surface3)", border: "1px solid var(--pz-border)" }}>
                <p className="text-xs font-medium mb-1" style={{ color: "var(--pz-gold)" }}>Model answer:</p>
                <p className="text-xs" style={{ color: "var(--pz-text-2)" }}>{questions[current].answer}</p>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleSubmit} disabled={loading} className="flex-1 py-2.5 rounded-none text-sm font-semibold" style={{ background: "var(--pz-gold)", color: "#000" }}>
                {loading ? "Scoring..." : typed.trim() ? "Submit →" : "Show Answer"}
              </Button>
              {!showHint && <button onClick={() => setShowHint(true)} className="px-3 py-2.5 text-xs rounded-none" style={{ border: "1px solid var(--pz-border)", color: "var(--pz-text-muted)" }}>Hint</button>}
              <button onClick={handleSkip} className="px-3 py-2.5 text-xs rounded-none" style={{ border: "1px solid var(--pz-border)", color: "var(--pz-text-muted)" }}>
                <SkipForward className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-[10px] mt-2 text-center" style={{ color: "var(--pz-text-muted)" }}>⌘↵ to submit</p>
          </div>
        )}

        {phase === "results" && (
          <div className="mt-6 space-y-4">
            <div className="text-center p-5 rounded-none" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)", borderTop: "2px solid var(--pz-gold)" }}>
              <Trophy className="h-8 w-8 mx-auto mb-2" style={{ color: "var(--pz-gold)" }} />
              <h2 className="font-semibold text-lg mb-1" style={{ color: "var(--pz-text)" }}>Session Complete</h2>
              <div className="flex justify-center gap-6 mt-3">
                {[
                  { label: "Correct", value: summary.correct || 0, color: "var(--pz-teal)" },
                  { label: "Partial", value: summary.partial || 0, color: "var(--pz-gold)" },
                  { label: "Wrong", value: summary.wrong || 0, color: "var(--pz-rose, #E84040)" },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <div className="text-2xl font-bold" style={{ color: s.color, fontFamily: "'DM Mono',monospace" }}>{s.value}</div>
                    <div className="text-[10px]" style={{ color: "var(--pz-text-muted)" }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {results.map((r, i) => (
                <div key={i} className="p-3 rounded-none" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)", borderLeft: `3px solid ${scoreColor(r.score)}` }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-medium" style={{ color: "var(--pz-text)" }}>{r.question.prompt}</p>
                    <span className="text-[10px] font-semibold" style={{ color: scoreColor(r.score) }}>{scoreLabel(r.score)}</span>
                  </div>
                  {r.typed && <p className="text-xs mb-1.5 italic" style={{ color: "var(--pz-text-2)" }}>You: {r.typed.slice(0, 120)}{r.typed.length > 120 ? "..." : ""}</p>}
                  <p className="text-xs" style={{ color: "var(--pz-text-muted)" }}>✓ {r.question.answer}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button onClick={() => { setPhase("setup"); setQuestions([]); }} className="flex-1 py-2.5 rounded-none text-sm" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)", color: "var(--pz-text-muted)" }}>
                New Subject
              </Button>
              <Button onClick={handleGenerate} disabled={loading} className="flex-1 py-2.5 rounded-none text-sm font-semibold" style={{ background: "var(--pz-gold)", color: "#000" }}>
                {loading ? "Loading..." : "Go Again"}
              </Button>
            </div>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
