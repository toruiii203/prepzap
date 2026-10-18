import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { StudyBuddy, CampusNote } from "@/hooks/useCommunity";
import { useAuth } from "@/contexts/AuthContext";
import { playPop, playTap, playSuccess } from "@/lib/soundFX";
import { toast } from "sonner";
import { StudyGuideRenderer } from "@/components/StudyGuideRenderer";
import { hasGivenHeart, toggleHeartOnProfile } from "@/lib/userProfileStore";

interface FriendProfileModalProps {
  buddy: StudyBuddy | null;
  buddyNotes: CampusNote[];
  onClose: () => void;
  onNudge: (buddyId: string) => void;
  onLaunchStudy: (note: CampusNote, mode: "practice" | "flashcards") => void;
  onReportNote: (noteId: string, reason: string) => void;
  onCloneNote?: (note: CampusNote) => void;
}

export const FriendProfileModal: React.FC<FriendProfileModalProps> = ({
  buddy,
  buddyNotes,
  onClose,
  onNudge,
  onLaunchStudy,
  onReportNote,
  onCloneNote
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"notes" | "duels" | "activity">("notes");
  const [readingNote, setReadingNote] = useState<CampusNote | null>(null);
  const [reportingNoteId, setReportingNoteId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("inappropriate");
  const [hasHearted, setHasHearted] = useState(false);
  const [heartCount, setHeartCount] = useState(0);

  useEffect(() => {
    if (buddy && user?.id) {
      setHasHearted(hasGivenHeart(buddy.id, user.id));
      setHeartCount(buddy.likesCount || 0);
    }
  }, [buddy, user?.id]);

  if (!buddy) return null;

  const isSelf = user?.id === buddy.id;

  const isAvatarImage =
    buddy.avatar?.startsWith("/") ||
    buddy.avatar?.startsWith("http") ||
    buddy.avatar?.startsWith("data:");

  const handleToggleHeart = async () => {
    if (isSelf) {
      toast.info("You cannot heart your own profile.");
      return;
    }
    playPop();
    const result = await toggleHeartOnProfile(buddy.id, heartCount, user?.id);
    setHasHearted(result.hearted);
    setHeartCount(result.newCount);
    if (result.hearted) {
      playSuccess();
      toast.success(`You gave a heart to ${buddy.name}!`, {
        description: "Peer appreciation recorded."
      });
    } else {
      toast.info(`Removed heart from ${buddy.name}.`);
    }
  };

  const handleCopyProfileLink = () => {
    playTap();
    navigator.clipboard.writeText(`${window.location.origin}/friends?friend=${buddy.code}`);
    toast.success("Profile link copied!");
  };

  const handleLaunchDuel = (subject?: string) => {
    playPop();
    const duelSubject = subject || buddy.subject || "General";
    localStorage.setItem("pz_duel_opponent", JSON.stringify({
      id: buddy.id,
      name: buddy.name,
      avatar: buddy.avatar,
      code: buddy.code,
      subject: duelSubject
    }));
    toast.success(`Challenging ${buddy.name} to a 1v1 Quiz Duel!`, {
      description: `Topic: ${duelSubject}. 5 questions to test your mastery.`
    });
    onClose();
    navigate("/practice");
  };

  const handleLaunchCoStudy = () => {
    playPop();
    localStorage.setItem("pz_costudy_partner", JSON.stringify({
      id: buddy.id,
      name: buddy.name,
      avatar: buddy.avatar,
      code: buddy.code
    }));
    toast.success(`Starting a Co-Study session with ${buddy.name}!`, {
      description: "Focus timer activated. Stay locked in together!"
    });
    onClose();
    navigate("/timer");
  };

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingNoteId) return;
    playTap();
    onReportNote(reportingNoteId, reportReason);
    setReportingNoteId(null);
    toast.success("Thank you for keeping Studenius safe.", {
      description: "This note has been reported and hidden from your feed."
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 animate-in fade-in">
      <div className="bg-[#FFFDF5] border-4 border-black rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-[8px_8px_0px_#1A1A1A] overflow-hidden">
        
        {/* ── CHANNEL COVER BANNER (YouTube / TikTok creator style) ──────── */}
        <div className="h-28 md:h-36 w-full bg-gradient-to-r from-[#FFD13B] via-[#FF4D2E] to-[#FF8A00] border-b-4 border-black relative p-3 flex justify-between items-start shrink-0">
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#000_2px,transparent_2px)] [background-size:16px_16px] pointer-events-none" />
          
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-black/70 backdrop-blur-xs text-white rounded-lg text-[10.5px] font-black uppercase tracking-wider border border-white/20">
            <span className="material-symbols-outlined text-[13px] text-[#FFD13B]">person</span>
            Student Profile
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border-2 border-black bg-white hover:bg-rose-50 flex items-center justify-center font-black text-black cursor-pointer shadow-[2px_2px_0px_#1A1A1A] z-10 transition-transform active:scale-95"
          >
            ✕
          </button>
        </div>

        {/* ── CHANNEL HEADER & AVATAR ────────────────────────────────────── */}
        <div className="px-5 md:px-7 pb-4 pt-0 relative shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 -mt-12 md:-mt-14 mb-3">
            <div className="flex items-end gap-3.5">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-white border-3 border-black flex items-center justify-center shadow-[4px_4px_0px_#1A1A1A] shrink-0 overflow-hidden bg-[#FAF7F2]">
                {isAvatarImage ? (
                  <img src={buddy.avatar} alt={buddy.name} className="w-full h-full object-cover" />
                ) : (
                  <img src="/buddies/fox_scholar.png" alt={buddy.name} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-[19px] md:text-[22px] font-black text-black leading-tight truncate">
                    {buddy.name}
                  </h2>
                </div>
                <div className="text-[12.5px] font-bold text-black/60 truncate">
                  {buddy.username || `@student_${buddy.code.slice(0, 4).toLowerCase()}`} &bull; {buddy.code}
                </div>
              </div>
            </div>

            {/* Top Quick Actions */}
            <div className="flex items-center gap-2 pt-1 sm:pt-0">
              <button
                type="button"
                onClick={() => handleLaunchDuel()}
                className="px-3.5 py-1.5 bg-[#FFD13B] hover:bg-[#FFE566] text-black border-2 border-black rounded-xl font-black text-[12px] shadow-[2px_2px_0px_#1A1A1A] active:translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer"
                title="Challenge to a 1v1 Quiz Duel"
              >
                <span className="material-symbols-outlined text-[15px]">sports_kabaddi</span>
                <span>Duel</span>
              </button>

              <button
                type="button"
                onClick={() => onNudge(buddy.id)}
                className="px-3 py-1.5 bg-[#FF4D2E] hover:bg-[#E03D20] text-white border-2 border-black rounded-xl font-black text-[12px] shadow-[2px_2px_0px_#1A1A1A] active:translate-y-0.5 transition-all flex items-center gap-1 cursor-pointer"
                title="Send a streak reminder nudge"
              >
                <span>🔥</span>
                <span>Nudge</span>
              </button>

              {/* Heart System Peer Appreciation Button */}
              {!isSelf && (
                <button
                  type="button"
                  onClick={handleToggleHeart}
                  className={`px-3 py-1.5 border-2 border-black rounded-xl font-black text-[12px] shadow-[2px_2px_0px_#1A1A1A] active:translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer ${
                    hasHearted ? "bg-rose-500 text-white" : "bg-white hover:bg-rose-50 text-black"
                  }`}
                  title={hasHearted ? "Remove heart" : "Give a heart"}
                >
                  <span className="material-symbols-outlined text-[15px]">favorite</span>
                  <span>{hasHearted ? "Hearted" : "Heart"}</span>
                  {heartCount > 0 && <span className="text-[11px] font-mono">({heartCount})</span>}
                </button>
              )}

              <button
                type="button"
                onClick={handleCopyProfileLink}
                className="w-8 h-8 rounded-xl border-2 border-black bg-white hover:bg-[#FAF7F2] flex items-center justify-center text-black shadow-[2px_2px_0px_#1A1A1A] cursor-pointer"
                title="Share profile link"
              >
                <span className="material-symbols-outlined text-[16px]">share</span>
              </button>
            </div>
          </div>

          {/* Bio */}
          {buddy.bio && !buddy.bio.includes("linked on Studenius") && !buddy.bio.includes("Active study partner") && (
            <p className="text-[13px] font-semibold text-black/75 leading-relaxed max-w-xl">
              {buddy.bio}
            </p>
          )}

          {/* Creator Channel Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3.5">
            <div className="bg-[#FAF7F2] border-2 border-black rounded-xl p-2 text-center shadow-[1px_1px_0px_#1A1A1A]">
              <div className="text-[10px] font-black uppercase text-black/45">Streak</div>
              <div className="text-[14px] md:text-[15px] font-black text-[#FF4D2E] flex items-center justify-center gap-0.5">
                <span>🔥</span>
                <span>{buddy.streakDays || 1}d</span>
              </div>
            </div>

            <div className="bg-[#FAF7F2] border-2 border-black rounded-xl p-2 text-center shadow-[1px_1px_0px_#1A1A1A]">
              <div className="text-[10px] font-black uppercase text-black/45">Level</div>
              <div className="text-[14px] md:text-[15px] font-black text-black flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-[15px]">bolt</span>
                <span>LVL {buddy.level || 1}</span>
              </div>
            </div>

            <div className="bg-[#FAF7F2] border-2 border-black rounded-xl p-2 text-center shadow-[1px_1px_0px_#1A1A1A]">
              <div className="text-[10px] font-black uppercase text-black/45">Notes</div>
              <div className="text-[14px] md:text-[15px] font-black text-black">
                {buddyNotes.length > 0 ? buddyNotes.length : (buddy.notesCount || 0)}
              </div>
            </div>

            <div className="bg-[#FAF7F2] border-2 border-black rounded-xl p-2 text-center shadow-[1px_1px_0px_#1A1A1A]">
              <div className="text-[10px] font-black uppercase text-black/45">Hearts</div>
              <div className="text-[14px] md:text-[15px] font-black text-rose-600 flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-[15px]">favorite</span>
                <span>{heartCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── CHANNEL TABS ────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 px-5 md:px-7 border-y-2 border-black bg-white shrink-0">
          <button
            type="button"
            onClick={() => { playTap(); setActiveTab("notes"); }}
            className={`py-2.5 px-3 font-black text-[12.5px] border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "notes"
                ? "border-black text-black"
                : "border-transparent text-black/50 hover:text-black"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">menu_book</span>
            <span>Published Notes ({buddyNotes.length})</span>
          </button>

          <button
            type="button"
            onClick={() => { playTap(); setActiveTab("duels"); }}
            className={`py-2.5 px-3 font-black text-[12.5px] border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "duels"
                ? "border-black text-black"
                : "border-transparent text-black/50 hover:text-black"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">swords</span>
            <span>Co-Op & Duels</span>
          </button>

          <button
            type="button"
            onClick={() => { playTap(); setActiveTab("activity"); }}
            className={`py-2.5 px-3 font-black text-[12.5px] border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "activity"
                ? "border-black text-black"
                : "border-transparent text-black/50 hover:text-black"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">trending_up</span>
            <span>Stats & Activity</span>
          </button>
        </div>

        {/* ── TAB CONTENT ─────────────────────────────────────────────────── */}
        <div className="p-5 md:p-7 overflow-y-auto flex-1 space-y-4 bg-[#FAF7F2]">
          
          {/* TAB 1: NOTES (YOUTUBE / TIKTOK CARD FORMAT) */}
          {activeTab === "notes" && (
            <div className="space-y-3">
              {buddyNotes.length === 0 ? (
                <div className="p-6 text-center border-2 border-dashed border-black/25 rounded-2xl bg-white">
                  <span className="material-symbols-outlined text-[32px] text-black/40 block mb-1">edit_note</span>
                  <div className="text-[13px] font-black text-black">No public notes published yet</div>
                  <p className="text-[11.5px] font-semibold text-black/55 mt-0.5">
                    When {buddy.name} shares notes to Campus Vault, they will appear here.
                  </p>
                </div>
              ) : (
                buddyNotes.map((note) => (
                  <div
                    key={note.id}
                    className="border-2 border-black rounded-2xl bg-white p-4 shadow-[3px_3px_0px_#1A1A1A] hover:shadow-[5px_5px_0px_#1A1A1A] transition-all flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className={`px-2 py-0.5 rounded border text-[9.5px] font-black uppercase tracking-wider ${note.subjectBadgeColor}`}>
                          {note.subject}
                        </span>
                        <h4 className="text-[15px] font-black text-black mt-1.5 leading-snug">
                          {note.title}
                        </h4>
                        <p className="text-[12px] font-medium text-black/65 line-clamp-2 mt-1">
                          {note.summary}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setReportingNoteId(note.id)}
                        className="text-black/30 hover:text-red-500 p-1 transition-colors"
                        title="Report inappropriate content"
                      >
                        <span className="material-symbols-outlined text-[16px]">flag</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-2.5 border-t border-black/10">
                      <span className="text-[11.5px] font-bold text-black/50 flex items-center gap-1">
                        <span>{note.readTime}</span>
                        <span>&bull;</span>
                        <span className="material-symbols-outlined text-[14px] text-rose-500">favorite</span>
                        <span>{note.likes} likes</span>
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => { playTap(); setReadingNote(note); }}
                          className="px-3 py-1.5 bg-[#FAF7F2] hover:bg-white text-black border-2 border-black rounded-xl font-black text-[11px] shadow-xs cursor-pointer active:translate-y-0.5"
                        >
                          Read Guide
                        </button>
                        <button
                          type="button"
                          onClick={() => onLaunchStudy(note, "practice")}
                          className="px-3.5 py-1.5 bg-[#FF4D2E] hover:bg-black text-white border-2 border-black rounded-xl font-black text-[11px] shadow-[2px_2px_0px_#000] cursor-pointer active:translate-y-0.5 flex items-center gap-1"
                        >
                          <span>Quiz Me</span>
                          <span>&rarr;</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: CO-OP & DUELS */}
          {activeTab === "duels" && (
            <div className="space-y-4">
              {/* 1v1 Quiz Duel Banner */}
              <div className="border-2 border-black rounded-2xl bg-white p-4 shadow-[3px_3px_0px_#1A1A1A] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#FFD13B] border-2 border-black flex items-center justify-center shadow-xs shrink-0">
                    <span className="material-symbols-outlined text-[24px]">sports_kabaddi</span>
                  </div>
                  <div>
                    <h4 className="text-[14.5px] font-black text-black">1v1 Rapid Recall Duel</h4>
                    <p className="text-[12px] font-medium text-black/60 mt-0.5">
                      Challenge {buddy.name} to a 5-question speed quiz. See who scores higher accuracy!
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleLaunchDuel()}
                  className="px-4 py-2 bg-[#FFD13B] hover:bg-[#FFE566] text-black border-2 border-black rounded-xl font-black text-[12px] shadow-[2px_2px_0px_#000] active:translate-y-0.5 cursor-pointer shrink-0"
                >
                  Start Duel &rarr;
                </button>
              </div>

              {/* Co-Study Timer Banner */}
              <div className="border-2 border-black rounded-2xl bg-white p-4 shadow-[3px_3px_0px_#1A1A1A] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#10B981]/20 border-2 border-black flex items-center justify-center shadow-xs shrink-0">
                    <span className="material-symbols-outlined text-[24px]">timer</span>
                  </div>
                  <div>
                    <h4 className="text-[14.5px] font-black text-black">25-Minute Co-Study Sprint</h4>
                    <p className="text-[12px] font-medium text-black/60 mt-0.5">
                      Sync focus timers with {buddy.name}. Keep each other accountable until the bell rings.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLaunchCoStudy}
                  className="px-4 py-2 bg-[#10B981] hover:bg-[#059669] text-white border-2 border-black rounded-xl font-black text-[12px] shadow-[2px_2px_0px_#000] active:translate-y-0.5 cursor-pointer shrink-0"
                >
                  Co-Study &rarr;
                </button>
              </div>

              {/* Accountability Stats Comparison */}
              <div className="border-2 border-black rounded-2xl bg-white p-4 shadow-[3px_3px_0px_#1A1A1A]">
                <h4 className="text-[13px] font-black uppercase tracking-wider text-black/70 mb-3">
                  Head-to-Head Comparison
                </h4>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 bg-[#FAF7F2] border-2 border-black rounded-xl">
                    <div className="text-[10px] font-black uppercase text-black/45">Category</div>
                    <div className="text-[12px] font-black text-black mt-1">Study Streak</div>
                    <div className="text-[12px] font-black text-black mt-2">Scholar Level</div>
                    <div className="text-[12px] font-black text-black mt-2">Status</div>
                  </div>
                  <div className="p-2.5 bg-[#FFFDF5] border-2 border-black rounded-xl">
                    <div className="text-[10px] font-black uppercase text-black/45">You</div>
                    <div className="text-[13px] font-black text-[#FF4D2E] mt-1">Active 🔥</div>
                    <div className="text-[13px] font-black text-black mt-2">LVL 1+</div>
                    <div className="text-[13px] font-black text-green-700 mt-2">Online</div>
                  </div>
                  <div className="p-2.5 bg-[#FFE566]/20 border-2 border-black rounded-xl">
                    <div className="text-[10px] font-black uppercase text-black/45">{buddy.name.split(" ")[0]}</div>
                    <div className="text-[13px] font-black text-[#FF4D2E] mt-1">{buddy.streakDays}d 🔥</div>
                    <div className="text-[13px] font-black text-black mt-2">LVL {buddy.level || 1}</div>
                    <div className="text-[13px] font-black text-black mt-2">
                      {buddy.hasStudiedToday ? "Done" : "Studying"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ACTIVITY */}
          {activeTab === "activity" && (
            <div className="space-y-3">
              <div className="border-2 border-black rounded-2xl bg-white p-4 shadow-[2px_2px_0px_#1A1A1A]">
                <h4 className="text-[13px] font-black uppercase tracking-wider text-black/70 mb-2.5">
                  Academic Highlights
                </h4>
                <div className="space-y-2 text-[12.5px] font-semibold text-black">
                  <div className="flex items-center justify-between py-1 border-b border-black/10">
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-[#FF4D2E]">check_circle</span>
                      Primary Subject Focus
                    </span>
                    <span className="font-black text-black">{buddy.subject}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-black/10">
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-[#10B981]">schedule</span>
                      Streak Status
                    </span>
                    <span className="font-black text-[#10B981]">
                      {buddy.hasStudiedToday ? "Completed today" : "Needs practice today"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-[#3B82F6]">handshake</span>
                      Community Standing
                    </span>
                    <span className="font-black text-blue-700">Linked Study Partner</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL: READ GUIDE INSIDE FRIEND PROFILE ────────────────────────── */}
      {readingNote && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white border-3 border-black rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-[6px_6px_0px_#000] overflow-hidden">
            <div className="p-4 border-b-2 border-black bg-[#FAF7F2] flex items-center justify-between">
              <div>
                <span className={`px-2 py-0.5 rounded border text-[9.5px] font-black uppercase tracking-wider ${readingNote.subjectBadgeColor}`}>
                  {readingNote.subject}
                </span>
                <h3 className="text-[17px] font-black text-black mt-1 leading-snug">
                  {readingNote.title}
                </h3>
              </div>
              <button
                onClick={() => setReadingNote(null)}
                className="w-7 h-7 rounded-lg border-2 border-black bg-white hover:bg-rose-50 flex items-center justify-center font-bold text-black cursor-pointer shadow-xs"
              >
                ✕
              </button>
            </div>

            <div className="p-4 md:p-6 overflow-y-auto max-h-[60vh] bg-[#FFFDF5]">
              <div className="bg-[#FAF7F2] p-4 md:p-5 rounded-xl border-2 border-black shadow-[2px_2px_0px_#1A1A1A]">
                <StudyGuideRenderer content={readingNote.content} />
              </div>
            </div>

            <div className="p-3 border-t-2 border-black bg-white flex items-center justify-between gap-2">
              {onCloneNote && (
                <button
                  onClick={() => {
                    onCloneNote(readingNote);
                  }}
                  className="px-3.5 py-1.5 bg-[#FFD13B] hover:bg-[#ffe270] text-black border-2 border-black rounded-xl font-black text-[11px] shadow-[2px_2px_0px_#000] cursor-pointer flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">content_copy</span>
                  <span>Clone to Notes</span>
                </button>
              )}
              <button
                onClick={() => {
                  onLaunchStudy(readingNote, "practice");
                  setReadingNote(null);
                  onClose();
                }}
                className="px-3.5 py-1.5 bg-[#FF4D2E] text-white border-2 border-black rounded-xl font-black text-[11.5px] shadow-[2px_2px_0px_#000] cursor-pointer ml-auto"
              >
                Launch Practice Quiz
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: REPORT INAPPROPRIATE NOTE (Safety Moderation) ────────────── */}
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
};
