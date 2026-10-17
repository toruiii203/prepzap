import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { SharedSidebar } from "@/components/SharedSidebar";
import { useCommunity, CampusNote } from "@/hooks/useCommunity";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { playPop, playTap, playSuccess } from "@/lib/soundFX";
import { StudyGuideRenderer } from "@/components/StudyGuideRenderer";

const SUBJECTS = ["All", "Biology", "Calculus", "Chemistry", "History", "Psychology"];

export default function CampusVault() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    notes,
    toggleLikeNote,
    publishNote,
    reportNote
  } = useCommunity();

  const [selectedSubject, setSelectedSubject] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const [activeReadingNote, setActiveReadingNote] = useState<CampusNote | null>(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [reportingNoteId, setReportingNoteId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("inappropriate");

  // Publish Form State
  const [pubTitle, setPubTitle] = useState("");
  const [pubSubject, setPubSubject] = useState("Biology");
  const [pubSummary, setPubSummary] = useState("");
  const [pubContent, setPubContent] = useState("");
  const [pubTags, setPubTags] = useState("");

  const filteredNotes = useMemo(() => {
    return notes
      .filter((n) => !n.isReported)
      .filter((note) => {
        const matchSubject = selectedSubject === "All" || note.subject.toLowerCase() === selectedSubject.toLowerCase();
        const matchSearch =
          searchQuery.trim() === "" ||
          note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          note.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
          note.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchSubject && matchSearch;
      });
  }, [notes, selectedSubject, searchQuery]);

  const handleStudyWithRex = (note: CampusNote, mode: "practice" | "flashcards") => {
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

  const handlePublishSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const tagsArray = pubTags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const success = publishNote({
      title: pubTitle.trim(),
      subject: pubSubject,
      subjectBadgeColor: "bg-blue-50 text-blue-700 border-blue-300",
      author: user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Student Guide",
      authorAvatar: "📝",
      readTime: `${Math.max(2, Math.ceil(pubContent.length / 400))} min read`,
      tags: tagsArray.length > 0 ? tagsArray : [pubSubject],
      summary: pubSummary.trim() || pubContent.slice(0, 160) + "...",
      content: pubContent.trim()
    });

    if (success) {
      setShowPublishModal(false);
      setPubTitle("");
      setPubSummary("");
      setPubContent("");
      setPubTags("");
    }
  };

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingNoteId) return;
    reportNote(reportingNoteId, reportReason);
    setReportingNoteId(null);
    toast.success("Thank you for keeping Campus Vault safe.", {
      description: "This note has been reported and hidden from your feed."
    });
  };

  return (
    <div className="w-full bg-[#FAF7F2] min-h-screen text-black flex flex-col font-body-md flex-1">
      <SharedSidebar active="/campus-vault" />

      {/* ── DESKTOP & TABLET WRAPPER ────────────────────────────────────────── */}
      <div className="md:ml-64 flex flex-col min-h-screen overflow-y-auto">
        <div className="p-4 md:p-12 max-w-6xl w-full mx-auto space-y-6 pb-28 md:pb-12">

          {/* Banner linking to Study Circle */}
          <div className="bg-[#FFE566] border-2 border-black rounded-2xl p-3.5 flex items-center justify-between shadow-[2px_2px_0px_#1A1A1A]">
            <div className="flex items-center gap-2.5">
              <span className="text-[20px]">👥</span>
              <div>
                <span className="text-[13px] font-black text-black">Studying with classmates?</span>
                <p className="text-[11.5px] font-bold text-black/65">
                  Link your streaks, add study partners, and view friends' profiles in the Study Circle.
                </p>
              </div>
            </div>
            <button
              onClick={() => { playTap(); navigate("/community"); }}
              className="px-3.5 py-1.5 bg-black hover:bg-[#FF4D2E] text-white font-black text-[11.5px] rounded-xl transition-colors cursor-pointer shrink-0 shadow-xs"
            >
              Open Study Circle &rarr;
            </button>
          </div>

          {/* Page Header */}
          <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b-2 border-black/10">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-black/20 bg-white text-[10.5px] font-black uppercase tracking-wider text-black/60 mb-2">
                <span className="material-symbols-outlined text-[14px] text-[#3B82F6]">menu_book</span>
                Academic Vault
              </div>
              <h1 className="text-[28px] md:text-[34px] font-black leading-tight text-black">
                Campus Vault
              </h1>
              <p className="text-[13.5px] font-bold text-black/60 mt-0.5">
                High-yield study guides, cheat sheets, and formulas. Turn any note into a quiz with 1 tap.
              </p>
            </div>

            <button
              onClick={() => { playPop(); setShowPublishModal(true); }}
              className="px-4 py-2 bg-[#FF4D2E] text-white hover:bg-[#e03d20] border-2 border-black rounded-xl font-black text-[12.5px] shadow-[3px_3px_0px_#1A1A1A] active:translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]">upload_file</span>
              <span>Share Study Guide</span>
            </button>
          </header>

          {/* Search & Subject Filters */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-black/40 text-[20px]">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes, formulas, topics..."
                className="w-full pl-9 pr-3 py-2 border-2 border-black rounded-xl text-[13px] font-bold placeholder:text-black/40 focus:outline-none bg-white shadow-[2px_2px_0px_#1A1A1A]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 hover:text-black text-[13px] font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
              {SUBJECTS.map((sub) => (
                <button
                  key={sub}
                  onClick={() => { playTap(); setSelectedSubject(sub); }}
                  className={`px-3 py-1.5 rounded-lg border-2 border-black text-[11px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                    selectedSubject === sub
                      ? "bg-[#FF4D2E] text-white shadow-[2px_2px_0px_#000]"
                      : "bg-white hover:bg-[#F0EDE0] text-black shadow-[1px_1px_0px_#000]"
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
          </div>

          {/* Study Notes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredNotes.length === 0 ? (
              <div className="col-span-full p-10 text-center border-2 border-dashed border-black/20 rounded-2xl bg-white">
                <span className="text-[36px] mb-2 block">📚</span>
                <h3 className="text-[16px] font-black text-black">No study notes match your search</h3>
                <p className="text-[12.5px] font-medium text-black/60 mt-1 max-w-sm mx-auto">
                  Try another keyword or subject, or be the first to publish a guide for this topic!
                </p>
              </div>
            ) : (
              filteredNotes.map((note) => (
                <div
                  key={note.id}
                  className="border-2 border-black rounded-2xl bg-white p-5 shadow-[3px_3px_0px_#1A1A1A] hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_#1A1A1A] transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span className={`px-2 py-0.5 rounded border text-[9.5px] font-black uppercase tracking-wider ${note.subjectBadgeColor}`}>
                        {note.subject}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => { playTap(); toggleLikeNote(note.id); }}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded border border-black/20 text-[11px] font-bold transition-colors cursor-pointer ${
                            note.likedByUser ? "bg-rose-50 text-rose-600 border-rose-400" : "bg-[#FAF7F2] text-black/60"
                          }`}
                        >
                          <span>{note.likedByUser ? "❤️" : "🤍"}</span>
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

                    <h3 className="text-[16px] font-black text-black leading-snug hover:text-[#FF4D2E] transition-colors cursor-pointer" onClick={() => { playPop(); setActiveReadingNote(note); }}>
                      {note.title}
                    </h3>

                    <p className="text-[12px] font-medium text-black/65 mt-2 line-clamp-3 leading-relaxed">
                      {note.summary}
                    </p>

                    <div className="flex flex-wrap gap-1 mt-3">
                      {note.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-[#FAF7F2] border border-black/10 text-black/70"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t-2 border-black/10 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[16px]">{note.authorAvatar}</span>
                      <span className="text-[11px] font-bold text-black/60 truncate max-w-[120px]">
                        {note.author}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => { playTap(); setActiveReadingNote(note); }}
                        className="px-2.5 py-1 bg-[#FAF7F2] hover:bg-white text-black border border-black rounded-lg font-black text-[11px] shadow-xs cursor-pointer"
                      >
                        Read
                      </button>
                      <button
                        onClick={() => handleStudyWithRex(note, "practice")}
                        className="px-2.5 py-1 bg-[#FF4D2E] hover:bg-black text-white border border-black rounded-lg font-black text-[11px] shadow-xs cursor-pointer flex items-center gap-1"
                        title="Turn into quiz"
                      >
                        <span className="material-symbols-outlined text-[13px]">bolt</span>
                        <span>Quiz</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      </div>

      {/* ── MODAL: READ STUDY GUIDE (WITH KATEX) ─────────────────────────────── */}
      {activeReadingNote && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 animate-in fade-in">
          <div className="bg-white border-2 border-black rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-[8px_8px_0px_#000] overflow-hidden">
            <div className="p-5 border-b-2 border-black bg-[#FAF7F2] flex items-center justify-between">
              <div>
                <span className={`px-2 py-0.5 rounded border text-[10px] font-black uppercase tracking-wider ${activeReadingNote.subjectBadgeColor}`}>
                  {activeReadingNote.subject}
                </span>
                <h2 className="text-[20px] font-black text-black mt-1 leading-snug">
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

            <div className="p-4 border-t-2 border-black bg-white flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  handleStudyWithRex(activeReadingNote, "practice");
                  setActiveReadingNote(null);
                }}
                className="px-4 py-2 bg-[#FF4D2E] text-white border-2 border-black rounded-xl font-black text-[12px] shadow-[2px_2px_0px_#000] cursor-pointer"
              >
                Launch Practice Quiz
              </button>
              <button
                onClick={() => {
                  handleStudyWithRex(activeReadingNote, "flashcards");
                  setActiveReadingNote(null);
                }}
                className="px-4 py-2 bg-[#FFD13B] text-black border-2 border-black rounded-xl font-black text-[12px] shadow-[2px_2px_0px_#000] cursor-pointer"
              >
                Make Flashcards
              </button>
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
                  Contribute your summary, cheat sheet, or formulas to help students study.
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
                  value={pubTitle}
                  onChange={(e) => setPubTitle(e.target.value)}
                  placeholder="e.g. Organic Chemistry Functional Groups Cheat Sheet"
                  className="w-full px-3 py-2 border-2 border-black rounded-xl text-[13px] font-bold bg-[#FAF7F2] focus:bg-white focus:outline-none"
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
                    className="w-full px-3 py-2 border-2 border-black rounded-xl text-[13px] font-bold bg-[#FAF7F2] focus:outline-none"
                  >
                    {SUBJECTS.filter((s) => s !== "All").map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-black block mb-1">
                    Key Topics / Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={pubTags}
                    onChange={(e) => setPubTags(e.target.value)}
                    placeholder="e.g. Alcohols, Ketones, Reactions"
                    className="w-full px-3 py-2 border-2 border-black rounded-xl text-[13px] font-bold bg-[#FAF7F2] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-black block mb-1">
                  Short Summary (What will students learn?)
                </label>
                <input
                  type="text"
                  value={pubSummary}
                  onChange={(e) => setPubSummary(e.target.value)}
                  placeholder="Quick 1-2 sentence overview of the concepts covered"
                  className="w-full px-3 py-2 border-2 border-black rounded-xl text-[13px] font-bold bg-[#FAF7F2] focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-black block mb-1">
                  Study Guide Content (Markdown & LaTeX supported)
                </label>
                <textarea
                  rows={8}
                  required
                  value={pubContent}
                  onChange={(e) => setPubContent(e.target.value)}
                  placeholder="# Section Title&#10;&#10;Key concepts, definitions, bullet points, or formulas ($x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}$)..."
                  className="w-full p-3 border-2 border-black rounded-xl text-[13px] font-medium bg-[#FAF7F2] focus:bg-white focus:outline-none font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPublishModal(false)}
                  className="px-4 py-2 border-2 border-black rounded-xl font-black text-[12px] bg-[#FAF7F2] hover:bg-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 border-2 border-black rounded-xl font-black text-[12px] bg-[#FF4D2E] text-white shadow-[2px_2px_0px_#000] active:translate-y-0.5 transition-all cursor-pointer"
                >
                  Publish Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: REPORT INAPPROPRIATE NOTE ───────────────────────────────── */}
      {reportingNoteId && (
        <div className="fixed inset-0 z-70 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white border-2 border-black rounded-2xl max-w-md w-full p-5 shadow-[6px_6px_0px_#000]">
            <h3 className="text-[16px] font-black text-black mb-1 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-rose-600 text-[20px]">flag</span>
              Report Study Material
            </h3>
            <p className="text-[12px] font-semibold text-black/60 mb-3.5 leading-snug">
              Studenius is dedicated to safe, respectful student learning. Help our moderation queue review this note.
            </p>

            <form onSubmit={handleReportSubmit} className="space-y-3">
              <div className="space-y-1.5">
                {[
                  { id: "inappropriate", label: "Inappropriate or offensive content" },
                  { id: "copyright", label: "Copyrighted textbook / unauthorized material" },
                  { id: "inaccurate", label: "Misleading or incorrect academic information" },
                  { id: "spam", label: "Spam, advertisement, or junk content" },
                ].map((opt) => (
                  <label
                    key={opt.id}
                    className="flex items-center gap-2 p-2 rounded-lg border border-black/15 bg-[#FAF7F2] hover:bg-white cursor-pointer text-[12px] font-bold text-black"
                  >
                    <input
                      type="radio"
                      name="reportReason"
                      value={opt.id}
                      checked={reportReason === opt.id}
                      onChange={(e) => setReportReason(e.target.value)}
                      className="accent-[#FF4D2E]"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/10">
                <button
                  type="button"
                  onClick={() => setReportingNoteId(null)}
                  className="px-3 py-1.5 border-2 border-black rounded-xl font-black text-[11.5px] bg-[#FAF7F2] hover:bg-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 border-2 border-black rounded-xl font-black text-[11.5px] bg-[#FF4D2E] text-white shadow-[2px_2px_0px_#000] cursor-pointer"
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
}
