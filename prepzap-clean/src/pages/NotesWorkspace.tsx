import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { SharedSidebar } from "@/components/SharedSidebar";
import TiptapEditor from "@/components/TiptapEditor";

export default function NotesWorkspace() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<any[]>([]);
  const [activeNote, setActiveNote] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchNotes = async () => {
      const { data, error } = await supabase.from("notes").select("*").eq("user_id", user.id).order("updated_at", { ascending: false });
      if (data) {
        setNotes(data);
        if (data.length > 0 && !activeNote) setActiveNote(data[0]);
      }
      setLoading(false);
    };
    fetchNotes();
  }, [user]);

  const handleCreateNote = async () => {
    if (!user) return;
    const newNote = {
      user_id: user.id,
      title: "Untitled Note",
      content: "<p></p>"
    };
    const { data, error } = await supabase.from("notes").insert(newNote).select().single();
    if (data) {
      setNotes([data, ...notes]);
      setActiveNote(data);
    }
  };

  const handleUpdateContent = async (html: string) => {
    if (!activeNote) return;
    // Optimistic update locally
    setActiveNote({ ...activeNote, content: html });
    setNotes(prev => prev.map(n => n.id === activeNote.id ? { ...n, content: html } : n));
    
    // Debounced update to DB (simplistic version for now)
    await supabase.from("notes").update({ content: html, updated_at: new Date().toISOString() }).eq("id", activeNote.id);
  };

  const handleUpdateTitle = async (title: string) => {
    if (!activeNote) return;
    setActiveNote({ ...activeNote, title });
    setNotes(prev => prev.map(n => n.id === activeNote.id ? { ...n, title } : n));
    await supabase.from("notes").update({ title, updated_at: new Date().toISOString() }).eq("id", activeNote.id);
  };

  return (
    <div className="flex h-screen bg-[#F0EDE0]">
      <SharedSidebar />
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Notes List */}
        <div className="w-64 border-r-2 border-black bg-[#FAF7F2] flex flex-col">
          <div className="p-4 border-b-2 border-black flex justify-between items-center">
            <h2 className="font-black text-[16px]">My Notes</h2>
            <button onClick={handleCreateNote} className="w-8 h-8 flex items-center justify-center border-2 border-black rounded-lg hover:bg-black hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[18px]">add</span>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="p-4 text-center text-sm font-bold opacity-50">Loading...</div>
            ) : notes.length === 0 ? (
              <div className="p-4 text-center text-sm font-bold opacity-50">No notes yet</div>
            ) : (
              notes.map(note => (
                <button
                  key={note.id}
                  onClick={() => setActiveNote(note)}
                  className={`w-full text-left p-3 rounded-lg border-2 mb-2 font-bold text-[14px] transition-all ${activeNote?.id === note.id ? "border-black bg-white shadow-[2px_2px_0px_#000]" : "border-transparent hover:border-black/20 hover:bg-black/5"}`}
                >
                  {note.title || "Untitled"}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Area - Editor */}
        <div className="flex-1 flex flex-col overflow-y-auto bg-[#FAF7F2]">
          {activeNote ? (
            <div className="max-w-3xl w-full mx-auto py-12 px-8 flex flex-col gap-6">
              <input
                type="text"
                value={activeNote.title || ""}
                onChange={(e) => handleUpdateTitle(e.target.value)}
                placeholder="Note Title"
                className="text-[40px] font-black bg-transparent border-none outline-none placeholder-black/20 w-full leading-tight"
              />
              <TiptapEditor
                key={activeNote.id}
                initialContent={activeNote.content || "<p></p>"}
                onUpdate={handleUpdateContent}
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-black/40 font-bold">
              Select or create a note to begin
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
