import { BuddyCompanion } from "@/components/BuddyCompanion";
import { ToolPageShell } from "@/components/ToolPageShell";
import { useState, useEffect, useRef } from "react";
import { ConceptChipSelector } from "@/components/ConceptChipSelector";


import { ToolHeader } from "@/components/ToolShell";
import { GlobalContextBar } from "@/components/GlobalContextBar";
import { Zap, Clock, CheckCircle, RotateCcw, Trophy, ChevronRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useStudySession } from "@/hooks/useStudySession";
import { callGroq } from "@/lib/groq";
import { buildAIContext, getActiveSource, onSourceChange } from "@/lib/sourceContext";
import { BottomNav } from "@/components/BottomNav";

interface CramTopic {
  topic: string;
  keyPoints: string[];
  timeMinutes: number;
}

type Phase = "setup" | "session" | "done";


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

export default function CramMode() {
  const { isPro, canUse, logUsage } = usePlan();
  const { logSession } = useStudySession();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [subject, setSubject] = useState("")
  const [hoursAvailable, setHoursAvailable] = useState("2");
  const [loading, setLoading] = useState(false);
  const [topics, setTopics] = useState<CramTopic[]>([]);
  const [phase, setPhase] = useState<Phase>("setup");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [completed, setCompleted] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalUsed, setTotalUsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

    if (!isPro) {
      const allowed = await canUse("cram");
      if (!allowed) {
        setShowUpgrade(true);
        return;
      }
    }

    const effectiveSubject = subject.trim() || activeSource?.name?.replace(/\.\w+$/, "") || "";
    if (!effectiveSubject && !hasSource) { toast.error("Enter a subject or add a source first"); return; }
    setLoading(true);
    try {
      const totalMins = parseFloat(hoursAvailable) * 60;
      const prompt = `Create a cram session for: "${effectiveSubject || "the study material below"}". Total time: ${totalMins} minutes.\n${ctx ? `Study context:\n${ctx}\n` : ""}\nReturn ONLY valid JSON array, no markdown:\n[{"topic":"string","keyPoints":["string","string","string"],"timeMinutes":number}]\nRules: 4-6 topics, timeMinutes must total ~${totalMins}, exactly 3 keyPoints each, order by importance.`;

      // FIX BUG 2: removed callGroqWithModel hack — call callGroq directly with feature key
      const raw = await callGroq(
        [{ role: "user", content: prompt }],
        undefined,
        "meta-llama/llama-3.1-8b-instruct",
        1024,
        "cram"
      );
      let clean = raw.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed: CramTopic[] = JSON.parse(clean);
      setTopics(parsed);
      setCurrentIdx(0);
      setCompleted([]);
      setTotalUsed(0);
      startTopicTimer(parsed[0].timeMinutes);
      setPhase("session");
      logSession({ title: "Cram Mode: " + effectiveSubject, durationMinutes: Math.round(totalMins) }); try { await logUsage("cram"); } catch {};
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
  const timerColor = timeLeft < 30 ? "#E8534A" : timeLeft < 60 ? "#ae2925" : "#2a9d8f";

  return (
    <ToolPageShell>
      <BuddyCompanion />
      {/* FIX BUG 7: increased pb to 160px so content isn't hidden behind fixed bottom bar */}
      <main className="max-w-xl mx-auto px-4 pt-6" style={{ paddingBottom: 160 }}>
        <GlobalContextBar compact />
        <ToolHeader icon={<Zap className="h-5 w-5" style={{ color: "#ae2925" }} />} title="Cram Mode" subtitle="Guided timed session — one topic at a time" />

        {phase === "setup" && (
          <div className="space-y-4 mt-6">
            <div className="p-3 flex items-start gap-2" style={{ background: "rgba(232,64,64,0.06)", border: "1px solid rgba(232,64,64,0.2)" }}>
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "#E8534A" }} />
              <p className="text-xs" style={{ color: "rgba(0,0,0,0.65)" }}>Emergency mode — walks you through each topic with a live timer. Stay focused.</p>
            </div>
            <ConceptChipSelector
              onSelect={(concept) => { setSubject(concept); setTimeout(() => handleGenerate(), 0); }}
              placeholder="e.g. Organic Chemistry, WW2, Calculus"
              label="Subject / Topic"
            />
            <SuggestionChips onSelect={s => { setSubject(s); setTimeout(() => handleGenerate(), 0); }} suggestions={["Organic Chemistry", "World War II", "Calculus Derivatives", "Human Anatomy", "Macroeconomics", "Cell Biology"]} />
            <div>
              <label className="text-xs font-medium mb-1.5 block uppercase tracking-widest" style={{ color: "rgba(0,0,0,0.4)" }}>Time Available</label>
              <div className="flex gap-2 flex-wrap">
                {["0.5", "1", "1.5", "2", "3", "4"].map(h => (
                  <button key={h} onClick={() => setHoursAvailable(h)} className="px-3 py-1.5 text-xs"
                    style={{ border: `1px solid ${hoursAvailable === h ? "#ae2925" : "rgba(0,0,0,0.12)"}`, background: hoursAvailable === h ? "rgba(174,41,37,0.1)" : "#F0EBE3", color: hoursAvailable === h ? "#ae2925" : "rgba(0,0,0,0.4)", fontWeight: hoursAvailable === h ? 700 : 400 }}>
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
              <div className="flex-1 h-1.5" style={{ background: "#E8E4DC" }}>
                <div className="h-full transition-all duration-500" style={{ width: `${progress}%`, background: "#ae2925" }} />
              </div>
              <span className="text-xs shrink-0" style={{ color: "rgba(0,0,0,0.4)", fontFamily: "monospace" }}>{completed.length}/{topics.length}</span>
            </div>

            <div className="p-5" style={{ background: "#F0EBE3", border: "1px solid rgba(0,0,0,0.12)", borderTop: "2px solid #ae2925" }}>
              <div className="flex items-start justify-between gap-3 mb-4">
                <h2 className="text-base font-semibold" style={{ color: "#1A1A1A" }}>{topics[currentIdx].topic}</h2>
                <span className="text-xs px-2 py-0.5 shrink-0" style={{ background: "#E8E4DC", color: "rgba(0,0,0,0.4)", fontFamily: "monospace" }}>{currentIdx + 1}/{topics.length}</span>
              </div>
              <ul className="space-y-2 mb-5">
                {topics[currentIdx].keyPoints.map((pt, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "rgba(0,0,0,0.65)" }}>
                    <ChevronRight className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "#ae2925" }} /> {pt}
                  </li>
                ))}
              </ul>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" style={{ color: timerColor }} />
                    <span className="text-sm font-bold" style={{ color: timerColor, fontFamily: "monospace" }}>{fmt(timeLeft)}</span>
                  </div>
                  <span className="text-xs" style={{ color: "rgba(0,0,0,0.4)" }}>{topics[currentIdx].timeMinutes}min allocated</span>
                </div>
                <div className="h-1.5" style={{ background: "#E8E4DC" }}>
                  <div className="h-full" style={{ width: `${Math.max(0, timerPct)}%`, background: timerColor, transition: "width 1s linear, background 0.3s" }} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleGotIt} className="flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-2" style={{ background: "#2a9d8f", color: "#000" }}>
                  <CheckCircle className="h-4 w-4" /> Got it
                </Button>
                <Button onClick={handleMoreTime} className="px-4 py-2.5 text-sm flex items-center gap-1.5" style={{ background: "#E8E4DC", border: "1px solid rgba(0,0,0,0.12)", color: "rgba(0,0,0,0.4)" }}>
                  <RotateCcw className="h-3.5 w-3.5" /> More time
                </Button>
              </div>
            </div>

            {topics.slice(currentIdx + 1).length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs uppercase tracking-widest" style={{ color: "rgba(0,0,0,0.4)" }}>Up next</p>
                {topics.slice(currentIdx + 1).map((t, i) => (
                  <div key={i} className="px-3 py-2 flex items-center justify-between" style={{ background: "#F0EBE3", border: "1px solid rgba(0,0,0,0.12)" }}>
                    <span className="text-xs" style={{ color: "rgba(0,0,0,0.65)" }}>{t.topic}</span>
                    <span className="text-xs" style={{ color: "rgba(0,0,0,0.4)", fontFamily: "monospace" }}>{t.timeMinutes}min</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {phase === "done" && (
          <div className="mt-6 space-y-4">
            <div className="p-6 text-center" style={{ background: "#F0EBE3", border: "1px solid rgba(0,0,0,0.12)", borderTop: "2px solid #ae2925" }}>
              <Trophy className="h-10 w-10 mx-auto mb-3" style={{ color: "#ae2925" }} />
              <h2 className="text-xl font-bold mb-1" style={{ color: "#1A1A1A" }}>Session Complete!</h2>
              <p className="text-sm" style={{ color: "rgba(0,0,0,0.4)" }}>Covered {topics.length} topics in ~{Math.round(totalUsed / 60)} min</p>
            </div>
            <div className="space-y-2">
              {topics.map((t, i) => (
                <div key={i} className="p-3 flex items-center gap-3" style={{ background: "#F0EBE3", border: "1px solid rgba(0,0,0,0.12)", borderLeft: `3px solid ${completed.includes(i) ? "#2a9d8f" : "#E8534A"}` }}>
                  <CheckCircle className="h-4 w-4 shrink-0" style={{ color: completed.includes(i) ? "#2a9d8f" : "rgba(0,0,0,0.4)" }} />
                  <span className="text-sm" style={{ color: "#1A1A1A" }}>{t.topic}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button onClick={() => { setPhase("setup"); setTopics([]); }} className="flex-1 py-2.5 text-sm" style={{ background: "#F0EBE3", border: "1px solid rgba(0,0,0,0.12)", color: "rgba(0,0,0,0.4)" }}>New Session</Button>
              <Button onClick={handleGenerate} disabled={loading} className="flex-1 py-2.5 text-sm font-semibold" style={{ background: "#ae2925", color: "#000" }}>{loading ? "Loading..." : "Redo Session"}</Button>
            </div>
          </div>
        )}
      </main>
          <BottomNav />
      {showUpgrade && <UpgradePrompt feature="cram" remaining={0} onClose={() => setShowUpgrade(false)} />}
      </ToolPageShell>
  );
}


