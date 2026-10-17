import React, { useState } from "react";
import { StudyBuddy, CampusNote } from "@/hooks/useCommunity";
import { playPop, playTap, playSuccess } from "@/lib/soundFX";
import { toast } from "sonner";
import { StudyGuideRenderer } from "@/components/StudyGuideRenderer";

interface FriendProfileModalProps {
  buddy: StudyBuddy | null;
  buddyNotes: CampusNote[];
  onClose: () => void;
  onNudge: (buddyId: string) => void;
  onLaunchStudy: (note: CampusNote, mode: "practice" | "flashcards") => void;
  onReportNote: (noteId: string, reason: string) => void;
}

export const FriendProfileModal: React.FC<FriendProfileModalProps> = ({
  buddy,
  buddyNotes,
  onClose,
  onNudge,
  onLaunchStudy,
  onReportNote
}) => {
  const [activeTab, setActiveTab] = useState<"notes" | "activity" | "about">("notes");
  const [readingNote, setReadingNote] = useState<CampusNote | null>(null);
  const [reportingNoteId, setReportingNoteId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("inappropriate");
  const [highFived, setHighFived] = useState(false);

  if (!buddy) return null;

  const handleHighFive = () => {
    if (highFived) return;
    playSuccess();
    setHighFived(true);
    toast.success(`You sent a High-Five to ${buddy.name}! ✋`, {
      description: "Both of you earned +5 Study Motivation!"
    });
  };

  const handleCopyProfileLink = () => {
    playTap();
    navigator.clipboard.writeText(`${window.location.origin}/community?friend=${buddy.code}`);
    toast.success("Profile link copied!");
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
      <div className="bg-[#FFFDF5] border-2 border-black rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-[8px_8px_0px_#1A1A1A] overflow-hidden">
        
        {/* ── CHANNEL COVER BANNER (YouTube / TikTok creator style) ──────── */}
        <div className="h-28 md:h-36 w-full bg-gradient-to-r from-[#FFD13B] via-[#FF4D2E] to-[#FF8A00] border-b-2 border-black relative p-3 flex justify-end items-start shrink-0">
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#000_2px,transparent_2px)] [background-size:16px_16px] pointer-events-none" />
          
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
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-white border-2 border-black flex items-center justify-center text-[38px] md:text-[46px] shadow-[4px_4px_0px_#1A1A1A] shrink-0">
                {buddy.avatar || "🎓"}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-[19px] md:text-[22px] font-black text-black leading-tight truncate">
                    {buddy.name}
                  </h2>
                  <span className="material-symbols-outlined text-[18px] text-[#10B981]" title="Verified Student Creator">
                    verified
                  </span>
                </div>
                <div className="text-[12.5px] font-bold text-black/60 truncate">
                  {buddy.username || `@student_${buddy.code.slice(0, 4).toLowerCase()}`} &bull; {buddy.code}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-1 sm:pt-0">
              <button
                type="button"
                onClick={() => onNudge(buddy.id)}
                className="px-3.5 py-1.5 bg-[#FF4D2E] hover:bg-[#E03D20] text-white border-2 border-black rounded-xl font-black text-[12px] shadow-[2px_2px_0px_#1A1A1A] active:translate-y-0.5 transition-all flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">local_fire_department</span>
                <span>Nudge</span>
              </button>

              <button
                type="button"
                onClick={handleHighFive}
                disabled={highFived}
                className={`px-3 py-1.5 border-2 border-black rounded-xl font-black text-[12px] shadow-[2px_2px_0px_#1A1A1A] transition-all flex items-center gap-1 cursor-pointer ${
                  highFived ? "bg-[#10B981] text-white" : "bg-[#FFE566] hover:bg-[#FFD13B] text-black"
                }`}
              >
                <span>✋</span>
                <span>{highFived ? "Sent!" : "High Five"}</span>
              </button>

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
          <p className="text-[13px] font-semibold text-black/75 leading-relaxed max-w-xl">
            {buddy.bio || "Student creator sharing revision guides, active recall summaries, and formulas on Studenius."}
          </p>

          {/* Creator Channel Stats Row */}
          <div className="grid grid-cols-4 gap-2 mt-3.5">
            <div className="bg-[#FAF7F2] border-2 border-black rounded-xl p-2 text-center shadow-[1px_1px_0px_#1A1A1A]">
              <div className="text-[10px] font-black uppercase text-black/45">Streak</div>
              <div className="text-[14px] md:text-[15px] font-black text-[#FF4D2E] flex items-center justify-center gap-0.5">
                <span>🔥</span>
                <span>{buddy.streakDays}d</span>
              </div>
            </div>

            <div className="bg-[#FAF7F2] border-2 border-black rounded-xl p-2 text-center shadow-[1px_1px_0px_#1A1A1A]">
              <div className="text-[10px] font-black uppercase text-black/45">Level</div>
              <div className="text-[14px] md:text-[15px] font-black text-black flex items-center justify-center gap-0.5">
                <span>⚡</span>
                <span>LVL {buddy.level || 3}</span>
              </div>
            </div>

            <div className="bg-[#FAF7F2] border-2 border-black rounded-xl p-2 text-center shadow-[1px_1px_0px_#1A1A1A]">
              <div className="text-[10px] font-black uppercase text-black/45">Notes</div>
              <div className="text-[14px] md:text-[15px] font-black text-black">
                {buddyNotes.length > 0 ? buddyNotes.length : (buddy.notesCount || 2)}
              </div>
            </div>

            <div className="bg-[#FAF7F2] border-2 border-black rounded-xl p-2 text-center shadow-[1px_1px_0px_#1A1A1A]">
              <div className="text-[10px] font-black uppercase text-black/45">Likes</div>
              <div className="text-[14px] md:text-[15px] font-black text-rose-600 flex items-center justify-center gap-0.5">
                <span>❤️</span>
                <span>{buddy.likesCount || 42}</span>
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
            <span>Published Notes ({buddyNotes.length > 0 ? buddyNotes.length : 2})</span>
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
            <span>Study Activity</span>
          </button>
        </div>

        {/* ── TAB CONTENT ─────────────────────────────────────────────────── */}
        <div className="p-5 md:p-7 overflow-y-auto flex-1 space-y-4 bg-[#FAF7F2]">
          {activeTab === "notes" && (
            <div className="space-y-3">
              {buddyNotes.length === 0 ? (
                <div className="p-6 text-center border-2 border-dashed border-black/25 rounded-2xl bg-white">
                  <div className="text-[28px] mb-1">📝</div>
                  <div className="text-[13px] font-black text-black">No public notes published yet</div>
                  <p className="text-[11.5px] font-semibold text-black/55 mt-0.5">
                    When {buddy.name} shares notes to Campus Vault, they will appear here.
                  </p>
                </div>
              ) : (
                buddyNotes.map((note) => (
                  <div
                    key={note.id}
                    className="border-2 border-black rounded-2xl bg-white p-4 shadow-[2px_2px_0px_#1A1A1A] hover:shadow-[4px_4px_0px_#1A1A1A] transition-all flex flex-col justify-between gap-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className={`px-2 py-0.5 rounded border text-[9.5px] font-black uppercase tracking-wider ${note.subjectBadgeColor}`}>
                          {note.subject}
                        </span>
                        <h4 className="text-[15px] font-black text-black mt-1 leading-snug">
                          {note.title}
                        </h4>
                        <p className="text-[11.5px] font-medium text-black/65 line-clamp-2 mt-0.5">
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

                    <div className="flex items-center justify-between pt-2 border-t border-black/10">
                      <span className="text-[11px] font-bold text-black/50">
                        {note.readTime} &bull; ❤️ {note.likes} likes
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => { playTap(); setReadingNote(note); }}
                          className="px-3 py-1 bg-[#FAF7F2] hover:bg-white text-black border border-black rounded-lg font-black text-[11px] shadow-xs cursor-pointer"
                        >
                          Read Guide
                        </button>
                        <button
                          type="button"
                          onClick={() => onLaunchStudy(note, "practice")}
                          className="px-3 py-1 bg-[#FF4D2E] hover:bg-black text-white border border-black rounded-lg font-black text-[11px] shadow-xs cursor-pointer"
                        >
                          Launch Quiz
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

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
                    <span className="font-black text-[#10B981]">{buddy.hasStudiedToday ? "Completed today ✅" : "Needs practice today ⏳"}</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-[#3B82F6]">verified_user</span>
                      Community Standing
                    </span>
                    <span className="font-black text-blue-700">Verified Study Partner</span>
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
          <div className="bg-white border-2 border-black rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-[6px_6px_0px_#000] overflow-hidden">
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

            <div className="p-3 border-t-2 border-black bg-white flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  onLaunchStudy(readingNote, "practice");
                  setReadingNote(null);
                  onClose();
                }}
                className="px-3.5 py-1.5 bg-[#FF4D2E] text-white border-2 border-black rounded-xl font-black text-[11.5px] shadow-[2px_2px_0px_#000] cursor-pointer"
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
