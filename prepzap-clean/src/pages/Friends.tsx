import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SharedSidebar } from "@/components/SharedSidebar";
import { useCommunity, StudyBuddy } from "@/hooks/useCommunity";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { playPop, playTap, playSuccess } from "@/lib/soundFX";
import { FriendProfileModal } from "@/components/FriendProfileModal";
import { useUserProfile, PRESET_BANNERS } from "@/lib/userProfileStore";
import { EditProfileModal } from "@/components/EditProfileModal";
import { useCoStudyPresence } from "@/hooks/useCoStudyPresence";

export default function Friends() {
  const navigate = useNavigate();
  const { user, profile: authProfile } = useAuth();
  const {
    buddies,
    sendNudge,
    addFriendByCode
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

  const currentBanner = PRESET_BANNERS.find((b) => b.id === (studentProfile?.bannerId || "amber_sunset")) || PRESET_BANNERS[0];

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

  const goalTargetMinutes = 300;
  const goalPercent = Math.min(100, Math.round((weeklyFocusMinutes / goalTargetMinutes) * 100));

  return (
    <div className="w-full bg-[#FAF7F2] min-h-screen text-black flex flex-col font-body-md flex-1">
      <SharedSidebar active="/friends" />

      {/* Main Content Area */}
      <div className="md:ml-64 flex flex-col min-h-screen overflow-y-auto">
        <div className="p-4 md:p-8 max-w-5xl w-full mx-auto space-y-7 pb-28 md:pb-12">

          {/* Top Header */}
          <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b-2 border-black/10">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-black/20 bg-white text-[10.5px] font-black uppercase tracking-wider text-black/60 mb-1.5">
                <span className="material-symbols-outlined text-[14px] text-[#FF4D2E]">groups</span>
                Study Partners
              </div>
              <h1 className="text-[26px] md:text-[32px] font-black leading-tight text-black">
                Friends
              </h1>
              <p className="text-[13px] font-bold text-black/60 mt-0.5">
                Stay accountable with classmates, start 1v1 recall duels, and track weekly focus goals.
              </p>
            </div>

            {/* Friend Code Pill */}
            <div className="bg-white border-2 border-black rounded-2xl p-3 flex items-center gap-3 shadow-[3px_3px_0px_#1A1A1A] shrink-0">
              <div>
                <div className="text-[9px] font-black uppercase tracking-wider text-black/45">Your Friend Code</div>
                <div className="text-[15px] font-black text-[#FF4D2E] tracking-wider">{myFriendCode}</div>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-3 py-1.5 bg-black hover:bg-[#FF4D2E] text-white text-[11px] font-black rounded-xl transition-colors cursor-pointer shadow-xs active:scale-95"
              >
                Copy
              </button>
            </div>
          </header>

          {/* ── 1. CONNECTED FRIENDS LIST (TOP PRIORITY) ────────────────────── */}
          <section className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-[16px] font-black uppercase tracking-wider text-black">
                  Your Study Partners ({buddies.length})
                </h2>
                {otherPeers.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10.5px] font-black">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    {otherPeers.length} active now
                  </span>
                )}
              </div>
              <span className="text-[11.5px] font-bold text-black/50">
                Tap card to view partner profile
              </span>
            </div>

            {buddies.length === 0 ? (
              <div className="border-2 border-dashed border-black/25 rounded-3xl bg-white p-8 md:p-12 text-center space-y-3">
                <span className="text-[40px] block">🤝</span>
                <h3 className="text-[17px] font-black text-black">No study partners linked yet</h3>
                <p className="text-[13px] font-medium text-black/60 max-w-md mx-auto leading-relaxed">
                  Share your code (<strong className="text-black font-black">{myFriendCode}</strong>) with a classmate or enter their code below to start 1v1 recall duels and motivate each other.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {buddies.map((buddy) => {
                  const isLivePeer = otherPeers.some((p) => p.code === buddy.code);
                  const isAvatarImg =
                    buddy.avatar?.startsWith("/") ||
                    buddy.avatar?.startsWith("http") ||
                    buddy.avatar?.startsWith("data:");

                  return (
                    <div
                      key={buddy.id}
                      onClick={() => {
                        playPop();
                        setSelectedBuddy(buddy);
                      }}
                      className="border-2 border-black rounded-2xl p-4 bg-white hover:bg-[#FFFDF5] shadow-[3px_3px_0px_#1A1A1A] hover:shadow-[5px_5px_0px_#1A1A1A] hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col justify-between gap-3.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Avatar with Live Dot */}
                          <div className="relative">
                            <div className="w-12 h-12 rounded-xl bg-[#FAF7F2] border-2 border-black flex items-center justify-center text-[22px] shadow-xs shrink-0 overflow-hidden">
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
                            <h4 className="text-[15px] font-black text-black truncate leading-tight">
                              {buddy.name}
                            </h4>
                            <div className="text-[11px] font-bold text-black/50 truncate mt-0.5">
                              {buddy.username || `@student_${buddy.code.slice(0, 4).toLowerCase()}`} &bull; {buddy.code}
                            </div>
                            <div className="text-[10.5px] font-extrabold text-black/60 mt-0.5 flex items-center gap-1.5">
                              {isLivePeer ? (
                                <span className="text-emerald-700 font-black">Active now</span>
                              ) : (
                                <span>{buddy.streakDays}d streak</span>
                              )}
                              {buddy.school && (
                                <>
                                  <span>&bull;</span>
                                  <span className="truncate">{buddy.school}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Interactive Duel & Nudge Buttons */}
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleLaunchDuelWithBuddy(buddy)}
                            className="px-2.5 py-1.5 bg-[#FFD13B] hover:bg-[#FFE566] text-black border-2 border-black rounded-xl text-[11px] font-black cursor-pointer shadow-xs active:translate-y-0.5 flex items-center gap-1 transition-all"
                            title="Start a 1v1 Quiz Duel"
                          >
                            <span>⚔️</span>
                            <span>Duel</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => sendNudge(buddy.id)}
                            className="px-2.5 py-1.5 bg-white hover:bg-rose-50 text-black border-2 border-black rounded-xl text-[11px] font-black cursor-pointer shadow-xs active:translate-y-0.5 flex items-center gap-1 transition-all"
                            title="Send a streak reminder nudge"
                          >
                            <span>👋</span>
                            <span>Nudge</span>
                          </button>
                        </div>
                      </div>

                      {buddy.bio && !buddy.bio.includes("linked on Studenius") && !buddy.bio.includes("Active study partner") && (
                        <p className="text-[11.5px] font-medium text-black/70 line-clamp-2 bg-[#FAF7F2] p-2 rounded-xl border border-black/10">
                          {buddy.bio}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── 2. ADD FRIEND BY CODE ────────────────────────────────────────── */}
          <section className="bg-white border-2 border-black rounded-2xl p-5 shadow-[3px_3px_0px_#1A1A1A]">
            <div className="mb-3">
              <h3 className="text-[15px] font-black text-black">Link a Study Partner</h3>
              <p className="text-[12px] font-medium text-black/60 mt-0.5">
                Enter a classmate&apos;s Friend Code to link with them and start 1v1 duels.
              </p>
            </div>

            <form onSubmit={handleAddFriendSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-md">
              <input
                type="text"
                value={friendCodeInput}
                onChange={(e) => setFriendCodeInput(e.target.value)}
                placeholder="Enter friend code (e.g., REX-69E6)..."
                className="flex-1 px-3.5 py-2.5 border-2 border-black rounded-xl text-[13px] font-bold uppercase placeholder:capitalize placeholder:text-black/40 bg-[#FAF7F2] focus:bg-white focus:outline-none shadow-xs"
              />
              <button
                type="submit"
                disabled={addingFriend || !friendCodeInput.trim()}
                className="px-5 py-2.5 bg-[#FFD13B] hover:bg-[#FF4D2E] hover:text-white text-black border-2 border-black rounded-xl font-black text-[12px] shadow-[2px_2px_0px_#1A1A1A] active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-50 shrink-0"
              >
                {addingFriend ? "Searching..." : "+ Add Partner"}
              </button>
            </form>
          </section>

          {/* ── 3. WEEKLY FOCUS GOAL (HONEST LOGGED MINUTES) ─────────────────── */}
          <section className="bg-white border-2 border-black rounded-2xl p-5 shadow-[3px_3px_0px_#1A1A1A]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FFD13B] border-2 border-black flex items-center justify-center text-[20px] shadow-[2px_2px_0px_#000] shrink-0">
                  🎯
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#FF4D2E]">Focus Goal</span>
                  <h3 className="text-[16px] font-black text-black">Weekly Focus Goal: 300 Focus Minutes</h3>
                </div>
              </div>
              <div className="text-[12px] font-black text-black/70 bg-[#FAF7F2] border border-black/20 px-3 py-1 rounded-xl shrink-0">
                Progress: <span className="text-[#FF4D2E] font-black">{weeklyFocusMinutes} / {goalTargetMinutes} min</span> ({goalPercent}%)
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-[#FAF7F2] border-2 border-black rounded-full h-3.5 overflow-hidden p-0.5 shadow-inner">
              <div
                className="bg-[#10B981] h-full rounded-full transition-all duration-500 border-r border-black"
                style={{ width: `${goalPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between mt-2.5 text-[11px] font-bold text-black/60">
              <span>
                {weeklyFocusMinutes >= goalTargetMinutes
                  ? "🎉 Weekly goal achieved! Fantastic work."
                  : `${goalTargetMinutes - weeklyFocusMinutes} minutes left to reach your weekly goal.`}
              </span>
              <button
                type="button"
                onClick={() => navigate("/timer")}
                className="text-[11px] font-black text-[#FF4D2E] hover:underline cursor-pointer"
              >
                Start Focus Session &rarr;
              </button>
            </div>
          </section>

          {/* ── 4. YOUR STUDENT PROFILE CARD ─────────────────────────────────── */}
          <section className="border-2 border-black rounded-3xl bg-white shadow-[4px_4px_0px_#1A1A1A] overflow-hidden">
            <div className={`h-16 md:h-20 w-full ${currentBanner.className} border-b-2 border-black p-3.5 flex justify-between items-start`}>
              <span className="text-[10px] font-black uppercase tracking-wider bg-black/80 text-white px-2.5 py-0.5 rounded-lg border border-white/20">
                Your Student Profile
              </span>
              <button
                type="button"
                onClick={() => {
                  playTap();
                  setIsEditProfileOpen(true);
                }}
                className="px-3 py-1 bg-white hover:bg-[#FAF7F2] text-black border-2 border-black rounded-xl font-black text-[11px] shadow-[2px_2px_0px_#000] active:translate-y-0.5 transition-all flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">edit</span>
                <span>Edit Profile</span>
              </button>
            </div>

            <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-white border-2 border-black flex items-center justify-center text-[26px] shadow-[2px_2px_0px_#1A1A1A] overflow-hidden bg-[#FAF7F2] shrink-0">
                  {studentProfile.isAvatarImage ? (
                    <img src={studentProfile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span>{studentProfile.avatar || "🎓"}</span>
                  )}
                </div>

                <div className="min-w-0">
                  <h3 className="font-black text-[17px] text-black truncate leading-tight">
                    {studentProfile.displayName}
                  </h3>
                  <div className="text-[12px] font-bold text-black/55 truncate mt-0.5">
                    {studentProfile.username}
                    {studentProfile.school ? ` • ${studentProfile.school}` : ""}
                  </div>
                  {studentProfile.bio ? (
                    <p className="text-[12px] font-medium text-black/75 line-clamp-1 mt-0.5">
                      {studentProfile.bio}
                    </p>
                  ) : (
                    <p className="text-[11.5px] font-medium text-black/40 italic mt-0.5">
                      No bio yet. Tap &apos;Edit Profile&apos; to introduce yourself.
                    </p>
                  )}
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
