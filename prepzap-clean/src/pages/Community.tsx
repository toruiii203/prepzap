import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { SharedSidebar } from "@/components/SharedSidebar";
import { useCommunity, StudyBuddy, CampusNote } from "@/hooks/useCommunity";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { playPop, playTap, playSuccess } from "@/lib/soundFX";
import { FriendProfileModal } from "@/components/FriendProfileModal";

export default function Community() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    notes,
    buddies,
    sendNudge,
    addFriendByCode,
    reportNote
  } = useCommunity();

  const [friendCodeInput, setFriendCodeInput] = useState("");
  const [addingFriend, setAddingFriend] = useState(false);
  const [selectedBuddy, setSelectedBuddy] = useState<StudyBuddy | null>(null);

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

  // Find notes for the selected buddy (match author or authorCode)
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
        <div className="p-4 md:p-12 max-w-5xl w-full mx-auto space-y-7 pb-28 md:pb-12">

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
              <h1 className="text-[28px] md:text-[34px] font-black leading-tight text-black">
                Study Circle
              </h1>
              <p className="text-[13.5px] font-bold text-black/60 mt-0.5">
                Mutual accountability streaks with classmates. View friends' creator profiles and shared notes.
              </p>
            </div>

            {/* Friend Code Pill */}
            <div className="bg-white border-2 border-black rounded-2xl p-3.5 flex items-center gap-3 shadow-[3px_3px_0px_#1A1A1A] shrink-0">
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

          {/* Add Study Partner Form */}
          <section className="bg-white border-2 border-black rounded-2xl p-4 md:p-5 shadow-[3px_3px_0px_#1A1A1A]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="text-[15px] font-black text-black">Link a Study Partner</h3>
                <p className="text-[11.5px] font-bold text-black/55 mt-0.5">
                  Enter a classmate's Friend Code to link streaks and motivate each other.
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
                Tap profile to view notes & stats
              </span>
            </div>

            {buddies.length === 0 ? (
              <div className="p-10 text-center border-2 border-dashed border-black/25 rounded-2xl bg-white space-y-3">
                <span className="text-[36px] block">🤝</span>
                <h4 className="text-[16px] font-black text-black">No study partners linked yet</h4>
                <p className="text-[12.5px] font-semibold text-black/55 max-w-sm mx-auto leading-relaxed">
                  Share your code (<strong className="text-black">{myFriendCode}</strong>) with a classmate or enter their code above to study together and start a friend streak!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {buddies.map((buddy) => (
                  <div
                    key={buddy.id}
                    onClick={() => { playPop(); setSelectedBuddy(buddy); }}
                    className="border-2 border-black rounded-2xl p-4 bg-white hover:bg-[#FFFDF5] shadow-[3px_3px_0px_#1A1A1A] hover:shadow-[5px_5px_0px_#1A1A1A] hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-xl bg-[#FAF7F2] border-2 border-black flex items-center justify-center text-[24px] shadow-xs shrink-0">
                            {buddy.avatar || "🎓"}
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

                        {/* Nudge button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            sendNudge(buddy.id);
                          }}
                          className="px-3 py-1 bg-[#FF4D2E] hover:bg-black text-white border-2 border-black rounded-xl text-[11px] font-black cursor-pointer shadow-[1px_1px_0px_#000] active:translate-y-0.5 shrink-0"
                        >
                          Nudge 🔥
                        </button>
                      </div>

                      <p className="text-[11.5px] font-medium text-black/65 line-clamp-1 mt-1">
                        {buddy.bio || "Active recall study partner on Studenius."}
                      </p>
                    </div>

                    <div className="pt-3 mt-3 border-t border-black/10 flex items-center justify-between text-[11px] font-black">
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

                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        buddy.hasStudiedToday
                          ? "bg-green-100 text-green-800 border border-green-600"
                          : "bg-amber-100 text-amber-800 border border-amber-500"
                      }`}>
                        {buddy.hasStudiedToday ? "Studied Today ✅" : "Needs Study ⏳"}
                      </span>
                    </div>
                  </div>
                ))}
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
    </div>
  );
}
