import { loadHistory, addHistoryEntry, deleteHistoryEntry } from "@/lib/historyStore";
import { buildAIContext, getActiveSource } from "@/lib/sourceContext";
import { GlobalContextBar } from "@/components/GlobalContextBar";
import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { FlaskConical,
  Layers, Sparkles, Zap, Send, RotateCcw,
  GitMerge, Lightbulb, Link, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { callGroq } from "@/lib/groq";
import { ToolHeader, ModelSelector, HistorySidebar, type HistoryEntry } from "@/components/ToolShell";

interface Connection {
  concept1: string;
  concept2: string;
  link: string;
  insight: string;
  strength: "strong" | "moderate" | "subtle";
}
interface SynthesisResult {
  title: string;
  overview: string;
  connections: Connection[];
  bigIdea: string;
  appliedExample: string;
  questions: string[];
}

const EXAMPLE_COMBOS = [
  { a: "Thermodynamics", b: "Economics" },
  { a: "Evolution", b: "Machine Learning" },
  { a: "Quantum Mechanics", b: "Philosophy" },
  { a: "Psychology", b: "Marketing" },
  { a: "Calculus", b: "Biology" },
];

export default function SynthesisLab() {

  const [concept1, setConcept1] = useState("");
  const [concept2, setConcept2] = useState("");
  const [result, setResult] = useState<SynthesisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [synthHistory, setSynthHistory] = useState<HistoryEntry[]>(() => loadHistory("synthesislab"));

  const synthesize = async (c1?: string, c2?: string) => {
    const sourceName = getActiveSource()?.name?.replace(/\.\w+$/, "") ?? "";
    const a = (c1 ?? concept1.trim()) || (buildAIContext().length > 0 ? sourceName : "");
    const b = c2 ?? concept2.trim();
    if (!a || !b) return;
    setConcept1(a); setConcept2(b);
    const fileContext = buildAIContext();
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const raw = await callGroq(
        [{ role: "user", content: `Find surprising, deep connections between "${a}" and "${b}".${fileContext} Return ONLY valid JSON:\n{"title":"<catchy title for this synthesis>","overview":"<2-3 sentence intro to the connection>","connections":[{"concept1":"<aspect of ${a}>","concept2":"<aspect of ${b}>","link":"<how they connect>","insight":"<why this matters>","strength":"strong|moderate|subtle"}],"bigIdea":"<1 profound unified insight>","appliedExample":"<real-world example using both>","questions":["<thought-provoking question 1>","<question 2>","<question 3>"]}` }],
        "You are an interdisciplinary genius who finds non-obvious connections between fields. Identify 3-4 genuine structural similarities, metaphors, or shared principles. Be intellectually rigorous and surprising. Avoid superficial comparisons.",
        "llama-3.3-70b-versatile", 1200
      );
      const clean = raw.replace(/```json|```/g, "").trim();
      const jsonMatch = clean.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch?.[0] ?? clean);
      setResult(parsed);
      setSynthHistory(prev => addHistoryEntry("synthesislab", { id: Date.now().toString(), title: `${a} × ${b}`, subtitle: parsed.title ?? "", timestamp: new Date(), data: { c1: a, c2: b, result: parsed } }, prev));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg.includes("VITE_GROQ_API_KEY")
        ? "⚠️ No API key found. Add VITE_GROQ_API_KEY to your .env file."
        : `Error: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const strengthColor = (s: string) => s === "strong" ? "text-white/60 bg-white/10 border-emerald-500/20" : s === "moderate" ? "text-amber-500 bg-amber-500/10 border-amber-500/20" : "text-blue-500 bg-blue-500/10 border-blue-500/20";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar isLoggedIn user={{ name: "Learner", xp: 2450, streak: 12, plan: "free" }} />
      <main className="flex-1 max-w-3xl mx-auto w-full p-6 space-y-8">
        <HistorySidebar
          entries={synthHistory}
          activeId={null}
          onSelect={(e) => { const d = e.data as {c1:string;c2:string;result:unknown}; setConcept1(d.c1); setConcept2(d.c2); setResult(d.result as typeof result); setSidebarOpen(false); }}
          onNew={() => { setResult(null); setConcept1(""); setConcept2(""); setSidebarOpen(false); }}
          onDelete={(id) => setSynthHistory(prev => deleteHistoryEntry("synthesislab", id, prev))}
          open={sidebarOpen}
          onToggle={() => setSidebarOpen(v => !v)}
          newLabel="New Synthesis"
        />
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="w-9 h-9 rounded-none bg-gradient-to-br from-zinc-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 flex-shrink-0">
            <FlaskConical className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Synthesis Lab</h1>
            <p className="text-xs text-muted-foreground">Find surprising connections between ideas</p>
          </div>
          <button onClick={() => setSidebarOpen(v => !v)}
            className="relative flex items-center justify-center w-8 h-8 rounded-none border border-border bg-card hover:border-primary/50 transition-colors text-muted-foreground hover:text-primary">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
            {synthHistory.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-none bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">{synthHistory.length > 9 ? "9+" : synthHistory.length}</span>}
          </button>
          <ModelSelector />
        </div>

        {/* Input */}
        <div className="bg-card border border-border rounded-none p-6 space-y-4">
          <div className="grid grid-cols-[1fr,auto,1fr] gap-3 items-center">
            <input className="px-4 py-3 rounded-none border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Concept A (e.g. Evolution)" value={concept1} onChange={e => setConcept1(e.target.value)} />
            <div className="w-10 h-10 rounded-none bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0">
              <Link className="h-4 w-4 text-white" />
            </div>
            <input className="px-4 py-3 rounded-none border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Concept B (e.g. Machine Learning)" value={concept2} onChange={e => setConcept2(e.target.value)} />
          </div>
          {buildAIContext().length > 0 && !concept1.trim() && !concept2.trim() && (
            <p className="text-xs text-center" style={{ color: "var(--pz-gold, #d4af5a)" }}>
              💡 Tip: Leave fields blank to auto-fill from "{getActiveSource()?.name?.replace(/\.\w+$/, "") ?? "active source"}" as Concept A
            </p>
          )}
          {error && <div className="bg-red-500/10 border border-red-500/20 rounded-none p-3 text-sm text-red-600 dark:text-red-400">{error}</div>}
          <Button onClick={() => synthesize()} disabled={!concept1.trim() || !concept2.trim() || isLoading}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:opacity-90 h-12">
            {isLoading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-none animate-spin mr-2" />Synthesizing...</> : <><Sparkles className="h-4 w-4 mr-2" />Find Connections</>}
          </Button>
          <div>
            <p className="text-xs text-muted-foreground mb-2">Try these combos:</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_COMBOS.map(c => (
                <button key={c.a + c.b} onClick={() => synthesize(c.a, c.b)}
                  className="text-xs px-3 py-1.5 rounded-none border border-border hover:border-cyan-500 hover:text-cyan-600 transition-all flex items-center gap-1">
                  {c.a} <ArrowRight className="h-3 w-3" /> {c.b}
                </button>
              ))}
            </div>
          </div>
        <GlobalContextBar compact />
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="bg-card border border-border rounded-none p-8 flex flex-col items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-none bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center animate-pulse">
                <Layers className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Finding unexpected connections...</p>
          </div>
        )}

        {/* Result */}
        {result && !isLoading && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-cyan-500/10 to-blue-600/10 border border-cyan-500/20 rounded-none p-5">
              <h2 className="font-bold text-xl mb-2">{result.title}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{result.overview}</p>
            </div>

            {/* Connections */}
            <div className="space-y-3">
              <p className="text-sm font-semibold flex items-center gap-2"><GitMerge className="h-4 w-4 text-cyan-500" />Key Connections</p>
              {result.connections.map((conn, i) => (
                <div key={i} className="bg-card border border-border rounded-none p-4 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-cyan-600">{conn.concept1}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm font-semibold text-blue-600">{conn.concept2}</span>
                    <Badge variant="outline" className={cn("ml-auto text-xs", strengthColor(conn.strength))}>{conn.strength}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{conn.link}</p>
                  <p className="text-sm font-medium flex items-start gap-1.5"><Lightbulb className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />{conn.insight}</p>
                </div>
              ))}
            </div>

            {/* Big idea */}
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-none p-4">
              <p className="text-xs font-semibold text-amber-600 mb-1 flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" />The Big Idea</p>
              <p className="text-sm font-medium leading-relaxed">{result.bigIdea}</p>
            </div>

            {/* Applied example */}
            <div className="bg-card border border-border rounded-none p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Real-World Application</p>
              <p className="text-sm leading-relaxed">{result.appliedExample}</p>
            </div>

            {/* Questions */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Explore Further:</p>
              <div className="space-y-2">
                {result.questions.map((q, i) => (
                  <div key={i} className="text-sm px-4 py-3 rounded-none border border-border flex items-start gap-2">
                    <span className="text-cyan-500 font-bold flex-shrink-0">?</span>{q}
                  </div>
                ))}
              </div>
            </div>

            <Button variant="outline" onClick={() => { setResult(null); setConcept1(""); setConcept2(""); }} className="w-full">
              <RotateCcw className="h-4 w-4 mr-2" />New Synthesis
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
