import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

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
  const state = location.state as LocationState | null;

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedQ, setExpandedQ] = useState<number | null>(null);

  const isDaily = code === "daily" || state?.isDaily;
  const answers = state?.answers ?? {};
  const score = state?.score ?? 0;
  const elapsed = state?.elapsed ?? 0;
  const questions = state?.questions ?? [];
  const correctCount = questions.filter((q, i) => answers[i] === q.correct_answer).length;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (isDaily) {
          const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" })).toISOString().split("T")[0];
          const { data } = await supabase
            .from("daily_submissions")
            .select("user_id, score, time_taken")
            .eq("quiz_date", today)
            .order("score", { ascending: false })
            .order("time_taken", { ascending: true })
            .limit(10);
          const entries = (data ?? []).map((row, i) => ({ ...row, display_name: `Player ${i + 1}` }));
          setLeaderboard(entries);
          const rank = entries.findIndex((e) => e.user_id === user?.id);
          setMyRank(rank >= 0 ? rank + 1 : null);
        } else {
          const { data: roomData } = await supabase.from("exam_rooms").select("id").eq("code", code?.toUpperCase()).single();
          if (roomData) {
            const { data } = await supabase
              .from("room_submissions")
              .select("user_id, score, time_taken")
              .eq("room_id", roomData.id)
              .order("score", { ascending: false })
              .order("time_taken", { ascending: true })
              .limit(10);
            const entries = (data ?? []).map((row, i) => ({ ...row, display_name: `Player ${i + 1}` }));
            setLeaderboard(entries);
            const rank = entries.findIndex((e) => e.user_id === user?.id);
            setMyRank(rank >= 0 ? rank + 1 : null);
          }
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [code, isDaily, user]);

  const accuracy = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#f5f0e8] pb-32">
      {/* Confetti dots */}
      <div className="absolute top-8 left-8 w-4 h-4 bg-[#f0a040] border-2 border-black rounded-full pointer-events-none" />
      <div className="absolute top-16 right-10 w-5 h-5 bg-black border-2 border-black rotate-12 pointer-events-none" />
      <div className="absolute top-28 left-5 w-3 h-3 bg-[#f0a040] border border-black pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#f5f0e8] border-b-[1.5px] border-black px-4 py-3 flex justify-between items-center">
        <button onClick={() => navigate("/arena")} className="flex items-center gap-1 font-bold text-[13px] text-black/50">
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>Arena
        </button>
        <h1 className="font-black text-[15px] text-black">Quiz Complete!</h1>
        <div className="w-8" />
      </header>

      <main className="flex flex-col gap-5 px-4 pt-5">
        {/* Score hero */}
        <div className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_#000] p-5 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-2 bg-[#f0a040] border-r-2 border-black" />
          <div className="pl-3 flex flex-col items-center text-center">
            {myRank && (
              <div className="mb-2">
                <p className="text-[11px] font-bold uppercase tracking-widest text-black/40">Your Rank</p>
                <p className="font-black text-[56px] text-black leading-none">
                  #{myRank}
                </p>
              </div>
            )}
            <p className="font-black text-[28px] text-[#f0a040] leading-none">{score.toLocaleString()} pts</p>
            <p className="text-[12px] font-bold text-black/40 mt-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">timer</span>
              Finished in {formatTime(elapsed)}
            </p>
          </div>
          <div className="border-t-2 border-black mt-4 pt-4 flex justify-between">
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase text-black/40">Correct</p>
              <p className="font-black text-[18px] text-black">{correctCount}/{questions.length}</p>
            </div>
            <div className="w-[1.5px] bg-black" />
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase text-black/40">Accuracy</p>
              <p className="font-black text-[18px] text-black">{accuracy}%</p>
            </div>
            <div className="w-[1.5px] bg-black" />
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase text-black/40">Speed</p>
              <p className="font-black text-[18px] text-[#f0a040]">+{Math.max(0, score - correctCount * 1000)}</p>
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="border-2 border-black bg-white shadow-[3px_3px_0px_0px_#000]">
          <div className="border-b-2 border-black px-4 py-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">social_leaderboard</span>
            <h3 className="font-black text-[15px] text-black">Leaderboard</h3>
          </div>
          {loading ? (
            <div className="p-6 flex justify-center"><span className="material-symbols-outlined animate-spin text-[24px] text-black/30">progress_activity</span></div>
          ) : leaderboard.length === 0 ? (
            <div className="p-6 text-center"><p className="font-bold text-[13px] text-black/40">No results yet.</p></div>
          ) : leaderboard.map((entry, i) => {
            const isMe = entry.user_id === user?.id;
            const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
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

        {/* Question breakdown */}
        {questions.length > 0 && (
          <div className="border-2 border-black bg-white shadow-[3px_3px_0px_0px_#000]">
            <div className="border-b-2 border-black px-4 py-3 flex justify-between items-center">
              <h3 className="font-black text-[15px] text-black">Breakdown</h3>
              <span className="text-[11px] font-bold text-black/40">{questions.length}Q</span>
            </div>
            <div className="flex flex-col">
              {questions.map((q, i) => {
                const userAns = answers[i];
                const correct = userAns === q.correct_answer;
                const isExpanded = expandedQ === i;
                return (
                  <div key={i} className={`${i < questions.length - 1 ? "border-b-2 border-black" : ""}`}>
                    <button
                      onClick={() => setExpandedQ(isExpanded ? null : i)}
                      className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors ${!correct ? "hover:bg-red-50" : "hover:bg-[#f5f0e8]"}`}
                    >
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
                        <div className="bg-[#f5f0e8] border-2 border-black p-3">
                          <p className="text-[12px] font-medium text-black leading-relaxed">{q.explanation}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Bottom actions */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] bg-[#f5f0e8] border-t-2 border-black px-4 py-4 z-20 flex flex-col gap-3">
        {!isDaily && (
          <button
            onClick={() => navigate(`/arena/room/${code}`)}
            className="w-full bg-black text-white font-bold text-[15px] py-3.5 border-2 border-black shadow-[4px_4px_0px_0px_#f0a040] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-2"
          >
            Join Rematch
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        )}
        <button
          onClick={() => navigate("/arena")}
          className="w-full bg-white text-black font-bold text-[14px] py-3 border-2 border-black shadow-[3px_3px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-2"
        >
          Back to Arena
        </button>
      </div>
    </div>
  );
}
