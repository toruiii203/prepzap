import { useNavigate } from "react-router-dom";
import { SharedSidebar } from "@/components/SharedSidebar";
import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function Challenges() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Daily seed logic to rotate challenges
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);

  const streakDays = [
    { day: "M", completed: true },
    { day: "T", completed: true },
    { day: "W", completed: true },
    { day: "T", completed: true, activeToday: true },
    { day: "F", completed: false },
    { day: "S", completed: false },
    { day: "S", completed: false },
  ];

  const allChallenges = [
    {
      id: "perfect-recall",
      tag: "Daily 5",
      tagStyle: "bg-black text-white",
      icon: "star",
      iconStyle: "text-[#F5A623]",
      title: "Perfect Recall",
      desc: "Complete 5 sets of flashcards without a single mistake.",
      cta: "START ATTEMPT",
      ctaAction: () => navigate("/flashcards?challenge=true"),
    },
    {
      id: "deep-work-titan",
      tag: "Boss Round",
      tagStyle: "bg-[#FF4D2E] text-white",
      icon: "skull",
      iconStyle: "text-black",
      title: "Deep Work Titan",
      desc: "Log 2 hours of focus timer today.",
      cta: "RESUME FOCUS",
      ctaAction: () => navigate("/timer"),
    },
    {
      id: "morning-sprint",
      tag: "Daily Quiz",
      tagStyle: "bg-black text-white",
      icon: "psychology",
      iconStyle: "text-[#F5A623]",
      title: "Morning Sprint",
      desc: "Quick 10-question AI-generated review of your notes.",
      expiry: "EXPIRES IN 4H",
      cta: "TAKE QUIZ",
      ctaAction: () => navigate("/arena"),
    },
    {
      id: "quick-study-champ",
      tag: "Daily 5",
      tagStyle: "bg-black text-white",
      icon: "bolt",
      iconStyle: "text-[#F5A623]",
      title: "Quick Study Champ",
      desc: "Upload a document and extract 15 key points.",
      cta: "UPLOAD DOC",
      ctaAction: () => navigate("/sources"),
    },
    {
      id: "ai-tutor-session",
      tag: "Learning",
      tagStyle: "bg-blue-600 text-white",
      icon: "robot_2",
      iconStyle: "text-white",
      title: "Tutor Me",
      desc: "Spend 20 minutes conversing with your AI Tutor.",
      cta: "OPEN TUTOR",
      ctaAction: () => navigate("/tutor"),
    },
    {
      id: "knowledge-share",
      tag: "Community",
      tagStyle: "bg-black text-white",
      icon: "groups",
      iconStyle: "text-[#F5A623]",
      title: "Knowledge Share",
      desc: "Share one study guide with your class peer group.",
      cta: "SHARE GUIDE",
      isShare: true,
    },
  ];

  // Rotate based on dayOfYear
  const dailyChallenges = [
    allChallenges[dayOfYear % allChallenges.length],
    allChallenges[(dayOfYear + 1) % allChallenges.length],
    allChallenges[(dayOfYear + 2) % allChallenges.length],
    allChallenges[(dayOfYear + 3) % allChallenges.length],
  ];

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.origin + "/share/guide");
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const StreakBar = () => (
    <div className="flex justify-between items-center gap-2">
      {streakDays.map((st, idx) => (
        <div key={idx} className={`flex-1 h-12 border-2 flex items-center justify-center transition-all ${
          st.completed ? "bg-black text-white shadow-[2px_2px_rgba(0,0,0,1)]"
          : st.activeToday ? "bg-white border-[#E8534A] border-[3px] text-black"
          : "bg-white border-black text-neutral-400"
        }`}>
          <span className="font-black text-[13px] z-10">{st.day}</span>
        </div>
      ))}
    </div>
  );

  const StaticCard = ({ ch }: { ch: any }) => (
    <div className="group bg-[#FAF7F2] border-2 border-black flex flex-col h-[200px]" style={{ boxShadow: "5px 5px 0px #000" }}>
      <div className="px-4 py-3 border-b-2 border-black flex justify-between items-center">
        <span className={`text-[12px] font-black px-2 py-1 uppercase ${ch.tagStyle}`}>{ch.tag}</span>
        <span className={`material-symbols-outlined ${ch.iconStyle}`} style={{ fontVariationSettings: "'FILL' 1" }}>{ch.icon}</span>
      </div>
      <div className="p-4 flex-1 flex flex-col justify-center">
        <p className="font-black text-[18px] mb-1">{ch.title}</p>
        <p className="text-[13px] text-black/60 font-medium leading-relaxed">{ch.desc}</p>
      </div>
      <button
        onClick={ch.isShare ? () => setShareModalOpen(true) : ch.ctaAction}
        className="w-full py-3 border-t-2 border-black text-[13px] font-black bg-[#FAF7F2] group-hover:bg-black group-hover:text-white transition-colors active:translate-x-0.5 active:translate-y-0.5"
      >
        {ch.cta}
      </button>
    </div>
  );

  const LockedCard = ({ title, hint }: { title: string; hint: string }) => (
    <div className="relative bg-[#f3f3f3] border-2 border-black opacity-60 select-none flex flex-col justify-center h-[200px]">
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="bg-black text-white p-3 shadow-[2px_2px_0px_#000]">
          <span className="material-symbols-outlined text-[28px]">lock</span>
        </div>
      </div>
      <div className="px-4 py-3 border-b-2 border-black">
        <span className="text-[12px] font-black px-2 py-1 bg-black/30 text-white uppercase">Mystery</span>
      </div>
      <div className="p-4 blur-sm flex-1">
        <p className="font-black text-[18px] mb-1">{title}</p>
        <p className="text-[13px] text-black/60 mb-4">{hint}</p>
      </div>
    </div>
  );

  const ShareModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-[#FAF7F2] border-2 border-black w-full max-w-md" style={{ boxShadow: "6px 6px 0px #000" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b-2 border-black">
          <h3 className="font-black text-[18px]">Share Study Guide</h3>
          <button onClick={() => setShareModalOpen(false)} className="material-symbols-outlined text-black hover:text-[#FF4D2E]">close</button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <p className="text-[14px] text-black/60 font-medium">Share your current study guide with your peer group to complete this challenge.</p>
          <div className="flex gap-2">
            <div className="flex-1 border-2 border-black bg-white px-3 py-2 text-[13px] font-bold text-black/50 truncate">
              {window.location.origin}/share/guide
            </div>
            <button onClick={handleCopyLink}
              className={`px-4 py-2 border-2 border-black font-black text-[13px] transition-colors ${copiedLink ? "bg-green-500 text-white" : "bg-black text-white hover:bg-[#FF4D2E]"}`}>
              {copiedLink ? "Copied!" : "Copy"}
            </button>
          </div>
          <div className="flex gap-3">
            <button className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-black font-black text-[13px] bg-white hover:bg-[#ebe8e3] transition-colors">
              <span className="material-symbols-outlined text-[18px]">share</span>Share to Group
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-black font-black text-[13px] bg-white hover:bg-[#ebe8e3] transition-colors">
              <span className="material-symbols-outlined text-[18px]">mail</span>Send Email
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full bg-[#FAF7F2] flex flex-col" style={{ minHeight: "100dvh" }}>

      <SharedSidebar active="/challenges" />

      {shareModalOpen && <ShareModal />}

      {/* DESKTOP LAYOUT */}
      <div className="hidden md:flex md:ml-64 flex-col min-h-screen">
        <header className="h-16 flex items-center justify-between px-8 border-b-2 border-black bg-[#FAF7F2] shrink-0 z-30">
          <div className="flex items-center gap-4">
            <span className="text-[22px] font-black tracking-tight">DAILY CHALLENGES</span>
            <div className="w-px h-6 bg-black/20" />
            <div className="flex items-center gap-2 border-2 border-black rounded-full px-3 py-1 bg-[#F0EDE0]">
              <span className="material-symbols-outlined text-[#FF4D2E] text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
              <span className="text-[12px] font-black">{profile?.streak ?? 0} Day Streak</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div onClick={() => navigate("/profile")}
              className="w-10 h-10 border-2 border-black bg-[#ae2925] text-white flex items-center justify-center font-black text-[14px] cursor-pointer hover:opacity-90">
              {profile?.display_name?.charAt(0)?.toUpperCase() ?? "S"}
            </div>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden p-8">
          <div className="w-full max-w-4xl mx-auto flex flex-col">
            
            <div className="mb-8">
              <h3 className="text-[14px] font-black uppercase tracking-widest text-black/50 mb-3">Your Weekly Activity</h3>
              <StreakBar />
            </div>

            <div className="mb-6">
              <h3 className="text-[18px] font-black uppercase tracking-widest">Today's Quests</h3>
              <p className="text-[14px] text-black/60 font-medium">Complete these daily challenges to boost your study streak and earn rewards.</p>
            </div>

            <div className="grid grid-cols-3 gap-6">
              {dailyChallenges.map((ch) => <StaticCard key={ch.id} ch={ch} />)}
              <LockedCard title="The Archivist" hint="Unlocked after 14-day streak. Keep pushing to reveal." />
              <LockedCard title="Grandmaster" hint="Complete all monthly challenges to unlock the vault." />
            </div>

          </div>
        </div>
      </div>

      {/* MOBILE LAYOUT */}
      <div className="md:hidden w-full flex flex-col bg-[#FAF7F2]">
        <header className="w-full top-0 sticky bg-[#FAF7F2] border-b-2 border-black z-50">
          <div className="flex items-center justify-between px-5 h-14">
            <button onClick={() => navigate(-1)}
              className="flex items-center justify-center border-2 border-black bg-white w-9 h-9 shadow-[2px_2px_0px_#000]">
              <span className="material-symbols-outlined text-black text-[18px]">arrow_back</span>
            </button>
            <span className="font-black text-[18px]">Daily Quests</span>
            <button onClick={() => navigate("/dashboard")}
              className="flex items-center justify-center w-9 h-9 hover:bg-[#ebe8e3]">
              <span className="material-symbols-outlined text-black">emoji_events</span>
            </button>
          </div>
        </header>

        <main className="flex-1 flex flex-col px-5 pb-24 pt-6 gap-6">
          <section className="flex flex-col gap-3">
            <div className="flex justify-between items-end mb-1">
              <h2 className="font-black text-[16px]">Streak Log</h2>
              <span className="text-[#ae2925] font-black text-[13px]">{profile?.streak ?? 0} Day Streak</span>
            </div>
            <StreakBar />
          </section>

          <section className="flex flex-col gap-4 mt-2">
            <h3 className="font-black text-[16px]">Today's Quests</h3>
            <p className="text-[13px] text-black/60 font-medium -mt-2">Complete these daily challenges to boost your study streak.</p>
            {dailyChallenges.map((ch) => (
              <div key={ch.id} className="group bg-white border-2 border-black flex flex-col overflow-hidden shadow-[3px_3px_0px_#000]">
                <div className="px-4 py-3 border-b-2 border-black flex justify-between items-center">
                  <span className={`text-[11px] font-black px-2 py-1 uppercase tracking-wider ${ch.tagStyle}`}>{ch.tag}</span>
                  <span className={`material-symbols-outlined ${ch.iconStyle}`} style={{ fontVariationSettings: "'FILL' 1" }}>{ch.icon}</span>
                </div>
                <div className="p-4 flex-1">
                  <p className="font-black text-[16px] mb-1">{ch.title}</p>
                  <p className="text-[13px] text-black/60 font-bold mb-3 leading-relaxed">{ch.desc}</p>
                </div>
                <button
                  onClick={ch.isShare ? () => setShareModalOpen(true) : ch.ctaAction}
                  className="w-full py-3.5 border-t-2 border-black text-[13px] font-black bg-white hover:bg-black hover:text-white transition-colors cursor-pointer">
                  {ch.cta}
                </button>
              </div>
            ))}
            
            {[
              { title: "The Archivist", hint: "Unlocked after 14-day streak." },
              { title: "Grandmaster", hint: "Complete all monthly challenges." },
            ].map((lc) => (
              <div key={lc.title} className="relative bg-[#f3f3f3] border-2 border-black opacity-60 select-none overflow-hidden min-h-[100px] flex items-center justify-center shadow-[3px_3px_0px_#000]">
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <div className="bg-black text-white p-3">
                    <span className="material-symbols-outlined text-[24px]">lock</span>
                  </div>
                </div>
                <div className="blur-sm p-4 w-full">
                  <p className="font-black text-[16px]">{lc.title}</p>
                  <p className="text-[13px] text-black/60">{lc.hint}</p>
                </div>
              </div>
            ))}
          </section>
        </main>
      </div>
    </div>
  );
}
