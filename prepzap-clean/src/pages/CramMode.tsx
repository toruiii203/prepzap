import { CompanionSidebar } from "@/components/CompanionSidebar";
import { ToolPageShell } from "@/components/ToolPageShell";
import { useState, useEffect, useRef } from "react";
import { ConceptChipSelector } from "@/components/ConceptChipSelector";


import { ToolHeader } from "@/components/ToolShell";
import { GlobalContextBar } from "@/components/GlobalContextBar";
import { Zap, Clock, CheckCircle, RotateCcw, Trophy, ChevronRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { callGroq } from "@/lib/groq";
import { buildAIContext, getActiveSource } from "@/lib/sourceContext";

interface CramTopic {
  topic: string;
  keyPoints: string[];
  timeMinutes: number;
}

type Phase = "setup" | "session" | "done";

export default function CramMode() {
  const [subject, setSubject] = useState("")
  const [timeHours, setTimeHours] = useState(2)
  const [panicMode, setPanicMode] = useState(false);
  const [hoursAvailable, setHoursAvailable] = useState("2");
  const [loading, setLoading] = useState(false);
  const [topics, setTopics] = useState<CramTopic[]>([]);
  const [phase, setPhase] = useState<Phase>("setup");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [completed, setCompleted] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalUsed, setTotalUsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const ctx = buildAIContext();
  const activeSource = getActiveSource();
  const hasSource = ctx.length > 0;

  useEffect(() => {
    try {
      const saved = localStorage.getItem("pz_cram_last");
      if (saved) { const { subject: s } = JSON.parse(saved); if (s) setSubject(s); }
    } catch {}
  }, []);

  const startTopicTimer = (minutes: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(minutes * 60);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current!); return 0; }
        setTotalUsed(u => u + 1);
        return t - 1;
      });
    }, 1000);
  };

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const handleGenerate = async () => {
    const effectiveSubject = subject.trim() || activeSource?.name?.replace(/\.\w+$/, "") || "";
    if (!effectiveSubject && !hasSource) { toast.error("Enter a subject or add a source first"); return; }
    setLoading(true);
    try {
      const totalMins = parseFloat(hoursAvailable) * 60;
      const prompt = `Create a cram session for: "${effectiveSubject || "the study material below"}". Total time: ${totalMins} minutes.
${ctx ? `Study context:\n${ctx}\n` : ""}
Return ONLY valid JSON array, no markdown:
[{"topic":"string","keyPoints":["string","string","string"],"timeMinutes":number}]
Rules: 4-6 topics, timeMinutes must total ~${totalMins}, exactly 3 keyPoints each, order by importance.`;
      const raw = await callGroq(prompt, "meta-llama/llama-3.3-70b-instruct:free");
      const parsed: CramTopic[] = JSON.parse(raw.replace(/```json|```/g, "").trim());
      setTopics(parsed);
      setCurrentIdx(0);
      setCompleted([]);
      setTotalUsed(0);
      startTopicTimer(parsed[0].timeMinutes);
      setPhase("session");
      localStorage.setItem("pz_cram_last", JSON.stringify({ subject: effectiveSubject, date: new Date().toISOString() }));
    } catch(err:any) { console.error("[CramMode] generate failed:", err); toast.error("Error: " + (err?.message ?? String(err))); }
    finally { setLoading(false); }
  };

  const handleGotIt = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const newCompleted = [...completed, currentIdx];
    setCompleted(newCompleted);
    if (currentIdx + 1 < topics.length) {
      const next = currentIdx + 1;
      setCurrentIdx(next);
      startTopicTimer(topics[next].timeMinutes);
    } else { setPhase("done"); }
  };

  const handleMoreTime = () => { startTopicTimer(topics[currentIdx].timeMinutes); toast("Timer reset!"); };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  const progress = topics.length > 0 ? (completed.length / topics.length) * 100 : 0;
  const timerPct = topics[currentIdx] ? (timeLeft / (topics[currentIdx].timeMinutes * 60)) * 100 : 100;
  const timerColor = timeLeft < 30 ? "var(--pz-rose)" : timeLeft < 60 ? "var(--pz-gold)" : "var(--pz-teal)";

  return (
    <ToolPageShell>
      <CompanionSidebar />
      <main className="max-w-xl mx-auto px-4 pt-6 pb-24">
        <GlobalContextBar compact />
        <ToolHeader icon={<Zap className="h-5 w-5" style={{ color: "var(--pz-gold)" }} />} title="Cram Mode" subtitle="Guided timed session — one topic at a time" />

        {phase === "setup" && (
          <div className="space-y-4 mt-6">
            <div className="p-3 flex items-start gap-2" style={{ background: "rgba(232,64,64,0.06)", border: "1px solid rgba(232,64,64,0.2)" }}>
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "var(--pz-rose)" }} />
              <p className="text-xs" style={{ color: "var(--pz-text-2)" }}>Emergency mode — walks you through each topic with a live timer. Stay focused.</p>
            </div>
            <ConceptChipSelector
              onSelect={(concept) => { setSubject(concept); setTimeout(() => handleGenerate(), 0); }}
              placeholder="e.g. Organic Chemistry, WW2, Calculus…"
              label="Subject / Topic"
            />
            <div>
              <label className="text-xs font-medium mb-1.5 block uppercase tracking-widest" style={{ color: "var(--pz-text-muted)" }}>Time Available</label>
              <div className="flex gap-2 flex-wrap">
                {["0.5", "1", "1.5", "2", "3", "4"].map(h => (
                  <button key={h} onClick={() => setHoursAvailable(h)} className="px-3 py-1.5 text-xs"
                    style={{ border: `1px solid ${hoursAvailable === h ? "var(--pz-gold)" : "var(--pz-border)"}`, background: hoursAvailable === h ? "var(--pz-gold-dim)" : "var(--pz-surface2)", color: hoursAvailable === h ? "var(--pz-gold)" : "var(--pz-text-muted)", fontWeight: hoursAvailable === h ? 700 : 400 }}>
                    {parseFloat(h) < 1 ? `${parseFloat(h) * 60}min` : `${h}hr`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {phase === "session" && topics.length > 0 && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1.5" style={{ background: "var(--pz-surface3)" }}>
                <div className="h-full transition-all duration-500" style={{ width: `${progress}%`, background: "var(--pz-gold)" }} />
              </div>
              <span className="text-xs shrink-0" style={{ color: "var(--pz-text-muted)", fontFamily: "monospace" }}>{completed.length}/{topics.length}</span>
            </div>

            <div className="p-5" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)", borderTop: "2px solid var(--pz-gold)" }}>
              <div className="flex items-start justify-between gap-3 mb-4">
                <h2 className="text-base font-semibold" style={{ color: "var(--pz-text)" }}>{topics[currentIdx].topic}</h2>
                <span className="text-xs px-2 py-0.5 shrink-0" style={{ background: "var(--pz-surface3)", color: "var(--pz-text-muted)", fontFamily: "monospace" }}>{currentIdx + 1}/{topics.length}</span>
              </div>
              <ul className="space-y-2 mb-5">
                {topics[currentIdx].keyPoints.map((pt, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "var(--pz-text-2)" }}>
                    <ChevronRight className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "var(--pz-gold)" }} /> {pt}
                  </li>
                ))}
              </ul>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" style={{ color: timerColor }} />
                    <span className="text-sm font-bold" style={{ color: timerColor, fontFamily: "monospace" }}>{fmt(timeLeft)}</span>
                  </div>
                  <span className="text-xs" style={{ color: "var(--pz-text-muted)" }}>{topics[currentIdx].timeMinutes}min allocated</span>
                </div>
                <div className="h-1.5" style={{ background: "var(--pz-surface3)" }}>
                  <div className="h-full" style={{ width: `${Math.max(0, timerPct)}%`, background: timerColor, transition: "width 1s linear, background 0.3s" }} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleGotIt} className="flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-2" style={{ background: "var(--pz-teal)", color: "#000" }}>
                  <CheckCircle className="h-4 w-4" /> Got it ✓
                </Button>
                <Button onClick={handleMoreTime} className="px-4 py-2.5 text-sm flex items-center gap-1.5" style={{ background: "var(--pz-surface3)", border: "1px solid var(--pz-border)", color: "var(--pz-text-muted)" }}>
                  <RotateCcw className="h-3.5 w-3.5" /> More time
                </Button>
              </div>
            </div>

            {topics.slice(currentIdx + 1).length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs uppercase tracking-widest" style={{ color: "var(--pz-text-muted)" }}>Up next</p>
                {topics.slice(currentIdx + 1).map((t, i) => (
                  <div key={i} className="px-3 py-2 flex items-center justify-between" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)" }}>
                    <span className="text-xs" style={{ color: "var(--pz-text-2)" }}>{t.topic}</span>
                    <span className="text-xs" style={{ color: "var(--pz-text-muted)", fontFamily: "monospace" }}>{t.timeMinutes}min</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {phase === "done" && (
          <div className="mt-6 space-y-4">
            <div className="p-6 text-center" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)", borderTop: "2px solid var(--pz-gold)" }}>
              <Trophy className="h-10 w-10 mx-auto mb-3" style={{ color: "var(--pz-gold)" }} />
              <h2 className="text-xl font-bold mb-1" style={{ color: "var(--pz-text)" }}>Session Complete!</h2>
              <p className="text-sm" style={{ color: "var(--pz-text-muted)" }}>Covered {topics.length} topics in ~{Math.round(totalUsed / 60)} min</p>
            </div>
            <div className="space-y-2">
              {topics.map((t, i) => (
                <div key={i} className="p-3 flex items-center gap-3" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)", borderLeft: `3px solid ${completed.includes(i) ? "var(--pz-teal)" : "var(--pz-rose)"}` }}>
                  <CheckCircle className="h-4 w-4 shrink-0" style={{ color: completed.includes(i) ? "var(--pz-teal)" : "var(--pz-text-muted)" }} />
                  <span className="text-sm" style={{ color: "var(--pz-text)" }}>{t.topic}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button onClick={() => { setPhase("setup"); setTopics([]); }} className="flex-1 py-2.5 text-sm" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)", color: "var(--pz-text-muted)" }}>New Session</Button>
              <Button onClick={handleGenerate} disabled={loading} className="flex-1 py-2.5 text-sm font-semibold" style={{ background: "var(--pz-gold)", color: "#000" }}>{loading ? "Loading..." : "Redo Session"}</Button>
            </div>
          </div>
        )}
      </main>
    </ToolPageShell>
  );
}
