import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { SharedSidebar } from "@/components/SharedSidebar";
import { useCommunity, StudyBuddy, CampusNote } from "@/hooks/useCommunity";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { playPop, playTap, playSuccess } from "@/lib/soundFX";
import { FriendProfileModal } from "@/components/FriendProfileModal";
import { useUserProfile, PRESET_BANNERS } from "@/lib/userProfileStore";
import { EditProfileModal } from "@/components/EditProfileModal";

export default function Community() {
  const navigate = useNavigate();
  const { user, profile: authProfile } = useAuth();
  const {
    notes,
    buddies,
    sendNudge,
    addFriendByCode,
    reportNote
  } = useCommunity();

  const fallbackName = authProfile?.full_name || (user as any)?.user_metadata?.full_name || user?.email?.split("@")[0] || "Student Scholar";
  const { profile: studentProfile, updateProfile } = useUserProfile(user?.id, fallbackName);

  const [friendCodeInput, setFriendCodeInput] = useState("");
  const [addingFriend, setAddingFriend] = useState(false);
  const [selectedBuddy, setSelectedBuddy] = useState<StudyBuddy | null>(null);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  // User's own friend code
  const myFriendCode = useMemo(() => {
    if (user?.id) {
      const hash = user.id.replace(/-/g, "").slice(0, 4).toUpperCase();
      return `REX-${hash}`;
    }
    return "REX-8491";
  }, [user?.id]);

  const currentBanner = PRESET_BANNERS.find((b) => b.id === studentProfile.bannerId) || PRESET_BANNERS[0];

  const handleCopyCode = () => {
    playTap();
    navigator.clipboard.writeText(myFriendCode);
    toast.success("Friend Code copied!", {
      description: "Send it to a classmate so they can link streaks with you."
    });
  };

  const handleAddFriendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendCodeInput.trim()) return;
    setAddingFriend(true);
    playPop();
    const ok = await addFriendByCode(friendCodeInput.trim());
    setAddingFriend(false);
    if (ok) {
      setFriendCodeInput("");
    }
  };

  const handleLaunchDuelWithBuddy = (buddy: StudyBuddy) => {
    playPop();
    localStorage.setItem("pz_duel_opponent", JSON.stringify({
      id: buddy.id,
      name: buddy.name,
      avatar: buddy.avatar,
      code: buddy.code,
      subject: buddy.subject || "General Studies"
    }));
    toast.success(`Challenging ${buddy.name} to a 1v1 Quiz Duel! ⚔️`, {
      description: "5 rapid recall questions to determine the high scorer."
    });
    navigate("/practice");
  };

  const handleLaunchCoStudyWithBuddy = (buddy: StudyBuddy) => {
    playPop();
    localStorage.setItem("pz_costudy_partner", JSON.stringify({
      id: buddy.id,
      name: buddy.name,
      avatar: buddy.avatar,
      code: buddy.code
    }));
    toast.success(`Starting a Co-Study session with ${buddy.name}! ⏱️`, {
      description: "Focus timer activated. Stay locked in together!"
    });
    navigate("/timer");
  };

  const handleLaunchStudy = (note: CampusNote, mode: "practice" | "flashcards") => {
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

  // Find notes for the selected buddy
  const selectedBuddyNotes = useMemo(() => {
    if (!selectedBuddy) return [];
    return notes
      .filter((n) => !n.isReported)
      .filter((n) => 
        (n.authorCode && n.authorCode === selectedBuddy.code) ||
        n.author.toLowerCase().includes(selectedBuddy.name.toLowerCase().split(" ")[0]) ||
        n.subject.toLowerCase() === selectedBuddy.subject.toLowerCase()
      );
  }, [selectedBuddy, notes]);

  return (
    <div className="w-full bg-[#FAF7F2] min-h-screen text-black flex flex-col font-body-md flex-1">
      <SharedSidebar active="/community" />

      {/* ── DESKTOP & TABLET WRAPPER ────────────────────────────────────────── */}
      <div className="md:ml-64 flex flex-col min-h-screen overflow-y-auto">
        <div className="p-4 md:p-10 max-w-5xl w-full mx-auto space-y-6 pb-28 md:pb-12">

          {/* Banner linking to Campus Vault */}
          <div className="bg-[#FFFDF5] border-2 border-black rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[3px_3px_0px_#1A1A1A]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#3B82F6]/15 border border-black/15 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px] text-[#3B82F6]">menu_book</span>
              </div>
              <div>
                <span className="text-[13.5px] font-black text-black">Looking for study guides & formulas?</span>
                <p className="text-[11.5px] font-bold text-black/60">
                  Search campus cheat sheets, flashcards, and verified guides in the Campus Vault.
                </p>
              </div>
            </div>
            <button
              onClick={() => { playTap(); navigate("/campus-vault"); }}
              className="px-4 py-2 bg-[#FF4D2E] hover:bg-black text-white font-black text-[12px] rounded-xl transition-colors cursor-pointer shrink-0 shadow-[2px_2px_0px_#1A1A1A] active:translate-y-0.5"
            >
              Open Campus Vault &rarr;
            </button>
          </div>

          {/* Page Header */}
          <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b-2 border-black/10">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-black/20 bg-white text-[10.5px] font-black uppercase tracking-wider text-black/60 mb-2">
                <span className="material-symbols-outlined text-[14px] text-[#FF4D2E]">diversity_3</span>
                Study Circle & Buddies
              </div>
              <h1 className="text-[26px] md:text-[32px] font-black leading-tight text-black">
                Study Circle & Co-Op
              </h1>
              <p className="text-[13px] font-bold text-black/60 mt-0.5">
                Mutual streak accountability, 1v1 quiz duels, co-study timers, and creator profiles.
              </p>
            </div>

            {/* Friend Code Pill */}
            <div className="bg-white border-2 border-black rounded-2xl p-3 flex items-center gap-3 shadow-[3px_3px_0px_#1A1A1A] shrink-0">
              <div>
                <div className="text-[9.5px] font-black uppercase tracking-wider text-black/45">Your Friend Code</div>
                <div className="text-[16px] font-black text-[#FF4D2E] tracking-wider">{myFriendCode}</div>
              </div>
              <button
                onClick={handleCopyCode}
                className="px-3.5 py-1.5 bg-black hover:bg-[#FF4D2E] text-white text-[11px] font-black rounded-xl transition-colors cursor-pointer shadow-xs active:scale-95"
              >
                Copy
              </button>
            </div>
          </header>

          {/* ── YOUR PROFILE MINI HERO CARD ─────────────────────────────────── */}
          <section className="border-2 border-black rounded-3xl bg-white shadow-[4px_4px_0px_#1A1A1A] overflow-hidden">
            <div className={`h-16 md:h-20 w-full ${currentBanner.className} border-b-2 border-black relative p-3 flex justify-between items-start`}>
              <span className="text-[10px] font-black uppercase tracking-wider bg-black/70 text-white px-2.5 py-0.5 rounded-lg border border-white/20">
                Your Student Profile
              </span>
              <button
                type="button"
                onClick={() => { playTap(); setIsEditProfileOpen(true); }}
                className="px-3 py-1 bg-white hover:bg-[#FAF7F2] text-black border-2 border-black rounded-xl font-black text-[11px] shadow-[2px_2px_0px_#000] active:translate-y-0.5 transition-all flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">edit</span>
                <span>Edit Bio & Avatar</span>
              </button>
            </div>

            <div className="p-4 md:p-5 pt-0 -mt-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-16 h-16 rounded-2xl bg-white border-2 border-black flex items-center justify-center text-[28px] shadow-[3px_3px_0px_#1A1A1A] overflow-hidden bg-[#FAF7F2] shrink-0">
                  {studentProfile.isAvatarImage ? (
                    <img src={studentProfile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span>{studentProfile.avatar || "🎓"}</span>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-black text-[16px] text-black truncate leading-tight">
                      {studentProfile.displayName}
                    </h3>
                    <span className="material-symbols-outlined text-[16px] text-[#10B981]">verified</span>
                  </div>
                  <div className="text-[11.5px] font-bold text-black/55 truncate">
                    {studentProfile.username} &bull; {studentProfile.school || "Studenius Scholar"}
                  </div>
                  <p className="text-[11.5px] font-medium text-black/75 line-clamp-1 mt-0.5">
                    {studentProfile.bio}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate("/profile")}
                className="px-4 py-2 bg-[#FAF7F2] hover:bg-black hover:text-white border-2 border-black rounded-xl font-black text-[12px] shadow-[2px_2px_0px_#000] active:translate-y-0.5 cursor-pointer shrink-0 transition-colors"
              >
                View Full Profile &rarr;
              </button>
            </div>
          </section>

          {/* Add Study Partner Form */}
          <section className="bg-white border-2 border-black rounded-2xl p-4 md:p-5 shadow-[3px_3px_0px_#1A1A1A]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="text-[15px] font-black text-black">Link a Study Partner</h3>
                <p className="text-[11.5px] font-bold text-black/55 mt-0.5">
                  Enter a classmate's Friend Code to link streaks, challenge to duels, and motivate each other.
                </p>
              </div>
            </div>

            <form onSubmit={handleAddFriendSubmit} className="flex items-center gap-2 max-w-md">
              <input
                type="text"
                value={friendCodeInput}
                onChange={(e) => setFriendCodeInput(e.target.value)}
                placeholder="Enter friend code (e.g., REX-69E6)..."
                className="flex-1 px-3.5 py-2 border-2 border-black rounded-xl text-[13px] font-bold uppercase placeholder:capitalize placeholder:text-black/40 bg-[#FAF7F2] focus:bg-white focus:outline-none shadow-xs"
              />
              <button
                type="submit"
                disabled={addingFriend || !friendCodeInput.trim()}
                className="px-4 py-2 bg-[#FFD13B] hover:bg-[#FF4D2E] hover:text-white text-black border-2 border-black rounded-xl font-black text-[12px] shadow-[2px_2px_0px_#1A1A1A] active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-50 shrink-0"
              >
                {addingFriend ? "Linking..." : "+ Add Partner"}
              </button>
            </form>
          </section>

          {/* Friends / Study Circle Grid */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-black uppercase tracking-wider text-black/60">
                Connected Partners ({buddies.length})
              </h3>
              <span className="text-[11px] font-extrabold text-black/45">
                Tap profile to view notes & duels
              </span>
            </div>

            {buddies.length === 0 ? (
              <div className="p-10 text-center border-2 border-dashed border-black/25 rounded-2xl bg-white space-y-3">
                <span className="text-[36px] block">🤝</span>
                <h4 className="text-[16px] font-black text-black">No study partners linked yet</h4>
                <p className="text-[12.5px] font-semibold text-black/55 max-w-sm mx-auto leading-relaxed">
                  Share your code (<strong className="text-black">{myFriendCode}</strong>) with a classmate or enter their code above to study together, start duels, and link friend streaks!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {buddies.map((buddy) => {
                  const isBuddyAvatarImg =
                    buddy.avatar?.startsWith("/") ||
                    buddy.avatar?.startsWith("http") ||
                    buddy.avatar?.startsWith("data:");

                  return (
                    <div
                      key={buddy.id}
                      onClick={() => { playPop(); setSelectedBuddy(buddy); }}
                      className="border-2 border-black rounded-2xl p-4 bg-white hover:bg-[#FFFDF5] shadow-[3px_3px_0px_#1A1A1A] hover:shadow-[5px_5px_0px_#1A1A1A] hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-12 h-12 rounded-xl bg-[#FAF7F2] border-2 border-black flex items-center justify-center text-[24px] shadow-xs shrink-0 overflow-hidden">
                              {isBuddyAvatarImg ? (
                                <img src={buddy.avatar} alt={buddy.name} className="w-full h-full object-cover" />
                              ) : (
                                buddy.avatar || "🎓"
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <h4 className="text-[15px] font-black text-black truncate leading-tight">
                                  {buddy.name}
                                </h4>
                                <span className="material-symbols-outlined text-[15px] text-[#10B981]" title="Verified Student">
                                  check_circle
                                </span>
                              </div>
                              <div className="text-[11px] font-bold text-black/50 truncate">
                                {buddy.username || `@student_${buddy.code.slice(0, 4).toLowerCase()}`} &bull; {buddy.code}
                              </div>
                            </div>
                          </div>

                          {/* Quick Interactive Actions */}
                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handleLaunchDuelWithBuddy(buddy)}
                              className="px-2.5 py-1 bg-[#FFD13B] hover:bg-[#FFE566] text-black border border-black rounded-lg text-[10.5px] font-black cursor-pointer shadow-xs active:translate-y-0.5 flex items-center gap-0.5"
                              title="1v1 Quiz Duel"
                            >
                              <span>⚔️</span>
                              <span>Duel</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => sendNudge(buddy.id)}
                              className="px-2.5 py-1 bg-[#FF4D2E] hover:bg-black text-white border border-black rounded-lg text-[10.5px] font-black cursor-pointer shadow-xs active:translate-y-0.5 flex items-center gap-0.5"
                              title="Send Streak Nudge"
                            >
                              <span>🔥</span>
                              <span>Nudge</span>
                            </button>
                          </div>
                        </div>

                        <p className="text-[11.5px] font-medium text-black/65 line-clamp-1 mt-1">
                          {buddy.bio || "Active recall study partner on Studenius."}
                        </p>
                      </div>

                      {/* Card Footer with Co-Study CTA & Streak */}
                      <div className="pt-2.5 mt-2 border-t border-black/10 flex items-center justify-between text-[11px] font-black">
                        <div className="flex items-center gap-2">
                          <span className="text-[#FF4D2E] flex items-center gap-0.5">
                            <span>🔥</span>
                            <span>{buddy.streakDays}d Streak</span>
                          </span>
                          <span className="text-black/35">&bull;</span>
                          <span className="text-black/70">
                            ⚡ LVL {buddy.level || 1}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleLaunchCoStudyWithBuddy(buddy)}
                            className="text-[10px] font-black px-2 py-0.5 bg-[#10B981]/15 text-green-900 border border-green-700 rounded hover:bg-green-100 transition-colors cursor-pointer flex items-center gap-0.5"
                            title="25-minute focus session together"
                          >
                            <span>⏱️ Co-Study</span>
                          </button>

                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            buddy.hasStudiedToday
                              ? "bg-green-100 text-green-800 border border-green-600"
                              : "bg-amber-100 text-amber-800 border border-amber-500"
                          }`}>
                            {buddy.hasStudiedToday ? "Done ✅" : "Needs Study"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

        </div>
      </div>

      {/* ── MODAL: CREATOR PROFILE (YOUTUBE / TIKTOK STYLE) ────────────────── */}
      <FriendProfileModal
        buddy={selectedBuddy}
        buddyNotes={selectedBuddyNotes}
        onClose={() => setSelectedBuddy(null)}
        onNudge={sendNudge}
        onLaunchStudy={handleLaunchStudy}
        onReportNote={reportNote}
      />

      {/* ── MODAL: EDIT USER'S OWN PROFILE / AVATAR / BANNER ───────────────── */}
      <EditProfileModal
        isOpen={isEditProfileOpen}
        currentProfile={studentProfile}
        onClose={() => setIsEditProfileOpen(false)}
        onSave={updateProfile}
      />
    </div>
  );
}
