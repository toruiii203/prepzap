import { ChatBubbleSkeleton } from "@/components/SkeletonLoader";
import { buildAIContext, buildImageMessages, getActiveSource } from "@/lib/sourceContext";
import { GlobalContextBar } from "@/components/GlobalContextBar";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send, Sparkles, BookOpen, RotateCcw, Copy, ThumbsUp, ThumbsDown,
  ChevronDown, Bot, User, Layers, Zap, HelpCircle, FileText, Brain,
  PanelLeftClose, PanelLeftOpen, Plus, Sun, Moon, X, Timer,
  Pause, Play, SkipForward, Check, ImageIcon, FileType, Hash,
  Clock, Trash2, MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { callGroq, callGroqWithImages, type GroqMessage } from "@/lib/groq";
import { MathRenderer } from "@/components/MathRenderer";
import { useToolHistory, ToolHistoryPanel, HistoryButton } from "@/components/ToolHistory";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  mode?: TutorMode;
  liked?: boolean | null;
  attachedFile?: AttachedFile;
}

interface AttachedFile {
  name: string;
  type: "pdf" | "image" | "txt";
  size: string;
  content?: string;
}

interface ChatSession {
  id: string;
  title: string;
  timestamp: Date;
  messages: Message[];
  model: ModelId;
}

type TutorMode = "explain" | "quiz" | "analogy" | "eli5" | "debate" | "summary";
type ModelId = "google/gemini-2.0-flash-exp:free" | "claude-3-5-sonnet" | "gpt-4o";

// ─── Constants ────────────────────────────────────────────────────────────────
const MODELS: { id: string; label: string; provider: string; badge: string; badgeColor: string; routerModel: string }[] = [
  { id: "google/gemini-2.0-flash-exp:free",  label: "Llama 3.1 8B",    provider: "OpenRouter", badge: "Fast",     badgeColor: "bg-amber-500/10 text-amber-600 border-amber-500/20",   routerModel: "google/gemini-2.0-flash-exp:free" },
  { id: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B",   provider: "OpenRouter", badge: "Balanced", badgeColor: "bg-violet-500/10 text-violet-600 border-violet-500/20", routerModel: "meta-llama/llama-3.3-70b-instruct:free" },
  { id: "google/gemini-2.0-flash-exp:free",        label: "Gemini 2.0 Flash", provider: "OpenRouter", badge: "Smart",    badgeColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", routerModel: "google/gemini-2.0-flash-exp:free" },
];

const TUTOR_MODES: {
  id: TutorMode; label: string; icon: React.ElementType;
  desc: string; color: string; prompt: string;
}[] = [
  { id: "explain", label: "Explain", icon: BookOpen, desc: "First-principles explanation", color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    prompt: "Give a clear, first-principles explanation with structure and real examples. Use \\( LaTeX \\) for math. Build from fundamentals up." },
  { id: "eli5", label: "ELI5", icon: Sparkles, desc: "Explain like I'm 5", color: "bg-pink-500/10 text-pink-500 border-pink-500/20",
    prompt: "Explain like the person is 5 years old. Use extremely simple words, fun analogies, and zero jargon. Make it playful." },
  { id: "analogy", label: "Analogy", icon: Layers, desc: "Learn via metaphors", color: "bg-white/500/10 text-white/500 border-purple-500/20",
    prompt: "Teach using 2-3 creative, memorable analogies. Make them vivid and relatable to everyday life." },
  { id: "quiz", label: "Quiz Me", icon: Brain, desc: "Test your understanding", color: "bg-white/10 text-white/60 border-emerald-500/20",
    prompt: "Generate 3 progressively harder quiz questions. Ask them one at a time. After the student answers, give feedback then move to the next." },
  { id: "debate", label: "Devil's Advocate", icon: Zap, desc: "Challenge assumptions", color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    prompt: "Challenge the conventional wisdom. Present counterarguments, edge cases, and nuanced perspectives the student might not have considered." },
  { id: "summary", label: "Summarize", icon: FileText, desc: "Key points only", color: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
    prompt: "Give a tight bullet-point summary of the most important concepts. Max 7 bullets. Then list 3 things worth exploring further." },
];

const SUGGESTED_QUESTIONS = [
  "How does photosynthesis work?",
  "Explain quantum entanglement simply",
  "What causes inflation?",
  "How does the immune system fight viruses?",
  "What is the Dunning-Kruger effect?",
  "Explain Bayes' theorem with an example",
];

const VISUAL_QUICK_ACTIONS = [
  { label: "📊 Show me a comparison chart", prompt: "Create a detailed comparison chart (using markdown table) comparing the key concepts we've discussed, with clear categories and explanations for each row." },
  { label: "🗺️ Concept mind map", prompt: "Create a structured text-based mind map showing the relationships between the key concepts in this topic. Use indentation and symbols to show hierarchy." },
  { label: "📈 Show trends & patterns", prompt: "Explain the key trends and patterns in this topic using a visual ASCII chart or structured diagram, then explain what each part means." },
  { label: "🔬 Step-by-step diagram", prompt: "Break this topic down into a clear step-by-step process diagram using numbered steps, arrows (→), and brief explanations for each stage." },
];

const POMODORO_PRESETS = [
  { label: "25 min", work: 25 },
  { label: "50 min", work: 50 },
];


// ─── Pomodoro Widget ─────────────────────────────────────────────────────────
function PomodoroWidget({ darkMode }: { darkMode: boolean }) {
  const [workMins, setWorkMins] = useState(25);
  const [phase, setPhase] = useState<"work" | "short" | "long">("work");
  const [secs, setSecs] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const { entries: historyEntries, save: saveHistory, remove: removeHistory, clear: clearHistory } = useToolHistory("ai-tutor");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const SHORT_BREAK = 5;
  const LONG_BREAK = 15;

  const phaseConfig = {
    work:  { label: "Focus",       color: "text-rose-500",    bg: "bg-rose-500",    mins: workMins },
    short: { label: "Short Break", color: "text-white/60", bg: "bg-white", mins: SHORT_BREAK },
    long:  { label: "Long Break",  color: "text-blue-500",    bg: "bg-blue-500",    mins: LONG_BREAK },
  };
  const cfg = phaseConfig[phase];
  const total = cfg.mins * 60;
  const pct = ((total - secs) / total) * 100;
  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");

  const playAlarm = useCallback(() => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      [0, 0.35, 0.7].forEach(delay => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 880; osc.type = "sine";
        gain.gain.setValueAtTime(0, ctx.currentTime + delay);
        gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + delay + 0.05);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + delay + 0.4);
        osc.start(ctx.currentTime + delay); osc.stop(ctx.currentTime + delay + 0.5);
      });
    } catch (_) {}
  }, []);

  const advance = useCallback((currentPhase: "work" | "short" | "long", currentSessions: number) => {
    playAlarm();
    setRunning(false);
    if (currentPhase === "work") {
      const ns = currentSessions + 1;
      setSessions(ns);
      const next = ns % 4 === 0 ? "long" : "short";
      setPhase(next);
      setSecs(phaseConfig[next].mins * 60);
    } else {
      setPhase("work");
      setSecs(workMins * 60);
    }
  }, [playAlarm, workMins]);

  useEffect(() => {
    if (!running) { if (intervalRef.current) clearInterval(intervalRef.current); return; }
    let localPhase = phase;
    let localSessions = sessions;
    intervalRef.current = setInterval(() => {
      setSecs(s => {
        if (s <= 1) { advance(localPhase, localSessions); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  const reset = () => { setRunning(false); setSecs(workMins * 60); setPhase("work"); setSessions(0); };

  const skip = () => {
    setRunning(false);
    if (phase === "work") {
      const ns = sessions + 1; setSessions(ns);
      const next = ns % 4 === 0 ? "long" : "short";
      setPhase(next); setSecs(phaseConfig[next].mins * 60);
    } else { setPhase("work"); setSecs(workMins * 60); }
  };

  return (
    <div className={cn(
      "fixed bottom-6 right-6 z-50 rounded-none border shadow-xl transition-all duration-300 overflow-hidden backdrop-blur-md",
      darkMode ? "bg-slate-900/95 border-slate-700" : "bg-white/95 border-slate-200"
    )}>
      {!expanded ? (
        <button onClick={() => setExpanded(true)}
          className={cn("flex items-center gap-2 px-4 py-2.5 text-sm font-mono font-semibold transition-colors",
            running ? cfg.color : "text-muted-foreground hover:text-foreground")}>
          <Timer className="h-4 w-4" />
          <span>{mm}:{ss}</span>
          {running && <div className={cn("w-1.5 h-1.5 rounded-none animate-pulse", cfg.bg)} />}
        </button>
      ) : (
        <div className="p-4 space-y-3 w-60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer className={cn("h-4 w-4", cfg.color)} />
              <span className={cn("text-xs font-semibold", cfg.color)}>{cfg.label}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">{sessions} 🍅</span>
              <button onClick={() => setExpanded(false)} className="p-1 rounded-none hover:bg-muted text-muted-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="flex justify-center">
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                <circle cx="48" cy="48" r="40" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/30" />
                <circle cx="48" cy="48" r="40" fill="none" strokeWidth="6"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - pct / 100)}`}
                  strokeLinecap="round" className={cn("transition-all duration-1000", cfg.color)} stroke="currentColor" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono text-xl font-bold">{mm}:{ss}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            {POMODORO_PRESETS.map(p => (
              <button key={p.label}
                onClick={() => { setWorkMins(p.work); setSecs(p.work * 60); setPhase("work"); setRunning(false); }}
                className={cn("flex-1 text-xs py-1.5 rounded-none border transition-colors",
                  workMins === p.work ? "border-primary text-primary bg-primary/5" : "border-border text-muted-foreground hover:text-foreground")}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={reset} className="p-2 rounded-none border border-border text-muted-foreground hover:text-foreground flex-1 flex justify-center">
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setRunning(r => !r)}
              className={cn("flex-[2] py-2 rounded-none font-medium text-sm flex items-center justify-center gap-1.5 transition-all",
                running ? "bg-rose-500/10 text-rose-500 border border-rose-500/20" : "bg-primary text-primary-foreground")}>
              {running ? <><Pause className="h-3.5 w-3.5" />Pause</> : <><Play className="h-3.5 w-3.5" />Start</>}
            </button>
            <button onClick={skip} className="p-2 rounded-none border border-border text-muted-foreground hover:text-foreground flex-1 flex justify-center">
              <SkipForward className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── History Sidebar ──────────────────────────────────────────────────────────
function HistorySidebar({
  sessions, activeId, onSelect, onNew, onDelete, open, darkMode
}: {
  sessions: ChatSession[];
  activeId: string | null;
  onSelect: (s: ChatSession) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  open: boolean;
  darkMode: boolean;
}) {
  return (
    <aside className={cn(
      "h-full flex flex-col border-r transition-all duration-300 overflow-hidden flex-shrink-0",
      "md:relative md:translate-x-0",
      open ? "fixed inset-y-0 left-0 z-50 w-64 md:w-64 md:static" : "w-0",
      darkMode ? "border-slate-700 bg-[#0a0a0a]" : "border-border bg-[#0a0a0a]",
    )}>
      <div className="flex-1 overflow-hidden flex flex-col min-w-64">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">History</span>
          <button onClick={onNew}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 px-2 py-1 rounded-none hover:bg-primary/10 transition-colors">
            <Plus className="h-3 w-3" />New
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8 px-2 leading-relaxed">
              No sessions yet.<br />Start a conversation!
            </p>
          )}
          {sessions.map(s => (
            <div key={s.id}
              className={cn(
                "group flex items-start gap-2 p-2.5 rounded-none cursor-pointer transition-all",
                activeId === s.id
                  ? "bg-primary/10 border border-primary/20"
                  : "hover:bg-muted border border-transparent"
              )}
              onClick={() => onSelect(s)}>
              <MessageSquare className={cn("h-3.5 w-3.5 mt-0.5 flex-shrink-0",
                activeId === s.id ? "text-primary" : "text-muted-foreground")} />
              <div className="flex-1 min-w-0">
                <p className={cn("text-xs font-medium truncate leading-tight",
                  activeId === s.id ? "text-primary" : "text-foreground")}>{s.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" />
                  {s.timestamp.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </p>
              </div>
              <button onClick={e => { e.stopPropagation(); onDelete(s.id); }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded-none hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-all flex-shrink-0">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AiTutor() {
  const [darkMode, setDarkMode] = useState(false);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const { entries: historyEntries, save: saveHistory, remove: removeHistory, clear: clearHistory } = useToolHistory("ai-tutor");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const raw = localStorage.getItem("pz_history_aitutor");
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return parsed.map((s: ChatSession) => ({ ...s, timestamp: new Date(s.timestamp), messages: s.messages.map((m: Message) => ({ ...m, timestamp: new Date(m.timestamp) })) }));
    } catch { return []; }
  });
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeMode, setActiveMode] = useState<TutorMode>("explain");
  const [showModes, setShowModes] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeModel, setActiveModel] = useState<string>("google/gemini-2.0-flash-exp:free");
  const [showModelMenu, setShowModelMenu] = useState(false);

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    const handle = () => { setShowModelMenu(false); };
    document.addEventListener("click", handle);
    return () => document.removeEventListener("click", handle);
  }, []);

  const currentMode = TUTOR_MODES.find(m => m.id === activeMode)!;
  const activeModelInfo = MODELS.find(m => m.id === activeModel)!;

  const saveToSession = useCallback((msgs: Message[], model: ModelId, sid: string) => {
    setSessions(prev => {
      const updated = prev.map(s => s.id === sid ? { ...s, messages: msgs, model } : s);
      try { localStorage.setItem("pz_history_aitutor", JSON.stringify(updated.slice(0, 20))); } catch {}
      return updated;
    });
  }, []);

  useEffect(() => {
    if (activeSessionId) saveToSession(messages, activeModel, activeSessionId);
  }, [messages, activeModel, activeSessionId, saveToSession]);

  const createNewSession = () => {
    const id = Date.now().toString();
    const s: ChatSession = { id, title: "New conversation", timestamp: new Date(), messages: [], model: activeModel };
    setSessions(prev => {
      const updated = [s, ...prev];
      try { localStorage.setItem("pz_history_aitutor", JSON.stringify(updated.slice(0, 20))); } catch {}
      return updated;
    });
    setActiveSessionId(id);
    setMessages([]);
    setError(null);
  };

  const selectSession = (s: ChatSession) => {
    setActiveSessionId(s.id);
    setMessages(s.messages);
    setActiveModel(s.model);
    setError(null);
  };

  const deleteSession = (id: string) => {
    setSessions(prev => {
      const updated = prev.filter(s => s.id !== id);
      try { localStorage.setItem("pz_history_aitutor", JSON.stringify(updated)); } catch {}
      return updated;
    });
    if (activeSessionId === id) { setMessages([]); setActiveSessionId(null); }
  };

  const buildSystemPrompt = (mode: TutorMode) => {
    const m = TUTOR_MODES.find(x => x.id === mode)!;
    const sourceCtx = buildAIContext();
    return `You are Studenius AI Tutor — an expert educator who adapts to any subject. Mode: "${m.label}".

Instruction: ${m.prompt}
${sourceCtx ? `\nIMPORTANT: The student has loaded study sources. Base your answers on the source content below and cite specific details from it where relevant.${sourceCtx}` : ""}
Formatting:
- **bold** for key terms and section headers
- Use \\( ... \\) for inline math and \\[ ... \\] for display math
- Bullet lists or numbered steps where helpful
- When asked for a chart, table, diagram, or visual — use markdown tables, ASCII diagrams, or structured text visuals. Always follow with a clear explanation.
- Be accurate, engaging, and appropriately concise
- End with a thought-provoking follow-up question when relevant`;
  };

  const sendMessage = async (overrideInput?: string) => {
    const text = (overrideInput ?? input).trim();
    const hasSourceCtx = buildAIContext().length > 0;
    if (!text && !hasSourceCtx) return;
    if (isLoading) return;

    let sid = activeSessionId;
    if (!sid) {
      const id = Date.now().toString();
      const title = text.slice(0, 40) || "New conversation";
      const newSess: ChatSession = { id, title, timestamp: new Date(), messages: [], model: activeModel };
      setSessions(prev => [newSess, ...prev]);
      setActiveSessionId(id);
      sid = id;
    } else {
      setSessions(prev => prev.map(s =>
        s.id === sid && s.title === "New conversation" ? { ...s, title: text.slice(0, 40) || s.title } : s
      ));
    }

    setInput("");
    setError(null);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    const history: GroqMessage[] = [...messages, userMsg].map(m => ({
      role: (m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
      content: m.role === "user" && m.attachedFile
        ? `${m.content}\n\n[Attached ${m.attachedFile.type} file: "${m.attachedFile.name}"${m.attachedFile.content ? `.\n\nFile content:\n${m.attachedFile.content.slice(0, 6000)}` : ""}]`
        : m.content,
    }));

    try {
      const imageBlocks = buildImageMessages();
      const response = imageBlocks.length > 0
        ? await callGroqWithImages(
            history.map(m => typeof m.content === "string" ? m.content : "").join("\n"),
            imageBlocks,
            buildSystemPrompt(activeMode),
            2000
          )
        : await callGroq(history, buildSystemPrompt(activeMode), activeModelInfo.routerModel, 2000);
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response,
        timestamp: new Date(),
        mode: activeMode,
        liked: null,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg.includes("VITE_GROQ_API_KEY")
        ? "⚠️ No API key found. Add VITE_GROQ_API_KEY to your .env file."
        : `Error: ${msg}`);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const copyMessage = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const likeMessage = (id: string, liked: boolean) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, liked } : m));
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="min-h-screen flex flex-col bg-background transition-colors duration-300">
      {/* Desktop Navbar */}
      <div className="hidden md:block">
        <div style={{display:"flex",justifyContent:"flex-end",padding:"6px 16px",borderBottom:"0.5px solid #1A1A1A",background:"rgba(8,8,8,0.5)"}}>
          <HistoryButton count={historyEntries.length} onClick={() => setHistoryOpen(true)} />
        </div>
      </div>
      <div className="hidden md:block" style={{padding:"8px 24px 0"}}><GlobalContextBar compact /></div>

      {/* ── Mobile top bar ── */}
      <div className="md:hidden flex items-center justify-between px-4 h-12 sticky top-0 z-40 bg-background border-b border-border">
        <span className="font-bold text-sm">AI Tutor</span>
        <div className="flex items-center gap-2">
          <GlobalContextBar compact />
          <button onClick={() => setSidebarOpen(o => !o)} className="p-2 text-muted-foreground">
            {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 4rem)" }}>
        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setSidebarOpen(false)} />
        )}

        {/* ── Sidebar ── */}
        <HistorySidebar
          sessions={sessions}
          activeId={activeSessionId}
          onSelect={selectSession}
          onNew={createNewSession}
          onDelete={deleteSession}
          open={sidebarOpen}
          darkMode={darkMode}
        />

        {/* ── Main Panel ── */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden pb-16 md:pb-0">

          {/* ── Inner chat header ── */}
          <div className="hidden md:flex items-center justify-between px-4 py-2.5 border-b border-border">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(o => !o)}
                className="p-2 rounded-none hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
              </button>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-none bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-sm">AI Tutor</h1>
                  <p className="text-xs text-muted-foreground">Studenius · Multi-model</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => setShowModelMenu(o => !o)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-none border border-border bg-card text-xs font-medium transition-all hover:border-primary/40"
                >
                  <span className="hidden sm:inline">{activeModelInfo.label}</span>
                  <span className={cn("px-1.5 py-0.5 rounded-none border text-xs", activeModelInfo.badgeColor)}>
                    {activeModelInfo.badge}
                  </span>
                  <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform", showModelMenu && "rotate-180")} />
                </button>
                {showModelMenu && (
                  <div className="absolute top-full right-0 mt-2 w-56 rounded-none border border-border shadow-xl z-50 overflow-hidden bg-card">
                    {MODELS.map(m => (
                      <button key={m.id}
                        onClick={() => { setActiveModel(m.id); setShowModelMenu(false); }}
                        className={cn(
                          "w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted transition-colors",
                          activeModel === m.id && "bg-primary/5"
                        )}>
                        <div>
                          <p className="text-xs font-semibold">{m.label}</p>

                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn("px-1.5 py-0.5 rounded border text-xs", m.badgeColor)}>{m.badge}</span>
                          {activeModel === m.id && <Check className="h-3 w-3 text-primary" />}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => setDarkMode(d => !d)}
                className={cn(
                  "p-2 rounded-none border transition-all",
                  darkMode
                    ? "bg-slate-800 border-slate-600 text-yellow-400"
                    : "bg-card border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>

              {messages.length > 0 && (
                <Button variant="ghost" size="sm"
                  onClick={() => { setMessages([]); setError(null); setActiveSessionId(null); }}
                  className="text-xs text-muted-foreground">
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />Clear
                </Button>
              )}
            </div>
          </div>

          {/* ── Mode Selector ── */}
          <div className="px-4 py-2 border-b border-border">
            <button
              onClick={() => setShowModes(!showModes)}
              className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors w-full"
            >
              <currentMode.icon className="h-4 w-4" />
              <span>Mode: <span className="text-primary">{currentMode.label}</span></span>
              <span className="text-muted-foreground text-xs hidden sm:inline">— {currentMode.desc}</span>
              <ChevronDown className={cn("h-3.5 w-3.5 ml-auto transition-transform text-muted-foreground", showModes && "rotate-180")} />
            </button>
            {showModes && (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-3 pb-1">
                {TUTOR_MODES.map(mode => (
                  <button key={mode.id}
                    onClick={() => { setActiveMode(mode.id); setShowModes(false); }}
                    className={cn(
                      "flex flex-col items-start p-2.5 rounded-none border text-left transition-all hover:scale-[1.02]",
                      activeMode === mode.id
                        ? cn(mode.color, "ring-2 ring-offset-1 ring-current")
                        : "border-border bg-card text-foreground"
                    )}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <mode.icon className="h-3.5 w-3.5" />
                      <span className="font-semibold text-xs">{mode.label}</span>
                    </div>
                    <span className="text-xs opacity-70 hidden sm:block">{mode.desc}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Error Banner ── */}
          {error && (
            <div className="mx-4 mt-3 bg-red-500/10 border border-red-500/20 rounded-none p-3 text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
              <span className="flex-1">{error}</span>
              <button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
            </div>
          )}

          {/* ── Chat Messages ── */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {isEmpty ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                <div className="w-16 h-16 rounded-none bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mb-4 shadow-lg shadow-violet-500/20">
                  <HelpCircle className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-xl font-bold mb-1">Ask me anything</h2>
                <p className="text-muted-foreground text-sm mb-1 max-w-sm">
                  Switch modes to change how I teach. Upload a file with <span className="font-semibold text-primary">+</span> for context-aware help.
                </p>
                <p className="text-xs text-muted-foreground mb-6">
                  Active model: <span className="font-semibold text-primary">{activeModelInfo.label}</span>
                </p>
                <div className="grid grid-cols-2 gap-2 w-full max-w-md mb-3">
                  {VISUAL_QUICK_ACTIONS.map(a => (
                    <button key={a.label} onClick={() => sendMessage(a.prompt)}
                      className="text-left text-xs p-3 rounded-none border border-border hover:border-primary hover:bg-primary/5 transition-all leading-relaxed font-medium">
                      {a.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2 w-full max-w-md">
                  {buildAIContext().length > 0 && (
                    <div className="mb-6 p-4 rounded-none" style={{ background: "rgba(212,175,90,0.06)", border: "1px solid rgba(212,175,90,0.2)" }}>
                      <p className="text-xs font-semibold mb-3" style={{ color: "var(--pz-gold)" }}>Source active — start instantly:</p>
                      <button
                        onClick={() => sendMessage("Generate a comprehensive summary of the source material")}
                        className="w-full mb-3 py-3 flex items-center justify-center gap-2 text-sm font-bold transition-all hover:opacity-90 active:scale-95"
                        style={{ background: "linear-gradient(135deg, var(--pz-gold), var(--pz-teal))", color: "#0A0A0C", borderRadius: 0 }}>
                        Generate Summary
                      </button>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: "Extract key concepts", icon: "🔑" },
                          { label: "Quiz me on it", icon: "❓" },
                          { label: "Explain the main ideas", icon: <><svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="#E8B923" strokeWidth={1.8} strokeLinecap="round" style={{flexShrink:0}}><path d="M9 21h6M12 3a6 6 0 016 6c0 2.5-1.4 4.7-3.5 5.9l-.5.3V18H10v-2.8l-.5-.3C7.4 13.7 6 11.5 6 9a6 6 0 016-6z"/></svg></> },
                          { label: "Create flashcards", icon: "🃏" },
                        ].map(a => (
                          <button key={a.label}
                            onClick={() => sendMessage(a.label)}
                            className="flex items-center gap-2 px-3 py-2 text-left text-xs transition-all hover:opacity-80"
                            style={{ background: "var(--pz-surface3)", border: "1px solid var(--pz-border)", color: "var(--pz-text-2)" }}>
                            <span>{a.icon}</span>{a.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {SUGGESTED_QUESTIONS.map(q => (
                    <button key={q} onClick={() => sendMessage(q)}
                      className="text-left text-xs p-3 rounded-none border border-border hover:border-primary hover:bg-primary/5 transition-all leading-relaxed">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map(msg => (
                  <div key={msg.id} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>
                    {msg.role === "assistant" && (
                      <div className="w-8 h-8 rounded-none bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-1">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                    )}
                    <div className={cn("max-w-[85%] space-y-1", msg.role === "user" ? "items-end flex flex-col" : "items-start")}>
                      {msg.role === "assistant" && msg.mode && (() => {
                        const m = TUTOR_MODES.find(x => x.id === msg.mode);
                        return m ? (
                          <div className="flex items-center gap-1.5 mb-1">
                            <m.icon className={cn("h-3 w-3", m.color.split(" ")[1])} />
                            <span className={cn("text-xs font-medium", m.color.split(" ")[1])}>{m.label} Mode</span>
                          </div>
                        ) : null;
                      })()}

                      {msg.role === "assistant" ? (
                        <MathRenderer
                          content={msg.content}
                          className={cn("rounded-none px-4 py-3 text-sm", "bg-card border border-border rounded-tl-sm")}
                        />
                      ) : (
                        <div className={cn("rounded-none px-4 py-3 text-sm leading-relaxed", "bg-primary text-primary-foreground rounded-tr-sm")}>
                          {msg.content}
                        </div>
                      )}

                      {msg.role === "assistant" && (
                        <div className="flex items-center gap-1 pt-1">
                          <button onClick={() => copyMessage(msg.id, msg.content)}
                            className="p-1.5 rounded-none hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                            {copiedId === msg.id
                              ? <Check className="h-3.5 w-3.5 text-white/60" />
                              : <Copy className="h-3.5 w-3.5" />}
                          </button>
                          {copiedId === msg.id && <span className="text-xs text-white/60">Copied!</span>}
                          <button onClick={() => likeMessage(msg.id, true)}
                            className={cn("p-1.5 rounded-none hover:bg-muted transition-colors",
                              msg.liked === true ? "text-white/60" : "text-muted-foreground hover:text-foreground")}>
                            <ThumbsUp className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => likeMessage(msg.id, false)}
                            className={cn("p-1.5 rounded-none hover:bg-muted transition-colors",
                              msg.liked === false ? "text-red-500" : "text-muted-foreground hover:text-foreground")}>
                            <ThumbsDown className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                    {msg.role === "user" && (
                      <div className="w-8 h-8 rounded-none bg-primary flex items-center justify-center flex-shrink-0 mt-1">
                        <User className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="px-2 pb-2"><ChatBubbleSkeleton /></div>
                )}
              </>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* ── Input Bar ── */}
          <div className="p-4 border-t border-border">
            <div className="flex gap-2 items-end bg-card rounded-none border border-border p-3 transition-all focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10">
              <textarea
                ref={inputRef}
                placeholder={`Ask anything... (${currentMode.label} · ${activeModelInfo.badge})`}
                value={input}
                onChange={e => setInput(e.target.value)}
                className="flex-1 resize-none bg-transparent text-sm focus:outline-none min-h-[40px] max-h-[150px] leading-relaxed"
                rows={1}
                onInput={e => {
                  const t = e.currentTarget;
                  t.style.height = "auto";
                  t.style.height = t.scrollHeight + "px";
                }}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); sendMessage(); }
                }}
              />

              <Button
                onClick={() => sendMessage()}
                disabled={(!input.trim() && buildAIContext().length === 0 && !getActiveSource()) || isLoading}
                className="bg-gradient-to-r from-violet-500 to-indigo-600 text-white hover:opacity-90 h-9 px-4 rounded-none flex-shrink-0"
              >
                {isLoading
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-none animate-spin" />
                  : <Send className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex justify-between items-center mt-2">
              <p className="text-xs text-muted-foreground">
                Enter to send · Shift+Enter for new line
              </p>
              {input.length > 0 && <p className="text-xs text-muted-foreground">{input.length} chars</p>}
            </div>
          </div>
        </main>
      </div>
      <ToolHistoryPanel entries={historyEntries}
        onSelect={(e) => { setInput(e.prompt); setHistoryOpen(false); }}
        onRemove={removeHistory} onClear={clearHistory}
        open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </div>
  );
}