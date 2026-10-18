import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SharedSidebar } from "@/components/SharedSidebar";
import { useCommunity, StudyBuddy, CampusNote } from "@/hooks/useCommunity";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { playPop, playTap, playSuccess } from "@/lib/soundFX";
import { FriendProfileModal } from "@/components/FriendProfileModal";
import { useUserProfile, PRESET_BANNERS } from "@/lib/userProfileStore";
import { EditProfileModal } from "@/components/EditProfileModal";
import { useCoStudyPresence } from "@/hooks/useCoStudyPresence";

interface DuelRecord {
  id: string;
  opponentName: string;
  opponentAvatar?: string;
  opponentCode?: string;
  subject: string;
  userScore: number;
  totalQuestions: number;
  won: boolean;
  date: string;
}

export default function Friends() {
  const navigate = useNavigate();
  const { user, profile: authProfile } = useAuth();
  const {
    buddies,
    notes,
    sendNudge,
    addFriendByCode,
    removeFriend,
    blockFriend
  } = useCommunity({ loadNotes: true });

  const { activePeers } = useCoStudyPresence();
  const otherPeers = useMemo(() => activePeers.filter((p) => !p.isSelf), [activePeers]);

  const fallbackName = authProfile?.full_name || (user as any)?.user_metadata?.full_name || user?.email?.split("@")[0] || "Scholar";
  const { profile: studentProfile, updateProfile } = useUserProfile(user?.id, fallbackName);

  const [activeTab, setActiveTab] = useState<"friends" | "vault" | "duels">("friends");
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

  // Notes published by this user to Campus Vault
  const userVaultNotes = useMemo(() => {
    return notes.filter((n) => n.user_id === user?.id || (myFriendCode && n.authorCode === myFriendCode));
  }, [notes, user?.id, myFriendCode]);

  // Duel history from localStorage
  const duelHistory = useMemo<DuelRecord[]>(() => {
    try {
      const raw = localStorage.getItem("pz_duel_history");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  }, []);

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
    toast.success(`Challenging ${buddy.name} to a 1v1 Quiz Duel!`, {
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

  const handleBlockFriend = (buddy: StudyBuddy) => {
    setActiveMenuBuddyId(null);
    if (window.confirm(`Block ${buddy.name}? They will no longer see your profile or study activity.`)) {
      blockFriend(buddy.id);
    }
  };

  const goalTargetMinutes = 300;
  const goalPercent = Math.min(100, Math.round((weeklyFocusMinutes / goalTargetMinutes) * 100));

  // Determine active banner style
  const bannerPreset = PRESET_BANNERS.find((b) => b.id === studentProfile.bannerId);
  const bannerClass = bannerPreset ? bannerPreset.className : PRESET_BANNERS[0].className;

  return (
    <div className="w-full bg-[#FAF7F2] min-h-screen text-black flex flex-col font-body-md flex-1">
      <SharedSidebar active="/friends" />

      {/* Main Content Area */}
      <div className="md:ml-64 flex flex-col min-h-screen overflow-y-auto">
        <div className="p-4 md:p-8 max-w-5xl w-full mx-auto space-y-6 pb-28 md:pb-12">

          {/* ── YOUTUBE-STYLE PROFILE HEADER CARD ── */}
          <div className="border-2 border-black rounded-3xl bg-white shadow-[4px_4px_0px_#1A1A1A] overflow-hidden">
            {/* Top Customizable Banner */}
            <div className={`h-32 sm:h-44 md:h-52 w-full relative overflow-hidden border-b-2 border-black ${bannerClass}`}>
              {studentProfile.customBannerUrl && (
                <img
                  src={studentProfile.customBannerUrl}
                  alt="Profile Banner"
                  className="w-full h-full object-cover"
                />
              )}

              {/* Edit Banner CTA */}
              <button
                type="button"
                onClick={() => {
                  playTap();
                  setIsEditProfileOpen(true);
                }}
                className="absolute top-3 right-3 px-3 py-1.5 bg-black/80 hover:bg-black text-white text-[11px] font-black rounded-xl border border-white/30 shadow-[2px_2px_0px_#000] flex items-center gap-1.5 cursor-pointer backdrop-blur-xs transition-colors"
                title="Change banner theme or image"
              >
                <span className="material-symbols-outlined text-[15px]">palette</span>
                <span>Customize Banner</span>
              </button>
            </div>

            {/* Profile Info & Overlapping Avatar */}
            <div className="px-4 sm:px-6 md:px-8 pb-5">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 sm:-mt-16 md:-mt-20 mb-4">
                {/* Overlapping Avatar */}
                <div className="flex items-end gap-4">
                  <div className="relative group shrink-0">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full border-4 border-black bg-white shadow-[3px_3px_0px_#1A1A1A] overflow-hidden flex items-center justify-center">
                      {studentProfile.isAvatarImage ? (
                        <img
                          src={studentProfile.avatar}
                          alt={studentProfile.displayName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/buddies/fox_scholar.png";
                          }}
                        />
                      ) : (
                        <img
                          src="/buddies/fox_scholar.png"
                          alt={studentProfile.displayName}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    {/* Quick Avatar Edit Badge */}
                    <button
                      type="button"
                      onClick={() => {
                        playTap();
                        setIsEditProfileOpen(true);
                      }}
                      className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-[#FFD13B] hover:bg-[#FF4D2E] hover:text-white text-black border-2 border-black flex items-center justify-center shadow-xs cursor-pointer transition-colors"
                      title="Change avatar"
                    >
                      <span className="material-symbols-outlined text-[15px]">photo_camera</span>
                    </button>
                  </div>

                  {/* Desktop Title & Handle */}
                  <div className="hidden sm:block pb-1 min-w-0">
                    <h1 className="text-[24px] md:text-[28px] font-black text-black leading-tight truncate">
                      {studentProfile.displayName}
                    </h1>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[12px] md:text-[13px] font-bold text-black/55 font-mono">
                        {studentProfile.username}
                      </span>
                      {studentProfile.school && (
                        <>
                          <span className="text-black/30">&bull;</span>
                          <span className="text-[12px] font-bold text-black/60 truncate">
                            {studentProfile.school}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Top Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto pt-2 sm:pt-0">
                  <button
                    type="button"
                    onClick={() => {
                      playTap();
                      setIsEditProfileOpen(true);
                    }}
                    className="px-3.5 py-1.5 bg-[#FAF7F2] hover:bg-stone-200 text-black border-2 border-black rounded-xl font-black text-[11.5px] cursor-pointer shadow-[2px_2px_0px_#1A1A1A] active:translate-y-0.5 flex items-center gap-1.5 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[15px]">edit</span>
                    <span>Edit Profile</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="px-3.5 py-1.5 bg-black hover:bg-[#FF4D2E] text-white border-2 border-black rounded-xl font-black text-[11.5px] cursor-pointer shadow-[2px_2px_0px_#1A1A1A] active:translate-y-0.5 flex items-center gap-1.5 transition-colors"
                    title="Copy your friend code"
                  >
                    <span className="material-symbols-outlined text-[15px]">share</span>
                    <span>{myFriendCode}</span>
                  </button>
                </div>
              </div>

              {/* Mobile Title & Handle (visible on small screens) */}
              <div className="sm:hidden mb-2">
                <h1 className="text-[20px] font-black text-black leading-tight truncate">
                  {studentProfile.displayName}
                </h1>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-[12px] font-bold text-black/55 font-mono">
                    {studentProfile.username}
                  </span>
                  {studentProfile.school && (
                    <>
                      <span className="text-black/30">&bull;</span>
                      <span className="text-[11.5px] font-bold text-black/60 truncate">
                        {studentProfile.school}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Real Student Stats Row (Zeros hidden, fake stats strictly removed) */}
              <div className="flex flex-wrap items-center gap-3 text-[12px] font-extrabold text-black/70 pt-1">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-black/60">groups</span>
                  <span>{buddies.length} {buddies.length === 1 ? "friend" : "friends"}</span>
                </span>

                {/* Heart Counter (Hidden if 0 or if hideHearts privacy toggle is on) */}
                {!studentProfile.hideHearts && (studentProfile.heartsCount || 0) > 0 && (
                  <>
                    <span className="text-black/30">&bull;</span>
                    <span className="inline-flex items-center gap-1 text-rose-600 font-black">
                      <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        favorite
                      </span>
                      <span>{studentProfile.heartsCount} {studentProfile.heartsCount === 1 ? "heart" : "hearts"}</span>
                    </span>
                  </>
                )}

                {/* Streak (Single 🔥 exception) */}
                <span className="text-black/30">&bull;</span>
                <span className="inline-flex items-center gap-1 text-[#FF4D2E] font-black">
                  <span>🔥</span>
                  <span>{authProfile?.streak_days ?? 1}d streak</span>
                </span>

                {/* Notes published count (only if > 0) */}
                {userVaultNotes.length > 0 && (
                  <>
                    <span className="text-black/30">&bull;</span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px] text-black/60">menu_book</span>
                      <span>{userVaultNotes.length} {userVaultNotes.length === 1 ? "post" : "posts"}</span>
                    </span>
                  </>
                )}
              </div>

              {/* Bio (Only render if user actually entered one, no fake defaults) */}
              {studentProfile.bio && studentProfile.bio.trim() && (
                <p className="text-[13px] font-medium text-black/80 mt-2 max-w-2xl leading-relaxed">
                  {studentProfile.bio}
                </p>
              )}
            </div>

            {/* ── YOUTUBE-STYLE TABS NAVIGATION ── */}
            <div className="flex items-center border-t-2 border-black bg-[#FFFDF5] px-4 sm:px-6 overflow-x-auto">
              <button
                type="button"
                onClick={() => {
                  playTap();
                  setActiveTab("friends");
                }}
                className={`py-3 px-4 text-[12.5px] uppercase tracking-wider transition-all cursor-pointer border-b-[3px] flex items-center gap-2 whitespace-nowrap ${
                  activeTab === "friends"
                    ? "border-black font-black text-black"
                    : "border-transparent font-extrabold text-black/50 hover:text-black"
                }`}
              >
                <span className="material-symbols-outlined text-[17px]">groups</span>
                <span>Friends</span>
                <span className="text-[10.5px] font-black bg-black/10 px-2 py-0.5 rounded-full">
                  {buddies.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playTap();
                  setActiveTab("vault");
                }}
                className={`py-3 px-4 text-[12.5px] uppercase tracking-wider transition-all cursor-pointer border-b-[3px] flex items-center gap-2 whitespace-nowrap ${
                  activeTab === "vault"
                    ? "border-black font-black text-black"
                    : "border-transparent font-extrabold text-black/50 hover:text-black"
                }`}
              >
                <span className="material-symbols-outlined text-[17px]">menu_book</span>
                <span>Study Vault Posts</span>
                {userVaultNotes.length > 0 && (
                  <span className="text-[10.5px] font-black bg-black/10 px-2 py-0.5 rounded-full">
                    {userVaultNotes.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  playTap();
                  setActiveTab("duels");
                }}
                className={`py-3 px-4 text-[12.5px] uppercase tracking-wider transition-all cursor-pointer border-b-[3px] flex items-center gap-2 whitespace-nowrap ${
                  activeTab === "duels"
                    ? "border-black font-black text-black"
                    : "border-transparent font-extrabold text-black/50 hover:text-black"
                }`}
              >
                <span className="material-symbols-outlined text-[17px]">sports_kabaddi</span>
                <span>Duels & Challenges</span>
                {duelHistory.length > 0 && (
                  <span className="text-[10.5px] font-black bg-black/10 px-2 py-0.5 rounded-full">
                    {duelHistory.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* TAB 1: FRIENDS                                                    */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {activeTab === "friends" && (
            <div className="space-y-6">
              {/* Unified Connection Bar: Your Code + Add Friend in 1 row */}
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

              {/* Friends List */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-[15px] font-black uppercase tracking-wider text-black">
                      Your Friends ({buddies.length})
                    </h2>
                    {otherPeers.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10.5px] font-black">
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
                  <div className="border-2 border-dashed border-black/25 rounded-2xl bg-white p-8 md:p-12 text-center space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-[#FAF7F2] border-2 border-black flex items-center justify-center mx-auto shadow-xs">
                      <span className="material-symbols-outlined text-[28px] text-black/60">group_add</span>
                    </div>
                    <h3 className="text-[17px] font-black text-black">No friends linked yet</h3>
                    <p className="text-[13px] font-medium text-black/60 max-w-md mx-auto leading-relaxed">
                      Share your friend code (<strong className="text-black font-black">{myFriendCode}</strong>) with classmates or enter theirs above to stay accountable and launch 1v1 duels.
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
                              <div className="w-12 h-12 rounded-xl bg-[#FAF7F2] border-2 border-black flex items-center justify-center shadow-xs overflow-hidden">
                                {isAvatarImg ? (
                                  <img
                                    src={buddy.avatar}
                                    alt={buddy.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = "/buddies/fox_scholar.png";
                                    }}
                                  />
                                ) : (
                                  <img
                                    src="/buddies/fox_scholar.png"
                                    alt={buddy.name}
                                    className="w-full h-full object-cover"
                                  />
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
                                <span className={buddy.hasStudiedToday ? "text-emerald-700 font-black inline-flex items-center gap-1" : "text-black/60 inline-flex items-center gap-1"}>
                                  {isLivePeer ? (
                                    <>
                                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                      <span>Studying in Lounge</span>
                                    </>
                                  ) : buddy.hasStudiedToday ? (
                                    <>
                                      <span className="material-symbols-outlined text-[13px] text-emerald-600">check_circle</span>
                                      <span>Studied today</span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="material-symbols-outlined text-[13px] text-amber-600">schedule</span>
                                      <span>Needs study today</span>
                                    </>
                                  )}
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
                              className="px-3 py-1.5 bg-[#FFD13B] hover:bg-[#FFE566] text-black border-2 border-black rounded-xl text-[11px] font-black cursor-pointer shadow-xs active:translate-y-0.5 flex items-center gap-1.5 transition-all"
                              title="Start a 1v1 Quiz Duel"
                            >
                              <span className="material-symbols-outlined text-[15px]">sports_kabaddi</span>
                              <span>Duel</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => sendNudge(buddy.id)}
                              className="px-3 py-1.5 bg-white hover:bg-rose-50 text-black border-2 border-black rounded-xl text-[11px] font-black cursor-pointer shadow-xs active:translate-y-0.5 flex items-center gap-1.5 transition-all"
                              title="Send a streak reminder nudge"
                            >
                              <span className="material-symbols-outlined text-[15px]">touch_app</span>
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
                                  <div className="absolute right-0 top-9 z-50 bg-white border-2 border-black rounded-xl shadow-[4px_4px_0px_#000] py-1 min-w-[150px] flex flex-col">
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
                                      <span className="material-symbols-outlined text-[15px]">sports_kabaddi</span>
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
                                    <button
                                      type="button"
                                      onClick={() => handleBlockFriend(buddy)}
                                      className="px-3 py-1.5 text-left text-[12px] font-bold hover:bg-red-50 text-red-700 flex items-center gap-2 cursor-pointer"
                                    >
                                      <span className="material-symbols-outlined text-[15px]">block</span>
                                      <span>Block Friend</span>
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

              {/* Weekly Focus Accountability */}
              <section className="bg-white border-2 border-black rounded-2xl p-4 md:p-5 shadow-[3px_3px_0px_#1A1A1A] space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-black/10">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#FFD13B] border-2 border-black flex items-center justify-center shadow-xs shrink-0">
                      <span className="material-symbols-outlined text-[20px] text-black">track_changes</span>
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

                {/* Progress Comparison */}
                <div className="space-y-2.5">
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

                  {buddies.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {buddies.map((buddy) => (
                        <div
                          key={buddy.id}
                          className="p-2.5 bg-[#FAF7F2] border border-black/20 rounded-xl flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-white border border-black/30 overflow-hidden shrink-0 flex items-center justify-center">
                              {buddy.avatar?.startsWith("/") || buddy.avatar?.startsWith("http") ? (
                                <img src={buddy.avatar} alt={buddy.name} className="w-full h-full object-cover" />
                              ) : (
                                <img src="/buddies/fox_scholar.png" alt={buddy.name} className="w-full h-full object-cover" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-[12px] font-black text-black truncate">{buddy.name}</div>
                              <div className="text-[10.5px] font-bold text-black/50">
                                {buddy.hasStudiedToday ? "Completed today's goal" : "Streak on the line"}
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
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* TAB 2: STUDY VAULT POSTS                                          */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {activeTab === "vault" && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-black/10">
                <div>
                  <h2 className="text-[18px] font-black text-black">
                    Your Study Vault Publications
                  </h2>
                  <p className="text-[12px] font-bold text-black/55">
                    Study guides, cheat sheets, and summaries you've published to the campus vault.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => navigate("/campus-vault")}
                  className="px-4 py-2 bg-[#FFD13B] hover:bg-[#FF4D2E] hover:text-white text-black border-2 border-black rounded-xl font-black text-[12px] shadow-[2px_2px_0px_#1A1A1A] active:translate-y-0.5 flex items-center gap-1.5 transition-all cursor-pointer self-start sm:self-auto"
                >
                  <span className="material-symbols-outlined text-[16px]">upload_file</span>
                  <span>+ Publish to Vault</span>
                </button>
              </div>

              {userVaultNotes.length === 0 ? (
                <div className="border-2 border-dashed border-black/25 rounded-2xl bg-white p-8 md:p-12 text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-[#FAF7F2] border-2 border-black flex items-center justify-center mx-auto shadow-xs">
                    <span className="material-symbols-outlined text-[28px] text-black/60">menu_book</span>
                  </div>
                  <h3 className="text-[17px] font-black text-black">No study notes published yet</h3>
                  <p className="text-[13px] font-medium text-black/60 max-w-md mx-auto leading-relaxed">
                    Turn your summaries and cheat sheets into high-yield campus resources! When you publish, classmates can study and clone them to their workspace.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate("/campus-vault")}
                    className="px-4 py-2 bg-black hover:bg-[#FF4D2E] text-white rounded-xl font-black text-[12px] border-2 border-black shadow-[2px_2px_0px_#1A1A1A] active:translate-y-0.5 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[15px]">explore</span>
                    <span>Explore Campus Vault</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {userVaultNotes.map((note) => (
                    <div
                      key={note.id}
                      className="border-2 border-black rounded-2xl p-4 bg-white shadow-[2px_2px_0px_#1A1A1A] hover:shadow-[4px_4px_0px_#1A1A1A] transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className={`px-2 py-0.5 rounded-md border text-[10px] font-black uppercase ${note.subjectBadgeColor || "bg-stone-50 border-black/20 text-black"}`}>
                            {note.subject}
                          </span>
                          <span className="text-[11px] font-bold text-black/45">{note.date}</span>
                        </div>
                        <h4 className="text-[15px] font-black text-black line-clamp-2 leading-snug">
                          {note.title}
                        </h4>
                        {note.summary && (
                          <p className="text-[12px] font-medium text-black/60 line-clamp-2 mt-1">
                            {note.summary}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-3 mt-3 border-t border-black/10 text-[11px] font-bold text-black/60">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px] text-rose-500">favorite</span>
                            <span>{note.likes}</span>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">download</span>
                            <span>{note.downloads}</span>
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => navigate("/campus-vault")}
                          className="px-2.5 py-1 bg-[#FAF7F2] hover:bg-black hover:text-white text-black border border-black rounded-lg text-[10.5px] font-black transition-colors cursor-pointer"
                        >
                          View in Vault
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* TAB 3: DUELS & CHALLENGES                                         */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {activeTab === "duels" && (
            <div className="space-y-6">
              {/* Quick Duel Launcher Card */}
              <div className="bg-white border-2 border-black rounded-2xl p-4 md:p-5 shadow-[3px_3px_0px_#1A1A1A] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-black/10">
                  <div>
                    <h2 className="text-[16px] font-black text-black flex items-center gap-2">
                      <span className="material-symbols-outlined text-[20px] text-[#FF4D2E]">sports_kabaddi</span>
                      <span>Challenge a Friend to 1v1 Quiz Duel</span>
                    </h2>
                    <p className="text-[12px] font-bold text-black/55 mt-0.5">
                      5 quick-fire active recall questions. Compare your recall accuracy against your classmate.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      playPop();
                      localStorage.removeItem("pz_duel_opponent");
                      navigate("/practice");
                    }}
                    className="px-3.5 py-1.5 bg-[#FFD13B] hover:bg-[#FF4D2E] hover:text-white text-black border-2 border-black rounded-xl font-black text-[11.5px] shadow-xs active:translate-y-0.5 transition-all cursor-pointer shrink-0"
                  >
                    Solo Duel Sprint &rarr;
                  </button>
                </div>

                {buddies.length === 0 ? (
                  <p className="text-[12px] font-medium text-black/50 py-2">
                    Add friends using your friend code above to challenge them directly to duels.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                    {buddies.map((buddy) => (
                      <div
                        key={buddy.id}
                        className="p-3 bg-[#FAF7F2] hover:bg-[#FFFDF5] border-2 border-black rounded-xl flex items-center justify-between gap-2.5 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-white border border-black/30 overflow-hidden shrink-0 flex items-center justify-center">
                            {buddy.avatar?.startsWith("/") || buddy.avatar?.startsWith("http") ? (
                              <img src={buddy.avatar} alt={buddy.name} className="w-full h-full object-cover" />
                            ) : (
                              <img src="/buddies/fox_scholar.png" alt={buddy.name} className="w-full h-full object-cover" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-[12.5px] font-black text-black truncate">{buddy.name}</div>
                            <div className="text-[10px] font-bold text-black/50 font-mono">{buddy.code}</div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleLaunchDuelWithBuddy(buddy)}
                          className="px-2.5 py-1 bg-black hover:bg-[#FF4D2E] text-white border border-black rounded-lg text-[10.5px] font-black cursor-pointer shadow-xs active:scale-95 transition-colors shrink-0"
                        >
                          Duel
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Match History */}
              <section className="space-y-3">
                <h3 className="text-[15px] font-black uppercase tracking-wider text-black">
                  Recent Duel Records
                </h3>

                {duelHistory.length === 0 ? (
                  <div className="border-2 border-dashed border-black/25 rounded-2xl bg-white p-8 md:p-10 text-center space-y-2.5">
                    <div className="w-12 h-12 rounded-xl bg-[#FAF7F2] border-2 border-black flex items-center justify-center mx-auto shadow-xs">
                      <span className="material-symbols-outlined text-[24px] text-black/60">military_tech</span>
                    </div>
                    <h4 className="text-[16px] font-black text-black">No duels recorded yet</h4>
                    <p className="text-[12.5px] font-medium text-black/60 max-w-sm mx-auto">
                      Launch a 1v1 duel with any friend or start a practice sprint to test your accuracy benchmark!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {duelHistory.map((duel) => (
                      <div
                        key={duel.id}
                        className="border-2 border-black rounded-xl p-3.5 bg-white flex items-center justify-between gap-3 shadow-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${
                            duel.won
                              ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                              : "bg-stone-100 text-stone-700 border-stone-300"
                          }`}>
                            {duel.won ? "Victory" : "Completed"}
                          </span>
                          <div>
                            <div className="text-[13px] font-black text-black truncate">
                              vs {duel.opponentName}
                            </div>
                            <div className="text-[11px] font-bold text-black/50">
                              {duel.subject} &bull; {duel.date}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-[14px] font-black text-black">
                            {duel.userScore} / {duel.totalQuestions}
                          </div>
                          <div className="text-[10px] font-bold text-black/50">Score</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

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
