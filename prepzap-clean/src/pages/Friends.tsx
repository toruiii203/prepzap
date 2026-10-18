import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SharedSidebar } from "@/components/SharedSidebar";
import { useCommunity, StudyBuddy } from "@/hooks/useCommunity";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { playPop, playTap, playSuccess } from "@/lib/soundFX";
import { FriendProfileModal } from "@/components/FriendProfileModal";
import { useUserProfile } from "@/lib/userProfileStore";
import { EditProfileModal } from "@/components/EditProfileModal";
import { useCoStudyPresence } from "@/hooks/useCoStudyPresence";

export default function Friends() {
  const navigate = useNavigate();
  const { user, profile: authProfile } = useAuth();
  const {
    buddies,
    sendNudge,
    addFriendByCode,
    removeFriend
  } = useCommunity();

  const { activePeers } = useCoStudyPresence();

  // Active other peers (excluding self)
  const otherPeers = useMemo(() => activePeers.filter((p) => !p.isSelf), [activePeers]);

  const fallbackName = authProfile?.full_name || (user as any)?.user_metadata?.full_name || user?.email?.split("@")[0] || "Scholar";
  const { profile: studentProfile, updateProfile } = useUserProfile(user?.id, fallbackName);

  const [selectedBuddy, setSelectedBuddy] = useState<StudyBuddy | null>(null);
  const [friendCodeInput, setFriendCodeInput] = useState("");
  const [addingFriend, setAddingFriend] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [activeMenuBuddyId, setActiveMenuBuddyId] = useState<string | null>(null);

  // Compute user's real focus minutes logged this week from localStorage sessions
  const [weeklyFocusMinutes, setWeeklyFocusMinutes] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("pz_study_sessions");
      if (raw) {
        const sessions = JSON.parse(raw);
        if (Array.isArray(sessions)) {
          const now = new Date();
          const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
          const thisWeekMins = sessions
            .filter((s: any) => new Date(s.created_at) >= sevenDaysAgo)
            .reduce((acc: number, curr: any) => acc + (Number(curr.duration_minutes || curr.duration) || 0), 0);
          setWeeklyFocusMinutes(Math.round(thisWeekMins));
        }
      }
    } catch {}
  }, []);

  const myFriendCode = useMemo(() => {
    if (user?.id) {
      const hash = user.id.replace(/-/g, "").slice(0, 4).toUpperCase();
      return `REX-${hash}`;
    }
    return "REX-GUEST";
  }, [user?.id]);

  const handleCopyCode = () => {
    playTap();
    navigator.clipboard.writeText(myFriendCode);
    toast.success("Friend Code copied!", {
      description: "Send this to your classmate so they can link with you."
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
      description: "5 rapid recall questions to compare scores."
    });
    navigate("/practice");
  };

  const handleRemoveFriend = (buddy: StudyBuddy) => {
    setActiveMenuBuddyId(null);
    if (window.confirm(`Are you sure you want to remove ${buddy.name} from your friends?`)) {
      removeFriend(buddy.id);
    }
  };

  const goalTargetMinutes = 300;
  const goalPercent = Math.min(100, Math.round((weeklyFocusMinutes / goalTargetMinutes) * 100));

  return (
    <div className="w-full bg-[#FAF7F2] min-h-screen text-black flex flex-col font-body-md flex-1">
      <SharedSidebar active="/friends" />

      {/* Main Content Area */}
      <div className="md:ml-64 flex flex-col min-h-screen overflow-y-auto">
        <div className="p-4 md:p-8 max-w-4xl w-full mx-auto space-y-6 pb-28 md:pb-12">

          {/* Top Header */}
          <header className="pb-1 border-b-2 border-black/10">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-black/20 bg-white text-[10.5px] font-black uppercase tracking-wider text-black/60 mb-1.5">
              <span className="material-symbols-outlined text-[14px] text-[#FF4D2E]">groups</span>
              Friends
            </div>
            <h1 className="text-[26px] md:text-[32px] font-black leading-tight text-black">
              Friends
            </h1>
            <p className="text-[13px] font-bold text-black/60 mt-0.5">
              Study together, challenge friends to 1v1 duels, and stay accountable.
            </p>
          </header>

          {/* ── 1. UNIFIED CONNECTION BAR (Your Code + Add Friend in 1 row) ── */}
          <div className="bg-white border-2 border-black rounded-2xl p-3.5 md:p-4 shadow-[3px_3px_0px_#1A1A1A] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Left: Your Code */}
            <div className="flex items-center justify-between md:justify-start gap-3 bg-[#FAF7F2] border border-black/15 px-3 py-2 rounded-xl shrink-0">
              <div>
                <div className="text-[9px] font-black uppercase tracking-wider text-black/45">Your Friend Code</div>
                <div className="text-[14px] font-black text-[#FF4D2E] tracking-wider font-mono">{myFriendCode}</div>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-3 py-1 bg-black hover:bg-[#FF4D2E] text-white text-[11px] font-black rounded-lg transition-colors cursor-pointer shadow-xs active:scale-95 shrink-0"
              >
                Copy
              </button>
            </div>

            {/* Right: Add Friend Input */}
            <form onSubmit={handleAddFriendSubmit} className="flex-1 flex items-center gap-2 max-w-lg">
              <input
                type="text"
                value={friendCodeInput}
                onChange={(e) => setFriendCodeInput(e.target.value)}
                placeholder="Enter friend code (e.g. REX-4B21)..."
                className="flex-1 px-3 py-2 border-2 border-black rounded-xl text-[12.5px] font-bold uppercase placeholder:capitalize placeholder:text-black/40 bg-[#FAF7F2] focus:bg-white focus:outline-none shadow-xs"
              />
              <button
                type="submit"
                disabled={addingFriend || !friendCodeInput.trim()}
                className="px-4 py-2 bg-[#FFD13B] hover:bg-[#FF4D2E] hover:text-white text-black border-2 border-black rounded-xl font-black text-[12px] shadow-[2px_2px_0px_#1A1A1A] active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-50 shrink-0"
              >
                {addingFriend ? "Linking..." : "+ Add Friend"}
              </button>
            </form>
          </div>

          {/* ── 2. FULL-WIDTH FRIENDS LIST ─────────────────────────────────── */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-[15px] font-black uppercase tracking-wider text-black">
                  Your Friends ({buddies.length})
                </h2>
                {otherPeers.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10.5px] font-black">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    {otherPeers.length} active now
                  </span>
                )}
              </div>
              <span className="text-[11px] font-bold text-black/45">
                Click friend to view profile
              </span>
            </div>

            {buddies.length === 0 ? (
              <div className="border-2 border-dashed border-black/25 rounded-2xl bg-white p-8 md:p-10 text-center space-y-2.5">
                <span className="text-[36px] block">🤝</span>
                <h3 className="text-[16px] font-black text-black">No friends added yet</h3>
                <p className="text-[12.5px] font-medium text-black/60 max-w-md mx-auto leading-relaxed">
                  Share your code above (<strong className="text-black font-black">{myFriendCode}</strong>) with classmates or enter theirs to compare study goals and start 1v1 duels.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {buddies.map((buddy) => {
                  const isLivePeer = otherPeers.some((p) => p.code === buddy.code);
                  const isAvatarImg =
                    buddy.avatar?.startsWith("/") ||
                    buddy.avatar?.startsWith("http") ||
                    buddy.avatar?.startsWith("data:");
                  const isMenuOpen = activeMenuBuddyId === buddy.id;

                  return (
                    <div
                      key={buddy.id}
                      onClick={() => {
                        playPop();
                        setSelectedBuddy(buddy);
                      }}
                      className="border-2 border-black rounded-2xl p-3.5 md:p-4 bg-white hover:bg-[#FFFDF5] shadow-[2px_2px_0px_#1A1A1A] hover:shadow-[4px_4px_0px_#1A1A1A] transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative"
                    >
                      {/* Left: Avatar & Info */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="relative shrink-0">
                          <div className="w-12 h-12 rounded-xl bg-[#FAF7F2] border-2 border-black flex items-center justify-center text-[22px] shadow-xs overflow-hidden">
                            {isAvatarImg ? (
                              <img src={buddy.avatar} alt={buddy.name} className="w-full h-full object-cover" />
                            ) : (
                              buddy.avatar || "🎓"
                            )}
                          </div>
                          {isLivePeer && (
                            <span
                              className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white"
                              title="Active right now"
                            />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-[14.5px] font-black text-black truncate leading-tight">
                              {buddy.name}
                            </h4>
                            <span className="text-[11px] font-bold text-black/45 font-mono">
                              {buddy.code}
                            </span>
                          </div>

                          <div className="text-[11.5px] font-bold text-black/60 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span className="inline-flex items-center gap-1 text-[#FF4D2E] font-black">
                              <span>🔥</span>
                              <span>{buddy.streakDays}d streak</span>
                            </span>
                            <span>&bull;</span>
                            <span className={buddy.hasStudiedToday ? "text-emerald-700 font-black" : "text-black/60"}>
                              {isLivePeer ? "Studying in Lounge 🟢" : buddy.hasStudiedToday ? "Studied today ✅" : "Needs study today ⏳"}
                            </span>
                            {buddy.school && (
                              <>
                                <span>&bull;</span>
                                <span className="truncate text-black/50">{buddy.school}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Action Buttons & Menu */}
                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleLaunchDuelWithBuddy(buddy)}
                          className="px-3 py-1.5 bg-[#FFD13B] hover:bg-[#FFE566] text-black border-2 border-black rounded-xl text-[11px] font-black cursor-pointer shadow-xs active:translate-y-0.5 flex items-center gap-1 transition-all"
                          title="Start a 1v1 Quiz Duel"
                        >
                          <span>⚔️</span>
                          <span>Duel</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => sendNudge(buddy.id)}
                          className="px-3 py-1.5 bg-white hover:bg-rose-50 text-black border-2 border-black rounded-xl text-[11px] font-black cursor-pointer shadow-xs active:translate-y-0.5 flex items-center gap-1 transition-all"
                          title="Send a streak reminder nudge"
                        >
                          <span>👋</span>
                          <span>Nudge</span>
                        </button>

                        {/* Menu Trigger */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setActiveMenuBuddyId(isMenuOpen ? null : buddy.id)}
                            className="w-8 h-8 rounded-xl border-2 border-black bg-[#FAF7F2] hover:bg-white flex items-center justify-center text-black font-black text-[14px] cursor-pointer shadow-xs"
                            title="More options"
                          >
                            ⋯
                          </button>

                          {/* Popover Menu */}
                          {isMenuOpen && (
                            <>
                              <div
                                className="fixed inset-0 z-40"
                                onClick={() => setActiveMenuBuddyId(null)}
                              />
                              <div className="absolute right-0 top-9 z-50 bg-white border-2 border-black rounded-xl shadow-[4px_4px_0px_#000] py-1 min-w-[140px] flex flex-col">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuBuddyId(null);
                                    setSelectedBuddy(buddy);
                                  }}
                                  className="px-3 py-1.5 text-left text-[12px] font-bold hover:bg-[#FAF7F2] text-black flex items-center gap-2 cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-[15px]">person</span>
                                  <span>View Profile</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuBuddyId(null);
                                    handleLaunchDuelWithBuddy(buddy);
                                  }}
                                  className="px-3 py-1.5 text-left text-[12px] font-bold hover:bg-[#FAF7F2] text-black flex items-center gap-2 cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-[15px]">swords</span>
                                  <span>Start Duel</span>
                                </button>
                                <div className="border-t border-black/10 my-0.5" />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFriend(buddy)}
                                  className="px-3 py-1.5 text-left text-[12px] font-bold hover:bg-rose-50 text-rose-600 flex items-center gap-2 cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-[15px]">person_remove</span>
                                  <span>Remove Friend</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── 3. SOCIAL WEEKLY FOCUS ACCOUNTABILITY ───────────────────────── */}
          <section className="bg-white border-2 border-black rounded-2xl p-4 md:p-5 shadow-[3px_3px_0px_#1A1A1A] space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-black/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#FFD13B] border-2 border-black flex items-center justify-center text-[18px] shadow-xs shrink-0">
                  🎯
                </div>
                <div>
                  <h3 className="text-[15px] font-black text-black">Weekly Focus Accountability</h3>
                  <p className="text-[11.5px] font-bold text-black/55">
                    Compare study time logged this week with your friends (300 min goal).
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate("/timer")}
                className="px-3.5 py-1.5 bg-[#FF4D2E] hover:bg-black text-white border-2 border-black rounded-xl font-black text-[11px] shadow-xs active:translate-y-0.5 cursor-pointer shrink-0 transition-colors"
              >
                + Log Focus Session &rarr;
              </button>
            </div>

            {/* Social Progress Comparison List */}
            <div className="space-y-2.5">
              {/* Current User Row */}
              <div className="p-3 bg-[#FFFDF5] border-2 border-black rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center font-black text-[12px] border border-black">
                    You
                  </div>
                  <div>
                    <div className="text-[13px] font-black text-black">
                      {studentProfile.displayName} (You)
                    </div>
                    <div className="text-[11px] font-bold text-black/60">
                      Logged <strong className="text-[#FF4D2E]">{weeklyFocusMinutes}</strong> of {goalTargetMinutes} min ({goalPercent}%)
                    </div>
                  </div>
                </div>

                <div className="w-full sm:w-44 bg-white border border-black rounded-full h-3 overflow-hidden p-0.5">
                  <div
                    className="bg-[#10B981] h-full rounded-full transition-all duration-500"
                    style={{ width: `${goalPercent}%` }}
                  />
                </div>
              </div>

              {/* Linked Friends Accountability Rows */}
              {buddies.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {buddies.map((buddy) => (
                    <div
                      key={buddy.id}
                      className="p-2.5 bg-[#FAF7F2] border border-black/20 rounded-xl flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[16px]">{buddy.avatar || "🎓"}</span>
                        <div className="min-w-0">
                          <div className="text-[12px] font-black text-black truncate">{buddy.name}</div>
                          <div className="text-[10.5px] font-bold text-black/50">
                            {buddy.hasStudiedToday ? "Completed today's goal ✅" : "Streak on the line ⏳"}
                          </div>
                        </div>
                      </div>
                      <span className="text-[11px] font-black text-[#FF4D2E] shrink-0">
                        {buddy.streakDays}d 🔥
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* ── 4. COMPACT STUDENT PROFILE BAR (Replaces heavy gradient banner) ─ */}
          <footer className="border-2 border-black rounded-2xl bg-white p-3.5 md:p-4 shadow-[2px_2px_0px_#1A1A1A] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-[#FAF7F2] border-2 border-black flex items-center justify-center text-[22px] overflow-hidden shrink-0">
                {studentProfile.isAvatarImage ? (
                  <img src={studentProfile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{studentProfile.avatar || "🎓"}</span>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-[14px] text-black truncate leading-tight">
                    {studentProfile.displayName}
                  </h4>
                  <span className="text-[11px] font-bold text-black/50 font-mono">
                    {studentProfile.username}
                  </span>
                </div>
                {studentProfile.bio ? (
                  <p className="text-[11.5px] font-medium text-black/70 line-clamp-1 mt-0.5">
                    {studentProfile.bio}
                  </p>
                ) : (
                  <p className="text-[11px] font-medium text-black/40 italic mt-0.5">
                    Your profile is visible to linked friends.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  playTap();
                  setIsEditProfileOpen(true);
                }}
                className="px-3 py-1.5 bg-[#FAF7F2] hover:bg-stone-200 text-black border-2 border-black rounded-xl font-black text-[11px] cursor-pointer shadow-xs active:translate-y-0.5"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => navigate("/profile")}
                className="px-3 py-1.5 bg-black hover:bg-[#FF4D2E] text-white border-2 border-black rounded-xl font-black text-[11px] cursor-pointer shadow-xs active:translate-y-0.5 transition-colors"
              >
                Full Profile &rarr;
              </button>
            </div>
          </footer>

        </div>
      </div>

      {/* Selected Partner Profile Modal */}
      {selectedBuddy && (
        <FriendProfileModal
          isOpen={!!selectedBuddy}
          onClose={() => setSelectedBuddy(null)}
          buddy={selectedBuddy}
          userNotes={[]}
          onStartDuel={() => {
            const b = selectedBuddy;
            setSelectedBuddy(null);
            handleLaunchDuelWithBuddy(b);
          }}
          onStartCoStudy={() => {
            const b = selectedBuddy;
            setSelectedBuddy(null);
            localStorage.setItem("pz_costudy_partner", JSON.stringify({
              id: b.id,
              name: b.name,
              avatar: b.avatar,
              code: b.code,
              subject: b.subject || "Focus Session"
            }));
            navigate("/timer");
          }}
          onSendNudge={() => sendNudge(selectedBuddy.id)}
        />
      )}

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        currentProfile={studentProfile}
        initialProfile={studentProfile}
        onSave={(updated) => {
          updateProfile(updated);
          setIsEditProfileOpen(false);
          toast.success("Profile saved!");
        }}
      />
    </div>
  );
}
