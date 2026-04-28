import { useState, useEffect } from "react";
import { ToolHistorySidebar, useToolHistory, type ToolSession } from "@/components/ToolHistorySidebar"
import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Mic2, Send, RotateCcw, Brain, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { callGroq, type GroqMessage } from "@/lib/groq";
import { buildAIContext, getActiveSource } from "@/lib/sourceContext";
import { GlobalContextBar } from "@/components/GlobalContextBar";

interface Message { role: "user"|"ai"; content: string; }

export default function FlipScript() {
  const toolKey = "flipscript"
  const lsKey = `pz_hist_${toolKey}`
  const { sessions: toolSessions, addSession, deleteSession } = useToolHistory(toolKey)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const handleNewSession = () => { setActiveSessionId(null) }
  const handleSelectSession = (s: ToolSession) => { setActiveSessionId(s.id) }


  const [phase, setPhase] = useState<"setup"|"teaching"|"scored">("setup");
  const [topic, setTopic] = useState("");
  const [topicInput, setTopicInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [score, setScore] = useState<{score:number;gaps:string[];strengths:string[];verdict:string}|null>(null);
  const [turnCount, setTurnCount] = useState(0);
  const [error, setError] = useState<string|null>(null);
  const [activeSource, setActiveSource] = useState(() => getActiveSource());

  useEffect(() => {
    const sync = () => setActiveSource(getActiveSource());
    window.addEventListener("storage", sync);
    sync();
    return () => window.removeEventListener("storage", sync);
  }, []);

  const start = (overrideTopic?: string) => {
    const t = (overrideTopic ?? topicInput.trim()) || getActiveSource()?.name?.replace(/\.\w+$/, "") || "";
    if (!t) return;
    setTopic(t);
    setTopicInput(t);
    setMessages([{role:"ai", content:`Okay, I'm a totally confused beginner. Explain "${t}" to me like I'm 10. Start anywhere — I'll ask questions when I'm confused! 😕`}]);
    setPhase("teaching"); setTurnCount(0);
  };

  const send = async () => {
    if (!input.trim()||isLoading) return;
    const userMsg = input.trim();
    setInput("");
    const newMsgs: Message[] = [...messages, {role:"user",content:userMsg}];
    setMessages(newMsgs);
    setTurnCount(t=>t+1);
    setIsLoading(true); setError(null);

    const shouldScore = turnCount >= 3;
    const ctx = buildAIContext();
    const ctxNote = ctx ? `\n\nStudent's study materials context (use this to judge accuracy):\n${ctx}` : "";

    try {
      const history: GroqMessage[] = newMsgs.map(m=>({role:m.role==="ai"?"assistant":"user" as "assistant"|"user", content:m.content}));
      if (shouldScore) {
        const raw = await callGroq(history,
          `You are a confused beginner learning about "${topic}". The student has been explaining for ${turnCount+1} turns. Now score their explanation.${ctxNote} Reply with ONE final confused follow-up question, then on a NEW LINE write SCORE_JSON: followed by valid JSON: {"score":0-100,"strengths":["..."],"gaps":["..."],"verdict":"one sentence"}. Be honest — most explanations have real gaps.`,
          "llama-3.3-70b-versatile", 600);
        const jsonMatch = raw.match(/SCORE_JSON:\s*(\{[\s\S]*\})/);
        const reply = raw.replace(/SCORE_JSON:[\s\S]*/, "").trim();
        setMessages(prev=>[...prev,{role:"ai",content:reply}]);
        if (jsonMatch) {
          setScore(JSON.parse(jsonMatch[1]));
          setTimeout(()=>setPhase("scored"), 1500);
        }
      } else {
        const reply = await callGroq(history,
          `You are a confused 10-year-old learning about "${topic}". Ask ONE short follow-up question that probes their explanation.${ctxNote} Be genuinely confused about something they said or something they skipped. Keep it under 2 sentences.`,
          "llama-3.3-70b-versatile", 200);
        setMessages(prev=>[...prev,{role:"ai",content:reply}]);
      }
    } catch(e) { setError(e instanceof Error?e.message:"Error"); }
    finally { setIsLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar isLoggedIn user={{name:"Learner",xp:2450,streak:12,plan:"free"}}/>
      {/* History Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        <ToolHistorySidebar
          toolKey="flipscript"
          onNew={handleNewSession}
          onSelect={handleSelectSession}
          activeId={activeSessionId}
        />
        <div className="flex-1 overflow-auto">
      <main className="flex-1 w-full p-4 py-6 md:max-w-2xl md:mx-auto">
        <GlobalContextBar compact />
        <div className="flex items-center gap-3 mb-6">
          <Link to="/dashboard"><Button variant="ghost" size="sm" className="gap-1"><ChevronLeft className="h-4 w-4"/>Dashboard</Button></Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <div className="w-7 h-7 rounded-none bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center"><Mic2 className="h-4 w-4 text-white"/></div>
              Flip the Script
            </h1>
            <p className="text-xs text-muted-foreground">Explain a topic to a confused AI — get scored on your gaps</p>
          </div>
        </div>

        {phase==="setup" && (
          <div className="text-center space-y-6 pt-8">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/20">
              <Mic2 className="h-10 w-10 text-white"/>
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Flip the Script</h2>
              <p className="text-muted-foreground max-w-md mx-auto">You explain. The AI plays dumb and asks follow-up questions to expose gaps. Then it scores your explanation. Based on the Feynman Technique.</p>
            </div>
            <div className="bg-card border border-border rounded-none p-6 text-left space-y-3">
              <label className="font-semibold text-sm">What topic will you explain?</label>
              {activeSource && (
                <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-none"
                  style={{ background: "rgba(212,175,90,0.06)", border: "1px solid rgba(212,175,90,0.3)" }}>
                  <span className="text-xs font-medium truncate" style={{ color: "var(--pz-gold)" }}>
                    📄 Active: <strong>{activeSource.name}</strong>
                  </span>
                  <button onClick={() => start(activeSource.name?.replace(/\.[^.]+$/, "") || "the source material")}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all hover:opacity-80"
                    style={{ background: "rgba(212,175,90,0.15)", border: "1px solid rgba(212,175,90,0.4)", color: "var(--pz-gold)" }}>
                    ⚡ Start from Source
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <input className="flex-1 px-4 py-3 rounded-none border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                  placeholder="e.g. How vaccines work, What is recursion..."
                  value={topicInput} onChange={e=>setTopicInput(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&start()}/>
                <Button onClick={() => start()} disabled={!topicInput.trim() && !activeSource} className="bg-gradient-to-r from-rose-500 to-pink-600 text-white hover:opacity-90 px-6">Start</Button>
              </div>
            </div>
          </div>
        )}

        {phase==="teaching" && (
          <div className="flex flex-col gap-3 h-[calc(100vh-14rem)]">
            <div className="flex items-center justify-between">
              <Badge variant="secondary">Topic: {topic}</Badge>
              <span className="text-xs text-muted-foreground">Turn {turnCount+1} · {turnCount>=3?"scoring next":"keep explaining"}</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
              {messages.map((m,i)=>(
                <div key={i} className={cn("flex",m.role==="user"?"justify-end":"justify-start")}>
                  {m.role==="ai"&&<div className="w-7 h-7 rounded-none bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center mr-2 mt-1 shrink-0"><Brain className="h-3.5 w-3.5 text-white"/></div>}
                  <div className={cn("max-w-[80%] rounded-none px-4 py-3 text-sm leading-relaxed",
                    m.role==="user"?"bg-primary text-primary-foreground rounded-tr-sm":"bg-card border border-border rounded-tl-sm")}>
                    {m.content}
                  </div>
                </div>
              ))}
              {isLoading&&<div className="flex"><div className="w-7 h-7 rounded-none bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center mr-2 shrink-0"><Brain className="h-3.5 w-3.5 text-white"/></div><div className="bg-card border border-border rounded-none rounded-tl-sm px-4 py-3"><div className="flex gap-1">{[0,1,2].map(i=><div key={i} className="w-2 h-2 rounded-none bg-muted-foreground animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}</div></div></div>}
            </div>
            {error&&<p className="text-xs text-red-500 bg-red-500/10 rounded-none p-2">{error}</p>}
            <div className="flex gap-2">
              <Textarea className="min-h-[70px] resize-none text-sm" placeholder="Explain away..."
                value={input} onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"&&(e.metaKey||e.ctrlKey))send();}}/>
              <Button onClick={send} disabled={!input.trim()||isLoading} className="bg-gradient-to-r from-rose-500 to-pink-600 text-white h-full px-4">
                <Send className="h-4 w-4"/>
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center">⌘+Enter to send · AI scores after {Math.max(0,4-turnCount)} more turns</p>
          </div>
        )}

        {phase==="scored" && score && (
          <div className="space-y-4 pt-4">
            <div className="text-center">
              <Trophy className={cn("h-12 w-12 mx-auto mb-2",score.score>=80?"text-white/60":score.score>=60?"text-amber-500":"text-red-500")}/>
              <div className={cn("text-5xl font-bold",score.score>=80?"text-white/60":score.score>=60?"text-amber-500":"text-red-500")}>{score.score}<span className="text-2xl">%</span></div>
              <p className="text-muted-foreground text-sm mt-1 italic">"{score.verdict}"</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 border border-emerald-500/20 rounded-none p-4">
                <p className="text-xs font-bold text-white/60 mb-2">✅ Strengths</p>
                {score.strengths.map((s,i)=><p key={i} className="text-xs text-muted-foreground mb-1">• {s}</p>)}
              </div>
              <div className="bg-red-500/5 border border-red-500/20 rounded-none p-4">
                <p className="text-xs font-bold text-red-500 mb-2">🔍 Gaps Found</p>
                {score.gaps.map((g,i)=><p key={i} className="text-xs text-muted-foreground mb-1">• {g}</p>)}
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={()=>{setPhase("setup");setMessages([]);setTurnCount(0);setScore(null);setTopicInput(topic);}} variant="outline" className="flex-1 gap-2"><RotateCcw className="h-4 w-4"/>Retry Topic</Button>
              <Link to="/dashboard" className="flex-1"><Button className="w-full bg-gradient-to-r from-rose-500 to-pink-600 text-white hover:opacity-90">Dashboard</Button></Link>
            </div>
          </div>
        )}
     </main>
        </div>
      </div>
    </div>
  );
}