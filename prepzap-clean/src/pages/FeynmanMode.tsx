import { useState, useRef, useEffect, useCallback } from "react";
import { ToolHistorySidebar, useToolHistory, type ToolSession } from "@/components/ToolHistorySidebar"
import { Navbar } from "@/components/Navbar";
import {
  Mic, MicOff, Send, RotateCcw, Lightbulb, CheckCircle2,
  AlertCircle, ChevronRight, Brain, Sparkles, BookOpen,
  Trophy, X, ChevronDown, Zap, MessageSquare,
  Star, TrendingUp, Target
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { callGroq, type GroqMessage } from "@/lib/groq";
import { ModelSelector, useFileAttach } from "@/components/ToolShell";
import { buildAIContext, getActiveSource } from "@/lib/sourceContext";
import { MathRenderer } from "@/components/MathRenderer";

interface FeedbackItem {
  type: "strength" | "gap" | "hint";
  text: string;
}
interface SessionMessage {
  role: "user" | "ai";
  content: string;
  timestamp: Date;
}
interface FeedbackResult {
  masteryScore: number;
  summary: string;
  feedback: FeedbackItem[];
  followUpQuestion: string;
  conceptsCovered: string[];
  conceptsMissing: string[];
  encouragement: string;
}

const SUGGESTED_TOPICS = [
  "Photosynthesis","Newton's Laws","Supply & Demand","DNA Replication",
  "Quantum Superposition","The Water Cycle","Cellular Respiration",
  "Electromagnetic Induction","Natural Selection","Thermodynamics",
  "Keynesian Economics","CRISPR Gene Editing",
];

function masteryColor(s: number) { return s>=80?"text-white/60":s>=60?"text-amber-500":"text-red-500"; }
function masteryBg(s: number) { return s>=80?"bg-white":s>=60?"bg-amber-500":"bg-red-500"; }
function masteryLabel(s: number) { return s>=85?"Expert":s>=70?"Proficient":s>=50?"Developing":"Beginner"; }

export default function FeynmanMode() {
  const toolKey = "feynman"
  const lsKey = `pz_hist_${toolKey}`
  const { sessions: toolSessions, addSession, deleteSession } = useToolHistory(toolKey)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const handleNewSession = () => { setActiveSessionId(null) }
  const handleSelectSession = (s: ToolSession) => { setActiveSessionId(s.id) }


  const [phase, setPhase] = useState<"setup"|"teaching"|"feedback">("setup");
  const [topic, setTopic] = useState("");
  const [topicInput, setTopicInput] = useState("");
  const [inputMode, setInputMode] = useState<"text"|"voice">("text");
  const [userInput, setUserInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [feedback, setFeedback] = useState<FeedbackResult|null>(null);
  const [conversation, setConversation] = useState<SessionMessage[]>([]);
  const [deepDiveInput, setDeepDiveInput] = useState("");
  const [deepDiveResponse, setDeepDiveResponse] = useState("");
  const [round, setRound] = useState(1);
  const [expandedSection, setExpandedSection] = useState<string|null>("strengths");
  const [sessionHistory, setSessionHistory] = useState<{topic: string; score: number; round: number; timestamp: Date}[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const recognitionRef = useRef<any>(null);
  const { pendingFile, setPendingFile, FileAttachButton } = useFileAttach();
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatBottomRef.current?.scrollIntoView({behavior:"smooth"}); }, [conversation, deepDiveResponse, isLoading]);

  const startRecording = useCallback(async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input not supported in this browser. Please use Chrome or Edge, or switch to text mode.");
      setInputMode("text");
      return;
    }
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "en-US";
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognitionRef.current = recognition;
      let finalTranscript = "";
      recognition.onresult = (e: any) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) finalTranscript += t + " ";
          else interim = t;
        }
        setUserInput(finalTranscript + interim);
      };
      recognition.onerror = (e: any) => {
        if (e.error === "not-allowed") {
          alert("Microphone access denied. Please allow mic access and try again.");
          setInputMode("text");
        }
        setIsRecording(false);
      };
      recognition.onend = () => setIsRecording(false);
      recognition.start();
      setIsRecording(true);
    } catch {
      alert("Could not start voice recognition. Please use text mode.");
      setInputMode("text");
    }
  }, []);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  }, []);

  const handleStartSession = () => {
    if (!topicInput.trim() && !pendingFile && buildAIContext().length === 0) return;
    const t = topicInput.trim() || pendingFile?.name?.replace(/\.[^.]+$/, "") || getActiveSource()?.name?.replace(/\.\w+$/, "") || "the source material";
    const notesContext = pendingFile?.content
      ? `

📎 I have your notes on "${pendingFile.name}" as reference. Use them to ask sharper follow-up questions.`
      : "";
    setPendingFile(null);
    setTopic(t);
    setError(null);
    setPhase("teaching");
    setConversation([{
      role:"ai",
      content:`Great choice! Let's use the Feynman Technique on **"${t}"**.${notesContext} Pretend I'm a curious 12-year-old who's never heard of this. Explain it to me in simple terms — no jargon allowed! Just start teaching. 🧒`,
      timestamp:new Date()
    }]);
  };

  const handleSubmitExplanation = async () => {
    if (!userInput.trim()||isLoading) return;
    const explanation = userInput.trim();
    setUserInput("");
    setIsLoading(true);
    setError(null);
    setConversation(prev=>[...prev,{role:"user",content:explanation,timestamp:new Date()}]);

    const systemPrompt = `You are a strict but fair Socratic tutor evaluating a student's explanation of "${topic}" using the Feynman Technique.

IMPORTANT GRADING RULES:
- Be HONEST and CRITICAL. Do NOT inflate scores. Most explanations have real gaps.
- A score of 90+ means truly expert-level with no significant omissions.
- A score of 70-89 means good understanding with minor gaps.
- A score of 50-69 means basic understanding but key concepts are missing.
- A score below 50 means significant misconceptions or very superficial explanation.
- If the voice input appears to be empty, garbled, or just "[Voice recorded...]", give 0 and ask them to actually explain.
- Judge based on ACTUAL CONTENT provided, not effort.

Return ONLY valid JSON with no markdown fences or extra text, in this exact shape:
{
  "masteryScore": <integer 0-100>,
  "summary": "<1-sentence honest assessment>",
  "feedback": [
    {"type": "strength", "text": "<specific thing they got right>"},
    {"type": "gap", "text": "<specific thing missing or incorrect>"},
    {"type": "hint", "text": "<actionable suggestion to improve>"}
  ],
  "followUpQuestion": "<one probing Socratic question to deepen understanding>",
  "conceptsCovered": ["<concept 1>", "<concept 2>"],
  "conceptsMissing": ["<concept 1>", "<concept 2>"],
  "encouragement": "<motivating 1-sentence message personalised to their effort>"
}

Scoring rubric: accuracy (30pts), completeness (25pts), clarity/simplicity (25pts), analogies used (20pts).
Include at least 1 strength, 1 gap, and 1 hint in feedback array. Be honest — gaps help the student grow.`;

    const msgs: GroqMessage[] = [
      ...conversation.map(m=>({
        role: (m.role==="ai"?"assistant":"user") as "assistant"|"user",
        content: m.content
      })),
      {role:"user", content:explanation}
    ];

    try {
      const raw = await callGroq(msgs, systemPrompt, "llama-3.3-70b-versatile", 800);
      let parsed: FeedbackResult;
      try {
        const clean = raw.replace(/```json|```/g,"").trim();
        // Extract JSON if wrapped in other text
        const jsonMatch = clean.match(/\{[\s\S]*\}/);
        parsed = JSON.parse(jsonMatch?.[0] ?? clean);
      } catch {
        parsed = {
          masteryScore:50,
          summary:"Your explanation shows some understanding — let's dig deeper!",
          feedback:[{type:"hint",text:"Try to break it down into smaller steps and use an everyday analogy."}],
          followUpQuestion:"Can you explain this concept using an analogy from real life?",
          conceptsCovered:[],
          conceptsMissing:[],
          encouragement:"Great effort — keep going!"
        };
      }
      setFeedback(parsed);
      setPhase("feedback");
      // Save to session history
      setSessionHistory(prev => [...prev, { topic, score: parsed.masteryScore, round, timestamp: new Date() }]);
    } catch(err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg.includes("VITE_GROQ_API_KEY") 
        ? "⚠️ No API key found. Add VITE_GROQ_API_KEY to your .env file." 
        : `Error: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeepDive = async () => {
    if (!deepDiveInput.trim()||isLoading) return;
    const q = deepDiveInput.trim();
    setDeepDiveInput("");
    setIsLoading(true);
    setDeepDiveResponse("");
    try {
      const resp = await callGroq(
        [{role:"user",content:q}],
        `You are a Socratic tutor. The student is learning "${topic}". Answer their question concisely using simple analogies (max 150 words). End with one thought-provoking follow-up question.`
      );
      setDeepDiveResponse(resp);
    } catch(err) {
      setDeepDiveResponse(`Could not connect: ${err instanceof Error?err.message:"unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTryAgain = () => {
    const followUp = feedback?.followUpQuestion??"";
    setRound(r=>r+1);
    setFeedback(null);
    setDeepDiveResponse("");
    setDeepDiveInput("");
    setExpandedSection("strengths");
    setError(null);
    setConversation(prev=>[...prev,{
      role:"ai",
      content:`Round ${round+1}! ${followUp?`New challenge: **${followUp}**\n\nNow try explaining the whole concept again with this in mind.`:"Try explaining again — this time fill the gaps we found."}`,
      timestamp:new Date()
    }]);
    setPhase("teaching");
  };

  const resetAll = () => {
    setPhase("setup");setTopic("");setTopicInput("");
    setConversation([]);setRound(1);setFeedback(null);
    setDeepDiveResponse("");setError(null);
  };

  // ── SETUP ──────────────────────────────────────────────────────────────────
  if (phase==="setup") return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar isLoggedIn user={{name:"Learner",xp:2450,streak:12,plan:"free"}}/>
      {/* History Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        <ToolHistorySidebar
          toolKey="feynman"
          onNew={handleNewSession}
          onSelect={handleSelectSession}
          activeId={activeSessionId}
        />
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-10">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-500/20">
              <Brain className="h-10 w-10 text-white"/>
            </div>
            <h1 className="text-4xl font-bold mb-3">Feynman Mode</h1>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">
              The fastest way to truly understand anything — teach it to an AI, discover your gaps, master it.
            </p>
            <Badge variant="secondary" className="mt-3 gap-1">
              <Zap className="h-3 w-3 text-amber-500"/> Powered by Groq · Llama 3.3 70B
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              {icon:BookOpen,label:"1. Pick a Topic",desc:"Choose what to master",color:"bg-blue-500/10 text-blue-500"},
              {icon:MessageSquare,label:"2. Teach the AI",desc:"Explain in simple terms",color:"bg-white/500/10 text-white/500"},
              {icon:Target,label:"3. Fill the Gaps",desc:"Get pinpoint AI feedback",color:"bg-white/10 text-white/60"},
            ].map(s=>(
              <div key={s.label} className="text-center p-4 rounded-none border border-border bg-card">
                <div className={cn("w-10 h-10 rounded-none flex items-center justify-center mx-auto mb-2",s.color)}>
                  <s.icon className="h-5 w-5"/>
                </div>
                <p className="font-semibold text-sm">{s.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-card rounded-none border border-border p-6 space-y-4">
            <label className="font-semibold text-sm">What concept do you want to master?</label>
            <div className="flex gap-2">
              <FileAttachButton />
              <input
                className="flex-1 px-4 py-3 rounded-none border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g. Photosynthesis, Newton's Second Law... or attach notes"
                value={topicInput}
                onChange={e=>setTopicInput(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&handleStartSession()}
              />
              {buildAIContext().length > 0 && !topicInput.trim() && (
                <button onClick={handleStartSession}
                  className="w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-80"
                  style={{ background: "rgba(212,175,90,0.1)", border: "1px solid rgba(212,175,90,0.35)", color: "var(--pz-gold, #d4af5a)" }}>
                  ⚡ Start Feynman on "{getActiveSource()?.name?.replace(/\.\w+$/, "") ?? "Active Source"}"
                </button>
              )}
              <Button className="bg-gradient-to-r from-red-500 to-orange-500 text-white hover:opacity-90 px-6" onClick={handleStartSession} disabled={!topicInput.trim()&&!pendingFile&&buildAIContext().length===0}>
                Start <ChevronRight className="h-4 w-4 ml-1"/>
              </Button>
            </div>
            {pendingFile && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-none text-xs">
                <span className="text-red-400">📎</span>
                <span className="font-medium text-red-300 truncate">{pendingFile.name}</span>
                <span className="text-muted-foreground ml-1">— will be used as reference during session</span>
                <button onClick={()=>setPendingFile(null)} className="ml-auto text-muted-foreground hover:text-foreground">×</button>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Quick picks:</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_TOPICS.map(t=>(
                  <button key={t} onClick={()=>setTopicInput(t)}
                    className={cn("text-xs px-3 py-1.5 rounded-none border transition-all",
                      topicInput===t?"bg-primary text-primary-foreground border-primary":"border-border hover:border-primary hover:text-primary")}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Session history */}
          {sessionHistory.length > 0 && (
            <div className="bg-card rounded-none border border-border p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-sm">📈 Recent Sessions</p>
                <button onClick={() => setShowHistory(s => !s)}
                  className="text-xs text-muted-foreground hover:text-foreground">
                  {showHistory ? "Hide" : "Show all"}
                </button>
              </div>
              <div className="space-y-2">
                {(showHistory ? sessionHistory : sessionHistory.slice(0, 3)).map((h, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 bg-muted/40 rounded-none">
                    <div className={cn(
                      "w-8 h-8 rounded-none flex items-center justify-center text-sm font-bold text-white",
                      h.score >= 80 ? "bg-white" : h.score >= 60 ? "bg-amber-500" : "bg-red-500"
                    )}>
                      {h.score}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{h.topic}</p>
                      <p className="text-xs text-muted-foreground">Round {h.round} · {h.timestamp.toLocaleDateString()}</p>
                    </div>
                    <button onClick={() => setTopicInput(h.topic)}
                      className="text-xs text-primary hover:underline shrink-0">
                      Retry
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
      </div>
    </main>
  </div>
</div>
  );

  // ── TEACHING ───────────────────────────────────────────────────────────────
  if (phase==="teaching") return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar isLoggedIn user={{name:"Learner",xp:2450,streak:12,plan:"free"}}/>
      <main className="flex-1 flex flex-col max-w-3xl mx-auto w-full p-4 gap-4">
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-none bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
              <Brain className="h-5 w-5 text-white"/>
            </div>
            <div>
              <h2 className="font-bold text-lg">{topic}</h2>
              <p className="text-xs text-muted-foreground">Round {round} · Feynman Mode</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={resetAll}><X className="h-4 w-4 mr-1"/>End</Button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-none p-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-4 min-h-0 max-h-[52vh]">
          {conversation.map((msg,i)=>(
            <div key={i} className={cn("flex",msg.role==="user"?"justify-end":"justify-start")}>
              {msg.role==="ai"&&(
                <div className="w-8 h-8 rounded-none bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                  <Brain className="h-4 w-4 text-white"/>
                </div>
              )}
              {msg.role==="ai" ? (
                <MathRenderer content={msg.content} className={cn("max-w-[80%] rounded-none px-4 py-3 text-sm","bg-card border border-border rounded-tl-sm")}/>
              ) : (
                <div className={cn("max-w-[80%] rounded-none px-4 py-3 text-sm leading-relaxed","bg-primary text-primary-foreground rounded-tr-sm")}>
                  {msg.content}
                </div>
              )}
            </div>
          ))}
          {isLoading&&(
            <div className="flex justify-start">
              <div className="w-8 h-8 rounded-none bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center mr-2 flex-shrink-0">
                <Brain className="h-4 w-4 text-white"/>
              </div>
              <div className="bg-card border border-border rounded-none rounded-tl-sm px-4 py-3">
                <div className="flex gap-1">
                  {[0,1,2].map(i=><div key={i} className="w-2 h-2 rounded-none bg-muted-foreground animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}
                </div>
              </div>
            </div>
          )}
          <div ref={chatBottomRef}/>
        </div>

        <div className="bg-card rounded-none border border-border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex bg-muted rounded-none p-1 gap-1">
              {(["text","voice"] as const).map(m=>(
                <button key={m} onClick={()=>setInputMode(m)}
                  className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-none text-xs font-medium transition-all",
                    inputMode===m?"bg-background shadow text-foreground":"text-muted-foreground")}>
                  {m==="text"?<MessageSquare className="h-3.5 w-3.5"/>:<Mic className="h-3.5 w-3.5"/>}
                  {m==="text"?"Text":"Voice"}
                </button>
              ))}
            </div>
            <span className="text-xs text-muted-foreground ml-auto">No jargon — explain simply!</span>
          </div>

          {inputMode==="text"?(
            <div className="space-y-1">
              <div className="flex gap-2 items-end">
                <Textarea
                  placeholder={`Explain "${topic}" in your own words...`}
                  value={userInput}
                  onChange={e=>setUserInput(e.target.value)}
                  className="min-h-[80px] max-h-[200px] resize-none text-sm"
                  onKeyDown={e=>{if(e.key==="Enter"&&(e.metaKey||e.ctrlKey))handleSubmitExplanation();}}
                />
                <Button className="bg-gradient-to-r from-red-500 to-orange-500 text-white hover:opacity-90 h-10 px-4"
                  onClick={handleSubmitExplanation} disabled={!userInput.trim()||isLoading}>
                  <Send className="h-4 w-4"/>
                </Button>
              </div>
              {userInput.length > 0 && <p className="text-xs text-muted-foreground text-right">{userInput.length} chars · Ctrl+Enter to submit</p>}
            </div>
          ):(
            <div className="flex flex-col items-center gap-3 py-4">
              <button onClick={isRecording?stopRecording:startRecording}
                className={cn("w-16 h-16 rounded-none flex items-center justify-center transition-all shadow-lg",
                  isRecording?"bg-red-500 shadow-red-500/30 animate-pulse scale-110":"bg-gradient-to-br from-red-500 to-orange-500 hover:scale-105")}>
                {isRecording?<MicOff className="h-7 w-7 text-white"/>:<Mic className="h-7 w-7 text-white"/>}
              </button>
              <p className="text-sm text-muted-foreground">{isRecording?"Recording… tap to stop":"Tap to start speaking"}</p>
              {userInput&&(
                <div className="w-full bg-muted rounded-none p-3 text-sm">
                  {userInput}
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="outline" onClick={()=>setUserInput("")} className="h-7 text-xs">Clear</Button>
                    <Button size="sm" className="h-7 text-xs bg-gradient-to-r from-red-500 to-orange-500 text-white" onClick={handleSubmitExplanation}>Submit</Button>
                  </div>
                </div>
              )}
            </div>
          )}
         <p className="text-xs text-muted-foreground">⌘+Enter to submit</p>
        </div>
      </main>
    </div>
  );

  // ── FEEDBACK ───────────────────────────────────────────────────────────────
  if (phase==="feedback"&&feedback) {
    const strengths = feedback.feedback.filter(f=>f.type==="strength");
    const gaps = feedback.feedback.filter(f=>f.type==="gap");
    const hints = feedback.feedback.filter(f=>f.type==="hint");
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar isLoggedIn user={{name:"Learner",xp:2450,streak:12,plan:"free"}}/>
        <main className="flex-1 max-w-3xl mx-auto w-full p-4 pb-8 space-y-4">
          <div className="flex items-center justify-between pt-2">
            <h2 className="font-bold text-lg">{topic} — Feedback</h2>
            <Badge variant="secondary">Round {round}</Badge>
          </div>

          {/* Mastery score */}
          <div className="bg-card rounded-none border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Mastery Score</p>
                <div className={cn("text-5xl font-bold mt-1",masteryColor(feedback.masteryScore))}>
                  {feedback.masteryScore}<span className="text-2xl">%</span>
                </div>
                <Badge className={cn("mt-2 text-white",masteryBg(feedback.masteryScore))}>
                  {masteryLabel(feedback.masteryScore)}
                </Badge>
              </div>
              <div className="w-24 h-24 relative">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--border))" strokeWidth="10"/>
                  <circle cx="50" cy="50" r="40" fill="none"
                    stroke={feedback.masteryScore>=80?"#10b981":feedback.masteryScore>=60?"#f59e0b":"#ef4444"}
                    strokeWidth="10"
                    strokeDasharray={`${feedback.masteryScore*2.51} 251`}
                    strokeLinecap="round"/>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Trophy className={cn("h-8 w-8",masteryColor(feedback.masteryScore))}/>
                </div>
              </div>
            </div>
            <MathRenderer content={`"${feedback.summary}"`} className="text-sm text-muted-foreground italic" />
            <Progress value={feedback.masteryScore} className="mt-4 h-2"/>
          </div>

          {/* Concepts */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 border border-emerald-500/20 rounded-none p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-white/60"/>
                <span className="text-sm font-semibold text-white/60">Covered</span>
              </div>
              {feedback.conceptsCovered.length>0
                ?feedback.conceptsCovered.map(c=><span key={c} className="inline-block bg-white/10 text-emerald-700 dark:text-emerald-400 text-xs rounded-none px-2 py-0.5 mr-1 mb-1">{c}</span>)
                :<p className="text-xs text-muted-foreground">None identified yet</p>}
            </div>
            <div className="bg-red-500/5 border border-red-500/20 rounded-none p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-red-500"/>
                <span className="text-sm font-semibold text-red-500">Missing</span>
              </div>
              {feedback.conceptsMissing.length>0
                ?feedback.conceptsMissing.map(c=><span key={c} className="inline-block bg-red-500/10 text-red-700 dark:text-red-400 text-xs rounded-none px-2 py-0.5 mr-1 mb-1">{c}</span>)
                :<p className="text-xs text-muted-foreground">Nothing critical!</p>}
            </div>
          </div>

          {/* Detailed feedback */}
          <div className="space-y-2">
            {[
              {key:"strengths",label:"Strengths",icon:Star,items:strengths,color:"text-amber-500",bg:"bg-amber-500/5 border-amber-500/20"},
              {key:"gaps",label:"Knowledge Gaps",icon:AlertCircle,items:gaps,color:"text-red-500",bg:"bg-red-500/5 border-red-500/20"},
              {key:"hints",label:"Hints & Suggestions",icon:Lightbulb,items:hints,color:"text-blue-500",bg:"bg-blue-500/5 border-blue-500/20"},
            ].filter(s=>s.items.length>0).map(section=>(
              <div key={section.key} className={cn("rounded-none border overflow-hidden",section.bg)}>
                <button className="w-full flex items-center justify-between p-4"
                  onClick={()=>setExpandedSection(expandedSection===section.key?null:section.key)}>
                  <div className="flex items-center gap-2">
                    <section.icon className={cn("h-4 w-4",section.color)}/>
                    <span className="font-semibold text-sm">{section.label}</span>
                    <Badge variant="secondary" className="text-xs">{section.items.length}</Badge>
                  </div>
                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform",expandedSection===section.key&&"rotate-180")}/>
                </button>
                {expandedSection===section.key&&(
                  <div className="px-4 pb-4 space-y-2">
                    {section.items.map((item,i)=>(
                      <div key={i} className="flex gap-2 text-sm">
                        <span className={cn("mt-0.5 flex-shrink-0",section.color)}>•</span>
                        <MathRenderer content={item.text} className="text-sm" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Challenge + Deep dive */}
          <div className="bg-card border border-border rounded-none p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-none bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                <Zap className="h-4 w-4 text-white"/>
              </div>
              <span className="font-semibold text-sm">AI Challenge Question</span>
            </div>
            <MathRenderer content={`"${feedback.followUpQuestion}"`} className="text-sm font-medium mb-4 italic" />
            <div className="flex gap-2">
              <input
                className="flex-1 px-3 py-2 rounded-none border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Answer or ask a follow-up..."
                value={deepDiveInput}
                onChange={e=>setDeepDiveInput(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&handleDeepDive()}
              />
              <Button size="sm" onClick={handleDeepDive} disabled={!deepDiveInput.trim()||isLoading}
                className="bg-gradient-to-r from-red-500 to-orange-500 text-white">
                {isLoading
                  ?<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-none animate-spin"/>
                  :<Send className="h-4 w-4"/>}
              </Button>
            </div>
            {deepDiveResponse&&(
              <div className="mt-3 bg-muted rounded-none p-3">
                <MathRenderer content={deepDiveResponse} className="text-sm" />
              </div>
            )}
          </div>

          {/* Encouragement */}
          <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-orange-500/20 rounded-none p-4">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-orange-500"/>
              <span className="text-sm font-semibold text-orange-500">PrepZap Says</span>
            </div>
            <MathRenderer content={feedback.encouragement} className="text-sm" />
          </div>

          <div className="flex gap-3">
            <Button onClick={handleTryAgain} className="flex-1 bg-gradient-to-r from-red-500 to-orange-500 text-white hover:opacity-90">
              <RotateCcw className="h-4 w-4 mr-2"/>Try Again (Round {round+1})
            </Button>
            <Button variant="outline" onClick={resetAll}>New Topic</Button>
          </div>

          {round>1&&(
            <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-none">
              <TrendingUp className="h-4 w-4 text-white/60"/>
              <span className="text-sm">Round {round} complete! Keep pushing. 💪</span>
            </div>
          )}
        </main>
      </div>
    </div>
    );
  }
  return null;
}
