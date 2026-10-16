import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { SharedSidebar } from "@/components/SharedSidebar";
import { useCommunity, CampusNote } from "@/hooks/useCommunity";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { playPop, playTap, playSuccess } from "@/lib/soundFX";

const SUBJECTS = ["All", "Biology", "Calculus", "Chemistry", "History", "Psychology"];

export default function Community() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    notes,
    buddies,
    toggleLikeNote,
    sendNudge,
    publishNote,
    addFriendByCode
  } = useCommunity();

  const [activeTab, setActiveTab] = useState<"vault" | "buddies">("vault");
  const [selectedSubject, setSelectedSubject] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const [activeReadingNote, setActiveReadingNote] = useState<CampusNote | null>(null);
  const [showPublishModal, setShowPublishModal] = useState(false);

  // Form State
  const [pubTitle, setPubTitle] = useState("");
  const [pubSubject, setPubSubject] = useState("Biology");
  const [pubSummary, setPubSummary] = useState("");
  const [pubContent, setPubContent] = useState("");
  const [pubTags, setPubTags] = useState("");

  const [friendCodeInput, setFriendCodeInput] = useState("");

  // User's own friend code
  const myFriendCode = useMemo(() => {
    if (user?.id) {
      const hash = user.id.replace(/-/g, "").slice(0, 4).toUpperCase();
      return `REX-${hash}`;
    }
    return "REX-8491";
  }, [user?.id]);

  const handleCopyCode = () => {
    playTap();
    navigator.clipboard.writeText(myFriendCode);
    toast.success("Friend Code copied!", {
      description: "Send it to a classmate to connect on Studenius."
    });
  };

  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
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
    if (!pubTitle.trim() || !pubContent.trim()) {
      toast.error("Please provide both a title and study content.");
      return;
    }

    const tagsArray = pubTags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const success = publishNote({
      title: pubTitle.trim(),
      subject: pubSubject,
      subjectBadgeColor: "bg-blue-50 text-blue-700 border-blue-300",
      author: user?.email?.split("@")[0] || "Student Note",
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

  return (
    <div className="w-full bg-[#FAF7F2] min-h-screen text-black flex flex-col font-body-md flex-1">
      <SharedSidebar active="/community" />

      {/* ── DESKTOP & TABLET WRAPPER ────────────────────────────────────────── */}
      <div className="md:ml-64 flex flex-col min-h-screen overflow-y-auto">
        <div className="p-6 md:p-12 max-w-6xl w-full mx-auto space-y-8">

          {/* Page Header */}
          <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b-2 border-black/10">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#FFD13B] text-black font-black uppercase text-[10px] tracking-wider rounded border border-black mb-1.5 shadow-[1px_1px_0px_#000]">
                Knowunity Style
              </div>
              <h1 className="text-[28px] md:text-[34px] font-black leading-tight text-black">
                Campus Vault & Study Circle
              </h1>
              <p className="text-[14px] font-bold text-black/60 mt-0.5">
                Search high-yield academic cheat sheets, turn any note into quizzes, and study with friends.
              </p>
            </div>

            {/* Friend Code Pill */}
            <div className="bg-white border-2 border-black rounded-xl p-3 flex items-center gap-3 shadow-[2px_2px_0px_#1A1A1A]">
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-black/45">Your Friend Code</div>
                <div className="text-[15px] font-black text-[#FF4D2E] tracking-wider">{myFriendCode}</div>
              </div>
              <button
                onClick={handleCopyCode}
                className="px-3 py-1.5 bg-black text-white hover:bg-[#FF4D2E] text-[11px] font-black rounded-lg transition-colors cursor-pointer"
              >
                Copy
              </button>
            </div>
          </header>

          {/* Navigation Tabs */}
          <div className="flex items-center justify-between gap-3 border-b-2 border-black/10 pb-3 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                onClick={() => { playTap(); setActiveTab("vault"); }}
                className={`px-4 py-2 rounded-xl border-2 border-black font-black text-[13px] transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === "vault"
                    ? "bg-black text-white shadow-[2px_2px_0px_#1A1A1A]"
                    : "bg-white hover:bg-[#F0EDE0] text-black"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">menu_book</span>
                <span>Campus Notes Vault ({notes.length})</span>
              </button>

              <button
                onClick={() => { playTap(); setActiveTab("buddies"); }}
                className={`px-4 py-2 rounded-xl border-2 border-black font-black text-[13px] transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === "buddies"
                    ? "bg-black text-white shadow-[2px_2px_0px_#1A1A1A]"
                    : "bg-white hover:bg-[#F0EDE0] text-black"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">local_fire_department</span>
                <span>Study Circle & Streaks ({buddies.length})</span>
              </button>
            </div>

            {activeTab === "vault" && (
              <button
                onClick={() => { playPop(); setShowPublishModal(true); }}
                className="px-4 py-2 bg-[#FF4D2E] text-white hover:bg-[#e03d20] border-2 border-black rounded-xl font-black text-[12px] shadow-[2px_2px_0px_#1A1A1A] active:translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">upload_file</span>
                <span>Share Notes</span>
              </button>
            )}
          </div>

          {/* ── TAB 1: CAMPUS VAULT (KNOWUNITY STYLE) ────────────────────────── */}
          {activeTab === "vault" && (
            <div className="space-y-6">
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
                    placeholder="Search study guides, topics..."
                    className="w-full pl-9 pr-3 py-2 border-2 border-black rounded-xl text-[13px] font-bold placeholder:text-black/40 focus:outline-none focus:ring-0 bg-white shadow-[2px_2px_0px_#1A1A1A]"
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
                          ? "bg-[#FF4D2E] text-white shadow-[1px_1px_0px_#000]"
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
                {filteredNotes.map((note) => (
                  <div
                    key={note.id}
                    className="border-2 border-black rounded-2xl bg-white p-5 shadow-[3px_3px_0px_#1A1A1A] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_#1A1A1A] transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span className={`px-2 py-0.5 rounded border text-[9.5px] font-black uppercase tracking-wider ${note.subjectBadgeColor}`}>
                          {note.subject}
                        </span>

                        <button
                          onClick={() => { playTap(); toggleLikeNote(note.id); }}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded border border-black/20 text-[11px] font-bold transition-colors cursor-pointer ${
                            note.likedByUser ? "bg-rose-50 text-rose-600 border-rose-400" : "bg-[#FAF7F2] text-black/60"
                          }`}
                        >
                          <span>{note.likedByUser ? "❤️" : "🤍"}</span>
                          <span>{note.likes}</span>
                        </button>
                      </div>

                      <h3
                        onClick={() => setActiveReadingNote(note)}
                        className="text-[16px] font-black text-black leading-snug mb-1.5 hover:text-[#FF4D2E] transition-colors cursor-pointer"
                      >
                        {note.title}
                      </h3>

                      <div className="text-[11px] font-bold text-black/45 mb-2.5">
                        {note.author} &bull; {note.readTime}
                      </div>

                      <p className="text-[12.5px] font-bold text-black/65 leading-relaxed line-clamp-3 mb-4">
                        {note.summary}
                      </p>

                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {note.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 bg-[#FAF7F2] border border-black/15 rounded text-[10px] font-bold text-black/60"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="pt-3 border-t-2 border-black/10 flex flex-col gap-2">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleStudyWithRex(note, "practice")}
                          className="py-1.5 bg-[#FF4D2E] hover:bg-[#e03d20] text-white border-2 border-black rounded-lg text-[11px] font-black shadow-[1px_1px_0px_#1A1A1A] active:translate-y-0.5 transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[14px]">quiz</span>
                          <span>Practice Quiz</span>
                        </button>

                        <button
                          onClick={() => handleStudyWithRex(note, "flashcards")}
                          className="py-1.5 bg-[#FFD13B] hover:bg-amber-400 text-black border-2 border-black rounded-lg text-[11px] font-black shadow-[1px_1px_0px_#1A1A1A] active:translate-y-0.5 transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[14px]">style</span>
                          <span>Flashcards</span>
                        </button>
                      </div>

                      <button
                        onClick={() => { playPop(); setActiveReadingNote(note); }}
                        className="w-full py-1.5 bg-[#FAF7F2] hover:bg-[#F0EDE0] border border-black/20 rounded-lg text-[11px] font-bold text-black/75 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[13px]">visibility</span>
                        <span>Read Study Guide</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TAB 2: STUDY CIRCLE & STREAKS (GENUINE FRIENDS) ──────────────── */}
          {activeTab === "buddies" && (
            <div className="space-y-6">
              {/* Connect card */}
              <div className="border-2 border-black rounded-2xl bg-white p-5 shadow-[3px_3px_0px_#1A1A1A]">
                <h3 className="text-[16px] font-black text-black">Connect with a Classmate</h3>
                <p className="text-[12.5px] font-bold text-black/60 mt-0.5">
                  Enter a friend's Friend Code to link study streaks together.
                </p>
                <div className="flex items-center gap-2 mt-3 max-w-md">
                  <input
                    type="text"
                    value={friendCodeInput}
                    onChange={(e) => setFriendCodeInput(e.target.value.toUpperCase())}
                    placeholder="e.g. REX-4921"
                    className="flex-1 px-3 py-2 border-2 border-black rounded-xl text-[13px] font-bold uppercase bg-[#FAF7F2] outline-none"
                  />
                  <button
                    onClick={() => {
                      if (addFriendByCode(friendCodeInput)) {
                        setFriendCodeInput("");
                      }
                    }}
                    className="px-4 py-2 bg-black text-white hover:bg-[#FF4D2E] border-2 border-black rounded-xl text-[12px] font-black shadow-[2px_2px_0px_#1A1A1A] active:translate-y-0.5 transition-all cursor-pointer"
                  >
                    Connect
                  </button>
                </div>
              </div>

              {/* Friends List or Empty State */}
              {buddies.length === 0 ? (
                <div className="border-2 border-black rounded-2xl bg-white p-8 text-center space-y-3 shadow-[3px_3px_0px_#1A1A1A]">
                  <div className="w-14 h-14 rounded-2xl border-2 border-black bg-[#FAF7F2] mx-auto flex items-center justify-center text-[28px]">
                    👥
                  </div>
                  <h4 className="text-[17px] font-black text-black">No study buddies connected yet</h4>
                  <p className="text-[13px] font-bold text-black/55 max-w-sm mx-auto">
                    Share your code <span className="text-[#FF4D2E] font-black">{myFriendCode}</span> with your classmates or study group to track mutual streaks!
                  </p>
                  <button
                    onClick={handleCopyCode}
                    className="px-4 py-2 bg-[#FFD13B] text-black border-2 border-black rounded-xl text-[12px] font-black shadow-[2px_2px_0px_#1A1A1A] cursor-pointer"
                  >
                    Copy Your Code
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {buddies.map((buddy) => (
                    <div
                      key={buddy.id}
                      className="border-2 border-black rounded-xl bg-white p-4 shadow-[2px_2px_0px_#1A1A1A] flex items-center justify-between"
                    >
                      <div>
                        <div className="text-[14px] font-black text-black">{buddy.name}</div>
                        <div className="text-[11px] font-bold text-black/50">Code: {buddy.code}</div>
                        <div className="text-[11.5px] font-black text-[#FF4D2E] mt-1">
                          🔥 {buddy.streakDays} Day Streak
                        </div>
                      </div>
                      <button
                        onClick={() => sendNudge(buddy.id)}
                        className="px-3 py-1.5 bg-[#FF4D2E] text-white border-2 border-black rounded-lg text-[10.5px] font-black cursor-pointer shadow-[1px_1px_0px_#000]"
                      >
                        Nudge
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ── MODAL: READ STUDY GUIDE ─────────────────────────────────────────── */}
      {activeReadingNote && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white border-2 border-black rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-[6px_6px_0px_#000] overflow-hidden">
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
                className="w-8 h-8 rounded-lg border-2 border-black bg-white hover:bg-rose-50 flex items-center justify-center font-bold text-black cursor-pointer shadow-[1px_1px_0px_#000]"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto font-body-md leading-relaxed text-[14px] text-black space-y-4">
              <pre className="whitespace-pre-wrap font-sans text-[13.5px] font-medium leading-relaxed bg-[#FAF7F2] p-4 rounded-xl border border-black/15">
                {activeReadingNote.content}
              </pre>
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
                className="w-8 h-8 rounded-lg border-2 border-black bg-white hover:bg-rose-50 flex items-center justify-center font-bold text-black cursor-pointer shadow-[1px_1px_0px_#000]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePublishSubmit} className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-[12px] font-black uppercase tracking-wider mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={pubTitle}
                  onChange={(e) => setPubTitle(e.target.value)}
                  placeholder="e.g. Mitosis vs Meiosis Master Comparison Sheet"
                  className="w-full px-3 py-2 border-2 border-black rounded-xl text-[13px] font-bold bg-[#FAF7F2] outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-black uppercase tracking-wider mb-1">
                    Subject *
                  </label>
                  <select
                    value={pubSubject}
                    onChange={(e) => setPubSubject(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-black rounded-xl text-[13px] font-bold bg-[#FAF7F2] outline-none"
                  >
                    {SUBJECTS.filter((s) => s !== "All").map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] font-black uppercase tracking-wider mb-1">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={pubTags}
                    onChange={(e) => setPubTags(e.target.value)}
                    placeholder="e.g. Genetics, PMAT"
                    className="w-full px-3 py-2 border-2 border-black rounded-xl text-[13px] font-bold bg-[#FAF7F2] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-black uppercase tracking-wider mb-1">
                  Summary
                </label>
                <input
                  type="text"
                  value={pubSummary}
                  onChange={(e) => setPubSummary(e.target.value)}
                  placeholder="1-2 sentences summarizing this note..."
                  className="w-full px-3 py-2 border-2 border-black rounded-xl text-[13px] font-bold bg-[#FAF7F2] outline-none"
                />
              </div>

              <div>
                <label className="block text-[12px] font-black uppercase tracking-wider mb-1">
                  Content *
                </label>
                <textarea
                  required
                  rows={8}
                  value={pubContent}
                  onChange={(e) => setPubContent(e.target.value)}
                  placeholder="Paste study material, key points, formulas..."
                  className="w-full p-3 border-2 border-black rounded-xl text-[13px] font-medium bg-[#FAF7F2] outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPublishModal(false)}
                  className="px-4 py-2 border-2 border-black rounded-xl text-[12px] font-black bg-[#FAF7F2] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-black hover:bg-[#FF4D2E] text-white border-2 border-black rounded-xl text-[12px] font-black shadow-[2px_2px_0px_#1A1A1A] active:translate-y-0.5 transition-all cursor-pointer"
                >
                  Publish Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
