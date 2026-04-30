import { ToolPageShell } from "@/components/ToolPageShell";
import { useState, useRef, useEffect } from "react";


import { ToolHeader } from "@/components/ToolShell";
import { GlobalContextBar } from "@/components/GlobalContextBar";
import { MessageSquare, Flame, Trophy, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { callGroq } from "@/lib/groq";
import { buildAIContext, getActiveSource } from "@/lib/sourceContext";

interface RecallPrompt { prompt: string; answer: string; keywords: string[]; }
interface Result { prompt: string; typed: string; score: "correct" | "partial" | "wrong"; matched: string[]; }
interface TopicRecord { topic: string; score: number; total: number; date: string; }

const STORAGE_KEY = "pz_recall_history";
function loadHistory(): TopicRecord[] { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; } }

function scoreLocally(typed: string, keywords: string[]): { score: "correct" | "partial" | "wrong"; matched: string[] } {
  if (!typed.trim()) return { score: "wrong", matched: [] };
  const t = typed.toLowerCase();
  const matched = keywords.filter(kw => t.includes(kw.toLowerCase()));
  const ratio = matched.length / keywords.length;
  return { score: ratio >= 0.7 ? "correct" : ratio >= 0.3 ? "partial" : "wrong", matched };
}

export default function RecallMode() {
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(false);
  const [prompts, setPrompts] = useState<RecallPrompt[]>([]);
  const [current, setCurrent] = useState(0);
  const [typed, setTyped] = useState("");
  const [showAnswer, setShowAnswer] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [phase, setPhase] = useState<"setup" | "recall" | "results">("setup");
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [history, setHistory] = useState<TopicRecord[]>(loadHistory);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const ctx = buildAIContext();
  const activeSource = getActiveSource();
  const hasSource = ctx.length > 0;

  useEffect(() => { if (phase === "recall") inputRef.current?.focus(); }, [phase, current]);

  const handleGenerate = async () => {
    const effectiveSubject = subject.trim() || activeSource?.name?.replace(/\.\w+$/, "") || "";
    if (!effectiveSubject && !hasSource) { toast.error("Enter a subject or add a source first"); return; }
    setLoading(true);
    try {
      const prompt = `Create 8 recall prompts for: "${effectiveSubject || "the study material below"}".
${ctx ? `Study context:\n${ctx}\n` : ""}
Return ONLY valid JSON array, no markdown:
[{"prompt":"Complete this / Explain / Define...","answer":"expected answer (2-3 sentences)","keywords":["key","terms","from","answer"]}]
keywords: 4-6 essential words from the answer that a correct response would include.`;
      const raw = await callGroq(prompt, "llama-3.3-70b-versatile");
      const parsed: RecallPrompt[] = JSON.parse(raw.replace(/```json|```/g, "").trim());
      setPrompts(parsed);
      setCurrent(0); setTyped(""); setResults([]);
      setStreak(0); setBestStreak(0);
      setShowAnswer(false);
      setPhase("recall");
    } catch { toast.error("Failed to generate. Try again."); }
    finally { setLoading(false); }
  };

  const handleSubmit = () => {
    const p = prompts[current];
    const { score, matched } = scoreLocally(typed, p.keywords);
    const newResult: Result = { prompt: p.prompt, typed, score, matched };
    const newResults = [...results, newResult];
    setResults(newResults);

    const newStreak = score === "correct" ? streak + 1 : 0;
    setStreak(newStreak);
    if (newStreak > bestStreak) setBestStreak(newStreak);
    if (newStreak > 0 && newStreak % 3 === 0) toast(`🔥 ${newStreak} in a row!`);

    if (current + 1 < prompts.length) {
      setTimeout(() => { setCurrent(c => c + 1); setTyped(""); setShowAnswer(false); }, 800);
    } else {
      const correct = newResults.filter(r => r.score === "correct").length;
      const scoreVal = Math.round((correct / prompts.length) * 100);
      const record: TopicRecord = { topic: subject.trim() || "Source Library", score: correct, total: prompts.length, date: new Date().toISOString() };
      const newHistory = [record, ...history].slice(0, 15);
      setHistory(newHistory);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
      setTimeout(() => setPhase("results"), 800);
    }
  };

  const handleSkip = () => {
    const p = prompts[current];
    const newResults = [...results, { prompt: p.prompt, typed: "", score: "wrong" as const, matched: [] }];
    setResults(newResults);
    setStreak(0);
    if (current + 1 < prompts.length) { setCurrent(c => c + 1); setTyped(""); setShowAnswer(false); }
    else setPhase("results");
  };

  const scoreColor = (s: string) => s === "correct" ? "var(--pz-teal)" : s === "partial" ? "var(--pz-gold)" : "var(--pz-rose)";
  const finalCorrect = results.filter(r => r.score === "correct").length;
  const finalPartial = results.filter(r => r.score === "partial").length;

  const relTime = (iso: string) => {
    const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    return d === 0 ? "Today" : d === 1 ? "Yesterday" : `${d}d ago`;
  };

  return (
    <ToolPageShell>
      <main className="max-w-xl mx-auto px-4 pt-6 pb-24">
        <GlobalContextBar compact />
        <ToolHeader icon={<MessageSquare className="h-5 w-5" style={{ color: "var(--pz-gold)" }} />} title="Recall Mode" subtitle="Type from memory — scored instantly by keyword matching" />

        {phase === "setup" && (
          <div className="space-y-4 mt-6">
            <div>
              <label className="text-xs font-medium mb-1.5 block uppercase tracking-widest" style={{ color: "var(--pz-text-muted)" }}>Subject</label>
              <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Photosynthesis, The Cold War..."
                className="w-full px-3 py-2.5 text-sm outline-none" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)", color: "var(--pz-text)" }} />
              {hasSource && !subject.trim() && <p className="text-xs mt-1" style={{ color: "var(--pz-gold)" }}>⚡ Leave blank to use your active source library</p>}
            </div>
            <Button onClick={handleGenerate} disabled={loading || (!subject.trim() && !hasSource)} className="w-full py-3 font-semibold text-sm" style={{ background: "var(--pz-gold)", color: "#000" }}>
              {loading ? "Generating..." : "Start Recall Session →"}
            </Button>

            {history.length > 0 && (
              <div className="mt-4">
                <p className="text-xs uppercase tracking-widest mb-3" style={{ color: "var(--pz-text-muted)" }}>Past Sessions</p>
                <div className="space-y-1.5">
                  {history.slice(0, 8).map((h, i) => (
                    <div key={i} className="px-3 py-2 flex items-center justify-between" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)" }}>
                      <div>
                        <span className="text-xs font-medium" style={{ color: "var(--pz-text)" }}>{h.topic}</span>
                        <span className="text-xs ml-2" style={{ color: "var(--pz-text-muted)" }}>{relTime(h.date)}</span>
                      </div>
                      <span className="text-xs font-bold" style={{ color: (h.score / h.total) >= 0.7 ? "var(--pz-teal)" : "var(--pz-gold)", fontFamily: "monospace" }}>
                        {h.score}/{h.total}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {phase === "recall" && prompts.length > 0 && (
          <div className="mt-6 space-y-4">
            {/* Streak + progress */}
            <div className="flex items-center justify-between">
              <div className="flex-1 h-1.5 mr-4" style={{ background: "var(--pz-surface3)" }}>
                <div className="h-full transition-all" style={{ width: `${(current / prompts.length) * 100}%`, background: "var(--pz-gold)" }} />
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {streak > 0 && (
                  <div className="flex items-center gap-1" style={{ color: "var(--pz-rose)" }}>
                    <Flame className="h-3.5 w-3.5" />
                    <span className="text-xs font-bold" style={{ fontFamily: "monospace" }}>{streak}</span>
                  </div>
                )}
                <span className="text-xs" style={{ color: "var(--pz-text-muted)", fontFamily: "monospace" }}>{current + 1}/{prompts.length}</span>
              </div>
            </div>

            <div className="p-4" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)", borderTop: "2px solid var(--pz-gold)" }}>
              <p className="text-base font-medium mb-4" style={{ color: "var(--pz-text)" }}>{prompts[current].prompt}</p>
              <textarea ref={inputRef} value={typed} onChange={e => setTyped(e.target.value)}
                placeholder="Type your answer from memory..." rows={4}
                onKeyDown={e => { if (e.key === "Enter" && e.metaKey) handleSubmit(); }}
                className="w-full px-3 py-2.5 text-sm outline-none resize-none mb-3"
                style={{ background: "var(--pz-surface3)", border: "1px solid var(--pz-border)", color: "var(--pz-text)" }} />

              {showAnswer && (
                <div className="p-3 mb-3" style={{ background: "var(--pz-surface3)", borderLeft: "2px solid var(--pz-gold)" }}>
                  <p className="text-xs font-medium mb-1" style={{ color: "var(--pz-gold)" }}>Model answer:</p>
                  <p className="text-xs" style={{ color: "var(--pz-text-2)" }}>{prompts[current].answer}</p>
                  <p className="text-xs mt-2" style={{ color: "var(--pz-text-muted)" }}>Key terms: {prompts[current].keywords.join(", ")}</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={handleSubmit} disabled={!typed.trim() && !showAnswer} className="flex-1 py-2.5 text-sm font-semibold" style={{ background: "var(--pz-gold)", color: "#000" }}>
                  {typed.trim() ? "Submit →" : "Show Answer"}
                </Button>
                {!showAnswer && <button onClick={() => setShowAnswer(true)} className="px-3 py-2.5 text-xs" style={{ border: "1px solid var(--pz-border)", color: "var(--pz-text-muted)", background: "transparent" }}>Peek</button>}
                <button onClick={handleSkip} className="px-3 py-2.5" style={{ border: "1px solid var(--pz-border)", color: "var(--pz-text-muted)", background: "transparent" }}>
                  <SkipForward className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-[10px] mt-1.5 text-center" style={{ color: "var(--pz-text-muted)" }}>⌘↵ to submit</p>
            </div>
          </div>
        )}

        {phase === "results" && (
          <div className="mt-6 space-y-4">
            <div className="p-5 text-center" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)", borderTop: "2px solid var(--pz-gold)" }}>
              <Trophy className="h-8 w-8 mx-auto mb-2" style={{ color: "var(--pz-gold)" }} />
              <div className="flex justify-center gap-6 mt-2">
                {[
                  { label: "Correct", value: finalCorrect, color: "var(--pz-teal)" },
                  { label: "Partial", value: finalPartial, color: "var(--pz-gold)" },
                  { label: "Wrong", value: results.filter(r => r.score === "wrong").length, color: "var(--pz-rose)" },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <div className="text-2xl font-bold" style={{ color: s.color, fontFamily: "monospace" }}>{s.value}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: "var(--pz-text-muted)" }}>{s.label}</div>
                  </div>
                ))}
              </div>
              {bestStreak > 1 && <p className="text-xs mt-3" style={{ color: "var(--pz-rose)" }}>🔥 Best streak: {bestStreak}</p>}
            </div>

            <div className="space-y-2">
              {results.map((r, i) => (
                <div key={i} className="p-3" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)", borderLeft: `3px solid ${scoreColor(r.score)}` }}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-medium" style={{ color: "var(--pz-text)" }}>{r.prompt}</p>
                    <span className="text-[10px] font-semibold shrink-0 ml-2" style={{ color: scoreColor(r.score) }}>
                      {r.score === "correct" ? "✓" : r.score === "partial" ? "~" : "✗"}
                    </span>
                  </div>
                  {r.matched.length > 0 && <p className="text-[10px]" style={{ color: "var(--pz-teal)" }}>Matched: {r.matched.join(", ")}</p>}
                  {r.typed && <p className="text-xs mt-1 italic" style={{ color: "var(--pz-text-muted)" }}>You: {r.typed.slice(0, 100)}{r.typed.length > 100 ? "..." : ""}</p>}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button onClick={() => { setPhase("setup"); setPrompts([]); }} className="flex-1 py-2.5 text-sm" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)", color: "var(--pz-text-muted)" }}>New Subject</Button>
              <Button onClick={handleGenerate} disabled={loading} className="flex-1 py-2.5 text-sm font-semibold" style={{ background: "var(--pz-gold)", color: "#000" }}>{loading ? "Loading..." : "Go Again"}</Button>
            </div>
          </div>
        )}
      </main>
    </ToolPageShell>
  );
}
