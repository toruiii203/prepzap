import { BuddyCompanion } from "@/components/BuddyCompanion";
import { ToolPageShell } from "@/components/ToolPageShell";
import { useState, useRef, useEffect } from "react";
import { ConceptChipSelector } from "@/components/ConceptChipSelector";
import { GlobalContextBar } from "@/components/GlobalContextBar";


import { MessageSquare, Flame, Trophy, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useStudySession } from "@/hooks/useStudySession";
import { callGroq } from "@/lib/groq";
import { buildAIContext, getActiveSource, onSourceChange } from "@/lib/sourceContext";
import { useAuth } from "@/contexts/AuthContext";
import { BottomNav } from "@/components/BottomNav";

interface RecallPrompt { prompt: string; answer: string; keywords: string[]; }
interface Result { prompt: string; typed: string; score: "correct" | "partial" | "wrong"; matched: string[]; }
interface TopicRecord { topic: string; score: number; total: number; date: string; }

// FIX BUG 4: remainingUses not relevant here (no usePlan), but STORAGE_KEY kept local
// (RecallMode uses local history, not user-scoped usage — no BUG 1 since history is not sensitive)
// FIX BUG 1: scope history to user ID
const getHistoryKey = (userId?: string | null) =>
  userId ? `pz_recall_history_${userId}` : "pz_recall_history_anon";
function loadHistory(userId?: string | null): TopicRecord[] { try { return JSON.parse(localStorage.getItem(getHistoryKey(userId)) || "[]"); } catch { return []; } }

// Fuzzy match: true if typed contains keyword or close variant (edit distance /// 2)
function fuzzyMatch(typed: string, keyword: string): boolean {
  const t = typed.toLowerCase();
  const kw = keyword.toLowerCase();
  if (t.includes(kw)) return true;
  // Check each word in typed against keyword with edit distance
  const words = t.split(/\s+/);
  return words.some(word => {
    if (Math.abs(word.length - kw.length) > 3) return false;
    // Levenshtein distance
    const dp: number[][] = Array.from({ length: word.length + 1 }, (_, i) =>
      Array.from({ length: kw.length + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0)
    );
    for (let i = 1; i <= word.length; i++)
      for (let j = 1; j <= kw.length; j++)
        dp[i][j] = word[i-1] === kw[j-1] ? dp[i-1][j-1]
          : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    return dp[word.length][kw.length] <= 2;
  });
}

function scoreLocally(typed: string, keywords: string[]): { score: "correct" | "partial" | "wrong"; matched: string[] } {
  if (!typed.trim()) return { score: "wrong", matched: [] };
  const matched = keywords.filter(kw => fuzzyMatch(typed, kw));
  const ratio = matched.length / keywords.length;
  return { score: ratio >= 0.7 ? "correct" : ratio >= 0.3 ? "partial" : "wrong", matched };
}


// ////// Quick suggestion chips ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function SuggestionChips({ onSelect, suggestions }: { onSelect: (s: string) => void; suggestions: string[] }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
      <span style={{ fontSize: 10, color: "rgba(0,0,0,0.4)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", alignSelf: "center", marginRight: 2 }}>Try:</span>
      {suggestions.map(s => (
        <button key={s} onClick={() => onSelect(s)}
          style={{ background: "#F0EBE3", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 20, padding: "4px 12px", fontSize: 11, color: "rgba(0,0,0,0.65)", cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#ae2925"; (e.currentTarget as HTMLElement).style.color = "#ae2925"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,0,0,0.12)"; (e.currentTarget as HTMLElement).style.color = "rgba(0,0,0,0.65)"; }}>
          {s}
        </button>
      ))}
    </div>
  );
}

export default function RecallMode() {
  const { isPro, canUse, logUsage } = usePlan();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const { user } = useAuth();
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
  const [history, setHistory] = useState<TopicRecord[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [ctx, setCtx] = useState(() => buildAIContext());
  const [activeSource, setActiveSourceState] = useState(() => getActiveSource());
  const hasSource = ctx.length > 0;

  // Re-read source context whenever user or source changes
  useEffect(() => {
    const sync = () => {
      setCtx(buildAIContext());
      setActiveSourceState(getActiveSource());
    };
    sync();
    const unsub = onSourceChange(sync);
    window.addEventListener("focus", sync);
    return () => { unsub(); window.removeEventListener("focus", sync); };
  }, []);

  useEffect(() => { if (phase === "recall") inputRef.current?.focus(); }, [phase, current]);

  // FIX BUG 1: load history from user-scoped key; reload when user changes
  useEffect(() => {
    setHistory(loadHistory(user?.id));
  }, [user?.id]);


  // ////// QuickLaunch prefill ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  useEffect(() => {
    const prefill = sessionStorage.getItem("quicklaunch_prompt");
    if (prefill && prefill.trim()) {
      setSubject(prefill);
      sessionStorage.removeItem("quicklaunch_prompt");
      sessionStorage.removeItem("quicklaunch_tool");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerate = async () => {

    if (!isPro) {
      const allowed = await canUse("recall");
      if (!allowed) {
        setShowUpgrade(true);
        return;
      }
    }

    const effectiveSubject = subject.trim() || activeSource?.name?.replace(/\.\w+$/, "") || "";
    if (!effectiveSubject && !hasSource) { toast.error("Enter a subject or add a source first"); return; }
    setLoading(true);
    try {
      const prompt = `Create 8 recall prompts for: "${effectiveSubject || "the study material below"}".\n${ctx ? `Study context:\n${ctx}\n` : ""}\nReturn ONLY valid JSON array, no markdown:\n[{"prompt":"Complete this / Explain / Define...","answer":"expected answer (2-3 sentences)","keywords":["key","terms","from","answer"]}]\nkeywords: 4-6 essential words from the answer that a correct response would include.`;

      // FIX BUG 2: removed callGroqWithModel hack — call callGroq directly with feature key
      const raw = await callGroq(
        [{ role: "user", content: prompt }],
        undefined,
        "llama-3.3-70b-versatile",
        1024,
        "recall_mode"
      );
      const parsed: RecallPrompt[] = JSON.parse(raw.replace(/```json|```/g, "").trim());
      setPrompts(parsed);
      setCurrent(0); setTyped(""); setResults([]);
      setStreak(0); setBestStreak(0);
      setShowAnswer(false);
      setPhase("recall");
      logSession({ title: "Recall Mode: " + (effectiveSubject || "Custom Topic"), durationMinutes: 5 }); try { await logUsage("recall"); } catch {};
    } catch(err:any) { console.error("[RecallMode] generate failed:", err); toast.error("Error: " + (err?.message ?? String(err))); }
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
      const record: TopicRecord = { topic: subject.trim() || "Source Library", score: correct, total: prompts.length, date: new Date().toISOString() };
      const newHistory = [record, ...history].slice(0, 15);
      setHistory(newHistory);
      localStorage.setItem(getHistoryKey(user?.id), JSON.stringify(newHistory));
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

  const scoreColor = (s: string) => s === "correct" ? "#2a9d8f" : s === "partial" ? "#ae2925" : "#E8534A";
  const finalCorrect = results.filter(r => r.score === "correct").length;
  const finalPartial = results.filter(r => r.score === "partial").length;

  const relTime = (iso: string) => {
    const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    return d === 0 ? "Today" : d === 1 ? "Yesterday" : `${d}d ago`;
  };

  return (
    <ToolPageShell>
      <BuddyCompanion />
      <main className="max-w-xl mx-auto px-4 pt-6 pb-24">

        {phase === "setup" && (
          <div className="space-y-4 mt-6">
            <GlobalContextBar compact />
            <ConceptChipSelector
              onSelect={(concept) => { setSubject(concept); setTimeout(() => handleGenerate(), 0); }}
              placeholder="e.g. Photosynthesis, The Cold War"
              label="Subject"
            />
            <SuggestionChips onSelect={s => { setSubject(s); setTimeout(() => handleGenerate(), 0); }} suggestions={["Photosynthesis", "French Revolution", "Newton's Laws", "DNA Replication", "Civil War", "Trigonometry"]} />

            {history.length > 0 && (
              <div className="mt-4">
                <p className="text-xs uppercase tracking-widest mb-3" style={{ color: "rgba(0,0,0,0.4)" }}>Past Sessions</p>
                <div className="space-y-1.5">
                  {history.slice(0, 8).map((h, i) => (
                    <div key={i} className="px-3 py-2 flex items-center justify-between" style={{ background: "#F0EBE3", border: "1px solid rgba(0,0,0,0.12)" }}>
                      <div>
                        <span className="text-xs font-medium" style={{ color: "#1A1A1A" }}>{h.topic}</span>
                        <span className="text-xs ml-2" style={{ color: "rgba(0,0,0,0.4)" }}>{relTime(h.date)}</span>
                      </div>
                      <span className="text-xs font-bold" style={{ color: (h.score / h.total) >= 0.7 ? "#2a9d8f" : "#ae2925", fontFamily: "monospace" }}>
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
              <div className="flex-1 h-1.5 mr-4" style={{ background: "#E8E4DC" }}>
                <div className="h-full transition-all" style={{ width: `${(current / prompts.length) * 100}%`, background: "#ae2925" }} />
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {streak > 0 && (
                  <div className="flex items-center gap-1" style={{ color: "#E8534A" }}>
                    <Flame className="h-3.5 w-3.5" />
                    <span className="text-xs font-bold" style={{ fontFamily: "monospace" }}>{streak}</span>
                  </div>
                )}
                <span className="text-xs" style={{ color: "rgba(0,0,0,0.4)", fontFamily: "monospace" }}>{current + 1}/{prompts.length}</span>
              </div>
            </div>

            <div className="p-4" style={{ background: "#F0EBE3", border: "1px solid rgba(0,0,0,0.12)", borderTop: "2px solid #ae2925" }}>
              <p className="text-base font-medium mb-4" style={{ color: "#1A1A1A" }}>{prompts[current].prompt}</p>
              <textarea ref={inputRef} value={typed} onChange={e => setTyped(e.target.value)}
                placeholder="Type your answer from memory..." rows={4}
                onKeyDown={e => { if (e.key === "Enter" && e.metaKey) handleSubmit(); }}
                className="w-full px-3 py-2.5 text-sm outline-none resize-none mb-3"
                style={{ background: "#E8E4DC", border: "1px solid rgba(0,0,0,0.12)", color: "#1A1A1A" }} />

              {showAnswer && (
                <div className="p-3 mb-3" style={{ background: "#E8E4DC", borderLeft: "2px solid #ae2925" }}>
                  <p className="text-xs font-medium mb-1" style={{ color: "#ae2925" }}>Model answer:</p>
                  <p className="text-xs" style={{ color: "rgba(0,0,0,0.65)" }}>{prompts[current].answer}</p>
                  <p className="text-xs mt-2" style={{ color: "rgba(0,0,0,0.4)" }}>Key terms: {prompts[current].keywords.join(", ")}</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={handleSubmit} disabled={!typed.trim() && !showAnswer} className="flex-1 py-2.5 text-sm font-semibold" style={{ background: "#ae2925", color: "#000" }}>
                  {typed.trim() ? "Submit" : "Show Answer"}
                </Button>
                {!showAnswer && <button onClick={() => setShowAnswer(true)} className="px-3 py-2.5 text-xs" style={{ border: "1px solid rgba(0,0,0,0.12)", color: "rgba(0,0,0,0.4)", background: "transparent" }}>Peek</button>}
                <button onClick={handleSkip} className="px-3 py-2.5" style={{ border: "1px solid rgba(0,0,0,0.12)", color: "rgba(0,0,0,0.4)", background: "transparent" }}>
                  <SkipForward className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-[10px] mt-1.5 text-center" style={{ color: "rgba(0,0,0,0.4)" }}>Press Enter to submit</p>
            </div>
          </div>
        )}

        {phase === "results" && (
          <div className="mt-6 space-y-4">
            <div className="p-5 text-center" style={{ background: "#F0EBE3", border: "1px solid rgba(0,0,0,0.12)", borderTop: "2px solid #ae2925" }}>
              <Trophy className="h-8 w-8 mx-auto mb-2" style={{ color: "#ae2925" }} />
              <div className="flex justify-center gap-6 mt-2">
                {[
                  { label: "Correct", value: finalCorrect, color: "#2a9d8f" },
                  { label: "Partial", value: finalPartial, color: "#ae2925" },
                  { label: "Wrong", value: results.filter(r => r.score === "wrong").length, color: "#E8534A" },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <div className="text-2xl font-bold" style={{ color: s.color, fontFamily: "monospace" }}>{s.value}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: "rgba(0,0,0,0.4)" }}>{s.label}</div>
                  </div>
                ))}
              </div>
              {bestStreak > 1 && <p className="text-xs mt-3" style={{ color: "#E8534A" }}>🔥 Best streak: {bestStreak}</p>}
            </div>

            <div className="space-y-2">
              {results.map((r, i) => (
                <div key={i} className="p-3" style={{ background: "#F0EBE3", border: "1px solid rgba(0,0,0,0.12)", borderLeft: `3px solid ${scoreColor(r.score)}` }}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-medium" style={{ color: "#1A1A1A" }}>{r.prompt}</p>
                    <span className="text-[10px] font-semibold shrink-0 ml-2" style={{ color: scoreColor(r.score) }}>
                      {r.score === "correct" ? "✓" : r.score === "partial" ? "~" : "✗"}
                    </span>
                  </div>
                  {r.matched.length > 0 && <p className="text-[10px]" style={{ color: "#2a9d8f" }}>Matched: {r.matched.join(", ")}</p>}
                  {r.typed && <p className="text-xs mt-1 italic" style={{ color: "rgba(0,0,0,0.4)" }}>You: {r.typed.slice(0, 100)}{r.typed.length > 100 ? "..." : ""}</p>}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button onClick={() => { setPhase("setup"); setPrompts([]); }} className="flex-1 py-2.5 text-sm" style={{ background: "#F0EBE3", border: "1px solid rgba(0,0,0,0.12)", color: "rgba(0,0,0,0.4)" }}>New Subject</Button>
              <Button onClick={handleGenerate} disabled={loading} className="flex-1 py-2.5 text-sm font-semibold" style={{ background: "#ae2925", color: "#000" }}>{loading ? "Loading..." : "Go Again"}</Button>
            </div>
          </div>
        )}
      </main>
          <BottomNav />
      {showUpgrade && <UpgradePrompt feature="recall" remaining={0} onClose={() => setShowUpgrade(false)} />}
      </ToolPageShell>
  );
}
