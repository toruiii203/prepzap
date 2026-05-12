import { ToolPageShell } from "@/components/ToolPageShell";
import { loadHistory, addHistoryEntry, deleteHistoryEntry } from "@/lib/historyStore";
import { buildAIContext } from "@/lib/sourceContext";
import { useState, useEffect, useRef } from "react";
import { Award, CheckCircle2, XCircle, RotateCcw, Zap, Trophy, Brain } from "lucide-react";
import { ConceptChipSelector } from "@/components/ConceptChipSelector";
import { callGroq } from "@/lib/groq";
import { MathRenderer } from "@/components/MathRenderer";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";

interface Question { question: string; options: string[]; correct: number; explanation: string; topic: string; }

type Difficulty = "Easy" | "Medium" | "Hard" | "Nightmare";
const DIFFICULTIES = [
  { label: "Easy" as Difficulty,      color: "#10b981", bg: "rgba(16,185,129,0.12)" },
  { label: "Medium" as Difficulty,    color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  { label: "Hard" as Difficulty,      color: "#ef4444", bg: "rgba(239,68,68,0.12)"  },
  { label: "Nightmare" as Difficulty, color: "#8b5cf6", bg: "rgba(139,92,246,0.12)" },
];

const TEAL = "#8b1a2a";
const GOLD = "#f0a040";

export default function BossRound() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toolHistory, setToolHistory] = useState(() => loadHistory("boss-round"));
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
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null);

  // Cleanup timer on unmount
  const start = async () => {
    const hasSource = buildAIContext().length > 0;
    if (!topicInput.trim() && !hasSource) return;
    setIsLoading(true); setError(null);
    const nightmareExtra = difficulty === "Nightmare" ? " Include multi-step reasoning, tricky edge cases, and questions requiring synthesis of multiple concepts." : "";
    const fileContext = buildAIContext();
    const topic = topicInput.trim() || "the attached material";
    try {
      const raw = await callGroq(
        [{role:"user",content:`Generate exactly 10 ${difficulty}-difficulty multiple-choice questions about "${topic}" for a Boss Round challenge.${nightmareExtra}${fileContext} Return ONLY: {"questions":[{"question":"...","options":["A","B","C","D"],"correct":0,"explanation":"...","topic":"subtopic"}]}`}],
        "Return ONLY valid compact JSON. No markdown, no explanation.",
        "llama-3.3-70b-versatile", 3000
      );
      const clean = raw.replace(/```json\s*/gi,'').replace(/```\s*/g,'').trim();
      const parsed = JSON.parse(clean.match(/\{[\s\S]*\}/)?.[0] ?? clean);
      setQuestions(parsed.questions.slice(0,10));
      setCurrent(0); setSelected(null); setAnswered(false); setResults([]); setTimeLeft(300);
      setPhase("quiz");
      toast.success(`Boss Round ready — ${difficulty} mode!`);
      if(timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(()=>setTimeLeft(prev=>{if(prev<=1){clearInterval(timerRef.current!);timerRef.current=null;return 0;}return prev-1;}),1000);
    } catch(e) { setError(e instanceof Error?e.message:"Error"); }
    finally { setIsLoading(false); }
  };

  const choose = (i: number) => { if (answered) return; setSelected(i); setAnswered(true); };

  const next = () => {
    const newResults = [...results, {correct:selected===questions[current].correct,selected:selected??-1,correct_idx:questions[current].correct}];
    setResults(newResults);
    if (current+1 >= questions.length) { if(timerRef) clearInterval(timerRef); setPhase("done"); }
    else { setCurrent(c=>c+1); setSelected(null); setAnswered(false); }
  };

  // Keyboard shortcuts: 1-4 pick answer, Enter/Space advance
  useEffect(() => {
    if (phase !== "quiz") return;
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const num = parseInt(e.key);
      if (!isNaN(num) && num >= 1 && num <= 4 && !answered) choose(num - 1);
      else if ((e.key === "Enter" || e.key === " ") && answered) { e.preventDefault(); next(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, answered, current, questions]);

  const score = results.filter(r=>r.correct).length;
  const diffMult = difficulty==="Nightmare"?2:difficulty==="Hard"?1.5:difficulty==="Easy"?0.75:1;
  const finalXP = Math.round((score/10)*500*diffMult);
  const mm = String(Math.floor(timeLeft/60)).padStart(2,"0");
  const ss = String(timeLeft%60).padStart(2,"0");
  const q = questions[current];
  const curDiff = DIFFICULTIES.find(d=>d.label===difficulty)!;


  // ── QuickLaunch prefill ────────────────────────────────────────────────────
  useEffect(() => {
    const prefill = sessionStorage.getItem("quicklaunch_prompt");
    const targetTool = sessionStorage.getItem("quicklaunch_tool");
    if (prefill && prefill.trim()) {
      setTopicInput(prefill);
      sessionStorage.removeItem("quicklaunch_prompt");
      sessionStorage.removeItem("quicklaunch_tool");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ToolPageShell>
      {/* ── HISTORY SIDEBAR ── */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)" }} />
      )}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 100,
        width: 300, background: "#0A0D12", borderLeft: "0.5px solid #1E2A2A",
        display: "flex", flexDirection: "column",
        transform: sidebarOpen ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
        boxShadow: sidebarOpen ? "-8px 0 32px rgba(0,0,0,0.6)" : "none",
      }}>
        <div style={{ padding: "16px 16px 12px", borderBottom: "0.5px solid #1A2626", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8b1a2a", marginBottom: 2 }}>Boss Round History</div>
            <div style={{ fontSize: 10, color: "#444" }}>{toolHistory.length} session{toolHistory.length !== 1 ? "s" : ""}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {toolHistory.length > 0 && (
              <button onClick={() => { deleteHistoryEntry("boss-round", "all"); setToolHistory([]); }}
                style={{ fontSize: 10, color: "#444", cursor: "pointer", background: "none", border: "none", fontFamily: "inherit", padding: "2px 6px" }}
                onMouseEnter={e => { e.currentTarget.style.color = "#ef4444"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "#444"; }}>Clear all</button>
            )}
            <button onClick={() => setSidebarOpen(false)}
              style={{ width: 26, height: 26, border: "0.5px solid #1E2A2A", background: "rgba(255,255,255,0.02)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#555", transition: "all .15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#8b1a2a"; e.currentTarget.style.color = "#8b1a2a"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#1E2A2A"; e.currentTarget.style.color = "#555"; }}>
              <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
          {toolHistory.length === 0 ? (
            <div style={{ padding: "40px 16px", textAlign: "center" }}>
              <div style={{ width: 36, height: 36, border: "0.5px solid #1E2A2A", margin: "0 auto 10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Brain size={16} style={{ color: "#333" }} />
              </div>
              <div style={{ fontSize: 12, color: "#444", marginBottom: 4 }}>No boss rounds yet</div>
              <div style={{ fontSize: 11, color: "#333" }}>Sessions will appear here</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[...toolHistory].reverse().map((entry) => (
                <div key={entry.id}
                  style={{ background: "rgba(255,255,255,0.02)", border: "0.5px solid #1A2626", padding: "10px 12px", cursor: "pointer", transition: "all .15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#8b1a2a"; e.currentTarget.style.background = "rgba(0,196,180,0.04)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#1A2626"; e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#D0D0D0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.title}</div>
                  <div style={{ fontSize: 10, color: "#444", marginTop: 3, display: "flex", gap: 6 }}>
                    <span style={{ color: "#2A6A64" }}>{entry.subtitle}</span>
                    <span>·</span>
                    <span>{new Date(entry.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ padding: "10px 14px", borderTop: "0.5px solid #1A2626" }}>
          <div style={{ fontSize: 10, color: "#333", textAlign: "center" }}>Click any session to replay →</div>
        </div>
      </div>

      <main style={{flex:1,padding:"28px 20px",maxWidth:680,margin:"0 auto",width:"100%"}}>
        {/* Sidebar toggle button */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <button onClick={() => setSidebarOpen(v => !v)}
            style={{ width: 32, height: 32, border: "0.5px solid #252525", background: sidebarOpen ? "rgba(0,196,180,0.08)" : "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: sidebarOpen ? "#8b1a2a" : "#555", transition: "all .15s", position: "relative" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#8b1a2a"; e.currentTarget.style.color = "#8b1a2a"; }}
            onMouseLeave={e => { if (!sidebarOpen) { e.currentTarget.style.borderColor = "#252525"; e.currentTarget.style.color = "#555"; } }}>
            <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.8}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            {toolHistory.length > 0 && <div style={{ position: "absolute", top: 6, right: 6, width: 5, height: 5, borderRadius: "50%", background: "#8b1a2a" }} />}
          </button>
        </div>

        {phase==="setup" && (
          <div style={{display:"flex",flexDirection:"column",gap:28}}>
            <div style={{textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:16}}>
              <div style={{width:72,height:72,background:`linear-gradient(135deg,${GOLD},#f59e0b)`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 0 40px ${GOLD}30`}}>
                <Award style={{width:36,height:36,color:"#160810"}}/>
              </div>
              <div>
                <h1 style={{fontSize:24,fontWeight:700,color:"#F0F0F0",margin:0}}>Boss Round</h1>
                <p style={{fontSize:13,color:"#666",marginTop:6}}>The ultimate challenge. 10 questions. 5 minutes. Your score determines XP earned.</p>
              </div>
              <div style={{display:"flex",gap:32}}>
                {[{v:"10",l:"Questions"},{v:"5m",l:"Time limit"},{v:"500",l:"Max XP"}].map(s=>(
                  <div key={s.l} style={{textAlign:"center"}}>
                    <div style={{fontSize:26,fontWeight:700,color:GOLD,fontFamily:"monospace"}}>{s.v}</div>
                    <div style={{fontSize:11,color:"#555",marginTop:2}}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{background:"#111",border:"0.5px solid #222",padding:20,display:"flex",flexDirection:"column",gap:16}}>
              <ConceptChipSelector onSelect={(c)=>{setTopicInput(c);setTimeout(()=>start(),0);}} onKeyDown={e => e.key === "Enter" && start()} placeholder="e.g. Cell Biology, World War 2, Calculus…" label="What topic do you want to be tested on?"/>
              <div>
                <label style={{fontSize:11,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:"#555",display:"block",marginBottom:10}}>Difficulty</label>
                <div style={{display:"flex",gap:8}}>
                  {DIFFICULTIES.map(d=>(
                    <button key={d.label} onClick={()=>setDifficulty(d.label)}
                      style={{flex:1,padding:"8px 0",fontSize:11,fontWeight:700,fontFamily:"'Nunito',system-ui,sans-serif",cursor:"pointer",transition:"all .15s",
                        border:`0.5px solid ${difficulty===d.label?d.color:"#252525"}`,
                        background:difficulty===d.label?d.bg:"transparent",
                        color:difficulty===d.label?d.color:"#444"}}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
              {error&&<p style={{fontSize:12,color:"#ef4444",background:"rgba(239,68,68,0.08)",border:"0.5px solid rgba(239,68,68,0.2)",padding:"10px 14px"}}>{error}</p>}
              <button onClick={start} disabled={isLoading||(!topicInput.trim()&&buildAIContext().length===0)}
                style={{padding:"12px 0",background:`linear-gradient(135deg,${GOLD},#f59e0b)`,border:"none",color:"#160810",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Nunito',system-ui,sans-serif",opacity:(isLoading||(!topicInput.trim()&&buildAIContext().length===0))?0.4:1,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                {isLoading?<div style={{width:14,height:14,border:"2px solid rgba(0,0,0,0.3)",borderTop:"2px solid #160810",borderRadius:"50%"}}/>:<><Award style={{width:14,height:14}}/>Start Boss Round</>}
              </button>
            </div>
          </div>
        )}

        {phase==="quiz" && q && (
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontSize:11,fontWeight:700,color:"#555",fontFamily:"monospace"}}>{current+1} / {questions.length}</span>
              <div style={{fontSize:13,fontWeight:700,fontFamily:"monospace",color:timeLeft<=60?"#ef4444":"#666"}}>⏱ {mm}:{ss}</div>
              <span style={{fontSize:10,padding:"2px 8px",background:`rgba(232,185,35,0.12)`,color:GOLD,fontWeight:700,border:`0.5px solid ${GOLD}40`}}>+{Math.round((1/questions.length)*500)} XP</span>
            </div>
            <div style={{height:2,background:"#1A1A1A"}}>
              <div style={{height:"100%",background:`linear-gradient(90deg,${GOLD},#f59e0b)`,width:`${(current/questions.length)*100}%`,transition:"width .4s"}}/>
            </div>
            <div style={{background:"#111",border:"0.5px solid #222",padding:24}}>
              <span style={{fontSize:9,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:"#444",display:"block",marginBottom:12}}>{q.topic}</span>
              <MathRenderer content={q.question} className="text-base font-medium mb-5"/>
              <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:20}}>
                {q.options.map((opt,i)=>(
                  <button key={i} onClick={()=>choose(i)} disabled={answered}
                    style={{textAlign:"left",padding:"12px 16px",fontSize:13,fontFamily:"'Nunito',system-ui,sans-serif",cursor:answered?"default":"pointer",transition:"all .15s",
                      border:`0.5px solid ${answered&&i===q.correct?"#10b981":answered&&selected===i&&i!==q.correct?"#ef4444":"#252525"}`,
                      background:answered&&i===q.correct?"rgba(16,185,129,0.08)":answered&&selected===i&&i!==q.correct?"rgba(239,68,68,0.08)":"transparent",
                      color:answered&&i===q.correct?"#10b981":answered&&selected===i&&i!==q.correct?"#ef4444":"#C0C0C0",
                      display:"flex",alignItems:"center",gap:10,position:"relative"}}>
                    {!answered && <span style={{fontSize:9,color:"#444",fontFamily:"monospace",flexShrink:0}}>{i+1}</span>}
                    <span>{opt}</span>
                    <span style={{fontFamily:"monospace",fontSize:11,opacity:0.5,marginRight:10}}>{String.fromCharCode(65+i)}.</span>{opt}
                  </button>
                ))}
              </div>
            </div>
            {answered&&(
              <div style={{background:"#111",border:"0.5px solid #222",padding:16,display:"flex",flexDirection:"column",gap:12}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  {selected===q.correct?<CheckCircle2 style={{width:16,height:16,color:"#10b981"}}/>:<XCircle style={{width:16,height:16,color:"#ef4444"}}/>}
                  <span style={{fontWeight:700,fontSize:13,color:selected===q.correct?"#10b981":"#ef4444"}}>{selected===q.correct?`Correct! +${Math.round(500/questions.length)} XP`:"Wrong"}</span>
                </div>
                <MathRenderer content={q.explanation} className="text-xs text-muted-foreground"/>
                <button onClick={next} style={{padding:"10px 0",background:`linear-gradient(135deg,${GOLD},#f59e0b)`,border:"none",color:"#160810",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Nunito',system-ui,sans-serif"}}>
                  {current+1<questions.length?"Next →":"See Final Score →"}
                </button>
              </div>
            )}
          </div>
        )}

        {phase==="done"&&(
          <div style={{textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:24,paddingTop:32}}>
            <Trophy style={{width:64,height:64,color:score>=8?GOLD:score>=6?TEAL:"#444"}}/>
            <div>
              <div style={{fontSize:48,fontWeight:700,color:"#F0F0F0",fontFamily:"monospace"}}>{score}<span style={{fontSize:24,color:"#555"}}>/10</span></div>
              <p style={{fontSize:14,color:"#666",marginTop:6}}>{score>=9?"Legendary! 🏆":score>=7?"Strong work! 💪":score>=5?"Keep grinding! 📚":"Tougher than expected — review and retry"}</p>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,width:"100%"}}>
              {[{l:"Score",v:`${score}/10`,c:GOLD},{l:"XP Earned",v:`+${finalXP}`,c:TEAL},{l:"Accuracy",v:`${Math.round(score/10*100)}%`,c:"#8b5cf6"}].map(s=>(
                <div key={s.l} style={{background:"#111",border:"0.5px solid #222",padding:"14px 10px",textAlign:"center"}}>
                  <div style={{fontSize:22,fontWeight:700,color:s.c,fontFamily:"monospace"}}>{s.v}</div>
                  <div style={{fontSize:11,color:"#555",marginTop:4}}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>{setPhase("setup");setTopicInput("");setResults([]);}}
                style={{padding:"10px 20px",background:"transparent",border:"0.5px solid #252525",color:"#C0C0C0",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Nunito',system-ui,sans-serif",display:"flex",alignItems:"center",gap:6}}>
                <RotateCcw style={{width:14,height:14}}/> Retry
              </button>
              <Link to="/dashboard">
                <button style={{padding:"10px 20px",background:`linear-gradient(135deg,${GOLD},#f59e0b)`,border:"none",color:"#160810",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Nunito',system-ui,sans-serif",display:"flex",alignItems:"center",gap:6}}>
                  <Zap style={{width:14,height:14}}/> Back to Dashboard
                </button>
              </Link>
            </div>
          </div>
        )}
      </main>
          <BottomNav />
    </ToolPageShell>
  );
}
