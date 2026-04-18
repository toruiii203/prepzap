import { loadHistory, addHistoryEntry, deleteHistoryEntry } from "@/lib/historyStore";
import { buildAIContext } from "@/lib/sourceContext";
import { GlobalContextBar } from "@/components/GlobalContextBar";
import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import {
  HelpCircle, Send, ChevronRight, Zap, Lightbulb,
  BookOpen, Layers, RotateCcw, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { callGroq } from "@/lib/groq";
import { ToolHeader, HistorySidebar, useFileAttach, FileBadge, type HistoryEntry } from "@/components/ToolShell";
import { MathRenderer } from "@/components/MathRenderer";

interface Explanation {
  question: string;
  layers: { title: string; content: string; emoji: string }[];
  analogy: string;
  summary: string;
  goDeeper: string[];
}

const EXAMPLE_QUESTIONS = [
  "Why does gravity make things fall?",
  "Why does inflation happen?",
  "Why is the sky blue?",
  "Why do vaccines work?",
  "Why does compound interest grow so fast?",
  "Why does evolution happen?",
];

export default function WhyEngine() {

  const [question, setQuestion] = useState("");
  const [input, setInput] = useState("");
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeLayer, setActiveLayer] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [whyHistory, setWhyHistory] = useState<HistoryEntry[]>(() => loadHistory("whyengine"));
  const { pendingFile, setPendingFile, FileAttachButton } = useFileAttach();

  const hasSource = buildAIContext().length > 0 || !!pendingFile;

  const ask = async (q?: string) => {
    const text = (q ?? input).trim();
    // Allow generate from source even with no text
    const sourceCtx = pendingFile?.content
      ? `\n\nBase your explanation on this material:\n${pendingFile.content.slice(0, 4000)}`
      : buildAIContext();
    if (!text && !hasSource) return;
    const question_ = text || (pendingFile?.name ?? "the uploaded material");
    setQuestion(question_);
    setInput("");
    setPendingFile(null);
    setIsLoading(true);
    setError(null);
    setExplanation(null);
    setActiveLayer(0);
    try {
      const raw = await callGroq(
        [{ role: "user", content: `Explain the first-principles "why" behind: "${question_}"${sourceCtx}\n\nReturn ONLY valid JSON:\n{"layers":[{"title":"Surface Level","content":"...","emoji":"🔍"},{"title":"One Level Deeper","content":"...","emoji":"⚙️"},{"title":"The Root Cause","content":"...","emoji":"🧠"}],"analogy":"A simple everyday analogy","summary":"One sentence that captures the essence","goDeeper":["Follow-up question 1","Follow-up question 2","Follow-up question 3"]}` }],
        "You are a first-principles thinker like Richard Feynman. Break down WHY things work the way they do, starting from the surface and drilling to the root cause. Use 3 layers of depth. Each layer should be 2-4 sentences. Make concepts click through vivid analogies.",
        "llama-3.3-70b-versatile", 1000
      );
      const clean = raw.replace(/```json|```/g, "").trim();
      const jsonMatch = clean.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch?.[0] ?? clean);
      const exp = { question: question_, ...parsed };
      setExplanation(exp);
      setWhyHistory(prev => addHistoryEntry("whyengine", { id: Date.now().toString(), title: question_.slice(0,50), subtitle: "3 layers of depth", timestamp: new Date(), data: { question: question_, explanation: exp } }, prev));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg.includes("VITE_GROQ_API_KEY")
        ? "⚠️ No API key found. Add VITE_GROQ_API_KEY to your .env file."
        : `Error: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar isLoggedIn user={{ name: "Learner", xp: 2450, streak: 12, plan: "free" }} />
      <main className="flex-1 max-w-3xl mx-auto w-full p-6 space-y-8">
        <HistorySidebar
          entries={whyHistory}
          activeId={null}
          onSelect={(e) => { const d = e.data as { question: string; explanation: Explanation }; setExplanation(d.explanation); setQuestion(d.question); setSidebarOpen(false); }}
          onNew={() => { setExplanation(null); setQuestion(""); setSidebarOpen(false); }}
          onDelete={(id) => setWhyHistory(prev => deleteHistoryEntry("whyengine", id, prev))}
          open={sidebarOpen}
          onToggle={() => setSidebarOpen(v => !v)}
          newLabel="New Question"
        />
        <ToolHeader
          icon={<Lightbulb className="h-4 w-4 text-white" />}
          title={`The "Why" Engine`}
          subtitle="First-principles explanations from root causes"
          accentColor="bg-gradient-to-br from-amber-400 to-yellow-500"
          historyCount={whyHistory.length}
          onHistoryToggle={() => setSidebarOpen(v => !v)}
          showModelSelector={true}
        />
        <GlobalContextBar compact />

        {/* Input */}
        <div className="bg-card border border-border rounded-none p-4 space-y-3">
          {/* File attach row */}
          <div className="flex items-center gap-2">
            <FileAttachButton />
            {pendingFile && <FileBadge file={pendingFile} onRemove={() => setPendingFile(null)} />}
            {!pendingFile && <span className="text-xs text-muted-foreground">Attach notes to explain from your material</span>}
          </div>

          <div className="flex gap-2">
            <input className="flex-1 px-4 py-3 rounded-none border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder={hasSource && !input ? "Leave blank to explain from source, or type a topic..." : "Ask 'Why...' about anything — or attach notes"}
              value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') ask(); else if (e.key === "Enter") ask(); }} />
            <Button onClick={() => ask()} disabled={(!input.trim() && !hasSource) || isLoading}
              className="bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-90 px-5">
              {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-none animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>

          {/* Zero-prompt generate from source */}
          {hasSource && !input.trim() && (
            <button onClick={() => ask()} disabled={isLoading}
              className="w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-80"
              style={{ background: "rgba(212,175,90,0.1)", border: "1px solid rgba(212,175,90,0.35)", color: "var(--pz-gold, #d4af5a)" }}>
              <Sparkles className="h-4 w-4" />
              Explain from Active Source
            </button>
          )}

          {!explanation && !isLoading && !hasSource && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Try one of these:</p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_QUESTIONS.map(q => (
                  <button key={q} onClick={() => ask(q)}
                    className="text-xs px-3 py-1.5 rounded-none border border-border hover:border-amber-500 hover:text-amber-600 transition-all">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          {error && <div className="bg-red-500/10 border border-red-500/20 rounded-none p-3 text-sm text-red-600 dark:text-red-400">{error}</div>}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="bg-card border border-border rounded-none p-8 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-none bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center animate-pulse">
              <Lightbulb className="h-6 w-6 text-white" />
            </div>
            <p className="text-sm text-muted-foreground">Drilling to the root cause...</p>
          </div>
        )}

        {/* Result */}
        {explanation && !isLoading && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-none bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0">
                <HelpCircle className="h-4 w-4 text-white" />
              </div>
              <h2 className="font-bold text-lg">{explanation.question}</h2>
            </div>
            <div className="space-y-2">
              {explanation.layers.map((layer, i) => (
                <div key={i}
                  className={cn("rounded-none border overflow-hidden transition-all", activeLayer === i ? "border-amber-500/30 bg-amber-500/5" : "border-border bg-card")}>
                  <button className="w-full flex items-center gap-3 p-4 text-left" onClick={() => setActiveLayer(activeLayer === i ? -1 : i)}>
                    <span className="text-2xl">{layer.emoji}</span>
                    <div className="flex-1">
                      <span className="font-semibold text-sm">{layer.title}</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        {Array.from({ length: explanation.layers.length }).map((_, j) => (
                          <div key={j} className={cn("h-1 rounded-none flex-1", j <= i ? "bg-amber-500" : "bg-border")} />
                        ))}
                        <span className="text-xs text-muted-foreground ml-1">depth {i + 1}/{explanation.layers.length}</span>
                      </div>
                    </div>
                    <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", activeLayer === i && "rotate-90")} />
                  </button>
                  {activeLayer === i && (
                    <div className="px-5 pb-5 pt-1">
                      <MathRenderer content={layer.content} className="text-sm" />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-none p-4">
              <div className="flex items-center gap-2 mb-2">
                <Layers className="h-4 w-4 text-blue-500" />
                <span className="font-semibold text-sm text-blue-500">The Analogy</span>
              </div>
              <MathRenderer content={`"${explanation.analogy}"`} className="text-sm italic" />
            </div>
            <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-none p-4">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span className="font-semibold text-sm text-amber-600">The Essence</span>
              </div>
              <MathRenderer content={explanation.summary} className="text-sm font-medium" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" />Go deeper:</p>
              <div className="space-y-2">
                {explanation.goDeeper.map((q, i) => (
                  <button key={i} onClick={() => ask(q)}
                    className="w-full text-left text-sm px-4 py-3 rounded-none border border-border hover:border-amber-500 hover:bg-amber-500/5 transition-all flex items-center gap-2">
                    <span className="text-amber-500 font-bold">→</span>{q}
                  </button>
                ))}
              </div>
            </div>
            <Button variant="outline" onClick={() => { setExplanation(null); setQuestion(""); }} className="w-full">
              <RotateCcw className="h-4 w-4 mr-2" />Ask Another Why
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
