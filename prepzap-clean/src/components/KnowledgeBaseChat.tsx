import React, { useState } from "react";

export default function KnowledgeBaseChat() {
  const [messages, setMessages] = useState<{role: string, content: string}[]>([{
    role: "assistant", 
    content: "Hi! I am your Knowledge Base AI. I have access to all your notes. Ask me anything!"
  }]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages([...messages, { role: "user", content: input }]);
    setInput("");
    setTimeout(() => {
      setMessages(prev => [...prev, { role: "assistant", content: "This is a placeholder for the RAG response. I will search your notes graph and answer shortly!" }]);
    }, 500);
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
          <div key={i} className={`p-3 border-2 border-black rounded-xl font-bold text-[13px] ${m.role === 'user' ? 'bg-[#FF4D2E] text-white self-end ml-4' : 'bg-[#FAF7F2] text-black self-start mr-4'}`}>
            {m.content}
          </div>
        ))}
      </div>
      <div className="p-4 border-t-2 border-black bg-[#FAF7F2]">
        <div className="flex bg-white border-2 border-black rounded-xl overflow-hidden shadow-[2px_2px_0px_#000]">
          <input 
            type="text" 
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Ask your notes..." 
            className="flex-1 p-3 font-bold text-[13px] outline-none"
          />
          <button onClick={handleSend} className="px-3 bg-black text-white hover:text-[#f0a040] transition-colors">
            <span className="material-symbols-outlined">send</span>
          </button>
        </div>
      </div>
    </div>
  );
}
