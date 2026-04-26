import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { BottomNav } from "@/components/BottomNav";
import { ToolHeader } from "@/components/ToolShell";
import { Zap, Clock, BookOpen, ChevronRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { callGroq } from "@/lib/groq";
import { buildAIContext } from "@/lib/sourceContext";

interface CramTopic {
  topic: string;
  priority: "critical" | "high" | "medium";
  timeEstimate: string;
  keyPoints: string[];
}

export default function CramMode() {
  const [subject, setSubject] = useState("");
  const [timeAvailable, setTimeAvailable] = useState("2");
  const [examDate, setExamDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<CramTopic[]>([]);
  const [phase, setPhase] = useState<"setup" | "plan">("setup");

  const handleGenerate = async () => {
    if (!subject.trim()) { toast.error("Enter a subject first"); return; }
    setLoading(true);
    try {
      const ctx = await buildAIContext();
      const prompt = `You are an emergency study planner. Create a focused cram plan for: "${subject}". 
Time available: ${timeAvailable} hours. ${examDate ? `Exam date: ${examDate}.` : ""}
${ctx ? `Study context:\n${ctx}\n` : ""}
Return ONLY valid JSON array (no markdown, no explanation):
[{"topic":"string","priority":"critical"|"high"|"medium","timeEstimate":"string","keyPoints":["string"]}]
Max 6 topics. Order by priority. Keep keyPoints to 3-4 per topic.`;

      const raw = await callGroq(prompt, "llama3-8b-8192");
      const cleaned = raw.replace(/```json|```/g, "").trim();
      const parsed: CramTopic[] = JSON.parse(cleaned);
      setPlan(parsed);
      setPhase("plan");
    } catch {
      toast.error("Failed to generate plan. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const priorityColor = (p: CramTopic["priority"]) =>
    p === "critical" ? "var(--pz-rose)" : p === "high" ? "var(--pz-gold)" : "var(--pz-teal)";

  const priorityBg = (p: CramTopic["priority"]) =>
    p === "critical" ? "rgba(232,64,64,0.08)" : p === "high" ? "var(--pz-gold-dim)" : "var(--pz-teal-dim)";

  return (
    <div style={{ minHeight: "100vh", background: "var(--pz-bg, #000)", color: "var(--pz-text, #F0E8D4)" }}>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 pt-6 pb-24">
        <ToolHeader
          icon={<Zap className="h-5 w-5" style={{ color: "var(--pz-gold)" }} />}
          title="Cram Mode"
          subtitle="Emergency study plan — make every minute count"
        />

        {phase === "setup" && (
          <div className="space-y-4 mt-6">
            <div className="p-4 rounded-none" style={{ background: "rgba(232,64,64,0.06)", border: "1px solid rgba(232,64,64,0.2)" }}>
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4" style={{ color: "var(--pz-rose, #E84040)" }} />
                <span className="text-sm font-semibold" style={{ color: "var(--pz-rose, #E84040)" }}>Emergency Mode</span>
              </div>
              <p className="text-xs" style={{ color: "var(--pz-text-2)" }}>This tool prioritises the most testable content for rapid review. Not a substitute for consistent study.</p>
            </div>

            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--pz-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Subject / Topic</label>
              <input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="e.g. Organic Chemistry, World War II, Calculus..."
                className="w-full px-3 py-2.5 rounded-none text-sm outline-none"
                style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)", color: "var(--pz-text)" }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--pz-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Hours Available</label>
                <select
                  value={timeAvailable}
                  onChange={e => setTimeAvailable(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-none text-sm outline-none"
                  style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)", color: "var(--pz-text)" }}
                >
                  {["1", "2", "3", "4", "6", "8", "12"].map(h => (
                    <option key={h} value={h}>{h} hour{h !== "1" ? "s" : ""}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--pz-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Exam Date (optional)</label>
                <input
                  type="date"
                  value={examDate}
                  onChange={e => setExamDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-none text-sm outline-none"
                  style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)", color: "var(--pz-text)" }}
                />
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={loading || !subject.trim()}
              className="w-full py-3 rounded-none font-semibold text-sm"
              style={{ background: "var(--pz-gold)", color: "#000" }}
            >
              {loading ? "Building your plan..." : "Generate Cram Plan →"}
            </Button>
          </div>
        )}

        {phase === "plan" && plan.length > 0 && (
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold" style={{ color: "var(--pz-text)" }}>Your Cram Plan</h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--pz-text-muted)" }}>{subject} · {timeAvailable}h total</p>
              </div>
              <button onClick={() => { setPhase("setup"); setPlan([]); }} className="text-xs px-3 py-1.5 rounded-none" style={{ border: "1px solid var(--pz-border)", color: "var(--pz-text-muted)" }}>
                Reset
              </button>
            </div>

            {plan.map((item, i) => (
              <div key={i} className="p-4 rounded-none" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)", borderLeft: `3px solid ${priorityColor(item.priority)}` }}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold" style={{ color: "var(--pz-text)" }}>{item.topic}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-none font-medium uppercase tracking-wide" style={{ background: priorityBg(item.priority), color: priorityColor(item.priority), border: `1px solid ${priorityColor(item.priority)}30` }}>
                      {item.priority}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0" style={{ color: "var(--pz-text-muted)" }}>
                    <Clock className="h-3 w-3" />
                    <span className="text-xs">{item.timeEstimate}</span>
                  </div>
                </div>
                <ul className="space-y-1.5">
                  {item.keyPoints.map((pt, j) => (
                    <li key={j} className="flex items-start gap-2 text-xs" style={{ color: "var(--pz-text-2)" }}>
                      <ChevronRight className="h-3 w-3 mt-0.5 shrink-0" style={{ color: "var(--pz-gold)" }} />
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <Button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full py-2.5 rounded-none text-sm"
              style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)", color: "var(--pz-text-muted)" }}
            >
              {loading ? "Regenerating..." : "Regenerate Plan"}
            </Button>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
