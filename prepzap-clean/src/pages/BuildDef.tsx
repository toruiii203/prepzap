import { BuddyCompanion } from "@/components/BuddyCompanion";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ToolPageShell } from "@/components/ToolPageShell";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, PenLine, CheckCircle2, AlertCircle, XCircle, RotateCcw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { callGroq } from "@/lib/groq";
import { buildAIContext, getActiveSource } from "@/lib/sourceContext";
import { useFileAttach, FileBadge } from "@/components/ToolShell";

const CONCEPTS = ["Mitosis","Entropy","Photosynthesis","Natural Selection","Osmosis","Opportunity Cost","Recursion","Torque","Syntax vs Semantics","Half-life"];

interface Feedback { correct: string[]; missing: string[]; wrong: string[]; authoritative: string; score: number; encouragement: string; }

export default function BuildDef() {
  const { user } = useAuth();
  const toolKey = "builddef"
  const lsKey = `pz_hist_${toolKey}`
  const { sessions: toolSessions, addSession, deleteSession } = useToolHistory(toolKey)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const handleNewSession = () => { setActiveSessionId(null) }
  const handleSelectSession = (s: ToolSession) => { setActiveSessionId(s.id) }


  const [phase, setPhase] = useState<"setup"|"writing"|"feedback">("setup");
  const [concept, setConcept] = useState("");
  const [conceptInput, setConceptInput] = useState("");
  const [userDef, setUserDef] = useState("");
  const [feedback, setFeedback] = useState<Feedback|null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const { pendingFile, setPendingFile, FileAttachButton } = useFileAttach();


  // ── QuickLaunch prefill ────────────────────────────────────────────────────
  useEffect(() => {
    const prefill = sessionStorage.getItem("quicklaunch_prompt");
    if (prefill && prefill.trim()) {
      setConceptInput(prefill);
      sessionStorage.removeItem("quicklaunch_prompt");
      sessionStorage.removeItem("quicklaunch_tool");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startConcept = (c?: string) => {
    const t = (c ?? conceptInput.trim()) || getActiveSource()?.name?.replace(/\.\w+$/, "");
    if (!t) return;
    setConcept(t); setUserDef(""); setFeedback(null); setPhase("writing");
  };

  const submit = async () => {
    if (!userDef.trim()||isLoading) return;
    setIsLoading(true); setError(null);
    const fileContext = pendingFile?.content
      ? `\n\nStudent had access to this reference material:\n${pendingFile.content.slice(0, 3000)}`
      : buildAIContext(3000, 1);
    try {
      const raw = await callGroq(
        [{role:"user",content:`The student was asked to define "${concept}" from memory. Their answer: "${userDef}"\n\nEvaluate it and return ONLY valid JSON:\n{"correct":["what they got right"],"missing":["key things missing"],"wrong":["incorrect claims"],"authoritative":"the ideal 1-2 sentence definition","score":0-100,"encouragement":"one motivating sentence"}${fileContext}`}],
        `You are a rigorous but kind educator. Compare the student's definition to the authoritative one for "${concept}". Be specific and honest. A good definition covers the core mechanism, context, and distinguishing features. Score 90+ only if nearly complete and accurate.`,
        "llama-3.3-70b-versatile", 600
      );
      const clean = raw.replace(/```json|```/g,"").trim();
      const parsed = JSON.parse(clean.match(/\{[\s\S]*\}/)?.[0]??clean);
      setFeedback(parsed); setPhase("feedback");
    } catch(e) { setError(e instanceof Error?e.message:"Error"); }
    finally { setIsLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <BuddyCompanion />
      <Navbar isLoggedIn user={{name:"Learner",xp:2450,streak:12,plan:"free"}}/>
      {/* History Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        <ToolHistorySidebar
          toolKey="builddef"
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
              <div className="w-7 h-7 rounded-none bg-gradient-to-br from-violet-500 to-zinc-600 flex items-center justify-center"><PenLine className="h-4 w-4 text-white"/></div>
              Build the Definition
            </h1>
            <p className="text-xs text-muted-foreground">Write a concept definition from memory — AI compares it to the real one</p>
          </div>
        </div>

        {phase==="setup" && (
          <div className="space-y-6 pt-4">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-violet-500 to-zinc-600 flex items-center justify-center mx-auto shadow-lg"><PenLine className="h-8 w-8 text-white"/></div>
              <h2 className="text-xl font-bold">Build the Definition</h2>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">You see a concept name. You write the definition from memory — no peeking. The AI then shows what was correct, what was missing, and what was wrong. Better than flashcards.</p>
            </div>
            <div className="bg-card border border-border rounded-none p-5 space-y-4">
              <label className="font-semibold text-sm">Pick a concept or type your own</label>
              <div className="flex gap-2">
                <input className="flex-1 px-4 py-3 rounded-none border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  placeholder="e.g. Entropy, Recursion..."
                  value={conceptInput} onChange={e=>setConceptInput(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&startConcept()}/>
                <FileAttachButton />
                <Button onClick={()=>startConcept()} disabled={!conceptInput.trim()} className="bg-gradient-to-r from-violet-500 to-zinc-600 text-white hover:opacity-90">Go</Button>
              </div>
              {pendingFile && <FileBadge file={pendingFile} onRemove={() => setPendingFile(null)} />}
              {buildAIContext().length > 0 && !conceptInput.trim() && (
                <button onClick={() => startConcept()} disabled={false}
                  className="w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-80"
                  style={{ background: "rgba(212,175,90,0.1)", border: "1px solid rgba(212,175,90,0.35)", color: "var(--pz-gold, #d4af5a)" }}>
                  ⚡ Define from Active Source: "{getActiveSource()?.name?.replace(/\.\w+$/, "") ?? "Source"}"
                </button>
              )}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Quick picks:</p>
                <div className="flex flex-wrap gap-2">
                  {CONCEPTS.map(c=><button key={c} onClick={()=>startConcept(c)} className="text-xs px-3 py-1.5 rounded-none border border-border hover:border-violet-400 hover:text-violet-500 transition-all">{c}</button>)}
                </div>
              </div>
            </div>
          </div>
        )}

        {phase==="writing" && (
          <div className="space-y-4 pt-4">
            <div className="bg-gradient-to-r from-violet-500/10 to-zinc-500/10 border border-violet-500/20 rounded-none p-6 text-center">
              <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-semibold">Define this concept from memory</p>
              <h2 className="text-4xl font-bold">{concept}</h2>
            </div>
            <Textarea
              className="min-h-[160px] resize-none text-sm"
              placeholder={`Write your definition of "${concept}" here. Include what it is, how it works, and what makes it distinct...`}
              value={userDef}
              onChange={e=>setUserDef(e.target.value)}
            />
            {error&&<p className="text-sm text-red-500 bg-red-500/10 rounded-none p-3">{error}</p>}
            <div className="flex gap-3">
              <Button variant="outline" onClick={()=>setPhase("setup")} className="gap-2"><RotateCcw className="h-4 w-4"/>Change Concept</Button>
              <Button onClick={submit} disabled={!userDef.trim()||isLoading} className="flex-1 bg-gradient-to-r from-violet-500 to-zinc-600 text-white hover:opacity-90">
                {isLoading?<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-none animate-spin"/>:<><Sparkles className="h-4 w-4 mr-2"/>Compare to Real Definition</>}
              </Button>
            </div>
          </div>
        )}

        {phase==="feedback" && feedback && (
          <div className="space-y-4">
            <div className="text-center">
              <div className={cn("text-4xl font-bold",feedback.score>=80?"text-white/60":feedback.score>=60?"text-amber-500":"text-red-500")}>{feedback.score}<span className="text-xl">%</span></div>
              <p className="text-sm text-muted-foreground mt-1">{feedback.encouragement}</p>
            </div>
            <div className="bg-violet-500/5 border border-violet-500/20 rounded-none p-4">
              <p className="text-xs font-bold text-violet-500 mb-2 uppercase tracking-wider">Authoritative Definition</p>
              <p className="text-sm leading-relaxed">{feedback.authoritative}</p>
            </div>
            <div className="grid gap-3">
              {feedback.correct.length>0&&<div className="bg-white/5 border border-emerald-500/20 rounded-none p-4"><div className="flex items-center gap-2 mb-2"><CheckCircle2 className="h-4 w-4 text-white/60"/><span className="text-xs font-bold text-white/60">You Got Right</span></div>{feedback.correct.map((s,i)=><p key={i} className="text-xs text-muted-foreground mb-1">• {s}</p>)}</div>}
              {feedback.missing.length>0&&<div className="bg-amber-500/5 border border-amber-500/20 rounded-none p-4"><div className="flex items-center gap-2 mb-2"><AlertCircle className="h-4 w-4 text-amber-500"/><span className="text-xs font-bold text-amber-500">Missing</span></div>{feedback.missing.map((s,i)=><p key={i} className="text-xs text-muted-foreground mb-1">• {s}</p>)}</div>}
              {feedback.wrong.length>0&&<div className="bg-red-500/5 border border-red-500/20 rounded-none p-4"><div className="flex items-center gap-2 mb-2"><XCircle className="h-4 w-4 text-red-500"/><span className="text-xs font-bold text-red-500">Incorrect</span></div>{feedback.wrong.map((s,i)=><p key={i} className="text-xs text-muted-foreground mb-1">• {s}</p>)}</div>}
            </div>
            <div className="flex gap-3">
              <Button onClick={()=>{setPhase("writing");setUserDef("");setFeedback(null);}} variant="outline" className="flex-1 gap-2"><RotateCcw className="h-4 w-4"/>Try Again</Button>
              <Button onClick={()=>setPhase("setup")} className="flex-1 bg-gradient-to-r from-violet-500 to-zinc-600 text-white hover:opacity-90">New Concept</Button>
            </div>
          </div>
        )}
      </main>
        </div>
      </div>
    </ToolPageShell>
  );
}