import React, { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { withTimeout } from "@/lib/withTimeout";
import { useAuth } from "@/contexts/AuthContext";
import { SharedSidebar } from "@/components/SharedSidebar";
import { useTutorialModal } from "@/hooks/useTutorialModal";
import { TutorialModal } from "@/components/TutorialModal";
import { TUTORIAL_CONTENT } from "@/lib/tutorialContent";
import TiptapEditor from "@/components/TiptapEditor";
import { loadLibrary } from "@/lib/sourceContext";
import KnowledgeGraph from "@/components/KnowledgeGraph";
import KnowledgeBaseChat from "@/components/KnowledgeBaseChat";
import { playPop, playTap, playSuccess } from "@/lib/soundFX";
import { useNavigate } from "react-router-dom";

interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at?: string;
  updated_at?: string;
}

const NOTE_TEMPLATES = [
  {
    id: "blank",
    title: "Blank Document",
    badge: "Clean Slate",
    icon: "edit_note",
    description: "Freeform study notes, lecture scratchpad, or brainstorming.",
    content: "<p></p>",
  },
  {
    id: "cornell",
    title: "Cornell Method",
    badge: "Active Recall",
    icon: "view_column",
    description: "Structured layout with cues, detailed notes, and a 3-sentence summary.",
    content: `<h2><strong>Cornell Note: [Topic / Concept]</strong></h2><p><em>Date: ${new Date().toLocaleDateString()} | Subject: General</em></p><hr/><h3><strong>1. Cue Column & Keywords</strong></h3><ul><li>What is the core definition of this concept?</li><li>What problem does this solve?</li><li>Key test question #1</li></ul><hr/><h3><strong>2. Notes & Key Points</strong></h3><p>Write your detailed lecture or textbook notes here:</p><ul><li>Main principle or law...</li><li>Step-by-step example...</li><li>Critical nuance or exception...</li></ul><hr/><h3><strong>3. Quick Summary</strong></h3><p>In 2 to 3 sentences, summarize the biggest takeaways of this topic in your own words.</p>`,
  },
  {
    id: "lecture",
    title: "Lecture & Class Notes",
    badge: "High Yield",
    icon: "school",
    description: "Capture professor insights, key equations, and homework follow-ups.",
    content: `<h2><strong>Lecture: [Unit Title]</strong></h2><p><strong>Course / Instructor:</strong> </p><h3><strong>🎯 Key Takeaways</strong></h3><ul><li>Key idea 1</li><li>Key idea 2</li><li>Key idea 3</li></ul><h3><strong>📌 Definitions & Formulas</strong></h3><p>List any formulas, constants, or technical definitions mentioned:</p><ul><li>Term 1: Definition</li><li>Formula: </li></ul><h3><strong>✅ Action Items & Homework</strong></h3><ul><li>[ ] Review textbook chapter</li><li>[ ] Complete practice problem set</li></ul>`,
  },
  {
    id: "exam_review",
    title: "Exam Cheat Sheet",
    badge: "Test Prep",
    icon: "local_fire_department",
    description: "Distill high-yield facts, mnemonics, and frequent exam traps.",
    content: `<h2><strong>🔥 Exam High-Yield Sheet: [Subject]</strong></h2><p><strong>Exam Date:</strong> </p><h3><strong>⚡ Must-Know Facts & Rules</strong></h3><ul><li>Must-know rule #1: </li><li>Must-know rule #2: </li></ul><h3><strong>⚠️ Common Traps & Pitfalls</strong></h3><ul><li>Watch out for: </li><li>Common calculation mistake: </li></ul><h3><strong>🧠 Mnemonics & Memory Triggers</strong></h3><p>Write associations or rhymes to quickly remember sequences.</p>`,
  },
];

export default function NotesWorkspace() {
  const tutorial = useTutorialModal("/notes");
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [showGraph, setShowGraph] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [syncStatus, setSyncStatus] = useState<"saved" | "saving" | "offline">("saved");
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showBrainChat, setShowBrainChat] = useState(false);

  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cacheKey = user ? `studenius_notes_cache_${user.id}` : null;

  const saveToLocal = (updatedNotes: Note[]) => {
    if (cacheKey) {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(updatedNotes));
      } catch (e) {
        console.warn("Local storage cache write failed:", e);
      }
    }
  };

  // Instant load from localStorage, then background sync with Supabase
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    if (cacheKey) {
      try {
        const cachedRaw = localStorage.getItem(cacheKey);
        if (cachedRaw) {
          const parsed = JSON.parse(cachedRaw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setNotes(parsed);
            setActiveNote(parsed[0]);
            setLoading(false);
          }
        }
      } catch (err) {
        console.warn("Failed reading cached notes:", err);
      }
    }

    const fetchNotes = async () => {
      try {
        const { data, error } = await withTimeout(
          supabase
            .from("notes")
            .select("*")
            .eq("user_id", user.id)
            .order("updated_at", { ascending: false }),
          8000,
          "fetch notes"
        );

        if (error) throw error;

        if (data) {
          setNotes(data);
          saveToLocal(data);
          setActiveNote((prev) => {
            if (!prev) return data.length > 0 ? data[0] : null;
            return data.find((n) => n.id === prev.id) || data[0] || null;
          });
        }
        setSyncStatus("saved");
      } catch (err: any) {
        console.warn("Supabase notes fetch warning:", err?.message || err);
        setSyncStatus("offline");
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, [user]);

  // Keep knowledge links updated for mention extensions
  useEffect(() => {
    try {
      const sources = loadLibrary();
      (window as any)._availableLinks = [
        ...notes.map((n) => ({ id: n.id, label: n.title || "Untitled", type: "note" })),
        ...sources.map((s: any) => ({ id: s.id, label: s.name, type: "source" })),
      ];
    } catch {}
  }, [notes]);

  const handleCreateNote = async (templateId = "blank") => {
    if (!user) return;
    playPop();
    setShowTemplateModal(false);

    const template = NOTE_TEMPLATES.find((t) => t.id === templateId) || NOTE_TEMPLATES[0];
    const tempId = "note_" + Date.now();
    const newNote: Note = {
      id: tempId,
      user_id: user.id,
      title: template.id === "blank" ? "Untitled Note" : template.title,
      content: template.content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const nextNotes = [newNote, ...notes];
    setNotes(nextNotes);
    setActiveNote(newNote);
    saveToLocal(nextNotes);
    setSyncStatus("saving");

    try {
      const { data, error } = await supabase
        .from("notes")
        .insert({
          user_id: user.id,
          title: newNote.title,
          content: newNote.content,
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        const syncedNotes = nextNotes.map((n) => (n.id === tempId ? data : n));
        setNotes(syncedNotes);
        setActiveNote(data);
        saveToLocal(syncedNotes);
      }
      setSyncStatus("saved");
    } catch (err) {
      console.warn("Could not save new note to cloud immediately, kept in local cache:", err);
      setSyncStatus("offline");
    }
  };

  const handleUpdateContent = (html: string) => {
    if (!activeNote) return;
    const nowIso = new Date().toISOString();
    const updatedNote = { ...activeNote, content: html, updated_at: nowIso };

    setActiveNote(updatedNote);
    const updatedNotes = notes.map((n) => (n.id === activeNote.id ? updatedNote : n));
    setNotes(updatedNotes);
    saveToLocal(updatedNotes);
    setSyncStatus("saving");

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        if (!activeNote.id.startsWith("note_")) {
          await supabase
            .from("notes")
            .update({ content: html, updated_at: nowIso })
            .eq("id", activeNote.id);
        }
        setSyncStatus("saved");
      } catch (err) {
        console.warn("Debounced note content save failed:", err);
        setSyncStatus("offline");
      }
    }, 800);
  };

  const handleUpdateTitle = (title: string) => {
    if (!activeNote) return;
    const nowIso = new Date().toISOString();
    const updatedNote = { ...activeNote, title, updated_at: nowIso };

    setActiveNote(updatedNote);
    const updatedNotes = notes.map((n) => (n.id === activeNote.id ? updatedNote : n));
    setNotes(updatedNotes);
    saveToLocal(updatedNotes);
    setSyncStatus("saving");

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        if (!activeNote.id.startsWith("note_")) {
          await supabase
            .from("notes")
            .update({ title, updated_at: nowIso })
            .eq("id", activeNote.id);
        }
        setSyncStatus("saved");
      } catch (err) {
        console.warn("Debounced note title save failed:", err);
        setSyncStatus("offline");
      }
    }, 800);
  };

  const handleDeleteNote = async (noteId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm("Are you sure you want to delete this note?")) return;
    playTap();

    const remaining = notes.filter((n) => n.id !== noteId);
    setNotes(remaining);
    saveToLocal(remaining);

    if (activeNote?.id === noteId) {
      setActiveNote(remaining.length > 0 ? remaining[0] : null);
    }

    try {
      if (!noteId.startsWith("note_")) {
        await supabase.from("notes").delete().eq("id", noteId);
      }
    } catch (err) {
      console.warn("Delete note error:", err);
    }
  };

  const handleExportToFlashcards = () => {
    if (!activeNote) return;
    playSuccess();
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = activeNote.content || "";
    const cleanText = `${activeNote.title}\n\n${tempDiv.textContent || tempDiv.innerText || ""}`.trim();

    localStorage.setItem("qs_practice_export", JSON.stringify(cleanText));
    navigate("/flashcards");
  };

  // Note text stats
  const noteStats = useMemo(() => {
    if (!activeNote?.content) return { words: 0, chars: 0, readMin: 1 };
    const temp = document.createElement("div");
    temp.innerHTML = activeNote.content;
    const plain = (temp.textContent || temp.innerText || "").trim();
    const words = plain.length > 0 ? plain.split(/\s+/).length : 0;
    return {
      words,
      chars: plain.length,
      readMin: Math.max(1, Math.ceil(words / 200)),
    };
  }, [activeNote?.content]);

  // Filtered notes for sidebar search
  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;
    const q = searchQuery.toLowerCase();
    return notes.filter((n) =>
      (n.title || "").toLowerCase().includes(q) ||
      (n.content || "").toLowerCase().includes(q)
    );
  }, [notes, searchQuery]);

  return (
    <div className="flex h-screen bg-[#FAF7F2] text-[#1A1A1A] overflow-hidden select-none">
      <TutorialModal
        isOpen={tutorial.isOpen}
        onDismiss={tutorial.dismiss}
        features={TUTORIAL_CONTENT["/notes"] || []}
        title="Studenius Notes Studio"
      />
      
      <SharedSidebar active="/notes" />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex overflow-hidden md:ml-64 pb-16 md:pb-0">
        
        {/* ── Left Column: Notes Directory ── */}
        <div
          className={`w-full md:w-80 border-r-2 border-black bg-[#FAF7F2] flex-col ${
            activeNote || showGraph ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Header */}
          <div className="p-4 border-b-2 border-black bg-white/70 backdrop-blur-sm flex items-center justify-between gap-2">
            <div>
              <h2 className="font-black text-[18px] tracking-tight text-black flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[20px] text-[#AE2925]">edit_document</span>
                My Notes
              </h2>
              <p className="text-[11px] font-bold text-black/50">
                {notes.length} {notes.length === 1 ? "document" : "documents"} saved
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => tutorial.show()}
                className="w-8 h-8 flex items-center justify-center border-2 border-black rounded-lg bg-white hover:bg-black hover:text-white transition-all shadow-[2px_2px_0px_#1A1A1A] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                title="Help Guide"
              >
                <span className="material-symbols-outlined text-[17px]">help</span>
              </button>

              <button
                onClick={() => {
                  playPop();
                  setShowGraph(!showGraph);
                }}
                className={`w-8 h-8 flex items-center justify-center border-2 border-black rounded-lg transition-all shadow-[2px_2px_0px_#1A1A1A] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
                  showGraph ? "bg-[#AE2925] text-white" : "bg-white hover:bg-[#AE2925] hover:text-white"
                }`}
                title="Toggle Knowledge Graph"
              >
                <span className="material-symbols-outlined text-[17px]">hub</span>
              </button>

              <button
                onClick={() => {
                  playPop();
                  setShowBrainChat(!showBrainChat);
                }}
                className={`w-8 h-8 flex items-center justify-center border-2 border-black rounded-lg transition-all shadow-[2px_2px_0px_#1A1A1A] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
                  showBrainChat ? "bg-[#FFD13B] text-black" : "bg-white hover:bg-[#FFD13B] text-black"
                }`}
                title="Rex Brain Chat"
              >
                <span className="material-symbols-outlined text-[17px]">hub</span>
              </button>

              <button
                onClick={() => setShowTemplateModal(true)}
                className="h-8 px-2.5 flex items-center gap-1 border-2 border-black rounded-lg bg-[#AE2925] text-white font-black text-[12px] uppercase tracking-wider hover:bg-black transition-all shadow-[2px_2px_0px_#1A1A1A] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                title="New Note"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                New
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="p-3 border-b-2 border-black/10 bg-white/40">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white border-2 border-black rounded-lg shadow-[2px_2px_0px_#1A1A1A]">
              <span className="material-symbols-outlined text-[18px] text-black/40">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes or concepts..."
                className="w-full bg-transparent border-none outline-none font-bold text-[13px] placeholder:text-black/30"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-black/40 hover:text-black">
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>
          </div>

          {/* Notes List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 select-text">
            {loading ? (
              <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
                <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span className="text-[13px] font-black uppercase tracking-wider text-black/50">
                  Loading notes...
                </span>
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="p-6 text-center border-2 border-dashed border-black/20 rounded-xl bg-white/50 flex flex-col items-center gap-3">
                <span className="material-symbols-outlined text-[36px] text-black/30">note_stack</span>
                <div>
                  <p className="font-black text-[14px] text-black">
                    {searchQuery ? "No matching notes found" : "No notes yet"}
                  </p>
                  <p className="text-[12px] font-bold text-black/50 mt-0.5">
                    {searchQuery ? "Try searching for a different keyword." : "Create your first studio note to begin."}
                  </p>
                </div>
                <button
                  onClick={() => setShowTemplateModal(true)}
                  className="px-3 py-2 bg-black text-white font-black text-[12px] rounded-lg shadow-[2px_2px_0px_#AE2925] hover:-translate-y-0.5 transition-all"
                >
                  + Create Note
                </button>
              </div>
            ) : (
              filteredNotes.map((note) => {
                const isSelected = activeNote?.id === note.id && !showGraph;
                // Extract plain text snippet
                const temp = document.createElement("div");
                temp.innerHTML = note.content || "";
                const snippet = (temp.textContent || temp.innerText || "").trim().slice(0, 75);
                const dateLabel = note.updated_at
                  ? new Date(note.updated_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })
                  : "Draft";

                return (
                  <div
                    key={note.id}
                    onClick={() => {
                      playTap();
                      setShowGraph(false);
                      setActiveNote(note);
                    }}
                    className={`group relative p-3 rounded-xl border-2 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-white border-black shadow-[3px_3px_0px_#AE2925] -translate-y-0.5"
                        : "bg-white/80 border-black/20 hover:border-black hover:bg-white shadow-[2px_2px_0px_rgba(0,0,0,0.06)] hover:shadow-[3px_3px_0px_#1A1A1A]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-black text-[14px] text-black truncate leading-tight flex-1">
                        {note.title || "Untitled Note"}
                      </h3>
                      <button
                        onClick={(e) => handleDeleteNote(note.id, e)}
                        className="opacity-0 group-hover:opacity-100 hover:text-[#AE2925] transition-opacity p-0.5 rounded"
                        title="Delete note"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>

                    <p className="text-[12px] text-black/60 font-medium line-clamp-2 leading-relaxed mb-2">
                      {snippet || <span className="italic text-black/30">Empty note...</span>}
                    </p>

                    <div className="flex items-center justify-between pt-1 border-t border-black/10 text-[10px] font-black uppercase tracking-wider text-black/40">
                      <span>{dateLabel}</span>
                      {isSelected && (
                        <span className="text-[#AE2925] flex items-center gap-0.5 font-black">
                          Editing
                          <span className="material-symbols-outlined text-[12px]">chevron_right</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right Column: Editor or Knowledge Graph ── */}
        <div
          className={`flex-1 flex flex-col overflow-y-auto bg-[#FAF7F2] ${
            !activeNote && !showGraph ? "hidden md:flex" : "flex"
          }`}
        >
          {showGraph ? (
            <div className="flex-1 p-6 md:p-8 flex flex-col">
              <div className="flex items-center justify-between pb-4 border-b-2 border-black mb-6">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowGraph(false)}
                    className="w-9 h-9 flex items-center justify-center border-2 border-black rounded-lg bg-white hover:bg-black hover:text-white transition-all shadow-[2px_2px_0px_#1A1A1A]"
                  >
                    <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                  </button>
                  <div>
                    <h2 className="font-black text-[20px] text-black flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#AE2925]">hub</span>
                      Studenius Knowledge Graph
                    </h2>
                    <p className="text-[12px] font-bold text-black/50">
                      Visual conceptual connections between your notes and source documents
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-1 bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0px_#1A1A1A] overflow-hidden p-2">
                <KnowledgeGraph
                  onNodeClick={(id) => {
                    const note = notes.find((n) => n.id === id);
                    if (note) {
                      setActiveNote(note);
                      setShowGraph(false);
                    }
                  }}
                />
              </div>
            </div>
          ) : activeNote ? (
            <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
              
              {/* Studio Editor Top Toolbar */}
              <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b-2 border-black px-4 md:px-8 py-3 flex items-center justify-between gap-3 shadow-sm">
                
                {/* Mobile Back & Title Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => setActiveNote(null)}
                    className="md:hidden w-8 h-8 flex items-center justify-center border-2 border-black rounded-lg bg-white hover:bg-black hover:text-white transition-all shadow-[2px_2px_0px_#1A1A1A]"
                  >
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {/* Sync Status Badge */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-black/20 bg-white text-[11px] font-black uppercase tracking-wider">
                      {syncStatus === "saving" ? (
                        <>
                          <div className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse" />
                          <span className="text-black/60">Saving...</span>
                        </>
                      ) : syncStatus === "offline" ? (
                        <>
                          <div className="w-2 h-2 rounded-full bg-[#3B82F6]" />
                          <span className="text-black/60">Local Draft</span>
                        </>
                      ) : (
                        <>
                          <div className="w-2 h-2 rounded-full bg-[#10B981]" />
                          <span className="text-black/60">Cloud Synced</span>
                        </>
                      )}
                    </div>

                    {/* Word count stats */}
                    <span className="hidden sm:inline-block text-[11px] font-bold text-black/40">
                      {noteStats.words} words • {noteStats.readMin} min read
                    </span>
                  </div>
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      playPop();
                      setShowBrainChat(!showBrainChat);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 border-2 border-black rounded-lg font-black text-[12px] transition-all shadow-[2px_2px_0px_#1A1A1A] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
                      showBrainChat ? "bg-[#FFD13B] text-black" : "bg-white hover:bg-[#FFD13B] text-black"
                    }`}
                    title="Rex Brain Chat"
                  >
                    <span className="material-symbols-outlined text-[16px]">hub</span>
                    <span className="hidden sm:inline">Rex Brain</span>
                  </button>

                  <button
                    onClick={handleExportToFlashcards}
                    className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 border-2 border-black rounded-lg bg-[#FAF7F2] hover:bg-[#AE2925] hover:text-white font-black text-[12px] transition-all shadow-[2px_2px_0px_#1A1A1A] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                    title="Export selected concepts into Flashcards"
                  >
                    <span className="material-symbols-outlined text-[16px]">style</span>
                    <span className="hidden sm:inline">To Flashcards</span>
                  </button>

                  <button
                    onClick={() => handleDeleteNote(activeNote.id)}
                    className="w-8 h-8 flex items-center justify-center border-2 border-black rounded-lg bg-white hover:bg-[#AE2925] hover:text-white text-black/70 transition-all shadow-[2px_2px_0px_#1A1A1A] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                    title="Delete Note"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>

              {/* Editor Sheet Canvas */}
              <div className="flex-1 max-w-4xl w-full mx-auto px-4 py-4 md:p-8 pb-28 md:pb-12 flex flex-col gap-4">
                
                {/* Note Title Input */}
                <input
                  type="text"
                  value={activeNote.title || ""}
                  onChange={(e) => handleUpdateTitle(e.target.value)}
                  placeholder="Note Title..."
                  className="w-full text-[28px] sm:text-[36px] font-black bg-transparent border-none outline-none placeholder:text-black/20 leading-tight tracking-tight text-black"
                />

                {/* Rich Text Editor */}
                <div className="flex-1 min-h-[500px]">
                  <TiptapEditor
                    key={activeNote.id}
                    initialContent={activeNote.content || "<p></p>"}
                    onUpdate={handleUpdateContent}
                  />
                </div>
              </div>
            </div>
          ) : (
            /* ── Empty State: Interactive Studio Launcher ── */
            <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 text-center max-w-2xl mx-auto">
              <div className="w-20 h-20 bg-[#FAF7F2] border-[3px] border-black rounded-3xl flex items-center justify-center shadow-[4px_4px_0px_#AE2925] mb-6">
                <span className="material-symbols-outlined text-[44px] text-[#AE2925]">
                  sticky_note_2
                </span>
              </div>

              <h2 className="text-[26px] md:text-[32px] font-black tracking-tight text-black mb-2">
                Studenius Notes Studio
              </h2>
              <p className="text-[14px] md:text-[15px] font-bold text-black/60 max-w-md mb-8">
                Synthesize readings, draft active-recall notes, and link concepts together with AI support.
              </p>

              {/* Quick Template Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full mb-8">
                {NOTE_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    onClick={() => handleCreateNote(tmpl.id)}
                    className="group p-4 bg-white border-2 border-black rounded-xl text-left shadow-[3px_3px_0px_#1A1A1A] hover:shadow-[4px_4px_0px_#AE2925] hover:-translate-y-0.5 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="material-symbols-outlined text-[24px] text-[#AE2925]">
                          {tmpl.icon}
                        </span>
                        <span className="px-2 py-0.5 bg-[#FAF7F2] border border-black/20 rounded-md text-[10px] font-black uppercase tracking-wider text-black/60">
                          {tmpl.badge}
                        </span>
                      </div>
                      <h4 className="font-black text-[15px] text-black mb-1 group-hover:text-[#AE2925] transition-colors">
                        {tmpl.title}
                      </h4>
                      <p className="text-[12px] font-semibold text-black/50 leading-relaxed">
                        {tmpl.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-black/10 flex items-center gap-1 text-[11px] font-black uppercase text-black/70">
                      <span>Use Template</span>
                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={() => handleCreateNote("blank")}
                className="px-6 py-3.5 bg-black text-white font-black text-[14px] uppercase tracking-wider rounded-xl border-2 border-black shadow-[4px_4px_0px_#AE2925] hover:bg-[#AE2925] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
                Create Blank Note
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Template Picker Modal ── */}
      {showTemplateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setShowTemplateModal(false)}
        >
          <div
            className="w-full max-w-lg bg-[#FAF7F2] border-[3px] border-black rounded-2xl shadow-[6px_6px_0px_#1A1A1A] p-6 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b-2 border-black mb-4">
              <div>
                <h3 className="font-black text-[20px] text-black">Choose a Note Template</h3>
                <p className="text-[12px] font-bold text-black/50">
                  Select a layout designed for your study style
                </p>
              </div>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="w-8 h-8 flex items-center justify-center border-2 border-black rounded-lg bg-white hover:bg-black hover:text-white transition-all shadow-[2px_2px_0px_#1A1A1A]"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {NOTE_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => handleCreateNote(tmpl.id)}
                  className="p-3 bg-white border-2 border-black rounded-xl text-left shadow-[3px_3px_0px_#1A1A1A] hover:shadow-[3px_3px_0px_#AE2925] hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="material-symbols-outlined text-[20px] text-[#AE2925]">
                        {tmpl.icon}
                      </span>
                      <h4 className="font-black text-[14px] text-black">{tmpl.title}</h4>
                    </div>
                    <p className="text-[11px] font-medium text-black/60 leading-relaxed">
                      {tmpl.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Knowledge Base Chat Sidecar / Drawer */}
      <KnowledgeBaseChat isOpen={showBrainChat} onClose={() => setShowBrainChat(false)} />
    </div>
  );
}
