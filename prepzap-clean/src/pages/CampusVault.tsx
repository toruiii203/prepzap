import React, { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { SharedSidebar } from "@/components/SharedSidebar";
import { useCommunity, CampusNote, SUBJECT_BADGE_COLORS } from "@/hooks/useCommunity";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { playPop, playTap, playSuccess } from "@/lib/soundFX";
import { StudyGuideRenderer } from "@/components/StudyGuideRenderer";

const VAULT_SUBJECTS = [
  "All",
  "Biology",
  "Calculus",
  "Chemistry",
  "History",
  "Psychology",
  "Computer Science",
  "Physics",
  "Economics",
  "Medicine",
  "General"
];

export default function CampusVault() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const {
    notes,
    isLoadingNotes,
    toggleLikeNote,
    publishNote,
    cloneNoteToWorkspace,
    reportNote
  } = useCommunity({ loadNotes: true });

  // URL-driven filters
  const currentSubject = searchParams.get("subject") || "All";
  const currentSort = (searchParams.get("sort") as "recent" | "liked") || "recent";
  const [searchQuery, setSearchQuery] = useState("");

  const [activeReadingNote, setActiveReadingNote] = useState<CampusNote | null>(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [cloningNoteId, setCloningNoteId] = useState<string | null>(null);

  // Publish Modal State
  const [pubTitle, setPubTitle] = useState("");
  const [pubSubject, setPubSubject] = useState("Biology");
  const [customSubjectText, setCustomSubjectText] = useState("");
  const [pubSummary, setPubSummary] = useState("");
  const [pubContent, setPubContent] = useState("");
  const [pubTags, setPubTags] = useState("");
  const [pubAttachmentUrl, setPubAttachmentUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamically include any custom subjects published by users
  const availableSubjects = useMemo(() => {
    const set = new Set<string>(VAULT_SUBJECTS);
    notes.forEach((n) => {
      if (n.subject && n.subject.trim()) {
        set.add(n.subject.trim());
      }
    });
    return Array.from(set);
  }, [notes]);

  // Helper to update URL params
  const updateParams = (newSubject?: string, newSort?: "recent" | "liked") => {
    const nextParams = new URLSearchParams(searchParams);
    if (newSubject !== undefined) {
      if (newSubject === "All") nextParams.delete("subject");
      else nextParams.set("subject", newSubject);
    }
    if (newSort !== undefined) {
      if (newSort === "recent") nextParams.delete("sort");
      else nextParams.set("sort", newSort);
    }
    setSearchParams(nextParams);
  };

  const filteredNotes = useMemo(() => {
    const list = notes.filter((n) => !n.isReported).filter((note) => {
      const matchSubject =
        currentSubject === "All" ||
        note.subject.toLowerCase() === currentSubject.toLowerCase();
      const query = searchQuery.trim().toLowerCase();
      const matchSearch =
        query === "" ||
        note.title.toLowerCase().includes(query) ||
        note.summary.toLowerCase().includes(query) ||
        note.author.toLowerCase().includes(query) ||
        note.tags.some((t) => t.toLowerCase().includes(query));
      return matchSubject && matchSearch;
    });

    if (currentSort === "liked") {
      list.sort((a, b) => b.likes - a.likes);
    } else {
      list.sort((a, b) => {
        const timeA = new Date(a.date).getTime() || 0;
        const timeB = new Date(b.date).getTime() || 0;
        return timeB - timeA;
      });
    }

    return list;
  }, [notes, currentSubject, currentSort, searchQuery]);

  const handleStudyWithNote = (note: CampusNote, mode: "practice" | "flashcards") => {
    playPop();
    if (mode === "practice") {
      localStorage.setItem("qs_practice_export", JSON.stringify(note.content));
      toast.success(`Loading "${note.title}" into Practice Quiz!`);
      navigate("/practice");
    } else {
      localStorage.setItem("qs_flashcards_export", JSON.stringify(note.content));
      localStorage.setItem("pz_practice_topic", note.title);
      toast.success(`Loading "${note.title}" into Flashcards!`);
      navigate("/flashcards");
    }
  };

  const handleCloneClick = async (note: CampusNote) => {
    setCloningNoteId(note.id);
    await cloneNoteToWorkspace(note);
    setCloningNoteId(null);
  };

  const handlePublishSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalSubject = (pubSubject === "Custom" ? customSubjectText.trim() : pubSubject) || "General";
    if (pubSubject === "Custom" && !customSubjectText.trim()) {
      toast.error("Please enter a custom subject name.");
      return;
    }

    setIsSubmitting(true);

    const tagsArray = pubTags
      .split(",")
      .map((t) => t.trim().replace(/^#/, ""))
      .filter(Boolean);

    const ok = await publishNote({
      title: pubTitle,
      subject: finalSubject,
      subjectBadgeColor: "bg-white text-black border-2 border-black font-black",
      summary: pubSummary,
      content: pubContent,
      author: user?.user_metadata?.full_name || (user as any)?.name || user?.email?.split("@")[0] || "Classmate",
      authorAvatar: "/buddies/fox_scholar.png",
      tags: tagsArray,
      readTime: `${Math.max(2, Math.round(pubContent.split(/\s+/).length / 150))} min read`,
      attachmentUrl: pubAttachmentUrl.trim() || undefined
    });

    setIsSubmitting(false);
    if (ok) {
      setShowPublishModal(false);
      setPubTitle("");
      setPubSubject("Biology");
      setCustomSubjectText("");
      setPubSummary("");
      setPubContent("");
      setPubTags("");
      setPubAttachmentUrl("");
    }
  };

  return (
    <div className="w-full bg-[#FAF7F2] min-h-screen text-black flex flex-col font-body-md flex-1">
      <SharedSidebar active="/campus-vault" />

      {/* Main Content Area */}
      <div className="md:ml-64 flex flex-col min-h-screen overflow-y-auto">
        <div className="p-4 md:p-8 max-w-6xl w-full mx-auto space-y-6 pb-28 md:pb-12">

          {/* Top Header */}
          <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b-2 border-black/10">
            <div>
              <h1 className="text-[26px] md:text-[32px] font-black leading-tight text-black">
                Campus Vault
              </h1>
              <p className="text-[13px] font-bold text-black/60 mt-0.5">
                Save, organize, and practice your study guides and active recall summaries.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                playPop();
                setShowPublishModal(true);
              }}
              className="px-4 py-2.5 bg-[#FF4D2E] hover:bg-black text-white border-2 border-black rounded-xl font-black text-[12px] shadow-[3px_3px_0px_#1A1A1A] active:translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <span className="material-symbols-outlined text-[17px]">upload_file</span>
              <span>Share Study Guide</span>
            </button>
          </header>

          {/* Search, Sort, and Filter Controls */}
          <div className="flex flex-col gap-3.5">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-black/40 text-[19px]">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search notes, topics, or authors..."
                  className="w-full pl-9 pr-8 py-2 border-2 border-black rounded-xl text-[12.5px] font-bold placeholder:text-black/40 focus:outline-none bg-white shadow-[2px_2px_0px_#1A1A1A]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 hover:text-black text-[12px] font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Sort Tabs */}
              <div className="flex items-center gap-1.5 bg-white border-2 border-black rounded-xl p-1 shadow-[2px_2px_0px_#1A1A1A] shrink-0 self-start md:self-auto">
                <button
                  type="button"
                  onClick={() => updateParams(undefined, "recent")}
                  className={`px-3 py-1 rounded-lg text-[11px] font-black cursor-pointer transition-all ${
                    currentSort === "recent"
                      ? "bg-black text-white shadow-xs"
                      : "text-black/60 hover:text-black"
                  }`}
                >
                  Recent
                </button>
                <button
                  type="button"
                  onClick={() => updateParams(undefined, "liked")}
                  className={`px-3 py-1 rounded-lg text-[11px] font-black cursor-pointer transition-all ${
                    currentSort === "liked"
                      ? "bg-black text-white shadow-xs"
                      : "text-black/60 hover:text-black"
                  }`}
                >
                  Most Liked
                </button>
              </div>
            </div>

            {/* Subject Filters — Wrapping cleanly so no subject cuts off */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {availableSubjects.map((sub) => {
                const isActive = currentSubject.toLowerCase() === sub.toLowerCase();
                return (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => {
                      playTap();
                      updateParams(sub, undefined);
                    }}
                    className={`px-3 py-1.5 rounded-lg border-2 border-black text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      isActive
                        ? "bg-black text-white shadow-[2px_2px_0px_#000]"
                        : "bg-white hover:bg-[#FAF7F2] text-black shadow-[1px_1px_0px_#000]"
                    }`}
                  >
                    {sub}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes Grid or Honest Empty State */}
          {isLoadingNotes ? (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined animate-spin text-[32px] text-black/40">
                progress_activity
              </span>
              <p className="text-[13px] font-bold text-black/50 mt-2">Checking Vault for shared notes...</p>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="border-2 border-dashed border-black/30 rounded-3xl bg-white p-10 md:p-14 text-center max-w-lg mx-auto space-y-3.5 my-6">
              <div className="w-16 h-16 rounded-2xl bg-[#FFFDF5] border-2 border-black mx-auto flex items-center justify-center shadow-[3px_3px_0px_#000]">
                <span className="material-symbols-outlined text-[32px] text-black">menu_book</span>
              </div>
              <h3 className="text-[18px] font-black text-black">
                {searchQuery || currentSubject !== "All"
                  ? "No guides match your filter"
                  : "No guides yet. Share the first one."}
              </h3>
              <p className="text-[12.5px] font-medium text-black/60 leading-relaxed max-w-sm mx-auto">
                {searchQuery || currentSubject !== "All"
                  ? "Try clearing your search query or switching to 'All' subjects to see all notes."
                  : "Publish revision guides and cheat sheets from your study workspace to practice with flashcards and quizzes."}
              </p>
              <div className="pt-2 flex justify-center gap-2">
                {searchQuery || currentSubject !== "All" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      updateParams("All", undefined);
                    }}
                    className="px-4 py-2 bg-black text-white rounded-xl font-black text-[12px] border-2 border-black shadow-[2px_2px_0px_#000] cursor-pointer"
                  >
                    Clear Filters
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      playPop();
                      setShowPublishModal(true);
                    }}
                    className="px-5 py-2.5 bg-[#FF4D2E] hover:bg-black text-white rounded-xl font-black text-[12px] border-2 border-black shadow-[2px_2px_0px_#000] active:translate-y-0.5 cursor-pointer transition-colors"
                  >
                    + Share a Study Guide
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredNotes.map((note) => {
                const isCloning = cloningNoteId === note.id;

                return (
                  <div
                    key={note.id}
                    className="border-2 border-black rounded-2xl bg-white p-5 shadow-[3px_3px_0px_#1A1A1A] hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_#1A1A1A] transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Header: Subject Badge + High-Contrast Like Button */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span
                          className="px-2.5 py-0.5 rounded-lg border-2 border-black text-[10px] font-black uppercase tracking-wider bg-white text-black shadow-[1px_1px_0px_#000]"
                        >
                          {note.subject}
                        </span>

                        <button
                          type="button"
                          onClick={() => {
                            playTap();
                            toggleLikeNote(note.id);
                          }}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border-2 border-black text-[11px] font-black transition-all cursor-pointer shadow-xs active:scale-95 ${
                            note.likedByUser
                              ? "bg-rose-50 text-rose-600 border-rose-400"
                              : "bg-[#FAF7F2] hover:bg-rose-50 text-black/80"
                          }`}
                          title={note.likedByUser ? "Unlike guide" : "Like guide"}
                        >
                          <span
                            className="material-symbols-outlined text-[15px]"
                            style={{ fontVariationSettings: note.likedByUser ? "'FILL' 1" : "'FILL' 0" }}
                          >
                            favorite
                          </span>
                          <span>{note.likes}</span>
                        </button>
                      </div>

                      {/* Title */}
                      <h3
                        className="text-[16px] font-black text-black leading-snug hover:text-[#FF4D2E] transition-colors cursor-pointer"
                        onClick={() => {
                          playPop();
                          setActiveReadingNote(note);
                        }}
                      >
                        {note.title}
                      </h3>

                      {/* Summary */}
                      <p className="text-[12px] font-medium text-black/65 mt-2 line-clamp-3 leading-relaxed">
                        {note.summary}
                      </p>

                      {/* Tags */}
                      {note.tags && note.tags.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 mt-3">
                          {note.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-[#FAF7F2] border border-black/10 text-black/70"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Footer Info & Responsive Action Buttons */}
                    <div className="pt-3.5 mt-4 border-t-2 border-black/10 space-y-3">
                      <div className="flex items-center justify-between text-[11px] font-bold text-black/55">
                        <div className="flex items-center gap-1.5 truncate max-w-[160px]">
                          <span>{note.authorAvatar || "📝"}</span>
                          <span className="truncate">{note.author}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10.5px] text-black/45">
                          <span>{note.date}</span>
                          <span>&bull;</span>
                          <span>{note.readTime}</span>
                        </div>
                      </div>

                      {/* Actions: Read, Clone, Practice Quiz — Wrapping for phone widths */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            playPop();
                            setActiveReadingNote(note);
                          }}
                          className="flex-1 min-w-[70px] py-1.5 bg-black hover:bg-[#FF4D2E] text-white border-2 border-black rounded-lg text-[11px] font-black cursor-pointer shadow-xs active:translate-y-0.5 transition-all flex items-center justify-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[13px]">visibility</span>
                          <span>Read</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCloneClick(note)}
                          disabled={isCloning}
                          className="flex-1 min-w-[75px] py-1.5 bg-[#FAF7F2] hover:bg-stone-200 text-black border-2 border-black rounded-lg text-[11px] font-black cursor-pointer shadow-xs active:translate-y-0.5 transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                          title="Save a copy to your personal notes"
                        >
                          <span className="material-symbols-outlined text-[13px]">content_copy</span>
                          <span>{isCloning ? "Cloning..." : "Clone"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStudyWithNote(note, "practice")}
                          className="flex-1 min-w-[75px] py-1.5 bg-[#FFD13B] hover:bg-[#FFE566] text-black border-2 border-black rounded-lg text-[11px] font-black cursor-pointer shadow-xs active:translate-y-0.5 transition-all flex items-center justify-center gap-1"
                          title="Test your recall with an active quiz"
                        >
                          <span className="material-symbols-outlined text-[13px]">quiz</span>
                          <span>Quiz</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>

      {/* Reader Modal */}
      {activeReadingNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border-2 border-black rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-[6px_6px_0px_#000] overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 md:p-5 border-b-2 border-black flex items-center justify-between bg-[#FFFDF5]">
              <div className="flex items-center gap-2 min-w-0 pr-3">
                <span
                  className="px-2.5 py-0.5 rounded-lg border-2 border-black text-[9.5px] font-black uppercase tracking-wider shrink-0 bg-white text-black shadow-[1px_1px_0px_#000]"
                >
                  {activeReadingNote.subject}
                </span>
                <h3 className="font-black text-[15px] md:text-[17px] text-black truncate">
                  {activeReadingNote.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveReadingNote(null)}
                className="w-8 h-8 rounded-full border-2 border-black bg-white hover:bg-black hover:text-white flex items-center justify-center font-black text-[14px] cursor-pointer shrink-0 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 md:p-8 overflow-y-auto space-y-4">
              <div className="flex items-center justify-between text-[11.5px] font-bold text-black/55 pb-3 border-b border-black/10">
                <span>Shared by {activeReadingNote.author} &bull; {activeReadingNote.date}</span>
                <span>{activeReadingNote.readTime}</span>
              </div>

              <StudyGuideRenderer content={activeReadingNote.content} />
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t-2 border-black flex flex-wrap items-center justify-between gap-3 bg-[#FAF7F2]">
              <div className="text-[12px] font-bold text-black/60">
                ❤️ {activeReadingNote.likes} {activeReadingNote.likes === 1 ? "student found this helpful" : "students found this helpful"}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCloneClick(activeReadingNote)}
                  className="px-4 py-2 bg-white hover:bg-stone-100 text-black border-2 border-black rounded-xl font-black text-[11.5px] shadow-[2px_2px_0px_#000] cursor-pointer active:translate-y-0.5"
                >
                  Save to My Notes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const note = activeReadingNote;
                    setActiveReadingNote(null);
                    handleStudyWithNote(note, "practice");
                  }}
                  className="px-4 py-2 bg-[#FFD13B] hover:bg-[#FFE566] text-black border-2 border-black rounded-xl font-black text-[11.5px] shadow-[2px_2px_0px_#000] cursor-pointer active:translate-y-0.5"
                >
                  Start Practice Quiz &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Guide Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border-2 border-black rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-[6px_6px_0px_#000] overflow-hidden">
            <div className="p-4 md:p-5 border-b-2 border-black flex items-center justify-between bg-[#FFFDF5]">
              <h3 className="font-black text-[17px] text-black flex items-center gap-2">
                <span className="material-symbols-outlined text-[#FF4D2E]">upload_file</span>
                Share a Study Guide
              </h3>
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                className="w-8 h-8 rounded-full border-2 border-black bg-white hover:bg-black hover:text-white flex items-center justify-center font-black text-[14px] cursor-pointer shrink-0 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePublishSubmit} className="p-5 md:p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-[11px] font-black uppercase text-black/70 mb-1">Guide Title</label>
                <input
                  type="text"
                  required
                  value={pubTitle}
                  onChange={(e) => setPubTitle(e.target.value)}
                  placeholder="e.g., Photosynthesis & Light Reactions Summary"
                  className="w-full px-3.5 py-2 border-2 border-black rounded-xl text-[13px] font-bold focus:outline-none bg-[#FAF7F2] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase text-black/70 mb-1">Subject</label>
                  <select
                    value={pubSubject}
                    onChange={(e) => setPubSubject(e.target.value)}
                    className="w-full px-3.5 py-2 border-2 border-black rounded-xl text-[13px] font-bold focus:outline-none bg-[#FAF7F2] focus:bg-white cursor-pointer"
                  >
                    {VAULT_SUBJECTS.filter((s) => s !== "All").map((sub) => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                    <option value="Custom">+ Custom Subject...</option>
                  </select>
                  {pubSubject === "Custom" && (
                    <input
                      type="text"
                      required
                      autoFocus
                      value={customSubjectText}
                      onChange={(e) => setCustomSubjectText(e.target.value)}
                      placeholder="Type custom subject name..."
                      className="w-full px-3.5 py-2 mt-2 border-2 border-black rounded-xl text-[12.5px] font-bold focus:outline-none bg-white shadow-xs"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase text-black/70 mb-1">Tags (Comma-separated)</label>
                  <input
                    type="text"
                    value={pubTags}
                    onChange={(e) => setPubTags(e.target.value)}
                    placeholder="e.g., Chloroplast, ATP, Calvin"
                    className="w-full px-3.5 py-2 border-2 border-black rounded-xl text-[13px] font-bold focus:outline-none bg-[#FAF7F2] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase text-black/70 mb-1">Short Summary (1-2 sentences)</label>
                <input
                  type="text"
                  required
                  value={pubSummary}
                  onChange={(e) => setPubSummary(e.target.value)}
                  placeholder="Brief overview of the main ideas covered in this guide..."
                  className="w-full px-3.5 py-2 border-2 border-black rounded-xl text-[13px] font-bold focus:outline-none bg-[#FAF7F2] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase text-black/70 mb-1">Study Guide Content (Markdown &amp; Math supported)</label>
                <textarea
                  required
                  rows={8}
                  value={pubContent}
                  onChange={(e) => setPubContent(e.target.value)}
                  placeholder="Write or paste your study guide here. You can use markdown headers (#), bullet points, and math like $$\Delta G = \Delta H - T\Delta S$$..."
                  className="w-full p-3.5 border-2 border-black rounded-xl text-[12.5px] font-mono focus:outline-none bg-[#FAF7F2] focus:bg-white leading-relaxed"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowPublishModal(false)}
                  className="px-4 py-2 border-2 border-black rounded-xl text-[12px] font-bold bg-[#FAF7F2] hover:bg-stone-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !pubTitle.trim() || !pubContent.trim()}
                  className="px-5 py-2 bg-[#FF4D2E] hover:bg-black text-white border-2 border-black rounded-xl text-[12px] font-black shadow-[2px_2px_0px_#000] active:translate-y-0.5 cursor-pointer disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? "Publishing..." : "Publish to Vault"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
