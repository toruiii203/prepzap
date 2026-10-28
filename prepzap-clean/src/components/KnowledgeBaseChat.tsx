import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { callGroq } from "@/lib/groq";
import { useAuth } from "@/contexts/AuthContext";
import { playPop, playTap } from "@/lib/soundFX";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface KnowledgeBaseChatProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function KnowledgeBaseChat({ isOpen = false, onClose }: KnowledgeBaseChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Rex is ready. Ask any question based on your notes and study materials!",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const stripHtml = (html: string) => {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || !user) return;

    playTap();
    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // 1. Fetch all notes to use as RAG context
      const { data: notes } = await supabase
        .from("notes")
        .select("title, content")
        .eq("user_id", user.id);

      // 2. Build context string
      let contextString = "No notes available.";
      if (notes && notes.length > 0) {
        contextString = notes
          .map((n) => `Note Title: ${n.title}\nContent: ${stripHtml(n.content || "")}`)
          .join("\n\n---\n\n");
        // Cap context size to prevent token limits
        if (contextString.length > 12000) {
          contextString = contextString.substring(0, 12000) + "... [truncated]";
        }
      }

      const systemPrompt = `You are Rex Brain, a sharp and friendly AI study tutor built into Studenius. Use the following context extracted from the user's personal notes to answer their questions accurately. If the notes don't contain the answer, you can use your general knowledge, but prioritize the user's notes.\n\nUSER'S NOTES CONTEXT:\n${contextString}`;

      // 3. Call Groq
      const historyToKeep = messages.slice(-10);
      const response = await callGroq(
        [...historyToKeep, userMessage],
        systemPrompt,
        "openai/gpt-oss-20b",
        800,
        "brain_chat"
      );

      setMessages((prev) => [...prev, { role: "assistant", content: response }]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I ran into an error searching your notes!" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end md:static md:z-20 md:w-85 md:flex-shrink-0 animate-fade-in">
      {/* Mobile Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs md:hidden"
        onClick={() => {
          playPop();
          onClose?.();
        }}
      />

      {/* Chat Column / Drawer */}
      <div className="relative w-full sm:w-[360px] md:w-85 border-l-2 border-black bg-white flex flex-col h-full z-10 shadow-[-6px_0px_0px_rgba(0,0,0,0.1)]">
        {/* Header */}
        <div className="p-3.5 border-b-2 border-black bg-[#FFD13B] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-black text-[#FFD13B] flex items-center justify-center font-black">
              <span className="material-symbols-outlined text-[18px]">hub</span>
            </div>
            <div>
              <h3 className="font-black text-[15px] leading-tight text-black flex items-center gap-1.5">
                Rex Brain Chat
              </h3>
              <p className="text-[10.5px] font-bold text-black/70">Ask across your notes</p>
            </div>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={() => {
                playPop();
                onClose();
              }}
              className="w-7 h-7 rounded-lg border-2 border-black bg-white hover:bg-black hover:text-white transition-all flex items-center justify-center shadow-[1px_1px_0px_#1A1A1A] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
              title="Close Rex Brain Chat"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 p-3.5 overflow-y-auto flex flex-col gap-2.5 bg-[#FAF7F2]/40 select-text">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`p-3 border-2 border-black rounded-xl font-bold text-[12.5px] leading-relaxed whitespace-pre-wrap shadow-[2px_2px_0px_#1A1A1A] ${
                m.role === "user"
                  ? "bg-[#10B981] text-white self-end ml-6"
                  : "bg-white text-black self-start mr-4"
              }`}
            >
              {m.content}
            </div>
          ))}
          {isLoading && (
            <div className="p-3 border-2 border-black rounded-xl font-bold text-[12.5px] bg-white text-black self-start mr-4 shadow-[2px_2px_0px_#1A1A1A]">
              <span className="material-symbols-outlined animate-spin text-[15px] inline-block align-middle mr-1.5">
                sync
              </span>
              Rex is searching your notes...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Composer */}
        <div className="p-3 border-t-2 border-black bg-[#FAF7F2]">
          <div className="flex bg-white border-2 border-black rounded-xl overflow-hidden shadow-[2px_2px_0px_#000] focus-within:shadow-[3px_3px_0px_#000] transition-shadow">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              disabled={isLoading}
              placeholder="Ask a question about your notes..."
              className="flex-1 px-3 py-2.5 font-bold text-[12.5px] outline-none disabled:opacity-50 placeholder:text-black/35"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="px-3 bg-black text-white hover:text-[#FFD13B] transition-colors disabled:opacity-30 flex items-center justify-center cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
