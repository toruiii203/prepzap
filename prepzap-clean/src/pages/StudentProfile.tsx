import { useState, useEffect } from "react";
import { SharedSidebar } from "@/components/SharedSidebar";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { loadLibrary } from "@/lib/sourceContext";
import { usePlan } from "@/hooks/usePlan";
import { useAuth } from "@/contexts/AuthContext";
import { useStudyStats } from "@/hooks/useStudyStats";
import { useCommunity } from "@/hooks/useCommunity";
import { useUserProfile, PRESET_BANNERS } from "@/lib/userProfileStore";
import { EditProfileModal } from "@/components/EditProfileModal";
import { playPop, playTap, playSuccess } from "@/lib/soundFX";
import { toast } from "sonner";
import { levelFromXp, xpProgressPercent } from "@/lib/xp";

function getJoinDate(isoString?: string): string {
  if (!isoString) return "Recently joined";
  const d = new Date(isoString);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export default function StudentProfile() {
  const navigate = useNavigate();
  const { isPro } = usePlan();
  const { user, profile: authProfile } = useAuth();
  const { stats } = useStudyStats();
  const { buddies, notes } = useCommunity();

  const fallbackName = authProfile?.full_name || (user as any)?.user_metadata?.full_name || user?.email?.split("@")[0] || "Student Scholar";
  const { profile: studentProfile, updateProfile } = useUserProfile(user?.id, fallbackName);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"notes" | "partners" | "tools">("notes");
  const [sourceCount, setSourceCount] = useState(0);

  const currentLevel = levelFromXp(authProfile?.total_xp ?? 0);
  const progressPercent = xpProgressPercent(authProfile?.total_xp ?? 0);

  const myFriendCode = user?.id ? `REX-${user.id.replace(/-/g, "").slice(0, 4).toUpperCase()}` : "REX-8491";

  const currentBanner = PRESET_BANNERS.find((b) => b.id === studentProfile.bannerId) || PRESET_BANNERS[0];

  useEffect(() => {
    setSourceCount(loadLibrary().length);
  }, []);

  const handleSignOut = async () => {
    try { await supabase.auth.signOut(); } catch (e) {}
    window.location.href = "/";
  };

  const handleCopyProfileLink = () => {
    playTap();
    navigator.clipboard.writeText(`${window.location.origin}/friends?friend=${myFriendCode}`);
    toast.success("Profile link copied!", {
      description: "Classmates can use this link to visit your profile and study circle."
    });
  };

  // Find user's own notes (matching author or authorCode)
  const myNotes = notes.filter(
    (n) =>
      (n.authorCode && n.authorCode === myFriendCode) ||
      n.author.toLowerCase().includes(studentProfile.displayName.toLowerCase().split(" ")[0])
  );

  return (
    <div className="w-full bg-[#FAF7F2] min-h-screen text-black flex flex-col font-body-md flex-1">
      <SharedSidebar active="/profile" />

      {/* ── MAIN CONTENT (DESKTOP & MOBILE RESPONSIVE) ───────────────────────── */}
      <div className="md:ml-64 flex flex-col min-h-screen overflow-y-auto">
        <div className="p-3 md:p-10 max-w-5xl w-full mx-auto space-y-6 pb-28 md:pb-12">
          
          {/* Top Mobile Back Header */}
          <div className="md:hidden flex items-center justify-between pb-2 border-b-2 border-black/10">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 rounded-xl border-2 border-black bg-white shadow-xs cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5 text-black" />
            </button>
            <span className="font-black text-[15px] uppercase tracking-wider text-black">
              Student Profile
            </span>
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="p-1.5 rounded-xl border-2 border-black bg-[#FFD13B] shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">edit</span>
            </button>
          </div>

          {/* ── STUDENT PROFILE CONTAINER ────────────────────────────────────── */}
          <div className="border-3 md:border-4 border-black rounded-3xl bg-white shadow-[6px_6px_0px_#1A1A1A] overflow-hidden">
            
            {/* 1. PROFILE COVER BANNER */}
            <div className={`h-36 md:h-52 w-full ${currentBanner.className} border-b-4 border-black relative p-3 md:p-5 flex justify-between items-start`}>
              <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#000_2px,transparent_2px)] [background-size:16px_16px] pointer-events-none" />
              
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-black/75 backdrop-blur-xs text-white rounded-xl text-[11px] font-black uppercase tracking-wider border border-white/20">
                <span className="material-symbols-outlined text-[15px] text-[#FFD13B]">person</span>
                <span>Student Profile</span>
              </div>

              <button
                type="button"
                onClick={() => { playTap(); setIsEditModalOpen(true); }}
                className="px-3.5 py-1.5 bg-white hover:bg-[#FAF7F2] text-black border-2 border-black rounded-xl font-black text-[11px] shadow-[2px_2px_0px_#1A1A1A] active:translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer z-10"
              >
                <span className="material-symbols-outlined text-[15px]">brush</span>
                <span>Customize Profile</span>
              </button>
            </div>

            {/* 2. PROFILE HEADER & AVATAR */}
            <div className="px-5 md:px-8 pb-6 pt-0 relative">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-14 md:-mt-16 mb-4">
                
                {/* Avatar & Identifiers */}
                <div className="flex items-end gap-4">
                  <div className="relative group">
                    <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl md:rounded-3xl bg-white border-3 md:border-4 border-black flex items-center justify-center shadow-[4px_4px_0px_#1A1A1A] overflow-hidden bg-[#FAF7F2] shrink-0">
                      {studentProfile.isAvatarImage ? (
                        <img
                          src={studentProfile.avatar}
                          alt={studentProfile.displayName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-[44px] md:text-[54px]">
                          {studentProfile.avatar || "🎓"}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsEditModalOpen(true)}
                      className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg bg-[#FFD13B] border-2 border-black flex items-center justify-center shadow-xs cursor-pointer hover:bg-white"
                      title="Change avatar"
                    >
                      <span className="material-symbols-outlined text-[15px] text-black">edit</span>
                    </button>
                  </div>

                  <div className="min-w-0 pb-1">
                    <div className="flex items-center gap-2">
                      <h1 className="text-[22px] md:text-[28px] font-black text-black leading-tight truncate">
                        {studentProfile.displayName}
                      </h1>
                      {studentProfile.verifiedStudent && (
                        <span className="material-symbols-outlined text-[20px] text-[#10B981]" title="Verified Student Creator">
                          verified
                        </span>
                      )}
                    </div>

                    <div className="text-[12.5px] font-bold text-black/60 truncate flex items-center gap-2 mt-0.5">
                      <span>{studentProfile.username}</span>
                      <span>&bull;</span>
                      <span className="text-[#10B981] font-black">{myFriendCode}</span>
                    </div>

                    <div className="text-[11.5px] font-semibold text-black/50 truncate mt-0.5">
                      {studentProfile.school || "Studenius Scholar"} &bull; Joined {getJoinDate(user?.created_at)}
                    </div>
                  </div>
                </div>

                {/* Top Action Buttons */}
                <div className="flex items-center gap-2 pt-1 sm:pt-0">
                  <button
                    type="button"
                    onClick={() => { playPop(); setIsEditModalOpen(true); }}
                    className="px-4 py-2 bg-[#FAF7F2] hover:bg-white border-2 border-black rounded-xl font-black text-[12px] shadow-[2px_2px_0px_#1A1A1A] active:translate-y-0.5 cursor-pointer flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">tune</span>
                    <span>Edit Profile</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyProfileLink}
                    className="px-4 py-2 bg-black hover:bg-[#10B981] text-white border-2 border-black rounded-xl font-black text-[12px] shadow-[2px_2px_0px_#1A1A1A] active:translate-y-0.5 cursor-pointer flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">share</span>
                    <span>Share Profile</span>
                  </button>
                </div>
              </div>

              {/* Bio & Academic Mission */}
              <div className="max-w-2xl bg-[#FAF7F2] border-2 border-black rounded-2xl p-3.5 mb-4 shadow-[2px_2px_0px_#1A1A1A]">
                <p className="text-[13px] font-semibold text-black/80 leading-relaxed">
                  {studentProfile.bio || "Student creator on Studenius prepping for upcoming exams with active recall and revision guides."}
                </p>
                {studentProfile.targetExam && (
                  <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 bg-white border border-black/20 rounded-lg text-[11px] font-bold text-black/70">
                    <span className="material-symbols-outlined text-[14px] text-[#10B981]">flag</span>
                    <span>Target: <strong>{studentProfile.targetExam}</strong></span>
                  </div>
                )}
              </div>

              {/* Channel Stats Row */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <div className="bg-white border-2 border-black rounded-xl p-2.5 text-center shadow-[2px_2px_0px_#1A1A1A]">
                  <div className="text-[10px] font-black uppercase text-black/45">Academic Streak</div>
                  <div className="text-[18px] font-black text-[#10B981] flex items-center justify-center gap-1 mt-0.5">
                    <span>🔥</span>
                    <span>{authProfile?.streak_days ?? 1}d</span>
                  </div>
                </div>

                <div className="bg-white border-2 border-black rounded-xl p-2.5 text-center shadow-[2px_2px_0px_#1A1A1A]">
                  <div className="text-[10px] font-black uppercase text-black/45">Scholar Level</div>
                  <div className="text-[18px] font-black text-black flex items-center justify-center gap-1 mt-0.5">
                    <span>⚡</span>
                    <span>LVL {currentLevel}</span>
                  </div>
                </div>

                <div className="bg-white border-2 border-black rounded-xl p-2.5 text-center shadow-[2px_2px_0px_#1A1A1A]">
                  <div className="text-[10px] font-black uppercase text-black/45">Study Time</div>
                  <div className="text-[18px] font-black text-black mt-0.5">
                    {stats.studyTimeHours > 0 ? `${stats.studyTimeHours}h` : "1.2h"}
                  </div>
                </div>

                <div className="bg-white border-2 border-black rounded-xl p-2.5 text-center shadow-[2px_2px_0px_#1A1A1A]">
                  <div className="text-[10px] font-black uppercase text-black/45">Study Buddies</div>
                  <div className="text-[18px] font-black text-black mt-0.5">
                    {buddies.length}
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1 bg-white border-2 border-black rounded-xl p-2.5 text-center shadow-[2px_2px_0px_#1A1A1A]">
                  <div className="text-[10px] font-black uppercase text-black/45">Sources Linked</div>
                  <div className="text-[18px] font-black text-blue-600 mt-0.5">
                    {sourceCount}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. CHANNEL TABS */}
            <div className="flex items-center gap-2 px-5 md:px-8 border-y-2 border-black bg-[#FFFDF5]">
              <button
                type="button"
                onClick={() => { playTap(); setActiveTab("notes"); }}
                className={`py-3 px-3 font-black text-[13px] border-b-3 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "notes"
                    ? "border-black text-black"
                    : "border-transparent text-black/50 hover:text-black"
                }`}
              >
                <span className="material-symbols-outlined text-[17px]">menu_book</span>
                <span>My Vault Guides ({myNotes.length})</span>
              </button>

              <button
                type="button"
                onClick={() => { playTap(); setActiveTab("partners"); }}
                className={`py-3 px-3 font-black text-[13px] border-b-3 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "partners"
                    ? "border-black text-black"
                    : "border-transparent text-black/50 hover:text-black"
                }`}
              >
                <span className="material-symbols-outlined text-[17px]">groups</span>
                <span>Study Circle ({buddies.length})</span>
              </button>

              <button
                type="button"
                onClick={() => { playTap(); setActiveTab("tools"); }}
                className={`py-3 px-3 font-black text-[13px] border-b-3 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "tools"
                    ? "border-black text-black"
                    : "border-transparent text-black/50 hover:text-black"
                }`}
              >
                <span className="material-symbols-outlined text-[17px]">apps</span>
                <span>Hub & Tools</span>
              </button>
            </div>

            {/* 4. TAB CONTENTS */}
            <div className="p-5 md:p-8 bg-[#FAF7F2]">
              
              {/* TAB 1: USER'S PUBLISHED NOTES / REVISION GUIDES */}
              {activeTab === "notes" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-[15px] font-black text-black">Your Published Guides</h3>
                      <p className="text-[12px] font-bold text-black/50">
                        Study sheets and summaries shared with classmates in Campus Vault.
                      </p>
                    </div>
                    <button
                      onClick={() => navigate("/campus-vault")}
                      className="px-3.5 py-1.5 bg-[#FFD13B] hover:bg-[#FFE566] text-black border-2 border-black rounded-xl font-black text-[11.5px] shadow-[2px_2px_0px_#000] active:translate-y-0.5 cursor-pointer flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[15px]">add</span>
                      <span>Publish Guide</span>
                    </button>
                  </div>

                  {myNotes.length === 0 ? (
                    <div className="p-8 text-center border-2 border-dashed border-black/25 rounded-2xl bg-white space-y-2.5">
                      <div className="text-[32px]">📚</div>
                      <h4 className="text-[15px] font-black text-black">No study guides published yet</h4>
                      <p className="text-[12px] font-medium text-black/55 max-w-md mx-auto leading-relaxed">
                        Share your lecture summaries, formulas, or cheat sheets to the Campus Vault so classmates can study them and leave likes!
                      </p>
                      <button
                        onClick={() => navigate("/campus-vault")}
                        className="mt-1 px-4 py-2 bg-[#10B981] text-white border-2 border-black rounded-xl font-black text-[12px] shadow-[2px_2px_0px_#000] cursor-pointer"
                      >
                        Explore Campus Vault &rarr;
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {myNotes.map((note) => (
                        <div
                          key={note.id}
                          className="border-2 border-black rounded-2xl bg-white p-4 shadow-[3px_3px_0px_#1A1A1A] flex flex-col justify-between gap-3"
                        >
                          <div>
                            <span className={`px-2 py-0.5 rounded border text-[9.5px] font-black uppercase tracking-wider ${note.subjectBadgeColor}`}>
                              {note.subject}
                            </span>
                            <h4 className="text-[15px] font-black text-black mt-1.5 leading-snug">
                              {note.title}
                            </h4>
                            <p className="text-[11.5px] font-medium text-black/60 line-clamp-2 mt-1">
                              {note.summary}
                            </p>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-black/10">
                            <span className="text-[11px] font-bold text-black/50">
                              ❤️ {note.likes} likes &bull; {note.readTime}
                            </span>
                            <button
                              onClick={() => {
                                localStorage.setItem("qs_practice_export", JSON.stringify(note.content));
                                navigate("/practice");
                              }}
                              className="px-3 py-1 bg-[#FAF7F2] hover:bg-white text-black border border-black rounded-lg font-black text-[11px] cursor-pointer"
                            >
                              Test with Quiz
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: STUDY CIRCLE PARTNERS */}
              {activeTab === "partners" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-[15px] font-black text-black">Connected Study Partners</h3>
                      <p className="text-[12px] font-bold text-black/50">
                        Classmates in your mutual accountability streak.
                      </p>
                    </div>
                    <button
                      onClick={() => navigate("/friends")}
                      className="px-3.5 py-1.5 bg-[#FFD13B] hover:bg-[#FFE566] text-black border-2 border-black rounded-xl font-black text-[11.5px] shadow-[2px_2px_0px_#000] active:translate-y-0.5 cursor-pointer flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[15px]">person_add</span>
                      <span>Link Partner</span>
                    </button>
                  </div>

                  {buddies.length === 0 ? (
                    <div className="p-8 text-center border-2 border-dashed border-black/25 rounded-2xl bg-white space-y-2.5">
                      <div className="text-[32px]">🤝</div>
                      <h4 className="text-[15px] font-black text-black">No study partners linked yet</h4>
                      <p className="text-[12px] font-medium text-black/55 max-w-md mx-auto leading-relaxed">
                        Share your friend code (<strong className="text-black">{myFriendCode}</strong>) with classmates to start mutual streak accountability.
                      </p>
                      <button
                        onClick={() => navigate("/friends")}
                        className="mt-1 px-4 py-2 bg-black text-white border-2 border-black rounded-xl font-black text-[12px] shadow-[2px_2px_0px_#000] cursor-pointer"
                      >
                        Go to Friends &rarr;
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {buddies.map((buddy) => (
                        <div
                          key={buddy.id}
                          className="border-2 border-black rounded-2xl p-4 bg-white shadow-[3px_3px_0px_#1A1A1A] flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-11 h-11 rounded-xl bg-[#FAF7F2] border-2 border-black flex items-center justify-center text-[22px] overflow-hidden shrink-0">
                              {buddy.avatar?.startsWith("/") || buddy.avatar?.startsWith("http") ? (
                                <img src={buddy.avatar} alt={buddy.name} className="w-full h-full object-cover" />
                              ) : (
                                buddy.avatar || "🎓"
                              )}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-[14px] font-black text-black truncate leading-tight">
                                {buddy.name}
                              </h4>
                              <p className="text-[11px] font-bold text-black/50 truncate">
                                🔥 {buddy.streakDays}d streak &bull; LVL {buddy.level || 1}
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              playPop();
                              navigate(`/friends`);
                            }}
                            className="px-3 py-1 bg-[#FAF7F2] hover:bg-black hover:text-white border border-black rounded-lg text-[11px] font-black transition-colors cursor-pointer shrink-0"
                          >
                            View Profile
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: HUB & TOOLS */}
              {activeTab === "tools" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {[
                    { icon: "forum", label: "AI Tutor", desc: "Rex AI concept breakdown & 24/7 Socratic tutor", route: "/ai-tutor" },
                    { icon: "folder_open", label: "Source Library", desc: "Uploaded PDFs, slides, and syllabus notes", route: "/sources" },
                    { icon: "timer", label: "Focus Timer", desc: "Pomodoro sessions & deep work tracking", route: "/timer" },
                    { icon: "bar_chart", label: "Analytics", desc: "Subject mastery breakdown and quiz accuracy", route: "/analytics" },
                    { icon: "groups", label: "Friends", desc: "Manage friends and mutual accountability", route: "/friends" },
                    { icon: "menu_book", label: "Campus Vault", desc: "Discover peer notes & study guides", route: "/campus-vault" },
                  ].map((tool) => (
                    <button
                      key={tool.route}
                      onClick={() => navigate(tool.route)}
                      className="border-2 border-black rounded-2xl p-4 bg-white hover:bg-[#FFFDF5] shadow-[3px_3px_0px_#1A1A1A] hover:shadow-[5px_5px_0px_#1A1A1A] transition-all text-left flex items-start gap-3.5 cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center shrink-0 border border-black">
                        <span className="material-symbols-outlined text-[20px]">{tool.icon}</span>
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-black text-[14px] text-black">{tool.label}</h4>
                        <p className="text-[11.5px] font-medium text-black/55 mt-0.5 line-clamp-1">{tool.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

            </div>

            {/* 5. FOOTER LOGOUT */}
            <div className="p-4 border-t-2 border-black bg-white flex items-center justify-between">
              <span className="text-[11px] font-bold text-black/50">
                Logged in as <strong>{user?.email || "Student"}</strong>
              </span>
              <button
                onClick={handleSignOut}
                className="text-[12px] font-black text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>

          </div>

        </div>
      </div>

      {/* ── EDIT PROFILE MODAL ────────────────────────────────────────────── */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        currentProfile={studentProfile}
        onClose={() => setIsEditModalOpen(false)}
        onSave={updateProfile}
      />
    </div>
  );
}
