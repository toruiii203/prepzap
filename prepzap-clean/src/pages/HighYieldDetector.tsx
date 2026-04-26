import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { BottomNav } from "@/components/BottomNav";
import { ToolHeader } from "@/components/ToolShell";
import { TrendingUp, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { callGroq } from "@/lib/groq";
import { buildAIContext } from "@/lib/sourceContext";

interface HighYieldItem {
  concept: string;
  whyTestable: string;
  frequency: "very high" | "high" | "medium";
  examTip: string;
}

export default function HighYieldDetector() {
  const [subject, setSubject] = useState("");
  const [examType, setExamType] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<HighYieldItem[]>([]);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!subject.trim()) { toast.error("Enter a subject first"); return; }
    setLoading(true);
    try {
      const ctx = await buildAIContext();
      const prompt = `You are an expert exam strategist. Identify the highest-yield concepts for: "${subject}"${examType ? ` (exam type: ${examType})` : ""}.
${ctx ? `Study context:\n${ctx}\n` : ""}
Return ONLY valid JSON array (no markdown):
[{"concept":"string","whyTestable":"1 sentence","frequency":"very high"|"high"|"medium","examTip":"1 actionable tip"}]
Return exactly 8 items ordered by frequency descending.`;
      const raw = await callGroq(prompt, "llama3-8b-8192");
      const parsed: HighYieldItem[] = JSON.parse(raw.replace(/```json|```/g, "").trim());
      setItems(parsed);
    } catch {
      toast.error("Failed to generate. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    const text = items.map((item, i) => `${i + 1}. ${item.concept}\n   Why testable: ${item.whyTestable}\n   Tip: ${item.examTip}`).join("\n\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const freqColor = (f: HighYieldItem["frequency"]) =>
    f === "very high" ? "var(--pz-rose, #E84040)" : f === "high" ? "var(--pz-gold)" : "var(--pz-teal)";

  const freqLabel = (f: HighYieldItem["frequency"]) =>
    f === "very high" ? "🔥 Very High" : f === "high" ? "⚡ High" : "📌 Medium";

  return (
    <div style={{ minHeight: "100vh", background: "var(--pz-bg, #000)", color: "var(--pz-text, #F0E8D4)" }}>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 pt-6 pb-24">
        <ToolHeader
          icon={<TrendingUp className="h-5 w-5" style={{ color: "var(--pz-gold)" }} />}
          title="High Yield Detector"
          subtitle="Focus on what's most likely to appear on your exam"
        />

        <div className="space-y-4 mt-6">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--pz-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Subject</label>
              <input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="e.g. Biochemistry, History..."
                className="w-full px-3 py-2.5 rounded-none text-sm outline-none"
                style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)", color: "var(--pz-text)" }}
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--pz-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Exam Type (optional)</label>
              <input
                value={examType}
                onChange={e => setExamType(e.target.value)}
                placeholder="e.g. USMLE, A-Level, SAT..."
                className="w-full px-3 py-2.5 rounded-none text-sm outline-none"
                style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)", color: "var(--pz-text)" }}
              />
            </div>
          </div>

          <Button onClick={handleGenerate} disabled={loading || !subject.trim()} className="w-full py-3 rounded-none font-semibold text-sm" style={{ background: "var(--pz-gold)", color: "#000" }}>
            {loading ? "Analysing..." : "Find High-Yield Concepts →"}
          </Button>
        </div>

        {items.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold" style={{ color: "var(--pz-text)" }}>Top Concepts to Master</h2>
              <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-none" style={{ border: "1px solid var(--pz-border)", color: "var(--pz-text-muted)" }}>
                {copied ? <><Check className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy all</>}
              </button>
            </div>
            <div className="space-y-3">
              {items.map((item, i) => (
                <div key={i} className="p-4 rounded-none" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)" }}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono" style={{ color: "var(--pz-text-muted)" }}>#{i + 1}</span>
                      <span className="text-sm font-semibold" style={{ color: "var(--pz-text)" }}>{item.concept}</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-none shrink-0 font-medium" style={{ color: freqColor(item.frequency), border: `1px solid ${freqColor(item.frequency)}30`, background: `${freqColor(item.frequency)}10` }}>
                      {freqLabel(item.frequency)}
                    </span>
                  </div>
                  <p className="text-xs mb-2" style={{ color: "var(--pz-text-2)" }}>{item.whyTestable}</p>
                  <div className="flex items-start gap-2 p-2.5 rounded-none" style={{ background: "var(--pz-surface3)", border: "1px solid var(--pz-border)" }}>
                    <span className="text-xs" style={{ color: "var(--pz-gold)" }}>💡</span>
                    <p className="text-xs" style={{ color: "var(--pz-text-2)" }}>{item.examTip}</p>
                  </div>
                </div>
              ))}
            </div>
            <Button onClick={handleGenerate} disabled={loading} className="w-full mt-4 py-2.5 rounded-none text-sm" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)", color: "var(--pz-text-muted)" }}>
              {loading ? "Regenerating..." : "Regenerate"}
            </Button>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
