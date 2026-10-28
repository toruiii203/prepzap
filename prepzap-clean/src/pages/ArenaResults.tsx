import { getOrCreateDailyChallenge } from "@/lib/dailyChallenge";
import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { fireConfetti } from "@/lib/confetti";
import { isAnswerCorrect } from "@/lib/quizUtils";
import { withTimeout } from "@/lib/withTimeout";
import { VictoryCardModal } from "@/components/VictoryCardModal";
import { playPop } from "@/lib/soundFX";

interface Question {
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

interface LeaderboardEntry {
  user_id: string;
  score: number;
  time_taken: number;
  display_name: string;
}

interface LocationState {
  answers: Record<number, string>;
  score: number;
  elapsed: number;
  questions: Question[];
  isDaily: boolean;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

export default function ArenaResults() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  useEffect(() => {
    fireConfetti();
  }, []);
  const state = location.state as LocationState | null;

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const [expandedQ, setExpandedQ] = useState<number | null>(null);
  const [showVictoryCard, setShowVictoryCard] = useState(false);
  const rawName = user?.avatarConfig?.full_name || (user as any)?.user_metadata?.full_name || user?.name || "Arena Fighter";
  const friendCode = user?.id?.slice(0, 8).toUpperCase() || "ARENA";

  const isDaily = code === "daily" || state?.isDaily;

    const [restoredState, setRestoredState] = useState<LocationState | null>(() => {
      if (state) return state;
      try {
        const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
        const raw = (user?.id ? localStorage.getItem(`pz_daily_breakdown_${today}_${user.id}`) : null) || localStorage.getItem(`pz_daily_breakdown_${today}`);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    });
    const activeState = state || restoredState;
    const answers = activeState?.answers ?? {};
    const score = activeState?.score ?? 0;
    const elapsed = activeState?.elapsed ?? 0;
    const questions = activeState?.questions ?? [];
    const calculatedCorrect = questions.filter((q, i) => isAnswerCorrect(q, answers[i])).length;
    const correctCount = Object.keys(answers).length > 0 
      ? calculatedCorrect 
      : (score > 0 ? Math.round(score / 100) : 0);
    const accuracy = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
    
    // Speed bonus is 5 points per unused second (Room only)
    const totalSecondsRemaining = Math.max(0, questions.length * 15 - elapsed);
    const speedBonus = isDaily ? 0 : (totalSecondsRemaining * 5);

    useEffect(() => {
      let cancelled = false;
      const load = async () => {
        setLoading(true);
        setLoadError(false);
        try {
          const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

          // Effective values for THIS run. Start from render-time state, and
          // upgrade in place below if we recover data from Supabase — so the
          // leaderboard-injection code further down always sees fresh values
          // instead of the stale `activeState`/`score` this effect closed
          // over at creation time. (That was the "0 pts on PC" bug: the
          // recovered score landed in React state via setRestoredState, but
          // this same effect run kept reading the old pre-recovery values.)
          let effState = activeState;
          let effScore = score;
          let effElapsed = elapsed;

          // State recovery if missing from router state & localStorage (e.g.
          // this results page was opened on a different device than the one
          // that submitted the quiz, so there's no router state and no cache)
          if (!effState && user && isDaily) {
            try {
              const [subRes, chalRes] = await Promise.all([
                withTimeout(
                  supabase.from("daily_challenge_submissions").select("*").eq("challenge_date", today).eq("user_id", user.id).maybeSingle(),
                  8000, "daily submission lookup"
                ),
                withTimeout(
                  getOrCreateDailyChallenge().then(q => ({ data: q, error: null })),
                  8000, "daily challenge lookup"
                ),
              ]);
              if (subRes.data && chalRes.data) {
                const recovered: LocationState = {
                  answers: subRes.data.answers || {},
                  score: subRes.data.score || 0,
                  elapsed: subRes.data.time_taken_seconds || 0,
                  questions: chalRes.data.questions || [],
                  isDaily: true,
                };
                setRestoredState(recovered);
                effState = recovered;
                effScore = recovered.score;
                effElapsed = recovered.elapsed;
              }
            } catch (recoverErr) {
              console.warn("Could not recover submission state:", recoverErr);
              // Not fatal on its own — leaderboard below can still load,
              // just without "my score" restored for the injection step.
            }
          }

          if (cancelled) return;

          if (isDaily) {
            let entries: LeaderboardEntry[] = [];
            let fetchFailed = false;
            try {
              const { data } = await withTimeout(
                supabase
                  .from("daily_challenge_submissions")
                  .select("user_id, score, time_taken_seconds, display_name")
                  .eq("challenge_date", today)
                  .order("score", { ascending: false })
                  .order("time_taken_seconds", { ascending: true })
                  .limit(20),
                8000, "daily leaderboard"
              );

              if (data && data.length > 0) {
                entries = data.map((row: any, i: number) => ({
                  user_id: row.user_id,
                  score: row.score,
                  time_taken: row.time_taken_seconds ?? 0,
                  display_name: row.display_name ?? `Player ${i + 1}`,
                }));
              }
            } catch (queryErr) {
              console.warn("Could not fetch daily leaderboard from Supabase:", queryErr);
              fetchFailed = true;
            }

            // If user's own result is not yet in the list (fresh submission,
            // or just recovered above), inject it using the FRESH effState —
            // never the stale render-time closure values.
            if (user && (effState?.score !== undefined || effScore > 0)) {
              const myEntryIdx = entries.findIndex((e) => e.user_id === user.id);
              const myDisplayName = user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "You";
              if (myEntryIdx === -1) {
                entries.push({
                  user_id: user.id,
                  score: effState?.score ?? effScore,
                  time_taken: effState?.elapsed ?? effElapsed ?? 0,
                  display_name: `${myDisplayName} (You)`,
                });
                // Sort by score desc, time_taken asc
                entries.sort((a, b) => b.score - a.score || a.time_taken - b.time_taken);
              }
            }

            if (!cancelled) {
              setLeaderboard(entries);
              const rank = entries.findIndex((e) => e.user_id === user?.id);
              setMyRank(rank >= 0 ? rank + 1 : 1);
              // Only show a hard error if the fetch truly failed AND we have
              // nothing at all to show (no cached/recovered entry either).
              setLoadError(fetchFailed && entries.length === 0);
            }
        } else {
          const { data: roomData } = await withTimeout(
            supabase.from("exam_rooms").select("id").eq("code", code?.toUpperCase()).maybeSingle(),
            8000, "room lookup"
          );
          if (roomData) {
            const { data } = await withTimeout(
              supabase.from("room_submissions").select("user_id, score, time_taken, display_name")
                .eq("room_id", roomData.id).order("score", { ascending: false }).limit(20),
              8000, "room leaderboard"
            );

            let entries = (data ?? []).map((row: any, i: number) => ({
              user_id: row.user_id,
              score: row.score,
              time_taken: row.time_taken ?? 0,
              display_name: row.display_name ?? `Player ${i + 1}`,
            }));

            if (user && effState?.score !== undefined && entries.findIndex((e: any) => e.user_id === user.id) === -1) {
              const myDisplayName = user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "You";
              entries.push({
                user_id: user.id,
                score: effState.score,
                time_taken: effState.elapsed ?? 0,
                display_name: `${myDisplayName} (You)`,
              });
              entries.sort((a: any, b: any) => b.score - a.score || a.time_taken - b.time_taken);
            }

            if (!cancelled) {
              setLeaderboard(entries);
              const rank = entries.findIndex((e: any) => e.user_id === user?.id);
              setMyRank(rank >= 0 ? rank + 1 : 1);
            }
          } else if (!cancelled) {
            setLoadError(true);
          }
        }
      } catch (err) {
        console.warn("Failed to load Arena results:", err);
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [code, isDaily, user, retryTick]);

  // ── Shared sub-components ──────────────────────────────────────────────────
  const ScoreHero = () => (
    <div className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_#000] p-6 relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-2 bg-[#f0a040] border-r-2 border-black" />
      <div className="pl-3 flex flex-col items-center text-center">
        {myRank && (
          <div className="mb-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-black/40">Your Rank</p>
            <p className="font-black text-[60px] text-black leading-none">#{myRank}</p>
          </div>
        )}
        <p className="font-black text-[30px] text-[#f0a040] leading-none">{score.toLocaleString()} pts</p>
        <p className="text-[12px] font-bold text-black/40 mt-1.5 flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">timer</span>Finished in {formatTime(elapsed)}
        </p>
      </div>
      <div className="border-t-2 border-black mt-5 pt-4 flex justify-between">
        <div className="text-center flex-1">
          <p className="text-[10px] font-bold uppercase text-black/40">Correct</p>
          <p className="font-black text-[20px] text-black">{correctCount}/{questions.length}</p>
        </div>
        <div className="w-[2px] bg-black" />
        <div className="text-center flex-1">
          <p className="text-[10px] font-bold uppercase text-black/40">Accuracy</p>
          <p className="font-black text-[20px] text-black">{accuracy}%</p>
        </div>
        <div className="w-[2px] bg-black" />
        <div className="text-center flex-1">
          <p className="text-[10px] font-bold uppercase text-black/40">Speed Bonus</p>
          <p className="font-black text-[20px] text-[#22c55e] flex items-center justify-center gap-1">
            <span className="material-symbols-outlined text-[18px]">bolt</span>
            +{speedBonus}
          </p>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t-2 border-black flex justify-center">
        <button
          type="button"
          onClick={() => {
            playPop();
            setShowVictoryCard(true);
          }}
          className="w-full sm:w-auto px-6 py-3 bg-[#FFE566] hover:bg-[#FFD13B] text-black font-black text-[13px] uppercase tracking-wider border-2 border-black rounded-xl shadow-[3px_3px_0px_#000] active:translate-y-0.5 cursor-pointer flex items-center justify-center gap-2 transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">share</span>
          Brag Arena Rank to Instagram Story (9:16)
        </button>
      </div>
    </div>
  );

  const LeaderboardCard = () => (
    <div className="border-2 border-black bg-white shadow-[3px_3px_0px_0px_#000]">
      <div className="border-b-2 border-black px-4 py-3 flex items-center gap-2">
        <span className="material-symbols-outlined text-[20px]">social_leaderboard</span>
        <h3 className="font-black text-[15px] text-black">Final Standings</h3>
      </div>
      {loading ? (
        <div className="p-6 flex justify-center"><span className="material-symbols-outlined animate-spin text-[24px] text-black/30">progress_activity</span></div>
      ) : loadError ? (
        <div className="p-6 flex flex-col items-center gap-3 text-center">
          <p className="font-bold text-[13px] text-black/40">Couldn't load results — connection may be slow.</p>
          <button onClick={() => setRetryTick((t) => t + 1)}
            className="bg-black text-white font-bold text-[12px] px-4 py-2 border-2 border-black shadow-[2px_2px_0px_0px_#f0a040] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all">
            Retry
          </button>
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="p-6 text-center"><p className="font-bold text-[13px] text-black/40">No results yet.</p></div>
      ) : leaderboard.map((entry, i) => {
        const isMe = entry.user_id === user?.id;
        const medal = i === 0 ? "1st" : i === 1 ? "2nd" : i === 2 ? "3rd" : null;
        return (
          <div key={entry.user_id + i}
            className={`flex items-center gap-3 px-4 py-3 ${i < leaderboard.length - 1 ? "border-b-2 border-black" : ""} ${isMe ? "bg-[#f0a040]/20" : ""}`}>
            <span className="w-6 text-center font-black text-[14px]">{medal ?? `${i + 1}`}</span>
            <div className={`w-8 h-8 rounded-full border-2 border-black flex items-center justify-center font-bold text-[11px] ${isMe ? "bg-black text-white" : "bg-black/10"}`}>
              {isMe ? "YOU" : entry.display_name.charAt(0)}
            </div>
            <span className="flex-1 font-bold text-[14px] text-black truncate">{isMe ? "You" : entry.display_name}</span>
            <div className="text-right">
              <p className={`font-black text-[14px] ${isMe ? "text-[#f0a040]" : "text-black"}`}>{entry.score.toLocaleString()}</p>
              <p className="text-[10px] text-black/40">{formatTime(entry.time_taken)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );

  const BreakdownCard = () => (
    <div className="border-2 border-black bg-white shadow-[3px_3px_0px_0px_#000]">
      <div className="border-b-2 border-black px-4 py-3 flex justify-between items-center">
        <h3 className="font-black text-[15px] text-black">Question Breakdown</h3>
        <span className="text-[11px] font-bold text-black/40">{questions.length}Q</span>
      </div>
      <div className="flex flex-col">
        {questions.map((q, i) => {
          const userAns = answers[i];
          const correct = isAnswerCorrect(q, userAns);
          const isExpanded = expandedQ === i;
          return (
            <div key={i} className={i < questions.length - 1 ? "border-b-2 border-black" : ""}>
              <button onClick={() => setExpandedQ(isExpanded ? null : i)}
                className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors ${!correct ? "hover:bg-red-50" : "hover:bg-[#FAF7F2]"}`}>
                <span className={`material-symbols-outlined text-[20px] flex-shrink-0 mt-0.5 ${correct ? "text-green-600" : "text-[#E8534A]"}`}
                  style={{ fontVariationSettings: "'FILL' 1" }}>
                  {correct ? "check_circle" : "cancel"}
                </span>
                <p className="flex-1 font-medium text-[13px] text-black line-clamp-2">{q.question}</p>
                {!correct && (
                  <span className="material-symbols-outlined text-[16px] text-[#f0a040] flex-shrink-0">
                    {isExpanded ? "expand_less" : "expand_more"}
                  </span>
                )}
              </button>
              {isExpanded && !correct && (
                <div className="px-4 pb-4 flex flex-col gap-2">
                  <div className="flex gap-2 text-[12px]">
                    <span className="font-bold text-[#E8534A]">Your answer: {userAns || "—"}</span>
                    <span className="text-black/30">·</span>
                    <span className="font-bold text-green-600">Correct: {q.correct_answer}</span>
                  </div>
                  <div className="bg-[#FAF7F2] border-2 border-black p-3">
                    <p className="text-[12px] font-medium text-black leading-relaxed">{q.explanation}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const RematchCard = () => (
    <div className="border-2 border-black bg-white shadow-[3px_3px_0px_0px_#000] p-8 flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 rounded-full border-2 border-black bg-[#FAF7F2] flex items-center justify-center mb-4">
        <span className="material-symbols-outlined text-[32px]">replay</span>
      </div>
      <h3 className="font-black text-[22px] text-black mb-2">REMATCH?</h3>
      <p className="font-medium text-[14px] text-black/50 mb-6 max-w-[200px]">Prove you can beat your score!</p>
      <button onClick={() => navigate(`/arena/room/${code}`)}
        className="w-full bg-black text-white font-bold text-[14px] py-3 border-2 border-black shadow-[4px_4px_0px_0px_#f0a040] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-2 mb-3">
        Join Rematch <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
      </button>
      <button onClick={() => navigate("/arena")}
        className="w-full font-bold text-[13px] text-black/50 hover:text-black py-2 transition-colors">
        Back to Arena
      </button>
    </div>
  );

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#FAF7F2]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#FAF7F2] border-b-[1.5px] border-black px-4 md:px-8 py-3 flex justify-between items-center">
        <button onClick={() => navigate("/arena")} className="flex items-center gap-1 font-bold text-[13px] text-black/50">
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>Arena
        </button>
        <h1 className="font-black text-[16px] text-black">Quiz Complete!</h1>
        <div className="w-16" />
      </header>

      {/* Desktop page title */}
      <div className="hidden md:block px-8 pt-6 pb-2">
        <h1 className="font-black text-[36px] text-black tracking-tight">Quiz Complete!</h1>
        <p className="text-[13px] text-black/50 mt-1">{isDaily ? "Daily Challenge Results" : `Room Results · ${code}`}</p>
      </div>

      {/* ── Mobile layout ── */}
      <div className="md:hidden flex flex-col gap-5 px-4 pt-5 pb-32">
        <ScoreHero />
        <LeaderboardCard />
        {questions.length > 0 && <BreakdownCard />}
      </div>

      {/* Mobile bottom actions */}
      <div className="md:hidden fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] bg-[#FAF7F2] border-t-2 border-black px-4 py-4 z-20 flex flex-col gap-3">
        {!isDaily && (
          <button onClick={() => navigate(`/arena/room/${code}`)}
            className="w-full bg-black text-white font-bold text-[15px] py-3.5 border-2 border-black shadow-[4px_4px_0px_0px_#f0a040] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-2">
            Join Rematch <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        )}
        <button onClick={() => navigate("/arena")}
          className="w-full bg-white text-black font-bold text-[14px] py-3 border-2 border-black shadow-[3px_3px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all">
          Back to Arena
        </button>
      </div>

      {/* ── Desktop layout — bento grid ── */}
      <div className="hidden md:flex flex-col gap-6 px-8 pb-8">
        {/* Score hero full width */}
        <ScoreHero />
        {/* Leaderboard full width */}
        <LeaderboardCard />
        {/* Bottom two cards */}
        <div className="grid grid-cols-2 gap-6">
          {questions.length > 0 && <BreakdownCard />}
          {!isDaily && <RematchCard />}
          {isDaily && (
            <div className="border-2 border-black bg-white shadow-[3px_3px_0px_0px_#000] p-8 flex flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-[48px] text-black/20 mb-4">today</span>
              <h3 className="font-black text-[18px] text-black mb-2">See you tomorrow!</h3>
              <p className="font-medium text-[13px] text-black/50 mb-6">A new Daily Challenge awaits at midnight PH time.</p>
              <button onClick={() => navigate("/arena")}
                className="w-full bg-black text-white font-bold text-[14px] py-3 border-2 border-black shadow-[4px_4px_0px_0px_#f0a040] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all">
                Back to Arena
              </button>
            </div>
          )}
        </div>
      </div>

      <VictoryCardModal
        isOpen={showVictoryCard}
        onClose={() => setShowVictoryCard(false)}
        title={myRank === 1 ? "Arena Champion!" : `Arena Rank #${myRank || 1}`}
        topic={isDaily ? "Daily Arena Challenge" : `Arena Match · ${code || "Multiplayer"}`}
        score={score}
        totalQuestions={questions.length || 10}
        comboStreak={correctCount}
        xpEarned={score > 0 ? Math.min(250, Math.round(score / 5)) : 50}
        friendCode={friendCode}
        displayName={rawName}
      />
    </div>
  );
}
