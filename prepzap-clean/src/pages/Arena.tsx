import { getOrCreateDailyChallenge, type DailyQuiz } from "@/lib/dailyChallenge";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { SharedSidebar } from "@/components/SharedSidebar";
import { withTimeout } from "@/lib/withTimeout";
import { useTutorialModal } from "@/hooks/useTutorialModal";
import { TutorialModal } from "@/components/TutorialModal";
import { TUTORIAL_CONTENT } from "@/lib/tutorialContent";
import { playPop, playTap } from "@/lib/soundFX";

// ── Types ─────────────────────────────────────────────────────────────────────
interface LeaderboardEntry {
  user_id: string;
  score: number;
  time_taken: number;
  display_name: string;
}

// Only real user submissions from Supabase are displayed on the championship leaderboard

type LeaderboardTab = "today" | "alltime";

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function todayPH(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default function Arena() {
  const tutorial = useTutorialModal("/arena");
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [dailyQuiz, setDailyQuiz] = useState<DailyQuiz | null>(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [leaderboardTab, setLeaderboardTab] = useState<LeaderboardTab>("today");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingQuiz, setLoadingQuiz] = useState(true);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
  const [leaderboardError, setLeaderboardError] = useState(false);
  const [leaderboardRetryTick, setLeaderboardRetryTick] = useState(0);
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    const tick = () => {
      const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000).toString().padStart(2, "0");
      const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, "0");
      const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, "0");
      setCountdown(`${h}:${m}:${s}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let active = true;
    const safetyTimer = setTimeout(() => {
      if (active) setLoadingQuiz(false);
    }, 2500);

    const load = async () => {
      setLoadingQuiz(true);
      const today = todayPH();
      try {
        const quiz = await getOrCreateDailyChallenge();
        if (active) setDailyQuiz(quiz);
        if (quiz && user) {
          const localDone =
            localStorage.getItem(`pz_daily_done_${today}_${user.id}`) ||
            localStorage.getItem(`pz_daily_done_${today}`);
          if (localDone) {
            if (active) setAlreadySubmitted(true);
          } else {
            const query = supabase
              .from("daily_challenge_submissions")
              .select("id")
              .eq("challenge_date", today)
              .eq("user_id", user.id)
              .maybeSingle();

            const { data: sub } = await withTimeout(query, 6000, "daily challenge submission");
            if (sub && active) {
              setAlreadySubmitted(true);
              try {
                localStorage.setItem(`pz_daily_done_${today}_${user.id}`, "true");
              } catch {}
            } else if (active) {
              setAlreadySubmitted(false);
            }
          }
        }
      } catch (err) {
        console.warn("Daily challenge check warning:", err);
      } finally {
        if (active) setLoadingQuiz(false);
        clearTimeout(safetyTimer);
      }
    };
    load();
    return () => {
      active = false;
      clearTimeout(safetyTimer);
    };
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    const safetyTimer = setTimeout(() => {
      if (!cancelled) setLoadingLeaderboard(false);
    }, 7000);

    const load = async () => {
      setLoadingLeaderboard(true);
      setLeaderboardError(false);
      let entries: LeaderboardEntry[] = [];
      let fetchFailed = false;
      try {
        let query = supabase
          .from("daily_challenge_submissions")
          .select("user_id, score, time_taken_seconds, display_name")
          .order("score", { ascending: false })
          .order("time_taken_seconds", { ascending: true })
          .limit(100);
        if (leaderboardTab === "today") query = query.eq("challenge_date", todayPH());

        const { data } = await withTimeout(query, 6000, "daily leaderboard");
        if (data && data.length > 0) {
          // Resolve any missing display names against profiles
          const missingIds = data
            .filter((r) => !r.display_name || r.display_name.startsWith("Player"))
            .map((r) => r.user_id)
            .filter(Boolean);

          let nameMap = new Map<string, string>();
          if (missingIds.length > 0) {
            try {
              const { data: profs } = await supabase
                .from("profiles")
                .select("id, full_name, display_name, username")
                .in("id", missingIds);
              (profs || []).forEach((p) => {
                const name = p.display_name || p.full_name || p.username;
                if (name) nameMap.set(p.id, name);
              });
            } catch {}
          }

          entries = data.map((row, i) => ({
            user_id: row.user_id,
            score: row.score,
            time_taken: row.time_taken_seconds,
            display_name: row.display_name || nameMap.get(row.user_id) || `Student ${i + 1}`,
          }));
        }
      } catch (err) {
        console.warn("Leaderboard fetch error:", err);
        fetchFailed = true;
      }

      // Deduplicate by user so each player appears only ONCE with their highest score
      const userBestMap = new Map<string, LeaderboardEntry>();
      for (const item of entries) {
        const key = item.user_id && item.user_id !== "local_user"
          ? item.user_id
          : item.display_name.trim().toLowerCase();
        const existing = userBestMap.get(key);
        if (!existing) {
          userBestMap.set(key, item);
        } else if (
          item.score > existing.score ||
          (item.score === existing.score && item.time_taken < existing.time_taken)
        ) {
          userBestMap.set(key, item);
        }
      }

      // Merge local today submissions if any
      try {
        const localKey = `pz_daily_submissions_${todayPH()}`;
        const localRaw = localStorage.getItem(localKey);
        if (localRaw) {
          const localList: {
            user_id: string;
            score: number;
            time_taken_seconds?: number;
            time_taken?: number;
            display_name?: string;
          }[] = JSON.parse(localRaw);
          localList.forEach((item) => {
            const key = item.user_id && item.user_id !== "local_user"
              ? item.user_id
              : (item.display_name || "You").trim().toLowerCase();
            const time = item.time_taken_seconds || item.time_taken || 0;
            const existing = userBestMap.get(key);
            if (!existing) {
              userBestMap.set(key, {
                user_id: item.user_id,
                score: item.score,
                time_taken: time,
                display_name: item.display_name || "You",
              });
            } else if (
              item.score > existing.score ||
              (item.score === existing.score && time < existing.time_taken)
            ) {
              userBestMap.set(key, {
                user_id: item.user_id,
                score: item.score,
                time_taken: time,
                display_name: item.display_name || existing.display_name,
              });
            }
          });
        }
      } catch {}

      // Pure actual student contenders only — no fake benchmark data
      const deduplicated = Array.from(userBestMap.values());
      deduplicated.sort((a, b) => b.score - a.score || a.time_taken - b.time_taken);

      if (cancelled) return;
      setLeaderboard(deduplicated.slice(0, 10));
      setLeaderboardError(false);
      setLoadingLeaderboard(false);
      clearTimeout(safetyTimer);
    };

    load();
    const ch = supabase
      .channel("arena-daily-leaderboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "daily_challenge_submissions" }, load)
      .subscribe();
    return () => {
      cancelled = true;
      clearTimeout(safetyTimer);
      supabase.removeChannel(ch);
    };
  }, [leaderboardTab, leaderboardRetryTick]);

  const handleViewBreakdown = () => {
    const today = todayPH();
    let savedState = null;
    try {
      const raw =
        (user?.id ? localStorage.getItem(`pz_daily_breakdown_${today}_${user.id}`) : null) ||
        localStorage.getItem(`pz_daily_breakdown_${today}`);
      if (raw) savedState = JSON.parse(raw);
    } catch {}
    navigate("/arena/results/daily", { state: savedState });
  };

  const top1 = leaderboard[0];
  const top2 = leaderboard[1];
  const top3 = leaderboard[2];
  const myEntry = leaderboard.find((e) => e.user_id === user?.id);
  const myRankIndex = leaderboard.findIndex((e) => e.user_id === user?.id);

  return (
    <div className="w-full min-h-[100dvh] bg-[#FAF7F2] flex flex-col font-body-md select-none">
      <TutorialModal isOpen={tutorial.isOpen} onDismiss={tutorial.dismiss} features={TUTORIAL_CONTENT["/arena"] || []} title="Arena" />
      <SharedSidebar active="/arena" />

      <div className="flex-1 md:ml-64 flex flex-col pb-24">

        {/* ── Top Header Bar ── */}
        <header className="h-16 px-4 md:px-8 border-b-2 border-black bg-[#FAF7F2] flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[24px] text-black" style={{ fontVariationSettings: "'FILL' 1" }}>
              swords
            </span>
            <div>
              <div className="flex items-center gap-1.5 text-[10px] md:text-[11px] font-black uppercase tracking-widest text-black/40 leading-none mb-0.5">
                <span>Studenius</span>
                <span>/</span>
                <span className="text-black">Arena</span>
              </div>
              <h1 className="text-[18px] md:text-[22px] font-black tracking-tight leading-none">
                Battle Arena
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-[#FFE566] border-2 border-black rounded-full text-[12px] font-black shadow-[2px_2px_0px_#000]">
              <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                local_fire_department
              </span>
              <span>{profile?.streak || 0} Streak</span>
            </div>

            <button
              onClick={() => tutorial.show()}
              className="w-9 h-9 border-2 border-black bg-white hover:bg-black hover:text-white rounded-lg flex items-center justify-center shadow-[2px_2px_0px_#000] active:translate-y-0.5 transition-all cursor-pointer"
              title="Arena Guidance"
            >
              <span className="material-symbols-outlined text-[18px]">help</span>
            </button>
          </div>
        </header>

        {/* ── Main Arena Content ── */}
        <main className="p-4 md:p-8 max-w-6xl w-full mx-auto flex flex-col gap-6">

          {/* ── Hero Tournament Banner ── */}
          <section className="bg-black text-white border-3 border-black rounded-3xl p-6 md:p-8 shadow-[6px_6px_0px_#FFD13B] relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="z-10 max-w-xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-0.5 bg-[#FFD13B] text-black border border-black rounded-full font-black text-[11px] uppercase tracking-wider">
                  Season 1 Championship
                </span>
                <div className="flex items-center gap-1 text-[#10B981] font-bold text-[12px]">
                  <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                  <span>Tournament Active</span>
                </div>
              </div>

              <h2 className="text-[26px] md:text-[34px] font-black tracking-tight leading-tight text-white">
                Prove Your Study Mastery
              </h2>
              <p className="text-[13px] md:text-[14px] text-white/70 font-semibold mt-1.5 leading-relaxed">
                Compete daily on high-yield quiz sprints, enter real-time live battles with classmates, and climb the collegiate rankings.
              </p>

              {/* Tournament Countdown Pill */}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 px-3.5 py-1.5 bg-white/10 border border-white/20 rounded-xl text-[12px] font-bold backdrop-blur-sm">
                  <span className="material-symbols-outlined text-[16px] text-[#FFD13B]">timer</span>
                  <span>Daily Reset In: <strong className="font-black text-[#FFD13B]">{countdown}</strong></span>
                </div>

                <div className="flex items-center gap-2 px-3.5 py-1.5 bg-white/10 border border-white/20 rounded-xl text-[12px] font-bold backdrop-blur-sm">
                  <span className="material-symbols-outlined text-[16px] text-[#10B981]">military_tech</span>
                  <span>Prize: <strong className="font-black text-white">+500 XP & Trophies</strong></span>
                </div>
              </div>
            </div>

            {/* Decorative Battle Graphic */}
            <div className="z-10 shrink-0 self-center md:self-auto flex flex-col items-center">
              <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-[#FFD13B] border-3 border-black text-black flex items-center justify-center shadow-[4px_4px_0px_#FFF] -rotate-3 hover:rotate-0 transition-transform">
                <span className="material-symbols-outlined text-[54px] md:text-[64px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  trophy
                </span>
              </div>
              <span className="text-[11px] font-black uppercase tracking-widest text-[#FFD13B] mt-2">Colosseum Arena</span>
            </div>
          </section>

          {/* ── 3-Card Game Mode Selector ── */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-5">

            {/* Mode 1: Daily Gauntlet */}
            <div className="border-3 border-black bg-white rounded-2xl p-5 shadow-[4px_4px_0px_#000] flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 bg-[#F0A040] text-black border border-black rounded-md text-[10px] font-black uppercase tracking-wider">
                    Daily Gauntlet
                  </span>
                  <span className="text-[11px] font-bold text-black/50">1 Try / Day</span>
                </div>

                <div className="flex items-center gap-3 mt-3">
                  <div className="w-12 h-12 rounded-xl border-2 border-black bg-[#FFF7ED] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[24px] text-[#EA580C]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      target
                    </span>
                  </div>
                  <div>
                    <h3 className="font-black text-[16px] text-black leading-tight">
                      {loadingQuiz ? "Loading challenge..." : dailyQuiz?.topic || "Today's Exam Sprint"}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-[#FAF7F2] border border-black rounded capitalize">
                        {dailyQuiz?.difficulty || "Medium"}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-[#FAF7F2] border border-black rounded">
                        {dailyQuiz?.questions.length || 5} Questions
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-[12px] font-semibold text-black/60 mt-3 leading-relaxed">
                  Fast 5-question sprint based on high-yield exam traps. Scores ranked on accuracy and completion seconds.
                </p>
              </div>

              <div>
                {alreadySubmitted ? (
                  <div className="bg-[#FAF7F2] border-2 border-black p-3 rounded-xl flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-green-700">
                      <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      <span className="font-black text-[12px]">Completed Today!</span>
                    </div>
                    <button
                      onClick={handleViewBreakdown}
                      className="w-full bg-white hover:bg-black hover:text-white text-black font-black text-[12px] py-2 border-2 border-black rounded-lg shadow-[2px_2px_0px_#000] active:translate-y-0.5 transition-all cursor-pointer"
                    >
                      View Today's Breakdown →
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => navigate("/arena/quiz/daily")}
                    className="w-full bg-black hover:bg-[#F0A040] hover:text-black text-white font-black text-[13px] py-3 border-2 border-black rounded-xl shadow-[3px_3px_0px_#F0A040] active:translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Enter Daily Quiz</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                )}
              </div>
            </div>

            {/* Mode 2: Live 1v1 PvP Battles */}
            <div data-guide-target="live-battles" className="border-3 border-black bg-white rounded-2xl p-5 shadow-[4px_4px_0px_#000] flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 bg-[#10B981] text-white border border-black rounded-md text-[10px] font-black uppercase tracking-wider">
                    Live 1v1 Battles
                  </span>
                  <span className="text-[11px] font-bold text-green-700">Multiplayer</span>
                </div>

                <div className="flex items-center gap-3 mt-3">
                  <div className="w-12 h-12 rounded-xl border-2 border-black bg-[#ECFDF5] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[24px] text-[#059669]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      swords
                    </span>
                  </div>
                  <div>
                    <h3 className="font-black text-[16px] text-black leading-tight">
                      PvP Duel Rooms
                    </h3>
                    <p className="text-[11px] font-bold text-black/50 mt-0.5">Real-time head-to-head</p>
                  </div>
                </div>

                <p className="text-[12px] font-semibold text-black/60 mt-3 leading-relaxed">
                  Challenge your classmates or hop into an open room. Speed and accuracy determine the winner live!
                </p>
              </div>

              <button
                onClick={() => navigate("/rooms")}
                className="w-full bg-[#10B981] hover:bg-black text-white font-black text-[13px] py-3 border-2 border-black rounded-xl shadow-[3px_3px_0px_#000] active:translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Open Battle Rooms</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>

            {/* Mode 3: Sudden-Death Arcade */}
            <div className="border-3 border-black bg-white rounded-2xl p-5 shadow-[4px_4px_0px_#000] flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 bg-[#8B5CF6] text-white border border-black rounded-md text-[10px] font-black uppercase tracking-wider">
                    Sudden Death
                  </span>
                  <span className="text-[11px] font-bold text-purple-700">Arcade</span>
                </div>

                <div className="flex items-center gap-3 mt-3">
                  <div className="w-12 h-12 rounded-xl border-2 border-black bg-[#F5F3FF] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[24px] text-[#7C3AED]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      stadia_controller
                    </span>
                  </div>
                  <div>
                    <h3 className="font-black text-[16px] text-black leading-tight">
                      Arcade Sprint
                    </h3>
                    <p className="text-[11px] font-bold text-black/50 mt-0.5">Time trial mini-games</p>
                  </div>
                </div>

                <p className="text-[12px] font-semibold text-black/60 mt-3 leading-relaxed">
                  Play Termle, Anagram Sprint, Memory Match, or Whack-a-Mole to sharpen definition recall against the clock.
                </p>
              </div>

              <button
                onClick={() => navigate("/arcade")}
                className="w-full bg-white hover:bg-black hover:text-white text-black font-black text-[13px] py-3 border-2 border-black rounded-xl shadow-[3px_3px_0px_#000] active:translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Play Arcade Games</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>

          </section>

          {/* ── Championship Podium & Leaderboard ── */}
          <section data-guide-target="daily-leaderboard" className="border-3 border-black bg-white rounded-3xl p-5 md:p-8 shadow-[6px_6px_0px_#000] flex flex-col gap-6">

            {/* Leaderboard Header & Tabs */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b-2 border-black pb-4">
              <div>
                <h3 className="font-black text-[20px] md:text-[22px] text-black flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#F59E0B]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    military_tech
                  </span>
                  <span>Championship Leaderboard</span>
                </h3>
                <p className="text-[12px] font-bold text-black/50 mt-0.5">
                  Ranked by highest score and fastest finish time
                </p>
              </div>

              <div className="flex items-center gap-2 bg-[#FAF7F2] p-1 border-2 border-black rounded-xl shadow-[2px_2px_0px_#000]">
                {(["today", "alltime"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      playTap();
                      setLeaderboardTab(tab);
                    }}
                    className={`text-[12px] font-black px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
                      leaderboardTab === tab
                        ? "bg-black text-white shadow-xs"
                        : "text-black/60 hover:text-black"
                    }`}
                  >
                    {tab === "today" ? "Today's Gauntlet" : "All-Time Legends"}
                  </button>
                ))}
              </div>
            </div>

            {/* Top 3 Podium Visual Display */}
            {!loadingLeaderboard && leaderboard.length >= 3 && (
              <div className="pt-6 pb-4 flex items-end justify-center gap-2 md:gap-6 border-b-2 border-black/10">

                {/* 2nd Place Podium */}
                {top2 && (
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-full border-2 border-black bg-[#9CA3AF] text-white flex items-center justify-center font-black text-[16px] shadow-[2px_2px_0px_#000] relative">
                      {top2.display_name.charAt(0).toUpperCase()}
                      <span className="absolute -top-2.5 -right-1 bg-white text-black border border-black rounded px-1.5 py-0.5 text-[9px] font-black uppercase shadow-[1px_1px_0px_#000]">
                        2nd
                      </span>
                    </div>
                    <p className="font-black text-[12px] md:text-[13px] text-black mt-1.5 max-w-[90px] truncate text-center">
                      {top2.display_name}
                    </p>
                    <p className="font-black text-[11px] text-black/60">{top2.score} pts</p>

                    {/* Step Block */}
                    <div className="w-24 md:w-28 h-20 bg-[#FAF7F2] border-2 border-black rounded-t-xl mt-2 flex flex-col items-center justify-center shadow-[2px_2px_0px_#000]">
                      <span className="font-black text-[22px] text-black/40">2</span>
                      <span className="text-[10px] font-bold text-black/40">{formatTime(top2.time_taken)}</span>
                    </div>
                  </div>
                )}

                {/* 1st Place Podium (Tallest, Center) */}
                {top1 && (
                  <div className="flex flex-col items-center -mt-4">
                    <div className="w-16 h-16 md:w-18 md:h-18 rounded-full border-3 border-black bg-[#EAB308] text-black flex items-center justify-center font-black text-[20px] shadow-[4px_4px_0px_#000] relative">
                      {top1.display_name.charAt(0).toUpperCase()}
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#FFD13B] text-black border-2 border-black rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-[2px_2px_0px_#000]">
                        1st
                      </span>
                    </div>
                    <p className="font-black text-[13px] md:text-[14px] text-black mt-1.5 max-w-[100px] truncate text-center">
                      {top1.display_name}
                    </p>
                    <p className="font-black text-[12px] text-[#D97706]">{top1.score} pts</p>

                    {/* Step Block */}
                    <div className="w-28 md:w-32 h-28 bg-[#FFE566] border-3 border-black rounded-t-xl mt-2 flex flex-col items-center justify-center shadow-[3px_3px_0px_#000]">
                      <span className="font-black text-[32px] text-black">1</span>
                      <span className="text-[11px] font-black text-black/60">{formatTime(top1.time_taken)}</span>
                    </div>
                  </div>
                )}

                {/* 3rd Place Podium */}
                {top3 && (
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-full border-2 border-black bg-[#B45309] text-white flex items-center justify-center font-black text-[16px] shadow-[2px_2px_0px_#000] relative">
                      {top3.display_name.charAt(0).toUpperCase()}
                      <span className="absolute -top-2.5 -right-1 bg-[#FAF7F2] text-black border border-black rounded px-1.5 py-0.5 text-[9px] font-black uppercase shadow-[1px_1px_0px_#000]">
                        3rd
                      </span>
                    </div>
                    <p className="font-black text-[12px] md:text-[13px] text-black mt-1.5 max-w-[90px] truncate text-center">
                      {top3.display_name}
                    </p>
                    <p className="font-black text-[11px] text-black/60">{top3.score} pts</p>

                    {/* Step Block */}
                    <div className="w-24 md:w-28 h-14 bg-[#FAF7F2] border-2 border-black rounded-t-xl mt-2 flex flex-col items-center justify-center shadow-[2px_2px_0px_#000]">
                      <span className="font-black text-[18px] text-black/40">3</span>
                      <span className="text-[10px] font-bold text-black/40">{formatTime(top3.time_taken)}</span>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* Leaderboard Table Rows */}
            <div className="border-2 border-black rounded-2xl overflow-hidden bg-white shadow-[3px_3px_0px_#000]">
              {loadingLeaderboard ? (
                <div className="p-8 flex flex-col items-center justify-center gap-2">
                  <span className="material-symbols-outlined animate-spin text-[32px] text-[#F0A040]">
                    progress_activity
                  </span>
                  <p className="text-[12px] font-black text-black/50">Fetching arena standings...</p>
                </div>
              ) : leaderboardError ? (
                <div className="p-8 flex flex-col items-center gap-3 text-center">
                  <p className="font-bold text-[13px] text-black/50">
                    Couldn't reach arena leaderboard.
                  </p>
                  <button
                    onClick={() => setLeaderboardRetryTick((t) => t + 1)}
                    className="px-4 py-2 bg-black text-white font-black text-[12px] rounded-lg border border-black shadow-[2px_2px_0px_#F0A040]"
                  >
                    Retry Connection
                  </button>
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="font-black text-[14px] text-black/40">
                    No submissions yet today. Be the first to claim Rank #1!
                  </p>
                </div>
              ) : (
                leaderboard.map((entry, idx) => {
                  const isMe = entry.user_id === user?.id;

                  return (
                    <div
                      key={entry.user_id + idx}
                      className={`flex items-center gap-3 px-4 md:px-6 py-3.5 transition-colors ${
                        idx < leaderboard.length - 1 ? "border-b border-black/10" : ""
                      } ${isMe ? "bg-[#FFE566]/30 font-black" : "hover:bg-[#FAF7F2]"}`}
                    >
                      {/* Rank Position */}
                      <span className="w-9 text-center font-black text-[13px] text-black shrink-0">
                        {idx === 0 ? (
                          <span className="inline-block px-1.5 py-0.5 bg-[#FFD13B] border border-black rounded text-[11px] font-black shadow-[1px_1px_0px_#000]">
                            1st
                          </span>
                        ) : idx === 1 ? (
                          <span className="inline-block px-1.5 py-0.5 bg-[#E5E7EB] border border-black rounded text-[11px] font-black shadow-[1px_1px_0px_#000]">
                            2nd
                          </span>
                        ) : idx === 2 ? (
                          <span className="inline-block px-1.5 py-0.5 bg-[#FED7AA] border border-black rounded text-[11px] font-black shadow-[1px_1px_0px_#000]">
                            3rd
                          </span>
                        ) : (
                          `#${idx + 1}`
                        )}
                      </span>

                      {/* Avatar */}
                      <div
                        className={`w-9 h-9 rounded-full border-2 border-black flex items-center justify-center font-black text-[13px] shrink-0 shadow-[1px_1px_0px_#000] ${
                          isMe ? "bg-[#FFD13B] text-black" : "bg-[#FAF7F2] text-black"
                        }`}
                      >
                        {entry.display_name.charAt(0).toUpperCase()}
                      </div>

                      {/* Name */}
                      <div className="flex-1 truncate">
                        <span className={`text-[13px] md:text-[14px] ${isMe ? "font-black text-black" : "font-bold text-black"}`}>
                          {entry.display_name} {isMe && "(You)"}
                        </span>
                      </div>

                      {/* Score & Time */}
                      <div className="text-right">
                        <p className="font-black text-[14px] text-black">
                          {entry.score.toLocaleString()} <span className="text-[11px] font-bold text-black/50">pts</span>
                        </p>
                        <p className="text-[10.5px] font-bold text-black/40">
                          {formatTime(entry.time_taken)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pinned "Your Rank" Bar if outside Top 3 */}
            {myEntry && myRankIndex >= 3 && (
              <div className="bg-[#FFE566] border-2 border-black rounded-xl p-3 flex items-center justify-between shadow-[3px_3px_0px_#000]">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-black text-white font-black text-[11px] rounded">
                    Rank #{myRankIndex + 1}
                  </span>
                  <span className="font-black text-[13px] text-black">Your Standing</span>
                </div>

                <div className="text-right">
                  <span className="font-black text-[14px] text-black">{myEntry.score} pts</span>
                  <span className="text-[11px] font-bold text-black/60 ml-2">({formatTime(myEntry.time_taken)})</span>
                </div>
              </div>
            )}

          </section>

        </main>
      </div>
    </div>
  );
}
