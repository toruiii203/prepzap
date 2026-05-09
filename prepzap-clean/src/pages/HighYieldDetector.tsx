import { CompanionSidebar } from "@/components/CompanionSidebar";
import { ToolPageShell } from "@/components/ToolPageShell";
import { useState } from "react";
import { ConceptChipSelector } from "@/components/ConceptChipSelector";


import { ToolHeader } from "@/components/ToolShell";
import { GlobalContextBar } from "@/components/GlobalContextBar";
import { TrendingUp, ChevronDown, ChevronUp, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { callGroq } from "@/lib/groq";
import { buildAIContext, getActiveSource } from "@/lib/sourceContext";

interface HighYieldConcept {
  concept: string;
  whyTestable: string;
  frequency: "very high" | "high" | "medium";
}

interface DrillQuestion {
  question: string;
  answer: string;
}

interface DrillState {
  questions: DrillQuestion[];
  answers: string[];
  revealed: boolean[];
  scores: (boolean | null)[];
}

export default function HighYieldDetector() {
  const [subject, setSubject] = useState("");
  const [examType, setExamType] = useState("");
  const [loading, setLoading] = useState(false);
  const [concepts, setConcepts] = useState<HighYieldConcept[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [drills, setDrills] = useState<Record<number, DrillState>>({});
  const [drillingIdx, setDrillingIdx] = useState<number | null>(null);
  const [drillLoading, setDrillLoading] = useState<number | null>(null);
  const [practiceLoading, setPracticeLoading] = useState(false);
  const [practiceSet, setPracticeSet] = useState<DrillQuestion[]>([]);
  const [practiceAnswers, setPracticeAnswers] = useState<string[]>([]);
  const [practiceRevealed, setPracticeRevealed] = useState<boolean[]>([]);
  const [practiceScores, setPracticeScores] = useState<(boolean | null)[]>([]);

  const ctx = buildAIContext();
  const activeSource = getActiveSource();
  const hasSource = ctx.length > 0;

  const freqColor = (f: string) => f === "very high" ? "var(--pz-rose)" : f === "high" ? "var(--pz-gold)" : "var(--pz-teal)";
  const freqLabel = (f: string) => f === "very high" ? "🔥 Very High" : f === "high" ? "⚡ High" : "📌 Medium";

  const handleGenerate = async () => {
    const effectiveSubject = subject.trim() || activeSource?.name?.replace(/\.\w+$/, "") || "";
    if (!effectiveSubject && !hasSource) { toast.error("Enter a subject or add a source first"); return; }
    setLoading(true);
    setPracticeSet([]);
    try {
      const prompt = `Identify the 8 highest-yield concepts for: "${effectiveSubject || "the study material"}"${examType ? ` (exam: ${examType})` : ""}.
${ctx ? `Study context:\n${ctx}\n` : ""}
Return ONLY valid JSON array, no markdown:
[{"concept":"string","whyTestable":"1 sentence","frequency":"very high"|"high"|"medium"}]
Order by frequency descending.`;
      const raw = await callGroq(prompt, "llama-3.3-70b-versatile");
      const parsed: HighYieldConcept[] = JSON.parse(raw.replace(/```json|```/g, "").trim());
      setConcepts(parsed);
      setDrills({});
      setExpanded(null);
      setDrillingIdx(null);
    } catch(err:any) { console.error("[HighYieldDetector] generate failed:", err); toast.error("Error: " + (err?.message ?? String(err))); }
    finally { setLoading(false); }
  };

  const handleDrill = async (idx: number) => {
    if (drills[idx]) { setDrillingIdx(drillingIdx === idx ? null : idx); return; }
    setDrillLoading(idx);
    setDrillingIdx(idx);
    try {
      const concept = concepts[idx].concept;
      const prompt = `Create exactly 3 short-answer quiz questions specifically about: "${concept}".
${ctx ? `Study context:\n${ctx}\n` : ""}
Return ONLY valid JSON array, no markdown:
[{"question":"string","answer":"concise answer in 1-2 sentences"}]`;
      const raw = await callGroq(prompt, "meta-llama/llama-3.1-8b-instruct:free");
      const parsed: DrillQuestion[] = JSON.parse(raw.replace(/```json|```/g, "").trim());
      setDrills(prev => ({
        ...prev,
        [idx]: { questions: parsed, answers: ["", "", ""], revealed: [false, false, false], scores: [null, null, null] }
      }));
    } catch { toast.error("Failed to generate drill."); setDrillingIdx(null); }
    finally { setDrillLoading(null); }
  };

  const handleDrillAnswer = (conceptIdx: number, qIdx: number, val: string) => {
    setDrills(prev => {
      const d = { ...prev[conceptIdx] };
      d.answers = [...d.answers]; d.answers[qIdx] = val;
      return { ...prev, [conceptIdx]: d };
    });
  };

  const handleReveal = (conceptIdx: number, qIdx: number, correct: boolean) => {
    setDrills(prev => {
      const d = { ...prev[conceptIdx] };
      d.revealed = [...d.revealed]; d.revealed[qIdx] = true;
      d.scores = [...d.scores]; d.scores[qIdx] = correct;
      return { ...prev, [conceptIdx]: d };
    });
  };

  const handleFullPractice = async () => {
    setPracticeLoading(true);
    try {
      const topicList = concepts.slice(0, 5).map(c => c.concept).join(", ");
      const prompt = `Create 10 exam-style questions covering these high-yield concepts: ${topicList}.
${ctx ? `Study context:\n${ctx}\n` : ""}
Return ONLY valid JSON array, no markdown:
[{"question":"string","answer":"concise answer in 1-2 sentences"}]
Mix question types: definition, application, comparison.`;
      const raw = await callGroq(prompt, "llama-3.3-70b-versatile");
      const parsed: DrillQuestion[] = JSON.parse(raw.replace(/```json|```/g, "").trim());
      setPracticeSet(parsed);
      setPracticeAnswers(parsed.map(() => ""));
      setPracticeRevealed(parsed.map(() => false));
      setPracticeScores(parsed.map(() => null));
    } catch { toast.error("Failed to generate practice set."); }
    finally { setPracticeLoading(false); }
  };

  return (
    <ToolPageShell>
      <CompanionSidebar />
      <main className="max-w-xl mx-auto px-4 pt-6 pb-24">
        <GlobalContextBar compact />
        <ToolHeader icon={<TrendingUp className="h-5 w-5" style={{ color: "var(--pz-gold)" }} />} title="High Yield Detector" subtitle="Find what's most testable — then drill it instantly" />

        <div className="space-y-3 mt-6">
          <div>
            <label className="text-xs font-medium mb-1.5 block uppercase tracking-widest" style={{ color: "var(--pz-text-muted)" }}>Paste Material</label>
            <div style={{ position: "relative" }}>
              <textarea
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Paste notes or text here..."
                rows={6}
                className="w-full px-3 py-2.5 text-sm outline-none resize-none"
                style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)", color: "var(--pz-text)" }}
              />
              <div style={{ position: "absolute", bottom: 12, right: 12, fontSize: 10, color: "var(--pz-text-muted)", background: "var(--pz-surface)", padding: "2px 6px", borderRadius: 4, border: "1px solid var(--pz-border)" }}>
                {subject.trim().split(/\s+/).filter(Boolean).length} words
              </div>
            </div>
            <div className="mt-2 text-xs text-right text-gray-500">
                <button onClick={() => handleGenerate()} className="px-4 py-2 font-semibold" style={{ background: "var(--pz-gold)", color: "#000", border: "none" }}>Generate Focus Areas</button>
            </div>
          </div>
          <ConceptChipSelector
            onSelect={(concept) => { setSubject(prev => prev ? prev + "\n\n" + concept : concept); }}
            placeholder="e.g. Biochemistry, Calculus, WW2…"
            label="Add Topic Tag (optional)"
          />
          <div>
            <label className="text-xs font-medium mb-1.5 block uppercase tracking-widest" style={{ color: "var(--pz-text-muted)" }}>Exam Type (optional)</label>
            <input value={examType} onChange={e => setExamType(e.target.value)} placeholder="e.g. USMLE, SAT…"
              className="w-full px-3 py-2.5 text-sm outline-none" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)", color: "var(--pz-text)" }} />
          </div>
        </div>

        {concepts.length > 0 && (
          <div className="mt-6 space-y-2">
            {concepts.map((item, i) => (
              <div key={i} style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)", borderLeft: `3px solid ${freqColor(item.frequency)}` }}>
                {/* Header row */}
                <div className="p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-xs font-mono shrink-0" style={{ color: "var(--pz-text-muted)" }}>#{i + 1}</span>
                    <span className="text-sm font-semibold truncate" style={{ color: "var(--pz-text)" }}>{item.concept}</span>
                    <span className="text-[10px] px-1.5 py-0.5 shrink-0" style={{ color: freqColor(item.frequency), border: `1px solid ${freqColor(item.frequency)}30`, background: `${freqColor(item.frequency)}10` }}>
                      {freqLabel(item.frequency)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => handleDrill(i)} disabled={drillLoading === i}
                      className="text-xs px-2.5 py-1 font-semibold"
                      style={{ background: "var(--pz-gold)", color: "#000", border: "none" }}>
                      {drillLoading === i ? "..." : "Drill it"}
                    </button>
                    <button onClick={() => setExpanded(expanded === i ? null : i)} style={{ background: "none", border: "none", color: "var(--pz-text-muted)", cursor: "pointer" }}>
                      {expanded === i ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Why testable */}
                {expanded === i && (
                  <div className="px-3 pb-3">
                    <p className="text-xs" style={{ color: "var(--pz-text-2)" }}>💡 {item.whyTestable}</p>
                  </div>
                )}

                {/* Drill questions */}
                {drillingIdx === i && drills[i] && (
                  <div className="px-3 pb-3 space-y-3 border-t" style={{ borderColor: "var(--pz-border)" }}>
                    <p className="text-xs mt-2 uppercase tracking-widest" style={{ color: "var(--pz-text-muted)" }}>Quick Drill</p>
                    {drills[i].questions.map((q, qi) => (
                      <div key={qi} className="space-y-2">
                        <p className="text-xs font-medium" style={{ color: "var(--pz-text)" }}>{qi + 1}. {q.question}</p>
                        <input value={drills[i].answers[qi]}
                          onChange={e => handleDrillAnswer(i, qi, e.target.value)}
                          placeholder="Your answer..."
                          disabled={drills[i].revealed[qi]}
                          className="w-full px-2.5 py-1.5 text-xs outline-none"
                          style={{ background: "var(--pz-surface3)", border: "1px solid var(--pz-border)", color: "var(--pz-text)" }} />
                        {!drills[i].revealed[qi] ? (
                          <div className="flex gap-2">
                            <button onClick={() => handleReveal(i, qi, true)} className="text-xs px-2.5 py-1" style={{ background: "var(--pz-teal-dim)", color: "var(--pz-teal)", border: "1px solid var(--pz-teal)30" }}>✓ Correct</button>
                            <button onClick={() => handleReveal(i, qi, false)} className="text-xs px-2.5 py-1" style={{ background: "rgba(232,64,64,0.08)", color: "var(--pz-rose)", border: "1px solid rgba(232,64,64,0.2)" }}>✗ Wrong</button>
                          </div>
                        ) : (
                          <div className="p-2" style={{ background: "var(--pz-surface3)", borderLeft: `2px solid ${drills[i].scores[qi] ? "var(--pz-teal)" : "var(--pz-rose)"}` }}>
                            <p className="text-xs" style={{ color: "var(--pz-text-2)" }}>{q.answer}</p>
                          </div>
                        )}
                      </div>
                    ))}
                    {drills[i].scores.every(s => s !== null) && (
                      <p className="text-xs font-semibold" style={{ color: "var(--pz-gold)" }}>
                        Score: {drills[i].scores.filter(Boolean).length}/{drills[i].questions.length}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Full practice set */}
            <Button onClick={handleFullPractice} disabled={practiceLoading} className="w-full py-2.5 mt-2 text-sm font-semibold" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)", color: "var(--pz-text)" }}>
              {practiceLoading ? "Generating..." : "⚡ Generate Full Practice Set (10 questions)"}
            </Button>

            {practiceSet.length > 0 && (
              <div className="space-y-3 mt-2">
                <p className="text-xs uppercase tracking-widest" style={{ color: "var(--pz-text-muted)" }}>Full Practice Set</p>
                {practiceSet.map((q, i) => (
                  <div key={i} className="p-3 space-y-2" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)" }}>
                    <p className="text-sm font-medium" style={{ color: "var(--pz-text)" }}>{i + 1}. {q.question}</p>
                    <textarea value={practiceAnswers[i]}
                      onChange={e => { const a = [...practiceAnswers]; a[i] = e.target.value; setPracticeAnswers(a); }}
                      disabled={practiceRevealed[i]}
                      rows={2} placeholder="Your answer..."
                      className="w-full px-2.5 py-1.5 text-xs outline-none resize-none"
                      style={{ background: "var(--pz-surface3)", border: "1px solid var(--pz-border)", color: "var(--pz-text)" }} />
                    {!practiceRevealed[i] ? (
                      <div className="flex gap-2">
                        <button onClick={() => { const r = [...practiceRevealed]; r[i] = true; setPracticeRevealed(r); const s = [...practiceScores]; s[i] = true; setPracticeScores(s); }}
                          className="text-xs px-2.5 py-1" style={{ background: "var(--pz-teal-dim)", color: "var(--pz-teal)", border: "1px solid var(--pz-teal)30" }}>✓ Correct</button>
                        <button onClick={() => { const r = [...practiceRevealed]; r[i] = true; setPracticeRevealed(r); const s = [...practiceScores]; s[i] = false; setPracticeScores(s); }}
                          className="text-xs px-2.5 py-1" style={{ background: "rgba(232,64,64,0.08)", color: "var(--pz-rose)", border: "1px solid rgba(232,64,64,0.2)" }}>✗ Wrong</button>
                      </div>
                    ) : (
                      <div className="p-2" style={{ background: "var(--pz-surface3)", borderLeft: `2px solid ${practiceScores[i] ? "var(--pz-teal)" : "var(--pz-rose)"}` }}>
                        <p className="text-xs" style={{ color: "var(--pz-text-2)" }}>{q.answer}</p>
                      </div>
                    )}
                  </div>
                ))}
                {practiceRevealed.every(Boolean) && (
                  <div className="p-3 text-center" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-gold)40" }}>
                    <p className="text-sm font-bold" style={{ color: "var(--pz-gold)" }}>
                      Final Score: {practiceScores.filter(Boolean).length}/{practiceSet.length}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </ToolPageShell>
  );
}
