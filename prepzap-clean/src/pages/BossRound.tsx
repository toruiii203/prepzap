import { QuestionSkeleton } from "@/components/SkeletonLoader";
import { ToolHistorySidebar, useToolHistory, type ToolSession } from "@/components/ToolHistorySidebar"
import { buildAIContext } from "@/lib/sourceContext";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Award, CheckCircle2, XCircle, RotateCcw, Zap, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { callGroq } from "@/lib/groq";
import { MathRenderer } from "@/components/MathRenderer";
import { toast } from "sonner";
import { GlobalContextBar } from "@/components/GlobalContextBar";

interface Question { question: string; options: string[]; correct: number; explanation: string; topic: string; }

type Difficulty = "Easy" | "Medium" | "Hard" | "Nightmare";
const DIFFICULTIES: { label: Difficulty; color: string }[] = [
  { label: "Easy",      color: "border-emerald-500 bg-white/10 text-emerald-400" },
  { label: "Medium",    color: "border-amber-500 bg-amber-500/10 text-amber-400" },
  { label: "Hard",      color: "border-red-500 bg-red-500/10 text-red-400" },
  { label: "Nightmare", color: "border-violet-500 bg-violet-500/10 text-violet-400" },
];

export default function BossRound() {
  const toolKey = "bossround"
  const lsKey = `pz_hist_${toolKey}`
  const { sessions: toolSessions, addSession, deleteSession } = useToolHistory(toolKey)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const handleNewSession = () => { setActiveSessionId(null) }
  const handleSelectSession = (s: ToolSession) => { setActiveSessionId(s.id) }


  const [phase, setPhase] = useState<"setup"|"quiz"|"done">("setup");
  const [topicInput, setTopicInput] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("Medium");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number|null>(null);
  const [answered, setAnswered] = useState(false);
  const [results, setResults] = useState<{correct:boolean;selected:number;correct_idx:number}[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [timeLeft, setTimeLeft] = useState(300);
  const [timerRef, setTimerRef] = useState<ReturnType<typeof setInterval>|null>(null);

  const start = async () => {
    const hasSource = buildAIContext().length > 0;
    if (!topicInput.trim() && !hasSource) return;
    setIsLoading(true); setError(null);
    const nightmareExtra = difficulty === "Nightmare"
      ? " Include multi-step reasoning, tricky edge cases, and questions requiring synthesis of multiple concepts."
      : "";
    const fileContext = buildAIContext();
    const topic = topicInput.trim() || "the attached material";
    try {
      const raw = await callGroq(
        [{role:"user",content:`Generate exactly 10 ${difficulty}-difficulty multiple-choice questions about "${topic}" for a Boss Round challenge. Make them appropriately challenging for the ${difficulty} level — test application, analysis, and edge cases, not just recall.${nightmareExtra}${fileContext} Return ONLY this exact JSON format with no other text: {"questions":[{"question":"...","options":["A","B","C","D"],"correct":0,"explanation":"...","topic":"subtopic"}]}`}],
        "Return ONLY valid compact JSON with no extra whitespace. No markdown, no explanation, just the JSON object. You are a demanding exam writer creating questions that separate students who truly understand from those who just memorized.",
        "llama-3.3-70b-versatile", 3000
      );
      let clean = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      const objMatch = clean.match(/\{[\s\S]*\}/);
      const jsonStr = objMatch ? objMatch[0] : clean;
      const parsed = JSON.parse(jsonStr);
      setQuestions(parsed.questions.slice(0,10));
      setCurrent(0); setSelected(null); setAnswered(false); setResults([]); setTimeLeft(300);
      setPhase("quiz");
      toast.success(`Boss Round ready — ${difficulty} mode!`);
      const t = setInterval(()=>setTimeLeft(prev=>{if(prev<=1){clearInterval(t);return 0;}return prev-1;}),1000);
      setTimerRef(t);
    } catch(e) { setError(e instanceof Error?e.message:"Error"); }
    finally { setIsLoading(false); }
  };

  const choose = (i: number) => {
    if (answered) return;
    setSelected(i); setAnswered(true);
  };

  const next = () => {
    const newResults = [...results, {correct:selected===questions[current].correct, selected:selected??-1, correct_idx:questions[current].correct}];
    setResults(newResults);
    if (current+1 >= questions.length) {
      if(timerRef) clearInterval(timerRef);
      setPhase("done");
    } else {
      setCurrent(c=>c+1); setSelected(null); setAnswered(false);
    }
  };

  const score = results.filter(r=>r.correct).length;
  const xpEarned = Math.round((score/10)*500);
  const diffMult = difficulty === "Nightmare" ? 2 : difficulty === "Hard" ? 1.5 : difficulty === "Easy" ? 0.75 : 1;
  const finalXP = Math.round(xpEarned * diffMult);
  const mm = String(Math.floor(timeLeft/60)).padStart(2,"0");
  const ss = String(timeLeft%60).padStart(2,"0");
  const q = questions[current];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar isLoggedIn user={{name:"Learner",xp:2450,streak:12,plan:"free"}}/>
      {/* History Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        <ToolHistorySidebar
          toolKey="bossround"
          onNew={handleNewSession}
          onSelect={handleSelectSession}
          activeId={activeSessionId}
        />
        <div className="flex-1 overflow-auto">
      <main className="flex-1 max-w-2xl mx-auto w-full p-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/dashboard"><Button variant="ghost" size="sm" className="gap-1"><ChevronLeft className="h-4 w-4"/>Dashboard</Button></Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <div className="w-7 h-7 rounded-none bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center"><Award className="h-4 w-4 text-white"/></div>
              Boss Round
            </h1>
            <p className="text-xs text-muted-foreground">10 hard questions · 5 minute limit · earn up to 500 XP</p>
          </div>
        </div>

        {phase==="setup" && (
          <div className="space-y-6 pt-4">
            <div className="text-center space-y-3">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
                <Award className="h-10 w-10 text-white"/>
              </div>
              <h2 className="text-2xl font-bold">Boss Round</h2>
              <p className="text-muted-foreground max-w-md mx-auto">The ultimate end-of-session challenge. 10 hard questions. 5 minutes. Your score determines XP earned. Are you ready?</p>
              <div className="flex justify-center gap-6 text-sm text-muted-foreground">
                {[{v:"10",l:"Questions"},{v:"5m",l:"Time limit"},{v:"500",l:"Max XP"}].map(s=>(
                  <div key={s.l} className="text-center"><div className="text-2xl font-bold text-amber-500">{s.v}</div><div>{s.l}</div></div>
                ))}
              </div>
            </div>
            <div className="bg-card border border-border rounded-none p-5 space-y-4">
              <div>
                <label className="font-semibold text-sm block mb-2">What topic do you want to be tested on?</label>
                <div className="flex gap-2">
                  <input
                    value={topicInput}
                    onChange={e => setTopicInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !isLoading && start()}
                    placeholder="e.g. Cell Biology, World War 2, Calculus, Python..."
                    className="flex-1 px-4 py-3 rounded-none border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 placeholder:text-muted-foreground"
                  />
                </div>
              </div>
              <div>
                <label className="font-semibold text-sm block mb-2">Difficulty</label>
                <div className="flex gap-2 flex-wrap">
                  {DIFFICULTIES.map(d => (
                    <button key={d.label} onClick={() => setDifficulty(d.label)}
                      className={cn("px-4 py-1.5 rounded-none text-xs border font-semibold transition-all",
                        difficulty === d.label ? d.color : "border-border text-muted-foreground hover:border-amber-400")}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
              {error&&<p className="text-sm text-red-500 bg-red-500/10 rounded-none p-3">{error}</p>}
              {isLoading && (
                <div className="space-y-2">
                  {[...Array(4)].map((_,i) => <div key={i} className="h-10 rounded-none bg-muted animate-pulse" />)}
                </div>
              )}
              {buildAIContext().length > 0 && !topicInput.trim() && (
                <button onClick={start} disabled={isLoading}
                  className="w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-80 mb-2"
                  style={{ background: "rgba(212,175,90,0.1)", border: "1px solid rgba(212,175,90,0.35)", color: "var(--pz-gold, #d4af5a)" }}>
                  <span>⚡</span> Start Boss Round from Active Source
                </button>
              )}
              <Button onClick={start} disabled={isLoading || (!topicInput.trim() && buildAIContext().length === 0)} className="w-full h-12 bg-gradient-to-r from-yellow-500 to-amber-500 text-white hover:opacity-90 text-base font-bold disabled:opacity-50">
                {isLoading?<div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-none animate-spin"/>:<><Zap className="h-5 w-5 mr-2"/>Start Boss Round</>}
              </Button>
            </div>
          </div>
        )}

        {phase==="quiz" && q && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="font-mono">{current+1} / {questions.length}</Badge>
              <div className={cn("flex items-center gap-1 font-mono text-sm font-bold",timeLeft<=60?"text-red-500 animate-pulse":"text-muted-foreground")}>
                ⏱ {mm}:{ss}
              </div>
              <Badge className="bg-amber-500/20 text-amber-600 border-0 text-xs">+{Math.round((1/questions.length)*500)} XP</Badge>
            </div>
            <div className="h-1.5 rounded-none bg-muted overflow-hidden">
              <div className="h-full bg-gradient-to-r from-yellow-500 to-amber-500 transition-all" style={{width:`${(current/questions.length)*100}%`}}/>
            </div>
            <div className="bg-card border border-border rounded-none p-6">
              <Badge variant="outline" className="text-[10px] mb-3">{q.topic}</Badge>
              <MathRenderer content={q.question} className="text-base font-medium mb-5"/>
              <div className="space-y-2">
                {q.options.map((opt,i)=>(
                  <button key={i} onClick={()=>choose(i)} disabled={answered}
                    className={cn("w-full text-left px-4 py-3 rounded-none border text-sm transition-all",
                      !answered&&"hover:border-amber-400 hover:bg-amber-500/5",
                      answered&&i===q.correct&&"border-emerald-500 bg-white/10 font-medium",
                      answered&&selected===i&&i!==q.correct&&"border-red-500 bg-red-500/10",
                      (!answered||(answered&&i!==q.correct&&i!==selected))&&"border-border")}>
                    <span className="font-mono text-xs mr-2 opacity-60">{String.fromCharCode(65+i)}.</span>{opt}
                  </button>
                ))}
              </div>
            </div>
            {answered&&(
              <div className="bg-card border border-border rounded-none p-4 space-y-2">
                <div className="flex items-center gap-2">
                  {selected===q.correct?<CheckCircle2 className="h-4 w-4 text-white/60"/>:<XCircle className="h-4 w-4 text-red-500"/>}
                  <span className="font-semibold text-sm">{selected===q.correct?"Correct! +"+Math.round(500/questions.length)+" XP":"Wrong"}</span>
                </div>
                <MathRenderer content={q.explanation} className="text-xs text-muted-foreground"/>
                <Button onClick={next} className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 text-white hover:opacity-90">
                  {current+1<questions.length?"Next →":"See Final Score →"}
                </Button>
              </div>
            )}
          </div>
        )}

        {phase==="done" && (
          <div className="text-center space-y-6 pt-8">
            <Trophy className={cn("h-16 w-16 mx-auto",score>=8?"text-amber-500":score>=6?"text-teal-500":"text-muted-foreground")}/>
            <div>
              <h2 className="text-3xl font-bold">{score}/10</h2>
              <p className="text-muted-foreground">{score>=9?"Legendary! 🏆":score>=7?"Strong work! 💪":score>=5?"Keep grinding! 📚":"Tougher than expected — review and retry"}</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[{l:"Score",v:`${score}/10`,c:"text-amber-500"},{l:"XP Earned",v:`+${finalXP}`,c:"text-teal-500"},{l:"Accuracy",v:`${Math.round(score/10*100)}%`,c:"text-violet-500"}].map(s=>(
                <div key={s.l} className="bg-card border border-border rounded-none p-3 text-center">
                  <div className={cn("text-2xl font-bold",s.c)}>{s.v}</div>
                  <div className="text-xs text-muted-foreground">{s.l}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 justify-center">
              <Button onClick={()=>{setPhase("setup");setTopicInput("");}} variant="outline" className="gap-2"><RotateCcw className="h-4 w-4"/>Retry</Button>
              <Link to="/dashboard"><Button className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white hover:opacity-90 gap-2"><Zap className="h-4 w-4"/>Back to Dashboard</Button></Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
