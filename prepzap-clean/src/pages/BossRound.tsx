import { ToolPageShell } from "@/components/ToolPageShell";
import { ConceptChipSelector } from "@/components/ConceptChipSelector";
import { buildAIContext } from "@/lib/sourceContext";
import { useState } from "react";
import { Award, CheckCircle2, XCircle, RotateCcw, Zap, Trophy } from "lucide-react";
import { callGroq } from "@/lib/groq";
import { MathRenderer } from "@/components/MathRenderer";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface Question { question: string; options: string[]; correct: number; explanation: string; topic: string; }

type Difficulty = "Easy" | "Medium" | "Hard" | "Nightmare";
const DIFFICULTIES = [
  { label: "Easy" as Difficulty,      color: "#10b981", bg: "rgba(16,185,129,0.12)" },
  { label: "Medium" as Difficulty,    color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  { label: "Hard" as Difficulty,      color: "#ef4444", bg: "rgba(239,68,68,0.12)"  },
  { label: "Nightmare" as Difficulty, color: "#8b5cf6", bg: "rgba(139,92,246,0.12)" },
];

const TEAL = "#00C4B4";
const GOLD = "#E8B923";

export default function BossRound() {
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
      const t = setInterval(()=>setTimeLeft(prev=>{if(prev<=1){clearInterval(t);return 0;}return prev-1;}),1000);
      setTimerRef(t);
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

  const score = results.filter(r=>r.correct).length;
  const diffMult = difficulty==="Nightmare"?2:difficulty==="Hard"?1.5:difficulty==="Easy"?0.75:1;
  const finalXP = Math.round((score/10)*500*diffMult);
  const mm = String(Math.floor(timeLeft/60)).padStart(2,"0");
  const ss = String(timeLeft%60).padStart(2,"0");
  const q = questions[current];
  const curDiff = DIFFICULTIES.find(d=>d.label===difficulty)!;

  return (
    <ToolPageShell>
      <main style={{flex:1,padding:"28px 20px",maxWidth:680,margin:"0 auto",width:"100%"}}>

        {phase==="setup" && (
          <div style={{display:"flex",flexDirection:"column",gap:28}}>
            <div style={{textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:16}}>
              <div style={{width:72,height:72,background:`linear-gradient(135deg,${GOLD},#f59e0b)`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 0 40px ${GOLD}30`}}>
                <Award style={{width:36,height:36,color:"#0A0A0A"}}/>
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
              <ConceptChipSelector onSelect={(c)=>{setTopicInput(c);setTimeout(()=>start(),0);}} placeholder="e.g. Cell Biology, World War 2, Calculus…" label="What topic do you want to be tested on?"/>
              <div>
                <label style={{fontSize:11,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:"#555",display:"block",marginBottom:10}}>Difficulty</label>
                <div style={{display:"flex",gap:8}}>
                  {DIFFICULTIES.map(d=>(
                    <button key={d.label} onClick={()=>setDifficulty(d.label)}
                      style={{flex:1,padding:"8px 0",fontSize:11,fontWeight:700,fontFamily:"'Inter',system-ui,sans-serif",cursor:"pointer",transition:"all .15s",
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
                style={{padding:"12px 0",background:`linear-gradient(135deg,${GOLD},#f59e0b)`,border:"none",color:"#0A0A0A",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Inter',system-ui,sans-serif",opacity:(isLoading||(!topicInput.trim()&&buildAIContext().length===0))?0.4:1,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                {isLoading?<div style={{width:14,height:14,border:"2px solid rgba(0,0,0,0.3)",borderTop:"2px solid #0A0A0A",borderRadius:"50%"}}/>:<><Award style={{width:14,height:14}}/>Start Boss Round</>}
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
                    style={{textAlign:"left",padding:"12px 16px",fontSize:13,fontFamily:"'Inter',system-ui,sans-serif",cursor:answered?"default":"pointer",transition:"all .15s",
                      border:`0.5px solid ${answered&&i===q.correct?"#10b981":answered&&selected===i&&i!==q.correct?"#ef4444":"#252525"}`,
                      background:answered&&i===q.correct?"rgba(16,185,129,0.08)":answered&&selected===i&&i!==q.correct?"rgba(239,68,68,0.08)":"transparent",
                      color:answered&&i===q.correct?"#10b981":answered&&selected===i&&i!==q.correct?"#ef4444":"#C0C0C0"}}>
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
                <button onClick={next} style={{padding:"10px 0",background:`linear-gradient(135deg,${GOLD},#f59e0b)`,border:"none",color:"#0A0A0A",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Inter',system-ui,sans-serif"}}>
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
                style={{padding:"10px 20px",background:"transparent",border:"0.5px solid #252525",color:"#C0C0C0",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Inter',system-ui,sans-serif",display:"flex",alignItems:"center",gap:6}}>
                <RotateCcw style={{width:14,height:14}}/> Retry
              </button>
              <Link to="/dashboard">
                <button style={{padding:"10px 20px",background:`linear-gradient(135deg,${GOLD},#f59e0b)`,border:"none",color:"#0A0A0A",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Inter',system-ui,sans-serif",display:"flex",alignItems:"center",gap:6}}>
                  <Zap style={{width:14,height:14}}/> Back to Dashboard
                </button>
              </Link>
            </div>
          </div>
        )}
      </main>
    </ToolPageShell>
  );
}
