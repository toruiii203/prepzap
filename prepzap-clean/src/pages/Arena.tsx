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

// ── Types ─────────────────────────────────────────────────────────────────────
interface LeaderboardEntry {
  user_id: string;
  score: number;
  time_taken: number;
  display_name: string;
}

type LeaderboardTab = "today" | "alltime";

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function todayPH(): string {
  return new Intl.DateTimeFormat('en-CA', { 
    timeZone: 'Asia/Manila', 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  }).format(new Date());
}

// ── Main Arena Page ───────────────────────────────────────────────────────────
export default function Arena() {
  const tutorial = useTutorialModal("/arena");
  const navigate = useNavigate();
  const { user } = useAuth();
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
      const midnight = new Date(now); midnight.setHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000).toString().padStart(2, "0");
      const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, "0");
      const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, "0");
      setCountdown(`${h}:${m}:${s}`);
    };
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoadingQuiz(true);
      const today = todayPH();
      try {
        const quiz = await getOrCreateDailyChallenge();
        setDailyQuiz(quiz ?? null);
        if (quiz && user) {
          const localDone = localStorage.getItem(`pz_daily_done_${today}_${user.id}`) || localStorage.getItem(`pz_daily_done_${today}`);
          if (localDone) {
            setAlreadySubmitted(true);
          } else {
            const { data: sub } = await supabase
              .from("daily_challenge_submissions")
              .select("id")
              .eq("challenge_date", today)
              .eq("user_id", user.id)
              .maybeSingle();
            if (sub) {
              setAlreadySubmitted(true);
              try { localStorage.setItem(`pz_daily_done_${today}_${user.id}`, "true"); } catch { /* Keep the available in-memory view when local storage is unavailable. */ }
            } else {
              setAlreadySubmitted(false);
            }
          }
        }
      } catch (err) {
        console.error("Error loading daily quiz:", err);
      } finally {
        setLoadingQuiz(false);
      }
    };
    load();
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingLeaderboard(true);
      setLeaderboardError(false);
      let entries: LeaderboardEntry[] = [];
      let fetchFailed = false;
      try {
        let query = supabase.from("daily_challenge_submissions").select("user_id, score, time_taken_seconds, display_name")
          .order("score", { ascending: false }).order("time_taken_seconds", { ascending: true }).limit(20);
        if (leaderboardTab === "today") query = query.eq("challenge_date", todayPH());
        // Guarded with a timeout: every supabase.from() call awaits
        // auth.getSession() internally, and if that ever stalls (slow token
        // refresh, backgrounded tab, flaky reconnect) this await would
        // otherwise hang forever with no error — which is what left this
        // leaderboard spinning indefinitely.
        const { data } = await withTimeout(query, 4000, "daily leaderboard");
        if (data) {
          entries = data.map((row, i) => ({
            user_id: row.user_id,
            score: row.score,
            time_taken: row.time_taken_seconds,
            display_name: row.display_name || `Player ${i + 1}`,
          }));
        }
      } catch (err) {
        console.warn("Leaderboard fetch error:", err);
        fetchFailed = true;
      }

      // Seamlessly merge local today submissions if any
      try {
        const localKey = `pz_daily_submissions_${todayPH()}`;
        const localRaw = localStorage.getItem(localKey);
        if (localRaw) {
          const localList: {user_id:string;score:number;time_taken_seconds?:number;time_taken?:number;display_name?:string}[] = JSON.parse(localRaw);
          localList.forEach(item => {
            if (!entries.find(e => e.user_id === item.user_id)) {
              entries.push({
                user_id: item.user_id,
                score: item.score,
                time_taken: item.time_taken_seconds || item.time_taken || 0,
                display_name: item.display_name || "You",
              });
            }
          });
          entries.sort((a, b) => b.score - a.score || a.time_taken - b.time_taken);
        }
      } catch { /* Keep the available in-memory view when local storage is unavailable. */ }

      if (cancelled) return;
      setLeaderboard(entries.slice(0, 10));
      // Only surface an error state if we truly have nothing to show — a
      // local fallback entry still counts as a usable result.
      setLeaderboardError(fetchFailed && entries.length === 0);
      setLoadingLeaderboard(false);
    };
    load();
    const ch = supabase.channel("arena-daily-leaderboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "daily_challenge_submissions" }, load)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [leaderboardTab, leaderboardRetryTick]);

  // ── Shared sub-components ──────────────────────────────────────────────────
  const handleViewBreakdown = () => {
    const today = todayPH();
    let savedState = null;
    try {
      const raw = (user?.id ? localStorage.getItem(`pz_daily_breakdown_${today}_${user.id}`) : null) || localStorage.getItem(`pz_daily_breakdown_${today}`);
      if (raw) savedState = JSON.parse(raw);
    } catch { /* Keep the available in-memory view when local storage is unavailable. */ }
    navigate("/arena/results/daily", { state: savedState });
  };

  const renderDailyCard = () => (
    <div className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_#000] overflow-hidden">
        <TutorialModal isOpen={tutorial.isOpen} onDismiss={tutorial.dismiss} features={TUTORIAL_CONTENT["/arena"] || []} title="Arena" />
      <div className="bg-[#f0a040] border-b-2 border-black px-4 py-2 flex justify-between items-center">
        <span className="font-bold text-[11px] uppercase tracking-widest">Daily Challenge</span>
        <span className="font-bold text-[11px]">{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
      </div>
      {loadingQuiz ? (
        <div className="p-6 flex justify-center"><span className="material-symbols-outlined animate-spin text-[24px] text-black/30">progress_activity</span></div>
      ) : dailyQuiz ? (
        <div className="p-5 flex flex-col gap-3">
          <div>
            <h2 className="font-black text-[20px] text-black leading-tight">{dailyQuiz.topic}</h2>
            <div className="flex gap-2 mt-2">
              {dailyQuiz.difficulty && <span className="text-[10px] font-bold border-2 border-black px-2 py-0.5 capitalize">{dailyQuiz.difficulty}</span>}
              <span className="text-[10px] font-bold border-2 border-black px-2 py-0.5">{dailyQuiz.questions.length} Questions</span>
            </div>
          </div>
          {alreadySubmitted ? (
            <div className="bg-[#FAF7F2] border-2 border-black p-4 flex flex-col gap-2 shadow-[2px_2px_0px_#000]">
              <div className="flex items-center gap-2 text-green-700">
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                <p className="font-extrabold text-[14px]">Completed Today! ✓</p>
              </div>
              <p className="text-[12px] text-black/60 font-semibold">
                You've completed your 1 daily challenge attempt. Check your rank on the leaderboard below!
              </p>
              <button
                onClick={handleViewBreakdown}
                className="mt-1 w-full bg-white text-black font-bold text-[13px] py-2 border-2 border-black shadow-[2px_2px_0px_#000] active:translate-y-0.5 hover:bg-black hover:text-white transition-colors"
              >
                View Today's Breakdown →
              </button>
            </div>
          ) : (
            <button onClick={() => navigate("/arena/quiz/daily")}
              className="w-full bg-black text-white font-bold text-[14px] py-3.5 border-2 border-black flex justify-between items-center px-4 shadow-[3px_3px_0px_0px_#f0a040] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all">
              <span>Take Today's Quiz (1 Try)</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          )}
          <p className="text-center text-[11px] text-black/40">Resets in {countdown}</p>
        </div>
      ) : (
        <div className="p-6 text-center">
          <p className="font-bold text-[14px] text-black/50">No quiz today yet.</p>
          
        </div>
      )}
    </div>
  );

  const renderLeaderboardCard = () => (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-black text-[16px] text-black tracking-tight">Daily Challenge Leaderboard</h3>
        <div className="flex gap-1.5">
          {(["today", "alltime"] as const).map((tab) => (
            <button key={tab} onClick={() => setLeaderboardTab(tab)}
              className={`text-[11px] font-bold px-3 py-1 border-2 border-black transition-colors ${leaderboardTab === tab ? "bg-black text-white" : "bg-white text-black"}`}>
              {tab === "today" ? "Today" : "All-Time"}
            </button>
          ))}
        </div>
      </div>
      <div className="border-2 border-black bg-white shadow-[3px_3px_0px_0px_#000]">
        {loadingLeaderboard ? (
          <div className="p-6 flex justify-center"><span className="material-symbols-outlined animate-spin text-[24px] text-black/30">progress_activity</span></div>
        ) : leaderboardError ? (
          <div className="p-6 flex flex-col items-center gap-3 text-center">
            <p className="font-bold text-[13px] text-black/40">Couldn't load the leaderboard — connection may be slow.</p>
            <button onClick={() => setLeaderboardRetryTick((t) => t + 1)}
              className="bg-black text-white font-bold text-[12px] px-4 py-2 border-2 border-black shadow-[2px_2px_0px_0px_#f0a040] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all">
              Retry
            </button>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="p-6 text-center"><p className="font-bold text-[13px] text-black/40">No submissions yet — be first!</p></div>
        ) : leaderboard.map((entry, i) => {
          const isMe = entry.user_id === user?.id;
          const medal = i === 0 ? <span className="material-symbols-outlined text-[#eab308]" style={{ fontVariationSettings: "'FILL' 1" }}>military_tech</span> : i === 1 ? <span className="material-symbols-outlined text-[#9ca3af]" style={{ fontVariationSettings: "'FILL' 1" }}>military_tech</span> : i === 2 ? <span className="material-symbols-outlined text-[#b45309]" style={{ fontVariationSettings: "'FILL' 1" }}>military_tech</span> : null;
          return (
            <div key={entry.user_id + i}
              className={`flex items-center gap-3 px-4 py-3 ${i < leaderboard.length - 1 ? "border-b-2 border-black" : ""} ${isMe ? "bg-[#f0a040]/15" : ""}`}>
              <span className="w-6 text-center font-black text-[14px]">{medal ?? `${i + 1}`}</span>
              <div className={`w-8 h-8 rounded-full border-2 border-black flex items-center justify-center font-black text-[12px] ${isMe ? "bg-[#f0a040] text-black" : "bg-black/10 text-black"}`}>
                {entry.display_name.charAt(0).toUpperCase()}
              </div>
              <span className={`flex-1 text-[14px] truncate ${isMe ? "font-black text-black" : "font-bold text-black"}`}>{entry.display_name}</span>
              <div className="text-right">
                <p className={`font-black text-[14px] ${isMe ? "text-[#f0a040]" : "text-black"}`}>{entry.score.toLocaleString()}</p>
                <p className="text-[10px] text-black/40">{formatTime(entry.time_taken)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="w-full min-h-[100dvh] bg-[#FAF7F2] flex"><SharedSidebar active="/arena" /><div className="flex-1 flex flex-col md:ml-64 relative">
      

      

      <header className="px-4 md:px-8 pt-5 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-black">Daily challenge</h1><p className="text-sm text-black/60 mt-1">A daily quiz and its leaderboard, all in one place.</p></div><button data-guide-target="live-battles" onClick={()=>navigate("/rooms")} className="min-h-11 px-4 rounded-xl border-2 border-black bg-white font-bold">Open Live battles <span aria-hidden="true">→</span></button></header>
      <main className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-4 md:px-8 py-6 pb-24 w-full max-w-6xl mx-auto">
        <section data-guide-target="daily-challenge">{renderDailyCard()}</section>
        <section data-guide-target="daily-leaderboard">{renderLeaderboardCard()}</section>
      </main>
        </div>
    </div>
  );
}
