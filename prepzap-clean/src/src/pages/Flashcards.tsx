import { FlashcardSkeleton } from "@/components/SkeletonLoader";
import { buildAIContext, loadLibrary, getActiveSource } from "@/lib/sourceContext";
import { GlobalContextBar } from "@/components/GlobalContextBar";
import { useState } from "react";
import {
  Sparkles, RotateCcw, ChevronRight, ChevronLeft,
  Check, X, Brain, Zap, BookOpen, Shuffle, Trophy, Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { callGroq } from "@/lib/groq";
import { toast } from "sonner";
import {
  ToolHeader, HistorySidebar,
  type HistoryEntry
} from "@/components/ToolShell";
import { loadHistory, addHistoryEntry, deleteHistoryEntry } from "@/lib/historyStore";
import { ToolPageShell, useModel } from "@/components/ToolPageShell";
import { useToolHistory, ToolHistoryPanel, HistoryButton } from "@/components/ToolHistory";

interface Flashcard {
  id: string;
  front: string;
  back: string;
  difficulty: "easy" | "medium" | "hard";
  lastResult?: "know" | "unsure" | "forgot";
}

const SAMPLE_TOPICS = [
  { name: "Cell Biology", emoji: "🧬", color: "from-zinc-500 to-teal-500" },
  { name: "Classical Mechanics", emoji: <><svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="#E8B923" strokeWidth={1.8} strokeLinecap="round" style={{flexShrink:0}}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></>, color: "from-blue-500 to-indigo-500" },
  { name: "Microeconomics", emoji: "📈", color: "from-amber-500 to-orange-500" },
];

const TOOL_KEY = "flashcards";

export default function Flashcards() {

  const [phase, setPhase] = useState<"home" | "study" | "results">("home");
  const [topic, setTopic] = useState("");

  const { entries: historyEntries, save: saveHistory, remove: removeHistory, clear: clearHistory } = useToolHistory("flashcards");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const [topicInput, setTopicInput] = useState("");
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState({ know: 0, unsure: 0, forgot: 0 });
  const [numCards, setNumCards] = useState(8);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cardHistory, setCardHistory] = useState<HistoryEntry[]>(() => loadHistory(TOOL_KEY));

  const hasSource = buildAIContext().length > 0;

  const generateCards = async () => {
    if (!topicInput.trim() && !hasSource) return;
    setIsLoading(true);
    setError(null);
    const fileContext = buildAIContext();
    const cardTopic = topicInput.trim() || getActiveSource()?.name?.replace(/\.\w+$/, "") || "Active Source";
    try {
      const raw = await callGroq(
        [{ role: "user", content: `Generate exactly ${numCards} flashcards about "${cardTopic}".${fileContext} Return ONLY a raw JSON object with no markdown, no code fences, no preamble. Format: {"cards":[{"front":"question","back":"answer","difficulty":"easy|medium|hard"}]}` }],
        `You are a flashcard generator. Return ONLY a raw JSON object with no markdown, no code fences, no preamble. Format: {"cards":[{"front":"question","back":"answer","difficulty":"easy|medium|hard"}]}`,
        "llama-3.3-70b-versatile", 1200
      );
      let clean = raw;
      clean = clean.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      const objMatch = clean.match(/\{[\s\S]*\}/);
      const arrMatch = clean.match(/\[[\s\S]*\]/);
      const jsonStr = objMatch ? objMatch[0] : (arrMatch ? arrMatch[0] : clean);
      const parsed = JSON.parse(jsonStr);
      const generated: Flashcard[] = parsed.cards.map((c: { front: string; back: string; difficulty: string }, i: number) => ({
        id: `card-${i}`, front: c.front, back: c.back,
        difficulty: c.difficulty as Flashcard["difficulty"],
      }));
      setCards(generated);
      setTopic(cardTopic);
      setCurrentIndex(0);
      setFlipped(false);
      setResults({ know: 0, unsure: 0, forgot: 0 });

      // Fixed: persist history to localStorage
      const entry: HistoryEntry = {
        id: Date.now().toString(), title: cardTopic,
        subtitle: `${generated.length} cards`, timestamp: new Date(),
        data: { cards: generated, topic: cardTopic }
      };
      setCardHistory(prev => addHistoryEntry(TOOL_KEY, entry, prev));
      setPhase("study");
      toast.success(`${generated.length} flashcards ready!`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg.includes("VITE_GROQ_API_KEY")
        ? "⚠️ No API key found. Add VITE_GROQ_API_KEY to your .env file."
        : `Error: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResult = (result: "know" | "unsure" | "forgot") => {
    const updated = [...cards];
    updated[currentIndex] = { ...updated[currentIndex], lastResult: result };
    setCards(updated);
    setResults(prev => ({ ...prev, [result]: prev[result] + 1 }));
    if (currentIndex < cards.length - 1) { setCurrentIndex(i => i + 1); setFlipped(false); }
    else setPhase("results");
  };

  const card = cards[currentIndex];
  const progress = cards.length > 0 ? (currentIndex / cards.length) * 100 : 0;

  const { model, setModel } = useModel();
  if (phase === "home") return (
    <ToolPageShell showModelPicker model={model} setModel={setModel}>
      <div className="container mx-auto px-4 pt-4 max-w-4xl"><GlobalContextBar compact /></div>
      <main className="flex-1 max-w-3xl mx-auto w-full p-6 space-y-8">
        <HistorySidebar
          entries={cardHistory}
          activeId={null}
          onSelect={(e) => {
            const d = e.data as { cards: typeof cards; topic: string };
            setCards(d.cards); setTopic(d.topic); setPhase("study"); setSidebarOpen(false);
          }}
          onNew={() => { setPhase("home"); setSidebarOpen(false); }}
          onDelete={(id) => setCardHistory(prev => deleteHistoryEntry(TOOL_KEY, id, prev))}
          open={sidebarOpen}
          onToggle={() => setSidebarOpen(v => !v)}
          newLabel="New Deck"
        />

        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="w-9 h-9 rounded-none bg-gradient-to-br from-violet-500 to-zinc-600 flex items-center justify-center shadow-lg shadow-violet-500/20 flex-shrink-0">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Flashcards</h1>
            <p className="text-xs text-muted-foreground">AI-generated spaced repetition for any topic</p>
          </div>
          <button onClick={() => setSidebarOpen(v => !v)}
            className="relative flex items-center justify-center w-8 h-8 rounded-none border border-border bg-card hover:border-primary/50 transition-colors text-muted-foreground hover:text-primary">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
            {cardHistory.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-none bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">{cardHistory.length > 9 ? "9+" : cardHistory.length}</span>}
          </button>
          </div>

        <div className="bg-card border border-border rounded-none p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-violet-500" />
            <span className="font-semibold">Generate a Deck</span>
          </div>

          <input className="w-full px-4 py-3 rounded-none border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder={hasSource && !topicInput ? "Leave blank to generate from active source, or type a topic..." : "e.g. Mitosis and Meiosis, Newton's Laws, Cold War..."}
            value={topicInput} onChange={e => setTopicInput(e.target.value)} onKeyDown={e => e.key === "Enter" && generateCards()} />

          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-muted-foreground">Cards:</span>
            {[5, 8, 12, 15].map(n => (
              <button key={n} onClick={() => setNumCards(n)}
                className={cn("px-3 py-1 rounded-none text-sm font-medium border transition-all",
                  numCards === n ? "bg-violet-500 text-white border-violet-500" : "border-border hover:border-violet-500")}>
                {n}
              </button>
            ))}
            <Button onClick={generateCards} disabled={(!topicInput.trim() && !hasSource) || isLoading}
              className="ml-auto bg-gradient-to-r from-violet-500 to-zinc-600 text-white hover:opacity-90">
              {isLoading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-none animate-spin mr-2" />Generating...</> : <><Sparkles className="h-4 w-4 mr-2" />Generate</>}
            </Button>
          </div>

          {hasSource && !topicInput.trim() && (
            <button onClick={generateCards} disabled={isLoading}
              className="w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-80"
              style={{ background: "rgba(0,196,180,0.08)", border: "1px solid rgba(0,196,180,0.25)", color: "#00C4B4" }}>
              <Sparkles className="h-4 w-4" />
              Generate from Active Source
            </button>
          )}

          {isLoading && (
            <div className="space-y-2 mt-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 rounded-none bg-muted animate-pulse" style={{ opacity: 1 - i * 0.15 }} />
              ))}
            </div>
          )}
          {error && <div className="bg-red-500/10 border border-red-500/20 rounded-none p-3 text-sm text-red-600 dark:text-red-400">{error}</div>}
        </div>

        <div>
          <p className="text-sm font-medium text-muted-foreground mb-3">Try a sample topic:</p>
          <div className="grid grid-cols-3 gap-3">
            {SAMPLE_TOPICS.map(deck => (
              <button key={deck.name} onClick={() => setTopicInput(deck.name)}
                className={cn("text-left p-4 rounded-none border border-border bg-card hover:border-violet-500 hover:bg-violet-500/5 transition-all", topicInput === deck.name && "border-violet-500 bg-violet-500/5")}>
                <div className={cn("w-10 h-10 rounded-none bg-gradient-to-br flex items-center justify-center mb-3 text-xl", deck.color)}>{deck.emoji}</div>
                <p className="font-semibold text-sm">{deck.name}</p>
              </button>
            ))}
          </div>
        </div>
      </main>
      {showSourcePicker && (
        <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(4px)"}} onClick={()=>setShowSourcePicker(false)}/>
          <div style={{position:"relative",width:"100%",maxWidth:380,background:"#0E0E0E",border:"0.5px solid #252525",padding:18,zIndex:10,fontFamily:"'Inter',system-ui,sans-serif"}}>
            <div style={{fontSize:12,fontWeight:700,marginBottom:12,color:"#F0F0F0"}}>Pick a source to generate from</div>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              {loadLibrary().map((s:any)=>(
                <button key={s.id} onClick={()=>{setTopicInput(s.name.replace(/\.\w+$/, "")); setShowSourcePicker(false); setTimeout(()=>generateCards(), 0);}}
                  style={{width:"100%",padding:"9px 12px",background:"rgba(0,196,180,0.04)",border:"0.5px solid #252525",color:"#C0C0C0",fontSize:11,cursor:"pointer",fontFamily:"inherit",textAlign:"left",transition:"all .15s"}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor="#00C4B4";e.currentTarget.style.color="#00C4B4"}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor="#252525";e.currentTarget.style.color="#C0C0C0"}}>
                  {s.name}
                </button>
              ))}
            </div>
            <button onClick={()=>setShowSourcePicker(false)} style={{marginTop:10,width:"100%",padding:"7px 0",background:"transparent",border:"0.5px solid #252525",color:"#555",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
          </div>
        </div>
      )}
    </ToolPageShell>
  );

  if (phase === "study" && card) return (
    <ToolPageShell showModelPicker model={model} setModel={setModel}>
      <div className="container mx-auto px-4 pt-4 max-w-4xl"><GlobalContextBar compact /></div>
      <main className="flex-1 flex flex-col max-w-2xl mx-auto w-full p-4 gap-4">
        <div className="flex items-center justify-between pt-2">
          <div><h2 className="font-bold">{topic}</h2><p className="text-xs text-muted-foreground">{currentIndex + 1} / {cards.length}</p></div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setCards([...cards].sort(() => Math.random() - 0.5)); setCurrentIndex(0); setFlipped(false); }}><Shuffle className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" onClick={() => setPhase("home")}><X className="h-4 w-4" /></Button>
          </div>
        </div>
        <Progress value={progress} className="h-1.5" />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-lg" style={{ perspective: "1000px" }}>
            <div onClick={() => setFlipped(!flipped)} className="relative w-full cursor-pointer select-none"
              style={{ transformStyle: "preserve-3d", transition: "transform 0.5s", transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)", minHeight: 280 }}>
              <div className="absolute inset-0 bg-card border-2 border-border rounded-3xl p-8 flex flex-col items-center justify-center text-center" style={{ backfaceVisibility: "hidden" }}>
                <Badge variant="secondary" className={cn("mb-4 text-xs", card.difficulty === "easy" ? "bg-white/10 text-emerald-600" : card.difficulty === "medium" ? "bg-amber-500/10 text-amber-600" : "bg-red-500/10 text-red-600")}>{card.difficulty}</Badge>
                <p className="text-xl font-semibold leading-relaxed">{card.front}</p>
                <p className="text-xs text-muted-foreground mt-6">Tap to reveal</p>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-zinc-600/10 border-2 border-violet-500/30 rounded-3xl p-8 flex flex-col items-center justify-center text-center" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
                <Brain className="h-6 w-6 text-violet-500 mb-4" />
                <p className="text-lg leading-relaxed">{card.back}</p>
              </div>
            </div>
          </div>
        </div>
        {flipped ? (
          <div className="space-y-3">
            <p className="text-center text-sm text-muted-foreground font-medium">How well did you know this?</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { result: "forgot" as const, icon: X, label: "Forgot", color: "text-red-500", border: "border-red-500/30", bg: "bg-red-500/5 hover:bg-red-500/10" },
                { result: "unsure" as const, icon: RotateCcw, label: "Unsure", color: "text-amber-500", border: "border-amber-500/30", bg: "bg-amber-500/5 hover:bg-amber-500/10" },
                { result: "know" as const, icon: Check, label: "Got it!", color: "text-white/60", border: "border-emerald-500/30", bg: "bg-white/5 hover:bg-white/10" },
              ].map(({ result, icon: Icon, label, color, border, bg }) => (
                <button key={result} onClick={() => handleResult(result)}
                  className={cn("flex flex-col items-center gap-2 p-4 rounded-none border-2 transition-all", border, bg)}>
                  <Icon className={cn("h-6 w-6", color)} />
                  <span className={cn("text-sm font-semibold", color)}>{label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex gap-3">
            <Button variant="outline" disabled={currentIndex === 0} onClick={() => { setCurrentIndex(i => i - 1); setFlipped(false); }}><ChevronLeft className="h-4 w-4" /></Button>
            <Button className="flex-1 bg-gradient-to-r from-violet-500 to-zinc-600 text-white" onClick={() => setFlipped(true)}>Reveal Answer <ChevronRight className="h-4 w-4 ml-1" /></Button>
          </div>
        )}
      </main>
    </ToolPageShell>
  );

  if (phase === "results") {
    const pct = Math.round((results.know / cards.length) * 100);
    return (
      <ToolPageShell showModelPicker model={model} setModel={setModel}>
        <main className="flex-1 max-w-lg mx-auto w-full p-6 space-y-6 flex flex-col justify-center">
          <div className="text-center">
            <Trophy className={cn("h-16 w-16 mx-auto mb-4", pct >= 80 ? "text-amber-500" : "text-muted-foreground")} />
            <h2 className="text-3xl font-bold">{pct}% Mastered</h2>
            <p className="text-muted-foreground mt-1">{topic}</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Got it!", value: results.know, color: "text-white/60", bg: "bg-white/10" },
              { label: "Unsure", value: results.unsure, color: "text-amber-500", bg: "bg-amber-500/10" },
              { label: "Forgot", value: results.forgot, color: "text-red-500", bg: "bg-red-500/10" },
            ].map(s => (
              <div key={s.label} className={cn("rounded-none p-4 text-center", s.bg)}>
                <div className={cn("text-2xl font-bold", s.color)}>{s.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => { setCurrentIndex(0); setFlipped(false); setResults({ know: 0, unsure: 0, forgot: 0 }); setPhase("study"); }}>
              <RotateCcw className="h-4 w-4 mr-2" />Review Again
            </Button>
            <Button className="flex-1 bg-gradient-to-r from-violet-500 to-zinc-600 text-white" onClick={() => setPhase("home")}>
              <BookOpen className="h-4 w-4 mr-2" />New Deck
            </Button>
          </div>
        </main>
      </ToolPageShell>
    );
  }
  return null;
}
