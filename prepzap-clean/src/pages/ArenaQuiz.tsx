import { getOrCreateDailyChallenge } from "@/lib/dailyChallenge";
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { logQuestCompletion } from "@/lib/quests";
import { supabase } from "@/lib/supabase";
import { isAnswerCorrect } from "@/lib/quizUtils";

interface Question {
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

interface ExamRoom {
  id: string;
  code: string;
  room_name: string;
  topic: string;
  difficulty: string;
  question_count: number;
  time_limit: number;
  questions: Question[];
  mode: "live" | "open";
  // FIX: server-stamped moment the room went "active" (set by a DB trigger,
  // not by any single client's clock) — this is what makes every player's
  // countdown anchored to the same real-world deadline.
  started_at: string | null;
}

interface DailyQuiz {
  id: string;
  date: string;
  topic: string;
  difficulty: string;
  questions: Question[];
}

function todayPH(): string {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }))
    .toISOString().split("T")[0];
}

function calcScore(correctCount: number, elapsed: number, totalQuestions: number, isDaily: boolean = false): number {
  const base = correctCount * 100;
  if (isDaily) return base; // Daily just sorts by time if tied
  const totalSecondsRemaining = Math.max(0, totalQuestions * 15 - elapsed);
  const speedBonus = totalSecondsRemaining * 5;
  return base + speedBonus;
}

const QTimerRing = ({ qTimeLeft }: { qTimeLeft: number }) => {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (qTimeLeft / 15) * circumference;
  let color = "#22c55e"; // green
  if (qTimeLeft <= 7) color = "#eab308"; // yellow
  if (qTimeLeft <= 3) color = "#ef4444"; // red

  return (
    <div className="relative w-[60px] h-[60px] bg-white border-2 border-black rounded-full shadow-[3px_3px_0px_0px_#000] flex items-center justify-center">
      <svg className="absolute top-0 left-0 w-full h-full -rotate-90">
        <circle
          cx="30"
          cy="30"
          r={radius}
          stroke={color}
          strokeWidth="4"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-linear"
        />
      </svg>
      <span className="font-black text-xl z-10" style={{ color }}>{qTimeLeft}</span>
    </div>
  );
};

export default function ArenaQuiz() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isDaily = code === "daily";

  const [questions, setQuestions] = useState<Question[]>([]);
  const [room, setRoom] = useState<ExamRoom | null>(null);
  // FIX: store daily quiz so we can read its actual difficulty field
  const [dailyQuiz, setDailyQuiz] = useState<DailyQuiz | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [qTimeLeft, setQTimeLeft] = useState(15);
  const qTimesRef = useRef<number[]>([]);
  const currentQRef = useRef(0);
  const handleTimeUpRef = useRef<(qIndex: number) => void>();

  // FIX: replaced startTimeRef (client-local, reset on every mount) with a
  // deadlineRef holding an absolute epoch-ms timestamp. Every tick recomputes
  // "time left" as deadline - Date.now(), so it's correct even if the tab was
  // backgrounded/throttled, or the user left and came back — no more free
  // extension on remount, and (in live mode) everyone counts down from the
  // same real-world moment instead of whenever their own tab happened to load.
  const deadlineRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const submitCalledRef = useRef(false);
  // FIX: keep a stable ref to answers so the timer useEffect never needs
  // answers in its deps (which was restarting the interval on every selection)
  const answersRef = useRef<Record<number, string>>({});

  useEffect(() => {
    currentQRef.current = currentQ;
    if (qTimesRef.current.length > 0) {
      setQTimeLeft(qTimesRef.current[currentQ]);
    }
  }, [currentQ]);

  handleTimeUpRef.current = (qIndex: number) => {
    // Mark as wrong implicitly by recording empty string if not answered
    if (answersRef.current[qIndex] === undefined) {
      const nextAns = { ...answersRef.current, [qIndex]: "" };
      answersRef.current = nextAns;
      setAnswers(nextAns);
    }
    
    // Auto move to next question if not the last
    if (qIndex < questions.length - 1) {
      setCurrentQ(qIndex + 1);
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (submitCalledRef.current || !user) return;
    submitCalledRef.current = true;
    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    // Elapsed time calculation
    let elapsed = 0;
    if (isDaily) {
      // For daily, use the overall timer (10 mins)
      const remaining = Math.max(0, Math.round((deadlineRef.current - Date.now()) / 1000));
      elapsed = totalTime - remaining;
    } else {
      // Sum elapsed time per question
      let sumElapsed = 0;
      for (let i = 0; i < questions.length; i++) {
        const left = qTimesRef.current[i] ?? 15;
        sumElapsed += (15 - left);
      }
      elapsed = sumElapsed;
    }

    // FIX: read from ref so handleSubmit is stable (no answers in useCallback deps)
    const latestAnswers = answersRef.current;
    const correctCount = questions.reduce(
      (acc, q, i) => acc + (isAnswerCorrect(q, latestAnswers[i]) ? 1 : 0),
      0
    );
    const score = calcScore(correctCount, elapsed, questions.length, isDaily);

    // FIX: include display_name in the submission row so the leaderboard can
    // show real names instead of "Player 1", "Player 2", etc.
    const displayName =
      user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "Player";

    try {
      const storageKey = isDaily ? `pz_arena_active_quiz_daily_${todayPH()}` : `pz_arena_active_quiz_room_${code?.toUpperCase()}`;
      try { localStorage.removeItem(storageKey); } catch {}

      if (isDaily) {
        try {
          const { error } = await supabase.from("daily_challenge_submissions").insert({
            user_id: user.id,
            challenge_date: todayPH(),
            answers: latestAnswers,
            score,
            time_taken_seconds: elapsed,
            display_name: displayName,
          });
          if (error) {
            console.warn("Retrying insert with minimal columns:", error.message);
            await supabase.from("daily_challenge_submissions").insert({
              user_id: user.id,
              challenge_date: todayPH(),
              answers: latestAnswers,
              score,
              time_taken_seconds: elapsed,
            });
          }
        } catch (subErr) {
          console.warn("Supabase submission failed (saving locally in state):", subErr);
        }

        navigate("/arena/results/daily", {
          state: { answers: latestAnswers, score, elapsed, questions, isDaily: true },
        });
      } else if (room) {
        try {
          const { error } = await supabase.from("room_submissions").insert({
            room_id: room.id,
            user_id: user.id,
            answers: latestAnswers,
            score,
            time_taken: elapsed,
            display_name: displayName,
          });
          if (error) {
            await supabase.from("room_submissions").insert({
              room_id: room.id,
              user_id: user.id,
              answers: latestAnswers,
              score,
              time_taken: elapsed,
            });
          }
        } catch (subErr) {
          console.warn("Supabase room submission failed:", subErr);
        }

        navigate(`/arena/results/${code}`, {
          state: { answers: latestAnswers, score, elapsed, questions, isDaily: false },
        });
      }
    } catch (e) {
      console.error("Submit error:", e);
      submitCalledRef.current = false;
      setSubmitting(false);
    }
  // FIX: answers removed from deps — read via answersRef instead
  }, [user, questions, totalTime, isDaily, room, code, navigate]);

  // ── Load quiz data ─────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      if (isDaily) {
        const data = await getOrCreateDailyChallenge();
        if (!data) { navigate("/arena"); return; }

        // Redirect if already submitted
        if (user) {
          const { data: sub } = await supabase
            .from("daily_challenge_submissions")
            .select("id")
            .eq("challenge_date", todayPH())
            .eq("user_id", user.id)
            .single();
          if (sub) { navigate("/arena"); return; }
        }

        // FIX: store the full daily quiz object so we can read difficulty
        setDailyQuiz(data as DailyQuiz);
        setQuestions(data.questions);
        qTimesRef.current = new Array(data.questions.length).fill(15);
        
        const secs = 15 * 60;
        const storageKey = `pz_arena_active_quiz_daily_${todayPH()}`;
        let savedState: any = null;
        try {
          const cached = localStorage.getItem(storageKey);
          if (cached) savedState = JSON.parse(cached);
        } catch {}

        if (savedState && savedState.deadline && savedState.deadline > Date.now()) {
          deadlineRef.current = savedState.deadline;
          const remainingNow = Math.max(0, Math.round((savedState.deadline - Date.now()) / 1000));
          setTimeLeft(remainingNow);
          setTotalTime(savedState.totalTime || secs);
          if (savedState.answers) {
            setAnswers(savedState.answers);
            answersRef.current = savedState.answers;
          }
          if (typeof savedState.currentQ === "number" && savedState.currentQ < data.questions.length) {
            setCurrentQ(savedState.currentQ);
          }
          if (Array.isArray(savedState.qTimes)) {
            qTimesRef.current = savedState.qTimes;
          }
        } else {
          deadlineRef.current = Date.now() + secs * 1000;
          setTimeLeft(secs);
          setTotalTime(secs);
        }
      } else {
        const { data } = await supabase
          .from("exam_rooms")
          .select("*")
          .eq("code", code?.toUpperCase())
          .single();
        if (!data) { navigate("/arena"); return; }
        setRoom(data);
        setQuestions(data.questions);
        qTimesRef.current = new Array(data.questions.length).fill(15);
        
        const secs = data.time_limit * 60;

        // FIX: this is the actual bug fix. Previously this always did
        // `setTimeLeft(secs)` — full duration — no matter how much real time
        // had already passed since the room started, so leaving and
        // reopening the tab (or just joining a couple seconds late) gave a
        // free reset. Now:
        //  - "live" mode rooms are synced: every player anchors to the same
        //    `started_at`, stamped once by the database (via trigger) when
        //    the host starts the room — not by any single client's clock.
        //  - "open" mode has no shared start (each player begins on their
        //    own), so it still anchors to this player's own "now".
        const deadline =
          data.mode === "live" && data.started_at
            ? new Date(data.started_at).getTime() + secs * 1000
            : Date.now() + secs * 1000;
        deadlineRef.current = deadline;

        const remainingNow = Math.max(0, Math.round((deadline - Date.now()) / 1000));
        setTimeLeft(remainingNow);
        setTotalTime(secs);
      }
      setLoading(false);
    };
    load();
  }, [code, isDaily, user, navigate]);

  // ── Countdown timer ────────────────────────────────────────────────────────
  // FIX: recompute remaining time from `deadlineRef` (an absolute timestamp)
  // every tick, instead of decrementing a counter by 1 each second. This
  // means: (a) throttled/backgrounded tabs don't drift — whenever the tick
  // does fire, it shows the true remaining time, not "however many ticks
  // fired"; (b) reopening the tab after leaving shows the real remaining
  // time, not a reset; (c) in live mode, this is now synced to the same
  // server-stamped deadline every other player is using.
  useEffect(() => {
    if (loading || questions.length === 0) return;

    const tick = () => {
      const remaining = Math.max(0, Math.round((deadlineRef.current - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        handleSubmit();
        return;
      }
      
      // Per-question timer tick (ONLY for room mode, Daily is untimed per-question)
      if (!isDaily) {
        const cQ = currentQRef.current;
        if (answersRef.current[cQ] === undefined && qTimesRef.current[cQ] > 0) {
          qTimesRef.current[cQ] -= 1;
          setQTimeLeft(qTimesRef.current[cQ]);
          if (qTimesRef.current[cQ] === 0 && handleTimeUpRef.current) {
            handleTimeUpRef.current(cQ);
          }
        }
      }
    };

    tick(); // correct immediately on mount, don't wait a full second
    timerRef.current = setInterval(tick, 1000);

    // Extra correction the instant the tab regains focus — covers the case
    // where the interval itself was fully suspended while backgrounded.
    const onVisible = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [loading, questions.length, handleSubmit]);

  const selectAnswer = (letter: string) => {
    if (qTimesRef.current[currentQ] === 0) return; // Prevent changing if timed out
    const next = { ...answersRef.current, [currentQ]: letter };
    answersRef.current = next;
    setAnswers(next);
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const progressPct = totalTime > 0 ? (timeLeft / totalTime) * 100 : 0;
  const isLow = timeLeft < 60;
  const q = questions[currentQ];
  const optionLetters = ["A", "B", "C", "D"];
  const answeredCount = Object.keys(answers).length;

  // FIX: derive difficulty label properly for both daily and room
  const difficultyLabel = isDaily
    ? `Daily Quiz · ${dailyQuiz?.difficulty ?? "Hard"}`
    : `${room?.topic} · ${room?.difficulty}`;

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-[100dvh] bg-[#f5f0e8] flex flex-col items-center justify-center gap-3">
      <span className="material-symbols-outlined animate-spin text-[36px]">progress_activity</span>
      <p className="font-bold text-[14px] text-black/50">Loading quiz...</p>
    </div>
  );
  if (!q) return null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#f5f0e8]">

      {/* ── Header (shared) ── */}
      <header className="sticky top-0 z-30 bg-[#f5f0e8] border-b-[1.5px] border-black shadow-[0_2px_0px_rgba(0,0,0,0.05)]">
        <div className="flex justify-between items-center px-4 md:px-8 py-3">
          <button
            onClick={() => navigate("/arena")}
            className="flex items-center gap-1 font-bold text-[13px] text-black/50"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
          <h1 className="font-black text-[15px] text-black truncate max-w-[200px]">
            {isDaily ? "Daily Challenge" : room?.room_name}
          </h1>
          <div className={`border-2 border-black px-3 py-1 font-mono font-black text-[14px] shadow-[2px_2px_0px_0px_#000] ${isLow ? "bg-[#E8534A] text-white" : "bg-white text-black"}`}>
            {formatTime(timeLeft)}
          </div>
        </div>
        {/* Progress bar */}
        <div className="w-full h-1.5 bg-black/10">
          <div
            className={`h-full transition-all duration-1000 ${isLow ? "bg-[#E8534A]" : "bg-[#f0a040]"}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </header>

      {/* ════════════ MOBILE ════════════ */}
      <div className="md:hidden flex flex-col gap-5 px-4 pt-5 pb-28">

        {/* Timer + progress indicator */}
        <div className="flex flex-col items-center gap-2">
          <QTimerRing qTimeLeft={qTimeLeft} />
          <p className="text-[11px] font-bold text-black/40 mt-1">{currentQ + 1} of {questions.length}</p>
        </div>

        {/* Question card */}
        <div className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_#000] p-5 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-5 h-5 bg-[#f5f0e8] border-2 border-black rounded-full" />
          {/* FIX: use difficultyLabel instead of hardcoded "Daily Quiz · Hard" */}
          <span className="inline-block text-[10px] font-bold uppercase tracking-widest border-2 border-black px-2 py-0.5 bg-[#f5f0e8] mb-3">
            {difficultyLabel}
          </span>
          <p className="font-black text-[17px] text-black leading-snug">{q.question}</p>
        </div>

        {/* Answer options */}
        <div className="flex flex-col gap-3">
          {q.options.map((opt, i) => {
            const letter = optionLetters[i];
            const selected = answers[currentQ] === letter;
            return (
              <button
                key={letter}
                onClick={() => selectAnswer(letter)}
                className={`w-full border-2 border-black p-4 flex items-center gap-4 text-left transition-all active:translate-x-[2px] active:translate-y-[2px] ${
                  selected
                    ? "bg-black text-white shadow-[3px_3px_0px_0px_#f0a040]"
                    : "bg-white text-black shadow-[3px_3px_0px_0px_#000]"
                }`}
              >
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-black text-[13px] flex-shrink-0 ${selected ? "border-white bg-white text-black" : "border-black"}`}>
                  {letter}
                </div>
                <p className={`font-medium text-[14px] flex-1 leading-snug ${selected ? "font-bold" : ""}`}>{opt}</p>
              </button>
            );
          })}
        </div>

        {/* Dot nav */}
        <div className="flex justify-center gap-1.5 pt-2">
          {questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentQ(i)}
              className={`rounded-full transition-all ${
                i === currentQ
                  ? "w-4 h-3 bg-[#f0a040] border-2 border-black"
                  : answers[i]
                    ? "w-2.5 h-2.5 bg-black border border-black"
                    : "w-2.5 h-2.5 bg-black/20 border border-black/30"
              }`}
            />
          ))}
        </div>

        {/* Answered counter */}
        <p className="text-center text-[11px] font-bold text-black/40">{answeredCount}/{questions.length} answered</p>
      </div>

      {/* Mobile bottom nav
          NOTE: z-[100] + explicit safe-area padding so this always sits above
          any persistent app-level bottom tab bar (Home/AI Tutor/Flash/Arena/Profile),
          which was overlapping and blocking taps on Next/Submit. */}
      <div
        className="md:hidden fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] bg-[#f5f0e8] border-t-2 border-black px-4 pt-4 z-[100]"
        style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
      >
        <div className="flex gap-3">
          <button
            onClick={() => setCurrentQ((q) => Math.max(0, q - 1))}
            disabled={currentQ === 0}
            className="flex-1 bg-[#f5f0e8] border-2 border-black font-bold text-[14px] py-3.5 flex items-center justify-center gap-2 shadow-[3px_3px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-30"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>Prev
          </button>
          {currentQ < questions.length - 1 ? (
            <button
              onClick={() => setCurrentQ((q) => Math.min(questions.length - 1, q + 1))}
              className="flex-1 bg-black text-white border-2 border-black font-bold text-[14px] py-3.5 flex items-center justify-center gap-2 shadow-[3px_3px_0px_0px_#f0a040] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
            >
              Next<span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 bg-[#f0a040] text-black border-2 border-black font-bold text-[14px] py-3.5 flex items-center justify-center gap-2 shadow-[3px_3px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50"
            >
              {submitting
                ? <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                : <><span className="material-symbols-outlined text-[18px]">check</span>Submit</>}
            </button>
          )}
        </div>
      </div>

      {/* ════════════ DESKTOP ════════════ */}
      <div className="hidden md:flex flex-1 overflow-hidden">

        {/* Center — question + options */}
        <div className="flex-1 p-8 overflow-y-auto flex flex-col gap-6 justify-between">
          <div className="flex flex-col gap-6">

            {/* Question card */}
            <div className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_#000] p-6">
              {/* FIX: real difficulty label */}
              <span className="inline-block text-[10px] font-bold uppercase tracking-widest border-2 border-black px-2 py-0.5 bg-[#f5f0e8] mb-4">
                {difficultyLabel}
              </span>
              <p className="font-black text-[22px] text-black leading-snug">{q.question}</p>
            </div>

            {/* Options — 2×2 grid */}
            <div className="grid grid-cols-2 gap-4">
              {q.options.map((opt, i) => {
                const letter = optionLetters[i];
                const selected = answers[currentQ] === letter;
                return (
                  <button
                    key={letter}
                    onClick={() => selectAnswer(letter)}
                    className={`border-2 border-black p-5 flex items-start gap-4 text-left transition-all hover:-translate-y-0.5 active:translate-x-[2px] active:translate-y-[2px] ${
                      selected
                        ? "bg-black text-white shadow-[4px_4px_0px_0px_#f0a040]"
                        : "bg-white text-black shadow-[4px_4px_0px_0px_#000]"
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center font-black text-[14px] flex-shrink-0 ${selected ? "border-white bg-white text-black" : "border-black"}`}>
                      {letter}
                    </div>
                    <p className={`font-medium text-[15px] flex-1 leading-snug mt-1 ${selected ? "font-bold" : ""}`}>{opt}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Desktop bottom controls */}
          <div className="flex items-center justify-between pt-4 border-t-2 border-black">
            <button
              onClick={() => setCurrentQ((q) => Math.max(0, q - 1))}
              disabled={currentQ === 0}
              className="px-6 py-3 border-2 border-black font-bold text-[14px] bg-white shadow-[3px_3px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-30 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>Previous
            </button>
            {/* Dot nav */}
            <div className="flex items-center gap-1.5">
              {questions.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentQ(i)}
                  className={`rounded-full transition-all ${
                    i === currentQ
                      ? "w-4 h-3 bg-[#f0a040] border-2 border-black"
                      : answers[i]
                        ? "w-3 h-3 bg-black border-2 border-black"
                        : "w-3 h-3 bg-black/20 border-2 border-black/30"
                  }`}
                />
              ))}
            </div>
            {currentQ < questions.length - 1 ? (
              <button
                onClick={() => setCurrentQ((q) => Math.min(questions.length - 1, q + 1))}
                className="px-6 py-3 border-2 border-black font-bold text-[14px] bg-black text-white shadow-[3px_3px_0px_0px_#f0a040] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center gap-2"
              >
                Next<span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-3 border-2 border-black font-bold text-[14px] bg-[#f0a040] text-black shadow-[3px_3px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {submitting
                  ? <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                  : <>Submit All<span className="material-symbols-outlined text-[18px]">check</span></>}
              </button>
            )}
          </div>
        </div>

        {/* Right panel — question map + timer */}
        <aside className="w-[260px] border-l-2 border-black bg-white flex flex-col overflow-y-auto">

          {/* Question map */}
          <div className="border-b-2 border-black p-4">
            <h4 className="font-black text-[11px] uppercase tracking-widest mb-3">
              Question Map <span className="text-black/40">{answeredCount}/{questions.length}</span>
            </h4>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentQ(i)}
                  className={`aspect-square border-2 border-black text-[12px] font-black flex items-center justify-center transition-all ${
                    i === currentQ
                      ? "bg-[#f0a040] shadow-[2px_2px_0px_0px_#000] -translate-x-0.5 -translate-y-0.5"
                      : answers[i]
                        ? "bg-black text-white"
                        : "bg-white hover:bg-[#f5f0e8]"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="p-4 border-b-2 border-black">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-[#f0a040] text-black border-2 border-black font-bold text-[13px] py-2.5 shadow-[3px_3px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting
                ? <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                : <>Submit All<span className="material-symbols-outlined text-[16px]">check</span></>}
            </button>
          </div>

          {/* Question Timer */}
          <div className="p-4 border-b-2 border-black flex flex-col items-center justify-center bg-[#f5f0e8]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-black/40 mb-2">Question Time</p>
            <QTimerRing qTimeLeft={qTimeLeft} />
          </div>

          {/* Big timer */}
          <div className={`p-4 border-b-2 border-black text-center ${isLow ? "bg-[#E8534A]" : "bg-[#f5f0e8]"}`}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-black/40 mb-1">Total Time Left</p>
            <p className={`font-black text-[36px] leading-none ${isLow ? "text-white" : "text-black"}`}>{formatTime(timeLeft)}</p>
          </div>

          {/* Answered count */}
          <div className="p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-black/40 mb-1">Answered</p>
            <p className="font-black text-[28px] text-black leading-none">{answeredCount}<span className="text-[16px] text-black/30">/{questions.length}</span></p>
          </div>
        </aside>
      </div>
    </div>
  );
}
