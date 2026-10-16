import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { SharedSidebar } from "@/components/SharedSidebar";
import { RexMascot } from "@/components/RexMascot";
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
    feed,
    socialXpToday,
    maxDailySocialXp,
    nudgesMuted,
    toggleNudgeMute,
    toggleLikeNote,
    sendNudge,
    sendHighFive,
    publishNote,
    addFriendByCode
  } = useCommunity();

  const [activeTab, setActiveTab] = useState<"vault" | "buddies" | "rooms">("vault");
  const [selectedSubject, setSelectedSubject] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [activeReadingNote, setActiveReadingNote] = useState<CampusNote | null>(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState<CampusNote | null>(null);
  const [reportReason, setReportReason] = useState("");

  // Publish Form State
  const [pubTitle, setPubTitle] = useState("");
  const [pubSubject, setPubSubject] = useState("Biology");
  const [pubSummary, setPubSummary] = useState("");
  const [pubContent, setPubContent] = useState("");
  const [pubTags, setPubTags] = useState("");

  // Add friend code input
  const [friendCodeInput, setFriendCodeInput] = useState("");

  // User's own friend code
  const myFriendCode = useMemo(() => {
    if (user?.id) {
      const hash = user.id.replace(/-/g, "").slice(0, 4).toUpperCase();
      return `REX-${hash}`;
    }
    return "REX-8491";
  }, [user?.id]);

  // Copy friend code
  const handleCopyCode = () => {
    playTap();
    navigator.clipboard.writeText(myFriendCode);
    toast.success("Friend Code copied to clipboard!", {
      description: "Send it to your classmates so they can add you to their streak!"
    });
  };

  // Filter notes
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

  // 1-Tap "Study with Rex"
  const handleStudyWithRex = (note: CampusNote, mode: "practice" | "flashcards") => {
    playPop();
    const exportData = {
      title: note.title,
      subject: note.subject,
      content: note.content,
      summary: note.summary
    };

    if (mode === "practice") {
      // Practice.tsx reads qs_practice_export
      localStorage.setItem("qs_practice_export", JSON.stringify(note.content));
      toast.success(`Loading "${note.title}" into Practice Quiz!`, {
        description: "Rex is preparing your personalized recall challenge."
      });
      navigate("/practice");
    } else {
      // Store in flashcards export
      localStorage.setItem("qs_flashcards_export", JSON.stringify(note.content));
      localStorage.setItem("pz_practice_topic", note.title);
      toast.success(`Loading "${note.title}" into Flashcards!`, {
        description: "Spaced repetition deck ready."
      });
      navigate("/flashcards");
    }
  };

  // Submit new note
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
      subjectBadgeColor: "bg-indigo-100 text-indigo-800 border-indigo-600",
      author: user?.email?.split("@")[0] || "Campus Scholar",
      authorAvatar: "🎓",
      readTime: `${Math.max(2, Math.ceil(pubContent.length / 400))} min read`,
      tags: tagsArray.length > 0 ? tagsArray : ["Study Guide", pubSubject],
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

  // Submit report
  const handleReportSubmit = () => {
    playTap();
    toast.success("Thank you for your report.", {
      description: "Our moderation team will review this note within 24 hours."
    });
    setShowReportModal(null);
    setReportReason("");
  };

  return (
    <div className="flex h-screen bg-[#FAF7F2] font-sans antialiased text-black overflow-hidden">
      <SharedSidebar />

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

          {/* 1. Header Banner with Mascot & Friend Code */}
          <header className="bg-white border-[2.5px] border-black rounded-2xl p-5 sm:p-6 shadow-[4px_4px_0px_#000] flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5 w-full md:w-auto">
              <RexMascot 
                emotion="happy" 
                size="md" 
                speechText="Welcome to Campus Vault! Study peer notes or protect your friend streaks!" 
                showSpeech={true}
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-[#FF4D2E] text-white border border-black rounded text-[10px] font-black uppercase tracking-wider">
                    Community 2.0
                  </span>
                  <span className="text-[12px] font-extrabold text-black/50">
                    Knowunity × Duolingo Hub
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-0.5">
                  Campus Vault & Buddies
                </h1>
                <p className="text-black/60 text-[13px] font-bold mt-1">
                  Peer-shared high-yield study guides, mutual friend streaks, and live recall.
                </p>
              </div>
            </div>

            {/* Friend Code Card */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto shrink-0">
              <div className="bg-[#FAF7F2] border-2 border-black rounded-xl p-3 flex items-center gap-3 w-full sm:w-auto shadow-[2px_2px_0px_#000]">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-black/50">
                    Your Friend Code
                  </div>
                  <div className="text-[16px] font-black tracking-wider text-[#FF4D2E]">
                    {myFriendCode}
                  </div>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 bg-black text-white hover:bg-[#FF4D2E] text-[11px] font-extrabold rounded-lg transition-colors cursor-pointer"
                >
                  Copy
                </button>
              </div>

              <div className="flex items-center gap-2 bg-[#dcfce7] border-2 border-black rounded-xl px-3.5 py-3 shadow-[2px_2px_0px_#000] w-full sm:w-auto justify-center">
                <span className="text-[20px]">🔥</span>
                <div className="text-left">
                  <div className="text-[10px] font-black uppercase tracking-wider text-green-900/60">Streak Partner</div>
                  <div className="text-[13px] font-black text-green-900">Rex Active (4 Days)</div>
                </div>
              </div>
            </div>
          </header>

          {/* 2. Neobrutalist Navigation Tabs */}
          <div className="flex items-center justify-between border-b-2 border-black pb-2 gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                onClick={() => { playTap(); setActiveTab("vault"); }}
                className={`px-4 py-2 rounded-xl border-2 border-black font-extrabold text-[13.5px] transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === "vault"
                    ? "bg-[#FF4D2E] text-white shadow-[3px_3px_0px_#000] -translate-y-0.5"
                    : "bg-white hover:bg-[#F0EDE0] text-black shadow-[2px_2px_0px_#000]"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">menu_book</span>
                <span>Campus Notes Vault</span>
                <span className={`text-[10px] font-black px-1.5 py-0.2 rounded ${activeTab === "vault" ? "bg-white text-black" : "bg-black/10 text-black"}`}>
                  {notes.length}
                </span>
              </button>

              <button
                onClick={() => { playTap(); setActiveTab("buddies"); }}
                className={`px-4 py-2 rounded-xl border-2 border-black font-extrabold text-[13.5px] transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === "buddies"
                    ? "bg-[#FF4D2E] text-white shadow-[3px_3px_0px_#000] -translate-y-0.5"
                    : "bg-white hover:bg-[#F0EDE0] text-black shadow-[2px_2px_0px_#000]"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">local_fire_department</span>
                <span>Friend Streaks & Feed</span>
                <span className={`text-[10px] font-black px-1.5 py-0.2 rounded ${activeTab === "buddies" ? "bg-white text-black" : "bg-black/10 text-black"}`}>
                  {buddies.length}
                </span>
              </button>

              <button
                onClick={() => { playTap(); setActiveTab("rooms"); }}
                className={`px-4 py-2 rounded-xl border-2 border-black font-extrabold text-[13.5px] transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === "rooms"
                    ? "bg-[#FF4D2E] text-white shadow-[3px_3px_0px_#000] -translate-y-0.5"
                    : "bg-white hover:bg-[#F0EDE0] text-black shadow-[2px_2px_0px_#000]"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">groups</span>
                <span>Study Lounges</span>
                <span className="text-[9px] font-black bg-amber-300 text-black px-1.5 py-0.5 rounded border border-black uppercase">
                  Soon
                </span>
              </button>
            </div>

            {activeTab === "vault" && (
              <button
                onClick={() => { playPop(); setShowPublishModal(true); }}
                className="px-4 py-2 bg-black text-white hover:bg-[#FF4D2E] border-2 border-black rounded-xl font-extrabold text-[13px] shadow-[3px_3px_0px_#000] active:translate-y-0.5 transition-all flex items-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">upload_file</span>
                <span>Publish Study Notes</span>
              </button>
            )}
          </div>

          {/* 3. TAB 1: CAMPUS NOTES VAULT (KNOWUNITY MODEL) */}
          {activeTab === "vault" && (
            <div className="space-y-6">
              {/* Filter & Search Bar */}
              <div className="bg-white border-2 border-black rounded-2xl p-4 shadow-[3px_3px_0px_#000] flex flex-col md:flex-row items-center justify-between gap-4">
                {/* Search Input */}
                <div className="relative w-full md:w-80">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-black/40 text-[20px]">
                    search
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search topics, guides, tags..."
                    className="w-full pl-9 pr-3 py-2 border-2 border-black rounded-xl text-[13px] font-extrabold placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-[#FF4D2E] bg-[#FAF7F2]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 hover:text-black text-[14px] font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Subject Filter Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
                  {SUBJECTS.map((sub) => (
                    <button
                      key={sub}
                      onClick={() => { playTap(); setSelectedSubject(sub); }}
                      className={`px-3 py-1.5 rounded-lg border-2 border-black text-[12px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                        selectedSubject === sub
                          ? "bg-black text-white shadow-[2px_2px_0px_#FF4D2E]"
                          : "bg-white hover:bg-[#F0EDE0] text-black shadow-[1px_1px_0px_#000]"
                      }`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredNotes.map((note) => (
                  <div
                    key={note.id}
                    className="bg-white border-[2.5px] border-black rounded-2xl p-5 shadow-[4px_4px_0px_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0px_#000] transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Bar: Subject Badge + Upvotes + Report */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className={`px-2.5 py-0.5 rounded-md border text-[10px] font-black uppercase tracking-wider ${note.subjectBadgeColor}`}>
                          {note.subject}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { playTap(); toggleLikeNote(note.id); }}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded border border-black text-[11px] font-black transition-colors cursor-pointer ${
                              note.likedByUser ? "bg-rose-100 text-rose-700 border-rose-500" : "bg-[#FAF7F2] hover:bg-rose-50 text-black/70"
                            }`}
                            title="Upvote note"
                          >
                            <span>{note.likedByUser ? "❤️" : "🤍"}</span>
                            <span>{note.likes}</span>
                          </button>

                          <button
                            onClick={() => setShowReportModal(note)}
                            className="text-black/30 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Report note"
                          >
                            <span className="material-symbols-outlined text-[16px]">flag</span>
                          </button>
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="text-[17px] font-extrabold leading-tight text-black mb-1.5 hover:text-[#FF4D2E] transition-colors cursor-pointer"
                          onClick={() => setActiveReadingNote(note)}>
                        {note.title}
                      </h3>

                      {/* Author & Read Time */}
                      <div className="flex items-center gap-2 text-[11px] font-bold text-black/50 mb-3">
                        <span>{note.authorAvatar} {note.author}</span>
                        <span>•</span>
                        <span>{note.readTime}</span>
                        <span>•</span>
                        <span>{note.date}</span>
                      </div>

                      {/* Summary */}
                      <p className="text-[12.5px] font-bold text-black/65 leading-relaxed line-clamp-3 mb-4">
                        {note.summary}
                      </p>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {note.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 bg-[#FAF7F2] border border-black/20 rounded text-[10px] font-bold text-black/60"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Bottom Actions: 1-Tap "Study with Rex" + Read */}
                    <div className="pt-3 border-t-2 border-black/10 flex flex-col gap-2">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleStudyWithRex(note, "practice")}
                          className="px-3 py-2 bg-[#FF4D2E] hover:bg-[#e03d20] text-white border-2 border-black rounded-xl text-[12px] font-black shadow-[2px_2px_0px_#000] active:translate-y-0.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">quiz</span>
                          <span>Practice Quiz</span>
                        </button>

                        <button
                          onClick={() => handleStudyWithRex(note, "flashcards")}
                          className="px-3 py-2 bg-amber-400 hover:bg-amber-500 text-black border-2 border-black rounded-xl text-[12px] font-black shadow-[2px_2px_0px_#000] active:translate-y-0.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">style</span>
                          <span>Flashcards</span>
                        </button>
                      </div>

                      <button
                        onClick={() => { playPop(); setActiveReadingNote(note); }}
                        className="w-full py-1.5 bg-[#FAF7F2] hover:bg-[#F0EDE0] border border-black rounded-lg text-[11px] font-extrabold text-black/75 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[14px]">visibility</span>
                        <span>Read Full Study Guide</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. TAB 2: FRIEND STREAKS & SOCIAL FEED (DUOLINGO MODEL) */}
          {activeTab === "buddies" && (
            <div className="space-y-6">
              
              {/* Buddy Code Input & Settings */}
              <div className="bg-white border-[2.5px] border-black rounded-2xl p-5 shadow-[4px_4px_0px_#000] flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex-1 w-full">
                  <h3 className="text-[15px] font-black uppercase tracking-wider">
                    Add a Study Buddy
                  </h3>
                  <p className="text-[12px] font-bold text-black/60 mt-0.5">
                    Enter a friend's 6-character code to link mutual streaks.
                  </p>
                  <div className="flex items-center gap-2 mt-2.5 max-w-md">
                    <input
                      type="text"
                      value={friendCodeInput}
                      onChange={(e) => setFriendCodeInput(e.target.value.toUpperCase())}
                      placeholder="e.g. REX-4921"
                      className="flex-1 px-3 py-2 border-2 border-black rounded-xl text-[13px] font-extrabold uppercase bg-[#FAF7F2] focus:outline-none focus:ring-2 focus:ring-[#FF4D2E]"
                    />
                    <button
                      onClick={() => {
                        if (addFriendByCode(friendCodeInput)) {
                          setFriendCodeInput("");
                        }
                      }}
                      className="px-4 py-2 bg-black text-white hover:bg-[#FF4D2E] border-2 border-black rounded-xl text-[12px] font-black shadow-[2px_2px_0px_#000] active:translate-y-0.5 transition-all cursor-pointer"
                    >
                      Connect
                    </button>
                  </div>
                </div>

                {/* Mute Nudges Preference */}
                <div className="border-t-2 md:border-t-0 md:border-l-2 border-black/10 pt-3 md:pt-0 md:pl-5 w-full md:w-auto flex md:flex-col items-center justify-between gap-3 shrink-0">
                  <div className="text-left md:text-right">
                    <div className="text-[12px] font-black">Streak Nudges</div>
                    <div className="text-[10px] font-bold text-black/50">
                      {nudgesMuted ? "Currently Muted" : "Active & Playful"}
                    </div>
                  </div>
                  <button
                    onClick={toggleNudgeMute}
                    className={`px-3 py-1.5 rounded-lg border-2 border-black text-[11px] font-extrabold transition-all cursor-pointer ${
                      nudgesMuted ? "bg-black text-white" : "bg-[#FAF7F2] hover:bg-[#F0EDE0] text-black"
                    }`}
                  >
                    {nudgesMuted ? "Unmute Nudges" : "Mute Nudges"}
                  </button>
                </div>
              </div>

              {/* Friend Streaks Grid */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#FF4D2E] text-[22px]">local_fire_department</span>
                    <h2 className="text-[16px] font-black uppercase tracking-wider">Active Friend Streaks</h2>
                  </div>
                  <span className="text-[12px] font-bold text-black/50">
                    Both must study to maintain the flame
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {buddies.map((buddy) => (
                    <div
                      key={buddy.id}
                      className={`border-[2.5px] border-black rounded-2xl p-4 shadow-[3px_3px_0px_#000] flex flex-col justify-between transition-all ${
                        buddy.isRexMascot ? "bg-amber-50" : "bg-white"
                      }`}
                    >
                      <div>
                        {/* Buddy Avatar & Status */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="w-12 h-12 rounded-xl border-2 border-black bg-white flex items-center justify-center text-[24px] shadow-[2px_2px_0px_#000]">
                            {buddy.avatar}
                          </div>
                          
                          <div className={`px-2 py-0.5 rounded border border-black text-[9.5px] font-black uppercase tracking-wider ${
                            buddy.hasStudiedToday ? "bg-green-100 text-green-800 border-green-600" : "bg-amber-100 text-amber-800 border-amber-600"
                          }`}>
                            {buddy.hasStudiedToday ? "Studied ✅" : "Needs Study ⏰"}
                          </div>
                        </div>

                        {/* Buddy Details */}
                        <h4 className="text-[15px] font-extrabold text-black leading-tight">
                          {buddy.name}
                        </h4>
                        <div className="text-[11px] font-bold text-black/50 mt-0.5">
                          {buddy.subject}
                        </div>

                        {/* Flame Counter */}
                        <div className="mt-3 bg-[#FAF7F2] border border-black rounded-xl p-2.5 flex items-center gap-2">
                          <span className="text-[20px]">🔥</span>
                          <div>
                            <div className="text-[14px] font-black leading-none text-[#FF4D2E]">
                              {buddy.streakDays} Day Streak
                            </div>
                            <div className="text-[9.5px] font-bold text-black/50 mt-0.5">
                              {buddy.lastActive}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action: Nudge or Celebrate */}
                      <div className="mt-4 pt-3 border-t-2 border-black/10">
                        {buddy.isRexMascot ? (
                          <button
                            onClick={() => { playPop(); navigate("/practice"); }}
                            className="w-full py-2 bg-black text-white hover:bg-[#FF4D2E] border-2 border-black rounded-xl text-[11.5px] font-black transition-colors cursor-pointer shadow-[2px_2px_0px_#000] active:translate-y-0.5"
                          >
                            Study With Rex
                          </button>
                        ) : buddy.hasStudiedToday ? (
                          <div className="py-2 bg-green-50 border border-green-700/30 rounded-xl text-center text-[11px] font-extrabold text-green-800">
                            Safe for Today! 🔥
                          </div>
                        ) : (
                          <button
                            onClick={() => sendNudge(buddy.id)}
                            className="w-full py-2 bg-[#FF4D2E] hover:bg-[#e03d20] text-white border-2 border-black rounded-xl text-[11.5px] font-black transition-all cursor-pointer shadow-[2px_2px_0px_#000] active:translate-y-0.5 flex items-center justify-center gap-1.5"
                          >
                            <span className="material-symbols-outlined text-[16px]">notifications_active</span>
                            <span>Send Playful Nudge</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ambient Social Feed & High-Fives */}
              <div className="bg-white border-[2.5px] border-black rounded-2xl p-5 sm:p-6 shadow-[4px_4px_0px_#000]">
                <div className="flex items-center justify-between pb-3 border-b-2 border-black/10 mb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[22px] text-amber-500">celebration</span>
                    <h3 className="text-[16px] font-black uppercase tracking-wider">Campus Live Accomplishments</h3>
                  </div>

                  {/* Daily Social XP Cap Tracker */}
                  <div className="flex items-center gap-2 bg-[#FAF7F2] border border-black rounded-lg px-3 py-1">
                    <span className="text-[11px] font-black uppercase tracking-wider text-black/60">Social XP Today:</span>
                    <span className="text-[12px] font-black text-[#FF4D2E]">{socialXpToday} / {maxDailySocialXp} Max</span>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  {feed.map((item) => (
                    <div
                      key={item.id}
                      className="border-2 border-black rounded-xl p-3.5 flex items-center justify-between gap-3 bg-[#FAF7F2] hover:bg-white transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg border-2 border-black bg-white flex items-center justify-center text-[20px] shrink-0">
                          {item.userAvatar}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[13.5px] font-extrabold text-black truncate">
                            <span className="text-[#FF4D2E]">{item.userName}</span> {item.action} in <span className="underline decoration-black/30 font-black">{item.topic}</span>
                          </div>
                          <div className="text-[11px] font-bold text-black/45 mt-0.5">
                            {item.timeAgo}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => sendHighFive(item.id)}
                        disabled={item.highFived}
                        className={`px-3 py-1.5 rounded-xl border-2 border-black text-[12px] font-black flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                          item.highFived
                            ? "bg-green-100 text-green-800 border-green-700 opacity-80 cursor-default"
                            : "bg-white hover:bg-amber-100 text-black shadow-[2px_2px_0px_#000] active:translate-y-0.5"
                        }`}
                      >
                        <span>{item.highFived ? "🙌 Sent!" : "🙌 High-Five"}</span>
                        {!item.highFived && <span className="text-[10px] text-[#FF4D2E] font-black">+5 XP</span>}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 5. TAB 3: STUDY LOUNGES (COMING SOON TEASER) */}
          {activeTab === "rooms" && (
            <div className="bg-white border-[2.5px] border-black rounded-2xl p-8 sm:p-12 shadow-[4px_4px_0px_#000] text-center max-w-2xl mx-auto space-y-5">
              <div className="w-20 h-20 rounded-2xl border-2 border-black bg-amber-100 mx-auto flex items-center justify-center shadow-[4px_4px_0px_#000]">
                <span className="material-symbols-outlined text-[40px] text-black">sports_esports</span>
              </div>

              <div>
                <span className="px-3 py-1 bg-amber-300 border border-black rounded-full text-[11px] font-black uppercase tracking-wider">
                  In Active Development
                </span>
                <h2 className="text-2xl sm:text-3xl font-black mt-3">
                  Multiplayer Live Study Lounges
                </h2>
                <p className="text-black/60 font-bold text-[14px] mt-2 max-w-md mx-auto leading-relaxed">
                  Compete with your classmates in real-time quiz duels with shared room codes (#BIO101), synchronized countdowns, and live leaderboards.
                </p>
              </div>

              <div className="pt-4 flex justify-center">
                <button
                  onClick={() => {
                    playSuccess();
                    toast.success("You're on the priority waitlist for Live Lounges! 🚀");
                  }}
                  className="px-6 py-3 bg-[#FF4D2E] hover:bg-[#e03d20] text-white border-2 border-black rounded-xl font-black text-[13.5px] shadow-[3px_3px_0px_#000] active:translate-y-0.5 transition-all cursor-pointer flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[20px]">notifications</span>
                  <span>Notify Me When Lounges Launch</span>
                </button>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ── MODAL: READ FULL STUDY GUIDE ────────────────────────────────────────── */}
      {activeReadingNote && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white border-[3px] border-black rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-[8px_8px_0px_#000] overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b-2 border-black bg-[#FAF7F2] flex items-center justify-between">
              <div>
                <span className={`px-2.5 py-0.5 rounded border text-[10px] font-black uppercase tracking-wider ${activeReadingNote.subjectBadgeColor}`}>
                  {activeReadingNote.subject}
                </span>
                <h2 className="text-xl font-black text-black mt-1 leading-snug">
                  {activeReadingNote.title}
                </h2>
                <div className="text-[11px] font-bold text-black/50 mt-0.5">
                  By {activeReadingNote.authorAvatar} {activeReadingNote.author} • {activeReadingNote.readTime}
                </div>
              </div>
              <button
                onClick={() => setActiveReadingNote(null)}
                className="w-9 h-9 rounded-xl border-2 border-black bg-white hover:bg-rose-100 flex items-center justify-center font-bold text-black cursor-pointer shadow-[2px_2px_0px_#000]"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto font-sans leading-relaxed text-[14px] text-black/85 space-y-4">
              <pre className="whitespace-pre-wrap font-sans text-[13.5px] font-medium leading-relaxed bg-[#FAF7F2] p-4 rounded-xl border border-black/15">
                {activeReadingNote.content}
              </pre>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t-2 border-black bg-white flex items-center justify-between gap-3">
              <button
                onClick={() => {
                  toggleLikeNote(activeReadingNote.id);
                  setActiveReadingNote({
                    ...activeReadingNote,
                    likedByUser: !activeReadingNote.likedByUser,
                    likes: activeReadingNote.likedByUser ? activeReadingNote.likes - 1 : activeReadingNote.likes + 1
                  });
                }}
                className="px-3.5 py-2 border-2 border-black rounded-xl font-black text-[12px] bg-[#FAF7F2] hover:bg-rose-50 flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000]"
              >
                <span>{activeReadingNote.likedByUser ? "❤️ Liked" : "🤍 Upvote"}</span>
                <span>({activeReadingNote.likes})</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleStudyWithRex(activeReadingNote, "practice");
                    setActiveReadingNote(null);
                  }}
                  className="px-4 py-2 bg-[#FF4D2E] hover:bg-[#e03d20] text-white border-2 border-black rounded-xl font-black text-[12px] shadow-[2px_2px_0px_#000] cursor-pointer"
                >
                  Study with Practice Quiz
                </button>
                <button
                  onClick={() => {
                    handleStudyWithRex(activeReadingNote, "flashcards");
                    setActiveReadingNote(null);
                  }}
                  className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-black border-2 border-black rounded-xl font-black text-[12px] shadow-[2px_2px_0px_#000] cursor-pointer"
                >
                  Make Flashcards
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: PUBLISH STUDY NOTE ────────────────────────────────────────── */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white border-[3px] border-black rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-[8px_8px_0px_#000] overflow-hidden">
            <div className="p-5 border-b-2 border-black bg-[#FAF7F2] flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-black">Publish Notes to Campus Vault</h2>
                <p className="text-[12px] font-bold text-black/55 mt-0.5">
                  Share original cheat sheets or guides to help fellow students and earn +25 XP!
                </p>
              </div>
              <button
                onClick={() => setShowPublishModal(false)}
                className="w-9 h-9 rounded-xl border-2 border-black bg-white hover:bg-rose-100 flex items-center justify-center font-bold text-black cursor-pointer shadow-[2px_2px_0px_#000]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePublishSubmit} className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-[12px] font-black uppercase tracking-wider mb-1">
                  Guide Title *
                </label>
                <input
                  type="text"
                  required
                  value={pubTitle}
                  onChange={(e) => setPubTitle(e.target.value)}
                  placeholder="e.g. Mitosis vs Meiosis Master Comparison Sheet"
                  className="w-full px-3 py-2 border-2 border-black rounded-xl text-[13px] font-extrabold bg-[#FAF7F2] focus:outline-none focus:ring-2 focus:ring-[#FF4D2E]"
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
                    className="w-full px-3 py-2 border-2 border-black rounded-xl text-[13px] font-extrabold bg-[#FAF7F2] focus:outline-none focus:ring-2 focus:ring-[#FF4D2E]"
                  >
                    {SUBJECTS.filter((s) => s !== "All").map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] font-black uppercase tracking-wider mb-1">
                    Topic Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={pubTags}
                    onChange={(e) => setPubTags(e.target.value)}
                    placeholder="e.g. Cell Division, PMAT, Genetics"
                    className="w-full px-3 py-2 border-2 border-black rounded-xl text-[13px] font-extrabold bg-[#FAF7F2] focus:outline-none focus:ring-2 focus:ring-[#FF4D2E]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-black uppercase tracking-wider mb-1">
                  Quick Summary
                </label>
                <input
                  type="text"
                  value={pubSummary}
                  onChange={(e) => setPubSummary(e.target.value)}
                  placeholder="1-2 sentences summarizing what this note teaches..."
                  className="w-full px-3 py-2 border-2 border-black rounded-xl text-[13px] font-extrabold bg-[#FAF7F2] focus:outline-none focus:ring-2 focus:ring-[#FF4D2E]"
                />
              </div>

              <div>
                <label className="block text-[12px] font-black uppercase tracking-wider mb-1">
                  Study Content / Notes *
                </label>
                <textarea
                  required
                  rows={8}
                  value={pubContent}
                  onChange={(e) => setPubContent(e.target.value)}
                  placeholder="Paste your study guide, key formulas, bullet points, and memory tricks here..."
                  className="w-full p-3 border-2 border-black rounded-xl text-[13px] font-medium bg-[#FAF7F2] focus:outline-none focus:ring-2 focus:ring-[#FF4D2E]"
                />
              </div>

              <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-[11px] font-bold text-amber-900 leading-snug">
                ⚠️ Academic Integrity & Content Policy: Only publish your own original notes, synthesis, or explanations. Do not upload copyrighted textbook pages or inappropriate material.
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPublishModal(false)}
                  className="px-4 py-2 border-2 border-black rounded-xl text-[12px] font-black bg-[#FAF7F2] hover:bg-[#F0EDE0] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-black hover:bg-[#FF4D2E] text-white border-2 border-black rounded-xl text-[12px] font-black shadow-[3px_3px_0px_#000] active:translate-y-0.5 transition-all cursor-pointer"
                >
                  Publish Note (+25 XP)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: REPORT NOTE ────────────────────────────────────────── */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white border-[3px] border-black rounded-2xl max-w-md w-full p-6 shadow-[8px_8px_0px_#000] space-y-4">
            <h3 className="text-[17px] font-black text-black">Report Note</h3>
            <p className="text-[12px] font-bold text-black/60">
              Flag "{showReportModal.title}" for moderator review.
            </p>

            <div className="space-y-2">
              {["Copyrighted textbook material", "Inappropriate or abusive language", "Inaccurate or misleading facts", "Spam or promotional content"].map((reason) => (
                <label key={reason} className="flex items-center gap-2 p-2 border border-black/20 rounded-lg hover:bg-[#FAF7F2] cursor-pointer text-[12px] font-bold">
                  <input
                    type="radio"
                    name="reportReason"
                    value={reason}
                    checked={reportReason === reason}
                    onChange={(e) => setReportReason(e.target.value)}
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowReportModal(null)}
                className="px-3.5 py-1.5 border-2 border-black rounded-lg text-[11px] font-black bg-[#FAF7F2] hover:bg-[#F0EDE0] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleReportSubmit}
                disabled={!reportReason}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white border-2 border-black rounded-lg text-[11px] font-black shadow-[2px_2px_0px_#000] cursor-pointer"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
