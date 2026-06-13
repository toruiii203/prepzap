import { useNavigate } from "react-router-dom";
import { SharedSidebar } from "@/components/SharedSidebar";
import React, { useState, useRef, useEffect } from "react";
import { MathRenderer } from "@/components/MathRenderer";
import { callGroq } from "@/lib/groq";
import { buildAIContext, loadContext, loadLibrary, saveContext } from "@/lib/sourceContext";
import { useToolHistory } from "@/pages/ToolHistory";

const FOX = {
  neutral:   "/fox/fox-neutral.png",
  happy:     "/fox/fox-happy.png",
  excited:   "/fox/fox-excited.png",
  surprised: "/fox/fox-surprised.png",
  thinking:  "/fox/fox-thinking.png",
  peeking:   "/fox/fox-peeking.png",
  laughing:  "/fox/fox-laughing.png",
};

interface MessageThreadProps {
  messages: Array<{ sender: "user" | "bot"; text: string }>;
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

function MessageThread({ messages, isLoading, messagesEndRef }: MessageThreadProps) {
  return (
    <div className="flex flex-col gap-4">
      {messages.map((msg, i) => (
        <div key={i} className={`flex flex-col max-w-[82%] ${msg.sender === "user" ? "self-end items-end" : "self-start items-start"}`}>
          <div className={`p-3 rounded-2xl border-2 border-black ${
            msg.sender === "user"
              ? "bg-[#ae2925] text-white shadow-[2px_2px_0px_#000]"
              : "bg-white text-black shadow-[2px_2px_0px_#000]"
          }`}>
            <p className="text-[14px] leading-relaxed whitespace-pre-line">{msg.text}</p>
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

export default function AITutor() {
  const navigate = useNavigate();
  const { save: saveHistory } = useToolHistory("ai-tutor");
  const [activeMode, setActiveMode] = useState("Explain");
  const modes = ["Explain", "ELI5", "Analogy", "Quiz Me", "Devil's Advocate", "Summarize"];

  const [inputVal, setInputVal] = useState("");
  const [messages, setMessages] = useState<Array<{ sender: "user" | "bot"; text: string }>>([]);
  const [activeSource, setActiveSource] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [foxImg, setFoxImg] = useState(FOX.neutral);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const desktopTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync fox mood to loading/message state
  useEffect(() => {
    if (isLoading) { setFoxImg(FOX.thinking); return; }
    if (messages.length === 0) { setFoxImg(FOX.neutral); return; }
    const last = messages[messages.length - 1];
    if (last.sender === "bot") setFoxImg(FOX.happy);
  }, [isLoading, messages]);

  // Load active source
  useEffect(() => {
    const syncSource = () => {
      const ctx = loadContext();
      const selectedIds = Array.isArray(ctx) ? ctx : (ctx as any)?.selectedIds || [];
      const libFiles = loadLibrary();
      const active = libFiles.find((f: any) => selectedIds.includes(f.id));
      setActiveSource(active ? active.name : null);
    };
    syncSource();
    window.addEventListener("focus", syncSource);
    return () => window.removeEventListener("focus", syncSource);
  }, []);

  const handleSend = async (textToSend?: string) => {
    const finalMsg = textToSend || inputVal;
    if (!finalMsg.trim() || isLoading) return;

    setMessages((prev) => [...prev, { sender: "user" as const, text: finalMsg }]);
    setInputVal("");
    setIsLoading(true);

    if (textareaRef.current) textareaRef.current.style.height = "auto";
    if (desktopTextareaRef.current) desktopTextareaRef.current.style.height = "auto";

    try {
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
              return `=== ${f.name} ===\n${f.content || ""}`;
            }).join("\n\n");
          }
        }
      }

      let systemInstruction = "You are Rex AI, Studenius's custom study assistant. Never reveal you are any other AI or model. Always refer to yourself as Rex AI. Speak clearly, concisely, and keep explanations elegant.";
      if (activeMode === "ELI5") systemInstruction = "You are Rex AI. Explain concepts to a 5-year old. Use simple analogies, short sentences, and a warm tone. Avoid jargon entirely.";
      else if (activeMode === "Analogy") systemInstruction = "You are Rex AI. Explain the topic by creating a vivid, memorable analogy (e.g. comparing it to a factory, kitchen, or engine).";
      else if (activeMode === "Quiz Me") systemInstruction = "You are Rex AI. Ask a challenging single-question multiple-choice quiz related to the user's prompt. Provide options A, B, C, D and wait for them to answer.";
      else if (activeMode === "Devil's Advocate") systemInstruction = "You are Rex AI. Challenge the user's view Socratically. Politely expose logical gaps or steel-man the opposing side to deepen their understanding.";
      else if (activeMode === "Summarize") systemInstruction = "You are Rex AI. Provide a high-yield bulleted cheat-sheet summary. Highlight vocabulary, main formulas, and key processes clearly.";

      if (effectiveContext) {
        systemInstruction += `\n\nThe student has attached the following reference material. Base your answers on this content when relevant:\n\n${effectiveContext}`;
      }

      const promptBody = messages.length > 0 ? `Given our study history, answer this: ${finalMsg}` : finalMsg;

      const callGroqWithModel = async (promptText: string, systemPrompt: string) => {
        const fn = callGroq as any;
        const fnStr = fn.toString();
        if (fnStr.includes("messages") || fnStr.includes("llama")) {
          return await fn([{ role: "user", content: promptText }], systemPrompt, "llama-3.3-70b-versatile", 1000);
        } else {
          return await fn(promptText, systemPrompt, "application/json");
        }
      };

      const reply = await callGroqWithModel(promptBody, systemInstruction);
      const botText = reply || "I processed your request! Let me know if you need to go deeper.";
      setMessages((prev) => [...prev, { sender: "bot" as const, text: botText }]);
      saveHistory({ prompt: finalMsg, preview: botText.slice(0, 120), output: botText, model: "rex-ai", meta: activeMode });
    } catch (err) {
      console.error(err);
      setMessages((prev) => [...prev, { sender: "bot" as const, text: "Couldn't reach the backend. Please check your connection and try again." }]);
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ─── Shared: suggestion cards ─────────────────────────────────────────────
  const suggestions = [
    { icon: "lightbulb",      label: "Key Concepts",  sub: "Break down main ideas",    action: () => insertSuggestion("Key Concepts") },
    { icon: "history_edu",    label: "Flashcard Set", sub: "Create 5-question set",     action: () => insertSuggestion("a 5-question flashcard set") },
    { icon: "schema",         label: "Visualize",     sub: "Draw concept diagram",      action: () => insertSuggestion("a visual concept diagram") },
    { icon: "search_check",   label: "Find Gaps",     sub: "Review my notes",           action: () => insertSuggestion("gaps in my notes") },
  ];


  return (
    <div className="w-full bg-[#FAF7F2] flex flex-col" style={{ minHeight: "100dvh" }}>

      <SharedSidebar active="/ai-tutor" />

      {/* ═══════════════════════════════════════════════════
          DESKTOP LAYOUT
          ═══════════════════════════════════════════════════ */}
      <div className="hidden md:flex md:ml-64 flex-col" style={{ height: "100vh" }}>

        {/* Desktop Header */}
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

        {/* Desktop Dual Pane */}
        <div className="flex flex-1 overflow-hidden">

          {/* Left Pane — 60% — controls + input */}
          <div className="w-[60%] flex flex-col border-r-2 border-black">

            {/* Learning Modes */}
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

            {/* Chat feed or empty state */}
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

            {/* Desktop input — pinned to bottom of left pane */}
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
                <button onClick={() => navigate("/sources")}
                  className="w-10 h-10 flex items-center justify-center text-black/30 hover:text-black transition-colors flex-shrink-0">
                  <span className="material-symbols-outlined">mic</span>
                </button>
                <button onClick={() => handleSend()}
                  className="w-11 h-11 bg-black text-white flex items-center justify-center border-2 border-black hover:bg-[#FF4D2E] transition-colors flex-shrink-0">
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
                </button>
              </div>
              <p className="text-center text-[11px] text-black/40 font-medium mt-3">
                Studenius AI can make mistakes. Verify important academic concepts with your textbook.
              </p>
            </div>
          </div>

          {/* Right Pane — 40% — Rex + context */}
          <div className="w-[40%] flex flex-col overflow-y-auto bg-[#FAF7F2]">

            {/* Recent Sources */}
            <div className="px-8 pt-6 pb-4 shrink-0">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-black/50 mb-3">Recent Sources</h3>
              {activeSource ? (
                <div className="border-2 border-black bg-white p-4 flex items-center gap-3" style={{ boxShadow: "3px 3px 0px #000" }}>
                  <span className="material-symbols-outlined text-[#FF4D2E]">description</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-extrabold truncate">{activeSource}</p>
                    <p className="text-[11px] font-bold text-[#E8534A]">Indexed</p>
                  </div>
                  <button onClick={handleClearSource} className="material-symbols-outlined text-[18px] text-black/30 hover:text-black transition-colors">close</button>
                </div>
              ) : (
                <button onClick={() => navigate("/sources")}
                  className="w-full border-2 border-dashed border-black/30 p-4 flex items-center justify-center gap-2 text-[13px] font-bold text-black/40 hover:border-black hover:text-black transition-all rounded-lg">
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  Attach a source
                </button>
              )}
            </div>

            {/* Rex mascot */}
            <div className="flex-1 flex flex-col items-center justify-center px-8 py-6 text-center">
              <div className="w-48 h-48 mb-6 border-2 border-black overflow-hidden" style={{ boxShadow: "4px 4px 0px #000" }}>
                <img src={foxImg} alt="Rex" className="w-full h-full object-contain" />
              </div>
              <h2 className="text-[28px] font-black mb-2">Hey, I'm Rex.</h2>
              <p className="text-[15px] text-black/60 font-medium max-w-[280px] leading-relaxed">
                {activeSource
                  ? <>I've indexed your <strong className="text-black">{activeSource.replace(/\.[^.]+$/, "")}</strong> source. Ask me to explain a concept, quiz you, or solve a problem.</>
                  : "Attach a source from your library, then ask me anything about it."}
              </p>
            </div>

            {/* Study Streak */}
            <div className="px-8 pb-8 shrink-0">
              <div className="border-2 border-black bg-[#F0EDE0] p-5 relative overflow-hidden" style={{ boxShadow: "3px 3px 0px #000" }}>
                <div className="absolute top-3 right-3">
                  <span className="material-symbols-outlined text-black/15 text-[40px]">auto_stories</span>
                </div>
                <h4 className="text-[18px] font-black mb-2">Study Streak</h4>
                <div className="flex items-end gap-1 mb-3">
                  <span className="text-[40px] font-black text-[#FF4D2E] leading-none">12</span>
                  <span className="text-[14px] font-black uppercase tracking-widest mb-1">Days</span>
                </div>
                <div className="h-3 w-full bg-[#E8E4DC] border-2 border-black rounded-full overflow-hidden">
                  <div className="h-full bg-black w-[85%]" />
                </div>
                <p className="mt-2 text-[11px] font-bold text-black/50">85% to Next Milestone (Top 5% Student)</p>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          MOBILE LAYOUT
          ═══════════════════════════════════════════════════ */}
      <div className="lg:hidden w-full flex flex-col bg-[#FAF7F2]" style={{ height: "100dvh", overflow: "hidden" }}>

        {/* Mobile TopAppBar */}
        <header className="flex items-center justify-between px-4 h-14 bg-[#FAF7F2] shrink-0 border-b-2 border-black z-10">
          <button onClick={() => navigate(-1)}
            className="flex items-center justify-center p-2 rounded-full hover:bg-[#ebe8e3] border-2 border-black bg-white w-9 h-9 shadow-[2px_2px_0px_#000]">
            <span className="material-symbols-outlined text-black text-[18px]">arrow_back</span>
          </button>
          <h1 className="text-[18px] font-black">AI Tutor</h1>
          <button onClick={() => navigate("/sources")}
            className="flex items-center justify-center p-2 rounded-full hover:bg-[#ebe8e3]">
            <span className="material-symbols-outlined text-black">library_books</span>
          </button>
        </header>

        {/* Mode Pills */}
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

        {/* Chat Feed — flex-1 + overflow-y-auto = scrollable, never clips input */}
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

        {/* Mobile Input — shrink-0 so it's always visible, never pushed off screen */}
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
          <p className="text-center text-[11px] text-black/30 font-medium py-2">
            AI can make mistakes. Verify important concepts with your textbook.
          </p>
        </footer>
      </div>

    </div>
  );
}
