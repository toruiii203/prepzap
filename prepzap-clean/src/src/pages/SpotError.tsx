import { TextSkeleton } from "@/components/SkeletonLoader";
import { ToolHistorySidebar, useToolHistory, type ToolSession } from "@/components/ToolHistorySidebar"
import { buildAIContext } from "@/lib/sourceContext";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Target, CheckCircle2, XCircle, RotateCcw, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { callGroq } from "@/lib/groq";
import { MathRenderer } from "@/components/MathRenderer";
import { GlobalContextBar } from "@/components/GlobalContextBar";

export default function SpotError() {
  const toolKey = "spoterror"
  const lsKey = `pz_hist_${toolKey}`
  const { sessions: toolSessions, addSession, deleteSession } = useToolHistory(toolKey)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const handleNewSession = () => { setActiveSessionId(null) }
  const handleSelectSession = (s: ToolSession) => { setActiveSessionId(s.id) }


  const [phase, setPhase] = useState<"setup"|"hunt"|"revealed">("setup");
  const [topicInput, setTopicInput] = useState("");
  const [difficulty, setDifficulty] = useState<"easy"|"medium"|"hard">("medium");
  const [passage, setPassage] = useState("");
  const [errors, setErrors] = useState<{text:string;correction:string;explanation:string}[]>([]);
  const [found, setFound] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [scores, setScores] = useState<{correct:number;total:number;played:number}>(() => {
    try { return JSON.parse(localStorage.getItem("pz_spoterror_scores") || '{"correct":0,"total":0,"played":0}'); } catch { return {correct:0,total:0,played:0}; }
  });
  const [timeLeft, setTimeLeft] = useState(90);
  const [timerRef, setTimerRef] = useState<ReturnType<typeof setInterval>|null>(null);
  const [selectedText, setSelectedText] = useState("");

  const start = async () => {
    if (!topicInput.trim() && buildAIContext().length === 0) return;
    setIsLoading(true); setError(null);
    const difficultyNote = difficulty === "easy" ? "Make errors obvious — wrong numbers or clearly swapped terms." : difficulty === "hard" ? "Make errors extremely subtle — plausible-sounding but factually wrong details that require deep knowledge to catch." : "Make errors moderately subtle — not obvious but detectable with good knowledge.";
    const timeLimit = difficulty === "easy" ? 120 : difficulty === "hard" ? 60 : 90;
    try {
      const topic = topicInput.trim() || "the source material";
      const sourceCtx = buildAIContext();
      let prompt: string;
      if (sourceCtx) {
        prompt = `${sourceCtx}\n\nUsing the source material above, write a short passage (4-6 sentences) about "${topic}" but introduce exactly 3 deliberate factual or logical errors. Difficulty: ${difficulty}. ${difficultyNote} Return ONLY valid JSON:\n{"passage":"...","errors":[{"text":"the exact wrong phrase","correction":"what it should be","explanation":"why it's wrong"}]}`;
      } else {
        prompt = `Create a short ${topic} passage (4-6 sentences) with exactly 3 deliberate factual or logical errors. Difficulty: ${difficulty}. ${difficultyNote} Return ONLY valid JSON:\n{"passage":"...","errors":[{"text":"the exact wrong phrase","correction":"what it should be","explanation":"why it's wrong"}]}`;
      }
      const raw = await callGroq(
        [{role:"user",content:prompt}],
        "You are a tricky educator. Write a convincing passage that sounds authoritative but has subtle errors.",
        "llama-3.3-70b-versatile", 800
      );
      const clean = raw.replace(/```json|```/g,"").trim();
      const parsed = JSON.parse(clean.match(/\{[\s\S]*\}/)?.[0]??clean);
      setPassage(parsed.passage); setErrors(parsed.errors);
      setFound([]); setTimeLeft(timeLimit);
      setPhase("hunt");
      const t = setInterval(()=>setTimeLeft(prev=>{if(prev<=1){clearInterval(t);setPhase("revealed");return 0;}return prev-1;}),1000);
      setTimerRef(t);
    } catch(e) { setError(e instanceof Error?e.message:"Error"); }
    finally { setIsLoading(false); }
  };

  const saveScore = (foundCount: number) => {
    const newScores = { correct: scores.correct + foundCount, total: scores.total + errors.length, played: scores.played + 1 };
    setScores(newScores);
    try { localStorage.setItem("pz_spoterror_scores", JSON.stringify(newScores)); } catch {}
  };

  const markFound = () => {
    const sel = window.getSelection()?.toString().trim();
    if (!sel || found.includes(sel)) return;
    const isReal = errors.some(e=>passage.includes(e.text)&&sel.includes(e.text.split(" ")[0]));
    if (isReal) {
      const newFound = [...found, sel];
      setFound(newFound);
      if (newFound.length >= errors.length) { if(timerRef)clearInterval(timerRef); setPhase("revealed"); }
    }
  };

  const reveal = () => { if(timerRef)clearInterval(timerRef); saveScore(found.length); setPhase("revealed"); };

  const mm = String(Math.floor(timeLeft/60)).padStart(2,"0");
  const ss = String(timeLeft%60).padStart(2,"0");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar isLoggedIn user={{name:"Learner",xp:2450,streak:12,plan:"free"}}/>
      {/* History Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        <ToolHistorySidebar
          toolKey="spoterror"
          onNew={handleNewSession}
          onSelect={handleSelectSession}
          activeId={activeSessionId}
        />
        <div className="flex-1 overflow-auto">
      <main className="flex-1 w-full p-4 py-6 md:max-w-2xl md:mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/dashboard"><Button variant="ghost" size="sm" className="gap-1"><ChevronLeft className="h-4 w-4"/>Dashboard</Button></Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <div className="w-7 h-7 rounded-none bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center"><Target className="h-4 w-4 text-white"/></div>
              Spot the Error
            </h1>
            <p className="text-xs text-muted-foreground">Find all 3 deliberate mistakes before time runs out</p>
          </div>
        </div>

        {phase==="setup" && (
          <div className="space-y-6 pt-4">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center mx-auto shadow-lg"><Target className="h-8 w-8 text-white"/></div>
              <h2 className="text-xl font-bold">Spot the Error</h2>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">AI writes a passage with 3 hidden mistakes. Find them before the timer runs out.</p>
            </div>

            {/* Score tracker */}
            {scores.played > 0 && (
              <div className="flex gap-3">
                {[
                  { label: "Played", val: scores.played, color: "var(--pz-gold)" },
                  { label: "Found", val: `${scores.correct}/${scores.total}`, color: "var(--pz-teal)" },
                  { label: "Rate", val: `${Math.round((scores.correct/scores.total)*100)||0}%`, color: "var(--pz-text)" },
                ].map(s => (
                  <div key={s.label} className="flex-1 p-3 text-center" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)" }}>
                    <p className="text-base font-bold" style={{ color: s.color, fontFamily: "monospace" }}>{s.val}</p>
                    <p className="text-[10px] uppercase tracking-widest mt-0.5" style={{ color: "var(--pz-text-muted)" }}>{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-card border border-border rounded-none p-5 space-y-4">
              {/* Difficulty selector */}
              <div>
                <label className="text-sm font-semibold block mb-2">Difficulty</label>
                <div className="flex gap-2">
                  {(["easy","medium","hard"] as const).map(d => (
                    <button key={d} onClick={() => setDifficulty(d)}
                      className="flex-1 py-2 text-xs font-semibold capitalize"
                      style={{ border: `1px solid ${difficulty === d ? (d === "easy" ? "var(--pz-teal)" : d === "hard" ? "var(--pz-rose)" : "var(--pz-gold)") : "var(--pz-border)"}`, background: difficulty === d ? "var(--pz-surface3)" : "transparent", color: difficulty === d ? (d === "easy" ? "var(--pz-teal)" : d === "hard" ? "var(--pz-rose)" : "var(--pz-gold)") : "var(--pz-text-muted)" }}>
                      {d === "easy" ? "Easy 2min" : d === "hard" ? "Hard 1min" : "Medium 90s"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold block mb-2">Topic or paste your own text</label>
                <div className="flex gap-2">
                  <textarea
                    value={topicInput}
                    onChange={e => setTopicInput(e.target.value)}
                    placeholder="e.g. 'Cell Biology', 'World War 2', or paste a paragraph..."
                    className="flex-1 px-4 py-3 rounded-none border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none min-h-[80px]"
                  />
                </div>
              </div>
              {buildAIContext().length > 0 && !topicInput.trim() && (
                <button onClick={start} disabled={isLoading}
                  className="w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-80"
                  style={{ background: "rgba(212,175,90,0.1)", border: "1px solid rgba(212,175,90,0.35)", color: "var(--pz-gold, #d4af5a)" }}>
                  ⚡ Generate Error Passage from Active Source
                </button>
              )}
              {error&&<p className="text-sm text-red-500 bg-red-500/10 rounded-none p-3">{error}</p>}
              <Button onClick={start} disabled={isLoading || (!topicInput.trim() && buildAIContext().length === 0)} className="w-full bg-gradient-to-r from-red-500 to-orange-500 text-white hover:opacity-90">
                {isLoading?<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-none animate-spin"/>:<><Target className="h-4 w-4 mr-2"/>Generate Passage</>}
              </Button>
            </div>
          </div>
        )}

        {phase==="hunt" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="secondary">{found.length} / {errors.length} found</Badge>
              <div className={cn("flex items-center gap-1 font-mono text-sm font-bold",timeLeft<=20?"text-red-500":"text-muted-foreground")}>
                <Timer className="h-4 w-4"/>{mm}:{ss}
              </div>
              <Button size="sm" variant="outline" onClick={reveal}>Reveal All</Button>
            </div>
            <div className="bg-card border border-border rounded-none p-5">
              <p className="text-xs text-muted-foreground mb-3 font-medium">Select the error text with your cursor, then click "Mark as Error"</p>
              <div className="text-sm leading-loose select-text cursor-text" onMouseUp={()=>setSelectedText(window.getSelection()?.toString()||"")}>
                <MathRenderer content={passage}/>
              </div>
            </div>
            {selectedText && (
              <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-none text-sm">
                <span className="flex-1 truncate text-amber-700 dark:text-amber-400">"{selectedText}"</span>
                <Button size="sm" onClick={markFound} className="bg-amber-500 text-white hover:bg-amber-600">Mark as Error</Button>
                <Button size="sm" variant="ghost" onClick={()=>setSelectedText("")}>✕</Button>
              </div>
            )}
            {found.length>0&&<p className="text-xs text-white/60 font-medium">✅ Found {found.length} error{found.length>1?"s":""}. Keep looking!</p>}
          </div>
        )}

        {phase==="revealed" && (
          <div className="space-y-4">
            <div className="text-center">
              <div className={cn("text-3xl font-bold mb-1",found.length===errors.length?"text-white/60":found.length>=2?"text-amber-500":"text-red-500")}>
                {found.length}/{errors.length} Found
              </div>
              <p className="text-muted-foreground text-sm">{found.length===errors.length?"Perfect! You caught every error 🎉":"Here's what you missed:"}</p>
            </div>
            <div className="space-y-3">
              {errors.map((e,i)=>(
                <div key={i} className="bg-card border border-border rounded-none p-4 space-y-2">
                  <div className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0"/>
                    <div>
                      <p className="text-sm font-medium text-red-500 line-through">{e.text}</p>
                      <div className="flex items-center gap-1 mt-1"><CheckCircle2 className="h-3.5 w-3.5 text-white/60"/><p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">{e.correction}</p></div>
                      <p className="text-xs text-muted-foreground mt-1">{e.explanation}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <Button onClick={()=>setPhase("setup")} variant="outline" className="flex-1 gap-2"><RotateCcw className="h-4 w-4"/>New Passage</Button>
              <Link to="/dashboard" className="flex-1"><Button className="w-full bg-gradient-to-r from-red-500 to-orange-500 text-white hover:opacity-90">Dashboard</Button></Link>
            </div>
          </div>
        )}
     </main>
        </div>
      </div>
    </div>
  );
}