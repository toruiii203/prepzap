import { useNavigate } from "react-router-dom";
import React, { useState, useRef, useEffect } from "react";
import { MathRenderer } from "@/components/MathRenderer";
import { callGroq } from "@/lib/groq";
import { buildAIContext, loadContext, loadLibrary } from "@/lib/sourceContext";
import { useToolHistory } from "@/pages/ToolHistory";

interface AITutorProps {
}

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

  // Load the first selected source initially to match mockup
  useEffect(() => {
    const ctx = loadContext();
    const selectedIds = Array.isArray(ctx) ? ctx : (ctx as any)?.selectedIds || [];
    const libFiles = loadLibrary();
    const active = libFiles.find(f => selectedIds.includes(f.id));
    if (active) {
      setActiveSource(active.name);
    } else {
      setActiveSource(null);
    }
  }, []);

  const handleSend = async (textToSend?: string) => {
    const finalMsg = textToSend || inputVal;
    if (!finalMsg.trim() || isLoading) return;

    // Add User Message
    const userMsg = { sender: "user" as const, text: finalMsg };
    setMessages((prev) => [...prev, userMsg]);
    setInputVal("");
    setIsLoading(true);

    try {
      // Build dynamic context prompt using selected Source files
      const refContext = buildAIContext();
      
      // Select system prompt instruction based on Mode tab
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

      if (refContext) {
        systemInstruction += `\nUse the following reference content uploaded by the student to contextualize your replies:\n${refContext}`;
      }

      const promptBody = messages.length > 1 
        ? `Given our study history, answer this: ${finalMsg}`
        : finalMsg;

      // Safe callGroq signature resolver mapping to local or remote environments
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

  // Scroll to bottom when messages list changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="w-full min-h-full bg-[#fcf9f4] flex flex-col flex-1 overflow-hidden">
      {/* TopAppBar */}
      <header className="flex items-center justify-between px-edge-margin h-16 w-full bg-background z-10 sticky top-0 border-b-2 border-[#1A1A1A]">
        <button 
          aria-label="Go back" 
          onClick={() => navigate("/dashboard")}
          className="flex items-center justify-center p-2 rounded-full hover:bg-surface-container-high transition-colors active:translate-y-0.5 active:translate-x-0.5"
        >
          <span className="material-symbols-outlined text-on-background">arrow_back</span>
        </button>
        <h1 className="font-headline text-headline-md text-on-background font-extrabold tracking-tight">AI Tutor</h1>
        <button 
          aria-label="Settings" 
          onClick={() => navigate("/daily5")}
          className="flex items-center justify-center p-2 rounded-full hover:bg-surface-container-high transition-colors active:translate-y-0.5 active:translate-x-0.5"
        >
          <span className="material-symbols-outlined text-on-background">emoji_events</span>
        </button>
      </header>

      {/* Mode Pills (Horizontal Scroll) */}
      <div className="w-full px-edge-margin py-[8px] overflow-x-auto no-scrollbar flex space-x-2 shrink-0 bg-background border-b-2 border-[#1A1A1A]">
        {modes.map((mode) => (
          <button
            key={mode}
            onClick={() => setActiveMode(mode)}
            className={`shrink-0 px-4 py-2 border-2 border-[#1A1A1A] rounded-full font-label-md flex items-center justify-center whitespace-nowrap transition-all duration-100 ${
              activeMode === mode
                ? "bg-primary text-on-primary font-bold shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                : "bg-surface-container-lowest text-on-background hover:bg-surface-container-high"
            }`}
          >
            {mode}
          </button>
        ))}
      </div>

      {/* Main Content Area: Chat Feed or Empty State */}
      <main className="flex-1 overflow-y-auto px-edge-margin py-6 flex flex-col bg-background relative">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            {/* Centered Fox Illustration */}
            <div className="w-32 h-32 mb-6 relative">
              <div className="absolute inset-0 bg-surface-container-highest rounded-full border-2 border-[#1A1A1A] ink-shadow-sm flex items-center justify-center overflow-hidden bg-white">
                <img 
                  alt="Fox illustration placeholder" 
                  className="w-full h-full object-cover opacity-90" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCc63uisIamWJ5-RGd-eTGRggtXe2G-vZFx4j_n1boryI-E4vd4dOpOPTpklWQGyawKLkcCcs00CytdTdnQRGN2DBhf-xdu9f6TobVS4-SnAaua7SKIYmfLF4fY6Ev-QL1K9ZsupOUlfkRXCbkCZ5VXNhTZNZAtjqBQo0_m2fXAsbS5bD0SfZdYXwjxFIiH1_GxzGSWCV692kt9pITLvuxptHkhyNjHLH3TFtZa8OiR-p7IWe2UOcblhr4ZjrpTd_-Yb2fzDskta06K"
                />
              </div>
              {/* Decorative sparkle */}
              <span className="material-symbols-outlined absolute -top-2 -right-2 text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>sparkle</span>
            </div>

            {/* Welcome Text */}
            <h2 className="font-headline text-headline-lg text-center mb-2 text-[#1A1A1A]">Ready to study?</h2>
            <p className="font-body-md text-center text-on-surface-variant mb-6 max-w-[280px]">
              Ask me anything about your current notes, or pick a suggestion to start.
            </p>

            {/* 2x2 Grid of Suggestion Chips */}
            <div className="grid grid-cols-2 gap-4 w-full max-w-sm mb-4">
              <button 
                onClick={() => insertSuggestion("Key Concepts")}
                className="bg-white border-2 border-[#1A1A1A] rounded-2xl p-4 flex flex-col items-start text-left ink-shadow-sm hover:bg-surface-container-high transition-colors"
              >
                <span className="material-symbols-outlined text-primary mb-2">lightbulb</span>
                <span className="font-label-md font-bold text-[#1A1A1A]">Key Concepts</span>
                <span className="text-[11px] text-on-surface-variant mt-1 leading-snug">Break down main ideas</span>
              </button>

              <button 
                onClick={() => insertSuggestion("Practice Test")}
                className="bg-white border-2 border-[#1A1A1A] rounded-2xl p-4 flex flex-col items-start text-left ink-shadow-sm hover:bg-surface-container-high transition-colors"
              >
                <span className="material-symbols-outlined text-primary mb-2">psychology_alt</span>
                <span className="font-label-md font-bold text-[#1A1A1A]">Practice Test</span>
                <span className="text-[11px] text-on-surface-variant mt-1 leading-snug">Generate 5 questions</span>
              </button>

              <button 
                onClick={() => navigate("/flashcards")}
                className="bg-white border-2 border-[#1A1A1A] rounded-2xl p-4 flex flex-col items-start text-left ink-shadow-sm hover:bg-surface-container-high transition-colors"
              >
                <span className="material-symbols-outlined text-primary mb-2">history_edu</span>
                <span className="font-label-md font-bold text-[#1A1A1A]">Flashcards</span>
                <span className="text-[11px] text-on-surface-variant mt-1 leading-snug">Make study cards</span>
              </button>

              <button 
                onClick={() => insertSuggestion("Mind Map")}
                className="bg-white border-2 border-[#1A1A1A] rounded-2xl p-4 flex flex-col items-start text-left ink-shadow-sm hover:bg-surface-container-high transition-colors"
              >
                <span className="material-symbols-outlined text-primary mb-2">draw</span>
                <span className="font-label-md font-bold text-[#1A1A1A]">Mind Map</span>
                <span className="text-[11px] text-on-surface-variant mt-1 leading-snug">Connect the topics</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={`flex flex-col max-w-[80%] ${
                  msg.sender === "user" ? "self-end items-end" : "self-start items-start"
                }`}
              >
                <div 
                  className={`p-3 rounded-2xl border-2 border-[#1A1A1A] ml-1 mr-1 ${
                    msg.sender === "user" 
                      ? "bg-primary text-[#FAF7F2] font-semibold shadow-[2px_2px_0px_0px_#1A1A1A]" 
                      : "bg-white text-on-background shadow-[2px_2px_0px_0px_#1A1A1A]"
                  }`}
                >
                  <p className="text-[14px] leading-relaxed whitespace-pre-line">{msg.text}</p>
                </div>
                <span className="text-[10px] text-on-surface-variant opacity-65 mt-1 px-2">
                  {msg.sender === "user" ? "You" : "Rex AI"}
                </span>
              </div>
            ))}
            {isLoading && (
              <div className="flex flex-col max-w-[80%] self-start items-start animate-pulse">
                <div className="p-3 rounded-2xl border-2 border-[#1A1A1A] bg-white text-on-background shadow-[2px_2px_0px_0px_#1A1A1A] flex items-center gap-2">
                  <span className="material-symbols-outlined animate-spin text-primary text-[18px]">autorenew</span>
                  <span className="text-[13px] font-bold">Rex is thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      {/* Bottom Input Area */}
      <footer className="w-full bg-white border-t-2 border-[#1A1A1A] px-edge-margin pt-3 pb-6 shrink-0 flex flex-col gap-2 z-20 sticky bottom-0" style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
        {/* Source Active Chip */}
        {activeSource && (
          <div className="flex items-center self-start bg-inverse-on-surface border-2 border-[#1A1A1A] rounded-full px-3 py-1 mb-1">
            <span className="material-symbols-outlined text-[#1A1A1A] text-[16px] mr-1">attach_file</span>
            <span className="font-label-sm text-label-sm text-[#1A1A1A] truncate max-w-[200px]">Active source: {activeSource}</span>
            <button 
              onClick={() => setActiveSource(null)}
              aria-label="Remove source" 
              className="ml-2 flex items-center justify-center hover:bg-[#FAF7F2] rounded-full p-0.5 border border-transparent hover:border-black/20"
            >
              <span className="material-symbols-outlined text-[#1A1A1A] text-[16px]">close</span>
            </button>
          </div>
        )}

        {/* Input Bar */}
        <div className="flex items-end gap-2 w-full">
          {/* Attach Button */}
          <button 
            onClick={() => navigate("/sources")}
            aria-label="Attach file" 
            className="w-12 h-12 shrink-0 bg-white border-2 border-[#1A1A1A] rounded-2xl flex items-center justify-center ink-shadow-sm active:translate-y-0.5 active:translate-x-0.5 active:shadow-[1px_1px_0px_0px_#1A1A1A] text-[#1A1A1A]"
          >
            <span className="material-symbols-outlined">attach_file</span>
          </button>

          {/* Input Box */}
          <div className="flex-1 relative">
            <textarea 
              aria-label="Message input" 
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={1}
              className="w-full min-h-[48px] max-h-[120px] bg-white border-2 border-[#1A1A1A] rounded-2xl px-4 py-3 font-body-md text-[14px] text-[#1A1A1A] placeholder:text-on-surface-variant placeholder:opacity-60 resize-none focus:outline-none focus:ring-0 focus:border-[#1A1A1A] ink-shadow-sm" 
              placeholder="Message AI Tutor..." 
            />
          </div>

          {/* Send Button */}
          <button 
            onClick={() => handleSend()}
            aria-label="Send message" 
            className="w-12 h-12 shrink-0 bg-primary border-2 border-[#1A1A1A] rounded-2xl flex items-center justify-center ink-shadow-sm active:translate-y-0.5 active:translate-x-0.5 active:shadow-[1px_1px_0px_0px_#1A1A1A] text-[#FAF7F2]"
          >
            <span 
              className="material-symbols-outlined" 
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              send
            </span>
          </button>
        </div>
      </footer>
    </div>
  );
}
