import { getRelevantContext } from "@/lib/rag";
import { useNavigate } from "react-router-dom";
import { SharedSidebar } from "@/components/SharedSidebar";
import React, { useState, useRef, useEffect } from "react";
import { callGroq, callGroqWithMeta } from "@/lib/groq";
import { loadContext, loadLibrary, onSourceChange, saveContext } from "@/lib/sourceContext";
import { useToolHistory } from "@/pages/ToolHistory";
import { usePlan } from "@/hooks/usePlan";
import UpgradePrompt, { SoftWarning } from "@/components/UpgradePrompt";
import { RexDisclaimer } from "@/components/RexDisclaimer";
import { useTutorialModal } from "@/hooks/useTutorialModal";
import { TutorialModal } from "@/components/TutorialModal";
import { TUTORIAL_CONTENT } from "@/lib/tutorialContent";

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
    const headingMatch = line.match(/^(#{1,4})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const cls = level === 1 ? "text-[16px] font-black mt-3 mb-1"
        : level === 2 ? "text-[14px] font-extrabold mt-2 mb-1"
        : "text-[13px] font-bold mt-1";
      elements.push(<p key={`h-${i}`} className={cls}>{renderInline(headingMatch[2], 0)}</p>);
      i++;
      continue;
    }

    // Bullet list (-, •, or + prefix — Gemini uses +)
    const bulletMatch = line.match(/^[\s]*[-•+]\s+(.+)/);
    if (bulletMatch) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && lines[i].match(/^[\s]*[-•+]\s+(.+)/)) {
        const m = lines[i].match(/^[\s]*[-•+]\s+(.+)/);
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

    // Markdown table (| col | col |)
    if (line.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        const cells = lines[i].split("|").slice(1, -1).map(c => c.trim());
        // skip separator rows (| --- | --- |)
        if (!cells.every(c => /^[-:]+$/.test(c))) rows.push(cells);
        i++;
      }
      if (rows.length > 0) {
        elements.push(
          <div key={`tbl-${i}`} className="overflow-x-auto my-2">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>{rows[0].map((h, ci) => (
                  <th key={ci} className="border-2 border-black px-2 py-1 bg-black text-white text-left font-bold">{renderInline(h, ci)}</th>
                ))}</tr>
              </thead>
              <tbody>
                {rows.slice(1).map((row, ri) => (
                  <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-[#F0EDE0]"}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="border border-black/30 px-2 py-1">{renderInline(cell, ci)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
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
  foxImg?: string;
}

function MessageThread({ messages, isLoading, messagesEndRef, foxImg }: MessageThreadProps) {
  return (
    <div className="flex flex-col gap-5">
      {messages.map((msg, i) => (
        <div key={i} className={`flex max-w-[90%] gap-3 ${msg.sender === "user" ? "self-end flex-row-reverse" : "self-start flex-row"}`}>
          {msg.sender === "bot" && foxImg && (
            <div className="w-10 h-10 shrink-0 border-2 border-black rounded-xl overflow-hidden bg-white shadow-[2px_2px_0px_#000]">
              <img src={foxImg} alt="Rex" className="w-full h-full object-cover" />
            </div>
          )}
          <div className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
            <div className={`p-4 rounded-xl border-2 border-black ${
              msg.sender === "user"
                ? "bg-[#ae2925] text-white shadow-[3px_3px_0px_#000]"
                : "bg-white text-black shadow-[3px_3px_0px_#000]"
            }`}>
              {msg.sender === "user"
                ? <p className="text-[14px] leading-relaxed whitespace-pre-line">{msg.text}</p>
                : <RenderBotText text={msg.text} />
              }
            </div>
            <span className="text-[10px] font-bold text-black/40 mt-1 px-1">{msg.sender === "user" ? "You" : "Rex"}</span>
          </div>
        </div>
      ))}
      {isLoading && (
        <div className="flex max-w-[80%] self-start gap-3">
          {foxImg && (
            <div className="w-10 h-10 shrink-0 border-2 border-black rounded-xl overflow-hidden bg-white shadow-[2px_2px_0px_#000]">
              <img src={foxImg} alt="Rex" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex flex-col items-start">
            <div className="p-3 rounded-xl border-2 border-black bg-white shadow-[3px_3px_0px_#000] flex items-center gap-2">
              <span className="material-symbols-outlined animate-spin text-[#ae2925] text-[18px]">autorenew</span>
              <span className="text-[13px] font-bold">Rex is thinking...</span>
            </div>
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
  const tutorial = useTutorialModal("/ai-tutor");
  const { save: saveHistory } = useToolHistory("ai-tutor");
  const { isPro, canUse, remaining, logUsage, loading: planLoading } = usePlan();
  const [remainingUses, setRemainingUses] = useState<number>(20);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  const [activeMode, setActiveMode] = useState("Explain");
  const STUDY_ACTIONS = [
    { id: "Explain", label: "Break it down" },
    { id: "ELI5", label: "Like I'm 5" },
    { id: "Analogy", label: "Use an analogy" },
    { id: "Quiz Me", label: "Test me" },
    { id: "Devil's Advocate", label: "Challenge me" },
    { id: "Summarize", label: "Summarize" }
  ];

  const [inputVal, setInputVal] = useState("");
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem('pz_tutor_chat');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeSource, setActiveSource] = useState<string | null>(null);
  const [activeSourceCount, setActiveSourceCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [foxImg, setFoxImg] = useState(FOX.neutral);

  const [sessions, setSessions] = useState<ChatSession[]>(() => loadSessions());

  // Lock body scroll so the mobile chat interface doesn't bounce/scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";
    return () => {
      document.body.style.overflow = "";
      document.body.style.overscrollBehavior = "";
      document.documentElement.style.overflow = "";
      document.documentElement.style.overscrollBehavior = "";
    };
  }, []);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showMobileHistory, setShowMobileHistory] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const desktopTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Fox mood
  useEffect(() => {
    remaining("ai_tutor").then(setRemainingUses).catch((err) => {
      console.error("[AITutor] failed to load remaining uses:", err);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isLoading) { setFoxImg(FOX.thinking); return; }
    if (messages.length === 0) { setFoxImg(FOX.neutral); return; }
    const last = messages[messages.length - 1];
    if (last.sender === "bot") setFoxImg(FOX.happy);
  }, [isLoading, messages]);

  // Shared helper: resolve the active file list.
  // loadContext() can return either the legacy plain array of selected IDs
  // (what SourceLibrary actually saves via saveContext(idsArray)) or an
  // object shape { mode, selectedIds } for forward-compat. Handle both.
  const resolveActiveFiles = () => {
    const ctx: any = loadContext();
    const libFiles = loadLibrary();

    if (Array.isArray(ctx)) {
      // Current real shape: ctx IS the selectedIds array.
      return libFiles.filter((f: any) => ctx.includes(f.id));
    }

    if (ctx?.mode === "none") return [];
    if (ctx?.mode === "all") return libFiles;
    return libFiles.filter((f: any) => (ctx?.selectedIds ?? []).includes(f.id));
  };

  const applySourceLabel = (activeFiles: any[]) => {
    setActiveSourceCount(activeFiles.length);
    if (activeFiles.length === 0) setActiveSource(null);
    else if (activeFiles.length === 1) setActiveSource(activeFiles[0].name);
    else setActiveSource(`${activeFiles[0].name} +${activeFiles.length - 1} more`);
  };

  // Sync active source on mount, window focus, AND when auth sets _uid (pz_source_changed fires then)
  useEffect(() => {
    const syncSource = () => applySourceLabel(resolveActiveFiles());
    syncSource();
    window.addEventListener("focus", syncSource);
    const unsub = onSourceChange(syncSource); // re-fires when setSourceContextUser() sets _uid
    return () => {
      window.removeEventListener("focus", syncSource);
      unsub();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-sync source label after each message without adding new listeners
  useEffect(() => {
    if (messages.length === 0) return;
    applySourceLabel(resolveActiveFiles());
  }, [messages]); // eslint-disable-line react-hooks/exhaustive-deps

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
    localStorage.setItem('pz_tutor_chat', JSON.stringify(messages));
  }, [messages]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNewChat = () => {
    setMessages([]);
    setCurrentSessionId(null);
    setInputVal("");
    setFoxImg(FOX.neutral);
    setShowMobileHistory(false);
  };

  // The mic button previously had no onClick at all - just an icon, no
  // functionality behind it. This wires up real voice input using the
  // browser's native SpeechRecognition API (Chrome/Edge support it well;
  // Safari and Firefox support is inconsistent, hence the feature-detect
  // with a friendly fallback instead of a silently dead button).
  const handleMicClick = () => {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setMessages((prev) => [...prev, { sender: "bot" as const, text: "Voice input isn't supported in this browser. Try Chrome or Edge, or just type your question." }]);
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? "";
      if (transcript) {
        setInputVal((prev) => (prev.trim() ? `${prev.trim()} ${transcript}` : transcript));
      }
    };
    recognition.onerror = (event: any) => {
      console.error("[AITutor] speech recognition error:", event.error);
      setIsRecording(false);
    };
    recognition.onend = () => setIsRecording(false);

    recognitionRef.current = recognition;
    recognition.start();
  };

  useEffect(() => {
    return () => { recognitionRef.current?.stop?.(); };
  }, []);

  // Start a fresh chat the moment the user switches away from this browser
  // tab. Navigating to a different in-app route already resets state
  // naturally (the component unmounts and remounts with fresh useState
  // defaults) - this covers the other case, where the tab is just hidden
  // (alt-tabbed, minimized, switched tabs) and the component stays mounted
  // with the old conversation still sitting in state. Whatever was said so
  // far is already saved to session history, so nothing is lost - coming
  // back just starts clean instead of silently continuing the old thread.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) handleNewChat();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    // NOTE: this used to be a bare `await canUse(...)` with no try/catch.
    // If canUse() ever rejected (network hiccup, usePlan not finished
    // initializing, etc.) the whole handleSend call threw before the user's
    // message was ever appended — Send looked like it did nothing at all.
    // Now any failure here surfaces as a visible bot message instead.
    if (!isPro && !planLoading) {
      try {
        const allowed = await canUse("ai_tutor");
        if (!allowed) { setShowUpgrade(true); return; }
      } catch (err) {
        console.error("[AITutor] canUse check failed:", err);
        setMessages((prev) => [...prev, { sender: "bot" as const, text: "Couldn't verify your plan status just now — please try again in a moment." }]);
        return;
      }
    }

    setMessages((prev) => [...prev, { sender: "user" as const, text: finalMsg }]);
    setInputVal("");
    setIsLoading(true);

    if (textareaRef.current) textareaRef.current.style.height = "auto";
    if (desktopTextareaRef.current) desktopTextareaRef.current.style.height = "auto";

    try {
      const perFileCap = isPro ? 2000 : 1500;
      const totalCap = isPro ? 15000 : 4500;

      // Build context from ALL active files, honouring mode="all"|"selected"|"none"
      let effectiveContext: string | null = null;
      const activeFiles = resolveActiveFiles();
      if (activeFiles.length > 0) {
        effectiveContext = activeFiles.map((f: any) => {
          const isImage = f.type === "image/jpeg" || f.type === "image/png" ||
            f.type === "image" || (f.content && f.content.startsWith("data:image"));

          if (isImage) {
            const raw = f.fullText || f.preview || "";

            // buildImageMessages() in sourceContext.ts only actually attaches
            // real vision content when f.type is exactly "image/jpeg" or
            // "image/png" AND fullText contains a "DATA:data:image/...;base64,..."
            // capture blob. That blob is pure base64 and must never be treated
            // as readable text here — dumping it into the prompt would blow
            // the context budget and feed the model garbage.
            const isRawCaptureBlob = raw.startsWith("DATA:");
            const willGetVisionAnalysis =
              (f.type === "image/jpeg" || f.type === "image/png") && isRawCaptureBlob;

            if (willGetVisionAnalysis) {
              // Real bytes are attached separately and automatically by
              // callGroqWithMeta -> buildImageMessages(). Nothing to add here.
              return null;
            }

            // Anything else that looks like an image (e.g. a generic "image"
            // type, or missing the capture blob) falls outside
            // buildImageMessages()'s narrower filter and would otherwise
            // silently contribute nothing at all. Use real OCR text if we
            // have it, or an honest placeholder if we don't.
            if (!isRawCaptureBlob && raw.trim().length > 0) {
              const truncated = raw.length > perFileCap ? raw.slice(0, perFileCap) + "\n[...truncated]" : raw;
              return `=== ${f.name} (text extracted from image) ===\n${truncated}`;
            }
            return `=== ${f.name} ===\n[Image file — visual content unavailable for this file. If the student's question depends on what's in it, ask them to describe it.]`;
          }
          const raw = f.fullText || f.preview || f.content || "";
          const garbage = (raw.match(/[\x00-\x08\x0E-\x1F\uFFFD]/g) || []).length;
          const isGarbage = raw.length > 100 && garbage / raw.length > 0.1;
          if (isGarbage) {
            return `=== ${f.name} ===\n[File content is corrupted — please delete and re-upload.]`;
          }
          const truncated = raw.length > perFileCap ? raw.slice(0, perFileCap) + "\n[...truncated]" : raw;
          return `=== ${f.name} ===\n${truncated}`;
        }).filter((entry: string | null) => entry !== null).join("\n\n");
      }

      let systemInstruction = "You are Rex AI, Studenius's custom study assistant. Never reveal you are any other AI or model. Always refer to yourself as Rex AI. When explaining a concept: (1) start with the core idea in one plain sentence before any formatting, (2) explain WHY it works or matters, not just what it is, (3) give one concrete example or walk through a mini-scenario, (4) if source material is attached, use it as raw material to teach from — do not restate its structure, headers, or bullet points back to the student. Reserve heavy bullet-point formatting for lists of distinct items, not for explaining a single concept. End with a short question checking whether the explanation landed, or what part to go deeper on. Use markdown sparingly and only where it aids clarity.";
      if (activeMode === "ELI5") systemInstruction = "You are Rex AI. Explain concepts to a 5-year old. Use simple analogies, short sentences, and a warm tone. Avoid jargon entirely.";
      else if (activeMode === "Analogy") systemInstruction = "You are Rex AI. Explain the topic by creating a vivid, memorable analogy (e.g. comparing it to a factory, kitchen, or engine).";
      else if (activeMode === "Quiz Me") systemInstruction = "You are Rex AI. Ask a challenging single-question multiple-choice quiz related to the user's prompt. Provide options A, B, C, D and wait for them to answer.";
      else if (activeMode === "Devil's Advocate") systemInstruction = "You are Rex AI. Challenge the user's view Socratically. Politely expose logical gaps or steel-man the opposing side to deepen their understanding.";
      else if (activeMode === "Summarize") systemInstruction = "You are Rex AI. Provide a high-yield bulleted cheat-sheet summary. Highlight vocabulary, main formulas, and key processes clearly.";

      // Explicit "make me a reviewer" style requests are a stronger signal
      // than whichever mode pill happens to be selected — most students type
      // this without first clicking "Summarize", and the default Explain
      // prompt actively forbids giving back structure/headers, which is the
      // opposite of what a reviewer needs. Override regardless of active mode.
      const wantsReviewer = /\b(reviewers?|review\s*sheet|cheat\s*sheet|study\s*guide|cram\s*sheet|study\s*sheet)\b/i.test(finalMsg);
      if (wantsReviewer) {
        systemInstruction = "You are Rex AI. The student wants a REVIEWER: a comprehensive, structured study document, not a conversational explanation. Cover ALL major topics/sections in the attached source material, not just one concept — use the source's own scope as your outline. Organize with clear headings per topic, bullet points for facts and lists, and bold key terms with brief definitions. Include a short 'likely to be asked' section at the end if the material supports it. Do not end with a check-in question — this is a reference document the student will study from, not a back-and-forth turn.";
      }

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

      // Send real conversation history, not just the current turn.
      // Cap at last 20 messages so the payload doesn't grow unbounded
      // in very long chats.
      const historyMessages = messages.slice(-20).map((m) => ({
        role: m.sender === "user" ? ("user" as const) : ("assistant" as const),
        content: m.text,
      }));

      const { text: reply, provider } = await callGroqWithMeta(
        [...historyMessages, { role: "user" as const, content: finalMsg }],
        systemInstruction
      );
      const botText = reply || "I processed your request! Let me know if you need to go deeper.";
      setMessages((prev) => [...prev, { sender: "bot" as const, text: botText }]);
      // model now records which provider actually answered (Groq / Gemini /
      // Cloudflare AI / OpenRouter) so you can tell whether an unsatisfying
      // reply came from the strong 70B Groq model or a silent fallback to a
      // weaker one.
      saveHistory({ prompt: finalMsg, preview: botText.slice(0, 120), output: botText, model: `rex-ai (${provider ?? "unknown"})`, meta: activeMode });
      if (!isPro) {
        try {
          await logUsage("ai_tutor");
          const r = await remaining("ai_tutor");
          setRemainingUses(r);
        } catch (usageErr) {
          // Usage tracking failing shouldn't blow up a reply the user already got.
          console.error("[AITutor] usage logging failed:", usageErr);
        }
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
    // Keep the same shape SourceLibrary uses (a plain array of selected IDs).
    // Saving an object here previously left a mismatched shape in storage.
    saveContext([]);
  };

  const suggestions = [
    { icon: "lightbulb",    label: "Key Concepts",  sub: "Break down main ideas",  action: () => insertSuggestion("Key Concepts") },
    { icon: "history_edu",  label: "Flashcard Set", sub: "Create 5-question set",   action: () => insertSuggestion("a 5-question flashcard set") },
    { icon: "schema",       label: "Visualize",     sub: "Draw concept diagram",    action: () => insertSuggestion("a visual concept diagram") },
    { icon: "search_check", label: "Find Gaps",     sub: "Review my notes",         action: () => insertSuggestion("gaps in my notes") },
  ];

  return (
    <div className="w-full bg-[#FAF7F2] flex flex-col fixed inset-0 z-0" style={{ height: "100dvh", overflow: "hidden" }}>
      <TutorialModal isOpen={tutorial.isOpen} onDismiss={tutorial.dismiss} features={TUTORIAL_CONTENT["/ai-tutor"] || []} title="Rex Tutor" />

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
            <span className="text-[22px] font-black tracking-tight">Rex Tutor</span>
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
            
            
            <div onClick={() => navigate("/profile")}
              className="w-10 h-10 border-2 border-black bg-[#ae2925] text-white flex items-center justify-center font-black text-[14px] cursor-pointer hover:opacity-90">
              R
            </div>
          <button onClick={() => tutorial.show()} className="flex items-center justify-center w-10 h-10 border-2 border-black bg-white rounded-full shadow-[2px_2px_0px_#000] hover:bg-[#ebe8e3] ml-2" title="Tutorial">
                <span className="material-symbols-outlined text-black text-[18px]">help</span>
              </button>
</div>
        
          
        </header>

        {/* Dual Pane */}
        <div className="flex flex-1 overflow-hidden">

          {/* Left — 60% Chat */}
          <div className="w-[60%] flex flex-col border-r-2 border-black">

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
                <MessageThread messages={messages} isLoading={isLoading} messagesEndRef={messagesEndRef} foxImg={foxImg} />
              )}
            </div>

            {/* Input */}
            
              <div className="shrink-0 px-8 pt-4 bg-[#FAF7F2]">
                <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
                  {STUDY_ACTIONS.map(mode => (
                    <button key={mode.id} onClick={() => setActiveMode(mode.id)} className={`shrink-0 px-3 py-1.5 border-2 border-black font-black text-[12px] uppercase tracking-wider shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all ${activeMode === mode.id ? 'bg-[#FF4D2E] text-white' : 'bg-white text-black hover:bg-[#E2E2E2]'}`}>
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>
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
              onBlur={() => { window.scrollTo(0, 0); document.body.scrollTop = 0; }}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
                  rows={1}
                  className="flex-1 bg-transparent border-none outline-none focus:ring-0 text-[15px] py-2.5 px-2 resize-none placeholder:text-black/30 font-medium"
                  placeholder="Ask Rex anything about your studies..."
                  style={{ maxHeight: 120, overflowY: "auto" }}
                />
                <button onClick={handleMicClick}
                  title={isRecording ? "Stop recording" : "Voice input"}
                  className={`w-10 h-10 flex items-center justify-center transition-colors flex-shrink-0 ${isRecording ? "text-[#ae2925] animate-pulse" : "text-black/30 hover:text-black"}`}>
                  <span className="material-symbols-outlined">{isRecording ? "stop_circle" : "mic"}</span>
                </button>
                <button onClick={() => handleSend()}
                  className="w-11 h-11 bg-black text-white flex items-center justify-center border-2 border-black hover:bg-[#FF4D2E] transition-colors flex-shrink-0">
                  <span className="font-black text-[12px] uppercase tracking-widest">SEND</span>
                </button>
              </div>
              <RexDisclaimer />
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
      <div className="md:hidden w-full flex flex-col bg-[#FAF7F2] flex-1 overflow-hidden">

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
            <MessageThread messages={messages} isLoading={isLoading} messagesEndRef={messagesEndRef} foxImg={foxImg} />
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
              onBlur={() => { window.scrollTo(0, 0); document.body.scrollTop = 0; }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
              rows={1}
              className="flex-1 min-h-[44px] max-h-[120px] bg-white border-2 border-black rounded-xl px-4 py-2.5 text-[14px] placeholder:text-black/30 resize-none focus:outline-none shadow-[2px_2px_0px_#000]"
              placeholder="Message AI Tutor..."
              style={{ overflowY: "auto" }}
            />
            <button onClick={() => handleSend()}
              className="w-11 h-11 shrink-0 bg-[#ae2925] border-2 border-black rounded-xl flex items-center justify-center shadow-[2px_2px_0px_#000] active:translate-y-0.5">
              <span className="font-black text-[12px] uppercase tracking-widest text-white">SEND</span>
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
