import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCoStudyPresence, StudyPeer } from "@/hooks/useCoStudyPresence";
import { StudyBuddy } from "@/hooks/useCommunity";
import { playPop, playTap, playSuccess } from "@/lib/soundFX";
import { toast } from "sonner";

interface LiveCoStudyLoungeProps {
  buddies: StudyBuddy[];
  onOpenBuddyProfile?: (buddy: StudyBuddy) => void;
}

const COMMON_SUBJECTS = [
  "General Study",
  "Biology",
  "Calculus",
  "Chemistry",
  "History",
  "Psychology",
  "Computer Science",
  "Physics",
  "Economics",
  "Medicine"
];

const STATUS_OPTIONS: StudyPeer["status"][] = [
  "Deep Work",
  "Locking In",
  "Reviewing Cards",
  "Short Break"
];

export const LiveCoStudyLounge: React.FC<LiveCoStudyLoungeProps> = ({
  buddies,
  onOpenBuddyProfile
}) => {
  const navigate = useNavigate();
  const {
    activePeers,
    currentSubject,
    currentStatus,
    updateFocusStatus,
    isBroadcasting,
    toggleBroadcasting,
    myCode
  } = useCoStudyPresence();

  const [isEditingSubject, setIsEditingSubject] = useState(false);
  const [customSubjectInput, setCustomSubjectInput] = useState("");
  const [highFivedIds, setHighFivedIds] = useState<Set<string>>(new Set());

  // Filter peers into other peers vs self
  const otherPeers = activePeers.filter((p) => !p.isSelf);
  const selfPeer = activePeers.find((p) => p.isSelf);

  const handleStudyWithPeer = (peer: StudyPeer) => {
    playPop();
    localStorage.setItem(
      "pz_costudy_partner",
      JSON.stringify({
        id: peer.userId,
        name: peer.name,
        avatar: peer.avatar,
        code: peer.code,
        subject: peer.subject
      })
    );
    toast.success(`Joining co-study session with ${peer.name}!`, {
      description: `Targeting: ${peer.subject}. Stay locked in together!`
    });
    navigate("/timer");
  };

  const handleHighFive = (peer: StudyPeer) => {
    if (highFivedIds.has(peer.userId)) return;
    playSuccess();
    setHighFivedIds((prev) => new Set(prev).add(peer.userId));
    toast.success(`You sent a study nudge to ${peer.name}!`, {
      description: "Both of you earned +5 Focus Motivation."
    });
  };

  const handleSaveSubject = (sub: string) => {
    updateFocusStatus(currentStatus, sub);
    setIsEditingSubject(false);
  };

  return (
    <div className="space-y-6">
      {/* ── TOP HERO: LIVE LOUNGE BANNER & BROADCAST CONTROL ──────────────── */}
      <section className="bg-white border-2 border-black rounded-3xl p-5 md:p-6 shadow-[4px_4px_0px_#1A1A1A] relative overflow-hidden">
        {/* Decorative corner accent */}
        <div className="absolute top-0 right-0 bg-[#FFD13B] border-b-2 border-l-2 border-black px-3.5 py-1 text-[10.5px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
          <span>Realtime Co-Op</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pt-2">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full border border-black/20 bg-[#FAF7F2] text-[11px] font-black text-black/70 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              <span>{activePeers.length} {activePeers.length === 1 ? "Student" : "Students"} in Lounge</span>
            </div>
            <h2 className="text-[22px] md:text-[26px] font-black text-black leading-tight">
              Live Co-Study Lounge
            </h2>
            <p className="text-[12.5px] font-bold text-black/60 mt-1 max-w-xl">
              Study side-by-side with classmates in real time. See who is locked in, synchronize Pomodoros, and keep each other accountable.
            </p>
          </div>

          {/* Quick Actions & Ghost Toggle */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={toggleBroadcasting}
              className={`px-3 py-2 border-2 border-black rounded-xl font-black text-[11.5px] shadow-[2px_2px_0px_#000] active:translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer ${
                isBroadcasting
                  ? "bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border-emerald-950"
                  : "bg-stone-200 hover:bg-stone-300 text-stone-700"
              }`}
              title={isBroadcasting ? "You are visible in the lounge" : "Ghost mode enabled"}
            >
              <span className="material-symbols-outlined text-[16px]">
                {isBroadcasting ? "visibility" : "visibility_off"}
              </span>
              <span>{isBroadcasting ? "Beacon Active" : "Ghost Mode"}</span>
            </button>

            <button
              onClick={() => {
                playPop();
                navigate("/timer");
              }}
              className="px-4 py-2 bg-[#FF4D2E] hover:bg-black text-white border-2 border-black rounded-xl font-black text-[12px] shadow-[2px_2px_0px_#000] active:translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[17px]">timer</span>
              <span>Open Focus Timer</span>
            </button>
          </div>
        </div>

        {/* ── MY CURRENT FOCUS BROADCAST CARD ────────────────────────────────── */}
        <div className="mt-5 pt-5 border-t-2 border-black/10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#FFFDF5] p-4 rounded-2xl border-2 border-black/15 shadow-[2px_2px_0px_#1A1A1A]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white border-2 border-black flex items-center justify-center text-[22px] shadow-[2px_2px_0px_#000] shrink-0 overflow-hidden">
              {selfPeer?.avatar?.startsWith("/") || selfPeer?.avatar?.startsWith("http") ? (
                <img src={selfPeer.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <img src="/buddies/fox_scholar.png" alt="Avatar" className="w-full h-full object-cover" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-black/50">Your Live Status</span>
                <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-black text-white">{myCode}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[14px] font-black text-black">
                  {currentSubject}
                </span>
                <span className="text-black/30">&bull;</span>
                <span className="text-[12px] font-extrabold text-[#FF4D2E] bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  {currentStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Quick status & subject changers */}
          <div className="flex flex-wrap items-center gap-2">
            {STATUS_OPTIONS.map((st) => (
              <button
                key={st}
                onClick={() => updateFocusStatus(st)}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-black transition-all cursor-pointer ${
                  currentStatus === st
                    ? "bg-black text-white border-black shadow-[1px_1px_0px_#000]"
                    : "bg-white hover:bg-stone-100 text-black border-black/30"
                }`}
              >
                {st}
              </button>
            ))}

            <button
              onClick={() => setIsEditingSubject(!isEditingSubject)}
              className="px-2.5 py-1 bg-white hover:bg-stone-100 border border-black/30 rounded-lg text-[11px] font-black text-black flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[13px]">edit</span>
              <span>Change Subject</span>
            </button>
          </div>
        </div>

        {/* Change Subject Inline Bar */}
        {isEditingSubject && (
          <div className="mt-3 p-3 bg-white border-2 border-black rounded-xl animate-in fade-in flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-black uppercase text-black/60 mr-1">Choose Topic:</span>
            {COMMON_SUBJECTS.map((sub) => (
              <button
                key={sub}
                onClick={() => handleSaveSubject(sub)}
                className={`px-2.5 py-1 rounded-md border text-[11px] font-bold cursor-pointer transition-colors ${
                  currentSubject === sub ? "bg-[#3B82F6] text-white border-black" : "bg-[#FAF7F2] hover:bg-stone-200 border-black/20 text-black"
                }`}
              >
                {sub}
              </button>
            ))}
            <div className="flex items-center gap-1 ml-auto">
              <input
                type="text"
                placeholder="Custom topic..."
                value={customSubjectInput}
                onChange={(e) => setCustomSubjectInput(e.target.value)}
                className="px-2 py-1 text-[11px] border border-black rounded font-medium focus:outline-none"
              />
              <button
                onClick={() => {
                  if (customSubjectInput.trim()) {
                    handleSaveSubject(customSubjectInput.trim());
                    setCustomSubjectInput("");
                  }
                }}
                className="px-2.5 py-1 bg-black text-white text-[11px] font-black rounded cursor-pointer"
              >
                Set
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── SHARED CIRCLE WEEKLY QUEST (COMMUNAL ACCOUNTABILITY) ─────────────── */}
      <section className="bg-[#FFFDF5] border-2 border-black rounded-2xl p-5 shadow-[3px_3px_0px_#1A1A1A]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFD13B] border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#000] shrink-0">
              <span className="material-symbols-outlined text-[20px]">track_changes</span>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-[#FF4D2E]">Shared Accountability</span>
              <h3 className="text-[16px] font-black text-black">Circle Weekly Quest: 300 Focus Minutes</h3>
            </div>
          </div>
          <div className="text-[12px] font-black text-black/70 bg-white border border-black/20 px-3 py-1 rounded-xl shrink-0">
            Progress: <span className="text-[#FF4D2E] font-black">215 / 300 min</span> (71%)
          </div>
        </div>

        {/* Quest Progress Bar */}
        <div className="w-full bg-[#FAF7F2] border-2 border-black rounded-full h-4 overflow-hidden p-0.5 shadow-inner">
          <div
            className="bg-[#10B981] h-full rounded-full transition-all duration-500 border-r border-black"
            style={{ width: "71%" }}
          />
        </div>

        <div className="flex items-center justify-between mt-2.5 text-[11px] font-bold text-black/60">
          <span>85 minutes left this week to complete the quest!</span>
          <span className="flex items-center gap-1 text-black font-black">
            <span>Reward: Circle Master Badge</span>
            <span className="material-symbols-outlined text-[15px]">military_tech</span>
          </span>
        </div>
      </section>

      {/* ── WHO'S LOCKED IN RIGHT NOW ───────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#FF4D2E] text-[20px]">groups</span>
            <h3 className="text-[17px] font-black text-black">Who&apos;s Locked In Right Now</h3>
          </div>
          <span className="text-[11px] font-bold text-black/50">
            {otherPeers.length} {otherPeers.length === 1 ? "classmate" : "classmates"} active
          </span>
        </div>

        {otherPeers.length === 0 ? (
          <div className="border-2 border-dashed border-black/25 rounded-2xl bg-white p-8 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#FFF9E6] border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#000] mb-3">
              <span className="material-symbols-outlined text-[26px]">local_cafe</span>
            </div>
            <h4 className="text-[16px] font-black text-black">The Lounge is Quiet Right Now</h4>
            <p className="text-[12.5px] font-medium text-black/60 max-w-md mx-auto mt-1 mb-4">
              None of your peers are currently live in the lounge. Start your focus timer now and your beacon will appear for friends when they log in!
            </p>
            <button
              onClick={() => {
                playPop();
                navigate("/timer");
              }}
              className="px-4 py-2 bg-black hover:bg-[#FF4D2E] text-white font-black text-[12px] rounded-xl transition-colors cursor-pointer shadow-[2px_2px_0px_#000] active:translate-y-0.5"
            >
              Start Focus Session &rarr;
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {otherPeers.map((peer) => {
              const hasHighFived = highFivedIds.has(peer.userId);
              return (
                <div
                  key={peer.userId}
                  className="bg-white border-2 border-black rounded-2xl p-4 shadow-[3px_3px_0px_#1A1A1A] flex flex-col justify-between hover:-translate-y-0.5 transition-transform"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-[#FAF7F2] border-2 border-black flex items-center justify-center text-[20px] shadow-xs shrink-0">
                          {peer.avatar}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-[13.5px] font-black text-black truncate leading-tight">
                            {peer.name}
                          </h4>
                          <span className="text-[10px] font-bold text-black/50 block">
                            {peer.code}
                          </span>
                        </div>
                      </div>

                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 text-[10px] font-black uppercase">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Live
                      </span>
                    </div>

                    <div className="bg-[#FAF7F2] border border-black/15 rounded-xl p-2.5 mb-3">
                      <div className="text-[9.5px] font-black uppercase tracking-wider text-black/45">Current Topic</div>
                      <div className="text-[13px] font-black text-black truncate mt-0.5">
                        {peer.subject}
                      </div>
                      <div className="text-[11px] font-bold text-[#FF4D2E] mt-0.5">
                        {peer.status}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-black/10">
                    <button
                      onClick={() => handleHighFive(peer)}
                      disabled={hasHighFived}
                      className={`flex-1 py-1.5 border-2 border-black rounded-xl font-black text-[11px] shadow-xs cursor-pointer flex items-center justify-center gap-1 active:translate-y-0.5 transition-all ${
                        hasHighFived ? "bg-emerald-100 text-emerald-800 border-emerald-900" : "bg-white hover:bg-[#FAF7F2] text-black"
                      }`}
                    >
                      <span>{hasHighFived ? "Nudged!" : "Nudge"}</span>
                      <span className="material-symbols-outlined text-[14px]">waving_hand</span>
                    </button>

                    <button
                      onClick={() => handleStudyWithPeer(peer)}
                      className="flex-1 py-1.5 bg-[#FF4D2E] hover:bg-black text-white border-2 border-black rounded-xl font-black text-[11px] shadow-xs cursor-pointer flex items-center justify-center gap-1 active:translate-y-0.5 transition-all"
                    >
                      <span className="material-symbols-outlined text-[13px]">timer</span>
                      <span>Study With</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
