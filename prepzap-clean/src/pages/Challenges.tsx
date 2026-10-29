import { useNavigate } from "react-router-dom";
import { SharedSidebar } from "@/components/SharedSidebar";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuests } from "@/hooks/useQuests";
import { supabase } from "@/lib/supabase";
import { fireConfetti } from "@/lib/confetti";
import { playSuccess, playPop, playTap } from "@/lib/soundFX";
import { Mascot } from "@/components/Mascot";

interface QuestItem {
  id: string;
  tag: string;
  tagStyle: string;
  icon: string;
  iconStyle: string;
  title: string;
  desc: string;
  xpReward: number;
  route: string;
  ctaText: string;
}

function todayPH(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default function Challenges() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const { completedQuestIds, weeklyActivity, completeQuest, loading } = useQuests();

  const todayKey = todayPH();
  const [claimedQuestIds, setClaimedQuestIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(`pz_claimed_quests_${todayKey}_${user?.id || "anon"}`);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [vaultClaimed, setVaultClaimed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(`pz_claimed_vault_${todayKey}_${user?.id || "anon"}`) === "true";
    } catch {
      return false;
    }
  });

  const [rewardToast, setRewardToast] = useState<{ message: string; xp: number } | null>(null);

  const streakDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
    const count = weeklyActivity[dateStr] || 0;
    const isToday = i === 6;
    return {
      day: ["S", "M", "T", "W", "T", "F", "S"][d.getDay()],
      completed: count >= 2,
      activeToday: isToday && count < 2,
    };
  });

  const baseQuests: QuestItem[] = [
    {
      id: "feynman_teach",
      tag: "Deep Learning",
      tagStyle: "bg-[#10B981] text-white",
      icon: "school",
      iconStyle: "text-[#10B981]",
      title: "Teach Pip in Feynman",
      desc: "Explain any concept to Pip in simple words and get a clarity score.",
      xpReward: 75,
      route: "/teach-it",
      ctaText: "Teach Pip",
    },
    {
      id: "speed_recall",
      tag: "Memory Sprint",
      tagStyle: "bg-[#3B82F6] text-white",
      icon: "bolt",
      iconStyle: "text-[#3B82F6]",
      title: "Flashcard Sprint",
      desc: "Complete 1 active recall flashcard session to strengthen memory retention.",
      xpReward: 50,
      route: "/flashcards",
      ctaText: "Study Cards",
    },
    {
      id: "daily_arena",
      tag: "Competition",
      tagStyle: "bg-[#F59E0B] text-black",
      icon: "military_tech",
      iconStyle: "text-[#F59E0B]",
      title: "Daily Arena Gauntlet",
      desc: "Enter today's 5-question daily challenge to claim your rank on the leaderboard.",
      xpReward: 60,
      route: "/arena",
      ctaText: "Play Arena",
    },
    {
      id: "focus_timer",
      tag: "Discipline",
      tagStyle: "bg-[#8B5CF6] text-white",
      icon: "timer",
      iconStyle: "text-[#8B5CF6]",
      title: "Deep Focus Session",
      desc: "Log at least 15 uninterrupted minutes on the Pomodoro focus timer.",
      xpReward: 50,
      route: "/timer",
      ctaText: "Start Focus",
    },
    {
      id: "source_upload",
      tag: "Knowledge Base",
      tagStyle: "bg-black text-white",
      icon: "upload_file",
      iconStyle: "text-black",
      title: "Source Curator",
      desc: "Upload or review a PDF syllabus, notes, or article in your library.",
      xpReward: 50,
      route: "/sources",
      ctaText: "Open Sources",
    },
  ];

  // Number of completed quests today (either via RPC or claimed locally)
  const completedCount = baseQuests.filter(
    (q) => completedQuestIds.has(q.id) || claimedQuestIds.has(q.id)
  ).length;

  const vaultUnlocked = completedCount >= 3;

  const handleClaimQuest = async (quest: QuestItem) => {
    playSuccess();
    fireConfetti();

    const newClaimed = new Set(claimedQuestIds);
    newClaimed.add(quest.id);
    setClaimedQuestIds(newClaimed);
    try {
      localStorage.setItem(
        `pz_claimed_quests_${todayKey}_${user?.id || "anon"}`,
        JSON.stringify(Array.from(newClaimed))
      );
    } catch {}

    // Mark as completed in backend if not already
    await completeQuest(quest.id);

    // Award XP
    if (user && profile) {
      const nextXp = (profile.total_xp || 0) + quest.xpReward;
      const { error } = await supabase
        .from("profiles")
        .update({ total_xp: nextXp })
        .eq("id", user.id);
      if (!error) await refreshProfile();
    }

    setRewardToast({ message: `Claimed ${quest.title}!`, xp: quest.xpReward });
    setTimeout(() => setRewardToast(null), 3500);
  };

  const handleClaimVault = async () => {
    if (!vaultUnlocked || vaultClaimed) return;
    playSuccess();
    fireConfetti();
    setVaultClaimed(true);
    try {
      localStorage.setItem(`pz_claimed_vault_${todayKey}_${user?.id || "anon"}`, "true");
    } catch {}

    const vaultXp = 150;
    if (user && profile) {
      const nextXp = (profile.total_xp || 0) + vaultXp;
      const { error } = await supabase
        .from("profiles")
        .update({ total_xp: nextXp })
        .eq("id", user.id);
      if (!error) await refreshProfile();
    }

    setRewardToast({ message: "Mystery Vault Chest Unlocked! +150 XP & 10 Gems", xp: vaultXp });
    setTimeout(() => setRewardToast(null), 4000);
  };

  return (
    <div className="w-full bg-[#FAF7F2] min-h-[100dvh] flex flex-col">
      <SharedSidebar active="/challenges" />

      {/* Floating XP Reward Toast */}
      {rewardToast && (
        <div className="fixed top-20 right-8 bg-black text-white px-5 py-3 border-2 border-black rounded-xl shadow-[4px_4px_0px_#FFE566] z-50 font-black text-[14px] animate-bounce flex items-center gap-2">
          <span className="material-symbols-outlined text-[#FFE566]" style={{ fontVariationSettings: "'FILL' 1" }}>
            military_tech
          </span>
          <span>{rewardToast.message} (+{rewardToast.xp} XP)</span>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 md:ml-64 flex flex-col">

        {/* Top Header */}
        <header className="h-16 px-4 md:px-8 border-b-2 border-black bg-[#FAF7F2] flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-3 md:gap-4">
            <div>
              <div className="flex items-center gap-2 text-[10px] md:text-[11px] font-bold text-black/40 uppercase tracking-widest leading-none mb-0.5">
                <span>Rewards</span>
                <span>/</span>
                <span className="text-black">Bounty Board</span>
              </div>
              <h1 className="text-[18px] md:text-[22px] font-black tracking-tight leading-none">
                Daily Quests & Bounties
              </h1>
            </div>

            <div className="hidden sm:block w-px h-7 bg-black/20" />

            {/* Streak Indicator */}
            <div className="flex items-center gap-1.5 border-2 border-black rounded-full px-3 py-1 bg-[#F0EDE0] shadow-[2px_2px_0px_#000]">
              <span className="material-symbols-outlined text-[#FF5757] text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                local_fire_department
              </span>
              <span className="text-[12px] font-black">{profile?.streak ?? 0} Day Streak</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 border-2 border-black rounded-full px-3 py-1 bg-[#FFE566] text-[12px] font-black shadow-[2px_2px_0px_#000]">
              <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                stars
              </span>
              <span>{(profile?.total_xp || 0).toLocaleString()} XP</span>
            </div>

            <div
              onClick={() => navigate("/profile")}
              className="w-9 h-9 md:w-10 md:h-10 border-2 border-black bg-black text-white rounded-lg flex items-center justify-center font-black text-[13px] md:text-[14px] cursor-pointer shadow-[2px_2px_0px_#000] active:translate-y-0.5 hover:bg-[#10B981] transition-all"
            >
              {profile?.display_name?.charAt(0)?.toUpperCase() ?? "S"}
            </div>
          </div>
        </header>

        {/* Content Container */}
        <main className="p-4 md:p-8 max-w-6xl w-full mx-auto flex flex-col gap-6 pb-24">

          {/* ── Top Hero: Daily Mystery Vault Chest ── */}
          <section className="bg-white border-3 border-black rounded-2xl p-5 md:p-6 shadow-[5px_5px_0px_#000] flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
            <div className="flex items-center gap-4 md:gap-6 z-10">
              {/* Chest Icon / Graphic */}
              <div
                className={`w-20 h-20 md:w-24 md:h-24 rounded-2xl border-3 border-black flex items-center justify-center shadow-[4px_4px_0px_#000] shrink-0 transition-transform ${
                  vaultClaimed
                    ? "bg-[#10B981] text-white"
                    : vaultUnlocked
                    ? "bg-[#FFE566] text-black animate-pulse"
                    : "bg-[#FAF7F2] text-black/40"
                }`}
              >
                <span className="material-symbols-outlined text-[44px] md:text-[52px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {vaultClaimed ? "lock_open" : vaultUnlocked ? "redeem" : "lock"}
                </span>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-[#FF5757] text-white border border-black rounded-md text-[10px] md:text-[11px] font-black uppercase tracking-wider">
                    Today's Vault Chest
                  </span>
                  <span className="text-[12px] font-bold text-black/50">
                    Resets in 24h
                  </span>
                </div>

                <h2 className="text-[18px] md:text-[22px] font-black text-black mt-1">
                  {vaultClaimed
                    ? "Vault Chest Claimed! 🎉"
                    : vaultUnlocked
                    ? "Vault Chest Unlocked! Tap to Claim!"
                    : "Complete 3 Daily Quests to Unlock"}
                </h2>

                <p className="text-[12px] md:text-[13px] font-bold text-black/60 mt-1">
                  Rewards: <span className="text-black font-black">+150 Bonus XP</span> • <span className="text-black font-black">10 Study Gems</span> • <span className="text-black font-black">Streak Shield</span>
                </p>

                {/* Progress Bar */}
                <div className="mt-3 flex items-center gap-3">
                  <div className="w-48 md:w-64 h-3.5 bg-[#FAF7F2] border-2 border-black rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        vaultUnlocked ? "bg-[#10B981]" : "bg-[#FFE566]"
                      }`}
                      style={{ width: `${Math.min(100, (completedCount / 3) * 100)}%` }}
                    />
                  </div>
                  <span className="font-black text-[12px] text-black">
                    {completedCount} / 3 Completed
                  </span>
                </div>
              </div>
            </div>

            {/* Claim Vault Action Button */}
            <div className="w-full md:w-auto shrink-0 z-10">
              {vaultClaimed ? (
                <div className="px-5 py-3 bg-[#ECFDF5] border-2 border-black rounded-xl font-black text-[13px] text-[#065F46] flex items-center justify-center gap-2 shadow-[2px_2px_0px_#000]">
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  <span>Claimed for Today</span>
                </div>
              ) : vaultUnlocked ? (
                <button
                  onClick={handleClaimVault}
                  className="w-full md:w-auto px-6 py-3.5 bg-[#10B981] hover:bg-black text-white border-2 border-black rounded-xl font-black text-[14px] shadow-[4px_4px_0px_#000] active:translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer animate-bounce"
                >
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    redeem
                  </span>
                  <span>Claim Vault Chest (+150 XP)</span>
                </button>
              ) : (
                <button
                  disabled
                  className="w-full md:w-auto px-6 py-3 bg-[#FAF7F2] text-black/40 border-2 border-black/30 rounded-xl font-black text-[13px] cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">lock</span>
                  <span>Locked ({3 - completedCount} quests left)</span>
                </button>
              )}
            </div>
          </section>

          {/* ── Weekly Activity Streak Tracker ── */}
          <section className="bg-white border-2 border-black rounded-2xl p-4 md:p-5 shadow-[4px_4px_0px_#000] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-black">calendar_today</span>
                <h3 className="font-black text-[14px] md:text-[15px] uppercase tracking-wider text-black">
                  Your 7-Day Study Momentum
                </h3>
              </div>
              <span className="text-[12px] font-bold text-black/50">
                {profile?.streak ?? 0} consecutive active days
              </span>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {streakDays.map((st, idx) => (
                <div
                  key={idx}
                  className={`h-12 border-2 border-black rounded-xl flex flex-col items-center justify-center transition-all ${
                    st.completed
                      ? "bg-black text-white shadow-[2px_2px_0px_#000]"
                      : st.activeToday
                      ? "bg-[#FFE566] text-black font-black"
                      : "bg-[#FAF7F2] text-black/40"
                  }`}
                >
                  <span className="font-black text-[13px]">{st.day}</span>
                  <span className="text-[9px] font-extrabold uppercase">
                    {st.completed ? "✓" : st.activeToday ? "Today" : "•"}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* ── Active Daily Quests Grid ── */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[18px] md:text-[20px] font-black tracking-tight text-black">
                  Today's Active Bounties
                </h3>
                <p className="text-[12px] md:text-[13px] font-bold text-black/50">
                  Earn XP, level up your scholar rank, and unlock your daily chest.
                </p>
              </div>

              <span className="px-3 py-1 bg-white border-2 border-black rounded-full font-black text-[12px] shadow-[2px_2px_0px_#000]">
                {completedCount} of {baseQuests.length} done
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {baseQuests.map((quest) => {
                const isCompleted = completedQuestIds.has(quest.id) || claimedQuestIds.has(quest.id);
                const isClaimed = claimedQuestIds.has(quest.id);

                return (
                  <div
                    key={quest.id}
                    className={`border-2 border-black rounded-2xl p-4 md:p-5 flex flex-col justify-between gap-4 transition-all ${
                      isClaimed
                        ? "bg-[#FAF7F2] shadow-[2px_2px_0px_#000] opacity-80"
                        : isCompleted
                        ? "bg-white shadow-[4px_4px_0px_#FFE566] border-[#FFE566]"
                        : "bg-white shadow-[4px_4px_0px_#000]"
                    }`}
                  >
                    {/* Card Top: Tag + XP Badge */}
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md border border-black ${quest.tagStyle}`}>
                        {quest.tag}
                      </span>

                      <div className="flex items-center gap-1 px-2.5 py-0.5 bg-[#FFE566] border border-black rounded-full font-black text-[11px]">
                        <span className="material-symbols-outlined text-[13px]">stars</span>
                        <span>+{quest.xpReward} XP</span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl border-2 border-black bg-[#FAF7F2] flex items-center justify-center shrink-0">
                        <span className={`material-symbols-outlined text-[22px] ${quest.iconStyle}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                          {quest.icon}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-black text-[15px] text-black leading-snug">
                          {quest.title}
                        </h4>
                        <p className="text-[12px] font-bold text-black/60 mt-1 leading-snug">
                          {quest.desc}
                        </p>
                      </div>
                    </div>

                    {/* Card Bottom CTA */}
                    <div>
                      {isClaimed ? (
                        <div className="w-full py-2.5 bg-[#ECFDF5] border-2 border-black rounded-xl text-center font-black text-[12px] text-[#065F46] flex items-center justify-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px]">check_circle</span>
                          <span>Claimed (+{quest.xpReward} XP)</span>
                        </div>
                      ) : isCompleted ? (
                        <button
                          onClick={() => handleClaimQuest(quest)}
                          className="w-full py-2.5 bg-[#FFE566] hover:bg-[#FFD13B] text-black border-2 border-black rounded-xl font-black text-[13px] shadow-[2px_2px_0px_#000] active:translate-y-0.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer animate-pulse"
                        >
                          <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                            redeem
                          </span>
                          <span>Claim +{quest.xpReward} XP</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => navigate(quest.route)}
                          className="w-full py-2.5 bg-white hover:bg-black hover:text-white text-black border-2 border-black rounded-xl font-black text-[12px] shadow-[2px_2px_0px_#000] active:translate-y-0.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <span>{quest.ctaText}</span>
                          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── Weekly Boss Bounties ── */}
          <section className="bg-white border-2 border-black rounded-2xl p-5 shadow-[4px_4px_0px_#000] flex flex-col gap-4">
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[22px] text-[#FF5757]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  military_tech
                </span>
                <div>
                  <h3 className="font-black text-[16px] text-black">Weekly Boss Bounties</h3>
                  <p className="text-[11px] font-bold text-black/50">High-yield milestones that reset every Sunday</p>
                </div>
              </div>

              <span className="text-[11px] font-black px-2.5 py-1 bg-[#FAF7F2] border border-black rounded-md">
                Reset in 4 days
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Boss Bounty 1 */}
              <div className="border-2 border-black rounded-xl p-4 bg-[#FAF7F2] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl border-2 border-black bg-white flex items-center justify-center font-black text-[20px] shadow-[2px_2px_0px_#000]">
                    🏆
                  </div>
                  <div>
                    <span className="px-2 py-0.5 bg-[#FF5757] text-white border border-black rounded text-[10px] font-black uppercase">
                      Epic Bounty
                    </span>
                    <h4 className="font-black text-[14px] text-black mt-0.5">Arena Gladiator</h4>
                    <p className="text-[11px] font-bold text-black/60">Win 2 Live Battles in the Arena</p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5">
                  <span className="font-black text-[12px] text-black">+300 XP</span>
                  <button
                    onClick={() => navigate("/rooms")}
                    className="px-3 py-1.5 bg-black hover:bg-[#10B981] text-white text-[11px] font-black rounded-lg border border-black cursor-pointer transition-colors"
                  >
                    Battle Now
                  </button>
                </div>
              </div>

              {/* Boss Bounty 2 */}
              <div className="border-2 border-black rounded-xl p-4 bg-[#FAF7F2] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl border-2 border-black bg-white flex items-center justify-center font-black text-[20px] shadow-[2px_2px_0px_#000]">
                    🎓
                  </div>
                  <div>
                    <span className="px-2 py-0.5 bg-[#10B981] text-white border border-black rounded text-[10px] font-black uppercase">
                      Legendary
                    </span>
                    <h4 className="font-black text-[14px] text-black mt-0.5">Feynman Master</h4>
                    <p className="text-[11px] font-bold text-black/60">Score 80+ clarity in Teach It</p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5">
                  <span className="font-black text-[12px] text-black">+250 XP</span>
                  <button
                    onClick={() => navigate("/teach-it")}
                    className="px-3 py-1.5 bg-black hover:bg-[#10B981] text-white text-[11px] font-black rounded-lg border border-black cursor-pointer transition-colors"
                  >
                    Teach Pip
                  </button>
                </div>
              </div>
            </div>
          </section>

        </main>
      </div>
    </div>
  );
}
