import { ToolPageShell } from "@/components/ToolPageShell";
import { QuestionSkeleton } from "@/components/SkeletonLoader";
import { ToolHistorySidebar, type ToolSession } from "@/components/ToolHistorySidebar"
import { buildAIContext, getActiveSource } from "@/lib/sourceContext";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Zap, CheckCircle2, XCircle, Trophy, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { callGroq } from "@/lib/groq";
import { MathRenderer } from "@/components/MathRenderer";
import { BottomNav } from "@/components/BottomNav";

interface Question { question: string; options: string[]; correct: number; explanation: string; topic: string; }

const SUBJECT_CHIPS = [
  "Organic Chemistry","Calculus","Cell Biology","Thermodynamics","Electromagnetism",
  "World History","Grammar","Statistics","Genetics","Macroeconomics",
  "Trigonometry","Literature","Human Anatomy","Physics","Computer Science",
];

// 7-day heatmap helper
function get7DayHistory(): { date: string; score: number | null }[] {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const raw = localStorage.getItem(`pz_daily5_score_${key}`);
    days.push({ date: key, score: raw !== null ? Number(raw) : null });
  }
  return days;
}

export default function Daily5() {
  const toolKey = "daily5"
  const lsKey = `pz_hist_${toolKey}`
  const [sidebarOpen, setSidebarOpen] = useState(true)



  const todayKey = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  const completedToday = (() => { try { return localStorage.getItem("pz_daily5_date") === todayKey; } catch { return false; } })();
  const [alreadyDone, setAlreadyDone] = useState(completedToday);

  const [phase, setPhase] = useState<"intro"|"quiz"|"done">("intro");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [quizArea, setQuizArea] = useState<string>("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number|null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [streak, setStreak] = useState(() => {
    try {
      const lastDate = localStorage.getItem("pz_daily5_date");
      const streakVal = Number(localStorage.getItem("pz_daily5_streak") || "0");
      const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
      const yKey = yesterday.toISOString().slice(0, 10);
      // Reset streak if last completion wasn't today or yesterday
      if (lastDate !== todayKey && lastDate !== yKey) return 0;
      return streakVal;
    } catch { return 0; }
  });
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (phase !== "quiz") return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now()-startTime)/1000)), 1000);
    return () => clearInterval(t);
  }, [phase, startTime]);

  const start = async (overrideArea?: string) => {
    setIsLoading(true); setError(null);
    const area = overrideArea || selectedSubject || SUBJECT_CHIPS[Math.floor(Math.random()*SUBJECT_CHIPS.length)];
    setQuizArea(area);
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
      setAlreadyDone(true);
      try {
        localStorage.setItem("pz_daily5_streak", String(newStreak));
        localStorage.setItem("pz_daily5_date", todayKey);
        localStorage.setItem(`pz_daily5_score_${todayKey}`, String(score + (current < questions.length && selected === questions[current].correct ? 1 : 0)));
      } catch {}
      setPhase("done");
    } else {
      setCurrent(c=>c+1); setSelected(null); setAnswered(false);
    }
  };

  const q = questions[current];
  const mm = String(Math.floor(elapsed/60)).padStart(2,"0");
  const ss = String(elapsed%60).padStart(2,"0");

  return (
    <ToolPageShell>
      {/* History Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        <ToolHistorySidebar
          toolKey="daily5"
          onNew={handleNewSession}
          onSelect={handleSelectSession}
          activeId={activeSessionId}
        />
        <div className="flex-1 overflow-auto">
      <main className="flex-1 w-full p-4 py-8 md:max-w-2xl md:mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/dashboard"><Button variant="ghost" size="sm" className="gap-1"><ChevronLeft className="h-4 w-4"/>Dashboard</Button></Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <div className="w-7 h-7 rounded-none bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center"><Zap className="h-4 w-4 text-white"/></div>
              Daily Quiz
            </h1>
            <p className="text-xs text-muted-foreground">5 targeted questions · under 3 minutes · 🔥 {streak}-day streak</p>
          </div>
        </div>

        {phase==="intro" && (
          <div className="space-y-6 pt-4">
            {alreadyDone && (
              <div className="p-3 text-center" style={{ background: "rgba(0,196,180,0.06)", border: "0.5px solid rgba(0,196,180,0.25)" }}>
                <p className="text-sm font-semibold" style={{ color: "#8b1a2a" }}>✓ Completed today!</p>
                <p className="text-xs mt-1" style={{ color: "#555" }}>Come back tomorrow. 🔥 {streak}-day streak</p>
              </div>
            )}

            {/* 7-day heatmap */}
            {(() => {
              const days = get7DayHistory();
              const DAY_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
              return (
                <div style={{ display: "flex", gap: 4, justifyContent: "center", alignItems: "flex-end" }}>
                  {days.map(d => {
                    const dow = new Date(d.date + "T12:00:00").getDay();
                    const pct = d.score !== null ? d.score / 5 : null;
                    const bg = pct === null ? "#111" : pct >= 0.8 ? "#8b1a2a" : pct >= 0.5 ? "rgba(0,196,180,0.5)" : "rgba(0,196,180,0.2)";
                    return (
                      <div key={d.date} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                        <div title={d.score !== null ? `${d.score}/5` : "No quiz"} style={{ width: 32, height: 32, background: bg, border: "0.5px solid #1A1A1A", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {d.score !== null && <span style={{ fontSize: 10, fontWeight: 700, color: pct! >= 0.5 ? "#000" : "#8b1a2a", fontFamily: "monospace" }}>{d.score}/5</span>}
                        </div>
                        <span style={{ fontSize: 9, color: "#333", fontFamily: "monospace" }}>{DAY_LABELS[dow]}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Stats row */}
            <div style={{ display: "flex", justifyContent: "center", gap: 32 }}>
              {[{v:"5",l:"Questions"},{v:"<3m",l:"Target"},{v:`🔥${streak}`,l:"Streak"}].map(s=>(
                <div key={s.l} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#f0a040", fontFamily: "monospace" }}>{s.v}</div>
                  <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>{s.l}</div>
                </div>
              ))}
            </div>

            {/* Subject chip picker */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "#444", textTransform: "uppercase", marginBottom: 8 }}>Pick a subject — or skip to randomize</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {SUBJECT_CHIPS.map(s => (
                  <button key={s} onClick={() => setSelectedSubject(prev => prev === s ? "" : s)}
                    style={{ padding: "5px 10px", fontSize: 11, fontWeight: 600, border: `0.5px solid ${selectedSubject === s ? "#8b1a2a" : "#252525"}`, background: selectedSubject === s ? "rgba(0,196,180,0.1)" : "rgba(255,255,255,0.02)", color: selectedSubject === s ? "#8b1a2a" : "#666", cursor: "pointer", transition: "all .15s", fontFamily: "inherit" }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {error && <p style={{ fontSize: 12, color: "#ef4444", background: "rgba(239,68,68,0.08)", padding: "8px 12px" }}>{error}</p>}

            {buildAIContext().length > 0 && (
              <button onClick={() => start()} disabled={isLoading}
                style={{ width: "100%", padding: "10px", fontSize: 12, fontWeight: 600, background: "rgba(232,185,35,0.08)", border: "0.5px solid rgba(232,185,35,0.3)", color: "#f0a040", cursor: "pointer", fontFamily: "inherit" }}>
                ⚡ Quiz from Active Source{selectedSubject ? ` · ${selectedSubject}` : ""}
              </button>
            )}
            <button onClick={() => start()} disabled={isLoading}
              style={{ width: "100%", padding: "12px", fontSize: 13, fontWeight: 700, background: "linear-gradient(135deg,#f0a040,#f59e0b)", color: "#0A0A0A", border: "none", cursor: isLoading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "inherit", opacity: isLoading ? 0.7 : 1 }}>
              {isLoading
                ? <><div style={{ width: 14, height: 14, border: "2px solid rgba(0,0,0,0.2)", borderTopColor: "#0A0A0A", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />Generating...</>
                : <>⚡ Start{selectedSubject ? ` ${selectedSubject}` : " Random"} Quiz</>}
            </button>
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
          <BottomNav />
    </ToolPageShell>
  );
}