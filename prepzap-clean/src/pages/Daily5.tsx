import { QuestionSkeleton } from "@/components/SkeletonLoader";
import { ToolHistorySidebar, useToolHistory, type ToolSession } from "@/components/ToolHistorySidebar"
import { buildAIContext, getActiveSource } from "@/lib/sourceContext";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Zap, CheckCircle2, XCircle, Trophy, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { callGroq } from "@/lib/groq";
import { MathRenderer } from "@/components/MathRenderer";
import { GlobalContextBar } from "@/components/GlobalContextBar";

interface Question { question: string; options: string[]; correct: number; explanation: string; topic: string; }

const WEAK_AREAS = ["Organic Chemistry", "Calculus", "Cell Biology", "Thermodynamics", "Electromagnetic Induction"];

export default function Daily5() {
  const toolKey = "daily5"
  const lsKey = `pz_hist_${toolKey}`
  const { sessions: toolSessions, addSession, deleteSession } = useToolHistory(toolKey)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const handleNewSession = () => { setActiveSessionId(null) }
  const handleSelectSession = (s: ToolSession) => { setActiveSessionId(s.id) }


  const [phase, setPhase] = useState<"intro"|"quiz"|"done">("intro");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number|null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [streak, setStreak] = useState(() => { try { return Number(localStorage.getItem("pz_daily5_streak")||"0"); } catch { return 0; } });
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (phase !== "quiz") return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now()-startTime)/1000)), 1000);
    return () => clearInterval(t);
  }, [phase, startTime]);

  const start = async () => {
    setIsLoading(true); setError(null);
    const area = WEAK_AREAS[Math.floor(Math.random()*WEAK_AREAS.length)];
    const fileContext = buildAIContext();
    try {
      const raw = await callGroq(
        [{ role:"user", content:`Generate exactly 5 multiple-choice questions targeting weak spots in "${area}".${fileContext} Make them challenging. Return ONLY valid JSON:\n{"questions":[{"question":"...","options":["A","B","C","D"],"correct":0,"explanation":"...","topic":"${area}"}]}` }],
        "You are a rigorous exam question writer. Create questions that expose genuine knowledge gaps. Avoid trivial recall — test application and reasoning.",
        "llama-3.3-70b-versatile", 1500
      );
      const clean = raw.replace(/```json|```/g,"").trim();
      const parsed = JSON.parse(clean.match(/\{[\s\S]*\}/)?.[0]??clean);
      setQuestions(parsed.questions);
      setPhase("quiz"); setCurrent(0); setSelected(null); setAnswered(false); setScore(0);
    } catch(e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally { setIsLoading(false); }
  };

  const choose = (i: number) => {
    if (answered) return;
    setSelected(i); setAnswered(true);
    if (i === questions[current].correct) setScore(s=>s+1);
  };

  const next = () => {
    if (current+1 >= questions.length) {
      const newStreak = streak+1;
      setStreak(newStreak);
      try { localStorage.setItem("pz_daily5_streak", String(newStreak)); } catch {}
      setPhase("done");
    } else {
      setCurrent(c=>c+1); setSelected(null); setAnswered(false);
    }
  };

  const q = questions[current];
  const mm = String(Math.floor(elapsed/60)).padStart(2,"0");
  const ss = String(elapsed%60).padStart(2,"0");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar isLoggedIn user={{name:"Learner",xp:2450,streak:12,plan:"free"}}/>
      {/* History Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        <ToolHistorySidebar
          toolKey="daily5"
          onNew={handleNewSession}
          onSelect={handleSelectSession}
          activeId={activeSessionId}
        />
        <div className="flex-1 overflow-auto">
      <main className="flex-1 max-w-2xl mx-auto w-full p-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/dashboard"><Button variant="ghost" size="sm" className="gap-1"><ChevronLeft className="h-4 w-4"/>Dashboard</Button></Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <div className="w-7 h-7 rounded-none bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center"><Zap className="h-4 w-4 text-white"/></div>
              Daily 5
            </h1>
            <p className="text-xs text-muted-foreground">5 targeted questions · under 3 minutes · 🔥 {streak}-day streak</p>
          </div>
        </div>

        {phase==="intro" && (
          <div className="text-center space-y-6 pt-8">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
              <Zap className="h-10 w-10 text-white"/>
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Your Daily 5</h2>
              <p className="text-muted-foreground">5 fresh questions targeting your weak spots. Under 3 minutes. Build the habit.</p>
            </div>
            <div className="flex justify-center gap-6 text-sm text-muted-foreground">
              <div className="text-center"><div className="text-2xl font-bold text-amber-500">5</div><div>Questions</div></div>
              <div className="text-center"><div className="text-2xl font-bold text-orange-500">&lt;3m</div><div>Target time</div></div>
              <div className="text-center"><div className="text-2xl font-bold text-rose-500">🔥{streak}</div><div>Day streak</div></div>
            </div>
            {error && <p className="text-sm text-red-500 bg-red-500/10 rounded-none p-3">{error}</p>}
            {buildAIContext().length > 0 && (
              <button onClick={start} disabled={isLoading}
                className="w-full max-w-sm py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-80"
                style={{ background: "rgba(212,175,90,0.1)", border: "1px solid rgba(212,175,90,0.35)", color: "var(--pz-gold, #d4af5a)" }}>
                ⚡ Generate Daily 5 from Active Source
              </button>
            )}
            <div className="flex flex-col items-center gap-3">
              <Button onClick={start} disabled={isLoading} className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-8 h-12 text-base font-semibold hover:opacity-90">
                {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-none animate-spin"/> : <><Zap className="h-5 w-5 mr-2"/>Start Today's 5</>}
              </Button>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>or</span>
                <span>attach study material</span>
              </div>
            </div>
          </div>
        )}

        {phase==="quiz" && q && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="secondary">{current+1} / {questions.length}</Badge>
              <span className="text-sm font-mono text-muted-foreground">{mm}:{ss}</span>
              <Badge variant="outline" className="text-xs">{q.topic}</Badge>
            </div>
            <div className="h-1 rounded-none bg-muted overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500" style={{width:`${((current)/questions.length)*100}%`}}/>
            </div>
            <div className="bg-card border border-border rounded-none p-6">
              <MathRenderer content={q.question} className="text-base font-medium mb-6"/>
              <div className="space-y-2">
                {q.options.map((opt,i)=>(
                  <button key={i} onClick={()=>choose(i)} disabled={answered}
                    className={cn("w-full text-left px-4 py-3 rounded-none border text-sm transition-all",
                      !answered && "hover:border-amber-400 hover:bg-amber-500/5",
                      answered && i===q.correct && "border-emerald-500 bg-white/10 text-emerald-700 dark:text-emerald-400 font-medium",
                      answered && selected===i && i!==q.correct && "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400",
                      (!answered || (answered && i!==q.correct && i!==selected)) && "border-border")}>
                    <span className="font-mono text-xs mr-2 opacity-60">{String.fromCharCode(65+i)}.</span>{opt}
                  </button>
                ))}
              </div>
            </div>
            {answered && (
              <div className="bg-card border border-border rounded-none p-4 space-y-3">
                <div className="flex items-center gap-2">
                  {selected===q.correct ? <CheckCircle2 className="h-4 w-4 text-white/60"/> : <XCircle className="h-4 w-4 text-red-500"/>}
                  <span className="font-semibold text-sm">{selected===q.correct ? "Correct!" : "Not quite"}</span>
                </div>
                <MathRenderer content={q.explanation} className="text-sm text-muted-foreground"/>
                <Button onClick={next} className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-90">
                  {current+1<questions.length ? "Next Question →" : "See Results →"}
                </Button>
              </div>
            )}
          </div>
        )}

        {phase==="done" && (
          <div className="text-center space-y-6 pt-8">
            <Trophy className="h-16 w-16 text-amber-500 mx-auto"/>
            <div>
              <h2 className="text-2xl font-bold">{score===5?"Perfect Score! 🎉":score>=3?"Nice work! 💪":"Keep practising! 📚"}</h2>
              <p className="text-muted-foreground mt-1">{score} / 5 correct · {mm}:{ss} · 🔥 {streak}-day streak</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[{label:"Score",val:`${score}/5`,color:"text-amber-500"},{label:"Accuracy",val:`${Math.round(score/5*100)}%`,color:"text-teal-500"},{label:"Streak",val:`${streak}🔥`,color:"text-rose-500"}].map(s=>(
                <div key={s.label} className="bg-card border border-border rounded-none p-3 text-center">
                  <div className={cn("text-2xl font-bold",s.color)}>{s.val}</div>
                  <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 justify-center">
              <Button onClick={()=>{setPhase("intro");}} variant="outline" className="gap-2"><RotateCcw className="h-4 w-4"/>Try Again</Button>
              <Link to="/dashboard"><Button className="bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-90">Back to Dashboard</Button></Link>
            </div>
          </div>
        )}
     </main>
        </div>
      </div>
    </div>
  );
}