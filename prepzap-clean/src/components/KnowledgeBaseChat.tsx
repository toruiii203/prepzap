import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { callGroq } from "@/lib/groq";
import { useAuth } from "@/contexts/AuthContext";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function KnowledgeBaseChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([{
    role: "assistant", 
    content: "Hi! I am your Knowledge Base AI. I have access to all your notes. Ask me anything!"
  }]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const stripHtml = (html: string) => {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || !user) return;
    
    const userMessage: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
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
        contextString = notes.map(n => `Note Title: ${n.title}\nContent: ${stripHtml(n.content || '')}`).join('\n\n---\n\n');
        // Cap context size to prevent token limits
        if (contextString.length > 12000) contextString = contextString.substring(0, 12000) + "... [truncated]";
      }

      const systemPrompt = `You are a helpful Brain Chat AI assistant built into a student's knowledge base. Use the following context extracted from the user's personal notes to answer their questions accurately. If the notes don't contain the answer, you can use your general knowledge, but prioritize the user's notes.\n\nUSER'S NOTES CONTEXT:\n${contextString}`;

      // 3. Call Groq
      const historyToKeep = messages.slice(-10); // Keep last 10 messages for context
      const response = await callGroq(
        [...historyToKeep, userMessage],
        systemPrompt,
        "openai/gpt-oss-20b",
        800,
        "brain_chat"
      );

      setMessages(prev => [...prev, { role: "assistant", content: response }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I ran into an error searching your brain!" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-80 border-l-2 border-black bg-white flex flex-col h-full z-10 shadow-[-4px_0px_0px_rgba(0,0,0,0.1)]">
      <div className="p-4 border-b-2 border-black bg-[#f0a040]">
        <h3 className="font-black text-[16px] flex items-center gap-2">
          <span className="material-symbols-outlined">hub</span> Brain Chat
        </h3>
        <p className="text-[11px] font-bold opacity-80 mt-1">Ask across all your notes</p>
      </div>
      <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3">
        {messages.map((m, i) => (
          <div key={i} className={`p-3 border-2 border-black rounded-xl font-bold text-[13px] whitespace-pre-wrap ${m.role === 'user' ? 'bg-[#FF4D2E] text-white self-end ml-4' : 'bg-[#FAF7F2] text-black self-start mr-4'}`}>
            {m.content}
          </div>
        ))}
        {isLoading && (
          <div className="p-3 border-2 border-black rounded-xl font-bold text-[13px] bg-[#FAF7F2] text-black self-start mr-4">
            <span className="material-symbols-outlined animate-spin text-[16px] inline-block align-middle mr-1">sync</span>
            Searching notes...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t-2 border-black bg-[#FAF7F2]">
        <div className="flex bg-white border-2 border-black rounded-xl overflow-hidden shadow-[2px_2px_0px_#000] focus-within:shadow-[4px_4px_0px_#000] transition-shadow">
          <input 
            type="text" 
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            disabled={isLoading}
            placeholder="Ask your notes..." 
            className="flex-1 p-3 font-bold text-[13px] outline-none disabled:opacity-50"
          />
          <button onClick={handleSend} disabled={isLoading} className="px-3 bg-black text-white hover:text-[#f0a040] transition-colors disabled:opacity-50">
            <span className="material-symbols-outlined">send</span>
          </button>
        </div>
      </div>
    </div>
  );
}
