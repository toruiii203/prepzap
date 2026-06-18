import { useNavigate } from "react-router-dom";
import { SharedSidebar } from "@/components/SharedSidebar";
import React, { useState, useRef, useEffect } from "react";
import { callGroq } from "@/lib/groq";
import { buildAIContext, loadContext, loadLibrary, saveContext } from "@/lib/sourceContext";
import { useToolHistory } from "@/pages/ToolHistory";
import { usePlan } from "@/hooks/usePlan";
import UpgradePrompt, { SoftWarning } from "@/components/UpgradePrompt";

const FOX = {
  neutral:   "/fox/fox-neutral.png",
  happy:     "/fox/fox-happy.png",
  excited:   "/fox/fox-excited.png",
  surprised: "/fox/fox-surprised.png",
  thinking:  "/fox/fox-thinking.png",
  peeking:   "/fox/fox-peeking.png",
  laughing:  "/fox/fox-laughing.png",
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface Message { sender: "user" | "bot"; text: string; }
interface ChatSession { id: string; title: string; messages: Message[]; timestamp: number; }

// ─── Simple Markdown Renderer ─────────────────────────────────────────────────
// Handles **bold**, *italic*, `code`, bullet lists, numbered lists, headings, code blocks.
function RenderBotText({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  const renderInline = (line: string, key: string | number): React.ReactNode => {
    const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
    return (
      <span key={key}>
        {parts.map((part, pi) => {
          if (part.startsWith("**") && part.endsWith("**"))
            return <strong key={pi}>{part.slice(2, -2)}</strong>;
          if (part.startsWith("*") && part.endsWith("*"))
            return <em key={pi}>{part.slice(1, -1)}</em>;
          if (part.startsWith("`") && part.endsWith("`"))
            return <code key={pi} className="bg-black/10 px-1 rounded text-[13px] font-mono">{part.slice(1, -1)}</code>;
          return part;
        })}
      </span>
    );
  };

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.trimStart().startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <pre key={`code-${i}`} className="bg-black/5 border border-black/10 rounded-lg p-3 overflow-x-auto text-[12px] font-mono my-2 whitespace-pre">
          {codeLines.join("\n")}
        </pre>
      );
      i++;
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const cls = level === 1 ? "text-[16px] font-black mt-3 mb-1"
        : level === 2 ? "text-[14px] font-extrabold mt-2 mb-1"
        : "text-[13px] font-bold mt-1";
      elements.push(<p key={`h-${i}`} className={cls}>{renderInline(headingMatch[2], 0)}</p>);
      i++;
      continue;
    }

    // Bullet list
    const bulletMatch = line.match(/^[\s]*[-•]\s+(.+)/);
    if (bulletMatch) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && lines[i].match(/^[\s]*[-•]\s+(.+)/)) {
        const m = lines[i].match(/^[\s]*[-•]\s+(.+)/);
        if (m) items.push(<li key={i} className="ml-1">{renderInline(m[1], i)}</li>);
        i++;
      }
      elements.push(<ul key={`ul-${i}`} className="list-disc list-inside space-y-0.5 my-1">{items}</ul>);
      continue;
    }

    // Numbered list
    const numMatch = line.match(/^[\s]*\d+[.)]\s+(.+)/);
    if (numMatch) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && lines[i].match(/^[\s]*\d+[.)]\s+(.+)/)) {
        const m = lines[i].match(/^[\s]*\d+[.)]\s+(.+)/);
        if (m) items.push(<li key={i} className="ml-1">{renderInline(m[1], i)}</li>);
        i++;
      }
      elements.push(<ol key={`ol-${i}`} className="list-decimal list-inside space-y-0.5 my-1">{items}</ol>);
      continue;
    }

    // Horizontal rule
    if (line.match(/^[-_*]{3,}$/)) {
      elements.push(<hr key={`hr-${i}`} className="border-black/20 my-2" />);
      i++;
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      elements.push(<div key={`sp-${i}`} className="h-2" />);
      i++;
      continue;
    }

    // Normal paragraph
    elements.push(<p key={`p-${i}`} className="leading-relaxed">{renderInline(line, i)}</p>);
    i++;
  }

  return <div className="text-[14px] space-y-0.5">{elements}</div>;
}

// ─── Message Thread ────────────────────────────────────────────────────────────
interface MessageThreadProps {
  messages: Message[];
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

function MessageThread({ messages, isLoading, messagesEndRef }: MessageThreadProps) {
  return (
    <div className="flex flex-col gap-4">
      {messages.map((msg, i) => (
        <div key={i} className={`flex flex-col max-w-[85%] ${msg.sender === "user" ? "self-end items-end" : "self-start items-start"}`}>
          <div className={`p-3 rounded-2xl border-2 border-black ${
            msg.sender === "user"
              ? "bg-[#ae2925] text-white shadow-[2px_2px_0px_#000]"
              : "bg-white text-black shadow-[2px_2px_0px_#000]"
          }`}>
            {msg.sender === "user"
              ? <p className="text-[14px] leading-relaxed whitespace-pre-line">{msg.text}</p>
              : <RenderBotText text={msg.text} />
            }
          </div>
          <span className="text-[10px] text-[#888] mt-1 px-1">{msg.sender === "user" ? "You" : "Rex AI"}</span>
        </div>
      ))}
      {isLoading && (
        <div className="flex flex-col max-w-[80%] self-start">
          <div className="p-3 rounded-2xl border-2 border-black bg-white shadow-[2px_2px_0px_#000] flex items-center gap-2">
            <span className="material-symbols-outlined animate-spin text-[#ae2925] text-[18px]">autorenew</span>
            <span className="text-[13px] font-bold">Rex is thinking...</span>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}

// ─── History Panel ─────────────────────────────────────────────────────────────
interface HistoryPanelProps {
  sessions: ChatSession[];
  currentId: string | null;
  onLoad: (session: ChatSession) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

function HistoryPanel({ sessions, currentId, onLoad, onNew, onDelete }: HistoryPanelProps) {
  const fmt = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const sorted = [...sessions].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="px-5 pt-5 pb-3 shrink-0 border-b-2 border-black/10 flex items-center justify-between">
        <div>
          <h3 className="text-[11px] font-black uppercase tracking-widest text-black/50">Chat History</h3>
          <p className="text-[12px] font-bold text-black/40 mt-0.5">
            {sessions.length} conversation{sessions.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button onClick={onNew}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white border-2 border-black text-[11px] font-bold hover:bg-[#ae2925] transition-colors shadow-[2px_2px_0px_#000]">
          <span className="material-symbols-outlined text-[14px]">add</span>
          New
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-10 gap-3">
            <span className="material-symbols-outlined text-[40px] text-black/20">chat_bubble</span>
            <p className="text-[12px] font-bold text-black/30">No conversations yet.<br />Start asking Rex something!</p>
          </div>
        ) : sorted.map((s) => (
          <div key={s.id}
            className={`group relative border-2 border-black p-3 cursor-pointer transition-all ${
              currentId === s.id
                ? "bg-[#ae2925] shadow-[3px_3px_0px_#000]"
                : "bg-white hover:bg-[#F0EDE0] shadow-[2px_2px_0px_#000]"
            }`}
            onClick={() => onLoad(s)}>
            <p className={`text-[12px] font-extrabold truncate pr-6 ${currentId === s.id ? "text-white" : "text-black"}`}>
              {s.title}
            </p>
            <p className={`text-[10px] font-bold mt-0.5 ${currentId === s.id ? "text-white/70" : "text-black/40"}`}>
              {fmt(s.timestamp)} · {s.messages.length} msgs
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
              className={`absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded ${
                currentId === s.id ? "text-white/70 hover:text-white" : "text-black/30 hover:text-[#ae2925]"
              }`}>
              <span className="material-symbols-outlined text-[14px]">delete</span>
            </button>
          </div>
        ))}
      </div>

      <div className="px-5 py-3 shrink-0 border-t-2 border-black/10">
        <p className="text-[10px] text-black/30 font-bold text-center">Conversations saved locally in your browser</p>
      </div>
    </div>
  );
}

// ─── Storage helpers ──────────────────────────────────────────────────────────
const HISTORY_KEY = "studenius_rex_history";
const loadSessions = (): ChatSession[] => {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch { return []; }
};
const saveSessions = (s: ChatSession[]) => {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(s)); } catch {}
};
const generateTitle = (msgs: Message[]): string => {
  const first = msgs.find((m) => m.sender === "user");
  if (!first) return "New conversation";
  return first.text.length > 42 ? first.text.slice(0, 42) + "…" : first.text;
};

// ─── Main Component ────────────────────────────────────────────────────────────
export default function AITutor() {
  const navigate = useNavigate();
  const { save: saveHistory } = useToolHistory("ai-tutor");
  const { isPro, canUse, remaining, logUsage } = usePlan();
  const [remainingUses, setRemainingUses] = useState<number>(20);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const [activeMode, setActiveMode] = useState("Explain");
  const modes = ["Explain", "ELI5", "Analogy", "Quiz Me", "Devil's Advocate", "Summarize"];

  const [inputVal, setInputVal] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeSource, setActiveSource] = useState<string | null>(null);
  const [activeSourceCount, setActiveSourceCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [foxImg, setFoxImg] = useState(FOX.neutral);

  const [sessions, setSessions] = useState<ChatSession[]>(() => loadSessions());
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showMobileHistory, setShowMobileHistory] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const desktopTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Fox mood
  useEffect(() => {
    remaining("ai_tutor").then(setRemainingUses);
  }, [remaining]);

  useEffect(() => {
    if (isLoading) { setFoxImg(FOX.thinking); return; }
    if (messages.length === 0) { setFoxImg(FOX.neutral); return; }
    const last = messages[messages.length - 1];
    if (last.sender === "bot") setFoxImg(FOX.happy);
  }, [isLoading, messages]);

  // Sync active source on mount and window focus only
  useEffect(() => {
    const syncSource = () => {
      const ctx = loadContext();
      const selectedIds = Array.isArray(ctx) ? ctx : (ctx as any)?.selectedIds || [];
      const libFiles = loadLibrary();
      const activeFiles = libFiles.filter((f: any) => selectedIds.includes(f.id));
      setActiveSourceCount(activeFiles.length);
      if (activeFiles.length === 0) setActiveSource(null);
      else if (activeFiles.length === 1) setActiveSource(activeFiles[0].name);
      else setActiveSource(`${activeFiles[0].name} +${activeFiles.length - 1} more`);
    };
    syncSource();
    window.addEventListener("focus", syncSource);
    return () => window.removeEventListener("focus", syncSource);
  }, []);

  // Re-sync source label after each message without adding new listeners
  useEffect(() => {
    if (messages.length === 0) return;
    const ctx = loadContext();
    const selectedIds = Array.isArray(ctx) ? ctx : (ctx as any)?.selectedIds || [];
    const libFiles = loadLibrary();
    const activeFiles = libFiles.filter((f: any) => selectedIds.includes(f.id));
    setActiveSourceCount(activeFiles.length);
    if (activeFiles.length === 0) setActiveSource(null);
    else if (activeFiles.length === 1) setActiveSource(activeFiles[0].name);
    else setActiveSource(`${activeFiles[0].name} +${activeFiles.length - 1} more`);
  }, [messages]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Persist sessions on message change
  useEffect(() => {
    if (messages.length === 0) return;
    const title = generateTitle(messages);
    const now = Date.now();
    setSessions((prev) => {
      let updated: ChatSession[];
      const existingIdx = prev.findIndex((s) => s.id === currentSessionId);
      if (currentSessionId && existingIdx !== -1) {
        updated = prev.map((s) => s.id === currentSessionId ? { ...s, title, messages, timestamp: now } : s);
      } else {
        const newId = currentSessionId || `rex_${now}`;
        if (!currentSessionId) setCurrentSessionId(newId);
        updated = [...prev, { id: newId, title, messages, timestamp: now }];
      }
      saveSessions(updated);
      return updated;
    });
  }, [messages]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNewChat = () => {
    setMessages([]);
    setCurrentSessionId(null);
    setInputVal("");
    setFoxImg(FOX.neutral);
    setShowMobileHistory(false);
  };

  const handleLoadSession = (session: ChatSession) => {
    setMessages(session.messages);
    setCurrentSessionId(session.id);
    setShowMobileHistory(false);
  };

  const handleDeleteSession = (id: string) => {
    setSessions((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      saveSessions(updated);
      return updated;
    });
    if (currentSessionId === id) {
      setMessages([]);
      setCurrentSessionId(null);
    }
  };

  const handleSend = async (textToSend?: string) => {
    const finalMsg = textToSend || inputVal;
    if (!finalMsg.trim() || isLoading) return;

    if (!isPro) {
      const allowed = await canUse("ai_tutor");
      if (!allowed) { setShowUpgrade(true); return; }
    }

    setMessages((prev) => [...prev, { sender: "user" as const, text: finalMsg }]);
    setInputVal("");
    setIsLoading(true);

    if (textareaRef.current) textareaRef.current.style.height = "auto";
    if (desktopTextareaRef.current) desktopTextareaRef.current.style.height = "auto";

    try {
      const perFileCap = isPro ? 2000 : 1500;
      const totalCap = isPro ? 15000 : 4500;

      const refContext = buildAIContext();
      let effectiveContext = refContext;
      if (!effectiveContext) {
        const ctx = loadContext();
        const selectedIds = Array.isArray(ctx) ? ctx : (ctx as any)?.selectedIds || [];
        if (selectedIds.length > 0) {
          const libFiles = loadLibrary();
          const selectedFiles = libFiles.filter((f: any) => selectedIds.includes(f.id));
          if (selectedFiles.length > 0) {
            effectiveContext = selectedFiles.map((f: any) => {
              if (f.type === "image" || (f.content && f.content.startsWith("data:image"))) {
                return `[Attached image: ${f.name}]\n(Image content was captured for visual analysis)`;
              }
              const raw = f.fullText || f.content || "";
              const garbage = (raw.match(/[\x00-\x08\x0E-\x1F\uFFFD]/g) || []).length;
              const isGarbage = raw.length > 100 && garbage / raw.length > 0.1;
              if (isGarbage) {
                return `=== ${f.name} ===\n[File content is corrupted — please delete and re-upload.]`;
              }
              const truncated = raw.length > perFileCap ? raw.slice(0, perFileCap) + "\n[...truncated]" : raw;
              return `=== ${f.name} ===\n${truncated}`;
            }).join("\n\n");
          }
        }
      }

      let systemInstruction = "You are Rex AI, Studenius's custom study assistant. Never reveal you are any other AI or model. Always refer to yourself as Rex AI. Speak clearly, concisely, and keep explanations elegant. Use markdown formatting (bold, bullet lists, headings) to structure your responses clearly.";
      if (activeMode === "ELI5") systemInstruction = "You are Rex AI. Explain concepts to a 5-year old. Use simple analogies, short sentences, and a warm tone. Avoid jargon entirely.";
      else if (activeMode === "Analogy") systemInstruction = "You are Rex AI. Explain the topic by creating a vivid, memorable analogy (e.g. comparing it to a factory, kitchen, or engine).";
      else if (activeMode === "Quiz Me") systemInstruction = "You are Rex AI. Ask a challenging single-question multiple-choice quiz related to the user's prompt. Provide options A, B, C, D and wait for them to answer.";
      else if (activeMode === "Devil's Advocate") systemInstruction = "You are Rex AI. Challenge the user's view Socratically. Politely expose logical gaps or steel-man the opposing side to deepen their understanding.";
      else if (activeMode === "Summarize") systemInstruction = "You are Rex AI. Provide a high-yield bulleted cheat-sheet summary. Highlight vocabulary, main formulas, and key processes clearly.";

      if (effectiveContext) {
        // Sanitize: strip control characters and replacement chars from the whole context
        const sanitized = effectiveContext
          .replace(/[\x00-\x08\x0E-\x1F]/g, "")
          .replace(/\uFFFD/g, "")
          .trim();

        const capped = sanitized.length > totalCap
          ? sanitized.slice(0, totalCap) + "\n[...truncated for length]"
          : sanitized;

        systemInstruction += `\n\nThe student has attached the following reference material. Base your answers on this content when relevant:\n\n${capped}`;
      }

      const promptBody = messages.length > 0 ? `Given our study history, answer this: ${finalMsg}` : finalMsg;

      const reply = await callGroq(
        [{ role: "user", content: promptBody }],
        systemInstruction
      );
      const botText = reply || "I processed your request! Let me know if you need to go deeper.";
      setMessages((prev) => [...prev, { sender: "bot" as const, text: botText }]);
      saveHistory({ prompt: finalMsg, preview: botText.slice(0, 120), output: botText, model: "rex-ai", meta: activeMode });
      if (!isPro) {
        await logUsage("ai_tutor");
        remaining("ai_tutor").then(setRemainingUses);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[AITutor] callGroq failed:", msg);
      setMessages((prev) => [...prev, { sender: "bot" as const, text: `Couldn't reach the backend: ${msg}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const insertSuggestion = (title: string) => handleSend(`Can you make a study sheet or explain ${title}?`);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>, ref: React.RefObject<HTMLTextAreaElement>) => {
    setInputVal(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  const handleClearSource = () => {
    setActiveSource(null);
    saveContext([]);
  };

  const suggestions = [
    { icon: "lightbulb",    label: "Key Concepts",  sub: "Break down main ideas",  action: () => insertSuggestion("Key Concepts") },
    { icon: "history_edu",  label: "Flashcard Set", sub: "Create 5-question set",   action: () => insertSuggestion("a 5-question flashcard set") },
    { icon: "schema",       label: "Visualize",     sub: "Draw concept diagram",    action: () => insertSuggestion("a visual concept diagram") },
    { icon: "search_check", label: "Find Gaps",     sub: "Review my notes",         action: () => insertSuggestion("gaps in my notes") },
  ];

  return (
    <div className="w-full bg-[#FAF7F2] flex flex-col" style={{ minHeight: "100dvh" }}>

      {showUpgrade && (
        <UpgradePrompt
          feature="ai_tutor"
          remaining={remainingUses}
          onClose={() => setShowUpgrade(false)}
        />
      )}

      <SharedSidebar active="/ai-tutor" />

      {/* ═══════════════ DESKTOP ═══════════════ */}
      <div className="hidden md:flex md:ml-64 flex-col" style={{ height: "100vh" }}>

        {/* Header */}
        <header className="h-16 flex items-center justify-between px-8 border-b-2 border-black bg-[#FAF7F2] shrink-0 z-30">
          <div className="flex items-center gap-4">
            <span className="text-[22px] font-black tracking-tight">REX: AI TUTOR</span>
            <div className="w-px h-6 bg-black/20" />
            {activeSource ? (
              <div className="flex items-center gap-2 border-2 border-black rounded-full px-3 py-1 bg-[#F0EDE0]">
                <span className="material-symbols-outlined text-[16px]">description</span>
                <span className="text-[12px] font-bold truncate max-w-[200px]">{activeSource}</span>
                <button onClick={handleClearSource} className="material-symbols-outlined text-[14px] hover:text-[#FF4D2E] transition-colors">close</button>
              </div>
            ) : (
              <button onClick={() => navigate("/sources")}
                className="flex items-center gap-2 border-2 border-black rounded-full px-3 py-1 bg-[#F0EDE0] hover:bg-[#E2E2E2] text-[12px] font-bold transition-colors">
                <span className="material-symbols-outlined text-[16px]">attach_file</span>
                Attach Source
              </button>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button className="material-symbols-outlined text-black hover:text-[#FF4D2E] transition-colors">notifications</button>
            <button onClick={() => navigate("/go-pro")} className="material-symbols-outlined text-black hover:text-[#F5A623] transition-colors">workspace_premium</button>
            <div onClick={() => navigate("/profile")}
              className="w-10 h-10 border-2 border-black bg-[#ae2925] text-white flex items-center justify-center font-black text-[14px] cursor-pointer hover:opacity-90">
              R
            </div>
          </div>
        </header>

        {/* Dual Pane */}
        <div className="flex flex-1 overflow-hidden">

          {/* Left — 60% Chat */}
          <div className="w-[60%] flex flex-col border-r-2 border-black">

            {/* Modes */}
            <div className="px-8 pt-6 pb-4 shrink-0 border-b-2 border-black/10">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-black/50 mb-3">Learning Modes</h3>
              <div className="flex flex-wrap gap-2">
                {modes.map((mode) => (
                  <button key={mode} onClick={() => setActiveMode(mode)}
                    className={`px-4 py-2 border-2 border-black text-[13px] font-bold transition-all ${
                      activeMode === mode
                        ? "bg-black text-white shadow-[2px_2px_0px_#000] scale-95"
                        : "bg-[#FAF7F2] text-black hover:bg-[#E2E2E2]"
                    }`}>
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat feed */}
            <div className="flex-1 overflow-y-auto px-8 py-6">
              {messages.length === 0 ? (
                <div className="flex flex-col gap-6">
                  <div>
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-black/50 mb-4">Quick Suggestions</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {suggestions.map(({ icon, label, sub, action }) => (
                        <button key={label} onClick={action}
                          className="p-4 border-2 border-black bg-white text-left hover:bg-[#F0EDE0] transition-all group"
                          style={{ boxShadow: "3px 3px 0px #000" }}>
                          <span className={`material-symbols-outlined mb-2 block text-[22px] ${
                            icon === "lightbulb" ? "text-[#FF4D2E]" : icon === "history_edu" ? "text-[#F5A623]" : "text-black"
                          }`}>{icon}</span>
                          <p className="text-[13px] font-extrabold leading-tight group-hover:underline">{label}</p>
                          <p className="text-[11px] text-black/50 mt-1">{sub}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <MessageThread messages={messages} isLoading={isLoading} messagesEndRef={messagesEndRef} />
              )}
            </div>

            {/* Input */}
            <div className="shrink-0 px-8 pb-6 pt-4 border-t-2 border-black bg-[#FAF7F2]">
              <div className="border-2 border-black bg-white flex items-end gap-2 p-2" style={{ boxShadow: "3px 3px 0px #000" }}>
                <button onClick={() => navigate("/sources")}
                  className="w-11 h-11 flex items-center justify-center hover:bg-[#F0EDE0] transition-colors flex-shrink-0">
                  <span className="material-symbols-outlined text-[22px]">attach_file</span>
                </button>
                <textarea
                  ref={desktopTextareaRef}
                  value={inputVal}
                  onChange={(e) => handleTextareaChange(e, desktopTextareaRef)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
                  rows={1}
                  className="flex-1 bg-transparent border-none outline-none focus:ring-0 text-[15px] py-2.5 px-2 resize-none placeholder:text-black/30 font-medium"
                  placeholder="Ask Rex anything about your studies..."
                  style={{ maxHeight: 120, overflowY: "auto" }}
                />
                <button className="w-10 h-10 flex items-center justify-center text-black/30 hover:text-black transition-colors flex-shrink-0">
                  <span className="material-symbols-outlined">mic</span>
                </button>
                <button onClick={() => handleSend()}
                  className="w-11 h-11 bg-black text-white flex items-center justify-center border-2 border-black hover:bg-[#FF4D2E] transition-colors flex-shrink-0">
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
                </button>
              </div>
              {!isPro && remainingUses <= 2 && remainingUses > 0 && (
                <div className="flex justify-center mt-2">
                  <SoftWarning feature="ai_tutor" remaining={remainingUses} />
                </div>
              )}
              <p className="text-center text-[11px] text-black/40 font-medium mt-3">
                Studenius AI can make mistakes. Verify important academic concepts with your textbook.
              </p>
            </div>
          </div>

          {/* Right — 40% History */}
          <div className="w-[40%] flex flex-col overflow-hidden bg-[#FAF7F2]">
            <HistoryPanel
              sessions={sessions}
              currentId={currentSessionId}
              onLoad={handleLoadSession}
              onNew={handleNewChat}
              onDelete={handleDeleteSession}
            />
          </div>

        </div>
      </div>

      {/* ═══════════════ MOBILE ═══════════════ */}
      <div className="md:hidden w-full flex flex-col bg-[#FAF7F2]" style={{ height: "100dvh", overflow: "hidden" }}>

        {/* Top bar */}
        <header className="flex items-center justify-between px-4 h-14 bg-[#FAF7F2] shrink-0 border-b-2 border-black z-10">
          <button onClick={() => navigate(-1)}
            className="flex items-center justify-center w-9 h-9 border-2 border-black bg-white rounded-full shadow-[2px_2px_0px_#000] hover:bg-[#ebe8e3]">
            <span className="material-symbols-outlined text-black text-[18px]">arrow_back</span>
          </button>
          <h1 className="text-[18px] font-black">AI Tutor</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowMobileHistory(true)}
              className="relative flex items-center justify-center w-9 h-9 border-2 border-black bg-white rounded-full shadow-[2px_2px_0px_#000] hover:bg-[#ebe8e3]">
              <span className="material-symbols-outlined text-black text-[18px]">history</span>
              {sessions.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#ae2925] text-white text-[9px] font-black rounded-full flex items-center justify-center border border-black">
                  {sessions.length > 9 ? "9+" : sessions.length}
                </span>
              )}
            </button>
            <button onClick={() => navigate("/sources")}
              className="flex items-center justify-center w-9 h-9 border-2 border-black bg-white rounded-full shadow-[2px_2px_0px_#000] hover:bg-[#ebe8e3]">
              <span className="material-symbols-outlined text-black text-[18px]">library_books</span>
            </button>
          </div>
        </header>

        {/* Mode pills */}
        <div className="w-full px-4 py-2 overflow-x-auto flex space-x-2 shrink-0 bg-[#FAF7F2] border-b-2 border-black"
          style={{ scrollbarWidth: "none" }}>
          {modes.map((mode) => (
            <button key={mode} onClick={() => setActiveMode(mode)}
              className={`shrink-0 px-4 py-1.5 border-2 border-black rounded-full text-[13px] font-bold whitespace-nowrap transition-all ${
                activeMode === mode ? "bg-[#ae2925] text-white" : "bg-white text-black hover:bg-[#ebe8e3]"
              }`}>
              {mode}
            </button>
          ))}
        </div>

        {/* Source + count bar */}
        <div className="w-full px-4 py-2 shrink-0 bg-[#FAF7F2] border-b-2 border-black flex items-center justify-between gap-3">
          {activeSource ? (
            <div className="flex items-center gap-2 bg-[#F0EDE0] border-2 border-black rounded-full px-3 py-1 flex-1 min-w-0">
              <span className="material-symbols-outlined text-[14px]">description</span>
              <span className="text-[11px] font-bold truncate">{activeSource}</span>
              <button onClick={handleClearSource} className="material-symbols-outlined text-[13px] hover:text-[#FF4D2E] shrink-0 transition-colors">close</button>
            </div>
          ) : (
            <button onClick={() => navigate("/sources")}
              className="flex items-center gap-1.5 bg-white border-2 border-dashed border-black/30 rounded-full px-3 py-1 text-[11px] font-bold text-black/40 hover:border-black hover:text-black transition-all flex-1">
              <span className="material-symbols-outlined text-[14px]">attach_file</span>
              Attach Source
            </button>
          )}
          <div className="flex items-center gap-2 shrink-0 border-2 border-black bg-white px-3 py-1 shadow-[2px_2px_0px_#000]">
            <span className="material-symbols-outlined text-[14px]">chat</span>
            <span className="text-[11px] font-black">{messages.length} msgs</span>
          </div>
        </div>

        {/* Chat feed */}
        <main className="flex-1 overflow-y-auto px-4 py-4 bg-[#FAF7F2]">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-full gap-4 pb-2">
              <div className="w-28 h-28 border-2 border-black rounded-2xl overflow-hidden shadow-[2px_2px_0px_#000] bg-white">
                <img src={foxImg} alt="Rex" className="w-full h-full object-contain" />
              </div>
              <h2 className="font-black text-[22px] text-center">Ready to study?</h2>
              <p className="text-[13px] text-center text-black/50 max-w-[260px]">
                Ask me anything about your notes, or pick a suggestion below.
              </p>
              <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
                {suggestions.map(({ icon, label, sub, action }) => (
                  <button key={label} onClick={action}
                    className="bg-white border-2 border-black rounded-2xl p-4 flex flex-col items-start text-left shadow-[2px_2px_0px_#000] hover:bg-[#ebe8e3] transition-colors">
                    <span className="material-symbols-outlined text-[#ae2925] mb-2 text-[22px]">{icon}</span>
                    <span className="font-bold text-[13px]">{label}</span>
                    <span className="text-[11px] text-black/50 mt-0.5">{sub}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <MessageThread messages={messages} isLoading={isLoading} messagesEndRef={messagesEndRef} />
          )}
        </main>

        {/* Input footer */}
        <footer className="shrink-0 w-full bg-white border-t-2 border-black px-4 pt-3 z-20"
          style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
          {activeSource && (
            <div className="flex items-center self-start bg-[#f0ece6] border-2 border-black rounded-full px-3 py-1 mb-2 w-fit">
              <span className="material-symbols-outlined text-black text-[15px] mr-1">attach_file</span>
              <span className="text-[12px] font-bold truncate max-w-[200px]">Active: {activeSource}</span>
              <button onClick={handleClearSource} className="ml-2 hover:bg-[#ebe8e3] rounded-full p-0.5">
                <span className="material-symbols-outlined text-black text-[14px]">close</span>
              </button>
            </div>
          )}
          <div className="flex items-end gap-2 w-full">
            <button onClick={() => navigate("/sources")}
              className="w-11 h-11 shrink-0 bg-white border-2 border-black rounded-xl flex items-center justify-center shadow-[2px_2px_0px_#000] active:translate-y-0.5">
              <span className="material-symbols-outlined text-[20px]">attach_file</span>
            </button>
            <textarea
              ref={textareaRef}
              value={inputVal}
              onChange={(e) => handleTextareaChange(e, textareaRef)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
              rows={1}
              className="flex-1 min-h-[44px] max-h-[120px] bg-white border-2 border-black rounded-xl px-4 py-2.5 text-[14px] placeholder:text-black/30 resize-none focus:outline-none shadow-[2px_2px_0px_#000]"
              placeholder="Message AI Tutor..."
              style={{ overflowY: "auto" }}
            />
            <button onClick={() => handleSend()}
              className="w-11 h-11 shrink-0 bg-[#ae2925] border-2 border-black rounded-xl flex items-center justify-center shadow-[2px_2px_0px_#000] active:translate-y-0.5">
              <span className="material-symbols-outlined text-white text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
            </button>
          </div>
          {!isPro && remainingUses <= 2 && remainingUses > 0 && (
            <div className="flex justify-center pb-1">
              <SoftWarning feature="ai_tutor" remaining={remainingUses} />
            </div>
          )}
          <p className="text-center text-[11px] text-black/30 font-medium py-2">
            AI can make mistakes. Verify important concepts with your textbook.
          </p>
        </footer>

        {/* Mobile History Drawer */}
        {showMobileHistory && (
          <div className="fixed inset-0 z-50 flex">
            <div className="flex-1 bg-black/40" onClick={() => setShowMobileHistory(false)} />
            <div className="w-[85%] max-w-sm bg-[#FAF7F2] border-l-2 border-black flex flex-col h-full"
              style={{ boxShadow: "-4px 0px 0px #000" }}>
              <div className="flex items-center justify-between px-5 h-14 border-b-2 border-black shrink-0">
                <span className="text-[16px] font-black">Chat History</span>
                <button onClick={() => setShowMobileHistory(false)}
                  className="w-9 h-9 flex items-center justify-center border-2 border-black bg-white shadow-[2px_2px_0px_#000] hover:bg-[#ebe8e3]">
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <HistoryPanel
                  sessions={sessions}
                  currentId={currentSessionId}
                  onLoad={handleLoadSession}
                  onNew={handleNewChat}
                  onDelete={handleDeleteSession}
                />
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
