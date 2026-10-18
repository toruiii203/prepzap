import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { CampusNote, SUBJECT_BADGE_COLORS } from "@/hooks/useCommunity";
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
  "Medicine"
];

interface CommunityVaultViewProps {
  notes: CampusNote[];
  isLoading?: boolean;
  onToggleLike: (noteId: string) => void;
  onPublishNote: (newNote: Omit<CampusNote, "id" | "date" | "likes" | "likedByUser"> & { attachmentUrl?: string }) => Promise<boolean>;
  onCloneNote: (note: CampusNote) => Promise<boolean>;
  onReportNote: (noteId: string, reason: string) => void;
}

export const CommunityVaultView: React.FC<CommunityVaultViewProps> = ({
  notes,
  isLoading = false,
  onToggleLike,
  onPublishNote,
  onCloneNote,
  onReportNote
}) => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [selectedSubject, setSelectedSubject] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeReadingNote, setActiveReadingNote] = useState<CampusNote | null>(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [reportingNoteId, setReportingNoteId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("inappropriate");
  const [cloningNoteId, setCloningNoteId] = useState<string | null>(null);

  // Publish Form State
  const [pubTitle, setPubTitle] = useState("");
  const [pubSubject, setPubSubject] = useState("Biology");
  const [pubSummary, setPubSummary] = useState("");
  const [pubContent, setPubContent] = useState("");
  const [pubTags, setPubTags] = useState("");
  const [pubAttachmentUrl, setPubAttachmentUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredNotes = useMemo(() => {
    return notes
      .filter((n) => !n.isReported)
      .filter((note) => {
        const matchSubject =
          selectedSubject === "All" ||
          note.subject.toLowerCase() === selectedSubject.toLowerCase();
        const query = searchQuery.trim().toLowerCase();
        const matchSearch =
          query === "" ||
          note.title.toLowerCase().includes(query) ||
          note.summary.toLowerCase().includes(query) ||
          note.tags.some((t) => t.toLowerCase().includes(query));
        return matchSubject && matchSearch;
      });
  }, [notes, selectedSubject, searchQuery]);

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
    await onCloneNote(note);
    setCloningNoteId(null);
  };

  const handlePublishSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const tagsArray = pubTags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const authorName =
      profile?.full_name ||
      (user as any)?.user_metadata?.full_name ||
      profile?.username ||
      user?.email?.split("@")[0] ||
      "Student Guide";

    const success = await onPublishNote({
      title: pubTitle.trim(),
      subject: pubSubject,
      subjectBadgeColor: SUBJECT_BADGE_COLORS[pubSubject] || "bg-blue-50 text-blue-700 border-blue-300",
      author: authorName,
      authorAvatar: profile?.avatar_url || "/buddies/fox_scholar.png",
      readTime: `${Math.max(2, Math.ceil(pubContent.length / 400))} min read`,
      tags: tagsArray.length > 0 ? tagsArray : [pubSubject],
      summary: pubSummary.trim() || pubContent.slice(0, 150) + "...",
      content: pubContent.trim(),
      attachmentUrl: pubAttachmentUrl.trim() || undefined
    });

    setIsSubmitting(false);

    if (success) {
      setShowPublishModal(false);
      setPubTitle("");
      setPubSummary("");
      setPubContent("");
      setPubTags("");
      setPubAttachmentUrl("");
    }
  };

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingNoteId) return;
    onReportNote(reportingNoteId, reportReason);
    setReportingNoteId(null);
    toast.success("Thank you for keeping Campus Vault safe.", {
      description: "This note has been reported and hidden from your feed."
    });
  };

  return (
    <div className="space-y-6">
      {/* ── TOP HEADER & PUBLISH TRIGGER ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b-2 border-black/10">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-black/20 bg-white text-[10.5px] font-black uppercase tracking-wider text-black/60 mb-1.5">
            <span className="material-symbols-outlined text-[14px] text-[#3B82F6]">verified</span>
            Peer Knowledge Repository
          </div>
          <h2 className="text-[22px] md:text-[26px] font-black text-black leading-tight">
            Campus Study Vault
          </h2>
          <p className="text-[12.5px] font-bold text-black/60 mt-0.5">
            Verified study guides, formulas, and classmate cheat sheets. 1-click clone into your Notes or Practice quizzes.
          </p>
        </div>

        <button
          onClick={() => {
            playPop();
            setShowPublishModal(true);
          }}
          className="px-4 py-2.5 bg-[#FF4D2E] hover:bg-black text-white border-2 border-black rounded-xl font-black text-[12px] shadow-[3px_3px_0px_#1A1A1A] active:translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <span className="material-symbols-outlined text-[17px]">upload_file</span>
          <span>Share Study Guide</span>
        </button>
      </div>

      {/* ── SEARCH & SUBJECT FILTER BAR ────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-black/40 text-[19px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes, formulas, topics..."
            className="w-full pl-9 pr-8 py-2 border-2 border-black rounded-xl text-[12.5px] font-bold placeholder:text-black/40 focus:outline-none bg-white shadow-[2px_2px_0px_#1A1A1A]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 hover:text-black text-[12px] font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Horizontal Subject Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {VAULT_SUBJECTS.map((sub) => (
            <button
              key={sub}
              onClick={() => {
                playTap();
                setSelectedSubject(sub);
              }}
              className={`px-3 py-1.5 rounded-lg border-2 border-black text-[10.5px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                selectedSubject === sub
                  ? "bg-[#3B82F6] text-white shadow-[2px_2px_0px_#000]"
                  : "bg-white hover:bg-[#FAF7F2] text-black shadow-[1px_1px_0px_#000]"
              }`}
            >
              {sub}
            </button>
          ))}
        </div>
      </div>

      {/* ── STUDY NOTES GRID ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredNotes.length === 0 ? (
          <div className="col-span-full p-10 text-center border-2 border-dashed border-black/25 rounded-2xl bg-white">
            <span className="material-symbols-outlined text-[36px] mb-2 block text-black/40">menu_book</span>
            <h3 className="text-[16px] font-black text-black">No study notes match your search</h3>
            <p className="text-[12.5px] font-medium text-black/60 mt-1 max-w-sm mx-auto">
              Try another keyword or subject, or be the first to publish a guide for this topic!
            </p>
          </div>
        ) : (
          filteredNotes.map((note) => {
            const isCloning = cloningNoteId === note.id;
            return (
              <div
                key={note.id}
                className="border-2 border-black rounded-2xl bg-white p-5 shadow-[3px_3px_0px_#1A1A1A] hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_#1A1A1A] transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Note Badges */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span
                      className={`px-2 py-0.5 rounded border text-[9.5px] font-black uppercase tracking-wider ${
                        note.subjectBadgeColor || "bg-blue-50 text-blue-700 border-blue-300"
                      }`}
                    >
                      {note.subject}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          playTap();
                          onToggleLike(note.id);
                        }}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded border border-black/20 text-[11px] font-bold transition-colors cursor-pointer ${
                          note.likedByUser
                            ? "bg-rose-50 text-rose-600 border-rose-400"
                            : "bg-[#FAF7F2] text-black/60"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[13px] text-rose-500">{note.likedByUser ? "favorite" : "favorite_border"}</span>
                        <span>{note.likes}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setReportingNoteId(note.id)}
                        className="text-black/30 hover:text-red-500 p-0.5 transition-colors"
                        title="Report note"
                      >
                        <span className="material-symbols-outlined text-[15px]">flag</span>
                      </button>
                    </div>
                  </div>

                  <h3
                    className="text-[15.5px] font-black text-black leading-snug hover:text-[#FF4D2E] transition-colors cursor-pointer"
                    onClick={() => {
                      playPop();
                      setActiveReadingNote(note);
                    }}
                  >
                    {note.title}
                  </h3>

                  <p className="text-[12px] font-medium text-black/65 mt-2 line-clamp-3 leading-relaxed">
                    {note.summary}
                  </p>

                  {/* Tags & attachment indicator */}
                  <div className="flex flex-wrap items-center gap-1 mt-3">
                    {note.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[9.5px] font-extrabold px-1.5 py-0.5 rounded bg-[#FAF7F2] border border-black/10 text-black/70"
                      >
                        #{tag}
                      </span>
                    ))}
                    {note.attachmentUrl && (
                      <a
                        href={note.attachmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[9.5px] font-black px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 flex items-center gap-0.5 hover:underline"
                      >
                        <span className="material-symbols-outlined text-[11px]">attachment</span>
                        <span>File Link</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-3.5 mt-4 border-t-2 border-black/10">
                  <div className="flex items-center justify-between text-[11px] font-bold text-black/55 mb-2.5">
                    <div className="flex items-center gap-1.5 truncate max-w-[150px]">
                      {note.authorAvatar?.startsWith("/") || note.authorAvatar?.startsWith("http") ? (
                        <img src={note.authorAvatar} alt="" className="w-4 h-4 rounded-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined text-[14px]">edit_note</span>
                      )}
                      <span className="truncate">{note.author}</span>
                    </div>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">download</span>
                      <span>{note.downloads || 0} Clones</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => {
                        playTap();
                        setActiveReadingNote(note);
                      }}
                      className="py-1.5 bg-[#FAF7F2] hover:bg-white text-black border-2 border-black rounded-lg font-black text-[10.5px] shadow-xs cursor-pointer text-center"
                    >
                      Read
                    </button>

                    <button
                      onClick={() => handleCloneClick(note)}
                      disabled={isCloning}
                      className="py-1.5 bg-[#FFD13B] hover:bg-[#ffe270] text-black border-2 border-black rounded-lg font-black text-[10.5px] shadow-xs cursor-pointer text-center flex items-center justify-center gap-1 active:translate-y-0.5"
                      title="Clone to your Notes Workspace"
                    >
                      <span className="material-symbols-outlined text-[12px]">content_copy</span>
                      <span>{isCloning ? "Cloning..." : "Clone"}</span>
                    </button>

                    <button
                      onClick={() => handleStudyWithNote(note, "practice")}
                      className="py-1.5 bg-[#FF4D2E] hover:bg-black text-white border-2 border-black rounded-lg font-black text-[10.5px] shadow-xs cursor-pointer text-center flex items-center justify-center gap-1 active:translate-y-0.5"
                      title="Turn note into an adaptive practice quiz"
                    >
                      <span className="material-symbols-outlined text-[12px]">bolt</span>
                      <span>Quiz</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── MODAL: READ STUDY GUIDE (WITH KATEX) ─────────────────────────────── */}
      {activeReadingNote && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 animate-in fade-in">
          <div className="bg-white border-2 border-black rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-[8px_8px_0px_#000] overflow-hidden">
            <div className="p-5 border-b-2 border-black bg-[#FAF7F2] flex items-center justify-between">
              <div>
                <span
                  className={`px-2 py-0.5 rounded border text-[10px] font-black uppercase tracking-wider ${
                    activeReadingNote.subjectBadgeColor || "bg-blue-50 text-blue-700 border-blue-300"
                  }`}
                >
                  {activeReadingNote.subject}
                </span>
                <h2 className="text-[19px] font-black text-black mt-1 leading-snug">
                  {activeReadingNote.title}
                </h2>
                <div className="text-[11px] font-bold text-black/50 mt-0.5">
                  {activeReadingNote.author} &bull; {activeReadingNote.readTime}
                </div>
              </div>
              <button
                onClick={() => setActiveReadingNote(null)}
                className="w-8 h-8 rounded-lg border-2 border-black bg-white hover:bg-rose-50 flex items-center justify-center font-bold text-black cursor-pointer shadow-xs"
              >
                ✕
              </button>
            </div>

            <div className="p-4 md:p-6 overflow-y-auto max-h-[65vh] bg-[#FFFDF5]">
              <div className="bg-[#FAF7F2] p-4 md:p-6 rounded-2xl border-2 border-black shadow-[2px_2px_0px_#1A1A1A]">
                <StudyGuideRenderer content={activeReadingNote.content} />
              </div>
            </div>

            <div className="p-4 border-t-2 border-black bg-white flex flex-wrap items-center justify-between gap-2">
              <button
                onClick={() => handleCloneClick(activeReadingNote)}
                className="px-3.5 py-2 bg-[#FFD13B] hover:bg-[#ffe270] text-black border-2 border-black rounded-xl font-black text-[11.5px] shadow-[2px_2px_0px_#000] cursor-pointer flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[15px]">content_copy</span>
                <span>Clone to My Notes</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleStudyWithNote(activeReadingNote, "practice");
                    setActiveReadingNote(null);
                  }}
                  className="px-3.5 py-2 bg-[#FF4D2E] hover:bg-black text-white border-2 border-black rounded-xl font-black text-[11.5px] shadow-[2px_2px_0px_#000] cursor-pointer"
                >
                  Launch Practice Quiz
                </button>
                <button
                  onClick={() => {
                    handleStudyWithNote(activeReadingNote, "flashcards");
                    setActiveReadingNote(null);
                  }}
                  className="px-3.5 py-2 bg-black hover:bg-[#FF4D2E] text-white border-2 border-black rounded-xl font-black text-[11.5px] shadow-[2px_2px_0px_#000] cursor-pointer"
                >
                  Make Flashcards
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: SHARE NOTE ───────────────────────────────────────────────── */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white border-2 border-black rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-[6px_6px_0px_#000] overflow-hidden">
            <div className="p-5 border-b-2 border-black bg-[#FAF7F2] flex items-center justify-between">
              <div>
                <h2 className="text-[18px] font-black text-black">Share Study Guide to Campus Vault</h2>
                <p className="text-[12px] font-bold text-black/55 mt-0.5">
                  Contribute your summary, cheat sheet, or formulas to help classmates study.
                </p>
              </div>
              <button
                onClick={() => setShowPublishModal(false)}
                className="w-8 h-8 rounded-lg border-2 border-black bg-white hover:bg-rose-50 flex items-center justify-center font-bold text-black cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePublishSubmit} className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-black block mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Organic Chemistry Carbonyl Reactions Master Sheet"
                  value={pubTitle}
                  onChange={(e) => setPubTitle(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-black rounded-xl text-[13px] font-bold focus:outline-none bg-[#FAF7F2]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-black block mb-1">
                    Subject
                  </label>
                  <select
                    value={pubSubject}
                    onChange={(e) => setPubSubject(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-black rounded-xl text-[13px] font-bold focus:outline-none bg-[#FAF7F2]"
                  >
                    {VAULT_SUBJECTS.filter((s) => s !== "All").map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-black block mb-1">
                    Tags (Comma Separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Aldehydes, Ketones, Mechanisms"
                    value={pubTags}
                    onChange={(e) => setPubTags(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-black rounded-xl text-[13px] font-bold focus:outline-none bg-[#FAF7F2]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-black block mb-1">
                  Short Summary
                </label>
                <textarea
                  rows={2}
                  placeholder="A quick 1-2 sentence overview of what this note covers..."
                  value={pubSummary}
                  onChange={(e) => setPubSummary(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-black rounded-xl text-[13px] font-medium focus:outline-none bg-[#FAF7F2] resize-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-black block mb-1">
                  Study Guide Content (Markdown &amp; LaTeX Supported)
                </label>
                <textarea
                  rows={8}
                  required
                  placeholder="# Key Principles&#10;&#10;Write high-yield facts, equations, and definitions here..."
                  value={pubContent}
                  onChange={(e) => setPubContent(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-black rounded-xl text-[13px] font-mono focus:outline-none bg-[#FAF7F2]"
                />
              </div>

              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-black block mb-1">
                  Attachment Link (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/... or PDF link"
                  value={pubAttachmentUrl}
                  onChange={(e) => setPubAttachmentUrl(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-black rounded-xl text-[13px] font-medium focus:outline-none bg-[#FAF7F2]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPublishModal(false)}
                  className="px-4 py-2 border-2 border-black rounded-xl font-black text-[12px] bg-white hover:bg-stone-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#FF4D2E] hover:bg-black text-white border-2 border-black rounded-xl font-black text-[12px] shadow-[2px_2px_0px_#000] cursor-pointer"
                >
                  {isSubmitting ? "Publishing..." : "Publish to Vault"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: REPORT NOTE ───────────────────────────────────────────────── */}
      {reportingNoteId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white border-2 border-black rounded-2xl max-w-md w-full p-5 shadow-[6px_6px_0px_#000]">
            <h3 className="text-[16px] font-black text-black">Report Study Note</h3>
            <p className="text-[12px] font-bold text-black/55 mt-1">
              Help keep Campus Vault focused on high-yield, safe academic materials.
            </p>

            <form onSubmit={handleReportSubmit} className="mt-4 space-y-3">
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-black block mb-1">
                  Reason
                </label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-black rounded-xl text-[12px] font-bold bg-[#FAF7F2] focus:outline-none"
                >
                  <option value="inappropriate">Inappropriate or offensive material</option>
                  <option value="spam">Spam, advertisement, or duplicate</option>
                  <option value="copyright">Copyright or unauthorized test leak</option>
                  <option value="inaccurate">Factually incorrect / misleading</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReportingNoteId(null)}
                  className="px-3.5 py-1.5 border-2 border-black rounded-xl font-black text-[11px] bg-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-red-600 hover:bg-black text-white border-2 border-black rounded-xl font-black text-[11px] shadow-[2px_2px_0px_#000] cursor-pointer"
                >
                  Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
