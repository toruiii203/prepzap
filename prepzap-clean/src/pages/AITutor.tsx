import { useNavigate } from "react-router-dom";
import React, { useState, useRef, useEffect } from "react";
import { MathRenderer } from "@/components/MathRenderer";
import { callGroq } from "@/lib/groq";
import { buildAIContext, loadContext, loadLibrary } from "@/lib/sourceContext";
import { useToolHistory } from "@/pages/ToolHistory";

interface AITutorProps {}

export default function AITutor() {
  const navigate = useNavigate();
  const { save: saveHistory } = useToolHistory("ai-tutor");
  const [activeMode, setActiveMode] = useState("Explain");
  const modes = ["Explain", "ELI5", "Analogy", "Quiz Me", "Devil's Advocate", "Summarize"];

  const [inputVal, setInputVal] = useState("");
  const [messages, setMessages] = useState<Array<{ sender: "user" | "bot"; text: string }>>([
    { sender: "bot", text: "Hello! I am Rex AI, your custom study assistant. Ask me anything, or upload context from the Source Library to get started!" }
  ]);
  const [activeSource, setActiveSource] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load active source name from library on mount and keep in sync
  useEffect(() => {
    const syncSource = () => {
      const ctx = loadContext();
      const selectedIds = Array.isArray(ctx) ? ctx : (ctx as any)?.selectedIds || [];
      const libFiles = loadLibrary();
      const active = libFiles.find((f: any) => selectedIds.includes(f.id));
      setActiveSource(active ? active.name : null);
    };
    syncSource();
    // Re-sync when window gets focus (user may have added sources)
    window.addEventListener("focus", syncSource);
    return () => window.removeEventListener("focus", syncSource);
  }, []);

  const handleSend = async (textToSend?: string) => {
    const finalMsg = textToSend || inputVal;
    if (!finalMsg.trim() || isLoading) return;

    const userMsg = { sender: "user" as const, text: finalMsg };
    setMessages((prev) => [...prev, userMsg]);
    setInputVal("");
    setIsLoading(true);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      // Build context from SELECTED sources in the library
      const refContext = buildAIContext();

      // If there's no built-in context but we can see a source name, try reading it directly
      let effectiveContext = refContext;
      if (!effectiveContext) {
        const ctx = loadContext();
        const selectedIds = Array.isArray(ctx) ? ctx : (ctx as any)?.selectedIds || [];
        if (selectedIds.length > 0) {
          const libFiles = loadLibrary();
          const selectedFiles = libFiles.filter((f: any) => selectedIds.includes(f.id));
          if (selectedFiles.length > 0) {
            effectiveContext = selectedFiles.map((f: any) => {
              // For image files, include description; for text/pdf, include content
              if (f.type === "image" || (f.content && f.content.startsWith("data:image"))) {
                return `[Attached image: ${f.name}]\n(Image content was captured for visual analysis)`;
              }
              return `=== ${f.name} ===\n${f.content || ""}`;
            }).join("\n\n");
          }
        }
      }

      let systemInstruction = "You are Rex AI, Studenius's custom study assistant. Never reveal you are any other AI or model. Always refer to yourself as Rex AI. Speak clearly, concisely, and keep explanations elegant.";

      if (activeMode === "ELI5") {
        systemInstruction = "You are Rex AI, Studenius's custom study assistant. You are a friendly teacher explaining concepts to a 5-year old. Use super simple analogies, short sentences, and a warm tone. Avoid jargon entirely.";
      } else if (activeMode === "Analogy") {
        systemInstruction = "You are Rex AI, Studenius's custom study assistant. You are a creative tutor specializing in analogies. Explain the topic or answer the question by creating a vivid, memorable analogy pairing (e.g. comparing it to a factory, kitchen, or engine).";
      } else if (activeMode === "Quiz Me") {
        systemInstruction = "You are Rex AI, Studenius's custom study assistant. Ask a challenging but fun single-question multiple-choice quiz related to the user's prompt or source text. Provide options A, B, C, D and wait for them to answer.";
      } else if (activeMode === "Devil's Advocate") {
        systemInstruction = "You are Rex AI, Studenius's custom study assistant. Challenge the user's view or construct a Socratic response. Politely expose logical gaps or steel-man the opposing side to deepen their understanding.";
      } else if (activeMode === "Summarize") {
        systemInstruction = "You are Rex AI, Studenius's custom study assistant. Provide a high-yield bulleted cheat-sheet summary of the query or attached text. Highlight vocabulary, main formulas, and key processes clearly.";
      }

      // Inject source content into system prompt if available
      if (effectiveContext) {
        systemInstruction += `\n\nThe student has attached the following reference material. Base your answers on this content when relevant:\n\n${effectiveContext}`;
      }

      const promptBody = messages.length > 1
        ? `Given our study history, answer this: ${finalMsg}`
        : finalMsg;

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

      const botText = reply || "I processed your request beautifully! Let me know if you need to go deeper.";
      setMessages((prev) => [
        ...prev,
        { sender: "bot" as const, text: botText }
      ]);
      saveHistory({ prompt: finalMsg, preview: botText.slice(0, 120), output: botText, model: "rex-ai", meta: activeMode });
    } catch (err: any) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { sender: "bot" as const, text: "////// Oh, I couldn't reach the backend brains! Please make sure your server is running and try again." }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const insertSuggestion = (title: string) => {
    handleSend(`Can you make a study sheet or explain ${title}?`);
  };

  // Auto-grow textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputVal(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="w-full flex flex-col bg-[#fcf9f4]" style={{ height: "100dvh", maxHeight: "100dvh", overflow: "hidden", flex: 1 }}>
      {/* TopAppBar */}
      <header className="flex items-center justify-between px-4 h-16 w-full bg-[#FAF7F2] z-10 sticky top-0 border-b-2 border-[#1A1A1A] shrink-0">
        <button
          aria-label="Go back"
          onClick={() => navigate(-1)}
          className="flex items-center justify-center p-2 rounded-full hover:bg-[#ebe8e3] transition-colors active:translate-y-0.5 border-2 border-[#1A1A1A] bg-white w-9 h-9 shadow-[2px_2px_0px_rgba(0,0,0,1)]"
        >
          <span className="material-symbols-outlined text-[#1A1A1A] text-[18px]">arrow_back</span>
        </button>
        <h1 className="font-headline text-[20px] text-[#1A1A1A] font-extrabold tracking-tight">AI Tutor</h1>
        <button
          aria-label="Source Library"
          onClick={() => navigate("/sources")}
          className="flex items-center justify-center p-2 rounded-full hover:bg-[#ebe8e3] transition-colors active:translate-y-0.5"
          title="Source Library"
        >
          <span className="material-symbols-outlined text-[#1A1A1A]">library_books</span>
        </button>
      </header>

      {/* Mode Pills */}
      <div className="w-full px-4 py-2 overflow-x-auto no-scrollbar flex space-x-2 shrink-0 bg-[#FAF7F2] border-b-2 border-[#1A1A1A]">
        {modes.map((mode) => (
          <button
            key={mode}
            onClick={() => setActiveMode(mode)}
            className={`shrink-0 px-4 py-1.5 border-2 border-[#1A1A1A] rounded-full text-[13px] font-bold whitespace-nowrap transition-all duration-100 ${
              activeMode === mode
                ? "bg-[#ae2925] text-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                : "bg-white text-[#1A1A1A] hover:bg-[#ebe8e3]"
            }`}
          >
            {mode}
          </button>
        ))}
      </div>

      {/* Chat Feed — fills all remaining space and scrolls */}
      <main className="flex-1 overflow-y-auto px-4 py-4 bg-[#FAF7F2]">
        {messages.length <= 1 && !messages.find(m => m.sender === "user") ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 pb-4">
            <div className="w-24 h-24 relative">
              <div className="absolute inset-0 bg-white rounded-full border-2 border-[#1A1A1A] shadow-[2px_2px_0px_0px_#1A1A1A] flex items-center justify-center overflow-hidden">
                <img
                  alt="Rex AI"
                  className="w-full h-full object-cover opacity-90"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCc63uisIamWJ5-RGd-eTGRggtXe2G-vZFx4j_n1boryI-E4vd4dOpOPTpklWQGyawKLkcCcs00CytdTdnQRGN2DBhf-xdu9f6TobVS4-SnAaua7SKIYmfLF4fY6Ev-QL1K9ZsupOUlfkRXCbkCZ5VXNhTZNZAtjqBQo0_m2fXAsbS5bD0SfZdYXwjxFIiH1_GxzGSWCV692kt9pITLvuxptHkhyNjHLH3TFtZa8OiR-p7IWe2UOcblhr4ZjrpTd_-Yb2fzDskta06K"
                />
              </div>
              <span className="material-symbols-outlined absolute -top-1 -right-1 text-[#ae2925] text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>sparkle</span>
            </div>
            <h2 className="font-extrabold text-[20px] text-center text-[#1A1A1A]">Ready to study?</h2>
            <p className="text-[13px] text-center text-[#666] max-w-[260px]">
              Ask me anything about your notes, or pick a suggestion below.
            </p>
            <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
              {[
                { icon: "lightbulb", label: "Key Concepts", sub: "Break down main ideas", action: () => insertSuggestion("Key Concepts") },
                { icon: "psychology_alt", label: "Practice Test", sub: "Generate 5 questions", action: () => insertSuggestion("Practice Test") },
                { icon: "history_edu", label: "Flashcards", sub: "Make study cards", action: () => navigate("/flashcards") },
                { icon: "draw", label: "Mind Map", sub: "Connect the topics", action: () => insertSuggestion("Mind Map") },
              ].map(({ icon, label, sub, action }) => (
                <button key={label} onClick={action}
                  className="bg-white border-2 border-[#1A1A1A] rounded-2xl p-4 flex flex-col items-start text-left shadow-[2px_2px_0px_0px_#1A1A1A] hover:bg-[#ebe8e3] transition-colors"
                >
                  <span className="material-symbols-outlined text-[#ae2925] mb-2 text-[22px]">{icon}</span>
                  <span className="font-bold text-[13px] text-[#1A1A1A]">{label}</span>
                  <span className="text-[11px] text-[#666] mt-0.5">{sub}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex flex-col max-w-[82%] ${
                  msg.sender === "user" ? "self-end items-end" : "self-start items-start"
                }`}
              >
                <div
                  className={`p-3 rounded-2xl border-2 border-[#1A1A1A] ${
                    msg.sender === "user"
                      ? "bg-[#ae2925] text-white font-semibold shadow-[2px_2px_0px_0px_#1A1A1A]"
                      : "bg-white text-[#1A1A1A] shadow-[2px_2px_0px_0px_#1A1A1A]"
                  }`}
                >
                  <p className="text-[14px] leading-relaxed whitespace-pre-line">{msg.text}</p>
                </div>
                <span className="text-[10px] text-[#888] mt-1 px-1">
                  {msg.sender === "user" ? "You" : "Rex AI"}
                </span>
              </div>
            ))}
            {isLoading && (
              <div className="flex flex-col max-w-[80%] self-start items-start">
                <div className="p-3 rounded-2xl border-2 border-[#1A1A1A] bg-white shadow-[2px_2px_0px_0px_#1A1A1A] flex items-center gap-2">
                  <span className="material-symbols-outlined animate-spin text-[#ae2925] text-[18px]">autorenew</span>
                  <span className="text-[13px] font-bold text-[#1A1A1A]">Rex is thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      {/* Bottom Input — always anchored, never cut off */}
      <footer className="w-full bg-white border-t-2 border-[#1A1A1A] px-4 pt-3 pb-4 shrink-0 flex flex-col gap-2 z-20"
        style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>

        {/* Active Source Chip */}
        {activeSource && (
          <div className="flex items-center self-start bg-[#f0ece6] border-2 border-[#1A1A1A] rounded-full px-3 py-1">
            <span className="material-symbols-outlined text-[#1A1A1A] text-[15px] mr-1">attach_file</span>
            <span className="text-[12px] font-bold text-[#1A1A1A] truncate max-w-[200px]">Active: {activeSource}</span>
            <button
              onClick={() => {
                setActiveSource(null);
                // Also clear from context
                const { saveContext } = require("@/lib/sourceContext");
                saveContext([]);
              }}
              className="ml-2 hover:bg-[#ebe8e3] rounded-full p-0.5"
            >
              <span className="material-symbols-outlined text-[#1A1A1A] text-[14px]">close</span>
            </button>
          </div>
        )}

        <div className="flex items-end gap-2 w-full">
          {/* Attach button → go to sources */}
          <button
            onClick={() => navigate("/sources")}
            className="w-11 h-11 shrink-0 bg-white border-2 border-[#1A1A1A] rounded-xl flex items-center justify-center shadow-[2px_2px_0px_0px_#1A1A1A] active:translate-y-0.5 active:shadow-none text-[#1A1A1A]"
          >
            <span className="material-symbols-outlined text-[20px]">attach_file</span>
          </button>

          {/* Textarea */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={inputVal}
              onChange={handleTextareaChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={1}
              className="w-full min-h-[44px] max-h-[120px] bg-white border-2 border-[#1A1A1A] rounded-xl px-4 py-2.5 text-[14px] text-[#1A1A1A] placeholder:text-[#aaa] resize-none focus:outline-none shadow-[2px_2px_0px_0px_#1A1A1A]"
              placeholder="Message AI Tutor..."
              style={{ overflowY: "auto" }}
            />
          </div>

          {/* Send */}
          <button
            onClick={() => handleSend()}
            className="w-11 h-11 shrink-0 bg-[#ae2925] border-2 border-[#1A1A1A] rounded-xl flex items-center justify-center shadow-[2px_2px_0px_0px_#1A1A1A] active:translate-y-0.5 active:shadow-none"
          >
            <span className="material-symbols-outlined text-white text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
