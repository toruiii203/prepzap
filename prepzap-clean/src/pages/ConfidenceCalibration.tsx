import { ToolPageShell } from "@/components/ToolPageShell";
import { useState, useEffect } from "react";


import { ToolHeader } from "@/components/ToolShell";
import { GlobalContextBar } from "@/components/GlobalContextBar";
import { Star, RotateCcw, Trophy, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { callGroq } from "@/lib/groq";
import { buildAIContext, getActiveSource } from "@/lib/sourceContext";

interface Concept {
  concept: string;
  definition: string;
}

type Rating = "know" | "shaky" | "no-idea";

interface RatedConcept extends Concept {
  rating: Rating;
  pass: number;
}

interface HistorySession {
  topic: string;
  score: number;
  date: string;
  know: number;
  shaky: number;
  noIdea: number;
}

const STORAGE_KEY = "pz_confidence_history";

function loadHistory(): HistorySession[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}

export default function ConfidenceCalibration() {
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(false);
  const [concepts, setConcepts] = useState<RatedConcept[]>([]);
  const [queue, setQueue] = useState<number[]>([]);
  const [queueIdx, setQueueIdx] = useState(0);
  const [phase, setPhase] = useState<"setup" | "sort" | "review" | "done">("setup");
  const [showDef, setShowDef] = useState(false);
  const [history, setHistory] = useState<HistorySession[]>(loadHistory);
  const [pass, setPass] = useState(1);

  const ctx = buildAIContext();
  const activeSource = getActiveSource();
  const hasSource = ctx.length > 0;

  const currentConceptIdx = queue[queueIdx];
  const current = concepts[currentConceptIdx];

  const handleGenerate = async () => {
    const effectiveSubject = subject.trim() || activeSource?.name?.replace(/\.\w+$/, "") || "";
    if (!effectiveSubject && !hasSource) { toast.error("Enter a subject or add a source first"); return; }
    setLoading(true);
    try {
      const prompt = `Generate 12 key concepts for confidence calibration on: "${effectiveSubject || "the study material below"}".
${ctx ? `Study context:\n${ctx}\n` : ""}
Return ONLY valid JSON array, no markdown:
[{"concept":"short concept name","definition":"1-2 sentence clear explanation"}]
Make concepts specific and testable — not too broad.`;
      const raw = await callGroq(prompt, "meta-llama/llama-3.3-70b-instruct:free");
      const parsed: Concept[] = JSON.parse(raw.replace(/```json|```/g, "").trim());
      const rated: RatedConcept[] = parsed.map(c => ({ ...c, rating: "no-idea" as Rating, pass: 0 }));
      setConcepts(rated);
      setQueue(parsed.map((_, i) => i));
      setQueueIdx(0);
      setPass(1);
      setShowDef(false);
      setPhase("sort");
    } catch(err:any) { console.error("[ConfidenceCalibration] generate failed:", err); toast.error("Error: " + (err?.message ?? String(err))); }
    finally { setLoading(false); }
  };

  const rate = (rating: Rating) => {
    const updated = [...concepts];
    updated[currentConceptIdx] = { ...updated[currentConceptIdx], rating, pass };
    setConcepts(updated);
    setShowDef(false);

    if (queueIdx + 1 < queue.length) {
      setQueueIdx(i => i + 1);
    } else {
      // Check if there are shaky/no-idea left for a second pass
      const needsReview = updated
        .map((c, i) => ({ c, i }))
        .filter(({ c }) => c.rating === "shaky" || c.rating === "no-idea")
        .map(({ i }) => i);

      if (needsReview.length > 0 && pass === 1) {
        toast(`Pass 1 done! Reviewing ${needsReview.length} weak concepts...`);
        setQueue(needsReview);
        setQueueIdx(0);
        setPass(2);
      } else {
        // Calculate score and save
        const know = updated.filter(c => c.rating === "know").length;
        const shaky = updated.filter(c => c.rating === "shaky").length;
        const noIdea = updated.filter(c => c.rating === "no-idea").length;
        const score = Math.round((know * 100 + shaky * 40) / updated.length);
        const session: HistorySession = {
          topic: subject.trim() || "Source Library",
          score, know, shaky, noIdea,
          date: new Date().toISOString(),
        };
        const newHistory = [session, ...history].slice(0, 10);
        setHistory(newHistory);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
        setPhase("done");
      }
    }
  };

  const ratingConfig = {
    "know":    { label: "Know it ✓", bg: "var(--pz-teal)",         color: "#000" },
    "shaky":   { label: "Shaky ~",   bg: "var(--pz-gold)",         color: "#000" },
    "no-idea": { label: "No idea ✗", bg: "var(--pz-rose, #E84040)", color: "#fff" },
  };

  const know   = concepts.filter(c => c.rating === "know").length;
  const shaky  = concepts.filter(c => c.rating === "shaky").length;
  const noIdea = concepts.filter(c => c.rating === "no-idea").length;
  const score  = concepts.length > 0 ? Math.round((know * 100 + shaky * 40) / concepts.length) : 0;

  const relTime = (iso: string) => {
    const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    return d === 0 ? "Today" : d === 1 ? "Yesterday" : `${d}d ago`;
  };

  return (
    <ToolPageShell>
      <main className="max-w-xl mx-auto px-4 pt-6 pb-24">
        <GlobalContextBar compact />
        <ToolHeader icon={<Star className="h-5 w-5" style={{ color: "var(--pz-gold)" }} />} title="Confidence Calibration" subtitle="Sort concepts into Know / Shaky / No idea — weak ones resurface automatically" />

        {/* SETUP */}
        {phase === "setup" && (
          <div className="space-y-4 mt-6">
            <div>
              <label className="text-xs font-medium mb-1.5 block uppercase tracking-widest" style={{ color: "var(--pz-text-muted)" }}>Subject</label>
              <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Human Anatomy, JavaScript..."
                className="w-full px-3 py-2.5 text-sm outline-none" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)", color: "var(--pz-text)" }} />
              {hasSource && !subject.trim() && <p className="text-xs mt-1" style={{ color: "var(--pz-gold)" }}>⚡ Leave blank to use your active source library</p>}
            </div>
            <Button onClick={handleGenerate} disabled={loading || (!subject.trim() && !hasSource)} className="w-full py-3 font-semibold text-sm" style={{ background: "var(--pz-gold)", color: "#000" }}>
              {loading ? "Generating concepts..." : "Start Calibration →"}
            </Button>

            {history.length > 0 && (
              <div className="mt-6">
                <p className="text-xs uppercase tracking-widest mb-3" style={{ color: "var(--pz-text-muted)" }}>Past Sessions</p>
                <div className="space-y-2">
                  {history.slice(0, 5).map((h, i) => (
                    <div key={i} className="p-3 flex items-center justify-between" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)" }}>
                      <div>
                        <p className="text-sm font-medium" style={{ color: "var(--pz-text)" }}>{h.topic}</p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--pz-text-muted)" }}>
                          ✓ {h.know} · ~ {h.shaky} · ✗ {h.noIdea}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-bold" style={{ color: h.score >= 70 ? "var(--pz-teal)" : h.score >= 40 ? "var(--pz-gold)" : "var(--pz-rose)", fontFamily: "monospace" }}>{h.score}</p>
                        <p className="text-xs" style={{ color: "var(--pz-text-muted)" }}>{relTime(h.date)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SORT */}
        {phase === "sort" && current && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-widest" style={{ color: "var(--pz-text-muted)" }}>Pass {pass} · {queueIdx + 1} of {queue.length}</span>
              {pass === 2 && <span className="text-xs px-2 py-0.5" style={{ background: "var(--pz-gold-dim)", color: "var(--pz-gold)", border: "1px solid var(--pz-gold)30" }}>Review pass</span>}
            </div>

            <div className="h-1.5" style={{ background: "var(--pz-surface3)" }}>
              <div className="h-full transition-all duration-300" style={{ width: `${(queueIdx / queue.length) * 100}%`, background: "var(--pz-gold)" }} />
            </div>

            {/* Concept card */}
            <div className="p-6 text-center min-h-[200px] flex flex-col items-center justify-center"
              style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)", borderTop: "2px solid var(--pz-gold)" }}>
              <p className="text-lg font-semibold mb-4" style={{ color: "var(--pz-text)" }}>{current.concept}</p>
              {showDef ? (
                <p className="text-sm" style={{ color: "var(--pz-text-2)" }}>{current.definition}</p>
              ) : (
                <button onClick={() => setShowDef(true)} className="text-xs px-3 py-1.5"
                  style={{ border: "1px solid var(--pz-border)", color: "var(--pz-text-muted)", background: "var(--pz-surface3)" }}>
                  Show definition
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(["know", "shaky", "no-idea"] as Rating[]).map(r => (
                <button key={r} onClick={() => rate(r)} className="py-3 text-xs font-semibold"
                  style={{ background: ratingConfig[r].bg, color: ratingConfig[r].color, border: "none" }}>
                  {ratingConfig[r].label}
                </button>
              ))}
            </div>

            {/* Live tally */}
            <div className="flex gap-3 justify-center text-xs" style={{ color: "var(--pz-text-muted)" }}>
              <span style={{ color: "var(--pz-teal)" }}>✓ {know}</span>
              <span style={{ color: "var(--pz-gold)" }}>~ {shaky}</span>
              <span style={{ color: "var(--pz-rose)" }}>✗ {noIdea}</span>
            </div>
          </div>
        )}

        {/* DONE */}
        {phase === "done" && (
          <div className="mt-6 space-y-4">
            <div className="p-6 text-center" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)", borderTop: "2px solid var(--pz-gold)" }}>
              <Trophy className="h-8 w-8 mx-auto mb-3" style={{ color: "var(--pz-gold)" }} />
              <p className="text-xs mb-2 uppercase tracking-widest" style={{ color: "var(--pz-text-muted)" }}>Calibration Score</p>
              <p className="text-5xl font-bold mb-3" style={{ color: score >= 70 ? "var(--pz-teal)" : score >= 40 ? "var(--pz-gold)" : "var(--pz-rose)", fontFamily: "monospace" }}>{score}</p>

              {/* Bar breakdown */}
              <div className="flex h-4 w-full overflow-hidden mb-3" style={{ border: "1px solid var(--pz-border)" }}>
                {know > 0    && <div style={{ flex: know,    background: "var(--pz-teal)" }} />}
                {shaky > 0   && <div style={{ flex: shaky,   background: "var(--pz-gold)" }} />}
                {noIdea > 0  && <div style={{ flex: noIdea,  background: "var(--pz-rose)" }} />}
              </div>
              <div className="flex justify-center gap-4 text-xs" style={{ color: "var(--pz-text-muted)" }}>
                <span style={{ color: "var(--pz-teal)" }}>✓ Know: {know}</span>
                <span style={{ color: "var(--pz-gold)" }}>~ Shaky: {shaky}</span>
                <span style={{ color: "var(--pz-rose)" }}>✗ No idea: {noIdea}</span>
              </div>
            </div>

            {(shaky > 0 || noIdea > 0) && (
              <div>
                <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "var(--pz-text-muted)" }}>Weak areas to study</p>
                <div className="space-y-1.5">
                  {concepts.filter(c => c.rating === "shaky" || c.rating === "no-idea").map((c, i) => (
                    <div key={i} className="p-3" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)", borderLeft: `3px solid ${c.rating === "no-idea" ? "var(--pz-rose)" : "var(--pz-gold)"}` }}>
                      <p className="text-sm font-medium mb-1" style={{ color: "var(--pz-text)" }}>{c.concept}</p>
                      <p className="text-xs" style={{ color: "var(--pz-text-2)" }}>{c.definition}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={() => { setPhase("setup"); setConcepts([]); }} className="flex-1 py-2.5 text-sm" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)", color: "var(--pz-text-muted)" }}>New Subject</Button>
              <Button onClick={handleGenerate} disabled={loading} className="flex-1 py-2.5 text-sm font-semibold" style={{ background: "var(--pz-gold)", color: "#000" }}>{loading ? "Loading..." : "Try Again"}</Button>
            </div>
          </div>
        )}
      </main>
    </ToolPageShell>
  );
}
